export function templateString(str: string, variables: Record<string, any>): string {
  return str.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const keys = path.trim().split('.');
    let val: any = variables;
    for (const key of keys) {
      if (val === null || val === undefined) return '';
      val = val[key];
    }
    return val !== undefined ? String(val) : '';
  });
}

export async function httpRequestExecutor(
  config: Record<string, any>,
  inputs: Record<string, any>
): Promise<Record<string, any>> {
  // Extract URL: from input edge, or fallback to templated urlTemplate config
  let url = inputs.url;
  if (!url && config.urlTemplate) {
    url = templateString(config.urlTemplate, inputs);
  }

  if (!url) {
    throw new Error('HTTP Request failed: Missing URL.');
  }

  const method = (config.method || 'GET').toUpperCase();
  const requestBody = inputs.body ?? undefined;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  if (method !== 'GET' && method !== 'HEAD' && requestBody !== undefined) {
    options.body = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
  }

  const response = await fetch(url, options);
  const status = response.status;
  
  let responseData: any;
  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  return {
    response: responseData,
    status
  };
}
