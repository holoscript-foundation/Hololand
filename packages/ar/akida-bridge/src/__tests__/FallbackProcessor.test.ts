import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FallbackProcessor } from '../FallbackProcessor';
import type { PointCloudFrame, SemanticClass } from '../types';

// =============================================================================
// HELPERS
// =============================================================================

function createTestFrame(pointCount: number = 100): PointCloudFrame {
  const points = [];
  for (let i = 0; i < pointCount; i++) {
    // Distribute points across a room-like space:
    //  - some at floor level (y near 0)
    //  - some mid-height (furniture)
    //  - some at ceiling (y near 3)
    const t = i / pointCount;
    let y: number;
    if (t < 0.3) {
      y = 0.02 * t; // Floor points
    } else if (t < 0.7) {
      y = 0.8 + t; // Mid-height
    } else {
      y = 2.8 + 0.2 * t; // Ceiling points
    }

    points.push({
      x: (Math.sin(i) * 5),
      y,
      z: (Math.cos(i) * 5),
      intensity: 0.5,
      returnIndex: 0,
    });
  }

  return {
    frameId: 1,
    timestamp: Date.now(),
    pointCount,
    points,
    sensorOrigin: { x: 0, y: 1, z: 0 },
    sensorOrientation: { x: 0, y: 0, z: 0, w: 1 },
    minRange: 0.1,
    maxRange: 10,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('FallbackProcessor', () => {
  let processor: FallbackProcessor;

  beforeEach(() => {
    processor = new FallbackProcessor({ preferredBackend: 'cpu' });
  });

  describe('constructor', () => {
    it('creates with default config', () => {
      const p = new FallbackProcessor();
      expect(p.initialized).toBe(false);
      expect(p.getActiveBackend()).toBeNull();
    });

    it('accepts custom config', () => {
      const p = new FallbackProcessor({
        cpuThreads: 8,
        maxPointsFallback: 2048,
      });
      expect(p.initialized).toBe(false);
    });
  });

  describe('initialize', () => {
    it('initializes CPU backend', async () => {
      const backend = await processor.initialize();
      expect(backend).toBe('cpu');
      expect(processor.initialized).toBe(true);
      expect(processor.getActiveBackend()).toBe('cpu');
    });

    it('falls back to CPU when WebGPU unavailable', async () => {
      const p = new FallbackProcessor({ preferredBackend: 'webgpu' });
      // No navigator.gpu in test environment
      const backend = await p.initialize();
      expect(backend).toBe('cpu');
    });
  });

  describe('classify', () => {
    it('throws when not initialized', async () => {
      const frame = createTestFrame(10);
      await expect(processor.classify(frame)).rejects.toThrow('not initialized');
    });

    it('classifies a point cloud frame', async () => {
      await processor.initialize();
      const frame = createTestFrame(50);
      const result = await processor.classify(frame);

      expect(result.frameId).toBe(1);
      expect(result.source).toBe('cpu');
      expect(result.totalLatencyMs).toBeGreaterThan(0);
      expect(result.pointClassifications.length).toBeGreaterThan(0);
      expect(result.segments.length).toBeGreaterThan(0);
    });

    it('assigns floor class to low-y points', async () => {
      await processor.initialize();

      // Create frame with all points at y=0 (floor)
      const frame: PointCloudFrame = {
        frameId: 2,
        timestamp: Date.now(),
        pointCount: 10,
        points: Array.from({ length: 10 }, (_, i) => ({
          x: i * 0.5,
          y: 0.01,
          z: 0,
          intensity: 0.5,
          returnIndex: 0,
        })),
        sensorOrigin: { x: 0, y: 1, z: 0 },
        sensorOrientation: { x: 0, y: 0, z: 0, w: 1 },
        minRange: 0.1,
        maxRange: 10,
      };

      const result = await processor.classify(frame);

      // Most points should be classified as FLOOR (class 1)
      const floorPoints = result.pointClassifications.filter(
        pc => pc.semanticClass === (1 as SemanticClass)
      );
      expect(floorPoints.length).toBeGreaterThan(0);
    });

    it('produces segments grouped by semantic class', async () => {
      await processor.initialize();
      const frame = createTestFrame(100);
      const result = await processor.classify(frame);

      // Each segment should have consistent semantic class
      for (const segment of result.segments) {
        expect(segment.pointCount).toBeGreaterThan(0);
        expect(segment.averageConfidence).toBeGreaterThan(0);
        expect(segment.centroid).toBeDefined();
        expect(segment.boundingBox).toBeDefined();
        expect(segment.pointIndices.length).toBe(segment.pointCount);
      }
    });

    it('downsamples when frame exceeds maxPointsFallback', async () => {
      const p = new FallbackProcessor({
        preferredBackend: 'cpu',
        maxPointsFallback: 20,
      });
      await p.initialize();

      const frame = createTestFrame(100);
      const result = await p.classify(frame);

      // Should still produce results but with fewer points
      expect(result.pointClassifications.length).toBeLessThanOrEqual(20);
    });

    it('filters by confidence threshold', async () => {
      const p = new FallbackProcessor({
        preferredBackend: 'cpu',
        confidenceThresholdFallback: 0.9,
      });
      await p.initialize();

      const frame = createTestFrame(50);
      const result = await p.classify(frame);

      // All remaining classifications should meet threshold
      for (const pc of result.pointClassifications) {
        expect(pc.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });

    it('increments frames processed counter', async () => {
      await processor.initialize();
      expect(processor.getFramesProcessed()).toBe(0);

      await processor.classify(createTestFrame(10));
      expect(processor.getFramesProcessed()).toBe(1);

      await processor.classify(createTestFrame(10));
      expect(processor.getFramesProcessed()).toBe(2);
    });
  });

  describe('segments', () => {
    it('segment IDs are unique within a result', async () => {
      await processor.initialize();
      const frame = createTestFrame(100);
      const result = await processor.classify(frame);

      const ids = new Set(result.segments.map(s => s.segmentId));
      expect(ids.size).toBe(result.segments.length);
    });

    it('segment bounding box encompasses centroid', async () => {
      await processor.initialize();
      const frame = createTestFrame(100);
      const result = await processor.classify(frame);

      for (const segment of result.segments) {
        const bb = segment.boundingBox;
        const c = segment.centroid;

        // Centroid should be within bounding box (with small tolerance)
        const tolerance = 0.001;
        expect(c.x).toBeGreaterThanOrEqual(bb.center.x - bb.size.x / 2 - tolerance);
        expect(c.x).toBeLessThanOrEqual(bb.center.x + bb.size.x / 2 + tolerance);
        expect(c.y).toBeGreaterThanOrEqual(bb.center.y - bb.size.y / 2 - tolerance);
        expect(c.y).toBeLessThanOrEqual(bb.center.y + bb.size.y / 2 + tolerance);
        expect(c.z).toBeGreaterThanOrEqual(bb.center.z - bb.size.z / 2 - tolerance);
        expect(c.z).toBeLessThanOrEqual(bb.center.z + bb.size.z / 2 + tolerance);
      }
    });
  });

  describe('dispose', () => {
    it('resets state', async () => {
      await processor.initialize();
      expect(processor.initialized).toBe(true);

      processor.dispose();
      expect(processor.initialized).toBe(false);
      expect(processor.getActiveBackend()).toBeNull();
    });

    it('can be called multiple times', () => {
      expect(() => {
        processor.dispose();
        processor.dispose();
      }).not.toThrow();
    });
  });
});
