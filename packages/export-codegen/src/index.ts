import { Workflow } from "@skein/schema";

// Helper templates containing stringified implementations of the built-in executors
const EXECUTORS_MAP: Record<string, string> = {
  "manual-trigger": `
async function manualTriggerExecutor(config, inputs) {
  return { payload: inputs.payload };
}`,

  "webhook-trigger": `
async function webhookTriggerExecutor(config, inputs) {
  return { payload: inputs.payload };
}`,

  "schedule-trigger": `
async function scheduleTriggerExecutor(config, inputs) {
  return { payload: inputs.payload };
}`,

  "http-request": `
function templateString(template, context) {
  return template.replace(/\\{\\{([^}]+)\\}\\}/g, (match, path) => {
    const parts = path.trim().split('.');
    let val = context;
    for (const part of parts) {
      if (val === null || val === undefined) return '';
      val = val[part];
    }
    return val !== undefined ? String(val) : '';
  });
}

async function httpRequestExecutor(config, inputs) {
  const url = templateString(config.url || '', inputs);
  const method = config.method || 'GET';
  const headers = {};
  if (config.headers) {
    try {
      const parsed = JSON.parse(config.headers);
      Object.assign(headers, parsed);
    } catch (e) {}
  }
  let body = undefined;
  if (method !== 'GET' && method !== 'HEAD' && config.body) {
    body = templateString(config.body, inputs);
  }
  const response = await fetch(url, { method, headers, body });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }
  if (!response.ok) {
    throw new Error('HTTP request failed: ' + response.statusText);
  }
  return { response: data };
}`,

  delay: `
async function delayExecutor(config, inputs) {
  const seconds = Number(config.duration) || 5;
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  return { success: true };
}`,

  condition: `
async function conditionExecutor(config, inputs) {
  const value = inputs.value;
  const expression = config.expression || 'input === true';
  const evaluate = new Function('input', 'try { return ' + expression + '; } catch (e) { return false; }');
  const isTrue = evaluate(value);
  return isTrue ? { true: value } : { false: value };
}`,

  transform: `
async function transformExecutor(config, inputs) {
  const input = inputs.input;
  const code = config.code || 'return input;';
  const fn = new Function('input', code);
  const output = fn(input);
  return { output };
}`,

  "log-debug": `
async function logDebugExecutor(config, inputs) {
  const data = inputs.data;
  console.log('[Skein Log/Debug]:', JSON.stringify(data, null, 2));
  return { logged: true };
}`,

  "llm-prompt": `
async function llmPromptExecutor(config, inputs, context) {
  const provider = config.provider || 'OpenAI';
  const model = config.model || 'gpt-4o';
  let prompt = inputs.prompt;
  if (prompt && typeof prompt === 'object') {
    prompt = prompt.text || prompt.content || prompt.message || JSON.stringify(prompt);
  }
  if (!prompt) {
    prompt = templateString(config.promptTemplate || 'Synthesize: {{input}}', inputs);
  }
  const systemInstruction = inputs.system || '';
  let baseUrl = config.baseUrl;
  if (!baseUrl) {
    baseUrl = provider === 'Local/Ollama' ? 'http://127.0.0.1:11434/v1' : 'https://api.openai.com/v1';
  }
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY || 'mock-key';
  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const workflow = context?.workflow;
  const executors = context?.executors;
  const currentId = context?.nodeId;
  const tools = [];
  const toolMappings = {};
  
  if (workflow && currentId && executors) {
    const outgoingEdges = workflow.edges.filter((e) => e.source === currentId);
    outgoingEdges.forEach((edge) => {
      const targetNode = workflow.nodes.find((n) => n.id === edge.target);
      if (targetNode && targetNode.type === 'tool-call') {
        const toolName = targetNode.config?.toolName || 'my_tool';
        tools.push({
          type: 'function',
          function: {
            name: toolName,
            description: targetNode.description || 'Custom workflow tool call',
            parameters: {
              type: 'object',
              properties: {
                args: { type: 'object', description: 'Arguments' }
              }
            }
          }
        });
        toolMappings[toolName] = targetNode;
      }
    });
  }

  const callCompletions = async (messagesList) => {
    if (apiKey === 'mock-key' || process.env.VITEST) {
      if (tools.length > 0 && messagesList.length === 1 + (systemInstruction ? 1 : 0)) {
        return {
          choices: [{
            message: {
              role: 'assistant',
              tool_calls: [{
                id: 'call_123',
                type: 'function',
                function: {
                  name: tools[0].function.name,
                  arguments: JSON.stringify({ args: { value: 'mock_tool_input' } })
                }
              }]
            }
          }]
        };
      }
      const toolResponse = messagesList.find((m) => m.role === 'tool');
      const suffix = toolResponse ? ' (with tool result: ' + toolResponse.content + ')' : '';
      return {
        choices: [{
          message: {
            role: 'assistant',
            content: '[Mock LLM Response for: "' + prompt + '"]' + suffix
          }
        }]
      };
    }
    const payload = { model, messages: messagesList };
    if (tools.length > 0) {
      payload.tools = tools;
    }
    const response = await fetch(baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error('LLM completions call failed: ' + errText);
    }
    return await response.json();
  };

  let completionResult = await callCompletions(messages);
  let messageOut = completionResult.choices?.[0]?.message;

  if (messageOut?.tool_calls && messageOut.tool_calls.length > 0) {
    const toolCall = messageOut.tool_calls[0];
    const toolName = toolCall.function.name;
    const toolNode = toolMappings[toolName];
    if (toolNode && executors) {
      let args = {};
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        args = parsed.args || parsed;
      } catch (e) {}
      const executeSubpath = async (nodeId, currentInputs) => {
        const node = workflow.nodes.find((n) => n.id === nodeId);
        if (!node) return currentInputs;
        const executor = executors[node.type];
        if (!executor) return currentInputs;
        const outputs = await executor(node.config || {}, currentInputs, context);
        const outEdges = workflow.edges.filter((e) => e.source === nodeId);
        if (outEdges.length === 0) {
          return Object.values(outputs)[0] ?? outputs;
        }
        const nextEdge = outEdges[0];
        const nextInputs = { [nextEdge.targetHandle]: Object.values(outputs)[0] };
        return executeSubpath(nextEdge.target, nextInputs);
      };
      const toolResultOutput = await executeSubpath(toolNode.id, { args });
      messages.push(messageOut);
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolName,
        content: typeof toolResultOutput === 'string' ? toolResultOutput : JSON.stringify(toolResultOutput)
      });
      completionResult = await callCompletions(messages);
      messageOut = completionResult.choices?.[0]?.message;
    }
  }
  return { response: messageOut?.content || '' };
}`,

  "tool-call": `
async function toolCallExecutor(config, inputs) {
  return { result: inputs.args ?? {} };
}`,
};

export function generateStandaloneCode(workflow: Workflow): string {
  // 1. Gather all node types present in the workflow
  const activeTypes = new Set<string>();
  workflow.nodes.forEach((node) => {
    if (node.type) activeTypes.add(node.type);
  });

  // 2. Generate the executor registration map string
  const executorImportsCode = Array.from(activeTypes)
    .map((type) => EXECUTORS_MAP[type] || "")
    .filter(Boolean)
    .join("\n");

  const registryMapping = Array.from(activeTypes)
    .map((type) => {
      const camelCaseName =
        type.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) + "Executor";
      return `  '${type}': ${camelCaseName},`;
    })
    .join("\n");

  return `// 🧶 Standalone workflow execution code generated by Skein
// Workflow Name: ${workflow.name}
// Generated At: ${new Date().toISOString()}

const workflow = ${JSON.stringify(workflow, null, 2)};

// --- Node Executors ---
${executorImportsCode}

const EXECUTORS = {
${registryMapping}
};

// --- In-Memory Topological Sorted Run Core ---
class StandaloneWorkflowExecutor {
  constructor(workflow) {
    this.workflow = workflow;
    this.results = {};
  }

  async execute(initialPayload = {}) {
    const nodeIds = this.workflow.nodes.map((n) => n.id);
    const inDegree = {};
    const adjList = {};
    const incomingEdges = {};

    nodeIds.forEach((id) => {
      inDegree[id] = 0;
      adjList[id] = [];
      incomingEdges[id] = [];
      this.results[id] = { nodeId: id, status: 'idle' };
    });

    this.workflow.edges.forEach((edge) => {
      if (nodeIds.includes(edge.source) && nodeIds.includes(edge.target)) {
        adjList[edge.source].push(edge.target);
        incomingEdges[edge.target].push(edge);
        inDegree[edge.target]++;
      }
    });

    const activePromises = {};
    const skippedNodes = new Set();
    let runErrorOccurred = null;

    const executeNode = async (nodeId) => {
      const node = this.workflow.nodes.find((n) => n.id === nodeId);
      const edges = incomingEdges[nodeId];
      let inputs = {};
      let isSkipped = skippedNodes.has(nodeId);

      if (!isSkipped && edges.length > 0) {
        let activeIncomingCount = 0;
        edges.forEach((edge) => {
          const parentResult = this.results[edge.source];
          if (parentResult && parentResult.status === 'success' && parentResult.output) {
            const val = parentResult.output[edge.sourceHandle];
            if (val !== undefined) {
              inputs[edge.targetHandle] = val;
              activeIncomingCount++;
            }
          }
        });
        if (activeIncomingCount === 0) {
          isSkipped = true;
        }
      } else if (!isSkipped && node.type === 'manual-trigger') {
        inputs.payload = initialPayload;
      }

      if (isSkipped) {
        this.results[nodeId] = {
          nodeId,
          status: 'skipped',
          startedAt: Date.now(),
          finishedAt: Date.now(),
        };
        adjList[nodeId].forEach((childId) => {
          skippedNodes.add(childId);
        });
      } else {
        this.results[nodeId] = {
          nodeId,
          status: 'running',
          startedAt: Date.now(),
        };

        try {
          const executor = EXECUTORS[node.type];
          if (!executor) {
            throw new Error('No executor found for node type: ' + node.type);
          }

          const output = await executor(node.config || {}, inputs, {
            workflow: this.workflow,
            executors: EXECUTORS,
            nodeId,
          });

          this.results[nodeId] = {
            nodeId,
            status: 'success',
            output,
            startedAt: this.results[nodeId].startedAt,
            finishedAt: Date.now(),
          };
        } catch (err) {
          const errMsg = err.message || String(err);
          this.results[nodeId] = {
            nodeId,
            status: 'error',
            error: errMsg,
            startedAt: this.results[nodeId].startedAt,
            finishedAt: Date.now(),
          };

          const skipDownstream = (id) => {
            adjList[id].forEach((childId) => {
              if (!skippedNodes.has(childId)) {
                skippedNodes.add(childId);
                skipDownstream(childId);
              }
            });
          };
          skipDownstream(nodeId);

          runErrorOccurred = new Error('Node execution failed at node ' + nodeId + ': ' + errMsg);
        }
      }

      const children = adjList[nodeId];
      const nextPromises = [];

      children.forEach((childId) => {
        inDegree[childId]--;
        if (inDegree[childId] === 0) {
          const childPromise = executeNode(childId);
          activePromises[childId] = childPromise;
          nextPromises.push(childPromise);
        }
      });

      await Promise.all(nextPromises);
    };

    const initialNodes = nodeIds.filter((id) => inDegree[id] === 0);
    const initialPromises = initialNodes.map((id) => {
      const p = executeNode(id);
      activePromises[id] = p;
      return p;
    });

    await Promise.all(initialPromises);

    if (runErrorOccurred) {
      throw runErrorOccurred;
    }

    return this.results;
  }
}

export async function run(initialPayload = {}) {
  const runner = new StandaloneWorkflowExecutor(workflow);
  return await runner.execute(initialPayload);
}

// Auto-run when executed directly via Node.js
if (import.meta.url === 'file://' + process.argv[1]) {
  run()
    .then((res) => console.log('Standalone execution result:', res))
    .catch((err) => console.error('Standalone run failed:', err));
}
`;
}
