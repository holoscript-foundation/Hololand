/**
 * DNFSpatialAttentionField
 *
 * Wraps DynamicNeuralField to provide VR scene saliency mapping.
 * This module connects SNN perception outputs (per-object attention scores)
 * to the continuous DNF surface, producing a smooth spatial attention field
 * that supports:
 *
 * CAPABILITIES:
 *   1. Spatial Saliency Mapping: Converts discrete object attention scores
 *      into a continuous 2D saliency field over the VR world ground plane.
 *   2. Working Memory: DNF peaks persist after objects move or disappear,
 *      maintaining spatial attention history.
 *   3. Winner-Take-All: Lateral inhibition in the DNF selects the most
 *      salient spatial region, suppressing competing locations.
 *   4. Smooth Tracking: DNF peaks smoothly follow moving high-attention
 *      objects rather than jumping discretely.
 *
 * DATA FLOW:
 * ```
 *   SNNPerceptionBridge.readPerception()
 *        |
 *        v
 *   AttentionScore[] (per-object, discrete)
 *        |
 *        v
 *   DNFSpatialAttentionField.ingestSNNPerception()
 *        |   Projects objects onto 2D field as Gaussian stimuli
 *        v
 *   DynamicNeuralField.step()
 *        |   Amari equation: competition, selection, persistence
 *        v
 *   Continuous 2D saliency field + detected peaks
 *        |
 *        v
 *   getSaliencyAt(worldPos) -> 0..1
 *   getTopSalientRegions() -> DNFPeak[] with world positions
 * ```
 *
 * PERFORMANCE:
 *   Input projection: ~0.1ms (64 objects -> 64x64 field)
 *   DNF step: ~0.5ms (convolution-dominated)
 *   Total: ~0.6ms, runs at 5-10Hz OFF render loop
 *
 * @module DNFSpatialAttentionField
 */

import { logger } from './logger';
import type { Vec3 } from './AgentStateBuffer';
import type {
  SpatialAttentionFieldConfig,
  DNFWorldMapping,
  DNFFieldStatistics,
  DNFPeak,
  DNFVisualizationSnapshot,
} from './DynamicNeuralFieldTypes';
import {
  DEFAULT_SPATIAL_ATTENTION_CONFIG,
  createEmptyVisualizationSnapshot,
} from './DynamicNeuralFieldTypes';
import type {
  SNNPerceptionState,
  AttentionScore,
} from './SNNPerceptionTypes';
import {
  DynamicNeuralField,
  createDynamicNeuralField,
} from './DynamicNeuralField';

// =============================================================================
// SPATIAL ATTENTION FIELD
// =============================================================================

export class DNFSpatialAttentionField {
  private readonly config: SpatialAttentionFieldConfig;
  private readonly field: DynamicNeuralField;
  private readonly worldMapping: DNFWorldMapping;

  // Input projection state
  private projectedInput: Float32Array;
  private lastSNNState: SNNPerceptionState | null = null;
  private lastObjectPositions: Map<string, Vec3> = new Map();

  // Cached analysis
  private lastStatistics: DNFFieldStatistics | null = null;
  private statisticsDirty: boolean = true;

  constructor(config?: Partial<SpatialAttentionFieldConfig>) {
    this.config = { ...DEFAULT_SPATIAL_ATTENTION_CONFIG, ...config };
    this.worldMapping = this.config.worldMapping;

    // Create underlying DNF
    this.field = createDynamicNeuralField(this.config.fieldConfig);

    // Allocate input buffer
    const size = this.config.fieldConfig.width * this.config.fieldConfig.height;
    this.projectedInput = new Float32Array(size);

    logger.info('[DNFSpatialAttentionField] Initialized', {
      fieldSize: `${this.config.fieldConfig.width}x${this.config.fieldConfig.height}`,
      worldOrigin: this.worldMapping.worldOrigin,
      worldExtent: this.worldMapping.worldExtent,
      snnInputGain: this.config.snnInputGain,
    });
  }

  // ===========================================================================
  // PUBLIC API: SNN INTEGRATION
  // ===========================================================================

  /**
   * Ingest SNN perception state and project object attention onto the DNF.
   *
   * Each object with attention > threshold is projected as a Gaussian
   * stimulus on the 2D field, centered at the object's projected position
   * with amplitude proportional to its SNN attention score.
   *
   * @param snnState - Latest SNN perception state
   * @param objectPositions - Map from object ID to world position
   */
  ingestSNNPerception(
    snnState: SNNPerceptionState,
    objectPositions: Map<string, Vec3>,
  ): void {
    this.lastSNNState = snnState;
    this.lastObjectPositions = objectPositions;

    // Decay previous input
    const size = this.projectedInput.length;
    for (let i = 0; i < size; i++) {
      this.projectedInput[i] *= (1 - this.config.inputDecayRate);
    }

    // Project each high-attention object onto the field
    let projectedCount = 0;
    const maxProjected = this.config.maxProjectedObjects;

    for (const score of snnState.attentionScores) {
      if (projectedCount >= maxProjected) break;
      if (score.attention < this.config.snnAttentionThreshold) continue;

      const worldPos = objectPositions.get(score.objectId);
      if (!worldPos) continue;

      // Convert world position to field coordinates
      const fieldCoords = this.worldToField(worldPos);
      if (!fieldCoords) continue;

      // Add Gaussian input at the projected position
      const amplitude = score.attention * this.config.snnInputGain;
      this.addGaussianToBuffer(
        this.projectedInput,
        fieldCoords[0],
        fieldCoords[1],
        amplitude,
        this.config.snnInputSigma,
      );

      projectedCount++;
    }

    this.statisticsDirty = true;
  }

  /**
   * Run one DNF simulation step with the current projected input.
   *
   * Call this at the desired DNF update frequency (5-10Hz).
   */
  step(): void {
    this.field.step(this.projectedInput);
    this.statisticsDirty = true;
  }

  /**
   * Run multiple DNF steps.
   */
  stepMultiple(steps: number): void {
    for (let i = 0; i < steps; i++) {
      this.field.step(i === 0 ? this.projectedInput : undefined);
    }
    this.statisticsDirty = true;
  }

  // ===========================================================================
  // PUBLIC API: SALIENCY QUERIES
  // ===========================================================================

  /**
   * Get saliency at a world-space position.
   *
   * Returns 0..1 indicating how salient (attention-worthy) this position is.
   * Uses bilinear interpolation on the DNF output field.
   *
   * @param worldPos - World-space position
   * @returns Saliency value (0 = background, 1 = peak attention)
   */
  getSaliencyAt(worldPos: Vec3): number {
    const fieldCoords = this.worldToField(worldPos);
    if (!fieldCoords) return 0;

    const [fx, fy] = fieldCoords;
    const state = this.field.getState();
    const output = state.output;
    const width = state.width;
    const height = state.height;

    // Bilinear interpolation
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);
    const dx = fx - x0;
    const dy = fy - y0;

    // Recompute output at needed positions using activation
    const activation = state.activation;
    const { beta, threshold } = this.field.getConfig().activation;

    const f = (u: number) => 1.0 / (1.0 + Math.exp(-beta * (u - threshold)));

    const v00 = f(activation[y0 * width + x0]);
    const v10 = f(activation[y0 * width + x1]);
    const v01 = f(activation[y1 * width + x0]);
    const v11 = f(activation[y1 * width + x1]);

    return v00 * (1 - dx) * (1 - dy) +
      v10 * dx * (1 - dy) +
      v01 * (1 - dx) * dy +
      v11 * dx * dy;
  }

  /**
   * Get the top salient regions as DNF peaks with world positions.
   *
   * @param maxPeaks - Maximum number of peaks to return (default: 10)
   */
  getTopSalientRegions(maxPeaks: number = 10): Array<DNFPeak & { worldPosition: Vec3 }> {
    const peaks = this.field.detectPeaks();

    return peaks
      .sort((a, b) => b.amplitude - a.amplitude)
      .slice(0, maxPeaks)
      .map(peak => ({
        ...peak,
        worldPosition: this.fieldToWorld(peak.position[0], peak.position[1]),
      }));
  }

  /**
   * Get the single most salient world position.
   * Returns null if no peak exists.
   */
  getMostSalientPosition(): { position: Vec3; amplitude: number } | null {
    const regions = this.getTopSalientRegions(1);
    if (regions.length === 0) return null;

    return {
      position: regions[0].worldPosition,
      amplitude: regions[0].amplitude,
    };
  }

  /**
   * Check if a specific world position has active attention.
   */
  isAttentionActive(worldPos: Vec3, threshold: number = 0.3): boolean {
    return this.getSaliencyAt(worldPos) >= threshold;
  }

  // ===========================================================================
  // PUBLIC API: STATISTICS AND VISUALIZATION
  // ===========================================================================

  /**
   * Get field statistics.
   */
  getStatistics(): DNFFieldStatistics {
    if (this.statisticsDirty || !this.lastStatistics) {
      this.lastStatistics = this.field.computeStatistics();
      this.statisticsDirty = false;
    }
    return this.lastStatistics;
  }

  /**
   * Create a visualization snapshot compatible with the NeuralActivityDashboard.
   */
  createVisualizationSnapshot(): DNFVisualizationSnapshot {
    const state = this.field.getState();
    const stats = this.getStatistics();
    const config = this.field.getConfig();

    // Create activation heatmap (clamped to [-1, 1])
    const size = state.width * state.height;
    const activationHeatmap = new Float32Array(size);
    const outputHeatmap = new Float32Array(size);
    const maxAbs = Math.max(Math.abs(stats.maxActivation), Math.abs(stats.minActivation), 1);

    for (let i = 0; i < size; i++) {
      activationHeatmap[i] = Math.max(-1, Math.min(1, state.activation[i] / maxAbs));
      outputHeatmap[i] = state.output[i];
    }

    // Map peaks to world positions
    const peaks = stats.peaks.map(peak => ({
      ...peak,
      worldPosition: this.fieldToWorld(peak.position[0], peak.position[1]),
    }));

    return {
      snapshotId: this.field.getNextSnapshotId(),
      timestamp: performance.now(),
      label: config.label,
      width: state.width,
      height: state.height,
      activationHeatmap,
      outputHeatmap,
      inputOverlay: new Float32Array(this.projectedInput),
      peaks,
      statistics: stats,
      performance: {
        stepTimeMs: this.field.getLastStepTimeMs(),
        convolutionTimeMs: this.field.getLastConvolutionTimeMs(),
        currentHz: 0, // Set by caller
        totalTimesteps: state.timestepCount,
      },
    };
  }

  // ===========================================================================
  // PUBLIC API: FIELD ACCESS
  // ===========================================================================

  /**
   * Get the underlying DynamicNeuralField (for advanced use).
   */
  getField(): DynamicNeuralField {
    return this.field;
  }

  /**
   * Get the field configuration.
   */
  getConfig(): Readonly<SpatialAttentionFieldConfig> {
    return this.config;
  }

  /**
   * Reset the attention field to initial state.
   */
  reset(): void {
    this.field.reset();
    this.projectedInput.fill(0);
    this.lastSNNState = null;
    this.lastObjectPositions.clear();
    this.lastStatistics = null;
    this.statisticsDirty = true;

    logger.debug('[DNFSpatialAttentionField] Reset');
  }

  // ===========================================================================
  // INTERNAL: COORDINATE TRANSFORMS
  // ===========================================================================

  /**
   * Convert world-space position to field coordinates.
   * Returns null if position is outside the mapped region.
   */
  worldToField(worldPos: Vec3): [number, number] | null {
    const origin = this.worldMapping.worldOrigin;
    const extent = this.worldMapping.worldExtent;
    const axisMap = this.worldMapping.axisMapping;

    // Get world-space deltas along mapped axes
    const worldDeltaX = worldPos[axisMap.fieldX] - origin[axisMap.fieldX];
    const worldDeltaY = worldPos[axisMap.fieldY] - origin[axisMap.fieldY];

    // Normalize to 0..1
    const extentX = extent[axisMap.fieldX];
    const extentY = extent[axisMap.fieldY];

    if (extentX === 0 || extentY === 0) return null;

    const normX = worldDeltaX / extentX;
    const normY = worldDeltaY / extentY;

    // Check bounds
    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return null;

    // Map to field coordinates
    const fieldX = normX * (this.config.fieldConfig.width - 1);
    const fieldY = normY * (this.config.fieldConfig.height - 1);

    return [fieldX, fieldY];
  }

  /**
   * Convert field coordinates to world-space position.
   */
  fieldToWorld(fieldX: number, fieldY: number): Vec3 {
    const origin = this.worldMapping.worldOrigin;
    const extent = this.worldMapping.worldExtent;
    const axisMap = this.worldMapping.axisMapping;

    const normX = fieldX / Math.max(1, this.config.fieldConfig.width - 1);
    const normY = fieldY / Math.max(1, this.config.fieldConfig.height - 1);

    const result: Vec3 = { x: origin.x, y: origin.y, z: origin.z };
    result[axisMap.fieldX] = origin[axisMap.fieldX] + normX * extent[axisMap.fieldX];
    result[axisMap.fieldY] = origin[axisMap.fieldY] + normY * extent[axisMap.fieldY];

    return result;
  }

  // ===========================================================================
  // INTERNAL: INPUT PROJECTION
  // ===========================================================================

  /**
   * Add a Gaussian stimulus to a buffer at a field position.
   */
  private addGaussianToBuffer(
    buffer: Float32Array,
    centerX: number,
    centerY: number,
    amplitude: number,
    sigma: number,
  ): void {
    const width = this.config.fieldConfig.width;
    const height = this.config.fieldConfig.height;
    const twoSigmaSq = 2 * sigma * sigma;

    // Only iterate over the region where the Gaussian has significant values
    const radius = Math.ceil(sigma * 3);
    const x0 = Math.max(0, Math.floor(centerX - radius));
    const x1 = Math.min(width - 1, Math.ceil(centerX + radius));
    const y0 = Math.max(0, Math.floor(centerY - radius));
    const y1 = Math.min(height - 1, Math.ceil(centerY + radius));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distSq = dx * dx + dy * dy;
        const value = amplitude * Math.exp(-distSq / twoSigmaSq);
        buffer[y * width + x] += value;
      }
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a DNFSpatialAttentionField with optional configuration.
 */
export function createDNFSpatialAttentionField(
  config?: Partial<SpatialAttentionFieldConfig>,
): DNFSpatialAttentionField {
  return new DNFSpatialAttentionField(config);
}
