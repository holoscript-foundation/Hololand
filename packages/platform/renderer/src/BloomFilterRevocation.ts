/**
 * BloomFilterRevocation
 *
 * A probabilistic data structure providing O(1) lookup for revoked agent IDs.
 * Used by the GossipTrustMesh to efficiently check whether an agent has been
 * revoked without consulting the full trust state map.
 *
 * DESIGN PRINCIPLES:
 * - O(1) membership test: `mightBeRevoked(agentId)` returns in constant time
 *   regardless of the number of revoked agents. This is critical for the
 *   render loop where we cannot afford O(n) scans.
 * - False positives, no false negatives: The filter may report an agent as
 *   "possibly revoked" when it is not (false positive), but will NEVER report
 *   a revoked agent as "not revoked" (zero false negatives). The trust system
 *   treats false positives conservatively: the agent is re-verified.
 * - Configurable false positive rate: The filter auto-sizes its bit array
 *   and number of hash functions (k) based on expected capacity and target
 *   false positive rate. Default: 0.01 (1%) with 1024 expected items.
 * - Render-loop safe: All operations are synchronous, allocation-free after
 *   construction, and complete in <0.01ms per call.
 * - Counting variant support: Uses a counting Bloom filter (uint8 counters
 *   instead of bits) to support removal. Standard Bloom filters cannot remove
 *   elements. The counting variant increments on add and decrements on remove.
 *
 * HASH FUNCTION STRATEGY:
 * Uses the double-hashing technique (Kirsch & Mitzenmacher, 2006):
 *   h_i(x) = h1(x) + i * h2(x) mod m
 * where h1 and h2 are two independent hash functions and i ranges from 0 to k-1.
 * This gives k hash functions from just two base hashes, with the same
 * theoretical guarantees as k independent hash functions.
 *
 * INTEGRATION:
 * The GossipTrustMesh uses this filter as the first-pass revocation check:
 * ```
 *   if (bloomFilter.mightBeRevoked(agentId)) {
 *     // Possibly revoked: do full trust state lookup (off render loop)
 *     return trustHandshake.getAgentTrustLevel(agentId) === 'revoked';
 *   }
 *   // Definitely NOT revoked: safe to proceed (on render loop, <0.01ms)
 *   return false;
 * ```
 *
 * @module BloomFilterRevocation
 */

import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for the Bloom filter.
 */
export interface BloomFilterConfig {
  /** Expected number of elements to store (default: 1024) */
  expectedItems?: number;
  /** Target false positive rate (0-1, default: 0.01 = 1%) */
  falsePositiveRate?: number;
  /**
   * Whether to use counting mode (allows removal).
   * Standard mode uses 1-bit per cell (smaller but no removal).
   * Counting mode uses 8-bit counters per cell (8x larger but supports removal).
   * Default: true (counting mode for revocation use case).
   */
  counting?: boolean;
}

/**
 * Metrics for the Bloom filter.
 */
export interface BloomFilterMetrics {
  /** Number of bits in the filter (m) */
  bitCount: number;
  /** Number of hash functions (k) */
  hashCount: number;
  /** Number of items currently in the filter */
  itemCount: number;
  /** Expected false positive rate given current item count */
  estimatedFalsePositiveRate: number;
  /** Target false positive rate */
  targetFalsePositiveRate: number;
  /** Expected capacity */
  expectedItems: number;
  /** Fill ratio (fraction of set bits/non-zero counters) */
  fillRatio: number;
  /** Whether counting mode is enabled */
  counting: boolean;
  /** Memory usage in bytes */
  memoryBytes: number;
}

// =============================================================================
// BLOOM FILTER IMPLEMENTATION
// =============================================================================

/**
 * Bloom filter for O(1) revocation lookup.
 *
 * Provides constant-time probabilistic membership testing for revoked agent IDs.
 * Uses double-hashing for k independent hash functions from two base hashes.
 *
 * Usage:
 * ```typescript
 * const filter = new BloomFilterRevocation({ expectedItems: 1000 });
 *
 * // When an agent is revoked
 * filter.add('agent-123');
 *
 * // Render-loop safe: O(1) check
 * if (filter.mightBeRevoked('agent-123')) {
 *   // Possibly revoked (with 1% false positive rate)
 *   // Do full verification off render loop
 * }
 *
 * // When revocation is lifted (counting mode only)
 * filter.remove('agent-123');
 * ```
 */
export class BloomFilterRevocation {
  /** Bit array size (m) */
  private readonly m: number;
  /** Number of hash functions (k) */
  private readonly k: number;
  /** Whether counting mode is enabled */
  private readonly counting: boolean;
  /** The filter storage: Uint8Array for counting mode, Uint8Array (bit-packed) for standard */
  private readonly filter: Uint8Array;
  /** Number of items currently in the filter */
  private itemCount: number = 0;
  /** Target false positive rate */
  private readonly targetFpr: number;
  /** Expected capacity */
  private readonly expectedItems: number;

  constructor(config?: BloomFilterConfig) {
    this.expectedItems = config?.expectedItems ?? 1024;
    this.targetFpr = config?.falsePositiveRate ?? 0.01;
    this.counting = config?.counting ?? true;

    // Calculate optimal bit array size (m) and hash count (k)
    // m = -n * ln(p) / (ln(2)^2)
    // k = (m/n) * ln(2)
    const n = Math.max(1, this.expectedItems);
    const p = Math.max(1e-10, Math.min(0.5, this.targetFpr));

    this.m = Math.ceil(-n * Math.log(p) / (Math.LN2 * Math.LN2));
    this.k = Math.max(1, Math.round((this.m / n) * Math.LN2));

    // Allocate storage
    if (this.counting) {
      // Counting mode: one byte per cell (supports up to 255 overlapping adds)
      this.filter = new Uint8Array(this.m);
    } else {
      // Standard mode: bit-packed, one bit per cell
      this.filter = new Uint8Array(Math.ceil(this.m / 8));
    }

    logger.debug('[BloomFilterRevocation] Initialized', {
      m: this.m,
      k: this.k,
      counting: this.counting,
      expectedItems: this.expectedItems,
      targetFpr: this.targetFpr,
      memoryBytes: this.filter.byteLength,
    });
  }

  // ===========================================================================
  // CORE API
  // ===========================================================================

  /**
   * Add an agent ID to the revocation filter.
   *
   * After this call, `mightBeRevoked(agentId)` will ALWAYS return true
   * for this agent (until `remove()` in counting mode, or `clear()`).
   *
   * Cost: O(k) where k = number of hash functions (typically 7).
   * Time: <0.01ms
   *
   * @param agentId - The agent ID to mark as revoked
   */
  add(agentId: string): void {
    const { h1, h2 } = this.hash(agentId);

    for (let i = 0; i < this.k; i++) {
      const idx = this.getIndex(h1, h2, i);

      if (this.counting) {
        // Counting mode: increment counter (saturate at 255)
        if (this.filter[idx] < 255) {
          this.filter[idx]++;
        }
      } else {
        // Standard mode: set bit
        const byteIdx = idx >>> 3;
        const bitIdx = idx & 7;
        this.filter[byteIdx] |= (1 << bitIdx);
      }
    }

    this.itemCount++;
  }

  /**
   * Remove an agent ID from the revocation filter.
   *
   * Only available in counting mode. Decrements the counters for each hash
   * position. After removal, `mightBeRevoked(agentId)` may return false
   * (unless there are hash collisions with other entries).
   *
   * IMPORTANT: Only call remove() for agents that were previously add()'d.
   * Removing an agent that was never added will corrupt the filter by
   * underflowing counters.
   *
   * Cost: O(k) where k = number of hash functions (typically 7).
   * Time: <0.01ms
   *
   * @param agentId - The agent ID to unmark as revoked
   * @returns true if removal was performed, false if not in counting mode
   */
  remove(agentId: string): boolean {
    if (!this.counting) {
      logger.warn('[BloomFilterRevocation] Cannot remove in standard (non-counting) mode');
      return false;
    }

    const { h1, h2 } = this.hash(agentId);

    for (let i = 0; i < this.k; i++) {
      const idx = this.getIndex(h1, h2, i);
      if (this.filter[idx] > 0) {
        this.filter[idx]--;
      }
    }

    this.itemCount = Math.max(0, this.itemCount - 1);
    return true;
  }

  /**
   * Check if an agent ID MIGHT be revoked.
   *
   * This is the primary render-loop integration point.
   *
   * Returns:
   * - `true`: Agent is POSSIBLY revoked (with `targetFpr` probability of false positive).
   *   The caller should perform a full trust state lookup off the render loop.
   * - `false`: Agent is DEFINITELY NOT revoked. Safe to proceed immediately.
   *
   * GUARANTEES:
   * - Zero false negatives: If an agent was add()'d and not remove()'d,
   *   this will ALWAYS return true.
   * - Bounded false positives: The probability of a false positive is
   *   approximately `targetFpr` when the filter has `expectedItems` entries.
   *
   * Cost: O(k) where k = number of hash functions (typically 7).
   * Time: <0.01ms (render-loop safe)
   *
   * @param agentId - The agent ID to check
   * @returns true if the agent might be revoked, false if definitely not
   */
  mightBeRevoked(agentId: string): boolean {
    const { h1, h2 } = this.hash(agentId);

    for (let i = 0; i < this.k; i++) {
      const idx = this.getIndex(h1, h2, i);

      if (this.counting) {
        if (this.filter[idx] === 0) return false;
      } else {
        const byteIdx = idx >>> 3;
        const bitIdx = idx & 7;
        if ((this.filter[byteIdx] & (1 << bitIdx)) === 0) return false;
      }
    }

    return true;
  }

  /**
   * Clear all entries from the filter.
   * Resets the filter to its initial empty state.
   */
  clear(): void {
    this.filter.fill(0);
    this.itemCount = 0;
  }

  // ===========================================================================
  // QUERY API
  // ===========================================================================

  /**
   * Get the current number of items in the filter.
   */
  getItemCount(): number {
    return this.itemCount;
  }

  /**
   * Get the number of hash functions (k).
   */
  getHashCount(): number {
    return this.k;
  }

  /**
   * Get the bit array size (m).
   */
  getBitCount(): number {
    return this.m;
  }

  /**
   * Estimate the current false positive rate.
   *
   * FPR = (1 - e^(-k*n/m))^k
   * where n = item count, m = bit count, k = hash count
   */
  getEstimatedFalsePositiveRate(): number {
    if (this.itemCount === 0) return 0;
    const exponent = -this.k * this.itemCount / this.m;
    return Math.pow(1 - Math.exp(exponent), this.k);
  }

  /**
   * Get the fill ratio (fraction of set bits / non-zero counters).
   */
  getFillRatio(): number {
    let setCount = 0;
    if (this.counting) {
      for (let i = 0; i < this.m; i++) {
        if (this.filter[i] > 0) setCount++;
      }
      return setCount / this.m;
    } else {
      for (let i = 0; i < this.m; i++) {
        const byteIdx = i >>> 3;
        const bitIdx = i & 7;
        if (this.filter[byteIdx] & (1 << bitIdx)) setCount++;
      }
      return setCount / this.m;
    }
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Get comprehensive filter metrics.
   */
  getMetrics(): BloomFilterMetrics {
    return {
      bitCount: this.m,
      hashCount: this.k,
      itemCount: this.itemCount,
      estimatedFalsePositiveRate: this.getEstimatedFalsePositiveRate(),
      targetFalsePositiveRate: this.targetFpr,
      expectedItems: this.expectedItems,
      fillRatio: this.getFillRatio(),
      counting: this.counting,
      memoryBytes: this.filter.byteLength,
    };
  }

  // ===========================================================================
  // SERIALIZATION (for gossip protocol transmission)
  // ===========================================================================

  /**
   * Serialize the filter state for transmission over the gossip protocol.
   *
   * Returns a compact representation that can be sent to peer nodes
   * to synchronize revocation state.
   */
  serialize(): BloomFilterSnapshot {
    return {
      m: this.m,
      k: this.k,
      counting: this.counting,
      itemCount: this.itemCount,
      targetFpr: this.targetFpr,
      expectedItems: this.expectedItems,
      // Use base64-like encoding for compact transmission
      data: Array.from(this.filter),
    };
  }

  /**
   * Merge another filter's state into this one (union).
   *
   * Used by the gossip protocol to incorporate revocation state
   * received from peer nodes. After merge, any agent revoked in
   * EITHER filter will be marked as possibly revoked.
   *
   * @param snapshot - The serialized filter to merge
   * @returns true if merge was successful, false if incompatible
   */
  merge(snapshot: BloomFilterSnapshot): boolean {
    // Filters must have same parameters to be merged
    if (snapshot.m !== this.m || snapshot.k !== this.k || snapshot.counting !== this.counting) {
      logger.warn('[BloomFilterRevocation] Cannot merge: incompatible filter parameters', {
        local: { m: this.m, k: this.k, counting: this.counting },
        remote: { m: snapshot.m, k: snapshot.k, counting: snapshot.counting },
      });
      return false;
    }

    if (this.counting) {
      // Counting mode: take max of each counter (conservative merge)
      for (let i = 0; i < this.m; i++) {
        this.filter[i] = Math.max(this.filter[i], snapshot.data[i]) as number;
      }
    } else {
      // Standard mode: bitwise OR (union)
      const byteLen = Math.ceil(this.m / 8);
      for (let i = 0; i < byteLen; i++) {
        this.filter[i] |= snapshot.data[i];
      }
    }

    // Update item count (approximate, take max as conservative estimate)
    this.itemCount = Math.max(this.itemCount, snapshot.itemCount);

    return true;
  }

  // ===========================================================================
  // INTERNAL: HASH FUNCTIONS
  // ===========================================================================

  /**
   * Compute two independent hash values for the double-hashing scheme.
   *
   * Uses FNV-1a (32-bit) as h1 and a variant as h2.
   * FNV-1a is fast, has good distribution, and works well for strings.
   *
   * @param key - The string to hash
   * @returns Two 32-bit hash values
   */
  private hash(key: string): { h1: number; h2: number } {
    // FNV-1a hash (h1)
    let h1 = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < key.length; i++) {
      h1 ^= key.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193); // FNV prime
    }
    h1 = h1 >>> 0; // Convert to unsigned 32-bit

    // Modified FNV-1a hash (h2) - different seed
    let h2 = 0x6c62272e; // Alternative offset basis
    for (let i = 0; i < key.length; i++) {
      h2 ^= key.charCodeAt(i);
      h2 = Math.imul(h2, 0x01000193);
    }
    h2 = h2 >>> 0;

    // Ensure h2 is odd (to guarantee full period in modular arithmetic)
    h2 = h2 | 1;

    return { h1, h2 };
  }

  /**
   * Compute the i-th hash index using double hashing.
   *
   * h_i(x) = (h1(x) + i * h2(x)) mod m
   *
   * @param h1 - First hash value
   * @param h2 - Second hash value (must be odd)
   * @param i - Hash function index (0 to k-1)
   * @returns Index into the filter array [0, m)
   */
  private getIndex(h1: number, h2: number, i: number): number {
    return ((h1 + Math.imul(i, h2)) >>> 0) % this.m;
  }
}

// =============================================================================
// SERIALIZATION TYPES
// =============================================================================

/**
 * Serialized snapshot of a Bloom filter for gossip transmission.
 */
export interface BloomFilterSnapshot {
  /** Bit array size (m) */
  m: number;
  /** Number of hash functions (k) */
  k: number;
  /** Whether counting mode is used */
  counting: boolean;
  /** Number of items in the filter */
  itemCount: number;
  /** Target false positive rate */
  targetFpr: number;
  /** Expected capacity */
  expectedItems: number;
  /** Raw filter data */
  data: number[];
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a BloomFilterRevocation with the given configuration.
 */
export function createBloomFilterRevocation(
  config?: BloomFilterConfig,
): BloomFilterRevocation {
  return new BloomFilterRevocation(config);
}
