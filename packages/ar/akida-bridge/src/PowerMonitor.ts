/**
 * Power and Latency Monitoring Dashboard Integration
 *
 * Aggregates telemetry from the Akida AKD1500 edge device and fallback
 * processors into a unified dashboard snapshot. Maintains rolling-window
 * history for latency, power consumption, and FPS metrics.
 *
 * Designed to be consumed by HoloLand's web dashboard or any monitoring
 * system that polls for DashboardSnapshot objects.
 */

import type {
  PowerMetrics,
  AkidaDeviceInfo,
  AkidaConnectionState,
  ClassificationResult,
  DashboardSnapshot,
  SemanticClass,
} from './types';

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface PowerMonitorConfig {
  /** Maximum number of history samples to retain */
  maxHistorySamples: number;
  /** Rolling average window size (number of samples) */
  rollingWindowSize: number;
}

export const DEFAULT_POWER_MONITOR_CONFIG: PowerMonitorConfig = {
  maxHistorySamples: 300,
  rollingWindowSize: 30,
};

// =============================================================================
// ROLLING AVERAGE CALCULATOR
// =============================================================================

class RollingAverage {
  private values: number[] = [];
  private windowSize: number;

  constructor(windowSize: number) {
    this.windowSize = windowSize;
  }

  push(value: number): void {
    this.values.push(value);
    if (this.values.length > this.windowSize) {
      this.values.shift();
    }
  }

  get average(): number {
    if (this.values.length === 0) return 0;
    return this.values.reduce((sum, v) => sum + v, 0) / this.values.length;
  }

  get latest(): number {
    return this.values.length > 0 ? this.values[this.values.length - 1] : 0;
  }

  get count(): number {
    return this.values.length;
  }

  reset(): void {
    this.values = [];
  }
}

// =============================================================================
// POWER MONITOR
// =============================================================================

export class PowerMonitor {
  private config: PowerMonitorConfig;

  // Rolling averages
  private inferenceLatency: RollingAverage;
  private endToEndLatency: RollingAverage;
  private fps: RollingAverage;
  private power: RollingAverage;

  // History arrays
  private latencyHistory: { timestamp: number; latencyMs: number }[] = [];
  private powerHistory: { timestamp: number; powerMw: number }[] = [];
  private fpsHistory: { timestamp: number; fps: number }[] = [];

  // State
  private connectionState: AkidaConnectionState = 'disconnected';
  private activeBackend: 'akida' | 'cpu' | 'webgpu' | 'none' = 'none';
  private deviceInfo: AkidaDeviceInfo | undefined;
  private latestPowerMetrics: PowerMetrics | undefined;
  private totalFrames: number = 0;
  private trackedEntityCount: number = 0;
  private entityCountsByClass: Partial<Record<SemanticClass, number>> = {};
  private startTime: number = Date.now();

  constructor(config?: Partial<PowerMonitorConfig>) {
    this.config = { ...DEFAULT_POWER_MONITOR_CONFIG, ...config };

    this.inferenceLatency = new RollingAverage(this.config.rollingWindowSize);
    this.endToEndLatency = new RollingAverage(this.config.rollingWindowSize);
    this.fps = new RollingAverage(this.config.rollingWindowSize);
    this.power = new RollingAverage(this.config.rollingWindowSize);
  }

  // ===========================================================================
  // DATA INGESTION
  // ===========================================================================

  /**
   * Record power metrics from the Akida device.
   */
  recordPowerMetrics(metrics: PowerMetrics): void {
    this.latestPowerMetrics = metrics;
    this.power.push(metrics.powerMw);
    this.fps.push(metrics.framesPerSecond);
    this.inferenceLatency.push(metrics.inferenceLatencyMs);

    // Add to history
    this.powerHistory.push({
      timestamp: metrics.timestamp,
      powerMw: metrics.powerMw,
    });
    this.fpsHistory.push({
      timestamp: metrics.timestamp,
      fps: metrics.framesPerSecond,
    });

    this.trimHistory();
  }

  /**
   * Record a classification result for latency tracking.
   */
  recordClassification(result: ClassificationResult): void {
    this.endToEndLatency.push(result.totalLatencyMs);
    this.totalFrames++;

    this.latencyHistory.push({
      timestamp: result.timestamp,
      latencyMs: result.totalLatencyMs,
    });

    this.trimHistory();
  }

  /**
   * Update connection state.
   */
  setConnectionState(state: AkidaConnectionState): void {
    this.connectionState = state;
  }

  /**
   * Update active backend indicator.
   */
  setActiveBackend(backend: 'akida' | 'cpu' | 'webgpu' | 'none'): void {
    this.activeBackend = backend;
  }

  /**
   * Update device information.
   */
  setDeviceInfo(info: AkidaDeviceInfo): void {
    this.deviceInfo = info;
  }

  /**
   * Update tracked entity counts.
   */
  setEntityCounts(
    totalCount: number,
    countsByClass: Partial<Record<SemanticClass, number>>
  ): void {
    this.trackedEntityCount = totalCount;
    this.entityCountsByClass = countsByClass;
  }

  // ===========================================================================
  // SNAPSHOT
  // ===========================================================================

  /**
   * Get the current dashboard snapshot.
   * This is the primary method consumed by UI dashboards.
   */
  getSnapshot(): DashboardSnapshot {
    return {
      connectionState: this.connectionState,
      activeBackend: this.activeBackend,
      deviceInfo: this.deviceInfo,
      latestPowerMetrics: this.latestPowerMetrics,
      avgInferenceLatencyMs: this.inferenceLatency.average,
      avgEndToEndLatencyMs: this.endToEndLatency.average,
      avgFps: this.fps.average,
      avgPowerMw: this.power.average,
      totalFrames: this.totalFrames,
      trackedEntityCount: this.trackedEntityCount,
      entityCountsByClass: { ...this.entityCountsByClass },
      uptimeSeconds: (Date.now() - this.startTime) / 1000,
      latencyHistory: [...this.latencyHistory],
      powerHistory: [...this.powerHistory],
      fpsHistory: [...this.fpsHistory],
    };
  }

  // ===========================================================================
  // ALERTS / THRESHOLDS
  // ===========================================================================

  /**
   * Check whether power consumption exceeds the Akida 300mW target.
   */
  isPowerBudgetExceeded(): boolean {
    return this.power.average > 300;
  }

  /**
   * Check whether average latency exceeds a threshold.
   *
   * @param thresholdMs - Maximum acceptable latency in ms (default: 33ms for 30fps)
   */
  isLatencyHigh(thresholdMs: number = 33): boolean {
    return this.endToEndLatency.average > thresholdMs;
  }

  /**
   * Check whether FPS is below a threshold.
   *
   * @param thresholdFps - Minimum acceptable FPS (default: 15)
   */
  isFpsLow(thresholdFps: number = 15): boolean {
    return this.fps.average > 0 && this.fps.average < thresholdFps;
  }

  /**
   * Get a text-based health status summary.
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
  } {
    const issues: string[] = [];

    if (this.connectionState === 'disconnected' || this.connectionState === 'error') {
      issues.push(`Connection state: ${this.connectionState}`);
    }

    if (this.isPowerBudgetExceeded()) {
      issues.push(
        `Power budget exceeded: ${this.power.average.toFixed(1)}mW > 300mW target`
      );
    }

    if (this.isLatencyHigh()) {
      issues.push(
        `High latency: ${this.endToEndLatency.average.toFixed(1)}ms (target: <33ms)`
      );
    }

    if (this.isFpsLow()) {
      issues.push(
        `Low FPS: ${this.fps.average.toFixed(1)} (target: >15fps)`
      );
    }

    if (this.latestPowerMetrics && this.latestPowerMetrics.temperatureC > 80) {
      issues.push(
        `High temperature: ${this.latestPowerMetrics.temperatureC.toFixed(1)}C`
      );
    }

    let status: 'healthy' | 'degraded' | 'critical';
    if (issues.length === 0) {
      status = 'healthy';
    } else if (issues.length <= 2) {
      status = 'degraded';
    } else {
      status = 'critical';
    }

    return { status, issues };
  }

  // ===========================================================================
  // MANAGEMENT
  // ===========================================================================

  /**
   * Reset all monitoring state.
   */
  reset(): void {
    this.inferenceLatency.reset();
    this.endToEndLatency.reset();
    this.fps.reset();
    this.power.reset();
    this.latencyHistory = [];
    this.powerHistory = [];
    this.fpsHistory = [];
    this.totalFrames = 0;
    this.trackedEntityCount = 0;
    this.entityCountsByClass = {};
    this.latestPowerMetrics = undefined;
    this.startTime = Date.now();
  }

  // ===========================================================================
  // INTERNALS
  // ===========================================================================

  /**
   * Trim history arrays to maxHistorySamples.
   */
  private trimHistory(): void {
    const max = this.config.maxHistorySamples;
    if (this.latencyHistory.length > max) {
      this.latencyHistory = this.latencyHistory.slice(-max);
    }
    if (this.powerHistory.length > max) {
      this.powerHistory = this.powerHistory.slice(-max);
    }
    if (this.fpsHistory.length > max) {
      this.fpsHistory = this.fpsHistory.slice(-max);
    }
  }
}
