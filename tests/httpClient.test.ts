import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { httpClient, HttpError } from '../src/httpClient.js';

const MOCK_SERVER_PORT = 9876;
const MOCK_SERVER_URL = `http://localhost:${MOCK_SERVER_PORT}`;

let server: http.Server;

beforeAll(() => {
  server = http.createServer((req, res) => {
    if (req.url === '/valid-json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'success' }));
    } else if (req.url === '/not-found') {
      res.writeHead(404);
      res.end();
    } else if (req.url === '/timeout') {
      // Intentionally hold the request open to simulate a timeout
    }
  }).listen(MOCK_SERVER_PORT);
});

afterAll(() => {
  server.close();
});

describe('httpClient', () => {
  it('should return a Response object for a valid response', async () => {
    const response = await httpClient(`${MOCK_SERVER_URL}/valid-json`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ message: 'success' });
  });

  it('should throw HttpError for a 404 response', async () => {
    await expect(httpClient(`${MOCK_SERVER_URL}/not-found`)).rejects.toThrow(HttpError);
  });

  it('should throw an error on timeout', async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100); // Abort after 100ms

    await expect(httpClient(`${MOCK_SERVER_URL}/timeout`, controller.signal)).rejects.toThrow();
  });
});
