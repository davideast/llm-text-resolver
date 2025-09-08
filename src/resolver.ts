import { KnowledgeGraph, GraphNode } from './knowledge_graph.js';
import { httpClient } from './http_client.js';
import { HtmlProcessor } from './html_processor.js';
import { MarkdownProcessor } from './markdown_processor.js';
import { CacheProvider } from './cache_provider.js';
import { FileSystemCacheProvider } from './file_system_cache_provider.js';
import { sha256 } from './crypto.js';

interface ResolverOptions {
  depth?: number;
  cacheProvider?: CacheProvider;
  stream?: boolean;
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

  resolve(rootUrl: string, options: { stream: true }): ReadableStream<string>;
  resolve(rootUrl: string, options?: { stream?: false }): Promise<{ content: string; graph: KnowledgeGraph }>;
  resolve(
    rootUrl: string,
    options: { stream?: boolean } = {}
  ): ReadableStream<string> | Promise<{ content: string; graph: KnowledgeGraph }> {
    const { stream = false } = options;

    if (stream) {
      return this._resolveAsStream(rootUrl);
    }
    return this._resolveAsPromise(rootUrl);
  }

  private async _resolveAsPromise(rootUrl: string): Promise<{ content: string; graph: KnowledgeGraph }> {
    const newGraph = new KnowledgeGraph(rootUrl);
    const generator = this._resolveGenerator(rootUrl, newGraph);
    try {
      for await (const _ of generator) {
        // Consume the generator
      }
    } catch (error) {
      throw error;
    }
    return { content: newGraph.getFlattenedContent(), graph: newGraph };
  }

  private _resolveAsStream(rootUrl: string): ReadableStream<string> {
    const newGraph = new KnowledgeGraph(rootUrl);
    const generator = this._resolveGenerator(rootUrl, newGraph);
    let aborted = false;
  
    return new ReadableStream({
      async pull(controller) {
        if (aborted) return;
        try {
          const { value, done } = await generator.next();
          if (done) {
            controller.close();
          } else if (value.cleanContent) {
            controller.enqueue(value.cleanContent);
          }
        } catch (error) {
          controller.error(error);
        }
      },
      async cancel() {
        aborted = true;
        await generator.return(undefined);
      }
    });
  }

  private async *_resolveGenerator(
    rootUrl: string, 
    newGraph: KnowledgeGraph,
    maxConcurrent: number = 3
  ): AsyncGenerator<GraphNode> {
    const oldGraph = await this.cacheProvider.load(rootUrl);
    const queue: { url: string; depth: number }[] = [{ url: rootUrl, depth: 0 }];
    const visited: Set<string> = new Set([rootUrl]);
    
    const inFlight = new Map<string, Promise<GraphNode | null>>();
    const results: GraphNode[] = [];
    
    let rootError: Error | null = null;
    
    const processUrl = async (url: string, depth: number): Promise<GraphNode | null> => {
      try {
        const cachedNode = oldGraph?.nodes.get(url);
        if (cachedNode) {
          const headers: Record<string, string> = {};
          if (cachedNode.eTag) headers['If-None-Match'] = cachedNode.eTag;
          if (cachedNode.lastModified) headers['If-Modified-Since'] = cachedNode.lastModified;
  
          const headResponse = await httpClient(url, undefined, 'HEAD', headers);
          if (headResponse.status === 304) {
            newGraph.nodes.set(url, cachedNode);
            
            // Only queue children if current depth is less than limit
            // depth: 1 means "don't follow any links from root"
            // depth: 2 means "follow links from root but not their children"
            if (depth < this.depth - 1) {
              for (const link of cachedNode.links) {
                if (!visited.has(link.targetId)) {
                  visited.add(link.targetId);
                  queue.push({ url: link.targetId, depth: depth + 1 });
                }
              }
            }
            return cachedNode;
          }
        }
  
        const response = await httpClient(url);
        const rawContent = await response.text();
        const eTag = response.headers.get('etag');
        const lastModified = response.headers.get('last-modified');
        const contentHash = await sha256(rawContent);
  
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
  
        // Only queue children if current depth is less than limit - 1
        if (depth < this.depth - 1) {
          for (const link of links) {
            if (!visited.has(link)) {
              visited.add(link);
              queue.push({ url: link, depth: depth + 1 });
            }
          }
        }
  
        return node;
        
      } catch (error) {
        if (url === rootUrl) {
          rootError = error as Error;
          return null;
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
        return node;
      }
    };
  
    // Main processing loop
    while (queue.length > 0 || inFlight.size > 0 || results.length > 0) {
      if (rootError) {
        throw rootError;
      }
      
      while (inFlight.size < maxConcurrent && queue.length > 0) {
        const { url, depth } = queue.shift()!;
        
        if (inFlight.has(url)) {
          continue;
        }
        
        const promise = processUrl(url, depth).then(node => {
          inFlight.delete(url);
          if (node) {
            results.push(node);
          }
          return node;
        }).catch(error => {
          inFlight.delete(url);
          return null;
        });
        
        inFlight.set(url, promise);
      }
      
      while (results.length > 0) {
        yield results.shift()!;
      }
      
      if (inFlight.size > 0 && results.length === 0) {
        await Promise.race(inFlight.values());
      }
    }
    
    if (rootError) {
      throw rootError;
    }
  
    await this.cacheProvider.save({ rootUrl, graph: newGraph });
  }

  private async *_resolveGeneratorStreaming(rootUrl: string): AsyncGenerator<GraphNode> {
    // Don't store nodes, just yield them
    // Keep only the visited set for deduplication
  }
}
