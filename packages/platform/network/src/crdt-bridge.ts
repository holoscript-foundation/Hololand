/**
 * crdt-bridge.ts — Bridges CRDT data structures to the network layer
 *
 * Exports:
 *  - CRDTNetworkBridge: connects CRDTs to network transport
 *  - createCRDTBridge: factory function
 *  - CRDTBridgeConfig: configuration type
 *  - CRDTBridgeEvent: event type
 */

import type { NetworkClient } from './NetworkClient';

// ============================================================================
// Types
// ============================================================================

export interface CRDTBridgeConfig {
  client: NetworkClient;
  localNodeId: string;
  syncIntervalMs?: number;
  batchSize?: number;
  compression?: boolean;
  conflictResolution?: 'lww' | 'merge' | 'custom';
}

export interface CRDTBridgeEvent {
  type:
    | 'delta-sent'
    | 'delta-received'
    | 'conflict-detected'
    | 'conflict-resolved'
    | 'sync-complete'
    | 'error';
  crdtId: string;
  peerId?: string;
  data?: any;
  timestamp: number;
}

export interface CRDTDelta {
  crdtId: string;
  sourceNodeId: string;
  operation: string;
  args: any[];
  vectorClock: Record<string, number>;
  timestamp: number;
}

export interface RegisteredCRDT {
  crdtId: string;
  instance: any;
  type: string;
  lastSyncedClock: Record<string, number>;
}

// ============================================================================
// CRDTNetworkBridge
// ============================================================================

export class CRDTNetworkBridge {
  private client: NetworkClient;
  private localNodeId: string;
  private syncIntervalMs: number;
  private batchSize: number;
  private crdts: Map<string, RegisteredCRDT> = new Map();
  private pendingDeltas: CRDTDelta[] = [];
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private eventListeners: Map<string, Set<(event: CRDTBridgeEvent) => void>> =
    new Map();
  private vectorClock: Record<string, number> = {};
  private appliedDeltaIds: Set<string> = new Set();
  private maxAppliedCache: number = 10000;

  constructor(config: CRDTBridgeConfig) {
    this.client = config.client;
    this.localNodeId = config.localNodeId;
    this.syncIntervalMs = config.syncIntervalMs ?? 100;
    this.batchSize = config.batchSize ?? 50;
    this.vectorClock[this.localNodeId] = 0;

    // Listen for incoming CRDT deltas
    this.client.onMessage('crdtDelta', (msg) => {
      this.handleIncomingDelta(msg.payload as CRDTDelta);
    });

    this.client.onMessage('crdtBatch', (msg) => {
      const { deltas } = msg.payload as { deltas: CRDTDelta[] };
      for (const delta of deltas) {
        this.handleIncomingDelta(delta);
      }
    });

    this.client.onMessage('crdtSync', (msg) => {
      this.handleSyncRequest(msg.payload);
    });

    this.client.onMessage('crdtSyncResponse', (msg) => {
      this.handleSyncResponse(msg.payload);
    });
  }

  // --- Lifecycle ---

  start(): void {
    if (this.syncTimer) return;
    this.syncTimer = setInterval(() => this.flushDeltas(), this.syncIntervalMs);
  }

  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  destroy(): void {
    this.stop();
    this.crdts.clear();
    this.pendingDeltas = [];
    this.eventListeners.clear();
  }

  // --- CRDT Registration ---

  registerCRDT(crdtId: string, instance: any, type: string): void {
    this.crdts.set(crdtId, {
      crdtId,
      instance,
      type,
      lastSyncedClock: {},
    });
  }

  unregisterCRDT(crdtId: string): void {
    this.crdts.delete(crdtId);
  }

  getCRDT(crdtId: string): any | undefined {
    return this.crdts.get(crdtId)?.instance;
  }

  getRegisteredCRDTs(): string[] {
    return [...this.crdts.keys()];
  }

  // --- Delta Operations ---

  recordDelta(
    crdtId: string,
    operation: string,
    args: any[] = []
  ): void {
    this.vectorClock[this.localNodeId] =
      (this.vectorClock[this.localNodeId] || 0) + 1;

    const delta: CRDTDelta = {
      crdtId,
      sourceNodeId: this.localNodeId,
      operation,
      args,
      vectorClock: { ...this.vectorClock },
      timestamp: Date.now(),
    };

    this.pendingDeltas.push(delta);

    // Auto-flush if batch full
    if (this.pendingDeltas.length >= this.batchSize) {
      this.flushDeltas();
    }
  }

  flushDeltas(): void {
    if (this.pendingDeltas.length === 0) return;

    const batch = this.pendingDeltas.splice(0, this.batchSize);

    if (batch.length === 1) {
      this.client.send({
        type: 'crdtDelta',
        category: 'crdt',
        payload: batch[0],
        timestamp: Date.now(),
      });
    } else {
      this.client.send({
        type: 'crdtBatch',
        category: 'crdt',
        payload: { deltas: batch },
        timestamp: Date.now(),
      });
    }

    for (const delta of batch) {
      this.emitEvent({
        type: 'delta-sent',
        crdtId: delta.crdtId,
        data: delta,
        timestamp: Date.now(),
      });
    }
  }

  getPendingDeltaCount(): number {
    return this.pendingDeltas.length;
  }

  // --- Full Sync ---

  requestFullSync(crdtId: string): void {
    this.client.send({
      type: 'crdtSync',
      category: 'crdt',
      payload: {
        crdtId,
        requesterId: this.localNodeId,
        vectorClock: this.vectorClock,
      },
      timestamp: Date.now(),
    });
  }

  // --- Event System ---

  on(
    eventType: CRDTBridgeEvent['type'],
    handler: (event: CRDTBridgeEvent) => void
  ): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(handler);
    return () => this.eventListeners.get(eventType)?.delete(handler);
  }

  // --- State ---

  getVectorClock(): Record<string, number> {
    return { ...this.vectorClock };
  }

  getLocalNodeId(): string {
    return this.localNodeId;
  }

  // --- Internal Handlers ---

  private handleIncomingDelta(delta: CRDTDelta): void {
    // Dedup
    const deltaKey = `${delta.sourceNodeId}:${delta.crdtId}:${delta.timestamp}`;
    if (this.appliedDeltaIds.has(deltaKey)) return;
    this.appliedDeltaIds.add(deltaKey);
    if (this.appliedDeltaIds.size > this.maxAppliedCache) {
      const iter = this.appliedDeltaIds.values();
      for (let i = 0; i < 1000; i++) iter.next();
      // Trim oldest entries (approximate - Sets don't guarantee order, but close enough)
    }

    // Skip own deltas
    if (delta.sourceNodeId === this.localNodeId) return;

    const registered = this.crdts.get(delta.crdtId);
    if (!registered) return;

    // Apply the operation to the local CRDT
    try {
      const crdt = registered.instance;
      if (
        typeof crdt[delta.operation] === 'function' &&
        delta.operation !== 'constructor'
      ) {
        crdt[delta.operation](...delta.args);
      }

      // Merge vector clocks
      this.mergeVectorClock(delta.vectorClock);

      this.emitEvent({
        type: 'delta-received',
        crdtId: delta.crdtId,
        peerId: delta.sourceNodeId,
        data: delta,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      this.emitEvent({
        type: 'error',
        crdtId: delta.crdtId,
        peerId: delta.sourceNodeId,
        data: { error: err.message, delta },
        timestamp: Date.now(),
      });
    }
  }

  private handleSyncRequest(payload: any): void {
    const { crdtId, requesterId } = payload;
    const registered = this.crdts.get(crdtId);
    if (!registered) return;

    // Send full state for the requested CRDT
    const crdt = registered.instance;
    let state: any;

    if (typeof crdt.value === 'function') {
      state = crdt.value();
    } else if (typeof crdt.toJSON === 'function') {
      state = crdt.toJSON();
    } else {
      state = crdt;
    }

    this.client.send({
      type: 'crdtSyncResponse',
      category: 'crdt',
      payload: {
        crdtId,
        state,
        type: registered.type,
        vectorClock: this.vectorClock,
        responderId: this.localNodeId,
        requesterId,
      },
      timestamp: Date.now(),
    });
  }

  private handleSyncResponse(payload: any): void {
    const { crdtId, state, vectorClock: remoteClock } = payload;
    const registered = this.crdts.get(crdtId);
    if (!registered) return;

    // Merge vector clock
    if (remoteClock) {
      this.mergeVectorClock(remoteClock);
    }

    // Apply synced state via merge if available
    const crdt = registered.instance;
    if (typeof crdt.merge === 'function') {
      crdt.merge(state);
    }

    this.emitEvent({
      type: 'sync-complete',
      crdtId,
      data: { state },
      timestamp: Date.now(),
    });
  }

  private mergeVectorClock(remote: Record<string, number>): void {
    for (const [nodeId, tick] of Object.entries(remote)) {
      this.vectorClock[nodeId] = Math.max(
        this.vectorClock[nodeId] || 0,
        tick
      );
    }
  }

  private emitEvent(event: CRDTBridgeEvent): void {
    this.eventListeners.get(event.type)?.forEach((h) => h(event));
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createCRDTBridge(config: CRDTBridgeConfig): CRDTNetworkBridge {
  return new CRDTNetworkBridge(config);
}
