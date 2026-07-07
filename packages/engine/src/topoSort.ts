import { Workflow } from '@skein/schema';

export function topoSort(workflow: Workflow): string[] {
  const nodeIds = workflow.nodes.map((n) => n.id);
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};

  // Initialize in-degrees and adjacency lists
  nodeIds.forEach((id) => {
    inDegree[id] = 0;
    adjList[id] = [];
  });

  // Populate graph dependencies from edges
  workflow.edges.forEach((edge) => {
    const { source, target } = edge;
    
    // Ignore edges targeting or sourcing from non-existent nodes
    if (adjList[source] && inDegree[target] !== undefined) {
      adjList[source].push(target);
      inDegree[target] += 1;
    }
  });

  // Enqueue nodes with in-degree 0
  const queue: string[] = [];
  nodeIds.forEach((id) => {
    if (inDegree[id] === 0) {
      queue.push(id);
    }
  });

  const sorted: string[] = [];

  while (queue.length > 0) {
    const u = queue.shift()!;
    sorted.push(u);

    const neighbors = adjList[u];
    neighbors.forEach((v) => {
      inDegree[v] -= 1;
      if (inDegree[v] === 0) {
        queue.push(v);
      }
    });
  }

  // Cycle detection
  if (sorted.length < nodeIds.length) {
    // Find nodes that have non-zero in-degree (part of the cycle)
    const cyclicNodeIds = nodeIds.filter((id) => inDegree[id] > 0);
    const nodeNames = workflow.nodes
      .filter((n) => cyclicNodeIds.includes(n.id))
      .map((n) => `"${n.type}" (ID: ${n.id})`);
    
    throw new Error(
      `Workflow execution aborted: Cycle detected in graph containing nodes: ${nodeNames.join(', ')}`
    );
  }

  return sorted;
}
