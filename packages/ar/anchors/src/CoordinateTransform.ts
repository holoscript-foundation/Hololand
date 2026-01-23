/**
 * Coordinate Transform
 * 
 * Utilities for transforming between coordinate systems.
 * Essential for aligning multiple AR devices to a shared world space.
 */

import type { Vector3, Quaternion, Pose, Transform } from './types';

// =============================================================================
// VECTOR3 OPERATIONS
// =============================================================================

export function addVectors(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtractVectors(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scaleVector(v: Vector3, s: number): Vector3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dotProduct(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function crossProduct(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function vectorLength(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function normalizeVector(v: Vector3): Vector3 {
  const len = vectorLength(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return scaleVector(v, 1 / len);
}

export function distanceBetween(a: Vector3, b: Vector3): number {
  return vectorLength(subtractVectors(a, b));
}

// =============================================================================
// QUATERNION OPERATIONS
// =============================================================================

export function multiplyQuaternions(a: Quaternion, b: Quaternion): Quaternion {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function conjugateQuaternion(q: Quaternion): Quaternion {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}

export function normalizeQuaternion(q: Quaternion): Quaternion {
  const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
  if (len === 0) return { x: 0, y: 0, z: 0, w: 1 };
  return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
}

export function quaternionToEuler(q: Quaternion): Vector3 {
  // Returns XYZ Euler angles in radians
  const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
  const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);

  const sinp = 2 * (q.w * q.y - q.z * q.x);
  const pitch = Math.abs(sinp) >= 1 
    ? Math.sign(sinp) * Math.PI / 2 
    : Math.asin(sinp);

  const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
  const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);

  return { x: roll, y: pitch, z: yaw };
}

export function eulerToQuaternion(euler: Vector3): Quaternion {
  // Input: XYZ Euler angles in radians
  const cx = Math.cos(euler.x / 2);
  const sx = Math.sin(euler.x / 2);
  const cy = Math.cos(euler.y / 2);
  const sy = Math.sin(euler.y / 2);
  const cz = Math.cos(euler.z / 2);
  const sz = Math.sin(euler.z / 2);

  return normalizeQuaternion({
    x: sx * cy * cz - cx * sy * sz,
    y: cx * sy * cz + sx * cy * sz,
    z: cx * cy * sz - sx * sy * cz,
    w: cx * cy * cz + sx * sy * sz,
  });
}

export function rotateVectorByQuaternion(v: Vector3, q: Quaternion): Vector3 {
  // q * v * q^-1
  const qv: Quaternion = { x: v.x, y: v.y, z: v.z, w: 0 };
  const qConj = conjugateQuaternion(q);
  const result = multiplyQuaternions(multiplyQuaternions(q, qv), qConj);
  return { x: result.x, y: result.y, z: result.z };
}

export function slerpQuaternion(a: Quaternion, b: Quaternion, t: number): Quaternion {
  // Spherical linear interpolation
  let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;

  // If dot is negative, negate one quaternion to take shorter path
  let bAdj = b;
  if (dot < 0) {
    bAdj = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
    dot = -dot;
  }

  // If quaternions are very close, use linear interpolation
  if (dot > 0.9995) {
    return normalizeQuaternion({
      x: a.x + t * (bAdj.x - a.x),
      y: a.y + t * (bAdj.y - a.y),
      z: a.z + t * (bAdj.z - a.z),
      w: a.w + t * (bAdj.w - a.w),
    });
  }

  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sinTheta;
  const wb = Math.sin(t * theta) / sinTheta;

  return normalizeQuaternion({
    x: wa * a.x + wb * bAdj.x,
    y: wa * a.y + wb * bAdj.y,
    z: wa * a.z + wb * bAdj.z,
    w: wa * a.w + wb * bAdj.w,
  });
}

// =============================================================================
// POSE OPERATIONS
// =============================================================================

export function identityPose(): Pose {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
  };
}

export function composePoses(parent: Pose, child: Pose): Pose {
  // Transform child pose by parent pose
  const rotatedPosition = rotateVectorByQuaternion(child.position, parent.rotation);
  
  return {
    position: addVectors(parent.position, rotatedPosition),
    rotation: normalizeQuaternion(multiplyQuaternions(parent.rotation, child.rotation)),
  };
}

export function invertPose(pose: Pose): Pose {
  // Get inverse pose (swap parent/child relationship)
  const invRotation = conjugateQuaternion(pose.rotation);
  const invPosition = scaleVector(
    rotateVectorByQuaternion(pose.position, invRotation),
    -1
  );
  
  return {
    position: invPosition,
    rotation: invRotation,
  };
}

export function interpolatePoses(a: Pose, b: Pose, t: number): Pose {
  return {
    position: {
      x: a.position.x + t * (b.position.x - a.position.x),
      y: a.position.y + t * (b.position.y - a.position.y),
      z: a.position.z + t * (b.position.z - a.position.z),
    },
    rotation: slerpQuaternion(a.rotation, b.rotation, t),
  };
}

// =============================================================================
// COORDINATE TRANSFORM CLASS
// =============================================================================

/**
 * CoordinateTransform
 * 
 * Manages transformation between local device coordinates and shared world coordinates.
 * Essential for multi-device AR experiences.
 */
export class CoordinateTransform {
  /** Transform from local to world coordinates */
  private localToWorld: Pose;
  
  /** Inverse transform (world to local) */
  private worldToLocal: Pose;

  constructor(localToWorld?: Pose) {
    this.localToWorld = localToWorld ?? identityPose();
    this.worldToLocal = invertPose(this.localToWorld);
  }

  // ===========================================================================
  // STATIC VECTOR OPERATIONS (for tests)
  // ===========================================================================

  static addVectors(a: Vector3, b: Vector3): Vector3 {
    return addVectors(a, b);
  }

  static subtractVectors(a: Vector3, b: Vector3): Vector3 {
    return subtractVectors(a, b);
  }

  static scaleVector(v: Vector3, s: number): Vector3 {
    return scaleVector(v, s);
  }

  static dotProduct(a: Vector3, b: Vector3): number {
    return dotProduct(a, b);
  }

  static crossProduct(a: Vector3, b: Vector3): Vector3 {
    return crossProduct(a, b);
  }

  static normalizeVector(v: Vector3): Vector3 {
    return normalizeVector(v);
  }

  static vectorLength(v: Vector3): number {
    return vectorLength(v);
  }

  static distance(a: Vector3, b: Vector3): number {
    return distanceBetween(a, b);
  }

  // ===========================================================================
  // STATIC QUATERNION OPERATIONS (for tests)
  // ===========================================================================

  static identityQuaternion(): Quaternion {
    return { x: 0, y: 0, z: 0, w: 1 };
  }

  static multiplyQuaternions(a: Quaternion, b: Quaternion): Quaternion {
    return multiplyQuaternions(a, b);
  }

  static invertQuaternion(q: Quaternion): Quaternion {
    return conjugateQuaternion(q);
  }

  static normalizeQuaternion(q: Quaternion): Quaternion {
    return normalizeQuaternion(q);
  }

  static slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
    return slerpQuaternion(a, b, t);
  }

  static fromAxisAngle(axis: Vector3, angle: number): Quaternion {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    const normalizedAxis = normalizeVector(axis);
    return {
      x: normalizedAxis.x * s,
      y: normalizedAxis.y * s,
      z: normalizedAxis.z * s,
      w: Math.cos(halfAngle),
    };
  }

  static rotateVector(v: Vector3, q: Quaternion): Vector3 {
    return rotateVectorByQuaternion(v, q);
  }

  // ===========================================================================
  // STATIC POSE OPERATIONS (for tests)
  // ===========================================================================

  static composePose(parent: Pose, child: Pose): Pose {
    return composePoses(parent, child);
  }

  static invertPose(pose: Pose): Pose {
    return invertPose(pose);
  }

  static lerpPose(a: Pose, b: Pose, t: number): Pose {
    return interpolatePoses(a, b, t);
  }

  // ===========================================================================
  // STATIC GPS UTILITIES (for tests)
  // ===========================================================================

  /**
   * Compute haversine distance between two GPS coordinates
   * @returns Distance in meters
   */
  static haversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => deg * Math.PI / 180;
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Convert GPS coordinates to East-North-Up (ENU) local coordinates
   * @returns Local ENU coordinates in meters
   */
  static gpsToENU(
    lat: number, lon: number, alt: number,
    refLat: number, refLon: number, refAlt: number
  ): Vector3 {
    const toRad = (deg: number) => deg * Math.PI / 180;
    
    // Earth radius at reference latitude
    const R = 6371000;
    const cosRef = Math.cos(toRad(refLat));
    
    // Approximate conversion
    const dLat = toRad(lat - refLat);
    const dLon = toRad(lon - refLon);
    
    const east = dLon * R * cosRef;  // X
    const north = dLat * R;          // Y
    const up = alt - refAlt;         // Z
    
    return { x: east, y: north, z: up };
  }

  /**
   * Set the local-to-world transform using an anchor observation
   * 
   * @param anchorWorldPose - Known world pose of the anchor
   * @param anchorLocalPose - Observed local pose of the anchor
   */
  setFromAnchor(anchorWorldPose: Pose, anchorLocalPose: Pose): void {
    // localToWorld = anchorWorldPose * inverse(anchorLocalPose)
    const invLocal = invertPose(anchorLocalPose);
    this.localToWorld = composePoses(anchorWorldPose, invLocal);
    this.worldToLocal = invertPose(this.localToWorld);
  }

  /**
   * Transform a point from local to world coordinates
   */
  localPointToWorld(localPoint: Vector3): Vector3 {
    const rotated = rotateVectorByQuaternion(localPoint, this.localToWorld.rotation);
    return addVectors(this.localToWorld.position, rotated);
  }

  /**
   * Transform a point from world to local coordinates
   */
  worldPointToLocal(worldPoint: Vector3): Vector3 {
    const rotated = rotateVectorByQuaternion(worldPoint, this.worldToLocal.rotation);
    return addVectors(this.worldToLocal.position, rotated);
  }

  /**
   * Transform a pose from local to world coordinates
   */
  localPoseToWorld(localPose: Pose): Pose {
    return composePoses(this.localToWorld, localPose);
  }

  /**
   * Transform a pose from world to local coordinates
   */
  worldPoseToLocal(worldPose: Pose): Pose {
    return composePoses(this.worldToLocal, worldPose);
  }

  /**
   * Transform a direction vector (ignores translation)
   */
  localDirectionToWorld(localDirection: Vector3): Vector3 {
    return rotateVectorByQuaternion(localDirection, this.localToWorld.rotation);
  }

  /**
   * Get the current local-to-world transform
   */
  getLocalToWorld(): Pose {
    return { ...this.localToWorld };
  }

  /**
   * Get the current world-to-local transform
   */
  getWorldToLocal(): Pose {
    return { ...this.worldToLocal };
  }

  /**
   * Refine the transform using a new anchor observation
   * Uses weighted averaging for smooth transitions
   * 
   * @param anchorWorldPose - Known world pose of the anchor
   * @param anchorLocalPose - Observed local pose of the anchor
   * @param weight - Weight of new observation (0-1)
   */
  refineFromAnchor(
    anchorWorldPose: Pose,
    anchorLocalPose: Pose,
    weight: number = 0.3
  ): void {
    // Compute new transform
    const invLocal = invertPose(anchorLocalPose);
    const newLocalToWorld = composePoses(anchorWorldPose, invLocal);
    
    // Interpolate between old and new
    this.localToWorld = interpolatePoses(this.localToWorld, newLocalToWorld, weight);
    this.worldToLocal = invertPose(this.localToWorld);
  }

  /**
   * Compute alignment error between observed and expected anchor position
   * 
   * @returns Error in meters (position) and radians (rotation)
   */
  computeAlignmentError(
    anchorWorldPose: Pose,
    anchorLocalPose: Pose
  ): { positionError: number; rotationError: number } {
    // Transform observed local pose to world
    const observedWorldPose = this.localPoseToWorld(anchorLocalPose);
    
    // Position error
    const positionError = distanceBetween(
      anchorWorldPose.position,
      observedWorldPose.position
    );
    
    // Rotation error (angle between quaternions)
    const dot = Math.abs(
      anchorWorldPose.rotation.x * observedWorldPose.rotation.x +
      anchorWorldPose.rotation.y * observedWorldPose.rotation.y +
      anchorWorldPose.rotation.z * observedWorldPose.rotation.z +
      anchorWorldPose.rotation.w * observedWorldPose.rotation.w
    );
    const rotationError = 2 * Math.acos(Math.min(1, dot));
    
    return { positionError, rotationError };
  }

  /**
   * Create a CoordinateTransform from two anchor observations
   * (Useful when device sees anchor at startup)
   */
  static fromAnchorPair(
    anchorWorldPose: Pose,
    anchorLocalPose: Pose
  ): CoordinateTransform {
    const transform = new CoordinateTransform();
    transform.setFromAnchor(anchorWorldPose, anchorLocalPose);
    return transform;
  }
}
