/**
 * Hungarian Algorithm Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { HungarianAlgorithm } from '../HungarianAlgorithm';

describe('HungarianAlgorithm', () => {
  describe('solve', () => {
    it('should find optimal assignment for simple 2x2 matrix', () => {
      const costMatrix = [
        [1, 2],
        [3, 4],
      ];
      
      const assignments = HungarianAlgorithm.solve(costMatrix);
      
      // Optimal: row 0 → col 0 (cost 1), row 1 → col 1 (cost 4) = 5
      // vs:      row 0 → col 1 (cost 2), row 1 → col 0 (cost 3) = 5
      // Both are equally optimal
      expect(assignments.length).toBe(2);
      
      // Total cost should be 5
      let totalCost = 0;
      for (const [row, col] of assignments) {
        totalCost += costMatrix[row][col];
      }
      expect(totalCost).toBe(5);
    });

    it('should find optimal assignment for 3x3 matrix', () => {
      const costMatrix = [
        [10, 5, 13],
        [3, 15, 8],
        [12, 9, 11],
      ];
      
      const assignments = HungarianAlgorithm.solve(costMatrix);
      
      expect(assignments.length).toBe(3);
      
      // Optimal: row 0 → col 1 (5), row 1 → col 0 (3), row 2 → col 2 (11) = 19
      let totalCost = 0;
      for (const [row, col] of assignments) {
        totalCost += costMatrix[row][col];
      }
      expect(totalCost).toBe(19);
    });

    it('should handle rectangular matrix (more rows)', () => {
      const costMatrix = [
        [1, 2],
        [3, 4],
        [5, 6],
      ];
      
      const assignments = HungarianAlgorithm.solve(costMatrix);
      
      // Only 2 assignments possible (limited by columns)
      expect(assignments.length).toBe(2);
      
      // Should assign row 0 → col 0, row 1 → col 1 (optimal)
      const totalCost = assignments.reduce((sum, [r, c]) => sum + costMatrix[r][c], 0);
      expect(totalCost).toBe(5); // 1 + 4
    });

    it('should handle rectangular matrix (more columns)', () => {
      const costMatrix = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      
      const assignments = HungarianAlgorithm.solve(costMatrix);
      
      // Only 2 assignments possible (limited by rows)
      expect(assignments.length).toBe(2);
      
      // Optimal: row 0 → col 0, row 1 → col 1
      const totalCost = assignments.reduce((sum, [r, c]) => sum + costMatrix[r][c], 0);
      expect(totalCost).toBe(6); // 1 + 5
    });

    it('should handle identity matrix', () => {
      const costMatrix = [
        [0, 1, 1],
        [1, 0, 1],
        [1, 1, 0],
      ];
      
      const assignments = HungarianAlgorithm.solve(costMatrix);
      
      // Optimal is diagonal (cost 0)
      const totalCost = assignments.reduce((sum, [r, c]) => sum + costMatrix[r][c], 0);
      expect(totalCost).toBe(0);
    });

    it('should handle empty matrix', () => {
      const assignments = HungarianAlgorithm.solve([]);
      expect(assignments).toEqual([]);
    });

    it('should handle 1x1 matrix', () => {
      const assignments = HungarianAlgorithm.solve([[42]]);
      expect(assignments).toEqual([[0, 0]]);
    });
  });

  describe('buildCostMatrix', () => {
    it('should build cost matrix from positions using Euclidean distance', () => {
      const tracks = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
      ];
      const detections = [
        { x: 1, y: 0, z: 0 },
        { x: 9, y: 0, z: 0 },
      ];
      
      const matrix = HungarianAlgorithm.buildCostMatrix(
        tracks,
        detections,
        (t, d) => Math.sqrt(
          (t.x - d.x) ** 2 + 
          (t.y - d.y) ** 2 + 
          (t.z - d.z) ** 2
        )
      );
      
      expect(matrix[0][0]).toBeCloseTo(1); // track 0 to det 0
      expect(matrix[0][1]).toBeCloseTo(9); // track 0 to det 1
      expect(matrix[1][0]).toBeCloseTo(9); // track 1 to det 0
      expect(matrix[1][1]).toBeCloseTo(1); // track 1 to det 1
    });
  });
});
