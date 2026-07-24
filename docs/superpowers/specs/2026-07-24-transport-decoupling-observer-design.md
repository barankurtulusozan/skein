# Design Spec: Skein Core Engine Transport Decoupling & ExecutionObserver

## Status
Approved

## Context
Currently, `@skein/engine`'s `WorkflowExecutor` emits events via a basic EventEmitter, and `apps/server/src/index.ts` attaches inline callbacks that perform database persistence (`db.saveRun`) and WebSocket broadcasting (`broadcast(...)`) inside every route trigger. 

To satisfy SOLID principles (specifically Dependency Inversion & Single Responsibility), core execution policies must be cleanly decoupled from delivery mechanisms (Fastify, WebSockets, REST endpoints, CLI, or client-side engines).

---

## 1. Architecture Overview (Ports & Adapters)

```mermaid
graph TD
    subgraph Core Domain (@skein/engine)
        WE["WorkflowExecutor"]
        EO["ExecutionObserver (Interface)"]
        EE["ExecutionEvent (CloudEvents format)"]
        CEO["CompositeExecutionObserver"]
    end

    subgraph Infrastructure Adapters (apps/server)
        WSA["WebSocketBroadcasterAdapter"]
        DBA["DbPersistenceAdapter"]
    end

    WE -->|Emits CloudEvents| EO
    CEO -->|Implements| EO
    WSA -->|Implements| EO
    DBA -->|Implements| EO
    CEO -->|Delegates to| WSA
    CEO -->|Delegates to| DBA
```

---

## 2. Core Domain Contracts (`packages/engine`)

### `ExecutionEvent` Schema
Standardized event interface based on CloudEvents structure:
```typescript
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
```

### `ExecutionObserver` Interface
```typescript
export interface ExecutionObserver {
  onEvent(event: ExecutionEvent): Promise<void> | void;
}
```

### `CompositeExecutionObserver`
Combines multiple observers (e.g., Database + WebSockets) into a unified observer:
```typescript
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
```

---

## 3. Infrastructure Adapters (`apps/server`)

### `WebSocketBroadcasterAdapter`
Sends structured execution events across active client sockets:
```typescript
export class WebSocketBroadcasterAdapter implements ExecutionObserver {
  constructor(private clients: Set<any>) {}

  onEvent(event: ExecutionEvent): void {
    const payload = JSON.stringify({
      event: event.type.replace("com.skein.workflow.", "").replace(".", ":"),
      runId: event.runId,
      workflowId: event.workflowId,
      nodeId: event.nodeId,
      ...event.data,
    });

    this.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(payload);
      }
    });
  }
}
```

### `DbPersistenceAdapter`
Persists workflow execution states into the database:
```typescript
export class DbPersistenceAdapter implements ExecutionObserver {
  constructor(private activeRun: DbRun) {}

  async onEvent(event: ExecutionEvent): Promise<void> {
    // Updates activeRun status & node results and calls db.saveRun(this.activeRun)
  }
}
```

---

## 4. Verification Plan

### Automated Tests
1. **Engine Unit Tests**: Test `WorkflowExecutor` with a mock `ExecutionObserver` verifying event order and payload schema.
2. **Server Tests**: Run execution triggers and verify database state & broadcast invocations.

### Manual Verification
- Boot server with `pnpm dev`.
- Execute a sample workflow via REST (`POST /api/workflows/:id/run`) or Webhook.
- Observe WebSocket messages arriving on visual frontend canvas and logs in database.
