# Transport Decoupling & ExecutionObserver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple `@skein/engine` from HTTP/WebSocket delivery mechanisms by implementing the `ExecutionObserver` interface and CloudEvents telemetry schema.

**Architecture:** Introduce `ExecutionEvent` (CloudEvents format), `ExecutionObserver`, and `CompositeExecutionObserver` in `@skein/engine`. In `apps/server`, implement `WebSocketBroadcasterAdapter` and `DbPersistenceAdapter` to handle transport and persistence cleanly without mixing into route handlers.

**Tech Stack:** TypeScript, `@skein/engine`, `@skein/schema`, Fastify, WebSockets.

## Global Constraints
- Preserve backward compatibility for existing `WorkflowExecutor` `on()` listeners.
- No breaking changes to existing REST endpoints or WebSocket message structure.
- All new engine constructs must be fully unit tested.

---

### Task 1: Create `ExecutionObserver` Core Domain Contracts in `@skein/engine`

**Files:**
- Create: `packages/engine/src/observer.ts`
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/tests/observer.test.ts`

**Interfaces:**
- Produces: `ExecutionEvent`, `ExecutionObserver`, `CompositeExecutionObserver`

- [ ] **Step 1: Write the failing unit test**

Create `packages/engine/tests/observer.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { ExecutionObserver, CompositeExecutionObserver, ExecutionEvent } from "../src/observer";

describe("ExecutionObserver", () => {
  it("notifies all observers via CompositeExecutionObserver", async () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    const observer1: ExecutionObserver = { onEvent: fn1 };
    const observer2: ExecutionObserver = { onEvent: fn2 };

    const composite = new CompositeExecutionObserver([observer1, observer2]);

    const event: ExecutionEvent = {
      specversion: "1.0",
      type: "com.skein.workflow.run.start",
      source: "/skein/engine",
      id: "evt-123",
      time: 1000,
      runId: "run-1",
      workflowId: "wf-1",
    };

    await composite.onEvent(event);

    expect(fn1).toHaveBeenCalledWith(event);
    expect(fn2).toHaveBeenCalledWith(event);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @skein/engine test`
Expected: FAIL due to missing `packages/engine/src/observer.ts`

- [ ] **Step 3: Implement `packages/engine/src/observer.ts`**

Create `packages/engine/src/observer.ts`:
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
```

Re-export from `packages/engine/src/index.ts`:
```typescript
export * from "./observer";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @skein/engine test`
Expected: PASS

- [ ] **Step 5: Commit task**

```bash
git add packages/engine/src/observer.ts packages/engine/src/index.ts packages/engine/tests/observer.test.ts
git commit -m "feat(engine): add ExecutionObserver and CompositeExecutionObserver contracts"
```

---

### Task 2: Integrate `ExecutionObserver` into `WorkflowExecutor`

**Files:**
- Modify: `packages/engine/src/index.ts:11-286`
- Test: `packages/engine/tests/executor-observer.test.ts`

**Interfaces:**
- Consumes: `ExecutionObserver`, `ExecutionEvent` from `packages/engine/src/observer.ts`

- [ ] **Step 1: Write the failing unit test**

Create `packages/engine/tests/executor-observer.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import { WorkflowExecutor } from "../src";
import { ExecutionObserver, ExecutionEvent } from "../src/observer";

describe("WorkflowExecutor with Observer", () => {
  it("emits CloudEvents to attached ExecutionObserver during run", async () => {
    const events: ExecutionEvent[] = [];
    const observer: ExecutionObserver = {
      onEvent: (event) => {
        events.push(event);
      },
    };

    const workflow = {
      id: "test-wf",
      name: "Test Workflow",
      nodes: [
        { id: "n1", type: "log-debug", position: { x: 0, y: 0 }, config: {} },
      ],
      edges: [],
    };

    const executor = new WorkflowExecutor(workflow, {}, observer);
    await executor.execute({});

    expect(events.some((e) => e.type === "com.skein.workflow.run.start")).toBe(true);
    expect(events.some((e) => e.type === "com.skein.workflow.node.start")).toBe(true);
    expect(events.some((e) => e.type === "com.skein.workflow.run.complete")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @skein/engine test`
Expected: FAIL (executor constructor does not accept observer)

- [ ] **Step 3: Update `WorkflowExecutor` in `packages/engine/src/index.ts`**

Update `WorkflowExecutor` constructor and emission helper:
```typescript
import { ExecutionObserver, ExecutionEvent } from "./observer";

export class WorkflowExecutor extends EventEmitter {
  private workflow: Workflow;
  private customExecutors: Record<string, any>;
  private results: Record<string, NodeRunResult> = {};
  private observer?: ExecutionObserver;
  private runId: string = "";

  constructor(
    workflow: Workflow,
    customExecutors: Record<string, any> = {},
    observer?: ExecutionObserver,
    runId?: string
  ) {
    super();
    this.workflow = workflow;
    this.customExecutors = customExecutors;
    this.observer = observer;
    this.runId = runId || workflow.id;
  }

  private dispatchEvent(
    type: ExecutionEvent["type"],
    nodeId?: string,
    data?: any
  ) {
    const event: ExecutionEvent = {
      specversion: "1.0",
      type,
      source: "/skein/engine",
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      time: Date.now(),
      runId: this.runId,
      workflowId: this.workflow.id,
      nodeId,
      data,
    };
    if (this.observer) {
      this.observer.onEvent(event);
    }
  }
```

Call `this.dispatchEvent(...)` on run:start, node:start, node:success, node:skipped, node:error, run:complete, run:error.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @skein/engine test`
Expected: PASS

- [ ] **Step 5: Commit task**

```bash
git add packages/engine/src/index.ts packages/engine/tests/executor-observer.test.ts
git commit -m "feat(engine): wire ExecutionObserver events into WorkflowExecutor"
```

---

### Task 3: Create Infrastructure Adapters and Refactor `apps/server`

**Files:**
- Create: `apps/server/src/adapters/websocketAdapter.ts`
- Create: `apps/server/src/adapters/dbAdapter.ts`
- Modify: `apps/server/src/index.ts:58-150`

**Interfaces:**
- Consumes: `ExecutionObserver`, `ExecutionEvent` from `@skein/engine`

- [ ] **Step 1: Create `apps/server/src/adapters/websocketAdapter.ts`**

```typescript
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
```

- [ ] **Step 2: Create `apps/server/src/adapters/dbAdapter.ts`**

```typescript
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
```

- [ ] **Step 3: Refactor `triggerWorkflowExecution` in `apps/server/src/index.ts`**

Update `triggerWorkflowExecution` to instantiate `CompositeExecutionObserver` with `WebSocketBroadcasterAdapter` and `DbPersistenceAdapter`:

```typescript
import { CompositeExecutionObserver } from "@skein/engine";
import { WebSocketBroadcasterAdapter } from "./adapters/websocketAdapter";
import { DbPersistenceAdapter } from "./adapters/dbAdapter";

async function triggerWorkflowExecution(
  workflow: DbWorkflow,
  initialPayload: Record<string, any> = {},
): Promise<string> {
  const runId = randomUUID();
  const activeRun: DbRun = {
    id: runId,
    workflowId: workflow.id,
    status: "running",
    results: {},
    startedAt: Date.now(),
  };

  await db.saveRun(activeRun);

  const observer = new CompositeExecutionObserver([
    new WebSocketBroadcasterAdapter(clients),
    new DbPersistenceAdapter(activeRun),
  ]);

  const executor = new WorkflowExecutor(workflow, {}, observer, runId);

  executor.execute(initialPayload).catch((err) => {
    fastify.log.error(`Execution error for run ID ${runId}:`, err);
  });

  return runId;
}
```

- [ ] **Step 4: Run build and verify test suite**

Run: `pnpm build && pnpm test`
Expected: Build succeeds, all unit tests pass cleanly.

- [ ] **Step 5: Commit task**

```bash
git add apps/server/src/adapters/ apps/server/src/index.ts
git commit -m "refactor(server): decouple execution triggers using CompositeExecutionObserver adapters"
```
