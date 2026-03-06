/**
 * @hololand/networking InterestManager (Spatial)
 *
 * Spatial interest management using SpatialHashGrid and PriorityAccumulator.
 * Determines which entities each viewer needs updates for based on
 * proximity, priority, and bandwidth budget.
 */

import { SpatialHashGrid, type Vector3, type SpatialEntity } from './SpatialHashGrid';
import { PriorityAccumulator, type PriorityFactors } from './PriorityAccumulator';
import { BandwidthAllocator, type BandwidthAllocation } from './BandwidthAllocator';

export interface InterestManagerConfig {
  /** Default view radius for interest queries. */
  defaultViewRadius: number;
  /** Maximum entities per viewer update. */
  maxEntitiesPerUpdate: number;
  /** Spatial hash grid cell size. */
  cellSize: number;
  /** Bandwidth budget per viewer in bytes/sec. */
  bandwidthPerViewer: number;
}

const DEFAULT_CONFIG: InterestManagerConfig = {
  defaultViewRadius: 100,
  maxEntitiesPerUpdate: 50,
  cellSize: 10,
  bandwidthPerViewer: 50_000,
};

export interface ViewerState {
  viewerId: string;
  position: Vector3;
  viewDirection: Vector3;
  viewRadius: number;
}

export interface InterestSet {
  viewerId: string;
  entities: Array<{
    entityId: string;
    priority: number;
    distance: number;
  }>;
  totalBandwidthBytes: number;
}

/**
 * Spatial interest management system.
 */
export class InterestManager {
  private config: InterestManagerConfig;
  private grid: SpatialHashGrid;
  private accumulator: PriorityAccumulator;
  private allocator: BandwidthAllocator;
  private viewers: Map<string, ViewerState> = new Map();
  private entityData: Map<string, SpatialEntity> = new Map();

  constructor(config?: Partial<InterestManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.grid = new SpatialHashGrid({ cellSize: this.config.cellSize });
    this.accumulator = new PriorityAccumulator();
    this.allocator = new BandwidthAllocator({
      totalBudgetBytesPerSec: this.config.bandwidthPerViewer * 32, // Max viewers
    });
  }

  /**
   * Register or update an entity in the spatial grid.
   */
  updateEntity(entity: SpatialEntity, priorityFactors?: Partial<PriorityFactors>): void {
    this.grid.insert(entity);
    this.entityData.set(entity.entityId, entity);
    if (priorityFactors) {
      this.accumulator.updateFactors(entity.entityId, priorityFactors);
    }
  }

  /**
   * Remove an entity.
   */
  removeEntity(entityId: string): void {
    this.grid.remove(entityId);
    this.entityData.delete(entityId);
    this.accumulator.removeEntity(entityId);
  }

  /**
   * Register or update a viewer.
   */
  updateViewer(viewer: ViewerState): void {
    this.viewers.set(viewer.viewerId, { ...viewer });
  }

  /**
   * Remove a viewer.
   */
  removeViewer(viewerId: string): void {
    this.viewers.delete(viewerId);
  }

  /**
   * Compute the interest set for a specific viewer.
   * Returns entities sorted by priority within the view radius.
   */
  computeInterestSet(viewerId: string): InterestSet {
    const viewer = this.viewers.get(viewerId);
    if (!viewer) {
      return { viewerId, entities: [], totalBandwidthBytes: 0 };
    }

    // Query spatial grid for nearby entities
    const nearbyIds = this.grid.queryRadius(viewer.position, viewer.viewRadius);

    // Update distance-based priority factors
    const entitiesWithPriority = nearbyIds.map((entityId) => {
      const pos = this.grid.getPosition(entityId)!;
      const distance = this.distance(viewer.position, pos);

      // Update accumulator with distance
      this.accumulator.updateFactors(entityId, { distance });

      return {
        entityId,
        priority: this.accumulator.getPriority(entityId),
        distance,
      };
    });

    // Sort by priority (highest first) and limit
    entitiesWithPriority.sort((a, b) => b.priority - a.priority);
    const limited = entitiesWithPriority.slice(0, this.config.maxEntitiesPerUpdate);

    // Estimate bandwidth (64 bytes per entity state)
    const bandwidthEstimate = limited.length * 64;

    return {
      viewerId,
      entities: limited,
      totalBandwidthBytes: bandwidthEstimate,
    };
  }

  /**
   * Compute interest sets for all viewers.
   */
  computeAllInterestSets(): InterestSet[] {
    this.accumulator.accumulateTick();
    const sets: InterestSet[] = [];
    for (const viewerId of this.viewers.keys()) {
      sets.push(this.computeInterestSet(viewerId));
    }
    return sets;
  }

  /**
   * Mark entities as "consumed" (sent to viewer) to reset their staleness.
   */
  markConsumed(entityIds: string[]): void {
    for (const id of entityIds) {
      this.accumulator.consumePriority(id);
    }
  }

  getViewerCount(): number {
    return this.viewers.size;
  }

  getEntityCount(): number {
    return this.grid.getEntityCount();
  }

  getGrid(): SpatialHashGrid {
    return this.grid;
  }

  getAccumulator(): PriorityAccumulator {
    return this.accumulator;
  }

  private distance(a: Vector3, b: Vector3): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
  }
}
