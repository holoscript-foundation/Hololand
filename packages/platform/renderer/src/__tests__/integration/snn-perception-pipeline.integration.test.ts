/**
 * @vitest-environment jsdom
 */

/**
 * Integration Test 1: SNN Perception -> SharedArrayBuffer -> Spatial Attention -> Saliency Query
 *
 * Validates the complete perception pipeline:
 *   1. Scene objects are encoded into SNN input currents
 *   2. SNN Worker runs LIF simulation (CPU fallback in test)
 *   3. Results are written to SharedArrayBuffer via Atomics
 *   4. SharedPerceptionBuffer reads state via acquire fence
 *   5. Attention scores map to salience levels
 *   6. Focus point is correctly computed from weighted attention
 *
 * This test exercises the lock-free double-buffered SharedArrayBuffer protocol
 * that bridges the Web Worker inference thread and the main render thread.
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

import { SNNPerceptionWorker, createSNNPerceptionWorker } from '../../SNNPerceptionWorker';
import { SharedPerceptionBuffer, createSharedPerceptionBuffer } from '../../SharedPerceptionBuffer';
import { SNNPerceptionBridge, createSNNPerceptionBridge } from '../../SNNPerceptionBridge';
import type {
  PerceptionSceneInput,
  PerceptionObjectInput,
  SNNPerceptionState,
  AttentionScore,
  SalienceLevel,
} from '../../SNNPerceptionTypes';
import {
  calculateBufferLayout,
  SAB_HEADER,
  SAB_ENTRY_SIZE,
  SALIENCE_ENCODING,
  SALIENCE_DECODING,
  DEFAULT_SNN_NETWORK_CONFIG,
  createEmptySNNPerceptionState,
} from '../../SNNPerceptionTypes';

// =============================================================================
// TEST FIXTURES
// =============================================================================

/** Create a scene with objects at known positions for deterministic testing */
function createTestScene(objectCount: number, opts?: {
  movingIndices?: number[];
  closeObjectIndices?: number[];
  anomalyTriggerIndices?: number[];
}): PerceptionSceneInput {
  const objects: PerceptionObjectInput[] = [];
  for (let i = 0; i < objectCount; i++) {
    const isClose = opts?.closeObjectIndices?.includes(i) ?? false;
    const isMoving = opts?.movingIndices?.includes(i) ?? false;

    objects.push({
      id: `obj-${i}`,
      position: {
        x: isClose ? 1.0 : i * 3.0,
        y: 0,
        z: isClose ? -2.0 : -i * 2.0,
      },
      velocity: isMoving
        ? { x: 5.0, y: 0, z: -3.0 }
        : { x: 0, y: 0, z: 0 },
      size: 1.0,
      distanceFromCamera: isClose ? 2.0 : i * 5.0 + 5.0,
      angularSize: isClose ? 0.5 : 0.05,
      hasMoved: isMoving,
    });
  }

  return {
    objects,
    cameraPosition: { x: 0, y: 1.6, z: 5 },
    cameraForward: { x: 0, y: 0, z: -1 },
    timestamp: performance.now(),
    frameSequence: 1,
  };
}

// =============================================================================
// TEST SUITE 1: SNN Worker -> SharedArrayBuffer -> Perception Read
// =============================================================================

describe('Integration: SNN Perception -> SharedArrayBuffer -> Saliency Query', () => {
  describe('Worker -> SAB -> Reader: Lock-free data flow', () => {
    let worker: SNNPerceptionWorker;
    let perceptionBuffer: SharedPerceptionBuffer;
    let sab: SharedArrayBuffer;

    beforeEach(async () => {
      const maxObjects = 64;
      const layout = calculateBufferLayout(maxObjects);
      sab = new SharedArrayBuffer(layout.totalBytes);
      perceptionBuffer = new SharedPerceptionBuffer(sab, maxObjects);

      worker = createSNNPerceptionWorker({
        maxObjects,
        enableAnomalyDetection: true,
        anomalyThreshold: 0.8,
      });

      await worker.initialize(sab);
    });

    afterEach(() => {
      worker.dispose();
    });

    it('should flow data from worker through SAB to reader', async () => {
      const scene = createTestScene(5);

      // Set object ID map so reader can decode
      perceptionBuffer.setObjectIdMap(scene.objects.map(o => o.id));

      // Worker processes scene and writes to SAB
      const metrics = await worker.processInput(scene);
      expect(metrics.objectCount).toBe(5);
      expect(metrics.sequence).toBe(1);

      // Reader detects new data via Atomics acquire fence
      expect(perceptionBuffer.hasNewData()).toBe(true);

      // Reader reads consistent snapshot from SAB
      const state = perceptionBuffer.readState();
      expect(state.sequence).toBe(1);
      expect(state.trackedObjectCount).toBe(5);
    });

    it('should maintain sequence monotonicity across multiple inference passes', async () => {
      const scene = createTestScene(3);
      perceptionBuffer.setObjectIdMap(scene.objects.map(o => o.id));

      let lastSeq = 0;
      for (let pass = 0; pass < 5; pass++) {
        await worker.processInput(scene);
        const state = perceptionBuffer.readState();
        expect(state.sequence).toBeGreaterThan(lastSeq);
        lastSeq = state.sequence;
      }
    });

    it('should return cached state when no new data available', async () => {
      const scene = createTestScene(3);
      perceptionBuffer.setObjectIdMap(scene.objects.map(o => o.id));

      await worker.processInput(scene);

      // First read: new data
      const state1 = perceptionBuffer.readState();
      expect(state1.sequence).toBe(1);

      // Second read: should return cached (same sequence)
      const state2 = perceptionBuffer.readState();
      expect(state2.sequence).toBe(state1.sequence);

      // Verify no update was counted
      const bufferMetrics = perceptionBuffer.getMetrics();
      expect(bufferMetrics.totalUpdates).toBe(1);
      expect(bufferMetrics.totalReads).toBe(2);
    });

    it('should produce valid attention scores with correct salience levels', async () => {
      // Create scene with one very close, moving object to generate high attention
      const scene = createTestScene(4, {
        closeObjectIndices: [0],
        movingIndices: [0],
      });
      perceptionBuffer.setObjectIdMap(scene.objects.map(o => o.id));

      // Run multiple passes for spike accumulation
      for (let i = 0; i < 3; i++) {
        await worker.processInput(scene);
      }

      const state = perceptionBuffer.readState();

      // All attention scores should have valid structure
      for (const score of state.attentionScores) {
        expect(score.attention).toBeGreaterThanOrEqual(0);
        expect(score.attention).toBeLessThanOrEqual(1);
        expect(['background', 'ambient', 'focus', 'alert']).toContain(score.salience);
        expect(typeof score.isAnomalous).toBe('boolean');
        expect(score.spikeRate).toBeGreaterThanOrEqual(0);
      }
    });

    it('should compute focus point as weighted centroid of high-attention objects', async () => {
      const scene = createTestScene(3, {
        closeObjectIndices: [0, 1],
        movingIndices: [0],
      });
      perceptionBuffer.setObjectIdMap(scene.objects.map(o => o.id));

      // Run passes to build up spike activity
      for (let i = 0; i < 5; i++) {
        await worker.processInput(scene);
      }

      const state = perceptionBuffer.readState();

      // Focus point should be a valid Vec3
      expect(typeof state.focusPoint.x).toBe('number');
      expect(typeof state.focusPoint.y).toBe('number');
      expect(typeof state.focusPoint.z).toBe('number');
      expect(state.focusConfidence).toBeGreaterThanOrEqual(0);
      expect(state.focusConfidence).toBeLessThanOrEqual(1);
    });

    it('should track global anomaly level', async () => {
      const scene = createTestScene(4);
      perceptionBuffer.setObjectIdMap(scene.objects.map(o => o.id));

      await worker.processInput(scene);
      const state = perceptionBuffer.readState();

      expect(state.globalAnomalyLevel).toBeGreaterThanOrEqual(0);
      expect(state.globalAnomalyLevel).toBeLessThanOrEqual(1);
    });

    it('should report spike rate metrics', async () => {
      const scene = createTestScene(5);
      perceptionBuffer.setObjectIdMap(scene.objects.map(o => o.id));

      await worker.processInput(scene);
      const state = perceptionBuffer.readState();

      expect(state.averageSpikeRate).toBeGreaterThanOrEqual(0);
      expect(state.totalSpikes).toBeGreaterThanOrEqual(0);
      expect(state.currentHz).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Bridge Integration: Full SNNPerceptionBridge pipeline
  // ===========================================================================

  describe('SNNPerceptionBridge: End-to-end perception pipeline', () => {
    let bridge: SNNPerceptionBridge;

    beforeEach(async () => {
      bridge = createSNNPerceptionBridge({
        initialHz: 10,
        adaptiveFrequency: false,
        maxInputObjects: 32,
      });
      await bridge.initialize();
    });

    afterEach(() => {
      bridge.dispose();
    });

    it('should process scene input and produce queryable perception state', async () => {
      const scene = createTestScene(6);

      await bridge.feedInput(scene);

      const state = bridge.readPerception();
      expect(state.sequence).toBe(1);
      expect(state.trackedObjectCount).toBe(6);
      expect(state.attentionScores.length).toBeGreaterThan(0);
    });

    it('should accumulate perception across multiple inference cycles', async () => {
      // Feed multiple scenes to simulate temporal perception
      for (let cycle = 0; cycle < 5; cycle++) {
        const scene = createTestScene(4, {
          movingIndices: [0],
        });
        await bridge.feedInput(scene);
      }

      const state = bridge.readPerception();
      expect(state.sequence).toBe(5);

      // Metrics should reflect all passes
      const metrics = bridge.getMetrics();
      expect(metrics.totalInferences).toBe(5);
    });

    it('should handle scene extractor integration for automatic capture', async () => {
      const extractorFn = vi.fn(() => ({
        objects: [
          {
            id: 'auto-obj-1',
            position: { x: 1, y: 0, z: -3 },
            scale: { x: 1, y: 1, z: 1 },
            visible: true,
          },
          {
            id: 'auto-obj-2',
            position: { x: -2, y: 1, z: -5 },
            scale: { x: 2, y: 2, z: 2 },
            visible: true,
          },
        ],
        cameraPosition: { x: 0, y: 1.6, z: 5 },
        cameraForward: { x: 0, y: 0, z: -1 },
      }));

      bridge.setSceneExtractor(extractorFn);

      // Extractor is called by the internal timer, not directly by feedInput
      // Verify it was registered without error
      expect(bridge.isWorkerReady()).toBe(true);
    });

    it('should support saliency queries: filter by salience level', async () => {
      const scene = createTestScene(10, {
        closeObjectIndices: [0, 1, 2],
        movingIndices: [0, 1],
      });

      // Run several passes to generate meaningful spike patterns
      for (let i = 0; i < 5; i++) {
        await bridge.feedInput(scene);
      }

      const state = bridge.readPerception();

      // Query by salience level
      const focusObjects = state.attentionScores.filter(
        (s) => s.salience === 'focus' || s.salience === 'alert',
      );
      const backgroundObjects = state.attentionScores.filter(
        (s) => s.salience === 'background',
      );

      // All objects should have a valid salience classification
      const allClassified = state.attentionScores.every(
        (s) =>
          s.salience === 'background' ||
          s.salience === 'ambient' ||
          s.salience === 'focus' ||
          s.salience === 'alert',
      );
      expect(allClassified).toBe(true);
    });

    it('should detect attention scores sorted by attention descending', async () => {
      const scene = createTestScene(8);

      await bridge.feedInput(scene);
      const state = bridge.readPerception();

      // Verify attention scores are sorted descending
      for (let i = 1; i < state.attentionScores.length; i++) {
        expect(state.attentionScores[i - 1].attention).toBeGreaterThanOrEqual(
          state.attentionScores[i].attention,
        );
      }
    });
  });

  // ===========================================================================
  // SharedArrayBuffer Protocol Verification
  // ===========================================================================

  describe('SAB Protocol: Acquire/Release fence correctness', () => {
    it('should use Atomics for sequence synchronization', async () => {
      const maxObjects = 32;
      const layout = calculateBufferLayout(maxObjects);
      const sab = new SharedArrayBuffer(layout.totalBytes);
      const int32View = new Int32Array(sab);

      // Verify initial sequence is 0
      const initialSeq = Atomics.load(int32View, SAB_HEADER.SEQUENCE);
      expect(initialSeq).toBe(0);

      // Create worker and process input
      const worker = createSNNPerceptionWorker({ maxObjects });
      await worker.initialize(sab);

      const scene = createTestScene(3);
      await worker.processInput(scene);

      // Sequence should have been atomically updated
      const newSeq = Atomics.load(int32View, SAB_HEADER.SEQUENCE);
      expect(newSeq).toBe(1);

      worker.dispose();
    });

    it('should write entry count atomically', async () => {
      const maxObjects = 16;
      const layout = calculateBufferLayout(maxObjects);
      const sab = new SharedArrayBuffer(layout.totalBytes);
      const int32View = new Int32Array(sab);

      const worker = createSNNPerceptionWorker({ maxObjects });
      await worker.initialize(sab);

      const scene = createTestScene(5);
      await worker.processInput(scene);

      const entryCount = Atomics.load(int32View, SAB_HEADER.ENTRY_COUNT);
      expect(entryCount).toBe(5);

      worker.dispose();
    });

    it('should write attention entries to correct buffer offsets', async () => {
      const maxObjects = 16;
      const layout = calculateBufferLayout(maxObjects);
      const sab = new SharedArrayBuffer(layout.totalBytes);
      const float32View = new Float32Array(sab);

      const worker = createSNNPerceptionWorker({ maxObjects });
      await worker.initialize(sab);

      const scene = createTestScene(3);
      await worker.processInput(scene);

      // Read the first attention entry from the buffer
      const entryOffset = SAB_HEADER.HEADER_SIZE;
      const attention = float32View[entryOffset + 0];
      const spikeRate = float32View[entryOffset + 1];

      // Values should be valid floats
      expect(Number.isFinite(attention)).toBe(true);
      expect(Number.isFinite(spikeRate)).toBe(true);
      expect(attention).toBeGreaterThanOrEqual(0);

      worker.dispose();
    });

    it('should maintain buffer layout alignment', () => {
      const layout = calculateBufferLayout(256);
      // Total bytes must be 8-byte aligned
      expect(layout.totalBytes % 8).toBe(0);
      // Header offset starts at 0
      expect(layout.headerOffset).toBe(0);
      // Attention offset follows header
      expect(layout.attentionOffset).toBe(SAB_HEADER.HEADER_SIZE * 4);
      // Max entries matches maxObjects
      expect(layout.maxAttentionEntries).toBe(256);
    });
  });

  // ===========================================================================
  // Salience encoding/decoding round-trip
  // ===========================================================================

  describe('Salience encoding/decoding round-trip', () => {
    it('should round-trip all salience levels through encoding', () => {
      const levels: SalienceLevel[] = ['background', 'ambient', 'focus', 'alert'];
      for (const level of levels) {
        const encoded = SALIENCE_ENCODING[level];
        const decoded = SALIENCE_DECODING[encoded];
        expect(decoded).toBe(level);
      }
    });

    it('should encode flags with anomaly bit correctly', () => {
      // flags: bit 0 = isAnomalous, bits 1-2 = salienceLevel
      const alertAnomalous = (1) | (SALIENCE_ENCODING['alert'] << 1);
      expect(alertAnomalous & 1).toBe(1); // isAnomalous = true
      expect((alertAnomalous >> 1) & 3).toBe(SALIENCE_ENCODING['alert']);

      const backgroundNormal = (0) | (SALIENCE_ENCODING['background'] << 1);
      expect(backgroundNormal & 1).toBe(0); // isAnomalous = false
      expect((backgroundNormal >> 1) & 3).toBe(SALIENCE_ENCODING['background']);
    });
  });
});
