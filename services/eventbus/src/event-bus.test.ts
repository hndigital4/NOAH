/**
 * Event Bus — Test Suite
 * Coverage target: 95% (safety-critical component per Engineering Blueprint §QA·01)
 *
 * Tests validate:
 * 1. Priority routing (P0 synchronous, P1–P5 queued)
 * 2. P0 latency constraint (<5ms)
 * 3. TTL expiry
 * 4. Global subscription (Core pattern)
 * 5. Unsubscribe correctness
 * 6. Handler error isolation
 * 7. Emergency Lock behaviour
 * 8. Stats accuracy
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EventBus } from "./event-bus.js";
import { EventType, Priority } from "./types.js";
import type { NoahEvent } from "./types.js";
import { PriorityQueue } from "./priority-queue.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEmitOptions(
  priority: (typeof Priority)[keyof typeof Priority],
  overrides: Partial<{
    emitterId: string;
    contextVersion: number;
    ttlMs: number;
    auditRequired: boolean;
    correlationId: string;
  }> = {},
) {
  return {
    emitterId:      overrides.emitterId      ?? "test-engine",
    priority,
    contextVersion: overrides.contextVersion ?? 1,
    ttlMs:          overrides.ttlMs,
    auditRequired:  overrides.auditRequired  ?? false,
    correlationId:  overrides.correlationId,
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus({ processIntervalMs: 5, batchSize: 50 });
    bus.start();
  });

  afterEach(() => {
    bus.stop();
  });

  // ── Construction ─────────────────────────────────────────────────────────

  it("starts with zero stats", () => {
    const stats = bus.getStats();
    expect(stats.totalEmitted).toBe(0);
    expect(stats.totalDelivered).toBe(0);
    expect(stats.totalDropped).toBe(0);
    expect(stats.subscriptionCount).toBe(0);
  });

  // ── P0 synchronous dispatch ───────────────────────────────────────────────

  it("dispatches P0 events synchronously on emit()", () => {
    const received: NoahEvent[] = [];
    bus.on(EventType.SECURITY_EMERGENCY_LOCK, (e) => { received.push(e); }, { subscriberId: "test" });

    const result = bus.emit(
      EventType.SECURITY_EMERGENCY_LOCK,
      { reason: "test" },
      makeEmitOptions(Priority.P0_CRITICAL),
    );

    expect(result.ok).toBe(true);
    // P0: delivered on the same call frame — no await needed
    expect(received).toHaveLength(1);
    expect(received[0]?.type).toBe(EventType.SECURITY_EMERGENCY_LOCK);
  });

  it("P0 dispatch completes within 5ms", () => {
    bus.on(EventType.SECURITY_EMERGENCY_LOCK, () => { /* noop */ }, { subscriberId: "test" });

    const start = performance.now();
    bus.emit(
      EventType.SECURITY_EMERGENCY_LOCK,
      {},
      makeEmitOptions(Priority.P0_CRITICAL),
    );
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5);
  });

  // ── P1–P5 queued dispatch ─────────────────────────────────────────────────

  it("queues P3 events for async dispatch", async () => {
    const received: NoahEvent[] = [];
    bus.on(EventType.CONTEXT_UPDATED, (e) => { received.push(e); }, { subscriberId: "test" });

    bus.emit(EventType.CONTEXT_UPDATED, { version: 2 }, makeEmitOptions(Priority.P3_CONTEXT));

    // Not yet delivered — queued
    expect(received).toHaveLength(0);

    // Wait for process loop
    await new Promise((r) => setTimeout(r, 20));
    expect(received).toHaveLength(1);
  });

  it("delivers events in priority order when queue has mixed priorities", async () => {
    const order: string[] = [];
    bus.on(EventType.CONTEXT_UPDATED, () => { order.push("P3"); },   { subscriberId: "ctx" });
    bus.on(EventType.MODULE_LOADED,   () => { order.push("P3b"); },  { subscriberId: "mod" });
    bus.on(EventType.SYSTEM_TICK,     () => { order.push("P1"); },   { subscriberId: "sys" });

    // Emit lower priority first, higher priority second
    bus.emit(EventType.CONTEXT_UPDATED, {}, makeEmitOptions(Priority.P3_CONTEXT));
    bus.emit(EventType.MODULE_LOADED,   {}, makeEmitOptions(Priority.P3_CONTEXT));
    bus.emit(EventType.SYSTEM_TICK,     {}, makeEmitOptions(Priority.P1_SYSTEM));

    await new Promise((r) => setTimeout(r, 30));

    // P1 must be delivered before P3
    expect(order[0]).toBe("P1");
    expect(order).toContain("P3");
    expect(order).toContain("P3b");
  });

  // ── TTL expiry ────────────────────────────────────────────────────────────

  it("expires events whose TTL has elapsed before processing", async () => {
    const received: NoahEvent[] = [];
    const dropped: string[] = [];

    const ttlBus = new EventBus({
      processIntervalMs: 50, // Long interval so TTL fires before process
      onDrop: (e, reason) => { dropped.push(reason); },
    });
    ttlBus.start();

    ttlBus.on(EventType.MEMORY_WRITE, (e) => { received.push(e); }, { subscriberId: "test" });

    // ttlMs=5, process loop is at 50ms — event will be expired before processing
    ttlBus.emit(EventType.MEMORY_WRITE, {}, {
      ...makeEmitOptions(Priority.P4_BACKGROUND),
      ttlMs: 5,
    });

    await new Promise((r) => setTimeout(r, 80));
    ttlBus.stop();

    expect(received).toHaveLength(0);
    const stats = ttlBus.getStats();
    expect(stats.totalExpired).toBe(1);
    expect(stats.totalDropped).toBe(1);
  });

  // ── Global subscription ───────────────────────────────────────────────────

  it("global subscription receives all event types", async () => {
    const received: string[] = [];
    bus.onAll((e) => { received.push(e.type); }, { subscriberId: "core" });

    bus.emit(EventType.SYSTEM_TICK,    {}, makeEmitOptions(Priority.P1_SYSTEM));
    bus.emit(EventType.CONTEXT_UPDATED,{}, makeEmitOptions(Priority.P3_CONTEXT));
    bus.emit(EventType.MODULE_LOADED,  {}, makeEmitOptions(Priority.P3_CONTEXT));

    await new Promise((r) => setTimeout(r, 30));
    expect(received).toContain(EventType.SYSTEM_TICK);
    expect(received).toContain(EventType.CONTEXT_UPDATED);
    expect(received).toContain(EventType.MODULE_LOADED);
  });

  // ── Unsubscribe ───────────────────────────────────────────────────────────

  it("unsubscribe removes the handler", async () => {
    const received: NoahEvent[] = [];
    const unsub = bus.on(
      EventType.VOICE_WAKE,
      (e) => { received.push(e); },
      { subscriberId: "voice-test" },
    );

    bus.emit(EventType.VOICE_WAKE, {}, makeEmitOptions(Priority.P2_USER));
    await new Promise((r) => setTimeout(r, 20));
    expect(received).toHaveLength(1);

    // Unsubscribe and emit again
    unsub();
    bus.emit(EventType.VOICE_WAKE, {}, makeEmitOptions(Priority.P2_USER));
    await new Promise((r) => setTimeout(r, 20));

    // Still 1 — second event not delivered
    expect(received).toHaveLength(1);
  });

  // ── Handler error isolation ───────────────────────────────────────────────

  it("isolates handler errors — other subscribers still receive the event", async () => {
    const goodReceived: NoahEvent[] = [];

    bus.on(EventType.WORKFLOW_STARTED, () => { throw new Error("bad handler"); }, { subscriberId: "bad" });
    bus.on(EventType.WORKFLOW_STARTED, (e) => { goodReceived.push(e); }, { subscriberId: "good" });

    bus.emit(EventType.WORKFLOW_STARTED, {}, makeEmitOptions(Priority.P3_CONTEXT));
    await new Promise((r) => setTimeout(r, 20));

    // Good handler still received the event despite bad handler throwing
    expect(goodReceived).toHaveLength(1);
  });

  // ── Audit hook ────────────────────────────────────────────────────────────

  it("calls onAudit for events with auditRequired=true", () => {
    const audited: string[] = [];
    const auditBus = new EventBus({
      onAudit: (e) => { audited.push(e.id); },
    });
    auditBus.start();

    auditBus.emit(
      EventType.SECURITY_GATE_APPROVED,
      {},
      makeEmitOptions(Priority.P0_CRITICAL, { auditRequired: true }),
    );

    auditBus.stop();
    expect(audited).toHaveLength(1);
  });

  // ── Emergency Lock ────────────────────────────────────────────────────────

  it("emergencyLock clears the queue", async () => {
    const received: NoahEvent[] = [];
    bus.on(EventType.MEMORY_WRITE, (e) => { received.push(e); }, { subscriberId: "test" });

    // Enqueue events at low priority
    for (let i = 0; i < 10; i++) {
      bus.emit(EventType.MEMORY_WRITE, { i }, makeEmitOptions(Priority.P4_BACKGROUND));
    }

    // Lock before process loop runs
    bus.emergencyLock();

    await new Promise((r) => setTimeout(r, 30));

    // Queue was cleared — no events delivered
    expect(received).toHaveLength(0);
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  it("accurately tracks emitted and delivered counts", async () => {
    bus.on(EventType.CONTEXT_UPDATED, () => { /* noop */ }, { subscriberId: "test" });
    bus.on(EventType.MODULE_SURFACED, () => { /* noop */ }, { subscriberId: "test2" });

    bus.emit(EventType.CONTEXT_UPDATED, {}, makeEmitOptions(Priority.P3_CONTEXT));
    bus.emit(EventType.MODULE_SURFACED, {}, makeEmitOptions(Priority.P3_CONTEXT));

    await new Promise((r) => setTimeout(r, 30));

    const stats = bus.getStats();
    expect(stats.totalEmitted).toBe(2);
    expect(stats.totalDelivered).toBe(2);
    expect(stats.subscriptionCount).toBe(2);
  });

  it("returns correlation ID on emitted event", () => {
    bus.on(EventType.WORKFLOW_STEP_COMPLETE, () => { /* noop */ }, { subscriberId: "wf" });

    let captured: NoahEvent | null = null;
    bus.on(EventType.WORKFLOW_STEP_COMPLETE, (e) => { captured = e; }, { subscriberId: "capture" });

    bus.emit(
      EventType.WORKFLOW_STEP_COMPLETE,
      {},
      makeEmitOptions(Priority.P3_CONTEXT, { correlationId: "wf-instance-001" }),
    );

    // P3 — wait for loop
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(captured).not.toBeNull();
        expect((captured as unknown as NoahEvent).correlationId).toBe("wf-instance-001");
        resolve();
      }, 20);
    });
  });

  // ── subscribersFor ────────────────────────────────────────────────────────

  it("reports subscribers for a given event type", () => {
    bus.on(EventType.VOICE_INTENT, () => { /* noop */ }, { subscriberId: "voice-engine" });
    bus.on(EventType.VOICE_INTENT, () => { /* noop */ }, { subscriberId: "workflow-engine" });

    const subs = bus.subscribersFor(EventType.VOICE_INTENT);
    expect(subs).toContain("voice-engine");
    expect(subs).toContain("workflow-engine");
  });
});

// ---------------------------------------------------------------------------
// PriorityQueue unit tests
// ---------------------------------------------------------------------------

describe("PriorityQueue", () => {
  it("dequeues in priority order", () => {
   
    const q = new PriorityQueue();

    const makeEvent = (priority: (typeof Priority)[keyof typeof Priority], id: string): NoahEvent => ({
      id,
      type: EventType.SYSTEM_TICK,
      priority,
      emitterId: "test",
      timestamp: Date.now(),
      contextVersion: 1,
      payload: {},
      auditRequired: false,
    });

    q.enqueue(makeEvent(Priority.P4_BACKGROUND, "p4"));
    q.enqueue(makeEvent(Priority.P2_USER,       "p2"));
    q.enqueue(makeEvent(Priority.P0_CRITICAL,   "p0"));
    q.enqueue(makeEvent(Priority.P3_CONTEXT,    "p3"));

    const first  = q.dequeue();
    const second = q.dequeue();
    const third  = q.dequeue();
    const fourth = q.dequeue();

    expect(first?.event.id).toBe("p0");
    expect(second?.event.id).toBe("p2");
    expect(third?.event.id).toBe("p3");
    expect(fourth?.event.id).toBe("p4");
  });
});
