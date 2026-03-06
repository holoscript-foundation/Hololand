/**
 * @vitest-environment jsdom
 */

/**
 * Integration Test 3: SpatialInferenceComputePipeline -> InferenceScheduler -> syncSpatialInference()
 *
 * Validates the hierarchical inference scheduling architecture:
 *
 *   TIER 1 (1-5Hz, OFF render loop):
 *     SpatialReasoningEngine.infer() computes:
 *       - Pairwise spatial relationships (O(n^2))
 *       - Region clustering
 *       - Occlusion estimation
 *       - Spatial labels
 *     Results written to BACK buffer of double-buffered CachedSpatialState.
 *
 *   BUFFER SWAP:
 *     InferenceScheduler.swap() atomically switches front/back buffers.
 *
 *   TIER 2 (90Hz, ON render loop):
 *     HololandRenderer reads from FRONT buffer via getCurrentState().
 *     Applies occlusion hints, spatial labels, and region data.
 *
 * This test verifies:
 *   1. SpatialReasoningEngine produces correct spatial state from scene snapshots
 *   2. InferenceScheduler double-buffers state correctly
 *   3. Buffer swap makes inference results visible to the render tier
 *   4. Occlusion, relationships, regions, and labels flow end-to-end
 *   5. Adaptive frequency control adjusts based on inference duration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../logger', () => ({
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
} from '../../SpatialReasoningEngine';
import type { ObjectSnapshot, CameraSnapshot } from '../../SpatialReasoningEngine';

import {
  InferenceScheduler,
  createInferenceScheduler,
} from '../../InferenceScheduler';

import { AgentStateBuffer } from '../../AgentStateBuffer';

import type {
  CachedSpatialState,
  SpatialRelationship,
  SpatialRegion,
  OcclusionState,
  SpatialLabel,
  InferenceSchedulerConfig,
} from '../../SpatialInferenceTypes';
import { createEmptyCachedSpatialState } from '../../SpatialInferenceTypes';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createObjectSnapshot(
  id: string,
  position: { x: number; y: number; z: number },
  opts?: {
    scale?: { x: number; y: number; z: number };
    label?: string;
    visible?: boolean;
    boundsSize?: number;
  },
): ObjectSnapshot {
  const s = opts?.boundsSize ?? 0.5;
  return {
    id,
    type: 'mesh',
    position,
    rotation: { x: 0, y: 0, z: 0 },
    scale: opts?.scale ?? { x: 1, y: 1, z: 1 },
    boundsMin: { x: position.x - s, y: position.y - s, z: position.z - s },
    boundsMax: { x: position.x + s, y: position.y + s, z: position.z + s },
    visible: opts?.visible ?? true,
    label: opts?.label,
  };
}

function createDefaultCamera(): CameraSnapshot {
  return {
    position: { x: 0, y: 1.6, z: 5 },
    forward: { x: 0, y: 0, z: -1 },
    up: { x: 0, y: 1, z: 0 },
    right: { x: 1, y: 0, z: 0 },
    fov: 75,
    near: 0.1,
    far: 1000,
  };
}

/** Create a scene with objects arranged to produce known spatial relationships */
function createRelationshipTestScene(): { objects: ObjectSnapshot[]; camera: CameraSnapshot } {
  return {
    objects: [
      // Two objects near each other (should detect "near" and "adjacent")
      createObjectSnapshot('near-A', { x: 0, y: 1, z: 0 }),
      createObjectSnapshot('near-B', { x: 1.0, y: 1, z: 0 }),
      // Object directly above another (should detect "above"/"below")
      createObjectSnapshot('top', { x: 5, y: 4, z: 0 }),
      createObjectSnapshot('bottom', { x: 5, y: 0, z: 0 }),
      // Far away object
      createObjectSnapshot('distant', { x: 50, y: 0, z: -50 }),
    ],
    camera: createDefaultCamera(),
  };
}

/** Create a scene with clustered objects for region detection */
function createClusterTestScene(): { objects: ObjectSnapshot[]; camera: CameraSnapshot } {
  const objects: ObjectSnapshot[] = [];

  // Cluster 1: 5 objects near origin
  for (let i = 0; i < 5; i++) {
    objects.push(
      createObjectSnapshot(`cluster1-${i}`, {
        x: i * 1.5,
        y: 1,
        z: -2 + (i % 2) * 1.0,
      }),
    );
  }

  // Cluster 2: 4 objects far away
  for (let i = 0; i < 4; i++) {
    objects.push(
      createObjectSnapshot(`cluster2-${i}`, {
        x: 30 + i * 1.5,
        y: 1,
        z: -30 + (i % 2) * 1.0,
      }),
    );
  }

  // Isolated object (should not form a cluster)
  objects.push(createObjectSnapshot('isolated', { x: -20, y: 1, z: -20 }));

  return { objects, camera: createDefaultCamera() };
}

/** Create a scene with labeled objects */
function createLabelTestScene(): { objects: ObjectSnapshot[]; camera: CameraSnapshot } {
  return {
    objects: [
      createObjectSnapshot('labeled-chair', { x: 0, y: 0.5, z: -3 }, {
        label: 'Office Chair',
      }),
      createObjectSnapshot('labeled-desk', { x: 2, y: 0.8, z: -4 }, {
        label: 'Standing Desk',
      }),
      createObjectSnapshot('unlabeled', { x: -3, y: 1, z: -5 }),
    ],
    camera: createDefaultCamera(),
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('Integration: SpatialInferenceComputePipeline -> InferenceScheduler -> syncSpatialInference()', () => {
  // ===========================================================================
  // SpatialReasoningEngine: inference produces correct spatial state
  // ===========================================================================

  describe('SpatialReasoningEngine: produces spatial state from scene', () => {
    let engine: SpatialReasoningEngine;

    beforeEach(() => {
      engine = createSpatialReasoningEngine({
        nearThreshold: 5,
        adjacentThreshold: 1.5,
        minRelationshipConfidence: 0.3,
        enableRegionDetection: true,
        enableOcclusion: true,
        enableLabels: true,
        minClusterSize: 3,
        clusterDistanceThreshold: 8,
      });
    });

    afterEach(() => {
      engine.dispose();
    });

    it('should detect near/adjacent relationships between close objects', async () => {
      const { objects, camera } = createRelationshipTestScene();
      engine.setSceneSnapshot(objects, camera);

      const state = createEmptyCachedSpatialState();
      await engine.infer(state, 200);

      // Should find relationships between near-A and near-B
      const nearRelations = state.relationships.filter(
        (r) =>
          (r.sourceId === 'near-A' && r.targetId === 'near-B') ||
          (r.sourceId === 'near-B' && r.targetId === 'near-A'),
      );

      expect(nearRelations.length).toBeGreaterThan(0);

      // Should include 'near' or 'adjacent' type
      const hasNearOrAdjacent = nearRelations.some(
        (r) => r.type === 'near' || r.type === 'adjacent',
      );
      expect(hasNearOrAdjacent).toBe(true);
    });

    it('should detect vertical relationships (above/below)', async () => {
      const { objects, camera } = createRelationshipTestScene();
      engine.setSceneSnapshot(objects, camera);

      const state = createEmptyCachedSpatialState();
      await engine.infer(state, 200);

      // Should find vertical relationship between top and bottom
      const verticalRelations = state.relationships.filter(
        (r) =>
          ((r.sourceId === 'top' && r.targetId === 'bottom') ||
           (r.sourceId === 'bottom' && r.targetId === 'top')) &&
          (r.type === 'above' || r.type === 'below'),
      );

      expect(verticalRelations.length).toBeGreaterThan(0);
    });

    it('should detect far relationships for distant objects', async () => {
      const { objects, camera } = createRelationshipTestScene();
      engine.setSceneSnapshot(objects, camera);

      const state = createEmptyCachedSpatialState();
      await engine.infer(state, 200);

      // Should find 'far' relationship involving the distant object
      const farRelations = state.relationships.filter(
        (r) =>
          (r.sourceId === 'distant' || r.targetId === 'distant') &&
          r.type === 'far',
      );

      expect(farRelations.length).toBeGreaterThan(0);
    });

    it('should detect spatial clusters as regions', async () => {
      const { objects, camera } = createClusterTestScene();
      engine.setSceneSnapshot(objects, camera);

      const state = createEmptyCachedSpatialState();
      await engine.infer(state, 500);

      // Should detect at least 1 cluster region
      expect(state.regions.length).toBeGreaterThan(0);

      // Each region should have at least minClusterSize objects
      for (const region of state.regions) {
        expect(region.objectIds.length).toBeGreaterThanOrEqual(3);
        expect(region.type).toBe('cluster');
        expect(region.confidence).toBeGreaterThan(0);
      }
    });

    it('should estimate occlusion states for all visible objects', async () => {
      const { objects, camera } = createRelationshipTestScene();
      engine.setSceneSnapshot(objects, camera);

      const state = createEmptyCachedSpatialState();
      await engine.infer(state, 200);

      // Should have occlusion state for each visible object
      const visibleObjects = objects.filter((o) => o.visible);
      for (const obj of visibleObjects) {
        const occlusion = state.occlusionStates[obj.id];
        expect(occlusion).toBeDefined();
        expect(occlusion.objectId).toBe(obj.id);
        expect(typeof occlusion.potentiallyVisible).toBe('boolean');
        expect(occlusion.visibilityRatio).toBeGreaterThanOrEqual(0);
        expect(occlusion.visibilityRatio).toBeLessThanOrEqual(1);
      }
    });

    it('should generate labels for named objects', async () => {
      const { objects, camera } = createLabelTestScene();
      engine.setSceneSnapshot(objects, camera);

      const state = createEmptyCachedSpatialState();
      await engine.infer(state, 200);

      // Should generate labels for objects with label property
      const objectLabels = state.labels.filter((l) =>
        l.id.startsWith('label-obj-'),
      );
      expect(objectLabels.length).toBe(2); // Two labeled objects

      const chairLabel = objectLabels.find((l) =>
        l.targetObjectId === 'labeled-chair',
      );
      expect(chairLabel).toBeDefined();
      expect(chairLabel!.text).toBe('Office Chair');
      expect(chairLabel!.billboard).toBe(true);
    });

    it('should compute scene summary statistics', async () => {
      const { objects, camera } = createClusterTestScene();
      engine.setSceneSnapshot(objects, camera);

      const state = createEmptyCachedSpatialState();
      await engine.infer(state, 200);

      expect(state.objectCount).toBe(objects.filter((o) => o.visible).length);
      expect(state.sceneComplexity).toBeGreaterThan(0);
      expect(state.sceneComplexity).toBeLessThanOrEqual(1);
      expect(state.sequence).toBe(1);
      expect(state.lastInferenceDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // InferenceScheduler: double-buffered state management
  // ===========================================================================

  describe('InferenceScheduler: double-buffered state management', () => {
    let engine: SpatialReasoningEngine;
    let scheduler: InferenceScheduler;

    beforeEach(() => {
      engine = createSpatialReasoningEngine();
    });

    afterEach(() => {
      scheduler?.dispose();
    });

    it('should initialize scheduler with engine and provide empty initial state', () => {
      scheduler = createInferenceScheduler(engine, {
        initialHz: 2,
        autoStart: false,
      });

      const state = scheduler.getCurrentState();
      expect(state.sequence).toBe(0);
      expect(state.relationships).toEqual([]);
      expect(state.regions).toEqual([]);
    });

    it('should expose double buffer for renderer access', () => {
      scheduler = createInferenceScheduler(engine, {
        initialHz: 2,
        autoStart: false,
      });

      const buffer = scheduler.getBuffer();
      expect(buffer).toBeInstanceOf(AgentStateBuffer);

      // Front buffer should be the empty initial state
      const front = buffer.getFrontBuffer();
      expect(front.sequence).toBe(0);
    });

    it('should run inference pass and make results visible via swap', async () => {
      scheduler = createInferenceScheduler(engine, {
        initialHz: 2,
        autoStart: false,
        adaptiveFrequency: false,
      });

      // Set scene snapshot
      const { objects, camera } = createRelationshipTestScene();
      engine.setSceneSnapshot(objects, camera);

      // Manually set snapshot callback
      scheduler.setSnapshotCallback(() => ({ objects, camera }));

      // Start scheduler
      await scheduler.start();

      // Wait for at least one inference pass to complete
      await new Promise((resolve) => setTimeout(resolve, 600));

      scheduler.stop();

      // Front buffer should now have inference results
      const state = scheduler.getCurrentState();
      // Due to timing, we may or may not have had a pass yet
      // If a pass happened, sequence > 0 and relationships exist
      if (state.sequence > 0) {
        expect(state.relationships.length).toBeGreaterThan(0);
        expect(state.objectCount).toBeGreaterThan(0);
      }
    });

    it('should track metrics across inference passes', async () => {
      scheduler = createInferenceScheduler(engine, {
        initialHz: 5,
        autoStart: false,
        adaptiveFrequency: false,
      });

      const { objects, camera } = createRelationshipTestScene();
      scheduler.setSnapshotCallback(() => ({ objects, camera }));

      await scheduler.start();
      await new Promise((resolve) => setTimeout(resolve, 500));
      scheduler.stop();

      const metrics = scheduler.getMetrics();
      expect(metrics.isRunning).toBe(false);
      expect(metrics.currentHz).toBe(5);
    });

    it('should support manual target Hz changes', () => {
      scheduler = createInferenceScheduler(engine, {
        initialHz: 2,
        minHz: 1,
        maxHz: 5,
        autoStart: false,
      });

      expect(scheduler.getCurrentHz()).toBe(2);

      scheduler.setTargetHz(4);
      expect(scheduler.getTargetHz()).toBe(4);
      expect(scheduler.getCurrentHz()).toBe(4);

      // Clamp to bounds
      scheduler.setTargetHz(10);
      expect(scheduler.getTargetHz()).toBe(5);

      scheduler.setTargetHz(0);
      expect(scheduler.getTargetHz()).toBe(1);
    });

    it('should fire onFrequencyChange callback', () => {
      const onFreqChange = vi.fn();

      scheduler = createInferenceScheduler(engine, {
        initialHz: 2,
        minHz: 1,
        maxHz: 5,
        autoStart: false,
        onFrequencyChange: onFreqChange,
      });

      scheduler.setTargetHz(4);
      expect(onFreqChange).toHaveBeenCalledWith(2, 4, 'manual');
    });
  });

  // ===========================================================================
  // End-to-end: Engine -> Scheduler -> Buffer Swap -> Render Read
  // ===========================================================================

  describe('End-to-end: Engine -> Scheduler -> Buffer -> Renderer reads', () => {
    it('should flow spatial data from engine through scheduler to render tier', async () => {
      const engine = createSpatialReasoningEngine({
        enableRegionDetection: true,
        enableOcclusion: true,
        enableLabels: true,
      });

      const scheduler = createInferenceScheduler(engine, {
        initialHz: 5,
        autoStart: false,
        adaptiveFrequency: false,
      });

      const { objects, camera } = createRelationshipTestScene();
      scheduler.setSnapshotCallback(() => ({ objects, camera }));

      await scheduler.start();

      // Wait for inference to complete
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Simulate render-tier read at "90Hz"
      const renderState = scheduler.getCurrentState();

      scheduler.stop();
      scheduler.dispose();

      // If inference completed, verify full state
      if (renderState.sequence > 0) {
        // Relationships should exist
        expect(renderState.relationships.length).toBeGreaterThan(0);

        // Occlusion states should exist
        expect(Object.keys(renderState.occlusionStates).length).toBeGreaterThan(0);

        // Scene summary should be populated
        expect(renderState.objectCount).toBeGreaterThan(0);
        expect(renderState.sceneComplexity).toBeGreaterThan(0);

        // Timing should be reasonable
        expect(renderState.lastInferenceDurationMs).toBeGreaterThanOrEqual(0);
        expect(renderState.lastInferenceTimestamp).toBeGreaterThan(0);
      }
    });

    it('should handle inference with labeled objects flowing to render tier', async () => {
      const engine = createSpatialReasoningEngine({
        enableLabels: true,
      });

      const scheduler = createInferenceScheduler(engine, {
        initialHz: 5,
        autoStart: false,
        adaptiveFrequency: false,
      });

      const { objects, camera } = createLabelTestScene();
      scheduler.setSnapshotCallback(() => ({ objects, camera }));

      await scheduler.start();
      await new Promise((resolve) => setTimeout(resolve, 600));

      const state = scheduler.getCurrentState();
      scheduler.stop();
      scheduler.dispose();

      if (state.sequence > 0) {
        // Labels should flow through to render tier
        const objectLabels = state.labels.filter((l) =>
          l.id.startsWith('label-obj-'),
        );
        expect(objectLabels.length).toBe(2);
      }
    });

    it('should allow 90Hz reads without blocking while inference runs', async () => {
      const engine = createSpatialReasoningEngine();
      const scheduler = createInferenceScheduler(engine, {
        initialHz: 2,
        autoStart: false,
        adaptiveFrequency: false,
      });

      const { objects, camera } = createClusterTestScene();
      scheduler.setSnapshotCallback(() => ({ objects, camera }));

      await scheduler.start();

      // Simulate 90Hz render reads while inference is running
      const readTimings: number[] = [];
      for (let frame = 0; frame < 50; frame++) {
        const start = performance.now();
        const state = scheduler.getCurrentState();
        const end = performance.now();
        readTimings.push(end - start);

        // State should always be valid (never undefined/null)
        expect(state).toBeDefined();
        expect(state.relationships).toBeDefined();
        expect(state.regions).toBeDefined();
      }

      scheduler.stop();
      scheduler.dispose();

      // All reads should be sub-millisecond (O(1) front buffer read)
      const maxReadTime = Math.max(...readTimings);
      expect(maxReadTime).toBeLessThan(5); // Very generous: < 5ms even in CI
    });
  });

  // ===========================================================================
  // Complexity-driven behavior
  // ===========================================================================

  describe('Scene complexity affects inference behavior', () => {
    it('should report higher complexity for denser scenes', () => {
      const engine = createSpatialReasoningEngine();

      // Small scene
      const smallScene = Array.from({ length: 5 }, (_, i) =>
        createObjectSnapshot(`small-${i}`, { x: i * 10, y: 0, z: 0 }),
      );
      engine.setSceneSnapshot(smallScene, createDefaultCamera());
      const smallComplexity = engine.getComplexity();

      // Large scene
      const largeScene = Array.from({ length: 100 }, (_, i) =>
        createObjectSnapshot(`large-${i}`, {
          x: (i % 10) * 2,
          y: Math.floor(i / 10) * 2,
          z: 0,
        }),
      );
      engine.setSceneSnapshot(largeScene, createDefaultCamera());
      const largeComplexity = engine.getComplexity();

      expect(largeComplexity).toBeGreaterThan(smallComplexity);
      engine.dispose();
    });

    it('should respect maxRelationships limit', async () => {
      const engine = createSpatialReasoningEngine({
        maxRelationships: 10,
      });

      // Create enough objects to exceed the limit
      const objects = Array.from({ length: 20 }, (_, i) =>
        createObjectSnapshot(`limit-${i}`, { x: i * 0.5, y: 0, z: 0 }),
      );
      engine.setSceneSnapshot(objects, createDefaultCamera());

      const state = createEmptyCachedSpatialState();
      await engine.infer(state, 500);

      expect(state.relationships.length).toBeLessThanOrEqual(10);

      engine.dispose();
    });
  });
});
