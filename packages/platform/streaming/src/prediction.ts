/**
 * @hololand/streaming - Predictive Loading
 */

// ============================================================================
// Types
// ============================================================================

export interface PredictionConfig {
  /** Prediction horizon (seconds) */
  horizon: number;
  /** Movement smoothing factor */
  smoothing: number;
  /** Minimum confidence to trigger preload */
  minConfidence: number;
  /** Maximum predictions per frame */
  maxPredictions: number;
}

export interface PredictionResult {
  /** Predicted position */
  position: { x: number; y: number; z: number };
  /** Prediction confidence (0-1) */
  confidence: number;
  /** Time offset (seconds) */
  timeOffset: number;
  /** Predicted velocity */
  velocity: { x: number; y: number; z: number };
}

export interface ChunkInfo {
  /** Chunk identifier */
  id: string;
  /** Chunk bounds */
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  /** Priority for loading */
  priority: number;
  /** Is currently loaded */
  loaded: boolean;
  /** Assets in this chunk */
  assets: string[];
}

export interface ChunkLoaderConfig {
  /** Chunk size in world units */
  chunkSize: number;
  /** Load radius (chunks) */
  loadRadius: number;
  /** Unload radius (chunks) */
  unloadRadius: number;
  /** Enable predictive loading */
  predictive: boolean;
  /** Prediction config */
  predictionConfig: PredictionConfig;
}

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_PREDICTION_CONFIG: PredictionConfig = {
  horizon: 2.0,
  smoothing: 0.3,
  minConfidence: 0.6,
  maxPredictions: 5,
};

const DEFAULT_CHUNK_CONFIG: ChunkLoaderConfig = {
  chunkSize: 16,
  loadRadius: 3,
  unloadRadius: 5,
  predictive: true,
  predictionConfig: DEFAULT_PREDICTION_CONFIG,
};

// ============================================================================
// Movement Predictor
// ============================================================================

interface PositionSample {
  position: { x: number; y: number; z: number };
  timestamp: number;
}

/**
 * Predicts future movement based on position history
 */
export class MovementPredictor {
  private config: PredictionConfig;
  private history: PositionSample[] = [];
  private maxHistory = 60; // 1 second at 60fps
  private velocity = { x: 0, y: 0, z: 0 };
  private acceleration = { x: 0, y: 0, z: 0 };

  constructor(config: Partial<PredictionConfig> = {}) {
    this.config = { ...DEFAULT_PREDICTION_CONFIG, ...config };
  }

  /**
   * Update with new position
   */
  update(position: { x: number; y: number; z: number }): void {
    const now = Date.now();

    this.history.push({ position: { ...position }, timestamp: now });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Calculate velocity and acceleration
    if (this.history.length >= 2) {
      const latest = this.history[this.history.length - 1];
      const previous = this.history[this.history.length - 2];
      const dt = (latest.timestamp - previous.timestamp) / 1000;

      if (dt > 0) {
        const newVelocity = {
          x: (latest.position.x - previous.position.x) / dt,
          y: (latest.position.y - previous.position.y) / dt,
          z: (latest.position.z - previous.position.z) / dt,
        };

        // Smooth velocity
        const s = this.config.smoothing;
        this.velocity = {
          x: this.velocity.x * s + newVelocity.x * (1 - s),
          y: this.velocity.y * s + newVelocity.y * (1 - s),
          z: this.velocity.z * s + newVelocity.z * (1 - s),
        };
      }
    }

    // Calculate acceleration from velocity history
    if (this.history.length >= 3) {
      const latest = this.history[this.history.length - 1];
      const oldest = this.history[0];
      const dt = (latest.timestamp - oldest.timestamp) / 1000;

      if (dt > 0.1) {
        // Need some time span for accuracy
        const avgVelocity = {
          x: (latest.position.x - oldest.position.x) / dt,
          y: (latest.position.y - oldest.position.y) / dt,
          z: (latest.position.z - oldest.position.z) / dt,
        };

        this.acceleration = {
          x: (this.velocity.x - avgVelocity.x) / dt,
          y: (this.velocity.y - avgVelocity.y) / dt,
          z: (this.velocity.z - avgVelocity.z) / dt,
        };
      }
    }
  }

  /**
   * Predict future position
   */
  predict(timeOffset: number = this.config.horizon): PredictionResult[] {
    if (this.history.length < 2) {
      return [];
    }

    const results: PredictionResult[] = [];
    const current = this.history[this.history.length - 1].position;

    // Generate predictions at multiple time offsets
    const steps = Math.min(this.config.maxPredictions, Math.ceil(timeOffset * 2));
    for (let i = 1; i <= steps; i++) {
      const t = (timeOffset * i) / steps;

      // Use kinematic equation: pos = pos0 + v*t + 0.5*a*t^2
      const predicted = {
        x: current.x + this.velocity.x * t + 0.5 * this.acceleration.x * t * t,
        y: current.y + this.velocity.y * t + 0.5 * this.acceleration.y * t * t,
        z: current.z + this.velocity.z * t + 0.5 * this.acceleration.z * t * t,
      };

      // Calculate confidence based on velocity consistency
      const speed = Math.sqrt(
        this.velocity.x ** 2 + this.velocity.y ** 2 + this.velocity.z ** 2
      );
      const confidence = Math.min(1, Math.max(0, 1 - t / (this.config.horizon * 2)));

      results.push({
        position: predicted,
        confidence,
        timeOffset: t,
        velocity: { ...this.velocity },
      });
    }

    return results.filter((r) => r.confidence >= this.config.minConfidence);
  }

  /**
   * Get current velocity
   */
  getVelocity(): { x: number; y: number; z: number } {
    return { ...this.velocity };
  }

  /**
   * Get speed (magnitude of velocity)
   */
  getSpeed(): number {
    return Math.sqrt(
      this.velocity.x ** 2 + this.velocity.y ** 2 + this.velocity.z ** 2
    );
  }

  /**
   * Reset predictor
   */
  reset(): void {
    this.history = [];
    this.velocity = { x: 0, y: 0, z: 0 };
    this.acceleration = { x: 0, y: 0, z: 0 };
  }
}

/**
 * Factory function
 */
export function createMovementPredictor(config?: Partial<PredictionConfig>): MovementPredictor {
  return new MovementPredictor(config);
}

// ============================================================================
// Predictive Chunk Loader
// ============================================================================

type ChunkLoadHandler = (chunkId: string) => Promise<void>;
type ChunkUnloadHandler = (chunkId: string) => void;

/**
 * Manages chunk loading with movement prediction
 */
export class PredictiveChunkLoader {
  private config: ChunkLoaderConfig;
  private predictor: MovementPredictor;
  private chunks: Map<string, ChunkInfo> = new Map();
  private loadedChunks: Set<string> = new Set();
  private loadingChunks: Set<string> = new Set();
  private onLoad?: ChunkLoadHandler;
  private onUnload?: ChunkUnloadHandler;

  constructor(config: Partial<ChunkLoaderConfig> = {}) {
    this.config = { ...DEFAULT_CHUNK_CONFIG, ...config };
    this.predictor = new MovementPredictor(this.config.predictionConfig);
  }

  /**
   * Set chunk load/unload handlers
   */
  setHandlers(onLoad: ChunkLoadHandler, onUnload: ChunkUnloadHandler): void {
    this.onLoad = onLoad;
    this.onUnload = onUnload;
  }

  /**
   * Register a chunk
   */
  registerChunk(chunk: ChunkInfo): void {
    this.chunks.set(chunk.id, chunk);
  }

  /**
   * Update with current position
   */
  async update(position: { x: number; y: number; z: number }): Promise<void> {
    this.predictor.update(position);

    // Get current chunk
    const currentChunk = this.positionToChunkId(position);

    // Get chunks to load based on current position
    const chunksToLoad = this.getChunksInRadius(position, this.config.loadRadius);

    // Add predicted chunks
    if (this.config.predictive) {
      const predictions = this.predictor.predict();
      for (const pred of predictions) {
        const predictedChunks = this.getChunksInRadius(pred.position, 1);
        for (const chunkId of predictedChunks) {
          if (!chunksToLoad.has(chunkId)) {
            chunksToLoad.add(chunkId);
          }
        }
      }
    }

    // Load new chunks
    for (const chunkId of chunksToLoad) {
      if (!this.loadedChunks.has(chunkId) && !this.loadingChunks.has(chunkId)) {
        this.loadingChunks.add(chunkId);
        try {
          await this.onLoad?.(chunkId);
          this.loadedChunks.add(chunkId);
        } catch (error) {
          console.error(`[PredictiveChunkLoader] Failed to load chunk ${chunkId}:`, error);
        } finally {
          this.loadingChunks.delete(chunkId);
        }
      }
    }

    // Unload distant chunks
    const chunksToKeep = this.getChunksInRadius(position, this.config.unloadRadius);
    for (const chunkId of this.loadedChunks) {
      if (!chunksToKeep.has(chunkId)) {
        this.onUnload?.(chunkId);
        this.loadedChunks.delete(chunkId);
      }
    }
  }

  /**
   * Get loaded chunks
   */
  getLoadedChunks(): string[] {
    return Array.from(this.loadedChunks);
  }

  /**
   * Check if chunk is loaded
   */
  isChunkLoaded(chunkId: string): boolean {
    return this.loadedChunks.has(chunkId);
  }

  /**
   * Force load a chunk
   */
  async forceLoad(chunkId: string): Promise<void> {
    if (this.loadedChunks.has(chunkId)) return;

    this.loadingChunks.add(chunkId);
    try {
      await this.onLoad?.(chunkId);
      this.loadedChunks.add(chunkId);
    } finally {
      this.loadingChunks.delete(chunkId);
    }
  }

  /**
   * Force unload a chunk
   */
  forceUnload(chunkId: string): void {
    if (this.loadedChunks.has(chunkId)) {
      this.onUnload?.(chunkId);
      this.loadedChunks.delete(chunkId);
    }
  }

  private positionToChunkId(pos: { x: number; y: number; z: number }): string {
    const cx = Math.floor(pos.x / this.config.chunkSize);
    const cy = Math.floor(pos.y / this.config.chunkSize);
    const cz = Math.floor(pos.z / this.config.chunkSize);
    return `${cx},${cy},${cz}`;
  }

  private getChunksInRadius(
    pos: { x: number; y: number; z: number },
    radius: number
  ): Set<string> {
    const chunks = new Set<string>();
    const cx = Math.floor(pos.x / this.config.chunkSize);
    const cy = Math.floor(pos.y / this.config.chunkSize);
    const cz = Math.floor(pos.z / this.config.chunkSize);

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx * dx + dy * dy + dz * dz <= radius * radius) {
            chunks.add(`${cx + dx},${cy + dy},${cz + dz}`);
          }
        }
      }
    }

    return chunks;
  }
}

/**
 * Factory function
 */
export function createPredictiveChunkLoader(
  config?: Partial<ChunkLoaderConfig>
): PredictiveChunkLoader {
  return new PredictiveChunkLoader(config);
}
