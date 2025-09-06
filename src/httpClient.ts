export class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function httpClient(url: string, signal?: AbortSignal): Promise<any> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new HttpError(response.statusText, response.status);
  }

  return response.text();
}
