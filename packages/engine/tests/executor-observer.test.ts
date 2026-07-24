import { describe, it, expect } from "vitest";
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
