/**
 * SpatialInferenceTypes
 *
 * Type definitions for the hierarchical inference scheduling architecture.
 *
 * ARCHITECTURE OVERVIEW:
 * Spatial reasoning inference is computationally expensive (10-200ms per pass).
 * Running it on the 90Hz VR render loop (11.1ms budget) would cause frame drops.
 *
 * Solution: Two-tier scheduling:
 * - Tier 1 (Slow): SpatialReasoningEngine runs at 1-5Hz, producing cached spatial state
 * - Tier 2 (Fast): VR renderer reads cached state at 90Hz via double-buffered front buffer
 *
 * The double-buffered CachedSpatialState ensures:
 * - Renderer NEVER blocks on inference computation
 * - Spatial state is always consistent within a single frame (no torn reads)
 * - Inference results are available within 200-1000ms of scene changes
 *
 * @module SpatialInferenceTypes
 */

import type { Vec3, Quat } from './AgentStateBuffer';

// =============================================================================
// SPATIAL RELATIONSHIP TYPES
// =============================================================================

/**
 * Spatial relationship between two objects in the scene
 */
export interface SpatialRelationship {
  /** Source object ID */
  sourceId: string;
  /** Target object ID */
  targetId: string;
  /** Type of spatial relationship */
  type: SpatialRelationType;
  /** Confidence score (0-1) */
  confidence: number;
  /** Distance between objects in world units */
  distance: number;
  /** Direction vector from source to target (normalized) */
  direction: Vec3;
}

/**
 * Types of spatial relationships the engine can detect
 */
export type SpatialRelationType =
  | 'near'           // Objects within proximity threshold
  | 'far'            // Objects beyond proximity threshold
  | 'above'          // Source is above target
  | 'below'          // Source is below target
  | 'left_of'        // Source is left of target (relative to camera)
  | 'right_of'       // Source is right of target (relative to camera)
  | 'in_front_of'    // Source is in front of target (relative to camera)
  | 'behind'         // Source is behind target (relative to camera)
  | 'contains'       // Source bounding box contains target
  | 'contained_by'   // Source is contained by target bounding box
  | 'adjacent'       // Objects share an edge/face
  | 'overlapping'    // Bounding boxes overlap
  | 'aligned'        // Objects are spatially aligned on an axis
  | 'clustered';     // Object belongs to a spatial cluster

// =============================================================================
// SPATIAL REGION TYPES
// =============================================================================

/**
 * A spatial region identified by the reasoning engine.
 * Regions group related objects and define navigable/interactive areas.
 */
export interface SpatialRegion {
  /** Unique region identifier */
  id: string;
  /** Human-readable label for the region */
  label: string;
  /** Center of the region in world space */
  center: Vec3;
  /** Axis-aligned bounding box extents */
  extents: Vec3;
  /** Object IDs contained in this region */
  objectIds: string[];
  /** Region type classification */
  type: SpatialRegionType;
  /** Confidence score (0-1) */
  confidence: number;
  /** Optional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Types of spatial regions
 */
export type SpatialRegionType =
  | 'workspace'      // Functional workspace area
  | 'gathering'      // Social/meeting area
  | 'display'        // Presentation/display area
  | 'navigation'     // Corridor/pathway
  | 'boundary'       // Edge/wall region
  | 'cluster'        // Auto-detected object cluster
  | 'empty'          // Empty navigable space
  | 'custom';        // User-defined region

// =============================================================================
// OCCLUSION & VISIBILITY
// =============================================================================

/**
 * Occlusion state for an object, computed by the spatial reasoning engine.
 * Used by the renderer for intelligent culling without per-frame GPU queries.
 */
export interface OcclusionState {
  /** Object ID */
  objectId: string;
  /** Whether the object is potentially visible from the current camera */
  potentiallyVisible: boolean;
  /** Percentage of the object visible (0-1, estimated) */
  visibilityRatio: number;
  /** IDs of objects that occlude this object */
  occludedBy: string[];
  /** Timestamp when this occlusion state was last computed */
  lastComputedTimestamp: number;
}

// =============================================================================
// NAVIGATION
// =============================================================================

/**
 * Navigation hint for an object or region, computed by spatial reasoning.
 * Provides the renderer with pre-computed pathfinding data.
 */
export interface NavigationHint {
  /** Source position */
  from: Vec3;
  /** Destination position */
  to: Vec3;
  /** Pre-computed waypoints along the path */
  waypoints: Vec3[];
  /** Estimated traversal distance */
  distance: number;
  /** Whether the path is currently clear */
  isTraversable: boolean;
  /** Path type */
  type: 'direct' | 'waypoint' | 'teleport';
}

// =============================================================================
// SPATIAL LABEL
// =============================================================================

/**
 * A spatial label anchored to a position in the scene.
 * Generated by inference for spatial annotations visible in VR.
 */
export interface SpatialLabel {
  /** Unique label identifier */
  id: string;
  /** Text content */
  text: string;
  /** World-space anchor position */
  position: Vec3;
  /** Label category for styling */
  category: 'info' | 'warning' | 'highlight' | 'measurement' | 'annotation';
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether the label should face the camera (billboard) */
  billboard: boolean;
  /** Optional target object ID this label is associated with */
  targetObjectId?: string;
  /** Visibility distance threshold */
  maxVisibilityDistance: number;
}

// =============================================================================
// CACHED SPATIAL STATE (DOUBLE-BUFFERED)
// =============================================================================

/**
 * Complete spatial reasoning state, cached and double-buffered.
 *
 * This is the data structure that flows through the double buffer:
 * - SpatialReasoningEngine writes to back buffer at 1-5Hz
 * - HololandRenderer reads from front buffer at 90Hz
 *
 * All fields are populated by the inference engine and consumed by the renderer.
 * The renderer treats this as read-only and never modifies it.
 */
export interface CachedSpatialState {
  // ─── Spatial Relationships ─────────────────────────────────────────────
  /** All detected spatial relationships between objects */
  relationships: SpatialRelationship[];

  // ─── Regions ───────────────────────────────────────────────────────────
  /** Identified spatial regions in the scene */
  regions: SpatialRegion[];

  // ─── Occlusion ─────────────────────────────────────────────────────────
  /** Per-object occlusion states for intelligent culling */
  occlusionStates: Record<string, OcclusionState>;

  // ─── Navigation ────────────────────────────────────────────────────────
  /** Pre-computed navigation hints */
  navigationHints: NavigationHint[];

  // ─── Labels ────────────────────────────────────────────────────────────
  /** Spatial labels for VR overlay */
  labels: SpatialLabel[];

  // ─── Scene Summary ─────────────────────────────────────────────────────
  /** Total number of objects analyzed */
  objectCount: number;
  /** Scene complexity score (0-1, affects inference frequency) */
  sceneComplexity: number;
  /** Scene bounding box center */
  sceneCenterOfMass: Vec3;
  /** Scene bounding box extents */
  sceneExtents: Vec3;

  // ─── Timing ────────────────────────────────────────────────────────────
  /** Sequence number, incremented on each inference pass */
  sequence: number;
  /** Timestamp of last inference pass completion */
  lastInferenceTimestamp: number;
  /** Duration of the last inference pass in ms */
  lastInferenceDurationMs: number;
  /** Current target inference frequency in Hz */
  targetHz: number;
}

// =============================================================================
// INFERENCE SCHEDULER TYPES
// =============================================================================

/**
 * Configuration for the InferenceScheduler
 */
export interface InferenceSchedulerConfig {
  /** Minimum inference frequency in Hz (default: 1) */
  minHz?: number;
  /** Maximum inference frequency in Hz (default: 5) */
  maxHz?: number;
  /** Initial inference frequency in Hz (default: 2) */
  initialHz?: number;
  /** Maximum inference duration before frequency is reduced (ms, default: 200) */
  maxInferenceBudgetMs?: number;
  /** Scene complexity threshold for frequency reduction (0-1, default: 0.7) */
  complexityThreshold?: number;
  /** Whether to auto-start the inference loop (default: false) */
  autoStart?: boolean;
  /** Staleness threshold for buffer metrics (ms, default: 2000) */
  stalenessThresholdMs?: number;
  /** Enable adaptive frequency based on inference duration (default: true) */
  adaptiveFrequency?: boolean;
  /** Callback when inference frequency changes */
  onFrequencyChange?: (oldHz: number, newHz: number, reason: string) => void;
}

/**
 * Metrics for the inference scheduler
 */
export interface InferenceSchedulerMetrics {
  /** Whether the inference loop is running */
  isRunning: boolean;
  /** Current inference frequency in Hz */
  currentHz: number;
  /** Target inference frequency in Hz */
  targetHz: number;
  /** Total inference passes completed */
  totalPasses: number;
  /** Average inference duration in ms (rolling window) */
  averageInferenceDurationMs: number;
  /** Peak inference duration in ms (rolling window) */
  peakInferenceDurationMs: number;
  /** Current scene complexity score */
  sceneComplexity: number;
  /** Whether the inference is currently running */
  isInferring: boolean;
  /** Time since last inference completion in ms */
  timeSinceLastInferenceMs: number;
  /** Number of skipped frames (inference took too long) */
  skippedPasses: number;
  /** Buffer staleness state */
  isBufferStale: boolean;
}

/**
 * Interface for spatial reasoning providers.
 * Implement this to plug in custom spatial inference logic.
 */
export interface SpatialReasoningProvider {
  /**
   * Run a single inference pass over the current scene state.
   *
   * CONTRACT:
   * - This method is called at 1-5Hz, NOT at 90Hz
   * - Budget: 200-1000ms depending on configured maxInferenceBudgetMs
   * - Must write results into the provided state object
   * - Should respect the complexity budget and return early if exceeded
   * - Must NOT touch the render thread or Three.js scene graph directly
   *
   * @param state - The mutable state object to populate with inference results
   * @param deltaMs - Time since last inference pass in ms
   * @returns Promise that resolves when inference is complete
   */
  infer(state: CachedSpatialState, deltaMs: number): Promise<void>;

  /**
   * Get the current scene complexity score (0-1).
   * Used by the scheduler to adapt inference frequency.
   */
  getComplexity(): number;

  /**
   * Called when the scheduler starts. Initialize resources here.
   */
  initialize?(): Promise<void>;

  /**
   * Called when the scheduler stops. Release resources here.
   */
  dispose?(): void;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create an empty CachedSpatialState with default values.
 */
export function createEmptyCachedSpatialState(): CachedSpatialState {
  return {
    relationships: [],
    regions: [],
    occlusionStates: {},
    navigationHints: [],
    labels: [],
    objectCount: 0,
    sceneComplexity: 0,
    sceneCenterOfMass: { x: 0, y: 0, z: 0 },
    sceneExtents: { x: 0, y: 0, z: 0 },
    sequence: 0,
    lastInferenceTimestamp: 0,
    lastInferenceDurationMs: 0,
    targetHz: 2,
  };
}
