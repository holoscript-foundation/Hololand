/**
 * DeltaCRDTSyncEngine
 *
 * Efficient delta-state CRDT synchronization engine with:
 * - Delta-based synchronization (send only changes, not full state)
 * - Integration with @holoscript/crdt for authenticated CRDTs
 * - Vector clock-based conflict detection and resolution
 * - AgentRBAC permission enforcement
 * - Automatic batching and compression of delta operations
 * - Merkle tree-based state verification
 *
 * Delta Synchronization Protocol:
 * 1. Track local vector clock for each CRDT
 * 2. On change, generate delta (only new operations since last sync)
 * 3. Batch deltas into sync messages
 * 4. Send deltas to peers with vector clock metadata
 * 5. Peers apply deltas and update their vector clocks
 * 6. Periodic full sync for consistency verification
 *
 * @module DeltaCRDTSyncEngine
 * @version 1.0.0
 */

import type {
  DIDSigner,
  SignedOperation,
  CRDTOperation,
  OperationLog,
  RBACConflictResolver,
} from '@holoscript/crdt';
import type { RBACEnforcer, AgentTokenPayload } from '@hololand/agents';
import { createHash } from 'crypto';

// ============================================================================
// Types
// ============================================================================

/**
 * Vector clock for causality tracking
 */
export type VectorClock = Record<string, number>;

/**
 * Delta operation batch
 */
export interface DeltaBatch {
  /** CRDT instance ID */
  crdtId: string;

  /** Sender agent DID */
  senderDid: string;

  /** Operations in this delta */
  operations: SignedOperation[];

  /** Sender's vector clock after these operations */
  vectorClock: VectorClock;

  /** Batch timestamp */
  timestamp: number;

  /** Merkle root hash for verification */
  merkleRoot?: string;
}

/**
 * CRDT instance metadata
 */
interface CRDTMetadata {
  /** CRDT instance ID */
  crdtId: string;

  /** CRDT instance reference */
  instance: any;

  /** CRDT type */
  crdtType: string;

  /** Local vector clock */
  vectorClock: VectorClock;

  /** Operation log */
  operationLog: SignedOperation[];

  /** Last operation ID synchronized */
  lastSyncedOperationId: string;

  /** Last sync timestamp */
  lastSyncTimestamp: number;

  /** Pending operations not yet synchronized */
  pendingOperations: SignedOperation[];

  /** Merkle tree for state verification */
  merkleTree: MerkleTree;
}

/**
 * Sync statistics for a CRDT
 */
export interface SyncStats {
  /** CRDT instance ID */
  crdtId: string;

  /** Total operations synchronized */
  totalOperations: number;

  /** Total deltas sent */
  deltasSent: number;

  /** Total deltas received */
  deltasReceived: number;

  /** Last sync timestamp */
  lastSync: number;

  /** Average delta size in bytes */
  averageDeltaSize: number;

  /** Compression ratio (compressed size / original size) */
  compressionRatio: number;
}

/**
 * Configuration for DeltaCRDTSyncEngine
 */
export interface DeltaCRDTSyncConfig {
  /** Agent DID */
  agentDid: string;

  /** DID signer for signing operations */
  didSigner: DIDSigner;

  /** RBAC enforcer for permission checks */
  rbacEnforcer: RBACEnforcer;

  /** Agent token for RBAC */
  agentToken: AgentTokenPayload;

  /** Enable delta synchronization */
  enabled: boolean;

  /** Automatic sync interval in milliseconds */
  syncInterval: number;

  /** Maximum number of operations per delta batch */
  maxBatchSize: number;

  /** Enable compression of delta batches */
  enableCompression?: boolean;

  /** Enable Merkle tree verification */
  enableMerkleVerification?: boolean;

  /** Conflict resolution strategy */
  conflictResolution?: 'lww' | 'rbac' | 'custom';
}

// ============================================================================
// Merkle Tree for State Verification
// ============================================================================

/**
 * Simple Merkle tree for verifying CRDT state integrity
 */
class MerkleTree {
  private leaves: string[] = [];
  private root: string = '';

  /**
   * Add a leaf (operation hash) to the tree
   */
  addLeaf(operationHash: string): void {
    this.leaves.push(operationHash);
    this.recomputeRoot();
  }

  /**
   * Get the Merkle root hash
   */
  getRoot(): string {
    return this.root;
  }

  /**
   * Verify that an operation is part of the tree
   */
  verify(operationHash: string): boolean {
    return this.leaves.includes(operationHash);
  }

  /**
   * Recompute the Merkle root
   */
  private recomputeRoot(): void {
    if (this.leaves.length === 0) {
      this.root = '';
      return;
    }

    let level = this.leaves.map((leaf) => this.hash(leaf));

    while (level.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = i + 1 < level.length ? level[i + 1] : left;
        nextLevel.push(this.hash(left + right));
      }
      level = nextLevel;
    }

    this.root = level[0];
  }

  private hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Serialize the tree for transmission
   */
  toJSON(): { leaves: string[]; root: string } {
    return {
      leaves: this.leaves,
      root: this.root,
    };
  }

  /**
   * Deserialize a Merkle tree
   */
  static fromJSON(data: { leaves: string[]; root: string }): MerkleTree {
    const tree = new MerkleTree();
    tree.leaves = data.leaves;
    tree.root = data.root;
    return tree;
  }
}

// ============================================================================
// DeltaCRDTSyncEngine
// ============================================================================

/**
 * Delta-based CRDT synchronization engine
 */
export class DeltaCRDTSyncEngine {
  private config: DeltaCRDTSyncConfig;
  private crdtRegistry: Map<string, CRDTMetadata> = new Map();
  private syncStats: Map<string, SyncStats> = new Map();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private operationHandlers: Set<(operation: SignedOperation, crdtId: string) => void> =
    new Set();
  private syncHandlers: Set<(crdtId: string, state: any) => void> = new Set();
  private initialized: boolean = false;

  constructor(config: DeltaCRDTSyncConfig) {
    this.config = {
      enableCompression: true,
      enableMerkleVerification: true,
      conflictResolution: 'rbac',
      ...config,
    };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Initialize the delta sync engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('DeltaCRDTSyncEngine already initialized');
    }

    if (this.config.enabled) {
      this.startSyncTimer();
    }

    this.initialized = true;
  }

  /**
   * Shutdown the delta sync engine
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    this.stopSyncTimer();

    // Final sync before shutdown
    await this.syncAll();

    this.initialized = false;
  }

  // ============================================================================
  // CRDT Registration
  // ============================================================================

  /**
   * Register a CRDT instance for synchronization
   */
  async registerCRDT(crdtId: string, crdtInstance: any): Promise<void> {
    // Permission check
    await this.checkPermission('register_crdt', { crdtId });

    if (this.crdtRegistry.has(crdtId)) {
      throw new Error(`CRDT '${crdtId}' already registered`);
    }

    const metadata: CRDTMetadata = {
      crdtId,
      instance: crdtInstance,
      crdtType: this.detectCRDTType(crdtInstance),
      vectorClock: { [this.config.agentDid]: 0 },
      operationLog: [],
      lastSyncedOperationId: '',
      lastSyncTimestamp: Date.now(),
      pendingOperations: [],
      merkleTree: new MerkleTree(),
    };

    this.crdtRegistry.set(crdtId, metadata);

    this.syncStats.set(crdtId, {
      crdtId,
      totalOperations: 0,
      deltasSent: 0,
      deltasReceived: 0,
      lastSync: Date.now(),
      averageDeltaSize: 0,
      compressionRatio: 1.0,
    });

    // Hook into CRDT operations
    this.hookCRDTOperations(metadata);
  }

  /**
   * Unregister a CRDT instance
   */
  async unregisterCRDT(crdtId: string): Promise<void> {
    if (!this.crdtRegistry.has(crdtId)) {
      return;
    }

    // Final sync before unregistering
    await this.sync(crdtId);

    this.crdtRegistry.delete(crdtId);
    this.syncStats.delete(crdtId);
  }

  // ============================================================================
  // Synchronization
  // ============================================================================

  /**
   * Synchronize a specific CRDT with peers
   */
  async sync(crdtId: string, peerDid?: string): Promise<void> {
    const metadata = this.crdtRegistry.get(crdtId);
    if (!metadata) {
      throw new Error(`CRDT '${crdtId}' not registered`);
    }

    // Permission check
    await this.checkPermission('sync_crdt', { crdtId, peerDid });

    if (metadata.pendingOperations.length === 0) {
      // No pending operations, nothing to sync
      return;
    }

    // Create delta batch
    const delta = this.createDeltaBatch(metadata);

    // Emit delta for transmission
    this.emitDelta(delta);

    // Update sync stats
    const stats = this.syncStats.get(crdtId)!;
    stats.deltasSent++;
    stats.lastSync = Date.now();

    // Mark operations as synced
    metadata.lastSyncedOperationId =
      metadata.pendingOperations[metadata.pendingOperations.length - 1]?.signature || '';
    metadata.lastSyncTimestamp = Date.now();
    metadata.pendingOperations = [];

    // Emit sync event
    this.emitSync(crdtId, metadata.instance);
  }

  /**
   * Synchronize all registered CRDTs
   */
  async syncAll(): Promise<void> {
    const syncPromises = Array.from(this.crdtRegistry.keys()).map((crdtId) =>
      this.sync(crdtId),
    );
    await Promise.all(syncPromises);
  }

  /**
   * Apply an incoming delta batch
   */
  async applyDelta(delta: DeltaBatch): Promise<void> {
    const metadata = this.crdtRegistry.get(delta.crdtId);
    if (!metadata) {
      throw new Error(`CRDT '${delta.crdtId}' not registered`);
    }

    // Permission check for each operation
    for (const operation of delta.operations) {
      await this.checkPermission('apply_operation', {
        crdtId: delta.crdtId,
        operation,
      });

      // Verify operation signature
      const verified = await this.verifyOperation(operation);
      if (!verified) {
        throw new Error(
          `Invalid operation signature from ${delta.senderDid}`,
        );
      }

      // Apply operation to CRDT
      await this.applyOperationToCRDT(metadata, operation);
    }

    // Merge vector clocks
    metadata.vectorClock = this.mergeVectorClocks(
      metadata.vectorClock,
      delta.vectorClock,
    );

    // Verify Merkle root if enabled
    if (this.config.enableMerkleVerification && delta.merkleRoot) {
      if (metadata.merkleTree.getRoot() !== delta.merkleRoot) {
        console.warn(
          `Merkle root mismatch for CRDT '${delta.crdtId}'. State may be inconsistent.`,
        );
      }
    }

    // Update stats
    const stats = this.syncStats.get(delta.crdtId)!;
    stats.deltasReceived++;
    stats.totalOperations += delta.operations.length;
    stats.lastSync = Date.now();
  }

  /**
   * Apply a single signed operation
   */
  async applyOperation(operation: SignedOperation): Promise<void> {
    // Find CRDT instance by operation metadata
    const crdtId = (operation.operation as any).crdtId;
    if (!crdtId) {
      throw new Error('Operation missing crdtId metadata');
    }

    const metadata = this.crdtRegistry.get(crdtId);
    if (!metadata) {
      throw new Error(`CRDT '${crdtId}' not registered`);
    }

    await this.applyOperationToCRDT(metadata, operation);
  }

  // ============================================================================
  // State Queries
  // ============================================================================

  /**
   * Get synchronization state for a CRDT
   */
  getSyncState(crdtId: string): {
    crdtId: string;
    crdtType: string;
    lastOperationId: string;
    vectorClock: VectorClock;
    pendingOperations: number;
    lastSync: number;
  } | null {
    const metadata = this.crdtRegistry.get(crdtId);
    if (!metadata) return null;

    return {
      crdtId: metadata.crdtId,
      crdtType: metadata.crdtType,
      lastOperationId: metadata.lastSyncedOperationId,
      vectorClock: { ...metadata.vectorClock },
      pendingOperations: metadata.pendingOperations.length,
      lastSync: metadata.lastSyncTimestamp,
    };
  }

  /**
   * Get sync statistics for a CRDT
   */
  getSyncStats(crdtId: string): SyncStats | null {
    const stats = this.syncStats.get(crdtId);
    return stats ? { ...stats } : null;
  }

  /**
   * Get all sync statistics
   */
  getAllSyncStats(): SyncStats[] {
    return Array.from(this.syncStats.values());
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Register a handler for outgoing operations
   */
  onOperation(handler: (operation: SignedOperation, crdtId: string) => void): void {
    this.operationHandlers.add(handler);
  }

  /**
   * Register a handler for sync events
   */
  onSync(handler: (crdtId: string, state: any) => void): void {
    this.syncHandlers.add(handler);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private detectCRDTType(instance: any): string {
    if (instance.constructor && instance.constructor.name) {
      return instance.constructor.name;
    }
    return 'Unknown';
  }

  private hookCRDTOperations(metadata: CRDTMetadata): void {
    // Hook into CRDT instance to capture operations
    // This is a simplified version - real implementation would use Proxy or method wrapping
    const originalMethods = ['set', 'add', 'remove', 'increment', 'decrement', 'insert'];

    originalMethods.forEach((method) => {
      if (typeof metadata.instance[method] === 'function') {
        const original = metadata.instance[method].bind(metadata.instance);
        metadata.instance[method] = async (...args: any[]) => {
          const result = original(...args);

          // Create and sign operation
          const operation: CRDTOperation = {
            type: method as any,
            args,
            timestamp: Date.now(),
            agentDid: this.config.agentDid,
            crdtId: metadata.crdtId,
          };

          const signedOperation = await this.signOperation(operation);

          // Add to pending operations
          metadata.pendingOperations.push(signedOperation);
          metadata.operationLog.push(signedOperation);

          // Update vector clock
          metadata.vectorClock[this.config.agentDid] =
            (metadata.vectorClock[this.config.agentDid] || 0) + 1;

          // Add to Merkle tree
          if (this.config.enableMerkleVerification) {
            const opHash = this.hashOperation(signedOperation);
            metadata.merkleTree.addLeaf(opHash);
          }

          return result;
        };
      }
    });
  }

  private async signOperation(operation: CRDTOperation): Promise<SignedOperation> {
    // Use DID signer to sign operation
    const payload = JSON.stringify(operation);
    const signature = await this.config.didSigner.sign(payload);

    return {
      operation,
      signature,
      signer: this.config.agentDid,
      timestamp: Date.now(),
    };
  }

  private async verifyOperation(signedOperation: SignedOperation): Promise<boolean> {
    // Verify signature using DID signer
    const payload = JSON.stringify(signedOperation.operation);
    return this.config.didSigner.verify(
      payload,
      signedOperation.signature,
      signedOperation.signer,
    );
  }

  private async applyOperationToCRDT(
    metadata: CRDTMetadata,
    operation: SignedOperation,
  ): Promise<void> {
    const op = operation.operation;
    const instance = metadata.instance;

    // Apply operation to CRDT instance
    if (typeof instance[op.type] === 'function') {
      instance[op.type](...op.args);
    }

    // Update metadata
    metadata.operationLog.push(operation);

    // Update vector clock
    if (op.agentDid) {
      metadata.vectorClock[op.agentDid] =
        Math.max(metadata.vectorClock[op.agentDid] || 0, op.timestamp || 0);
    }

    // Add to Merkle tree
    if (this.config.enableMerkleVerification) {
      const opHash = this.hashOperation(operation);
      metadata.merkleTree.addLeaf(opHash);
    }

    // Update stats
    const stats = this.syncStats.get(metadata.crdtId)!;
    stats.totalOperations++;
  }

  private createDeltaBatch(metadata: CRDTMetadata): DeltaBatch {
    const batch: DeltaBatch = {
      crdtId: metadata.crdtId,
      senderDid: this.config.agentDid,
      operations: metadata.pendingOperations.slice(0, this.config.maxBatchSize),
      vectorClock: { ...metadata.vectorClock },
      timestamp: Date.now(),
    };

    if (this.config.enableMerkleVerification) {
      batch.merkleRoot = metadata.merkleTree.getRoot();
    }

    return batch;
  }

  private mergeVectorClocks(local: VectorClock, remote: VectorClock): VectorClock {
    const merged: VectorClock = { ...local };

    for (const [agentDid, timestamp] of Object.entries(remote)) {
      merged[agentDid] = Math.max(merged[agentDid] || 0, timestamp);
    }

    return merged;
  }

  private hashOperation(operation: SignedOperation): string {
    const data = JSON.stringify(operation);
    return createHash('sha256').update(data).digest('hex');
  }

  private emitDelta(delta: DeltaBatch): void {
    // Emit delta to all operation handlers
    for (const operation of delta.operations) {
      this.operationHandlers.forEach((handler) => handler(operation, delta.crdtId));
    }
  }

  private emitSync(crdtId: string, state: any): void {
    this.syncHandlers.forEach((handler) => handler(crdtId, state));
  }

  private startSyncTimer(): void {
    this.syncTimer = setInterval(() => {
      this.syncAll().catch((err) => {
        console.error('Auto-sync failed:', err);
      });
    }, this.config.syncInterval);
  }

  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private async checkPermission(operation: string, context: any): Promise<void> {
    const decision = await this.config.rbacEnforcer.checkAccess(
      this.config.agentToken,
      operation,
      JSON.stringify(context),
    );

    if (!decision.allowed) {
      throw new Error(
        `Permission denied for operation '${operation}': ${decision.reason}`,
      );
    }
  }
}
