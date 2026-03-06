/**
 * SNNPerceptionBridge
 *
 * Main-thread integration layer that connects the SNNPerceptionWorker
 * (running on a Web Worker) to the HololandRenderer.
 *
 * RESPONSIBILITIES:
 * 1. Create and manage the Web Worker lifecycle
 * 2. Allocate SharedArrayBuffer for lock-free result exchange
 * 3. Extract scene input from Three.js at configurable frequency
 * 4. Read perception results on the render loop via SharedPerceptionBuffer
 * 5. Adapt inference frequency based on scene complexity and worker performance
 *
 * INTEGRATION WITH HOLOLAND RENDERER:
 * ```
 *   // In HololandRenderer:
 *   private perceptionBridge: SNNPerceptionBridge | null = null;
 *
 *   async enableSNNPerception(config?: SNNPerceptionBridgeConfig): Promise<void> {
 *     this.perceptionBridge = createSNNPerceptionBridge(config);
 *     await this.perceptionBridge.initialize();
 *     this.perceptionBridge.start();
 *   }
 *
 *   // In render loop:
 *   private syncSNNPerception(): void {
 *     if (!this.perceptionBridge) return;
 *     const state = this.perceptionBridge.readPerception(); // < 0.01ms
 *     // Apply attention scores to scene...
 *   }
 * ```
 *
 * PERFORMANCE BUDGET:
 *   Scene capture:    < 0.5ms (object extraction, distance calculation)
 *   Worker message:   < 0.1ms (structured clone of scene input)
 *   SAB read:         < 0.01ms (Atomics.load + float read)
 *   Total per frame:  < 0.61ms (well within 11.1ms VR budget)
 *
 * @module SNNPerceptionBridge
 */

import { logger } from './logger';
import type { Vec3 } from './AgentStateBuffer';
import type {
  SNNPerceptionBridgeConfig,
  SNNPerceptionBridgeMetrics,
  SNNPerceptionState,
  SNNPerceptionWorkerConfig,
  PerceptionSceneInput,
  PerceptionObjectInput,
  InferenceMetrics,
  WorkerInMessage,
  WorkerOutMessage,
} from './SNNPerceptionTypes';
import {
  DEFAULT_BRIDGE_CONFIG,
  DEFAULT_WORKER_CONFIG,
  calculateBufferLayout,
  createEmptySNNPerceptionState,
} from './SNNPerceptionTypes';
import {
  SharedPerceptionBuffer,
  createSharedPerceptionBuffer,
} from './SharedPerceptionBuffer';
import {
  SNNPerceptionWorker,
  createSNNPerceptionWorker,
} from './SNNPerceptionWorker';

// =============================================================================
// SCENE INPUT EXTRACTOR (used when no real Worker is available)
// =============================================================================

/**
 * Callback for extracting scene objects from the renderer.
 * The bridge calls this to capture lightweight snapshots of the scene.
 */
export type SceneInputExtractor = () => {
  objects: Array<{
    id: string;
    position: Vec3;
    scale: Vec3;
    visible: boolean;
  }>;
  cameraPosition: Vec3;
  cameraForward: Vec3;
};

// =============================================================================
// SNN PERCEPTION BRIDGE
// =============================================================================

export class SNNPerceptionBridge {
  private readonly config: Required<SNNPerceptionBridgeConfig>;
  private readonly workerConfig: SNNPerceptionWorkerConfig;

  // Worker (in-thread fallback when Web Workers unavailable)
  private worker: SNNPerceptionWorker | null = null;
  private webWorker: Worker | null = null;
  private useInThreadWorker: boolean = true;

  // SharedArrayBuffer exchange
  private perceptionBuffer: SharedPerceptionBuffer | null = null;
  private sab: SharedArrayBuffer | null = null;

  // Scene input
  private sceneExtractor: SceneInputExtractor | null = null;
  private lastObjectPositions: Map<string, Vec3> = new Map();
  private inputIntervalId: ReturnType<typeof setInterval> | null = null;
  private frameSequence: number = 0;

  // State
  private _isActive: boolean = false;
  private _isWorkerReady: boolean = false;
  private _gpuAvailable: boolean = false;
  private _gpuAdapterInfo: string = 'none';
  private currentHz: number;
  private targetHz: number;

  // Metrics
  private totalInferences: number = 0;
  private inferenceDurations: number[] = [];
  private gpuComputeTimes: number[] = [];
  private readonly MAX_METRICS_HISTORY = 30;

  // Adaptive frequency
  private consecutiveFastPasses: number = 0;
  private consecutiveSlowPasses: number = 0;

  constructor(config?: Partial<SNNPerceptionBridgeConfig>) {
    this.config = { ...DEFAULT_BRIDGE_CONFIG, ...config } as Required<SNNPerceptionBridgeConfig>;
    this.workerConfig = { ...DEFAULT_WORKER_CONFIG, ...this.config.workerConfig };
    this.currentHz = this.config.initialHz;
    this.targetHz = this.config.initialHz;
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Initialize the perception bridge.
   *
   * Creates the SharedArrayBuffer, initializes the worker (in-thread or
   * Web Worker), and sets up the perception buffer reader.
   *
   * @returns Initialization result
   */
  async initialize(): Promise<{
    gpuAvailable: boolean;
    adapterInfo: string;
  }> {
    if (this._isActive) {
      logger.warn('[SNNPerceptionBridge] Already initialized');
      return { gpuAvailable: this._gpuAvailable, adapterInfo: this._gpuAdapterInfo };
    }

    // Allocate SharedArrayBuffer
    const maxObjects = this.workerConfig.maxObjects;
    const { buffer, sab } = createSharedPerceptionBuffer(maxObjects);
    this.perceptionBuffer = buffer;
    this.sab = sab;

    // Initialize worker (in-thread for now, Web Worker support can be added)
    this.worker = createSNNPerceptionWorker(this.workerConfig);
    const result = await this.worker.initialize(sab);

    this._gpuAvailable = result.gpuAvailable;
    this._gpuAdapterInfo = result.adapterInfo;
    this._isWorkerReady = true;

    logger.info('[SNNPerceptionBridge] Initialized', {
      gpu: result.gpuAvailable,
      adapter: result.adapterInfo,
      maxObjects,
      initialHz: this.currentHz,
      sabSize: sab.byteLength,
    });

    return result;
  }

  /**
   * Start the perception input capture loop.
   *
   * Begins extracting scene input at the configured frequency
   * and feeding it to the worker for inference.
   */
  start(): void {
    if (this._isActive) {
      logger.warn('[SNNPerceptionBridge] Already active');
      return;
    }

    if (!this._isWorkerReady) {
      logger.error('[SNNPerceptionBridge] Cannot start: worker not ready');
      return;
    }

    this._isActive = true;
    this.scheduleInputCapture();

    // Start worker inference loop
    if (this.worker) {
      this.worker.setFrequency(this.currentHz);
      this.worker.startInferenceLoop();
    }

    logger.info('[SNNPerceptionBridge] Started', { hz: this.currentHz });
  }

  /**
   * Stop the perception system.
   */
  stop(): void {
    if (!this._isActive) return;

    this._isActive = false;
    this.clearInputInterval();

    if (this.worker) {
      this.worker.stopInferenceLoop();
    }

    logger.info('[SNNPerceptionBridge] Stopped');
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this.stop();

    if (this.worker) {
      this.worker.dispose();
      this.worker = null;
    }

    if (this.webWorker) {
      this.webWorker.terminate();
      this.webWorker = null;
    }

    if (this.perceptionBuffer) {
      this.perceptionBuffer.reset();
      this.perceptionBuffer = null;
    }

    this.sab = null;
    this.sceneExtractor = null;
    this.lastObjectPositions.clear();
    this._isActive = false;
    this._isWorkerReady = false;

    logger.info('[SNNPerceptionBridge] Disposed');
  }

  // ===========================================================================
  // SCENE INPUT
  // ===========================================================================

  /**
   * Set the scene input extractor callback.
   *
   * The bridge calls this to capture lightweight object snapshots
   * without directly accessing Three.js scene graph internals.
   *
   * @param extractor - Function that returns scene objects and camera state
   */
  setSceneExtractor(extractor: SceneInputExtractor): void {
    this.sceneExtractor = extractor;
    logger.debug('[SNNPerceptionBridge] Scene extractor registered');
  }

  /**
   * Manually provide scene input (alternative to extractor callback).
   */
  async feedInput(scene: PerceptionSceneInput): Promise<void> {
    if (!this._isWorkerReady || !this.worker) return;

    // Update object ID map in the perception buffer
    if (this.perceptionBuffer) {
      this.perceptionBuffer.setObjectIdMap(
        scene.objects.map(o => o.id),
      );
    }

    const metrics = await this.worker.processInput(scene);
    this.trackMetrics(metrics);
  }

  // ===========================================================================
  // PERCEPTION OUTPUT (RENDER LOOP SAFE)
  // ===========================================================================

  /**
   * Read the latest perception state.
   *
   * Called from the render loop at 90Hz. Uses the SharedPerceptionBuffer
   * to read from the SharedArrayBuffer with Atomics acquire semantics.
   *
   * Cost: < 0.01ms. NEVER blocks.
   *
   * @returns Latest perception state (may be cached if no new inference)
   */
  readPerception(): Readonly<SNNPerceptionState> {
    if (!this.perceptionBuffer) {
      return createEmptySNNPerceptionState();
    }
    return this.perceptionBuffer.readState();
  }

  /**
   * Check if new perception data is available.
   *
   * Cost: single Atomics.load (~0.001ms).
   */
  hasNewPerception(): boolean {
    return this.perceptionBuffer?.hasNewData() ?? false;
  }

  /**
   * Get the last perception state without checking for updates.
   */
  getLastPerception(): Readonly<SNNPerceptionState> {
    return this.perceptionBuffer?.getLastState() ?? createEmptySNNPerceptionState();
  }

  // ===========================================================================
  // FREQUENCY CONTROL
  // ===========================================================================

  /**
   * Get the current inference frequency in Hz.
   */
  getCurrentHz(): number {
    return this.currentHz;
  }

  /**
   * Get the target inference frequency in Hz.
   */
  getTargetHz(): number {
    return this.targetHz;
  }

  /**
   * Set the target inference frequency.
   *
   * @param hz - Target frequency (clamped to min/max)
   */
  setTargetHz(hz: number): void {
    const clamped = Math.max(this.config.minHz, Math.min(this.config.maxHz, hz));
    const oldHz = this.targetHz;
    this.targetHz = clamped;

    if (oldHz !== clamped) {
      this.applyFrequencyChange('manual');
    }
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Get comprehensive bridge metrics.
   */
  getMetrics(): SNNPerceptionBridgeMetrics {
    const avgInference = this.inferenceDurations.length > 0
      ? this.inferenceDurations.reduce((a, b) => a + b, 0) / this.inferenceDurations.length
      : 0;
    const peakInference = this.inferenceDurations.length > 0
      ? Math.max(...this.inferenceDurations)
      : 0;
    const avgGpu = this.gpuComputeTimes.length > 0
      ? this.gpuComputeTimes.reduce((a, b) => a + b, 0) / this.gpuComputeTimes.length
      : 0;

    const lastState = this.perceptionBuffer?.getLastState() ?? createEmptySNNPerceptionState();
    const layout = calculateBufferLayout(this.workerConfig.maxObjects);

    return {
      isActive: this._isActive,
      isWorkerReady: this._isWorkerReady,
      gpuAvailable: this._gpuAvailable,
      gpuAdapterInfo: this._gpuAdapterInfo,
      currentHz: this.currentHz,
      targetHz: this.targetHz,
      totalInferences: this.totalInferences,
      averageInferenceDurationMs: Math.round(avgInference * 100) / 100,
      peakInferenceDurationMs: Math.round(peakInference * 100) / 100,
      averageGpuComputeMs: Math.round(avgGpu * 100) / 100,
      trackedObjectCount: lastState.trackedObjectCount,
      globalAnomalyLevel: lastState.globalAnomalyLevel,
      averageSpikeRate: lastState.averageSpikeRate,
      sabSizeBytes: layout.totalBytes,
    };
  }

  /**
   * Check if the bridge is currently active.
   */
  isActive(): boolean {
    return this._isActive;
  }

  /**
   * Check if the worker is ready.
   */
  isWorkerReady(): boolean {
    return this._isWorkerReady;
  }

  /**
   * Check if WebGPU is available in the worker.
   */
  isGPUAvailable(): boolean {
    return this._gpuAvailable;
  }

  // ===========================================================================
  // INTERNAL: INPUT CAPTURE LOOP
  // ===========================================================================

  /**
   * Schedule periodic scene input capture.
   */
  private scheduleInputCapture(): void {
    this.clearInputInterval();

    const intervalMs = Math.max(1, Math.round(1000 / this.currentHz));
    this.inputIntervalId = setInterval(() => {
      this.captureAndSendInput();
    }, intervalMs);
  }

  /**
   * Clear the input capture interval.
   */
  private clearInputInterval(): void {
    if (this.inputIntervalId !== null) {
      clearInterval(this.inputIntervalId);
      this.inputIntervalId = null;
    }
  }

  /**
   * Capture scene input and send to worker.
   */
  private async captureAndSendInput(): Promise<void> {
    if (!this.sceneExtractor || !this._isWorkerReady) return;

    try {
      const snapshot = this.sceneExtractor();
      const scene = this.buildSceneInput(snapshot);

      // Update object ID map in perception buffer
      if (this.perceptionBuffer) {
        this.perceptionBuffer.setObjectIdMap(
          scene.objects.map(o => o.id),
        );
      }

      // Send to worker
      if (this.worker) {
        const metrics = await this.worker.processInput(scene);
        this.trackMetrics(metrics);

        // Adapt frequency if enabled
        if (this.config.adaptiveFrequency) {
          this.adaptFrequency(metrics);
        }

        // Notify listener
        const state = this.readPerception();
        this.config.onPerceptionUpdate(state);
      }
    } catch (err) {
      logger.error('[SNNPerceptionBridge] Input capture error', {
        error: String(err),
      });
    }
  }

  /**
   * Build a PerceptionSceneInput from extractor output.
   */
  private buildSceneInput(snapshot: ReturnType<SceneInputExtractor>): PerceptionSceneInput {
    this.frameSequence++;

    const camPos = snapshot.cameraPosition;
    const camFwd = snapshot.cameraForward;

    let objects: PerceptionObjectInput[] = snapshot.objects
      .filter(obj => obj.visible)
      .map(obj => {
        // Calculate velocity from last known position
        const lastPos = this.lastObjectPositions.get(obj.id);
        const velocity: Vec3 = lastPos
          ? {
              x: obj.position.x - lastPos.x,
              y: obj.position.y - lastPos.y,
              z: obj.position.z - lastPos.z,
            }
          : { x: 0, y: 0, z: 0 };

        // Store current position for next frame velocity calculation
        this.lastObjectPositions.set(obj.id, { ...obj.position });

        // Calculate distance from camera
        const dx = obj.position.x - camPos.x;
        const dy = obj.position.y - camPos.y;
        const dz = obj.position.z - camPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Calculate bounding sphere radius from scale
        const size = Math.max(obj.scale.x, obj.scale.y, obj.scale.z) * 0.5;

        // Calculate angular size
        const angularSize = distance > 0 ? 2 * Math.atan(size / distance) : Math.PI;

        // Movement detection
        const hasMoved = velocity.x !== 0 || velocity.y !== 0 || velocity.z !== 0;

        return {
          id: obj.id,
          position: obj.position,
          velocity,
          size,
          distanceFromCamera: distance,
          angularSize,
          hasMoved,
        };
      });

    // Sort by distance if configured
    if (this.config.distanceSortInput) {
      objects.sort((a, b) => a.distanceFromCamera - b.distanceFromCamera);
    }

    // Limit to max objects
    objects = objects.slice(0, this.config.maxInputObjects);

    return {
      objects,
      cameraPosition: camPos,
      cameraForward: camFwd,
      timestamp: performance.now(),
      frameSequence: this.frameSequence,
    };
  }

  // ===========================================================================
  // INTERNAL: ADAPTIVE FREQUENCY
  // ===========================================================================

  /**
   * Adapt inference frequency based on worker performance.
   */
  private adaptFrequency(metrics: InferenceMetrics): void {
    const budgetMs = 1000 / this.currentHz; // Time budget per inference
    const ratio = metrics.totalMs / budgetMs;

    // Fast pass: inference uses < 50% of budget
    if (ratio < 0.5) {
      this.consecutiveFastPasses++;
      this.consecutiveSlowPasses = 0;

      if (this.consecutiveFastPasses >= 5) {
        const newHz = Math.min(this.currentHz + 1, this.config.maxHz);
        if (newHz !== this.currentHz) {
          this.targetHz = newHz;
          this.applyFrequencyChange('fast_passes');
        }
        this.consecutiveFastPasses = 0;
      }
    }
    // Slow pass: inference uses > 90% of budget
    else if (ratio > 0.9) {
      this.consecutiveSlowPasses++;
      this.consecutiveFastPasses = 0;

      if (this.consecutiveSlowPasses >= 2) {
        const newHz = Math.max(this.currentHz - 1, this.config.minHz);
        if (newHz !== this.currentHz) {
          this.targetHz = newHz;
          this.applyFrequencyChange('slow_passes');
        }
        this.consecutiveSlowPasses = 0;
      }
    }
    // Normal range
    else {
      this.consecutiveFastPasses = 0;
      this.consecutiveSlowPasses = 0;
    }
  }

  /**
   * Apply a frequency change.
   */
  private applyFrequencyChange(reason: string): void {
    const oldHz = this.currentHz;
    this.currentHz = this.targetHz;

    this.config.onFrequencyChange(oldHz, this.currentHz, reason);

    // Restart input capture interval
    if (this._isActive) {
      this.scheduleInputCapture();
    }

    // Update worker frequency
    if (this.worker) {
      this.worker.setFrequency(this.currentHz);
    }

    logger.info('[SNNPerceptionBridge] Frequency changed', {
      from: oldHz,
      to: this.currentHz,
      reason,
    });
  }

  // ===========================================================================
  // INTERNAL: METRICS TRACKING
  // ===========================================================================

  private trackMetrics(metrics: InferenceMetrics): void {
    this.totalInferences++;
    this.inferenceDurations.push(metrics.totalMs);
    this.gpuComputeTimes.push(metrics.gpuComputeMs);

    if (this.inferenceDurations.length > this.MAX_METRICS_HISTORY) {
      this.inferenceDurations.shift();
      this.gpuComputeTimes.shift();
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create an SNNPerceptionBridge with optional configuration.
 */
export function createSNNPerceptionBridge(
  config?: Partial<SNNPerceptionBridgeConfig>,
): SNNPerceptionBridge {
  return new SNNPerceptionBridge(config);
}
