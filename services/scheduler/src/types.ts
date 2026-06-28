/**
 * NOAH Scheduler — Types
 * @see Runtime Specification §13 — The Heartbeat (100ms tick)
 */

/** A function called on every heartbeat tick */
export type TickHandler = (tick: TickEvent) => void;

/** Information delivered to each tick handler */
export interface TickEvent {
  /** Monotonically increasing tick count since Scheduler.start() */
  readonly tickCount: number;
  /** Timestamp (Date.now()) of this tick */
  readonly timestamp: number;
  /**
   * Elapsed milliseconds since the previous tick.
   * Will be close to the configured interval but may drift under CPU load.
   */
  readonly elapsed: number;
  /**
   * Cumulative drift in milliseconds since the Scheduler started.
   * Positive = ticks are running late (CPU pressure).
   * Monitored by the heartbeat jitter check.
   */
  readonly drift: number;
}

/** A one-shot or recurring deferred task */
export interface DeferredTask {
  readonly id: string;
  readonly label: string;
  readonly handler: () => void | Promise<void>;
  /** Absolute timestamp (Date.now()) at which the task should first fire */
  readonly fireAt: number;
  /** If set, the task fires every `intervalMs` ms after the first fire */
  readonly intervalMs?: number;
  /** Maximum number of times to fire (undefined = unlimited for recurring tasks) */
  readonly maxFires?: number;
}

/** Internal task state tracked by the Scheduler */
export interface TaskState extends DeferredTask {
  fireCount: number;
  nextFireAt: number;
  cancelled: boolean;
}

export type CancelTask = () => void;

export interface SchedulerStats {
  readonly tickCount:       number;
  readonly totalDriftMs:    number;
  readonly maxDriftMs:      number;
  readonly activeTasks:     number;
  readonly completedTasks:  number;
  readonly cancelledTasks:  number;
}
