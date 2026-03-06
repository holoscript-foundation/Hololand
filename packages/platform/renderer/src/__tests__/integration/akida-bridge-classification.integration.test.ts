/**
 * @vitest-environment jsdom
 */

/**
 * Integration Test 2: Akida Bridge Mock -> Classification Ingestion -> Entity Creation -> Renderer State
 *
 * This test simulates the Akida neuromorphic classification pipeline:
 *   1. Mock Akida bridge produces classification results (object labels + confidence)
 *   2. Classifications are ingested into the SNN perception system as scene objects
 *   3. The SNN perception worker encodes classifications into input currents
 *   4. Inference produces attention scores reflecting classification confidence
 *   5. The renderer state (via SNNPerceptionBridge) reflects entity-level attention
 *
 * The Akida bridge is a hypothetical neuromorphic accelerator interface that
 * provides low-latency object classification. In production, this would run
 * on hardware like BrainChip's Akida processor. Here we mock the classification
 * output and verify it correctly flows through the perception pipeline into
 * entity-level renderer state.
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

import { SNNPerceptionBridge, createSNNPerceptionBridge } from '../../SNNPerceptionBridge';
import { SNNPerceptionWorker, createSNNPerceptionWorker } from '../../SNNPerceptionWorker';
import { SharedPerceptionBuffer, createSharedPerceptionBuffer } from '../../SharedPerceptionBuffer';
import type {
  PerceptionSceneInput,
  PerceptionObjectInput,
  SNNPerceptionState,
} from '../../SNNPerceptionTypes';
import { calculateBufferLayout } from '../../SNNPerceptionTypes';

// =============================================================================
// AKIDA BRIDGE MOCK
// =============================================================================

/**
 * Simulated Akida classification result from neuromorphic hardware.
 */
interface AkidaClassification {
  /** Detected object bounding box center */
  position: { x: number; y: number; z: number };
  /** Classification label */
  label: string;
  /** Classification confidence (0-1) */
  confidence: number;
  /** Unique tracking ID assigned by Akida */
  trackingId: string;
  /** Whether the object is newly detected this frame */
  isNewDetection: boolean;
  /** Estimated object size from depth estimation */
  estimatedSize: number;
}

/**
 * Mock Akida bridge that simulates neuromorphic classification output.
 *
 * In production, this would interface with BrainChip Akida hardware
 * via USB/PCIe, receiving spike-based classification results at low latency.
 */
class MockAkidaBridge {
  private frameCount = 0;
  private persistentEntities: Map<string, AkidaClassification> = new Map();

  /**
   * Simulate a classification frame from Akida hardware.
   * Returns classified objects with confidence scores.
   */
  classify(rawInputObjects: Array<{
    id: string;
    position: { x: number; y: number; z: number };
    size: number;
  }>): AkidaClassification[] {
    this.frameCount++;
    const results: AkidaClassification[] = [];

    for (const input of rawInputObjects) {
      // Simulate classification with varying confidence
      const label = this.classifyByPosition(input.position);
      const confidence = this.computeConfidence(input.position, input.size);
      const isNew = !this.persistentEntities.has(input.id);

      const classification: AkidaClassification = {
        position: input.position,
        label,
        confidence,
        trackingId: `akida-${input.id}`,
        isNewDetection: isNew,
        estimatedSize: input.size * (0.9 + Math.random() * 0.2), // slight noise
      };

      this.persistentEntities.set(input.id, classification);
      results.push(classification);
    }

    return results;
  }

  /**
   * Convert Akida classifications into PerceptionObjectInput for the SNN pipeline.
   * This is the bridge between neuromorphic classification and SNN attention.
   */
  toPerceptionInput(
    classifications: AkidaClassification[],
    cameraPosition: { x: number; y: number; z: number },
  ): PerceptionSceneInput {
    const objects: PerceptionObjectInput[] = classifications.map((c) => {
      const dx = c.position.x - cameraPosition.x;
      const dy = c.position.y - cameraPosition.y;
      const dz = c.position.z - cameraPosition.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      return {
        id: c.trackingId,
        position: c.position,
        velocity: { x: 0, y: 0, z: 0 },
        size: c.estimatedSize,
        distanceFromCamera: dist,
        angularSize: dist > 0 ? 2 * Math.atan(c.estimatedSize / dist) : Math.PI,
        hasMoved: c.isNewDetection, // New detections count as "moved"
      };
    });

    return {
      objects,
      cameraPosition,
      cameraForward: { x: 0, y: 0, z: -1 },
      timestamp: performance.now(),
      frameSequence: this.frameCount,
    };
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  getEntityCount(): number {
    return this.persistentEntities.size;
  }

  private classifyByPosition(pos: { x: number; y: number; z: number }): string {
    // Simple heuristic classification based on position
    if (pos.y > 2) return 'ceiling_light';
    if (pos.y < 0.3) return 'floor_object';
    if (Math.abs(pos.x) > 5) return 'wall_decoration';
    return 'furniture';
  }

  private computeConfidence(
    pos: { x: number; y: number; z: number },
    size: number,
  ): number {
    // Larger objects closer to center have higher confidence
    const distFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    const sizeFactor = Math.min(size / 2.0, 1.0);
    const distFactor = Math.max(0, 1.0 - distFromCenter / 20.0);
    return Math.min(1.0, sizeFactor * 0.5 + distFactor * 0.5);
  }
}

// =============================================================================
// ENTITY CREATION TRACKER
// =============================================================================

/**
 * Tracks entities created from Akida classifications.
 * Simulates what the renderer would do when receiving new classified entities.
 */
class EntityTracker {
  private entities: Map<string, {
    id: string;
    label: string;
    confidence: number;
    attention: number;
    salience: string;
    position: { x: number; y: number; z: number };
    created: number;
    lastUpdated: number;
  }> = new Map();

  /**
   * Ingest classified entities and their perception state into the renderer.
   */
  ingestClassificationsWithPerception(
    classifications: AkidaClassification[],
    perceptionState: Readonly<SNNPerceptionState>,
  ): void {
    const attentionMap = new Map(
      perceptionState.attentionScores.map((s) => [s.objectId, s]),
    );

    for (const c of classifications) {
      const attention = attentionMap.get(c.trackingId);

      this.entities.set(c.trackingId, {
        id: c.trackingId,
        label: c.label,
        confidence: c.confidence,
        attention: attention?.attention ?? 0,
        salience: attention?.salience ?? 'background',
        position: c.position,
        created: this.entities.has(c.trackingId)
          ? this.entities.get(c.trackingId)!.created
          : performance.now(),
        lastUpdated: performance.now(),
      });
    }
  }

  getEntity(id: string) {
    return this.entities.get(id);
  }

  getAllEntities() {
    return Array.from(this.entities.values());
  }

  getEntitiesBySalience(salience: string) {
    return this.getAllEntities().filter((e) => e.salience === salience);
  }

  getHighAttentionEntities(threshold: number = 0.5) {
    return this.getAllEntities().filter((e) => e.attention >= threshold);
  }

  getEntityCount() {
    return this.entities.size;
  }
}

// =============================================================================
// TESTS
// =============================================================================

describe('Integration: Akida Bridge -> Classification -> Entity Creation -> Renderer State', () => {
  let akidaBridge: MockAkidaBridge;
  let perceptionBridge: SNNPerceptionBridge;
  let entityTracker: EntityTracker;

  beforeEach(async () => {
    akidaBridge = new MockAkidaBridge();
    entityTracker = new EntityTracker();

    perceptionBridge = createSNNPerceptionBridge({
      initialHz: 10,
      adaptiveFrequency: false,
      maxInputObjects: 64,
    });
    await perceptionBridge.initialize();
  });

  afterEach(() => {
    perceptionBridge.dispose();
  });

  // ===========================================================================
  // Classification -> SNN -> Entity pipeline
  // ===========================================================================

  describe('Akida classification flows through SNN to entity state', () => {
    it('should classify raw scene objects via Akida bridge', () => {
      const rawObjects = [
        { id: 'chair-1', position: { x: 1, y: 0.5, z: -3 }, size: 0.8 },
        { id: 'lamp-1', position: { x: 0, y: 2.5, z: -2 }, size: 0.3 },
        { id: 'table-1', position: { x: 0, y: 0.8, z: -4 }, size: 1.5 },
      ];

      const classifications = akidaBridge.classify(rawObjects);
      expect(classifications).toHaveLength(3);

      for (const c of classifications) {
        expect(c.confidence).toBeGreaterThan(0);
        expect(c.confidence).toBeLessThanOrEqual(1);
        expect(c.label).toBeTruthy();
        expect(c.trackingId).toMatch(/^akida-/);
      }
    });

    it('should convert Akida classifications to SNN perception input', () => {
      const rawObjects = [
        { id: 'obj-1', position: { x: 2, y: 1, z: -5 }, size: 1.0 },
        { id: 'obj-2', position: { x: -3, y: 0.2, z: -8 }, size: 0.5 },
      ];

      const classifications = akidaBridge.classify(rawObjects);
      const cameraPos = { x: 0, y: 1.6, z: 0 };
      const sceneInput = akidaBridge.toPerceptionInput(classifications, cameraPos);

      expect(sceneInput.objects).toHaveLength(2);
      expect(sceneInput.cameraPosition).toEqual(cameraPos);

      for (const obj of sceneInput.objects) {
        expect(obj.distanceFromCamera).toBeGreaterThan(0);
        expect(obj.angularSize).toBeGreaterThan(0);
        expect(obj.size).toBeGreaterThan(0);
      }
    });

    it('should produce attention scores for Akida-classified entities', async () => {
      const rawObjects = [
        { id: 'close-obj', position: { x: 0.5, y: 1, z: -2 }, size: 1.2 },
        { id: 'far-obj', position: { x: 10, y: 0, z: -20 }, size: 0.5 },
        { id: 'mid-obj', position: { x: 3, y: 1.5, z: -6 }, size: 0.8 },
      ];

      const classifications = akidaBridge.classify(rawObjects);
      const cameraPos = { x: 0, y: 1.6, z: 0 };
      const sceneInput = akidaBridge.toPerceptionInput(classifications, cameraPos);

      // Feed to SNN perception
      await perceptionBridge.feedInput(sceneInput);

      const state = perceptionBridge.readPerception();
      expect(state.trackedObjectCount).toBe(3);
      expect(state.attentionScores.length).toBe(3);

      // All scores should reference Akida tracking IDs
      for (const score of state.attentionScores) {
        expect(score.objectId).toMatch(/^akida-/);
      }
    });

    it('should create entities from classified objects with perception data', async () => {
      const rawObjects = [
        { id: 'entity-1', position: { x: 1, y: 0.5, z: -3 }, size: 1.0 },
        { id: 'entity-2', position: { x: -2, y: 2.5, z: -5 }, size: 0.6 },
        { id: 'entity-3', position: { x: 0, y: 0.1, z: -1 }, size: 2.0 },
      ];

      // Step 1: Akida classifies
      const classifications = akidaBridge.classify(rawObjects);

      // Step 2: Feed to SNN perception
      const cameraPos = { x: 0, y: 1.6, z: 0 };
      const sceneInput = akidaBridge.toPerceptionInput(classifications, cameraPos);
      await perceptionBridge.feedInput(sceneInput);

      // Step 3: Read perception state
      const perceptionState = perceptionBridge.readPerception();

      // Step 4: Create renderer entities with perception data
      entityTracker.ingestClassificationsWithPerception(
        classifications,
        perceptionState,
      );

      // Verify entities were created
      expect(entityTracker.getEntityCount()).toBe(3);

      // Each entity should have classification + perception data
      for (const entity of entityTracker.getAllEntities()) {
        expect(entity.id).toMatch(/^akida-/);
        expect(entity.label).toBeTruthy();
        expect(entity.confidence).toBeGreaterThan(0);
        expect(entity.attention).toBeGreaterThanOrEqual(0);
        expect(['background', 'ambient', 'focus', 'alert']).toContain(
          entity.salience,
        );
      }
    });
  });

  // ===========================================================================
  // Multi-frame entity tracking
  // ===========================================================================

  describe('Multi-frame classification tracking', () => {
    it('should update entity attention over multiple classification frames', async () => {
      const rawObjects = [
        { id: 'tracked-1', position: { x: 0.5, y: 1, z: -2 }, size: 1.0 },
        { id: 'tracked-2', position: { x: 3, y: 0, z: -8 }, size: 0.5 },
      ];

      const cameraPos = { x: 0, y: 1.6, z: 0 };

      // Simulate 5 classification frames
      for (let frame = 0; frame < 5; frame++) {
        const classifications = akidaBridge.classify(rawObjects);
        const sceneInput = akidaBridge.toPerceptionInput(
          classifications,
          cameraPos,
        );
        await perceptionBridge.feedInput(sceneInput);

        const perceptionState = perceptionBridge.readPerception();
        entityTracker.ingestClassificationsWithPerception(
          classifications,
          perceptionState,
        );
      }

      // Entities should exist and be updated
      expect(entityTracker.getEntityCount()).toBe(2);

      const entity1 = entityTracker.getEntity('akida-tracked-1');
      const entity2 = entityTracker.getEntity('akida-tracked-2');

      expect(entity1).toBeDefined();
      expect(entity2).toBeDefined();
      expect(entity1!.lastUpdated).toBeGreaterThan(entity1!.created);
    });

    it('should detect new entities appearing in subsequent frames', async () => {
      const cameraPos = { x: 0, y: 1.6, z: 0 };

      // Frame 1: 2 objects
      const frame1Objects = [
        { id: 'obj-A', position: { x: 1, y: 1, z: -3 }, size: 1.0 },
        { id: 'obj-B', position: { x: -1, y: 0, z: -5 }, size: 0.8 },
      ];

      let classifications = akidaBridge.classify(frame1Objects);
      let sceneInput = akidaBridge.toPerceptionInput(classifications, cameraPos);
      await perceptionBridge.feedInput(sceneInput);
      entityTracker.ingestClassificationsWithPerception(
        classifications,
        perceptionBridge.readPerception(),
      );

      expect(entityTracker.getEntityCount()).toBe(2);

      // Frame 2: 3 objects (one new)
      const frame2Objects = [
        ...frame1Objects,
        { id: 'obj-C', position: { x: 4, y: 2, z: -7 }, size: 0.5 },
      ];

      classifications = akidaBridge.classify(frame2Objects);
      sceneInput = akidaBridge.toPerceptionInput(classifications, cameraPos);
      await perceptionBridge.feedInput(sceneInput);
      entityTracker.ingestClassificationsWithPerception(
        classifications,
        perceptionBridge.readPerception(),
      );

      expect(entityTracker.getEntityCount()).toBe(3);
      expect(entityTracker.getEntity('akida-obj-C')).toBeDefined();
    });

    it('should track Akida bridge frame count consistently', async () => {
      const rawObjects = [
        { id: 'count-test', position: { x: 0, y: 0, z: -5 }, size: 1.0 },
      ];

      for (let i = 0; i < 10; i++) {
        akidaBridge.classify(rawObjects);
      }

      expect(akidaBridge.getFrameCount()).toBe(10);
      expect(akidaBridge.getEntityCount()).toBe(1);
    });
  });

  // ===========================================================================
  // Entity state queries
  // ===========================================================================

  describe('Renderer entity state queries', () => {
    it('should query entities by salience level', async () => {
      const rawObjects = Array.from({ length: 8 }, (_, i) => ({
        id: `query-obj-${i}`,
        position: { x: i * 2 - 7, y: i * 0.3, z: -(i + 3) },
        size: 0.5 + i * 0.2,
      }));

      const cameraPos = { x: 0, y: 1.6, z: 0 };

      // Run multiple frames for meaningful attention patterns
      for (let frame = 0; frame < 3; frame++) {
        const classifications = akidaBridge.classify(rawObjects);
        const sceneInput = akidaBridge.toPerceptionInput(
          classifications,
          cameraPos,
        );
        await perceptionBridge.feedInput(sceneInput);
        entityTracker.ingestClassificationsWithPerception(
          classifications,
          perceptionBridge.readPerception(),
        );
      }

      // Query by salience -- all entities should have a valid salience
      const allEntities = entityTracker.getAllEntities();
      for (const entity of allEntities) {
        expect(['background', 'ambient', 'focus', 'alert']).toContain(
          entity.salience,
        );
      }
    });

    it('should provide entity-level classification labels from Akida', async () => {
      const rawObjects = [
        { id: 'labeled-1', position: { x: 0, y: 3, z: -5 }, size: 0.5 },
        { id: 'labeled-2', position: { x: 0, y: 0.1, z: -3 }, size: 1.0 },
        { id: 'labeled-3', position: { x: 8, y: 1, z: -10 }, size: 0.8 },
      ];

      const classifications = akidaBridge.classify(rawObjects);
      const cameraPos = { x: 0, y: 1.6, z: 0 };
      const sceneInput = akidaBridge.toPerceptionInput(
        classifications,
        cameraPos,
      );
      await perceptionBridge.feedInput(sceneInput);
      entityTracker.ingestClassificationsWithPerception(
        classifications,
        perceptionBridge.readPerception(),
      );

      // Verify labels were assigned based on position heuristics
      const entity1 = entityTracker.getEntity('akida-labeled-1');
      expect(entity1!.label).toBe('ceiling_light'); // y > 2

      const entity2 = entityTracker.getEntity('akida-labeled-2');
      expect(entity2!.label).toBe('floor_object'); // y < 0.3

      const entity3 = entityTracker.getEntity('akida-labeled-3');
      expect(entity3!.label).toBe('wall_decoration'); // |x| > 5
    });
  });
});
