/**
 * Sync — Delta-based state synchronization utilities
 *
 * Provides efficient state synchronization through delta compression,
 * Merkle tree integrity checking, conflict resolution, undo/redo,
 * snapshot management, and centralized coordination.
 *
 * @module sync
 */

import type { VectorClock } from './crdt';
import { createVectorClock, incrementClock, mergeClock, compareClock } from './crdt';

// =============================================================================
// Delta Sync Manager
// =============================================================================

export interface DeltaEntry {
  id: string;
  path: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  nodeId: string;
  sequence: number;
}

export class DeltaSyncManager {
  private deltas: DeltaEntry[] = [];
  private sequence: number = 0;
  private maxDeltaAge: number;
  readonly nodeId: string;

  constructor(nodeId: string, options: { maxDeltaAge?: number } = {}) {
    this.nodeId = nodeId;
    this.maxDeltaAge = options.maxDeltaAge ?? 60_000; // 60s
  }

  recordDelta(path: string, oldValue: any, newValue: any): DeltaEntry {
    const delta: DeltaEntry = {
      id: `${this.nodeId}_d${++this.sequence}`,
      path,
      oldValue,
      newValue,
      timestamp: Date.now(),
      nodeId: this.nodeId,
      sequence: this.sequence,
    };
    this.deltas.push(delta);
    return delta;
  }

  getDeltasSince(sequence: number): DeltaEntry[] {
    return this.deltas.filter((d) => d.sequence > sequence);
  }

  applyDeltas(deltas: DeltaEntry[], state: Record<string, any>): Record<string, any> {
    const result = { ...state };
    for (const delta of deltas.sort((a, b) => a.sequence - b.sequence)) {
      this.setPath(result, delta.path, delta.newValue);
    }
    return result;
  }

  pruneOldDeltas(): number {
    const cutoff = Date.now() - this.maxDeltaAge;
    const before = this.deltas.length;
    this.deltas = this.deltas.filter((d) => d.timestamp > cutoff);
    return before - this.deltas.length;
  }

  getLatestSequence(): number {
    return this.sequence;
  }

  getDeltaCount(): number {
    return this.deltas.length;
  }

  private setPath(obj: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
}

// =============================================================================
// Merkle Tree Sync
// =============================================================================

interface MerkleNode {
  hash: string;
  children?: Map<string, MerkleNode>;
  value?: any;
}

export class MerkleTreeSync {
  private root: MerkleNode = { hash: '' };
  readonly nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  update(key: string, value: any): void {
    const parts = key.split('.');
    let current = this.root;
    if (!current.children) current.children = new Map();

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current.children!.has(parts[i])) {
        current.children!.set(parts[i], { hash: '', children: new Map() });
      }
      current = current.children!.get(parts[i])!;
      if (!current.children) current.children = new Map();
    }

    const leaf = parts[parts.length - 1];
    current.children!.set(leaf, {
      hash: this.hashValue(value),
      value,
    });

    this.rehash(this.root);
  }

  getRootHash(): string {
    return this.root.hash;
  }

  diff(otherRootHash: string): boolean {
    return this.root.hash !== otherRootHash;
  }

  getDiffKeys(otherTree: MerkleTreeSync): string[] {
    const diffs: string[] = [];
    this.diffNodes(this.root, otherTree.root, '', diffs);
    return diffs;
  }

  get(key: string): any {
    const parts = key.split('.');
    let current = this.root;
    for (const part of parts) {
      if (!current.children?.has(part)) return undefined;
      current = current.children.get(part)!;
    }
    return current.value;
  }

  private diffNodes(a: MerkleNode, b: MerkleNode, prefix: string, diffs: string[]): void {
    if (a.hash === b.hash) return;

    if (!a.children && !b.children) {
      if (prefix) diffs.push(prefix);
      return;
    }

    const allKeys = new Set([
      ...(a.children?.keys() || []),
      ...(b.children?.keys() || []),
    ]);

    for (const key of allKeys) {
      const childPath = prefix ? `${prefix}.${key}` : key;
      const aChild = a.children?.get(key) || { hash: '' };
      const bChild = b.children?.get(key) || { hash: '' };
      this.diffNodes(aChild, bChild, childPath, diffs);
    }
  }

  private hashValue(value: any): string {
    const str = JSON.stringify(value);
    // Simple hash (FNV-1a-like)
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  private rehash(node: MerkleNode): string {
    if (!node.children || node.children.size === 0) {
      return node.hash;
    }
    const childHashes: string[] = [];
    for (const [key, child] of Array.from(node.children.entries()).sort()) {
      childHashes.push(`${key}:${this.rehash(child)}`);
    }
    node.hash = this.hashValue(childHashes.join('|'));
    return node.hash;
  }
}

// =============================================================================
// Conflict Resolver
// =============================================================================

export type ConflictStrategy =
  | 'last-writer-wins'
  | 'first-writer-wins'
  | 'merge'
  | 'custom';

export interface ConflictEvent {
  key: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: number;
  remoteTimestamp: number;
  resolved: any;
  strategy: ConflictStrategy;
}

export type CustomResolver = (key: string, local: any, remote: any) => any;

export class ConflictResolver {
  private strategy: ConflictStrategy;
  private customResolver?: CustomResolver;
  private conflicts: ConflictEvent[] = [];

  constructor(strategy: ConflictStrategy = 'last-writer-wins', customResolver?: CustomResolver) {
    this.strategy = strategy;
    this.customResolver = customResolver;
  }

  resolve(
    key: string,
    localValue: any,
    remoteValue: any,
    localTimestamp: number = 0,
    remoteTimestamp: number = 0
  ): any {
    let resolved: any;

    switch (this.strategy) {
      case 'last-writer-wins':
        resolved = remoteTimestamp >= localTimestamp ? remoteValue : localValue;
        break;
      case 'first-writer-wins':
        resolved = localTimestamp <= remoteTimestamp ? localValue : remoteValue;
        break;
      case 'merge':
        resolved = this.mergeValues(localValue, remoteValue);
        break;
      case 'custom':
        if (!this.customResolver) throw new Error('Custom resolver not provided');
        resolved = this.customResolver(key, localValue, remoteValue);
        break;
    }

    this.conflicts.push({
      key,
      localValue,
      remoteValue,
      localTimestamp,
      remoteTimestamp,
      resolved,
      strategy: this.strategy,
    });

    return resolved;
  }

  getConflicts(): ConflictEvent[] {
    return [...this.conflicts];
  }

  getConflictCount(): number {
    return this.conflicts.length;
  }

  clearConflicts(): void {
    this.conflicts = [];
  }

  private mergeValues(a: any, b: any): any {
    if (Array.isArray(a) && Array.isArray(b)) {
      return [...new Set([...a, ...b])];
    }
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
      return { ...a, ...b };
    }
    // For primitives, fall back to last-writer-wins
    return b;
  }
}

// =============================================================================
// State Undo Manager
// =============================================================================

interface UndoEntry {
  id: string;
  timestamp: number;
  deltas: Array<{ path: string; oldValue: any; newValue: any }>;
  description?: string;
}

export class StateUndoManager {
  private undoStack: UndoEntry[] = [];
  private redoStack: UndoEntry[] = [];
  private maxHistory: number;
  private currentBatch: UndoEntry | null = null;

  constructor(options: { maxHistory?: number } = {}) {
    this.maxHistory = options.maxHistory ?? 100;
  }

  beginBatch(description?: string): void {
    this.currentBatch = {
      id: `undo_${Date.now()}`,
      timestamp: Date.now(),
      deltas: [],
      description,
    };
  }

  record(path: string, oldValue: any, newValue: any): void {
    const delta = { path, oldValue, newValue };
    if (this.currentBatch) {
      this.currentBatch.deltas.push(delta);
    } else {
      this.undoStack.push({
        id: `undo_${Date.now()}`,
        timestamp: Date.now(),
        deltas: [delta],
      });
      this.trimStack();
    }
    this.redoStack = []; // Clear redo on new action
  }

  endBatch(): void {
    if (this.currentBatch && this.currentBatch.deltas.length > 0) {
      this.undoStack.push(this.currentBatch);
      this.trimStack();
    }
    this.currentBatch = null;
  }

  undo(state: Record<string, any>): Record<string, any> | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;

    const result = { ...state };
    // Apply deltas in reverse
    for (let i = entry.deltas.length - 1; i >= 0; i--) {
      const delta = entry.deltas[i];
      this.setPath(result, delta.path, delta.oldValue);
    }
    this.redoStack.push(entry);
    return result;
  }

  redo(state: Record<string, any>): Record<string, any> | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;

    const result = { ...state };
    for (const delta of entry.deltas) {
      this.setPath(result, delta.path, delta.newValue);
    }
    this.undoStack.push(entry);
    return result;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoCount(): number {
    return this.undoStack.length;
  }

  getRedoCount(): number {
    return this.redoStack.length;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.currentBatch = null;
  }

  private trimStack(): void {
    while (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  private setPath(obj: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
}

// =============================================================================
// Snapshot Manager
// =============================================================================

export interface Snapshot {
  id: string;
  timestamp: number;
  state: Record<string, any>;
  metadata?: Record<string, any>;
  nodeId: string;
}

export class SnapshotManager {
  private snapshots: Snapshot[] = [];
  private maxSnapshots: number;
  private autoSnapshotInterval: number;
  private lastAutoSnapshot: number = 0;
  readonly nodeId: string;

  constructor(nodeId: string, options: { maxSnapshots?: number; autoSnapshotInterval?: number } = {}) {
    this.nodeId = nodeId;
    this.maxSnapshots = options.maxSnapshots ?? 50;
    this.autoSnapshotInterval = options.autoSnapshotInterval ?? 30_000;
  }

  createSnapshot(state: Record<string, any>, metadata?: Record<string, any>): Snapshot {
    const snapshot: Snapshot = {
      id: `snap_${this.nodeId}_${Date.now()}`,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(state)), // deep copy
      metadata,
      nodeId: this.nodeId,
    };
    this.snapshots.push(snapshot);
    this.lastAutoSnapshot = Date.now();

    // Trim
    while (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  shouldAutoSnapshot(): boolean {
    return Date.now() - this.lastAutoSnapshot >= this.autoSnapshotInterval;
  }

  getLatestSnapshot(): Snapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  getSnapshot(id: string): Snapshot | null {
    return this.snapshots.find((s) => s.id === id) || null;
  }

  getSnapshotAt(timestamp: number): Snapshot | null {
    // Find closest snapshot at or before the given timestamp
    for (let i = this.snapshots.length - 1; i >= 0; i--) {
      if (this.snapshots[i].timestamp <= timestamp) {
        return this.snapshots[i];
      }
    }
    return null;
  }

  getSnapshotCount(): number {
    return this.snapshots.length;
  }

  restoreSnapshot(id: string): Record<string, any> | null {
    const snap = this.getSnapshot(id);
    return snap ? JSON.parse(JSON.stringify(snap.state)) : null;
  }

  clear(): void {
    this.snapshots = [];
  }

  pruneOlderThan(maxAge: number): number {
    const cutoff = Date.now() - maxAge;
    const before = this.snapshots.length;
    this.snapshots = this.snapshots.filter((s) => s.timestamp > cutoff);
    return before - this.snapshots.length;
  }
}

// =============================================================================
// Sync Coordinator
// =============================================================================

export type SyncMode = 'full' | 'delta' | 'merkle';

export interface SyncPeer {
  id: string;
  lastSync: number;
  lastSequence: number;
  rtt: number;
}

export interface SyncEvent {
  type: 'sync-start' | 'sync-complete' | 'conflict' | 'snapshot';
  peerId: string;
  timestamp: number;
  data?: any;
}

export class SyncCoordinator {
  private deltaManager: DeltaSyncManager;
  private merkleTree: MerkleTreeSync;
  private conflictResolver: ConflictResolver;
  private snapshotManager: SnapshotManager;
  private undoManager: StateUndoManager;
  private peers: Map<string, SyncPeer> = new Map();
  private events: SyncEvent[] = [];
  private syncRate: number;
  private mode: SyncMode;
  readonly nodeId: string;

  constructor(
    nodeId: string,
    options: {
      syncRate?: number;
      mode?: SyncMode;
      conflictStrategy?: ConflictStrategy;
      maxSnapshots?: number;
      maxUndoHistory?: number;
    } = {}
  ) {
    this.nodeId = nodeId;
    this.syncRate = options.syncRate ?? 20;
    this.mode = options.mode ?? 'delta';
    this.deltaManager = new DeltaSyncManager(nodeId);
    this.merkleTree = new MerkleTreeSync(nodeId);
    this.conflictResolver = new ConflictResolver(options.conflictStrategy ?? 'last-writer-wins');
    this.snapshotManager = new SnapshotManager(nodeId, { maxSnapshots: options.maxSnapshots });
    this.undoManager = new StateUndoManager({ maxHistory: options.maxUndoHistory });
  }

  registerPeer(peerId: string): void {
    this.peers.set(peerId, {
      id: peerId,
      lastSync: 0,
      lastSequence: 0,
      rtt: 0,
    });
  }

  removePeer(peerId: string): void {
    this.peers.delete(peerId);
  }

  recordChange(path: string, oldValue: any, newValue: any): DeltaEntry {
    this.merkleTree.update(path, newValue);
    this.undoManager.record(path, oldValue, newValue);
    return this.deltaManager.recordDelta(path, oldValue, newValue);
  }

  getSyncPayload(peerId: string): { mode: SyncMode; deltas?: DeltaEntry[]; rootHash?: string; state?: Record<string, any> } {
    const peer = this.peers.get(peerId);
    if (!peer) throw new Error(`Unknown peer: ${peerId}`);

    switch (this.mode) {
      case 'delta':
        return {
          mode: 'delta',
          deltas: this.deltaManager.getDeltasSince(peer.lastSequence),
        };
      case 'merkle':
        return {
          mode: 'merkle',
          rootHash: this.merkleTree.getRootHash(),
          deltas: this.deltaManager.getDeltasSince(peer.lastSequence),
        };
      case 'full': {
        const snap = this.snapshotManager.getLatestSnapshot();
        return { mode: 'full', state: snap?.state || {} };
      }
    }
  }

  receiveSyncPayload(
    peerId: string,
    payload: { deltas?: DeltaEntry[]; state?: Record<string, any> },
    currentState: Record<string, any>
  ): Record<string, any> {
    const peer = this.peers.get(peerId);

    if (payload.deltas) {
      const result = this.deltaManager.applyDeltas(payload.deltas, currentState);
      if (peer) {
        const maxSeq = Math.max(...payload.deltas.map((d) => d.sequence), peer.lastSequence);
        peer.lastSequence = maxSeq;
        peer.lastSync = Date.now();
      }
      return result;
    }

    if (payload.state) {
      if (peer) {
        peer.lastSync = Date.now();
      }
      return { ...payload.state };
    }

    return currentState;
  }

  createSnapshot(state: Record<string, any>): Snapshot {
    return this.snapshotManager.createSnapshot(state);
  }

  undo(state: Record<string, any>): Record<string, any> | null {
    return this.undoManager.undo(state);
  }

  redo(state: Record<string, any>): Record<string, any> | null {
    return this.undoManager.redo(state);
  }

  getConflicts(): ConflictEvent[] {
    return this.conflictResolver.getConflicts();
  }

  getPeerCount(): number {
    return this.peers.size;
  }

  getSyncRate(): number {
    return this.syncRate;
  }

  getMode(): SyncMode {
    return this.mode;
  }

  getDeltaManager(): DeltaSyncManager {
    return this.deltaManager;
  }

  getMerkleTree(): MerkleTreeSync {
    return this.merkleTree;
  }

  getSnapshotManager(): SnapshotManager {
    return this.snapshotManager;
  }

  getStats(): {
    peers: number;
    pendingDeltas: number;
    snapshots: number;
    conflicts: number;
    undoAvailable: number;
    redoAvailable: number;
  } {
    return {
      peers: this.peers.size,
      pendingDeltas: this.deltaManager.getDeltaCount(),
      snapshots: this.snapshotManager.getSnapshotCount(),
      conflicts: this.conflictResolver.getConflictCount(),
      undoAvailable: this.undoManager.getUndoCount(),
      redoAvailable: this.undoManager.getRedoCount(),
    };
  }
}
