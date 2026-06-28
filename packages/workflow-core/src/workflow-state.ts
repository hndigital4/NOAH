export type WorkflowRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export interface WorkflowRun {
  readonly id: string;
  readonly workflowId: string;
  readonly status: WorkflowRunStatus;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly error?: string;
}
