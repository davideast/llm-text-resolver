import { describe, it, expect, vi, afterEach } from 'vitest';
import { Resolver, BrowserCacheProvider, CacheProvider } from '../src/browser';
import { KnowledgeGraph } from '../src/knowledge_graph';

// Mock the global fetch function
vi.stubGlobal('fetch', vi.fn());

// Mock the Cache API
const cacheMock = {
  match: vi.fn(),
  put: vi.fn(),
};
vi.stubGlobal('caches', {
  open: vi.fn().mockResolvedValue(cacheMock),
});

function createFetchResponse(data: string, headers: Record<string, string> = {}) {
  return new Response(data, {
    status: 200,
    headers: new Headers(headers),
  });
}

describe('Resolver (Browser)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should use BrowserCacheProvider and cache the result', async () => {
    const rootUrl = 'https://example.com';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <a href="/page1">Page 1</a>
        </body>
      </html>
    `;

    (fetch as any).mockResolvedValue(createFetchResponse(htmlContent, { 'Content-Type': 'text/html' }));
    cacheMock.match.mockResolvedValue(null); // Ensure cache is empty initially

    const resolver = new Resolver({ cacheProvider: new BrowserCacheProvider() });
    const { graph } = await resolver.resolve(rootUrl);

    expect(window.caches.open).toHaveBeenCalledWith('llm-txt-resolver-cache-v1');
    expect(cacheMock.match).toHaveBeenCalledWith(rootUrl);
    expect(cacheMock.put).toHaveBeenCalledTimes(1);

    const putCall = cacheMock.put.mock.calls[0];
    expect(putCall[0]).toBe(rootUrl);
    const responseBody = await putCall[1].json();
    expect(responseBody.rootId).toBe(rootUrl);
    expect(responseBody.nodes[rootUrl].title).toBe('Test Page');
  });
});
