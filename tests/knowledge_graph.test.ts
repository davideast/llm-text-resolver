import { describe, it, expect } from 'vitest';
import { KnowledgeGraph, GraphNode } from '../src/knowledge_graph.js';

describe('KnowledgeGraph', () => {
  it('should flatten content in BFS order', () => {
    const graph = new KnowledgeGraph('A');
    const nodeA: GraphNode = {
      id: 'A',
      cleanContent: 'Content A',
      links: [{ text: '', targetId: 'B' }, { text: '', targetId: 'C' }],
      depth: 0,
      status: 'completed',
      title: 'A',
      mimeType: 'text/html',
      error: null,
      rawContent: '',
      eTag: null,
      lastModified: null,
      contentHash: null,
    };
    const nodeB: GraphNode = {
      id: 'B',
      cleanContent: 'Content B',
      links: [],
      depth: 1,
      status: 'completed',
      title: 'B',
      mimeType: 'text/html',
      error: null,
      rawContent: '',
      eTag: null,
      lastModified: null,
      contentHash: null,
    };
    const nodeC: GraphNode = {
      id: 'C',
      cleanContent: 'Content C',
      links: [],
      depth: 1,
      status: 'completed',
      title: 'C',
      mimeType: 'text/html',
      error: null,
      rawContent: '',
      eTag: null,
      lastModified: null,
      contentHash: null,
    };
    graph.nodes.set('A', nodeA);
    graph.nodes.set('B', nodeB);
    graph.nodes.set('C', nodeC);

    console.log(graph.toJson());
    const flattenedContent = graph.getFlattenedContent();
    expect(flattenedContent).toBe('Content A\nContent B\nContent C');
  });
});