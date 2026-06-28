import { describe, expect, it, vi } from "vitest";

import { WorkflowEngine } from "./workflow-engine.js";
import { WorkflowRunner } from "./workflow-runner.js";
import { WorkflowScheduler } from "./workflow-scheduler.js";

describe("WorkflowScheduler", () => {
  it("registers a workflow schedule", () => {
    const runner = new WorkflowRunner({
      execute: vi.fn(),
    } as unknown as WorkflowEngine);

    const scheduler = {
      defer: vi.fn(() => () => {}),
      repeat: vi.fn(() => () => {}),
    };

    const workflowScheduler = new WorkflowScheduler(
      runner,
      scheduler,
    );

    workflowScheduler.registerWorkflow({
      id: "workflow-1",
      steps: [],
    });

    workflowScheduler.schedule({
      id: "schedule-1",
      workflowId: "workflow-1",
      runAt: Date.now(),
      runCount: 0,
      enabled: true,
    });

    expect(workflowScheduler.listSchedules()).toHaveLength(1);
  });

  it("removes schedules", () => {
    const runner = new WorkflowRunner({
      execute: vi.fn(),
    } as unknown as WorkflowEngine);

    const scheduler = {
      defer: vi.fn(() => () => {}),
      repeat: vi.fn(() => () => {}),
    };

    const workflowScheduler = new WorkflowScheduler(
      runner,
      scheduler,
    );

    workflowScheduler.schedule({
      id: "schedule-1",
      workflowId: "workflow-1",
      runAt: Date.now(),
      runCount: 0,
      enabled: true,
    });

    workflowScheduler.unschedule("schedule-1");

    expect(workflowScheduler.listSchedules()).toHaveLength(0);
  });
});
