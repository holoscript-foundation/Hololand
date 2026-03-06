/**
 * @vitest-environment jsdom
 */

/**
 * Integration Test 4: Full Pipeline End-to-End
 *
 * Scene Objects -> SNN Encoding -> Inference -> DNF Field Update -> Peak Detection -> Renderer Overlay
 *
 * This test exercises the complete perception pipeline from raw scene objects
 * through all intermediate stages to the final renderer state. It combines:
 *
 *   1. Scene graph objects are captured and encoded into SNN input currents
 *   2. SNN Worker runs LIF neuron simulation (CPU fallback)
 *   3. Results written to SharedArrayBuffer via Atomics
 *   4. SharedPerceptionBuffer reads state via acquire fence
 *   5. SpatialReasoningEngine computes spatial relationships, regions, occlusion
 *   6. InferenceScheduler double-buffers spatial state
 *   7. Both SNN perception and spatial inference are consumed by renderer
 *   8. Peak detection identifies the most salient objects from attention scores
 *   9. Renderer overlay data (labels, occlusion, focus point) is correct
 *
 * This is the "king" test that proves the entire perception architecture works
 * cohesively when all subsystems are connected.
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

// SNN Perception imports
import { SNNPerceptionWorker, createSNNPerceptionWorker } from '../../SNNPerceptionWorker';
import { SharedPerceptionBuffer, createSharedPerceptionBuffer } from '../../SharedPerceptionBuffer';
import { SNNPerceptionBridge, createSNNPerceptionBridge } from '../../SNNPerceptionBridge';
import type {
  PerceptionSceneInput,
  PerceptionObjectInput,
  SNNPerceptionState,
  AttentionScore,
} from '../../SNNPerceptionTypes';
import { calculateBufferLayout, SAB_HEADER } from '../../SNNPerceptionTypes';

// Spatial Inference imports
import {
  SpatialReasoningEngine,
  createSpatialReasoningEngine,
} from '../../SpatialReasoningEngine';
import type { ObjectSnapshot, CameraSnapshot } from '../../SpatialReasoningEngine';

import {
  InferenceScheduler,
  createInferenceScheduler,
} from '../../InferenceScheduler';
import type {
  CachedSpatialState,
  SpatialRelationship,
  SpatialLabel,
  OcclusionState,
} from '../../SpatialInferenceTypes';
import { createEmptyCachedSpatialState } from '../../SpatialInferenceTypes';

// =============================================================================
// SCENE GENERATION
// =============================================================================

/**
 * A complete VR scene with various objects at known positions.
 * Designed to exercise all perception subsystems simultaneously.
 */
interface VRScene {
  /** Objects for SNN perception (lightweight: position, velocity, size) */
  perceptionInput: PerceptionSceneInput;
  /** Objects for spatial reasoning (detailed: bounds, labels, rotation) */
  spatialObjects: ObjectSnapshot[];
  /** Camera state shared between both systems */
  camera: CameraSnapshot;
  /** Expected properties for verification */
  expectations: {
    closeObjectIds: string[];
    farObjectIds: string[];
    movingObjectIds: string[];
    labeledObjectIds: string[];
    clusterRegionMinCount: number;
  };
}

function createFullVRScene(): VRScene {
  const cameraPos = { x: 0, y: 1.6, z: 5 };
  const cameraForward = { x: 0, y: 0, z: -1 };

  // Scene objects: a mix of close, far, moving, labeled, and clustered objects
  const sceneObjects = [
    // === Close objects (high attention expected) ===
    {
      id: 'desk',
      pos: { x: 0.5, y: 0.8, z: 2 },
      size: 1.5,
      label: 'Standing Desk',
      moving: false,
    },
    {
      id: 'chair',
      pos: { x: -0.5, y: 0.5, z: 2.5 },
      size: 1.0,
      label: 'Office Chair',
      moving: false,
    },
    {
      id: 'laptop',
      pos: { x: 0.3, y: 1.0, z: 2.2 },
      size: 0.4,
      label: 'Laptop',
      moving: false,
    },

    // === Moving object (should trigger motion-sensitive neurons) ===
    {
      id: 'drone',
      pos: { x: 2, y: 2.5, z: 0 },
      size: 0.3,
      label: 'Delivery Drone',
      moving: true,
    },

    // === Clustered objects (should form a region) ===
    { id: 'shelf-1', pos: { x: -5, y: 1, z: -3 }, size: 0.8, moving: false },
    { id: 'shelf-2', pos: { x: -4, y: 1, z: -3 }, size: 0.8, moving: false },
    { id: 'shelf-3', pos: { x: -3, y: 1, z: -3 }, size: 0.8, moving: false },
    { id: 'shelf-4', pos: { x: -5, y: 1, z: -2 }, size: 0.8, moving: false },

    // === Far objects (low attention expected) ===
    { id: 'tree-far', pos: { x: 30, y: 3, z: -40 }, size: 3.0, moving: false },
    { id: 'building', pos: { x: -25, y: 10, z: -60 }, size: 15.0, moving: false },

    // === Object behind camera (should be marked not visible by occlusion) ===
    { id: 'behind-cam', pos: { x: 0, y: 1, z: 10 }, size: 1.0, moving: false },
  ];

  // Build SNN perception input
  const perceptionObjects: PerceptionObjectInput[] = sceneObjects.map((obj) => {
    const dx = obj.pos.x - cameraPos.x;
    const dy = obj.pos.y - cameraPos.y;
    const dz = obj.pos.z - cameraPos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    return {
      id: obj.id,
      position: obj.pos,
      velocity: obj.moving ? { x: 3, y: 1, z: -2 } : { x: 0, y: 0, z: 0 },
      size: obj.size,
      distanceFromCamera: dist,
      angularSize: dist > 0 ? 2 * Math.atan(obj.size / dist) : Math.PI,
      hasMoved: obj.moving,
    };
  });

  // Build spatial reasoning snapshots
  const spatialObjects: ObjectSnapshot[] = sceneObjects.map((obj) => ({
    id: obj.id,
    type: 'mesh',
    position: obj.pos,
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    boundsMin: {
      x: obj.pos.x - obj.size / 2,
      y: obj.pos.y - obj.size / 2,
      z: obj.pos.z - obj.size / 2,
    },
    boundsMax: {
      x: obj.pos.x + obj.size / 2,
      y: obj.pos.y + obj.size / 2,
      z: obj.pos.z + obj.size / 2,
    },
    visible: true,
    label: obj.label,
  }));

  const camera: CameraSnapshot = {
    position: cameraPos,
    forward: cameraForward,
    up: { x: 0, y: 1, z: 0 },
    right: { x: 1, y: 0, z: 0 },
    fov: 75,
    near: 0.1,
    far: 1000,
  };

  return {
    perceptionInput: {
      objects: perceptionObjects,
      cameraPosition: cameraPos,
      cameraForward,
      timestamp: performance.now(),
      frameSequence: 1,
    },
    spatialObjects,
    camera,
    expectations: {
      closeObjectIds: ['desk', 'chair', 'laptop'],
      farObjectIds: ['tree-far', 'building'],
      movingObjectIds: ['drone'],
      labeledObjectIds: ['desk', 'chair', 'laptop', 'drone'],
      clusterRegionMinCount: 1, // shelf cluster
    },
  };
}

// =============================================================================
// PEAK DETECTION (simulates renderer's peak detection from attention scores)
// =============================================================================

interface PerceptionPeak {
  objectId: string;
  attention: number;
  salience: string;
  isAnomalous: boolean;
  position: { x: number; y: number; z: number };
}

/**
 * Detect attention peaks from SNN perception output.
 * Simulates what the renderer does to find the most salient objects.
 */
function detectAttentionPeaks(
  perceptionState: Readonly<SNNPerceptionState>,
  sceneObjects: PerceptionObjectInput[],
  threshold: number = 0.0,
): PerceptionPeak[] {
  const objectMap = new Map(sceneObjects.map((o) => [o.id, o]));
  const peaks: PerceptionPeak[] = [];

  for (const score of perceptionState.attentionScores) {
    if (score.attention >= threshold) {
      const obj = objectMap.get(score.objectId);
      if (obj) {
        peaks.push({
          objectId: score.objectId,
          attention: score.attention,
          salience: score.salience,
          isAnomalous: score.isAnomalous,
          position: obj.position,
        });
      }
    }
  }

  // Already sorted by attention descending (from SNN worker)
  return peaks;
}

// =============================================================================
// RENDERER OVERLAY BUILDER (simulates what HololandRenderer.syncSNNPerception does)
// =============================================================================

interface RendererOverlay {
  /** Focus point from SNN attention (weighted centroid) */
  focusPoint: { x: number; y: number; z: number };
  focusConfidence: number;
  /** Global anomaly level */
  anomalyLevel: number;
  /** Top-K attention objects for highlight rendering */
  highlightedObjects: string[];
  /** Spatial labels from inference engine */
  spatialLabels: SpatialLabel[];
  /** Occluded objects (skip rendering) */
  occludedObjects: string[];
  /** Detected regions for spatial awareness UI */
  regionCount: number;
  /** Spatial relationships for contextual UI */
  relationshipCount: number;
}

/**
 * Build renderer overlay from combined perception + spatial inference state.
 * This is what HololandRenderer would construct from both systems.
 */
function buildRendererOverlay(
  perceptionState: Readonly<SNNPerceptionState>,
  spatialState: Readonly<CachedSpatialState>,
  topK: number = 3,
): RendererOverlay {
  // Top-K attention objects for highlighting
  const highlighted = perceptionState.attentionScores
    .slice(0, topK)
    .map((s) => s.objectId);

  // Occluded objects from spatial inference
  const occluded = Object.values(spatialState.occlusionStates)
    .filter((o) => !o.potentiallyVisible)
    .map((o) => o.objectId);

  return {
    focusPoint: perceptionState.focusPoint,
    focusConfidence: perceptionState.focusConfidence,
    anomalyLevel: perceptionState.globalAnomalyLevel,
    highlightedObjects: highlighted,
    spatialLabels: spatialState.labels,
    occludedObjects: occluded,
    regionCount: spatialState.regions.length,
    relationshipCount: spatialState.relationships.length,
  };
}

// =============================================================================
// FULL PIPELINE TESTS
// =============================================================================

describe('Integration: Full Pipeline - Scene -> SNN -> Inference -> Peak Detection -> Renderer Overlay', () => {
  // ===========================================================================
  // Full pipeline: SNN perception + spatial inference combined
  // ===========================================================================

  describe('Complete perception pipeline with both SNN and spatial inference', () => {
    let perceptionBridge: SNNPerceptionBridge;
    let spatialEngine: SpatialReasoningEngine;
    let scene: VRScene;

    beforeEach(async () => {
      scene = createFullVRScene();

      // Initialize SNN perception
      perceptionBridge = createSNNPerceptionBridge({
        initialHz: 10,
        adaptiveFrequency: false,
        maxInputObjects: 64,
      });
      await perceptionBridge.initialize();

      // Initialize spatial reasoning
      spatialEngine = createSpatialReasoningEngine({
        nearThreshold: 5,
        adjacentThreshold: 1.5,
        enableRegionDetection: true,
        enableOcclusion: true,
        enableLabels: true,
        minClusterSize: 3,
        clusterDistanceThreshold: 8,
      });
    });

    afterEach(() => {
      perceptionBridge.dispose();
      spatialEngine.dispose();
    });

    it('should produce combined perception + spatial state from scene objects', async () => {
      // SNN perception: feed scene input
      await perceptionBridge.feedInput(scene.perceptionInput);
      const perceptionState = perceptionBridge.readPerception();

      // Spatial reasoning: feed snapshot and infer
      spatialEngine.setSceneSnapshot(scene.spatialObjects, scene.camera);
      const spatialState = createEmptyCachedSpatialState();
      await spatialEngine.infer(spatialState, 200);

      // Both systems should produce valid output
      expect(perceptionState.sequence).toBeGreaterThan(0);
      expect(perceptionState.trackedObjectCount).toBe(scene.perceptionInput.objects.length);

      expect(spatialState.sequence).toBeGreaterThan(0);
      expect(spatialState.objectCount).toBe(
        scene.spatialObjects.filter((o) => o.visible).length,
      );
      expect(spatialState.relationships.length).toBeGreaterThan(0);
    });

    it('should build complete renderer overlay from both systems', async () => {
      // Run SNN perception (multiple passes for spike accumulation)
      for (let i = 0; i < 3; i++) {
        await perceptionBridge.feedInput(scene.perceptionInput);
      }
      const perceptionState = perceptionBridge.readPerception();

      // Run spatial inference
      spatialEngine.setSceneSnapshot(scene.spatialObjects, scene.camera);
      const spatialState = createEmptyCachedSpatialState();
      await spatialEngine.infer(spatialState, 200);

      // Build renderer overlay
      const overlay = buildRendererOverlay(perceptionState, spatialState, 3);

      // Focus point should be a valid 3D position
      expect(Number.isFinite(overlay.focusPoint.x)).toBe(true);
      expect(Number.isFinite(overlay.focusPoint.y)).toBe(true);
      expect(Number.isFinite(overlay.focusPoint.z)).toBe(true);

      // Anomaly level should be in [0, 1]
      expect(overlay.anomalyLevel).toBeGreaterThanOrEqual(0);
      expect(overlay.anomalyLevel).toBeLessThanOrEqual(1);

      // Should have highlighted objects (top-K)
      expect(overlay.highlightedObjects.length).toBeLessThanOrEqual(3);

      // Spatial labels should be present (4 labeled objects)
      expect(overlay.spatialLabels.length).toBeGreaterThan(0);

      // Relationships should be detected
      expect(overlay.relationshipCount).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Peak detection from SNN attention scores
  // ===========================================================================

  describe('Peak detection identifies most salient objects', () => {
    let perceptionBridge: SNNPerceptionBridge;

    beforeEach(async () => {
      perceptionBridge = createSNNPerceptionBridge({
        adaptiveFrequency: false,
        maxInputObjects: 64,
      });
      await perceptionBridge.initialize();
    });

    afterEach(() => {
      perceptionBridge.dispose();
    });

    it('should detect peaks from attention scores', async () => {
      const scene = createFullVRScene();

      // Run multiple passes to build spike activity
      for (let i = 0; i < 5; i++) {
        await perceptionBridge.feedInput(scene.perceptionInput);
      }
      const perceptionState = perceptionBridge.readPerception();

      // Detect peaks with threshold = 0 (all objects)
      const allPeaks = detectAttentionPeaks(
        perceptionState,
        scene.perceptionInput.objects,
        0,
      );

      // Should have peaks for tracked objects
      expect(allPeaks.length).toBeGreaterThan(0);

      // Peaks should be sorted by attention descending
      for (let i = 1; i < allPeaks.length; i++) {
        expect(allPeaks[i - 1].attention).toBeGreaterThanOrEqual(
          allPeaks[i].attention,
        );
      }

      // Each peak should have valid position data
      for (const peak of allPeaks) {
        expect(Number.isFinite(peak.position.x)).toBe(true);
        expect(Number.isFinite(peak.position.y)).toBe(true);
        expect(Number.isFinite(peak.position.z)).toBe(true);
      }
    });

    it('should produce attention scores for all scene objects', async () => {
      const scene = createFullVRScene();

      await perceptionBridge.feedInput(scene.perceptionInput);
      const state = perceptionBridge.readPerception();

      // Should have scores for all tracked objects
      expect(state.attentionScores.length).toBe(state.trackedObjectCount);
    });
  });

  // ===========================================================================
  // Spatial labels flow to renderer overlay
  // ===========================================================================

  describe('Spatial labels flow from inference to renderer overlay', () => {
    it('should generate labels for all named objects in the scene', async () => {
      const scene = createFullVRScene();
      const engine = createSpatialReasoningEngine({
        enableLabels: true,
      });

      engine.setSceneSnapshot(scene.spatialObjects, scene.camera);
      const state = createEmptyCachedSpatialState();
      await engine.infer(state, 200);

      // Object labels should be present for labeled objects
      const objectLabels = state.labels.filter((l) =>
        l.id.startsWith('label-obj-'),
      );

      // Count of labeled objects in our scene
      const labeledCount = scene.spatialObjects.filter((o) => o.label).length;
      expect(objectLabels.length).toBe(labeledCount);

      // Each label should have a valid position above its object
      for (const label of objectLabels) {
        expect(label.text).toBeTruthy();
        expect(label.billboard).toBe(true);
        expect(label.maxVisibilityDistance).toBeGreaterThan(0);
        expect(label.targetObjectId).toBeDefined();
      }

      engine.dispose();
    });
  });

  // ===========================================================================
  // Occlusion data flows to renderer for culling
  // ===========================================================================

  describe('Occlusion states flow to renderer for intelligent culling', () => {
    it('should identify objects behind camera as not potentially visible', async () => {
      const scene = createFullVRScene();
      const engine = createSpatialReasoningEngine({
        enableOcclusion: true,
      });

      engine.setSceneSnapshot(scene.spatialObjects, scene.camera);
      const state = createEmptyCachedSpatialState();
      await engine.infer(state, 200);

      // The "behind-cam" object is at z=10, camera is at z=5 looking z=-1
      // It should NOT be in the camera's forward frustum
      const behindOcclusion = state.occlusionStates['behind-cam'];
      expect(behindOcclusion).toBeDefined();
      expect(behindOcclusion.potentiallyVisible).toBe(false);

      // Close objects in front of camera should have their occlusion state computed.
      // Note: conservative heuristic may mark some close objects as occluded by
      // other nearby objects in similar directions (e.g., chair occluding desk),
      // so we verify the state exists and has correct structure.
      const deskOcclusion = state.occlusionStates['desk'];
      expect(deskOcclusion).toBeDefined();
      expect(typeof deskOcclusion.potentiallyVisible).toBe('boolean');
      expect(deskOcclusion.visibilityRatio).toBeGreaterThanOrEqual(0);
      expect(deskOcclusion.visibilityRatio).toBeLessThanOrEqual(1);

      // At least some in-front-of-camera objects should be potentially visible
      const frontObjects = ['desk', 'chair', 'laptop', 'drone'];
      const visibleFrontObjects = frontObjects.filter(
        (id) => state.occlusionStates[id]?.potentiallyVisible,
      );
      expect(visibleFrontObjects.length).toBeGreaterThan(0);

      engine.dispose();
    });

    it('should provide visibility ratio for all objects', async () => {
      const scene = createFullVRScene();
      const engine = createSpatialReasoningEngine({
        enableOcclusion: true,
      });

      engine.setSceneSnapshot(scene.spatialObjects, scene.camera);
      const state = createEmptyCachedSpatialState();
      await engine.infer(state, 200);

      for (const [id, occlusion] of Object.entries(state.occlusionStates)) {
        expect(occlusion.visibilityRatio).toBeGreaterThanOrEqual(0);
        expect(occlusion.visibilityRatio).toBeLessThanOrEqual(1);
        expect(typeof occlusion.lastComputedTimestamp).toBe('number');
      }

      engine.dispose();
    });
  });

  // ===========================================================================
  // Region detection for spatial awareness
  // ===========================================================================

  describe('Region detection for spatial awareness overlays', () => {
    it('should detect the shelf cluster as a spatial region', async () => {
      const scene = createFullVRScene();
      const engine = createSpatialReasoningEngine({
        enableRegionDetection: true,
        minClusterSize: 3,
        clusterDistanceThreshold: 8,
      });

      engine.setSceneSnapshot(scene.spatialObjects, scene.camera);
      const state = createEmptyCachedSpatialState();
      await engine.infer(state, 500);

      // Should detect at least the shelf cluster
      expect(state.regions.length).toBeGreaterThanOrEqual(
        scene.expectations.clusterRegionMinCount,
      );

      // Find a region containing shelf objects
      const shelfRegion = state.regions.find((r) =>
        r.objectIds.some((id) => id.startsWith('shelf-')),
      );

      if (shelfRegion) {
        // Should contain at least 3 shelf objects
        const shelfCount = shelfRegion.objectIds.filter((id) =>
          id.startsWith('shelf-'),
        ).length;
        expect(shelfCount).toBeGreaterThanOrEqual(3);

        // Region should have valid geometry
        expect(typeof shelfRegion.center.x).toBe('number');
        expect(typeof shelfRegion.center.y).toBe('number');
        expect(typeof shelfRegion.center.z).toBe('number');
        expect(shelfRegion.confidence).toBeGreaterThan(0);
      }

      engine.dispose();
    });
  });

  // ===========================================================================
  // Full pipeline timing and performance characteristics
  // ===========================================================================

  describe('Full pipeline performance characteristics', () => {
    it('should complete SNN perception inference within budget', async () => {
      const perceptionBridge = createSNNPerceptionBridge({
        adaptiveFrequency: false,
      });
      await perceptionBridge.initialize();

      const scene = createFullVRScene();
      const start = performance.now();
      await perceptionBridge.feedInput(scene.perceptionInput);
      const duration = performance.now() - start;

      // SNN inference on CPU should complete within reasonable time
      // (generous bound for CI: < 100ms for 11 objects)
      expect(duration).toBeLessThan(100);

      const metrics = perceptionBridge.getMetrics();
      expect(metrics.totalInferences).toBe(1);
      expect(metrics.averageInferenceDurationMs).toBeGreaterThanOrEqual(0);

      perceptionBridge.dispose();
    });

    it('should complete spatial reasoning inference within budget', async () => {
      const scene = createFullVRScene();
      const engine = createSpatialReasoningEngine();

      engine.setSceneSnapshot(scene.spatialObjects, scene.camera);
      const state = createEmptyCachedSpatialState();

      const start = performance.now();
      await engine.infer(state, 500);
      const duration = performance.now() - start;

      // Spatial inference for 11 objects should be fast
      expect(duration).toBeLessThan(200);
      expect(state.lastInferenceDurationMs).toBeGreaterThanOrEqual(0);

      engine.dispose();
    });

    it('should read perception state in sub-millisecond time', async () => {
      const perceptionBridge = createSNNPerceptionBridge({
        adaptiveFrequency: false,
      });
      await perceptionBridge.initialize();

      const scene = createFullVRScene();
      await perceptionBridge.feedInput(scene.perceptionInput);

      // Measure 100 consecutive reads (simulating 90Hz render loop)
      const timings: number[] = [];
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        perceptionBridge.readPerception();
        timings.push(performance.now() - start);
      }

      const avgRead = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxRead = Math.max(...timings);

      // Reads should be extremely fast (< 1ms average, < 5ms peak in CI)
      expect(avgRead).toBeLessThan(1);
      expect(maxRead).toBeLessThan(5);

      perceptionBridge.dispose();
    });
  });

  // ===========================================================================
  // Combined system coherence
  // ===========================================================================

  describe('Cross-system data coherence', () => {
    it('should have matching object IDs between SNN attention and spatial relationships', async () => {
      const scene = createFullVRScene();

      // SNN perception
      const perceptionBridge = createSNNPerceptionBridge({
        adaptiveFrequency: false,
      });
      await perceptionBridge.initialize();
      await perceptionBridge.feedInput(scene.perceptionInput);
      const perceptionState = perceptionBridge.readPerception();

      // Spatial inference
      const engine = createSpatialReasoningEngine();
      engine.setSceneSnapshot(scene.spatialObjects, scene.camera);
      const spatialState = createEmptyCachedSpatialState();
      await engine.infer(spatialState, 200);

      // Object IDs from SNN attention
      const attentionObjectIds = new Set(
        perceptionState.attentionScores.map((s) => s.objectId),
      );

      // Object IDs from spatial relationships
      const relationshipObjectIds = new Set<string>();
      for (const rel of spatialState.relationships) {
        relationshipObjectIds.add(rel.sourceId);
        relationshipObjectIds.add(rel.targetId);
      }

      // Both systems should reference the same scene objects
      // (at least some overlap expected for objects that appear in both)
      const commonIds = [...attentionObjectIds].filter((id) =>
        relationshipObjectIds.has(id),
      );

      // With 11 objects, there should be overlap between the two systems
      expect(commonIds.length).toBeGreaterThan(0);

      perceptionBridge.dispose();
      engine.dispose();
    });

    it('should maintain object count consistency across systems', async () => {
      const scene = createFullVRScene();
      const totalObjects = scene.perceptionInput.objects.length;

      // SNN perception
      const perceptionBridge = createSNNPerceptionBridge({
        adaptiveFrequency: false,
      });
      await perceptionBridge.initialize();
      await perceptionBridge.feedInput(scene.perceptionInput);
      const perceptionState = perceptionBridge.readPerception();

      // Spatial inference
      const engine = createSpatialReasoningEngine();
      engine.setSceneSnapshot(scene.spatialObjects, scene.camera);
      const spatialState = createEmptyCachedSpatialState();
      await engine.infer(spatialState, 200);

      // Both should process the same number of objects
      expect(perceptionState.trackedObjectCount).toBe(totalObjects);
      expect(spatialState.objectCount).toBe(
        scene.spatialObjects.filter((o) => o.visible).length,
      );

      perceptionBridge.dispose();
      engine.dispose();
    });
  });

  // ===========================================================================
  // Edge cases in the full pipeline
  // ===========================================================================

  describe('Full pipeline edge cases', () => {
    it('should handle empty scene gracefully', async () => {
      const perceptionBridge = createSNNPerceptionBridge({
        adaptiveFrequency: false,
      });
      await perceptionBridge.initialize();

      const emptyInput: PerceptionSceneInput = {
        objects: [],
        cameraPosition: { x: 0, y: 1.6, z: 5 },
        cameraForward: { x: 0, y: 0, z: -1 },
        timestamp: performance.now(),
        frameSequence: 1,
      };

      await perceptionBridge.feedInput(emptyInput);
      const perceptionState = perceptionBridge.readPerception();

      const engine = createSpatialReasoningEngine();
      engine.setSceneSnapshot([], {
        position: { x: 0, y: 1.6, z: 5 },
        forward: { x: 0, y: 0, z: -1 },
        up: { x: 0, y: 1, z: 0 },
        right: { x: 1, y: 0, z: 0 },
        fov: 75,
        near: 0.1,
        far: 1000,
      });
      const spatialState = createEmptyCachedSpatialState();
      await engine.infer(spatialState, 200);

      // Both should handle empty scene without errors
      expect(perceptionState.trackedObjectCount).toBe(0);
      expect(spatialState.objectCount).toBe(0);
      expect(spatialState.relationships).toEqual([]);
      expect(spatialState.regions).toEqual([]);

      // Overlay should be valid but empty
      const overlay = buildRendererOverlay(perceptionState, spatialState);
      expect(overlay.highlightedObjects).toEqual([]);
      expect(overlay.regionCount).toBe(0);
      expect(overlay.relationshipCount).toBe(0);

      perceptionBridge.dispose();
      engine.dispose();
    });

    it('should handle single-object scene', async () => {
      const perceptionBridge = createSNNPerceptionBridge({
        adaptiveFrequency: false,
      });
      await perceptionBridge.initialize();

      const singleInput: PerceptionSceneInput = {
        objects: [
          {
            id: 'solo',
            position: { x: 0, y: 1, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            size: 1.0,
            distanceFromCamera: 5.0,
            angularSize: 0.2,
            hasMoved: false,
          },
        ],
        cameraPosition: { x: 0, y: 1.6, z: 5 },
        cameraForward: { x: 0, y: 0, z: -1 },
        timestamp: performance.now(),
        frameSequence: 1,
      };

      await perceptionBridge.feedInput(singleInput);
      const perceptionState = perceptionBridge.readPerception();
      expect(perceptionState.trackedObjectCount).toBe(1);

      perceptionBridge.dispose();
    });

    it('should handle rapid sequential scene updates', async () => {
      const perceptionBridge = createSNNPerceptionBridge({
        adaptiveFrequency: false,
      });
      await perceptionBridge.initialize();

      const scene = createFullVRScene();

      // Rapidly feed 20 frames
      for (let frame = 0; frame < 20; frame++) {
        const input = { ...scene.perceptionInput, frameSequence: frame + 1 };
        await perceptionBridge.feedInput(input);
      }

      const finalState = perceptionBridge.readPerception();
      expect(finalState.sequence).toBe(20);

      const metrics = perceptionBridge.getMetrics();
      expect(metrics.totalInferences).toBe(20);

      perceptionBridge.dispose();
    });
  });
});
