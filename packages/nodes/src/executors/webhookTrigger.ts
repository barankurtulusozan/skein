export async function webhookTriggerExecutor(
  config: Record<string, any>,
  inputs: Record<string, any>
): Promise<Record<string, any>> {
  return {
    headers: inputs.headers ?? {},
    body: inputs.body ?? {}
  };
}
