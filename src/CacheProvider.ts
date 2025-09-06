import { KnowledgeGraph } from './KnowledgeGraph.js';

export interface CacheProvider {
  load(sourceId: string): Promise<KnowledgeGraph | null>;
  save(sourceId: string, graph: KnowledgeGraph): Promise<void>;
}
