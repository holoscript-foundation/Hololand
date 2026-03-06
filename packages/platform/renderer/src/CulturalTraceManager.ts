/**
 * CulturalTraceManager
 *
 * Top-level API integrating the CulturalTrace stigmergic collective memory system
 * with HoloLand VR worlds. This is the single entry point for world code to
 * interact with the cultural trace system.
 *
 * ARCHITECTURE:
 * ```
 *   CulturalTraceManager (this file)
 *        |
 *        ├── StigmergicTraceEngine      (deposit, decay, diffusion, reinforcement)
 *        ├── CollectiveMemoryAggregator  (clusters, paths, heatmaps)
 *        └── CulturalTraceRenderer       (particles, overlays, indicators)
 * ```
 *
 * USAGE:
 * ```typescript
 * // Create and start the cultural trace system for a world
 * const culturalTrace = createCulturalTraceManager({
 *   worldId: 'world-42',
 *   localAgentId: 'brittney',
 *   engine: { updateHz: 5, grid: { cellSize: 1.0 } },
 *   aggregator: { updateHz: 1, minClusterSize: 3 },
 *   renderer: { showTraceParticles: true, showClusters: true },
 * });
 *
 * culturalTrace.start();
 *
 * // Agent deposits a trace when visiting a location
 * culturalTrace.deposit({
 *   worldId: 'world-42',
 *   agentId: 'brittney',
 *   agentName: 'Brittney',
 *   position: { x: 5, y: 0, z: -3 },
 *   category: 'visit',
 * });
 *
 * // Agent annotates a point of interest
 * culturalTrace.deposit({
 *   worldId: 'world-42',
 *   agentId: 'builder',
 *   agentName: 'Builder',
 *   position: { x: 10, y: 1, z: 0 },
 *   category: 'annotate',
 *   textContent: 'This object needs review',
 *   tags: ['review', 'priority-high'],
 * });
 *
 * // In the render loop (90Hz)
 * function onFrame(cameraPos: Vec3) {
 *   culturalTrace.setCameraPosition(cameraPos);
 *   const renderOutput = culturalTrace.render();
 *   // Pass renderOutput to Three.js for drawing
 * }
 *
 * // Query collective memory
 * const clusters = culturalTrace.getClusters();
 * const paths = culturalTrace.getPathPreferences();
 * const nearby = culturalTrace.getTracesNear({ x: 5, y: 0, z: -3 }, 10);
 *
 * // Cleanup
 * culturalTrace.destroy();
 * ```
 *
 * INTEGRATION WITH EXISTING SYSTEMS:
 *
 * SharedSpatialAnchors: CulturalTrace complements the anchor system. Anchors are
 * explicit, intentionally placed reference points. Cultural traces are implicit,
 * emergent patterns from agent behavior. A cluster detected by CulturalTrace
 * could be promoted to a persistent SharedSpatialAnchor.
 *
 * BehavioralTrustScoring: Trace deposits can feed into behavioral scoring.
 * Excessive trace deposits in restricted areas could trigger spatial compliance
 * violations. Conversely, trust-degraded agents could have their trace intensity
 * reduced (less influence on collective memory).
 *
 * AgentCommunicationManager: Agent actions communicated via MCP messages can
 * automatically generate trace deposits. When an agent sends a message about
 * an object at a location, a trace is deposited there.
 *
 * @module CulturalTraceManager
 */

import { logger } from './logger';
import type { Vec3 } from './AgentStateBuffer';
import type {
  TraceDepositRequest,
  CulturalTraceManagerConfig,
  CulturalTraceMetrics,
  CulturalTraceEventType,
  CulturalTraceEventHandler,
  TraceId,
  CellId,
  CulturalTrace,
  SpatialCell,
  TraceCluster,
  PathPreference,
  CollectiveMemoryState,
  CulturalTraceRendererConfig,
} from './CulturalTraceTypes';
import {
  createDefaultEngineConfig,
  createDefaultAggregatorConfig,
  createDefaultRendererConfig,
} from './CulturalTraceTypes';
import {
  StigmergicTraceEngine,
  createStigmergicTraceEngine,
} from './StigmergicTraceEngine';
import {
  CollectiveMemoryAggregator,
  createCollectiveMemoryAggregator,
} from './CollectiveMemoryAggregator';
import {
  CulturalTraceRenderer,
  createCulturalTraceRenderer,
  type TraceRenderOutput,
} from './CulturalTraceRenderer';

// =============================================================================
// CULTURAL TRACE MANAGER
// =============================================================================

export class CulturalTraceManager {
  private readonly worldId: string;
  private readonly localAgentId: string;

  /** The core stigmergic engine */
  private readonly engine: StigmergicTraceEngine;
  /** The collective memory aggregator */
  private readonly aggregator: CollectiveMemoryAggregator;
  /** The spatial renderer */
  private readonly renderer: CulturalTraceRenderer;

  /** Whether the system is currently active */
  private running = false;

  constructor(config: CulturalTraceManagerConfig) {
    this.worldId = config.worldId;
    this.localAgentId = config.localAgentId;

    // Create subsystems
    this.engine = createStigmergicTraceEngine({
      worldId: config.worldId,
      ...config.engine,
    });

    this.aggregator = createCollectiveMemoryAggregator(
      this.engine,
      config.aggregator,
    );

    this.renderer = createCulturalTraceRenderer(
      this.engine,
      this.aggregator,
      config.renderer,
    );

    logger.info(
      `[CulturalTraceManager] Created for world "${config.worldId}" ` +
      `by agent "${config.localAgentId}"`,
    );
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start all subsystems (engine, aggregator).
   * The renderer does not have its own loop -- it is called per frame.
   */
  start(): void {
    if (this.running) {
      logger.warn('[CulturalTraceManager] Already running');
      return;
    }

    this.engine.start();
    this.aggregator.start();
    this.running = true;

    logger.info('[CulturalTraceManager] Started all subsystems');
  }

  /**
   * Stop all subsystems.
   */
  stop(): void {
    if (!this.running) return;

    this.engine.stop();
    this.aggregator.stop();
    this.running = false;

    logger.info('[CulturalTraceManager] Stopped all subsystems');
  }

  /**
   * Destroy the manager and all subsystems, releasing all resources.
   */
  destroy(): void {
    this.stop();
    this.engine.destroy();
    this.aggregator.destroy();
    logger.info('[CulturalTraceManager] Destroyed');
  }

  /**
   * Whether the system is running.
   */
  isRunning(): boolean {
    return this.running;
  }

  // ===========================================================================
  // DEPOSIT API
  // ===========================================================================

  /**
   * Deposit a cultural trace at a spatial location.
   *
   * This is the primary way agents leave their mark in the world.
   * The trace is queued for processing on the next engine cycle.
   *
   * @param request - Deposit request with position, category, and optional metadata
   */
  deposit(request: TraceDepositRequest): void {
    this.engine.deposit(request);
  }

  /**
   * Convenience: deposit a 'visit' trace at the agent's current position.
   */
  depositVisit(position: Vec3, agentName?: string): void {
    this.engine.deposit({
      worldId: this.worldId,
      agentId: this.localAgentId,
      agentName: agentName ?? this.localAgentId,
      position,
      category: 'visit',
    });
  }

  /**
   * Convenience: deposit an 'annotate' trace with text content.
   */
  depositAnnotation(
    position: Vec3,
    text: string,
    tags?: string[],
    agentName?: string,
  ): void {
    this.engine.deposit({
      worldId: this.worldId,
      agentId: this.localAgentId,
      agentName: agentName ?? this.localAgentId,
      position,
      category: 'annotate',
      textContent: text,
      tags,
    });
  }

  /**
   * Convenience: deposit a 'hazard' trace to warn others.
   */
  depositHazard(
    position: Vec3,
    description: string,
    agentName?: string,
  ): void {
    this.engine.deposit({
      worldId: this.worldId,
      agentId: this.localAgentId,
      agentName: agentName ?? this.localAgentId,
      position,
      category: 'hazard',
      textContent: description,
      tags: ['hazard'],
    });
  }

  /**
   * Convenience: deposit a 'waypoint' trace as a navigation marker.
   */
  depositWaypoint(
    position: Vec3,
    name: string,
    agentName?: string,
  ): void {
    this.engine.deposit({
      worldId: this.worldId,
      agentId: this.localAgentId,
      agentName: agentName ?? this.localAgentId,
      position,
      category: 'waypoint',
      textContent: name,
      tags: ['waypoint'],
    });
  }

  /**
   * Convenience: deposit an 'emotional' trace to express a reaction.
   */
  depositEmotion(
    position: Vec3,
    emotion: string,
    agentName?: string,
  ): void {
    this.engine.deposit({
      worldId: this.worldId,
      agentId: this.localAgentId,
      agentName: agentName ?? this.localAgentId,
      position,
      category: 'emotional',
      metadata: { emotion },
      tags: ['emotion', emotion],
    });
  }

  // ===========================================================================
  // QUERY API
  // ===========================================================================

  /**
   * Get all active traces.
   */
  getTraces(): ReadonlyMap<TraceId, CulturalTrace> {
    return this.engine.getTraces();
  }

  /**
   * Get a specific trace by ID.
   */
  getTrace(traceId: TraceId): CulturalTrace | undefined {
    return this.engine.getTrace(traceId);
  }

  /**
   * Get all spatial cells.
   */
  getCells(): ReadonlyMap<CellId, SpatialCell> {
    return this.engine.getCells();
  }

  /**
   * Get a specific cell.
   */
  getCell(cellId: CellId): SpatialCell | undefined {
    return this.engine.getCell(cellId);
  }

  /**
   * Get traces near a position within a radius.
   */
  getTracesNear(position: Vec3, radius: number): CulturalTrace[] {
    return this.engine.getTracesNear(position, radius);
  }

  /**
   * Get all detected clusters (cultural hotspots).
   */
  getClusters(): ReadonlyArray<TraceCluster> {
    return this.aggregator.getClusters();
  }

  /**
   * Get all detected path preferences (emergent trails).
   */
  getPathPreferences(): ReadonlyArray<PathPreference> {
    return this.aggregator.getPathPreferences();
  }

  /**
   * Get the full collective memory state.
   */
  getCollectiveMemory(): Readonly<CollectiveMemoryState> {
    return this.aggregator.getMemoryState();
  }

  /**
   * Get the heatmap (cell -> intensity).
   */
  getHeatmap(): ReadonlyMap<CellId, number> {
    return this.aggregator.getHeatmap();
  }

  // ===========================================================================
  // RENDER API
  // ===========================================================================

  /**
   * Update the camera position for distance culling.
   * Call this each frame before render().
   */
  setCameraPosition(position: Vec3): void {
    this.renderer.setCameraPosition(position);
  }

  /**
   * Render one frame. Returns abstract render commands that the main
   * HololandRenderer translates to Three.js draw calls.
   *
   * Call this at 90Hz on the render loop.
   */
  render(): TraceRenderOutput {
    return this.renderer.render();
  }

  /**
   * Update renderer configuration at runtime.
   */
  updateRendererConfig(overrides: Partial<CulturalTraceRendererConfig>): void {
    this.renderer.updateConfig(overrides);
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  /**
   * Subscribe to cultural trace events.
   */
  on<T extends CulturalTraceEventType>(
    event: T,
    handler: CulturalTraceEventHandler<T>,
  ): void {
    // Route events to appropriate subsystem
    if (event.startsWith('trace:') || event.startsWith('cluster:')) {
      this.engine.on(event, handler);
    }
    if (event.startsWith('memory:') || event.startsWith('cluster:')) {
      this.aggregator.on(event, handler);
    }
  }

  /**
   * Unsubscribe from events.
   */
  off<T extends CulturalTraceEventType>(
    event: T,
    handler: CulturalTraceEventHandler<T>,
  ): void {
    this.engine.off(event, handler);
    this.aggregator.off(event, handler);
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Get comprehensive metrics for the entire cultural trace system.
   */
  getMetrics(): CulturalTraceMetrics {
    const engineMetrics = this.engine.getMetrics();
    const aggregatorMetrics = this.aggregator.getMetrics();
    const now = Date.now();
    const front = this.engine.getFrontBuffer();

    // Estimate memory usage
    const traceMem = engineMetrics.totalActiveTraces * 256; // ~256 bytes per trace
    const cellMem = engineMetrics.totalCells * 128; // ~128 bytes per cell
    const clusterMem = aggregatorMetrics.clusterCount * 512;
    const pathMem = aggregatorMetrics.pathPreferenceCount * 256;

    return {
      isRunning: this.running,
      totalActiveTraces: engineMetrics.totalActiveTraces,
      totalTracesCulled: engineMetrics.totalTracesCulled,
      totalDeposits: engineMetrics.totalDeposits,
      totalReinforcements: engineMetrics.totalReinforcements,
      activeClusters: aggregatorMetrics.clusterCount,
      activePathPreferences: aggregatorMetrics.pathPreferenceCount,
      uniqueAgents: engineMetrics.uniqueAgents,
      tracesByCategory: engineMetrics.tracesByCategory,
      averageEngineCycleMs: engineMetrics.averageCycleMs,
      averageAggregatorCycleMs: aggregatorMetrics.averageCycleMs,
      estimatedMemoryBytes: traceMem + cellMem + clusterMem + pathMem,
      timeSinceLastEngineCycleMs: now - front.lastUpdateTimestamp,
      timeSinceLastAggregationMs: now - (this.aggregator.getMemoryState().aggregatedAt || 0),
    };
  }

  // ===========================================================================
  // ACCESS TO SUBSYSTEMS (for advanced use)
  // ===========================================================================

  /**
   * Get direct reference to the stigmergic trace engine.
   */
  getEngine(): StigmergicTraceEngine {
    return this.engine;
  }

  /**
   * Get direct reference to the collective memory aggregator.
   */
  getAggregator(): CollectiveMemoryAggregator {
    return this.aggregator;
  }

  /**
   * Get direct reference to the renderer.
   */
  getRenderer(): CulturalTraceRenderer {
    return this.renderer;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a new CulturalTraceManager for a HoloLand world.
 *
 * @param config - Manager configuration
 * @returns A configured CulturalTraceManager (call .start() to begin)
 */
export function createCulturalTraceManager(
  config: CulturalTraceManagerConfig,
): CulturalTraceManager {
  return new CulturalTraceManager(config);
}
