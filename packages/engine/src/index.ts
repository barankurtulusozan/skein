import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  NodeRunResult,
} from "@skein/schema";
import { NODE_EXECUTORS } from "@skein/nodes";
import { topoSort } from "./topoSort";
import { EventEmitter } from "./eventEmitter";

import { ExecutionObserver, ExecutionEvent } from "./observer";

export class WorkflowExecutor extends EventEmitter {
  private workflow: Workflow;
  private customExecutors: Record<string, any>;
  private results: Record<string, NodeRunResult> = {};
  private observer?: ExecutionObserver;
  private runId: string;

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
    if (this.observer) {
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
      try {
        this.observer.onEvent(event);
      } catch (err) {
        console.error("Error in ExecutionObserver listener:", err);
      }
    }
  }

  async execute(
    initialPayload: Record<string, any> = {},
  ): Promise<Record<string, NodeRunResult>> {
    // 1. Verify there are no cycles (topoSort throws if cyclic)
    topoSort(this.workflow);

    this.emit("run:start", this.workflow.id);
    this.dispatchEvent("com.skein.workflow.run.start");


    // Initialize all node results
    this.workflow.nodes.forEach((node) => {
      this.results[node.id] = {
        nodeId: node.id,
        status: "idle",
      };
    });

    const nodeIds = this.workflow.nodes.map((n) => n.id);
    const inDegree: Record<string, number> = {};
    const adjList: Record<string, string[]> = {};
    const incomingEdges: Record<string, WorkflowEdge[]> = {};

    nodeIds.forEach((id) => {
      inDegree[id] = 0;
      adjList[id] = [];
      incomingEdges[id] = [];
    });

    this.workflow.edges.forEach((edge) => {
      if (nodeIds.includes(edge.source) && nodeIds.includes(edge.target)) {
        adjList[edge.source].push(edge.target);
        incomingEdges[edge.target].push(edge);
        inDegree[edge.target]++;
      }
    });

    const activePromises: Record<string, Promise<void>> = {};
    const skippedNodes = new Set<string>();
    let runErrorOccurred: any = null;

    const executeNode = async (nodeId: string): Promise<void> => {
      // Visited guard to prevent double-execution of nodes already run by tool paths
      if (
        this.results[nodeId] &&
        (this.results[nodeId].status === "success" ||
          this.results[nodeId].status === "running" ||
          this.results[nodeId].status === "error" ||
          this.results[nodeId].status === "skipped")
      ) {
        return;
      }

      const node = this.workflow.nodes.find((n) => n.id === nodeId)!;
      const edges = incomingEdges[nodeId];

      let inputs: Record<string, any> = {};
      let isSkipped = skippedNodes.has(nodeId);

      if (!isSkipped && edges.length > 0) {
        let activeIncomingCount = 0;
        edges.forEach((edge) => {
          const parentResult = this.results[edge.source];
          if (
            parentResult &&
            parentResult.status === "success" &&
            parentResult.output
          ) {
            const val = parentResult.output[edge.sourceHandle];
            if (val !== undefined) {
              inputs[edge.targetHandle] = val;
              activeIncomingCount++;
            }
          }
        });

        // Skip if no active incoming inputs were matched
        if (activeIncomingCount === 0) {
          isSkipped = true;
        }
      } else if (!isSkipped && node.type === "manual-trigger") {
        inputs.payload = initialPayload;
      }

      if (isSkipped) {
        this.results[nodeId] = {
          nodeId,
          status: "skipped",
          startedAt: Date.now(),
          finishedAt: Date.now(),
        };
        this.emit("node:skipped", nodeId);
        this.dispatchEvent("com.skein.workflow.node.skipped", nodeId);

        // Propagate skipped state to all downstream nodes
        adjList[nodeId].forEach((childId) => {
          skippedNodes.add(childId);
        });
      } else {
        this.results[nodeId] = {
          nodeId,
          status: "running",
          startedAt: Date.now(),
        };
        this.emit("node:start", nodeId);
        this.dispatchEvent("com.skein.workflow.node.start", nodeId);

        try {
          const activeExecutors = {
            ...NODE_EXECUTORS,
            ...this.customExecutors,
          };
          const executor = activeExecutors[node.type];
          if (!executor) {
            throw new Error(`No executor found for node type: "${node.type}"`);
          }

          const output = await executor(node.config || {}, inputs, {
            workflow: this.workflow,
            executors: activeExecutors,
            nodeId,
            executor: this,
          });

          this.results[nodeId] = {
            nodeId,
            status: "success",
            output,
            startedAt: this.results[nodeId].startedAt,
            finishedAt: Date.now(),
          };
          this.emit("node:success", nodeId, output);
          this.dispatchEvent("com.skein.workflow.node.success", nodeId, { output });
        } catch (err: any) {
          const errMsg = err.message || String(err);
          this.results[nodeId] = {
            nodeId,
            status: "error",
            error: errMsg,
            startedAt: this.results[nodeId].startedAt,
            finishedAt: Date.now(),
          };
          this.emit("node:error", nodeId, errMsg);
          this.dispatchEvent("com.skein.workflow.node.error", nodeId, { error: errMsg });

          // Mark all remaining downstream children as skipped
          const skipDownstream = (id: string) => {
            adjList[id].forEach((childId) => {
              if (!skippedNodes.has(childId)) {
                skippedNodes.add(childId);
                skipDownstream(childId);
              }
            });
          };
          skipDownstream(nodeId);

          runErrorOccurred = new Error(
            `Node execution failed at node "${nodeId}": ${errMsg}`,
          );
        }
      }

      // Check all children
      const children = adjList[nodeId];
      const nextPromises: Promise<void>[] = [];

      children.forEach((childId) => {
        inDegree[childId]--;
        if (inDegree[childId] === 0) {
          const childPromise = executeNode(childId);
          activePromises[childId] = childPromise;
          nextPromises.push(childPromise);
        }
      });

      await Promise.all(nextPromises);
    };

    // Find starting nodes (inDegree 0)
    const initialNodes = nodeIds.filter((id) => inDegree[id] === 0);
    const initialPromises = initialNodes.map((id) => {
      const p = executeNode(id);
      activePromises[id] = p;
      return p;
    });

    await Promise.all(initialPromises);

    if (runErrorOccurred) {
      this.emit("run:error", runErrorOccurred.message);
      this.dispatchEvent("com.skein.workflow.run.error", undefined, { error: runErrorOccurred.message });
      throw runErrorOccurred;
    }

    this.emit("run:complete", this.results);
    this.dispatchEvent("com.skein.workflow.run.complete", undefined, { results: this.results });
    return this.results;
  }

  async executeToolSubpath(
    startNodeId: string,
    initialInputs: Record<string, any>,
  ): Promise<any> {
    let currentNodeId: string | undefined = startNodeId;
    let currentInputs = initialInputs;

    while (currentNodeId) {
      const node = this.workflow.nodes.find((n) => n.id === currentNodeId);
      if (!node) break;

      this.results[node.id] = {
        nodeId: node.id,
        status: "running",
        startedAt: Date.now(),
      };
      this.emit("node:start", node.id);
      this.dispatchEvent("com.skein.workflow.node.start", node.id);

      try {
        const activeExecutors = {
          ...NODE_EXECUTORS,
          ...this.customExecutors,
        };
        const executor = activeExecutors[node.type];
        if (!executor) {
          throw new Error(`No executor found for node type: "${node.type}"`);
        }

        const outputs = await executor(node.config || {}, currentInputs, {
          workflow: this.workflow,
          executors: activeExecutors,
          nodeId: node.id,
          executor: this,
        });

        this.results[node.id] = {
          nodeId: node.id,
          status: "success",
          output: outputs,
          startedAt: this.results[node.id].startedAt,
          finishedAt: Date.now(),
        };
        this.emit("node:success", node.id, outputs);
        this.dispatchEvent("com.skein.workflow.node.success", node.id, { output: outputs });

        // Find next edge in the subpath
        const outEdges = this.workflow.edges.filter(
          (e) => e.source === currentNodeId,
        );
        if (outEdges.length === 0) {
          return Object.values(outputs)[0] ?? outputs;
        }

        const nextEdge = outEdges[0];
        currentNodeId = nextEdge.target;
        currentInputs = {
          [nextEdge.targetHandle]: Object.values(outputs)[0],
        };
      } catch (err: any) {
        const errMsg = err.message || String(err);
        this.results[node.id] = {
          nodeId: node.id,
          status: "error",
          error: errMsg,
          startedAt: this.results[node.id].startedAt,
          finishedAt: Date.now(),
        };
        this.emit("node:error", node.id, errMsg);
        throw err;
      }
    }

    return currentInputs;
  }
}

// Helper runWorkflow export (keeps baseline compat)
export function runWorkflow(workflow: any): string {
  return `Engine executing workflow: ${workflow.name}`;
}

export * from "./observer";

