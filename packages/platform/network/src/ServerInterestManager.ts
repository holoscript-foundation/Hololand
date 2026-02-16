// ============================================================================
// ServerInterestManager — Multi-viewer server-side interest management
// ============================================================================
// Determines which entities are relevant to each connected viewer (player)
// based on spatial proximity. Uses SpatialHashGrid for efficient lookups.
//
// Integration point: NetworkServer.broadcastSnapshots() calls
// filterSnapshotForViewer() to produce per-client filtered snapshots.
// ============================================================================

import type { Vector3, SyncState, StateSnapshot } from './types';
import { SpatialHashGrid } from './SpatialHashGrid';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

/**
 * Configuration for the server interest manager.
 */
export interface ServerInterestConfig {
  /** Default view distance when not specified per-viewer (world units). */
  defaultViewDistance: number;
  /** Spatial grid cell size — should be ~50-100% of defaultViewDistance. */
  cellSize: number;
  /** Number of priority tiers (excluding "always relevant"). */
  priorityLevels: number;
  /** Maximum entities sent to a single viewer per snapshot. 0 = unlimited. */
  maxEntitiesPerViewer: number;
  /** Multiplier for update interval per priority level. Level 0 = every tick. */
  priorityRateMultipliers: number[];
}

const DEFAULT_CONFIG: ServerInterestConfig = {
  defaultViewDistance: 100,
  cellSize: 50,
  priorityLevels: 3,
  maxEntitiesPerViewer: 0,
  priorityRateMultipliers: [1, 2, 4], // high=every tick, medium=every 2nd, low=every 4th
};

/**
 * A viewer (connected player) whose perspective determines interest.
 */
export interface ViewerState {
  id: string;
  position: Vector3;
  viewDistance: number;
  roomId: string;
}

/**
 * Relevance result for a single entity relative to a viewer.
 */
export interface EntityRelevance {
  entityId: string;
  /** 0 = highest priority (closest), higher = lower priority, -1 = not relevant. */
  priority: number;
  /** Distance from viewer to entity. */
  distance: number;
  /** Whether this entity should be included in the current tick's snapshot. */
  shouldUpdate: boolean;
}

/**
 * Statistics for monitoring interest management performance.
 */
export interface InterestStats {
  viewerCount: number;
  entityCount: number;
  alwaysRelevantCount: number;
  gridStats: {
    entityCount: number;
    cellCount: number;
    avgEntitiesPerCell: number;
    maxEntitiesInCell: number;
  };
}

// --------------------------------------------------------------------------
// ServerInterestManager
// --------------------------------------------------------------------------

export class ServerInterestManager {
  private readonly config: ServerInterestConfig;
  private readonly grid: SpatialHashGrid;

  /** viewerId → ViewerState */
  private readonly viewers = new Map<string, ViewerState>();

  /** Entity IDs that are always relevant to every viewer (e.g. global events). */
  private readonly alwaysRelevant = new Set<string>();

  /** viewerId → (entityId → last update timestamp) for rate throttling. */
  private readonly lastUpdateTimes = new Map<string, Map<string, number>>();

  /** Monotonically increasing tick counter for rate modulation. */
  private tickCount = 0;

  constructor(config?: Partial<ServerInterestConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Ensure priority multipliers array matches priorityLevels
    while (this.config.priorityRateMultipliers.length < this.config.priorityLevels) {
      const last =
        this.config.priorityRateMultipliers[this.config.priorityRateMultipliers.length - 1] ?? 1;
      this.config.priorityRateMultipliers.push(last * 2);
    }

    this.grid = new SpatialHashGrid(this.config.cellSize);
  }

  // ==========================================================================
  // Viewer lifecycle
  // ==========================================================================

  /**
   * Register a new viewer (player) for interest tracking.
   */
  addViewer(
    viewerId: string,
    position: Vector3,
    roomId: string,
    viewDistance?: number
  ): void {
    this.viewers.set(viewerId, {
      id: viewerId,
      position: { ...position },
      viewDistance: viewDistance ?? this.config.defaultViewDistance,
      roomId,
    });
    this.lastUpdateTimes.set(viewerId, new Map());
  }

  /**
   * Update a viewer's position. Called on every positionUpdate message.
   */
  updateViewerPosition(viewerId: string, position: Vector3): void {
    const viewer = this.viewers.get(viewerId);
    if (!viewer) return;
    viewer.position = { ...position };
  }

  /**
   * Update a viewer's view distance at runtime.
   */
  setViewerDistance(viewerId: string, viewDistance: number): void {
    const viewer = this.viewers.get(viewerId);
    if (!viewer) return;
    viewer.viewDistance = viewDistance;
  }

  /**
   * Remove a viewer (on disconnect or leave room).
   */
  removeViewer(viewerId: string): void {
    this.viewers.delete(viewerId);
    this.lastUpdateTimes.delete(viewerId);
  }

  /**
   * Check if a viewer is tracked.
   */
  hasViewer(viewerId: string): boolean {
    return this.viewers.has(viewerId);
  }

  /**
   * Get viewer info.
   */
  getViewer(viewerId: string): ViewerState | undefined {
    const v = this.viewers.get(viewerId);
    return v ? { ...v, position: { ...v.position } } : undefined;
  }

  // ==========================================================================
  // Entity lifecycle
  // ==========================================================================

  /**
   * Register an entity for spatial tracking.
   */
  addEntity(entityId: string, position: Vector3): void {
    this.grid.insert(entityId, position);
  }

  /**
   * Update an entity's position in the spatial grid.
   */
  updateEntityPosition(entityId: string, position: Vector3): void {
    this.grid.update(entityId, position);
  }

  /**
   * Remove an entity from spatial tracking.
   */
  removeEntity(entityId: string): void {
    this.grid.remove(entityId);
    this.alwaysRelevant.delete(entityId);
  }

  /**
   * Check if an entity is tracked.
   */
  hasEntity(entityId: string): boolean {
    return this.grid.has(entityId);
  }

  /**
   * Mark an entity as always relevant — sent to every viewer regardless of
   * distance (e.g. game state, UI elements, global events).
   */
  markAlwaysRelevant(entityId: string): void {
    this.alwaysRelevant.add(entityId);
  }

  /**
   * Remove the always-relevant flag from an entity.
   */
  unmarkAlwaysRelevant(entityId: string): void {
    this.alwaysRelevant.delete(entityId);
  }

  /**
   * Check if an entity is marked as always relevant.
   */
  isAlwaysRelevant(entityId: string): boolean {
    return this.alwaysRelevant.has(entityId);
  }

  // ==========================================================================
  // Interest calculations
  // ==========================================================================

  /**
   * Advance the tick counter. Call once per snapshot broadcast cycle.
   */
  tick(): void {
    this.tickCount++;
  }

  /**
   * Calculate priority tier for an entity at a given distance from a viewer.
   *
   *   distance ≤ 33% viewDistance  →  priority 0 (high)
   *   distance ≤ 66% viewDistance  →  priority 1 (medium)
   *   distance ≤ 100% viewDistance →  priority 2 (low)
   *   distance > viewDistance      →  -1 (not relevant)
   */
  calculatePriority(distance: number, viewDistance: number): number {
    if (distance > viewDistance) return -1;

    const ratio = distance / viewDistance;
    const tierSize = 1 / this.config.priorityLevels;

    for (let i = 0; i < this.config.priorityLevels; i++) {
      if (ratio <= tierSize * (i + 1)) return i;
    }

    return this.config.priorityLevels - 1;
  }

  /**
   * Determine whether a given priority level should send an update this tick.
   * Higher priority = more frequent updates.
   */
  shouldUpdateThisTick(priority: number): boolean {
    if (priority < 0) return false;
    if (priority >= this.config.priorityRateMultipliers.length) return false;

    const multiplier = this.config.priorityRateMultipliers[priority];
    return this.tickCount % multiplier === 0;
  }

  /**
   * Get the list of relevant entities for a specific viewer, with priority
   * and rate-throttled shouldUpdate flag.
   */
  getRelevantEntities(viewerId: string): EntityRelevance[] {
    const viewer = this.viewers.get(viewerId);
    if (!viewer) return [];

    const results: EntityRelevance[] = [];

    // 1) Always-relevant entities
    for (const entityId of this.alwaysRelevant) {
      const pos = this.grid.getPosition(entityId);
      const distance = pos ? SpatialHashGrid.distance(viewer.position, pos) : 0;
      results.push({
        entityId,
        priority: 0,
        distance,
        shouldUpdate: true, // always-relevant entities always update
      });
    }

    // 2) Spatially relevant entities (radius query)
    const nearbyIds = this.grid.queryRadius(viewer.position, viewer.viewDistance);

    for (const entityId of nearbyIds) {
      // Skip if already added via always-relevant
      if (this.alwaysRelevant.has(entityId)) continue;

      const pos = this.grid.getPosition(entityId)!;
      const distance = SpatialHashGrid.distance(viewer.position, pos);
      const priority = this.calculatePriority(distance, viewer.viewDistance);

      if (priority < 0) continue; // out of range (shouldn't happen but guard)

      results.push({
        entityId,
        priority,
        distance,
        shouldUpdate: this.shouldUpdateThisTick(priority),
      });
    }

    // 3) Apply bandwidth budget (sort by priority then distance, cap count)
    if (this.config.maxEntitiesPerViewer > 0 && results.length > this.config.maxEntitiesPerViewer) {
      results.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.distance - b.distance;
      });
      results.length = this.config.maxEntitiesPerViewer;
    }

    return results;
  }

  /**
   * Check if a specific entity is relevant to a specific viewer.
   */
  isRelevantTo(viewerId: string, entityId: string): boolean {
    if (this.alwaysRelevant.has(entityId)) return true;

    const viewer = this.viewers.get(viewerId);
    if (!viewer) return false;

    const pos = this.grid.getPosition(entityId);
    if (!pos) return false;

    const distance = SpatialHashGrid.distance(viewer.position, pos);
    return distance <= viewer.viewDistance;
  }

  // ==========================================================================
  // Snapshot filtering (main integration point)
  // ==========================================================================

  /**
   * Filter a room-wide StateSnapshot to only include states relevant to a
   * specific viewer, respecting priority-based rate throttling.
   *
   * This is the primary method called from NetworkServer.broadcastSnapshots().
   */
  filterSnapshotForViewer(viewerId: string, snapshot: StateSnapshot): StateSnapshot {
    const viewer = this.viewers.get(viewerId);
    if (!viewer) {
      // Unknown viewer — return empty snapshot
      return { timestamp: snapshot.timestamp, sequence: snapshot.sequence, states: [] };
    }

    const relevantEntities = this.getRelevantEntities(viewerId);

    // Build set of entity IDs that should be included this tick
    const includeIds = new Set<string>();
    for (const rel of relevantEntities) {
      if (rel.shouldUpdate) {
        includeIds.add(rel.entityId);
      }
    }

    // Filter snapshot states
    const filteredStates: SyncState[] = [];
    for (const state of snapshot.states) {
      if (includeIds.has(state.objectId)) {
        filteredStates.push(state);
      }
    }

    return {
      timestamp: snapshot.timestamp,
      sequence: snapshot.sequence,
      states: filteredStates,
    };
  }

  // ==========================================================================
  // Bulk operations
  // ==========================================================================

  /**
   * Sync entity positions from a room's state map.
   * Call this to bulk-update the grid from the authoritative state store.
   */
  syncFromStates(states: Map<string, SyncState>): void {
    for (const [objectId, state] of states) {
      if (state.position) {
        if (this.grid.has(objectId)) {
          this.grid.update(objectId, state.position);
        } else {
          this.grid.insert(objectId, state.position);
        }
      }
    }
  }

  /**
   * Remove all viewers and entities associated with a room.
   */
  clearRoom(roomId: string): void {
    // Remove viewers in this room
    for (const [id, viewer] of this.viewers) {
      if (viewer.roomId === roomId) {
        this.viewers.delete(id);
        this.lastUpdateTimes.delete(id);
      }
    }
  }

  /**
   * Remove all viewers and entities.
   */
  clear(): void {
    this.viewers.clear();
    this.alwaysRelevant.clear();
    this.lastUpdateTimes.clear();
    this.grid.clear();
    this.tickCount = 0;
  }

  // ==========================================================================
  // Stats
  // ==========================================================================

  /**
   * Collect usage statistics for monitoring.
   */
  getStats(): InterestStats {
    return {
      viewerCount: this.viewers.size,
      entityCount: this.grid.size,
      alwaysRelevantCount: this.alwaysRelevant.size,
      gridStats: this.grid.getStats(),
    };
  }

  /**
   * Get the current tick count.
   */
  getTickCount(): number {
    return this.tickCount;
  }
}
