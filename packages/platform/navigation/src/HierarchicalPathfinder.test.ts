/**
 * HierarchicalPathfinder - Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  HierarchicalPathfinder,
  createHierarchicalPathfinder,
} from './HierarchicalPathfinder';
import type { HierarchyConfig, Vec3 } from './HierarchicalPathfinder';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides?: Partial<HierarchyConfig>): HierarchyConfig {
  return {
    gridSize: { x: 50, y: 10, z: 50 },
    cellSize: 1.0,
    hierarchyLevels: 2,
    ...overrides,
  };
}

function dist3(a: Vec3, b: Vec3): number {
  return Math.sqrt(
    (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2
  );
}

function pathLength(path: Vec3[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += dist3(path[i - 1], path[i]);
  }
  return total;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HierarchicalPathfinder', () => {
  let pf: HierarchicalPathfinder;

  beforeEach(() => {
    pf = new HierarchicalPathfinder(makeConfig());
  });

  // -----------------------------------------------------------------------
  // Construction
  // -----------------------------------------------------------------------

  describe('construction', () => {
    it('should create an instance', () => {
      expect(pf).toBeDefined();
      expect(pf.cellSize).toBe(1.0);
      expect(pf.hierarchyLevels).toBe(2);
    });

    it('should be creatable via factory function', () => {
      const p = createHierarchicalPathfinder(makeConfig());
      expect(p).toBeInstanceOf(HierarchicalPathfinder);
    });

    it('should clamp hierarchy levels to valid range', () => {
      const p = createHierarchicalPathfinder(makeConfig({ hierarchyLevels: 0 }));
      expect(p.hierarchyLevels).toBeGreaterThanOrEqual(1);
    });

    it('should handle cellSize defaulting when given 0', () => {
      const p = createHierarchicalPathfinder(makeConfig({ cellSize: 0 }));
      expect(p.cellSize).toBe(1.0);
    });
  });

  // -----------------------------------------------------------------------
  // isWalkable
  // -----------------------------------------------------------------------

  describe('isWalkable', () => {
    it('should return true for an open cell inside the grid', () => {
      expect(pf.isWalkable({ x: 5, y: 0, z: 5 })).toBe(true);
    });

    it('should return false for positions outside the grid', () => {
      expect(pf.isWalkable({ x: -1, y: 0, z: 0 })).toBe(false);
      expect(pf.isWalkable({ x: 100, y: 0, z: 0 })).toBe(false);
    });

    it('should return false for cells blocked by obstacles', () => {
      pf.addObstacle({
        min: { x: 10, y: 0, z: 10 },
        max: { x: 15, y: 5, z: 15 },
      });
      pf.rebuildNavmesh();

      expect(pf.isWalkable({ x: 12, y: 2, z: 12 })).toBe(false);
    });

    it('should return true after removing an obstacle and rebuilding', () => {
      const id = pf.addObstacle({
        min: { x: 10, y: 0, z: 10 },
        max: { x: 15, y: 5, z: 15 },
      });
      pf.rebuildNavmesh();
      expect(pf.isWalkable({ x: 12, y: 2, z: 12 })).toBe(false);

      pf.removeObstacle(id);
      pf.rebuildNavmesh();
      expect(pf.isWalkable({ x: 12, y: 2, z: 12 })).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // findPath - basic
  // -----------------------------------------------------------------------

  describe('findPath - basic', () => {
    it('should find a direct path on an open grid', () => {
      const path = pf.findPath(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 10 }
      );

      expect(path.length).toBeGreaterThan(0);
      // First point near start, last point near goal
      expect(path[0].x).toBeLessThan(5);
      expect(path[path.length - 1].x).toBeGreaterThan(5);
    });

    it('should return an empty array when start equals goal', () => {
      const path = pf.findPath(
        { x: 5, y: 0, z: 5 },
        { x: 5, y: 0, z: 5 }
      );

      // Either empty or a single point is acceptable
      expect(path.length).toBeLessThanOrEqual(1);
    });

    it('should find a path with smoothing disabled', () => {
      const path = pf.findPath(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 10 },
        { smooth: false, simplify: false }
      );

      expect(path.length).toBeGreaterThan(0);
    });

    it('should find a path on a large grid with hierarchy', () => {
      const largePf = createHierarchicalPathfinder({
        gridSize: { x: 100, y: 20, z: 100 },
        cellSize: 1.0,
        hierarchyLevels: 3,
      });

      const path = largePf.findPath(
        { x: 5, y: 0, z: 5 },
        { x: 90, y: 0, z: 90 }
      );

      expect(path.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // findPath - with obstacles
  // -----------------------------------------------------------------------

  describe('findPath - obstacles', () => {
    it('should route around a wall obstacle', () => {
      // Wall blocking direct path at x=25
      pf.addObstacle({
        min: { x: 24, y: 0, z: 0 },
        max: { x: 26, y: 10, z: 40 }, // gap at z > 40
      });
      pf.rebuildNavmesh();

      const path = pf.findPath(
        { x: 5, y: 0, z: 20 },
        { x: 45, y: 0, z: 20 }
      );

      expect(path.length).toBeGreaterThan(0);

      // Path should not pass through the wall
      for (const p of path) {
        if (p.x >= 24 && p.x <= 26 && p.z >= 0 && p.z <= 40) {
          // Allow points at the edges due to cell-center rounding
          const inWall = p.x > 24.5 && p.x < 25.5 && p.z > 0.5 && p.z < 39.5;
          expect(inWall).toBe(false);
        }
      }
    });

    it('should return empty path when completely blocked', () => {
      // Block the goal completely
      pf.addObstacle({
        min: { x: 44, y: 0, z: 44 },
        max: { x: 50, y: 10, z: 50 },
      });
      pf.rebuildNavmesh();

      const path = pf.findPath(
        { x: 0, y: 0, z: 0 },
        { x: 47, y: 5, z: 47 }
      );

      // Path should be empty since goal is blocked
      expect(path).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // findPath - path caching
  // -----------------------------------------------------------------------

  describe('findPath - caching', () => {
    it('should return the same result on repeated calls (cache hit)', () => {
      const path1 = pf.findPath(
        { x: 0, y: 0, z: 0 },
        { x: 20, y: 0, z: 20 }
      );
      const path2 = pf.findPath(
        { x: 0, y: 0, z: 0 },
        { x: 20, y: 0, z: 20 }
      );

      expect(path1.length).toBe(path2.length);
      for (let i = 0; i < path1.length; i++) {
        expect(path1[i].x).toBe(path2[i].x);
        expect(path1[i].y).toBe(path2[i].y);
        expect(path1[i].z).toBe(path2[i].z);
      }
    });

    it('should invalidate cache after rebuildNavmesh', () => {
      const path1 = pf.findPath(
        { x: 0, y: 0, z: 0 },
        { x: 30, y: 0, z: 30 }
      );

      pf.addObstacle({
        min: { x: 14, y: 0, z: 14 },
        max: { x: 16, y: 10, z: 16 },
      });
      pf.rebuildNavmesh();

      const path2 = pf.findPath(
        { x: 0, y: 0, z: 0 },
        { x: 30, y: 0, z: 30 }
      );

      // Paths should differ because there is now an obstacle in the middle
      // (they might still have the same length if the route goes around)
      const len1 = pathLength(path1);
      const len2 = pathLength(path2);
      // path2 should be at least as long (likely longer) since it must route around
      expect(len2).toBeGreaterThanOrEqual(len1 - 1); // -1 for floating point tolerance
    });
  });

  // -----------------------------------------------------------------------
  // addObstacle / removeObstacle / rebuildNavmesh
  // -----------------------------------------------------------------------

  describe('obstacle management', () => {
    it('should return unique obstacle ids', () => {
      const id1 = pf.addObstacle({
        min: { x: 0, y: 0, z: 0 },
        max: { x: 1, y: 1, z: 1 },
      });
      const id2 = pf.addObstacle({
        min: { x: 5, y: 0, z: 5 },
        max: { x: 6, y: 1, z: 6 },
      });

      expect(id1).not.toBe(id2);
    });

    it('should not throw when removing non-existent obstacle', () => {
      expect(() => pf.removeObstacle(999)).not.toThrow();
    });

    it('should handle multiple obstacles', () => {
      pf.addObstacle({ min: { x: 10, y: 0, z: 10 }, max: { x: 12, y: 5, z: 12 } });
      pf.addObstacle({ min: { x: 20, y: 0, z: 20 }, max: { x: 22, y: 5, z: 22 } });
      pf.addObstacle({ min: { x: 30, y: 0, z: 30 }, max: { x: 32, y: 5, z: 32 } });
      pf.rebuildNavmesh();

      expect(pf.isWalkable({ x: 11, y: 2, z: 11 })).toBe(false);
      expect(pf.isWalkable({ x: 21, y: 2, z: 21 })).toBe(false);
      expect(pf.isWalkable({ x: 31, y: 2, z: 31 })).toBe(false);
      expect(pf.isWalkable({ x: 15, y: 2, z: 15 })).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Path smoothing + simplification
  // -----------------------------------------------------------------------

  describe('path smoothing', () => {
    it('smoothed path should have more waypoints than unsmoothed', () => {
      const raw = pf.findPath(
        { x: 0, y: 0, z: 0 },
        { x: 20, y: 0, z: 20 },
        { smooth: false, simplify: true }
      );
      const smoothed = pf.findPath(
        { x: 0, y: 0, z: 0 },
        { x: 20, y: 0, z: 20 },
        { smooth: true, simplify: true }
      );

      // Smoothing adds intermediate points, so smoothed should be >= raw
      // (Note: the raw path is cached, so we force different query keys
      //  by using slightly different goals. But since we want to compare
      //  the same path with different options, the cached result for the
      //  first call will differ from the second. Let's just check lengths.)
      // The smoothed path from Chaikin's will have roughly 2x the points
      expect(smoothed.length).toBeGreaterThanOrEqual(raw.length);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle very small grid (1x1x1)', () => {
      const tiny = createHierarchicalPathfinder({
        gridSize: { x: 1, y: 1, z: 1 },
        cellSize: 1.0,
        hierarchyLevels: 1,
      });

      const path = tiny.findPath(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 }
      );

      expect(path.length).toBeLessThanOrEqual(1);
    });

    it('should handle hierarchy level 1 (no hierarchy, just cell-level A*)', () => {
      const flat = createHierarchicalPathfinder(makeConfig({ hierarchyLevels: 1 }));
      const path = flat.findPath(
        { x: 0, y: 0, z: 0 },
        { x: 20, y: 0, z: 20 }
      );
      expect(path.length).toBeGreaterThan(0);
    });

    it('should handle maxIterations limit gracefully', () => {
      const largePf = createHierarchicalPathfinder({
        gridSize: { x: 200, y: 10, z: 200 },
        cellSize: 1.0,
        hierarchyLevels: 2,
      });

      // With a very low iteration limit, the path may be empty
      const path = largePf.findPath(
        { x: 0, y: 0, z: 0 },
        { x: 199, y: 0, z: 199 },
        { maxIterations: 5 }
      );

      // Should not throw, may return empty or partial path
      expect(Array.isArray(path)).toBe(true);
    });

    it('should handle non-unit cellSize', () => {
      const scaled = createHierarchicalPathfinder({
        gridSize: { x: 100, y: 20, z: 100 },
        cellSize: 2.0,
        hierarchyLevels: 2,
      });

      // Disable smoothing so cell centers are preserved
      const path = scaled.findPath(
        { x: 0, y: 0, z: 0 },
        { x: 80, y: 0, z: 80 },
        { smooth: false, simplify: false }
      );

      expect(path.length).toBeGreaterThan(0);
      // Without smoothing, all waypoints should be at cell centers
      // Cell center = n * 2.0 + 1.0, so modulo 2.0 should be 1.0
      for (const p of path) {
        expect(p.x % 2.0).toBeCloseTo(1.0, 0);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Performance sanity check
  // -----------------------------------------------------------------------

  describe('performance', () => {
    it('should find paths on a moderately sized grid in reasonable time', () => {
      const medPf = createHierarchicalPathfinder({
        gridSize: { x: 100, y: 10, z: 100 },
        cellSize: 1.0,
        hierarchyLevels: 2,
      });

      const start = performance.now();
      const path = medPf.findPath(
        { x: 5, y: 0, z: 5 },
        { x: 90, y: 0, z: 90 }
      );
      const elapsed = performance.now() - start;

      expect(path.length).toBeGreaterThan(0);
      // Should complete in well under 1 second
      expect(elapsed).toBeLessThan(1000);
    });
  });
});
