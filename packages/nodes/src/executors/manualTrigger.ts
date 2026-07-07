export async function manualTriggerExecutor(
  config: Record<string, any>,
  inputs: Record<string, any>
): Promise<Record<string, any>> {
  // If user provided a payload during trigger, use that.
  // Otherwise fall back to config's defaultPayload.
  let payload = inputs.payload;
  
  if (payload === undefined && config.defaultPayload) {
    try {
      payload = typeof config.defaultPayload === 'string'
        ? JSON.parse(config.defaultPayload)
        : config.defaultPayload;
    } catch (e) {
      payload = { error: 'Failed to parse default payload JSON', raw: config.defaultPayload };
    }
  }

  return { payload: payload ?? {} };
}
