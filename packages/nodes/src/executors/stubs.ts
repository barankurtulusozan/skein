export async function loopExecutor(
  config: Record<string, any>,
  inputs: Record<string, any>,
): Promise<Record<string, any>> {
  // Simple iterator stub for loop logic
  const array = inputs.array || [];
  return {
    item: array[0] ?? null,
    index: 0,
  };
}

export async function llmPromptExecutor(
  config: Record<string, any>,
  inputs: Record<string, any>,
): Promise<Record<string, any>> {
  const prompt = inputs.prompt || config.promptTemplate || "";
  return {
    response: `[Stub LLM Response for prompt: "${prompt}"]`,
  };
}

export async function toolCallExecutor(
  config: Record<string, any>,
  inputs: Record<string, any>,
): Promise<Record<string, any>> {
  return {
    result: inputs.args ?? {},
  };
}
