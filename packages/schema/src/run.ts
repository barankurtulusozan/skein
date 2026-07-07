import { z } from 'zod';

export const NodeRunStatusSchema = z.enum(['idle', 'queued', 'running', 'success', 'error', 'skipped']);

export const NodeRunResultSchema = z.object({
  nodeId: z.string(),
  status: NodeRunStatusSchema,
  output: z.any().optional(),
  error: z.string().optional(),
  startedAt: z.number().optional(),
  finishedAt: z.number().optional(),
});

export type NodeRunStatus = z.infer<typeof NodeRunStatusSchema>;
export type NodeRunResult = z.infer<typeof NodeRunResultSchema>;
