import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { Resolver } from '../src/Resolver.js';

const MOCK_SERVER_PORT = 9877;
const MOCK_SERVER_URL = `http://localhost:${MOCK_SERVER_PORT}`;

let server: http.Server;

beforeAll(() => {
  server = http.createServer((req, res) => {
    if (req.url === '/pageA') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><head><title>Page A</title></head><body><a href="/pageB">Page B</a></body></html>');
    } else if (req.url === '/pageB') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><head><title>Page B</title></head><body>Content B</body></html>');
    } else if (req.url === '/pageC') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><head><title>Page C</title></head><body>Content C</body></html>');
    }
  }).listen(MOCK_SERVER_PORT);
});

afterAll(() => {
  server.close();
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