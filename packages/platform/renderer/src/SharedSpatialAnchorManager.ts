/**
 * SharedSpatialAnchorManager
 *
 * CRDT-backed spatial anchor management for multi-agent VR/AR collaboration.
 *
 * ARCHITECTURE:
 * This manager is the single point of coordination for all spatial anchors
 * in a HoloLand world. It integrates with the existing platform patterns:
 *
 * 1. **Double-Buffered State** (like AgentStateBuffer):
 *    - Back buffer: Written by anchor sync loop (off render loop)
 *    - Front buffer: Read by renderer at 90Hz
 *    - Swap: Atomic pointer swap between frames
 *
 * 2. **CRDT Conflict Resolution** (like CRDTRoom):
 *    - Each anchor is stored in an LWW-Map keyed by AnchorId
 *    - Vector clocks track causal ordering across agents
 *    - Configurable merge strategies (LWW, interpolate, priority, lock)
 *
 * 3. **Off Render Loop** (like AgentCommunicationManager):
 *    - All network I/O and conflict resolution runs on a separate timer
 *    - Render loop only reads the front buffer (zero-copy, O(1))
 *
 * DATA FLOW:
 * ```
 *   Agent creates/updates anchor
 *        |
 *        v
 *   SharedSpatialAnchorManager.createAnchor()    <-- OFF render loop
 *        |
 *        v
 *   Write to back buffer + record CRDT delta     <-- Local state update
 *        |
 *        v
 *   syncLoop() [every 100ms at 10Hz]             <-- OFF render loop
 *        |
 *        ├── Swap buffers (front <-> back)
 *        ├── Flush deltas to network
 *        └── Process incoming remote deltas
 *        |
 *        v
 *   Renderer reads getFrontBuffer()               <-- ON render loop, O(1)
 *        |
 *        v
 *   Render anchor visualizations (gizmos, labels, regions)
 * ```
 *
 * CONFLICT RESOLUTION STRATEGIES:
 *
 * **LWW (Last-Writer-Wins):**
 *   Simplest and fastest. When two agents update the same anchor
 *   concurrently, the later timestamp wins. May cause visual jumps
 *   but is appropriate for most anchors.
 *
 * **Interpolate:**
 *   When concurrent updates arrive, the resolved position is the
 *   weighted average of all concurrent positions. This produces
 *   smooth transitions but may place the anchor in a position no
 *   agent intended. Best for dynamic anchors that are frequently
 *   updated (e.g., shared cursor, collaborative placement).
 *
 * **Priority:**
 *   Each agent has an assigned priority (from AnchorPriorityMap).
 *   When concurrent updates arrive, the higher-priority agent's
 *   value wins. Best for hierarchical teams (CEO > Manager > Builder).
 *
 * **Lock:**
 *   Pessimistic concurrency control. An agent must acquire a lock
 *   before modifying the anchor. Locks auto-expire after timeout.
 *   Best for critical anchors where accuracy is paramount.
 *
 * USAGE:
 * ```typescript
 * const anchorManager = new SharedSpatialAnchorManager({
 *   localAgentId: 'brittney',
 *   syncHz: 10,
 *   defaultMergeStrategy: 'lww',
 * });
 *
 * // Start the sync loop
 * anchorManager.start();
 *
 * // Create a shared anchor
 * anchorManager.createAnchor('session:whiteboard-center', 'Whiteboard Center', {
 *   type: 'static',
 *   spatial: {
 *     position: { x: 0, y: 1.5, z: -2 },
 *     rotation: { x: 0, y: 0, z: 0, w: 1 },
 *     extent: null,
 *   },
 * });
 *
 * // In render loop:
 * const anchors = anchorManager.getFrontBuffer();
 * for (const anchor of Object.values(anchors.anchors)) {
 *   renderAnchorGizmo(anchor);
 * }
 *
 * // Apply remote updates (from network/WebSocket)
 * anchorManager.applyRemoteUpdate(remoteAnchorState);
 *
 * // Cleanup
 * anchorManager.stop();
 * anchorManager.dispose();
 * ```
 *
 * @module SharedSpatialAnchorManager
 */

import { logger } from './logger';
import {
  AgentStateBuffer,
} from './AgentStateBuffer';
import type { Vec3, Quat } from './AgentStateBuffer';

import {
  createEmptyAnchorWorldState,
  createDefaultAnchor,
} from './SharedSpatialAnchorTypes';
import type {
  AnchorId,
  AnchorNamespace,
  AnchorType,
  AnchorMergeStrategy,
  AnchorPriorityMap,
  AnchorLockState,
  AnchorSpatialState,
  AnchorWorldState,
  AnchorEventMap,
  AnchorEventType,
  AnchorEventHandler,
  AnchorQuery,
  SharedSpatialAnchor,
  SharedSpatialAnchorManagerConfig,
  SharedSpatialAnchorMetrics,
} from './SharedSpatialAnchorTypes';

// =============================================================================
// VECTOR CLOCK (local implementation to avoid cross-package dependency)
// =============================================================================

type VectorClock = Record<string, number>;

function incrementVectorClock(clock: VectorClock, nodeId: string): VectorClock {
  const next = { ...clock };
  next[nodeId] = (next[nodeId] || 0) + 1;
  return next;
}

function mergeVectorClocks(a: VectorClock, b: VectorClock): VectorClock {
  const merged: VectorClock = { ...a };
  for (const [nodeId, ts] of Object.entries(b)) {
    merged[nodeId] = Math.max(merged[nodeId] || 0, ts);
  }
  return merged;
}

type ClockOrder = 'before' | 'after' | 'concurrent' | 'equal';

function compareVectorClocks(a: VectorClock, b: VectorClock): ClockOrder {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let aLess = false;
  let bLess = false;

  for (const key of allKeys) {
    const va = a[key] || 0;
    const vb = b[key] || 0;
    if (va < vb) aLess = true;
    if (va > vb) bLess = true;
  }

  if (!aLess && !bLess) return 'equal';
  if (aLess && !bLess) return 'before';
  if (!aLess && bLess) return 'after';
  return 'concurrent';
}

// =============================================================================
// DELTA TYPES (for network sync)
// =============================================================================

/**
 * A delta representing a single anchor operation, ready for network transport.
 */
export interface AnchorDelta {
  /** Operation type */
  operation: 'create' | 'update' | 'remove' | 'lock' | 'unlock';
  /** Anchor ID */
  anchorId: AnchorId;
  /** Source agent ID */
  sourceAgentId: string;
  /** Anchor state (for create/update operations) */
  anchorState?: SharedSpatialAnchor;
  /** Lock state (for lock/unlock operations) */
  lockState?: AnchorLockState;
  /** Vector clock at time of operation */
  vectorClock: VectorClock;
  /** Timestamp */
  timestamp: number;
}

// =============================================================================
// SHARED SPATIAL ANCHOR MANAGER
// =============================================================================

export class SharedSpatialAnchorManager {
  private readonly config: Required<SharedSpatialAnchorManagerConfig>;

  // --- Double-Buffered State ---
  private readonly buffer: AgentStateBuffer<AnchorWorldState>;

  // --- Vector Clock ---
  private vectorClock: VectorClock = {};

  // --- Pending Deltas (outbound) ---
  private pendingDeltas: AnchorDelta[] = [];

  // --- Remote Delta Queue (inbound) ---
  private incomingDeltas: AnchorDelta[] = [];
  private readonly MAX_INCOMING_QUEUE = 500;

  // --- Anchor Version Tracking ---
  private anchorClocks: Map<AnchorId, VectorClock> = new Map();

  // --- Sync Loop ---
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  // --- Event System ---
  private eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  // --- Metrics ---
  private totalLocalUpdates: number = 0;
  private totalRemoteUpdates: number = 0;
  private totalConflictsResolved: number = 0;
  private totalAnchorsExpired: number = 0;
  private lastSyncTime: number = 0;
  private syncLatencies: number[] = [];
  private readonly MAX_LATENCY_HISTORY = 60;

  constructor(config: SharedSpatialAnchorManagerConfig) {
    this.config = {
      localAgentId: config.localAgentId,
      syncHz: config.syncHz ?? 10,
      stalenessThresholdMs: config.stalenessThresholdMs ?? 1000,
      defaultEphemeralTtlMs: config.defaultEphemeralTtlMs ?? 30000,
      maxAnchors: config.maxAnchors ?? 500,
      defaultMergeStrategy: config.defaultMergeStrategy ?? 'lww',
      priorityMap: config.priorityMap ?? {},
      defaultLockTimeoutMs: config.defaultLockTimeoutMs ?? 10000,
      autoExpireEphemeral: config.autoExpireEphemeral ?? true,
      cleanupIntervalMs: config.cleanupIntervalMs ?? 5000,
      onRemoteAnchorUpdate: config.onRemoteAnchorUpdate ?? (() => {}),
      onAnchorExpired: config.onAnchorExpired ?? (() => {}),
    };

    // Initialize vector clock
    this.vectorClock[this.config.localAgentId] = 0;

    // Initialize double buffer
    this.buffer = new AgentStateBuffer<AnchorWorldState>(
      createEmptyAnchorWorldState,
      this.config.stalenessThresholdMs,
    );

    logger.info('[SharedSpatialAnchorManager] Initialized', {
      localAgentId: this.config.localAgentId,
      syncHz: this.config.syncHz,
      defaultMergeStrategy: this.config.defaultMergeStrategy,
      maxAnchors: this.config.maxAnchors,
    });
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start the anchor sync loop.
   * Processes incoming deltas, resolves conflicts, and swaps buffers.
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[SharedSpatialAnchorManager] Already running');
      return;
    }

    const intervalMs = Math.max(1, Math.round(1000 / this.config.syncHz));
    this.syncIntervalId = setInterval(() => this.syncLoop(), intervalMs);

    if (this.config.autoExpireEphemeral) {
      this.cleanupIntervalId = setInterval(
        () => this.expireAnchors(),
        this.config.cleanupIntervalMs,
      );
    }

    this.isRunning = true;

    logger.info('[SharedSpatialAnchorManager] Started sync loop', {
      intervalMs,
      syncHz: this.config.syncHz,
    });
  }

  /**
   * Stop the sync loop. Buffer state is preserved.
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[SharedSpatialAnchorManager] Already stopped');
      return;
    }

    if (this.syncIntervalId !== null) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }

    if (this.cleanupIntervalId !== null) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }

    this.isRunning = false;

    logger.info('[SharedSpatialAnchorManager] Stopped');
  }

  /**
   * Dispose all resources. Cannot be restarted after this.
   */
  dispose(): void {
    this.stop();
    this.pendingDeltas = [];
    this.incomingDeltas = [];
    this.anchorClocks.clear();
    this.eventListeners.clear();
    this.buffer.reset();

    logger.info('[SharedSpatialAnchorManager] Disposed');
  }

  // ===========================================================================
  // ANCHOR CRUD (called by agents, OFF render loop)
  // ===========================================================================

  /**
   * Create a new shared spatial anchor.
   *
   * @param id - Unique anchor ID (recommend namespace:name format)
   * @param name - Human-readable display name
   * @param options - Optional anchor configuration overrides
   * @returns The created anchor, or null if max anchors exceeded
   */
  createAnchor(
    id: AnchorId,
    name: string,
    options?: Partial<SharedSpatialAnchor>,
  ): SharedSpatialAnchor | null {
    const back = this.buffer.getBackBuffer();

    // Check capacity
    if (Object.keys(back.anchors).length >= this.config.maxAnchors) {
      this.emit('anchor:error', {
        message: `Maximum anchor count (${this.config.maxAnchors}) exceeded`,
        anchorId: id,
        code: 'MAX_ANCHORS_EXCEEDED',
      });
      return null;
    }

    // Check if already exists
    if (back.anchors[id]) {
      this.emit('anchor:error', {
        message: `Anchor "${id}" already exists`,
        anchorId: id,
        code: 'ANCHOR_EXISTS',
      });
      return null;
    }

    // Apply defaults
    const anchor = createDefaultAnchor(id, name, this.config.localAgentId, {
      ...options,
      mergeStrategy: options?.mergeStrategy ?? this.config.defaultMergeStrategy,
      ttlMs: options?.type === 'ephemeral'
        ? (options?.ttlMs ?? this.config.defaultEphemeralTtlMs)
        : (options?.ttlMs ?? 0),
    });

    // Write to back buffer
    back.anchors[id] = anchor;

    // Initialize anchor vector clock
    this.vectorClock = incrementVectorClock(this.vectorClock, this.config.localAgentId);
    this.anchorClocks.set(id, { ...this.vectorClock });

    // Record delta for network sync
    this.pendingDeltas.push({
      operation: 'create',
      anchorId: id,
      sourceAgentId: this.config.localAgentId,
      anchorState: anchor,
      vectorClock: { ...this.vectorClock },
      timestamp: Date.now(),
    });

    this.totalLocalUpdates++;

    // Emit event
    this.emit('anchor:created', { anchor, source: 'local' });

    logger.debug('[SharedSpatialAnchorManager] Anchor created', {
      id,
      name,
      type: anchor.type,
      namespace: anchor.namespace,
    });

    return anchor;
  }

  /**
   * Update an existing anchor's spatial state.
   *
   * @param id - Anchor to update
   * @param spatial - New spatial state (partial merge supported)
   * @param metadata - Optional metadata updates
   * @returns true if updated, false if anchor not found or locked
   */
  updateAnchorSpatial(
    id: AnchorId,
    spatial: Partial<AnchorSpatialState>,
    metadata?: Record<string, unknown>,
  ): boolean {
    const back = this.buffer.getBackBuffer();
    const anchor = back.anchors[id];

    if (!anchor) {
      logger.warn('[SharedSpatialAnchorManager] Anchor not found for update', { id });
      return false;
    }

    // Check if anchor is active
    if (!anchor.active) {
      logger.warn('[SharedSpatialAnchorManager] Cannot update inactive anchor', { id });
      return false;
    }

    // Check lock state
    if (anchor.mergeStrategy === 'lock') {
      const lockState = back.locks[id];
      if (lockState && lockState.locked && lockState.lockedByAgentId !== this.config.localAgentId) {
        logger.warn('[SharedSpatialAnchorManager] Anchor is locked by another agent', {
          id,
          lockedBy: lockState.lockedByAgentId,
        });
        return false;
      }
    }

    // Check editor permissions
    if (anchor.allowedEditors.length > 0 && !anchor.allowedEditors.includes(this.config.localAgentId)) {
      logger.warn('[SharedSpatialAnchorManager] Agent not in allowed editors', {
        id,
        agentId: this.config.localAgentId,
      });
      return false;
    }

    // Capture previous state for event
    const previousSpatial: AnchorSpatialState = { ...anchor.spatial };

    // Apply spatial update (partial merge)
    if (spatial.position) {
      anchor.spatial.position = { ...spatial.position };
    }
    if (spatial.rotation) {
      anchor.spatial.rotation = { ...spatial.rotation };
    }
    if (spatial.extent !== undefined) {
      anchor.spatial.extent = spatial.extent ? { ...spatial.extent } : null;
    }

    // Apply metadata update
    if (metadata) {
      Object.assign(anchor.metadata, metadata);
    }

    // Update housekeeping fields
    anchor.lastModifiedByAgentId = this.config.localAgentId;
    anchor.updatedAt = Date.now();
    anchor.version++;

    // Update vector clock
    this.vectorClock = incrementVectorClock(this.vectorClock, this.config.localAgentId);
    this.anchorClocks.set(id, { ...this.vectorClock });

    // Record delta
    this.pendingDeltas.push({
      operation: 'update',
      anchorId: id,
      sourceAgentId: this.config.localAgentId,
      anchorState: { ...anchor },
      vectorClock: { ...this.vectorClock },
      timestamp: Date.now(),
    });

    this.totalLocalUpdates++;

    // Emit event
    this.emit('anchor:updated', { anchor, previousSpatial, source: 'local' });

    return true;
  }

  /**
   * Remove (soft-delete) an anchor.
   *
   * @param id - Anchor to remove
   * @returns true if removed, false if not found
   */
  removeAnchor(id: AnchorId): boolean {
    const back = this.buffer.getBackBuffer();
    const anchor = back.anchors[id];

    if (!anchor) {
      return false;
    }

    // Soft-delete: mark as inactive
    anchor.active = false;
    anchor.updatedAt = Date.now();

    // Update vector clock
    this.vectorClock = incrementVectorClock(this.vectorClock, this.config.localAgentId);

    // Record delta
    this.pendingDeltas.push({
      operation: 'remove',
      anchorId: id,
      sourceAgentId: this.config.localAgentId,
      vectorClock: { ...this.vectorClock },
      timestamp: Date.now(),
    });

    // Remove from active set
    delete back.anchors[id];
    delete back.locks[id];
    this.anchorClocks.delete(id);

    // Emit event
    this.emit('anchor:removed', { anchorId: id, reason: 'deleted' });

    logger.debug('[SharedSpatialAnchorManager] Anchor removed', { id });

    return true;
  }

  // ===========================================================================
  // ANCHOR LOCKING (for 'lock' merge strategy)
  // ===========================================================================

  /**
   * Acquire a lock on an anchor.
   *
   * @param id - Anchor to lock
   * @param timeoutMs - Lock timeout (default: config.defaultLockTimeoutMs)
   * @returns true if lock acquired, false if already locked by another agent
   */
  acquireLock(id: AnchorId, timeoutMs?: number): boolean {
    const back = this.buffer.getBackBuffer();
    const anchor = back.anchors[id];

    if (!anchor) {
      return false;
    }

    const existingLock = back.locks[id];
    const now = Date.now();

    // Check if lock exists and is still valid
    if (existingLock && existingLock.locked) {
      // Check if lock has expired
      if (now - existingLock.lockedAt < existingLock.lockTimeoutMs) {
        // Lock is still valid
        if (existingLock.lockedByAgentId !== this.config.localAgentId) {
          return false; // Locked by someone else
        }
        // Already locked by us - extend the lock
      }
      // Lock expired - we can acquire it
    }

    const lockState: AnchorLockState = {
      locked: true,
      lockedByAgentId: this.config.localAgentId,
      lockedAt: now,
      lockTimeoutMs: timeoutMs ?? this.config.defaultLockTimeoutMs,
    };

    back.locks[id] = lockState;

    // Record delta
    this.vectorClock = incrementVectorClock(this.vectorClock, this.config.localAgentId);
    this.pendingDeltas.push({
      operation: 'lock',
      anchorId: id,
      sourceAgentId: this.config.localAgentId,
      lockState,
      vectorClock: { ...this.vectorClock },
      timestamp: now,
    });

    this.emit('anchor:lock-changed', { anchorId: id, lockState });

    logger.debug('[SharedSpatialAnchorManager] Lock acquired', { id });

    return true;
  }

  /**
   * Release a lock on an anchor.
   *
   * @param id - Anchor to unlock
   * @returns true if unlocked, false if not locked or locked by another agent
   */
  releaseLock(id: AnchorId): boolean {
    const back = this.buffer.getBackBuffer();
    const existingLock = back.locks[id];

    if (!existingLock || !existingLock.locked) {
      return false;
    }

    if (existingLock.lockedByAgentId !== this.config.localAgentId) {
      return false; // Can't unlock someone else's lock
    }

    const lockState: AnchorLockState = {
      locked: false,
      lockedByAgentId: '',
      lockedAt: 0,
      lockTimeoutMs: 0,
    };

    back.locks[id] = lockState;

    // Record delta
    this.vectorClock = incrementVectorClock(this.vectorClock, this.config.localAgentId);
    this.pendingDeltas.push({
      operation: 'unlock',
      anchorId: id,
      sourceAgentId: this.config.localAgentId,
      lockState,
      vectorClock: { ...this.vectorClock },
      timestamp: Date.now(),
    });

    this.emit('anchor:lock-changed', { anchorId: id, lockState });

    logger.debug('[SharedSpatialAnchorManager] Lock released', { id });

    return true;
  }

  // ===========================================================================
  // REMOTE DELTA INGESTION (from network)
  // ===========================================================================

  /**
   * Apply a remote anchor delta received from the network.
   *
   * This is called by the network layer (WebSocket handler, MCP callback, etc.)
   * when anchor updates arrive from other agents. Deltas are queued and
   * processed on the next sync tick (off render loop).
   *
   * @param delta - The remote anchor delta to apply
   */
  applyRemoteDelta(delta: AnchorDelta): void {
    if (delta.sourceAgentId === this.config.localAgentId) {
      return; // Ignore own deltas
    }

    if (this.incomingDeltas.length >= this.MAX_INCOMING_QUEUE) {
      this.incomingDeltas.shift(); // Drop oldest if queue full
    }

    this.incomingDeltas.push(delta);
  }

  /**
   * Apply a full remote anchor state (for initial sync or reconnection).
   *
   * @param remoteAnchors - Complete anchor state from a remote peer
   * @param remoteClock - Remote peer's vector clock
   */
  applyRemoteFullSync(
    remoteAnchors: Record<AnchorId, SharedSpatialAnchor>,
    remoteClock: VectorClock,
  ): void {
    const back = this.buffer.getBackBuffer();

    for (const [id, remoteAnchor] of Object.entries(remoteAnchors)) {
      const localAnchor = back.anchors[id];

      if (!localAnchor) {
        // New anchor from remote - add it
        back.anchors[id] = { ...remoteAnchor };
        this.anchorClocks.set(id, { ...remoteClock });
        this.emit('anchor:created', { anchor: remoteAnchor, source: 'remote' });
      } else {
        // Existing anchor - resolve using merge strategy
        const localClock = this.anchorClocks.get(id) || {};
        const order = compareVectorClocks(remoteClock, localClock);

        if (order === 'after') {
          // Remote is strictly newer
          const previousSpatial = { ...localAnchor.spatial };
          back.anchors[id] = { ...remoteAnchor };
          this.anchorClocks.set(id, { ...remoteClock });
          this.emit('anchor:updated', {
            anchor: remoteAnchor,
            previousSpatial,
            source: 'remote',
          });
        } else if (order === 'concurrent') {
          // Conflict - resolve
          const resolved = this.resolveConflict(id, localAnchor, remoteAnchor, remoteClock);
          back.anchors[id] = resolved;
        }
        // If 'before' or 'equal', keep local
      }
    }

    // Merge vector clocks
    this.vectorClock = mergeVectorClocks(this.vectorClock, remoteClock);

    this.emit('anchor:sync-complete', {
      anchorCount: Object.keys(remoteAnchors).length,
      source: 'full-sync',
    });

    logger.info('[SharedSpatialAnchorManager] Full sync applied', {
      anchorCount: Object.keys(remoteAnchors).length,
    });
  }

  // ===========================================================================
  // QUERY API (safe from any context)
  // ===========================================================================

  /**
   * Get the front buffer (render-loop safe, O(1)).
   * The renderer reads anchor state from this buffer each frame.
   */
  getFrontBuffer(): Readonly<AnchorWorldState> {
    return this.buffer.getFrontBuffer();
  }

  /**
   * Get a specific anchor from the front buffer (render-loop safe).
   *
   * @param id - Anchor ID to look up
   * @returns The anchor state, or undefined if not found
   */
  getAnchor(id: AnchorId): Readonly<SharedSpatialAnchor> | undefined {
    const state = this.buffer.getFrontBuffer();
    return state.anchors[id];
  }

  /**
   * Get all active anchors from the front buffer.
   */
  getAllAnchors(): ReadonlyArray<SharedSpatialAnchor> {
    const state = this.buffer.getFrontBuffer();
    return Object.values(state.anchors);
  }

  /**
   * Query anchors with flexible filtering.
   *
   * @param query - Query parameters for filtering
   * @returns Matching anchors
   */
  queryAnchors(query: AnchorQuery): ReadonlyArray<SharedSpatialAnchor> {
    const state = this.buffer.getFrontBuffer();
    let anchors = Object.values(state.anchors);

    // Apply filters
    if (query.namespace) {
      anchors = anchors.filter(a => a.namespace === query.namespace);
    }
    if (query.type) {
      anchors = anchors.filter(a => a.type === query.type);
    }
    if (query.tags && query.tags.length > 0) {
      anchors = anchors.filter(a =>
        query.tags!.every(tag => a.tags.includes(tag)),
      );
    }
    if (query.creatorAgentId) {
      anchors = anchors.filter(a => a.creatorAgentId === query.creatorAgentId);
    }
    if (query.active !== undefined) {
      anchors = anchors.filter(a => a.active === query.active);
    }
    if (query.parentAnchorId !== undefined) {
      anchors = anchors.filter(a => a.parentAnchorId === query.parentAnchorId);
    }
    if (query.spatial) {
      const { center, radius } = query.spatial;
      const r2 = radius * radius;
      anchors = anchors.filter(a => {
        const dx = a.spatial.position.x - center.x;
        const dy = a.spatial.position.y - center.y;
        const dz = a.spatial.position.z - center.z;
        return (dx * dx + dy * dy + dz * dz) <= r2;
      });
    }
    if (query.limit && query.limit > 0) {
      anchors = anchors.slice(0, query.limit);
    }

    return anchors;
  }

  /**
   * Find the nearest anchor to a given position.
   *
   * @param position - World-space query position
   * @param filter - Optional type/namespace filter
   * @returns The nearest anchor, or undefined if no anchors exist
   */
  findNearestAnchor(
    position: Vec3,
    filter?: { namespace?: AnchorNamespace; type?: AnchorType },
  ): Readonly<SharedSpatialAnchor> | undefined {
    let anchors = this.getAllAnchors();

    if (filter?.namespace) {
      anchors = anchors.filter(a => a.namespace === filter.namespace);
    }
    if (filter?.type) {
      anchors = anchors.filter(a => a.type === filter.type);
    }

    let nearest: SharedSpatialAnchor | undefined;
    let nearestDist = Infinity;

    for (const anchor of anchors) {
      const dx = anchor.spatial.position.x - position.x;
      const dy = anchor.spatial.position.y - position.y;
      const dz = anchor.spatial.position.z - position.z;
      const dist = dx * dx + dy * dy + dz * dz;

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = anchor;
      }
    }

    return nearest;
  }

  /**
   * Get the total number of active anchors.
   */
  getAnchorCount(): number {
    const state = this.buffer.getFrontBuffer();
    return Object.keys(state.anchors).length;
  }

  /**
   * Check if the manager is running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get pending outbound deltas (for network layer to consume and send).
   * Clears the pending queue after returning.
   */
  drainPendingDeltas(): AnchorDelta[] {
    const deltas = [...this.pendingDeltas];
    this.pendingDeltas = [];
    return deltas;
  }

  /**
   * Get the current vector clock.
   */
  getVectorClock(): Readonly<VectorClock> {
    return this.vectorClock;
  }

  // ===========================================================================
  // SYNC LOOP (OFF RENDER LOOP)
  // ===========================================================================

  /**
   * Main sync loop. Processes incoming deltas, resolves conflicts, swaps buffers.
   */
  private syncLoop(): void {
    const startTime = this.now();

    // Process incoming remote deltas
    if (this.incomingDeltas.length > 0) {
      const deltas = this.incomingDeltas.splice(0);
      for (const delta of deltas) {
        this.processRemoteDelta(delta);
      }
    }

    // If there are any changes, swap buffers
    const back = this.buffer.getBackBuffer();
    back.sequence++;
    back.lastSyncTimestamp = Date.now();

    this.buffer.swap();

    // Track latency
    const duration = this.now() - startTime;
    this.lastSyncTime = this.now();
    this.syncLatencies.push(duration);
    if (this.syncLatencies.length > this.MAX_LATENCY_HISTORY) {
      this.syncLatencies.shift();
    }
  }

  /**
   * Process a single remote delta, applying CRDT conflict resolution.
   */
  private processRemoteDelta(delta: AnchorDelta): void {
    const back = this.buffer.getBackBuffer();

    switch (delta.operation) {
      case 'create': {
        if (!delta.anchorState) break;
        if (back.anchors[delta.anchorId]) {
          // Anchor already exists locally - treat as update
          this.processRemoteUpdate(delta);
        } else {
          // New anchor
          back.anchors[delta.anchorId] = { ...delta.anchorState };
          this.anchorClocks.set(delta.anchorId, { ...delta.vectorClock });
          this.totalRemoteUpdates++;
          this.config.onRemoteAnchorUpdate(delta.anchorState);
          this.emit('anchor:created', { anchor: delta.anchorState, source: 'remote' });
        }
        break;
      }

      case 'update': {
        this.processRemoteUpdate(delta);
        break;
      }

      case 'remove': {
        if (back.anchors[delta.anchorId]) {
          delete back.anchors[delta.anchorId];
          delete back.locks[delta.anchorId];
          this.anchorClocks.delete(delta.anchorId);
          this.totalRemoteUpdates++;
          this.emit('anchor:removed', { anchorId: delta.anchorId, reason: 'deleted' });
        }
        break;
      }

      case 'lock': {
        if (delta.lockState) {
          back.locks[delta.anchorId] = { ...delta.lockState };
          this.emit('anchor:lock-changed', {
            anchorId: delta.anchorId,
            lockState: delta.lockState,
          });
        }
        break;
      }

      case 'unlock': {
        if (delta.lockState) {
          back.locks[delta.anchorId] = { ...delta.lockState };
          this.emit('anchor:lock-changed', {
            anchorId: delta.anchorId,
            lockState: delta.lockState,
          });
        }
        break;
      }
    }

    // Merge vector clock
    this.vectorClock = mergeVectorClocks(this.vectorClock, delta.vectorClock);
  }

  /**
   * Process a remote update delta with conflict resolution.
   */
  private processRemoteUpdate(delta: AnchorDelta): void {
    if (!delta.anchorState) return;

    const back = this.buffer.getBackBuffer();
    const localAnchor = back.anchors[delta.anchorId];

    if (!localAnchor) {
      // Anchor doesn't exist locally - create it
      back.anchors[delta.anchorId] = { ...delta.anchorState };
      this.anchorClocks.set(delta.anchorId, { ...delta.vectorClock });
      this.totalRemoteUpdates++;
      this.config.onRemoteAnchorUpdate(delta.anchorState);
      this.emit('anchor:created', { anchor: delta.anchorState, source: 'remote' });
      return;
    }

    // Compare vector clocks
    const localClock = this.anchorClocks.get(delta.anchorId) || {};
    const order = compareVectorClocks(delta.vectorClock, localClock);

    if (order === 'before' || order === 'equal') {
      // Remote is older or equal - discard
      return;
    }

    const previousSpatial: AnchorSpatialState = { ...localAnchor.spatial };

    if (order === 'after') {
      // Remote is strictly newer - apply directly
      back.anchors[delta.anchorId] = { ...delta.anchorState };
      this.anchorClocks.set(delta.anchorId, { ...delta.vectorClock });
    } else {
      // Concurrent - resolve conflict using merge strategy
      const resolved = this.resolveConflict(
        delta.anchorId,
        localAnchor,
        delta.anchorState,
        delta.vectorClock,
      );
      back.anchors[delta.anchorId] = resolved;
      this.anchorClocks.set(
        delta.anchorId,
        mergeVectorClocks(localClock, delta.vectorClock),
      );
    }

    this.totalRemoteUpdates++;
    this.config.onRemoteAnchorUpdate(back.anchors[delta.anchorId]);
    this.emit('anchor:updated', {
      anchor: back.anchors[delta.anchorId],
      previousSpatial,
      source: 'remote',
    });
  }

  // ===========================================================================
  // CONFLICT RESOLUTION
  // ===========================================================================

  /**
   * Resolve a conflict between local and remote anchor states.
   *
   * Uses the anchor's configured merge strategy to produce a resolved state.
   * Emits an 'anchor:conflict-resolved' event with details.
   *
   * @returns The resolved anchor state
   */
  private resolveConflict(
    anchorId: AnchorId,
    localAnchor: SharedSpatialAnchor,
    remoteAnchor: SharedSpatialAnchor,
    remoteClock: VectorClock,
  ): SharedSpatialAnchor {
    const strategy = localAnchor.mergeStrategy;
    let resolvedSpatial: AnchorSpatialState;

    switch (strategy) {
      case 'lww': {
        // Last-Writer-Wins: compare timestamps
        if (remoteAnchor.updatedAt >= localAnchor.updatedAt) {
          resolvedSpatial = { ...remoteAnchor.spatial };
        } else {
          resolvedSpatial = { ...localAnchor.spatial };
        }
        break;
      }

      case 'interpolate': {
        // Average the concurrent positions for smooth transitions
        resolvedSpatial = this.interpolateSpatial(
          localAnchor.spatial,
          remoteAnchor.spatial,
        );
        break;
      }

      case 'priority': {
        // Higher-priority agent wins
        const localPriority = this.config.priorityMap[localAnchor.lastModifiedByAgentId] || 0;
        const remotePriority = this.config.priorityMap[remoteAnchor.lastModifiedByAgentId] || 0;

        if (remotePriority > localPriority) {
          resolvedSpatial = { ...remoteAnchor.spatial };
        } else if (remotePriority < localPriority) {
          resolvedSpatial = { ...localAnchor.spatial };
        } else {
          // Same priority - fall back to LWW
          resolvedSpatial = remoteAnchor.updatedAt >= localAnchor.updatedAt
            ? { ...remoteAnchor.spatial }
            : { ...localAnchor.spatial };
        }
        break;
      }

      case 'lock': {
        // Lock holder wins. If neither holds the lock, fall back to LWW.
        const back = this.buffer.getBackBuffer();
        const lockState = back.locks[anchorId];

        if (lockState && lockState.locked) {
          if (lockState.lockedByAgentId === localAnchor.lastModifiedByAgentId) {
            resolvedSpatial = { ...localAnchor.spatial };
          } else if (lockState.lockedByAgentId === remoteAnchor.lastModifiedByAgentId) {
            resolvedSpatial = { ...remoteAnchor.spatial };
          } else {
            // Neither modified by lock holder - LWW fallback
            resolvedSpatial = remoteAnchor.updatedAt >= localAnchor.updatedAt
              ? { ...remoteAnchor.spatial }
              : { ...localAnchor.spatial };
          }
        } else {
          // No active lock - LWW fallback
          resolvedSpatial = remoteAnchor.updatedAt >= localAnchor.updatedAt
            ? { ...remoteAnchor.spatial }
            : { ...localAnchor.spatial };
        }
        break;
      }

      default:
        // Unknown strategy - fall back to LWW
        resolvedSpatial = remoteAnchor.updatedAt >= localAnchor.updatedAt
          ? { ...remoteAnchor.spatial }
          : { ...localAnchor.spatial };
    }

    // Build resolved anchor (keep non-spatial fields from the "winner")
    const winnerIsRemote = resolvedSpatial === remoteAnchor.spatial ||
      (resolvedSpatial.position.x === remoteAnchor.spatial.position.x &&
       resolvedSpatial.position.y === remoteAnchor.spatial.position.y &&
       resolvedSpatial.position.z === remoteAnchor.spatial.position.z);

    const resolved: SharedSpatialAnchor = {
      ...(winnerIsRemote ? remoteAnchor : localAnchor),
      spatial: resolvedSpatial,
      version: Math.max(localAnchor.version, remoteAnchor.version) + 1,
      updatedAt: Date.now(),
    };

    this.totalConflictsResolved++;

    // Emit conflict resolution event
    this.emit('anchor:conflict-resolved', {
      anchorId,
      strategy,
      localValue: localAnchor.spatial,
      remoteValue: remoteAnchor.spatial,
      resolvedValue: resolvedSpatial,
    });

    logger.debug('[SharedSpatialAnchorManager] Conflict resolved', {
      anchorId,
      strategy,
      winner: winnerIsRemote ? 'remote' : 'local',
    });

    return resolved;
  }

  /**
   * Interpolate between two spatial states (for 'interpolate' merge strategy).
   * Produces a weighted average of positions and slerp of rotations.
   */
  private interpolateSpatial(
    a: AnchorSpatialState,
    b: AnchorSpatialState,
  ): AnchorSpatialState {
    return {
      position: {
        x: (a.position.x + b.position.x) / 2,
        y: (a.position.y + b.position.y) / 2,
        z: (a.position.z + b.position.z) / 2,
      },
      rotation: this.slerpQuat(a.rotation, b.rotation, 0.5),
      extent: a.extent && b.extent
        ? {
            x: (a.extent.x + b.extent.x) / 2,
            y: (a.extent.y + b.extent.y) / 2,
            z: (a.extent.z + b.extent.z) / 2,
          }
        : (a.extent || b.extent),
    };
  }

  /**
   * Simple quaternion slerp (Spherical Linear Interpolation).
   * For the 50/50 merge case (t = 0.5), this produces the midpoint rotation.
   */
  private slerpQuat(a: Quat, b: Quat, t: number): Quat {
    // Compute dot product
    let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;

    // If dot is negative, negate one quaternion to take the shorter arc
    let bx = b.x, by = b.y, bz = b.z, bw = b.w;
    if (dot < 0) {
      dot = -dot;
      bx = -bx; by = -by; bz = -bz; bw = -bw;
    }

    // If quaternions are very close, use linear interpolation
    if (dot > 0.9995) {
      return {
        x: a.x + t * (bx - a.x),
        y: a.y + t * (by - a.y),
        z: a.z + t * (bz - a.z),
        w: a.w + t * (bw - a.w),
      };
    }

    // Compute slerp
    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);
    const wa = Math.sin((1 - t) * theta) / sinTheta;
    const wb = Math.sin(t * theta) / sinTheta;

    return {
      x: wa * a.x + wb * bx,
      y: wa * a.y + wb * by,
      z: wa * a.z + wb * bz,
      w: wa * a.w + wb * bw,
    };
  }

  // ===========================================================================
  // EXPIRATION (for ephemeral anchors)
  // ===========================================================================

  /**
   * Expire anchors that have exceeded their TTL.
   */
  private expireAnchors(): void {
    const back = this.buffer.getBackBuffer();
    const now = Date.now();
    const toRemove: AnchorId[] = [];

    for (const [id, anchor] of Object.entries(back.anchors)) {
      if (anchor.type === 'ephemeral' && anchor.ttlMs > 0) {
        if (now - anchor.createdAt > anchor.ttlMs) {
          toRemove.push(id);
        }
      }
    }

    for (const id of toRemove) {
      delete back.anchors[id];
      delete back.locks[id];
      this.anchorClocks.delete(id);
      this.totalAnchorsExpired++;
      this.config.onAnchorExpired(id);
      this.emit('anchor:removed', { anchorId: id, reason: 'expired' });
    }

    // Also expire stale locks
    for (const [id, lock] of Object.entries(back.locks)) {
      if (lock.locked && now - lock.lockedAt > lock.lockTimeoutMs) {
        back.locks[id] = {
          locked: false,
          lockedByAgentId: '',
          lockedAt: 0,
          lockTimeoutMs: 0,
        };
        this.emit('anchor:lock-changed', { anchorId: id, lockState: back.locks[id] });
        logger.debug('[SharedSpatialAnchorManager] Lock expired', { id });
      }
    }
  }

  // ===========================================================================
  // EVENT SYSTEM
  // ===========================================================================

  /**
   * Subscribe to anchor events.
   *
   * @param event - Event type to listen for
   * @param handler - Event handler function
   * @returns Unsubscribe function
   */
  on<T extends AnchorEventType>(
    event: T,
    handler: AnchorEventHandler<T>,
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler as any);

    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from anchor events.
   */
  off<T extends AnchorEventType>(
    event: T,
    handler: AnchorEventHandler<T>,
  ): void {
    this.eventListeners.get(event)?.delete(handler as any);
  }

  /**
   * Emit an anchor event.
   */
  private emit<T extends AnchorEventType>(
    event: T,
    data: AnchorEventMap[T],
  ): void {
    this.eventListeners.get(event)?.forEach((handler) => {
      try {
        (handler as AnchorEventHandler<T>)(data);
      } catch (err) {
        logger.error('[SharedSpatialAnchorManager] Event handler error', {
          event,
          error: String(err),
        });
      }
    });
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Get comprehensive metrics for the anchor system.
   */
  getMetrics(): SharedSpatialAnchorMetrics {
    const state = this.buffer.getFrontBuffer();
    const anchors = Object.values(state.anchors);
    const now = this.now();

    // Count by namespace
    const byNamespace: Record<AnchorNamespace, number> = {
      world: 0, agent: 0, session: 0, ephemeral: 0,
    };
    // Count by type
    const byType: Record<AnchorType, number> = {
      static: 0, dynamic: 0, semantic: 0, ephemeral: 0,
    };

    for (const anchor of anchors) {
      byNamespace[anchor.namespace] = (byNamespace[anchor.namespace] || 0) + 1;
      byType[anchor.type] = (byType[anchor.type] || 0) + 1;
    }

    // Average sync latency
    let avgLatency = 0;
    if (this.syncLatencies.length > 0) {
      avgLatency = this.syncLatencies.reduce((a, b) => a + b, 0) / this.syncLatencies.length;
    }

    const timeSinceLastSync = this.lastSyncTime > 0 ? now - this.lastSyncTime : 0;

    return {
      isRunning: this.isRunning,
      totalAnchors: anchors.length,
      anchorsByNamespace: byNamespace,
      anchorsByType: byType,
      totalLocalUpdates: this.totalLocalUpdates,
      totalRemoteUpdates: this.totalRemoteUpdates,
      totalConflictsResolved: this.totalConflictsResolved,
      totalAnchorsExpired: this.totalAnchorsExpired,
      syncHz: this.config.syncHz,
      averageSyncLatencyMs: Math.round(avgLatency * 1000) / 1000,
      timeSinceLastSyncMs: Math.round(timeSinceLastSync * 100) / 100,
      isStale: timeSinceLastSync > this.config.stalenessThresholdMs,
    };
  }

  // ===========================================================================
  // INTERNAL HELPERS
  // ===========================================================================

  /**
   * High-resolution timestamp.
   */
  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a SharedSpatialAnchorManager with the given configuration.
 */
export function createSharedSpatialAnchorManager(
  config: SharedSpatialAnchorManagerConfig,
): SharedSpatialAnchorManager {
  return new SharedSpatialAnchorManager(config);
}
