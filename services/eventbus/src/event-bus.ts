/**
 * NOAH Event Bus — Main Implementation
 *
 * The Event Bus is the nervous system of the NOAH runtime. Every engine,
 * every module, and the Core communicate exclusively through typed events
 * on this Bus. There are no direct point-to-point connections between engines.
 *
 * Architecture invariants:
 * - P0 events: dispatched synchronously on emit() — zero queuing latency.
 * - P1–P5 events: queued and dispatched in batches by the process loop.
 * - Expired events (TTL elapsed): silently dropped and counted.
 * - Handler errors: caught, delivery continues to remaining subscribers.
 * - Public boundary: all errors returned as Result — never thrown.
 *
 * @see Runtime Specification §117–§126
 * @see Engineering Blueprint §119 — Priority Queue (P0 < 5ms)
 */

import { randomUUID } from "node:crypto";

import { PriorityQueue } from "./priority-queue.js";
import { SubscriptionRouter } from "./router.js";
import {
  err,
  ok,
  Priority,
} from "./types.js";
import type {
  BusError,
  BusStats,
  EventHandler,
  EventType,
  NoahEvent,
  Result,
  SubscribeOptions,
  Unsubscribe,
} from "./types.js";

export interface EventBusOptions {
  readonly processIntervalMs?: number;
  readonly batchSize?:         number;
  readonly onDrop?:            (event: NoahEvent, reason: "expired" | "delivery_failed") => void;
  readonly onAudit?:           (event: NoahEvent) => void;
}

export class EventBus {
  private readonly queue  = new PriorityQueue();
  private readonly router = new SubscriptionRouter();

  private readonly processIntervalMs: number;
  private readonly batchSize:         number;
  private readonly onDrop:   ((event: NoahEvent, reason: "expired" | "delivery_failed") => void) | undefined;
  private readonly onAudit:  ((event: NoahEvent) => void) | undefined;

  private processTimer: ReturnType<typeof setInterval> | null = null;

  private totalEmitted   = 0;
  private totalDelivered = 0;
  private totalDropped   = 0;
  private totalExpired   = 0;

  constructor(options: EventBusOptions = {}) {
    this.processIntervalMs = options.processIntervalMs ?? 10;
    this.batchSize         = options.batchSize         ?? 100;
    this.onDrop            = options.onDrop;
    this.onAudit           = options.onAudit;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  start(): void {
    if (this.processTimer !== null) return;
    this.processTimer = setInterval(() => { this.processBatch(); }, this.processIntervalMs);
    const t = this.processTimer as { unref?: () => void };
    if (typeof t.unref === "function") t.unref();
  }

  stop(): void {
    if (this.processTimer !== null) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }
    while (!this.queue.isEmpty()) this.processBatch();
  }

  // ---------------------------------------------------------------------------
  // Emit
  // ---------------------------------------------------------------------------

  emit<TPayload = unknown>(
    type:    EventType,
    payload: TPayload,
    options: {
      readonly emitterId:       string;
      readonly priority:        (typeof Priority)[keyof typeof Priority];
      readonly contextVersion?: number;
      readonly correlationId?:  string;
      readonly ttlMs?:          number;
      readonly auditRequired?:  boolean;
    },
  ): Result<string, BusError> {

    // Build the event — use explicit undefined checks to satisfy exactOptionalPropertyTypes
    const event: NoahEvent<TPayload> = {
      id:             randomUUID(),
      type,
      priority:       options.priority,
      emitterId:      options.emitterId,
      timestamp:      Date.now(),
      contextVersion: options.contextVersion ?? 0,
      payload,
      auditRequired:  options.auditRequired ?? false,
      ...(options.correlationId !== undefined ? { correlationId: options.correlationId } : {}),
      ...(options.ttlMs         !== undefined ? { ttlMs:         options.ttlMs         } : {}),
    };

    this.totalEmitted++;

    if (event.auditRequired) {
      this.onAudit?.(event as NoahEvent);
    }

    if (event.priority === Priority.P0_CRITICAL) {
      this.dispatch(event as NoahEvent);
      return ok(event.id);
    }

    this.queue.enqueue(event as NoahEvent);
    return ok(event.id);
  }

  // ---------------------------------------------------------------------------
  // Subscribe
  // ---------------------------------------------------------------------------

  on<TPayload = unknown>(
    type:    EventType,
    handler: EventHandler<TPayload>,
    options: SubscribeOptions,
  ): Unsubscribe {
    return this.router.subscribe(type, handler, options);
  }

  onAll<TPayload = unknown>(
    handler: EventHandler<TPayload>,
    options: SubscribeOptions,
  ): Unsubscribe {
    return this.router.subscribeAll(handler, options);
  }

  // ---------------------------------------------------------------------------
  // Processing loop
  // ---------------------------------------------------------------------------

  private processBatch(): void {
    let processed = 0;
    while (processed < this.batchSize) {
      const result = this.queue.dequeue();

if (result === null) break;

if (result.expired > 0) {
  this.totalExpired += result.expired;
  this.totalDropped += result.expired;
}

if (result.event !== null) {
  this.dispatch(result.event);
  processed++;
}
  }
}


  private dispatch(event: NoahEvent): void {
    const results  = this.router.route(event);
    const delivered = results.filter((r) => r.delivered).length;
    const failed    = results.filter((r) => !r.delivered).length;
    this.totalDelivered += delivered;
    if (failed > 0) {
      this.onDrop?.(event, "delivery_failed");
      this.totalDropped += failed;
    }
  }

  // ---------------------------------------------------------------------------
  // Stats & inspection
  // ---------------------------------------------------------------------------

  getStats(): BusStats {
    const depths = this.queue.depths();
    return {
      totalEmitted:      this.totalEmitted,
      totalDelivered:    this.totalDelivered,
      totalDropped:      this.totalDropped,
      totalExpired:      this.totalExpired,
      queueDepths: {
        0: depths[0] ?? 0,
        1: depths[1] ?? 0,
        2: depths[2] ?? 0,
        3: depths[3] ?? 0,
        4: depths[4] ?? 0,
        5: depths[5] ?? 0,
      } as Readonly<Record<(typeof Priority)[keyof typeof Priority], number>>,
      subscriptionCount: this.router.subscriptionCount,
    };
  }

  subscribersFor(type: EventType): string[] {
    return this.router.subscribersFor(type);
  }

  emergencyLock(): void {
    this.queue.clear();
  }
}
