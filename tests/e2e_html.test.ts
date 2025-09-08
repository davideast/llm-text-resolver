import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Resolver } from '../src/resolver.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { AddressInfo } from 'net';

let server: http.Server;
let MOCK_SERVER_URL: string;
const SITE_DIR = path.resolve(process.cwd(), 'tests/site');

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

beforeAll(async () => {
  await new Promise<void>(resolve => {
    server = http.createServer((req, res) => {
      const filePath = path.join(SITE_DIR, req.url === '/' ? 'index.html' : req.url!);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    }).listen(0, () => {
      const { port } = server.address() as AddressInfo;
      MOCK_SERVER_URL = `http://localhost:${port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
});

describe('Resolver E2E with local server (HTML)', () => {
  it('should successfully crawl the local test site with the promise API', async () => {
    const resolver = new Resolver({ depth: 2 });
    const rootUrl = `${MOCK_SERVER_URL}/index.html`;

    const { content, graph } = await resolver.resolve(rootUrl);

    // Check that the process completed and returned data
    expect(content).toBeTypeOf('string');
    expect(content.length).toBeGreaterThan(50);
    expect(graph.nodes.size).toBe(2);

    // Check the root node for correctness
    const rootNode = graph.nodes.get(rootUrl);
    expect(rootNode).toBeDefined();
    expect(rootNode?.status).toBe('completed');
    expect(rootNode?.cleanContent).toContain('Welcome to the HTML test page');
    expect(rootNode?.links.length).toBe(1);

    // Check that it followed a link and processed the content
    const firstLink = rootNode?.links[0].targetId;
    expect(firstLink).toBeDefined();
    const secondNode = graph.nodes.get(firstLink!);
    expect(secondNode).toBeDefined();
    expect(secondNode?.status).toBe('completed');
    expect(secondNode?.depth).toBe(1);
    expect(secondNode?.cleanContent).toContain('This is page 1.');

    // Check that the final content is in the correct order
    expect(content).toContain('Welcome to the HTML test page');
    expect(content).toContain('This is page 1.');
  });

  it('should successfully crawl the local test site with the streaming API', async () => {
    const resolver = new Resolver({ depth: 2 });
    const rootUrl = `${MOCK_SERVER_URL}/index.html`;

    const stream = resolver.resolve(rootUrl, { stream: true });
    const content = await streamToString(stream);

    // Check that the process completed and returned data
    expect(content).toBeTypeOf('string');
    expect(content.length).toBeGreaterThan(50);

    // Check that the final content is in the correct order
    expect(content).toContain('Welcome to the HTML test page');
    expect(content).toContain('This is page 1.');
  });
});
