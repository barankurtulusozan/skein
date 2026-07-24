# Design Spec: Skein AI Support Ticket Router Showcase Workflow

## Status
Approved

## Context
Skein is a visual workflow builder and execution engine. To effectively showcase the full capabilities of Skein—including Webhook triggers, LLM-based intelligent classification, conditional logic branching, external HTTP notifications, and visual log output—we are creating a prebuilt "AI Support Ticket Router" showcase workflow.

This showcase workflow will be accessible directly in Skein's Workflow Templates library as well as pre-populated for demonstration.

---

## 1. Showcase Workflow Definition

### Workflow Metadata
* **ID**: `template-ai-support-router`
* **Name**: `AI Support Ticket Router (Showcase)`
* **Description**: `Automated AI ticket classification and routing pipeline using LLM prompt intelligence, conditional logic, and HTTP webhooks.`

### 2. Node Graph Configuration

#### Node 1: Webhook Trigger
* **ID**: `node-webhook`
* **Type**: `webhook-trigger`
* **Label**: `Customer Webhook`
* **Position**: `{ x: 80, y: 180 }`
* **Outputs**: `body` (`object`), `headers` (`object`)
* **Config**: `{}`

#### Node 2: LLM Prompt Classifier
* **ID**: `node-classifier`
* **Type**: `llm-prompt`
* **Label**: `AI Ticket Classifier`
* **Position**: `{ x: 420, y: 180 }`
* **Inputs**: `prompt` (`string`), `system` (`string`)
* **Outputs**: `response` (`string`)
* **Config**:
  ```json
  {
    "provider": "OpenAI",
    "model": "gpt-4o",
    "promptTemplate": "Analyze the following customer support ticket and classify it into exactly one category ('billing', 'technical', 'general'): {{input}}"
  }
  ```

#### Node 3: Condition (If/Else)
* **ID**: `node-condition-billing`
* **Type**: `condition`
* **Label**: `Is Billing Ticket?`
* **Position**: `{ x: 760, y: 180 }`
* **Inputs**: `value` (`any`)
* **Outputs**: `true` (`any`), `false` (`any`)
* **Config**:
  ```json
  {
    "expression": "input === \"billing\""
  }
  ```

#### Node 4: HTTP Request (Slack Billing Alert)
* **ID**: `node-slack-billing`
* **Type**: `http-request`
* **Label**: `Notify Billing Team`
* **Position**: `{ x: 1100, y: 80 }`
* **Inputs**: `url` (`string`), `body` (`object`)
* **Outputs**: `response` (`object`), `status` (`number`)
* **Config**:
  ```json
  {
    "method": "POST",
    "urlTemplate": "https://httpbin.org/post"
  }
  ```

#### Node 5: Log / Debug (General Support Queue)
* **ID**: `node-log-general`
* **Type**: `log-debug`
* **Label**: `Log General Support`
* **Position**: `{ x: 1100, y: 300 }`
* **Inputs**: `data` (`any`)
* **Outputs**: `[]`
* **Config**: `{}`

---

### 3. Edges & Connections

1. `e-webhook-classifier`:
   * **Source**: `node-webhook` (`sourceHandle`: `body`)
   * **Target**: `node-classifier` (`targetHandle`: `prompt`)
2. `e-classifier-condition`:
   * **Source**: `node-classifier` (`sourceHandle`: `response`)
   * **Target**: `node-condition-billing` (`targetHandle`: `value`)
3. `e-condition-true-slack`:
   * **Source**: `node-condition-billing` (`sourceHandle`: `true`)
   * **Target**: `node-slack-billing` (`targetHandle`: `body`)
4. `e-condition-false-log`:
   * **Source**: `node-condition-billing` (`sourceHandle`: `false`)
   * **Target**: `node-log-general` (`targetHandle`: `data`)

---

## Target Integration Locations

1. `apps/web/src/constants/templates.ts`: Add `AI Support Ticket Router` as the premier featured template in the catalog.
2. Template Library UI & Default Workflow Fallback: Ensure users can instantly select and load this workflow onto the canvas with a single click.

---

## Verification Plan

### Automated Tests
* Verify template data structure against `@skein/schema` validation.
* Run engine execution test on `WorkflowExecutor` passing sample input payload `{"customer": "Acme", "message": "Faturalama hatası var", "user_tier": "enterprise"}`.

### Manual Verification
* Boot dev environment (`pnpm dev`).
* Load template onto canvas in browser (`http://localhost:5173`).
* Trigger run and observe node status animations and inline execution outputs.
