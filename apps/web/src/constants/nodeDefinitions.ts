import { NodeDefinition } from '@skein/schema';

export interface UIFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  options?: string[];
  defaultValue: any;
}

export interface UINodeDefinition extends NodeDefinition {
  configFields: UIFieldDefinition[];
  description: string;
}

export const NODE_DEFINITIONS: Record<string, UINodeDefinition> = {
  'manual-trigger': {
    type: 'manual-trigger',
    label: 'Manual Trigger',
    category: 'trigger',
    inputs: [],
    outputs: [
      { id: 'payload', label: 'Payload', dataType: 'object' }
    ],
    configFields: [
      { name: 'defaultPayload', label: 'Default Payload (JSON)', type: 'textarea', defaultValue: '{\n  "message": "hello"\n}' }
    ],
    description: 'Manually trigger workflow runs with a JSON payload.'
  },
  'webhook-trigger': {
    type: 'webhook-trigger',
    label: 'Webhook Trigger',
    category: 'trigger',
    inputs: [],
    outputs: [
      { id: 'headers', label: 'Headers', dataType: 'object' },
      { id: 'body', label: 'Body', dataType: 'object' }
    ],
    configFields: [],
    description: 'Listen on an HTTP endpoint and start a run when a POST is received.'
  },
  'schedule-trigger': {
    type: 'schedule-trigger',
    label: 'Schedule Trigger',
    category: 'trigger',
    inputs: [],
    outputs: [
      { id: 'timestamp', label: 'Timestamp', dataType: 'number' }
    ],
    configFields: [
      { name: 'cron', label: 'Cron Expression', type: 'text', defaultValue: '*/5 * * * *' }
    ],
    description: 'Trigger runs at scheduled intervals using a cron expression.'
  },
  'http-request': {
    type: 'http-request',
    label: 'HTTP Request',
    category: 'action',
    inputs: [
      { id: 'url', label: 'URL', dataType: 'string' },
      { id: 'body', label: 'Body', dataType: 'object' }
    ],
    outputs: [
      { id: 'response', label: 'Response', dataType: 'object' },
      { id: 'status', label: 'Status Code', dataType: 'number' }
    ],
    configFields: [
      { name: 'method', label: 'HTTP Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], defaultValue: 'POST' },
      { name: 'urlTemplate', label: 'URL (Fallback)', type: 'text', defaultValue: 'https://httpbin.org/post' }
    ],
    description: 'Perform an HTTP request with templated options and headers.'
  },
  'delay': {
    type: 'delay',
    label: 'Delay',
    category: 'action',
    inputs: [
      { id: 'input', label: 'Trigger', dataType: 'any' }
    ],
    outputs: [
      { id: 'output', label: 'Triggered', dataType: 'any' }
    ],
    configFields: [
      { name: 'seconds', label: 'Duration (seconds)', type: 'number', defaultValue: 5 }
    ],
    description: 'Delay the workflow execution by N seconds.'
  },
  'condition': {
    type: 'condition',
    label: 'Condition (If/Else)',
    category: 'logic',
    inputs: [
      { id: 'value', label: 'Value', dataType: 'any' }
    ],
    outputs: [
      { id: 'true', label: 'True', dataType: 'any' },
      { id: 'false', label: 'False', dataType: 'any' }
    ],
    configFields: [
      { name: 'expression', label: 'Expression (e.g. input === true)', type: 'text', defaultValue: 'input === true' }
    ],
    description: 'Branch execution path based on boolean Javascript expression.'
  },
  'loop': {
    type: 'loop',
    label: 'Loop (For Each)',
    category: 'logic',
    inputs: [
      { id: 'array', label: 'Array', dataType: 'array' }
    ],
    outputs: [
      { id: 'item', label: 'Item', dataType: 'any' },
      { id: 'index', label: 'Index', dataType: 'number' }
    ],
    configFields: [],
    description: 'Iterate over an array input, running downstream actions per item.'
  },
  'transform': {
    type: 'transform',
    label: 'Transform (Code)',
    category: 'logic',
    inputs: [
      { id: 'input', label: 'Input', dataType: 'any' }
    ],
    outputs: [
      { id: 'output', label: 'Output', dataType: 'any' }
    ],
    configFields: [
      { name: 'code', label: 'JavaScript Code', type: 'textarea', defaultValue: '// Javascript: (input) => output\nreturn input;' }
    ],
    description: 'Transform inputs using sandboxed custom Javascript code.'
  },
  'llm-prompt': {
    type: 'llm-prompt',
    label: 'LLM Prompt',
    category: 'ai',
    inputs: [
      { id: 'prompt', label: 'Prompt', dataType: 'string' },
      { id: 'system', label: 'System Instruction', dataType: 'string' }
    ],
    outputs: [
      { id: 'response', label: 'Response', dataType: 'string' }
    ],
    configFields: [
      { name: 'provider', label: 'Provider', type: 'select', options: ['OpenAI', 'Anthropic', 'Local/Ollama'], defaultValue: 'OpenAI' },
      { name: 'model', label: 'Model', type: 'text', defaultValue: 'gpt-4o' },
      { name: 'promptTemplate', label: 'Prompt (Fallback)', type: 'textarea', defaultValue: 'Synthesize the following input: {{input}}' }
    ],
    description: 'Call a vendor-agnostic large language model completions endpoint.'
  },
  'tool-call': {
    type: 'tool-call',
    label: 'Tool Call (Function)',
    category: 'ai',
    inputs: [
      { id: 'args', label: 'Arguments', dataType: 'object' }
    ],
    outputs: [
      { id: 'result', label: 'Result', dataType: 'any' }
    ],
    configFields: [
      { name: 'toolName', label: 'Tool Name', type: 'text', defaultValue: 'my_tool' }
    ],
    description: 'Register a downstream node as a callable function tool for an LLM node.'
  },
  'log-debug': {
    type: 'log-debug',
    label: 'Log / Debug',
    category: 'output',
    inputs: [
      { id: 'data', label: 'Log Data', dataType: 'any' }
    ],
    outputs: [],
    configFields: [],
    description: 'Output inputs to logs and visual interface execution console.'
  }
};
