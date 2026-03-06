/**
 * @hololand/networking PriorityAccumulator
 *
 * Per-entity priority accumulators for interest management.
 * Entities accumulate priority based on distance, velocity,
 * relevance, and user interaction. Higher priority entities
 * receive more frequent state updates.
 */

export interface PriorityFactors {
  /** Distance from viewer (inverse relationship). */
  distance: number;
  /** Speed of the entity (faster = higher priority). */
  velocity: number;
  /** User interaction level (0-1). */
  interaction: number;
  /** Game relevance (e.g., quest-related NPC). */
  relevance: number;
  /** Time since last update (longer = higher priority). */
  staleness: number;
}

export interface PriorityWeights {
  distance: number;
  velocity: number;
  interaction: number;
  relevance: number;
  staleness: number;
}

const DEFAULT_WEIGHTS: PriorityWeights = {
  distance: 0.35,
  velocity: 0.15,
  interaction: 0.20,
  relevance: 0.15,
  staleness: 0.15,
};

export interface AccumulatorEntry {
  entityId: string;
  accumulatedPriority: number;
  lastUpdateTime: number;
  factors: PriorityFactors;
}

/**
 * Accumulates and manages per-entity priority scores.
 */
export class PriorityAccumulator {
  private weights: PriorityWeights;
  private entries: Map<string, AccumulatorEntry> = new Map();
  /** Minimum priority threshold for an entity to receive updates. */
  private threshold: number;
  /** Maximum accumulatable priority. */
  private maxPriority: number;

  constructor(
    weights?: Partial<PriorityWeights>,
    threshold: number = 0.1,
    maxPriority: number = 100,
  ) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    this.threshold = threshold;
    this.maxPriority = maxPriority;
  }

  /**
   * Update priority factors for an entity.
   */
  updateFactors(entityId: string, factors: Partial<PriorityFactors>): void {
    const existing = this.entries.get(entityId);
    const currentFactors: PriorityFactors = existing?.factors ?? {
      distance: 0,
      velocity: 0,
      interaction: 0,
      relevance: 0,
      staleness: 0,
    };

    const mergedFactors: PriorityFactors = { ...currentFactors, ...factors };
    const priority = this.computePriority(mergedFactors);

    this.entries.set(entityId, {
      entityId,
      accumulatedPriority: Math.min(priority, this.maxPriority),
      lastUpdateTime: existing?.lastUpdateTime ?? Date.now(),
      factors: mergedFactors,
    });
  }

  /**
   * Accumulate priority for all entities based on staleness.
   * Call this each tick to increase priority for entities that
   * have not been updated recently.
   */
  accumulateTick(now: number = Date.now()): void {
    for (const [, entry] of this.entries) {
      const staleness = (now - entry.lastUpdateTime) / 1000; // seconds
      entry.factors.staleness = staleness;
      entry.accumulatedPriority = Math.min(
        this.computePriority(entry.factors),
        this.maxPriority,
      );
    }
  }

  /**
   * Consume priority for an entity (after sending an update).
   * Resets staleness and reduces accumulated priority.
   */
  consumePriority(entityId: string): void {
    const entry = this.entries.get(entityId);
    if (entry) {
      entry.accumulatedPriority = 0;
      entry.lastUpdateTime = Date.now();
      entry.factors.staleness = 0;
    }
  }

  /**
   * Get entities sorted by priority (highest first).
   */
  getByPriority(limit?: number): AccumulatorEntry[] {
    const sorted = Array.from(this.entries.values())
      .filter((e) => e.accumulatedPriority >= this.threshold)
      .sort((a, b) => b.accumulatedPriority - a.accumulatedPriority);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get priority for a specific entity.
   */
  getPriority(entityId: string): number {
    return this.entries.get(entityId)?.accumulatedPriority ?? 0;
  }

  /**
   * Remove an entity from tracking.
   */
  removeEntity(entityId: string): void {
    this.entries.delete(entityId);
  }

  /**
   * Get number of tracked entities.
   */
  getEntityCount(): number {
    return this.entries.size;
  }

  /**
   * Get entities above the priority threshold.
   */
  getActiveCount(): number {
    let count = 0;
    for (const entry of this.entries.values()) {
      if (entry.accumulatedPriority >= this.threshold) count++;
    }
    return count;
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.entries.clear();
  }

  private computePriority(factors: PriorityFactors): number {
    // Invert distance (closer = higher priority)
    const distanceFactor = factors.distance > 0 ? 1 / (1 + factors.distance * 0.01) : 1;

    return (
      distanceFactor * this.weights.distance * 100 +
      Math.min(factors.velocity, 50) * this.weights.velocity +
      factors.interaction * this.weights.interaction * 100 +
      factors.relevance * this.weights.relevance * 100 +
      Math.min(factors.staleness, 10) * this.weights.staleness * 10
    );
  }
}
