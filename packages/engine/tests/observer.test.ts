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
