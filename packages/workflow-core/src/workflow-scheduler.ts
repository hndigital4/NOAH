import type { Workflow } from "./workflow.js";
import type { WorkflowSchedule } from "./workflow-schedule.js";
import { WorkflowRunner } from "./workflow-runner.js";

type CancelTask = () => void;

interface SchedulerAdapter {
  defer(delayMs: number, label: string, handler: () => void | Promise<void>): CancelTask;

  repeat(
    intervalMs: number,
    label: string,
    handler: () => void | Promise<void>,
    options?: { maxFires?: number; immediate?: boolean },
  ): CancelTask;
}

export class WorkflowScheduler {
  private readonly schedules = new Map<string, WorkflowSchedule>();
  private readonly workflows = new Map<string, Workflow>();
  private readonly cancellations = new Map<string, CancelTask>();

  public constructor(
    private readonly runner: WorkflowRunner,
    private readonly scheduler: SchedulerAdapter,
  ) {}

  public registerWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
  }

  public schedule(schedule: WorkflowSchedule): void {
    this.unschedule(schedule.id);
    this.schedules.set(schedule.id, schedule);

    if (!schedule.enabled) return;

    const workflow = this.workflows.get(schedule.workflowId);
    if (workflow === undefined) return;

    const delayMs = Math.max(0, schedule.runAt - Date.now());
    const label = `workflow:${schedule.workflowId}`;

    const runWorkflow = async (): Promise<void> => {
      await this.runner.run(workflow);
    };

    const cancel =
      schedule.repeatEveryMs !== undefined
        ? this.scheduler.repeat(
            schedule.repeatEveryMs,
            label,
            runWorkflow,
            {
              ...(schedule.maxRuns !== undefined ? { maxFires: schedule.maxRuns } : {}),
              immediate: delayMs === 0,
            },
          )
        : this.scheduler.defer(delayMs, label, runWorkflow);

    this.cancellations.set(schedule.id, cancel);
  }

  public unschedule(id: string): void {
    const cancel = this.cancellations.get(id);

    if (cancel !== undefined) {
      cancel();
      this.cancellations.delete(id);
    }

    this.schedules.delete(id);
  }

  public getSchedule(id: string): WorkflowSchedule | undefined {
    return this.schedules.get(id);
  }

  public listSchedules(): readonly WorkflowSchedule[] {
    return [...this.schedules.values()];
  }
}
