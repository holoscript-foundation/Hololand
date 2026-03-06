/**
 * DistributedSceneGraphOrchestrator
 *
 * Top-level orchestrator that connects all MA3DSG-inspired modules:
 * - AgentLocalGraphBuilder: Per-agent local graph construction
 * - TrainingFreeAlignmentMerger: Training-free graph alignment + merging
 * - SpatialRelationshipExtractor: Relationship extraction from merged graph
 *
 * This orchestrator integrates with HoloLand's existing inference architecture:
 * - Accepts ObjectSnapshot[] from the scene (same as SpatialReasoningEngine)
 * - Runs on Tier 1 (1-5Hz) via InferenceScheduler
 * - Produces SpatialRelationship[] and SpatialRegion[] for CachedSpatialState
 * - Implements SpatialReasoningProvider for drop-in compatibility
 *
 * MULTI-AGENT FLOW:
 * 1. Each agent submits observations via submitObservations(agentId, snapshots)
 * 2. Orchestrator routes observations to per-agent LocalGraphBuilder
 * 3. On infer(), all local graphs are merged into global graph
 * 4. Spatial relationships extracted and written to CachedSpatialState
 *
 * @module DistributedSceneGraphOrchestrator
 */

import { logger } from './logger';
import type { Vec3 } from './AgentStateBuffer';
import type { ObjectSnapshot, CameraSnapshot } from './SpatialReasoningEngine';
import type {
  CachedSpatialState,
  SpatialReasoningProvider,
} from './SpatialInferenceTypes';
import type {
  DistributedSceneGraphConfig,
  DistributedSceneGraphMetrics,
  DistributedSceneGraphEvent,
  DistributedSceneGraphEventType,
  GlobalSceneGraph,
  LocalSceneGraph,
} from './DistributedSceneGraphTypes';
import { DEFAULT_DISTRIBUTED_SCENE_GRAPH_CONFIG } from './DistributedSceneGraphTypes';

import {
  AgentLocalGraphBuilder,
  type AgentLocalGraphBuilderConfig,
} from './AgentLocalGraphBuilder';
import { TrainingFreeAlignmentMerger } from './TrainingFreeAlignmentMerger';
import {
  SpatialRelationshipExtractor,
  type ExtractionResult,
} from './SpatialRelationshipExtractor';

// =============================================================================
// EVENT LISTENER TYPE
// =============================================================================

export type DistributedSceneGraphEventListener = (
  event: DistributedSceneGraphEvent,
) => void;

// =============================================================================
// ORCHESTRATOR
// =============================================================================

export class DistributedSceneGraphOrchestrator implements SpatialReasoningProvider {
  private readonly config: DistributedSceneGraphConfig;
  private readonly builders: Map<string, AgentLocalGraphBuilder> = new Map();
  private readonly merger: TrainingFreeAlignmentMerger;
  private readonly extractor: SpatialRelationshipExtractor;
  private readonly eventListeners: DistributedSceneGraphEventListener[] = [];

  // Pending observations from agents (buffered between infer() calls)
  private readonly pendingObservations: Map<string, ObjectSnapshot[]> = new Map();

  // Current camera state
  private camera: CameraSnapshot = {
    position: { x: 0, y: 0, z: 0 },
    forward: { x: 0, y: 0, z: -1 },
    up: { x: 0, y: 1, z: 0 },
    right: { x: 1, y: 0, z: 0 },
    fov: 75,
    near: 0.1,
    far: 1000,
  };

  // Complexity tracking
  private currentComplexity: number = 0;
  private lastExtractionResult: ExtractionResult | null = null;

  constructor(config?: Partial<DistributedSceneGraphConfig>) {
    this.config = { ...DEFAULT_DISTRIBUTED_SCENE_GRAPH_CONFIG, ...config };
    this.merger = new TrainingFreeAlignmentMerger(this.config.alignment);
    this.extractor = new SpatialRelationshipExtractor({
      minConfidence: this.config.alignment.minMatchConfidence,
    });

    logger.info('[DistributedSceneGraphOrchestrator] Initialized', {
      maxAgents: this.config.maxAgents,
    });
  }

  // ===========================================================================
  // AGENT REGISTRATION
  // ===========================================================================

  /**
   * Register a new agent. Creates a local graph builder for the agent.
   *
   * @param agentId - Unique agent identifier
   * @param builderConfig - Optional per-agent builder configuration
   * @throws Error if max agents reached or agent already registered
   */
  registerAgent(
    agentId: string,
    builderConfig?: Partial<AgentLocalGraphBuilderConfig>,
  ): void {
    if (this.builders.has(agentId)) {
      logger.warn('[DistributedSceneGraphOrchestrator] Agent already registered', { agentId });
      return;
    }

    if (this.builders.size >= this.config.maxAgents) {
      throw new Error(
        `Maximum agent count (${this.config.maxAgents}) reached. Cannot register agent: ${agentId}`,
      );
    }

    const builder = new AgentLocalGraphBuilder(agentId, {
      neighborDistanceThreshold: this.config.neighborDistanceThreshold,
      maxEdgesPerNode: this.config.maxEdgesPerNode,
      featureVectorDimension: this.config.featureVectorDimension,
      minPointCount: this.config.minSegmentPoints,
      ...builderConfig,
    });

    this.builders.set(agentId, builder);
    this.emitEvent('agent_registered', agentId, { agentId });

    logger.info('[DistributedSceneGraphOrchestrator] Agent registered', { agentId });
  }

  /**
   * Unregister an agent and remove its local graph builder.
   */
  unregisterAgent(agentId: string): void {
    const builder = this.builders.get(agentId);
    if (!builder) return;

    builder.dispose();
    this.builders.delete(agentId);
    this.pendingObservations.delete(agentId);
    this.emitEvent('agent_unregistered', agentId, { agentId });

    logger.info('[DistributedSceneGraphOrchestrator] Agent unregistered', { agentId });
  }

  /**
   * Check if an agent is registered.
   */
  isAgentRegistered(agentId: string): boolean {
    return this.builders.has(agentId);
  }

  /**
   * Get the list of registered agent IDs.
   */
  getRegisteredAgentIds(): string[] {
    return Array.from(this.builders.keys());
  }

  // ===========================================================================
  // OBSERVATION SUBMISSION
  // ===========================================================================

  /**
   * Submit observations from an agent.
   *
   * Observations are buffered and processed on the next infer() call.
   * This allows agents to submit observations at any rate without
   * blocking the inference cycle.
   *
   * @param agentId - Agent submitting the observations
   * @param snapshots - Object snapshots from the agent's view
   */
  submitObservations(agentId: string, snapshots: ObjectSnapshot[]): void {
    if (!this.builders.has(agentId)) {
      // Auto-register if not yet registered
      this.registerAgent(agentId);
    }

    this.pendingObservations.set(agentId, snapshots);
  }

  /**
   * Submit camera state for view-dependent relationship extraction.
   */
  setCamera(camera: CameraSnapshot): void {
    this.camera = camera;
  }

  // ===========================================================================
  // SpatialReasoningProvider INTERFACE
  // ===========================================================================

  /**
   * Run a single distributed inference pass.
   *
   * Pipeline:
   * 1. Process pending observations through per-agent builders
   * 2. Merge all local graphs into global graph
   * 3. Extract spatial relationships from global graph
   * 4. Write results to CachedSpatialState
   *
   * Budget: 200-1000ms (called at 1-5Hz, NOT at 90Hz)
   */
  async infer(state: CachedSpatialState, deltaMs: number): Promise<void> {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Phase 1: Process pending observations through local builders
    const updatedGraphs: LocalSceneGraph[] = [];
    for (const [agentId, snapshots] of this.pendingObservations) {
      const builder = this.builders.get(agentId);
      if (!builder) continue;

      const localGraph = builder.processObservations(snapshots);
      updatedGraphs.push(localGraph);
      this.emitEvent('local_graph_updated', agentId, {
        nodeCount: localGraph.nodes.size,
        edgeCount: localGraph.edges.size,
      });
    }
    this.pendingObservations.clear();

    // Phase 2: Merge local graphs into global graph
    if (updatedGraphs.length > 0) {
      // Reset merger for fresh merge from all local graphs
      this.merger.reset();

      for (const localGraph of this.getAllLocalGraphs()) {
        this.emitEvent('merge_started', localGraph.agentId, {});
        const result = this.merger.mergeLocalGraph(localGraph);
        this.emitEvent('merge_completed', localGraph.agentId, {
          matched: result.event.matchedNodes,
          newNodes: result.event.newNodes,
          conflicts: result.event.labelConflicts,
        });
      }
    }

    // Phase 3: Extract relationships from global graph
    const globalGraph = this.merger.getGlobalGraph();
    const extraction = this.extractor.extract(globalGraph);
    this.lastExtractionResult = extraction;

    // Phase 4: Write to CachedSpatialState
    state.relationships = extraction.relationships;
    state.regions = extraction.regions;

    // Compute scene summary
    const { center, extents } = this.computeGlobalBounds(globalGraph);
    state.objectCount = globalGraph.nodes.size;
    state.sceneComplexity = this.computeComplexity(globalGraph);
    state.sceneCenterOfMass = center;
    state.sceneExtents = extents;

    // Timing
    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    state.lastInferenceDurationMs = endTime - startTime;
    state.lastInferenceTimestamp = endTime;
    state.sequence++;

    // Update complexity
    this.currentComplexity = state.sceneComplexity;

    logger.debug('[DistributedSceneGraphOrchestrator] Inference pass complete', {
      sequence: state.sequence,
      durationMs: state.lastInferenceDurationMs.toFixed(2),
      globalNodes: globalGraph.nodes.size,
      globalEdges: globalGraph.edges.size,
      relationships: state.relationships.length,
      regions: state.regions.length,
      agents: this.builders.size,
    });
  }

  /**
   * Get current scene complexity (0-1).
   */
  getComplexity(): number {
    return this.currentComplexity;
  }

  /**
   * Initialize the orchestrator.
   */
  async initialize(): Promise<void> {
    logger.info('[DistributedSceneGraphOrchestrator] Initialized resources');
  }

  /**
   * Dispose the orchestrator and all sub-modules.
   */
  dispose(): void {
    for (const builder of this.builders.values()) {
      builder.dispose();
    }
    this.builders.clear();
    this.pendingObservations.clear();
    this.merger.dispose();
    this.eventListeners.length = 0;
    this.lastExtractionResult = null;

    logger.info('[DistributedSceneGraphOrchestrator] Disposed');
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Get comprehensive metrics for the distributed scene graph system.
   */
  getMetrics(): DistributedSceneGraphMetrics {
    const globalGraph = this.merger.getGlobalGraph();
    const mergeHistory = this.merger.getMergeHistory();

    const agentGraphSizes: Record<string, { nodes: number; edges: number }> = {};
    for (const [agentId, builder] of this.builders) {
      agentGraphSizes[agentId] = {
        nodes: builder.getNodeCount(),
        edges: builder.getEdgeCount(),
      };
    }

    const avgMergeDuration = mergeHistory.length > 0
      ? mergeHistory.reduce((sum, e) => sum + e.durationMs, 0) / mergeHistory.length
      : 0;

    const totalMatched = mergeHistory.reduce((sum, e) => sum + e.matchedNodes, 0);
    const totalNew = mergeHistory.reduce((sum, e) => sum + e.newNodes, 0);
    const totalConflicts = mergeHistory.reduce((sum, e) => sum + e.labelConflicts, 0);

    // Compute spatial extent
    const bounds = globalGraph.bounds;
    const spatialExtent = Math.sqrt(
      Math.pow(bounds.max.x - bounds.min.x, 2)
      + Math.pow(bounds.max.y - bounds.min.y, 2)
      + Math.pow(bounds.max.z - bounds.min.z, 2),
    );

    return {
      activeAgents: this.builders.size,
      globalNodeCount: globalGraph.nodes.size,
      globalEdgeCount: globalGraph.edges.size,
      agentGraphSizes,
      totalMerges: globalGraph.mergeCount,
      averageMergeDurationMs: avgMergeDuration,
      totalMatchedNodes: totalMatched,
      totalNewNodes: totalNew,
      totalLabelConflicts: totalConflicts,
      lastMergeTimestamp: globalGraph.lastMerged,
      spatialExtent: isFinite(spatialExtent) ? spatialExtent : 0,
    };
  }

  /**
   * Get the global scene graph (for inspection/debug).
   */
  getGlobalGraph(): GlobalSceneGraph {
    return this.merger.getGlobalGraph();
  }

  /**
   * Get the last extraction result (for inspection/debug).
   */
  getLastExtractionResult(): ExtractionResult | null {
    return this.lastExtractionResult;
  }

  // ===========================================================================
  // EVENT SYSTEM
  // ===========================================================================

  /**
   * Register an event listener.
   */
  addEventListener(listener: DistributedSceneGraphEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove an event listener.
   */
  removeEventListener(listener: DistributedSceneGraphEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index >= 0) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit an event to all listeners.
   */
  private emitEvent(
    type: DistributedSceneGraphEventType,
    agentId?: string,
    data: Record<string, unknown> = {},
  ): void {
    if (!this.config.emitEvents) return;

    const event: DistributedSceneGraphEvent = {
      type,
      timestamp: Date.now(),
      agentId,
      data,
    };

    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        logger.error('[DistributedSceneGraphOrchestrator] Event listener error', { err });
      }
    }
  }

  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================

  /**
   * Get all current local graphs from registered agents.
   */
  private getAllLocalGraphs(): LocalSceneGraph[] {
    const graphs: LocalSceneGraph[] = [];
    for (const builder of this.builders.values()) {
      graphs.push(builder.getGraph());
    }
    return graphs;
  }

  /**
   * Compute scene complexity from the global graph (0-1).
   */
  private computeComplexity(globalGraph: GlobalSceneGraph): number {
    const nodeCount = globalGraph.nodes.size;
    if (nodeCount === 0) return 0;

    // Node count factor (logarithmic)
    const countFactor = Math.min(Math.log10(nodeCount + 1) / 3, 1.0);

    // Edge density factor
    const maxEdges = nodeCount * (nodeCount - 1) / 2;
    const edgeDensity = maxEdges > 0 ? globalGraph.edges.size / maxEdges : 0;
    const densityFactor = Math.min(edgeDensity * 10, 1.0);

    // Agent factor (more agents = more complex)
    const agentFactor = Math.min(this.builders.size / this.config.maxAgents, 1.0);

    return countFactor * 0.5 + densityFactor * 0.3 + agentFactor * 0.2;
  }

  /**
   * Compute global bounds center and extents.
   */
  private computeGlobalBounds(
    globalGraph: GlobalSceneGraph,
  ): { center: Vec3; extents: Vec3 } {
    if (globalGraph.nodes.size === 0) {
      return {
        center: { x: 0, y: 0, z: 0 },
        extents: { x: 0, y: 0, z: 0 },
      };
    }

    const bounds = globalGraph.bounds;

    return {
      center: {
        x: (bounds.min.x + bounds.max.x) / 2,
        y: (bounds.min.y + bounds.max.y) / 2,
        z: (bounds.min.z + bounds.max.z) / 2,
      },
      extents: {
        x: bounds.max.x - bounds.min.x,
        y: bounds.max.y - bounds.min.y,
        z: bounds.max.z - bounds.min.z,
      },
    };
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a DistributedSceneGraphOrchestrator.
 */
export function createDistributedSceneGraphOrchestrator(
  config?: Partial<DistributedSceneGraphConfig>,
): DistributedSceneGraphOrchestrator {
  return new DistributedSceneGraphOrchestrator(config);
}
