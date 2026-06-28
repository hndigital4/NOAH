import { randomUUID } from "node:crypto";

import type { Workflow } from "./workflow.js";
import { WorkflowEngine } from "./workflow-engine.js";
import type { WorkflowRun } from "./workflow-state.js";

export class WorkflowRunner {
  private readonly runs = new Map<string, WorkflowRun>();

  public constructor(
    private readonly engine: WorkflowEngine,
  ) {}

  public async run(workflow: Workflow): Promise<WorkflowRun> {
    const runId = randomUUID();

    const started: WorkflowRun = {
      id: runId,
      workflowId: workflow.id,
      status: "running",
      startedAt: new Date().toISOString(),
    };

    this.runs.set(runId, started);

    try {
      await this.engine.execute(workflow);

      const completed: WorkflowRun = {
        ...started,
        status: "completed",
        completedAt: new Date().toISOString(),
      };

      this.runs.set(runId, completed);
      return completed;
    } catch (error) {
      const failed: WorkflowRun = {
        ...started,
        status: "failed",
        completedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };

      this.runs.set(runId, failed);
      return failed;
    }
  }

  public getRun(id: string): WorkflowRun | undefined {
    return this.runs.get(id);
  }

  public listRuns(): readonly WorkflowRun[] {
    return [...this.runs.values()];
  }
}
