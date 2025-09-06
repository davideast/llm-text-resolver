import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import fs from 'fs/promises';
import { Resolver } from '../src/Resolver.js';
import { FileSystemCacheProvider } from '../src/FileSystemCacheProvider.js';
import { HttpError } from '../src/httpClient.js';

const MOCK_SERVER_PORT = 9877;
const MOCK_SERVER_URL = `http://localhost:${MOCK_SERVER_PORT}`;
const CACHE_DIR = '.test-cache';

let server: http.Server;
let getRequestCount = 0;
let headRequestCount = 0;

beforeAll(() => {
  server = http.createServer((req, res) => {
    if (req.method === 'GET') {
      getRequestCount++;
    } else if (req.method === 'HEAD') {
      headRequestCount++;
    }

    const url = req.url;
    if (url === '/pageA') {
      if (req.headers['if-none-match'] === 'etagA') {
        res.writeHead(304);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html', 'ETag': 'etagA' });
      res.end('<html><head><title>Page A</title></head><body><a href="/pageB">Page B</a></body></html>');
    } else if (url === '/pageB') {
       if (req.headers['if-none-match'] === 'etagB') {
        res.writeHead(304);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html', 'ETag': 'etagB' });
      res.end('<html><head><title>Page B</title></head><body>Content B</body></html>');
    } else if (url === '/pageC') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><head><title>Page C</title></head><body><a href="/not-found">Not Found</a></body></html>');
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
  }).listen(MOCK_SERVER_PORT);
});

afterAll(async () => {
  server.close();
  await fs.rm(CACHE_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
    getRequestCount = 0;
    headRequestCount = 0;
    await fs.rm(CACHE_DIR, { recursive: true, force: true });
});

describe('Resolver Edge Cases', () => {
    it('should handle circular dependencies gracefully', async () => {
        const resolver = new Resolver({ depth: 3 });
        const { graph } = await resolver.resolve(`${MOCK_SERVER_URL}/pageA`);
        expect(graph.nodes.size).toBe(2);
        expect(graph.nodes.has(`${MOCK_SERVER_URL}/pageA`)).toBe(true);
        expect(graph.nodes.has(`${MOCK_SERVER_URL}/pageB`)).toBe(true);
    });

    it('should mark nodes with network errors', async () => {
        const resolver = new Resolver();
        const { graph } = await resolver.resolve(`${MOCK_SERVER_URL}/pageC`);
        expect(graph.nodes.size).toBe(2);
        const errorNode = graph.nodes.get(`${MOCK_SERVER_URL}/not-found`);
        expect(errorNode).toBeDefined();
        expect(errorNode?.status).toBe('error');
    });

    it('should reject if the root URL fails', async () => {
        const resolver = new Resolver();
        await expect(resolver.resolve(`${MOCK_SERVER_URL}/not-found`)).rejects.toThrow(HttpError);
    });
});

describe('Resolver Caching', () => {
    it('should use cache on second run if content is not modified', async () => {
        const cacheProvider = new FileSystemCacheProvider(CACHE_DIR);
        const resolver = new Resolver({ depth: 2, cacheProvider });

        // First run
        const { content: content1 } = await resolver.resolve(`${MOCK_SERVER_URL}/pageA`);
        expect(getRequestCount).toBe(2);
        expect(headRequestCount).toBe(0);

        // Second run
        const resolver2 = new Resolver({ depth: 2, cacheProvider });
        const { content: content2 } = await resolver2.resolve(`${MOCK_SERVER_URL}/pageA`);
        expect(getRequestCount).toBe(2); // No new GET requests
        expect(headRequestCount).toBe(2); // HEAD requests were made
        expect(content1).toBe(content2);
    });
});

describe('Resolver', () => {
  it('should resolve a single HTML page', async () => {
    const resolver = new Resolver();
    const { content, graph } = await resolver.resolve(`${MOCK_SERVER_URL}/pageB`);
    expect(graph.nodes.size).toBe(1);
    expect(content).toBe('Content B');
  });

  it('should resolve a site with depth 2', async () => {
    const resolver = new Resolver();
    const { content, graph } = await resolver.resolve(`${MOCK_SERVER_URL}/pageA`);
    expect(graph.nodes.size).toBe(2);
    expect(content).toBe('Page B\nContent B');
  });

  it('should respect the depth limit', async () => {
    const resolver = new Resolver({ depth: 1 });
    const { content, graph } = await resolver.resolve(`${MOCK_SERVER_URL}/pageA`);
    expect(graph.nodes.size).toBe(1);
    expect(content).toBe('Page B');
  });
});
