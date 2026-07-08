import { manualTriggerExecutor } from "./executors/manualTrigger";
import { webhookTriggerExecutor } from "./executors/webhookTrigger";
import { scheduleTriggerExecutor } from "./executors/scheduleTrigger";
import { httpRequestExecutor } from "./executors/httpRequest";
import { delayExecutor } from "./executors/delay";
import { conditionExecutor } from "./executors/condition";
import { transformExecutor } from "./executors/transform";
import { logDebugExecutor } from "./executors/logDebug";
import { loopExecutor } from "./executors/stubs";
import { llmPromptExecutor } from "./executors/llmPrompt";
import { toolCallExecutor } from "./executors/toolCall";

export type NodeExecutor = (
  config: Record<string, any>,
  inputs: Record<string, any>,
  context?: any,
) => Promise<Record<string, any>>;

export const NODE_EXECUTORS: Record<string, NodeExecutor> = {
  "manual-trigger": manualTriggerExecutor,
  "webhook-trigger": webhookTriggerExecutor,
  "schedule-trigger": scheduleTriggerExecutor,
  "http-request": httpRequestExecutor,
  delay: delayExecutor,
  condition: conditionExecutor,
  loop: loopExecutor,
  transform: transformExecutor,
  "llm-prompt": llmPromptExecutor,
  "tool-call": toolCallExecutor,
  "log-debug": logDebugExecutor,
};

export * from "./executors/manualTrigger";
export * from "./executors/webhookTrigger";
export * from "./executors/scheduleTrigger";
export * from "./executors/httpRequest";
export * from "./executors/delay";
export * from "./executors/condition";
export * from "./executors/transform";
export * from "./executors/logDebug";
export * from "./executors/stubs";
export * from "./executors/llmPrompt";
export * from "./executors/toolCall";
