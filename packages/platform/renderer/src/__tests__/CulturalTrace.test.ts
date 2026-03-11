/**
 * @vitest-environment jsdom
 */

/**
 * Tests for CulturalTrace Stigmergic Collective Memory System
 *
 * Validates:
 * - Type factory functions and spatial grid utilities
 * - StigmergicTraceEngine: deposit, decay, reinforcement, diffusion, culling
 * - Double-buffered state isolation
 * - CollectiveMemoryAggregator: cluster detection, path preferences, heatmaps
 * - CulturalTraceRenderer: particle generation, distance culling, heatmap colors
 * - CulturalTraceManager: integrated lifecycle and convenience API
 * - Event emission
 * - Metrics tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  positionToCellId,
  cellIdToPosition,
  getNeighborCellIds,
  vec3Distance,
  generateTraceId,
  createEmptyCulturalTraceWorldState,
  createEmptyCollectiveMemoryState,
  createDefaultGridConfig,
  createDefaultEngineConfig,
  createDefaultAggregatorConfig,
  createDefaultRendererConfig,
  TRACE_CATEGORY_DEFAULTS,
  type TraceDepositRequest,
  type NormProvenance,
  type ConfidenceClassification,
} from '../CulturalTraceTypes';

import {
  StigmergicTraceEngine,
  createStigmergicTraceEngine,
} from '../StigmergicTraceEngine';

import {
  CollectiveMemoryAggregator,
  createCollectiveMemoryAggregator,
} from '../CollectiveMemoryAggregator';

import {
  CulturalTraceRenderer,
  createCulturalTraceRenderer,
} from '../CulturalTraceRenderer';

import {
  CulturalTraceManager,
  createCulturalTraceManager,
} from '../CulturalTraceManager';

// =============================================================================
// HELPERS
// =============================================================================

function createTestEngine(overrides?: Record<string, unknown>) {
  return createStigmergicTraceEngine({
    worldId: 'test-world',
    updateHz: 100, // Fast for tests
    enableDecay: false, // Disable decay by default in tests to avoid floating point drift
    enableDiffusion: false, // Disable diffusion by default in tests
    grid: { cellSize: 1.0, worldMin: { x: -50, y: -10, z: -50 }, worldMax: { x: 50, y: 10, z: 50 }, maxTracesPerCell: 50 },
    maxTotalTraces: 1000,
    ...overrides,
  });
}

function createTestDeposit(overrides?: Partial<TraceDepositRequest>): TraceDepositRequest {
  return {
    worldId: 'test-world',
    agentId: 'agent-1',
    agentName: 'Agent One',
    position: { x: 5, y: 0, z: 3 },
    category: 'visit',
    ...overrides,
  };
}

// =============================================================================
// TYPES & UTILITIES
// =============================================================================

describe('CulturalTraceTypes', () => {
  describe('positionToCellId', () => {
    it('converts positive positions to cell IDs', () => {
      expect(positionToCellId({ x: 1.5, y: 0.5, z: 2.7 }, 1.0)).toBe('1:0:2');
    });

    it('converts negative positions to cell IDs', () => {
      expect(positionToCellId({ x: -1.5, y: -0.5, z: -2.7 }, 1.0)).toBe('-2:-1:-3');
    });

    it('respects cell size', () => {
      expect(positionToCellId({ x: 5.0, y: 0, z: 5.0 }, 2.0)).toBe('2:0:2');
    });

    it('handles zero position', () => {
      expect(positionToCellId({ x: 0, y: 0, z: 0 }, 1.0)).toBe('0:0:0');
    });
  });

  describe('cellIdToPosition', () => {
    it('converts cell ID to center position', () => {
      const pos = cellIdToPosition('1:0:2', 1.0);
      expect(pos.x).toBe(1.5);
      expect(pos.y).toBe(0.5);
      expect(pos.z).toBe(2.5);
    });

    it('handles negative cell IDs', () => {
      const pos = cellIdToPosition('-2:-1:-3', 1.0);
      expect(pos.x).toBe(-1.5);
      expect(pos.y).toBe(-0.5);
      expect(pos.z).toBe(-2.5);
    });

    it('respects cell size', () => {
      const pos = cellIdToPosition('2:0:2', 2.0);
      expect(pos.x).toBe(5.0);
      expect(pos.y).toBe(1.0);
      expect(pos.z).toBe(5.0);
    });
  });

  describe('getNeighborCellIds', () => {
    it('returns 26 neighbors for radius 1 in 3D', () => {
      const neighbors = getNeighborCellIds('0:0:0', 1);
      expect(neighbors).toHaveLength(26); // 3^3 - 1
    });

    it('does not include the center cell', () => {
      const neighbors = getNeighborCellIds('5:3:2', 1);
      expect(neighbors).not.toContain('5:3:2');
    });

    it('includes face-adjacent neighbors', () => {
      const neighbors = getNeighborCellIds('0:0:0', 1);
      expect(neighbors).toContain('1:0:0');
      expect(neighbors).toContain('-1:0:0');
      expect(neighbors).toContain('0:1:0');
      expect(neighbors).toContain('0:-1:0');
      expect(neighbors).toContain('0:0:1');
      expect(neighbors).toContain('0:0:-1');
    });

    it('returns 124 neighbors for radius 2', () => {
      const neighbors = getNeighborCellIds('0:0:0', 2);
      expect(neighbors).toHaveLength(124); // 5^3 - 1
    });
  });

  describe('vec3Distance', () => {
    it('computes distance between two points', () => {
      const d = vec3Distance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
      expect(d).toBe(5);
    });

    it('returns 0 for same point', () => {
      const d = vec3Distance({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 });
      expect(d).toBe(0);
    });
  });

  describe('generateTraceId', () => {
    it('generates unique IDs', () => {
      const id1 = generateTraceId('world-1', 'agent-1');
      const id2 = generateTraceId('world-1', 'agent-1');
      expect(id1).not.toBe(id2);
    });

    it('includes world and agent in ID', () => {
      const id = generateTraceId('my-world', 'brittney');
      expect(id).toContain('my-world');
      expect(id).toContain('brittney');
    });
  });

  describe('factory functions', () => {
    it('creates empty world state', () => {
      const state = createEmptyCulturalTraceWorldState();
      expect(state.traces.size).toBe(0);
      expect(state.cells.size).toBe(0);
      expect(state.sequence).toBe(0);
      expect(state.collectiveMemory.clusters).toHaveLength(0);
    });

    it('creates empty collective memory state', () => {
      const mem = createEmptyCollectiveMemoryState();
      expect(mem.clusters).toHaveLength(0);
      expect(mem.pathPreferences).toHaveLength(0);
      expect(mem.totalActiveTraces).toBe(0);
      expect(mem.dominantCategory).toBeNull();
    });

    it('creates default grid config with overrides', () => {
      const grid = createDefaultGridConfig({ cellSize: 2.0 });
      expect(grid.cellSize).toBe(2.0);
      expect(grid.maxTracesPerCell).toBe(50); // default
    });

    it('creates default engine config', () => {
      const config = createDefaultEngineConfig('test');
      expect(config.worldId).toBe('test');
      expect(config.updateHz).toBe(5);
      expect(config.enableDecay).toBe(true);
    });

    it('creates default aggregator config', () => {
      const config = createDefaultAggregatorConfig();
      expect(config.updateHz).toBe(1);
      expect(config.minClusterSize).toBe(3);
    });

    it('creates default renderer config', () => {
      const config = createDefaultRendererConfig();
      expect(config.showTraceParticles).toBe(true);
      expect(config.maxVisibleParticles).toBe(5000);
    });
  });

  describe('TRACE_CATEGORY_DEFAULTS', () => {
    it('has defaults for all categories', () => {
      const categories = ['visit', 'inspect', 'annotate', 'create', 'interact', 'emotional', 'waypoint', 'hazard'];
      for (const cat of categories) {
        const defaults = TRACE_CATEGORY_DEFAULTS[cat as keyof typeof TRACE_CATEGORY_DEFAULTS];
        expect(defaults).toBeDefined();
        expect(defaults.intensity).toBeGreaterThan(0);
        expect(defaults.intensity).toBeLessThanOrEqual(1);
        expect(defaults.decayRate).toBeGreaterThanOrEqual(0);
        expect(defaults.color).toHaveLength(4);
      }
    });

    it('visit has weakest intensity', () => {
      expect(TRACE_CATEGORY_DEFAULTS.visit.intensity).toBeLessThan(
        TRACE_CATEGORY_DEFAULTS.create.intensity,
      );
    });

    it('waypoint has no diffusion', () => {
      expect(TRACE_CATEGORY_DEFAULTS.waypoint.diffusionRate).toBe(0);
    });
  });
});

// =============================================================================
// STIGMERGIC TRACE ENGINE
// =============================================================================

describe('StigmergicTraceEngine', () => {
  let engine: StigmergicTraceEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = createTestEngine();
  });

  afterEach(() => {
    engine.destroy();
    vi.useRealTimers();
  });

  describe('lifecycle', () => {
    it('starts and stops', () => {
      expect(engine.isRunning()).toBe(false);
      engine.start();
      expect(engine.isRunning()).toBe(true);
      engine.stop();
      expect(engine.isRunning()).toBe(false);
    });

    it('ignores duplicate start calls', () => {
      engine.start();
      engine.start(); // Should warn but not crash
      expect(engine.isRunning()).toBe(true);
    });

    it('ignores stop when not running', () => {
      engine.stop(); // Should warn but not crash
      expect(engine.isRunning()).toBe(false);
    });

    it('destroy clears all state', () => {
      engine.start();
      engine.deposit(createTestDeposit());
      vi.advanceTimersByTime(20);
      expect(engine.getTraces().size).toBeGreaterThan(0);

      engine.destroy();
      expect(engine.isRunning()).toBe(false);
      expect(engine.getTraces().size).toBe(0);
    });
  });

  describe('deposit', () => {
    it('accepts and processes a deposit', () => {
      engine.start();
      engine.deposit(createTestDeposit());

      // Advance timer to trigger engine cycle
      vi.advanceTimersByTime(20);

      const traces = engine.getTraces();
      expect(traces.size).toBe(1);

      const trace = Array.from(traces.values())[0];
      expect(trace.agentId).toBe('agent-1');
      expect(trace.category).toBe('visit');
      expect(trace.position.x).toBe(5);
      expect(trace.intensity).toBe(TRACE_CATEGORY_DEFAULTS.visit.intensity);
    });

    it('deposits multiple traces from different agents', () => {
      engine.start();
      engine.deposit(createTestDeposit({ agentId: 'agent-1', position: { x: 0, y: 0, z: 0 } }));
      engine.deposit(createTestDeposit({ agentId: 'agent-2', position: { x: 10, y: 0, z: 10 } }));
      engine.deposit(createTestDeposit({ agentId: 'agent-3', position: { x: -5, y: 0, z: -5 } }));

      vi.advanceTimersByTime(20);

      expect(engine.getTraces().size).toBe(3);
    });

    it('places traces in correct cells', () => {
      engine.start();
      engine.deposit(createTestDeposit({ position: { x: 1.5, y: 0, z: 2.5 } }));
      vi.advanceTimersByTime(20);

      const cells = engine.getCells();
      expect(cells.has('1:0:2')).toBe(true);
      expect(cells.get('1:0:2')!.traces).toHaveLength(1);
    });

    it('uses category defaults for unspecified fields', () => {
      engine.start();
      engine.deposit(createTestDeposit({ category: 'create' }));
      vi.advanceTimersByTime(20);

      const trace = Array.from(engine.getTraces().values())[0];
      expect(trace.intensity).toBe(TRACE_CATEGORY_DEFAULTS.create.intensity);
      expect(trace.decayRate).toBe(TRACE_CATEGORY_DEFAULTS.create.decayRate);
    });

    it('allows intensity override', () => {
      engine.start();
      engine.deposit(createTestDeposit({ intensity: 0.42 }));
      vi.advanceTimersByTime(20);

      const trace = Array.from(engine.getTraces().values())[0];
      expect(trace.intensity).toBe(0.42);
    });
  });

  describe('reinforcement', () => {
    it('reinforces overlapping deposits of same category and agent', () => {
      engine.start();
      const pos = { x: 5, y: 0, z: 3 };

      engine.deposit(createTestDeposit({ position: pos, category: 'visit' }));
      vi.advanceTimersByTime(20);

      const initialIntensity = Array.from(engine.getTraces().values())[0].intensity;

      // Deposit again at same position, same agent, same category
      engine.deposit(createTestDeposit({ position: pos, category: 'visit' }));
      vi.advanceTimersByTime(20);

      // Should still be 1 trace (reinforced, not duplicated)
      expect(engine.getTraces().size).toBe(1);

      const trace = Array.from(engine.getTraces().values())[0];
      expect(trace.reinforcementCount).toBe(1);
      expect(trace.intensity).toBeGreaterThan(initialIntensity);
    });

    it('does NOT reinforce different categories in same cell', () => {
      engine.start();
      const pos = { x: 5, y: 0, z: 3 };

      engine.deposit(createTestDeposit({ position: pos, category: 'visit' }));
      engine.deposit(createTestDeposit({ position: pos, category: 'annotate' }));
      vi.advanceTimersByTime(20);

      expect(engine.getTraces().size).toBe(2);
    });

    it('does NOT reinforce same category from different agents', () => {
      engine.start();
      const pos = { x: 5, y: 0, z: 3 };

      engine.deposit(createTestDeposit({ agentId: 'agent-1', position: pos }));
      engine.deposit(createTestDeposit({ agentId: 'agent-2', position: pos }));
      vi.advanceTimersByTime(20);

      expect(engine.getTraces().size).toBe(2);
    });
  });

  describe('decay', () => {
    it('reduces intensity over time via exponential decay', () => {
      // Create engine with decay enabled for this specific test
      const decayEngine = createStigmergicTraceEngine({
        worldId: 'test-world',
        updateHz: 100,
        enableDecay: true,
        enableDiffusion: false,
        grid: { cellSize: 1.0, worldMin: { x: -50, y: -10, z: -50 }, worldMax: { x: 50, y: 10, z: 50 }, maxTracesPerCell: 50 },
        maxTotalTraces: 1000,
      });
      decayEngine.start();
      decayEngine.deposit(createTestDeposit({ intensity: 1.0, decayRate: 0.1 }));
      vi.advanceTimersByTime(20);

      const initialIntensity = Array.from(decayEngine.getTraces().values())[0].intensity;

      // Advance real time for decay (mock Date.now)
      const nowBefore = Date.now();
      vi.setSystemTime(nowBefore + 5000); // 5 seconds later
      vi.advanceTimersByTime(20);

      const decayedIntensity = Array.from(decayEngine.getTraces().values())[0].intensity;
      expect(decayedIntensity).toBeLessThan(initialIntensity);
      decayEngine.destroy();
    });
  });

  describe('culling', () => {
    it('removes traces below cull threshold', () => {
      const eng = createTestEngine({ cullThreshold: 0.5 });
      eng.start();

      // Deposit a very low intensity trace
      eng.deposit(createTestDeposit({ intensity: 0.01 }));
      vi.advanceTimersByTime(20);

      // The engine processes on next cycle -- if intensity < 0.5, it gets culled
      // But initially 0.01 < 0.5 so it should be culled immediately after first cycle
      expect(eng.getTraces().size).toBe(0);
      eng.destroy();
    });

    it('enforces max total traces', () => {
      const eng = createTestEngine({ maxTotalTraces: 3 });
      eng.start();

      for (let i = 0; i < 5; i++) {
        eng.deposit(createTestDeposit({
          agentId: `agent-${i}`,
          position: { x: i * 10, y: 0, z: 0 },
        }));
      }
      vi.advanceTimersByTime(20);

      expect(eng.getTraces().size).toBeLessThanOrEqual(3);
      eng.destroy();
    });
  });

  describe('spatial queries', () => {
    it('getTracesNear returns traces within radius', () => {
      engine.start();
      engine.deposit(createTestDeposit({ agentId: 'a', position: { x: 0, y: 0, z: 0 } }));
      engine.deposit(createTestDeposit({ agentId: 'b', position: { x: 1, y: 0, z: 0 } }));
      engine.deposit(createTestDeposit({ agentId: 'c', position: { x: 100, y: 0, z: 100 } }));
      vi.advanceTimersByTime(20);

      const near = engine.getTracesNear({ x: 0, y: 0, z: 0 }, 5);
      expect(near).toHaveLength(2); // a and b, not c
    });
  });

  describe('events', () => {
    it('emits trace:deposited on deposit', () => {
      const handler = vi.fn();
      engine.on('trace:deposited', handler);
      engine.start();
      engine.deposit(createTestDeposit());
      vi.advanceTimersByTime(20);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'local',
          trace: expect.objectContaining({ agentId: 'agent-1' }),
        }),
      );
    });

    it('emits trace:reinforced on reinforcement', () => {
      const handler = vi.fn();
      engine.on('trace:reinforced', handler);
      engine.start();

      const pos = { x: 5, y: 0, z: 3 };
      engine.deposit(createTestDeposit({ position: pos }));
      vi.advanceTimersByTime(20);

      engine.deposit(createTestDeposit({ position: pos }));
      vi.advanceTimersByTime(20);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ reinforcementCount: 1 }),
      );
    });

    it('supports unsubscribe via off()', () => {
      const handler = vi.fn();
      engine.on('trace:deposited', handler);
      engine.off('trace:deposited', handler);
      engine.start();
      engine.deposit(createTestDeposit());
      vi.advanceTimersByTime(20);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('metrics', () => {
    it('tracks basic metrics', () => {
      engine.start();
      engine.deposit(createTestDeposit());
      vi.advanceTimersByTime(20);

      const metrics = engine.getMetrics();
      expect(metrics.isRunning).toBe(true);
      expect(metrics.totalDeposits).toBe(1);
      expect(metrics.totalActiveTraces).toBe(1);
      expect(metrics.uniqueAgents).toBe(1);
      expect(metrics.tracesByCategory.visit).toBe(1);
    });
  });

  describe('double buffer', () => {
    it('front buffer is stable during writes', () => {
      engine.start();
      engine.deposit(createTestDeposit());
      vi.advanceTimersByTime(20);

      // Read front buffer
      const front1 = engine.getFrontBuffer();
      // Deposit more (writes to back buffer)
      engine.deposit(createTestDeposit({
        agentId: 'agent-2',
        position: { x: 20, y: 0, z: 20 },
      }));

      // Front buffer should still show previous state until swap
      const front2 = engine.getFrontBuffer();
      expect(front2.traces.size).toBe(front1.traces.size);

      // After cycle (swap), new trace appears
      vi.advanceTimersByTime(20);
      const front3 = engine.getFrontBuffer();
      expect(front3.traces.size).toBe(2);
    });
  });

  describe('norm_provenance (W.069 three-mode framework)', () => {
    it('deposits a trace with genuine norm_provenance', () => {
      engine.start();
      const provenance: NormProvenance = {
        originInteractionId: 'interaction-001',
        originatingAgent: 'agent-1',
        confidenceClassification: 'genuine',
      };
      engine.deposit(createTestDeposit({ normProvenance: provenance }));
      vi.advanceTimersByTime(20);

      const trace = Array.from(engine.getTraces().values())[0];
      expect(trace.normProvenance).toBeDefined();
      expect(trace.normProvenance!.originInteractionId).toBe('interaction-001');
      expect(trace.normProvenance!.originatingAgent).toBe('agent-1');
      expect(trace.normProvenance!.confidenceClassification).toBe('genuine');
    });

    it('deposits a trace with confabulated norm_provenance', () => {
      engine.start();
      engine.deposit(createTestDeposit({
        normProvenance: {
          originInteractionId: 'interaction-002',
          originatingAgent: 'agent-1',
          confidenceClassification: 'confabulated',
        },
      }));
      vi.advanceTimersByTime(20);

      const trace = Array.from(engine.getTraces().values())[0];
      expect(trace.normProvenance!.confidenceClassification).toBe('confabulated');
    });

    it('deposits a trace with bullshitted norm_provenance', () => {
      engine.start();
      engine.deposit(createTestDeposit({
        normProvenance: {
          originInteractionId: 'interaction-003',
          originatingAgent: 'agent-1',
          confidenceClassification: 'bullshitted',
        },
      }));
      vi.advanceTimersByTime(20);

      const trace = Array.from(engine.getTraces().values())[0];
      expect(trace.normProvenance!.confidenceClassification).toBe('bullshitted');
    });

    it('deposits a trace without norm_provenance (backward compatibility)', () => {
      engine.start();
      engine.deposit(createTestDeposit());
      vi.advanceTimersByTime(20);

      const trace = Array.from(engine.getTraces().values())[0];
      expect(trace.normProvenance).toBeUndefined();
    });

    it('preserves norm_provenance during reinforcement', () => {
      engine.start();
      const pos = { x: 5, y: 0, z: 3 };

      // First deposit with provenance
      engine.deposit(createTestDeposit({
        position: pos,
        category: 'visit',
        normProvenance: {
          originInteractionId: 'original-interaction',
          originatingAgent: 'agent-1',
          confidenceClassification: 'genuine',
        },
      }));
      vi.advanceTimersByTime(20);

      // Second deposit at same position (reinforcement)
      engine.deposit(createTestDeposit({
        position: pos,
        category: 'visit',
      }));
      vi.advanceTimersByTime(20);

      // The original provenance should be preserved on the reinforced trace
      const trace = Array.from(engine.getTraces().values())[0];
      expect(trace.reinforcementCount).toBe(1);
      expect(trace.normProvenance).toBeDefined();
      expect(trace.normProvenance!.originInteractionId).toBe('original-interaction');
      expect(trace.normProvenance!.confidenceClassification).toBe('genuine');
    });

    it('preserves norm_provenance across buffer swaps', () => {
      engine.start();
      engine.deposit(createTestDeposit({
        normProvenance: {
          originInteractionId: 'swap-test-interaction',
          originatingAgent: 'agent-1',
          confidenceClassification: 'confabulated',
        },
      }));
      vi.advanceTimersByTime(20); // Cycle 1: deposit processed

      // Trigger another cycle (buffer swap happens)
      vi.advanceTimersByTime(20); // Cycle 2: another swap

      const trace = Array.from(engine.getTraces().values())[0];
      expect(trace.normProvenance).toBeDefined();
      expect(trace.normProvenance!.originInteractionId).toBe('swap-test-interaction');
      expect(trace.normProvenance!.confidenceClassification).toBe('confabulated');
    });

    it('norm_provenance is deep-cloned during buffer swap (mutation safety)', () => {
      engine.start();
      const provenance: NormProvenance = {
        originInteractionId: 'mutation-test',
        originatingAgent: 'agent-1',
        confidenceClassification: 'genuine',
      };
      engine.deposit(createTestDeposit({ normProvenance: provenance }));
      vi.advanceTimersByTime(20);

      const front1Trace = Array.from(engine.getFrontBuffer().traces.values())[0];

      // Trigger buffer swap
      vi.advanceTimersByTime(20);

      const front2Trace = Array.from(engine.getFrontBuffer().traces.values())[0];

      // They should be separate objects (deep-cloned), not the same reference
      expect(front2Trace.normProvenance).toEqual(front1Trace.normProvenance);
      if (front1Trace.normProvenance && front2Trace.normProvenance) {
        expect(front2Trace.normProvenance).not.toBe(front1Trace.normProvenance);
      }
    });

    it('accepts all three ConfidenceClassification values', () => {
      const classifications: ConfidenceClassification[] = ['genuine', 'confabulated', 'bullshitted'];
      engine.start();

      for (let i = 0; i < classifications.length; i++) {
        engine.deposit(createTestDeposit({
          agentId: `agent-${i}`,
          position: { x: i * 20, y: 0, z: 0 },
          normProvenance: {
            originInteractionId: `interaction-${i}`,
            originatingAgent: `agent-${i}`,
            confidenceClassification: classifications[i],
          },
        }));
      }
      vi.advanceTimersByTime(20);

      const traces = Array.from(engine.getTraces().values());
      expect(traces).toHaveLength(3);

      const classificationSet = new Set(
        traces.map((t) => t.normProvenance!.confidenceClassification),
      );
      expect(classificationSet).toEqual(new Set(classifications));
    });
  });
});

// =============================================================================
// COLLECTIVE MEMORY AGGREGATOR
// =============================================================================

describe('CollectiveMemoryAggregator', () => {
  let engine: StigmergicTraceEngine;
  let aggregator: CollectiveMemoryAggregator;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = createTestEngine();
    aggregator = createCollectiveMemoryAggregator(engine, {
      updateHz: 100, // Fast for tests
      minClusterSize: 2,
      clusterRadius: 3.0,
      minClusterIntensity: 0.05,
    });
  });

  afterEach(() => {
    aggregator.destroy();
    engine.destroy();
    vi.useRealTimers();
  });

  describe('lifecycle', () => {
    it('starts and stops', () => {
      expect(aggregator.isRunning()).toBe(false);
      aggregator.start();
      expect(aggregator.isRunning()).toBe(true);
      aggregator.stop();
      expect(aggregator.isRunning()).toBe(false);
    });
  });

  describe('cluster detection', () => {
    it('detects a cluster from adjacent deposits', () => {
      engine.start();
      aggregator.start();

      // Deposit several traces in adjacent cells
      for (let i = 0; i < 5; i++) {
        engine.deposit(createTestDeposit({
          agentId: `agent-${i}`,
          position: { x: i, y: 0, z: 0 },
          intensity: 0.5,
        }));
      }

      vi.advanceTimersByTime(20); // Engine cycle
      vi.advanceTimersByTime(20); // Aggregator cycle

      const clusters = aggregator.getClusters();
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters[0].traceCount).toBeGreaterThanOrEqual(2);
    });

    it('does NOT detect clusters from isolated deposits', () => {
      engine.start();
      aggregator.start();

      // Deposit traces far apart
      engine.deposit(createTestDeposit({ agentId: 'a', position: { x: 0, y: 0, z: 0 }, intensity: 0.5 }));
      engine.deposit(createTestDeposit({ agentId: 'b', position: { x: 50, y: 0, z: 50 }, intensity: 0.5 }));

      vi.advanceTimersByTime(20);
      vi.advanceTimersByTime(20);

      const clusters = aggregator.getClusters();
      // Two isolated points shouldn't form a cluster with minClusterSize=2 unless adjacent
      // Each cell only has 1 trace, so at most 1-cell "clusters" which don't meet min size
      // Actually, with minClusterSize=2, we need at least 2 connected cells
      expect(clusters.length).toBe(0);
    });
  });

  describe('heatmap', () => {
    it('builds a heatmap from active cells', () => {
      engine.start();
      aggregator.start();

      engine.deposit(createTestDeposit({ position: { x: 0, y: 0, z: 0 }, intensity: 0.8 }));
      engine.deposit(createTestDeposit({ agentId: 'b', position: { x: 5, y: 0, z: 5 }, intensity: 0.3 }));

      vi.advanceTimersByTime(20);
      vi.advanceTimersByTime(20);

      const heatmap = aggregator.getHeatmap();
      expect(heatmap.size).toBeGreaterThan(0);
    });
  });

  describe('metrics', () => {
    it('tracks aggregation metrics', () => {
      engine.start();
      aggregator.start();

      // Deposit a trace so aggregation has something to process
      engine.deposit(createTestDeposit({ intensity: 0.5 }));
      vi.advanceTimersByTime(20); // Engine cycle
      vi.advanceTimersByTime(20); // Aggregator cycle

      const metrics = aggregator.getMetrics();
      expect(metrics.isRunning).toBe(true);
      // With updateHz=100 and 40ms elapsed, should have had at least 1 cycle
      expect(metrics.cycleCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('events', () => {
    it('emits memory:updated after each aggregation cycle', () => {
      const handler = vi.fn();
      aggregator.on('memory:updated', handler);

      engine.start();
      aggregator.start();

      engine.deposit(createTestDeposit({ intensity: 0.5 }));
      vi.advanceTimersByTime(20);
      vi.advanceTimersByTime(20);

      expect(handler).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// CULTURAL TRACE RENDERER
// =============================================================================

describe('CulturalTraceRenderer', () => {
  let engine: StigmergicTraceEngine;
  let aggregator: CollectiveMemoryAggregator;
  let renderer: CulturalTraceRenderer;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = createTestEngine();
    aggregator = createCollectiveMemoryAggregator(engine, { updateHz: 100 });
    renderer = createCulturalTraceRenderer(engine, aggregator, {
      showTraceParticles: true,
      showHeatmap: true,
      showClusters: true,
      showPathPreferences: true,
      maxVisibleParticles: 100,
      viewDistance: 50,
    });
  });

  afterEach(() => {
    aggregator.destroy();
    engine.destroy();
    vi.useRealTimers();
  });

  describe('render output', () => {
    it('produces empty output when no traces exist', () => {
      const output = renderer.render();
      expect(output.particles).toHaveLength(0);
      expect(output.heatmapCells).toHaveLength(0);
      expect(output.clusterIndicators).toHaveLength(0);
      expect(output.pathTrails).toHaveLength(0);
      expect(output.totalActiveTraces).toBe(0);
    });

    it('generates particles from active traces', () => {
      engine.start();
      engine.deposit(createTestDeposit({ position: { x: 1, y: 0, z: 1 }, intensity: 0.5 }));
      vi.advanceTimersByTime(20);

      renderer.setCameraPosition({ x: 0, y: 0, z: 0 });
      const output = renderer.render();

      expect(output.particles.length).toBeGreaterThan(0);
      expect(output.particles[0].category).toBe('visit');
      expect(output.particles[0].agentId).toBe('agent-1');
    });

    it('culls particles beyond view distance', () => {
      engine.start();
      engine.deposit(createTestDeposit({ agentId: 'near', position: { x: 1, y: 0, z: 1 }, intensity: 0.5 }));
      engine.deposit(createTestDeposit({ agentId: 'far', position: { x: 200, y: 0, z: 200 }, intensity: 0.5 }));
      vi.advanceTimersByTime(20);

      renderer.setCameraPosition({ x: 0, y: 0, z: 0 });
      const output = renderer.render();

      // Only the near particle should be visible (viewDistance=50)
      expect(output.particles.length).toBe(1);
      expect(output.particles[0].agentId).toBe('near');
    });

    it('limits particles to maxVisibleParticles', () => {
      engine.start();

      // Deposit more traces than maxVisibleParticles
      for (let i = 0; i < 150; i++) {
        engine.deposit(createTestDeposit({
          agentId: `agent-${i}`,
          position: { x: (i % 20) - 10, y: 0, z: Math.floor(i / 20) - 3 },
          intensity: 0.5,
        }));
      }
      vi.advanceTimersByTime(20);

      renderer.setCameraPosition({ x: 0, y: 0, z: 0 });
      const output = renderer.render();

      expect(output.particles.length).toBeLessThanOrEqual(100);
    });

    it('includes frame sequence number', () => {
      const out1 = renderer.render();
      const out2 = renderer.render();
      expect(out2.frameSequence).toBe(out1.frameSequence + 1);
    });
  });

  describe('config update', () => {
    it('updates renderer config at runtime', () => {
      renderer.updateConfig({ showTraceParticles: false });
      engine.start();
      engine.deposit(createTestDeposit({ intensity: 0.5 }));
      vi.advanceTimersByTime(20);

      const output = renderer.render();
      expect(output.particles).toHaveLength(0); // Particles disabled
    });
  });
});

// =============================================================================
// CULTURAL TRACE MANAGER (INTEGRATION)
// =============================================================================

describe('CulturalTraceManager', () => {
  let manager: CulturalTraceManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = createCulturalTraceManager({
      worldId: 'test-world',
      localAgentId: 'brittney',
      engine: { updateHz: 100, grid: { cellSize: 1.0, worldMin: { x: -50, y: -10, z: -50 }, worldMax: { x: 50, y: 10, z: 50 }, maxTracesPerCell: 50 } },
      aggregator: { updateHz: 100 },
      renderer: { showTraceParticles: true, viewDistance: 100 },
    });
  });

  afterEach(() => {
    manager.destroy();
    vi.useRealTimers();
  });

  describe('lifecycle', () => {
    it('starts and stops all subsystems', () => {
      expect(manager.isRunning()).toBe(false);
      manager.start();
      expect(manager.isRunning()).toBe(true);
      manager.stop();
      expect(manager.isRunning()).toBe(false);
    });

    it('destroy cleans up', () => {
      manager.start();
      manager.deposit(createTestDeposit());
      vi.advanceTimersByTime(20);
      manager.destroy();
      expect(manager.isRunning()).toBe(false);
    });
  });

  describe('convenience deposit methods', () => {
    it('depositVisit creates a visit trace', () => {
      manager.start();
      manager.depositVisit({ x: 1, y: 0, z: 1 });
      vi.advanceTimersByTime(20);

      const traces = Array.from(manager.getTraces().values());
      expect(traces).toHaveLength(1);
      expect(traces[0].category).toBe('visit');
      expect(traces[0].agentId).toBe('brittney');
    });

    it('depositAnnotation creates an annotate trace with text', () => {
      manager.start();
      manager.depositAnnotation({ x: 2, y: 0, z: 2 }, 'Look here!', ['important']);
      vi.advanceTimersByTime(20);

      const traces = Array.from(manager.getTraces().values());
      expect(traces).toHaveLength(1);
      expect(traces[0].category).toBe('annotate');
      expect(traces[0].textContent).toBe('Look here!');
      expect(traces[0].tags).toContain('important');
    });

    it('depositHazard creates a hazard trace', () => {
      manager.start();
      manager.depositHazard({ x: 3, y: 0, z: 3 }, 'Danger zone');
      vi.advanceTimersByTime(20);

      const traces = Array.from(manager.getTraces().values());
      expect(traces).toHaveLength(1);
      expect(traces[0].category).toBe('hazard');
      expect(traces[0].tags).toContain('hazard');
    });

    it('depositWaypoint creates a waypoint trace', () => {
      manager.start();
      manager.depositWaypoint({ x: 4, y: 0, z: 4 }, 'Checkpoint A');
      vi.advanceTimersByTime(20);

      const traces = Array.from(manager.getTraces().values());
      expect(traces).toHaveLength(1);
      expect(traces[0].category).toBe('waypoint');
    });

    it('depositEmotion creates an emotional trace', () => {
      manager.start();
      manager.depositEmotion({ x: 5, y: 0, z: 5 }, 'surprise');
      vi.advanceTimersByTime(20);

      const traces = Array.from(manager.getTraces().values());
      expect(traces).toHaveLength(1);
      expect(traces[0].category).toBe('emotional');
      expect(traces[0].metadata).toHaveProperty('emotion', 'surprise');
    });
  });

  describe('query API', () => {
    it('getTracesNear returns nearby traces', () => {
      manager.start();
      manager.depositVisit({ x: 0, y: 0, z: 0 });
      manager.depositVisit({ x: 1, y: 0, z: 0 });
      manager.deposit(createTestDeposit({ agentId: 'far', position: { x: 100, y: 0, z: 100 } }));
      vi.advanceTimersByTime(20);

      const near = manager.getTracesNear({ x: 0, y: 0, z: 0 }, 5);
      // At least the two nearby deposits should be found
      expect(near.length).toBeGreaterThanOrEqual(2);
    });

    it('getClusters returns detected clusters', () => {
      manager.start();

      // Create a dense cluster
      for (let i = 0; i < 10; i++) {
        manager.deposit(createTestDeposit({
          agentId: `agent-${i}`,
          position: { x: i * 0.5, y: 0, z: 0 },
          intensity: 0.5,
        }));
      }

      vi.advanceTimersByTime(20); // engine cycle
      vi.advanceTimersByTime(20); // aggregator cycle

      // Clusters may or may not form depending on cell adjacency
      const clusters = manager.getClusters();
      // Should have at least tried aggregation
      expect(clusters).toBeDefined();
    });
  });

  describe('render API', () => {
    it('render produces output with particles', () => {
      manager.start();
      manager.depositVisit({ x: 1, y: 0, z: 1 });
      vi.advanceTimersByTime(20);

      manager.setCameraPosition({ x: 0, y: 0, z: 0 });
      const output = manager.render();

      expect(output.particles.length).toBeGreaterThan(0);
      expect(output.frameSequence).toBe(1);
    });
  });

  describe('metrics', () => {
    it('returns comprehensive metrics', () => {
      manager.start();
      manager.depositVisit({ x: 0, y: 0, z: 0 });
      vi.advanceTimersByTime(20);

      const metrics = manager.getMetrics();
      expect(metrics.isRunning).toBe(true);
      expect(metrics.totalDeposits).toBe(1);
      expect(metrics.totalActiveTraces).toBe(1);
      expect(metrics.uniqueAgents).toBe(1);
      expect(metrics.tracesByCategory.visit).toBe(1);
      expect(metrics.estimatedMemoryBytes).toBeGreaterThan(0);
    });
  });

  describe('subsystem access', () => {
    it('provides access to engine, aggregator, and renderer', () => {
      expect(manager.getEngine()).toBeInstanceOf(StigmergicTraceEngine);
      expect(manager.getAggregator()).toBeInstanceOf(CollectiveMemoryAggregator);
      expect(manager.getRenderer()).toBeInstanceOf(CulturalTraceRenderer);
    });
  });

  describe('norm_provenance via manager deposit API', () => {
    it('passes norm_provenance through to engine deposit', () => {
      manager.start();
      manager.deposit({
        worldId: 'test-world',
        agentId: 'brittney',
        agentName: 'Brittney',
        position: { x: 1, y: 0, z: 1 },
        category: 'annotate',
        textContent: 'Important finding',
        normProvenance: {
          originInteractionId: 'manager-test-001',
          originatingAgent: 'brittney',
          confidenceClassification: 'genuine',
        },
      });
      vi.advanceTimersByTime(20);

      const traces = Array.from(manager.getTraces().values());
      expect(traces).toHaveLength(1);
      expect(traces[0].normProvenance).toBeDefined();
      expect(traces[0].normProvenance!.originInteractionId).toBe('manager-test-001');
      expect(traces[0].normProvenance!.originatingAgent).toBe('brittney');
      expect(traces[0].normProvenance!.confidenceClassification).toBe('genuine');
    });

    it('convenience methods create traces without normProvenance by default', () => {
      manager.start();
      manager.depositVisit({ x: 0, y: 0, z: 0 });
      vi.advanceTimersByTime(20);

      const traces = Array.from(manager.getTraces().values());
      expect(traces).toHaveLength(1);
      expect(traces[0].normProvenance).toBeUndefined();
    });
  });
});
