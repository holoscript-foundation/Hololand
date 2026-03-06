/**
 * @hololand/agents MemoryPruner
 *
 * Prunes low-value episodic memories based on importance, access frequency, and age.
 */

import { EpisodicMemory } from './EpisodicMemory';

export class MemoryPruner {
  private memory: EpisodicMemory;
  private pruneThreshold: number;

  constructor(memory: EpisodicMemory, pruneThreshold: number = 0.2) {
    this.memory = memory;
    this.pruneThreshold = pruneThreshold;
  }

  prune(): number {
    const episodes = this.memory.getEpisodes();
    const now = Date.now();
    let pruned = 0;

    const toKeep = episodes.filter((ep) => {
      const ageHours = (now - ep.timestamp) / (1000 * 3600);
      const score = ep.importance * 0.4 + Math.min(1, ep.accessCount / 10) * 0.3 + Math.max(0, 1 - ageHours / 168) * 0.3;
      if (score < this.pruneThreshold) { pruned++; return false; }
      return true;
    });

    this.memory.clear();
    for (const ep of toKeep) {
      this.memory.store({ description: ep.description, context: ep.context, importance: ep.importance, participants: ep.participants, emotionalValence: ep.emotionalValence });
    }

    return pruned;
  }
}
