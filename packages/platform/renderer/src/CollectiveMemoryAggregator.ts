/**
 * CollectiveMemoryAggregator
 *
 * Transforms raw cultural traces from the StigmergicTraceEngine into emergent
 * collective memory patterns: clusters (hotspots), path preferences (trails),
 * heatmaps, and summary statistics.
 *
 * EMERGENT INTELLIGENCE:
 * No single agent "designs" the collective memory. Instead, it emerges from the
 * superposition of individual trace deposits, decays, and reinforcements. The
 * aggregator merely detects and labels these emergent patterns, making them
 * accessible to the renderer and to agents who wish to follow the group's
 * implicit guidance.
 *
 * CLUSTER DETECTION:
 * Uses a grid-based density clustering approach (similar to DBSCAN in spirit,
 * but optimized for the spatial grid structure):
 *
 *   1. Identify "seed cells" with aggregateIntensity >= minClusterIntensity
 *   2. Expand each seed to include connected neighbors within clusterRadius
 *      whose intensity exceeds the threshold
 *   3. Merge overlapping expansions into unified clusters
 *   4. Compute cluster centroids, radii, and statistics
 *
 * PATH DETECTION:
 * Identifies connected sequences of 'visit' traces forming emergent trails:
 *
 *   1. Find cells containing 'visit' traces above threshold
 *   2. Build a graph of adjacent 'visit' cells
 *   3. Extract longest connected paths via DFS
 *   4. Score paths by average intensity and traversal count
 *
 * PERFORMANCE:
 *   Cluster detection:   1-5ms (depends on active cell count)
 *   Path detection:       1-3ms
 *   Heatmap generation:  < 1ms
 *   Total per cycle:     2-10ms (runs OFF render loop at 0.5-2Hz)
 *
 * @module CollectiveMemoryAggregator
 */

import { logger } from './logger';
import type {
  CellId,
  SpatialCell,
  TraceCluster,
  ClusterId,
  PathPreference,
  CollectiveMemoryState,
  CollectiveMemoryAggregatorConfig,
  TraceCategory,
  CulturalTraceEventType,
  CulturalTraceEventHandler,
  CulturalTraceEventMap,
} from './CulturalTraceTypes';
import {
  cellIdToPosition,
  getNeighborCellIds,
  vec3Distance,
  createEmptyCollectiveMemoryState,
  createDefaultAggregatorConfig,
} from './CulturalTraceTypes';
import type { Vec3 } from './AgentStateBuffer';
import type { StigmergicTraceEngine } from './StigmergicTraceEngine';

// =============================================================================
// COLLECTIVE MEMORY AGGREGATOR
// =============================================================================

export class CollectiveMemoryAggregator {
  private readonly config: CollectiveMemoryAggregatorConfig;
  private readonly engine: StigmergicTraceEngine;

  /** Current collective memory state */
  private memoryState: CollectiveMemoryState;

  /** Timer for the aggregation loop */
  private timerId: ReturnType<typeof setInterval> | null = null;

  /** Cycle metrics */
  private cycleCount = 0;
  private averageCycleMs = 0;

  /** Cluster ID counter */
  private nextClusterId = 0;

  /** Event listeners */
  private listeners: Map<CulturalTraceEventType, Set<CulturalTraceEventHandler<CulturalTraceEventType>>>;

  constructor(
    engine: StigmergicTraceEngine,
    config?: Partial<CollectiveMemoryAggregatorConfig>,
  ) {
    this.config = createDefaultAggregatorConfig(config);
    this.engine = engine;
    this.memoryState = createEmptyCollectiveMemoryState();
    this.listeners = new Map();

    logger.info(
      `[CollectiveMemoryAggregator] Initialized at ${this.config.updateHz}Hz, ` +
      `minCluster=${this.config.minClusterSize}, radius=${this.config.clusterRadius}`,
    );
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Start the aggregation loop.
   */
  start(): void {
    if (this.timerId !== null) {
      logger.warn('[CollectiveMemoryAggregator] Already running');
      return;
    }

    const intervalMs = Math.round(1000 / this.config.updateHz);
    this.timerId = setInterval(() => this.aggregate(), intervalMs);

    logger.info(
      `[CollectiveMemoryAggregator] Started at ${this.config.updateHz}Hz ` +
      `(${intervalMs}ms interval)`,
    );
  }

  /**
   * Stop the aggregation loop.
   */
  stop(): void {
    if (this.timerId === null) return;
    clearInterval(this.timerId);
    this.timerId = null;
    logger.info('[CollectiveMemoryAggregator] Stopped');
  }

  /**
   * Whether the aggregator is running.
   */
  isRunning(): boolean {
    return this.timerId !== null;
  }

  /**
   * Get the current collective memory state (render-loop safe read).
   */
  getMemoryState(): Readonly<CollectiveMemoryState> {
    return this.memoryState;
  }

  /**
   * Get all detected clusters.
   */
  getClusters(): ReadonlyArray<TraceCluster> {
    return this.memoryState.clusters;
  }

  /**
   * Get all detected path preferences.
   */
  getPathPreferences(): ReadonlyArray<PathPreference> {
    return this.memoryState.pathPreferences;
  }

  /**
   * Get the heatmap (cell ID -> intensity).
   */
  getHeatmap(): ReadonlyMap<CellId, number> {
    return this.memoryState.heatmap;
  }

  /**
   * Get metrics.
   */
  getMetrics(): {
    isRunning: boolean;
    cycleCount: number;
    averageCycleMs: number;
    clusterCount: number;
    pathPreferenceCount: number;
    heatmapCells: number;
  } {
    return {
      isRunning: this.isRunning(),
      cycleCount: this.cycleCount,
      averageCycleMs: this.averageCycleMs,
      clusterCount: this.memoryState.clusters.length,
      pathPreferenceCount: this.memoryState.pathPreferences.length,
      heatmapCells: this.memoryState.heatmap.size,
    };
  }

  /**
   * Subscribe to aggregation events.
   */
  on<T extends CulturalTraceEventType>(
    event: T,
    handler: CulturalTraceEventHandler<T>,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as CulturalTraceEventHandler<CulturalTraceEventType>);
  }

  /**
   * Unsubscribe from events.
   */
  off<T extends CulturalTraceEventType>(
    event: T,
    handler: CulturalTraceEventHandler<T>,
  ): void {
    this.listeners.get(event)?.delete(handler as CulturalTraceEventHandler<CulturalTraceEventType>);
  }

  /**
   * Destroy the aggregator.
   */
  destroy(): void {
    this.stop();
    this.memoryState = createEmptyCollectiveMemoryState();
    this.listeners.clear();
    logger.info('[CollectiveMemoryAggregator] Destroyed');
  }

  // ===========================================================================
  // AGGREGATION CYCLE
  // ===========================================================================

  /**
   * Execute one aggregation cycle: clusters, paths, heatmap, summary.
   */
  private aggregate(): void {
    const start = performance.now();
    const cells = this.engine.getCells();

    if (cells.size === 0) {
      this.memoryState = createEmptyCollectiveMemoryState();
      return;
    }

    const newState: CollectiveMemoryState = {
      clusters: this.detectClusters(cells),
      pathPreferences: this.detectPathPreferences(cells),
      heatmap: this.buildHeatmap(cells),
      categoryHeatmaps: this.buildCategoryHeatmaps(cells),
      totalActiveTraces: this.engine.getTraces().size,
      totalUniqueAgents: this.countUniqueAgents(cells),
      dominantCategory: this.findDominantCategory(cells),
      averageIntensity: this.computeAverageIntensity(cells),
      aggregatedAt: Date.now(),
    };

    // Determine cluster trends by comparing with previous state
    this.updateClusterTrends(newState.clusters, this.memoryState.clusters);

    // Detect newly appeared and dissolved clusters
    this.detectClusterChanges(newState.clusters, this.memoryState.clusters);

    this.memoryState = newState;

    // Update metrics
    this.cycleCount++;
    const cycleMs = performance.now() - start;
    const ewmaAlpha = 0.3;
    this.averageCycleMs = this.averageCycleMs * (1 - ewmaAlpha) + cycleMs * ewmaAlpha;

    // Emit memory updated event
    this.emit('memory:updated', { state: newState });

    if (this.cycleCount % 30 === 0) {
      logger.debug(
        `[CollectiveMemoryAggregator] Cycle ${this.cycleCount}: ` +
        `${newState.clusters.length} clusters, ` +
        `${newState.pathPreferences.length} paths, ` +
        `${cycleMs.toFixed(2)}ms`,
      );
    }
  }

  // ===========================================================================
  // CLUSTER DETECTION
  // ===========================================================================

  /**
   * Detect emergent clusters of trace activity using grid-based density expansion.
   *
   * Algorithm:
   * 1. Collect all "seed" cells with sufficient intensity
   * 2. For each unvisited seed, flood-fill to connected neighbors
   * 3. Groups of connected seeds become clusters
   * 4. Compute cluster statistics (centroid, radius, dominance)
   */
  private detectClusters(cells: ReadonlyMap<CellId, SpatialCell>): TraceCluster[] {
    const minIntensity = this.config.minClusterIntensity;
    const minSize = this.config.minClusterSize;

    // Step 1: Identify seed cells
    const seedCells: CellId[] = [];
    for (const [cellId, cell] of cells) {
      if (cell.aggregateIntensity >= minIntensity && cell.traces.length > 0) {
        seedCells.push(cellId);
      }
    }

    if (seedCells.length === 0) return [];

    // Step 2: Flood-fill connected components
    const visited = new Set<CellId>();
    const clusters: TraceCluster[] = [];
    const seedSet = new Set(seedCells);

    for (const seed of seedCells) {
      if (visited.has(seed)) continue;

      // BFS from this seed
      const component: CellId[] = [];
      const queue: CellId[] = [seed];
      visited.add(seed);

      while (queue.length > 0) {
        const current = queue.shift()!;
        component.push(current);

        // Check neighbors (only 6-connected for efficiency)
        const neighbors = getNeighborCellIds(current, 1);
        for (const neighbor of neighbors) {
          if (visited.has(neighbor)) continue;
          if (!seedSet.has(neighbor)) continue;
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }

      // Step 3: Only keep components with enough cells
      if (component.length >= minSize) {
        const cluster = this.buildCluster(component, cells);
        if (cluster) {
          clusters.push(cluster);
        }
      }
    }

    // Sort by total intensity (strongest clusters first)
    clusters.sort((a, b) => b.totalIntensity - a.totalIntensity);

    // Limit to maxClusters
    return clusters.slice(0, this.config.maxClusters);
  }

  /**
   * Build a TraceCluster from a connected component of cell IDs.
   */
  private buildCluster(
    cellIds: CellId[],
    cells: ReadonlyMap<CellId, SpatialCell>,
  ): TraceCluster | null {
    let totalIntensity = 0;
    let traceCount = 0;
    const uniqueAgents = new Set<string>();
    const categoryCount: Partial<Record<TraceCategory, number>> = {};
    let weightedX = 0, weightedY = 0, weightedZ = 0;
    let totalWeight = 0;

    for (const cellId of cellIds) {
      const cell = cells.get(cellId);
      if (!cell) continue;

      const intensity = cell.aggregateIntensity;
      totalIntensity += intensity;
      traceCount += cell.traces.length;

      // Weighted centroid
      weightedX += cell.center.x * intensity;
      weightedY += cell.center.y * intensity;
      weightedZ += cell.center.z * intensity;
      totalWeight += intensity;

      // Unique agents
      for (const agentId of cell.agentIds) {
        uniqueAgents.add(agentId);
      }

      // Category distribution
      for (const trace of cell.traces) {
        categoryCount[trace.category] = (categoryCount[trace.category] ?? 0) + 1;
      }
    }

    if (totalWeight === 0) return null;

    const centroid: Vec3 = {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight,
      z: weightedZ / totalWeight,
    };

    // Compute radius as max distance from centroid to any member cell center
    let maxDist = 0;
    for (const cellId of cellIds) {
      const cell = cells.get(cellId);
      if (!cell) continue;
      const dist = vec3Distance(centroid, cell.center);
      if (dist > maxDist) maxDist = dist;
    }

    // Find dominant category
    let maxCatCount = 0;
    let dominant: TraceCategory = 'visit';
    const catDistribution: Record<TraceCategory, number> = {
      visit: 0, inspect: 0, annotate: 0, create: 0,
      interact: 0, emotional: 0, waypoint: 0, hazard: 0,
    };
    for (const [cat, count] of Object.entries(categoryCount)) {
      const normalizedCount = count / traceCount;
      catDistribution[cat as TraceCategory] = normalizedCount;
      if (count > maxCatCount) {
        maxCatCount = count;
        dominant = cat as TraceCategory;
      }
    }

    const now = Date.now();

    return {
      id: `cluster-${this.nextClusterId++}`,
      centroid,
      radius: maxDist,
      totalIntensity,
      averageIntensity: traceCount > 0 ? totalIntensity / traceCount : 0,
      traceCount,
      uniqueAgentCount: uniqueAgents.size,
      dominantCategory: dominant,
      categoryDistribution: catDistribution,
      cellIds,
      detectedAt: now,
      updatedAt: now,
      stability: 0, // Updated by trend analysis
      trend: 'growing',
    };
  }

  // ===========================================================================
  // PATH PREFERENCE DETECTION
  // ===========================================================================

  /**
   * Detect emergent path preferences from connected 'visit' trace cells.
   *
   * Algorithm:
   * 1. Find all cells containing 'visit' traces
   * 2. Build adjacency graph
   * 3. Find longest paths via DFS from highest-intensity endpoints
   * 4. Score and rank paths
   */
  private detectPathPreferences(
    cells: ReadonlyMap<CellId, SpatialCell>,
  ): PathPreference[] {
    const minPathLength = this.config.minPathLength;

    // Step 1: Find 'visit' cells
    const visitCells = new Map<CellId, SpatialCell>();
    for (const [cellId, cell] of cells) {
      const hasVisit = cell.traces.some((t) => t.category === 'visit');
      if (hasVisit && cell.aggregateIntensity >= this.config.minClusterIntensity) {
        visitCells.set(cellId, cell);
      }
    }

    if (visitCells.size < minPathLength) return [];

    // Step 2: Build adjacency (only 6-connected for path following)
    const adjacency = new Map<CellId, CellId[]>();
    for (const cellId of visitCells.keys()) {
      const neighbors = getNeighborCellIds(cellId, 1);
      const connected = neighbors.filter((n) => visitCells.has(n));
      adjacency.set(cellId, connected);
    }

    // Step 3: Find paths via DFS from endpoints (cells with 0-1 neighbors)
    const endpoints: CellId[] = [];
    for (const [cellId, neighbors] of adjacency) {
      if (neighbors.length <= 2) {
        endpoints.push(cellId);
      }
    }

    // Sort endpoints by intensity (start from strongest)
    endpoints.sort((a, b) => {
      const cellA = visitCells.get(a);
      const cellB = visitCells.get(b);
      return (cellB?.aggregateIntensity ?? 0) - (cellA?.aggregateIntensity ?? 0);
    });

    const visitedGlobal = new Set<CellId>();
    const paths: PathPreference[] = [];

    for (const start of endpoints) {
      if (visitedGlobal.has(start)) continue;
      if (paths.length >= this.config.maxPathPreferences) break;

      const path = this.dfsLongestPath(start, adjacency, visitedGlobal);
      if (path.length >= minPathLength) {
        // Mark all cells in path as visited
        for (const cellId of path) {
          visitedGlobal.add(cellId);
        }

        paths.push(this.buildPathPreference(path, visitCells));
      }
    }

    // Sort by score (average intensity * traversal count)
    paths.sort(
      (a, b) =>
        b.averageIntensity * b.traversalCount -
        a.averageIntensity * a.traversalCount,
    );

    return paths.slice(0, this.config.maxPathPreferences);
  }

  /**
   * DFS to find the longest path from a starting cell.
   */
  private dfsLongestPath(
    start: CellId,
    adjacency: Map<CellId, CellId[]>,
    globalVisited: Set<CellId>,
  ): CellId[] {
    let bestPath: CellId[] = [];
    const visited = new Set<CellId>();

    const dfs = (current: CellId, path: CellId[]): void => {
      if (path.length > bestPath.length) {
        bestPath = [...path];
      }

      // Limit DFS depth for performance
      if (path.length > 50) return;

      const neighbors = adjacency.get(current) ?? [];
      for (const neighbor of neighbors) {
        if (visited.has(neighbor) || globalVisited.has(neighbor)) continue;
        visited.add(neighbor);
        path.push(neighbor);
        dfs(neighbor, path);
        path.pop();
        visited.delete(neighbor);
      }
    };

    visited.add(start);
    dfs(start, [start]);

    return bestPath;
  }

  /**
   * Build a PathPreference from an ordered list of cell IDs.
   */
  private buildPathPreference(
    cellSequence: CellId[],
    visitCells: Map<CellId, SpatialCell>,
  ): PathPreference {
    const positions: Vec3[] = [];
    let totalIntensity = 0;
    let totalTraversals = 0;
    const uniqueAgents = new Set<string>();

    for (const cellId of cellSequence) {
      const cell = visitCells.get(cellId);
      if (!cell) continue;
      positions.push({ ...cell.center });
      totalIntensity += cell.aggregateIntensity;

      for (const trace of cell.traces) {
        if (trace.category === 'visit') {
          totalTraversals += 1 + trace.reinforcementCount;
          uniqueAgents.add(trace.agentId);
        }
      }
    }

    // Compute path length
    let length = 0;
    for (let i = 1; i < positions.length; i++) {
      length += vec3Distance(positions[i - 1], positions[i]);
    }

    // Compute dominant direction (start to end)
    let dominantDirection: Vec3 = { x: 0, y: 0, z: 1 };
    if (positions.length >= 2) {
      const first = positions[0];
      const last = positions[positions.length - 1];
      const dx = last.x - first.x;
      const dy = last.y - first.y;
      const dz = last.z - first.z;
      const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (mag > 0.001) {
        dominantDirection = { x: dx / mag, y: dy / mag, z: dz / mag };
      }
    }

    return {
      cellSequence,
      positions,
      length,
      averageIntensity: cellSequence.length > 0 ? totalIntensity / cellSequence.length : 0,
      uniqueAgentCount: uniqueAgents.size,
      traversalCount: totalTraversals,
      dominantDirection,
    };
  }

  // ===========================================================================
  // HEATMAP GENERATION
  // ===========================================================================

  /**
   * Build a global heatmap (cell ID -> aggregate intensity).
   */
  private buildHeatmap(cells: ReadonlyMap<CellId, SpatialCell>): Map<CellId, number> {
    const heatmap = new Map<CellId, number>();
    for (const [cellId, cell] of cells) {
      if (cell.aggregateIntensity > 0) {
        heatmap.set(cellId, cell.aggregateIntensity);
      }
    }
    return heatmap;
  }

  /**
   * Build per-category heatmaps.
   */
  private buildCategoryHeatmaps(
    cells: ReadonlyMap<CellId, SpatialCell>,
  ): Map<TraceCategory, Map<CellId, number>> {
    const heatmaps = new Map<TraceCategory, Map<CellId, number>>();
    const categories: TraceCategory[] = [
      'visit', 'inspect', 'annotate', 'create',
      'interact', 'emotional', 'waypoint', 'hazard',
    ];

    for (const cat of categories) {
      heatmaps.set(cat, new Map());
    }

    for (const [cellId, cell] of cells) {
      for (const trace of cell.traces) {
        const catMap = heatmaps.get(trace.category)!;
        catMap.set(cellId, (catMap.get(cellId) ?? 0) + trace.intensity);
      }
    }

    return heatmaps;
  }

  // ===========================================================================
  // SUMMARY STATISTICS
  // ===========================================================================

  /**
   * Count unique agents across all cells.
   */
  private countUniqueAgents(cells: ReadonlyMap<CellId, SpatialCell>): number {
    const agents = new Set<string>();
    for (const cell of cells.values()) {
      for (const agentId of cell.agentIds) {
        agents.add(agentId);
      }
    }
    return agents.size;
  }

  /**
   * Find the dominant trace category across all cells.
   */
  private findDominantCategory(cells: ReadonlyMap<CellId, SpatialCell>): TraceCategory | null {
    const counts: Partial<Record<TraceCategory, number>> = {};
    for (const cell of cells.values()) {
      for (const trace of cell.traces) {
        counts[trace.category] = (counts[trace.category] ?? 0) + 1;
      }
    }

    let max = 0;
    let dominant: TraceCategory | null = null;
    for (const [cat, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        dominant = cat as TraceCategory;
      }
    }
    return dominant;
  }

  /**
   * Compute average intensity across all cells.
   */
  private computeAverageIntensity(cells: ReadonlyMap<CellId, SpatialCell>): number {
    if (cells.size === 0) return 0;
    let total = 0;
    for (const cell of cells.values()) {
      total += cell.aggregateIntensity;
    }
    return total / cells.size;
  }

  // ===========================================================================
  // CLUSTER TREND ANALYSIS
  // ===========================================================================

  /**
   * Compare new clusters with previous clusters to determine trends.
   */
  private updateClusterTrends(
    newClusters: TraceCluster[],
    oldClusters: ReadonlyArray<TraceCluster>,
  ): void {
    const now = Date.now();
    const stabilityThresholdMs = this.config.stabilityThresholdSeconds * 1000;

    for (const cluster of newClusters) {
      // Find matching old cluster (by centroid proximity)
      const match = oldClusters.find(
        (old) => vec3Distance(old.centroid, cluster.centroid) < this.config.clusterRadius,
      );

      if (match) {
        // Preserve creation time
        cluster.detectedAt = match.detectedAt;

        // Determine trend
        const intensityDelta = cluster.totalIntensity - match.totalIntensity;
        const relativeChange = match.totalIntensity > 0
          ? intensityDelta / match.totalIntensity
          : 0;

        if (relativeChange > 0.05) {
          cluster.trend = 'growing';
        } else if (relativeChange < -0.05) {
          cluster.trend = 'decaying';
        } else {
          cluster.trend = 'stable';
        }

        // Stability: how long has this cluster existed?
        const age = now - cluster.detectedAt;
        cluster.stability = Math.min(age / stabilityThresholdMs, 1.0);
      } else {
        // New cluster
        cluster.trend = 'growing';
        cluster.stability = 0;
      }
    }
  }

  /**
   * Detect clusters that appeared or dissolved between aggregation cycles.
   */
  private detectClusterChanges(
    newClusters: TraceCluster[],
    oldClusters: ReadonlyArray<TraceCluster>,
  ): void {
    // Detect new clusters
    for (const cluster of newClusters) {
      const match = oldClusters.find(
        (old) => vec3Distance(old.centroid, cluster.centroid) < this.config.clusterRadius,
      );
      if (!match) {
        this.emit('cluster:detected', { cluster });
      }
    }

    // Detect dissolved clusters
    for (const old of oldClusters) {
      const match = newClusters.find(
        (n) => vec3Distance(n.centroid, old.centroid) < this.config.clusterRadius,
      );
      if (!match) {
        this.emit('cluster:dissolved', { clusterId: old.id, reason: 'decay' });
      }
    }
  }

  // ===========================================================================
  // EVENT EMISSION
  // ===========================================================================

  /**
   * Emit an event.
   */
  private emit<T extends CulturalTraceEventType>(
    event: T,
    data: Parameters<CulturalTraceEventHandler<T>>[0],
  ): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        (handler as CulturalTraceEventHandler<T>)(data as CulturalTraceEventMap[T]);
      } catch (err) {
        logger.error(`[CollectiveMemoryAggregator] Event handler error for "${event}"`, { error: err });
      }
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a new CollectiveMemoryAggregator.
 */
export function createCollectiveMemoryAggregator(
  engine: StigmergicTraceEngine,
  config?: Partial<CollectiveMemoryAggregatorConfig>,
): CollectiveMemoryAggregator {
  return new CollectiveMemoryAggregator(engine, config);
}
