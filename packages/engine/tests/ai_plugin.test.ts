import { describe, it, expect } from "vitest";
import { WorkflowExecutor } from "../src";

describe("AI & Plugin Custom Executors", () => {
  it("should resolve and execute an llm-prompt node with mock responses", async () => {
    const workflow = {
      id: "flow-ai-1",
      name: "AI Prompt Flow",
      nodes: [
        {
          id: "trigger",
          type: "manual-trigger",
          position: { x: 0, y: 0 },
          config: {},
        },
        {
          id: "prompt-node",
          type: "llm-prompt",
          position: { x: 200, y: 0 },
          config: {
            provider: "OpenAI",
            model: "gpt-4o-mini",
            promptTemplate: "Please synthesize: {{payload.text}}",
            apiKey: "mock-key",
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "trigger",
          sourceHandle: "payload",
          target: "prompt-node",
          targetHandle: "prompt",
        },
      ],
    };

    const executor = new WorkflowExecutor(workflow);
    const results = await executor.execute({ text: "Hello AI" });

    expect(results["prompt-node"].status).toBe("success");
    expect(results["prompt-node"].output?.response).toContain(
      '[Mock LLM Response for: "Hello AI"]',
    );
  });

  it("should run tool call loop when a tool-call node is connected downstream from llm-prompt", async () => {
    const workflow = {
      id: "flow-ai-tool",
      name: "AI Tool Flow",
      nodes: [
        {
          id: "prompt-node",
          type: "llm-prompt",
          position: { x: 0, y: 0 },
          config: {
            provider: "OpenAI",
            promptTemplate: "Trigger weather tool",
            apiKey: "mock-key",
          },
        },
        {
          id: "tool-node",
          type: "tool-call",
          position: { x: 300, y: 0 },
          config: {
            toolName: "get_weather",
          },
        },
      ],
      edges: [
        {
          id: "edge-tool",
          source: "prompt-node",
          sourceHandle: "response",
          target: "tool-node",
          targetHandle: "args",
        },
      ],
    };

    let toolExecutionCount = 0;
    const customToolExecutor = async (config: any, inputs: any) => {
      toolExecutionCount++;
      return { result: inputs.args ?? {} };
    };

    const executor = new WorkflowExecutor(workflow, {
      "tool-call": customToolExecutor,
    });
    const results = await executor.execute();

    expect(results["prompt-node"].status).toBe("success");
    expect(results["tool-node"].status).toBe("success");
    expect(toolExecutionCount).toBe(1);
    expect(results["prompt-node"].output?.response).toContain(
      'with tool result: {"value":"mock_tool_input"}',
    );
  });

  it("should execute a custom unregistered node type using injected customExecutors map", async () => {
    const workflow = {
      id: "flow-custom",
      name: "Custom Webhook Flow",
      nodes: [
        {
          id: "trigger",
          type: "manual-trigger",
          position: { x: 0, y: 0 },
          config: {},
        },
        {
          id: "discord-node",
          type: "discord-webhook",
          position: { x: 250, y: 0 },
          config: {
            webhookUrl: "https://discord.com/api/webhooks/mock-id",
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "trigger",
          sourceHandle: "payload",
          target: "discord-node",
          targetHandle: "content",
        },
      ],
    };

    // Define the custom node executor entirely outside core packages/nodes
    const customDiscordExecutor = async (config: any, inputs: any) => {
      return {
        delivered: true,
        sentContent: inputs.content || "Empty message",
        targetUrl: config.webhookUrl,
      };
    };

    const executor = new WorkflowExecutor(workflow, {
      "discord-webhook": customDiscordExecutor,
    });

    const results = await executor.execute({ content: "Skein rocks!" });

    expect(results["discord-node"].status).toBe("success");
    expect(results["discord-node"].output).toEqual({
      delivered: true,
      sentContent: { content: "Skein rocks!" },
      targetUrl: "https://discord.com/api/webhooks/mock-id",
    });
  });
});
