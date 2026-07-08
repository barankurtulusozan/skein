import { db, DbWorkflow } from "./db";

// ponytail: in-memory scheduler uses setInterval to trigger scheduled runs.
// Upgrading path: replace with BullMQ + Redis for resilient, distributed, persistent job queues.

type TriggerFunction = (workflow: DbWorkflow) => Promise<void>;

class WorkflowScheduler {
  private activeIntervals: Record<string, NodeJS.Timeout> = {};
  private triggerRun: TriggerFunction | null = null;

  setTriggerFunction(fn: TriggerFunction) {
    this.triggerRun = fn;
  }

  parseCronToIntervalMs(cron: string): number {
    const trimmed = cron.trim();
    const match = trimmed.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
    if (match) {
      return Number(match[1]) * 60 * 1000;
    }
    if (trimmed === "* * * * *") {
      return 60 * 1000;
    }
    // Default to 1 minute for testing/quick schedule responses if not matched
    return 60 * 1000;
  }

  async scheduleWorkflow(workflow: DbWorkflow) {
    this.unscheduleWorkflow(workflow.id);

    // Find a schedule-trigger node
    const scheduleNode = workflow.nodes.find(
      (n) => n.type === "schedule-trigger",
    );
    if (!scheduleNode) return;

    const cronExpression = scheduleNode.config?.cron || "* * * * *";
    const intervalMs = this.parseCronToIntervalMs(cronExpression);

    console.log(
      `[Scheduler]: Scheduling workflow "${workflow.name}" (ID: ${workflow.id}) to run every ${intervalMs / 1000}s (cron: "${cronExpression}")`,
    );

    const interval = setInterval(async () => {
      if (this.triggerRun) {
        console.log(
          `[Scheduler]: Triggering scheduled run for workflow "${workflow.name}"`,
        );
        try {
          await this.triggerRun(workflow);
        } catch (err) {
          console.error(
            `[Scheduler]: Failed to run scheduled workflow "${workflow.id}":`,
            err,
          );
        }
      }
    }, intervalMs);

    this.activeIntervals[workflow.id] = interval;
  }

  unscheduleWorkflow(workflowId: string) {
    if (this.activeIntervals[workflowId]) {
      clearInterval(this.activeIntervals[workflowId]);
      delete this.activeIntervals[workflowId];
      console.log(`[Scheduler]: Unscheduled workflow ID: ${workflowId}`);
    }
  }

  async init() {
    const workflows = await db.listWorkflows();
    for (const w of workflows) {
      await this.scheduleWorkflow(w);
    }
  }
}

export const scheduler = new WorkflowScheduler();
