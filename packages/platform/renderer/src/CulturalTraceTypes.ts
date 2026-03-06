/**
 * CulturalTraceTypes
 *
 * Type definitions for the CulturalTrace spatial computing feature -- a stigmergic
 * collective memory system for HoloLand VR worlds.
 *
 * BIOLOGICAL INSPIRATION:
 * In ant colonies, individuals deposit pheromone trails in the physical environment.
 * These traces evaporate over time (decay), are reinforced by repeated traversal
 * (positive feedback), and diffuse spatially (gradient formation). No single ant
 * "knows" the optimal path -- the collective solution emerges from the interaction
 * of simple rules with the environment. This is stigmergy: indirect coordination
 * through environmental modification.
 *
 * DIGITAL STIGMERGY FOR VR:
 * CulturalTrace applies stigmergic principles to multi-agent VR/AR worlds:
 *
 * 1. TRACE DEPOSIT: When an agent interacts with a spatial location (visits,
 *    annotates, inspects, creates), a digital trace is deposited at that position.
 *    Traces carry semantic metadata (type, intensity, agent identity, context).
 *
 * 2. TRACE DECAY (Evaporation): Traces lose intensity over time following
 *    exponential decay: I(t) = I_0 * e^(-lambda * t), where lambda is the
 *    evaporation rate. This ensures that stale information fades, preventing
 *    the environment from becoming saturated with irrelevant traces.
 *
 * 3. TRACE REINFORCEMENT: When multiple agents deposit traces at the same
 *    location, intensities combine (additively or via max-merge). Frequently
 *    visited locations develop strong, persistent traces -- emergent "hot spots"
 *    that signal collective interest or importance.
 *
 * 4. TRACE DIFFUSION: Traces spread to neighboring spatial cells following a
 *    Gaussian diffusion kernel: dI/dt = D * nabla^2(I), where D is the
 *    diffusion coefficient. This creates spatial gradients that agents can
 *    follow (gradient ascent), analogous to chemotaxis in biological systems.
 *
 * 5. COLLECTIVE MEMORY: The aggregate trace field across all agents and time
 *    constitutes a spatial "collective memory" -- an emergent map of what the
 *    group found important, where activity concentrated, and which paths were
 *    preferred. This memory persists beyond individual agent sessions.
 *
 * PERFORMANCE:
 *   Trace deposit:     < 0.1ms (hash map insertion)
 *   Decay/diffusion:   1-5ms per cycle (off render loop, configurable Hz)
 *   Trace read:        < 0.01ms (front buffer lookup, render-loop safe)
 *   Memory per trace:  ~256 bytes (position + metadata)
 *   Typical capacity:  10,000-100,000 traces per world
 *
 * DATA FLOW:
 * ```
 *   Agent Actions (visit, annotate, create, inspect)
 *        |
 *        v
 *   CulturalTraceManager.deposit()        <-- Any thread, queued
 *        |
 *        v
 *   StigmergicTraceEngine                 <-- OFF render loop (1-10Hz)
 *        ├── Process deposit queue
 *        ├── Apply decay (evaporation)
 *        ├── Apply diffusion (spatial spread)
 *        ├── Merge reinforced traces
 *        ├── Cull dead traces (I < epsilon)
 *        └── Swap double buffer
 *        |
 *        v
 *   CollectiveMemoryAggregator            <-- OFF render loop (0.5-2Hz)
 *        ├── Detect emergent clusters
 *        ├── Identify cultural hotspots
 *        ├── Compute path preferences
 *        ├── Build memory heatmap
 *        └── Update collective memory state
 *        |
 *        v
 *   CulturalTraceRenderer                 <-- ON render loop (90Hz)
 *        ├── Read front buffer (< 0.01ms)
 *        ├── Render trace particles/halos
 *        ├── Draw gradient overlays
 *        └── Show collective memory indicators
 * ```
 *
 * CONFLICT RESOLUTION:
 * Traces from concurrent agents are merged using CRDT-compatible semantics:
 * - Intensity: Max-merge (concurrent deposits take the maximum)
 * - Metadata: LWW-Map (last-writer-wins per key)
 * - Position: Immutable after deposit (no spatial conflicts)
 *
 * REFERENCES:
 *   - Grasse, P.P. (1959). La reconstruction du nid et les coordinations
 *     interindividuelles. Insectes Sociaux, 6(1), 41-80.
 *   - Dorigo, M. et al. (1996). Ant system: optimization by a colony of
 *     cooperating agents. IEEE Transactions on SMC, 26(1), 29-41.
 *   - Parunak, H.V.D. (2006). A survey of environments and mechanisms for
 *     human-human stigmergy. Environments for Multi-Agent Systems II.
 *   - Heylighen, F. (2016). Stigmergy as a universal coordination mechanism.
 *     Cognitive Systems Research, 38, 4-13.
 *
 * @module CulturalTraceTypes
 */

import type { Vec3 } from './AgentStateBuffer';

// =============================================================================
// TRACE IDENTITY
// =============================================================================

/**
 * Unique identifier for a cultural trace.
 * Format: `{worldId}:{agentId}:{timestamp}:{hash}` for global uniqueness.
 */
export type TraceId = string;

/**
 * Unique identifier for a spatial cell in the discretized trace field.
 * Format: `{x}:{y}:{z}` where coordinates are cell indices (not world units).
 */
export type CellId = string;

/**
 * Unique identifier for an emergent cluster of traces.
 */
export type ClusterId = string;

// =============================================================================
// TRACE CATEGORIES
// =============================================================================

/**
 * Semantic category of a trace deposit.
 *
 * Different agent actions produce different trace types, each with distinct
 * decay rates, visual representations, and influence on collective memory:
 *
 * - 'visit':     Agent passed through this location (weakest, fastest decay)
 * - 'inspect':   Agent paused and examined something here (moderate)
 * - 'annotate':  Agent left a note, comment, or marker (persistent)
 * - 'create':    Agent created content at this location (strongest, slowest decay)
 * - 'interact':  Agent interacted with an object or another agent here
 * - 'emotional': Agent expressed emotion (surprise, delight, confusion)
 * - 'waypoint':  Explicitly marked as a navigation reference point
 * - 'hazard':    Agent flagged this location as problematic or dangerous
 */
export type TraceCategory =
  | 'visit'
  | 'inspect'
  | 'annotate'
  | 'create'
  | 'interact'
  | 'emotional'
  | 'waypoint'
  | 'hazard';

/**
 * Default intensity values for each trace category.
 * Higher values mean stronger initial trace deposit.
 */
export const TRACE_CATEGORY_DEFAULTS: Record<TraceCategory, {
  intensity: number;
  decayRate: number;
  diffusionRate: number;
  color: [number, number, number, number]; // RGBA normalized 0-1
}> = {
  visit: {
    intensity: 0.2,
    decayRate: 0.05,      // Fast decay (5% per second)
    diffusionRate: 0.02,  // Moderate spread
    color: [0.3, 0.6, 1.0, 0.3],  // Light blue, low opacity
  },
  inspect: {
    intensity: 0.5,
    decayRate: 0.02,      // Moderate decay
    diffusionRate: 0.015,
    color: [0.2, 0.8, 0.4, 0.5],  // Green
  },
  annotate: {
    intensity: 0.7,
    decayRate: 0.005,     // Slow decay (persistent)
    diffusionRate: 0.01,
    color: [1.0, 0.8, 0.2, 0.6],  // Gold
  },
  create: {
    intensity: 1.0,
    decayRate: 0.002,     // Very slow decay (highly persistent)
    diffusionRate: 0.005,
    color: [0.9, 0.3, 1.0, 0.7],  // Purple
  },
  interact: {
    intensity: 0.6,
    decayRate: 0.03,
    diffusionRate: 0.02,
    color: [1.0, 0.5, 0.2, 0.5],  // Orange
  },
  emotional: {
    intensity: 0.8,
    decayRate: 0.04,      // Faster decay (emotions are transient)
    diffusionRate: 0.03,  // Higher spread (emotions are "contagious")
    color: [1.0, 0.2, 0.4, 0.6],  // Pink/Red
  },
  waypoint: {
    intensity: 0.9,
    decayRate: 0.001,     // Very persistent (navigation aids)
    diffusionRate: 0.0,   // No diffusion (precise markers)
    color: [0.2, 1.0, 0.8, 0.8],  // Cyan
  },
  hazard: {
    intensity: 0.95,
    decayRate: 0.003,     // Slow decay (safety information persists)
    diffusionRate: 0.025, // Moderate spread (warn nearby areas)
    color: [1.0, 0.1, 0.1, 0.8],  // Red
  },
};

// =============================================================================
// TRACE DATA
// =============================================================================

/**
 * A single cultural trace -- the fundamental unit of stigmergic memory.
 *
 * Each trace represents a discrete deposit of information at a spatial location
 * by a specific agent at a specific time. Traces are immutable after creation
 * (position and metadata are fixed); only the intensity changes over time
 * through decay and reinforcement.
 */
export interface CulturalTrace {
  // --- Identity ---
  /** Globally unique trace identifier */
  id: TraceId;
  /** World this trace belongs to */
  worldId: string;
  /** Agent that deposited this trace */
  agentId: string;
  /** Agent display name (for rendering labels) */
  agentName: string;

  // --- Spatial ---
  /** World-space position where the trace was deposited */
  position: Vec3;
  /** Cell ID in the discretized spatial grid */
  cellId: CellId;

  // --- Stigmergic State ---
  /** Semantic category of the trace */
  category: TraceCategory;
  /** Current intensity (0-1, decays over time, reinforced by overlapping deposits) */
  intensity: number;
  /** Initial intensity at deposit time */
  initialIntensity: number;
  /** Evaporation rate (fraction of intensity lost per second) */
  decayRate: number;
  /** Diffusion rate (fraction of intensity that spreads to neighbors per second) */
  diffusionRate: number;
  /** Number of times this trace has been reinforced by overlapping deposits */
  reinforcementCount: number;

  // --- Temporal ---
  /** Timestamp of initial deposit (ms since epoch) */
  depositedAt: number;
  /** Timestamp of last reinforcement (ms since epoch) */
  lastReinforcedAt: number;
  /** Timestamp of last decay computation (ms since epoch) */
  lastDecayAt: number;

  // --- Visual ---
  /** RGBA color for rendering (normalized 0-1) */
  color: [number, number, number, number];
  /** Visual radius in world units (grows with reinforcement) */
  visualRadius: number;

  // --- Metadata ---
  /** Custom key-value metadata (annotations, context, tags) */
  metadata: Record<string, unknown>;
  /** Tags for querying and filtering */
  tags: string[];
  /** Optional text content (for annotate traces) */
  textContent: string;
}

// =============================================================================
// SPATIAL GRID
// =============================================================================

/**
 * Configuration for the spatial discretization grid.
 *
 * The continuous world space is divided into a 3D grid of cells. Each cell
 * accumulates traces deposited within its bounds. The cell size determines
 * the spatial resolution of the collective memory.
 *
 * Smaller cells = higher resolution but more memory and computation.
 * Larger cells  = lower resolution but better performance.
 */
export interface SpatialGridConfig {
  /** Cell size in world units (default: 1.0) */
  cellSize: number;
  /** World bounds minimum corner (default: { x: -100, y: -10, z: -100 }) */
  worldMin: Vec3;
  /** World bounds maximum corner (default: { x: 100, y: 50, z: 100 }) */
  worldMax: Vec3;
  /** Maximum number of traces per cell before oldest are culled (default: 50) */
  maxTracesPerCell: number;
}

/**
 * A single cell in the spatial grid, accumulating traces.
 */
export interface SpatialCell {
  /** Cell identifier */
  id: CellId;
  /** Cell center position in world space */
  center: Vec3;
  /** All traces deposited in this cell */
  traces: CulturalTrace[];
  /** Aggregate intensity across all traces (sum, capped at 1.0) */
  aggregateIntensity: number;
  /** Dominant trace category in this cell */
  dominantCategory: TraceCategory | null;
  /** Number of unique agents that have deposited traces here */
  uniqueAgentCount: number;
  /** Set of agent IDs that have deposited here */
  agentIds: Set<string>;
  /** Last time any trace was deposited or reinforced in this cell */
  lastActivityAt: number;
}

// =============================================================================
// COLLECTIVE MEMORY PATTERNS
// =============================================================================

/**
 * An emergent cluster of traces -- a "cultural hotspot."
 *
 * When many agents deposit traces in a spatial region, a cluster emerges.
 * Clusters represent emergent points of collective interest, popular paths,
 * or shared knowledge that no single agent intentionally created.
 */
export interface TraceCluster {
  /** Unique cluster identifier */
  id: ClusterId;
  /** Centroid position (weighted average of member trace positions) */
  centroid: Vec3;
  /** Bounding radius of the cluster in world units */
  radius: number;
  /** Total intensity of all traces in the cluster */
  totalIntensity: number;
  /** Average intensity per trace */
  averageIntensity: number;
  /** Number of traces in this cluster */
  traceCount: number;
  /** Number of unique agents contributing to this cluster */
  uniqueAgentCount: number;
  /** Dominant trace category across the cluster */
  dominantCategory: TraceCategory;
  /** Category distribution (fraction of traces per category) */
  categoryDistribution: Record<TraceCategory, number>;
  /** Cell IDs that belong to this cluster */
  cellIds: CellId[];
  /** When the cluster was first detected */
  detectedAt: number;
  /** When the cluster was last updated */
  updatedAt: number;
  /** Cluster stability score (0-1, how persistent/reinforced this cluster is) */
  stability: number;
  /** Whether this cluster is growing, stable, or decaying */
  trend: 'growing' | 'stable' | 'decaying';
}

/**
 * A path preference -- an emergent trail through the world.
 *
 * When agents repeatedly traverse similar paths, 'visit' traces form a
 * connected trail. PathPreference captures these emergent navigation patterns.
 */
export interface PathPreference {
  /** Ordered sequence of cell IDs forming the path */
  cellSequence: CellId[];
  /** Ordered world-space positions along the path */
  positions: Vec3[];
  /** Total path length in world units */
  length: number;
  /** Average trace intensity along the path */
  averageIntensity: number;
  /** Number of unique agents that have traversed this path */
  uniqueAgentCount: number;
  /** Total traversal count (sum of reinforcements along the path) */
  traversalCount: number;
  /** Dominant direction of travel (normalized vector) */
  dominantDirection: Vec3;
}

/**
 * The collective memory state -- the emergent spatial knowledge of the group.
 *
 * This is the high-level summary computed by the CollectiveMemoryAggregator
 * from the raw trace field. It represents the "what the group knows" at a
 * glance, without requiring iteration over individual traces.
 */
export interface CollectiveMemoryState {
  /** All detected clusters (cultural hotspots) */
  clusters: TraceCluster[];
  /** Top-N strongest path preferences */
  pathPreferences: PathPreference[];
  /** Global heatmap intensity (per-cell aggregate, for overlay rendering) */
  heatmap: Map<CellId, number>;
  /** Category heatmaps (per-category intensity per cell) */
  categoryHeatmaps: Map<TraceCategory, Map<CellId, number>>;
  /** Total number of active traces in the world */
  totalActiveTraces: number;
  /** Total number of unique contributing agents */
  totalUniqueAgents: number;
  /** Most active category across the world */
  dominantCategory: TraceCategory | null;
  /** World-wide average trace intensity */
  averageIntensity: number;
  /** Timestamp of last aggregation */
  aggregatedAt: number;
}

// =============================================================================
// TRACE DEPOSIT REQUEST
// =============================================================================

/**
 * Request to deposit a new cultural trace.
 * This is the public API input -- the engine fills in computed fields.
 */
export interface TraceDepositRequest {
  /** World to deposit in */
  worldId: string;
  /** Depositing agent ID */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** World-space position */
  position: Vec3;
  /** Semantic category */
  category: TraceCategory;
  /** Optional intensity override (default: category default) */
  intensity?: number;
  /** Optional decay rate override (default: category default) */
  decayRate?: number;
  /** Optional diffusion rate override (default: category default) */
  diffusionRate?: number;
  /** Optional color override (default: category default) */
  color?: [number, number, number, number];
  /** Optional metadata */
  metadata?: Record<string, unknown>;
  /** Optional tags */
  tags?: string[];
  /** Optional text content (for annotate traces) */
  textContent?: string;
}

// =============================================================================
// ENGINE CONFIGURATION
// =============================================================================

/**
 * Configuration for the StigmergicTraceEngine.
 */
export interface StigmergicTraceEngineConfig {
  /** World identifier */
  worldId: string;

  /** Spatial grid configuration */
  grid: SpatialGridConfig;

  /** Engine update frequency in Hz (default: 5) */
  updateHz: number;

  /** Minimum intensity threshold; traces below this are culled (default: 0.01) */
  cullThreshold: number;

  /** Maximum total traces across all cells (default: 50000) */
  maxTotalTraces: number;

  /** Global decay multiplier (scales all trace decay rates, default: 1.0) */
  globalDecayMultiplier: number;

  /** Global diffusion multiplier (scales all diffusion rates, default: 1.0) */
  globalDiffusionMultiplier: number;

  /** Reinforcement intensity boost per overlap (default: 0.1) */
  reinforcementBoost: number;

  /** Maximum intensity a trace can reach through reinforcement (default: 1.0) */
  maxReinforcedIntensity: number;

  /** Diffusion kernel radius in cells (default: 1, i.e., 26 neighbors in 3D) */
  diffusionKernelRadius: number;

  /** Whether to enable spatial diffusion (default: true) */
  enableDiffusion: boolean;

  /** Whether to enable trace decay/evaporation (default: true) */
  enableDecay: boolean;

  /** Whether to merge overlapping traces of the same category (default: true) */
  enableReinforcement: boolean;

  /** Callback when a new cluster is detected */
  onClusterDetected?: (cluster: TraceCluster) => void;

  /** Callback when a trace is culled due to low intensity */
  onTraceCulled?: (traceId: TraceId) => void;
}

/**
 * Configuration for the CollectiveMemoryAggregator.
 */
export interface CollectiveMemoryAggregatorConfig {
  /** Aggregation update frequency in Hz (default: 1) */
  updateHz: number;

  /** Minimum number of traces to form a cluster (default: 3) */
  minClusterSize: number;

  /** Maximum distance between traces in a cluster in world units (default: 5.0) */
  clusterRadius: number;

  /** Minimum intensity for a cell to be included in a cluster (default: 0.1) */
  minClusterIntensity: number;

  /** Maximum number of clusters to track (default: 100) */
  maxClusters: number;

  /** Maximum number of path preferences to track (default: 20) */
  maxPathPreferences: number;

  /** Minimum path length in cells to be considered a path preference (default: 5) */
  minPathLength: number;

  /** Stability threshold: cluster exists for this many seconds to be "stable" */
  stabilityThresholdSeconds: number;
}

/**
 * Configuration for the CulturalTraceRenderer.
 */
export interface CulturalTraceRendererConfig {
  /** Whether to render trace particles (default: true) */
  showTraceParticles: boolean;

  /** Whether to render heatmap overlay (default: false) */
  showHeatmap: boolean;

  /** Whether to render cluster indicators (default: true) */
  showClusters: boolean;

  /** Whether to render path preference trails (default: false) */
  showPathPreferences: boolean;

  /** Maximum number of visible trace particles (performance limit, default: 5000) */
  maxVisibleParticles: number;

  /** Particle size in world units (default: 0.15) */
  particleSize: number;

  /** Heatmap opacity (0-1, default: 0.3) */
  heatmapOpacity: number;

  /** Cluster indicator scale (default: 1.0) */
  clusterIndicatorScale: number;

  /** Whether to use bloom/glow on trace particles (default: true) */
  enableGlow: boolean;

  /** Whether to animate trace particles (pulsing, floating, default: true) */
  enableAnimation: boolean;

  /** Animation speed multiplier (default: 1.0) */
  animationSpeed: number;

  /** View distance for trace rendering in world units (default: 50) */
  viewDistance: number;

  /** Whether to show agent attribution labels on traces (default: false) */
  showAgentLabels: boolean;
}

// =============================================================================
// CULTURAL TRACE MANAGER CONFIGURATION
// =============================================================================

/**
 * Top-level configuration for the CulturalTraceManager.
 */
export interface CulturalTraceManagerConfig {
  /** World identifier */
  worldId: string;
  /** Local agent ID */
  localAgentId: string;
  /** Engine configuration overrides */
  engine?: Partial<StigmergicTraceEngineConfig>;
  /** Aggregator configuration overrides */
  aggregator?: Partial<CollectiveMemoryAggregatorConfig>;
  /** Renderer configuration overrides */
  renderer?: Partial<CulturalTraceRendererConfig>;
}

// =============================================================================
// EVENTS
// =============================================================================

/**
 * Events emitted by the CulturalTrace system.
 */
export interface CulturalTraceEventMap {
  /** Fired when a new trace is deposited */
  'trace:deposited': { trace: CulturalTrace; source: 'local' | 'remote' };
  /** Fired when a trace is reinforced by overlapping deposit */
  'trace:reinforced': {
    trace: CulturalTrace;
    reinforcementCount: number;
    previousIntensity: number;
  };
  /** Fired when a trace is culled due to low intensity */
  'trace:culled': { traceId: TraceId; reason: 'decay' | 'overflow' };
  /** Fired when a new cluster is detected */
  'cluster:detected': { cluster: TraceCluster };
  /** Fired when a cluster dissolves below threshold */
  'cluster:dissolved': { clusterId: ClusterId; reason: 'decay' | 'fragmented' };
  /** Fired when collective memory is updated */
  'memory:updated': { state: CollectiveMemoryState };
  /** Fired on errors */
  'trace:error': { message: string; code: string };
}

export type CulturalTraceEventType = keyof CulturalTraceEventMap;
export type CulturalTraceEventHandler<T extends CulturalTraceEventType> = (
  event: CulturalTraceEventMap[T],
) => void;

// =============================================================================
// METRICS
// =============================================================================

/**
 * Runtime metrics for the CulturalTrace system.
 */
export interface CulturalTraceMetrics {
  /** Whether the engine is running */
  isRunning: boolean;
  /** Total active traces */
  totalActiveTraces: number;
  /** Total traces culled since startup */
  totalTracesCulled: number;
  /** Total deposits processed since startup */
  totalDeposits: number;
  /** Total reinforcements since startup */
  totalReinforcements: number;
  /** Active clusters count */
  activeClusters: number;
  /** Active path preferences count */
  activePathPreferences: number;
  /** Total unique contributing agents */
  uniqueAgents: number;
  /** Traces by category */
  tracesByCategory: Record<TraceCategory, number>;
  /** Average engine cycle time (ms) */
  averageEngineCycleMs: number;
  /** Average aggregator cycle time (ms) */
  averageAggregatorCycleMs: number;
  /** Memory estimate (bytes) */
  estimatedMemoryBytes: number;
  /** Time since last engine cycle (ms) */
  timeSinceLastEngineCycleMs: number;
  /** Time since last aggregation (ms) */
  timeSinceLastAggregationMs: number;
}

// =============================================================================
// DOUBLE-BUFFER STATE
// =============================================================================

/**
 * The aggregate cultural trace state that flows through the double buffer.
 * - Engine writes to back buffer at updateHz
 * - Renderer reads from front buffer at 90Hz
 */
export interface CulturalTraceWorldState {
  /** All active traces indexed by trace ID */
  traces: Map<TraceId, CulturalTrace>;
  /** Spatial cells indexed by cell ID */
  cells: Map<CellId, SpatialCell>;
  /** Current collective memory state */
  collectiveMemory: CollectiveMemoryState;
  /** Sequence number (incremented on each engine cycle) */
  sequence: number;
  /** Timestamp of last engine update */
  lastUpdateTimestamp: number;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create an empty CulturalTraceWorldState.
 */
export function createEmptyCulturalTraceWorldState(): CulturalTraceWorldState {
  return {
    traces: new Map(),
    cells: new Map(),
    collectiveMemory: createEmptyCollectiveMemoryState(),
    sequence: 0,
    lastUpdateTimestamp: 0,
  };
}

/**
 * Create an empty CollectiveMemoryState.
 */
export function createEmptyCollectiveMemoryState(): CollectiveMemoryState {
  return {
    clusters: [],
    pathPreferences: [],
    heatmap: new Map(),
    categoryHeatmaps: new Map(),
    totalActiveTraces: 0,
    totalUniqueAgents: 0,
    dominantCategory: null,
    averageIntensity: 0,
    aggregatedAt: 0,
  };
}

/**
 * Create default SpatialGridConfig.
 */
export function createDefaultGridConfig(overrides?: Partial<SpatialGridConfig>): SpatialGridConfig {
  return {
    cellSize: overrides?.cellSize ?? 1.0,
    worldMin: overrides?.worldMin ?? { x: -100, y: -10, z: -100 },
    worldMax: overrides?.worldMax ?? { x: 100, y: 50, z: 100 },
    maxTracesPerCell: overrides?.maxTracesPerCell ?? 50,
  };
}

/**
 * Create default StigmergicTraceEngineConfig.
 */
export function createDefaultEngineConfig(
  worldId: string,
  overrides?: Partial<StigmergicTraceEngineConfig>,
): StigmergicTraceEngineConfig {
  return {
    worldId,
    grid: overrides?.grid ?? createDefaultGridConfig(),
    updateHz: overrides?.updateHz ?? 5,
    cullThreshold: overrides?.cullThreshold ?? 0.01,
    maxTotalTraces: overrides?.maxTotalTraces ?? 50000,
    globalDecayMultiplier: overrides?.globalDecayMultiplier ?? 1.0,
    globalDiffusionMultiplier: overrides?.globalDiffusionMultiplier ?? 1.0,
    reinforcementBoost: overrides?.reinforcementBoost ?? 0.1,
    maxReinforcedIntensity: overrides?.maxReinforcedIntensity ?? 1.0,
    diffusionKernelRadius: overrides?.diffusionKernelRadius ?? 1,
    enableDiffusion: overrides?.enableDiffusion ?? true,
    enableDecay: overrides?.enableDecay ?? true,
    enableReinforcement: overrides?.enableReinforcement ?? true,
  };
}

/**
 * Create default CollectiveMemoryAggregatorConfig.
 */
export function createDefaultAggregatorConfig(
  overrides?: Partial<CollectiveMemoryAggregatorConfig>,
): CollectiveMemoryAggregatorConfig {
  return {
    updateHz: overrides?.updateHz ?? 1,
    minClusterSize: overrides?.minClusterSize ?? 3,
    clusterRadius: overrides?.clusterRadius ?? 5.0,
    minClusterIntensity: overrides?.minClusterIntensity ?? 0.1,
    maxClusters: overrides?.maxClusters ?? 100,
    maxPathPreferences: overrides?.maxPathPreferences ?? 20,
    minPathLength: overrides?.minPathLength ?? 5,
    stabilityThresholdSeconds: overrides?.stabilityThresholdSeconds ?? 30,
  };
}

/**
 * Create default CulturalTraceRendererConfig.
 */
export function createDefaultRendererConfig(
  overrides?: Partial<CulturalTraceRendererConfig>,
): CulturalTraceRendererConfig {
  return {
    showTraceParticles: overrides?.showTraceParticles ?? true,
    showHeatmap: overrides?.showHeatmap ?? false,
    showClusters: overrides?.showClusters ?? true,
    showPathPreferences: overrides?.showPathPreferences ?? false,
    maxVisibleParticles: overrides?.maxVisibleParticles ?? 5000,
    particleSize: overrides?.particleSize ?? 0.15,
    heatmapOpacity: overrides?.heatmapOpacity ?? 0.3,
    clusterIndicatorScale: overrides?.clusterIndicatorScale ?? 1.0,
    enableGlow: overrides?.enableGlow ?? true,
    enableAnimation: overrides?.enableAnimation ?? true,
    animationSpeed: overrides?.animationSpeed ?? 1.0,
    viewDistance: overrides?.viewDistance ?? 50,
    showAgentLabels: overrides?.showAgentLabels ?? false,
  };
}

/**
 * Convert a world-space position to a cell ID.
 */
export function positionToCellId(position: Vec3, cellSize: number): CellId {
  const cx = Math.floor(position.x / cellSize);
  const cy = Math.floor(position.y / cellSize);
  const cz = Math.floor(position.z / cellSize);
  return `${cx}:${cy}:${cz}`;
}

/**
 * Convert a cell ID back to the cell center position.
 */
export function cellIdToPosition(cellId: CellId, cellSize: number): Vec3 {
  const parts = cellId.split(':');
  const cx = parseInt(parts[0], 10);
  const cy = parseInt(parts[1], 10);
  const cz = parseInt(parts[2], 10);
  return {
    x: (cx + 0.5) * cellSize,
    y: (cy + 0.5) * cellSize,
    z: (cz + 0.5) * cellSize,
  };
}

/**
 * Get neighboring cell IDs for a given cell (26 neighbors in 3D for radius 1).
 */
export function getNeighborCellIds(cellId: CellId, radius: number = 1): CellId[] {
  const parts = cellId.split(':');
  const cx = parseInt(parts[0], 10);
  const cy = parseInt(parts[1], 10);
  const cz = parseInt(parts[2], 10);
  const neighbors: CellId[] = [];
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        neighbors.push(`${cx + dx}:${cy + dy}:${cz + dz}`);
      }
    }
  }
  return neighbors;
}

/**
 * Calculate Euclidean distance between two Vec3 positions.
 */
export function vec3Distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Generate a unique trace ID.
 */
export function generateTraceId(worldId: string, agentId: string): TraceId {
  const timestamp = Date.now();
  const hash = Math.random().toString(36).substring(2, 8);
  return `${worldId}:${agentId}:${timestamp}:${hash}`;
}
