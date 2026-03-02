/**
 * StaticDynamicDecomposer
 *
 * Decomposes Gaussian splats into static and dynamic components using
 * lookahead temporal analysis. Based on research from:
 *   - DeGauss (ICCV 2025): Dynamic-static decomposition with GS
 *   - DeSiRe-GS (CVPR 2025): 4D street Gaussians for static-dynamic decomposition
 *   - MEGA (ICCV 2025): Memory-efficient 4D Gaussian splatting
 *
 * Algorithm:
 * 1. Collect Gaussian positions across N temporal frames (lookahead window)
 * 2. Compute per-Gaussian motion statistics (magnitude, direction, variance)
 * 3. Classify each Gaussian using threshold-based decision tree:
 *    - Static: motion < staticThreshold
 *    - Quasi-static: staticThreshold < motion < quasiStaticThreshold
 *    - Dynamic-rigid: low residual after rigid transform fitting
 *    - Dynamic-deform: remaining dynamic Gaussians
 *    - Transient: high opacity variance across frames
 * 4. Apply spatial coherence smoothing (nearby Gaussians should agree)
 * 5. Compute lookahead predictions for motion compensation
 *
 * @module volumetric-bridge/nerf-to-gs
 */

import type {
  DecompositionConfig,
  DecompositionResult,
  DecompositionStats,
  GaussianMotionDescriptor,
  MotionClass,
  NeRFFeatureExtractionResult,
  TemporalFrameProvider,
} from './types';

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_DECOMPOSITION_CONFIG: DecompositionConfig = {
  lookaheadFrames: 8,
  temporalWindowSec: 1.0,
  staticThreshold: 0.01,
  quasiStaticThreshold: 0.05,
  transientOpacityThreshold: 0.3,
  rigidResidualThreshold: 0.02,
  minConfidence: 0.6,
  useDensityGradients: true,
  spatialCoherenceRadius: 0.1,
};

// =============================================================================
// TEMPORAL FRAME CACHE
// =============================================================================

/**
 * Cached Gaussian positions and opacities at a specific timestamp.
 */
interface TemporalSnapshot {
  timestamp: number;
  positions: Float32Array;  // N * 3
  opacities: Float32Array;  // N
  count: number;
}

// =============================================================================
// STATIC/DYNAMIC DECOMPOSER
// =============================================================================

/**
 * Decomposes a set of Gaussians into static and dynamic components
 * using multi-frame temporal analysis with lookahead classification.
 *
 * Usage:
 * ```typescript
 * const decomposer = new StaticDynamicDecomposer();
 *
 * const result = await decomposer.decompose(
 *   baseFrameData,
 *   temporalProvider,
 *   { lookaheadFrames: 8, staticThreshold: 0.01 },
 * );
 *
 * // result.staticIndices - indices of static Gaussians
 * // result.deformDynamicIndices - indices of dynamic Gaussians
 * // result.descriptors - per-Gaussian motion analysis
 * ```
 */
export class StaticDynamicDecomposer {
  private onProgress?: (stage: string, progress: number) => void;

  constructor(onProgress?: (stage: string, progress: number) => void) {
    this.onProgress = onProgress;
  }

  /**
   * Decompose Gaussians into static and dynamic components.
   *
   * @param baseFrame - Base frame Gaussian data (from NeRF extraction)
   * @param temporalProvider - Provides features at different timestamps
   * @param config - Decomposition parameters
   */
  async decompose(
    baseFrame: NeRFFeatureExtractionResult,
    temporalProvider: TemporalFrameProvider,
    config?: Partial<DecompositionConfig>,
  ): Promise<DecompositionResult> {
    const cfg: DecompositionConfig = { ...DEFAULT_DECOMPOSITION_CONFIG, ...config };
    const startTime = performance.now();

    const count = baseFrame.count;

    // ── Step 1: Collect temporal snapshots ─────────────────────────────────
    this.onProgress?.('collecting_frames', 0);

    const timestamps = temporalProvider.getTimestamps();
    const framesToAnalyze = Math.min(cfg.lookaheadFrames, timestamps.length);

    const snapshots: TemporalSnapshot[] = [];

    // Add base frame as first snapshot
    snapshots.push({
      timestamp: timestamps[0] ?? 0,
      positions: baseFrame.positions,
      opacities: baseFrame.opacities,
      count,
    });

    // Collect additional temporal frames
    for (let f = 1; f < framesToAnalyze; f++) {
      const t = timestamps[f];
      if (t === undefined) break;

      const frameData = await temporalProvider.getFeaturesAtTime(t);
      snapshots.push({
        timestamp: t,
        positions: frameData.positions,
        opacities: frameData.opacities,
        count: Math.min(frameData.count, count), // Match count with base frame
      });

      this.onProgress?.('collecting_frames', f / framesToAnalyze);
    }

    // ── Step 2: Compute per-Gaussian motion statistics ────────────────────
    this.onProgress?.('motion_analysis', 0);

    const descriptors: GaussianMotionDescriptor[] = [];

    for (let i = 0; i < count; i++) {
      const descriptor = this.analyzeGaussianMotion(i, snapshots, cfg);
      descriptors.push(descriptor);

      if (i % 5000 === 0) {
        this.onProgress?.('motion_analysis', i / count);
      }
    }

    this.onProgress?.('motion_analysis', 1);

    // ── Step 3: Apply spatial coherence smoothing ─────────────────────────
    this.onProgress?.('spatial_coherence', 0);

    if (cfg.spatialCoherenceRadius > 0) {
      this.applySpatialCoherence(descriptors, baseFrame.positions, cfg);
    }

    this.onProgress?.('spatial_coherence', 1);

    // ── Step 4: Compute lookahead predictions ─────────────────────────────
    this.onProgress?.('lookahead_prediction', 0);

    if (snapshots.length >= 2) {
      this.computeLookaheadPredictions(descriptors, snapshots, cfg);
    }

    this.onProgress?.('lookahead_prediction', 1);

    // ── Step 5: Build index arrays ────────────────────────────────────────
    const staticList: number[] = [];
    const quasiStaticList: number[] = [];
    const rigidDynamicList: number[] = [];
    const deformDynamicList: number[] = [];
    const transientList: number[] = [];

    for (const desc of descriptors) {
      switch (desc.motionClass) {
        case 'static':
          staticList.push(desc.gaussianIndex);
          break;
        case 'quasi_static':
          quasiStaticList.push(desc.gaussianIndex);
          break;
        case 'dynamic_rigid':
          rigidDynamicList.push(desc.gaussianIndex);
          break;
        case 'dynamic_deform':
          deformDynamicList.push(desc.gaussianIndex);
          break;
        case 'transient':
          transientList.push(desc.gaussianIndex);
          break;
      }
    }

    // Compute average confidence
    let totalConfidence = 0;
    for (const desc of descriptors) {
      totalConfidence += desc.confidence;
    }

    const stats: DecompositionStats = {
      staticCount: staticList.length,
      quasiStaticCount: quasiStaticList.length,
      rigidDynamicCount: rigidDynamicList.length,
      deformDynamicCount: deformDynamicList.length,
      transientCount: transientList.length,
      averageConfidence: count > 0 ? totalConfidence / count : 0,
      decompositionTimeMs: performance.now() - startTime,
      framesAnalyzed: snapshots.length,
    };

    return {
      descriptors,
      staticIndices: new Uint32Array(staticList),
      quasiStaticIndices: new Uint32Array(quasiStaticList),
      rigidDynamicIndices: new Uint32Array(rigidDynamicList),
      deformDynamicIndices: new Uint32Array(deformDynamicList),
      transientIndices: new Uint32Array(transientList),
      totalGaussians: count,
      stats,
    };
  }

  /**
   * Simplified decomposition when no temporal data is available.
   * Uses density gradient analysis to identify likely-dynamic regions.
   */
  decomposeFromGradients(
    features: NeRFFeatureExtractionResult,
    config?: Partial<DecompositionConfig>,
  ): DecompositionResult {
    const cfg: DecompositionConfig = { ...DEFAULT_DECOMPOSITION_CONFIG, ...config };
    const startTime = performance.now();
    const count = features.count;

    const descriptors: GaussianMotionDescriptor[] = [];
    const staticList: number[] = [];
    const quasiStaticList: number[] = [];

    for (let i = 0; i < count; i++) {
      // Without temporal data, classify based on density stability:
      // - High density + stable gradient = likely static
      // - Low density + high gradient variance = potentially dynamic
      const density = features.densities[i];
      const opacity = features.opacities[i];

      let gradientMag = 0;
      if (features.densityGradients) {
        const gx = features.densityGradients[i * 3];
        const gy = features.densityGradients[i * 3 + 1];
        const gz = features.densityGradients[i * 3 + 2];
        gradientMag = Math.sqrt(gx * gx + gy * gy + gz * gz);
      }

      // Heuristic: high-density, high-opacity, strong-gradient = static surface
      const surfaceLikelihood = density * opacity * Math.min(1, gradientMag * 10);

      const motionClass: MotionClass = surfaceLikelihood > 0.5 ? 'static' : 'quasi_static';
      const confidence = Math.min(1.0, surfaceLikelihood + 0.3);

      const descriptor: GaussianMotionDescriptor = {
        gaussianIndex: i,
        motionClass,
        motionMagnitude: 0,
        motionDirection: [0, 0, 0],
        confidence,
        framesAnalyzed: 1,
        temporalConsistency: 1.0,
      };

      descriptors.push(descriptor);

      if (motionClass === 'static') {
        staticList.push(i);
      } else {
        quasiStaticList.push(i);
      }
    }

    const stats: DecompositionStats = {
      staticCount: staticList.length,
      quasiStaticCount: quasiStaticList.length,
      rigidDynamicCount: 0,
      deformDynamicCount: 0,
      transientCount: 0,
      averageConfidence: descriptors.reduce((s, d) => s + d.confidence, 0) / count,
      decompositionTimeMs: performance.now() - startTime,
      framesAnalyzed: 1,
    };

    return {
      descriptors,
      staticIndices: new Uint32Array(staticList),
      quasiStaticIndices: new Uint32Array(quasiStaticList),
      rigidDynamicIndices: new Uint32Array(0),
      deformDynamicIndices: new Uint32Array(0),
      transientIndices: new Uint32Array(0),
      totalGaussians: count,
      stats,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Analyze motion of a single Gaussian across temporal frames.
   */
  private analyzeGaussianMotion(
    gaussianIndex: number,
    snapshots: TemporalSnapshot[],
    config: DecompositionConfig,
  ): GaussianMotionDescriptor {
    const numFrames = snapshots.length;

    if (numFrames < 2) {
      return {
        gaussianIndex,
        motionClass: 'static',
        motionMagnitude: 0,
        motionDirection: [0, 0, 0],
        confidence: 0.5,
        framesAnalyzed: numFrames,
        temporalConsistency: 1.0,
      };
    }

    // Collect positions across frames
    const positions: [number, number, number][] = [];
    const frameOpacities: number[] = [];

    for (const snap of snapshots) {
      if (gaussianIndex < snap.count) {
        positions.push([
          snap.positions[gaussianIndex * 3],
          snap.positions[gaussianIndex * 3 + 1],
          snap.positions[gaussianIndex * 3 + 2],
        ]);
        frameOpacities.push(snap.opacities[gaussianIndex]);
      }
    }

    if (positions.length < 2) {
      return {
        gaussianIndex,
        motionClass: 'transient',
        motionMagnitude: 0,
        motionDirection: [0, 0, 0],
        confidence: 0.7,
        framesAnalyzed: positions.length,
        temporalConsistency: 0,
      };
    }

    // Compute displacement vectors between consecutive frames
    const displacements: [number, number, number][] = [];
    for (let f = 1; f < positions.length; f++) {
      displacements.push([
        positions[f][0] - positions[f - 1][0],
        positions[f][1] - positions[f - 1][1],
        positions[f][2] - positions[f - 1][2],
      ]);
    }

    // Motion magnitude: average displacement per second
    const dt = config.temporalWindowSec / numFrames;
    let totalMagnitude = 0;
    for (const d of displacements) {
      totalMagnitude += Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
    }
    const avgMagnitude = totalMagnitude / displacements.length;
    const motionPerSec = avgMagnitude / dt;

    // Motion direction: average displacement direction
    let avgDx = 0, avgDy = 0, avgDz = 0;
    for (const d of displacements) {
      avgDx += d[0]; avgDy += d[1]; avgDz += d[2];
    }
    const dirMag = Math.sqrt(avgDx * avgDx + avgDy * avgDy + avgDz * avgDz);
    const motionDirection: [number, number, number] = dirMag > 0.0001
      ? [avgDx / dirMag, avgDy / dirMag, avgDz / dirMag]
      : [0, 0, 0];

    // Opacity variance (for transient detection)
    const opacityMean = frameOpacities.reduce((s, o) => s + o, 0) / frameOpacities.length;
    let opacityVar = 0;
    for (const o of frameOpacities) {
      opacityVar += (o - opacityMean) * (o - opacityMean);
    }
    opacityVar /= frameOpacities.length;

    // Temporal consistency: variance of displacement magnitudes
    let dispVariance = 0;
    const magnitudes = displacements.map(d => Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]));
    const meanMag = magnitudes.reduce((s, m) => s + m, 0) / magnitudes.length;
    for (const m of magnitudes) {
      dispVariance += (m - meanMag) * (m - meanMag);
    }
    dispVariance /= magnitudes.length;
    const temporalConsistency = 1.0 / (1.0 + dispVariance * 100);

    // ── Classification decision tree ──────────────────────────────────────
    let motionClass: MotionClass;
    let confidence: number;

    if (opacityVar > config.transientOpacityThreshold) {
      // High opacity variance = transient (appears/disappears)
      motionClass = 'transient';
      confidence = Math.min(1, opacityVar / config.transientOpacityThreshold);
    } else if (motionPerSec < config.staticThreshold) {
      // Very low motion = static
      motionClass = 'static';
      confidence = 1.0 - motionPerSec / config.staticThreshold;
    } else if (motionPerSec < config.quasiStaticThreshold) {
      // Low motion = quasi-static (swaying vegetation, etc.)
      motionClass = 'quasi_static';
      const range = config.quasiStaticThreshold - config.staticThreshold;
      confidence = 1.0 - (motionPerSec - config.staticThreshold) / range;
    } else {
      // Significant motion: test for rigid vs deformable
      const rigidResidual = this.computeRigidResidual(positions);

      if (rigidResidual < config.rigidResidualThreshold) {
        motionClass = 'dynamic_rigid';
        confidence = 1.0 - rigidResidual / config.rigidResidualThreshold;
      } else {
        motionClass = 'dynamic_deform';
        confidence = Math.min(1.0, rigidResidual / config.rigidResidualThreshold);
      }
    }

    // Apply minimum confidence filter
    if (confidence < config.minConfidence && motionClass !== 'static') {
      motionClass = 'dynamic_deform'; // Default fallback
      confidence = config.minConfidence;
    }

    return {
      gaussianIndex,
      motionClass,
      motionMagnitude: motionPerSec,
      motionDirection,
      confidence,
      framesAnalyzed: numFrames,
      temporalConsistency,
    };
  }

  /**
   * Compute residual error after fitting a rigid transform (simplified).
   * Low residual = motion is well-explained by rigid SE3 transform.
   * High residual = motion is deformable/non-rigid.
   */
  private computeRigidResidual(positions: [number, number, number][]): number {
    if (positions.length < 3) return 1.0;

    // Simplified rigid residual: compute variance of pairwise distances.
    // For rigid motion, pairwise distances are preserved.
    // We use first vs last position as the test pair.
    const first = positions[0];
    const last = positions[positions.length - 1];

    // Compute mean displacement
    const dx = last[0] - first[0];
    const dy = last[1] - first[1];
    const dz = last[2] - first[2];

    // Check how well intermediate positions follow the same translation
    let totalResidual = 0;
    for (let i = 1; i < positions.length - 1; i++) {
      const t = i / (positions.length - 1);
      const expectedX = first[0] + dx * t;
      const expectedY = first[1] + dy * t;
      const expectedZ = first[2] + dz * t;

      const rx = positions[i][0] - expectedX;
      const ry = positions[i][1] - expectedY;
      const rz = positions[i][2] - expectedZ;

      totalResidual += Math.sqrt(rx * rx + ry * ry + rz * rz);
    }

    return totalResidual / Math.max(1, positions.length - 2);
  }

  /**
   * Apply spatial coherence: nearby Gaussians should have similar classifications.
   * Uses majority voting within a spatial neighborhood.
   */
  private applySpatialCoherence(
    descriptors: GaussianMotionDescriptor[],
    positions: Float32Array,
    config: DecompositionConfig,
  ): void {
    const count = descriptors.length;
    const radius = config.spatialCoherenceRadius;
    const radiusSq = radius * radius;

    // Build a simplified spatial hash for neighbor lookup
    const cellSize = radius * 2;
    const invCellSize = 1.0 / cellSize;
    const cells = new Map<string, number[]>();

    for (let i = 0; i < count; i++) {
      const cx = Math.floor(positions[i * 3] * invCellSize);
      const cy = Math.floor(positions[i * 3 + 1] * invCellSize);
      const cz = Math.floor(positions[i * 3 + 2] * invCellSize);
      const key = `${cx},${cy},${cz}`;
      let cell = cells.get(key);
      if (!cell) {
        cell = [];
        cells.set(key, cell);
      }
      cell.push(i);
    }

    // For each Gaussian, check neighborhood consensus
    const newClasses: MotionClass[] = new Array(count);
    for (let i = 0; i < count; i++) {
      newClasses[i] = descriptors[i].motionClass;
    }

    for (let i = 0; i < count; i++) {
      const px = positions[i * 3];
      const py = positions[i * 3 + 1];
      const pz = positions[i * 3 + 2];

      const cx = Math.floor(px * invCellSize);
      const cy = Math.floor(py * invCellSize);
      const cz = Math.floor(pz * invCellSize);

      // Check 3x3x3 neighbor cells
      const votes: Record<MotionClass, number> = {
        static: 0,
        quasi_static: 0,
        dynamic_rigid: 0,
        dynamic_deform: 0,
        transient: 0,
      };

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const key = `${cx + dx},${cy + dy},${cz + dz}`;
            const neighbors = cells.get(key);
            if (!neighbors) continue;

            for (const j of neighbors) {
              if (j === i) continue;
              const dist2 =
                (positions[j * 3] - px) ** 2 +
                (positions[j * 3 + 1] - py) ** 2 +
                (positions[j * 3 + 2] - pz) ** 2;
              if (dist2 < radiusSq) {
                votes[descriptors[j].motionClass] += descriptors[j].confidence;
              }
            }
          }
        }
      }

      // If neighborhood strongly disagrees, override low-confidence classifications
      const selfVote = descriptors[i].confidence;
      votes[descriptors[i].motionClass] += selfVote * 2; // Self-weight 2x

      let maxVote = 0;
      let bestClass = descriptors[i].motionClass;
      for (const [cls, vote] of Object.entries(votes)) {
        if (vote > maxVote) {
          maxVote = vote;
          bestClass = cls as MotionClass;
        }
      }

      if (bestClass !== descriptors[i].motionClass && descriptors[i].confidence < 0.8) {
        newClasses[i] = bestClass;
      }
    }

    // Apply smoothed classifications
    for (let i = 0; i < count; i++) {
      descriptors[i].motionClass = newClasses[i];
    }
  }

  /**
   * Compute lookahead position predictions for dynamic Gaussians.
   * Uses linear extrapolation from the last few frames.
   */
  private computeLookaheadPredictions(
    descriptors: GaussianMotionDescriptor[],
    snapshots: TemporalSnapshot[],
    _config: DecompositionConfig,
  ): void {
    const lastSnap = snapshots[snapshots.length - 1];
    const prevSnap = snapshots[snapshots.length - 2];

    if (!lastSnap || !prevSnap) return;

    const dt = lastSnap.timestamp - prevSnap.timestamp;
    if (dt <= 0) return;

    for (const desc of descriptors) {
      if (desc.motionClass === 'static') continue;

      const i = desc.gaussianIndex;
      if (i >= lastSnap.count || i >= prevSnap.count) continue;

      // Linear extrapolation
      const vx = (lastSnap.positions[i * 3] - prevSnap.positions[i * 3]) / dt;
      const vy = (lastSnap.positions[i * 3 + 1] - prevSnap.positions[i * 3 + 1]) / dt;
      const vz = (lastSnap.positions[i * 3 + 2] - prevSnap.positions[i * 3 + 2]) / dt;

      desc.predictedPosition = [
        lastSnap.positions[i * 3] + vx * dt,
        lastSnap.positions[i * 3 + 1] + vy * dt,
        lastSnap.positions[i * 3 + 2] + vz * dt,
      ];
    }
  }
}
