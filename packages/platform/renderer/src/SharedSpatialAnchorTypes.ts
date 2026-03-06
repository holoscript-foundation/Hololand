/**
 * SharedSpatialAnchorTypes
 *
 * Type definitions for the Shared Spatial Anchor system -- the foundation
 * for multi-agent collaboration in HoloLand VR/AR worlds.
 *
 * PROBLEM:
 * When multiple agents (Brittney, Builder, Manager, etc.) collaborate in the
 * same VR world, they need a shared coordinate system. Each agent may place
 * objects, annotations, or pointers at specific locations. Without shared
 * anchors, agents disagree about "where things are" and spatial references
 * (e.g., "the panel to your left") become ambiguous.
 *
 * SOLUTION:
 * Shared Spatial Anchors provide named, persistent reference points in world
 * space that all agents agree upon. They are backed by CRDT data structures
 * (specifically LWW-Map from @hololand/network) to guarantee eventual
 * consistency without coordination.
 *
 * ANCHOR TYPES:
 * - Static: Fixed reference points (room corners, table center, whiteboard)
 * - Dynamic: Move with objects or agents (hand tracker, gaze target)
 * - Semantic: Named regions with meaning ("presentation-area", "workbench")
 * - Ephemeral: Short-lived markers (laser pointer, temporary highlight)
 *
 * CONFLICT RESOLUTION:
 * When two agents simultaneously update the same anchor, the CRDT layer
 * resolves conflicts using Last-Writer-Wins semantics with vector clocks
 * for causal ordering. For spatial data specifically, a configurable merge
 * strategy can interpolate between concurrent position updates rather than
 * picking a winner, reducing visual discontinuities.
 *
 * PERFORMANCE:
 * - Anchor reads: O(1) from front buffer (render-loop safe at 90Hz)
 * - Anchor writes: O(1) to back buffer (off render loop)
 * - Sync: Via CRDTNetworkBridge at configurable Hz (default: 10Hz)
 * - Memory: ~200 bytes per anchor (position + rotation + metadata)
 *
 * @module SharedSpatialAnchorTypes
 */

import type { Vec3, Quat } from './AgentStateBuffer';

// =============================================================================
// ANCHOR IDENTITY
// =============================================================================

/**
 * Unique identifier for a spatial anchor.
 * Format: `{namespace}:{name}` (e.g., "world:table-center", "agent:brittney:gaze")
 */
export type AnchorId = string;

/**
 * Namespace for anchor organization.
 * - 'world': Static world reference points
 * - 'agent': Per-agent dynamic anchors
 * - 'session': Session-scoped shared anchors
 * - 'ephemeral': Short-lived, auto-expiring anchors
 */
export type AnchorNamespace = 'world' | 'agent' | 'session' | 'ephemeral';

// =============================================================================
// ANCHOR TYPES
// =============================================================================

/**
 * Classification of anchor behavior and lifecycle.
 */
export type AnchorType =
  | 'static'      // Fixed world reference point, rarely moves
  | 'dynamic'     // Tracks a moving object or agent component
  | 'semantic'    // Named region with spatial extent (not just a point)
  | 'ephemeral';  // Short-lived marker, auto-expires after TTL

/**
 * Persistence level determines how long an anchor survives.
 */
export type AnchorPersistence =
  | 'permanent'   // Survives world reloads (saved to DB)
  | 'session'     // Lives for the duration of the collaboration session
  | 'transient';  // Removed when the creating agent disconnects

// =============================================================================
// SPATIAL ANCHOR STATE
// =============================================================================

/**
 * The core spatial state of an anchor -- position and orientation in world space.
 *
 * This is the data that gets CRDT-synchronized across agents.
 * Each field is individually trackable for fine-grained conflict resolution.
 */
export interface AnchorSpatialState {
  /** World-space position */
  position: Vec3;
  /** World-space orientation (quaternion) */
  rotation: Quat;
  /** Optional scale/extent for semantic anchors (defines region size) */
  extent: Vec3 | null;
}

/**
 * Complete state of a shared spatial anchor.
 *
 * This is the payload stored in the CRDT map and synchronized across all
 * participating agents. It is designed to be serializable (no functions,
 * no circular references) for network transport.
 */
export interface SharedSpatialAnchor {
  // --- Identity ---
  /** Unique anchor identifier (namespace:name format) */
  id: AnchorId;
  /** Human-readable display name */
  name: string;
  /** Namespace for organizational grouping */
  namespace: AnchorNamespace;
  /** Anchor behavior classification */
  type: AnchorType;

  // --- Spatial State ---
  /** Current spatial state (position, rotation, extent) */
  spatial: AnchorSpatialState;

  // --- Ownership ---
  /** Agent ID that created this anchor */
  creatorAgentId: string;
  /** Agent ID that last modified this anchor */
  lastModifiedByAgentId: string;
  /** Agents allowed to modify (empty = all agents can modify) */
  allowedEditors: string[];

  // --- Lifecycle ---
  /** Persistence level */
  persistence: AnchorPersistence;
  /** TTL in milliseconds (0 = no expiry, only meaningful for ephemeral anchors) */
  ttlMs: number;
  /** Timestamp of anchor creation (ms since epoch) */
  createdAt: number;
  /** Timestamp of last modification (ms since epoch) */
  updatedAt: number;
  /** Whether the anchor is currently active (soft-delete mechanism) */
  active: boolean;

  // --- Conflict Resolution ---
  /** Merge strategy for concurrent spatial updates */
  mergeStrategy: AnchorMergeStrategy;
  /** Version counter (monotonically increasing, for optimistic concurrency) */
  version: number;

  // --- Metadata ---
  /** Custom key-value metadata (agent-specific data, UI hints, etc.) */
  metadata: Record<string, unknown>;
  /** Tags for querying and filtering anchors */
  tags: string[];
  /** Optional parent anchor ID (for hierarchical anchor trees) */
  parentAnchorId: AnchorId | null;
  /** Optional description of what this anchor represents */
  description: string;
}

// =============================================================================
// MERGE STRATEGIES
// =============================================================================

/**
 * Strategy for resolving concurrent spatial updates to the same anchor.
 *
 * When two agents update the same anchor simultaneously (concurrent updates
 * in the vector clock sense), the merge strategy determines the result:
 *
 * - 'lww': Last-Writer-Wins (simplest, fastest, may cause visual jumps)
 * - 'interpolate': Average the concurrent positions (smooth, but imprecise)
 * - 'priority': Higher-priority agent's update wins (for hierarchical teams)
 * - 'lock': Only the lock holder can update (pessimistic, for critical anchors)
 */
export type AnchorMergeStrategy = 'lww' | 'interpolate' | 'priority' | 'lock';

/**
 * Priority assignment for priority-based merge strategy.
 * Maps agentId -> priority (higher number = higher priority).
 */
export interface AnchorPriorityMap {
  [agentId: string]: number;
}

/**
 * Lock state for lock-based merge strategy.
 */
export interface AnchorLockState {
  /** Whether the anchor is currently locked */
  locked: boolean;
  /** Agent ID holding the lock (empty if unlocked) */
  lockedByAgentId: string;
  /** Timestamp when the lock was acquired */
  lockedAt: number;
  /** Lock timeout in milliseconds (auto-release if exceeded) */
  lockTimeoutMs: number;
}

// =============================================================================
// ANCHOR EVENTS
// =============================================================================

/**
 * Events emitted by the SharedSpatialAnchorManager.
 */
export interface AnchorEventMap {
  /** Fired when an anchor is created (locally or remotely) */
  'anchor:created': { anchor: SharedSpatialAnchor; source: 'local' | 'remote' };
  /** Fired when an anchor's spatial state is updated */
  'anchor:updated': {
    anchor: SharedSpatialAnchor;
    previousSpatial: AnchorSpatialState;
    source: 'local' | 'remote';
  };
  /** Fired when an anchor is removed (soft-deleted or expired) */
  'anchor:removed': { anchorId: AnchorId; reason: 'deleted' | 'expired' | 'agent-disconnect' };
  /** Fired when an anchor's lock state changes */
  'anchor:lock-changed': { anchorId: AnchorId; lockState: AnchorLockState };
  /** Fired when a merge conflict is resolved */
  'anchor:conflict-resolved': {
    anchorId: AnchorId;
    strategy: AnchorMergeStrategy;
    localValue: AnchorSpatialState;
    remoteValue: AnchorSpatialState;
    resolvedValue: AnchorSpatialState;
  };
  /** Fired when anchors are bulk-synced from a remote peer */
  'anchor:sync-complete': { anchorCount: number; source: string };
  /** Fired on errors */
  'anchor:error': { message: string; anchorId?: AnchorId; code: string };
}

export type AnchorEventType = keyof AnchorEventMap;
export type AnchorEventHandler<T extends AnchorEventType> = (
  event: AnchorEventMap[T],
) => void;

// =============================================================================
// ANCHOR QUERY
// =============================================================================

/**
 * Query parameters for finding anchors.
 */
export interface AnchorQuery {
  /** Filter by namespace */
  namespace?: AnchorNamespace;
  /** Filter by type */
  type?: AnchorType;
  /** Filter by tags (anchor must have ALL specified tags) */
  tags?: string[];
  /** Filter by creator agent */
  creatorAgentId?: string;
  /** Filter by active state */
  active?: boolean;
  /** Filter by proximity: anchors within `radius` of `center` */
  spatial?: {
    center: Vec3;
    radius: number;
  };
  /** Filter by parent anchor */
  parentAnchorId?: AnchorId | null;
  /** Maximum number of results */
  limit?: number;
}

// =============================================================================
// ANCHOR MANAGER CONFIGURATION
// =============================================================================

/**
 * Configuration for the SharedSpatialAnchorManager.
 */
export interface SharedSpatialAnchorManagerConfig {
  /** Local agent/node ID (identifies this participant) */
  localAgentId: string;

  /** Sync frequency for anchor state updates (Hz, default: 10) */
  syncHz?: number;

  /** Staleness threshold before anchor reads are flagged as stale (ms, default: 1000) */
  stalenessThresholdMs?: number;

  /** Default TTL for ephemeral anchors (ms, default: 30000) */
  defaultEphemeralTtlMs?: number;

  /** Maximum number of anchors per world (default: 500) */
  maxAnchors?: number;

  /** Default merge strategy for new anchors (default: 'lww') */
  defaultMergeStrategy?: AnchorMergeStrategy;

  /** Priority map for priority-based merge strategy */
  priorityMap?: AnchorPriorityMap;

  /** Default lock timeout (ms, default: 10000) */
  defaultLockTimeoutMs?: number;

  /** Whether to automatically expire ephemeral anchors (default: true) */
  autoExpireEphemeral?: boolean;

  /** Cleanup interval for expired anchors (ms, default: 5000) */
  cleanupIntervalMs?: number;

  /** Callback when a remote anchor update is applied */
  onRemoteAnchorUpdate?: (anchor: SharedSpatialAnchor) => void;

  /** Callback when an anchor expires */
  onAnchorExpired?: (anchorId: AnchorId) => void;
}

// =============================================================================
// ANCHOR MANAGER METRICS
// =============================================================================

/**
 * Metrics for monitoring the anchor system health.
 */
export interface SharedSpatialAnchorMetrics {
  /** Whether the sync loop is running */
  isRunning: boolean;
  /** Total number of active anchors */
  totalAnchors: number;
  /** Anchors by namespace */
  anchorsByNamespace: Record<AnchorNamespace, number>;
  /** Anchors by type */
  anchorsByType: Record<AnchorType, number>;
  /** Total local anchor updates */
  totalLocalUpdates: number;
  /** Total remote anchor updates received */
  totalRemoteUpdates: number;
  /** Total conflicts resolved */
  totalConflictsResolved: number;
  /** Total anchors expired */
  totalAnchorsExpired: number;
  /** Current sync frequency (Hz) */
  syncHz: number;
  /** Average sync latency (ms) */
  averageSyncLatencyMs: number;
  /** Time since last sync (ms) */
  timeSinceLastSyncMs: number;
  /** Whether the anchor state is stale */
  isStale: boolean;
}

// =============================================================================
// ANCHOR DOUBLE-BUFFER STATE
// =============================================================================

/**
 * The aggregate state of all shared spatial anchors.
 * This is the data structure that flows through the double buffer:
 * - AnchorManager writes to back buffer at syncHz
 * - Renderer reads from front buffer at 90Hz
 */
export interface AnchorWorldState {
  /** Map of anchorId -> anchor state */
  anchors: Record<AnchorId, SharedSpatialAnchor>;
  /** Lock states for anchors using 'lock' merge strategy */
  locks: Record<AnchorId, AnchorLockState>;
  /** Sequence number (incremented on each sync) */
  sequence: number;
  /** Timestamp of last sync */
  lastSyncTimestamp: number;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create an empty AnchorWorldState.
 */
export function createEmptyAnchorWorldState(): AnchorWorldState {
  return {
    anchors: {},
    locks: {},
    sequence: 0,
    lastSyncTimestamp: 0,
  };
}

/**
 * Create a default SharedSpatialAnchor with sensible defaults.
 */
export function createDefaultAnchor(
  id: AnchorId,
  name: string,
  creatorAgentId: string,
  options?: Partial<SharedSpatialAnchor>,
): SharedSpatialAnchor {
  const now = Date.now();
  return {
    id,
    name,
    namespace: options?.namespace ?? 'session',
    type: options?.type ?? 'static',
    spatial: options?.spatial ?? {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      extent: null,
    },
    creatorAgentId,
    lastModifiedByAgentId: creatorAgentId,
    allowedEditors: options?.allowedEditors ?? [],
    persistence: options?.persistence ?? 'session',
    ttlMs: options?.ttlMs ?? 0,
    createdAt: now,
    updatedAt: now,
    active: true,
    mergeStrategy: options?.mergeStrategy ?? 'lww',
    version: 1,
    metadata: options?.metadata ?? {},
    tags: options?.tags ?? [],
    parentAnchorId: options?.parentAnchorId ?? null,
    description: options?.description ?? '',
  };
}

/**
 * Create an anchor ID from namespace and name.
 */
export function makeAnchorId(namespace: AnchorNamespace, name: string): AnchorId {
  return `${namespace}:${name}`;
}

/**
 * Parse an anchor ID into namespace and name.
 */
export function parseAnchorId(id: AnchorId): { namespace: string; name: string } {
  const colonIndex = id.indexOf(':');
  if (colonIndex === -1) {
    return { namespace: 'session', name: id };
  }
  return {
    namespace: id.substring(0, colonIndex),
    name: id.substring(colonIndex + 1),
  };
}
