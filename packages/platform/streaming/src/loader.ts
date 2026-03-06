/**
 * @hololand/streaming - Asset Loaders
 */

import {
  AssetMetadata,
  AssetLoadRequest,
  AssetLoadProgress,
  LoadedAsset,
  LoaderConfig,
  LoaderStats,
  AssetPriority,
  AssetBundle,
  BundleLoadProgress,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_LOADER_CONFIG: LoaderConfig = {
  maxConcurrent: 4,
  timeout: 30000,
  retryCount: 3,
  retryDelay: 1000,
  progressive: true,
  baseUrl: '',
};

// ============================================================================
// Load Queue
// ============================================================================

interface QueueEntry {
  request: AssetLoadRequest;
  resolve: (asset: LoadedAsset) => void;
  reject: (error: Error) => void;
  startTime?: number;
  retries: number;
}

/**
 * Priority queue for asset loading
 */
export class LoadQueue {
  private queue: QueueEntry[] = [];
  private loading: Map<string, QueueEntry> = new Map();
  private config: LoaderConfig;
  private stats: LoaderStats = {
    queued: 0,
    loading: 0,
    completed: 0,
    failed: 0,
    totalBytes: 0,
    bytesPerSecond: 0,
  };

  constructor(config: Partial<LoaderConfig> = {}) {
    this.config = { ...DEFAULT_LOADER_CONFIG, ...config };
  }

  /**
   * Add request to queue
   */
  enqueue(request: AssetLoadRequest): Promise<LoadedAsset> {
    return new Promise((resolve, reject) => {
      const entry: QueueEntry = { request, resolve, reject, retries: 0 };

      // Insert based on priority
      const priorityOrder: AssetPriority[] = ['critical', 'high', 'normal', 'low', 'background'];
      const requestPriorityIndex = priorityOrder.indexOf(request.priority);

      let insertIndex = this.queue.length;
      for (let i = 0; i < this.queue.length; i++) {
        const entryPriorityIndex = priorityOrder.indexOf(this.queue[i].request.priority);
        if (requestPriorityIndex < entryPriorityIndex) {
          insertIndex = i;
          break;
        }
      }

      this.queue.splice(insertIndex, 0, entry);
      this.stats.queued = this.queue.length;
    });
  }

  /**
   * Get next item to load
   */
  dequeue(): QueueEntry | undefined {
    const entry = this.queue.shift();
    if (entry) {
      this.stats.queued = this.queue.length;
    }
    return entry;
  }

  /**
   * Mark asset as loading
   */
  markLoading(id: string, entry: QueueEntry): void {
    entry.startTime = Date.now();
    this.loading.set(id, entry);
    this.stats.loading = this.loading.size;
  }

  /**
   * Mark asset as completed
   */
  markComplete(id: string, bytes: number): void {
    this.loading.delete(id);
    this.stats.loading = this.loading.size;
    this.stats.completed++;
    this.stats.totalBytes += bytes;
  }

  /**
   * Mark asset as failed
   */
  markFailed(id: string): QueueEntry | undefined {
    const entry = this.loading.get(id);
    this.loading.delete(id);
    this.stats.loading = this.loading.size;
    this.stats.failed++;
    return entry;
  }

  /**
   * Check if can load more
   */
  canLoadMore(): boolean {
    return this.loading.size < this.config.maxConcurrent && this.queue.length > 0;
  }

  /**
   * Get queue stats
   */
  getStats(): LoaderStats {
    return { ...this.stats };
  }

  /**
   * Clear queue
   */
  clear(): void {
    for (const entry of this.queue) {
      entry.reject(new Error('Queue cleared'));
    }
    this.queue = [];
    this.stats.queued = 0;
  }
}

// ============================================================================
// Asset Loader
// ============================================================================

type ProgressHandler = (progress: AssetLoadProgress) => void;

/**
 * Core asset loader
 */
export class AssetLoader {
  private config: LoaderConfig;
  private queue: LoadQueue;
  private progressHandlers: Map<string, Set<ProgressHandler>> = new Map();
  private processing = false;

  constructor(config: Partial<LoaderConfig> = {}) {
    this.config = { ...DEFAULT_LOADER_CONFIG, ...config };
    this.queue = new LoadQueue(config);
  }

  /**
   * Load an asset
   */
  async load<T = unknown>(request: AssetLoadRequest): Promise<LoadedAsset<T>> {
    const promise = this.queue.enqueue(request);
    this.processQueue();
    return promise as Promise<LoadedAsset<T>>;
  }

  /**
   * Load multiple assets
   */
  async loadBatch(requests: AssetLoadRequest[]): Promise<LoadedAsset[]> {
    return Promise.all(requests.map((r) => this.load(r)));
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(assetId: string, handler: ProgressHandler): () => void {
    if (!this.progressHandlers.has(assetId)) {
      this.progressHandlers.set(assetId, new Set());
    }
    this.progressHandlers.get(assetId)!.add(handler);
    return () => this.progressHandlers.get(assetId)?.delete(handler);
  }

  /**
   * Cancel a pending load
   */
  cancel(assetId: string): boolean {
    // Would need to implement abort controller support
    return false;
  }

  /**
   * Get loader stats
   */
  getStats(): LoaderStats {
    return this.queue.getStats();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoaderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.canLoadMore()) {
      const entry = this.queue.dequeue();
      if (!entry) break;

      this.queue.markLoading(entry.request.id, entry);
      this.loadAsset(entry).catch(() => {});
    }

    this.processing = false;
  }

  private async loadAsset(entry: QueueEntry): Promise<void> {
    const { request } = entry;
    const startTime = Date.now();

    try {
      this.emitProgress(request.id, {
        id: request.id,
        loaded: 0,
        total: 0,
        percentage: 0,
        stage: 'downloading',
      });

      const url = this.config.baseUrl + request.id;
      const response = await this.fetchWithProgress(url, request.id, request.timeout);

      this.emitProgress(request.id, {
        id: request.id,
        loaded: 0,
        total: 0,
        percentage: 0,
        stage: 'decoding',
      });

      const data = await this.decode(response, request);
      const loadTime = Date.now() - startTime;
      const memoryUsage = this.estimateMemory(data);

      const asset: LoadedAsset = {
        id: request.id,
        data,
        metadata: {
          id: request.id,
          type: 'data',
          path: url,
          size: memoryUsage,
          format: response.headers.get('content-type') || 'unknown',
          version: '1.0',
        },
        loadTime,
        memoryUsage,
      };

      this.queue.markComplete(request.id, memoryUsage);

      this.emitProgress(request.id, {
        id: request.id,
        loaded: 1,
        total: 1,
        percentage: 100,
        stage: 'complete',
      });

      entry.resolve(asset);
    } catch (error) {
      const failedEntry = this.queue.markFailed(request.id);

      // Retry logic
      if (failedEntry && failedEntry.retries < this.config.retryCount) {
        failedEntry.retries++;
        setTimeout(() => {
          this.queue.enqueue(request).then(entry.resolve).catch(entry.reject);
          this.processQueue();
        }, this.config.retryDelay * failedEntry.retries);
        return;
      }

      this.emitProgress(request.id, {
        id: request.id,
        loaded: 0,
        total: 0,
        percentage: 0,
        stage: 'error',
        error: error instanceof Error ? error.message : String(error),
      });

      entry.reject(error instanceof Error ? error : new Error(String(error)));
    }

    // Process next items
    this.processQueue();
  }

  private async fetchWithProgress(
    url: string,
    assetId: string,
    timeout?: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = timeout
      ? setTimeout(() => controller.abort(), timeout)
      : null;

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async decode(response: Response, request: AssetLoadRequest): Promise<unknown> {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('json')) {
      return response.json();
    } else if (contentType.includes('image')) {
      const blob = await response.blob();
      return createImageBitmap(blob);
    } else if (contentType.includes('audio') || contentType.includes('video')) {
      return response.arrayBuffer();
    } else if (contentType.includes('model') || contentType.includes('gltf')) {
      return response.arrayBuffer();
    } else {
      return response.arrayBuffer();
    }
  }

  private estimateMemory(data: unknown): number {
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    if (data instanceof ImageBitmap) {
      return data.width * data.height * 4; // Assume RGBA
    }
    if (typeof data === 'object') {
      return JSON.stringify(data).length * 2; // Rough estimate
    }
    return 0;
  }

  private emitProgress(assetId: string, progress: AssetLoadProgress): void {
    const handlers = this.progressHandlers.get(assetId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(progress);
        } catch (e) {
          console.error('[AssetLoader] Progress handler error:', e);
        }
      }
    }
  }
}

// ============================================================================
// Progressive Loader
// ============================================================================

/**
 * Loader for progressive/streaming assets (images, meshes)
 */
export class ProgressiveLoader extends AssetLoader {
  /**
   * Load image progressively (low quality first, then high)
   */
  async loadImageProgressive(
    baseUrl: string,
    levels: string[],
    onLevel?: (level: number, image: ImageBitmap) => void
  ): Promise<ImageBitmap> {
    let lastImage: ImageBitmap | null = null;

    for (let i = 0; i < levels.length; i++) {
      const asset = await this.load<ImageBitmap>({
        id: baseUrl + levels[i],
        priority: i === 0 ? 'high' : 'normal',
      });

      lastImage = asset.data;
      onLevel?.(i, asset.data);
    }

    return lastImage!;
  }
}

// ============================================================================
// Bundle Loader
// ============================================================================

type BundleProgressHandler = (progress: BundleLoadProgress) => void;

/**
 * Loader for asset bundles
 */
export class BundleLoader {
  private assetLoader: AssetLoader;
  private bundles: Map<string, AssetBundle> = new Map();
  private loadedAssets: Map<string, LoadedAsset> = new Map();

  constructor(assetLoader?: AssetLoader) {
    this.assetLoader = assetLoader || new AssetLoader();
  }

  /**
   * Register a bundle
   */
  registerBundle(bundle: AssetBundle): void {
    this.bundles.set(bundle.id, bundle);
  }

  /**
   * Load a bundle
   */
  async loadBundle(
    bundleId: string,
    onProgress?: BundleProgressHandler
  ): Promise<Map<string, LoadedAsset>> {
    const bundle = this.bundles.get(bundleId);
    if (!bundle) {
      throw new Error(`Bundle not found: ${bundleId}`);
    }

    const results = new Map<string, LoadedAsset>();
    let loadedCount = 0;

    for (const asset of bundle.assets) {
      try {
        const loaded = await this.assetLoader.load({
          id: asset.id,
          priority: 'normal',
        });

        results.set(asset.id, loaded);
        this.loadedAssets.set(asset.id, loaded);
        loadedCount++;

        onProgress?.({
          bundleId,
          loaded: loadedCount,
          total: bundle.assets.length,
          assetsLoaded: loadedCount,
          totalAssets: bundle.assets.length,
        });
      } catch (error) {
        console.error(`[BundleLoader] Failed to load asset ${asset.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Get loaded asset
   */
  getAsset(assetId: string): LoadedAsset | undefined {
    return this.loadedAssets.get(assetId);
  }

  /**
   * Unload bundle
   */
  unloadBundle(bundleId: string): void {
    const bundle = this.bundles.get(bundleId);
    if (!bundle) return;

    for (const asset of bundle.assets) {
      this.loadedAssets.delete(asset.id);
    }
  }
}
