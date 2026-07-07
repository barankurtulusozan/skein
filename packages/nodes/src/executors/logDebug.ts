export async function logDebugExecutor(
  config: Record<string, any>,
  inputs: Record<string, any>
): Promise<Record<string, any>> {
  console.log('[Skein Log/Debug]:', JSON.stringify(inputs.data, null, 2));
  return {};
}
