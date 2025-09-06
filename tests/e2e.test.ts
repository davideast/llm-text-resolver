import { describe, it, expect, vi } from 'vitest';
import { Resolver } from '../src/Resolver.js';

// This is a timeout for the entire test file, not just one test
vi.setConfig({ testTimeout: 30000 });

describe('Resolver E2E', () => {
  it('should successfully crawl the first website', async () => {
    const resolver = new Resolver({ depth: 2 });
    const rootUrl = 'http://info.cern.ch/hypertext/WWW/TheProject.html';

    const { content, graph } = await resolver.resolve(rootUrl);

    // 1. Check that the process completed and returned data
    expect(content).toBeTypeOf('string');
    expect(content.length).toBeGreaterThan(100);
    expect(graph.nodes.size).toBeGreaterThan(1);

    // 2. Check the root node for correctness
    const rootNode = graph.nodes.get(rootUrl);
    expect(rootNode).toBeDefined();
    expect(rootNode?.status).toBe('completed');
    expect(rootNode?.cleanContent).toContain('World Wide Web');
    expect(rootNode?.links.length).toBeGreaterThan(5);

    // 3. Check that it followed at least one link
    const firstLink = rootNode?.links[0].targetId;
    expect(firstLink).toBeDefined();
    const secondNode = graph.nodes.get(firstLink!);
    expect(secondNode).toBeDefined();
    expect(secondNode?.status).toBe('completed');
    expect(secondNode?.depth).toBe(1);
  });
});
