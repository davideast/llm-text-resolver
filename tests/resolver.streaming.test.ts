import * as http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KnowledgeGraph } from '../src/knowledge_graph';
import { Resolver } from '../src/resolver';

let server: http.Server;
const port = 8989;

function startServer(): Promise<void> {
  return new Promise(resolve => {
    server = http.createServer((req, res) => {
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><head><title>Root</title></head><body><a href="/page1">Page 1</a></body></html>');
      } else if (req.url === '/page1') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<html><head><title>Page 1</title></head><body><a href="/page2">Page 2</a></body></html>'
        );
      } else if (req.url === '/page2') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><head><title>Page 2</title></head><body>Content Page 2</body></html>');
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(port, () => {
      resolve();
    });
  });
}

function stopServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!server) {
      return resolve();
    }
    server.close(err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function getRootUrl(): string {
  return `http://localhost:${port}`;
}

async function streamToString(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    result += value;
  }
  return result;
}

describe('Resolver Streaming', () => {
  let rootUrl: string;

  beforeAll(async () => {
    await startServer();
    rootUrl = getRootUrl();
  });

  afterAll(async () => {
    await stopServer();
  });

  it('should resolve with streaming API', async () => {
    const resolver = new Resolver({ depth: 2 });
    const stream = resolver.resolve(rootUrl, { stream: true });
    const content = await streamToString(stream);

    expect(content).toContain('Page 1');
    expect(content).toContain('Page 2');
  });

  it('should resolve with promise API by default', async () => {
    const resolver = new Resolver({ depth: 2 });
    const { content, graph } = await resolver.resolve(rootUrl);

    expect(content).toContain('Page 1');
    expect(content).toContain('Page 2');
    expect(graph).toBeInstanceOf(KnowledgeGraph);
    expect(graph.nodes.size).toBe(3);
  });

  it('should resolve with promise API explicitly', async () => {
    const resolver = new Resolver({ depth: 2 });
    const { content, graph } = await resolver.resolve(rootUrl, { stream: false });

    expect(content).toContain('Page 1');
    expect(content).toContain('Page 2');
    expect(graph).toBeInstanceOf(KnowledgeGraph);
    expect(graph.nodes.size).toBe(3);
  });

  it('should handle errors in streaming mode', async () => {
    const resolver = new Resolver({ depth: 2 });
    const stream = resolver.resolve(`${rootUrl}/non-existent`, { stream: true });

    await expect(streamToString(stream)).rejects.toThrow('Not Found');
  });

  it('should handle errors in promise mode', async () => {
    const resolver = new Resolver({ depth: 2 });
    await expect(resolver.resolve(`${rootUrl}/non-existent`)).rejects.toThrow('Not Found');
  });
});