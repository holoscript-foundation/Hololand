/**
 * @hololand/networking TieredStateSync
 *
 * Orchestrates the 4-tier consistency model for multiplayer state synchronization.
 * Coordinates ServerAuthority, ConsistencyTierManager, and ClientPrediction to
 * deliver 200 entities at 90fps with minimal bandwidth.
 *
 * Architecture:
 * - Tier 0 entities: Full server validation each tick (physics, collision)
 * - Tier 1 entities: Optimistic local + eventual reconciliation (player movement)
 * - Tier 2 entities: Batched updates at 10Hz (NPC animations)
 * - Tier 3 entities: Best-effort multicast (particles, cosmetic)
 */

import {
  ConsistencyTierManager,
  ConsistencyLevel,
  type StateEntry,
} from './ConsistencyTier';
import {
  ServerAuthority,
  type EntityState,
  type ClientInput,
  type StateSnapshot,
  type ServerAuthorityConfig,
} from './ServerAuthority';
import { ClientPrediction, type PredictedState, type ClientPredictionConfig } from './ClientPrediction';

export interface TieredStateSyncConfig {
  serverConfig?: Partial<ServerAuthorityConfig>;
  predictionConfig?: Partial<ClientPredictionConfig>;
  /** Target framerate for VR rendering. */
  targetFps: number;
  /** Bandwidth budget in bytes/sec per client. */
  bandwidthBudgetBytesPerSec: number;
  /** Maximum entities for the whole simulation. */
  maxEntities: number;
}

const DEFAULT_SYNC_CONFIG: TieredStateSyncConfig = {
  targetFps: 90,
  bandwidthBudgetBytesPerSec: 50_000, // 50KB/s per client
  maxEntities: 200,
};

export interface SyncMetrics {
  totalEntities: number;
  entitiesByTier: Record<number, number>;
  ticksProcessed: number;
  averageTickDurationMs: number;
  bandwidthUsedBytesPerSec: number;
  predictionAccuracy: number; // 0-1
  reconciliationsPerSecond: number;
}

interface TierBatch {
  tier: ConsistencyLevel;
  entries: StateEntry[];
  lastBatchTick: number;
}

/**
 * Main orchestrator for tiered state synchronization.
 */
export class TieredStateSync {
  private config: TieredStateSyncConfig;
  private tierManager: ConsistencyTierManager;
  private serverAuthority: ServerAuthority;
  private clientPrediction: ClientPrediction;
  private tierBatches: Map<ConsistencyLevel, TierBatch> = new Map();
  private tickCount: number = 0;
  private tickDurations: number[] = [];
  private reconciliationCount: number = 0;
  private lastMetricsResetTime: number = Date.now();

  constructor(config?: Partial<TieredStateSyncConfig>) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.tierManager = new ConsistencyTierManager();
    this.serverAuthority = new ServerAuthority({
      ...this.config.serverConfig,
      maxEntities: this.config.maxEntities,
    });
    this.clientPrediction = new ClientPrediction(this.config.predictionConfig);

    // Initialize tier batches
    for (const tier of [
      ConsistencyLevel.Strict,
      ConsistencyLevel.Eventual,
      ConsistencyLevel.Relaxed,
      ConsistencyLevel.Cosmetic,
    ]) {
      this.tierBatches.set(tier, { tier, entries: [], lastBatchTick: 0 });
    }
  }

  /**
   * Register an entity with a specified consistency tier.
   */
  registerEntity(entity: EntityState, tier: ConsistencyLevel = ConsistencyLevel.Relaxed): boolean {
    const registered = this.serverAuthority.registerEntity(entity);
    if (registered) {
      this.tierManager.assignTier(entity.entityId, tier);
      this.clientPrediction.initializeEntity(entity);
    }
    return registered;
  }

  /**
   * Remove an entity from the sync system.
   */
  removeEntity(entityId: string): void {
    this.serverAuthority.removeEntity(entityId);
    this.tierManager.removeEntity(entityId);
    this.clientPrediction.removeEntity(entityId);
  }

  /**
   * Submit a client input. If the entity's tier supports prediction,
   * immediately return a predicted state.
   */
  submitInput(input: ClientInput): PredictedState | null {
    this.serverAuthority.submitInput(input);

    if (this.tierManager.shouldPredict(input.entityId)) {
      const dt = 1 / this.config.targetFps;
      return this.clientPrediction.predictInput(input.entityId, input, dt);
    }

    return null;
  }

  /**
   * Process one simulation tick. Advances server state, batches updates by tier,
   * and triggers reconciliation for predicted entities.
   */
  processTick(): StateSnapshot {
    const tickStart = performance.now();
    this.tickCount++;

    // 1. Advance server state
    const snapshot = this.serverAuthority.tick();

    // 2. Batch state entries by tier
    for (const entity of snapshot.entities) {
      const tier = this.tierManager.getTier(entity.entityId);
      const tierConfig = this.tierManager.getTierConfig(tier);
      const batch = this.tierBatches.get(tier)!;

      // Check if this tier should send an update this tick
      const ticksSinceLastBatch = this.tickCount - batch.lastBatchTick;
      const ticksBetweenUpdates = Math.max(
        1,
        Math.floor(this.config.targetFps / tierConfig.maxUpdateRateHz),
      );

      if (ticksSinceLastBatch >= ticksBetweenUpdates) {
        const entry = this.tierManager.createStateEntry(entity.entityId, entity);
        batch.entries.push(entry);
        batch.lastBatchTick = this.tickCount;
      }
    }

    // 3. Reconcile predicted entities
    for (const entity of snapshot.entities) {
      if (this.tierManager.shouldPredict(entity.entityId)) {
        const result = this.clientPrediction.reconcile(
          entity.entityId,
          entity,
          snapshot.tick,
        );
        if (result.correctionMagnitude > 0.001) {
          this.reconciliationCount++;
        }
      }
    }

    // Track tick duration
    const tickDuration = performance.now() - tickStart;
    this.tickDurations.push(tickDuration);
    if (this.tickDurations.length > 120) {
      this.tickDurations.shift();
    }

    return snapshot;
  }

  /**
   * Flush and return pending state entries for a given tier.
   */
  flushTierBatch(tier: ConsistencyLevel): StateEntry[] {
    const batch = this.tierBatches.get(tier);
    if (!batch) return [];
    const entries = [...batch.entries];
    batch.entries = [];
    return entries;
  }

  /**
   * Get the current predicted or authoritative state for an entity.
   */
  getEntityState(entityId: string): PredictedState | EntityState | undefined {
    if (this.tierManager.shouldPredict(entityId)) {
      return this.clientPrediction.getPredictedState(entityId);
    }
    return this.serverAuthority.getEntityState(entityId);
  }

  /**
   * Get sync metrics for monitoring.
   */
  getMetrics(): SyncMetrics {
    const entitiesByTier = this.tierManager.getEntitiesByTier();
    const tierCounts: Record<number, number> = {};
    for (const [tier, entities] of entitiesByTier) {
      tierCounts[tier] = entities.length;
    }

    const avgTickDuration =
      this.tickDurations.length > 0
        ? this.tickDurations.reduce((a, b) => a + b, 0) / this.tickDurations.length
        : 0;

    const elapsed = (Date.now() - this.lastMetricsResetTime) / 1000;
    const reconcPerSec = elapsed > 0 ? this.reconciliationCount / elapsed : 0;

    // Estimate bandwidth (simplified: 64 bytes per entity state entry)
    const totalEntries = Array.from(this.tierBatches.values()).reduce(
      (sum, b) => sum + b.entries.length,
      0,
    );
    const bwEstimate = (totalEntries * 64) / Math.max(elapsed, 0.001);

    return {
      totalEntities: this.serverAuthority.getEntityCount(),
      entitiesByTier: tierCounts,
      ticksProcessed: this.tickCount,
      averageTickDurationMs: avgTickDuration,
      bandwidthUsedBytesPerSec: bwEstimate,
      predictionAccuracy: 1.0 - Math.min(1, reconcPerSec / 10),
      reconciliationsPerSecond: reconcPerSec,
    };
  }

  /**
   * Change an entity's consistency tier at runtime.
   */
  changeTier(entityId: string, newTier: ConsistencyLevel): void {
    this.tierManager.assignTier(entityId, newTier);
  }

  /**
   * Get underlying managers (for advanced use).
   */
  getTierManager(): ConsistencyTierManager {
    return this.tierManager;
  }

  getServerAuthority(): ServerAuthority {
    return this.serverAuthority;
  }

  getClientPrediction(): ClientPrediction {
    return this.clientPrediction;
  }
}
