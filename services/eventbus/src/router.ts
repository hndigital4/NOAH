/**
 * NOAH Event Bus — Subscription Router
 *
 * Maintains the subscription registry and routes events to interested subscribers.
 * Enforces: Core has global subscription, all others subscribe by event type only.
 *
 * @see Runtime Specification §118 — Subscription Model
 */

import type {
  EventHandler,
  EventType,
  NoahEvent,
  SubscribeOptions,
  Unsubscribe,
} from "./types.js";

/** Internal subscription record */
interface Subscription {
  readonly id: string;
  readonly subscriberId: string;
  readonly eventType: EventType | "*";
  readonly handler: EventHandler;
  readonly createdAt: number;
}

/** Delivery result for a single subscriber */
export interface DeliveryResult {
  readonly subscriptionId: string;
  readonly subscriberId: string;
  readonly delivered: boolean;
  readonly errorMessage?: string;
}

export class SubscriptionRouter {
  private readonly subscriptions = new Map<string, Subscription>();
  /** Sequence counter for deterministic subscription IDs */
  private subscriptionCounter = 0;

  // ---------------------------------------------------------------------------
  // Subscribe
  // ---------------------------------------------------------------------------

  /**
   * Register a handler for a specific event type.
   * Returns an Unsubscribe function — call it to remove the subscription.
   */
  subscribe<TPayload = unknown>(
    eventType: EventType,
    handler: EventHandler<TPayload>,
    options: SubscribeOptions,
  ): Unsubscribe {
    const id = `sub_${++this.subscriptionCounter}`;
    const subscription: Subscription = {
      id,
      subscriberId: options.subscriberId,
      eventType,
      handler: handler as EventHandler,
      createdAt: Date.now(),
    };
    this.subscriptions.set(id, subscription);
    return (): void => {
      this.subscriptions.delete(id);
    };
  }

  /**
   * Register a handler for ALL event types.
   * Only the Core Engine is permitted to hold a global subscription.
   * The Bus does not enforce this at runtime (it is enforced by ESLint
   * dependency rules) — the caller must pass subscriberId "core".
   */
  subscribeAll<TPayload = unknown>(
    handler: EventHandler<TPayload>,
    options: SubscribeOptions,
  ): Unsubscribe {
    const id = `sub_global_${++this.subscriptionCounter}`;
    const subscription: Subscription = {
      id,
      subscriberId: options.subscriberId,
      eventType: "*",
      handler: handler as EventHandler,
      createdAt: Date.now(),
    };
    this.subscriptions.set(id, subscription);
    return (): void => {
      this.subscriptions.delete(id);
    };
  }

  // ---------------------------------------------------------------------------
  // Route
  // ---------------------------------------------------------------------------

  /**
   * Deliver an event to all matching subscribers.
   *
   * Delivery contract:
   * - Handlers are called synchronously in subscription order.
   * - A handler that throws is caught; delivery continues to remaining subscribers.
   * - DeliveryResult array records success/failure per subscriber.
   */
  route(event: NoahEvent): DeliveryResult[] {
    const results: DeliveryResult[] = [];

    for (const sub of this.subscriptions.values()) {
      // Match: global subscriptions or exact type match
      if (sub.eventType !== "*" && sub.eventType !== event.type) {
        continue;
      }

      try {
        sub.handler(event);
        results.push({
          subscriptionId: sub.id,
          subscriberId:   sub.subscriberId,
          delivered:      true,
        });
      } catch (caught: unknown) {
        const errorMessage =
          caught instanceof Error ? caught.message : "Unknown handler error";
        results.push({
          subscriptionId: sub.id,
          subscriberId:   sub.subscriberId,
          delivered:      false,
          errorMessage,
        });
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Inspection
  // ---------------------------------------------------------------------------

  get subscriptionCount(): number {
    return this.subscriptions.size;
  }

  /** Subscribers registered for a specific event type (including global). */
  subscribersFor(eventType: EventType): string[] {
    const ids: string[] = [];
    for (const sub of this.subscriptions.values()) {
      if (sub.eventType === "*" || sub.eventType === eventType) {
        ids.push(sub.subscriberId);
      }
    }
    return ids;
  }

  /** Remove all subscriptions. Called on Emergency Lock. */
  clear(): void {
    this.subscriptions.clear();
  }
}
