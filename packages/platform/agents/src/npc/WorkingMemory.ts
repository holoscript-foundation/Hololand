/**
 * @hololand/agents WorkingMemory
 *
 * 30-second sliding window working memory for NPC immediate context.
 */

export interface WorkingMemoryEntry {
  id: string;
  event: string;
  context: Record<string, unknown>;
  importance: number;
  timestamp: number;
}

export class WorkingMemory {
  private entries: WorkingMemoryEntry[] = [];
  private windowMs: number;
  private idCounter: number = 0;

  constructor(windowMs: number = 30_000) { this.windowMs = windowMs; }

  add(event: string, context: Record<string, unknown> = {}, importance: number = 0.5): WorkingMemoryEntry {
    this.prune();
    const entry: WorkingMemoryEntry = { id: `wm_${++this.idCounter}`, event, context, importance, timestamp: Date.now() };
    this.entries.push(entry);
    return entry;
  }

  getRecent(limit?: number): WorkingMemoryEntry[] {
    this.prune();
    const sorted = [...this.entries].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  getByImportance(minImportance: number = 0.5): WorkingMemoryEntry[] {
    this.prune();
    return this.entries.filter((e) => e.importance >= minImportance);
  }

  size(): number { this.prune(); return this.entries.length; }
  clear(): void { this.entries = []; }

  private prune(): void {
    const cutoff = Date.now() - this.windowMs;
    this.entries = this.entries.filter((e) => e.timestamp > cutoff);
  }
}
