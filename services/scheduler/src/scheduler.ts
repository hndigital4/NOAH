/**
 * NOAH Scheduler — Heartbeat + Deferred Task Queue
 *
 * The Scheduler is the metronome of the NOAH runtime. It emits a SYSTEM.TICK
 * event every 100ms and fires deferred tasks at their scheduled times.
 *
 * Design constraints:
 * - Tick interval target: 100ms ± 5ms under normal CPU load
 * - Deferred tasks are fired synchronously within the tick that passes their fireAt
 * - Task errors are caught and logged — they never kill the tick loop
 * - The Scheduler tracks drift to allow Core to detect CPU pressure
 *
 * @see Runtime Specification §13 — The Heartbeat
 * @see Engineering Blueprint Sprint 01 — Definition of Done: heartbeat fires at 100ms ± 5ms
 */

import { randomUUID } from "node:crypto";

import type { CancelTask, DeferredTask, SchedulerStats, TaskState, TickEvent, TickHandler } from "./types.js";

export interface SchedulerOptions {
  /**
   * Target interval between ticks in milliseconds.
   * Default: 100ms — the NOAH platform heartbeat interval.
   */
  readonly intervalMs?: number;

  /**
   * Called when a task handler throws.
   * If not provided, errors are silently swallowed (the tick continues).
   */
  readonly onTaskError?: (taskId: string, label: string, error: unknown) => void;

  /**
   * Called when tick drift exceeds this threshold in ms.
   * Allows the Core to detect CPU pressure.
   * Default: 10ms (5ms above the 5ms acceptable drift budget)
   */
  readonly driftWarnThresholdMs?: number;
  readonly onDriftWarning?: (drift: number, tickCount: number) => void;
}

export class Scheduler {
  private readonly intervalMs:            number;
  private readonly onTaskError:          ((taskId: string, label: string, err: unknown) => void) | undefined;
  private readonly driftWarnThresholdMs: number;
  private readonly onDriftWarning:       ((drift: number, tick: number) => void) | undefined;

  private timer:           ReturnType<typeof setInterval> | null = null;
  private tickHandlers:    Set<TickHandler> = new Set();
  private tasks:           Map<string, TaskState> = new Map();

  // Stats
  private tickCount         = 0;
  private totalDriftMs      = 0;
  private maxDriftMs        = 0;
  private completedTasks    = 0;
  private cancelledTasks    = 0;

  // Timing state
  private lastTickAt: number | null = null;
  private startedAt: number | null = null;

  constructor(options: SchedulerOptions = {}) {
    this.intervalMs            = options.intervalMs            ?? 100;
    this.onTaskError           = options.onTaskError;
    this.driftWarnThresholdMs  = options.driftWarnThresholdMs  ?? 10;
    this.onDriftWarning        = options.onDriftWarning;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  start(): void {
    if (this.timer !== null) return;

    this.startedAt  = Date.now();
    this.lastTickAt = this.startedAt;

    this.timer = setInterval(() => {
      this.tick();
    }, this.intervalMs);

    if (typeof this.timer === "object" && "unref" in this.timer) {
      (this.timer as { unref(): void }).unref();
    }
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Tick handler registration
  // ---------------------------------------------------------------------------

  onTick(handler: TickHandler): () => void {
    this.tickHandlers.add(handler);
    return (): void => {
      this.tickHandlers.delete(handler);
    };
  }

  // ---------------------------------------------------------------------------
  // Task scheduling
  // ---------------------------------------------------------------------------

  /**
   * Schedule a one-shot deferred task.
   * @param delayMs  Milliseconds from now to fire
   * @param label    Human-readable task label (appears in logs)
   * @param handler  The function to call
   * @returns CancelTask — call it to prevent the task from firing
   */
  defer(delayMs: number, label: string, handler: () => void | Promise<void>): CancelTask {
    const task: DeferredTask = {
      id:      randomUUID(),
      label,
      handler,
      fireAt:  Date.now() + delayMs,
    };
    return this.scheduleTask(task);
  }

  /**
   * Schedule a recurring task.
   * @param intervalMs  How often to fire (ms)
   * @param label       Human-readable label
   * @param handler     The function to call
   * @param options.maxFires  Stop after this many fires (default: unlimited)
   * @param options.immediate  Fire immediately on the next tick (default: false)
   */
  repeat(
    intervalMs: number,
    label: string,
    handler: () => void | Promise<void>,
    options: { maxFires?: number; immediate?: boolean } = {},
  ): CancelTask {
    const task: DeferredTask = {
      id: randomUUID(),
      label,
      handler,
      fireAt: options.immediate === true ? Date.now() : Date.now() + intervalMs,
      intervalMs,
      ...(options.maxFires !== undefined ? { maxFires: options.maxFires } : {}),
    };
    return this.scheduleTask(task);
  }
    private scheduleTask(task: DeferredTask): CancelTask {
    const state: TaskState = {
      ...task,
      fireCount:  0,
      nextFireAt: task.fireAt,
      cancelled:  false,
    };
    this.tasks.set(task.id, state);

    return (): void => {
      const t = this.tasks.get(task.id);
      if (t !== undefined && !t.cancelled) {
        t.cancelled = true;
        this.cancelledTasks++;
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Internal tick
  // ---------------------------------------------------------------------------

  private tick(): void {
    const now     = Date.now();
    const elapsed = this.lastTickAt !== null ? now - this.lastTickAt : this.intervalMs;
    const expectedElapsed = this.intervalMs;
    const drift = elapsed - expectedElapsed;

    this.totalDriftMs += Math.abs(drift);
    if (Math.abs(drift) > this.maxDriftMs) {
      this.maxDriftMs = Math.abs(drift);
    }
    if (Math.abs(drift) > this.driftWarnThresholdMs && this.onDriftWarning) {
      this.onDriftWarning(drift, this.tickCount + 1);
    }

    this.lastTickAt = now;
    this.tickCount++;

    const event: TickEvent = {
      tickCount: this.tickCount,
      timestamp: now,
      elapsed,
      drift,
    };

    // 1. Fire deferred tasks whose time has come
    this.fireDueTasks(now);

    // 2. Notify tick handlers
    for (const handler of this.tickHandlers) {
      try {
        handler(event);
      } catch (e: unknown) {
        if (this.onTaskError) {
          this.onTaskError("tick-handler", "TickHandler", e);
        }
      }
    }
  }

  private fireDueTasks(now: number): void {
    for (const [id, task] of this.tasks) {
      if (task.cancelled) {
        this.tasks.delete(id);
        continue;
      }

      if (now < task.nextFireAt) continue;

      // Fire the task
      try {
        const result = task.handler();
        if (result instanceof Promise) {
          result.catch((e: unknown) => {
            if (this.onTaskError) {
              this.onTaskError(task.id, task.label, e);
            }
          });
        }
      } catch (e: unknown) {
        if (this.onTaskError) {
          this.onTaskError(task.id, task.label, e);
        }
      }

      task.fireCount++;

      // One-shot or exhausted recurring task
      if (task.intervalMs === undefined || (task.maxFires !== undefined && task.fireCount >= task.maxFires)) {
        this.tasks.delete(id);
        this.completedTasks++;
      } else {
        // Reschedule — use compensated next time to reduce drift accumulation
        task.nextFireAt = task.nextFireAt + task.intervalMs;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Inspection
  // ---------------------------------------------------------------------------

  getStats(): SchedulerStats {
    return {
      tickCount:      this.tickCount,
      totalDriftMs:   this.totalDriftMs,
      maxDriftMs:     this.maxDriftMs,
      activeTasks:    this.tasks.size,
      completedTasks: this.completedTasks,
      cancelledTasks: this.cancelledTasks,
    };
  }

  get isRunning(): boolean {
    return this.timer !== null;
  }
}
