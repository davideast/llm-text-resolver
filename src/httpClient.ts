export class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function httpClient(
  url: string,
  signal?: AbortSignal,
  method: 'GET' | 'HEAD' = 'GET',
  headers: Record<string, string> = {}
): Promise<Response> {
  const response = await fetch(url, { signal, method, headers });

  // Do not throw for 304, as it's an expected success case for caching
  if (!response.ok && response.status !== 304) {
    throw new HttpError(response.statusText, response.status);
  }

  return response;
}