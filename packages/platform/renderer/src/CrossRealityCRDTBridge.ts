/**
 * CrossRealityCRDTBridge
 *
 * Wires AuthenticatedCRDTEngine into the cross-reality handoff pipeline.
 *
 * RESPONSIBILITIES:
 * 1. Snapshot MVC state from CRDT -> MVCPayload before handoff
 * 2. Apply incoming MVCPayload -> CRDT operations after handoff receive
 * 3. Real-time delta sync: broadcast CRDT ops to connected peers
 * 4. Conflict resolution: track and report merge conflicts
 * 5. State diff: compute minimal delta between local and remote state
 *
 * MVC PAYLOAD CATEGORIES (mapped to CRDT key prefixes):
 *   mvc.decisionHistory.*   -> MVCPayload.decisionHistory
 *   mvc.activeTask.*        -> MVCPayload.activeTask
 *   mvc.userPreferences.*   -> MVCPayload.userPreferences
 *   mvc.spatialContext.*    -> MVCPayload.spatialContext
 *   mvc.evidenceTrail.*     -> MVCPayload.evidenceTrail
 *
 * @module CrossRealityCRDTBridge
 */

import { logger } from './logger';
import type {
  MVCPayload,
  FormFactor,
  EmbodimentType,
  DecisionHistory,
  ActiveTaskState,
  UserPreferences,
  SpatialContextSummary,
  EvidenceTrail,
} from './CrossRealityContinuityTypes';
import {
  DEFAULT_EMBODIMENT,
  createEmptyDecisionHistory,
  createEmptyActiveTaskState,
  createDefaultUserPreferences,
  createEmptySpatialContext,
  createEmptyEvidenceTrail,
} from './CrossRealityContinuityTypes';
import {
  AuthenticatedCRDTEngine,
  compressOperationBatch,
} from './AuthenticatedCRDTEngine';
import type {
  AuthenticatedCRDTEngineConfig,
  AuthenticatedCRDTOperation,
} from './AuthenticatedCRDTEngine';
import type { NetworkTransportAdapter } from './NetworkTransportAdapter';

// =============================================================================
// TYPES
// =============================================================================

/**
 * The five MVC categories that map to CRDT key prefixes.
 * Each category corresponds to one of the 5 MVC objects in the handoff payload.
 */
const MVC_CATEGORIES = [
  'decisionHistory',
  'activeTask',
  'userPreferences',
  'spatialContext',
  'evidenceTrail',
] as const;

type MVCCategory = (typeof MVC_CATEGORIES)[number];

export interface CRDTBridgeConfig {
  /** CRDT engine config */
  crdtConfig: AuthenticatedCRDTEngineConfig;
  /** Enable real-time delta sync to peers (default: true) */
  realtimeSync?: boolean;
  /** Batch delta sync interval in ms (default: 100ms, 0 = immediate) */
  syncIntervalMs?: number;
  /** Maximum pending operations before force-flush (default: 50) */
  maxPendingOps?: number;
}

export interface MVCSnapshot {
  payload: MVCPayload;
  vectorClock: Record<string, number>;
  snapshotTimestamp: number;
  stateSize: number;
}

export interface CRDTConflict {
  key: string;
  localValue: unknown;
  remoteValue: unknown;
  resolvedTo: 'local' | 'remote';
  timestamp: number;
}

export interface CRDTBridgeMetrics {
  operationsSynced: number;
  conflictsResolved: number;
  snapshotsTaken: number;
  deltaSyncs: number;
  averageSyncLatencyMs: number;
  pendingOperations: number;
}

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export class CrossRealityCRDTBridge {
  readonly engine: AuthenticatedCRDTEngine;
  private transport: NetworkTransportAdapter | null = null;
  private pendingOps: AuthenticatedCRDTOperation[] = [];
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private config: Required<CRDTBridgeConfig>;
  private metrics: CRDTBridgeMetrics;
  private conflicts: CRDTConflict[] = [];
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(config: CRDTBridgeConfig) {
    this.config = {
      realtimeSync: true,
      syncIntervalMs: 100,
      maxPendingOps: 50,
      ...config,
    };
    this.engine = new AuthenticatedCRDTEngine(config.crdtConfig);
    this.metrics = {
      operationsSynced: 0,
      conflictsResolved: 0,
      snapshotsTaken: 0,
      deltaSyncs: 0,
      averageSyncLatencyMs: 0,
      pendingOperations: 0,
    };

    logger.info('[CRDTBridge] Initialized', {
      deviceId: config.crdtConfig.deviceId,
      realtimeSync: this.config.realtimeSync,
      syncIntervalMs: this.config.syncIntervalMs,
    });
  }

  // ---------------------------------------------------------------------------
  // TRANSPORT WIRING
  // ---------------------------------------------------------------------------

  /**
   * Attach a NetworkTransportAdapter for real-time delta sync.
   *
   * Listens for incoming CRDT deltas and batches on the transport,
   * and optionally starts a flush timer for outbound operations.
   */
  attachTransport(transport: NetworkTransportAdapter): void {
    this.transport = transport;

    // Listen for incoming CRDT deltas from peers
    transport.onMessage('sync:crdt-delta', (msg) => {
      const ops = msg.payload as AuthenticatedCRDTOperation[];
      this.applyRemoteOperations(ops);
    });

    transport.onMessage('sync:crdt-batch', (msg) => {
      const batch = msg.payload as { operations: AuthenticatedCRDTOperation[] };
      this.applyRemoteOperations(batch.operations);
    });

    // Start periodic flush if configured
    if (this.config.realtimeSync && this.config.syncIntervalMs > 0) {
      this.syncTimer = setInterval(
        () => this.flushPendingOps(),
        this.config.syncIntervalMs,
      );
    }

    logger.info('[CRDTBridge] Transport attached');
  }

  /**
   * Detach the current transport and stop the sync timer.
   */
  detachTransport(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.transport = null;
    logger.info('[CRDTBridge] Transport detached');
  }

  // ---------------------------------------------------------------------------
  // MVC <-> CRDT STATE MAPPING
  // ---------------------------------------------------------------------------

  /**
   * Set an MVC field in CRDT state.
   *
   * @param category - One of the 5 MVC categories (e.g. 'decisionHistory')
   * @param key      - Field name within the category
   * @param value    - Value to store
   */
  setMVCField(category: MVCCategory, key: string, value: unknown): void {
    const crdtKey = `mvc.${category}.${key}`;
    const op = this.engine.set(crdtKey, value);
    this.queueForSync(op);
  }

  /**
   * Get an MVC field from CRDT state.
   */
  getMVCField<T>(category: MVCCategory, key: string): T | undefined {
    return this.engine.get<T>(`mvc.${category}.${key}`);
  }

  /**
   * Snapshot current CRDT state into a full MVCPayload for handoff.
   *
   * Extracts all mvc.* prefixed keys from the CRDT engine and maps them
   * into the typed MVCPayload structure. Fields that have no CRDT entries
   * fall back to empty/default objects from the factory functions.
   */
  snapshotForHandoff(
    agentId: string,
    agentName: string,
    sourceFormFactor: FormFactor,
    targetFormFactor: FormFactor,
    sourceEmbodiment?: EmbodimentType,
    targetEmbodiment?: EmbodimentType,
  ): MVCSnapshot {
    const state = this.engine.getState();
    const now = Date.now();
    const handoffId = `handoff:${agentId}:${now}:${Math.random().toString(36).substring(2, 8)}`;

    // Extract each MVC category from CRDT state, falling back to defaults
    const decisionHistory = this.extractCategoryOrDefault<DecisionHistory>(
      state,
      'decisionHistory',
      createEmptyDecisionHistory(),
    );
    const activeTask = this.extractCategoryOrDefault<ActiveTaskState>(
      state,
      'activeTask',
      createEmptyActiveTaskState(),
    );
    const userPreferences = this.extractCategoryOrDefault<UserPreferences>(
      state,
      'userPreferences',
      createDefaultUserPreferences(),
    );
    const spatialContext = this.extractCategoryOrDefault<SpatialContextSummary>(
      state,
      'spatialContext',
      createEmptySpatialContext(sourceFormFactor),
    );
    const evidenceTrail = this.extractCategoryOrDefault<EvidenceTrail>(
      state,
      'evidenceTrail',
      createEmptyEvidenceTrail(),
    );

    const payload: MVCPayload = {
      version: 1,
      handoffId,
      agentId,
      agentName,
      decisionHistory,
      activeTask,
      userPreferences,
      spatialContext,
      evidenceTrail,
      sourceFormFactor,
      targetFormFactor,
      sourceEmbodiment: sourceEmbodiment ?? DEFAULT_EMBODIMENT[sourceFormFactor],
      targetEmbodiment: targetEmbodiment ?? DEFAULT_EMBODIMENT[targetFormFactor],
      createdAt: now,
      expiresAt: now + 5 * 60 * 1000, // 5 minutes
    };

    this.metrics.snapshotsTaken++;
    logger.info('[CRDTBridge] Snapshot taken for handoff', {
      handoffId,
      sourceFormFactor,
      targetFormFactor,
    });

    return {
      payload,
      vectorClock: this.engine.getVectorClock(),
      snapshotTimestamp: now,
      stateSize: JSON.stringify(payload).length,
    };
  }

  /**
   * Apply a received MVCPayload into CRDT state after a handoff.
   *
   * Each field within the 5 MVC categories is written as an individual
   * CRDT set operation, enabling fine-grained conflict tracking.
   *
   * Conflicts are detected when a local value differs from the incoming
   * remote value. Resolution follows LWW semantics: remote wins (the
   * payload is from the authoritative source device).
   */
  applyHandoffPayload(payload: MVCPayload): { applied: number; conflicts: number } {
    let applied = 0;
    let conflicts = 0;

    // Map MVCPayload fields to CRDT category writes
    const categoryData: Array<[MVCCategory, Record<string, unknown>]> = [
      ['decisionHistory', payload.decisionHistory as unknown as Record<string, unknown>],
      ['activeTask', payload.activeTask as unknown as Record<string, unknown>],
      ['userPreferences', payload.userPreferences as unknown as Record<string, unknown>],
      ['spatialContext', payload.spatialContext as unknown as Record<string, unknown>],
      ['evidenceTrail', payload.evidenceTrail as unknown as Record<string, unknown>],
    ];

    for (const [cat, obj] of categoryData) {
      if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          const crdtKey = `mvc.${cat}.${key}`;
          const existing = this.engine.get(crdtKey);

          if (
            existing !== undefined &&
            JSON.stringify(existing) !== JSON.stringify(value)
          ) {
            this.conflicts.push({
              key: crdtKey,
              localValue: existing,
              remoteValue: value,
              resolvedTo: 'remote', // LWW: remote wins (authoritative source)
              timestamp: Date.now(),
            });
            conflicts++;
            this.metrics.conflictsResolved++;
          }

          this.engine.set(crdtKey, value);
          applied++;
        }
      }
    }

    this.emit('handoff:applied', { applied, conflicts, handoffId: payload.handoffId });
    logger.info('[CRDTBridge] Handoff payload applied', {
      handoffId: payload.handoffId,
      applied,
      conflicts,
    });

    return { applied, conflicts };
  }

  /**
   * Compute a delta of pending operations since a given vector clock.
   *
   * Returns all operations that have not yet been flushed to peers.
   * In a production implementation, this would filter by comparing
   * per-node counters in the vector clock.
   */
  computeDelta(
    _sinceVectorClock: Record<string, number>,
  ): AuthenticatedCRDTOperation[] {
    // Return pending ops (future: filter by vector clock comparison)
    return [...this.pendingOps];
  }

  // ---------------------------------------------------------------------------
  // METRICS & CONFLICTS
  // ---------------------------------------------------------------------------

  getMetrics(): CRDTBridgeMetrics {
    return {
      ...this.metrics,
      pendingOperations: this.pendingOps.length,
    };
  }

  getConflicts(): CRDTConflict[] {
    return [...this.conflicts];
  }

  clearConflicts(): void {
    this.conflicts = [];
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  on(event: string, handler: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: (data: any) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  dispose(): void {
    this.detachTransport();
    this.pendingOps = [];
    this.conflicts = [];
    this.listeners.clear();
    logger.info('[CRDTBridge] Disposed');
  }

  // ---------------------------------------------------------------------------
  // INTERNAL
  // ---------------------------------------------------------------------------

  private applyRemoteOperations(ops: AuthenticatedCRDTOperation[]): void {
    const results = this.engine.applyRemoteBatch(ops);
    let applied = 0;
    for (const r of results) {
      if (r.valid) applied++;
    }
    this.metrics.operationsSynced += applied;
    this.emit('sync:received', { total: ops.length, applied });
    logger.info('[CRDTBridge] Applied remote operations', {
      total: ops.length,
      applied,
    });
  }

  private queueForSync(op: AuthenticatedCRDTOperation): void {
    this.pendingOps.push(op);
    if (
      this.config.syncIntervalMs === 0 ||
      this.pendingOps.length >= this.config.maxPendingOps
    ) {
      this.flushPendingOps();
    }
  }

  private flushPendingOps(): void {
    if (this.pendingOps.length === 0 || !this.transport) return;

    const start = performance.now();

    if (this.pendingOps.length > 5) {
      // Compress into a batch for bandwidth efficiency
      const batch = compressOperationBatch(
        this.pendingOps,
        this.engine.getIdentity().did,
        this.config.crdtConfig.deviceId,
      );
      this.transport.broadcast('sync:crdt-batch', batch);
    } else {
      // Send individual deltas
      this.transport.broadcast('sync:crdt-delta', this.pendingOps);
    }

    const elapsed = performance.now() - start;
    this.metrics.deltaSyncs++;
    this.metrics.operationsSynced += this.pendingOps.length;
    this.metrics.averageSyncLatencyMs =
      (this.metrics.averageSyncLatencyMs * (this.metrics.deltaSyncs - 1) +
        elapsed) /
      this.metrics.deltaSyncs;

    this.pendingOps = [];
  }

  /**
   * Extract a CRDT category and merge fields onto a default object.
   *
   * Reads all keys matching `mvc.{category}.*` from the CRDT state map
   * and overlays them onto the provided default, so that any fields not
   * present in CRDT still have valid default values.
   */
  private extractCategoryOrDefault<T extends Record<string, unknown>>(
    state: Record<string, unknown>,
    category: MVCCategory,
    defaultValue: T,
  ): T {
    const prefix = `mvc.${category}.`;
    const result = { ...defaultValue };
    for (const [key, value] of Object.entries(state)) {
      if (key.startsWith(prefix)) {
        const field = key.slice(prefix.length);
        (result as Record<string, unknown>)[field] = value;
      }
    }
    return result;
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const h of handlers) h(data);
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createCrossRealityCRDTBridge(
  config: CRDTBridgeConfig,
): CrossRealityCRDTBridge {
  return new CrossRealityCRDTBridge(config);
}
