import { ExecutionObserver, ExecutionEvent } from "@skein/engine";

export class WebSocketBroadcasterAdapter implements ExecutionObserver {
  constructor(private clients: Set<any>) {}

  onEvent(event: ExecutionEvent): void {
    const legacyEventName = event.type
      .replace("com.skein.workflow.", "")
      .replace(".", ":");

    const payload = JSON.stringify({
      event: legacyEventName,
      runId: event.runId,
      workflowId: event.workflowId,
      nodeId: event.nodeId,
      ...(event.data || {}),
    });

    this.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(payload);
      }
    });
  }
}
