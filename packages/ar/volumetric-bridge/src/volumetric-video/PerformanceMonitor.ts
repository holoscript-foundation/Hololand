/**
 * PerformanceMonitor — Adaptive Quality and FPS Tracking
 *
 * Tracks real-time performance metrics for the volumetric video pipeline
 * and makes adaptive quality tier decisions based on platform targets.
 *
 * Targets per directive:
 * - Desktop: 52+ FPS (19.2ms total budget)
 * - Mobile: 25+ FPS (40ms total budget)
 *
 * Quality adaptation strategy:
 * 1. Monitor rolling average of decode + render times
 * 2. If P95 total time exceeds budget for 2 consecutive windows: downgrade tier
 * 3. If average total time is below 60% of budget for 5 windows: upgrade tier
 * 4. Limit tier changes to max 1 per 3 seconds to prevent oscillation
 *
 * Research references:
 *   W.039 - 4DGCPro performance metrics per platform
 *   P.030.04 - Adaptive quality management
 *
 * @module volumetric-bridge/volumetric-video
 */

import type {
  PerformanceMetrics,
  VolumetricQualityTier,
  PlatformProfile,
  VolumetricVideoEventHandler,
} from './types';
import { PLATFORM_PROFILES, QUALITY_TIER_CONFIGS } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Rolling window size for metrics computation */
const METRICS_WINDOW_SIZE = 60;

/** Minimum interval between quality tier changes (ms) */
const MIN_TIER_CHANGE_INTERVAL_MS = 3000;

/** Number of consecutive bad windows before downgrade */
const DOWNGRADE_THRESHOLD_WINDOWS = 2;

/** Number of consecutive good windows before upgrade */
const UPGRADE_THRESHOLD_WINDOWS = 5;

/** Fraction of budget below which we consider upgrading */
const UPGRADE_UTILIZATION_THRESHOLD = 0.60;

/** Check interval for adaptive decisions (ms) */
const ADAPTIVE_CHECK_INTERVAL_MS = 1000;

// =============================================================================
// PERFORMANCE MONITOR
// =============================================================================

/**
 * Monitors volumetric video pipeline performance and manages
 * adaptive quality tier selection.
 */
export class PerformanceMonitor {
  private profile: PlatformProfile;
  private currentTier: VolumetricQualityTier;
  private eventHandlers: VolumetricVideoEventHandler[] = [];

  // Rolling metric windows
  private decodeTimesMs: number[] = [];
  private renderTimesMs: number[] = [];
  private totalTimesMs: number[] = [];
  private frameTimestamps: number[] = [];

  // Adaptive state
  private lastTierChangeTime = 0;
  private consecutiveBadWindows = 0;
  private consecutiveGoodWindows = 0;
  private lastCheckTime = 0;
  private adaptiveEnabled: boolean;

  // Drop tracking
  private totalFrames = 0;
  private droppedFrames = 0;

  // Memory tracking
  private currentMemoryMB = 0;

  constructor(
    platform: PlatformProfile,
    initialTier?: VolumetricQualityTier,
    adaptiveEnabled: boolean = true,
  ) {
    this.profile = platform;
    this.currentTier = initialTier ?? platform.defaultTier;
    this.adaptiveEnabled = adaptiveEnabled;
  }

  // ---------------------------------------------------------------------------
  // Metric Recording
  // ---------------------------------------------------------------------------

  /**
   * Record timing for a single frame's decode + render pipeline.
   */
  recordFrame(decodeTimeMs: number, renderTimeMs: number): void {
    const totalTimeMs = decodeTimeMs + renderTimeMs;
    const now = performance.now();

    this.decodeTimesMs.push(decodeTimeMs);
    this.renderTimesMs.push(renderTimeMs);
    this.totalTimesMs.push(totalTimeMs);
    this.frameTimestamps.push(now);

    // Keep window bounded
    while (this.decodeTimesMs.length > METRICS_WINDOW_SIZE) {
      this.decodeTimesMs.shift();
      this.renderTimesMs.shift();
      this.totalTimesMs.shift();
      this.frameTimestamps.shift();
    }

    this.totalFrames++;

    // Check if frame was dropped (exceeded budget)
    const totalBudget = 1000 / this.profile.targetFPS;
    if (totalTimeMs > totalBudget) {
      this.droppedFrames++;
    }

    // Run adaptive check at intervals
    if (this.adaptiveEnabled && now - this.lastCheckTime > ADAPTIVE_CHECK_INTERVAL_MS) {
      this.lastCheckTime = now;
      this.checkAdaptiveQuality();
    }
  }

  /**
   * Record a dropped frame (frame that was skipped due to budget).
   */
  recordDroppedFrame(): void {
    this.totalFrames++;
    this.droppedFrames++;
  }

  /**
   * Update current memory usage.
   */
  recordMemoryUsage(memoryMB: number): void {
    this.currentMemoryMB = memoryMB;
  }

  // ---------------------------------------------------------------------------
  // Metrics Computation
  // ---------------------------------------------------------------------------

  /**
   * Get the current performance metrics snapshot.
   */
  getMetrics(): PerformanceMetrics {
    const n = this.totalTimesMs.length;
    if (n === 0) {
      return {
        avgDecodeTimeMs: 0,
        avgRenderTimeMs: 0,
        avgTotalTimeMs: 0,
        effectiveFPS: 0,
        p95TotalTimeMs: 0,
        frameDropRate: 0,
        memoryUsageMB: this.currentMemoryMB,
        recentTierChanges: 0,
      };
    }

    const avgDecodeTimeMs = this.decodeTimesMs.reduce((a, b) => a + b, 0) / n;
    const avgRenderTimeMs = this.renderTimesMs.reduce((a, b) => a + b, 0) / n;
    const avgTotalTimeMs = this.totalTimesMs.reduce((a, b) => a + b, 0) / n;

    // Effective FPS from frame timestamps
    let effectiveFPS = 0;
    if (this.frameTimestamps.length > 1) {
      const timeSpan = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
      if (timeSpan > 0) {
        effectiveFPS = (this.frameTimestamps.length - 1) / (timeSpan / 1000);
      }
    }

    // P95 total time
    const sorted = [...this.totalTimesMs].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95TotalTimeMs = sorted[p95Index] ?? avgTotalTimeMs;

    // Frame drop rate
    const frameDropRate = this.totalFrames > 0
      ? this.droppedFrames / this.totalFrames
      : 0;

    return {
      avgDecodeTimeMs,
      avgRenderTimeMs,
      avgTotalTimeMs,
      effectiveFPS,
      p95TotalTimeMs,
      frameDropRate,
      memoryUsageMB: this.currentMemoryMB,
      recentTierChanges: 0, // Tracked externally if needed
    };
  }

  /**
   * Get the effective FPS from the rolling window.
   */
  getEffectiveFPS(): number {
    if (this.frameTimestamps.length < 2) return 0;
    const timeSpan = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
    if (timeSpan <= 0) return 0;
    return (this.frameTimestamps.length - 1) / (timeSpan / 1000);
  }

  /**
   * Check if the current FPS meets the platform target.
   */
  isMeetingTarget(): boolean {
    return this.getEffectiveFPS() >= this.profile.targetFPS;
  }

  // ---------------------------------------------------------------------------
  // Adaptive Quality
  // ---------------------------------------------------------------------------

  /**
   * Run the adaptive quality check.
   * Decides whether to upgrade, downgrade, or maintain current tier.
   */
  private checkAdaptiveQuality(): void {
    if (this.totalTimesMs.length < 10) return; // Not enough data

    const now = performance.now();
    const metrics = this.getMetrics();
    const totalBudget = 1000 / this.profile.targetFPS;

    // Check if P95 exceeds budget (bad window)
    if (metrics.p95TotalTimeMs > totalBudget) {
      this.consecutiveBadWindows++;
      this.consecutiveGoodWindows = 0;
    }
    // Check if average is well below budget (good window)
    else if (metrics.avgTotalTimeMs < totalBudget * UPGRADE_UTILIZATION_THRESHOLD) {
      this.consecutiveGoodWindows++;
      this.consecutiveBadWindows = 0;
    }
    // Neutral window
    else {
      this.consecutiveBadWindows = Math.max(0, this.consecutiveBadWindows - 1);
      this.consecutiveGoodWindows = Math.max(0, this.consecutiveGoodWindows - 1);
    }

    // Respect minimum interval between changes
    if (now - this.lastTierChangeTime < MIN_TIER_CHANGE_INTERVAL_MS) {
      return;
    }

    // Downgrade decision
    if (this.consecutiveBadWindows >= DOWNGRADE_THRESHOLD_WINDOWS) {
      const newTier = this.getNextLowerTier();
      if (newTier && newTier !== this.currentTier) {
        const previousTier = this.currentTier;
        this.currentTier = newTier;
        this.lastTierChangeTime = now;
        this.consecutiveBadWindows = 0;
        this.consecutiveGoodWindows = 0;

        this.emitQualityChange(newTier, previousTier,
          `P95 time ${metrics.p95TotalTimeMs.toFixed(1)}ms exceeds ${totalBudget.toFixed(1)}ms budget`);

        // Emit performance warning
        this.emitPerformanceWarning(
          `Downgrading quality tier to '${newTier}' due to sustained frame budget overrun`,
          'p95TotalTimeMs',
          metrics.p95TotalTimeMs,
          totalBudget,
        );
      }
    }

    // Upgrade decision
    if (this.consecutiveGoodWindows >= UPGRADE_THRESHOLD_WINDOWS) {
      const newTier = this.getNextHigherTier();
      if (newTier && newTier !== this.currentTier) {
        const previousTier = this.currentTier;
        this.currentTier = newTier;
        this.lastTierChangeTime = now;
        this.consecutiveBadWindows = 0;
        this.consecutiveGoodWindows = 0;

        this.emitQualityChange(newTier, previousTier,
          `Avg time ${metrics.avgTotalTimeMs.toFixed(1)}ms well below ${totalBudget.toFixed(1)}ms budget`);
      }
    }

    // Memory pressure check
    if (this.currentMemoryMB > this.profile.maxMemoryMB * 0.9) {
      const newTier = this.getNextLowerTier();
      if (newTier && newTier !== this.currentTier) {
        const previousTier = this.currentTier;
        this.currentTier = newTier;
        this.lastTierChangeTime = now;

        this.emitQualityChange(newTier, previousTier,
          `Memory pressure: ${this.currentMemoryMB.toFixed(0)}MB / ${this.profile.maxMemoryMB}MB`);

        this.emitPerformanceWarning(
          `Downgrading quality tier to '${newTier}' due to memory pressure`,
          'memoryUsageMB',
          this.currentMemoryMB,
          this.profile.maxMemoryMB,
        );
      }
    }
  }

  /**
   * Get the next lower quality tier, or null if already at lowest.
   */
  private getNextLowerTier(): VolumetricQualityTier | null {
    const tiers: VolumetricQualityTier[] = ['high', 'mid', 'low'];
    const currentIndex = tiers.indexOf(this.currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  }

  /**
   * Get the next higher quality tier, or null if already at highest.
   */
  private getNextHigherTier(): VolumetricQualityTier | null {
    const tiers: VolumetricQualityTier[] = ['low', 'mid', 'high'];
    const currentIndex = tiers.indexOf(this.currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /**
   * Get the current quality tier.
   */
  getCurrentTier(): VolumetricQualityTier {
    return this.currentTier;
  }

  /**
   * Manually set the quality tier (overrides adaptive).
   */
  setTier(tier: VolumetricQualityTier): void {
    const previousTier = this.currentTier;
    if (tier !== previousTier) {
      this.currentTier = tier;
      this.lastTierChangeTime = performance.now();
      this.emitQualityChange(tier, previousTier, 'Manual tier override');
    }
  }

  /**
   * Enable or disable adaptive quality management.
   */
  setAdaptiveEnabled(enabled: boolean): void {
    this.adaptiveEnabled = enabled;
    if (!enabled) {
      this.consecutiveBadWindows = 0;
      this.consecutiveGoodWindows = 0;
    }
  }

  /**
   * Update the platform profile.
   */
  setPlatformProfile(profile: PlatformProfile): void {
    this.profile = profile;
  }

  /**
   * Get the current platform profile.
   */
  getPlatformProfile(): Readonly<PlatformProfile> {
    return this.profile;
  }

  /**
   * Reset all tracked metrics.
   */
  reset(): void {
    this.decodeTimesMs = [];
    this.renderTimesMs = [];
    this.totalTimesMs = [];
    this.frameTimestamps = [];
    this.totalFrames = 0;
    this.droppedFrames = 0;
    this.consecutiveBadWindows = 0;
    this.consecutiveGoodWindows = 0;
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  on(handler: VolumetricVideoEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  private emitQualityChange(
    tier: VolumetricQualityTier,
    previousTier: VolumetricQualityTier,
    reason: string,
  ): void {
    for (const handler of this.eventHandlers) {
      handler({ type: 'quality-change', tier, previousTier, reason });
    }
  }

  private emitPerformanceWarning(
    message: string,
    metric: string,
    value: number,
    threshold: number,
  ): void {
    for (const handler of this.eventHandlers) {
      handler({ type: 'performance-warning', message, metric, value, threshold });
    }
  }

  // ---------------------------------------------------------------------------
  // Diagnostics
  // ---------------------------------------------------------------------------

  /**
   * Get a diagnostic summary string.
   */
  getSummary(): string {
    const metrics = this.getMetrics();
    const fps = metrics.effectiveFPS.toFixed(1);
    const target = this.profile.targetFPS;
    const meeting = this.isMeetingTarget() ? 'YES' : 'NO';
    const tier = this.currentTier.toUpperCase();
    const drops = metrics.frameDropRate > 0
      ? ` (${(metrics.frameDropRate * 100).toFixed(1)}% drops)`
      : '';

    return `[${tier}] ${fps}/${target} FPS (target met: ${meeting})${drops} | ` +
      `Decode: ${metrics.avgDecodeTimeMs.toFixed(1)}ms, ` +
      `Render: ${metrics.avgRenderTimeMs.toFixed(1)}ms, ` +
      `P95: ${metrics.p95TotalTimeMs.toFixed(1)}ms | ` +
      `Mem: ${metrics.memoryUsageMB.toFixed(0)}MB`;
  }
}
