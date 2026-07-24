export interface ExecutionEvent {
  specversion: "1.0";
  type:
    | "com.skein.workflow.run.start"
    | "com.skein.workflow.run.complete"
    | "com.skein.workflow.run.error"
    | "com.skein.workflow.node.start"
    | "com.skein.workflow.node.success"
    | "com.skein.workflow.node.skipped"
    | "com.skein.workflow.node.error";
  source: string;
  id: string;
  time: number;
  runId: string;
  workflowId: string;
  nodeId?: string;
  data?: any;
}

export interface ExecutionObserver {
  onEvent(event: ExecutionEvent): Promise<void> | void;
}

export class CompositeExecutionObserver implements ExecutionObserver {
  constructor(private observers: ExecutionObserver[]) {}

  async onEvent(event: ExecutionEvent): Promise<void> {
    await Promise.all(
      this.observers.map(async (observer) => {
        try {
          await observer.onEvent(event);
        } catch (err) {
          console.error("ExecutionObserver error:", err);
        }
      })
    );
  }
}
