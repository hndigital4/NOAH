import { describe, expect, it, vi } from "vitest";

import { WorkflowEngine } from "./workflow-engine.js";

describe("WorkflowEngine", () => {
  it("executes all workflow steps in order", async () => {
    const execute = vi.fn().mockResolvedValue({ success: true });
    const engine = new WorkflowEngine({ execute } as any);

    await engine.execute({
      id: "workflow.test",
      name: "Test Workflow",
      steps: [
        { id: "step1", commandId: "command.one" },
        { id: "step2", commandId: "command.two" },
        { id: "step3", commandId: "command.three" },
      ],
    });

    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute.mock.calls[0][0].id).toBe("command.one");
    expect(execute.mock.calls[1][0].id).toBe("command.two");
    expect(execute.mock.calls[2][0].id).toBe("command.three");
  });

  it("stops when a command throws", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error("workflow failed"));

    const engine = new WorkflowEngine({ execute } as any);

    await expect(
      engine.execute({
        id: "workflow.fail",
        name: "Failure",
        steps: [
          { id: "1", commandId: "one" },
          { id: "2", commandId: "two" },
        ],
      }),
    ).rejects.toThrow("workflow failed");
  });
});
