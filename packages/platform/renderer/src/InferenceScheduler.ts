/**
 * InferenceScheduler
 *
 * Orchestrates the hierarchical inference scheduling architecture:
 *
 * TIER 1 (SLOW PATH - 1-5Hz):
 *   SpatialReasoningProvider.infer() runs on a setInterval loop,
 *   completely decoupled from the VR render loop.
 *   Results are written to the BACK buffer of CachedSpatialState.
 *
 * TIER 2 (FAST PATH - 90Hz):
 *   HololandRenderer reads from the FRONT buffer of CachedSpatialState.
 *   No blocking, no inference computation, just data reads.
 *   Budget: < 0.1ms per frame for reading spatial state.
 *
 * BUFFER SWAP:
 *   After each inference pass completes, the scheduler swaps the
 *   double-buffered CachedSpatialState, making new results visible
 *   to the renderer. The swap is O(n) for deep copy but happens
 *   at 1-5Hz, not at 90Hz, so the cost is amortized.
 *
 * ADAPTIVE FREQUENCY:
 *   The scheduler monitors inference duration and scene complexity
 *   to automatically adjust the inference frequency:
 *   - Simple scene (< 50 objects): 5Hz (200ms budget)
 *   - Medium scene (50-200 objects): 3Hz (333ms budget)
 *   - Complex scene (200+ objects): 1-2Hz (500-1000ms budget)
 *   - Inference exceeds budget: Frequency reduced automatically
 *   - Inference well under budget: Frequency increased gradually
 *
 * DATA FLOW:
 * ```
 *   Scene Graph (Three.js)
 *        |
 *        v
 *   InferenceScheduler.takeSnapshot()     <-- Between frames
 *        |
 *        v
 *   SpatialReasoningProvider.infer()       <-- 1-5Hz, OFF render loop
 *        |
 *        v
 *   AgentStateBuffer<CachedSpatialState>.swap()  <-- Atomic swap
 *        |
 *        v
 *   getFrontBuffer()                       <-- 90Hz, ON render loop
 *        |
 *        v
 *   HololandRenderer.syncSpatialInference()  <-- Apply to scene
 * ```
 *
 * @module InferenceScheduler
 */

import { logger } from './logger';
import {
  AgentStateBuffer,
} from './AgentStateBuffer';
import type {
  CachedSpatialState,
  InferenceSchedulerConfig,
  InferenceSchedulerMetrics,
  SpatialReasoningProvider,
} from './SpatialInferenceTypes';
import {
  createEmptyCachedSpatialState,
} from './SpatialInferenceTypes';
import type {
  ObjectSnapshot,
  CameraSnapshot,
  SpatialReasoningEngine,
} from './SpatialReasoningEngine';

// =============================================================================
// SCENE SNAPSHOT CALLBACK TYPE
// =============================================================================

/**
 * Callback to take a snapshot of the current scene graph.
 *
 * The InferenceScheduler calls this between frames to get a
 * lightweight copy of object transforms without touching the
 * Three.js scene graph during inference.
 *
 * @returns Object and camera snapshots
 */
export type SceneSnapshotCallback = () => {
  objects: ObjectSnapshot[];
  camera: CameraSnapshot;
};

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: Required<InferenceSchedulerConfig> = {
  minHz: 1,
  maxHz: 5,
  initialHz: 2,
  maxInferenceBudgetMs: 200,
  complexityThreshold: 0.7,
  autoStart: false,
  stalenessThresholdMs: 2000,
  adaptiveFrequency: true,
  onFrequencyChange: () => {},
};

// =============================================================================
// INFERENCE SCHEDULER
// =============================================================================

export class InferenceScheduler {
  private readonly config: Required<InferenceSchedulerConfig>;
  private readonly buffer: AgentStateBuffer<CachedSpatialState>;
  private readonly provider: SpatialReasoningProvider;

  // Scene snapshot callback (set by renderer integration)
  private snapshotCallback: SceneSnapshotCallback | null = null;

  // Inference loop state
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private isInferring: boolean = false;

  // Frequency control
  private currentHz: number;
  private targetHz: number;

  // Metrics tracking
  private totalPasses: number = 0;
  private skippedPasses: number = 0;
  private inferenceDurations: number[] = [];
  private lastInferenceTime: number = 0;
  private readonly MAX_DURATION_HISTORY = 30;

  // Adaptive frequency state
  private consecutiveFastPasses: number = 0;
  private consecutiveSlowPasses: number = 0;
  private readonly FAST_THRESHOLD_RATIO = 0.5; // Under 50% budget = fast
  private readonly SLOW_THRESHOLD_RATIO = 0.9; // Over 90% budget = slow
  private readonly RAMP_UP_THRESHOLD = 5;      // 5 fast passes to increase Hz
  private readonly RAMP_DOWN_THRESHOLD = 2;    // 2 slow passes to decrease Hz

  constructor(
    provider: SpatialReasoningProvider,
    config?: InferenceSchedulerConfig,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.provider = provider;

    // Initialize double-buffered state
    this.buffer = new AgentStateBuffer<CachedSpatialState>(
      createEmptyCachedSpatialState,
      this.config.stalenessThresholdMs,
    );

    // Set initial frequency
    this.currentHz = this.config.initialHz;
    this.targetHz = this.config.initialHz;

    if (this.config.autoStart) {
      this.start();
    }

    logger.info('[InferenceScheduler] Initialized', {
      initialHz: this.currentHz,
      minHz: this.config.minHz,
      maxHz: this.config.maxHz,
      maxBudgetMs: this.config.maxInferenceBudgetMs,
      adaptiveFrequency: this.config.adaptiveFrequency,
    });
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start the inference scheduling loop.
   *
   * Initializes the provider and begins the setInterval loop at the
   * configured frequency. The loop runs completely off the render thread.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[InferenceScheduler] Already running');
      return;
    }

    // Initialize provider if it has an initialize method
    if (this.provider.initialize) {
      await this.provider.initialize();
    }

    this.isRunning = true;
    this.scheduleNextInterval();

    logger.info('[InferenceScheduler] Started', { hz: this.currentHz });
  }

  /**
   * Stop the inference scheduling loop.
   * Current inference pass will complete before stopping.
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[InferenceScheduler] Already stopped');
      return;
    }

    this.clearInterval();
    this.isRunning = false;

    logger.info('[InferenceScheduler] Stopped');
  }

  /**
   * Dispose the scheduler and release all resources.
   */
  dispose(): void {
    this.stop();

    if (this.provider.dispose) {
      this.provider.dispose();
    }

    this.buffer.reset();
    this.snapshotCallback = null;
    this.inferenceDurations = [];

    logger.info('[InferenceScheduler] Disposed');
  }

  // ===========================================================================
  // SCENE SNAPSHOT INTEGRATION
  // ===========================================================================

  /**
   * Set the callback used to take scene snapshots.
   *
   * The renderer provides this callback, which captures lightweight
   * copies of object transforms without scene graph contention.
   *
   * @param callback - Function that returns object and camera snapshots
   */
  setSnapshotCallback(callback: SceneSnapshotCallback): void {
    this.snapshotCallback = callback;
    logger.debug('[InferenceScheduler] Snapshot callback registered');
  }

  // ===========================================================================
  // BUFFER ACCESS (FOR RENDERER)
  // ===========================================================================

  /**
   * Get the double-buffered CachedSpatialState container.
   *
   * The renderer calls buffer.getFrontBuffer() each frame to read
   * the latest spatial reasoning results.
   *
   * @returns The AgentStateBuffer containing CachedSpatialState
   */
  getBuffer(): AgentStateBuffer<CachedSpatialState> {
    return this.buffer;
  }

  /**
   * Get the current cached spatial state (front buffer).
   *
   * Convenience wrapper for renderer integration.
   * Cost: O(1), zero allocation - safe for 90Hz render loop.
   */
  getCurrentState(): Readonly<CachedSpatialState> {
    return this.buffer.getFrontBuffer();
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
   * May differ from currentHz during frequency transitions.
   */
  getTargetHz(): number {
    return this.targetHz;
  }

  /**
   * Manually set the target inference frequency.
   * Overrides adaptive frequency for the next pass.
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
   * Get comprehensive scheduler metrics.
   */
  getMetrics(): InferenceSchedulerMetrics {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Calculate average and peak durations
    let averageDuration = 0;
    let peakDuration = 0;
    if (this.inferenceDurations.length > 0) {
      averageDuration = this.inferenceDurations.reduce((a, b) => a + b, 0)
        / this.inferenceDurations.length;
      peakDuration = Math.max(...this.inferenceDurations);
    }

    const timeSinceLastInference = this.lastInferenceTime > 0
      ? now - this.lastInferenceTime
      : 0;

    return {
      isRunning: this.isRunning,
      currentHz: this.currentHz,
      targetHz: this.targetHz,
      totalPasses: this.totalPasses,
      averageInferenceDurationMs: Math.round(averageDuration * 100) / 100,
      peakInferenceDurationMs: Math.round(peakDuration * 100) / 100,
      sceneComplexity: this.provider.getComplexity(),
      isInferring: this.isInferring,
      timeSinceLastInferenceMs: Math.round(timeSinceLastInference * 100) / 100,
      skippedPasses: this.skippedPasses,
      isBufferStale: this.buffer.getMetrics().isStale,
    };
  }

  /**
   * Check if the scheduler is currently running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // ===========================================================================
  // INFERENCE LOOP (OFF RENDER THREAD)
  // ===========================================================================

  /**
   * Execute a single inference pass.
   *
   * Called by the setInterval loop. This method:
   * 1. Takes a scene snapshot (if callback registered)
   * 2. Runs the provider's infer() method
   * 3. Swaps the double buffer to make results visible
   * 4. Adapts frequency if needed
   *
   * If a previous inference is still running, this pass is skipped.
   */
  private async runInferencePass(): Promise<void> {
    // Skip if previous inference is still running
    if (this.isInferring) {
      this.skippedPasses++;
      logger.debug('[InferenceScheduler] Skipping pass (previous still running)', {
        skippedTotal: this.skippedPasses,
      });
      return;
    }

    this.isInferring = true;
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    try {
      // Step 1: Take scene snapshot
      if (this.snapshotCallback) {
        const snapshot = this.snapshotCallback();

        // If the provider is a SpatialReasoningEngine, set the snapshot
        if ('setSceneSnapshot' in this.provider) {
          (this.provider as SpatialReasoningEngine).setSceneSnapshot(
            snapshot.objects,
            snapshot.camera,
          );
        }
      }

      // Step 2: Run inference on the back buffer
      const backBuffer = this.buffer.getBackBuffer();
      const deltaMs = this.lastInferenceTime > 0
        ? startTime - this.lastInferenceTime
        : 1000 / this.currentHz;

      await this.provider.infer(backBuffer, deltaMs);

      // Step 3: Update target Hz in the state
      backBuffer.targetHz = this.targetHz;

      // Step 4: Swap buffers (makes results visible to renderer)
      this.buffer.swap();

      // Step 5: Track metrics
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const duration = endTime - startTime;

      this.lastInferenceTime = endTime;
      this.totalPasses++;
      this.inferenceDurations.push(duration);
      if (this.inferenceDurations.length > this.MAX_DURATION_HISTORY) {
        this.inferenceDurations.shift();
      }

      // Step 6: Adapt frequency if enabled
      if (this.config.adaptiveFrequency) {
        this.adaptFrequency(duration);
      }

      logger.debug('[InferenceScheduler] Inference pass complete', {
        pass: this.totalPasses,
        durationMs: duration.toFixed(2),
        hz: this.currentHz,
      });

    } catch (error) {
      logger.error('[InferenceScheduler] Inference pass failed', {
        error: String(error),
        pass: this.totalPasses,
      });
    } finally {
      this.isInferring = false;
    }
  }

  // ===========================================================================
  // ADAPTIVE FREQUENCY
  // ===========================================================================

  /**
   * Adapt inference frequency based on recent pass durations.
   *
   * Strategy:
   * - If inference consistently uses < 50% of budget: increase Hz (up to maxHz)
   * - If inference consistently uses > 90% of budget: decrease Hz (down to minHz)
   * - Also considers scene complexity from the provider
   */
  private adaptFrequency(lastDurationMs: number): void {
    const budget = this.config.maxInferenceBudgetMs;
    const ratio = lastDurationMs / budget;

    // Check if pass was fast (well under budget)
    if (ratio < this.FAST_THRESHOLD_RATIO) {
      this.consecutiveFastPasses++;
      this.consecutiveSlowPasses = 0;

      if (this.consecutiveFastPasses >= this.RAMP_UP_THRESHOLD) {
        // Increase frequency
        const newHz = Math.min(this.currentHz + 0.5, this.config.maxHz);
        if (newHz !== this.currentHz) {
          this.targetHz = newHz;
          this.applyFrequencyChange('fast_passes');
        }
        this.consecutiveFastPasses = 0;
      }
    }
    // Check if pass was slow (approaching budget)
    else if (ratio > this.SLOW_THRESHOLD_RATIO) {
      this.consecutiveSlowPasses++;
      this.consecutiveFastPasses = 0;

      if (this.consecutiveSlowPasses >= this.RAMP_DOWN_THRESHOLD) {
        // Decrease frequency
        const newHz = Math.max(this.currentHz - 0.5, this.config.minHz);
        if (newHz !== this.currentHz) {
          this.targetHz = newHz;
          this.applyFrequencyChange('slow_passes');
        }
        this.consecutiveSlowPasses = 0;
      }
    }
    // Normal range - reset counters
    else {
      this.consecutiveFastPasses = 0;
      this.consecutiveSlowPasses = 0;
    }

    // Also check scene complexity
    const complexity = this.provider.getComplexity();
    if (complexity > this.config.complexityThreshold && this.currentHz > this.config.minHz + 0.5) {
      // High complexity scene - bias towards lower frequency
      const complexityHz = Math.max(
        this.config.minHz,
        this.config.maxHz * (1 - complexity),
      );
      if (complexityHz < this.currentHz - 0.5) {
        this.targetHz = complexityHz;
        this.applyFrequencyChange('high_complexity');
      }
    }
  }

  /**
   * Apply a frequency change by restarting the interval.
   */
  private applyFrequencyChange(reason: string): void {
    const oldHz = this.currentHz;
    this.currentHz = this.targetHz;

    this.config.onFrequencyChange(oldHz, this.currentHz, reason);

    logger.info('[InferenceScheduler] Frequency changed', {
      from: oldHz,
      to: this.currentHz,
      reason,
    });

    // Restart interval with new frequency
    if (this.isRunning) {
      this.clearInterval();
      this.scheduleNextInterval();
    }
  }

  // ===========================================================================
  // INTERVAL MANAGEMENT
  // ===========================================================================

  /**
   * Schedule the next interval based on current Hz.
   */
  private scheduleNextInterval(): void {
    const intervalMs = Math.max(1, Math.round(1000 / this.currentHz));
    this.intervalId = setInterval(() => {
      this.runInferencePass();
    }, intervalMs);
  }

  /**
   * Clear the current interval.
   */
  private clearInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create an InferenceScheduler with a SpatialReasoningProvider.
 *
 * @param provider - The spatial reasoning provider (e.g., SpatialReasoningEngine)
 * @param config - Optional scheduler configuration
 * @returns Configured InferenceScheduler
 */
export function createInferenceScheduler(
  provider: SpatialReasoningProvider,
  config?: InferenceSchedulerConfig,
): InferenceScheduler {
  return new InferenceScheduler(provider, config);
}
