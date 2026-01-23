/**
 * Kalman Filter Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KalmanFilter3D } from '../KalmanFilter';

describe('KalmanFilter3D', () => {
  let filter: KalmanFilter3D;

  beforeEach(() => {
    filter = new KalmanFilter3D();
  });

  describe('initialization', () => {
    it('should initialize with given position', () => {
      filter.initialize({ x: 1, y: 2, z: 3 });
      const state = filter.getState();
      
      expect(state.x).toBe(1);
      expect(state.y).toBe(2);
      expect(state.z).toBe(3);
    });

    it('should initialize velocity to zero', () => {
      filter.initialize({ x: 0, y: 0, z: 0 });
      const state = filter.getState();
      
      expect(state.vx).toBe(0);
      expect(state.vy).toBe(0);
      expect(state.vz).toBe(0);
    });
  });

  describe('predict', () => {
    it('should predict position based on velocity', () => {
      filter.initialize({ x: 0, y: 0, z: 0 });
      
      // Manually set velocity by doing an update
      filter.update({ x: 1, y: 0, z: 0 });
      
      // Predict next position
      filter.predict(1.0); // 1 second
      const state = filter.getState();
      
      // Position should move in direction of velocity
      expect(state.x).toBeGreaterThan(0);
    });

    it('should increase uncertainty during prediction', () => {
      filter.initialize({ x: 0, y: 0, z: 0 });
      
      const covBefore = filter.getCovariance();
      filter.predict(1.0);
      const covAfter = filter.getCovariance();
      
      // Diagonal elements should increase (more uncertainty)
      expect(covAfter[0]).toBeGreaterThanOrEqual(covBefore[0]);
    });
  });

  describe('update', () => {
    it('should move state toward measurement', () => {
      filter.initialize({ x: 0, y: 0, z: 0 });
      
      filter.update({ x: 10, y: 0, z: 0 });
      const state = filter.getState();
      
      // Should move toward measurement
      expect(state.x).toBeGreaterThan(0);
      expect(state.x).toBeLessThanOrEqual(10);
    });

    it('should converge to measurement with repeated updates', () => {
      filter.initialize({ x: 0, y: 0, z: 0 });
      
      // Repeated measurements at same position
      for (let i = 0; i < 10; i++) {
        filter.predict(0.1);
        filter.update({ x: 5, y: 5, z: 5 });
      }
      
      const state = filter.getState();
      
      // Should be very close to measurement
      expect(Math.abs(state.x - 5)).toBeLessThan(0.5);
      expect(Math.abs(state.y - 5)).toBeLessThan(0.5);
      expect(Math.abs(state.z - 5)).toBeLessThan(0.5);
    });
  });

  describe('mahalanobisDistance', () => {
    it('should return 0 for measurement at current state', () => {
      filter.initialize({ x: 5, y: 5, z: 5 });
      
      const distance = filter.mahalanobisDistance({ x: 5, y: 5, z: 5 });
      
      expect(distance).toBeCloseTo(0, 1);
    });

    it('should return larger distance for far measurements', () => {
      filter.initialize({ x: 0, y: 0, z: 0 });
      
      const near = filter.mahalanobisDistance({ x: 1, y: 0, z: 0 });
      const far = filter.mahalanobisDistance({ x: 10, y: 0, z: 0 });
      
      expect(far).toBeGreaterThan(near);
    });
  });

  describe('getPosition', () => {
    it('should return current position estimate', () => {
      filter.initialize({ x: 3, y: 4, z: 5 });
      
      const pos = filter.getPosition();
      
      expect(pos.x).toBe(3);
      expect(pos.y).toBe(4);
      expect(pos.z).toBe(5);
    });
  });

  describe('getVelocity', () => {
    it('should estimate velocity from motion', () => {
      filter.initialize({ x: 0, y: 0, z: 0 });
      
      // Simulate constant velocity motion
      for (let i = 1; i <= 5; i++) {
        filter.predict(0.1);
        filter.update({ x: i, y: 0, z: 0 });
      }
      
      const vel = filter.getVelocity();
      
      // Should have positive x velocity
      expect(vel.x).toBeGreaterThan(0);
    });
  });
});
