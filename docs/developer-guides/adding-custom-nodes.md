# 🔌 Adding Custom Nodes (Plugin Architecture)

Skein features a clean, extensible plugin architecture. You can implement custom node types entirely outside the core `@skein/nodes` package, register them on the fly at execution runtime, and construct complex flows without editing the core library.

---

## 🛠️ Step 1: Define the Node visual metadata (Frontend)

To make your node appear in the visual canvas builder, define its metadata in `apps/web/src/constants/nodeDefinitions.ts` (or add a plugin loader). For example, to add a **"Send to Discord Webhook"** node:

```typescript
export const DISCORD_NODE_DEFINITION = {
  type: "discord-webhook",
  label: "Send to Discord",
  category: "output",
  inputs: [{ id: "content", label: "Message Content", dataType: "string" }],
  outputs: [{ id: "success", label: "Success Status", dataType: "boolean" }],
  configFields: [
    {
      name: "webhookUrl",
      label: "Discord Webhook URL",
      type: "text",
      defaultValue: "https://discord.com/api/webhooks/...",
    },
  ],
  description: "Send content payloads directly to a Discord webhook channel.",
};
```

---

## ⚙️ Step 2: Implement the Node Executor (Backend)

An executor is a framework-agnostic asynchronous function conforming to the `NodeExecutor` signature:

```typescript
import { NodeExecutor } from "@skein/nodes";

export const discordWebhookExecutor: NodeExecutor = async (
  config,
  inputs,
  context,
) => {
  const webhookUrl = config.webhookUrl;
  const content = inputs.content || "Hello from Skein!";

  if (
    !webhookUrl ||
    webhookUrl.startsWith("https://discord.com/api/webhooks/...")
  ) {
    // Return mock success in sandbox environments
    return { success: true, message: "Mock Discord deliver success" };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(`Discord delivery failed with code: ${response.status}`);
  }

  return {
    success: true,
    message: "Message delivered to Discord channel",
  };
};
```

---

## 🚀 Step 3: Register and Run with custom executors

When instantiating the `WorkflowExecutor` in your server layer, pass your custom executors map as the second argument:

```typescript
import { WorkflowExecutor } from "@skein/engine";
import { discordWebhookExecutor } from "./executors/discordWebhook";

// Register the executor matching the target node.type
const executor = new WorkflowExecutor(workflow, {
  "discord-webhook": discordWebhookExecutor,
});

// Run the workflow
const results = await executor.execute({
  payload: { text: "Hello Webhook!" },
});
console.log("Execution result:", results);
```

---

## 🔍 Execution Flow Isolation

By injecting custom executors directly into the `WorkflowExecutor`, you decouple the node engine core from specific vendor libraries (e.g. database clients, messaging systems). Downstream variables, data typing, and execution streams will flow through your custom node types naturally!
