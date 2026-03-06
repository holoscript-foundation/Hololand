/**
 * @hololand/agents NPCMemory
 *
 * Dual-memory NPC architecture with working memory (30s sliding window)
 * and episodic memory (long-term).
 */

import { WorkingMemory, type WorkingMemoryEntry } from './WorkingMemory';
import { EpisodicMemory, type Episode } from './EpisodicMemory';
import { MemoryPruner } from './MemoryPruner';

export interface NPCMemoryConfig { workingWindowMs: number; maxEpisodes: number; pruneIntervalMs: number; }
const DEFAULT_CONFIG: NPCMemoryConfig = { workingWindowMs: 30_000, maxEpisodes: 500, pruneIntervalMs: 60_000 };

export class NPCMemory {
  private config: NPCMemoryConfig;
  private working: WorkingMemory;
  private episodic: EpisodicMemory;
  private pruner: MemoryPruner;

  constructor(npcId: string, config?: Partial<NPCMemoryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.working = new WorkingMemory(this.config.workingWindowMs);
    this.episodic = new EpisodicMemory(this.config.maxEpisodes);
    this.pruner = new MemoryPruner(this.episodic);
  }

  perceive(event: string, context: Record<string, unknown> = {}, importance: number = 0.5): void {
    this.working.add(event, context, importance);
    if (importance > 0.7) {
      this.episodic.store({ description: event, context, importance, participants: [], emotionalValence: 0 });
    }
  }

  getRecentContext(): WorkingMemoryEntry[] { return this.working.getRecent(); }
  recallEpisodes(query: string, limit: number = 5): Episode[] { return this.episodic.search(query, limit); }
  consolidate(): number { return this.pruner.prune(); }

  getWorkingMemory(): WorkingMemory { return this.working; }
  getEpisodicMemory(): EpisodicMemory { return this.episodic; }
}
