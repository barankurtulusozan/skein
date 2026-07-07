import { z } from "zod";

export const PortSchema = z.object({
  id: z.string(),
  label: z.string(),
  dataType: z.enum(["string", "number", "boolean", "object", "array", "any"]),
});

export const NodeDefinitionSchema = z.object({
  type: z.string(), // unique node type id, e.g. "http-request"
  label: z.string(),
  category: z.enum(["trigger", "action", "logic", "ai", "output"]),
  inputs: z.array(PortSchema),
  outputs: z.array(PortSchema),
  configSchema: z.any().optional(), // zod schema for this node's static config, per-type
});

export type Port = z.infer<typeof PortSchema>;
export type NodeDefinition = z.infer<typeof NodeDefinitionSchema>;
