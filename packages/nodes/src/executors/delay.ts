export async function delayExecutor(
  config: Record<string, any>,
  inputs: Record<string, any>
): Promise<Record<string, any>> {
  const seconds = Number(config.seconds) || 5;
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  return {
    output: inputs.input ?? null
  };
}
