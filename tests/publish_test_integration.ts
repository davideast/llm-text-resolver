import { Resolver } from 'llm-txt-resolver';
import * as assert from 'node:assert';

async function runTest() {
  console.log('│   ├── Resolver finished');
  const resolver = new Resolver({ depth: 2 });
  const { content, graph } = await resolver.resolve(`http://localhost:8989/index.html`);

  assert.strictEqual(graph.nodes.size, 2, 'Should have resolved 2 pages.');
  assert.ok(content.includes('Welcome to the HTML test page'), 'Content should include title from root page.');
  assert.ok(content.includes('This is page 1.'), 'Content should include content from page 1.');
  console.log('│   ├── ✅ Assertions passed!');
}

runTest()
  .then(() => {
    console.log('│   └── ✅ Tests passed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('│   └── ❌ Test failed:', err);
    process.exit(1);
  });