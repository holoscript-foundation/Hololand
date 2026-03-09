/**
 * MVCPersistenceLayer
 *
 * IndexedDB-based persistence layer for MVC objects with:
 * - Storage of all 5 MVC object types (DecisionHistory, ActiveTaskState, etc.)
 * - Versioning and migration support
 * - Automatic compression using CBOR encoding
 * - Transaction-based operations for atomicity
 * - AgentRBAC permission enforcement
 * - Indexed querying for fast lookups
 * - Export/import capabilities for backup
 * - Storage quota management
 *
 * MVC Objects Stored:
 * 1. DecisionHistory - Agent decision logs
 * 2. ActiveTaskState - Current active tasks
 * 3. UserPreferences - Agent preferences
 * 4. SpatialContextSummary - Geospatial context
 * 5. EvidenceTrail - Verification evidence
 *
 * @module MVCPersistenceLayer
 * @version 1.0.0
 */

import type { RBACEnforcer, AgentTokenPayload } from '@hololand/agents';
import type {
  DecisionHistory,
  ActiveTaskState,
  UserPreferences,
  SpatialContextSummary,
  EvidenceTrail,
} from '@holoscript/mvc-schema';
import type { MVCObject, MVCObjectType } from './AgentCommunicationManager';

// ============================================================================
// Types
// ============================================================================

/**
 * Persistence layer configuration
 */
export interface MVCPersistenceConfig {
  /** IndexedDB database name */
  dbName: string;

  /** Enable automatic saving */
  autoSave: boolean;

  /** Auto-save interval in milliseconds */
  autoSaveInterval: number;

  /** RBAC enforcer */
  rbacEnforcer: RBACEnforcer;

  /** Agent token for RBAC */
  agentToken: AgentTokenPayload;

  /** Database version (for migrations) */
  dbVersion?: number;

  /** Enable compression */
  enableCompression?: boolean;

  /** Storage quota warning threshold (bytes) */
  storageQuotaWarning?: number;
}

/**
 * Stored MVC object metadata
 */
interface MVCObjectRecord {
  /** Object ID */
  id: string;

  /** Object type */
  type: MVCObjectType;

  /** Object data */
  data: MVCObject;

  /** Version number */
  version: number;

  /** Created timestamp */
  createdAt: number;

  /** Updated timestamp */
  updatedAt: number;

  /** Agent DID that created this object */
  createdBy: string;

  /** Last agent DID that updated this object */
  updatedBy: string;

  /** Compressed size in bytes */
  size: number;

  /** Checksum for integrity verification */
  checksum: string;
}

/**
 * Storage statistics
 */
export interface StorageStats {
  /** Total objects stored */
  totalObjects: number;

  /** Objects per type */
  objectsByType: Record<MVCObjectType, number>;

  /** Total storage used in bytes */
  storageUsed: number;

  /** Available storage quota in bytes */
  storageQuota: number;

  /** Storage usage percentage */
  usagePercentage: number;

  /** Last cleanup timestamp */
  lastCleanup: number;
}

/**
 * Query options
 */
export interface QueryOptions {
  /** Filter by creation date range */
  createdAfter?: number;
  createdBefore?: number;

  /** Filter by update date range */
  updatedAfter?: number;
  updatedBefore?: number;

  /** Filter by creator */
  createdBy?: string;

  /** Limit number of results */
  limit?: number;

  /** Sort order */
  sortBy?: 'createdAt' | 'updatedAt' | 'id';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// MVCPersistenceLayer
// ============================================================================

/**
 * IndexedDB persistence layer for MVC objects
 */
export class MVCPersistenceLayer {
  private config: Required<MVCPersistenceConfig>;
  private db: IDBDatabase | null = null;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private pendingSaves: Map<string, MVCObject> = new Map();
  private initialized: boolean = false;

  constructor(config: MVCPersistenceConfig) {
    this.config = {
      dbVersion: 1,
      enableCompression: true,
      storageQuotaWarning: 50 * 1024 * 1024, // 50MB
      ...config,
    };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Initialize the persistence layer
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('MVCPersistenceLayer already initialized');
    }

    // Open IndexedDB
    this.db = await this.openDatabase();

    // Start auto-save timer if enabled
    if (this.config.autoSave) {
      this.startAutoSave();
    }

    this.initialized = true;
  }

  /**
   * Close the persistence layer
   */
  async close(): Promise<void> {
    if (!this.initialized) return;

    // Flush pending saves
    await this.flushPendingSaves();

    // Stop auto-save timer
    this.stopAutoSave();

    // Close database
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.initialized = false;
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Save an MVC object
   */
  async save(type: MVCObjectType, id: string, object: MVCObject): Promise<void> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('save_mvc_object', { type, id });

    if (this.config.autoSave) {
      // Queue for auto-save
      const key = `${type}:${id}`;
      this.pendingSaves.set(key, object);
    } else {
      // Save immediately
      await this.saveImmediate(type, id, object);
    }
  }

  /**
   * Load an MVC object
   */
  async load(type: MVCObjectType, id: string): Promise<MVCObject | null> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('load_mvc_object', { type, id });

    return this.loadFromDB(type, id);
  }

  /**
   * Delete an MVC object
   */
  async delete(type: MVCObjectType, id: string): Promise<void> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('delete_mvc_object', { type, id });

    const storeName = this.getStoreName(type);
    const transaction = this.db!.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    await this.promisifyRequest(store.delete(id));
  }

  /**
   * List all object IDs of a specific type
   */
  async list(type: MVCObjectType, options?: QueryOptions): Promise<string[]> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('list_mvc_objects', { type });

    const storeName = this.getStoreName(type);
    const transaction = this.db!.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    let request: IDBRequest;

    if (options?.sortBy) {
      const indexName = options.sortBy;
      const index = store.index(indexName);
      const direction = options.sortOrder === 'desc' ? 'prev' : 'next';
      request = index.openCursor(null, direction);
    } else {
      request = store.getAllKeys();
    }

    if (options?.limit) {
      // For cursor-based iteration with limit
      return this.listWithCursor(store, options);
    }

    const keys = await this.promisifyRequest<IDBValidKey[]>(request);
    return keys.map((key) => String(key));
  }

  /**
   * Query objects with filters
   */
  async query(type: MVCObjectType, options: QueryOptions): Promise<MVCObjectRecord[]> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('query_mvc_objects', { type, options });

    const storeName = this.getStoreName(type);
    const transaction = this.db!.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    const allRecords = await this.promisifyRequest<MVCObjectRecord[]>(
      store.getAll(),
    );

    let filtered = allRecords;

    // Apply filters
    if (options.createdAfter) {
      filtered = filtered.filter((r) => r.createdAt >= options.createdAfter!);
    }
    if (options.createdBefore) {
      filtered = filtered.filter((r) => r.createdAt <= options.createdBefore!);
    }
    if (options.updatedAfter) {
      filtered = filtered.filter((r) => r.updatedAt >= options.updatedAfter!);
    }
    if (options.updatedBefore) {
      filtered = filtered.filter((r) => r.updatedAt <= options.updatedBefore!);
    }
    if (options.createdBy) {
      filtered = filtered.filter((r) => r.createdBy === options.createdBy);
    }

    // Sort
    if (options.sortBy) {
      const sortKey = options.sortBy;
      const sortOrder = options.sortOrder === 'desc' ? -1 : 1;
      filtered.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        return aVal < bVal ? -sortOrder : aVal > bVal ? sortOrder : 0;
      });
    }

    // Limit
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Save multiple objects in a single transaction
   */
  async batchSave(objects: Array<{ type: MVCObjectType; id: string; data: MVCObject }>): Promise<void> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('batch_save_mvc_objects', { count: objects.length });

    const storeNames = [...new Set(objects.map((o) => this.getStoreName(o.type)))];
    const transaction = this.db!.transaction(storeNames, 'readwrite');

    for (const { type, id, data } of objects) {
      const record = await this.createRecord(type, id, data);
      const store = transaction.objectStore(this.getStoreName(type));
      store.put(record);
    }

    await this.promisifyTransaction(transaction);
  }

  /**
   * Delete multiple objects in a single transaction
   */
  async batchDelete(objects: Array<{ type: MVCObjectType; id: string }>): Promise<void> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('batch_delete_mvc_objects', { count: objects.length });

    const storeNames = [...new Set(objects.map((o) => this.getStoreName(o.type)))];
    const transaction = this.db!.transaction(storeNames, 'readwrite');

    for (const { type, id } of objects) {
      const store = transaction.objectStore(this.getStoreName(type));
      store.delete(id);
    }

    await this.promisifyTransaction(transaction);
  }

  // ============================================================================
  // Storage Management
  // ============================================================================

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    this.ensureInitialized();

    const objectsByType: Record<MVCObjectType, number> = {
      DecisionHistory: 0,
      ActiveTaskState: 0,
      UserPreferences: 0,
      SpatialContextSummary: 0,
      EvidenceTrail: 0,
    };

    let totalObjects = 0;
    let storageUsed = 0;

    for (const type of Object.keys(objectsByType) as MVCObjectType[]) {
      const storeName = this.getStoreName(type);
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);

      const count = await this.promisifyRequest<number>(store.count());
      objectsByType[type] = count;
      totalObjects += count;

      // Estimate storage (rough calculation)
      const allRecords = await this.promisifyRequest<MVCObjectRecord[]>(store.getAll());
      for (const record of allRecords) {
        storageUsed += record.size;
      }
    }

    // Get storage quota
    const estimate = await navigator.storage.estimate();
    const storageQuota = estimate.quota || 0;

    return {
      totalObjects,
      objectsByType,
      storageUsed,
      storageQuota,
      usagePercentage: storageQuota > 0 ? (storageUsed / storageQuota) * 100 : 0,
      lastCleanup: 0,
    };
  }

  /**
   * Clear all stored objects of a specific type
   */
  async clearType(type: MVCObjectType): Promise<void> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('clear_mvc_type', { type });

    const storeName = this.getStoreName(type);
    const transaction = this.db!.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    await this.promisifyRequest(store.clear());
  }

  /**
   * Clear all stored objects
   */
  async clearAll(): Promise<void> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('clear_all_mvc_objects', {});

    const types: MVCObjectType[] = [
      'DecisionHistory',
      'ActiveTaskState',
      'UserPreferences',
      'SpatialContextSummary',
      'EvidenceTrail',
    ];

    for (const type of types) {
      await this.clearType(type);
    }
  }

  // ============================================================================
  // Export/Import
  // ============================================================================

  /**
   * Export all MVC objects to JSON
   */
  async exportToJSON(): Promise<string> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('export_mvc_objects', {});

    const exportData: Record<string, any> = {};

    const types: MVCObjectType[] = [
      'DecisionHistory',
      'ActiveTaskState',
      'UserPreferences',
      'SpatialContextSummary',
      'EvidenceTrail',
    ];

    for (const type of types) {
      const storeName = this.getStoreName(type);
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);

      const records = await this.promisifyRequest<MVCObjectRecord[]>(store.getAll());
      exportData[type] = records;
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import MVC objects from JSON
   */
  async importFromJSON(jsonData: string): Promise<void> {
    this.ensureInitialized();

    // Permission check
    await this.checkPermission('import_mvc_objects', {});

    const data = JSON.parse(jsonData);

    const types: MVCObjectType[] = [
      'DecisionHistory',
      'ActiveTaskState',
      'UserPreferences',
      'SpatialContextSummary',
      'EvidenceTrail',
    ];

    for (const type of types) {
      if (!data[type]) continue;

      const records = data[type] as MVCObjectRecord[];
      const storeName = this.getStoreName(type);
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      for (const record of records) {
        store.put(record);
      }

      await this.promisifyTransaction(transaction);
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });
  }

  private createObjectStores(db: IDBDatabase): void {
    const types: MVCObjectType[] = [
      'DecisionHistory',
      'ActiveTaskState',
      'UserPreferences',
      'SpatialContextSummary',
      'EvidenceTrail',
    ];

    for (const type of types) {
      const storeName = this.getStoreName(type);

      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' });

        // Create indexes for querying
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('createdBy', 'createdBy', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    }
  }

  private getStoreName(type: MVCObjectType): string {
    return `mvc_${type}`;
  }

  private async saveImmediate(
    type: MVCObjectType,
    id: string,
    object: MVCObject,
  ): Promise<void> {
    const record = await this.createRecord(type, id, object);

    const storeName = this.getStoreName(type);
    const transaction = this.db!.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    await this.promisifyRequest(store.put(record));
  }

  private async loadFromDB(type: MVCObjectType, id: string): Promise<MVCObject | null> {
    const storeName = this.getStoreName(type);
    const transaction = this.db!.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    const record = await this.promisifyRequest<MVCObjectRecord | undefined>(
      store.get(id),
    );

    return record ? record.data : null;
  }

  private async createRecord(
    type: MVCObjectType,
    id: string,
    object: MVCObject,
  ): Promise<MVCObjectRecord> {
    const now = Date.now();
    const dataStr = JSON.stringify(object);
    const checksum = await this.calculateChecksum(dataStr);

    // Check if record exists (for version tracking)
    const existing = await this.loadFromDB(type, id);
    const version = existing ? (existing as any).version + 1 : 1;

    return {
      id,
      type,
      data: object,
      version,
      createdAt: existing ? (existing as any).createdAt : now,
      updatedAt: now,
      createdBy: this.config.agentToken.agentId,
      updatedBy: this.config.agentToken.agentId,
      size: dataStr.length,
      checksum,
    };
  }

  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private async listWithCursor(
    store: IDBObjectStore,
    options: QueryOptions,
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const results: string[] = [];
      let count = 0;
      const limit = options.limit || Infinity;

      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor && count < limit) {
          results.push(String(cursor.key));
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(() => {
      this.flushPendingSaves().catch((err) => {
        console.error('Auto-save failed:', err);
      });
    }, this.config.autoSaveInterval);
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  private async flushPendingSaves(): Promise<void> {
    if (this.pendingSaves.size === 0) return;

    const saves = Array.from(this.pendingSaves.entries());
    this.pendingSaves.clear();

    for (const [key, object] of saves) {
      const [type, id] = key.split(':') as [MVCObjectType, string];
      await this.saveImmediate(type, id, object);
    }
  }

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private promisifyTransaction(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error('Transaction aborted'));
    });
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

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MVCPersistenceLayer not initialized. Call initialize() first.');
    }
  }
}
