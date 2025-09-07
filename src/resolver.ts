import { KnowledgeGraph, GraphNode } from './knowledge_graph.js';
import { httpClient } from './http_client.js';
import { HtmlProcessor } from './html_processor.js';
import { MarkdownProcessor } from './markdown_processor.js';
import { CacheProvider } from './cache_provider.js';
import { FileSystemCacheProvider } from './file_system_cache_provider.js';
import crypto from 'node:crypto';

interface ResolverOptions {
  depth?: number;
  cacheProvider?: CacheProvider;
}

export class Resolver {
  private readonly depth: number;
  private readonly htmlProcessor = new HtmlProcessor();
  private readonly markdownProcessor = new MarkdownProcessor();
  private readonly cacheProvider: CacheProvider;

  constructor(options: ResolverOptions = {}) {
    this.depth = options.depth ?? 2;
    this.cacheProvider = options.cacheProvider ?? new FileSystemCacheProvider();
  }

  async resolve(rootUrl: string): Promise<{ content: string; graph: KnowledgeGraph }> {
    const newGraph = new KnowledgeGraph(rootUrl);
    const oldGraph = await this.cacheProvider.load(rootUrl);
    const queue: { url: string; depth: number }[] = [{ url: rootUrl, depth: 0 }];
    const visited: Set<string> = new Set([rootUrl]);

    while (queue.length > 0) {
      const { url, depth } = queue.shift()!;

      if (depth >= this.depth) {
        continue;
      }

      try {
        const cachedNode = oldGraph?.nodes.get(url);
        if (cachedNode) {
          const headers: Record<string, string> = {};
          if (cachedNode.eTag) headers['If-None-Match'] = cachedNode.eTag;
          if (cachedNode.lastModified) headers['If-Modified-Since'] = cachedNode.lastModified;

          const headResponse = await httpClient(url, undefined, 'HEAD', headers);
          if (headResponse.status === 304) {
            newGraph.nodes.set(url, cachedNode);
            for (const link of cachedNode.links) {
              if (!visited.has(link.targetId)) {
                visited.add(link.targetId);
                queue.push({ url: link.targetId, depth: depth + 1 });
              }
            }
            continue;
          }
        }

        const response = await httpClient(url);
        const rawContent = await response.text();
        const eTag = response.headers.get('etag');
        const lastModified = response.headers.get('last-modified');
        const contentHash = crypto.createHash('sha256').update(rawContent).digest('hex');

        const isHtml = rawContent.trim().startsWith('<');
        const { title, links, cleanContent } = isHtml
          ? this.htmlProcessor.process({ html: rawContent, baseUrl: url })
          : this.markdownProcessor.process({ markdown: rawContent, baseUrl: url });

        const node: GraphNode = {
          id: url,
          title,
          status: 'completed',
          depth,
          mimeType: isHtml ? 'text/html' : 'text/markdown',
          error: null,
          rawContent,
          cleanContent,
          links: links.map(link => ({ text: '', targetId: link })),
          eTag,
          lastModified,
          contentHash,
        };
        newGraph.nodes.set(url, node);

        for (const link of links) {
          if (!visited.has(link)) {
            visited.add(link);
            queue.push({ url: link, depth: depth + 1 });
          }
        }
      } catch (error) {
        if (url === rootUrl) {
          throw error;
        }
        const node: GraphNode = {
          id: url,
          title: null,
          status: 'error',
          depth,
          mimeType: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          rawContent: null,
          cleanContent: null,
          links: [],
          eTag: null,
          lastModified: null,
          contentHash: null,
        };
        newGraph.nodes.set(url, node);
      }
    }

    await this.cacheProvider.save({ rootUrl, graph: newGraph });
    return { content: newGraph.getFlattenedContent(), graph: newGraph };
  }
}