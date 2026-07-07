import { describe, it, expect } from "vitest";
import {
  PortSchema,
  NodeDefinitionSchema,
  WorkflowNodeSchema,
  WorkflowEdgeSchema,
  WorkflowSchema,
  NodeRunResultSchema,
} from "../src";

describe("Skein Schema Verification", () => {
  describe("PortSchema", () => {
    it("should validate correct port schemas", () => {
      const validPort = {
        id: "input-1",
        label: "My Input",
        dataType: "string",
      };
      const result = PortSchema.safeParse(validPort);
      expect(result.success).toBe(true);
    });

    it("should reject invalid data types", () => {
      const invalidPort = {
        id: "input-1",
        label: "My Input",
        dataType: "invalid-type",
      };
      const result = PortSchema.safeParse(invalidPort);
      expect(result.success).toBe(false);
    });
  });

  describe("NodeDefinitionSchema", () => {
    it("should validate correct node definitions", () => {
      const validNode = {
        type: "http-request",
        label: "HTTP Request",
        category: "action",
        inputs: [{ id: "url", label: "URL", dataType: "string" }],
        outputs: [{ id: "response", label: "Response", dataType: "object" }],
      };
      const result = NodeDefinitionSchema.safeParse(validNode);
      expect(result.success).toBe(true);
    });
  });

  describe("WorkflowSchema", () => {
    it("should validate correct workflows", () => {
      const validWorkflow = {
        id: "flow-123",
        name: "My Test Flow",
        nodes: [
          {
            id: "node-1",
            type: "manual-trigger",
            position: { x: 100, y: 150 },
            config: {},
          },
          {
            id: "node-2",
            type: "log",
            position: { x: 300, y: 150 },
            config: { format: "json" },
          },
        ],
        edges: [
          {
            id: "edge-1",
            source: "node-1",
            sourceHandle: "out",
            target: "node-2",
            targetHandle: "in",
          },
        ],
      };
      const result = WorkflowSchema.safeParse(validWorkflow);
      expect(result.success).toBe(true);
    });

    it("should reject workflow nodes with missing position", () => {
      const invalidWorkflow = {
        id: "flow-123",
        name: "My Test Flow",
        nodes: [
          {
            id: "node-1",
            type: "manual-trigger",
            config: {},
          },
        ],
        edges: [],
      };
      const result = WorkflowSchema.safeParse(invalidWorkflow);
      expect(result.success).toBe(false);
    });
  });

  describe("NodeRunResultSchema", () => {
    it("should validate valid run status outcomes", () => {
      const validRun = {
        nodeId: "node-1",
        status: "success",
        output: { data: "hello" },
        startedAt: Date.now(),
        finishedAt: Date.now() + 100,
      };
      const result = NodeRunResultSchema.safeParse(validRun);
      expect(result.success).toBe(true);
    });

    it("should reject invalid run status", () => {
      const invalidRun = {
        nodeId: "node-1",
        status: "finished", // 'finished' is not a valid enum value
      };
      const result = NodeRunResultSchema.safeParse(invalidRun);
      expect(result.success).toBe(false);
    });
  });
});
