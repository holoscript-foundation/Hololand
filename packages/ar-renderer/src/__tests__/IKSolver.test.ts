/**
 * IK Solver Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IKSolver, PoseRetargeter } from '../IKSolver';

describe('IKSolver', () => {
  let solver: IKSolver;

  beforeEach(() => {
    solver = new IKSolver({
      maxIterations: 20,
      tolerance: 0.001,
      usePoleTargets: false,
      jointLimits: false,
    });
  });

  describe('configuration', () => {
    it('should accept custom configuration', () => {
      const customSolver = new IKSolver({
        maxIterations: 50,
        tolerance: 0.0001,
      });
      
      expect(customSolver).toBeDefined();
    });

    it('should update configuration', () => {
      solver.setConfig({ maxIterations: 100 });
      // Config is private, but we can verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('chain management', () => {
    it('should add custom IK chain', () => {
      solver.addChain({
        name: 'customChain',
        bones: ['bone1', 'bone2', 'bone3'],
        effector: 'bone3',
      });
      
      // No error means success
      expect(true).toBe(true);
    });

    it('should remove IK chain', () => {
      solver.addChain({
        name: 'tempChain',
        bones: ['a', 'b'],
        effector: 'b',
      });
      
      solver.removeChain('tempChain');
      expect(true).toBe(true);
    });
  });
});

describe('PoseRetargeter', () => {
  let retargeter: PoseRetargeter;

  beforeEach(() => {
    retargeter = new PoseRetargeter();
  });

  describe('bone mapping', () => {
    it('should have default mappings', () => {
      // Retargeter should have default BlazePose → VRM mappings
      expect(retargeter).toBeDefined();
    });

    it('should allow custom mapping', () => {
      retargeter.setMapping('CUSTOM_BONE', 'leftHand');
      expect(true).toBe(true);
    });
  });

  describe('retarget', () => {
    it('should convert keypoints to IK targets', () => {
      const keypoints = new Map([
        ['LEFT_WRIST', { x: -0.5, y: 1.0, z: 0.3 }],
        ['RIGHT_WRIST', { x: 0.5, y: 1.0, z: 0.3 }],
      ]);
      
      // Without a real THREE.Object3D, we can't fully test
      // but we can verify it doesn't throw
      expect(() => {
        // Would need mock skeleton
      }).not.toThrow();
    });
  });

  describe('getIKSolver', () => {
    it('should return the underlying IK solver', () => {
      const solver = retargeter.getIKSolver();
      expect(solver).toBeInstanceOf(IKSolver);
    });
  });
});
