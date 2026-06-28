import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Scheduler } from "./scheduler.js";

describe("Scheduler", () => {
  let scheduler: Scheduler;

  beforeEach(() => {
    scheduler = new Scheduler({ intervalMs: 20 }); // 20ms for fast tests
  });

  afterEach(() => {
    scheduler.stop();
  });

  it("starts and stops cleanly", () => {
    expect(scheduler.isRunning).toBe(false);
    scheduler.start();
    expect(scheduler.isRunning).toBe(true);
    scheduler.stop();
    expect(scheduler.isRunning).toBe(false);
  });

  it("fires tick handlers on each tick", async () => {
    const ticks: number[] = [];
    scheduler.onTick((e) => { ticks.push(e.tickCount); });
    scheduler.start();

    await new Promise((r) => setTimeout(r, 75));
    scheduler.stop();

    // At 20ms interval, 75ms should produce ~3 ticks
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks.length).toBeLessThanOrEqual(5);
  });

  it("tick events carry monotonically increasing tickCount", async () => {
    const counts: number[] = [];
    scheduler.onTick((e) => { counts.push(e.tickCount); });
    scheduler.start();

    await new Promise((r) => setTimeout(r, 70));
    scheduler.stop();

    for (let i = 1; i < counts.length; i++) {
      expect((counts[i] as number) - (counts[i - 1] as number)).toBe(1);
    }
  });

  it("onTick returns an unsubscribe function", async () => {
    const ticks: number[] = [];
    const unsub = scheduler.onTick((e) => { ticks.push(e.tickCount); });
    scheduler.start();

    await new Promise((r) => setTimeout(r, 30));
    const countAfterFirst = ticks.length;
    unsub();
    await new Promise((r) => setTimeout(r, 40));

    // No new ticks after unsub
    expect(ticks.length).toBe(countAfterFirst);
  });

  it("fires a deferred one-shot task after the delay", async () => {
    let fired = false;
    scheduler.start();
    scheduler.defer(30, "test-task", () => { fired = true; });

    await new Promise((r) => setTimeout(r, 20));
    expect(fired).toBe(false); // Not fired yet

    await new Promise((r) => setTimeout(r, 30));
    expect(fired).toBe(true);
  });

  it("cancelling a task prevents it from firing", async () => {
    let fired = false;
    scheduler.start();
    const cancel = scheduler.defer(30, "cancel-task", () => { fired = true; });

    cancel();
    await new Promise((r) => setTimeout(r, 80));
    expect(fired).toBe(false);
    expect(scheduler.getStats().cancelledTasks).toBe(1);
  });

  it("repeat fires multiple times", async () => {
    const fires: number[] = [];
    scheduler.start();
    scheduler.repeat(25, "recurring", () => { fires.push(Date.now()); });

    await new Promise((r) => setTimeout(r, 100));
    scheduler.stop();

    expect(fires.length).toBeGreaterThanOrEqual(2);
  });

  it("repeat respects maxFires", async () => {
    let count = 0;
    scheduler.start();
    scheduler.repeat(20, "limited", () => { count++; }, { maxFires: 2 });

    await new Promise((r) => setTimeout(r, 100));
    scheduler.stop();

    expect(count).toBe(2);
    expect(scheduler.getStats().completedTasks).toBe(1);
  });

  it("isolates task errors from the tick loop", async () => {
    const errors: string[] = [];
    const goodFires: number[] = [];

    const s = new Scheduler({
      intervalMs: 20,
      onTaskError: (id, label) => { errors.push(label); },
    });
    s.start();

    s.defer(10, "bad-task",  () => { throw new Error("task error"); });
    s.defer(10, "good-task", () => { goodFires.push(1); });

    await new Promise((r) => setTimeout(r, 60));
    s.stop();

    expect(errors).toContain("bad-task");
    expect(goodFires.length).toBeGreaterThan(0);
  });

  it("reports stats correctly", async () => {
    scheduler.start();
    scheduler.defer(15, "t1", () => { /* noop */ });
    const cancel = scheduler.defer(500, "t2", () => { /* noop */ });
    cancel();

    await new Promise((r) => setTimeout(r, 50));
    scheduler.stop();

    const stats = scheduler.getStats();
    expect(stats.tickCount).toBeGreaterThan(0);
    expect(stats.completedTasks).toBe(1);
    expect(stats.cancelledTasks).toBe(1);
  });
});
