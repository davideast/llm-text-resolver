import { CacheProvider } from './cache_provider.js';
import { KnowledgeGraph, GraphNode } from './knowledge_graph.js';
import { sha256 } from './crypto.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export class FileSystemCacheProvider implements CacheProvider {
  private cacheDir: string;

  constructor(cacheDir = '.llm-txt-resolver') {
    this.cacheDir = path.resolve(process.cwd(), cacheDir);
  }

  private async getCacheKey(sourceId: string): Promise<string> {
    return sha256(sourceId);
  }

  private async getCachePath(sourceId: string): Promise<string> {
    return path.join(this.cacheDir, `${await this.getCacheKey(sourceId)}.json`);
  }

  async load(sourceId: string): Promise<KnowledgeGraph | null> {
    const cachePath = await this.getCachePath(sourceId);
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const data = await fs.readFile(cachePath, 'utf-8');
      const parsed = JSON.parse(data);
      
      const graph = new KnowledgeGraph(parsed.rootId);
      graph.nodes = new Map<string, GraphNode>(Object.entries(parsed.nodes));
      return graph;
    } catch (error) {
      return null;
    }
  }

  async save(options: { rootUrl: string; graph: KnowledgeGraph }): Promise<void> {
    const { rootUrl, graph } = options;
    const cachePath = await this.getCachePath(rootUrl);
    await fs.mkdir(this.cacheDir, { recursive: true });
    
    const data = {
      rootId: graph.rootId,
      nodes: Object.fromEntries(graph.nodes),
    };
    
    await fs.writeFile(cachePath, JSON.stringify(data, null, 2));
  }
}
