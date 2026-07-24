import { Node, Edge } from "@xyflow/react";

export interface WorkflowTemplate {
  id: string;
  name: string;
  category: "AI" | "Integration" | "Logic" | "Schedules";
  description: string;
  nodes: Node[];
  edges: Edge[];
}

export const AI_SUPPORT_ROUTER_TEMPLATE: WorkflowTemplate = {
  id: "template-ai-support-router",
  name: "AI Support Ticket Router (Showcase)",
  category: "AI",
  description:
    "Automated AI ticket classification and routing pipeline using LLM prompt intelligence, conditional logic, and HTTP webhooks.",
  nodes: [
    {
      id: "node-webhook",
      type: "webhook-trigger",
      position: { x: 80, y: 180 },
      data: { config: {} },
    },
    {
      id: "node-classifier",
      type: "llm-prompt",
      position: { x: 420, y: 180 },
      data: {
        config: {
          provider: "OpenAI",
          model: "gpt-4o",
          promptTemplate:
            "Analyze the following customer support ticket and classify it into exactly one category ('billing', 'technical', 'general'): {{input}}",
        },
      },
    },
    {
      id: "node-condition-billing",
      type: "condition",
      position: { x: 760, y: 180 },
      data: {
        config: {
          expression: 'input === "billing"',
        },
      },
    },
    {
      id: "node-slack-billing",
      type: "http-request",
      position: { x: 1100, y: 80 },
      data: {
        config: {
          method: "POST",
          urlTemplate: "https://httpbin.org/post",
        },
      },
    },
    {
      id: "node-log-general",
      type: "log-debug",
      position: { x: 1100, y: 300 },
      data: { config: {} },
    },
  ],
  edges: [
    {
      id: "e-webhook-classifier",
      source: "node-webhook",
      sourceHandle: "body",
      target: "node-classifier",
      targetHandle: "prompt",
    },
    {
      id: "e-classifier-condition",
      source: "node-classifier",
      sourceHandle: "response",
      target: "node-condition-billing",
      targetHandle: "value",
    },
    {
      id: "e-condition-true-slack",
      source: "node-condition-billing",
      sourceHandle: "true",
      target: "node-slack-billing",
      targetHandle: "body",
    },
    {
      id: "e-condition-false-log",
      source: "node-condition-billing",
      sourceHandle: "false",
      target: "node-log-general",
      targetHandle: "data",
    },
  ],
};

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  AI_SUPPORT_ROUTER_TEMPLATE,
];
