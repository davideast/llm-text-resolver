import { KnowledgeGraph, GraphNode } from './KnowledgeGraph.js';
import { httpClient } from './httpClient.js';
import { HtmlProcessor } from './HtmlProcessor.js';
import { MarkdownProcessor } from './MarkdownProcessor.js';
import crypto from 'crypto';

interface ResolverOptions {
  depth?: number;
}

export class Resolver {
  private readonly depth: number;
  private readonly htmlProcessor = new HtmlProcessor();
  private readonly markdownProcessor = new MarkdownProcessor();

  constructor(options: ResolverOptions = {}) {
    this.depth = options.depth ?? 2;
  }

  async resolve(rootUrl: string): Promise<{ content: string; graph: KnowledgeGraph }> {
    const graph = new KnowledgeGraph(rootUrl);
    const queue: { url: string; depth: number }[] = [{ url: rootUrl, depth: 0 }];
    const visited: Set<string> = new Set([rootUrl]);

    while (queue.length > 0) {
      const { url, depth } = queue.shift()!;

      if (depth >= this.depth) {
        continue;
      }

      try {
        const rawContent = await httpClient(url);
        const contentHash = crypto.createHash('sha256').update(rawContent).digest('hex');

        const isHtml = rawContent.trim().startsWith('<');
        const { title, links, cleanContent } = isHtml
          ? this.htmlProcessor.process(rawContent, url)
          : this.markdownProcessor.process(rawContent, url);

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
          eTag: null,
          lastModified: null,
          contentHash,
        };
        graph.nodes.set(url, node);

        for (const link of links) {
          if (!visited.has(link)) {
            visited.add(link);
            queue.push({ url: link, depth: depth + 1 });
          }
        }
      } catch (error) {
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
        graph.nodes.set(url, node);
      }
    }

    return { content: graph.getFlattenedContent(), graph };
  }
}