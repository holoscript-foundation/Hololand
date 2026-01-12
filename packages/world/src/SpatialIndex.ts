/**
 * SpatialIndex - Spatial queries for fast object lookups
 * Uses a simple grid-based spatial partitioning system
 */

import { logger } from './logger';
import type { SpatialObject } from './SpatialObject';
import type { Vector3, BoundingBox } from './types';

export class SpatialIndex {
  private cellSize: number;
  private grid: Map<string, Set<SpatialObject>>;
  // Note: bounds parameter is stored for future bounds validation

  constructor(_bounds: BoundingBox, cellSize: number = 10) {
    // Bounds available for future validation features
    this.cellSize = cellSize;
    this.grid = new Map();

    logger.debug('[SpatialIndex] Initialized', {
      bounds: _bounds,
      cellSize,
    });
  }

  /**
   * Insert object into spatial index
   */
  insert(object: SpatialObject): void {
    const cells = this.getCellsForObject(object);

    for (const cellKey of cells) {
      if (!this.grid.has(cellKey)) {
        this.grid.set(cellKey, new Set());
      }
      this.grid.get(cellKey)!.add(object);
    }

    logger.debug('[SpatialIndex] Object inserted', {
      objectId: object.id,
      cellCount: cells.length,
    });
  }

  /**
   * Remove object from spatial index
   */
  remove(object: SpatialObject): void {
    const cells = this.getCellsForObject(object);

    for (const cellKey of cells) {
      const cell = this.grid.get(cellKey);
      if (cell) {
        cell.delete(object);
        if (cell.size === 0) {
          this.grid.delete(cellKey);
        }
      }
    }

    logger.debug('[SpatialIndex] Object removed', {
      objectId: object.id,
    });
  }

  /**
   * Query objects within radius of a position
   */
  queryRadius(position: Vector3, radius: number): SpatialObject[] {
    const box: BoundingBox = {
      min: {
        x: position.x - radius,
        y: position.y - radius,
        z: position.z - radius,
      },
      max: {
        x: position.x + radius,
        y: position.y + radius,
        z: position.z + radius,
      },
    };

    const candidates = this.queryBox(box);
    const radiusSquared = radius * radius;

    return candidates.filter((obj) => {
      const objPos = obj.getPosition();
      const dx = objPos.x - position.x;
      const dy = objPos.y - position.y;
      const dz = objPos.z - position.z;
      return dx * dx + dy * dy + dz * dz <= radiusSquared;
    });
  }

  /**
   * Query objects within a bounding box
   */
  queryBox(box: BoundingBox): SpatialObject[] {
    const cells = this.getCellsForBox(box);
    const results = new Set<SpatialObject>();

    for (const cellKey of cells) {
      const cell = this.grid.get(cellKey);
      if (cell) {
        for (const obj of cell) {
          results.add(obj);
        }
      }
    }

    return Array.from(results);
  }

  /**
   * Get cells that an object occupies
   */
  private getCellsForObject(object: SpatialObject): string[] {
    const box = object.getBoundingBox();
    return this.getCellsForBox(box);
  }

  /**
   * Get cells that a bounding box overlaps
   */
  private getCellsForBox(box: BoundingBox): string[] {
    const cells: string[] = [];

    const minCell = this.positionToCell(box.min);
    const maxCell = this.positionToCell(box.max);

    for (let x = minCell.x; x <= maxCell.x; x++) {
      for (let y = minCell.y; y <= maxCell.y; y++) {
        for (let z = minCell.z; z <= maxCell.z; z++) {
          cells.push(`${x},${y},${z}`);
        }
      }
    }

    return cells;
  }

  /**
   * Convert position to cell coordinates
   */
  private positionToCell(position: Vector3): { x: number; y: number; z: number } {
    return {
      x: Math.floor(position.x / this.cellSize),
      y: Math.floor(position.y / this.cellSize),
      z: Math.floor(position.z / this.cellSize),
    };
  }

  /**
   * Clear all objects from index
   */
  clear(): void {
    this.grid.clear();
    logger.debug('[SpatialIndex] Cleared');
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalObjects = 0;
    for (const cell of this.grid.values()) {
      totalObjects += cell.size;
    }

    return {
      cellCount: this.grid.size,
      totalObjects,
      cellSize: this.cellSize,
    };
  }
}
