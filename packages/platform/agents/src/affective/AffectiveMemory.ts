/**
 * @hololand/agents AffectiveMemory
 *
 * Stores emotion-tagged memories of VR user interactions.
 * Memories are weighted by emotional valence for scene loading.
 */

export interface EmotionVector {
  joy: number; sadness: number; anger: number;
  fear: number; surprise: number; trust: number;
}

export interface AffectiveMemoryEntry {
  id: string;
  userId: string;
  agentId: string;
  emotion: EmotionVector;
  valence: number; // -1 (negative) to 1 (positive)
  arousal: number; // 0 (calm) to 1 (excited)
  description: string;
  context: Record<string, unknown>;
  timestamp: number;
  decayRate: number;
}

export class AffectiveMemory {
  private memories: Map<string, AffectiveMemoryEntry[]> = new Map();
  private maxMemoriesPerAgent: number;
  private idCounter: number = 0;

  constructor(maxMemoriesPerAgent: number = 100) {
    this.maxMemoriesPerAgent = maxMemoriesPerAgent;
  }

  store(agentId: string, userId: string, emotion: EmotionVector, description: string, context: Record<string, unknown> = {}): AffectiveMemoryEntry {
    const valence = (emotion.joy + emotion.trust + emotion.surprise * 0.5) - (emotion.sadness + emotion.anger + emotion.fear);
    const arousal = (emotion.joy + emotion.anger + emotion.surprise + emotion.fear) / 4;

    const entry: AffectiveMemoryEntry = {
      id: `mem_${++this.idCounter}`, userId, agentId, emotion, valence: Math.max(-1, Math.min(1, valence)),
      arousal: Math.max(0, Math.min(1, arousal)), description, context, timestamp: Date.now(), decayRate: 0.001,
    };

    if (!this.memories.has(agentId)) this.memories.set(agentId, []);
    const list = this.memories.get(agentId)!;
    list.push(entry);
    if (list.length > this.maxMemoriesPerAgent) list.shift();

    return entry;
  }

  recall(agentId: string, minValence?: number, limit: number = 10): AffectiveMemoryEntry[] {
    const memories = this.memories.get(agentId) ?? [];
    const now = Date.now();
    return memories
      .map((m) => ({ ...m, valence: m.valence * Math.exp(-m.decayRate * (now - m.timestamp) / 1000) }))
      .filter((m) => minValence === undefined || m.valence >= minValence)
      .sort((a, b) => Math.abs(b.valence) - Math.abs(a.valence))
      .slice(0, limit);
  }

  recallByUser(agentId: string, userId: string): AffectiveMemoryEntry[] {
    return (this.memories.get(agentId) ?? []).filter((m) => m.userId === userId);
  }

  getAverageValence(agentId: string): number {
    const memories = this.memories.get(agentId) ?? [];
    if (memories.length === 0) return 0;
    return memories.reduce((sum, m) => sum + m.valence, 0) / memories.length;
  }

  getMemoryCount(agentId: string): number { return (this.memories.get(agentId) ?? []).length; }
  clear(agentId: string): void { this.memories.delete(agentId); }
}
