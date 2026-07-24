# AI Support Ticket Router Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a prebuilt featured "AI Support Ticket Router" showcase workflow to Skein and integrate a Template Library Dialog in the UI so users can load it with a single click.

**Architecture:** Create `apps/web/src/constants/templates.ts` containing the showcase workflow graph schema. Update `useWorkflowStore.ts` to pre-seed this showcase workflow into `workflowsList` by default, and add a `TemplateLibraryDialog` component triggered from `Topbar.tsx`.

**Tech Stack:** React 19, TypeScript, Zustand, Tailwind CSS, `@xyflow/react`, Vitest.

## Global Constraints

- Follow established Skein Turborepo workspace structure (`apps/web`, `packages/engine`, `packages/schema`).
- Node types and edge configurations must strictly match `@skein/schema` and `NODE_DEFINITIONS`.
- Keep changes modular, clean, and zero-breaking-changes.

---

### Task 1: Create Static Template Catalog with Showcase Workflow

**Files:**
- Create: `apps/web/src/constants/templates.ts`
- Test: `apps/web/src/__tests__/templates.test.ts`

**Interfaces:**
- Consumes: Node types from `apps/web/src/constants/nodeDefinitions.ts`
- Produces: `WORKFLOW_TEMPLATES` array containing `AI Support Ticket Router` and prebuilt workflow definitions.

- [ ] **Step 1: Write test for template definitions**

```typescript
// apps/web/src/__tests__/templates.test.ts
import { describe, it, expect } from "vitest";
import { WORKFLOW_TEMPLATES } from "../constants/templates";

describe("WORKFLOW_TEMPLATES", () => {
  it("contains the AI Support Ticket Router showcase template", () => {
    const showcase = WORKFLOW_TEMPLATES.find((t) => t.id === "template-ai-support-router");
    expect(showcase).toBeDefined();
    expect(showcase?.name).toContain("AI Support Ticket Router");
    expect(showcase?.nodes.length).toBe(5);
    expect(showcase?.edges.length).toBe(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter web test templates.test.ts`
Expected: FAIL due to missing module `../constants/templates`.

- [ ] **Step 3: Create `apps/web/src/constants/templates.ts`**

```typescript
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
  description: "Automated AI ticket classification and routing pipeline using LLM prompt intelligence, conditional logic, and HTTP webhooks.",
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
          promptTemplate: "Analyze the following customer support ticket and classify it into exactly one category ('billing', 'technical', 'general'): {{input}}",
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter web test templates.test.ts`
Expected: PASS.

---

### Task 2: Integrate Template Catalog & Pre-Seeding in Workflow Store & UI

**Files:**
- Modify: `apps/web/src/store/useWorkflowStore.ts`
- Create: `apps/web/src/components/TemplateLibraryDialog.tsx`
- Modify: `apps/web/src/components/Topbar.tsx`

**Interfaces:**
- Consumes: `WORKFLOW_TEMPLATES` from `apps/web/src/constants/templates.ts`
- Produces: `loadTemplate` store action and UI dialog in Topbar.

- [ ] **Step 1: Update `useWorkflowStore.ts` to include showcase default workflow and loadTemplate action**

Add `SHOWCASE_FLOW` to `DEFAULT_FLOW` fallback list so new users land directly on the Showcase workflow.

- [ ] **Step 2: Create `TemplateLibraryDialog.tsx` modal**

Build a clean dark-mode template selection modal that lists `WORKFLOW_TEMPLATES` and allows loading them onto the canvas with confirmation toasts.

- [ ] **Step 3: Add "Templates" button to `Topbar.tsx`**

Integrate the Templates dialog button into Topbar header navigation bar.

- [ ] **Step 4: Run build check**

Run: `pnpm build`
Expected: Clean build across all monorepo packages.

- [ ] **Step 5: Verify execution via vitest engine tests**

Run: `pnpm test`
Expected: ALL test suites pass cleanly.
