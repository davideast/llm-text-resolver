import { Resolver } from 'llm-txt-resolver';
import assert from 'node:assert';
import http from 'node:http';
import { promisify } from 'node:util';

const PORT = 8989;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  if (req.url === '/') {
    res.end('<html><head><title>Root</title></head><body><a href="/page1">Page 1</a></body></html>');
  } else if (req.url === '/page1') {
    res.end('<html><head><title>Page 1</title></head><body>Content Page 1</body></html>');
  } else {
    res.writeHead(404);
    res.end();
  }
});

const startServer = promisify(server.listen.bind(server, PORT));
const closeServer = promisify(server.close.bind(server));

async function runTest() {
  console.log('Starting server...');
  await startServer();
  console.log(`Server started on port ${PORT}`);

  try {
    const resolver = new Resolver({ depth: 2 });
    const { content, graph } = await resolver.resolve(`http://localhost:${PORT}`);

    console.log('Resolver finished.');
    assert.strictEqual(graph.nodes.size, 2, 'Should have resolved 2 pages.');
    assert.ok(content.includes('Page 1'), 'Content should include title from root page.');
    assert.ok(content.includes('Content Page 1'), 'Content should include content from page 1.');
    console.log('Assertions passed.');
  } finally {
    console.log('Closing server...');
    await closeServer();
    console.log('Server closed.');
  }
}

runTest()
  .then(() => {
    console.log('Test passed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
