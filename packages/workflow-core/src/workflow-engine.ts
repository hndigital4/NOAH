import { randomUUID } from "node:crypto";

import type { CommandEngine } from "@noah/runtime-core";
import type { Workflow } from "./workflow.js";

export class WorkflowEngine {
  public constructor(
    private readonly commandEngine: CommandEngine,
  ) {}

  public async execute(workflow: Workflow): Promise<void> {
    for (const step of workflow.steps) {
      await this.commandEngine.execute({
        id: step.commandId,
        input: step.input,
        context: {
          requestId: randomUUID(),
          source: "automation",
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}
