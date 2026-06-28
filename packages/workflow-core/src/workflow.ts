export type WorkflowId = string;
export type WorkflowStepId = string;

export interface WorkflowStep {
  readonly id: WorkflowStepId;
  readonly commandId: string;
  readonly input?: unknown;
}

export interface Workflow {
  readonly id: WorkflowId;
  readonly name: string;
  readonly description?: string;
  readonly steps: readonly WorkflowStep[];
}
