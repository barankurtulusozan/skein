export async function transformExecutor(
  config: Record<string, any>,
  inputs: Record<string, any>,
): Promise<Record<string, any>> {
  const input = inputs.input;
  const code = config.code || "return input;";

  try {
    const fn = new Function("input", code);
    const output = fn(input);
    return { output };
  } catch (err: any) {
    throw new Error(`Transform code evaluation error: ${err.message}`);
  }
}
