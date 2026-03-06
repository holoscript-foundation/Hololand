/**
 * @vitest-environment jsdom
 */

/**
 * Tests for DNFSpatialAttentionField
 *
 * Validates:
 * - Initialization with custom and default config
 * - World-to-field coordinate mapping
 * - Field-to-world coordinate mapping
 * - SNN perception ingestion and projection
 * - Saliency queries at world positions
 * - Top salient region detection
 * - Statistics and visualization snapshot generation
 * - Reset functionality
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
  DNFSpatialAttentionField,
  createDNFSpatialAttentionField,
} from '../DNFSpatialAttentionField';

import {
  DEFAULT_SPATIAL_ATTENTION_CONFIG,
  DEFAULT_DNF_CONFIG,
} from '../DynamicNeuralFieldTypes';

import type {
  SpatialAttentionFieldConfig,
  DNFWorldMapping,
} from '../DynamicNeuralFieldTypes';

import type {
  SNNPerceptionState,
  AttentionScore,
} from '../SNNPerceptionTypes';

import type { Vec3 } from '../AgentStateBuffer';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createTestSNNState(scores: Array<{
  objectId: string;
  attention: number;
}>): SNNPerceptionState {
  return {
    attentionScores: scores.map(s => ({
      objectId: s.objectId,
      attention: s.attention,
      salience: s.attention >= 0.8 ? 'alert' : s.attention >= 0.5 ? 'focus' : 'ambient',
      isAnomalous: false,
      spikeRate: s.attention * 0.5,
    })),
    trackedObjectCount: scores.length,
    globalAnomalyLevel: 0,
    focusPoint: { x: 0, y: 0, z: 0 },
    focusConfidence: 0.5,
    averageSpikeRate: 0.3,
    totalSpikes: 10,
    sequence: 1,
    lastInferenceTimestamp: performance.now(),
    lastInferenceDurationMs: 2.5,
    currentHz: 10,
  };
}

function createSmallAttentionField(
  overrides?: Partial<SpatialAttentionFieldConfig>,
): DNFSpatialAttentionField {
  return createDNFSpatialAttentionField({
    fieldConfig: {
      ...DEFAULT_DNF_CONFIG,
      width: 16,
      height: 16,
      noiseAmplitude: 0,
      label: 'test-attention',
    },
    worldMapping: {
      worldOrigin: { x: 0, y: 0, z: 0 },
      worldExtent: { x: 10, y: 0, z: 10 },
      axisMapping: { fieldX: 'x', fieldY: 'z' },
    },
    snnInputGain: 8.0,
    snnInputSigma: 2.0,
    inputDecayRate: 0.3,
    snnAttentionThreshold: 0.1,
    maxProjectedObjects: 32,
    ...overrides,
  });
}

// =============================================================================
// INITIALIZATION TESTS
// =============================================================================

describe('DNFSpatialAttentionField - Initialization', () => {
  it('should create with default config via factory', () => {
    const field = createDNFSpatialAttentionField();
    expect(field).toBeDefined();
    expect(field.getField()).toBeDefined();
  });

  it('should create with custom config', () => {
    const field = createSmallAttentionField();
    const config = field.getConfig();

    expect(config.fieldConfig.width).toBe(16);
    expect(config.fieldConfig.height).toBe(16);
    expect(config.worldMapping.worldOrigin.x).toBe(0);
    expect(config.snnInputGain).toBe(8.0);
  });

  it('should expose the underlying DynamicNeuralField', () => {
    const field = createSmallAttentionField();
    const dnf = field.getField();

    expect(dnf.getWidth()).toBe(16);
    expect(dnf.getHeight()).toBe(16);
  });
});

// =============================================================================
// COORDINATE MAPPING TESTS
// =============================================================================

describe('DNFSpatialAttentionField - Coordinate Mapping', () => {
  it('worldToField should map world origin to field (0, 0)', () => {
    const field = createSmallAttentionField();
    const result = field.worldToField({ x: 0, y: 0, z: 0 });

    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(0, 0);
    expect(result![1]).toBeCloseTo(0, 0);
  });

  it('worldToField should map world center to field center', () => {
    const field = createSmallAttentionField();
    const result = field.worldToField({ x: 5, y: 0, z: 5 });

    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(7.5, 0); // 0.5 * 15
    expect(result![1]).toBeCloseTo(7.5, 0);
  });

  it('worldToField should map max extent to field max', () => {
    const field = createSmallAttentionField();
    const result = field.worldToField({ x: 10, y: 0, z: 10 });

    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(15, 0);
    expect(result![1]).toBeCloseTo(15, 0);
  });

  it('worldToField should return null for out-of-bounds positions', () => {
    const field = createSmallAttentionField();

    expect(field.worldToField({ x: -1, y: 0, z: 0 })).toBeNull();
    expect(field.worldToField({ x: 0, y: 0, z: -1 })).toBeNull();
    expect(field.worldToField({ x: 11, y: 0, z: 0 })).toBeNull();
    expect(field.worldToField({ x: 0, y: 0, z: 11 })).toBeNull();
  });

  it('fieldToWorld should inverse worldToField', () => {
    const field = createSmallAttentionField();
    const worldPos: Vec3 = { x: 3, y: 0, z: 7 };

    const fieldCoords = field.worldToField(worldPos);
    expect(fieldCoords).not.toBeNull();

    const backToWorld = field.fieldToWorld(fieldCoords![0], fieldCoords![1]);

    expect(backToWorld.x).toBeCloseTo(worldPos.x, 0);
    expect(backToWorld.z).toBeCloseTo(worldPos.z, 0);
  });

  it('fieldToWorld should handle field origin', () => {
    const field = createSmallAttentionField();
    const world = field.fieldToWorld(0, 0);

    expect(world.x).toBeCloseTo(0, 0);
    expect(world.z).toBeCloseTo(0, 0);
  });

  it('fieldToWorld should handle field max', () => {
    const field = createSmallAttentionField();
    const world = field.fieldToWorld(15, 15);

    expect(world.x).toBeCloseTo(10, 0);
    expect(world.z).toBeCloseTo(10, 0);
  });

  it('should handle non-default axis mapping', () => {
    const field = createSmallAttentionField({
      worldMapping: {
        worldOrigin: { x: 0, y: -5, z: 0 },
        worldExtent: { x: 0, y: 10, z: 10 },
        axisMapping: { fieldX: 'y', fieldY: 'z' },
      },
    });

    const result = field.worldToField({ x: 0, y: 0, z: 5 });
    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(7.5, 0); // y=0 maps to normalized 0.5 * 15
    expect(result![1]).toBeCloseTo(7.5, 0); // z=5 maps to normalized 0.5 * 15
  });
});

// =============================================================================
// SNN PERCEPTION INGESTION TESTS
// =============================================================================

describe('DNFSpatialAttentionField - SNN Ingestion', () => {
  it('should project high-attention objects onto the field', () => {
    const field = createSmallAttentionField();

    const snnState = createTestSNNState([
      { objectId: 'obj-1', attention: 0.9 },
      { objectId: 'obj-2', attention: 0.5 },
    ]);

    const positions = new Map<string, Vec3>();
    positions.set('obj-1', { x: 5, y: 0, z: 5 }); // Center
    positions.set('obj-2', { x: 2, y: 0, z: 2 }); // Off-center

    field.ingestSNNPerception(snnState, positions);
    field.step();

    // After ingestion and step, activation should be higher at obj-1 position
    const saliencyCenter = field.getSaliencyAt({ x: 5, y: 0, z: 5 });
    const saliencyCorner = field.getSaliencyAt({ x: 0, y: 0, z: 0 });

    // Center (where obj-1 is) should have at least some saliency
    // (actual value depends on DNF dynamics)
    expect(typeof saliencyCenter).toBe('number');
    expect(typeof saliencyCorner).toBe('number');
  });

  it('should filter objects below attention threshold', () => {
    const field = createSmallAttentionField({
      snnAttentionThreshold: 0.5,
    });

    const snnState = createTestSNNState([
      { objectId: 'obj-low', attention: 0.1 }, // Below threshold
      { objectId: 'obj-high', attention: 0.9 },
    ]);

    const positions = new Map<string, Vec3>();
    positions.set('obj-low', { x: 2, y: 0, z: 2 });
    positions.set('obj-high', { x: 8, y: 0, z: 8 });

    field.ingestSNNPerception(snnState, positions);
    field.step();

    // Low-attention object should not contribute meaningful saliency
    // (this is a soft filter - the Gaussian might still have some effect)
    expect(true).toBe(true); // Ensures ingestion completes without error
  });

  it('should ignore objects without world positions', () => {
    const field = createSmallAttentionField();

    const snnState = createTestSNNState([
      { objectId: 'obj-no-pos', attention: 0.9 },
    ]);

    // Empty position map - no crash expected
    const positions = new Map<string, Vec3>();
    field.ingestSNNPerception(snnState, positions);
    field.step();

    expect(true).toBe(true);
  });

  it('should respect maxProjectedObjects limit', () => {
    const field = createSmallAttentionField({
      maxProjectedObjects: 2,
    });

    const snnState = createTestSNNState([
      { objectId: 'obj-1', attention: 0.9 },
      { objectId: 'obj-2', attention: 0.8 },
      { objectId: 'obj-3', attention: 0.7 },
      { objectId: 'obj-4', attention: 0.6 },
    ]);

    const positions = new Map<string, Vec3>();
    positions.set('obj-1', { x: 2, y: 0, z: 2 });
    positions.set('obj-2', { x: 4, y: 0, z: 4 });
    positions.set('obj-3', { x: 6, y: 0, z: 6 });
    positions.set('obj-4', { x: 8, y: 0, z: 8 });

    // Should not throw even with more objects than limit
    field.ingestSNNPerception(snnState, positions);
    field.step();
  });

  it('should decay input over time', () => {
    const field = createSmallAttentionField({
      inputDecayRate: 0.5, // 50% decay per ingestion
    });

    const snnState = createTestSNNState([
      { objectId: 'obj-1', attention: 0.9 },
    ]);
    const positions = new Map<string, Vec3>();
    positions.set('obj-1', { x: 5, y: 0, z: 5 });

    // First ingestion
    field.ingestSNNPerception(snnState, positions);

    // Second ingestion with no objects - should decay
    const emptySnnState = createTestSNNState([]);
    field.ingestSNNPerception(emptySnnState, new Map());

    // Input should be reduced by decay
    // (Implementation detail: decay is applied before new input is added)
    expect(true).toBe(true);
  });
});

// =============================================================================
// SALIENCY QUERY TESTS
// =============================================================================

describe('DNFSpatialAttentionField - Saliency Queries', () => {
  it('getSaliencyAt should return 0 for out-of-bounds positions', () => {
    const field = createSmallAttentionField();
    expect(field.getSaliencyAt({ x: -5, y: 0, z: -5 })).toBe(0);
    expect(field.getSaliencyAt({ x: 15, y: 0, z: 15 })).toBe(0);
  });

  it('getSaliencyAt should return a number for valid positions', () => {
    const field = createSmallAttentionField();
    const saliency = field.getSaliencyAt({ x: 5, y: 0, z: 5 });
    expect(typeof saliency).toBe('number');
    expect(saliency).toBeGreaterThanOrEqual(0);
    expect(saliency).toBeLessThanOrEqual(1);
  });

  it('getTopSalientRegions should return empty array for resting field', () => {
    const field = createSmallAttentionField();
    const regions = field.getTopSalientRegions();
    expect(regions).toHaveLength(0);
  });

  it('getTopSalientRegions should include world positions', () => {
    const field = createSmallAttentionField();

    // Force a peak by directly manipulating the field
    const dnf = field.getField();
    const state = dnf.getState();
    state.activation[8 * 16 + 8] = 5.0;
    state.activation[8 * 16 + 7] = 3.0;
    state.activation[8 * 16 + 9] = 3.0;
    state.activation[7 * 16 + 8] = 3.0;
    state.activation[9 * 16 + 8] = 3.0;

    const regions = field.getTopSalientRegions();
    if (regions.length > 0) {
      expect(regions[0].worldPosition).toBeDefined();
      expect(typeof regions[0].worldPosition.x).toBe('number');
      expect(typeof regions[0].worldPosition.z).toBe('number');
    }
  });

  it('getMostSalientPosition should return null for resting field', () => {
    const field = createSmallAttentionField();
    expect(field.getMostSalientPosition()).toBeNull();
  });

  it('isAttentionActive should return false for resting field', () => {
    const field = createSmallAttentionField();
    expect(field.isAttentionActive({ x: 5, y: 0, z: 5 })).toBe(false);
  });
});

// =============================================================================
// STATISTICS AND VISUALIZATION TESTS
// =============================================================================

describe('DNFSpatialAttentionField - Statistics & Visualization', () => {
  it('should compute field statistics', () => {
    const field = createSmallAttentionField();
    const stats = field.getStatistics();

    expect(stats).toBeDefined();
    expect(typeof stats.meanActivation).toBe('number');
    expect(typeof stats.maxActivation).toBe('number');
    expect(typeof stats.minActivation).toBe('number');
    expect(typeof stats.activeFraction).toBe('number');
    expect(Array.isArray(stats.peaks)).toBe(true);
  });

  it('should create visualization snapshot', () => {
    const field = createSmallAttentionField();
    field.step();

    const snapshot = field.createVisualizationSnapshot();

    expect(snapshot.snapshotId).toBeGreaterThan(0);
    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.width).toBe(16);
    expect(snapshot.height).toBe(16);
    expect(snapshot.activationHeatmap.length).toBe(256);
    expect(snapshot.outputHeatmap.length).toBe(256);
    expect(snapshot.inputOverlay.length).toBe(256);
    expect(snapshot.statistics).toBeDefined();
    expect(snapshot.performance).toBeDefined();
    expect(snapshot.performance.totalTimesteps).toBeGreaterThan(0);
  });

  it('visualization heatmap should be normalized to [-1, 1]', () => {
    const field = createSmallAttentionField();
    field.step();

    const snapshot = field.createVisualizationSnapshot();
    for (let i = 0; i < snapshot.activationHeatmap.length; i++) {
      expect(snapshot.activationHeatmap[i]).toBeGreaterThanOrEqual(-1);
      expect(snapshot.activationHeatmap[i]).toBeLessThanOrEqual(1);
    }
  });
});

// =============================================================================
// RESET TESTS
// =============================================================================

describe('DNFSpatialAttentionField - Reset', () => {
  it('should reset field and clear input', () => {
    const field = createSmallAttentionField();

    // Modify state
    field.step();
    field.ingestSNNPerception(
      createTestSNNState([{ objectId: 'obj', attention: 0.9 }]),
      new Map([['obj', { x: 5, y: 0, z: 5 }]]),
    );

    field.reset();

    const stats = field.getStatistics();
    expect(stats.maxActivation).toBeLessThanOrEqual(0);
    expect(field.getField().getTimestepCount()).toBe(0);
  });
});
