/**
 * Describes when a workflow should be executed.
 * The actual execution is delegated to the WorkflowScheduler.
 */
export interface WorkflowSchedule {
  /**
   * Unique schedule identifier.
   */
  readonly id: string;

  /**
   * Target workflow.
   */
  readonly workflowId: string;

  /**
   * First execution time (Unix timestamp in milliseconds).
   */
  readonly runAt: number;

  /**
   * Optional repeat interval in milliseconds.
   */
  readonly repeatEveryMs?: number;

  /**
   * Maximum executions.
   * Undefined means unlimited.
   */
  readonly maxRuns?: number;

  /**
   * Number of completed executions.
   */
  readonly runCount: number;

  /**
   * Whether this schedule is active.
   */
  readonly enabled: boolean;
}
