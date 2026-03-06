/**
 * @hololand/networking ConsistencyTier
 *
 * 4-tier consistency model for server-authoritative state sync.
 * Each tier trades latency for consistency guarantees:
 *   Tier 0 (Strict)   - Server-validated before render (physics, collision)
 *   Tier 1 (Eventual)  - Optimistic local, reconciled within 100ms (movement)
 *   Tier 2 (Relaxed)   - Best-effort, tolerates 500ms staleness (animations)
 *   Tier 3 (Cosmetic)  - Fire-and-forget, no reconciliation (particles, VFX)
 */

export enum ConsistencyLevel {
  /** Server must validate before client renders. Max latency: 1 frame. */
  Strict = 0,
  /** Optimistic local apply, server reconciles within 100ms. */
  Eventual = 1,
  /** Best-effort delivery, tolerates up to 500ms staleness. */
  Relaxed = 2,
  /** Fire-and-forget cosmetic state. No reconciliation. */
  Cosmetic = 3,
}

export interface TierConfig {
  level: ConsistencyLevel;
  maxStalenessMs: number;
  requiresAck: boolean;
  reconciliationWindowMs: number;
  /** Max updates per second for this tier. */
  maxUpdateRateHz: number;
  /** Whether to apply client-side prediction. */
  predictLocally: boolean;
}

const DEFAULT_TIER_CONFIGS: Record<ConsistencyLevel, TierConfig> = {
  [ConsistencyLevel.Strict]: {
    level: ConsistencyLevel.Strict,
    maxStalenessMs: 0,
    requiresAck: true,
    reconciliationWindowMs: 16, // ~1 frame at 60fps
    maxUpdateRateHz: 90,
    predictLocally: false,
  },
  [ConsistencyLevel.Eventual]: {
    level: ConsistencyLevel.Eventual,
    maxStalenessMs: 100,
    requiresAck: true,
    reconciliationWindowMs: 100,
    maxUpdateRateHz: 30,
    predictLocally: true,
  },
  [ConsistencyLevel.Relaxed]: {
    level: ConsistencyLevel.Relaxed,
    maxStalenessMs: 500,
    requiresAck: false,
    reconciliationWindowMs: 500,
    maxUpdateRateHz: 10,
    predictLocally: true,
  },
  [ConsistencyLevel.Cosmetic]: {
    level: ConsistencyLevel.Cosmetic,
    maxStalenessMs: Infinity,
    requiresAck: false,
    reconciliationWindowMs: Infinity,
    maxUpdateRateHz: 5,
    predictLocally: true,
  },
};

export interface StateEntry {
  entityId: string;
  tier: ConsistencyLevel;
  payload: unknown;
  timestamp: number;
  sequenceNumber: number;
  acknowledged: boolean;
}

/**
 * Manages per-entity consistency tier assignment and state validation.
 */
export class ConsistencyTierManager {
  private entityTiers: Map<string, ConsistencyLevel> = new Map();
  private tierConfigs: Map<ConsistencyLevel, TierConfig> = new Map();
  private pendingEntries: Map<string, StateEntry[]> = new Map();
  private sequenceCounters: Map<string, number> = new Map();

  constructor(customConfigs?: Partial<Record<ConsistencyLevel, Partial<TierConfig>>>) {
    // Initialize with defaults, apply overrides
    for (const [level, config] of Object.entries(DEFAULT_TIER_CONFIGS)) {
      const numLevel = Number(level) as ConsistencyLevel;
      const override = customConfigs?.[numLevel];
      this.tierConfigs.set(numLevel, override ? { ...config, ...override } : { ...config });
    }
  }

  /**
   * Assign an entity to a consistency tier.
   */
  assignTier(entityId: string, tier: ConsistencyLevel): void {
    this.entityTiers.set(entityId, tier);
    if (!this.sequenceCounters.has(entityId)) {
      this.sequenceCounters.set(entityId, 0);
    }
  }

  /**
   * Get the consistency tier for an entity.
   */
  getTier(entityId: string): ConsistencyLevel {
    return this.entityTiers.get(entityId) ?? ConsistencyLevel.Relaxed;
  }

  /**
   * Get the configuration for a given tier.
   */
  getTierConfig(tier: ConsistencyLevel): TierConfig {
    return this.tierConfigs.get(tier)!;
  }

  /**
   * Create a state entry for an entity update.
   */
  createStateEntry(entityId: string, payload: unknown): StateEntry {
    const tier = this.getTier(entityId);
    const seq = (this.sequenceCounters.get(entityId) ?? 0) + 1;
    this.sequenceCounters.set(entityId, seq);

    const entry: StateEntry = {
      entityId,
      tier,
      payload,
      timestamp: Date.now(),
      sequenceNumber: seq,
      acknowledged: false,
    };

    // Track pending entries for tiers that require ack
    const config = this.tierConfigs.get(tier)!;
    if (config.requiresAck) {
      if (!this.pendingEntries.has(entityId)) {
        this.pendingEntries.set(entityId, []);
      }
      this.pendingEntries.get(entityId)!.push(entry);
    }

    return entry;
  }

  /**
   * Acknowledge a state entry (server confirmed).
   */
  acknowledge(entityId: string, sequenceNumber: number): boolean {
    const pending = this.pendingEntries.get(entityId);
    if (!pending) return false;

    const idx = pending.findIndex((e) => e.sequenceNumber === sequenceNumber);
    if (idx === -1) return false;

    pending[idx].acknowledged = true;
    // Remove all acknowledged entries up to this sequence
    while (pending.length > 0 && pending[0].acknowledged) {
      pending.shift();
    }
    return true;
  }

  /**
   * Check if a state entry is stale beyond its tier tolerance.
   */
  isStale(entry: StateEntry, now: number = Date.now()): boolean {
    const config = this.tierConfigs.get(entry.tier)!;
    if (config.maxStalenessMs === Infinity) return false;
    return now - entry.timestamp > config.maxStalenessMs;
  }

  /**
   * Get all pending (unacknowledged) entries for an entity.
   */
  getPendingEntries(entityId: string): ReadonlyArray<StateEntry> {
    return this.pendingEntries.get(entityId) ?? [];
  }

  /**
   * Determine whether client-side prediction is enabled for an entity.
   */
  shouldPredict(entityId: string): boolean {
    const tier = this.getTier(entityId);
    const config = this.tierConfigs.get(tier)!;
    return config.predictLocally;
  }

  /**
   * Get the maximum update rate for an entity's tier.
   */
  getMaxUpdateRate(entityId: string): number {
    const tier = this.getTier(entityId);
    return this.tierConfigs.get(tier)!.maxUpdateRateHz;
  }

  /**
   * Remove an entity from tracking.
   */
  removeEntity(entityId: string): void {
    this.entityTiers.delete(entityId);
    this.pendingEntries.delete(entityId);
    this.sequenceCounters.delete(entityId);
  }

  /**
   * Get count of all tracked entities.
   */
  getEntityCount(): number {
    return this.entityTiers.size;
  }

  /**
   * Get entities grouped by tier.
   */
  getEntitiesByTier(): Map<ConsistencyLevel, string[]> {
    const grouped = new Map<ConsistencyLevel, string[]>();
    for (const [entityId, tier] of this.entityTiers) {
      if (!grouped.has(tier)) grouped.set(tier, []);
      grouped.get(tier)!.push(entityId);
    }
    return grouped;
  }
}
