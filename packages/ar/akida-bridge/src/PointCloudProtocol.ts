/**
 * Point Cloud Binary Serialization Protocol
 *
 * Efficient binary encoding/decoding for streaming LiDAR point cloud data
 * between the Akida AKD1500 edge device and the HoloLand client over WebSocket.
 *
 * Protocol:
 *   - 58-byte header (magic, version, frame metadata, sensor pose)
 *   - N * 20-byte point records (x, y, z, intensity, returnIndex)
 *   - All multi-byte values are little-endian
 */

import type { PointCloudFrame, Point3D, Vector3, Quaternion } from './types';
import {
  BINARY_HEADER_SIZE,
  BINARY_POINT_SIZE,
  BINARY_MAGIC,
  BINARY_VERSION,
} from './types';

// =============================================================================
// SERIALIZATION
// =============================================================================

/**
 * Serialize a PointCloudFrame to an ArrayBuffer for WebSocket binary transfer.
 *
 * @param frame - The point cloud frame to serialize
 * @returns ArrayBuffer containing the binary-encoded frame
 */
export function serializePointCloud(frame: PointCloudFrame): ArrayBuffer {
  const totalSize = BINARY_HEADER_SIZE + frame.pointCount * BINARY_POINT_SIZE;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  let offset = 0;

  // Header
  view.setUint32(offset, BINARY_MAGIC, true);           offset += 4;
  view.setUint16(offset, BINARY_VERSION, true);          offset += 2;
  view.setUint32(offset, frame.frameId, true);           offset += 4;
  view.setFloat64(offset, frame.timestamp, true);        offset += 8;
  view.setUint32(offset, frame.pointCount, true);        offset += 4;

  // Sensor origin
  view.setFloat32(offset, frame.sensorOrigin.x, true);  offset += 4;
  view.setFloat32(offset, frame.sensorOrigin.y, true);  offset += 4;
  view.setFloat32(offset, frame.sensorOrigin.z, true);  offset += 4;

  // Sensor orientation (quaternion)
  view.setFloat32(offset, frame.sensorOrientation.x, true); offset += 4;
  view.setFloat32(offset, frame.sensorOrientation.y, true); offset += 4;
  view.setFloat32(offset, frame.sensorOrientation.z, true); offset += 4;
  view.setFloat32(offset, frame.sensorOrientation.w, true); offset += 4;

  // Range
  view.setFloat32(offset, frame.minRange, true);         offset += 4;
  view.setFloat32(offset, frame.maxRange, true);         offset += 4;

  // Points
  for (let i = 0; i < frame.pointCount; i++) {
    const p = frame.points[i];
    view.setFloat32(offset, p.x, true);              offset += 4;
    view.setFloat32(offset, p.y, true);              offset += 4;
    view.setFloat32(offset, p.z, true);              offset += 4;
    view.setFloat32(offset, p.intensity, true);      offset += 4;
    view.setUint32(offset, p.returnIndex, true);     offset += 4;
  }

  return buffer;
}

// =============================================================================
// DESERIALIZATION
// =============================================================================

/**
 * Deserialize an ArrayBuffer received from WebSocket into a PointCloudFrame.
 *
 * @param buffer - The binary data to deserialize
 * @returns Parsed PointCloudFrame
 * @throws Error if buffer is too small, magic mismatch, or version unsupported
 */
export function deserializePointCloud(buffer: ArrayBuffer): PointCloudFrame {
  if (buffer.byteLength < BINARY_HEADER_SIZE) {
    throw new Error(
      `Buffer too small for header: ${buffer.byteLength} bytes (need ${BINARY_HEADER_SIZE})`
    );
  }

  const view = new DataView(buffer);
  let offset = 0;

  // Validate magic
  const magic = view.getUint32(offset, true);            offset += 4;
  if (magic !== BINARY_MAGIC) {
    throw new Error(
      `Invalid magic: 0x${magic.toString(16).toUpperCase()} (expected 0x${BINARY_MAGIC.toString(16).toUpperCase()})`
    );
  }

  // Validate version
  const version = view.getUint16(offset, true);          offset += 2;
  if (version !== BINARY_VERSION) {
    throw new Error(
      `Unsupported protocol version: ${version} (expected ${BINARY_VERSION})`
    );
  }

  // Header fields
  const frameId = view.getUint32(offset, true);          offset += 4;
  const timestamp = view.getFloat64(offset, true);       offset += 8;
  const pointCount = view.getUint32(offset, true);       offset += 4;

  // Validate buffer size for points
  const expectedSize = BINARY_HEADER_SIZE + pointCount * BINARY_POINT_SIZE;
  if (buffer.byteLength < expectedSize) {
    throw new Error(
      `Buffer too small for ${pointCount} points: ${buffer.byteLength} bytes (need ${expectedSize})`
    );
  }

  // Sensor origin
  const sensorOrigin: Vector3 = {
    x: view.getFloat32(offset, true), y: (offset += 4, view.getFloat32(offset, true)),
    z: (offset += 4, view.getFloat32(offset, true)),
  };
  offset += 4;

  // Sensor orientation
  const sensorOrientation: Quaternion = {
    x: view.getFloat32(offset, true), y: (offset += 4, view.getFloat32(offset, true)),
    z: (offset += 4, view.getFloat32(offset, true)),
    w: (offset += 4, view.getFloat32(offset, true)),
  };
  offset += 4;

  // Range
  const minRange = view.getFloat32(offset, true);        offset += 4;
  const maxRange = view.getFloat32(offset, true);        offset += 4;

  // Points
  const points: Point3D[] = new Array(pointCount);
  for (let i = 0; i < pointCount; i++) {
    points[i] = {
      x: view.getFloat32(offset, true),
      y: (offset += 4, view.getFloat32(offset, true)),
      z: (offset += 4, view.getFloat32(offset, true)),
      intensity: (offset += 4, view.getFloat32(offset, true)),
      returnIndex: (offset += 4, view.getUint32(offset, true)),
    };
    offset += 4;
  }

  return {
    frameId,
    timestamp,
    pointCount,
    points,
    sensorOrigin,
    sensorOrientation,
    minRange,
    maxRange,
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Downsample a point cloud using voxel grid filtering.
 * Groups points into cubic voxels and keeps the centroid of each voxel.
 *
 * @param frame - Source point cloud frame
 * @param voxelSize - Voxel edge length in meters
 * @returns New frame with downsampled points
 */
export function voxelGridDownsample(
  frame: PointCloudFrame,
  voxelSize: number
): PointCloudFrame {
  if (voxelSize <= 0) return frame;

  const voxelMap = new Map<string, { sum: Vector3; intensity: number; count: number; returnIndex: number }>();

  for (const p of frame.points) {
    const vx = Math.floor(p.x / voxelSize);
    const vy = Math.floor(p.y / voxelSize);
    const vz = Math.floor(p.z / voxelSize);
    const key = `${vx},${vy},${vz}`;

    const existing = voxelMap.get(key);
    if (existing) {
      existing.sum.x += p.x;
      existing.sum.y += p.y;
      existing.sum.z += p.z;
      existing.intensity += p.intensity;
      existing.count += 1;
    } else {
      voxelMap.set(key, {
        sum: { x: p.x, y: p.y, z: p.z },
        intensity: p.intensity,
        count: 1,
        returnIndex: p.returnIndex,
      });
    }
  }

  const downsampledPoints: Point3D[] = [];
  for (const voxel of voxelMap.values()) {
    downsampledPoints.push({
      x: voxel.sum.x / voxel.count,
      y: voxel.sum.y / voxel.count,
      z: voxel.sum.z / voxel.count,
      intensity: voxel.intensity / voxel.count,
      returnIndex: voxel.returnIndex,
    });
  }

  return {
    ...frame,
    pointCount: downsampledPoints.length,
    points: downsampledPoints,
  };
}

/**
 * Clip points outside a given range from sensor origin.
 *
 * @param frame - Source point cloud frame
 * @param minRange - Minimum distance in meters
 * @param maxRange - Maximum distance in meters
 * @returns New frame with range-filtered points
 */
export function rangeFilter(
  frame: PointCloudFrame,
  minRange: number,
  maxRange: number
): PointCloudFrame {
  const filtered = frame.points.filter(p => {
    const dx = p.x - frame.sensorOrigin.x;
    const dy = p.y - frame.sensorOrigin.y;
    const dz = p.z - frame.sensorOrigin.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return dist >= minRange && dist <= maxRange;
  });

  return {
    ...frame,
    pointCount: filtered.length,
    points: filtered,
    minRange,
    maxRange,
  };
}

/**
 * Estimate the serialized size in bytes for a frame.
 */
export function estimateFrameSize(pointCount: number): number {
  return BINARY_HEADER_SIZE + pointCount * BINARY_POINT_SIZE;
}
