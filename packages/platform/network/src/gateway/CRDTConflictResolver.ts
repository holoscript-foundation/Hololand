/**
 * CRDT Conflict Resolution Engine
 *
 * Adaptive conflict resolution that selects the optimal CRDT strategy
 * based on the current agent population:
 *   - <15 agents:   operation-based CRDTs (low overhead, strong consistency)
 *   - 15-50 agents: delta-state CRDTs (bandwidth efficient)
 *   - 50+ agents:   hierarchical CRDTs (partitioned authority)
 *
 * This directly implements the autonomize research prescription for
 * world state conflict resolution in multi-agent VR environments.
 *
 * @module gateway/CRDTConflictResolver
 */

import {
  type CRDTStrategy,
  type CRDTResolutionConfig,
  type HierarchicalPartition,
  type Vector3Like,
  type GatewayEventHandler,
} from './types';

// =============================================================================
// Operation Types
// =============================================================================

export interface CRDTOperation {
  /** Entity this operation applies to */
  entityId: string;
  /** Node that originated the operation */
  nodeId: string;
  /** Operation type */
  type: 'set' | 'delete' | 'increment' | 'merge';
  /** Property path within entity state */
  path: string;
  /** New value */
  value: unknown;
  /** Vector clock at time of operation */
  vectorClock: Record<string, number>;
  /** Timestamp (ms since epoch) */
  timestamp: number;
  /** Sequence number from originating node */
  sequence: number;
}

export interface DeltaState {
  /** Entity this delta applies to */
  entityId: string;
  /** Node that produced the delta */
  nodeId: string;
  /** Changed fields since last sync */
  deltas: Map<string, { value: unknown; timestamp: number }>;
  /** Causal context (which operations are included) */
  causalContext: Record<string, number>;
}

export interface ConflictEvent {
  entityId: string;
  conflictingNodes: string[];
  strategy: CRDTStrategy;
  resolved: boolean;
  winnerNodeId?: string;
  mergedValue?: unknown;
}

// =============================================================================
// Entity State Tracking
// =============================================================================

interface EntityTracker {
  entityId: string;
  /** Current merged state */
  state: Map<string, { value: unknown; timestamp: number; nodeId: string }>;
  /** Operation log for operation-based strategy */
  operationLog: CRDTOperation[];
  /** Delta buffers per node for delta-state strategy */
  deltaBuffers: Map<string, DeltaState>;
  /** Partition assignment for hierarchical strategy */
  partitionId?: string;
  /** Position (for spatial partitioning) */
  position?: Vector3Like;
  /** Last update timestamp */
  lastUpdate: number;
}

// =============================================================================
// CRDT Conflict Resolver
// =============================================================================

export class CRDTConflictResolver {
  private config: CRDTResolutionConfig;
  private currentStrategy: CRDTStrategy;
  private entities: Map<string, EntityTracker> = new Map();
  private activeNodes: Set<string> = new Set();
  private partitions: Map<string, HierarchicalPartition> = new Map();
  private operationBuffer: CRDTOperation[] = [];
  private conflictListeners: Array<(event: ConflictEvent) => void> = [];
  private strategyChangeListeners: Array<
    GatewayEventHandler<'strategy:changed'>
  > = [];

  /** Metrics */
  private conflictsDetected = 0;
  private conflictsResolved = 0;
  private lastMetricsReset = Date.now();

  constructor(config: CRDTResolutionConfig) {
    this.config = config;
    this.currentStrategy = config.forceStrategy ?? this.selectStrategy(0);
  }

  // ===========================================================================
  // Strategy Selection
  // ===========================================================================

  /**
   * Select optimal CRDT strategy based on agent count.
   * Called automatically when agents join/leave.
   */
  private selectStrategy(agentCount: number): CRDTStrategy {
    if (this.config.forceStrategy) {
      return this.config.forceStrategy;
    }
    if (agentCount <= this.config.thresholds.operationMax) {
      return 'operation';
    }
    if (agentCount <= this.config.thresholds.deltaStateMax) {
      return 'delta-state';
    }
    return 'hierarchical';
  }

  /**
   * Register or deregister a node and potentially trigger strategy switch.
   */
  registerNode(nodeId: string): void {
    this.activeNodes.add(nodeId);
    this.evaluateStrategy();
  }

  deregisterNode(nodeId: string): void {
    this.activeNodes.delete(nodeId);
    this.evaluateStrategy();
  }

  private evaluateStrategy(): void {
    const newStrategy = this.selectStrategy(this.activeNodes.size);
    if (newStrategy !== this.currentStrategy) {
      const oldStrategy = this.currentStrategy;
      this.currentStrategy = newStrategy;
      this.onStrategyChange(oldStrategy, newStrategy);
    }
  }

  private onStrategyChange(from: CRDTStrategy, to: CRDTStrategy): void {
    // Migrate state between strategies
    if (to === 'hierarchical' && this.partitions.size === 0) {
      this.autoPartition();
    }
    for (const listener of this.strategyChangeListeners) {
      listener({ from, to, agentCount: this.activeNodes.size });
    }
  }

  // ===========================================================================
  // Operation-Based CRDT Resolution (<15 agents)
  // ===========================================================================

  /**
   * Apply an operation. For operation-based CRDTs, every operation is
   * broadcast to all nodes and applied in causal order.
   */
  applyOperation(op: CRDTOperation): ConflictEvent | null {
    this.registerNode(op.nodeId);
    let tracker = this.entities.get(op.entityId);
    if (!tracker) {
      tracker = {
        entityId: op.entityId,
        state: new Map(),
        operationLog: [],
        deltaBuffers: new Map(),
        lastUpdate: Date.now(),
      };
      this.entities.set(op.entityId, tracker);
    }

    switch (this.currentStrategy) {
      case 'operation':
        return this.applyOperationBased(tracker, op);
      case 'delta-state':
        return this.applyDeltaState(tracker, op);
      case 'hierarchical':
        return this.applyHierarchical(tracker, op);
    }
  }

  /**
   * Operation-based resolution: maintain full causal log,
   * detect concurrent operations via vector clock comparison,
   * resolve by tiebreaker policy.
   */
  private applyOperationBased(
    tracker: EntityTracker,
    op: CRDTOperation,
  ): ConflictEvent | null {
    // Append to operation log
    tracker.operationLog.push(op);

    // Check for concurrent writes to the same path
    const existing = tracker.state.get(op.path);
    if (existing) {
      const clockOrder = this.compareVectorClocks(
        op.vectorClock,
        this.getNodeClock(existing.nodeId),
      );

      if (clockOrder === 'concurrent') {
        // CONFLICT: concurrent writes from different nodes
        this.conflictsDetected++;
        const winner = this.resolveTiebreak(
          op,
          existing as unknown as CRDTOperation,
        );
        tracker.state.set(op.path, {
          value: winner.value,
          timestamp: winner.timestamp,
          nodeId: winner.nodeId,
        });
        tracker.lastUpdate = Date.now();

        const event: ConflictEvent = {
          entityId: op.entityId,
          conflictingNodes: [op.nodeId, existing.nodeId],
          strategy: 'operation',
          resolved: true,
          winnerNodeId: winner.nodeId,
          mergedValue: winner.value,
        };
        this.conflictsResolved++;
        this.emitConflict(event);
        return event;
      }
    }

    // No conflict or causally ordered: apply directly
    tracker.state.set(op.path, {
      value: op.value,
      timestamp: op.timestamp,
      nodeId: op.nodeId,
    });
    tracker.lastUpdate = Date.now();
    return null;
  }

  // ===========================================================================
  // Delta-State CRDT Resolution (15-50 agents)
  // ===========================================================================

  /**
   * Delta-state resolution: accumulate deltas per node,
   * periodically merge delta buffers to reduce bandwidth.
   * Only changed fields are transmitted.
   */
  private applyDeltaState(
    tracker: EntityTracker,
    op: CRDTOperation,
  ): ConflictEvent | null {
    // Get or create delta buffer for this node
    let deltaBuffer = tracker.deltaBuffers.get(op.nodeId);
    if (!deltaBuffer) {
      deltaBuffer = {
        entityId: op.entityId,
        nodeId: op.nodeId,
        deltas: new Map(),
        causalContext: {},
      };
      tracker.deltaBuffers.set(op.nodeId, deltaBuffer);
    }

    // Record the delta
    deltaBuffer.deltas.set(op.path, {
      value: op.value,
      timestamp: op.timestamp,
    });
    deltaBuffer.causalContext[op.nodeId] = op.sequence;

    // Merge all delta buffers into entity state
    return this.mergeDeltaBuffers(tracker);
  }

  /**
   * Merge all accumulated delta buffers for an entity.
   * Uses last-writer-wins per field with vector clock tiebreaking.
   */
  private mergeDeltaBuffers(tracker: EntityTracker): ConflictEvent | null {
    let conflict: ConflictEvent | null = null;

    for (const [, deltaBuffer] of tracker.deltaBuffers) {
      for (const [path, delta] of deltaBuffer.deltas) {
        const existing = tracker.state.get(path);

        if (existing && existing.nodeId !== deltaBuffer.nodeId) {
          // Check if this is a genuine concurrent update
          if (
            Math.abs(delta.timestamp - existing.timestamp) <
            this.config.maxClockDriftMs
          ) {
            this.conflictsDetected++;
            // Resolve by timestamp + node priority tiebreak
            if (delta.timestamp >= existing.timestamp) {
              tracker.state.set(path, {
                value: delta.value,
                timestamp: delta.timestamp,
                nodeId: deltaBuffer.nodeId,
              });
            }
            conflict = {
              entityId: tracker.entityId,
              conflictingNodes: [deltaBuffer.nodeId, existing.nodeId],
              strategy: 'delta-state',
              resolved: true,
              winnerNodeId:
                delta.timestamp >= existing.timestamp
                  ? deltaBuffer.nodeId
                  : existing.nodeId,
            };
            this.conflictsResolved++;
            this.emitConflict(conflict);
          } else if (delta.timestamp > existing.timestamp) {
            tracker.state.set(path, {
              value: delta.value,
              timestamp: delta.timestamp,
              nodeId: deltaBuffer.nodeId,
            });
          }
        } else {
          tracker.state.set(path, {
            value: delta.value,
            timestamp: delta.timestamp,
            nodeId: deltaBuffer.nodeId,
          });
        }
      }
    }

    tracker.lastUpdate = Date.now();
    return conflict;
  }

  /**
   * Get compressed delta for a node since its last sync point.
   * Used for efficient bandwidth: only send changes.
   */
  getDeltaForNode(
    entityId: string,
    nodeId: string,
  ): DeltaState | null {
    const tracker = this.entities.get(entityId);
    if (!tracker) return null;
    return tracker.deltaBuffers.get(nodeId) ?? null;
  }

  /**
   * Clear delta buffer for a node after successful sync.
   */
  acknowledgeDelta(entityId: string, nodeId: string): void {
    const tracker = this.entities.get(entityId);
    if (tracker) {
      tracker.deltaBuffers.delete(nodeId);
    }
  }

  // ===========================================================================
  // Hierarchical CRDT Resolution (50+ agents)
  // ===========================================================================

  /**
   * Hierarchical resolution: partition world space into authority zones.
   * Each partition has a designated authority node that resolves conflicts
   * within its bounds. Cross-partition conflicts are escalated.
   */
  private applyHierarchical(
    tracker: EntityTracker,
    op: CRDTOperation,
  ): ConflictEvent | null {
    // Determine which partition this entity belongs to
    const partition = this.findPartition(tracker);
    if (!partition) {
      // Entity outside all partitions: fall back to delta-state
      return this.applyDeltaState(tracker, op);
    }

    tracker.partitionId = partition.id;

    // If the operation comes from the authority node, apply immediately
    if (op.nodeId === partition.authorityNodeId) {
      tracker.state.set(op.path, {
        value: op.value,
        timestamp: op.timestamp,
        nodeId: op.nodeId,
      });
      tracker.lastUpdate = Date.now();
      return null;
    }

    // Non-authority nodes: buffer and let authority resolve
    const existing = tracker.state.get(op.path);
    if (existing && existing.nodeId !== op.nodeId) {
      this.conflictsDetected++;
      // Authority node wins if it has a recent write
      if (existing.nodeId === partition.authorityNodeId) {
        // Authority prevails unless operation is significantly newer
        if (op.timestamp - existing.timestamp > this.config.maxClockDriftMs) {
          tracker.state.set(op.path, {
            value: op.value,
            timestamp: op.timestamp,
            nodeId: op.nodeId,
          });
        }
        const event: ConflictEvent = {
          entityId: op.entityId,
          conflictingNodes: [op.nodeId, existing.nodeId],
          strategy: 'hierarchical',
          resolved: true,
          winnerNodeId:
            op.timestamp - existing.timestamp > this.config.maxClockDriftMs
              ? op.nodeId
              : existing.nodeId,
        };
        this.conflictsResolved++;
        this.emitConflict(event);
        return event;
      } else {
        // Two non-authority nodes conflicting: use tiebreaker
        return this.applyOperationBased(tracker, op);
      }
    }

    tracker.state.set(op.path, {
      value: op.value,
      timestamp: op.timestamp,
      nodeId: op.nodeId,
    });
    tracker.lastUpdate = Date.now();
    return null;
  }

  /**
   * Auto-partition world space when switching to hierarchical strategy.
   * Creates a grid of partitions and assigns authority to nodes
   * based on their current positions.
   */
  private autoPartition(): void {
    // Create a default 2x2x2 grid partition (8 zones)
    const gridSize = 2;
    const worldExtent = 1000; // meters
    const cellSize = worldExtent / gridSize;
    const nodes = Array.from(this.activeNodes);
    let nodeIdx = 0;

    this.partitions.clear();

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          const id = `partition-${x}-${y}-${z}`;
          const authorityNodeId = nodes[nodeIdx % nodes.length];
          nodeIdx++;

          const partition: HierarchicalPartition = {
            id,
            authorityNodeId,
            bounds: {
              min: {
                x: x * cellSize - worldExtent / 2,
                y: y * cellSize - worldExtent / 2,
                z: z * cellSize - worldExtent / 2,
              },
              max: {
                x: (x + 1) * cellSize - worldExtent / 2,
                y: (y + 1) * cellSize - worldExtent / 2,
                z: (z + 1) * cellSize - worldExtent / 2,
              },
            },
            nodeIds: [],
          };
          this.partitions.set(id, partition);
        }
      }
    }

    // Assign nodes to partitions (round-robin for now)
    let pIdx = 0;
    const partitionArray = Array.from(this.partitions.values());
    for (const nodeId of this.activeNodes) {
      partitionArray[pIdx % partitionArray.length].nodeIds.push(nodeId);
      pIdx++;
    }
  }

  /**
   * Update partition boundaries and authority.
   */
  setPartitions(partitions: HierarchicalPartition[]): void {
    this.partitions.clear();
    for (const p of partitions) {
      this.partitions.set(p.id, p);
    }
  }

  private findPartition(tracker: EntityTracker): HierarchicalPartition | null {
    if (!tracker.position) return null;
    const pos = tracker.position;

    for (const [, partition] of this.partitions) {
      const { min, max } = partition.bounds;
      if (
        pos.x >= min.x && pos.x <= max.x &&
        pos.y >= min.y && pos.y <= max.y &&
        pos.z >= min.z && pos.z <= max.z
      ) {
        return partition;
      }
    }
    return null;
  }

  // ===========================================================================
  // Vector Clock Operations
  // ===========================================================================

  private nodeClocks: Map<string, Record<string, number>> = new Map();

  private getNodeClock(nodeId: string): Record<string, number> {
    return this.nodeClocks.get(nodeId) ?? {};
  }

  updateNodeClock(nodeId: string, clock: Record<string, number>): void {
    const existing = this.nodeClocks.get(nodeId) ?? {};
    for (const [key, val] of Object.entries(clock)) {
      existing[key] = Math.max(existing[key] ?? 0, val);
    }
    this.nodeClocks.set(nodeId, existing);
  }

  private compareVectorClocks(
    a: Record<string, number>,
    b: Record<string, number>,
  ): 'before' | 'after' | 'concurrent' | 'equal' {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let aLess = false;
    let bLess = false;

    for (const key of allKeys) {
      const va = a[key] ?? 0;
      const vb = b[key] ?? 0;
      if (va < vb) aLess = true;
      if (va > vb) bLess = true;
    }

    if (!aLess && !bLess) return 'equal';
    if (aLess && !bLess) return 'before';
    if (!aLess && bLess) return 'after';
    return 'concurrent';
  }

  // ===========================================================================
  // Tiebreaker
  // ===========================================================================

  private resolveTiebreak(
    a: CRDTOperation,
    b: { value: unknown; timestamp: number; nodeId: string },
  ): { value: unknown; timestamp: number; nodeId: string } {
    switch (this.config.tiebreaker) {
      case 'timestamp':
        return a.timestamp >= b.timestamp
          ? { value: a.value, timestamp: a.timestamp, nodeId: a.nodeId }
          : b;
      case 'node-priority':
        // Lexicographic node ID comparison (deterministic)
        return a.nodeId <= b.nodeId
          ? { value: a.value, timestamp: a.timestamp, nodeId: a.nodeId }
          : b;
      case 'merge-all':
        // For objects, deep merge; for primitives, last-write-wins
        if (
          typeof a.value === 'object' &&
          a.value !== null &&
          typeof b.value === 'object' &&
          b.value !== null
        ) {
          return {
            value: { ...(b.value as object), ...(a.value as object) },
            timestamp: Math.max(a.timestamp, b.timestamp),
            nodeId: a.nodeId,
          };
        }
        return a.timestamp >= b.timestamp
          ? { value: a.value, timestamp: a.timestamp, nodeId: a.nodeId }
          : b;
    }
  }

  // ===========================================================================
  // Entity Position Update (for spatial partitioning)
  // ===========================================================================

  updateEntityPosition(entityId: string, position: Vector3Like): void {
    const tracker = this.entities.get(entityId);
    if (tracker) {
      tracker.position = position;
    }
  }

  // ===========================================================================
  // Query Interface
  // ===========================================================================

  getEntityState(entityId: string): Map<string, unknown> | null {
    const tracker = this.entities.get(entityId);
    if (!tracker) return null;
    const result = new Map<string, unknown>();
    for (const [path, entry] of tracker.state) {
      result.set(path, entry.value);
    }
    return result;
  }

  getActiveNodeCount(): number {
    return this.activeNodes.size;
  }

  getCurrentStrategy(): CRDTStrategy {
    return this.currentStrategy;
  }

  getPartitions(): HierarchicalPartition[] {
    return Array.from(this.partitions.values());
  }

  // ===========================================================================
  // Metrics
  // ===========================================================================

  getConflictMetrics(): {
    detected: number;
    resolved: number;
    perSecond: number;
  } {
    const elapsed = (Date.now() - this.lastMetricsReset) / 1000;
    return {
      detected: this.conflictsDetected,
      resolved: this.conflictsResolved,
      perSecond: elapsed > 0 ? this.conflictsResolved / elapsed : 0,
    };
  }

  resetMetrics(): void {
    this.conflictsDetected = 0;
    this.conflictsResolved = 0;
    this.lastMetricsReset = Date.now();
  }

  // ===========================================================================
  // Event Listeners
  // ===========================================================================

  onConflict(listener: (event: ConflictEvent) => void): () => void {
    this.conflictListeners.push(listener);
    return () => {
      const idx = this.conflictListeners.indexOf(listener);
      if (idx >= 0) this.conflictListeners.splice(idx, 1);
    };
  }

  onStrategyChange(
    listener: GatewayEventHandler<'strategy:changed'>,
  ): () => void {
    this.strategyChangeListeners.push(listener);
    return () => {
      const idx = this.strategyChangeListeners.indexOf(listener);
      if (idx >= 0) this.strategyChangeListeners.splice(idx, 1);
    };
  }

  private emitConflict(event: ConflictEvent): void {
    for (const listener of this.conflictListeners) {
      listener(event);
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Remove entities that haven't been updated within the given TTL.
   */
  pruneStaleEntities(ttlMs: number): number {
    const now = Date.now();
    let pruned = 0;
    for (const [entityId, tracker] of this.entities) {
      if (now - tracker.lastUpdate > ttlMs) {
        this.entities.delete(entityId);
        pruned++;
      }
    }
    return pruned;
  }

  /**
   * Compact operation logs to reduce memory.
   * Keeps only the last N operations per entity.
   */
  compactOperationLogs(maxOpsPerEntity: number = 100): void {
    for (const [, tracker] of this.entities) {
      if (tracker.operationLog.length > maxOpsPerEntity) {
        tracker.operationLog = tracker.operationLog.slice(-maxOpsPerEntity);
      }
    }
  }

  dispose(): void {
    this.entities.clear();
    this.activeNodes.clear();
    this.partitions.clear();
    this.operationBuffer.length = 0;
    this.conflictListeners.length = 0;
    this.strategyChangeListeners.length = 0;
    this.nodeClocks.clear();
  }
}
