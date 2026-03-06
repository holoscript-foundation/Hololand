/**
 * DNFVisualizationData
 *
 * Produces field visualization data compatible with the NeuralActivityDashboard
 * and VRPerformanceDashboard. Transforms raw DNF state into display-ready
 * formats including:
 *
 * OUTPUT FORMATS:
 *   1. Heatmap data (activation field as normalized color values)
 *   2. Peak markers (positions, amplitudes, stability indicators)
 *   3. Input overlay (external stimulus visualization)
 *   4. Time series (field statistics over time for graphs)
 *   5. Kernel visualization (interaction kernel as image data)
 *
 * DASHBOARD INTEGRATION:
 *   The output format matches the VRPerformanceDashboard's data contract:
 *   - Uses the same FrameTimeSample-style timestamped entries
 *   - Compatible with the same React state management patterns
 *   - Provides ARIA-friendly text descriptions for accessibility
 *
 * PERFORMANCE:
 *   Snapshot generation: ~0.1-0.3ms (copy + normalize)
 *   Time series append: ~0.01ms
 *   Full dashboard data build: ~0.5ms
 *   Safe for 10Hz dashboard update rate.
 *
 * @module DNFVisualizationData
 */

import type { Vec3 } from './AgentStateBuffer';
import type {
  DNFVisualizationSnapshot,
  DNFFieldStatistics,
  DNFPeak,
  DNFIntegrationMetrics,
} from './DynamicNeuralFieldTypes';
import {
  createEmptyVisualizationSnapshot,
  createEmptyDNFStatistics,
} from './DynamicNeuralFieldTypes';

// =============================================================================
// TIME SERIES TYPES
// =============================================================================

/**
 * A single time-series sample for DNF metrics graphing.
 */
export interface DNFTimeSample {
  /** Timestamp (ms since page load) */
  timestamp: number;
  /** Mean activation across the field */
  meanActivation: number;
  /** Max activation */
  maxActivation: number;
  /** Mean output (firing rate) */
  meanOutput: number;
  /** Number of detected peaks */
  peakCount: number;
  /** Number of stable peaks */
  stablePeakCount: number;
  /** Active fraction of field */
  activeFraction: number;
  /** Step computation time in ms */
  stepTimeMs: number;
  /** Total input strength */
  inputStrength: number;
}

/**
 * Color mapping configuration for heatmap rendering.
 */
export interface DNFColorMap {
  /** Color for minimum activation (cold) - [r, g, b, a] each 0-255 */
  coldColor: [number, number, number, number];
  /** Color for zero/resting activation - [r, g, b, a] */
  neutralColor: [number, number, number, number];
  /** Color for maximum activation (hot) - [r, g, b, a] */
  hotColor: [number, number, number, number];
  /** Color for peak markers - [r, g, b, a] */
  peakColor: [number, number, number, number];
  /** Color for input overlay - [r, g, b, a] */
  inputColor: [number, number, number, number];
}

/**
 * Complete dashboard data package for a single DNF field.
 */
export interface DNFDashboardData {
  /** Latest snapshot */
  snapshot: DNFVisualizationSnapshot;
  /** RGBA pixel data for the activation heatmap (4 * width * height bytes) */
  activationPixels: Uint8ClampedArray;
  /** RGBA pixel data for the output heatmap */
  outputPixels: Uint8ClampedArray;
  /** RGBA pixel data for the input overlay */
  inputPixels: Uint8ClampedArray;
  /** Time series history (last N samples) */
  timeSeries: DNFTimeSample[];
  /** Integration metrics */
  metrics: DNFIntegrationMetrics | null;
  /** ARIA text description for accessibility */
  ariaDescription: string;
  /** Summary text for compact display */
  summaryText: string;
}

// =============================================================================
// DEFAULT COLOR MAP
// =============================================================================

/**
 * Default color map: blue (cold) -> black (neutral) -> red/yellow (hot).
 */
export const DEFAULT_DNF_COLOR_MAP: DNFColorMap = {
  coldColor: [30, 60, 180, 255],     // Blue for inhibited
  neutralColor: [15, 15, 25, 255],    // Near-black for resting
  hotColor: [255, 80, 20, 255],       // Red-orange for active
  peakColor: [255, 255, 0, 255],      // Yellow for peaks
  inputColor: [0, 180, 80, 128],      // Semi-transparent green for input
};

// =============================================================================
// DNF VISUALIZATION DATA BUILDER
// =============================================================================

export class DNFVisualizationDataBuilder {
  private colorMap: DNFColorMap;
  private timeSeries: DNFTimeSample[] = [];
  private readonly maxTimeSeriesLength: number;
  private lastSnapshot: DNFVisualizationSnapshot;

  constructor(options?: {
    colorMap?: Partial<DNFColorMap>;
    maxTimeSeriesLength?: number;
  }) {
    this.colorMap = { ...DEFAULT_DNF_COLOR_MAP, ...options?.colorMap };
    this.maxTimeSeriesLength = options?.maxTimeSeriesLength ?? 300; // 5 minutes at 1Hz
    this.lastSnapshot = createEmptyVisualizationSnapshot();
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Process a new visualization snapshot and produce dashboard data.
   *
   * @param snapshot - Latest DNF visualization snapshot
   * @param metrics - Optional integration metrics
   * @returns Complete dashboard data package
   */
  buildDashboardData(
    snapshot: DNFVisualizationSnapshot,
    metrics?: DNFIntegrationMetrics,
  ): DNFDashboardData {
    this.lastSnapshot = snapshot;

    // Append to time series
    this.appendTimeSample(snapshot);

    // Generate pixel data
    const activationPixels = this.renderHeatmap(
      snapshot.activationHeatmap,
      snapshot.width,
      snapshot.height,
      'activation',
    );

    const outputPixels = this.renderHeatmap(
      snapshot.outputHeatmap,
      snapshot.width,
      snapshot.height,
      'output',
    );

    const inputPixels = this.renderHeatmap(
      snapshot.inputOverlay,
      snapshot.width,
      snapshot.height,
      'input',
    );

    // Mark peaks on activation heatmap
    this.markPeaks(activationPixels, snapshot.peaks, snapshot.width, snapshot.height);

    // Generate text descriptions
    const ariaDescription = this.buildAriaDescription(snapshot, metrics);
    const summaryText = this.buildSummaryText(snapshot, metrics);

    return {
      snapshot,
      activationPixels,
      outputPixels,
      inputPixels,
      timeSeries: [...this.timeSeries],
      metrics: metrics ?? null,
      ariaDescription,
      summaryText,
    };
  }

  /**
   * Get the time series data (read-only copy).
   */
  getTimeSeries(): DNFTimeSample[] {
    return [...this.timeSeries];
  }

  /**
   * Get the last processed snapshot.
   */
  getLastSnapshot(): DNFVisualizationSnapshot {
    return this.lastSnapshot;
  }

  /**
   * Clear time series history.
   */
  clearTimeSeries(): void {
    this.timeSeries = [];
  }

  /**
   * Update the color map.
   */
  setColorMap(colorMap: Partial<DNFColorMap>): void {
    this.colorMap = { ...this.colorMap, ...colorMap };
  }

  /**
   * Generate kernel visualization as RGBA pixel data.
   *
   * @param kernelWeights - Kernel weight array
   * @param kernelWidth - Kernel width
   * @param kernelHeight - Kernel height
   * @returns RGBA pixel data
   */
  renderKernel(
    kernelWeights: Float32Array,
    kernelWidth: number,
    kernelHeight: number,
  ): Uint8ClampedArray {
    // Find max absolute value for normalization
    let maxAbs = 0;
    for (let i = 0; i < kernelWeights.length; i++) {
      maxAbs = Math.max(maxAbs, Math.abs(kernelWeights[i]));
    }
    if (maxAbs === 0) maxAbs = 1;

    // Normalize to [-1, 1]
    const normalized = new Float32Array(kernelWeights.length);
    for (let i = 0; i < kernelWeights.length; i++) {
      normalized[i] = kernelWeights[i] / maxAbs;
    }

    return this.renderHeatmap(normalized, kernelWidth, kernelHeight, 'activation');
  }

  // ===========================================================================
  // INTERNAL: HEATMAP RENDERING
  // ===========================================================================

  /**
   * Convert a float array to RGBA pixel data using the color map.
   */
  private renderHeatmap(
    values: Float32Array,
    width: number,
    height: number,
    mode: 'activation' | 'output' | 'input',
  ): Uint8ClampedArray {
    const pixels = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      const pixIdx = i * 4;

      let r: number, g: number, b: number, a: number;

      if (mode === 'input') {
        // Input: single-color with alpha proportional to strength
        const strength = Math.min(1, Math.abs(v) * 2);
        const c = this.colorMap.inputColor;
        r = c[0];
        g = c[1];
        b = c[2];
        a = Math.round(strength * c[3]);
      } else if (mode === 'output') {
        // Output: 0 = black, 1 = hot color
        const t = Math.max(0, Math.min(1, v));
        const neutral = this.colorMap.neutralColor;
        const hot = this.colorMap.hotColor;
        r = Math.round(neutral[0] + t * (hot[0] - neutral[0]));
        g = Math.round(neutral[1] + t * (hot[1] - neutral[1]));
        b = Math.round(neutral[2] + t * (hot[2] - neutral[2]));
        a = 255;
      } else {
        // Activation: cold -> neutral -> hot (diverging colormap)
        const clamped = Math.max(-1, Math.min(1, v));

        if (clamped < 0) {
          // Negative: neutral -> cold
          const t = -clamped; // 0..1
          const neutral = this.colorMap.neutralColor;
          const cold = this.colorMap.coldColor;
          r = Math.round(neutral[0] + t * (cold[0] - neutral[0]));
          g = Math.round(neutral[1] + t * (cold[1] - neutral[1]));
          b = Math.round(neutral[2] + t * (cold[2] - neutral[2]));
          a = 255;
        } else {
          // Positive: neutral -> hot
          const t = clamped; // 0..1
          const neutral = this.colorMap.neutralColor;
          const hot = this.colorMap.hotColor;
          r = Math.round(neutral[0] + t * (hot[0] - neutral[0]));
          g = Math.round(neutral[1] + t * (hot[1] - neutral[1]));
          b = Math.round(neutral[2] + t * (hot[2] - neutral[2]));
          a = 255;
        }
      }

      pixels[pixIdx + 0] = r;
      pixels[pixIdx + 1] = g;
      pixels[pixIdx + 2] = b;
      pixels[pixIdx + 3] = a;
    }

    return pixels;
  }

  /**
   * Mark detected peaks on a pixel buffer.
   */
  private markPeaks(
    pixels: Uint8ClampedArray,
    peaks: Array<DNFPeak & { worldPosition?: Vec3 }>,
    width: number,
    height: number,
  ): void {
    const [r, g, b, a] = this.colorMap.peakColor;

    for (const peak of peaks) {
      const [px, py] = peak.position;

      // Draw a small crosshair at the peak position
      const offsets = [
        [0, 0], [-1, 0], [1, 0], [0, -1], [0, 1],
        [-2, 0], [2, 0], [0, -2], [0, 2],
      ];

      // Stable peaks get a larger marker
      if (peak.isStable) {
        offsets.push(
          [-1, -1], [1, -1], [-1, 1], [1, 1],
          [-3, 0], [3, 0], [0, -3], [0, 3],
        );
      }

      for (const [ox, oy] of offsets) {
        const mx = px + ox;
        const my = py + oy;
        if (mx >= 0 && mx < width && my >= 0 && my < height) {
          const idx = (my * width + mx) * 4;
          pixels[idx + 0] = r;
          pixels[idx + 1] = g;
          pixels[idx + 2] = b;
          pixels[idx + 3] = a;
        }
      }
    }
  }

  // ===========================================================================
  // INTERNAL: TIME SERIES
  // ===========================================================================

  /**
   * Append a time sample from the snapshot.
   */
  private appendTimeSample(snapshot: DNFVisualizationSnapshot): void {
    const stats = snapshot.statistics;

    this.timeSeries.push({
      timestamp: snapshot.timestamp,
      meanActivation: stats.meanActivation,
      maxActivation: stats.maxActivation,
      meanOutput: stats.meanOutput,
      peakCount: stats.peaks.length,
      stablePeakCount: stats.peaks.filter(p => p.isStable).length,
      activeFraction: stats.activeFraction,
      stepTimeMs: snapshot.performance.stepTimeMs,
      inputStrength: stats.totalInputStrength,
    });

    // Trim to max length
    while (this.timeSeries.length > this.maxTimeSeriesLength) {
      this.timeSeries.shift();
    }
  }

  // ===========================================================================
  // INTERNAL: TEXT GENERATION
  // ===========================================================================

  /**
   * Build ARIA text description for accessibility.
   */
  private buildAriaDescription(
    snapshot: DNFVisualizationSnapshot,
    metrics?: DNFIntegrationMetrics,
  ): string {
    const stats = snapshot.statistics;
    const peakCount = stats.peaks.length;
    const stableCount = stats.peaks.filter(p => p.isStable).length;

    let desc = `Dynamic Neural Field: ${snapshot.label}. `;
    desc += `Size ${snapshot.width} by ${snapshot.height}. `;
    desc += `${peakCount} attention peak${peakCount !== 1 ? 's' : ''} detected`;
    if (stableCount > 0) {
      desc += `, ${stableCount} stable`;
    }
    desc += '. ';

    desc += `Mean activation ${stats.meanActivation.toFixed(2)}, `;
    desc += `max ${stats.maxActivation.toFixed(2)}. `;
    desc += `${(stats.activeFraction * 100).toFixed(1)}% of field active. `;

    if (metrics) {
      desc += `Running at ${metrics.dnfHz} Hz. `;
      desc += `SNN ${metrics.snnConnected ? 'connected' : 'disconnected'}. `;
      desc += `Step time ${metrics.avgStepTimeMs.toFixed(1)} ms. `;
    }

    return desc;
  }

  /**
   * Build summary text for compact display.
   */
  private buildSummaryText(
    snapshot: DNFVisualizationSnapshot,
    metrics?: DNFIntegrationMetrics,
  ): string {
    const stats = snapshot.statistics;
    const peakCount = stats.peaks.length;
    const stableCount = stats.peaks.filter(p => p.isStable).length;

    let text = `DNF [${snapshot.width}x${snapshot.height}] `;
    text += `Peaks: ${peakCount}`;
    if (stableCount > 0) text += ` (${stableCount} stable)`;
    text += ` | Active: ${(stats.activeFraction * 100).toFixed(0)}%`;
    text += ` | Max: ${stats.maxActivation.toFixed(1)}`;

    if (metrics) {
      text += ` | ${metrics.dnfHz}Hz`;
      text += ` | ${metrics.avgStepTimeMs.toFixed(1)}ms`;
    }

    return text;
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a DNFVisualizationDataBuilder with optional configuration.
 */
export function createDNFVisualizationDataBuilder(options?: {
  colorMap?: Partial<DNFColorMap>;
  maxTimeSeriesLength?: number;
}): DNFVisualizationDataBuilder {
  return new DNFVisualizationDataBuilder(options);
}
