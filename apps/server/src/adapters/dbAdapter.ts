import { ExecutionObserver, ExecutionEvent } from "@skein/engine";
import { db, DbRun } from "../db";

export class DbPersistenceAdapter implements ExecutionObserver {
  constructor(private activeRun: DbRun) {}

  async onEvent(event: ExecutionEvent): Promise<void> {
    const { nodeId, data, type } = event;

    if (type === "com.skein.workflow.node.start" && nodeId) {
      this.activeRun.results[nodeId] = {
        nodeId,
        status: "running",
        startedAt: event.time,
      };
    } else if (type === "com.skein.workflow.node.success" && nodeId) {
      const prev = this.activeRun.results[nodeId] || {};
      this.activeRun.results[nodeId] = {
        ...prev,
        nodeId,
        status: "success",
        output: data?.output,
        finishedAt: event.time,
      };
    } else if (type === "com.skein.workflow.node.skipped" && nodeId) {
      const prev = this.activeRun.results[nodeId] || {};
      this.activeRun.results[nodeId] = {
        ...prev,
        nodeId,
        status: "skipped",
        finishedAt: event.time,
      };
    } else if (type === "com.skein.workflow.node.error" && nodeId) {
      const prev = this.activeRun.results[nodeId] || {};
      this.activeRun.results[nodeId] = {
        ...prev,
        nodeId,
        status: "error",
        error: data?.error,
        finishedAt: event.time,
      };
    } else if (type === "com.skein.workflow.run.complete") {
      this.activeRun.status = "success";
      this.activeRun.finishedAt = event.time;
    } else if (type === "com.skein.workflow.run.error") {
      this.activeRun.status = "error";
      this.activeRun.finishedAt = event.time;
    }

    await db.saveRun(this.activeRun);
  }
}
