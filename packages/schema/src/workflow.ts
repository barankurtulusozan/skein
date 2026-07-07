import { z } from "zod";

export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  config: z.record(z.any()),
});

export const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  sourceHandle: z.string(),
  target: z.string(),
  targetHandle: z.string(),
});

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
});

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
