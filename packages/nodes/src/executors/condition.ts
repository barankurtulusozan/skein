export async function conditionExecutor(
  config: Record<string, any>,
  inputs: Record<string, any>,
): Promise<Record<string, any>> {
  const value = inputs.value;
  const expression = config.expression || "input === true";

  try {
    const evaluate = new Function("input", `return (${expression});`);
    const result = Boolean(evaluate(value));

    if (result) {
      return { true: value };
    } else {
      return { false: value };
    }
  } catch (err: any) {
    throw new Error(`Condition evaluation error: ${err.message}`);
  }
}
