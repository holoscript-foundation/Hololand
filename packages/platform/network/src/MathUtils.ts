/**
 * @hololand/network MathUtils
 *
 * Math utilities for smooth networked state interpolation.
 * Provides quaternion SLERP, Catmull-Rom splines, Hermite interpolation,
 * and cubic Bezier curves for correction blending.
 */

import type { Vector3, Quaternion } from './types';

// =============================================================================
// Vector3 Operations
// =============================================================================

export function vec3Add(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vec3Sub(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vec3Scale(v: Vector3, s: number): Vector3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function vec3Lerp(a: Vector3, b: Vector3, t: number): Vector3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function vec3Length(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vec3Distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// =============================================================================
// Quaternion Operations
// =============================================================================

export function quatNormalize(q: Quaternion): Quaternion {
  const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
  if (len < 1e-10) return { x: 0, y: 0, z: 0, w: 1 };
  const inv = 1 / len;
  return { x: q.x * inv, y: q.y * inv, z: q.z * inv, w: q.w * inv };
}

/**
 * Spherical linear interpolation between quaternions.
 * Handles antipodal quaternions (shortest path) and small-angle fallback.
 */
export function quatSlerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
  // Compute dot product
  let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;

  // If negative dot, negate one quaternion for shortest path
  let bx = b.x, by = b.y, bz = b.z, bw = b.w;
  if (dot < 0) {
    dot = -dot;
    bx = -bx; by = -by; bz = -bz; bw = -bw;
  }

  // Clamp dot to valid range
  dot = Math.min(dot, 1.0);

  // For very close quaternions, use lerp to avoid numerical issues
  if (dot > 0.9995) {
    const result: Quaternion = {
      x: a.x + (bx - a.x) * t,
      y: a.y + (by - a.y) * t,
      z: a.z + (bz - a.z) * t,
      w: a.w + (bw - a.w) * t,
    };
    return quatNormalize(result);
  }

  // Standard SLERP
  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sinTheta;
  const wb = Math.sin(t * theta) / sinTheta;

  return {
    x: a.x * wa + bx * wb,
    y: a.y * wa + by * wb,
    z: a.z * wa + bz * wb,
    w: a.w * wa + bw * wb,
  };
}

/** Convert Euler angles (radians) to quaternion. */
export function quatFromEuler(euler: Vector3): Quaternion {
  const cx = Math.cos(euler.x * 0.5), sx = Math.sin(euler.x * 0.5);
  const cy = Math.cos(euler.y * 0.5), sy = Math.sin(euler.y * 0.5);
  const cz = Math.cos(euler.z * 0.5), sz = Math.sin(euler.z * 0.5);

  return {
    x: sx * cy * cz - cx * sy * sz,
    y: cx * sy * cz + sx * cy * sz,
    z: cx * cy * sz - sx * sy * cz,
    w: cx * cy * cz + sx * sy * sz,
  };
}

/** Convert quaternion to Euler angles (radians). */
export function quatToEuler(q: Quaternion): Vector3 {
  // Roll (x)
  const sinrCosp = 2 * (q.w * q.x + q.y * q.z);
  const cosrCosp = 1 - 2 * (q.x * q.x + q.y * q.y);
  const x = Math.atan2(sinrCosp, cosrCosp);

  // Pitch (y) — clamp to avoid NaN from asin
  const sinp = 2 * (q.w * q.y - q.z * q.x);
  const y = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

  // Yaw (z)
  const sinyCosp = 2 * (q.w * q.z + q.x * q.y);
  const cosyCosp = 1 - 2 * (q.y * q.y + q.z * q.z);
  const z = Math.atan2(sinyCosp, cosyCosp);

  return { x, y, z };
}

// =============================================================================
// Spline Interpolation
// =============================================================================

/**
 * Catmull-Rom spline interpolation through 4 points.
 * Produces smooth curves passing through p1 and p2 at t=0 and t=1.
 */
export function catmullRom(
  p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, t: number
): Vector3 {
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    z: 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  };
}

/**
 * Hermite interpolation using positions and velocities at two endpoints.
 * Better than linear lerp because it accounts for velocity direction.
 *
 * @param pos0 Start position
 * @param vel0 Start velocity
 * @param pos1 End position
 * @param vel1 End velocity
 * @param t Interpolation factor [0, 1]
 * @param dt Time between endpoints (scales velocity contribution)
 */
export function hermiteInterpolate(
  pos0: Vector3, vel0: Vector3,
  pos1: Vector3, vel1: Vector3,
  t: number, dt: number
): Vector3 {
  const t2 = t * t;
  const t3 = t2 * t;

  // Hermite basis functions
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  return {
    x: h00 * pos0.x + h10 * vel0.x * dt + h01 * pos1.x + h11 * vel1.x * dt,
    y: h00 * pos0.y + h10 * vel0.y * dt + h01 * pos1.y + h11 * vel1.y * dt,
    z: h00 * pos0.z + h10 * vel0.z * dt + h01 * pos1.z + h11 * vel1.z * dt,
  };
}

/**
 * Cubic Bezier curve for smooth correction blending.
 * Used for tiered correction: eases from current to target over duration.
 */
export function cubicBezier(
  p0: Vector3, c1: Vector3, c2: Vector3, p3: Vector3, t: number
): Vector3 {
  const u = 1 - t;
  const u2 = u * u;
  const u3 = u2 * u;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: u3 * p0.x + 3 * u2 * t * c1.x + 3 * u * t2 * c2.x + t3 * p3.x,
    y: u3 * p0.y + 3 * u2 * t * c1.y + 3 * u * t2 * c2.y + t3 * p3.y,
    z: u3 * p0.z + 3 * u2 * t * c1.z + 3 * u * t2 * c2.z + t3 * p3.z,
  };
}
