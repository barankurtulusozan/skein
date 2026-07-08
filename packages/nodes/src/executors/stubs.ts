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
