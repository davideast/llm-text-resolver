export interface GraphNode {
  id: string;
  title: string | null;
  status: 'pending' | 'fetching' | 'processing' | 'completed' | 'error';
  depth: number;
  mimeType: string | null;
  error: string | null;
  rawContent: string | null;
  cleanContent: string | null;
  links: {
    text: string;
    targetId: string;
  }[];
  eTag: string | null;
  lastModified: string | null;
  contentHash: string | null;
}

export class KnowledgeGraph {
  public rootId: string;
  public nodes: Map<string, GraphNode> = new Map();

  constructor(rootId: string) {
    this.rootId = rootId;
  }

  getFlattenedContent(strategy: 'bfs' | 'dfs' = 'bfs'): string {
    const result: string[] = [];
    const queue: string[] = [this.rootId];
    const visited: Set<string> = new Set([this.rootId]);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = this.nodes.get(nodeId);

      if (node && node.cleanContent) {
        result.push(node.cleanContent);
      }

      if (node) {
        for (const link of node.links) {
          if (!visited.has(link.targetId)) {
            visited.add(link.targetId);
            queue.push(link.targetId);
          }
        }
      }
    }

    return result.join('\n');
  }

  private getAsciiVisual(): string {
    throw new Error('Not implemented');
  }

  toJson(space: number | string = 2, replacer: ((key: string, value: any) => any) | undefined = undefined): string {
    return JSON.stringify(Object.fromEntries(this.nodes), replacer, space);
  }
}