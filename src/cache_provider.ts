import { KnowledgeGraph } from './knowledge_graph.js';

export interface CacheProvider {
  load(sourceId: string): Promise<KnowledgeGraph | null>;
  save(options: { rootUrl: string; graph: KnowledgeGraph }): Promise<void>;
}