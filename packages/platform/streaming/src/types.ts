/**
 * @hololand/streaming - Types
 */

// ============================================================================
// Asset Types
// ============================================================================

export type AssetType = 'model' | 'texture' | 'audio' | 'video' | 'animation' | 'material' | 'script' | 'data';

export type AssetPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

export interface AssetMetadata {
  id: string;
  type: AssetType;
  path: string;
  size: number;
  format: string;
  version: string;
  checksum?: string;
  dependencies?: string[];
  tags?: string[];
  lodLevels?: number;
  mipLevels?: number;
}

export interface AssetLoadRequest {
  id: string;
  priority: AssetPriority;
  maxQuality?: 'low' | 'medium' | 'high' | 'ultra';
  progressive?: boolean;
  timeout?: number;
}

export interface AssetLoadProgress {
  id: string;
  loaded: number;
  total: number;
  percentage: number;
  stage: 'queued' | 'downloading' | 'decoding' | 'complete' | 'error';
  error?: string;
}

export interface LoadedAsset<T = unknown> {
  id: string;
  data: T;
  metadata: AssetMetadata;
  loadTime: number;
  memoryUsage: number;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T = unknown> {
  id: string;
  data: T;
  metadata: AssetMetadata;
  lastAccessed: number;
  accessCount: number;
  size: number;
  pinned: boolean;
}

export interface CacheStats {
  totalSize: number;
  maxSize: number;
  entryCount: number;
  hitRate: number;
  missRate: number;
}

export interface CacheConfig {
  /** Maximum memory budget (bytes) */
  maxSize: number;
  /** Eviction policy */
  evictionPolicy: 'lru' | 'lfu' | 'size';
  /** Enable persistence (IndexedDB) */
  persistent: boolean;
  /** Cache name for persistence */
  name: string;
  /** Time-to-live for entries (ms, 0 = forever) */
  ttl: number;
}

// ============================================================================
// Loader Types
// ============================================================================

export interface LoaderConfig {
  /** Max concurrent downloads */
  maxConcurrent: number;
  /** Request timeout (ms) */
  timeout: number;
  /** Retry count on failure */
  retryCount: number;
  /** Retry delay (ms) */
  retryDelay: number;
  /** Enable progressive loading */
  progressive: boolean;
  /** Base URL for assets */
  baseUrl: string;
}

export interface LoaderStats {
  queued: number;
  loading: number;
  completed: number;
  failed: number;
  totalBytes: number;
  bytesPerSecond: number;
}

// ============================================================================
// Bundle Types
// ============================================================================

export interface AssetBundle {
  id: string;
  name: string;
  version: string;
  assets: AssetMetadata[];
  totalSize: number;
  compressed: boolean;
  compressionFormat?: 'gzip' | 'brotli' | 'lz4';
}

export interface BundleLoadProgress {
  bundleId: string;
  loaded: number;
  total: number;
  assetsLoaded: number;
  totalAssets: number;
}
