import { Workflow, WorkflowNode, WorkflowEdge, NodeRunResult } from '@skein/schema';
import { NODE_EXECUTORS } from '@skein/nodes';
import { topoSort } from './topoSort';
import { EventEmitter } from './eventEmitter';

export class WorkflowExecutor extends EventEmitter {
  private workflow: Workflow;
  private results: Record<string, NodeRunResult> = {};

  constructor(workflow: Workflow) {
    super();
    this.workflow = workflow;
  }

  async execute(initialPayload: Record<string, any> = {}): Promise<Record<string, NodeRunResult>> {
    // 1. Verify there are no cycles (topoSort throws if cyclic)
    topoSort(this.workflow);

    this.emit('run:start', this.workflow.id);

    // Initialize all node results
    this.workflow.nodes.forEach((node) => {
      this.results[node.id] = {
        nodeId: node.id,
        status: 'idle',
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
      const node = this.workflow.nodes.find((n) => n.id === nodeId)!;
      const edges = incomingEdges[nodeId];

      let inputs: Record<string, any> = {};
      let isSkipped = skippedNodes.has(nodeId);

      if (!isSkipped && edges.length > 0) {
        let activeIncomingCount = 0;
        edges.forEach((edge) => {
          const parentResult = this.results[edge.source];
          if (parentResult && parentResult.status === 'success' && parentResult.output) {
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
      } else if (!isSkipped && node.type === 'manual-trigger') {
        inputs.payload = initialPayload;
      }

      if (isSkipped) {
        this.results[nodeId] = {
          nodeId,
          status: 'skipped',
          startedAt: Date.now(),
          finishedAt: Date.now(),
        };
        this.emit('node:skipped', nodeId);
        
        // Propagate skipped state to all downstream nodes
        adjList[nodeId].forEach((childId) => {
          skippedNodes.add(childId);
        });
      } else {
        this.results[nodeId] = {
          nodeId,
          status: 'running',
          startedAt: Date.now(),
        };
        this.emit('node:start', nodeId);

        try {
          const executor = NODE_EXECUTORS[node.type];
          if (!executor) {
            throw new Error(`No executor found for node type: "${node.type}"`);
          }

          const output = await executor(node.config || {}, inputs);
          
          this.results[nodeId] = {
            nodeId,
            status: 'success',
            output,
            startedAt: this.results[nodeId].startedAt,
            finishedAt: Date.now(),
          };
          this.emit('node:success', nodeId, output);
        } catch (err: any) {
          const errMsg = err.message || String(err);
          this.results[nodeId] = {
            nodeId,
            status: 'error',
            error: errMsg,
            startedAt: this.results[nodeId].startedAt,
            finishedAt: Date.now(),
          };
          this.emit('node:error', nodeId, errMsg);
          
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
          
          runErrorOccurred = new Error(`Node execution failed at node "${nodeId}": ${errMsg}`);
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
      this.emit('run:error', runErrorOccurred.message);
      throw runErrorOccurred;
    }

    this.emit('run:complete', this.results);
    return this.results;
  }
}

// Helper runWorkflow export (keeps baseline compat)
export function runWorkflow(workflow: any): string {
  return `Engine executing workflow: ${workflow.name}`;
}
