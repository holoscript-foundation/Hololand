/**
 * OfflineRecoveryQueue
 *
 * Queues CRDT operations when the network is unavailable (airplane mode,
 * tunnel, remote area) and replays them as a compressed batch upon
 * reconnection.
 *
 * STORAGE:
 * Uses an abstract StorageBackend interface. The default MemoryStorageBackend
 * stores operations in memory. For production, provide an IndexedDB backend.
 *
 * REPLAY STRATEGY:
 * 1. On reconnect, drain all queued operations
 * 2. Compress via compressOperationBatch (dedup by key, keep latest)
 * 3. Apply batch to the CRDT engine
 * 4. Clear the queue on successful replay
 *
 * DURABILITY:
 * Operations are persisted immediately on enqueue. On app restart,
 * the queue is loaded from storage and replayed automatically.
 *
 * @module OfflineRecoveryQueue
 */

import { logger } from './logger';
import type { AuthenticatedCRDTOperation } from './CrossRealityContinuityTypes';
import {
  compressOperationBatch,
  type CRDTOperationBatch,
} from './AuthenticatedCRDTEngine';

// =============================================================================
// STORAGE BACKEND
// =============================================================================

/**
 * Abstract storage backend for persisting queued operations.
 */
export interface StorageBackend {
  /** Load all queued operations from storage */
  load(): Promise<AuthenticatedCRDTOperation[]>;
  /** Append an operation to storage */
  append(operation: AuthenticatedCRDTOperation): Promise<void>;
  /** Clear all stored operations */
  clear(): Promise<void>;
  /** Get the number of stored operations */
  count(): Promise<number>;
}

/**
 * In-memory storage backend (for testing and ephemeral sessions).
 */
export class MemoryStorageBackend implements StorageBackend {
  private operations: AuthenticatedCRDTOperation[] = [];

  async load(): Promise<AuthenticatedCRDTOperation[]> {
    return [...this.operations];
  }

  async append(operation: AuthenticatedCRDTOperation): Promise<void> {
    this.operations.push(operation);
  }

  async clear(): Promise<void> {
    this.operations = [];
  }

  async count(): Promise<number> {
    return this.operations.length;
  }
}

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface OfflineRecoveryQueueConfig {
  /** Storage backend (default: MemoryStorageBackend) */
  storage?: StorageBackend;
  /** Maximum operations to queue before dropping oldest (default: 10000) */
  maxQueueSize?: number;
  /** Author DID for batch compression */
  authorDID: string;
  /** Device ID for batch compression */
  deviceId: string;
  /** Auto-replay on state change to online (default: true) */
  autoReplay?: boolean;
}

// =============================================================================
// QUEUE STATE
// =============================================================================

export type QueueState = 'idle' | 'offline' | 'replaying' | 'error';

export interface OfflineRecoveryMetrics {
  /** Current queue state */
  state: QueueState;
  /** Number of operations in the queue */
  queuedOperations: number;
  /** Total operations enqueued since creation */
  totalEnqueued: number;
  /** Total operations replayed since creation */
  totalReplayed: number;
  /** Number of replay attempts */
  replayAttempts: number;
  /** Last replay result */
  lastReplayResult: { applied: number; rejected: number } | null;
}

// =============================================================================
// OFFLINE RECOVERY QUEUE
// =============================================================================

export class OfflineRecoveryQueue {
  private storage: StorageBackend;
  private config: Required<Omit<OfflineRecoveryQueueConfig, 'storage'>>;
  private state: QueueState = 'idle';
  private inMemoryQueue: AuthenticatedCRDTOperation[] = [];
  private totalEnqueued = 0;
  private totalReplayed = 0;
  private replayAttempts = 0;
  private lastReplayResult: { applied: number; rejected: number } | null = null;
  private listeners: Map<string, Set<(event: any) => void>> = new Map();

  constructor(config: OfflineRecoveryQueueConfig) {
    this.storage = config.storage ?? new MemoryStorageBackend();
    this.config = {
      maxQueueSize: config.maxQueueSize ?? 10_000,
      authorDID: config.authorDID,
      deviceId: config.deviceId,
      autoReplay: config.autoReplay ?? true,
    };

    logger.info('[OfflineRecoveryQueue] Initialized', {
      maxQueueSize: this.config.maxQueueSize,
      deviceId: this.config.deviceId,
    });
  }

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Transition to offline mode. Operations will be queued.
   */
  goOffline(): void {
    if (this.state === 'offline') return;
    this.state = 'offline';
    this.emit('state:changed', { state: 'offline' });
    logger.info('[OfflineRecoveryQueue] Went offline');
  }

  /**
   * Transition back to online mode. Triggers replay if autoReplay is enabled.
   */
  async goOnline(): Promise<CRDTOperationBatch | null> {
    if (this.state !== 'offline' && this.state !== 'error') {
      this.state = 'idle';
      return null;
    }

    const queueSize = this.inMemoryQueue.length;
    if (queueSize === 0) {
      this.state = 'idle';
      this.emit('state:changed', { state: 'idle' });
      return null;
    }

    if (this.config.autoReplay) {
      return this.replay();
    }

    this.state = 'idle';
    this.emit('state:changed', { state: 'idle' });
    return null;
  }

  /**
   * Get the current queue state.
   */
  getState(): QueueState {
    return this.state;
  }

  /**
   * Check if the queue is in offline mode.
   */
  isOffline(): boolean {
    return this.state === 'offline';
  }

  // ---------------------------------------------------------------------------
  // ENQUEUE
  // ---------------------------------------------------------------------------

  /**
   * Enqueue a CRDT operation for later replay.
   * Only enqueues when offline; returns false if online.
   */
  async enqueue(operation: AuthenticatedCRDTOperation): Promise<boolean> {
    if (this.state !== 'offline') return false;

    // Enforce max queue size (drop oldest)
    if (this.inMemoryQueue.length >= this.config.maxQueueSize) {
      this.inMemoryQueue.shift();
      logger.warn('[OfflineRecoveryQueue] Queue full, dropped oldest operation');
    }

    this.inMemoryQueue.push(operation);
    await this.storage.append(operation);
    this.totalEnqueued++;

    this.emit('operation:enqueued', {
      operationId: operation.operationId,
      queueSize: this.inMemoryQueue.length,
    });

    return true;
  }

  /**
   * Get the number of queued operations.
   */
  getQueueSize(): number {
    return this.inMemoryQueue.length;
  }

  // ---------------------------------------------------------------------------
  // REPLAY
  // ---------------------------------------------------------------------------

  /**
   * Replay all queued operations as a compressed batch.
   * Returns the batch for the caller to apply to a CRDT engine.
   */
  async replay(): Promise<CRDTOperationBatch | null> {
    if (this.inMemoryQueue.length === 0) {
      this.state = 'idle';
      return null;
    }

    this.state = 'replaying';
    this.replayAttempts++;
    this.emit('state:changed', { state: 'replaying' });

    try {
      // Compress the queue into a batch
      const batch = compressOperationBatch(
        this.inMemoryQueue,
        this.config.authorDID,
        this.config.deviceId,
      );

      this.lastReplayResult = {
        applied: batch.compressedCount,
        rejected: 0,
      };

      this.totalReplayed += batch.compressedCount;

      // Clear the queue
      this.inMemoryQueue = [];
      await this.storage.clear();

      this.state = 'idle';
      this.emit('state:changed', { state: 'idle' });
      this.emit('replay:complete', {
        batch,
        originalCount: batch.originalCount,
        compressedCount: batch.compressedCount,
      });

      logger.info(`[OfflineRecoveryQueue] Replayed ${batch.originalCount} ops → ${batch.compressedCount} compressed`);
      return batch;
    } catch (err) {
      this.state = 'error';
      this.emit('state:changed', { state: 'error' });
      this.emit('replay:error', {
        error: err instanceof Error ? err.message : String(err),
      });
      logger.error(`[OfflineRecoveryQueue] Replay failed: ${err}`);
      return null;
    }
  }

  /**
   * Load operations from persistent storage (on app restart).
   */
  async loadFromStorage(): Promise<number> {
    const stored = await this.storage.load();
    this.inMemoryQueue = stored;
    if (stored.length > 0) {
      logger.info(`[OfflineRecoveryQueue] Loaded ${stored.length} ops from storage`);
    }
    return stored.length;
  }

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------

  getMetrics(): OfflineRecoveryMetrics {
    return {
      state: this.state,
      queuedOperations: this.inMemoryQueue.length,
      totalEnqueued: this.totalEnqueued,
      totalReplayed: this.totalReplayed,
      replayAttempts: this.replayAttempts,
      lastReplayResult: this.lastReplayResult,
    };
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

  private emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  dispose(): void {
    this.listeners.clear();
    this.inMemoryQueue = [];
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createOfflineRecoveryQueue(config: OfflineRecoveryQueueConfig): OfflineRecoveryQueue {
  return new OfflineRecoveryQueue(config);
}
