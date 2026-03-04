/**
 * @vitest-environment jsdom
 */

/**
 * Tests for BloomFilterRevocation
 *
 * Validates the Bloom filter implementation:
 * - O(1) add/check operations
 * - Zero false negatives guarantee
 * - False positive rate within configured bounds
 * - Counting mode (add + remove)
 * - Standard (non-counting) mode
 * - Serialization and merge (for gossip protocol)
 * - Metrics and query API
 * - Performance: render-loop safe (<0.01ms per check)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  BloomFilterRevocation,
  createBloomFilterRevocation,
  type BloomFilterConfig,
  type BloomFilterSnapshot,
} from '../BloomFilterRevocation';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createFilter(overrides?: Partial<BloomFilterConfig>): BloomFilterRevocation {
  return new BloomFilterRevocation({
    expectedItems: 1024,
    falsePositiveRate: 0.01,
    counting: true,
    ...overrides,
  });
}

function generateAgentIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `agent-${i.toString().padStart(6, '0')}`);
}

// =============================================================================
// TESTS
// =============================================================================

describe('BloomFilterRevocation', () => {
  let filter: BloomFilterRevocation;

  beforeEach(() => {
    filter = createFilter();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const f = new BloomFilterRevocation();
      expect(f.getItemCount()).toBe(0);
      expect(f.getBitCount()).toBeGreaterThan(0);
      expect(f.getHashCount()).toBeGreaterThan(0);
    });

    it('should initialize with custom configuration', () => {
      const f = createFilter({ expectedItems: 500, falsePositiveRate: 0.001 });
      expect(f.getBitCount()).toBeGreaterThan(0);
      // With lower FPR, we need more bits
      const defaultFilter = createFilter({ expectedItems: 500, falsePositiveRate: 0.01 });
      expect(f.getBitCount()).toBeGreaterThan(defaultFilter.getBitCount());
    });

    it('should use factory function', () => {
      const f = createBloomFilterRevocation({ expectedItems: 100 });
      expect(f).toBeInstanceOf(BloomFilterRevocation);
      expect(f.getItemCount()).toBe(0);
    });

    it('should calculate optimal hash count', () => {
      // Optimal k = (m/n) * ln(2) ≈ 7 for 1% FPR
      const f = createFilter({ expectedItems: 1000, falsePositiveRate: 0.01 });
      expect(f.getHashCount()).toBeGreaterThanOrEqual(4);
      expect(f.getHashCount()).toBeLessThanOrEqual(10);
    });

    it('should handle edge case: 1 expected item', () => {
      const f = createFilter({ expectedItems: 1, falsePositiveRate: 0.01 });
      expect(f.getBitCount()).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CORE: ADD + CHECK
  // ─────────────────────────────────────────────────────────────────────────

  describe('add and mightBeRevoked', () => {
    it('should detect added items (zero false negatives)', () => {
      filter.add('agent-123');
      expect(filter.mightBeRevoked('agent-123')).toBe(true);
    });

    it('should not detect items that were never added', () => {
      // This may occasionally give false positives, but for a single
      // query the probability should be very low
      filter.add('agent-123');
      // With 0 items except agent-123, most random queries return false
      expect(filter.mightBeRevoked('completely-different-agent')).toBe(false);
    });

    it('should guarantee zero false negatives for multiple items', () => {
      const agents = generateAgentIds(100);

      for (const id of agents) {
        filter.add(id);
      }

      // EVERY added item must return true (zero false negatives)
      for (const id of agents) {
        expect(filter.mightBeRevoked(id)).toBe(true);
      }
    });

    it('should track item count', () => {
      expect(filter.getItemCount()).toBe(0);

      filter.add('a');
      expect(filter.getItemCount()).toBe(1);

      filter.add('b');
      expect(filter.getItemCount()).toBe(2);

      filter.add('c');
      expect(filter.getItemCount()).toBe(3);
    });

    it('should handle empty string', () => {
      filter.add('');
      expect(filter.mightBeRevoked('')).toBe(true);
    });

    it('should handle very long agent IDs', () => {
      const longId = 'a'.repeat(1000);
      filter.add(longId);
      expect(filter.mightBeRevoked(longId)).toBe(true);
    });

    it('should handle special characters in agent IDs', () => {
      const specialIds = [
        'agent/with/slashes',
        'agent@with@symbols',
        'agent-with-dashes',
        'agent_with_underscores',
        'agent.with.dots',
        'agent with spaces',
        '\u00E9\u00E8\u00EA', // Unicode accented characters
      ];

      for (const id of specialIds) {
        filter.add(id);
        expect(filter.mightBeRevoked(id)).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FALSE POSITIVE RATE
  // ─────────────────────────────────────────────────────────────────────────

  describe('false positive rate', () => {
    it('should maintain false positive rate within 5x of target', () => {
      // Add expectedItems number of items
      const f = createFilter({ expectedItems: 1000, falsePositiveRate: 0.01 });
      const added = generateAgentIds(1000);

      for (const id of added) {
        f.add(id);
      }

      // Test 10000 items that were NOT added
      let falsePositives = 0;
      const testCount = 10000;
      for (let i = 0; i < testCount; i++) {
        if (f.mightBeRevoked(`not-added-${i}`)) {
          falsePositives++;
        }
      }

      const actualFpr = falsePositives / testCount;
      // Allow 5x margin for statistical variation
      // Target is 1%, allow up to 5%
      expect(actualFpr).toBeLessThan(0.05);
    });

    it('should estimate false positive rate accurately', () => {
      const f = createFilter({ expectedItems: 500, falsePositiveRate: 0.01 });
      const agents = generateAgentIds(500);

      for (const id of agents) {
        f.add(id);
      }

      const estimated = f.getEstimatedFalsePositiveRate();
      // Should be roughly around the target
      expect(estimated).toBeGreaterThan(0);
      expect(estimated).toBeLessThan(0.1); // Within an order of magnitude
    });

    it('should report 0 FPR when empty', () => {
      expect(filter.getEstimatedFalsePositiveRate()).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // COUNTING MODE (REMOVAL)
  // ─────────────────────────────────────────────────────────────────────────

  describe('counting mode (removal)', () => {
    it('should support removal in counting mode', () => {
      filter.add('agent-123');
      expect(filter.mightBeRevoked('agent-123')).toBe(true);

      const removed = filter.remove('agent-123');
      expect(removed).toBe(true);
      expect(filter.mightBeRevoked('agent-123')).toBe(false);
    });

    it('should track item count after removal', () => {
      filter.add('a');
      filter.add('b');
      expect(filter.getItemCount()).toBe(2);

      filter.remove('a');
      expect(filter.getItemCount()).toBe(1);
    });

    it('should not go below 0 item count', () => {
      filter.add('a');
      filter.remove('a');
      filter.remove('a'); // Extra remove
      expect(filter.getItemCount()).toBe(0);
    });

    it('should handle add after remove (re-revocation)', () => {
      filter.add('agent-123');
      filter.remove('agent-123');
      expect(filter.mightBeRevoked('agent-123')).toBe(false);

      filter.add('agent-123');
      expect(filter.mightBeRevoked('agent-123')).toBe(true);
    });

    it('should not support removal in standard mode', () => {
      const standardFilter = createFilter({ counting: false });
      standardFilter.add('agent-123');

      const removed = standardFilter.remove('agent-123');
      expect(removed).toBe(false);
      // Item is still "in" the filter since standard mode can't remove
      expect(standardFilter.mightBeRevoked('agent-123')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // STANDARD (NON-COUNTING) MODE
  // ─────────────────────────────────────────────────────────────────────────

  describe('standard mode', () => {
    it('should work in standard (non-counting) mode', () => {
      const f = createFilter({ counting: false });
      f.add('agent-1');
      f.add('agent-2');

      expect(f.mightBeRevoked('agent-1')).toBe(true);
      expect(f.mightBeRevoked('agent-2')).toBe(true);
    });

    it('should use less memory in standard mode', () => {
      const counting = createFilter({ counting: true, expectedItems: 1000 });
      const standard = createFilter({ counting: false, expectedItems: 1000 });

      const countingMetrics = counting.getMetrics();
      const standardMetrics = standard.getMetrics();

      // Standard mode should use ~8x less memory (1 bit vs 1 byte per cell)
      expect(standardMetrics.memoryBytes).toBeLessThan(countingMetrics.memoryBytes);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CLEAR
  // ─────────────────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('should clear all entries', () => {
      filter.add('agent-1');
      filter.add('agent-2');
      filter.add('agent-3');

      filter.clear();

      expect(filter.getItemCount()).toBe(0);
      expect(filter.mightBeRevoked('agent-1')).toBe(false);
      expect(filter.mightBeRevoked('agent-2')).toBe(false);
      expect(filter.mightBeRevoked('agent-3')).toBe(false);
    });

    it('should allow re-adding after clear', () => {
      filter.add('agent-1');
      filter.clear();

      filter.add('agent-1');
      expect(filter.mightBeRevoked('agent-1')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SERIALIZATION & MERGE (for gossip protocol)
  // ─────────────────────────────────────────────────────────────────────────

  describe('serialization and merge', () => {
    it('should serialize filter state', () => {
      filter.add('agent-1');
      filter.add('agent-2');

      const snapshot = filter.serialize();

      expect(snapshot.m).toBe(filter.getBitCount());
      expect(snapshot.k).toBe(filter.getHashCount());
      expect(snapshot.counting).toBe(true);
      expect(snapshot.itemCount).toBe(2);
      expect(snapshot.data.length).toBe(filter.getBitCount());
    });

    it('should merge compatible filters (union)', () => {
      // Create two filters with same parameters
      const filter1 = createFilter({ expectedItems: 100, falsePositiveRate: 0.01 });
      const filter2 = createFilter({ expectedItems: 100, falsePositiveRate: 0.01 });

      filter1.add('agent-1');
      filter1.add('agent-2');

      filter2.add('agent-3');
      filter2.add('agent-4');

      // Merge filter2 into filter1
      const snapshot = filter2.serialize();
      const success = filter1.merge(snapshot);

      expect(success).toBe(true);
      // filter1 should now contain all 4 agents
      expect(filter1.mightBeRevoked('agent-1')).toBe(true);
      expect(filter1.mightBeRevoked('agent-2')).toBe(true);
      expect(filter1.mightBeRevoked('agent-3')).toBe(true);
      expect(filter1.mightBeRevoked('agent-4')).toBe(true);
    });

    it('should reject merge of incompatible filters', () => {
      const small = createFilter({ expectedItems: 50, falsePositiveRate: 0.01 });
      const large = createFilter({ expectedItems: 5000, falsePositiveRate: 0.01 });

      small.add('agent-1');
      const snapshot = small.serialize();

      const success = large.merge(snapshot);
      expect(success).toBe(false);
    });

    it('should preserve entries after merge', () => {
      const filter1 = createFilter({ expectedItems: 100 });
      const filter2 = createFilter({ expectedItems: 100 });

      filter1.add('shared-agent');
      filter2.add('shared-agent');

      const snapshot = filter2.serialize();
      filter1.merge(snapshot);

      // Both added the same agent: should still be present
      expect(filter1.mightBeRevoked('shared-agent')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // METRICS
  // ─────────────────────────────────────────────────────────────────────────

  describe('metrics', () => {
    it('should provide comprehensive metrics', () => {
      filter.add('agent-1');
      filter.add('agent-2');

      const metrics = filter.getMetrics();

      expect(metrics.bitCount).toBeGreaterThan(0);
      expect(metrics.hashCount).toBeGreaterThan(0);
      expect(metrics.itemCount).toBe(2);
      expect(metrics.estimatedFalsePositiveRate).toBeGreaterThan(0);
      expect(metrics.targetFalsePositiveRate).toBe(0.01);
      expect(metrics.expectedItems).toBe(1024);
      expect(metrics.fillRatio).toBeGreaterThan(0);
      expect(metrics.fillRatio).toBeLessThanOrEqual(1);
      expect(metrics.counting).toBe(true);
      expect(metrics.memoryBytes).toBeGreaterThan(0);
    });

    it('should report fill ratio', () => {
      // Empty filter should have 0 fill ratio
      expect(filter.getFillRatio()).toBe(0);

      // Add some items
      for (let i = 0; i < 100; i++) {
        filter.add(`agent-${i}`);
      }

      const fillRatio = filter.getFillRatio();
      expect(fillRatio).toBeGreaterThan(0);
      expect(fillRatio).toBeLessThanOrEqual(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PERFORMANCE
  // ─────────────────────────────────────────────────────────────────────────

  describe('performance', () => {
    it('mightBeRevoked should be render-loop safe (<1ms for 1000 checks)', () => {
      // Add 500 items
      for (let i = 0; i < 500; i++) {
        filter.add(`agent-${i}`);
      }

      // Measure 1000 checks
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        filter.mightBeRevoked(`agent-${i % 500}`);
      }
      const duration = performance.now() - start;

      // 1000 checks should be well under 1ms (typically <0.1ms)
      expect(duration).toBeLessThan(5); // Generous bound for CI
    });

    it('add should be fast (<1ms for 100 adds)', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        filter.add(`perf-agent-${i}`);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5); // Generous bound for CI
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EDGE CASES
  // ─────────────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle adding the same item multiple times', () => {
      filter.add('agent-1');
      filter.add('agent-1');
      filter.add('agent-1');

      expect(filter.mightBeRevoked('agent-1')).toBe(true);
      expect(filter.getItemCount()).toBe(3); // Counts each add

      // In counting mode, need to remove 3 times to fully remove
      filter.remove('agent-1');
      expect(filter.mightBeRevoked('agent-1')).toBe(true); // Still present (count = 2)
      filter.remove('agent-1');
      expect(filter.mightBeRevoked('agent-1')).toBe(true); // Still present (count = 1)
      filter.remove('agent-1');
      expect(filter.mightBeRevoked('agent-1')).toBe(false); // Now removed
    });

    it('should handle large number of items', () => {
      const largeFilt = createFilter({ expectedItems: 10000, falsePositiveRate: 0.01 });
      const agents = generateAgentIds(5000);

      for (const id of agents) {
        largeFilt.add(id);
      }

      // Zero false negatives
      for (const id of agents) {
        expect(largeFilt.mightBeRevoked(id)).toBe(true);
      }
    });

    it('should work with very low false positive rate', () => {
      const strictFilter = createFilter({
        expectedItems: 100,
        falsePositiveRate: 0.0001, // 0.01%
      });

      // Should have more hash functions and bits for stricter rate
      expect(strictFilter.getHashCount()).toBeGreaterThan(filter.getHashCount());
      expect(strictFilter.getBitCount()).toBeGreaterThan(
        new BloomFilterRevocation({ expectedItems: 100, falsePositiveRate: 0.1 }).getBitCount(),
      );
    });
  });
});
