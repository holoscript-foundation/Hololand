/**
 * FlowFieldGenerator - Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlowFieldGenerator } from './FlowFieldGenerator';
import type { FlowFieldConfig, Vec2 } from './FlowFieldGenerator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides?: Partial<FlowFieldConfig>): FlowFieldConfig {
  return { width: 20, height: 20, cellSize: 1.0, ...overrides };
}

function magnitude(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FlowFieldGenerator', () => {
  let ff: FlowFieldGenerator;

  beforeEach(() => {
    ff = new FlowFieldGenerator(makeConfig());
  });

  // -----------------------------------------------------------------------
  // Construction
  // -----------------------------------------------------------------------

  describe('construction', () => {
    it('should create an instance with valid config', () => {
      expect(ff).toBeDefined();
      expect(ff.width).toBe(20);
      expect(ff.height).toBe(20);
      expect(ff.cellSize).toBe(1.0);
    });

    it('should clamp negative dimensions to at least 1', () => {
      const small = new FlowFieldGenerator({ width: -5, height: 0, cellSize: 1 });
      expect(small.width).toBeGreaterThanOrEqual(1);
      expect(small.height).toBeGreaterThanOrEqual(1);
    });

    it('should default cellSize to 1.0 when given zero or negative', () => {
      const ff2 = new FlowFieldGenerator({ width: 10, height: 10, cellSize: 0 });
      expect(ff2.cellSize).toBe(1.0);
    });
  });

  // -----------------------------------------------------------------------
  // setGoal + getDirection
  // -----------------------------------------------------------------------

  describe('setGoal and getDirection', () => {
    it('should return zero direction before setGoal is called', () => {
      const dir = ff.getDirection({ x: 5, y: 5 });
      expect(dir.x).toBe(0);
      expect(dir.y).toBe(0);
    });

    it('should return zero direction at the goal cell', () => {
      ff.setGoal({ x: 10, y: 10 });
      const dir = ff.getDirection({ x: 10, y: 10 });
      expect(dir.x).toBe(0);
      expect(dir.y).toBe(0);
    });

    it('should return a normalized direction pointing toward the goal', () => {
      ff.setGoal({ x: 15, y: 15 });

      // Check a cell that is to the left and below the goal
      const dir = ff.getDirection({ x: 5, y: 5 });
      // Direction should roughly point toward +x, +y
      expect(dir.x).toBeGreaterThan(0);
      expect(dir.y).toBeGreaterThan(0);

      const mag = magnitude(dir);
      if (mag > 0) {
        expect(mag).toBeCloseTo(1.0, 1);
      }
    });

    it('should return zero for out-of-bounds positions', () => {
      ff.setGoal({ x: 10, y: 10 });
      const dir = ff.getDirection({ x: -5, y: -5 });
      expect(dir.x).toBe(0);
      expect(dir.y).toBe(0);
    });

    it('should return zero for positions beyond the grid', () => {
      ff.setGoal({ x: 10, y: 10 });
      const dir = ff.getDirection({ x: 100, y: 100 });
      expect(dir.x).toBe(0);
      expect(dir.y).toBe(0);
    });

    it('agents closer to goal should also point toward goal', () => {
      ff.setGoal({ x: 19, y: 19 });
      const dirFar = ff.getDirection({ x: 1, y: 1 });
      const dirNear = ff.getDirection({ x: 17, y: 17 });

      // Both should have positive x and y components
      expect(dirFar.x).toBeGreaterThan(0);
      expect(dirFar.y).toBeGreaterThan(0);
      expect(dirNear.x).toBeGreaterThan(0);
      expect(dirNear.y).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // Obstacles
  // -----------------------------------------------------------------------

  describe('obstacles', () => {
    it('should return zero direction for an obstacle cell', () => {
      ff.addObstacle({ x: 10, y: 10 });
      ff.setGoal({ x: 15, y: 15 });
      const dir = ff.getDirection({ x: 10, y: 10 });
      expect(dir.x).toBe(0);
      expect(dir.y).toBe(0);
    });

    it('agents should route around obstacles', () => {
      // Create a wall of obstacles blocking direct path
      for (let i = 0; i < 20; i++) {
        ff.addObstacle({ x: 10, y: i });
      }
      // Leave a gap at y=19 (top)
      ff.removeObstacle({ x: 10, y: 19 });
      ff.setGoal({ x: 15, y: 10 });

      // Agent on the left side should still get a non-zero direction
      const dir = ff.getDirection({ x: 5, y: 10 });
      const mag = magnitude(dir);
      // Should have found some direction (route around the wall)
      expect(mag).toBeGreaterThan(0);
    });

    it('should allow removing obstacles and recomputing', () => {
      ff.addObstacle({ x: 10, y: 10 });
      ff.setGoal({ x: 10, y: 10 }); // goal ON obstacle

      ff.removeObstacle({ x: 10, y: 10 });
      ff.compute();

      // After removal, nearby cell should have a direction toward goal
      const dir = ff.getDirection({ x: 8, y: 8 });
      expect(dir.x).toBeGreaterThanOrEqual(0);
      expect(dir.y).toBeGreaterThanOrEqual(0);
    });
  });

  // -----------------------------------------------------------------------
  // compute()
  // -----------------------------------------------------------------------

  describe('compute', () => {
    it('should do nothing if no goal is set', () => {
      // Should not throw
      ff.compute();
      const dir = ff.getDirection({ x: 5, y: 5 });
      expect(dir.x).toBe(0);
      expect(dir.y).toBe(0);
    });

    it('should recompute after goal changes', () => {
      ff.setGoal({ x: 0, y: 0 });
      const dir1 = ff.getDirection({ x: 10, y: 10 });

      ff.setGoal({ x: 19, y: 19 });
      const dir2 = ff.getDirection({ x: 10, y: 10 });

      // Directions should be opposite (toward opposite corners)
      expect(dir1.x).toBeLessThan(0);
      expect(dir1.y).toBeLessThan(0);
      expect(dir2.x).toBeGreaterThan(0);
      expect(dir2.y).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // Cell size
  // -----------------------------------------------------------------------

  describe('cell size', () => {
    it('should correctly map world positions to cells with non-unit cellSize', () => {
      const ff2 = new FlowFieldGenerator({ width: 50, height: 50, cellSize: 2.0 });
      ff2.setGoal({ x: 90, y: 90 }); // cell (45, 45)

      const dir = ff2.getDirection({ x: 10, y: 10 }); // cell (5, 5)
      expect(dir.x).toBeGreaterThan(0);
      expect(dir.y).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle 1x1 grid', () => {
      const tiny = new FlowFieldGenerator({ width: 1, height: 1, cellSize: 1 });
      tiny.setGoal({ x: 0, y: 0 });
      const dir = tiny.getDirection({ x: 0, y: 0 });
      expect(dir.x).toBe(0);
      expect(dir.y).toBe(0);
    });

    it('should handle goal at grid corner (0,0)', () => {
      ff.setGoal({ x: 0, y: 0 });
      const dir = ff.getDirection({ x: 5, y: 5 });
      expect(dir.x).toBeLessThan(0);
      expect(dir.y).toBeLessThan(0);
    });

    it('should handle goal at grid corner (max, max)', () => {
      ff.setGoal({ x: 19, y: 19 });
      const dir = ff.getDirection({ x: 5, y: 5 });
      expect(dir.x).toBeGreaterThan(0);
      expect(dir.y).toBeGreaterThan(0);
    });
  });
});
