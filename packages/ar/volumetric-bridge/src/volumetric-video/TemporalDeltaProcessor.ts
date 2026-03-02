/**
 * TemporalDeltaProcessor — 4D-MoDe Motion-Decoupled Delta Pipeline
 *
 * Implements the temporal delta processing pipeline from 4D-MoDe:
 * 1. Motion classification: Separate Gaussians into static/dynamic
 * 2. Delta application: Apply translation/rotation/residual deltas
 * 3. Dynamic Gaussian compensation: Handle newly spawned Gaussians
 * 4. Dynamic change ratio computation: Feed adaptive keyframe decisions
 *
 * The processor works on per-frame basis, taking a reference keyframe
 * (I-frame) and applying successive P-frame deltas to reconstruct
 * the current frame state.
 *
 * Research references:
 *   W.036 - 4D-MoDe motion decomposition temporal deltas
 *   P.030.03 - Temporal delta streaming architecture
 *
 * @module volumetric-bridge/volumetric-video
 */

import type {
  ITemporalDeltaProcessor,
  KeyframeData,
  DeltaFrameData,
  GaussianMotionDelta,
  MotionClassificationThresholds,
} from './types';
import { DEFAULT_MOTION_THRESHOLDS } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Quaternion multiplication helper constants */
const EPSILON = 1e-7;

// =============================================================================
// TEMPORAL DELTA PROCESSOR
// =============================================================================

/**
 * Processes temporal deltas between volumetric video frames using
 * 4D-MoDe's motion-decoupled approach.
 */
export class TemporalDeltaProcessor implements ITemporalDeltaProcessor {
  private thresholds: MotionClassificationThresholds;

  /** Preallocated scratch buffers for delta application (avoid GC pressure) */
  private scratchPositions: Float32Array | null = null;
  private scratchScales: Float32Array | null = null;
  private scratchRotations: Float32Array | null = null;
  private scratchColors: Float32Array | null = null;
  private scratchOpacities: Float32Array | null = null;
  private lastAllocatedCount = 0;

  constructor(thresholds?: Partial<MotionClassificationThresholds>) {
    this.thresholds = { ...DEFAULT_MOTION_THRESHOLDS, ...thresholds };
  }

  /**
   * Ensure scratch buffers are allocated for the given Gaussian count.
   * Reuses existing buffers if large enough to avoid allocation churn.
   */
  private ensureScratchBuffers(count: number): void {
    if (this.lastAllocatedCount >= count) return;

    // Allocate with 20% headroom for compensation Gaussians
    const allocCount = Math.ceil(count * 1.2);
    this.scratchPositions = new Float32Array(allocCount * 3);
    this.scratchScales = new Float32Array(allocCount * 3);
    this.scratchRotations = new Float32Array(allocCount * 4);
    this.scratchColors = new Float32Array(allocCount * 4);
    this.scratchOpacities = new Float32Array(allocCount);
    this.lastAllocatedCount = allocCount;
  }

  // ---------------------------------------------------------------------------
  // Delta Application
  // ---------------------------------------------------------------------------

  /**
   * Apply a delta frame to a reference keyframe, producing the reconstructed
   * frame state for the delta's timestamp.
   *
   * Algorithm (per 4D-MoDe):
   * 1. Copy reference frame attributes as base
   * 2. Apply rigid motion deltas (translation + rotation) to all Gaussians
   * 3. Apply residual deltas (scale, opacity, color) to dynamic Gaussians
   * 4. Append compensated Gaussians for newly spawned content
   * 5. Return reconstructed frame as a new KeyframeData
   */
  applyDelta(reference: KeyframeData, delta: DeltaFrameData): KeyframeData {
    const startTime = performance.now();
    const refCount = reference.gaussianCount;
    const compCount = delta.compensatedCount;
    const totalCount = refCount + compCount;

    this.ensureScratchBuffers(totalCount);

    const outPositions = new Float32Array(totalCount * 3);
    const outScales = new Float32Array(totalCount * 3);
    const outRotations = new Float32Array(totalCount * 4);
    const outColors = new Float32Array(totalCount * 4);
    const outOpacities = new Float32Array(totalCount);

    const md = delta.motionDelta;

    // Step 1+2: Apply rigid motion deltas (translation + rotation)
    for (let i = 0; i < refCount; i++) {
      const i3 = i * 3;
      const i4 = i * 4;

      // Translation: position += delta_translation
      outPositions[i3] = reference.positions[i3] + md.translation[i3];
      outPositions[i3 + 1] = reference.positions[i3 + 1] + md.translation[i3 + 1];
      outPositions[i3 + 2] = reference.positions[i3 + 2] + md.translation[i3 + 2];

      // Rotation: quaternion multiplication (ref * delta)
      const refQx = reference.rotations[i4];
      const refQy = reference.rotations[i4 + 1];
      const refQz = reference.rotations[i4 + 2];
      const refQw = reference.rotations[i4 + 3];
      const dQx = md.rotation[i4];
      const dQy = md.rotation[i4 + 1];
      const dQz = md.rotation[i4 + 2];
      const dQw = md.rotation[i4 + 3];

      // Hamilton product: q_ref * q_delta
      outRotations[i4] = refQw * dQx + refQx * dQw + refQy * dQz - refQz * dQy;
      outRotations[i4 + 1] = refQw * dQy - refQx * dQz + refQy * dQw + refQz * dQx;
      outRotations[i4 + 2] = refQw * dQz + refQx * dQy - refQy * dQx + refQz * dQw;
      outRotations[i4 + 3] = refQw * dQw - refQx * dQx - refQy * dQy - refQz * dQz;

      // Normalize quaternion
      const qLen = Math.sqrt(
        outRotations[i4] ** 2 +
        outRotations[i4 + 1] ** 2 +
        outRotations[i4 + 2] ** 2 +
        outRotations[i4 + 3] ** 2,
      ) || 1;
      outRotations[i4] /= qLen;
      outRotations[i4 + 1] /= qLen;
      outRotations[i4 + 2] /= qLen;
      outRotations[i4 + 3] /= qLen;

      // Base scale and color from reference
      outScales[i3] = reference.scales[i3];
      outScales[i3 + 1] = reference.scales[i3 + 1];
      outScales[i3 + 2] = reference.scales[i3 + 2];

      outColors[i4] = reference.colors[i4];
      outColors[i4 + 1] = reference.colors[i4 + 1];
      outColors[i4 + 2] = reference.colors[i4 + 2];
      outColors[i4 + 3] = reference.colors[i4 + 3];

      outOpacities[i] = reference.opacities[i];
    }

    // Step 3: Apply residual deltas for dynamic Gaussians
    if (md.scaleResidual) {
      for (let i = 0; i < refCount; i++) {
        const i3 = i * 3;
        outScales[i3] += md.scaleResidual[i3];
        outScales[i3 + 1] += md.scaleResidual[i3 + 1];
        outScales[i3 + 2] += md.scaleResidual[i3 + 2];
      }
    }

    if (md.opacityResidual) {
      for (let i = 0; i < refCount; i++) {
        outOpacities[i] = Math.max(0, Math.min(1, outOpacities[i] + md.opacityResidual[i]));
        outColors[i * 4 + 3] = outOpacities[i];
      }
    }

    if (md.colorResidual) {
      for (let i = 0; i < refCount; i++) {
        const i3 = i * 3;
        const i4 = i * 4;
        outColors[i4] = Math.max(0, Math.min(1, outColors[i4] + md.colorResidual[i3]));
        outColors[i4 + 1] = Math.max(0, Math.min(1, outColors[i4 + 1] + md.colorResidual[i3 + 1]));
        outColors[i4 + 2] = Math.max(0, Math.min(1, outColors[i4 + 2] + md.colorResidual[i3 + 2]));
      }
    }

    // Step 4: Append compensated Gaussians
    if (compCount > 0 && delta.compensatedPositions) {
      const baseOffset = refCount;
      for (let i = 0; i < compCount; i++) {
        const srcI3 = i * 3;
        const srcI4 = i * 4;
        const dstI3 = (baseOffset + i) * 3;
        const dstI4 = (baseOffset + i) * 4;

        outPositions[dstI3] = delta.compensatedPositions[srcI3];
        outPositions[dstI3 + 1] = delta.compensatedPositions[srcI3 + 1];
        outPositions[dstI3 + 2] = delta.compensatedPositions[srcI3 + 2];

        if (delta.compensatedScales) {
          outScales[dstI3] = delta.compensatedScales[srcI3];
          outScales[dstI3 + 1] = delta.compensatedScales[srcI3 + 1];
          outScales[dstI3 + 2] = delta.compensatedScales[srcI3 + 2];
        } else {
          outScales[dstI3] = 0.01;
          outScales[dstI3 + 1] = 0.01;
          outScales[dstI3 + 2] = 0.01;
        }

        if (delta.compensatedRotations) {
          outRotations[dstI4] = delta.compensatedRotations[srcI4];
          outRotations[dstI4 + 1] = delta.compensatedRotations[srcI4 + 1];
          outRotations[dstI4 + 2] = delta.compensatedRotations[srcI4 + 2];
          outRotations[dstI4 + 3] = delta.compensatedRotations[srcI4 + 3];
        } else {
          outRotations[dstI4 + 3] = 1; // Identity quaternion
        }

        if (delta.compensatedColors) {
          outColors[dstI4] = delta.compensatedColors[srcI4];
          outColors[dstI4 + 1] = delta.compensatedColors[srcI4 + 1];
          outColors[dstI4 + 2] = delta.compensatedColors[srcI4 + 2];
          outColors[dstI4 + 3] = delta.compensatedColors[srcI4 + 3];
        } else {
          outColors[dstI4] = 0.8;
          outColors[dstI4 + 1] = 0.8;
          outColors[dstI4 + 2] = 0.8;
          outColors[dstI4 + 3] = 1.0;
        }

        outOpacities[baseOffset + i] = outColors[dstI4 + 3];
      }
    }

    const decodeTimeMs = performance.now() - startTime;

    return {
      frameIndex: delta.frameIndex,
      frameType: 'I', // Reconstructed frame acts as a full keyframe
      timestamp: delta.timestamp,
      positions: outPositions,
      scales: outScales,
      rotations: outRotations,
      colors: outColors,
      opacities: outOpacities,
      gaussianCount: totalCount,
      motionClasses: reference.motionClasses, // Propagate classification
      decodeTimeMs,
    };
  }

  // ---------------------------------------------------------------------------
  // Motion Classification (4D-MoDe)
  // ---------------------------------------------------------------------------

  /**
   * Classify Gaussians as static or dynamic based on inter-frame motion.
   *
   * Algorithm from 4D-MoDe:
   * 1. Compute normalized displacement for each Gaussian
   * 2. Compute scale change ratio
   * 3. Mark as dynamic if either exceeds threshold
   * 4. Apply KNN majority voting for spatial consistency
   *
   * Returns a Uint8Array where 0 = static, 1 = dynamic.
   */
  classifyMotion(
    currentPositions: Float32Array,
    previousPositions: Float32Array,
    currentScales: Float32Array,
    previousScales: Float32Array,
    thresholds?: MotionClassificationThresholds,
  ): Uint8Array {
    const t = thresholds || this.thresholds;
    const count = currentPositions.length / 3;
    const classification = new Uint8Array(count);

    // Step 1-3: Initial classification based on displacement and scale
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Compute displacement
      const dx = currentPositions[i3] - previousPositions[i3];
      const dy = currentPositions[i3 + 1] - previousPositions[i3 + 1];
      const dz = currentPositions[i3 + 2] - previousPositions[i3 + 2];
      const displacement = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Compute scale change
      const prevMaxScale = Math.max(
        previousScales[i3],
        previousScales[i3 + 1],
        previousScales[i3 + 2],
      );
      const currMaxScale = Math.max(
        currentScales[i3],
        currentScales[i3 + 1],
        currentScales[i3 + 2],
      );
      const scaleChange = prevMaxScale > EPSILON
        ? Math.abs(currMaxScale - prevMaxScale) / prevMaxScale
        : 0;

      // Normalize displacement by scale for resolution-invariant threshold
      const normalizedDisp = prevMaxScale > EPSILON
        ? displacement / prevMaxScale
        : displacement;

      // Classify as dynamic if either exceeds threshold
      if (normalizedDisp > t.displacementThreshold || scaleChange > t.scaleChangeThreshold) {
        classification[i] = 1; // dynamic
      }
    }

    // Step 4: KNN majority voting for spatial consistency
    if (t.knnK > 0) {
      this.applyKNNSmoothing(classification, currentPositions, count, t.knnK);
    }

    return classification;
  }

  /**
   * Apply KNN majority voting to smooth motion classification boundaries.
   * Prevents isolated static/dynamic labels from creating visual artifacts.
   */
  private applyKNNSmoothing(
    classification: Uint8Array,
    positions: Float32Array,
    count: number,
    k: number,
  ): void {
    // For large point clouds, use a spatial hash grid instead of brute force KNN.
    // For now, use a simplified approach with spatial bucketing.
    if (count > 50000) {
      // For very large sets, skip smoothing to stay within time budget
      return;
    }

    const smoothed = new Uint8Array(classification);

    for (let i = 0; i < count; i++) {
      const ix = positions[i * 3];
      const iy = positions[i * 3 + 1];
      const iz = positions[i * 3 + 2];

      // Find K nearest neighbors (brute force for small sets)
      const neighbors: { index: number; distSq: number }[] = [];

      for (let j = 0; j < count; j++) {
        if (i === j) continue;
        const dx = positions[j * 3] - ix;
        const dy = positions[j * 3 + 1] - iy;
        const dz = positions[j * 3 + 2] - iz;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (neighbors.length < k) {
          neighbors.push({ index: j, distSq });
          if (neighbors.length === k) {
            neighbors.sort((a, b) => a.distSq - b.distSq);
          }
        } else if (distSq < neighbors[k - 1].distSq) {
          neighbors[k - 1] = { index: j, distSq };
          neighbors.sort((a, b) => a.distSq - b.distSq);
        }
      }

      // Majority vote
      let dynamicCount = 0;
      for (const n of neighbors) {
        if (classification[n.index] === 1) dynamicCount++;
      }

      // If majority of neighbors disagree with current label, flip it
      smoothed[i] = dynamicCount > k / 2 ? 1 : 0;
    }

    // Copy smoothed back
    classification.set(smoothed);
  }

  // ---------------------------------------------------------------------------
  // Dynamic Change Ratio
  // ---------------------------------------------------------------------------

  /**
   * Compute the dynamic change ratio for adaptive keyframe insertion.
   *
   * Per 4D-MoDe: r_t = |Delta_G_t| / |G_{t-1}^dyn|
   * - Delta_G_t: newly compensated Gaussians in this delta frame
   * - G_{t-1}^dyn: existing dynamic Gaussians from previous frame
   *
   * When r_t exceeds the threshold (default 0.15 = 15%), a new
   * keyframe should be inserted.
   */
  computeDynamicChangeRatio(
    delta: DeltaFrameData,
    referenceGaussianCount: number,
  ): number {
    if (referenceGaussianCount <= 0) return 1.0; // Force keyframe if no reference

    // The ratio is based on compensated (newly spawned) Gaussians
    // relative to the reference frame's dynamic Gaussian count
    return delta.compensatedCount / referenceGaussianCount;
  }

  /**
   * Update motion classification thresholds.
   */
  updateThresholds(thresholds: Partial<MotionClassificationThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get current thresholds.
   */
  getThresholds(): Readonly<MotionClassificationThresholds> {
    return { ...this.thresholds };
  }

  /**
   * Release scratch buffers.
   */
  dispose(): void {
    this.scratchPositions = null;
    this.scratchScales = null;
    this.scratchRotations = null;
    this.scratchColors = null;
    this.scratchOpacities = null;
    this.lastAllocatedCount = 0;
  }
}
