/**
 * AdaptiveKeyframeManager — Dynamic Keyframe Insertion at 15% Threshold
 *
 * Manages adaptive keyframe insertion for volumetric video streams.
 * Combines 4D-MoDe's dynamic change ratio with configurable thresholds
 * to determine when a new I-frame should be decoded instead of applying
 * a P-frame delta.
 *
 * Decision logic per P.030.04:
 * 1. If frames since last keyframe >= maxInterKeyframeDistance: FORCE keyframe
 * 2. If frames since last keyframe < minInterKeyframeDistance: SKIP (prevent thrashing)
 * 3. If smoothed dynamic change ratio >= threshold (15%): INSERT keyframe
 * 4. Otherwise: Continue with delta frames
 *
 * Research references:
 *   P.030.04 - Adaptive keyframe insertion strategy
 *   W.036 - 4D-MoDe dynamic change ratio (tau_GOP = 0.15)
 *
 * @module volumetric-bridge/volumetric-video
 */

import type {
  AdaptiveKeyframeConfig,
  DeltaFrameData,
  VolumetricVideoEventHandler,
} from './types';
import { DEFAULT_ADAPTIVE_KEYFRAME_CONFIG } from './types';

// =============================================================================
// KEYFRAME DECISION
// =============================================================================

/**
 * Decision result from the adaptive keyframe manager.
 */
export interface KeyframeDecision {
  /** Whether a keyframe should be inserted at this frame */
  insertKeyframe: boolean;
  /** Reason for the decision */
  reason: 'scheduled' | 'adaptive' | 'seek' | 'thrashing-prevention' | 'normal-delta';
  /** Raw dynamic change ratio for this frame */
  rawChangeRatio: number;
  /** Smoothed (EMA) change ratio */
  smoothedChangeRatio: number;
  /** Frames elapsed since last keyframe */
  framesSinceKeyframe: number;
  /** Current threshold value */
  threshold: number;
}

// =============================================================================
// ADAPTIVE KEYFRAME MANAGER
// =============================================================================

/**
 * Manages adaptive keyframe insertion for volumetric video playback.
 *
 * Usage:
 * ```typescript
 * const manager = new AdaptiveKeyframeManager({ threshold: 0.15 });
 *
 * // For each frame:
 * const decision = manager.evaluate(deltaFrame, referenceGaussianCount);
 * if (decision.insertKeyframe) {
 *   // Decode full keyframe instead of applying delta
 * } else {
 *   // Apply delta to reference frame
 * }
 *
 * // After keyframe is decoded:
 * manager.recordKeyframe(frameIndex);
 * ```
 */
export class AdaptiveKeyframeManager {
  private config: AdaptiveKeyframeConfig;
  private eventHandlers: VolumetricVideoEventHandler[] = [];

  // State tracking
  private lastKeyframeIndex = -1;
  private framesSinceKeyframe = 0;
  private smoothedChangeRatio = 0;
  private keyframeHistory: number[] = [];
  private changeRatioHistory: number[] = [];

  // Statistics
  private totalKeyframesInserted = 0;
  private adaptiveKeyframesInserted = 0;
  private scheduledKeyframesInserted = 0;

  constructor(config?: Partial<AdaptiveKeyframeConfig>) {
    this.config = { ...DEFAULT_ADAPTIVE_KEYFRAME_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Evaluation
  // ---------------------------------------------------------------------------

  /**
   * Evaluate whether a keyframe should be inserted for the current frame.
   *
   * @param deltaFrame - The delta frame data to evaluate (null for forced keyframe)
   * @param referenceGaussianCount - Number of Gaussians in the reference frame
   * @returns KeyframeDecision with the recommendation
   */
  evaluate(
    deltaFrame: DeltaFrameData | null,
    referenceGaussianCount: number,
  ): KeyframeDecision {
    // Case 1: No delta frame (first frame or seek) — force keyframe
    if (!deltaFrame) {
      return {
        insertKeyframe: true,
        reason: 'seek',
        rawChangeRatio: 1.0,
        smoothedChangeRatio: 1.0,
        framesSinceKeyframe: this.framesSinceKeyframe,
        threshold: this.config.threshold,
      };
    }

    // Compute raw dynamic change ratio
    const rawChangeRatio = referenceGaussianCount > 0
      ? deltaFrame.dynamicChangeRatio
      : 1.0;

    // Update smoothed ratio with EMA
    if (this.config.enableSmoothing) {
      this.smoothedChangeRatio =
        this.config.smoothingAlpha * rawChangeRatio +
        (1 - this.config.smoothingAlpha) * this.smoothedChangeRatio;
    } else {
      this.smoothedChangeRatio = rawChangeRatio;
    }

    // Track history for diagnostics
    this.changeRatioHistory.push(rawChangeRatio);
    if (this.changeRatioHistory.length > 60) {
      this.changeRatioHistory.shift();
    }

    this.framesSinceKeyframe++;

    // Case 2: Maximum distance exceeded — force keyframe (safety net for seek)
    if (this.framesSinceKeyframe >= this.config.maxInterKeyframeDistance) {
      return {
        insertKeyframe: true,
        reason: 'scheduled',
        rawChangeRatio,
        smoothedChangeRatio: this.smoothedChangeRatio,
        framesSinceKeyframe: this.framesSinceKeyframe,
        threshold: this.config.threshold,
      };
    }

    // Case 3: Minimum distance not met — prevent keyframe thrashing
    if (this.framesSinceKeyframe < this.config.minInterKeyframeDistance) {
      return {
        insertKeyframe: false,
        reason: 'thrashing-prevention',
        rawChangeRatio,
        smoothedChangeRatio: this.smoothedChangeRatio,
        framesSinceKeyframe: this.framesSinceKeyframe,
        threshold: this.config.threshold,
      };
    }

    // Case 4: Dynamic change ratio exceeds threshold — adaptive keyframe
    if (this.smoothedChangeRatio >= this.config.threshold) {
      return {
        insertKeyframe: true,
        reason: 'adaptive',
        rawChangeRatio,
        smoothedChangeRatio: this.smoothedChangeRatio,
        framesSinceKeyframe: this.framesSinceKeyframe,
        threshold: this.config.threshold,
      };
    }

    // Case 5: Normal delta frame — no keyframe needed
    return {
      insertKeyframe: false,
      reason: 'normal-delta',
      rawChangeRatio,
      smoothedChangeRatio: this.smoothedChangeRatio,
      framesSinceKeyframe: this.framesSinceKeyframe,
      threshold: this.config.threshold,
    };
  }

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------

  /**
   * Record that a keyframe was decoded at the given frame index.
   * Resets the inter-keyframe counter and updates statistics.
   */
  recordKeyframe(frameIndex: number, reason: 'scheduled' | 'adaptive' | 'seek'): void {
    this.lastKeyframeIndex = frameIndex;
    this.framesSinceKeyframe = 0;
    this.smoothedChangeRatio = 0;
    this.totalKeyframesInserted++;

    if (reason === 'adaptive') {
      this.adaptiveKeyframesInserted++;
    } else if (reason === 'scheduled') {
      this.scheduledKeyframesInserted++;
    }

    this.keyframeHistory.push(frameIndex);
    if (this.keyframeHistory.length > 100) {
      this.keyframeHistory.shift();
    }

    // Emit event
    for (const handler of this.eventHandlers) {
      handler({
        type: 'keyframe-inserted',
        frameIndex,
        reason,
      });
    }
  }

  /**
   * Force reset state (e.g. after a seek operation).
   */
  reset(): void {
    this.lastKeyframeIndex = -1;
    this.framesSinceKeyframe = 0;
    this.smoothedChangeRatio = 0;
    this.changeRatioHistory = [];
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /**
   * Update the adaptive keyframe threshold.
   * Default: 0.15 (15%) per 4D-MoDe specification.
   */
  setThreshold(threshold: number): void {
    this.config.threshold = Math.max(0.01, Math.min(1.0, threshold));
  }

  /**
   * Get the current threshold.
   */
  getThreshold(): number {
    return this.config.threshold;
  }

  /**
   * Update the full configuration.
   */
  updateConfig(config: Partial<AdaptiveKeyframeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): Readonly<AdaptiveKeyframeConfig> {
    return { ...this.config };
  }

  // ---------------------------------------------------------------------------
  // Event Handling
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to keyframe events.
   */
  on(handler: VolumetricVideoEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  /**
   * Get adaptive keyframe statistics.
   */
  getStatistics(): {
    totalKeyframes: number;
    adaptiveKeyframes: number;
    scheduledKeyframes: number;
    seekKeyframes: number;
    avgInterKeyframeDistance: number;
    avgChangeRatio: number;
    currentSmoothedRatio: number;
    keyframeHistory: readonly number[];
  } {
    const seekKeyframes = this.totalKeyframesInserted -
      this.adaptiveKeyframesInserted -
      this.scheduledKeyframesInserted;

    const avgInterKeyframeDistance = this.keyframeHistory.length > 1
      ? this.keyframeHistory.reduce((sum, kf, i, arr) =>
          i > 0 ? sum + (kf - arr[i - 1]) : sum, 0,
        ) / (this.keyframeHistory.length - 1)
      : 0;

    const avgChangeRatio = this.changeRatioHistory.length > 0
      ? this.changeRatioHistory.reduce((a, b) => a + b, 0) / this.changeRatioHistory.length
      : 0;

    return {
      totalKeyframes: this.totalKeyframesInserted,
      adaptiveKeyframes: this.adaptiveKeyframesInserted,
      scheduledKeyframes: this.scheduledKeyframesInserted,
      seekKeyframes,
      avgInterKeyframeDistance,
      avgChangeRatio,
      currentSmoothedRatio: this.smoothedChangeRatio,
      keyframeHistory: this.keyframeHistory,
    };
  }

  /**
   * Get the last keyframe index.
   */
  getLastKeyframeIndex(): number {
    return this.lastKeyframeIndex;
  }

  /**
   * Get frames elapsed since last keyframe.
   */
  getFramesSinceKeyframe(): number {
    return this.framesSinceKeyframe;
  }
}
