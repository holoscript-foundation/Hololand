// ============================================================================
// SpatialHashGrid — O(1) spatial partitioning for interest management
// ============================================================================
// Divides 3D space into uniform cells for efficient neighbor queries.
// Used by ServerInterestManager for per-client relevance filtering.
// ============================================================================

import type { Vector3 } from './types';

/**
 * Cell coordinates in the spatial grid
 */
export interface CellCoords {
  cx: number;
  cy: number;
  cz: number;
}

/**
 * Statistics about grid usage
 */
export interface GridStats {
  entityCount: number;
  cellCount: number;
  avgEntitiesPerCell: number;
  maxEntitiesInCell: number;
}

/**
 * SpatialHashGrid partitions 3D space into uniform cells of configurable size.
 *
 * Operations:
 *   insert/update/remove — O(1)
 *   queryRadius          — O(k) where k = cells overlapping the query sphere
 *
 * Cell keys encode integer grid coordinates: "cx,cy,cz"
 */
export class SpatialHashGrid {
  private readonly cellSize: number;

  /** cellKey → set of entity IDs occupying that cell */
  private readonly cells = new Map<string, Set<string>>();

  /** entityId → current position */
  private readonly entityPositions = new Map<string, Vector3>();

  /** entityId → current cellKey (for fast moves) */
  private readonly entityCells = new Map<string, string>();

  constructor(cellSize: number = 50) {
    if (cellSize <= 0) {
      throw new Error('Cell size must be positive');
    }
    this.cellSize = cellSize;
  }

  // --------------------------------------------------------------------------
  // Cell helpers
  // --------------------------------------------------------------------------

  /**
   * Convert a world position to integer cell coordinates.
   */
  getCellCoords(position: Vector3): CellCoords {
    return {
      cx: Math.floor(position.x / this.cellSize),
      cy: Math.floor(position.y / this.cellSize),
      cz: Math.floor(position.z / this.cellSize),
    };
  }

  /**
   * Convert cell coordinates to a string key.
   */
  private cellKey(cx: number, cy: number, cz: number): string {
    return `${cx},${cy},${cz}`;
  }

  /**
   * Convert a world position directly to a cell key.
   */
  private positionKey(position: Vector3): string {
    const { cx, cy, cz } = this.getCellCoords(position);
    return this.cellKey(cx, cy, cz);
  }

  // --------------------------------------------------------------------------
  // Entity management
  // --------------------------------------------------------------------------

  /**
   * Insert an entity at the given position.
   * If the entity already exists it is updated instead.
   */
  insert(id: string, position: Vector3): void {
    if (this.entityPositions.has(id)) {
      this.update(id, position);
      return;
    }

    const key = this.positionKey(position);
    this.entityPositions.set(id, { ...position });
    this.entityCells.set(id, key);

    let cell = this.cells.get(key);
    if (!cell) {
      cell = new Set();
      this.cells.set(key, cell);
    }
    cell.add(id);
  }

  /**
   * Move an entity to a new position.
   * Only touches the cell map when the entity crosses a cell boundary.
   */
  update(id: string, position: Vector3): void {
    const oldKey = this.entityCells.get(id);
    if (oldKey === undefined) {
      // Not tracked yet — insert instead
      this.insert(id, position);
      return;
    }

    // Always update stored position
    this.entityPositions.set(id, { ...position });

    const newKey = this.positionKey(position);
    if (newKey === oldKey) return; // same cell, nothing to do

    // Remove from old cell
    const oldCell = this.cells.get(oldKey);
    if (oldCell) {
      oldCell.delete(id);
      if (oldCell.size === 0) this.cells.delete(oldKey);
    }

    // Add to new cell
    let newCell = this.cells.get(newKey);
    if (!newCell) {
      newCell = new Set();
      this.cells.set(newKey, newCell);
    }
    newCell.add(id);
    this.entityCells.set(id, newKey);
  }

  /**
   * Remove an entity from the grid.
   */
  remove(id: string): boolean {
    const key = this.entityCells.get(id);
    if (key === undefined) return false;

    const cell = this.cells.get(key);
    if (cell) {
      cell.delete(id);
      if (cell.size === 0) this.cells.delete(key);
    }

    this.entityPositions.delete(id);
    this.entityCells.delete(id);
    return true;
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /**
   * Return all entity IDs within `radius` of `center`.
   * Checks cells that could overlap the query sphere, then performs exact
   * distance tests within those cells.
   */
  queryRadius(center: Vector3, radius: number): string[] {
    const results: string[] = [];
    const radiusSq = radius * radius;

    const minCoords = this.getCellCoords({
      x: center.x - radius,
      y: center.y - radius,
      z: center.z - radius,
    });
    const maxCoords = this.getCellCoords({
      x: center.x + radius,
      y: center.y + radius,
      z: center.z + radius,
    });

    for (let cx = minCoords.cx; cx <= maxCoords.cx; cx++) {
      for (let cy = minCoords.cy; cy <= maxCoords.cy; cy++) {
        for (let cz = minCoords.cz; cz <= maxCoords.cz; cz++) {
          const cell = this.cells.get(this.cellKey(cx, cy, cz));
          if (!cell) continue;

          for (const id of cell) {
            const pos = this.entityPositions.get(id)!;
            const dx = pos.x - center.x;
            const dy = pos.y - center.y;
            const dz = pos.z - center.z;
            if (dx * dx + dy * dy + dz * dz <= radiusSq) {
              results.push(id);
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Return all entity IDs in a specific cell.
   */
  queryCell(cx: number, cy: number, cz: number): string[] {
    const cell = this.cells.get(this.cellKey(cx, cy, cz));
    return cell ? Array.from(cell) : [];
  }

  /**
   * Return all entity IDs near a tracked entity (within its cell + adjacent cells).
   */
  getNearby(id: string): string[] {
    const pos = this.entityPositions.get(id);
    if (!pos) return [];

    const { cx, cy, cz } = this.getCellCoords(pos);
    const results: string[] = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cell = this.cells.get(this.cellKey(cx + dx, cy + dy, cz + dz));
          if (!cell) continue;
          for (const entityId of cell) {
            if (entityId !== id) {
              results.push(entityId);
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Get the stored position of an entity, or undefined if not tracked.
   */
  getPosition(id: string): Vector3 | undefined {
    const pos = this.entityPositions.get(id);
    return pos ? { ...pos } : undefined;
  }

  /**
   * Check if an entity is tracked.
   */
  has(id: string): boolean {
    return this.entityPositions.has(id);
  }

  /**
   * Get total number of tracked entities.
   */
  get size(): number {
    return this.entityPositions.size;
  }

  /**
   * Remove all entities and cells.
   */
  clear(): void {
    this.cells.clear();
    this.entityPositions.clear();
    this.entityCells.clear();
  }

  /**
   * Collect usage statistics.
   */
  getStats(): GridStats {
    let maxEntitiesInCell = 0;
    for (const cell of this.cells.values()) {
      if (cell.size > maxEntitiesInCell) {
        maxEntitiesInCell = cell.size;
      }
    }

    const cellCount = this.cells.size;
    return {
      entityCount: this.entityPositions.size,
      cellCount,
      avgEntitiesPerCell: cellCount > 0 ? this.entityPositions.size / cellCount : 0,
      maxEntitiesInCell,
    };
  }

  /**
   * Compute squared distance between two vectors (avoids sqrt).
   */
  static distanceSq(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
  }

  /**
   * Compute distance between two vectors.
   */
  static distance(a: Vector3, b: Vector3): number {
    return Math.sqrt(SpatialHashGrid.distanceSq(a, b));
  }
}
