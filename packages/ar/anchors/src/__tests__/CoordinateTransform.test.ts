/**
 * Coordinate Transform Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { CoordinateTransform } from '../CoordinateTransform';

describe('CoordinateTransform', () => {
  describe('vector operations', () => {
    it('should add vectors', () => {
      const a = { x: 1, y: 2, z: 3 };
      const b = { x: 4, y: 5, z: 6 };
      
      const result = CoordinateTransform.addVectors(a, b);
      
      expect(result).toEqual({ x: 5, y: 7, z: 9 });
    });

    it('should subtract vectors', () => {
      const a = { x: 5, y: 7, z: 9 };
      const b = { x: 1, y: 2, z: 3 };
      
      const result = CoordinateTransform.subtractVectors(a, b);
      
      expect(result).toEqual({ x: 4, y: 5, z: 6 });
    });

    it('should scale vector', () => {
      const v = { x: 1, y: 2, z: 3 };
      
      const result = CoordinateTransform.scaleVector(v, 2);
      
      expect(result).toEqual({ x: 2, y: 4, z: 6 });
    });

    it('should compute dot product', () => {
      const a = { x: 1, y: 0, z: 0 };
      const b = { x: 0, y: 1, z: 0 };
      
      const dot = CoordinateTransform.dotProduct(a, b);
      
      expect(dot).toBe(0); // Orthogonal
    });

    it('should compute cross product', () => {
      const a = { x: 1, y: 0, z: 0 };
      const b = { x: 0, y: 1, z: 0 };
      
      const cross = CoordinateTransform.crossProduct(a, b);
      
      expect(cross).toEqual({ x: 0, y: 0, z: 1 });
    });

    it('should normalize vector', () => {
      const v = { x: 3, y: 4, z: 0 };
      
      const normalized = CoordinateTransform.normalizeVector(v);
      const length = Math.sqrt(
        normalized.x ** 2 + normalized.y ** 2 + normalized.z ** 2
      );
      
      expect(length).toBeCloseTo(1, 5);
    });

    it('should compute vector length', () => {
      const v = { x: 3, y: 4, z: 0 };
      
      const length = CoordinateTransform.vectorLength(v);
      
      expect(length).toBe(5);
    });

    it('should compute distance between vectors', () => {
      const a = { x: 0, y: 0, z: 0 };
      const b = { x: 3, y: 4, z: 0 };
      
      const distance = CoordinateTransform.distance(a, b);
      
      expect(distance).toBe(5);
    });
  });

  describe('quaternion operations', () => {
    it('should return identity quaternion', () => {
      const identity = CoordinateTransform.identityQuaternion();
      
      expect(identity).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    });

    it('should multiply quaternions', () => {
      const identity = CoordinateTransform.identityQuaternion();
      const q = { x: 0, y: 0.707, z: 0, w: 0.707 }; // 90° around Y
      
      const result = CoordinateTransform.multiplyQuaternions(identity, q);
      
      // Identity * q = q
      expect(result.x).toBeCloseTo(q.x, 3);
      expect(result.y).toBeCloseTo(q.y, 3);
      expect(result.z).toBeCloseTo(q.z, 3);
      expect(result.w).toBeCloseTo(q.w, 3);
    });

    it('should invert quaternion', () => {
      const q = { x: 0, y: 0.707, z: 0, w: 0.707 };
      
      const inverse = CoordinateTransform.invertQuaternion(q);
      
      // q * q^-1 = identity
      const product = CoordinateTransform.multiplyQuaternions(q, inverse);
      
      expect(product.x).toBeCloseTo(0, 3);
      expect(product.y).toBeCloseTo(0, 3);
      expect(product.z).toBeCloseTo(0, 3);
      expect(product.w).toBeCloseTo(1, 3);
    });

    it('should normalize quaternion', () => {
      const q = { x: 1, y: 1, z: 1, w: 1 };
      
      const normalized = CoordinateTransform.normalizeQuaternion(q);
      const length = Math.sqrt(
        normalized.x ** 2 + normalized.y ** 2 + 
        normalized.z ** 2 + normalized.w ** 2
      );
      
      expect(length).toBeCloseTo(1, 5);
    });

    it('should slerp quaternions', () => {
      const a = CoordinateTransform.identityQuaternion();
      const b = { x: 0, y: 1, z: 0, w: 0 }; // 180° around Y
      
      // Halfway rotation
      const mid = CoordinateTransform.slerp(a, b, 0.5);
      
      // Should be 90° rotation (approximately)
      expect(Math.abs(mid.y)).toBeGreaterThan(0);
    });

    it('should create quaternion from axis angle', () => {
      const axis = { x: 0, y: 1, z: 0 };
      const angle = Math.PI / 2; // 90 degrees
      
      const q = CoordinateTransform.fromAxisAngle(axis, angle);
      
      expect(q.y).toBeCloseTo(Math.sin(angle / 2), 3);
      expect(q.w).toBeCloseTo(Math.cos(angle / 2), 3);
    });

    it('should rotate vector by quaternion', () => {
      const v = { x: 1, y: 0, z: 0 };
      const q = CoordinateTransform.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2);
      
      const rotated = CoordinateTransform.rotateVector(v, q);
      
      // Rotating X axis 90° around Y should give Z axis
      expect(rotated.x).toBeCloseTo(0, 3);
      expect(rotated.y).toBeCloseTo(0, 3);
      expect(rotated.z).toBeCloseTo(-1, 3);
    });
  });

  describe('pose operations', () => {
    it('should compose poses', () => {
      const parent = {
        position: { x: 10, y: 0, z: 0 },
        rotation: CoordinateTransform.identityQuaternion(),
      };
      const child = {
        position: { x: 5, y: 0, z: 0 },
        rotation: CoordinateTransform.identityQuaternion(),
      };
      
      const composed = CoordinateTransform.composePose(parent, child);
      
      expect(composed.position.x).toBe(15);
    });

    it('should invert pose', () => {
      const pose = {
        position: { x: 10, y: 5, z: 3 },
        rotation: CoordinateTransform.identityQuaternion(),
      };
      
      const inverse = CoordinateTransform.invertPose(pose);
      
      // pose * inverse = identity
      const identity = CoordinateTransform.composePose(pose, inverse);
      
      expect(identity.position.x).toBeCloseTo(0, 3);
      expect(identity.position.y).toBeCloseTo(0, 3);
      expect(identity.position.z).toBeCloseTo(0, 3);
    });

    it('should lerp poses', () => {
      const a = {
        position: { x: 0, y: 0, z: 0 },
        rotation: CoordinateTransform.identityQuaternion(),
      };
      const b = {
        position: { x: 10, y: 10, z: 10 },
        rotation: CoordinateTransform.identityQuaternion(),
      };
      
      const mid = CoordinateTransform.lerpPose(a, b, 0.5);
      
      expect(mid.position).toEqual({ x: 5, y: 5, z: 5 });
    });
  });

  describe('GPS utilities', () => {
    it('should compute haversine distance', () => {
      // New York to Los Angeles (approximately)
      const nyLat = 40.7128;
      const nyLon = -74.0060;
      const laLat = 34.0522;
      const laLon = -118.2437;
      
      const distance = CoordinateTransform.haversineDistance(
        nyLat, nyLon, laLat, laLon
      );
      
      // Should be about 3944 km
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });

    it('should convert GPS to ENU', () => {
      // Reference point
      const refLat = 37.7749;
      const refLon = -122.4194;
      const refAlt = 0;
      
      // Same point should give (0, 0, 0)
      const enu = CoordinateTransform.gpsToENU(
        refLat, refLon, refAlt,
        refLat, refLon, refAlt
      );
      
      expect(enu.x).toBeCloseTo(0, 1);
      expect(enu.y).toBeCloseTo(0, 1);
      expect(enu.z).toBeCloseTo(0, 1);
    });

    it('should convert point east of reference', () => {
      const refLat = 0;
      const refLon = 0;
      const refAlt = 0;
      
      // Point 0.001° east (about 111m at equator)
      const enu = CoordinateTransform.gpsToENU(
        0, 0.001, 0,
        refLat, refLon, refAlt
      );
      
      // East should be positive X
      expect(enu.x).toBeGreaterThan(100);
      expect(Math.abs(enu.y)).toBeLessThan(1);
    });
  });
});
