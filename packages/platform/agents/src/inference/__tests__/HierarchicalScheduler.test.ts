/**
 * Tests for HierarchicalScheduler, InferenceCache, ReasoningTier, RenderBridge
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InferenceCache } from '../InferenceCache';
import { RenderBridge } from '../RenderBridge';
import { HierarchicalScheduler } from '../HierarchicalScheduler';
import { ReasoningTierManager, ReasoningTierLevel, type InferenceResult } from '../ReasoningTier';

// =============================================================================
// Helpers
// =============================================================================

function makeResult(agentId: string, tier: ReasoningTierLevel): InferenceResult {
  return {
    taskId: `task_${agentId}_${tier}`,
    agentId,
    tier,
    result: {
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      animationBlend: 0.5,
      emotionState: 'happy',
    },
    computeTimeMs: 5,
    timestamp: Date.now(),
    fromCache: false,
  };
}

// =============================================================================
// InferenceCache
// =============================================================================

describe('InferenceCache', () => {
  let cache: InferenceCache;

  beforeEach(() => {
    cache = new InferenceCache({ maxEntriesPerAgentPerTier: 4 });
  });

  it('stores and retrieves results', () => {
    const result = makeResult('agent1', ReasoningTierLevel.Spatial);
    cache.put('agent1', ReasoningTierLevel.Spatial, 'key1', result);
    const retrieved = cache.get('agent1', ReasoningTierLevel.Spatial, 'key1');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.agentId).toBe('agent1');
    expect(retrieved!.fromCache).toBe(true);
  });

  it('returns null for missing entries', () => {
    expect(cache.get('agent1', ReasoningTierLevel.Spatial, 'key1')).toBeNull();
  });

  it('evicts LRU when at capacity', () => {
    for (let i = 0; i < 5; i++) {
      cache.put('agent1', ReasoningTierLevel.Spatial, `key${i}`, makeResult('agent1', ReasoningTierLevel.Spatial));
    }
    // key0 should have been evicted
    expect(cache.get('agent1', ReasoningTierLevel.Spatial, 'key0')).toBeNull();
    expect(cache.get('agent1', ReasoningTierLevel.Spatial, 'key4')).not.toBeNull();
  });

  it('tracks hit/miss statistics', () => {
    cache.put('agent1', ReasoningTierLevel.Spatial, 'key1', makeResult('agent1', ReasoningTierLevel.Spatial));
    cache.get('agent1', ReasoningTierLevel.Spatial, 'key1'); // hit
    cache.get('agent1', ReasoningTierLevel.Spatial, 'missing'); // miss
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });

  it('invalidates by agent', () => {
    cache.put('agent1', ReasoningTierLevel.Spatial, 'key1', makeResult('agent1', ReasoningTierLevel.Spatial));
    cache.invalidateAgent('agent1');
    expect(cache.get('agent1', ReasoningTierLevel.Spatial, 'key1')).toBeNull();
  });

  it('invalidates by tier', () => {
    cache.put('agent1', ReasoningTierLevel.Spatial, 'key1', makeResult('agent1', ReasoningTierLevel.Spatial));
    cache.put('agent1', ReasoningTierLevel.Reactive, 'key2', makeResult('agent1', ReasoningTierLevel.Reactive));
    cache.invalidateTier('agent1', ReasoningTierLevel.Spatial);
    expect(cache.get('agent1', ReasoningTierLevel.Spatial, 'key1')).toBeNull();
    expect(cache.get('agent1', ReasoningTierLevel.Reactive, 'key2')).not.toBeNull();
  });

  it('reports size correctly', () => {
    cache.put('a1', ReasoningTierLevel.Spatial, 'k1', makeResult('a1', ReasoningTierLevel.Spatial));
    cache.put('a1', ReasoningTierLevel.Reactive, 'k2', makeResult('a1', ReasoningTierLevel.Reactive));
    expect(cache.size()).toBe(2);
  });

  it('clears all data', () => {
    cache.put('a1', ReasoningTierLevel.Spatial, 'k1', makeResult('a1', ReasoningTierLevel.Spatial));
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});

// =============================================================================
// ReasoningTierManager
// =============================================================================

describe('ReasoningTierManager', () => {
  let manager: ReasoningTierManager;

  beforeEach(() => {
    manager = new ReasoningTierManager();
  });

  it('returns config for each tier', () => {
    const spatial = manager.getConfig(ReasoningTierLevel.Spatial);
    expect(spatial.name).toBe('Spatial');
    expect(spatial.minFrequencyHz).toBe(1);
    expect(spatial.maxFrequencyHz).toBe(5);
  });

  it('computes target interval', () => {
    // Spatial: avg 3Hz -> ~333ms
    const interval = manager.getTargetIntervalMs(ReasoningTierLevel.Spatial);
    expect(interval).toBeCloseTo(333.3, 0);
  });

  it('creates tasks with correct deadlines', () => {
    const task = manager.createTask('agent1', ReasoningTierLevel.Spatial, {}, () => null);
    expect(task.agentId).toBe('agent1');
    expect(task.tier).toBe(ReasoningTierLevel.Spatial);
    expect(task.deadline).toBeGreaterThan(task.createdAt);
  });

  it('checks deadline feasibility', () => {
    const task = manager.createTask('agent1', ReasoningTierLevel.Spatial, {}, () => null);
    expect(manager.canMeetDeadline(task, task.createdAt)).toBe(true);
    expect(manager.canMeetDeadline(task, task.deadline + 1000)).toBe(false);
  });
});

// =============================================================================
// RenderBridge
// =============================================================================

describe('RenderBridge', () => {
  let cache: InferenceCache;
  let bridge: RenderBridge;

  beforeEach(() => {
    cache = new InferenceCache();
    bridge = new RenderBridge(cache, { staleThresholdMs: 500, maxAgents: 10 });
  });

  it('returns null for unknown agents', () => {
    expect(bridge.getAgentState('unknown')).toBeNull();
  });

  it('accepts and returns agent state from inference results', () => {
    const result = makeResult('agent1', ReasoningTierLevel.Spatial);
    bridge.pushInferenceResult('agent1', result);
    const state = bridge.getAgentState('agent1');
    expect(state).not.toBeNull();
    expect(state!.agentId).toBe('agent1');
    expect(state!.emotionState).toBe('happy');
  });

  it('interpolates between previous and current state', () => {
    const result1 = makeResult('agent1', ReasoningTierLevel.Spatial);
    (result1.result as any).position = { x: 0, y: 0, z: 0 };
    bridge.pushInferenceResult('agent1', result1);

    const result2 = makeResult('agent1', ReasoningTierLevel.Spatial);
    (result2.result as any).position = { x: 10, y: 0, z: 0 };
    bridge.pushInferenceResult('agent1', result2);

    const state = bridge.getAgentState('agent1', Date.now() + 100);
    expect(state).not.toBeNull();
    // Should be interpolating between 0 and 10
    expect(state!.position.x).toBeGreaterThanOrEqual(0);
  });

  it('detects stale state', () => {
    bridge.pushInferenceResult('agent1', makeResult('agent1', ReasoningTierLevel.Spatial));
    expect(bridge.isStale('agent1', Date.now())).toBe(false);
    expect(bridge.isStale('agent1', Date.now() + 1000)).toBe(true);
  });

  it('enforces max agents limit', () => {
    for (let i = 0; i < 12; i++) {
      bridge.pushInferenceResult(`agent${i}`, makeResult(`agent${i}`, ReasoningTierLevel.Spatial));
    }
    expect(bridge.getAgentCount()).toBeLessThanOrEqual(10);
  });

  it('removes agents', () => {
    bridge.pushInferenceResult('agent1', makeResult('agent1', ReasoningTierLevel.Spatial));
    bridge.removeAgent('agent1');
    expect(bridge.getAgentState('agent1')).toBeNull();
  });
});

// =============================================================================
// HierarchicalScheduler
// =============================================================================

describe('HierarchicalScheduler', () => {
  let cache: InferenceCache;
  let bridge: RenderBridge;
  let scheduler: HierarchicalScheduler;

  beforeEach(() => {
    cache = new InferenceCache();
    bridge = new RenderBridge(cache);
    scheduler = new HierarchicalScheduler(cache, bridge, {
      totalComputeBudgetMs: 100,
      maxQueueSizePerTier: 8,
    });
  });

  it('schedules and executes tasks', async () => {
    const compute = vi.fn().mockReturnValue({
      position: { x: 1, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });

    scheduler.scheduleTask('agent1', ReasoningTierLevel.Spatial, 'spatial', {}, compute);
    const results = await scheduler.processTick();
    expect(results.length).toBe(1);
    expect(compute).toHaveBeenCalled();
  });

  it('caches results from cacheable tiers', async () => {
    scheduler.scheduleTask('agent1', ReasoningTierLevel.Spatial, 'spatial', {}, () => ({
      position: { x: 1, y: 0, z: 0 },
    }));
    await scheduler.processTick();

    // Second schedule should use cache
    const didUseCache = scheduler.scheduleTask('agent1', ReasoningTierLevel.Spatial, 'agent1_1', 'spatial', () => ({
      position: { x: 2, y: 0, z: 0 },
    }));
    expect(didUseCache).toBe(true);
  });

  it('drops tasks when queue is full', () => {
    for (let i = 0; i < 10; i++) {
      scheduler.scheduleTask(`agent${i}`, ReasoningTierLevel.Spatial, `key${i}`, {}, () => null);
    }
    const metrics = scheduler.getMetrics();
    expect(metrics.tasksDropped).toBeGreaterThan(0);
  });

  it('reports queue depths', () => {
    scheduler.scheduleTask('agent1', ReasoningTierLevel.Spatial, 'key1', {}, () => null);
    scheduler.scheduleTask('agent2', ReasoningTierLevel.Reactive, 'key2', {}, () => null);
    const depths = scheduler.getQueueDepths();
    expect(depths[ReasoningTierLevel.Spatial]).toBe(1);
    expect(depths[ReasoningTierLevel.Reactive]).toBe(1);
  });

  it('pushes results to render bridge', async () => {
    scheduler.scheduleTask('agent1', ReasoningTierLevel.Spatial, 'spatial', {}, () => ({
      position: { x: 5, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      emotionState: 'excited',
    }));
    await scheduler.processTick();

    const state = bridge.getAgentState('agent1');
    expect(state).not.toBeNull();
  });

  it('reports metrics correctly', async () => {
    scheduler.scheduleTask('agent1', ReasoningTierLevel.Spatial, 'key1', {}, () => ({}));
    await scheduler.processTick();
    const metrics = scheduler.getMetrics();
    expect(metrics.tasksScheduled).toBe(1);
    expect(metrics.tasksCompleted).toBe(1);
  });
});
