/**
 * useHitTest — React hook for AR plane hit testing
 *
 * Wraps AnchorService to perform ray-based hit tests against detected
 * AR planes. Returns the hit position + normal for placing virtual objects.
 *
 * @module ar-hooks
 */

import { useState, useCallback, useRef } from 'react';
import type { Pose } from './useAnchor';

export interface HitTestResult {
  position: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  distance: number;
  planeId?: string;
  timestamp: number;
}

export interface HitTestState {
  lastHit: HitTestResult | null;
  hits: HitTestResult[];
  testRay: (
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
  ) => HitTestResult | null;
  testScreenPoint: (
    screenX: number,
    screenY: number,
    cameraPose: Pose,
    fov: number,
    aspect: number,
  ) => HitTestResult | null;
  clearHits: () => void;
}

/**
 * Compute ray from screen coordinates using camera parameters.
 */
function screenToRay(
  screenX: number,
  screenY: number,
  cameraPose: Pose,
  fov: number,
  aspect: number,
): { origin: { x: number; y: number; z: number }; direction: { x: number; y: number; z: number } } {
  // Convert screen coords to NDC (-1 to 1)
  const ndcX = screenX * 2 - 1;
  const ndcY = 1 - screenY * 2;

  // Compute ray in camera space
  const halfFov = Math.tan((fov * Math.PI) / 360);
  const dirX = ndcX * halfFov * aspect;
  const dirY = ndcY * halfFov;
  const dirZ = -1;

  // Normalize
  const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);

  // Apply camera rotation (simplified — assumes quaternion rotation)
  const { rotation: q, position: p } = cameraPose;
  const rx = dirX / len, ry = dirY / len, rz = dirZ / len;

  // Quaternion rotation of direction vector
  const ix = q.w * rx + q.y * rz - q.z * ry;
  const iy = q.w * ry + q.z * rx - q.x * rz;
  const iz = q.w * rz + q.x * ry - q.y * rx;
  const iw = -q.x * rx - q.y * ry - q.z * rz;

  const worldDirX = ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y;
  const worldDirY = iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z;
  const worldDirZ = iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x;

  return {
    origin: p,
    direction: { x: worldDirX, y: worldDirY, z: worldDirZ },
  };
}

/**
 * Simple ray-plane intersection test.
 * Planes are assumed to be horizontal (y-up) at a detected position.
 */
function rayPlaneIntersect(
  rayOrigin: { x: number; y: number; z: number },
  rayDir: { x: number; y: number; z: number },
  planeY: number,
): { hit: boolean; distance: number; point: { x: number; y: number; z: number } } {
  const normal = { x: 0, y: 1, z: 0 };
  const denom = rayDir.x * normal.x + rayDir.y * normal.y + rayDir.z * normal.z;

  if (Math.abs(denom) < 1e-6) {
    return { hit: false, distance: Infinity, point: { x: 0, y: 0, z: 0 } };
  }

  const t = (planeY - rayOrigin.y) / denom;
  if (t < 0) {
    return { hit: false, distance: Infinity, point: { x: 0, y: 0, z: 0 } };
  }

  return {
    hit: true,
    distance: t,
    point: {
      x: rayOrigin.x + rayDir.x * t,
      y: planeY,
      z: rayOrigin.z + rayDir.z * t,
    },
  };
}

/**
 * React hook for AR hit testing against detected planes.
 *
 * Usage:
 * ```tsx
 * const { lastHit, testScreenPoint } = useHitTest();
 * const hit = testScreenPoint(0.5, 0.5, cameraPose, 60, 16/9);
 * if (hit) placeObject(hit.position);
 * ```
 */
export function useHitTest(): HitTestState {
  const [lastHit, setLastHit] = useState<HitTestResult | null>(null);
  const [hits, setHits] = useState<HitTestResult[]>([]);
  const planeYRef = useRef(0); // Default ground plane at y=0

  const testRay = useCallback((
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
  ): HitTestResult | null => {
    const result = rayPlaneIntersect(origin, direction, planeYRef.current);

    if (!result.hit) return null;

    const hit: HitTestResult = {
      position: result.point,
      normal: { x: 0, y: 1, z: 0 },
      distance: result.distance,
      timestamp: Date.now(),
    };

    setLastHit(hit);
    setHits((prev) => [...prev.slice(-19), hit]); // Keep last 20 hits
    return hit;
  }, []);

  const testScreenPoint = useCallback((
    screenX: number,
    screenY: number,
    cameraPose: Pose,
    fov: number,
    aspect: number,
  ): HitTestResult | null => {
    const ray = screenToRay(screenX, screenY, cameraPose, fov, aspect);
    return testRay(ray.origin, ray.direction);
  }, [testRay]);

  const clearHits = useCallback(() => {
    setLastHit(null);
    setHits([]);
  }, []);

  return { lastHit, hits, testRay, testScreenPoint, clearHits };
}
