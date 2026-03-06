/**
 * AdaptiveFrameRateManager
 *
 * Implements adaptive frame rate switching for Quest 4 (Snapdragon XR2 Gen 3)
 * thermal constraints, coordinating GPU/NPU workload with frame rate targets.
 *
 * ARCHITECTURE:
 *
 * The Quest 4 with XR2 Gen 3 has a shared thermal envelope between GPU and NPU.
 * When NPU AI inference is active (via InferenceScheduler), the GPU thermal
 * budget is reduced, requiring a lower frame rate to stay within safe limits.
 *
 * FRAME RATE TIERS (descending):
 *   144Hz - Rendering-only mode, no AI inference active, cool thermal state
 *   120Hz - Moderate thermal state OR transitioning between modes
 *   90Hz  - AI inference active (NPU drawing from thermal budget)
 *   72Hz  - Emergency thermal throttle (thermal runaway prevention)
 *
 * THERMAL MONITORING:
 *   WebXR does not expose direct thermal sensors. The manager uses proxy signals:
 *   1. Frame timing variance: Thermal throttling causes GPU clock reduction,
 *      manifesting as increased frame time jitter before sustained drops.
 *   2. Frame budget utilization: Percentage of frame budget consumed indicates
 *      headroom available for higher frame rates.
 *   3. Memory pressure: performance.measureUserAgentSpecificMemory() signals
 *      memory-related thermal pressure on mobile SoCs.
 *
 * GRADUAL DEGRADATION:
 *   The manager never drops more than one tier per evaluation interval,
 *   providing smooth transitions: 144 -> 120 -> 90 -> 72 Hz.
 *   Upgrades require sustained stability across multiple evaluation windows.
 *
 * INTEGRATION:
 *   Plugs into HololandRenderer's animate() loop via onFrameStart/onFrameEnd
 *   callbacks. The renderer calls these each frame, and the manager signals
 *   frame rate changes via the onFrameRateChange callback.
 *
 * DATA FLOW:
 * ```
 *   HololandRenderer.animate()
 *       |
 *       v
 *   AdaptiveFrameRateManager.onFrameStart()     <-- Record timestamp
 *       |
 *       v
 *   [render pass, inference sync, etc.]
 *       |
 *       v
 *   AdaptiveFrameRateManager.onFrameEnd()       <-- Calculate frame time
 *       |
 *       v
 *   evaluateThermalState()                       <-- Every N frames
 *       |
 *       v
 *   determineTargetHz()                          <-- Consider AI state + thermals
 *       |
 *       v
 *   onFrameRateChange(oldHz, newHz, reason)      <-- Notify renderer
 * ```
 *
 * @module AdaptiveFrameRateManager
 */

import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported frame rate tiers for Quest 4 XR2 Gen 3.
 * Ordered from highest to lowest for degradation path.
 */
export type FrameRateTier = 144 | 120 | 90 | 72;

/**
 * All supported frame rate tiers in descending order.
 */
export const FRAME_RATE_TIERS: readonly FrameRateTier[] = [144, 120, 90, 72] as const;

/**
 * Thermal state classification based on proxy signals.
 */
export type ThermalState = 'cool' | 'warm' | 'hot' | 'critical';

/**
 * Reason for a frame rate change.
 */
export type FrameRateChangeReason =
  | 'ai_inference_started'
  | 'ai_inference_stopped'
  | 'thermal_upgrade'
  | 'thermal_downgrade'
  | 'manual_override'
  | 'initial'
  | 'memory_pressure'
  | 'frame_time_variance';

/**
 * Operating mode of the renderer.
 */
export type RenderingMode = 'render_only' | 'ai_active';

/**
 * Configuration for the AdaptiveFrameRateManager.
 */
export interface AdaptiveFrameRateConfig {
  /** Initial frame rate tier (default: 90) */
  initialHz?: FrameRateTier;

  /** Frame rate when AI inference is active (default: 90) */
  aiActiveHz?: FrameRateTier;

  /** Frame rate when rendering only, no AI (default: 144) */
  renderOnlyHz?: FrameRateTier;

  /** Enable thermal throttling (default: true) */
  thermalThrottling?: boolean;

  /** Evaluation interval in frames (default: 60) */
  evaluationIntervalFrames?: number;

  /**
   * Frame time variance threshold (coefficient of variation) above which
   * thermal pressure is assumed (default: 0.15 = 15% CV).
   */
  varianceThresholdCV?: number;

  /**
   * Frame budget utilization threshold (0-1) above which thermal pressure
   * is assumed (default: 0.85 = 85% budget used).
   */
  budgetUtilizationThreshold?: number;

  /**
   * Number of consecutive stable evaluation windows required before
   * upgrading to a higher frame rate tier (default: 3).
   */
  upgradeStabilityWindows?: number;

  /**
   * Number of consecutive stressed evaluation windows required before
   * downgrading to a lower frame rate tier (default: 2).
   */
  downgradeStressWindows?: number;

  /**
   * Cooldown in milliseconds after a frame rate change before another
   * change can occur (default: 2000).
   */
  changeCooldownMs?: number;

  /**
   * Memory pressure threshold in bytes. If measured memory exceeds this,
   * thermal downgrade is triggered. (default: 512MB = 536870912)
   */
  memoryPressureThresholdBytes?: number;

  /**
   * Whether to auto-start monitoring (default: false).
   */
  autoStart?: boolean;

  /**
   * Callback when frame rate changes.
   */
  onFrameRateChange?: (
    oldHz: FrameRateTier,
    newHz: FrameRateTier,
    reason: FrameRateChangeReason,
  ) => void;

  /**
   * Callback when thermal state changes.
   */
  onThermalStateChange?: (
    oldState: ThermalState,
    newState: ThermalState,
  ) => void;
}

/**
 * Telemetry metrics exposed for the performance dashboard.
 */
export interface AdaptiveFrameRateMetrics {
  /** Whether the manager is actively monitoring */
  isRunning: boolean;

  /** Current frame rate in Hz */
  currentHz: FrameRateTier;

  /** Target frame rate in Hz (may differ during transitions) */
  targetHz: FrameRateTier;

  /** Current rendering mode */
  renderingMode: RenderingMode;

  /** Current thermal state classification */
  thermalState: ThermalState;

  /** Average frame time over the current evaluation window (ms) */
  averageFrameTimeMs: number;

  /** Frame time variance (coefficient of variation) */
  frameTimeVarianceCV: number;

  /** Current frame budget utilization (0-1) */
  budgetUtilization: number;

  /** Total number of frame rate changes since start */
  totalFrameRateChanges: number;

  /** Time spent in each tier since start (ms) */
  timeInTierMs: Record<FrameRateTier, number>;

  /** Consecutive stable windows (counting toward upgrade) */
  consecutiveStableWindows: number;

  /** Consecutive stressed windows (counting toward downgrade) */
  consecutiveStressedWindows: number;

  /** Last measured memory usage in bytes (0 if unavailable) */
  lastMemoryUsageBytes: number;

  /** Timestamp of the last frame rate change */
  lastChangeTimestamp: number;

  /** History of recent frame rate changes (last 20) */
  changeHistory: FrameRateChangeEvent[];
}

/**
 * A recorded frame rate change event for telemetry history.
 */
export interface FrameRateChangeEvent {
  timestamp: number;
  fromHz: FrameRateTier;
  toHz: FrameRateTier;
  reason: FrameRateChangeReason;
  thermalState: ThermalState;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: Required<AdaptiveFrameRateConfig> = {
  initialHz: 90,
  aiActiveHz: 90,
  renderOnlyHz: 144,
  thermalThrottling: true,
  evaluationIntervalFrames: 60,
  varianceThresholdCV: 0.15,
  budgetUtilizationThreshold: 0.85,
  upgradeStabilityWindows: 3,
  downgradeStressWindows: 2,
  changeCooldownMs: 2000,
  memoryPressureThresholdBytes: 536870912, // 512MB
  autoStart: false,
  onFrameRateChange: () => {},
  onThermalStateChange: () => {},
};

// =============================================================================
// ADAPTIVE FRAME RATE MANAGER
// =============================================================================

export class AdaptiveFrameRateManager {
  private readonly config: Required<AdaptiveFrameRateConfig>;

  // Current state
  private currentHz: FrameRateTier;
  private targetHz: FrameRateTier;
  private renderingMode: RenderingMode = 'render_only';
  private thermalState: ThermalState = 'cool';
  private isRunning: boolean = false;

  // Frame timing tracking
  private frameStartTime: number = 0;
  private frameTimes: number[] = [];
  private frameCount: number = 0;

  // Evaluation state
  private consecutiveStableWindows: number = 0;
  private consecutiveStressedWindows: number = 0;
  private lastChangeTimestamp: number = 0;
  private totalFrameRateChanges: number = 0;

  // Time tracking per tier
  private timeInTierMs: Record<FrameRateTier, number> = {
    144: 0,
    120: 0,
    90: 0,
    72: 0,
  };
  private lastTierChangeTime: number = 0;

  // Memory monitoring
  private lastMemoryUsageBytes: number = 0;
  private memoryCheckInterval: ReturnType<typeof setInterval> | null = null;

  // Change history for telemetry
  private changeHistory: FrameRateChangeEvent[] = [];
  private readonly MAX_CHANGE_HISTORY = 20;

  constructor(config?: AdaptiveFrameRateConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentHz = this.config.initialHz;
    this.targetHz = this.config.initialHz;
    this.lastTierChangeTime = this.now();

    if (this.config.autoStart) {
      this.start();
    }

    logger.info('[AdaptiveFrameRateManager] Initialized', {
      initialHz: this.currentHz,
      aiActiveHz: this.config.aiActiveHz,
      renderOnlyHz: this.config.renderOnlyHz,
      thermalThrottling: this.config.thermalThrottling,
    });
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start adaptive frame rate monitoring.
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[AdaptiveFrameRateManager] Already running');
      return;
    }

    this.isRunning = true;
    this.lastTierChangeTime = this.now();
    this.startMemoryMonitoring();

    logger.info('[AdaptiveFrameRateManager] Started', { hz: this.currentHz });
  }

  /**
   * Stop adaptive frame rate monitoring.
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[AdaptiveFrameRateManager] Already stopped');
      return;
    }

    this.isRunning = false;
    this.stopMemoryMonitoring();
    this.accumulateTierTime();

    logger.info('[AdaptiveFrameRateManager] Stopped');
  }

  /**
   * Dispose the manager and release all resources.
   */
  dispose(): void {
    this.stop();
    this.frameTimes = [];
    this.changeHistory = [];
    this.frameCount = 0;

    logger.info('[AdaptiveFrameRateManager] Disposed');
  }

  // ===========================================================================
  // FRAME LOOP INTEGRATION
  // ===========================================================================

  /**
   * Called at the start of each render frame.
   * Records the frame start timestamp for frame time measurement.
   */
  onFrameStart(): void {
    this.frameStartTime = this.now();
  }

  /**
   * Called at the end of each render frame.
   * Records the frame time and triggers evaluation when the window is full.
   */
  onFrameEnd(): void {
    if (!this.isRunning) return;

    const frameTime = this.now() - this.frameStartTime;
    if (frameTime <= 0) return; // Skip invalid measurements

    this.frameTimes.push(frameTime);
    this.frameCount++;

    // Evaluate thermal state at configured interval
    if (this.frameTimes.length >= this.config.evaluationIntervalFrames) {
      this.evaluate();
    }
  }

  // ===========================================================================
  // AI INFERENCE STATE
  // ===========================================================================

  /**
   * Notify the manager that AI/NPU inference has started.
   * Immediately adjusts the target frame rate for AI-active mode.
   */
  setAIInferenceActive(active: boolean): void {
    const newMode: RenderingMode = active ? 'ai_active' : 'render_only';

    if (newMode === this.renderingMode) return;

    const oldMode = this.renderingMode;
    this.renderingMode = newMode;

    logger.info('[AdaptiveFrameRateManager] Rendering mode changed', {
      from: oldMode,
      to: newMode,
    });

    // Determine appropriate frame rate for the new mode
    if (active) {
      // AI active: drop to AI tier (typically 90Hz)
      const aiHz = this.config.aiActiveHz;
      if (this.currentHz > aiHz) {
        this.applyFrameRateChange(aiHz, 'ai_inference_started');
      }
    } else {
      // AI stopped: can potentially upgrade if thermally stable
      // Don't immediately jump to max - let the evaluation cycle upgrade gradually
      const renderOnlyHz = this.config.renderOnlyHz;
      if (this.currentHz < renderOnlyHz && this.thermalState === 'cool') {
        // Only upgrade one tier at a time
        const nextTier = this.getNextHigherTier(this.currentHz);
        if (nextTier !== null) {
          this.applyFrameRateChange(nextTier, 'ai_inference_stopped');
        }
      }
    }
  }

  /**
   * Get the current rendering mode.
   */
  getRenderingMode(): RenderingMode {
    return this.renderingMode;
  }

  // ===========================================================================
  // MANUAL CONTROL
  // ===========================================================================

  /**
   * Manually set the target frame rate.
   * Overrides adaptive behavior until the next evaluation.
   */
  setTargetHz(hz: FrameRateTier): void {
    if (!FRAME_RATE_TIERS.includes(hz)) {
      logger.warn('[AdaptiveFrameRateManager] Invalid frame rate tier', { hz });
      return;
    }

    if (hz !== this.currentHz) {
      this.applyFrameRateChange(hz, 'manual_override');
    }
  }

  // ===========================================================================
  // STATE QUERIES
  // ===========================================================================

  /**
   * Get the current frame rate in Hz.
   */
  getCurrentHz(): FrameRateTier {
    return this.currentHz;
  }

  /**
   * Get the target frame rate in Hz.
   */
  getTargetHz(): FrameRateTier {
    return this.targetHz;
  }

  /**
   * Get the current frame budget in milliseconds.
   */
  getFrameBudgetMs(): number {
    return 1000 / this.currentHz;
  }

  /**
   * Get the current thermal state.
   */
  getThermalState(): ThermalState {
    return this.thermalState;
  }

  /**
   * Check if the manager is currently running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // ===========================================================================
  // TELEMETRY
  // ===========================================================================

  /**
   * Get comprehensive telemetry metrics for the performance dashboard.
   */
  getMetrics(): AdaptiveFrameRateMetrics {
    // Calculate current window stats
    const { mean, cv } = this.computeFrameTimeStats();
    const frameBudget = 1000 / this.currentHz;
    const utilization = frameBudget > 0 ? mean / frameBudget : 0;

    return {
      isRunning: this.isRunning,
      currentHz: this.currentHz,
      targetHz: this.targetHz,
      renderingMode: this.renderingMode,
      thermalState: this.thermalState,
      averageFrameTimeMs: Math.round(mean * 100) / 100,
      frameTimeVarianceCV: Math.round(cv * 1000) / 1000,
      budgetUtilization: Math.round(utilization * 1000) / 1000,
      totalFrameRateChanges: this.totalFrameRateChanges,
      timeInTierMs: { ...this.getCurrentTimeInTier() },
      consecutiveStableWindows: this.consecutiveStableWindows,
      consecutiveStressedWindows: this.consecutiveStressedWindows,
      lastMemoryUsageBytes: this.lastMemoryUsageBytes,
      lastChangeTimestamp: this.lastChangeTimestamp,
      changeHistory: [...this.changeHistory],
    };
  }

  // ===========================================================================
  // THERMAL EVALUATION (CORE LOGIC)
  // ===========================================================================

  /**
   * Evaluate the current thermal state and determine if a frame rate
   * change is needed. Called every evaluationIntervalFrames.
   */
  private evaluate(): void {
    const stats = this.computeFrameTimeStats();
    const frameBudget = 1000 / this.currentHz;
    const utilization = frameBudget > 0 ? stats.mean / frameBudget : 0;

    // Classify thermal state from proxy signals
    const newThermalState = this.classifyThermalState(stats.cv, utilization);

    // Notify on thermal state change
    if (newThermalState !== this.thermalState) {
      const oldState = this.thermalState;
      this.thermalState = newThermalState;
      this.config.onThermalStateChange(oldState, newThermalState);

      logger.info('[AdaptiveFrameRateManager] Thermal state changed', {
        from: oldState,
        to: newThermalState,
        cv: stats.cv.toFixed(3),
        utilization: utilization.toFixed(3),
      });
    }

    // Check if we're in cooldown
    const timeSinceLastChange = this.now() - this.lastChangeTimestamp;
    if (timeSinceLastChange < this.config.changeCooldownMs) {
      this.frameTimes = [];
      return;
    }

    // Determine if we should change frame rate
    if (this.config.thermalThrottling) {
      this.adaptFrameRate(newThermalState, stats.cv, utilization);
    }

    // Clear the evaluation window
    this.frameTimes = [];
  }

  /**
   * Classify the thermal state based on proxy signals.
   *
   * cool:     CV < threshold AND utilization < threshold
   * warm:     CV >= threshold OR utilization >= threshold
   * hot:      CV > 1.5x threshold OR utilization > 0.95
   * critical: CV > 2x threshold OR utilization > 0.98 OR memory pressure
   */
  private classifyThermalState(cv: number, utilization: number): ThermalState {
    const cvThreshold = this.config.varianceThresholdCV;
    const utilThreshold = this.config.budgetUtilizationThreshold;

    // Check memory pressure
    if (this.lastMemoryUsageBytes > this.config.memoryPressureThresholdBytes) {
      return 'critical';
    }

    // Critical: extreme variance or near-100% utilization
    if (cv > cvThreshold * 2 || utilization > 0.98) {
      return 'critical';
    }

    // Hot: high variance or very high utilization
    if (cv > cvThreshold * 1.5 || utilization > 0.95) {
      return 'hot';
    }

    // Warm: moderate variance or high utilization
    if (cv >= cvThreshold || utilization >= utilThreshold) {
      return 'warm';
    }

    // Cool: everything within thresholds
    return 'cool';
  }

  /**
   * Adapt the frame rate based on thermal state and stability history.
   */
  private adaptFrameRate(
    thermalState: ThermalState,
    _cv: number,
    _utilization: number,
  ): void {
    // Determine ideal target based on rendering mode
    const modeTarget = this.renderingMode === 'ai_active'
      ? this.config.aiActiveHz
      : this.config.renderOnlyHz;

    // Check if we should downgrade (stressed conditions)
    if (thermalState === 'critical' || thermalState === 'hot') {
      this.consecutiveStableWindows = 0;
      this.consecutiveStressedWindows++;

      if (this.consecutiveStressedWindows >= this.config.downgradeStressWindows) {
        const nextLower = this.getNextLowerTier(this.currentHz);
        if (nextLower !== null) {
          const reason: FrameRateChangeReason = thermalState === 'critical'
            ? 'memory_pressure'
            : 'frame_time_variance';
          this.applyFrameRateChange(nextLower, reason);
          this.consecutiveStressedWindows = 0;
        }
      }
    }
    // Check if we should upgrade (stable conditions)
    else if (thermalState === 'cool') {
      this.consecutiveStressedWindows = 0;
      this.consecutiveStableWindows++;

      if (this.consecutiveStableWindows >= this.config.upgradeStabilityWindows) {
        // Only upgrade if current is below the mode target
        if (this.currentHz < modeTarget) {
          const nextHigher = this.getNextHigherTier(this.currentHz);
          if (nextHigher !== null && nextHigher <= modeTarget) {
            this.applyFrameRateChange(nextHigher, 'thermal_upgrade');
            this.consecutiveStableWindows = 0;
          }
        }
      }
    }
    // Warm: reset stability counters but don't stress
    else {
      this.consecutiveStableWindows = 0;
      this.consecutiveStressedWindows = 0;
    }
  }

  // ===========================================================================
  // FRAME RATE CHANGE APPLICATION
  // ===========================================================================

  /**
   * Apply a frame rate change, notifying listeners and recording telemetry.
   */
  private applyFrameRateChange(
    newHz: FrameRateTier,
    reason: FrameRateChangeReason,
  ): void {
    const oldHz = this.currentHz;

    // Accumulate time in the old tier before switching
    this.accumulateTierTime();

    this.currentHz = newHz;
    this.targetHz = newHz;
    this.lastChangeTimestamp = this.now();
    this.totalFrameRateChanges++;
    this.lastTierChangeTime = this.now();

    // Record change event
    const event: FrameRateChangeEvent = {
      timestamp: this.lastChangeTimestamp,
      fromHz: oldHz,
      toHz: newHz,
      reason,
      thermalState: this.thermalState,
    };

    this.changeHistory.push(event);
    if (this.changeHistory.length > this.MAX_CHANGE_HISTORY) {
      this.changeHistory.shift();
    }

    // Notify listener
    this.config.onFrameRateChange(oldHz, newHz, reason);

    logger.info('[AdaptiveFrameRateManager] Frame rate changed', {
      from: oldHz,
      to: newHz,
      reason,
      thermalState: this.thermalState,
    });
  }

  // ===========================================================================
  // TIER NAVIGATION
  // ===========================================================================

  /**
   * Get the next higher frame rate tier, or null if at maximum.
   */
  private getNextHigherTier(currentHz: FrameRateTier): FrameRateTier | null {
    const idx = FRAME_RATE_TIERS.indexOf(currentHz);
    if (idx <= 0) return null; // Already at highest or not found
    return FRAME_RATE_TIERS[idx - 1];
  }

  /**
   * Get the next lower frame rate tier, or null if at minimum.
   */
  private getNextLowerTier(currentHz: FrameRateTier): FrameRateTier | null {
    const idx = FRAME_RATE_TIERS.indexOf(currentHz);
    if (idx === -1 || idx >= FRAME_RATE_TIERS.length - 1) return null;
    return FRAME_RATE_TIERS[idx + 1];
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Compute mean and coefficient of variation from the current frame time window.
   */
  private computeFrameTimeStats(): { mean: number; cv: number } {
    if (this.frameTimes.length === 0) {
      return { mean: 0, cv: 0 };
    }

    const n = this.frameTimes.length;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    if (mean === 0) {
      return { mean: 0, cv: 0 };
    }

    // Standard deviation
    const sumSquaredDiff = this.frameTimes.reduce(
      (acc, t) => acc + (t - mean) * (t - mean),
      0,
    );
    const stddev = Math.sqrt(sumSquaredDiff / n);

    // Coefficient of variation (CV = stddev / mean)
    const cv = stddev / mean;

    return { mean, cv };
  }

  // ===========================================================================
  // TIME IN TIER TRACKING
  // ===========================================================================

  /**
   * Accumulate time spent in the current tier.
   */
  private accumulateTierTime(): void {
    const now = this.now();
    const elapsed = now - this.lastTierChangeTime;
    this.timeInTierMs[this.currentHz] += elapsed;
    this.lastTierChangeTime = now;
  }

  /**
   * Get current time-in-tier with the live accumulation for the current tier.
   */
  private getCurrentTimeInTier(): Record<FrameRateTier, number> {
    const result = { ...this.timeInTierMs };
    const now = this.now();
    result[this.currentHz] += now - this.lastTierChangeTime;
    return result;
  }

  // ===========================================================================
  // MEMORY MONITORING
  // ===========================================================================

  /**
   * Start periodic memory pressure monitoring.
   * Uses performance.measureUserAgentSpecificMemory() when available
   * (Chrome/Edge 89+, behind crossOriginIsolated flag).
   */
  private startMemoryMonitoring(): void {
    // Check if the API is available
    if (
      typeof performance !== 'undefined' &&
      'measureUserAgentSpecificMemory' in performance
    ) {
      // Check every 5 seconds (the API is async and somewhat costly)
      this.memoryCheckInterval = setInterval(() => {
        this.measureMemory();
      }, 5000);
    }
  }

  /**
   * Stop memory monitoring interval.
   */
  private stopMemoryMonitoring(): void {
    if (this.memoryCheckInterval !== null) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  /**
   * Measure current memory usage via the User Agent Specific Memory API.
   */
  private async measureMemory(): Promise<void> {
    try {
      const perf = performance as Performance & {
        measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>;
      };

      if (perf.measureUserAgentSpecificMemory) {
        const result = await perf.measureUserAgentSpecificMemory();
        this.lastMemoryUsageBytes = result.bytes;
      }
    } catch {
      // API not available or blocked by COOP/COEP policy - silently ignore
    }
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Get current timestamp in milliseconds.
   * Uses performance.now() when available, falls back to Date.now().
   */
  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create an AdaptiveFrameRateManager instance.
 *
 * @param config - Optional configuration
 * @returns Configured AdaptiveFrameRateManager
 */
export function createAdaptiveFrameRateManager(
  config?: AdaptiveFrameRateConfig,
): AdaptiveFrameRateManager {
  return new AdaptiveFrameRateManager(config);
}
