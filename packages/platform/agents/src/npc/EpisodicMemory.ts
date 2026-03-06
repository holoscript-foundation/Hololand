/**
 * @hololand/agents EpisodicMemory
 *
 * Long-term episodic memory for NPC life experiences.
 */

export interface Episode {
  id: string;
  description: string;
  context: Record<string, unknown>;
  importance: number;
  participants: string[];
  emotionalValence: number;
  timestamp: number;
  accessCount: number;
}

export class EpisodicMemory {
  private episodes: Episode[] = [];
  private maxEpisodes: number;
  private idCounter: number = 0;

  constructor(maxEpisodes: number = 500) { this.maxEpisodes = maxEpisodes; }

  store(input: Omit<Episode, 'id' | 'timestamp' | 'accessCount'>): Episode {
    const episode: Episode = { ...input, id: `ep_${++this.idCounter}`, timestamp: Date.now(), accessCount: 0 };
    this.episodes.push(episode);
    if (this.episodes.length > this.maxEpisodes) {
      // Remove least important
      this.episodes.sort((a, b) => b.importance - a.importance);
      this.episodes = this.episodes.slice(0, this.maxEpisodes);
    }
    return episode;
  }

  search(query: string, limit: number = 5): Episode[] {
    const queryLower = query.toLowerCase();
    return this.episodes
      .filter((e) => e.description.toLowerCase().includes(queryLower))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit)
      .map((e) => { e.accessCount++; return { ...e }; });
  }

  getRecent(limit: number = 10): Episode[] {
    return [...this.episodes].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  getByParticipant(participantId: string): Episode[] {
    return this.episodes.filter((e) => e.participants.includes(participantId));
  }

  size(): number { return this.episodes.length; }
  getEpisodes(): Episode[] { return [...this.episodes]; }
  clear(): void { this.episodes = []; }
}
