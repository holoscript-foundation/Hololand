/**
 * @hololand/networking SpatialHashGrid
 *
 * Uniform spatial hash grid for O(1) entity lookup by position.
 * Maps 3D world positions to grid cells for fast neighbor queries
 * and interest management.
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface SpatialEntity {
  entityId: string;
  position: Vector3;
  radius: number; // Bounding radius for overlap queries
}

export interface SpatialHashGridConfig {
  cellSize: number;
  /** World bounds (used for statistics, not enforcement). */
  worldExtent: number;
}

const DEFAULT_CONFIG: SpatialHashGridConfig = {
  cellSize: 10,
  worldExtent: 1000,
};

type CellKey = string;

/**
 * Spatial hash grid for O(1) average-case entity queries.
 */
export class SpatialHashGrid {
  private config: SpatialHashGridConfig;
  private cells: Map<CellKey, Set<string>> = new Map();
  private entityPositions: Map<string, Vector3> = new Map();
  private entityRadii: Map<string, number> = new Map();
  private entityCells: Map<string, Set<CellKey>> = new Map(); // entity -> cells it occupies

  constructor(config?: Partial<SpatialHashGridConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Insert or update an entity in the grid.
   */
  insert(entity: SpatialEntity): void {
    // Remove from old cells if updating
    this.remove(entity.entityId);

    this.entityPositions.set(entity.entityId, { ...entity.position });
    this.entityRadii.set(entity.entityId, entity.radius);

    // Calculate which cells this entity occupies (including radius)
    const cellKeys = this.getCellsForEntity(entity);
    this.entityCells.set(entity.entityId, new Set(cellKeys));

    for (const key of cellKeys) {
      if (!this.cells.has(key)) {
        this.cells.set(key, new Set());
      }
      this.cells.get(key)!.add(entity.entityId);
    }
  }

  /**
   * Remove an entity from the grid.
   */
  remove(entityId: string): boolean {
    const cellKeys = this.entityCells.get(entityId);
    if (!cellKeys) return false;

    for (const key of cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.delete(entityId);
        if (cell.size === 0) this.cells.delete(key);
      }
    }

    this.entityCells.delete(entityId);
    this.entityPositions.delete(entityId);
    this.entityRadii.delete(entityId);
    return true;
  }

  /**
   * Query all entities within a radius of a point.
   */
  queryRadius(center: Vector3, radius: number): string[] {
    const results: string[] = [];
    const radiusSq = radius * radius;

    // Get all cells that the query sphere could overlap
    const minCell = this.worldToCell({
      x: center.x - radius,
      y: center.y - radius,
      z: center.z - radius,
    });
    const maxCell = this.worldToCell({
      x: center.x + radius,
      y: center.y + radius,
      z: center.z + radius,
    });

    const checked = new Set<string>();

    for (let cx = minCell.x; cx <= maxCell.x; cx++) {
      for (let cy = minCell.y; cy <= maxCell.y; cy++) {
        for (let cz = minCell.z; cz <= maxCell.z; cz++) {
          const key = this.cellKey(cx, cy, cz);
          const cell = this.cells.get(key);
          if (!cell) continue;

          for (const entityId of cell) {
            if (checked.has(entityId)) continue;
            checked.add(entityId);

            const pos = this.entityPositions.get(entityId)!;
            const dx = pos.x - center.x;
            const dy = pos.y - center.y;
            const dz = pos.z - center.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            const entityRadius = this.entityRadii.get(entityId) ?? 0;

            if (distSq <= (radius + entityRadius) ** 2) {
              results.push(entityId);
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Query all entities in a specific cell.
   */
  queryCell(cellX: number, cellY: number, cellZ: number): string[] {
    const key = this.cellKey(cellX, cellY, cellZ);
    const cell = this.cells.get(key);
    return cell ? Array.from(cell) : [];
  }

  /**
   * Get nearest entities to a point, sorted by distance.
   */
  queryNearest(center: Vector3, maxCount: number, maxRadius: number): string[] {
    const candidates = this.queryRadius(center, maxRadius);
    return candidates
      .map((id) => ({
        id,
        dist: this.distanceSq(center, this.entityPositions.get(id)!),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, maxCount)
      .map((c) => c.id);
  }

  /**
   * Get entity position.
   */
  getPosition(entityId: string): Vector3 | undefined {
    const pos = this.entityPositions.get(entityId);
    return pos ? { ...pos } : undefined;
  }

  /**
   * Get total entity count.
   */
  getEntityCount(): number {
    return this.entityPositions.size;
  }

  /**
   * Get number of active cells.
   */
  getCellCount(): number {
    return this.cells.size;
  }

  /**
   * Get cell size.
   */
  getCellSize(): number {
    return this.config.cellSize;
  }

  /**
   * Convert world position to cell coordinates.
   */
  worldToCell(pos: Vector3): { x: number; y: number; z: number } {
    return {
      x: Math.floor(pos.x / this.config.cellSize),
      y: Math.floor(pos.y / this.config.cellSize),
      z: Math.floor(pos.z / this.config.cellSize),
    };
  }

  /**
   * Clear all entities.
   */
  clear(): void {
    this.cells.clear();
    this.entityPositions.clear();
    this.entityRadii.clear();
    this.entityCells.clear();
  }

  private getCellsForEntity(entity: SpatialEntity): CellKey[] {
    const minCell = this.worldToCell({
      x: entity.position.x - entity.radius,
      y: entity.position.y - entity.radius,
      z: entity.position.z - entity.radius,
    });
    const maxCell = this.worldToCell({
      x: entity.position.x + entity.radius,
      y: entity.position.y + entity.radius,
      z: entity.position.z + entity.radius,
    });

    const keys: CellKey[] = [];
    for (let cx = minCell.x; cx <= maxCell.x; cx++) {
      for (let cy = minCell.y; cy <= maxCell.y; cy++) {
        for (let cz = minCell.z; cz <= maxCell.z; cz++) {
          keys.push(this.cellKey(cx, cy, cz));
        }
      }
    }
    return keys;
  }

  private cellKey(x: number, y: number, z: number): CellKey {
    return `${x},${y},${z}`;
  }

  private distanceSq(a: Vector3, b: Vector3): number {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
  }
}
