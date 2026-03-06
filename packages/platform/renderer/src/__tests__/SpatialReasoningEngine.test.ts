/**
 * @vitest-environment jsdom
 */

/**
 * Tests for SpatialReasoningEngine (Tier 1: 1-5Hz Spatial Reasoning)
 *
 * Validates:
 * - Scene snapshot ingestion
 * - Spatial relationship computation (near, far, above, below, etc.)
 * - Region detection via density-based clustering
 * - Occlusion estimation from camera perspective
 * - Spatial label generation
 * - Scene complexity scoring
 * - Performance characteristics (inference budget adherence)
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
  SpatialReasoningEngine,
  createSpatialReasoningEngine,
  type ObjectSnapshot,
  type CameraSnapshot,
} from '../SpatialReasoningEngine';

import {
  createEmptyCachedSpatialState,
  type CachedSpatialState,
} from '../SpatialInferenceTypes';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createObject(
  id: string,
  position: { x: number; y: number; z: number },
  options?: Partial<ObjectSnapshot>,
): ObjectSnapshot {
  const size = 1;
  return {
    id,
    type: 'mesh',
    position,
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    boundsMin: {
      x: position.x - size / 2,
      y: position.y - size / 2,
      z: position.z - size / 2,
    },
    boundsMax: {
      x: position.x + size / 2,
      y: position.y + size / 2,
      z: position.z + size / 2,
    },
    visible: true,
    ...options,
  };
}

function createDefaultCamera(): CameraSnapshot {
  return {
    position: { x: 0, y: 0, z: 10 },
    forward: { x: 0, y: 0, z: -1 },
    up: { x: 0, y: 1, z: 0 },
    right: { x: 1, y: 0, z: 0 },
    fov: 75,
    near: 0.1,
    far: 1000,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('SpatialReasoningEngine', () => {
  let engine: SpatialReasoningEngine;
  let state: CachedSpatialState;

  beforeEach(() => {
    engine = createSpatialReasoningEngine();
    state = createEmptyCachedSpatialState();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should create with default configuration', () => {
      const e = new SpatialReasoningEngine();
      expect(e.getObjectCount()).toBe(0);
      expect(e.getComplexity()).toBe(0);
    });

    it('should create with custom configuration', () => {
      const e = new SpatialReasoningEngine({
        nearThreshold: 10,
        maxRelationships: 100,
      });
      expect(e).toBeDefined();
    });

    it('should implement SpatialReasoningProvider interface', () => {
      expect(typeof engine.infer).toBe('function');
      expect(typeof engine.getComplexity).toBe('function');
      expect(typeof engine.initialize).toBe('function');
      expect(typeof engine.dispose).toBe('function');
    });

    it('should initialize and dispose without error', async () => {
      await engine.initialize();
      engine.dispose();
      expect(engine.getObjectCount()).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SCENE SNAPSHOT
  // ─────────────────────────────────────────────────────────────────────────

  describe('scene snapshot', () => {
    it('should accept scene snapshots', () => {
      const objects = [
        createObject('a', { x: 0, y: 0, z: 0 }),
        createObject('b', { x: 5, y: 0, z: 0 }),
      ];
      const camera = createDefaultCamera();

      engine.setSceneSnapshot(objects, camera);
      expect(engine.getObjectCount()).toBe(2);
    });

    it('should update complexity when snapshot changes', () => {
      // Empty scene = 0 complexity
      engine.setSceneSnapshot([], createDefaultCamera());
      expect(engine.getComplexity()).toBe(0);

      // Add objects = non-zero complexity
      const objects = Array.from({ length: 50 }, (_, i) =>
        createObject(`obj-${i}`, { x: i * 2, y: 0, z: 0 }),
      );
      engine.setSceneSnapshot(objects, createDefaultCamera());
      expect(engine.getComplexity()).toBeGreaterThan(0);
    });

    it('should handle empty snapshot', () => {
      engine.setSceneSnapshot([], createDefaultCamera());
      expect(engine.getObjectCount()).toBe(0);
      expect(engine.getComplexity()).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // INFERENCE - BASIC
  // ─────────────────────────────────────────────────────────────────────────

  describe('inference - basic', () => {
    it('should produce valid state for empty scene', async () => {
      engine.setSceneSnapshot([], createDefaultCamera());
      await engine.infer(state, 500);

      expect(state.objectCount).toBe(0);
      expect(state.relationships).toEqual([]);
      expect(state.regions).toEqual([]);
      expect(state.labels).toEqual([]);
      expect(state.sequence).toBe(1);
      expect(state.lastInferenceTimestamp).toBeGreaterThan(0);
      expect(state.lastInferenceDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should increment sequence on each inference pass', async () => {
      engine.setSceneSnapshot([], createDefaultCamera());

      await engine.infer(state, 500);
      expect(state.sequence).toBe(1);

      await engine.infer(state, 500);
      expect(state.sequence).toBe(2);

      await engine.infer(state, 500);
      expect(state.sequence).toBe(3);
    });

    it('should record inference duration', async () => {
      const objects = Array.from({ length: 20 }, (_, i) =>
        createObject(`obj-${i}`, { x: i, y: 0, z: 0 }),
      );
      engine.setSceneSnapshot(objects, createDefaultCamera());

      await engine.infer(state, 500);
      expect(state.lastInferenceDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should filter invisible objects', async () => {
      const objects = [
        createObject('visible', { x: 0, y: 0, z: 0 }, { visible: true }),
        createObject('invisible', { x: 1, y: 0, z: 0 }, { visible: false }),
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());

      await engine.infer(state, 500);
      // Only 1 visible object should be counted
      expect(state.objectCount).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SPATIAL RELATIONSHIPS
  // ─────────────────────────────────────────────────────────────────────────

  describe('spatial relationships', () => {
    it('should detect "near" relationship for close objects', async () => {
      const objects = [
        createObject('a', { x: 0, y: 0, z: 0 }),
        createObject('b', { x: 2, y: 0, z: 0 }),
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      const nearRels = state.relationships.filter(r => r.type === 'near');
      expect(nearRels.length).toBeGreaterThan(0);
      expect(nearRels[0].sourceId).toBe('a');
      expect(nearRels[0].targetId).toBe('b');
      expect(nearRels[0].distance).toBeCloseTo(2, 1);
      expect(nearRels[0].confidence).toBeGreaterThan(0);
    });

    it('should detect "far" relationship for distant objects', async () => {
      const objects = [
        createObject('a', { x: 0, y: 0, z: 0 }),
        createObject('b', { x: 50, y: 0, z: 0 }),
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      const farRels = state.relationships.filter(r => r.type === 'far');
      expect(farRels.length).toBeGreaterThan(0);
    });

    it('should detect "above" and "below" relationships', async () => {
      const objects = [
        createObject('a', { x: 0, y: 10, z: 0 }),  // High up
        createObject('b', { x: 0, y: 0, z: 0 }),    // On ground
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      // a is above b, so from a->b direction.y < 0: a should be "above"
      const aboveRels = state.relationships.filter(r => r.type === 'above');
      expect(aboveRels.length).toBeGreaterThan(0);
    });

    it('should detect "adjacent" relationship for very close objects', async () => {
      const objects = [
        createObject('a', { x: 0, y: 0, z: 0 }),
        createObject('b', { x: 1, y: 0, z: 0 }),
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      const adjacentRels = state.relationships.filter(r => r.type === 'adjacent');
      expect(adjacentRels.length).toBeGreaterThan(0);
    });

    it('should detect "aligned" relationship for axis-aligned objects', async () => {
      // Objects aligned on the Y and Z axes (same Y and Z, different X)
      const objects = [
        createObject('a', { x: 0, y: 5, z: 5 }),
        createObject('b', { x: 10, y: 5, z: 5 }),
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      const alignedRels = state.relationships.filter(r => r.type === 'aligned');
      expect(alignedRels.length).toBeGreaterThan(0);
    });

    it('should detect "contains" relationship', async () => {
      // Object A is large and contains object B
      const a = createObject('container', { x: 0, y: 0, z: 0 });
      a.boundsMin = { x: -10, y: -10, z: -10 };
      a.boundsMax = { x: 10, y: 10, z: 10 };

      const b = createObject('contained', { x: 0, y: 0, z: 0 });
      b.boundsMin = { x: -1, y: -1, z: -1 };
      b.boundsMax = { x: 1, y: 1, z: 1 };

      engine.setSceneSnapshot([a, b], createDefaultCamera());
      await engine.infer(state, 500);

      const containsRels = state.relationships.filter(r => r.type === 'contains');
      expect(containsRels.length).toBeGreaterThan(0);
      expect(containsRels[0].sourceId).toBe('container');
      expect(containsRels[0].targetId).toBe('contained');
    });

    it('should respect maxRelationships limit', async () => {
      const engineLimited = new SpatialReasoningEngine({
        maxRelationships: 5,
        minRelationshipConfidence: 0,
      });

      const objects = Array.from({ length: 20 }, (_, i) =>
        createObject(`obj-${i}`, { x: i * 0.5, y: 0, z: 0 }),
      );
      engineLimited.setSceneSnapshot(objects, createDefaultCamera());

      const limitedState = createEmptyCachedSpatialState();
      await engineLimited.infer(limitedState, 500);

      expect(limitedState.relationships.length).toBeLessThanOrEqual(5);
    });

    it('should filter relationships below minimum confidence', async () => {
      const highConfEngine = new SpatialReasoningEngine({
        minRelationshipConfidence: 0.99,
      });

      const objects = [
        createObject('a', { x: 0, y: 0, z: 0 }),
        createObject('b', { x: 4, y: 0, z: 0 }), // Near threshold boundary
      ];
      highConfEngine.setSceneSnapshot(objects, createDefaultCamera());

      const highConfState = createEmptyCachedSpatialState();
      await highConfEngine.infer(highConfState, 500);

      // With 0.99 confidence threshold, most relationships should be filtered
      for (const rel of highConfState.relationships) {
        expect(rel.confidence).toBeGreaterThanOrEqual(0.99);
      }
    });

    it('should include direction vector in relationships', async () => {
      const objects = [
        createObject('a', { x: 0, y: 0, z: 0 }),
        createObject('b', { x: 3, y: 0, z: 0 }),
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      for (const rel of state.relationships) {
        // Direction should be a normalized vector
        const len = Math.sqrt(
          rel.direction.x ** 2 + rel.direction.y ** 2 + rel.direction.z ** 2,
        );
        expect(len).toBeCloseTo(1, 2);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // REGION DETECTION
  // ─────────────────────────────────────────────────────────────────────────

  describe('region detection', () => {
    it('should detect clusters of nearby objects as regions', async () => {
      // Cluster 1: Objects at origin
      const cluster1 = Array.from({ length: 5 }, (_, i) =>
        createObject(`c1-${i}`, { x: i * 2, y: 0, z: 0 }),
      );
      // Cluster 2: Objects far away
      const cluster2 = Array.from({ length: 5 }, (_, i) =>
        createObject(`c2-${i}`, { x: 100 + i * 2, y: 0, z: 0 }),
      );

      engine.setSceneSnapshot([...cluster1, ...cluster2], createDefaultCamera());
      await engine.infer(state, 500);

      expect(state.regions.length).toBeGreaterThanOrEqual(2);
    });

    it('should not create regions for isolated objects', async () => {
      // Objects too far apart to cluster (default minClusterSize = 3)
      const objects = [
        createObject('a', { x: 0, y: 0, z: 0 }),
        createObject('b', { x: 100, y: 0, z: 0 }),
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      expect(state.regions.length).toBe(0);
    });

    it('should include object IDs in regions', async () => {
      const objects = Array.from({ length: 5 }, (_, i) =>
        createObject(`obj-${i}`, { x: i * 2, y: 0, z: 0 }),
      );
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      if (state.regions.length > 0) {
        expect(state.regions[0].objectIds.length).toBeGreaterThanOrEqual(3);
        for (const id of state.regions[0].objectIds) {
          expect(id).toMatch(/^obj-/);
        }
      }
    });

    it('should compute region center and extents', async () => {
      const objects = Array.from({ length: 5 }, (_, i) =>
        createObject(`obj-${i}`, { x: i * 2, y: 0, z: 0 }),
      );
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      if (state.regions.length > 0) {
        const region = state.regions[0];
        expect(region.center).toBeDefined();
        expect(region.extents).toBeDefined();
        expect(region.extents.x).toBeGreaterThan(0);
      }
    });

    it('should disable region detection when configured', async () => {
      const noRegionEngine = new SpatialReasoningEngine({
        enableRegionDetection: false,
      });

      const objects = Array.from({ length: 10 }, (_, i) =>
        createObject(`obj-${i}`, { x: i, y: 0, z: 0 }),
      );
      noRegionEngine.setSceneSnapshot(objects, createDefaultCamera());

      const noRegionState = createEmptyCachedSpatialState();
      await noRegionEngine.infer(noRegionState, 500);

      expect(noRegionState.regions).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // OCCLUSION ESTIMATION
  // ─────────────────────────────────────────────────────────────────────────

  describe('occlusion estimation', () => {
    it('should compute occlusion states for all visible objects', async () => {
      const objects = [
        createObject('front', { x: 0, y: 0, z: 5 }),
        createObject('back', { x: 0, y: 0, z: 0 }),
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      expect(Object.keys(state.occlusionStates).length).toBe(2);
      expect(state.occlusionStates['front']).toBeDefined();
      expect(state.occlusionStates['back']).toBeDefined();
    });

    it('should mark objects in front of camera as potentially visible', async () => {
      const objects = [
        createObject('in-front', { x: 0, y: 0, z: 5 }), // In front of camera at z=10
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      expect(state.occlusionStates['in-front'].potentiallyVisible).toBe(true);
    });

    it('should record occlusion timestamp', async () => {
      const objects = [createObject('a', { x: 0, y: 0, z: 5 })];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      expect(state.occlusionStates['a'].lastComputedTimestamp).toBeGreaterThan(0);
    });

    it('should disable occlusion when configured', async () => {
      const noOcclusionEngine = new SpatialReasoningEngine({
        enableOcclusion: false,
      });

      const objects = [createObject('a', { x: 0, y: 0, z: 5 })];
      noOcclusionEngine.setSceneSnapshot(objects, createDefaultCamera());

      const noOcclusionState = createEmptyCachedSpatialState();
      await noOcclusionEngine.infer(noOcclusionState, 500);

      expect(Object.keys(noOcclusionState.occlusionStates).length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SPATIAL LABELS
  // ─────────────────────────────────────────────────────────────────────────

  describe('spatial labels', () => {
    it('should generate labels for named objects', async () => {
      const objects = [
        createObject('a', { x: 0, y: 0, z: 0 }, { label: 'Hello World' }),
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      const objLabels = state.labels.filter(l => l.id.startsWith('label-obj-'));
      expect(objLabels.length).toBe(1);
      expect(objLabels[0].text).toBe('Hello World');
      expect(objLabels[0].billboard).toBe(true);
      expect(objLabels[0].targetObjectId).toBe('a');
    });

    it('should not generate labels for unnamed objects', async () => {
      const objects = [
        createObject('a', { x: 0, y: 0, z: 0 }), // No label
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      const objLabels = state.labels.filter(l => l.id.startsWith('label-obj-'));
      expect(objLabels.length).toBe(0);
    });

    it('should generate labels for regions', async () => {
      const objects = Array.from({ length: 5 }, (_, i) =>
        createObject(`obj-${i}`, { x: i * 2, y: 0, z: 0 }),
      );
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      if (state.regions.length > 0) {
        const regionLabels = state.labels.filter(l => l.id.startsWith('label-region-'));
        expect(regionLabels.length).toBeGreaterThan(0);
        expect(regionLabels[0].category).toBe('annotation');
      }
    });

    it('should position labels above objects', async () => {
      const objects = [
        createObject('a', { x: 0, y: 0, z: 0 }, {
          label: 'Test',
          boundsMax: { x: 0.5, y: 2, z: 0.5 },
        }),
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      const objLabels = state.labels.filter(l => l.targetObjectId === 'a');
      if (objLabels.length > 0) {
        // Label Y should be above the object's boundsMax.y
        expect(objLabels[0].position.y).toBeGreaterThan(2);
      }
    });

    it('should disable labels when configured', async () => {
      const noLabelEngine = new SpatialReasoningEngine({
        enableLabels: false,
      });

      const objects = [
        createObject('a', { x: 0, y: 0, z: 0 }, { label: 'Hello' }),
      ];
      noLabelEngine.setSceneSnapshot(objects, createDefaultCamera());

      const noLabelState = createEmptyCachedSpatialState();
      await noLabelEngine.infer(noLabelState, 500);

      expect(noLabelState.labels).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SCENE SUMMARY
  // ─────────────────────────────────────────────────────────────────────────

  describe('scene summary', () => {
    it('should compute scene center of mass', async () => {
      const objects = [
        createObject('a', { x: -5, y: 0, z: 0 }),
        createObject('b', { x: 5, y: 0, z: 0 }),
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      // Center should be near (0, 0, 0)
      expect(state.sceneCenterOfMass.x).toBeCloseTo(0, 0);
    });

    it('should compute scene extents', async () => {
      const objects = [
        createObject('a', { x: 0, y: 0, z: 0 }),
        createObject('b', { x: 10, y: 5, z: 3 }),
      ];
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      // Extents should reflect the span of object bounding boxes
      expect(state.sceneExtents.x).toBeGreaterThan(0);
      expect(state.sceneExtents.y).toBeGreaterThan(0);
    });

    it('should report scene complexity', async () => {
      const objects = Array.from({ length: 100 }, (_, i) =>
        createObject(`obj-${i}`, {
          x: Math.random() * 10,
          y: Math.random() * 10,
          z: Math.random() * 10,
        }),
      );
      engine.setSceneSnapshot(objects, createDefaultCamera());
      await engine.infer(state, 500);

      expect(state.sceneComplexity).toBeGreaterThan(0);
      expect(state.sceneComplexity).toBeLessThanOrEqual(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FACTORY
  // ─────────────────────────────────────────────────────────────────────────

  describe('factory', () => {
    it('createSpatialReasoningEngine should create a configured engine', () => {
      const e = createSpatialReasoningEngine({ nearThreshold: 10 });
      expect(e).toBeInstanceOf(SpatialReasoningEngine);
    });

    it('createEmptyCachedSpatialState should return valid empty state', () => {
      const s = createEmptyCachedSpatialState();
      expect(s.relationships).toEqual([]);
      expect(s.regions).toEqual([]);
      expect(s.occlusionStates).toEqual({});
      expect(s.navigationHints).toEqual([]);
      expect(s.labels).toEqual([]);
      expect(s.objectCount).toBe(0);
      expect(s.sceneComplexity).toBe(0);
      expect(s.sequence).toBe(0);
      expect(s.targetHz).toBe(2);
    });
  });
});
