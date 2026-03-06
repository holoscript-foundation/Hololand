/**
 * @hololand/streaming - Caching System
 */

import { CacheEntry, CacheStats, CacheConfig, AssetMetadata } from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 256 * 1024 * 1024, // 256 MB
  evictionPolicy: 'lru',
  persistent: false,
  name: 'hololand-assets',
  ttl: 0,
};

// ============================================================================
// Memory Cache
// ============================================================================

/**
 * In-memory asset cache with eviction policies
 */
export class MemoryCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private currentSize = 0;
  private hits = 0;
  private misses = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  /**
   * Get item from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check TTL
    if (this.config.ttl > 0 && Date.now() - entry.lastAccessed > this.config.ttl) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    // Update access info
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.hits++;

    return entry.data;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T, metadata: AssetMetadata, size: number): void {
    // Evict if necessary
    while (this.currentSize + size > this.config.maxSize && this.cache.size > 0) {
      this.evictOne();
    }

    // Remove existing entry first
    if (this.cache.has(key)) {
      this.delete(key);
    }

    const entry: CacheEntry<T> = {
      id: key,
      data,
      metadata,
      lastAccessed: Date.now(),
      accessCount: 1,
      size,
      pinned: false,
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (this.config.ttl > 0 && Date.now() - entry.lastAccessed > this.config.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete item
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.currentSize -= entry.size;
    return this.cache.delete(key);
  }

  /**
   * Pin item (prevent eviction)
   */
  pin(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.pinned = true;
    return true;
  }

  /**
   * Unpin item
   */
  unpin(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.pinned = false;
    return true;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * Get cache stats
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      totalSize: this.currentSize,
      maxSize: this.config.maxSize,
      entryCount: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
      missRate: total > 0 ? this.misses / total : 0,
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  private evictOne(): void {
    let victim: string | null = null;

    switch (this.config.evictionPolicy) {
      case 'lru':
        victim = this.findLRU();
        break;
      case 'lfu':
        victim = this.findLFU();
        break;
      case 'size':
        victim = this.findLargest();
        break;
    }

    if (victim) {
      this.delete(victim);
    }
  }

  private findLRU(): string | null {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (!entry.pinned && entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldest = key;
      }
    }

    return oldest;
  }

  private findLFU(): string | null {
    let least: string | null = null;
    let leastCount = Infinity;

    for (const [key, entry] of this.cache) {
      if (!entry.pinned && entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        least = key;
      }
    }

    return least;
  }

  private findLargest(): string | null {
    let largest: string | null = null;
    let largestSize = 0;

    for (const [key, entry] of this.cache) {
      if (!entry.pinned && entry.size > largestSize) {
        largestSize = entry.size;
        largest = key;
      }
    }

    return largest;
  }
}

// ============================================================================
// IndexedDB Cache
// ============================================================================

/**
 * Persistent cache using IndexedDB
 */
export class IndexedDBCache<T = unknown> {
  private config: CacheConfig;
  private db: IDBDatabase | null = null;
  private storeName = 'assets';

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config, persistent: true };
  }

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB not supported');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.name, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('lastAccessed', 'lastAccessed');
          store.createIndex('size', 'size');
        }
      };
    });
  }

  /**
   * Get item from cache
   */
  async get(key: string): Promise<T | undefined> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;

        if (!entry) {
          resolve(undefined);
          return;
        }

        // Check TTL
        if (this.config.ttl > 0 && Date.now() - entry.lastAccessed > this.config.ttl) {
          store.delete(key);
          resolve(undefined);
          return;
        }

        // Update access info
        entry.lastAccessed = Date.now();
        entry.accessCount++;
        store.put(entry);

        resolve(entry.data);
      };
    });
  }

  /**
   * Set item in cache
   */
  async set(key: string, data: T, metadata: AssetMetadata, size: number): Promise<void> {
    if (!this.db) await this.init();

    const entry: CacheEntry<T> = {
      id: key,
      data,
      metadata,
      lastAccessed: Date.now(),
      accessCount: 1,
      size,
      pinned: false,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Delete item
   */
  async delete(key: string): Promise<boolean> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(true);
    });
  }

  /**
   * Clear all
   */
  async clear(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Close database
   */
  close(): void {
    this.db?.close();
    this.db = null;
  }
}

// ============================================================================
// Cache Manager
// ============================================================================

/**
 * Manages memory and persistent caches
 */
export class CacheManager<T = unknown> {
  private memoryCache: MemoryCache<T>;
  private persistentCache: IndexedDBCache<T> | null = null;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.memoryCache = new MemoryCache<T>(config);

    if (config.persistent) {
      this.persistentCache = new IndexedDBCache<T>(config);
    }
  }

  /**
   * Initialize persistent storage
   */
  async init(): Promise<void> {
    if (this.persistentCache) {
      await this.persistentCache.init();
    }
  }

  /**
   * Get item (memory first, then persistent)
   */
  async get(key: string): Promise<T | undefined> {
    // Try memory first
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult !== undefined) {
      return memoryResult;
    }

    // Try persistent
    if (this.persistentCache) {
      const persistentResult = await this.persistentCache.get(key);
      if (persistentResult !== undefined) {
        // Promote to memory cache
        // Note: We'd need metadata here, simplified for now
        return persistentResult;
      }
    }

    return undefined;
  }

  /**
   * Set item in both caches
   */
  async set(key: string, data: T, metadata: AssetMetadata, size: number): Promise<void> {
    this.memoryCache.set(key, data, metadata, size);

    if (this.persistentCache) {
      await this.persistentCache.set(key, data, metadata, size);
    }
  }

  /**
   * Delete from all caches
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (this.persistentCache) {
      await this.persistentCache.delete(key);
    }
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.persistentCache) {
      await this.persistentCache.clear();
    }
  }

  /**
   * Get memory cache stats
   */
  getStats(): CacheStats {
    return this.memoryCache.getStats();
  }
}

// ============================================================================
// Memory Budget Monitor
// ============================================================================

/**
 * Monitors memory usage and triggers cleanup
 */
export class MemoryBudgetMonitor {
  private budget: number;
  private warningThreshold: number;
  private criticalThreshold: number;
  private onWarning?: () => void;
  private onCritical?: () => void;
  private intervalId?: ReturnType<typeof setInterval>;

  constructor(options: {
    budgetMB: number;
    warningPercent?: number;
    criticalPercent?: number;
    onWarning?: () => void;
    onCritical?: () => void;
  }) {
    this.budget = options.budgetMB * 1024 * 1024;
    this.warningThreshold = this.budget * (options.warningPercent ?? 0.75);
    this.criticalThreshold = this.budget * (options.criticalPercent ?? 0.9);
    this.onWarning = options.onWarning;
    this.onCritical = options.onCritical;
  }

  /**
   * Start monitoring
   */
  start(intervalMs = 5000): void {
    this.intervalId = setInterval(() => this.check(), intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Get current memory usage
   */
  getUsage(): { used: number; total: number; percent: number } {
    if ((performance as any).memory) {
      const mem = (performance as any).memory;
      return {
        used: mem.usedJSHeapSize,
        total: mem.jsHeapSizeLimit,
        percent: mem.usedJSHeapSize / mem.jsHeapSizeLimit,
      };
    }

    // Fallback estimate
    return { used: 0, total: this.budget, percent: 0 };
  }

  /**
   * Check memory and trigger callbacks
   */
  check(): void {
    const usage = this.getUsage();

    if (usage.used > this.criticalThreshold) {
      this.onCritical?.();
    } else if (usage.used > this.warningThreshold) {
      this.onWarning?.();
    }
  }
}
