/**
 * @hololand/agents InferenceCache
 *
 * Multi-tier inference result cache. Higher tiers (strategic, spatial)
 * produce cached state that lower tiers (reactive, render) consume
 * at their own frequency without re-computation.
 *
 * Uses TTL-based expiration per tier with LRU eviction.
 */

import { ReasoningTierLevel, type InferenceResult } from './ReasoningTier';

export interface CacheEntry {
  result: InferenceResult;
  expiresAt: number;
  accessCount: number;
  lastAccessedAt: number;
}

export interface InferenceCacheConfig {
  /** Maximum entries per agent per tier. */
  maxEntriesPerAgentPerTier: number;
  /** TTL overrides per tier in ms. Defaults based on tier frequency. */
  ttlByTier?: Partial<Record<ReasoningTierLevel, number>>;
}

const DEFAULT_TTL: Record<ReasoningTierLevel, number> = {
  [ReasoningTierLevel.Strategic]: 5000,  // 5s (runs at 0.2-1Hz)
  [ReasoningTierLevel.Spatial]: 1000,    // 1s (runs at 1-5Hz)
  [ReasoningTierLevel.Reactive]: 100,    // 100ms (runs at 10-30Hz)
  [ReasoningTierLevel.RenderRate]: 16,   // ~1 frame at 60fps
};

const DEFAULT_CONFIG: InferenceCacheConfig = {
  maxEntriesPerAgentPerTier: 16,
};

/**
 * Thread-safe inference result cache with tier-aware TTL and LRU eviction.
 */
export class InferenceCache {
  private config: InferenceCacheConfig;
  private ttls: Record<ReasoningTierLevel, number>;
  // Map<agentId, Map<tier, Map<cacheKey, CacheEntry>>>
  private cache: Map<string, Map<ReasoningTierLevel, Map<string, CacheEntry>>> = new Map();
  private stats = { hits: 0, misses: 0, evictions: 0, expirations: 0 };

  constructor(config?: Partial<InferenceCacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ttls = { ...DEFAULT_TTL, ...config?.ttlByTier } as Record<ReasoningTierLevel, number>;
  }

  /**
   * Store an inference result in the cache.
   */
  put(agentId: string, tier: ReasoningTierLevel, key: string, result: InferenceResult): void {
    if (!this.cache.has(agentId)) {
      this.cache.set(agentId, new Map());
    }
    const agentCache = this.cache.get(agentId)!;
    if (!agentCache.has(tier)) {
      agentCache.set(tier, new Map());
    }
    const tierCache = agentCache.get(tier)!;

    // Evict LRU if at capacity
    if (tierCache.size >= this.config.maxEntriesPerAgentPerTier) {
      this.evictLRU(tierCache);
    }

    const now = Date.now();
    tierCache.set(key, {
      result,
      expiresAt: now + this.ttls[tier],
      accessCount: 0,
      lastAccessedAt: now,
    });
  }

  /**
   * Get a cached result. Returns null if not found or expired.
   */
  get(agentId: string, tier: ReasoningTierLevel, key: string): InferenceResult | null {
    const agentCache = this.cache.get(agentId);
    if (!agentCache) {
      this.stats.misses++;
      return null;
    }
    const tierCache = agentCache.get(tier);
    if (!tierCache) {
      this.stats.misses++;
      return null;
    }
    const entry = tierCache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      tierCache.delete(key);
      this.stats.expirations++;
      this.stats.misses++;
      return null;
    }

    entry.accessCount++;
    entry.lastAccessedAt = now;
    this.stats.hits++;
    return { ...entry.result, fromCache: true };
  }

  /**
   * Get the latest cached result for an agent at any tier at or above
   * the specified minimum tier.
   */
  getLatestAboveTier(agentId: string, minTier: ReasoningTierLevel, key: string): InferenceResult | null {
    // Search from highest tier (Strategic=0) down to minTier
    for (let t = 0; t <= minTier; t++) {
      const result = this.get(agentId, t as ReasoningTierLevel, key);
      if (result) return result;
    }
    return null;
  }

  /**
   * Invalidate all cache entries for an agent.
   */
  invalidateAgent(agentId: string): void {
    this.cache.delete(agentId);
  }

  /**
   * Invalidate a specific tier for an agent.
   */
  invalidateTier(agentId: string, tier: ReasoningTierLevel): void {
    const agentCache = this.cache.get(agentId);
    if (agentCache) {
      agentCache.delete(tier);
    }
  }

  /**
   * Run garbage collection to remove all expired entries.
   */
  gc(): number {
    let removed = 0;
    const now = Date.now();
    for (const [, agentCache] of this.cache) {
      for (const [, tierCache] of agentCache) {
        for (const [key, entry] of tierCache) {
          if (now > entry.expiresAt) {
            tierCache.delete(key);
            removed++;
            this.stats.expirations++;
          }
        }
      }
    }
    return removed;
  }

  /**
   * Get cache statistics.
   */
  getStats(): { hits: number; misses: number; evictions: number; expirations: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Get total number of cached entries.
   */
  size(): number {
    let total = 0;
    for (const [, agentCache] of this.cache) {
      for (const [, tierCache] of agentCache) {
        total += tierCache.size;
      }
    }
    return total;
  }

  /**
   * Clear all cached data.
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, expirations: 0 };
  }

  private evictLRU(tierCache: Map<string, CacheEntry>): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of tierCache) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldest = key;
      }
    }
    if (oldest) {
      tierCache.delete(oldest);
      this.stats.evictions++;
    }
  }
}
