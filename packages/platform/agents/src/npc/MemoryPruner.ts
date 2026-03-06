/**
 * @hololand/agents MemoryPruner
 *
 * Prunes low-value episodic memories based on importance, access frequency, and age.
 * Implements exponential decay, salience scoring, emotional tag weighting,
 * consolidation (merge similar memories), and configurable retention policies.
 */

import { EpisodicMemory, type Episode } from './EpisodicMemory';

export interface PrunePolicy {
  /** Base threshold below which memories are pruned (0-1) */
  pruneThreshold: number;
  /** Exponential decay half-life in hours */
  decayHalfLifeHours: number;
  /** Weight for importance in scoring (0-1) */
  importanceWeight: number;
  /** Weight for access frequency in scoring (0-1) */
  accessWeight: number;
  /** Weight for recency in scoring (0-1) */
  recencyWeight: number;
  /** Emotional memories get this bonus multiplier */
  emotionalBonus: number;
  /** Minimum number of memories to always retain (never prune below this) */
  minRetainCount: number;
  /** Maximum age in hours before forced pruning (regardless of score) */
  maxAgeHours: number;
  /** Similarity threshold for consolidation (0-1 via description overlap) */
  consolidationSimilarity: number;
}

export interface PruneResult {
  prunedCount: number;
  consolidatedCount: number;
  retainedCount: number;
  prunedIds: string[];
  consolidatedGroups: Array<{ mergedInto: string; mergedFrom: string[] }>;
  scores: Array<{ id: string; score: number; reason: string }>;
}

const DEFAULT_POLICY: PrunePolicy = {
  pruneThreshold: 0.2,
  decayHalfLifeHours: 168, // 1 week
  importanceWeight: 0.4,
  accessWeight: 0.3,
  recencyWeight: 0.3,
  emotionalBonus: 1.5,
  minRetainCount: 10,
  maxAgeHours: 720, // 30 days
  consolidationSimilarity: 0.6,
};

export class MemoryPruner {
  private memory: EpisodicMemory;
  private policy: PrunePolicy;
  private simpleThresholdMode: boolean = false;

  constructor(memory: EpisodicMemory, policyOrThreshold?: number | Partial<PrunePolicy>) {
    this.memory = memory;
    if (typeof policyOrThreshold === 'number') {
      // Simple threshold mode: prune purely by importance, no min retain
      this.policy = { ...DEFAULT_POLICY, pruneThreshold: policyOrThreshold, minRetainCount: 0 };
      this.simpleThresholdMode = true;
    } else {
      this.policy = { ...DEFAULT_POLICY, ...policyOrThreshold };
    }
  }

  // ── Original prune API (preserved) ───────────────────────────────

  prune(): number {
    if (this.simpleThresholdMode) {
      // Backward compat: prune episodes whose importance is below threshold
      const episodes = this.memory.getEpisodes();
      const toKeep = episodes.filter((ep) => ep.importance >= this.policy.pruneThreshold);
      const pruned = episodes.length - toKeep.length;
      if (pruned > 0) {
        this.memory.clear();
        for (const ep of toKeep) {
          this.memory.store({
            description: ep.description,
            context: ep.context,
            importance: ep.importance,
            participants: ep.participants,
            emotionalValence: ep.emotionalValence,
          });
        }
      }
      return pruned;
    }
    const result = this.pruneDetailed();
    return result.prunedCount;
  }

  // ── Detailed pruning with consolidation ──────────────────────────

  /**
   * Execute a full prune cycle: score all memories, consolidate similar ones,
   * then prune those below threshold.
   */
  pruneDetailed(): PruneResult {
    const episodes = this.memory.getEpisodes();
    const now = Date.now();
    const scores: PruneResult['scores'] = [];

    // Phase 1: Score every episode
    for (const ep of episodes) {
      const score = this.scoreEpisode(ep, now);
      const reason = this.getScoreReason(ep, score, now);
      scores.push({ id: ep.id, score, reason });
    }

    // Phase 2: Consolidation (merge similar memories)
    const consolidatedGroups = this.consolidate(episodes, scores);

    // Re-fetch episodes after consolidation may have altered them
    const postConsolidationEpisodes = this.memory.getEpisodes();
    const postScores: Array<{ id: string; score: number }> = [];
    for (const ep of postConsolidationEpisodes) {
      postScores.push({ id: ep.id, score: this.scoreEpisode(ep, now) });
    }

    // Phase 3: Prune low-scoring episodes
    const sorted = postScores.sort((a, b) => b.score - a.score);
    const prunedIds: string[] = [];
    const toKeepIds = new Set<string>();

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      // Always retain minimum count
      if (toKeepIds.size < this.policy.minRetainCount) {
        toKeepIds.add(entry.id);
        continue;
      }

      if (entry.score >= this.policy.pruneThreshold) {
        toKeepIds.add(entry.id);
      } else {
        prunedIds.push(entry.id);
      }
    }

    // Force prune very old memories regardless of score
    for (const ep of postConsolidationEpisodes) {
      const ageHours = (now - ep.timestamp) / (1000 * 3600);
      if (ageHours > this.policy.maxAgeHours && toKeepIds.size > this.policy.minRetainCount) {
        toKeepIds.delete(ep.id);
        if (!prunedIds.includes(ep.id)) prunedIds.push(ep.id);
      }
    }

    // Rebuild memory with only retained episodes
    const toKeep = postConsolidationEpisodes.filter((ep) => toKeepIds.has(ep.id));
    this.memory.clear();
    for (const ep of toKeep) {
      this.memory.store({
        description: ep.description,
        context: ep.context,
        importance: ep.importance,
        participants: ep.participants,
        emotionalValence: ep.emotionalValence,
      });
    }

    return {
      prunedCount: prunedIds.length,
      consolidatedCount: consolidatedGroups.reduce((sum, g) => sum + g.mergedFrom.length, 0),
      retainedCount: toKeep.length,
      prunedIds,
      consolidatedGroups,
      scores,
    };
  }

  // ── Salience scoring ─────────────────────────────────────────────

  /**
   * Score an episode 0-1 based on importance, access frequency, recency,
   * with emotional tag weighting and exponential decay.
   */
  scoreEpisode(ep: Episode, now: number = Date.now()): number {
    const ageHours = (now - ep.timestamp) / (1000 * 3600);

    // Exponential decay: score halves every decayHalfLifeHours
    const decayFactor = Math.pow(0.5, ageHours / this.policy.decayHalfLifeHours);

    // Importance component (0-1)
    const importanceScore = ep.importance;

    // Access frequency component (0-1, caps at 10 accesses)
    const accessScore = Math.min(1, ep.accessCount / 10);

    // Recency component via decay
    const recencyScore = decayFactor;

    // Weighted combination
    let score =
      importanceScore * this.policy.importanceWeight +
      accessScore * this.policy.accessWeight +
      recencyScore * this.policy.recencyWeight;

    // Emotional bonus: strong emotions (positive or negative) are more memorable
    const emotionalIntensity = Math.abs(ep.emotionalValence);
    if (emotionalIntensity > 0.5) {
      score *= this.policy.emotionalBonus * emotionalIntensity;
    }

    return Math.max(0, Math.min(1, score));
  }

  private getScoreReason(ep: Episode, score: number, now: number): string {
    const ageHours = Math.round((now - ep.timestamp) / (1000 * 3600));
    if (score >= 0.8) return `High value (importance=${ep.importance}, accesses=${ep.accessCount})`;
    if (score >= 0.5) return `Moderate value (age=${ageHours}h, accesses=${ep.accessCount})`;
    if (score >= this.policy.pruneThreshold) return `Low but retained (age=${ageHours}h)`;
    return `Below threshold (score=${score.toFixed(3)}, age=${ageHours}h)`;
  }

  // ── Memory consolidation ─────────────────────────────────────────

  /**
   * Find and merge similar memories to reduce redundancy.
   * Similar memories are merged into the one with the highest importance,
   * combining participant lists and boosting importance.
   */
  private consolidate(
    episodes: Episode[],
    scores: Array<{ id: string; score: number }>,
  ): PruneResult['consolidatedGroups'] {
    const groups: PruneResult['consolidatedGroups'] = [];
    const merged = new Set<string>();

    for (let i = 0; i < episodes.length; i++) {
      if (merged.has(episodes[i].id)) continue;

      const similar: Episode[] = [];
      for (let j = i + 1; j < episodes.length; j++) {
        if (merged.has(episodes[j].id)) continue;

        const similarity = this.computeTextSimilarity(
          episodes[i].description,
          episodes[j].description,
        );
        if (similarity >= this.policy.consolidationSimilarity) {
          similar.push(episodes[j]);
          merged.add(episodes[j].id);
        }
      }

      if (similar.length > 0) {
        // Merge into the primary episode
        const primary = episodes[i];

        // Combine participants
        const allParticipants = new Set(primary.participants);
        for (const ep of similar) {
          for (const p of ep.participants) allParticipants.add(p);
        }

        // Boost importance slightly for consolidated memories
        const boostedImportance = Math.min(1, primary.importance + similar.length * 0.05);

        // Update primary in memory
        // (We rebuild later, so just modify in-place for scoring)
        primary.importance = boostedImportance;
        primary.participants = [...allParticipants];

        groups.push({
          mergedInto: primary.id,
          mergedFrom: similar.map((s) => s.id),
        });
      }
    }

    return groups;
  }

  /**
   * Simple word-overlap similarity (Jaccard index on word sets).
   */
  private computeTextSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter((w) => w.length > 2));

    if (wordsA.size === 0 && wordsB.size === 0) return 1;
    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) intersection++;
    }

    const union = wordsA.size + wordsB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  // ── Policy management ────────────────────────────────────────────

  getPolicy(): PrunePolicy {
    return { ...this.policy };
  }

  updatePolicy(updates: Partial<PrunePolicy>): void {
    this.policy = { ...this.policy, ...updates };
  }
}
