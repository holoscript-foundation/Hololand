import { describe, it, expect } from 'vitest';
import {
  serializePointCloud,
  deserializePointCloud,
  voxelGridDownsample,
  rangeFilter,
  estimateFrameSize,
} from '../PointCloudProtocol';
import type { PointCloudFrame } from '../types';
import {
  BINARY_HEADER_SIZE,
  BINARY_POINT_SIZE,
  BINARY_MAGIC,
  BINARY_VERSION,
} from '../types';

// =============================================================================
// HELPERS
// =============================================================================

function createTestFrame(pointCount: number = 3): PointCloudFrame {
  const points = [];
  for (let i = 0; i < pointCount; i++) {
    points.push({
      x: i * 1.0,
      y: i * 2.0,
      z: i * 3.0,
      intensity: 0.5 + i * 0.1,
      returnIndex: i % 3,
    });
  }

  return {
    frameId: 42,
    timestamp: 1700000000000,
    pointCount,
    points,
    sensorOrigin: { x: 1.0, y: 2.0, z: 3.0 },
    sensorOrientation: { x: 0.0, y: 0.0, z: 0.0, w: 1.0 },
    minRange: 0.1,
    maxRange: 10.0,
  };
}

// =============================================================================
// SERIALIZATION / DESERIALIZATION
// =============================================================================

describe('serializePointCloud', () => {
  it('produces correct buffer size for empty frame', () => {
    const frame = createTestFrame(0);
    const buffer = serializePointCloud(frame);
    expect(buffer.byteLength).toBe(BINARY_HEADER_SIZE);
  });

  it('produces correct buffer size for 3-point frame', () => {
    const frame = createTestFrame(3);
    const buffer = serializePointCloud(frame);
    expect(buffer.byteLength).toBe(BINARY_HEADER_SIZE + 3 * BINARY_POINT_SIZE);
  });

  it('writes the correct magic number', () => {
    const frame = createTestFrame(0);
    const buffer = serializePointCloud(frame);
    const view = new DataView(buffer);
    expect(view.getUint32(0, true)).toBe(BINARY_MAGIC);
  });

  it('writes the correct version', () => {
    const frame = createTestFrame(0);
    const buffer = serializePointCloud(frame);
    const view = new DataView(buffer);
    expect(view.getUint16(4, true)).toBe(BINARY_VERSION);
  });
});

describe('deserializePointCloud', () => {
  it('throws on buffer too small for header', () => {
    const buffer = new ArrayBuffer(10);
    expect(() => deserializePointCloud(buffer)).toThrow('Buffer too small for header');
  });

  it('throws on invalid magic', () => {
    const buffer = new ArrayBuffer(BINARY_HEADER_SIZE);
    const view = new DataView(buffer);
    view.setUint32(0, 0xDEADBEEF, true);
    view.setUint16(4, BINARY_VERSION, true);
    expect(() => deserializePointCloud(buffer)).toThrow('Invalid magic');
  });

  it('throws on unsupported version', () => {
    const buffer = new ArrayBuffer(BINARY_HEADER_SIZE);
    const view = new DataView(buffer);
    view.setUint32(0, BINARY_MAGIC, true);
    view.setUint16(4, 99, true);
    expect(() => deserializePointCloud(buffer)).toThrow('Unsupported protocol version');
  });

  it('throws when buffer too small for declared point count', () => {
    const buffer = new ArrayBuffer(BINARY_HEADER_SIZE);
    const view = new DataView(buffer);
    view.setUint32(0, BINARY_MAGIC, true);
    view.setUint16(4, BINARY_VERSION, true);
    // frameId
    view.setUint32(6, 1, true);
    // timestamp
    view.setFloat64(10, Date.now(), true);
    // pointCount = 100 (but buffer is only header-sized)
    view.setUint32(18, 100, true);
    expect(() => deserializePointCloud(buffer)).toThrow('Buffer too small for 100 points');
  });
});

describe('round-trip serialization', () => {
  it('round-trips an empty frame correctly', () => {
    const original = createTestFrame(0);
    const buffer = serializePointCloud(original);
    const decoded = deserializePointCloud(buffer);

    expect(decoded.frameId).toBe(original.frameId);
    expect(decoded.pointCount).toBe(0);
    expect(decoded.points).toHaveLength(0);
    expect(decoded.minRange).toBeCloseTo(original.minRange, 4);
    expect(decoded.maxRange).toBeCloseTo(original.maxRange, 4);
  });

  it('round-trips a 3-point frame correctly', () => {
    const original = createTestFrame(3);
    const buffer = serializePointCloud(original);
    const decoded = deserializePointCloud(buffer);

    expect(decoded.frameId).toBe(42);
    expect(decoded.pointCount).toBe(3);
    expect(decoded.points).toHaveLength(3);
    expect(decoded.timestamp).toBeCloseTo(1700000000000, -3);

    // Check sensor origin
    expect(decoded.sensorOrigin.x).toBeCloseTo(1.0, 4);
    expect(decoded.sensorOrigin.y).toBeCloseTo(2.0, 4);
    expect(decoded.sensorOrigin.z).toBeCloseTo(3.0, 4);

    // Check sensor orientation
    expect(decoded.sensorOrientation.x).toBeCloseTo(0.0, 4);
    expect(decoded.sensorOrientation.w).toBeCloseTo(1.0, 4);

    // Check points
    for (let i = 0; i < 3; i++) {
      expect(decoded.points[i].x).toBeCloseTo(i * 1.0, 4);
      expect(decoded.points[i].y).toBeCloseTo(i * 2.0, 4);
      expect(decoded.points[i].z).toBeCloseTo(i * 3.0, 4);
      expect(decoded.points[i].intensity).toBeCloseTo(0.5 + i * 0.1, 4);
      expect(decoded.points[i].returnIndex).toBe(i % 3);
    }
  });

  it('round-trips a large frame (1000 points)', () => {
    const original = createTestFrame(1000);
    const buffer = serializePointCloud(original);
    const decoded = deserializePointCloud(buffer);

    expect(decoded.pointCount).toBe(1000);
    expect(decoded.points).toHaveLength(1000);

    // Spot-check a few points
    expect(decoded.points[0].x).toBeCloseTo(0, 4);
    expect(decoded.points[500].x).toBeCloseTo(500, 4);
    expect(decoded.points[999].x).toBeCloseTo(999, 4);
  });
});

// =============================================================================
// VOXEL GRID DOWNSAMPLE
// =============================================================================

describe('voxelGridDownsample', () => {
  it('returns same frame when voxelSize <= 0', () => {
    const frame = createTestFrame(10);
    const result = voxelGridDownsample(frame, 0);
    expect(result.pointCount).toBe(10);
    expect(result.points).toHaveLength(10);
  });

  it('reduces point count with large voxel size', () => {
    // Create grid of points in a 10x1x1 line
    const frame: PointCloudFrame = {
      frameId: 1,
      timestamp: Date.now(),
      pointCount: 100,
      points: Array.from({ length: 100 }, (_, i) => ({
        x: i * 0.1,
        y: 0,
        z: 0,
        intensity: 0.5,
        returnIndex: 0,
      })),
      sensorOrigin: { x: 0, y: 0, z: 0 },
      sensorOrientation: { x: 0, y: 0, z: 0, w: 1 },
      minRange: 0.1,
      maxRange: 10,
    };

    // With 1m voxels, 100 points spanning 0-9.9m should compress to ~10 voxels
    const result = voxelGridDownsample(frame, 1.0);
    expect(result.pointCount).toBeLessThan(frame.pointCount);
    expect(result.pointCount).toBe(10);
  });

  it('preserves all points when voxelSize is very small', () => {
    const frame = createTestFrame(3);
    // Points are at (0,0,0), (1,2,3), (2,4,6) - all far apart
    const result = voxelGridDownsample(frame, 0.01);
    expect(result.pointCount).toBe(3);
  });

  it('merges coincident points', () => {
    const frame: PointCloudFrame = {
      frameId: 1,
      timestamp: Date.now(),
      pointCount: 5,
      points: [
        { x: 0, y: 0, z: 0, intensity: 0.2, returnIndex: 0 },
        { x: 0.01, y: 0.01, z: 0.01, intensity: 0.4, returnIndex: 0 },
        { x: 0.02, y: 0.02, z: 0.02, intensity: 0.6, returnIndex: 0 },
        { x: 10, y: 10, z: 10, intensity: 0.8, returnIndex: 0 },
        { x: 10.01, y: 10.01, z: 10.01, intensity: 1.0, returnIndex: 0 },
      ],
      sensorOrigin: { x: 0, y: 0, z: 0 },
      sensorOrientation: { x: 0, y: 0, z: 0, w: 1 },
      minRange: 0.1,
      maxRange: 20,
    };

    const result = voxelGridDownsample(frame, 1.0);
    expect(result.pointCount).toBe(2); // Two clusters
  });
});

// =============================================================================
// RANGE FILTER
// =============================================================================

describe('rangeFilter', () => {
  it('filters points outside range', () => {
    const frame: PointCloudFrame = {
      frameId: 1,
      timestamp: Date.now(),
      pointCount: 3,
      points: [
        { x: 0.05, y: 0, z: 0, intensity: 1, returnIndex: 0 }, // distance 0.05 (too close)
        { x: 1, y: 0, z: 0, intensity: 1, returnIndex: 0 },    // distance 1.0 (in range)
        { x: 20, y: 0, z: 0, intensity: 1, returnIndex: 0 },   // distance 20 (too far)
      ],
      sensorOrigin: { x: 0, y: 0, z: 0 },
      sensorOrientation: { x: 0, y: 0, z: 0, w: 1 },
      minRange: 0.1,
      maxRange: 10,
    };

    const result = rangeFilter(frame, 0.1, 10);
    expect(result.pointCount).toBe(1);
    expect(result.points[0].x).toBe(1);
  });

  it('keeps all points within range', () => {
    const frame = createTestFrame(3);
    // Points at distances 0, ~3.74, ~7.48 from origin at (1,2,3)
    // All within 0-100 range
    const result = rangeFilter(frame, 0, 100);
    expect(result.pointCount).toBe(3);
  });

  it('returns empty when all points out of range', () => {
    const frame = createTestFrame(3);
    const result = rangeFilter(frame, 1000, 2000);
    expect(result.pointCount).toBe(0);
  });
});

// =============================================================================
// ESTIMATE FRAME SIZE
// =============================================================================

describe('estimateFrameSize', () => {
  it('returns header size for 0 points', () => {
    expect(estimateFrameSize(0)).toBe(BINARY_HEADER_SIZE);
  });

  it('returns correct size for N points', () => {
    expect(estimateFrameSize(100)).toBe(BINARY_HEADER_SIZE + 100 * BINARY_POINT_SIZE);
  });

  it('matches actual serialized size', () => {
    const frame = createTestFrame(50);
    const buffer = serializePointCloud(frame);
    expect(buffer.byteLength).toBe(estimateFrameSize(50));
  });
});
