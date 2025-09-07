import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Resolver } from '../src/resolver.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { AddressInfo } from 'net';

let server: http.Server;
let MOCK_SERVER_URL: string;
const SITE_DIR = path.resolve(process.cwd(), 'tests/site');

beforeAll(async () => {
  await new Promise<void>(resolve => {
    server = http.createServer((req, res) => {
      const filePath = path.join(SITE_DIR, req.url === '/' ? 'index.md' : req.url!);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200);
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

describe('Resolver E2E with local server', () => {
  it('should successfully crawl the local test site', async () => {
    const resolver = new Resolver({ depth: 3 });
    const rootUrl = `${MOCK_SERVER_URL}/index.md`;

    const { content, graph } = await resolver.resolve(rootUrl);

    // Check that the process completed and returned data
    expect(content).toBeTypeOf('string');
    expect(content.length).toBeGreaterThan(100);
    // 25 linked docs + 1 root doc
    expect(graph.nodes.size).toBe(26);

    // Check the root node for correctness
    const rootNode = graph.nodes.get(rootUrl);
    expect(rootNode).toBeDefined();
    expect(rootNode?.status).toBe('completed');
    expect(rootNode?.cleanContent).toContain('Gemini API using Firebase AI Logic');
    expect(rootNode?.links.length).toBe(25);

    // Check that it followed a link and processed the content
    const firstLink = rootNode?.links[0].targetId;
    expect(firstLink).toBeDefined();
    const secondNode = graph.nodes.get(firstLink!);
    expect(secondNode).toBeDefined();
    expect(secondNode?.status).toBe('completed');
    expect(secondNode?.depth).toBe(1);
    expect(secondNode?.cleanContent).toContain('Content for AI Logic');
    
    // Check that the final content is in the correct order
    expect(content).toMatch(/^Gemini API using Firebase AI Logic/);
    expect(content).toContain('Content for AI Logic');
    expect(content).toContain('Content for Analyze Audio');
  });
});
