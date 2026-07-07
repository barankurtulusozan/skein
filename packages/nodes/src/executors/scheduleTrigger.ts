export async function scheduleTriggerExecutor(
  config: Record<string, any>,
  inputs: Record<string, any>,
): Promise<Record<string, any>> {
  return {
    timestamp: Date.now(),
  };
}
