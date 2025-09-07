import { CacheProvider } from './cache_provider.js';
import { KnowledgeGraph, GraphNode } from './knowledge_graph.js';

const CACHE_NAME = 'llm-txt-resolver-cache-v1';

export class BrowserCacheProvider implements CacheProvider {
  private async getCache(): Promise<Cache | null> {
    if (typeof caches === 'undefined') {
      return null;
    }
    return caches.open(CACHE_NAME);
  }

  async load(sourceId: string): Promise<KnowledgeGraph | null> {
    const cache = await this.getCache();
    if (!cache) {
      return null;
    }

    const response = await cache.match(sourceId);
    if (!response) {
      return null;
    }

    try {
      const parsed = await response.json();
      const graph = new KnowledgeGraph(parsed.rootId);
      graph.nodes = new Map<string, GraphNode>(Object.entries(parsed.nodes));
      return graph;
    } catch (error) {
      console.error('Failed to parse cached graph:', error);
      return null;
    }
  }

  async save(options: { rootUrl: string; graph: KnowledgeGraph }): Promise<void> {
    const { rootUrl, graph } = options;
    const cache = await this.getCache();
    if (!cache) {
      return;
    }

    const data = {
      rootId: graph.rootId,
      nodes: Object.fromEntries(graph.nodes),
    };

    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });

    await cache.put(rootUrl, response);
  }
}
