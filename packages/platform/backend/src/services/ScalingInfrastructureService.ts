/**
 * @hololand/backend -- ScalingInfrastructureService
 *
 * Horizontal scaling utilities for the HoloLand platform. Provides three
 * subsystems that prepare the backend for multi-instance deployments:
 *
 * 1. ConnectionPoolManager
 *    - Wraps an existing db pool with configurable min/max connections
 *    - Health checks (ping) every 30 s, automatic reconnection on exhaustion
 *    - Connection acquire/release lifecycle with timeout
 *
 * 2. CacheLayer (in-memory LRU)
 *    - Configurable per-entry TTL and global max entries
 *    - get/set/invalidate/invalidatePattern + hit/miss stats
 *    - Default cache targets:
 *        world directory listings  (60 s TTL)
 *        user profiles             (300 s TTL)
 *        marketplace featured items (120 s TTL)
 *
 * 3. QueueWorker
 *    - Simple in-memory job queue for async tasks (email sending,
 *      thumbnail generation, moderation scanning)
 *    - enqueue/process/getQueueLength/getJobStatus
 *    - Configurable worker concurrency per job type (default 3)
 *
 * Usage:
 *   const pool = ConnectionPoolManager.getInstance();
 *   const conn = await pool.acquire();
 *   // ... use connection ...
 *   pool.release(conn);
 *
 *   const cache = CacheLayer.getInstance();
 *   cache.set('worlds:directory', data, 60_000);
 *   const hit = cache.get('worlds:directory');
 *
 *   const queue = QueueWorker.getInstance();
 *   queue.process('email', async (job) => { await sendEmail(job.payload); });
 *   const jobId = queue.enqueue('email', { to: 'user@example.com', template: 'welcome' });
 *
 * @version 1.0.0
 */

import crypto from 'crypto';

// =============================================================================
// Types -- ConnectionPoolManager
// =============================================================================

export interface PoolConnection {
  /** Opaque connection identifier. */
  id: string;
  /** Whether the connection is currently in use. */
  inUse: boolean;
  /** Timestamp of last successful health-check ping. */
  lastPingAt: number;
  /** Timestamp when this connection was created. */
  createdAt: number;
  /** Number of times this connection has been acquired. */
  acquireCount: number;
}

export interface ConnectionPoolConfig {
  /** Minimum connections to keep alive. Default: 5. */
  minConnections?: number;
  /** Maximum connections in the pool. Default: 20. */
  maxConnections?: number;
  /** Interval (ms) between health-check pings. Default: 30000 (30 s). */
  healthCheckIntervalMs?: number;
  /** Timeout (ms) for acquiring a connection. Default: 5000. */
  acquireTimeoutMs?: number;
  /** Maximum idle time (ms) before a surplus connection is removed. Default: 60000. */
  maxIdleMs?: number;
}

export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalAcquires: number;
  totalReleases: number;
  totalTimeouts: number;
  healthChecksPassed: number;
  healthChecksFailed: number;
}

// =============================================================================
// Types -- CacheLayer
// =============================================================================

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  /** Access count for LRU tracking. */
  accessCount: number;
  lastAccessedAt: number;
}

export interface CacheLayerConfig {
  /** Maximum number of entries in the cache. Default: 10000. */
  maxEntries?: number;
  /** Default TTL in milliseconds for entries without explicit TTL. Default: 60000 (60 s). */
  defaultTtlMs?: number;
  /** Interval (ms) between eviction sweeps. Default: 30000. */
  evictionIntervalMs?: number;
}

export interface CacheStats {
  entries: number;
  maxEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  sets: number;
  invalidations: number;
  memoryEstimateBytes: number;
}

// =============================================================================
// Types -- QueueWorker
// =============================================================================

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job<T = unknown> {
  id: string;
  type: string;
  payload: T;
  status: JobStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  attempts: number;
  maxAttempts: number;
}

export type JobHandler<T = unknown> = (job: Job<T>) => Promise<void>;

export interface QueueWorkerConfig {
  /** Default concurrency (workers) per job type. Default: 3. */
  defaultConcurrency?: number;
  /** Maximum retry attempts for failed jobs. Default: 3. */
  maxRetries?: number;
  /** Delay (ms) between retry attempts. Default: 1000. */
  retryDelayMs?: number;
  /** Maximum jobs to retain in completed/failed state. Default: 1000. */
  maxCompletedJobs?: number;
  /** Interval (ms) for the queue processor loop. Default: 100. */
  processIntervalMs?: number;
}

export interface QueueStats {
  jobTypes: string[];
  totalPending: number;
  totalProcessing: number;
  totalCompleted: number;
  totalFailed: number;
  queueLengths: Record<string, number>;
}

// =============================================================================
// Default Configurations
// =============================================================================

const POOL_DEFAULTS: Required<ConnectionPoolConfig> = {
  minConnections: 5,
  maxConnections: 20,
  healthCheckIntervalMs: 30_000,
  acquireTimeoutMs: 5_000,
  maxIdleMs: 60_000,
};

const CACHE_DEFAULTS: Required<CacheLayerConfig> = {
  maxEntries: 10_000,
  defaultTtlMs: 60_000,
  evictionIntervalMs: 30_000,
};

const QUEUE_DEFAULTS: Required<QueueWorkerConfig> = {
  defaultConcurrency: 3,
  maxRetries: 3,
  retryDelayMs: 1_000,
  maxCompletedJobs: 1_000,
  processIntervalMs: 100,
};

/** Well-known cache TTLs for platform data. */
export const CACHE_TTLS = {
  /** World directory listings. */
  WORLD_DIRECTORY: 60_000,
  /** User profiles. */
  USER_PROFILE: 300_000,
  /** Marketplace featured items. */
  MARKETPLACE_FEATURED: 120_000,
} as const;

// =============================================================================
// ConnectionPoolManager
// =============================================================================

export class ConnectionPoolManager {
  private static instance: ConnectionPoolManager | null = null;

  private readonly config: Required<ConnectionPoolConfig>;

  /** All connections in the pool (idle + active). */
  private connections: Map<string, PoolConnection> = new Map();

  /** Queue of resolve callbacks waiting for a connection. */
  private waitQueue: Array<{
    resolve: (conn: PoolConnection) => void;
    reject: (err: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }> = [];

  /** Counters for diagnostics. */
  private stats = {
    totalAcquires: 0,
    totalReleases: 0,
    totalTimeouts: 0,
    healthChecksPassed: 0,
    healthChecksFailed: 0,
  };

  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: ConnectionPoolConfig = {}) {
    this.config = {
      minConnections: config.minConnections ?? POOL_DEFAULTS.minConnections,
      maxConnections: config.maxConnections ?? POOL_DEFAULTS.maxConnections,
      healthCheckIntervalMs: config.healthCheckIntervalMs ?? POOL_DEFAULTS.healthCheckIntervalMs,
      acquireTimeoutMs: config.acquireTimeoutMs ?? POOL_DEFAULTS.acquireTimeoutMs,
      maxIdleMs: config.maxIdleMs ?? POOL_DEFAULTS.maxIdleMs,
    };

    // Pre-populate with minimum connections
    this.warmPool();
    this.startHealthCheck();
  }

  static getInstance(config?: ConnectionPoolConfig): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager(config);
    }
    return ConnectionPoolManager.instance;
  }

  // ---------------------------------------------------------------------------
  // Core API
  // ---------------------------------------------------------------------------

  /**
   * Acquire a connection from the pool. If all connections are in use and
   * the pool has not reached maxConnections, a new connection is created.
   * Otherwise, the request waits in a queue until a connection is released
   * or the acquire timeout is reached.
   */
  acquire(): Promise<PoolConnection> {
    // Try to find an idle connection
    for (const conn of this.connections.values()) {
      if (!conn.inUse) {
        conn.inUse = true;
        conn.acquireCount++;
        this.stats.totalAcquires++;
        return Promise.resolve(conn);
      }
    }

    // Can we create a new connection?
    if (this.connections.size < this.config.maxConnections) {
      const conn = this.createConnection();
      conn.inUse = true;
      conn.acquireCount++;
      this.stats.totalAcquires++;
      return Promise.resolve(conn);
    }

    // Wait in queue
    return new Promise<PoolConnection>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Remove from wait queue
        const idx = this.waitQueue.findIndex((w) => w.resolve === resolve);
        if (idx !== -1) {
          this.waitQueue.splice(idx, 1);
        }
        this.stats.totalTimeouts++;
        reject(new Error(`Connection acquire timed out after ${this.config.acquireTimeoutMs}ms`));
      }, this.config.acquireTimeoutMs);

      this.waitQueue.push({ resolve, reject, timeoutId });
    });
  }

  /**
   * Release a connection back to the pool.
   * If there are pending waiters, the connection is handed to the next waiter.
   */
  release(connection: PoolConnection): void {
    const conn = this.connections.get(connection.id);
    if (!conn) return;

    this.stats.totalReleases++;

    // If someone is waiting, hand the connection over directly
    if (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift()!;
      clearTimeout(waiter.timeoutId);
      conn.acquireCount++;
      this.stats.totalAcquires++;
      waiter.resolve(conn);
      return;
    }

    conn.inUse = false;
  }

  /**
   * Get pool diagnostics.
   */
  getStats(): PoolStats {
    let active = 0;
    let idle = 0;
    for (const conn of this.connections.values()) {
      if (conn.inUse) active++;
      else idle++;
    }

    return {
      totalConnections: this.connections.size,
      activeConnections: active,
      idleConnections: idle,
      waitingRequests: this.waitQueue.length,
      ...this.stats,
    };
  }

  /**
   * Get total number of connections in the pool.
   */
  getPoolSize(): number {
    return this.connections.size;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Reject all waiters
    for (const waiter of this.waitQueue) {
      clearTimeout(waiter.timeoutId);
      waiter.reject(new Error('Connection pool destroyed'));
    }
    this.waitQueue = [];

    this.connections.clear();

    if (ConnectionPoolManager.instance === this) {
      ConnectionPoolManager.instance = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private createConnection(): PoolConnection {
    const id = crypto.randomBytes(8).toString('hex');
    const now = Date.now();

    const conn: PoolConnection = {
      id,
      inUse: false,
      lastPingAt: now,
      createdAt: now,
      acquireCount: 0,
    };

    this.connections.set(id, conn);
    return conn;
  }

  /** Pre-populate the pool to the minimum connection count. */
  private warmPool(): void {
    while (this.connections.size < this.config.minConnections) {
      this.createConnection();
    }
  }

  /** Periodic health check: ping each connection and remove dead ones. */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      const now = Date.now();

      for (const [id, conn] of this.connections.entries()) {
        // Simulate a ping -- in production this would actually ping the DB
        const pingSuccess = this.pingConnection(conn);

        if (pingSuccess) {
          conn.lastPingAt = now;
          this.stats.healthChecksPassed++;
        } else {
          this.stats.healthChecksFailed++;
          // Remove dead connection if not in use
          if (!conn.inUse) {
            this.connections.delete(id);
          }
        }

        // Remove surplus idle connections that have been idle too long
        if (
          !conn.inUse &&
          this.connections.size > this.config.minConnections &&
          (now - conn.lastPingAt) > this.config.maxIdleMs
        ) {
          this.connections.delete(id);
        }
      }

      // Re-warm if we've dropped below minimum
      this.warmPool();
    }, this.config.healthCheckIntervalMs);

    if (this.healthCheckTimer && typeof this.healthCheckTimer === 'object' && 'unref' in this.healthCheckTimer) {
      (this.healthCheckTimer as NodeJS.Timeout).unref();
    }
  }

  /**
   * Simulate a connection health check ping.
   * In production, replace with an actual SELECT 1 or pg_isready.
   */
  private pingConnection(_conn: PoolConnection): boolean {
    // Stub: always healthy. Replace with real DB ping in production.
    return true;
  }
}

// =============================================================================
// CacheLayer
// =============================================================================

export class CacheLayer {
  private static instance: CacheLayer | null = null;

  private readonly config: Required<CacheLayerConfig>;

  private entries: Map<string, CacheEntry> = new Map();

  /** Access-order tracking for LRU eviction. */
  private accessOrder: string[] = [];

  /** Counters for cache statistics. */
  private statsCounters = {
    hits: 0,
    misses: 0,
    evictions: 0,
    sets: 0,
    invalidations: 0,
  };

  private evictionTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: CacheLayerConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? CACHE_DEFAULTS.maxEntries,
      defaultTtlMs: config.defaultTtlMs ?? CACHE_DEFAULTS.defaultTtlMs,
      evictionIntervalMs: config.evictionIntervalMs ?? CACHE_DEFAULTS.evictionIntervalMs,
    };

    this.startEviction();
  }

  static getInstance(config?: CacheLayerConfig): CacheLayer {
    if (!CacheLayer.instance) {
      CacheLayer.instance = new CacheLayer(config);
    }
    return CacheLayer.instance;
  }

  // ---------------------------------------------------------------------------
  // Core API
  // ---------------------------------------------------------------------------

  /**
   * Get a cached value by key. Returns undefined on miss or expiry.
   */
  get<T = unknown>(key: string): T | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      this.statsCounters.misses++;
      return undefined;
    }

    // Check expiry
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      this.removeFromAccessOrder(key);
      this.statsCounters.misses++;
      return undefined;
    }

    // Update LRU tracking
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();
    this.touchAccessOrder(key);

    this.statsCounters.hits++;
    return entry.value as T;
  }

  /**
   * Set a cache entry. If the cache is full, the least-recently-used entry
   * is evicted first.
   *
   * @param key    Cache key.
   * @param value  Value to cache.
   * @param ttlMs  Optional TTL override in milliseconds.
   */
  set<T = unknown>(key: string, value: T, ttlMs?: number): void {
    const now = Date.now();
    const ttl = ttlMs ?? this.config.defaultTtlMs;

    // Evict LRU if at capacity and this is a new key
    if (!this.entries.has(key) && this.entries.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      key,
      value,
      createdAt: now,
      expiresAt: now + ttl,
      accessCount: 0,
      lastAccessedAt: now,
    };

    this.entries.set(key, entry);
    this.touchAccessOrder(key);
    this.statsCounters.sets++;
  }

  /**
   * Invalidate (remove) a specific cache entry.
   */
  invalidate(key: string): boolean {
    const existed = this.entries.delete(key);
    if (existed) {
      this.removeFromAccessOrder(key);
      this.statsCounters.invalidations++;
    }
    return existed;
  }

  /**
   * Invalidate all cache entries matching a glob-like pattern.
   * Supports '*' as a wildcard that matches any sequence of characters.
   *
   * Examples:
   *   invalidatePattern('worlds:*')          -- all world cache entries
   *   invalidatePattern('user:*:profile')    -- all user profile entries
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(
      '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
    );

    let count = 0;
    for (const key of Array.from(this.entries.keys())) {
      if (regex.test(key)) {
        this.entries.delete(key);
        this.removeFromAccessOrder(key);
        count++;
      }
    }

    this.statsCounters.invalidations += count;
    return count;
  }

  /**
   * Check whether a key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      this.removeFromAccessOrder(key);
      return false;
    }
    return true;
  }

  /**
   * Get cache statistics including hit/miss ratio.
   */
  getStats(): CacheStats {
    const totalRequests = this.statsCounters.hits + this.statsCounters.misses;
    const hitRate = totalRequests > 0 ? this.statsCounters.hits / totalRequests : 0;

    // Rough memory estimate: 200 bytes overhead per entry + key/value size
    const memoryEstimate = this.entries.size * 200;

    return {
      entries: this.entries.size,
      maxEntries: this.config.maxEntries,
      hits: this.statsCounters.hits,
      misses: this.statsCounters.misses,
      hitRate,
      evictions: this.statsCounters.evictions,
      sets: this.statsCounters.sets,
      invalidations: this.statsCounters.invalidations,
      memoryEstimateBytes: memoryEstimate,
    };
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.entries.clear();
    this.accessOrder = [];
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  destroy(): void {
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer);
      this.evictionTimer = null;
    }
    this.entries.clear();
    this.accessOrder = [];

    if (CacheLayer.instance === this) {
      CacheLayer.instance = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /** Evict the least-recently-used entry. */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder.shift()!;
    this.entries.delete(lruKey);
    this.statsCounters.evictions++;
  }

  /** Move a key to the end of the access-order list (most recently used). */
  private touchAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /** Remove a key from the access-order list. */
  private removeFromAccessOrder(key: string): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }
  }

  /** Periodic sweep to remove expired entries. */
  private startEviction(): void {
    this.evictionTimer = setInterval(() => {
      const now = Date.now();

      for (const [key, entry] of this.entries.entries()) {
        if (now > entry.expiresAt) {
          this.entries.delete(key);
          this.removeFromAccessOrder(key);
          this.statsCounters.evictions++;
        }
      }
    }, this.config.evictionIntervalMs);

    if (this.evictionTimer && typeof this.evictionTimer === 'object' && 'unref' in this.evictionTimer) {
      (this.evictionTimer as NodeJS.Timeout).unref();
    }
  }
}

// =============================================================================
// QueueWorker
// =============================================================================

export class QueueWorker {
  private static instance: QueueWorker | null = null;

  private readonly config: Required<QueueWorkerConfig>;

  /** All jobs indexed by ID. */
  private jobs: Map<string, Job> = new Map();

  /** Pending job IDs per type, in FIFO order. */
  private queues: Map<string, string[]> = new Map();

  /** Registered handlers per job type. */
  private handlers: Map<string, JobHandler> = new Map();

  /** Current concurrency per job type (number of in-flight workers). */
  private activeCounts: Map<string, number> = new Map();

  /** Per-type concurrency overrides. */
  private concurrencyOverrides: Map<string, number> = new Map();

  /** Processor loop timer. */
  private processTimer: ReturnType<typeof setInterval> | null = null;

  /** Completed/failed job IDs for cleanup (oldest first). */
  private completedJobIds: string[] = [];

  constructor(config: QueueWorkerConfig = {}) {
    this.config = {
      defaultConcurrency: config.defaultConcurrency ?? QUEUE_DEFAULTS.defaultConcurrency,
      maxRetries: config.maxRetries ?? QUEUE_DEFAULTS.maxRetries,
      retryDelayMs: config.retryDelayMs ?? QUEUE_DEFAULTS.retryDelayMs,
      maxCompletedJobs: config.maxCompletedJobs ?? QUEUE_DEFAULTS.maxCompletedJobs,
      processIntervalMs: config.processIntervalMs ?? QUEUE_DEFAULTS.processIntervalMs,
    };

    this.startProcessLoop();
  }

  static getInstance(config?: QueueWorkerConfig): QueueWorker {
    if (!QueueWorker.instance) {
      QueueWorker.instance = new QueueWorker(config);
    }
    return QueueWorker.instance;
  }

  // ---------------------------------------------------------------------------
  // Core API
  // ---------------------------------------------------------------------------

  /**
   * Enqueue a new job. Returns the job ID.
   *
   * @param jobType  The type of job (must match a registered handler).
   * @param payload  Arbitrary data for the job handler.
   */
  enqueue<T = unknown>(jobType: string, payload: T): string {
    const id = crypto.randomBytes(12).toString('hex');
    const now = Date.now();

    const job: Job<T> = {
      id,
      type: jobType,
      payload,
      status: 'pending',
      createdAt: now,
      attempts: 0,
      maxAttempts: this.config.maxRetries,
    };

    this.jobs.set(id, job as Job);

    if (!this.queues.has(jobType)) {
      this.queues.set(jobType, []);
    }
    this.queues.get(jobType)!.push(id);

    return id;
  }

  /**
   * Register a handler for a specific job type. Only one handler per type
   * is supported. Calling process() again for the same type replaces the
   * previous handler.
   *
   * @param jobType      The job type to handle.
   * @param handler      Async function that processes the job.
   * @param concurrency  Optional concurrency override for this type.
   */
  process<T = unknown>(jobType: string, handler: JobHandler<T>, concurrency?: number): void {
    this.handlers.set(jobType, handler as JobHandler);
    if (concurrency !== undefined) {
      this.concurrencyOverrides.set(jobType, concurrency);
    }
    if (!this.queues.has(jobType)) {
      this.queues.set(jobType, []);
    }
    if (!this.activeCounts.has(jobType)) {
      this.activeCounts.set(jobType, 0);
    }
  }

  /**
   * Get the number of pending jobs for a specific type.
   */
  getQueueLength(jobType: string): number {
    return this.queues.get(jobType)?.length ?? 0;
  }

  /**
   * Get the status of a specific job.
   */
  getJobStatus(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get overall queue statistics.
   */
  getStats(): QueueStats {
    let totalPending = 0;
    let totalProcessing = 0;
    let totalCompleted = 0;
    let totalFailed = 0;

    const queueLengths: Record<string, number> = {};

    for (const [type, queue] of this.queues.entries()) {
      queueLengths[type] = queue.length;
      totalPending += queue.length;
    }

    for (const job of this.jobs.values()) {
      switch (job.status) {
        case 'processing':
          totalProcessing++;
          break;
        case 'completed':
          totalCompleted++;
          break;
        case 'failed':
          totalFailed++;
          break;
      }
    }

    return {
      jobTypes: Array.from(this.handlers.keys()),
      totalPending,
      totalProcessing,
      totalCompleted,
      totalFailed,
      queueLengths,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  destroy(): void {
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }
    this.jobs.clear();
    this.queues.clear();
    this.handlers.clear();
    this.activeCounts.clear();
    this.concurrencyOverrides.clear();
    this.completedJobIds = [];

    if (QueueWorker.instance === this) {
      QueueWorker.instance = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /** Main processing loop -- dispatches pending jobs to handlers. */
  private startProcessLoop(): void {
    this.processTimer = setInterval(() => {
      this.tick();
    }, this.config.processIntervalMs);

    if (this.processTimer && typeof this.processTimer === 'object' && 'unref' in this.processTimer) {
      (this.processTimer as NodeJS.Timeout).unref();
    }
  }

  /** One iteration of the processing loop. */
  private tick(): void {
    for (const [jobType, queue] of this.queues.entries()) {
      const handler = this.handlers.get(jobType);
      if (!handler || queue.length === 0) continue;

      const maxConcurrency = this.concurrencyOverrides.get(jobType) ?? this.config.defaultConcurrency;
      const active = this.activeCounts.get(jobType) ?? 0;
      const slotsAvailable = maxConcurrency - active;

      for (let i = 0; i < slotsAvailable && queue.length > 0; i++) {
        const jobId = queue.shift()!;
        const job = this.jobs.get(jobId);
        if (!job || job.status !== 'pending') continue;

        this.activeCounts.set(jobType, (this.activeCounts.get(jobType) ?? 0) + 1);
        job.status = 'processing';
        job.startedAt = Date.now();
        job.attempts++;

        this.executeJob(jobType, job, handler);
      }
    }
  }

  /** Execute a single job, handling success, failure, and retries. */
  private async executeJob(jobType: string, job: Job, handler: JobHandler): Promise<void> {
    try {
      await handler(job);
      job.status = 'completed';
      job.completedAt = Date.now();
      this.trackCompleted(job.id);
    } catch (err: any) {
      const errorMessage = err?.message ?? String(err);

      if (job.attempts < job.maxAttempts) {
        // Re-queue for retry after delay
        job.status = 'pending';
        job.error = `Attempt ${job.attempts} failed: ${errorMessage}`;
        setTimeout(() => {
          const queue = this.queues.get(jobType);
          if (queue && this.jobs.has(job.id)) {
            queue.push(job.id);
          }
        }, this.config.retryDelayMs);
      } else {
        job.status = 'failed';
        job.completedAt = Date.now();
        job.error = `All ${job.maxAttempts} attempts failed. Last error: ${errorMessage}`;
        this.trackCompleted(job.id);
      }
    } finally {
      const active = this.activeCounts.get(jobType) ?? 1;
      this.activeCounts.set(jobType, Math.max(0, active - 1));
    }
  }

  /** Track completed/failed job IDs for cleanup when we exceed the retention limit. */
  private trackCompleted(jobId: string): void {
    this.completedJobIds.push(jobId);

    // Purge oldest completed jobs if over limit
    while (this.completedJobIds.length > this.config.maxCompletedJobs) {
      const oldId = this.completedJobIds.shift()!;
      this.jobs.delete(oldId);
    }
  }
}

// =============================================================================
// Singleton Accessors
// =============================================================================

export function getConnectionPoolManager(): ConnectionPoolManager {
  return ConnectionPoolManager.getInstance();
}

export function getCacheLayer(): CacheLayer {
  return CacheLayer.getInstance();
}

export function getQueueWorker(): QueueWorker {
  return QueueWorker.getInstance();
}
