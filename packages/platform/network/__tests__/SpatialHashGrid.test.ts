import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialHashGrid } from '../src/SpatialHashGrid';
import type { Vector3 } from '../src/types';

function v(x: number, y: number, z: number): Vector3 {
  return { x, y, z };
}

describe('SpatialHashGrid', () => {
  let grid: SpatialHashGrid;

  beforeEach(() => {
    grid = new SpatialHashGrid(10);
  });

  // ==========================================================================
  // Construction
  // ==========================================================================

  describe('constructor', () => {
    it('creates a grid with the specified cell size', () => {
      const g = new SpatialHashGrid(25);
      expect(g.size).toBe(0);
    });

    it('uses default cell size of 50', () => {
      const g = new SpatialHashGrid();
      g.insert('a', v(0, 0, 0));
      g.insert('b', v(49, 0, 0));
      // Both should be in the same cell (cell size 50)
      expect(g.queryCell(0, 0, 0)).toEqual(expect.arrayContaining(['a', 'b']));
    });

    it('throws on zero cell size', () => {
      expect(() => new SpatialHashGrid(0)).toThrow('Cell size must be positive');
    });

    it('throws on negative cell size', () => {
      expect(() => new SpatialHashGrid(-5)).toThrow('Cell size must be positive');
    });
  });

  // ==========================================================================
  // Insert
  // ==========================================================================

  describe('insert', () => {
    it('inserts an entity and tracks it', () => {
      grid.insert('e1', v(5, 5, 5));
      expect(grid.has('e1')).toBe(true);
      expect(grid.size).toBe(1);
    });

    it('stores the position correctly', () => {
      grid.insert('e1', v(3, 7, 11));
      expect(grid.getPosition('e1')).toEqual(v(3, 7, 11));
    });

    it('places entity in the correct cell', () => {
      grid.insert('e1', v(5, 5, 5)); // cell (0,0,0)
      grid.insert('e2', v(15, 5, 5)); // cell (1,0,0)
      expect(grid.queryCell(0, 0, 0)).toEqual(['e1']);
      expect(grid.queryCell(1, 0, 0)).toEqual(['e2']);
    });

    it('handles negative positions', () => {
      grid.insert('neg', v(-5, -15, -25));
      const coords = grid.getCellCoords(v(-5, -15, -25));
      expect(coords).toEqual({ cx: -1, cy: -2, cz: -3 });
      expect(grid.has('neg')).toBe(true);
    });

    it('updates entity if already inserted', () => {
      grid.insert('e1', v(5, 5, 5));
      grid.insert('e1', v(15, 15, 15));
      expect(grid.size).toBe(1);
      expect(grid.getPosition('e1')).toEqual(v(15, 15, 15));
    });

    it('handles multiple entities in the same cell', () => {
      grid.insert('a', v(1, 1, 1));
      grid.insert('b', v(2, 2, 2));
      grid.insert('c', v(3, 3, 3));
      expect(grid.queryCell(0, 0, 0).sort()).toEqual(['a', 'b', 'c']);
    });

    it('stores a copy of position (no reference sharing)', () => {
      const pos = v(5, 5, 5);
      grid.insert('e1', pos);
      pos.x = 999;
      expect(grid.getPosition('e1')!.x).toBe(5);
    });
  });

  // ==========================================================================
  // Update
  // ==========================================================================

  describe('update', () => {
    it('updates position within the same cell', () => {
      grid.insert('e1', v(1, 1, 1));
      grid.update('e1', v(3, 3, 3));
      expect(grid.getPosition('e1')).toEqual(v(3, 3, 3));
      expect(grid.queryCell(0, 0, 0)).toContain('e1');
    });

    it('moves entity between cells', () => {
      grid.insert('e1', v(5, 5, 5)); // cell (0,0,0)
      grid.update('e1', v(15, 5, 5)); // cell (1,0,0)
      expect(grid.queryCell(0, 0, 0)).not.toContain('e1');
      expect(grid.queryCell(1, 0, 0)).toContain('e1');
    });

    it('cleans up empty cells after moving last entity out', () => {
      grid.insert('e1', v(5, 5, 5));
      grid.update('e1', v(15, 5, 5));
      const stats = grid.getStats();
      expect(stats.cellCount).toBe(1);
    });

    it('inserts if entity is not tracked', () => {
      grid.update('new', v(10, 10, 10));
      expect(grid.has('new')).toBe(true);
      expect(grid.getPosition('new')).toEqual(v(10, 10, 10));
    });

    it('handles rapid cell-boundary crossings', () => {
      grid.insert('e1', v(9, 0, 0)); // cell 0
      grid.update('e1', v(11, 0, 0)); // cell 1
      grid.update('e1', v(9, 0, 0)); // back to cell 0
      grid.update('e1', v(11, 0, 0)); // cell 1 again
      expect(grid.queryCell(1, 0, 0)).toContain('e1');
      expect(grid.queryCell(0, 0, 0)).not.toContain('e1');
      expect(grid.size).toBe(1);
    });
  });

  // ==========================================================================
  // Remove
  // ==========================================================================

  describe('remove', () => {
    it('removes a tracked entity', () => {
      grid.insert('e1', v(5, 5, 5));
      const removed = grid.remove('e1');
      expect(removed).toBe(true);
      expect(grid.has('e1')).toBe(false);
      expect(grid.size).toBe(0);
    });

    it('returns false for unknown entity', () => {
      expect(grid.remove('ghost')).toBe(false);
    });

    it('cleans up empty cell', () => {
      grid.insert('e1', v(5, 5, 5));
      grid.remove('e1');
      expect(grid.getStats().cellCount).toBe(0);
    });

    it('does not affect other entities in the same cell', () => {
      grid.insert('a', v(1, 1, 1));
      grid.insert('b', v(2, 2, 2));
      grid.remove('a');
      expect(grid.has('b')).toBe(true);
      expect(grid.queryCell(0, 0, 0)).toEqual(['b']);
    });
  });

  // ==========================================================================
  // queryRadius
  // ==========================================================================

  describe('queryRadius', () => {
    it('finds entities within radius', () => {
      grid.insert('close', v(5, 0, 0));
      grid.insert('far', v(100, 0, 0));
      const result = grid.queryRadius(v(0, 0, 0), 10);
      expect(result).toContain('close');
      expect(result).not.toContain('far');
    });

    it('includes entities exactly at the radius boundary', () => {
      grid.insert('boundary', v(10, 0, 0));
      const result = grid.queryRadius(v(0, 0, 0), 10);
      expect(result).toContain('boundary');
    });

    it('returns empty array when no entities in range', () => {
      grid.insert('far', v(100, 100, 100));
      expect(grid.queryRadius(v(0, 0, 0), 5)).toEqual([]);
    });

    it('handles 3D distance correctly', () => {
      grid.insert('e1', v(6, 6, 6)); // distance from origin ≈ 10.39
      const result5 = grid.queryRadius(v(0, 0, 0), 5);
      expect(result5).not.toContain('e1');
      const result11 = grid.queryRadius(v(0, 0, 0), 11);
      expect(result11).toContain('e1');
    });

    it('works across multiple cells', () => {
      grid.insert('a', v(5, 0, 0)); // cell (0,0,0)
      grid.insert('b', v(12, 0, 0)); // cell (1,0,0)
      grid.insert('c', v(25, 0, 0)); // cell (2,0,0)
      const result = grid.queryRadius(v(10, 0, 0), 8);
      expect(result).toContain('a'); // dist=5
      expect(result).toContain('b'); // dist=2
      expect(result).not.toContain('c'); // dist=15
    });

    it('handles negative center positions', () => {
      grid.insert('neg', v(-5, -5, -5));
      const result = grid.queryRadius(v(-3, -3, -3), 10);
      expect(result).toContain('neg');
    });

    it('handles large radius efficiently', () => {
      for (let i = 0; i < 50; i++) {
        grid.insert(`e${i}`, v(i * 3, 0, 0));
      }
      const result = grid.queryRadius(v(50, 0, 0), 20);
      // Within 20 units of x=50: entities from x=30 to x=70 → i=10..23
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThan(50);
    });
  });

  // ==========================================================================
  // queryCell
  // ==========================================================================

  describe('queryCell', () => {
    it('returns entities in a specific cell', () => {
      grid.insert('a', v(1, 1, 1));
      grid.insert('b', v(2, 2, 2));
      expect(grid.queryCell(0, 0, 0).sort()).toEqual(['a', 'b']);
    });

    it('returns empty array for empty cell', () => {
      expect(grid.queryCell(99, 99, 99)).toEqual([]);
    });
  });

  // ==========================================================================
  // getNearby
  // ==========================================================================

  describe('getNearby', () => {
    it('returns entities in adjacent cells', () => {
      grid.insert('center', v(5, 5, 5)); // cell (0,0,0)
      grid.insert('adj', v(15, 5, 5)); // cell (1,0,0) — adjacent
      grid.insert('far', v(35, 5, 5)); // cell (3,0,0) — NOT adjacent
      const nearby = grid.getNearby('center');
      expect(nearby).toContain('adj');
      expect(nearby).not.toContain('far');
    });

    it('does not include the entity itself', () => {
      grid.insert('e1', v(5, 5, 5));
      grid.insert('e2', v(6, 6, 6));
      const nearby = grid.getNearby('e1');
      expect(nearby).not.toContain('e1');
      expect(nearby).toContain('e2');
    });

    it('returns empty for unknown entity', () => {
      expect(grid.getNearby('ghost')).toEqual([]);
    });

    it('includes entities in all 26 adjacent cells + own cell', () => {
      // Place entity at center of cell (0,0,0)
      grid.insert('center', v(5, 5, 5));
      // Place entities in cells (-1,-1,-1) and (1,1,1)
      grid.insert('corner1', v(-5, -5, -5));
      grid.insert('corner2', v(15, 15, 15));
      const nearby = grid.getNearby('center');
      expect(nearby).toContain('corner1');
      expect(nearby).toContain('corner2');
    });
  });

  // ==========================================================================
  // getPosition / has
  // ==========================================================================

  describe('getPosition', () => {
    it('returns position for tracked entity', () => {
      grid.insert('e1', v(3, 7, 11));
      expect(grid.getPosition('e1')).toEqual(v(3, 7, 11));
    });

    it('returns undefined for unknown entity', () => {
      expect(grid.getPosition('ghost')).toBeUndefined();
    });

    it('returns a copy, not a reference', () => {
      grid.insert('e1', v(5, 5, 5));
      const pos = grid.getPosition('e1')!;
      pos.x = 999;
      expect(grid.getPosition('e1')!.x).toBe(5);
    });
  });

  // ==========================================================================
  // getCellCoords
  // ==========================================================================

  describe('getCellCoords', () => {
    it('maps positions to correct grid cells', () => {
      expect(grid.getCellCoords(v(0, 0, 0))).toEqual({ cx: 0, cy: 0, cz: 0 });
      expect(grid.getCellCoords(v(9, 9, 9))).toEqual({ cx: 0, cy: 0, cz: 0 });
      expect(grid.getCellCoords(v(10, 0, 0))).toEqual({ cx: 1, cy: 0, cz: 0 });
      expect(grid.getCellCoords(v(25, 35, 45))).toEqual({ cx: 2, cy: 3, cz: 4 });
    });

    it('handles negative positions', () => {
      expect(grid.getCellCoords(v(-1, -1, -1))).toEqual({ cx: -1, cy: -1, cz: -1 });
      expect(grid.getCellCoords(v(-10, -10, -10))).toEqual({ cx: -1, cy: -1, cz: -1 });
      expect(grid.getCellCoords(v(-11, 0, 0))).toEqual({ cx: -2, cy: 0, cz: 0 });
    });
  });

  // ==========================================================================
  // clear
  // ==========================================================================

  describe('clear', () => {
    it('removes all entities', () => {
      grid.insert('a', v(0, 0, 0));
      grid.insert('b', v(10, 10, 10));
      grid.clear();
      expect(grid.size).toBe(0);
      expect(grid.getStats().cellCount).toBe(0);
    });
  });

  // ==========================================================================
  // getStats
  // ==========================================================================

  describe('getStats', () => {
    it('reports correct counts', () => {
      grid.insert('a', v(1, 1, 1));
      grid.insert('b', v(2, 2, 2)); // same cell as a
      grid.insert('c', v(15, 15, 15)); // different cell
      const stats = grid.getStats();
      expect(stats.entityCount).toBe(3);
      expect(stats.cellCount).toBe(2);
      expect(stats.maxEntitiesInCell).toBe(2);
      expect(stats.avgEntitiesPerCell).toBe(1.5);
    });

    it('reports zeros when empty', () => {
      const stats = grid.getStats();
      expect(stats.entityCount).toBe(0);
      expect(stats.cellCount).toBe(0);
      expect(stats.avgEntitiesPerCell).toBe(0);
      expect(stats.maxEntitiesInCell).toBe(0);
    });
  });

  // ==========================================================================
  // Static utilities
  // ==========================================================================

  describe('distance utilities', () => {
    it('calculates distance squared', () => {
      expect(SpatialHashGrid.distanceSq(v(0, 0, 0), v(3, 4, 0))).toBe(25);
    });

    it('calculates distance', () => {
      expect(SpatialHashGrid.distance(v(0, 0, 0), v(3, 4, 0))).toBe(5);
    });

    it('distance to self is zero', () => {
      expect(SpatialHashGrid.distance(v(5, 5, 5), v(5, 5, 5))).toBe(0);
    });
  });

  // ==========================================================================
  // Edge cases
  // ==========================================================================

  describe('edge cases', () => {
    it('handles entities at origin', () => {
      grid.insert('origin', v(0, 0, 0));
      expect(grid.has('origin')).toBe(true);
      expect(grid.queryRadius(v(0, 0, 0), 1)).toContain('origin');
    });

    it('handles very large positions', () => {
      grid.insert('far', v(1e6, 1e6, 1e6));
      expect(grid.has('far')).toBe(true);
      expect(grid.queryRadius(v(1e6, 1e6, 1e6), 1)).toContain('far');
    });

    it('handles zero-radius query', () => {
      grid.insert('e1', v(0, 0, 0));
      expect(grid.queryRadius(v(0, 0, 0), 0)).toContain('e1');
    });
  });
});
