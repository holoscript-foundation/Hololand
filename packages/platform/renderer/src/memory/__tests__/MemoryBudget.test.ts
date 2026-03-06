import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryBudgetManager } from '../MemoryBudgetManager';
import { GaussianBudgetPool } from '../GaussianBudgetPool';
import { KVCacheBudgetPool } from '../KVCacheBudgetPool';
import { ModelWeightPool } from '../ModelWeightPool';

describe('MemoryBudgetManager', () => {
  let mgr: MemoryBudgetManager;
  beforeEach(() => { mgr = new MemoryBudgetManager({ totalBudgetBytes: 1000 }); });

  it('allocates within pool budget', () => {
    expect(mgr.allocate('gaussian', 100)).toBe(true);
  });

  it('rejects over-budget allocations', () => {
    expect(mgr.allocate('gaussian', 500)).toBe(false); // 40% of 1000 = 400
  });

  it('releases memory', () => {
    mgr.allocate('gaussian', 100);
    mgr.release('gaussian', 100);
    expect(mgr.getTotalUsed()).toBe(0);
  });

  it('reports metrics', () => {
    mgr.allocate('gaussian', 100);
    const metrics = mgr.getMetrics();
    expect(metrics.totalUsed).toBe(100);
    expect(metrics.pools.length).toBe(3);
  });

  it('detects memory pressure', () => {
    mgr.allocate('gaussian', 300);
    mgr.allocate('kvCache', 200);
    mgr.allocate('modelWeights', 250);
    expect(mgr.isUnderPressure()).toBe(true);
  });
});

describe('GaussianBudgetPool', () => {
  let pool: GaussianBudgetPool;
  beforeEach(() => { pool = new GaussianBudgetPool(64_000); }); // 1000 splats

  it('allocates splats', () => {
    expect(pool.allocate('scene1', 500)).toBe(true);
    expect(pool.getAllocationCount()).toBe(1);
  });

  it('rejects over-budget', () => {
    expect(pool.allocate('scene1', 500)).toBe(true);
    expect(pool.allocate('scene2', 600)).toBe(false);
  });

  it('reports remaining splat capacity', () => {
    pool.allocate('scene1', 500);
    expect(pool.getMaxSplatsRemaining()).toBe(500);
  });
});

describe('KVCacheBudgetPool', () => {
  let pool: KVCacheBudgetPool;
  beforeEach(() => { pool = new KVCacheBudgetPool(100 * 1024 * 1024); }); // 100MB

  it('allocates KV cache', () => {
    expect(pool.allocate('agent1', 512, 8, 32, 12)).toBe(true);
  });

  it('reports max sequence length', () => {
    const maxSeq = pool.getMaxSequenceLength(8, 32, 12);
    expect(maxSeq).toBeGreaterThan(0);
  });
});

describe('ModelWeightPool', () => {
  let pool: ModelWeightPool;
  beforeEach(() => { pool = new ModelWeightPool(500 * 1024 * 1024); }); // 500MB

  it('allocates model weights', () => {
    expect(pool.allocate('model1', 200 * 1024 * 1024, 'int4')).toBe(true);
  });

  it('evicts LRU model', () => {
    pool.allocate('old', 100 * 1024 * 1024);
    pool.allocate('new', 100 * 1024 * 1024);
    pool.touch('new');
    const evicted = pool.evictLRU();
    expect(evicted).toBe('old');
  });
});
