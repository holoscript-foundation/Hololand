/**
 * NeRFToGSCaptureFlow
 *
 * Orchestrator for the complete NeRF-to-Gaussian Splatting capture pipeline.
 * Ties together all components:
 *
 * 1. NeRF Feature Extraction -> Gaussian initialization from density field
 * 2. Static/Dynamic Decomposition -> Lookahead temporal classification
 * 3. Hybrid NeRF-GS Representation -> V2NeRF-style adaptive rendering mode
 * 4. V3C MIV Fallback Encoding -> Legacy decoder compatibility
 *
 * The pipeline is modular: each stage can be enabled/disabled independently.
 * Stages communicate through the NeRFFeatureExtractionResult data structure
 * which carries Gaussian positions, colors, scales, rotations, opacities,
 * and density information through the pipeline.
 *
 * @module volumetric-bridge/nerf-to-gs
 */

import type {
  NeRFToGSCaptureConfig,
  NeRFToGSCaptureResult,
  CaptureFlowStage,
  CaptureFlowProgress,
  CaptureFlowEventHandler,
  CaptureFlowPipelineStats,
  NeRFFeatureExtractionResult,
  DecompositionResult,
  HybridRepresentationResult,
  V3CMIVFallbackResult,
} from './types';

import { NeRFFeatureExtractor, type INeRFDensityQuery } from './NeRFFeatureExtractor';
import { StaticDynamicDecomposer } from './StaticDynamicDecomposer';
import { HybridNeRFGSRepresentation } from './HybridNeRFGSRepresentation';
import { V3CMIVFallbackEncoder } from './V3CMIVFallbackEncoder';

// =============================================================================
// BYTES PER GAUSSIAN (for memory estimation)
// =============================================================================

const BYTES_PER_GAUSSIAN = 60; // 15 floats * 4 bytes

// =============================================================================
// CAPTURE FLOW ORCHESTRATOR
// =============================================================================

/**
 * Orchestrates the complete NeRF-to-GS capture flow pipeline.
 *
 * Usage:
 * ```typescript
 * import { NeRFToGSCaptureFlow, BakedDensityGridQuery } from './nerf-to-gs';
 *
 * const query = new BakedDensityGridQuery(densityGrid, 128, bounds, colorGrid);
 * const flow = new NeRFToGSCaptureFlow(query);
 *
 * // Subscribe to progress events
 * flow.on((progress) => {
 *   console.log(`[${progress.stage}] ${progress.message} (${(progress.overallProgress * 100).toFixed(1)}%)`);
 * });
 *
 * // Run the pipeline
 * const result = await flow.run({
 *   nerfExtraction: {
 *     format: 'instant_ngp',
 *     checkpointUrl: 'model.ingp',
 *     sceneBounds: [-2, -2, -2, 2, 2, 2],
 *     densityThreshold: 0.5,
 *     gridResolution: 128,
 *     maxGaussians: 500000,
 *     refinementPasses: 2,
 *     shDegree: 0,
 *     estimateNormals: true,
 *     covarianceScale: 1.0,
 *   },
 *   enableDynamicDecomposition: false,
 *   enableHybridRepresentation: true,
 *   enableMIVFallback: false,
 * });
 *
 * // result.gaussianData - ready for GaussianSplatLoader
 * // result.hybridRepresentation - rendering mode per region
 * ```
 */
export class NeRFToGSCaptureFlow {
  private nerfQuery: INeRFDensityQuery;
  private handlers: CaptureFlowEventHandler[] = [];
  private currentStage: CaptureFlowStage = 'idle';
  private stageTimings: Record<string, number> = {};

  constructor(nerfQuery: INeRFDensityQuery) {
    this.nerfQuery = nerfQuery;
  }

  /**
   * Subscribe to pipeline progress events.
   * @returns Unsubscribe function
   */
  on(handler: CaptureFlowEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  /**
   * Run the complete capture flow pipeline.
   */
  async run(config: NeRFToGSCaptureConfig): Promise<NeRFToGSCaptureResult> {
    const totalStartTime = performance.now();
    this.stageTimings = {};

    try {
      // ── Stage 1: NeRF Feature Extraction ──────────────────────────────
      this.emitProgress('feature_extraction', 0, 'Extracting features from NeRF model...');

      const extractor = new NeRFFeatureExtractor(
        this.nerfQuery,
        (substage, progress) => {
          this.emitProgress(
            'feature_extraction',
            progress * 0.3, // Feature extraction = 0-30% of pipeline
            `NeRF extraction: ${substage}`,
          );
        },
      );

      const extractionStart = performance.now();
      const gaussianData = await extractor.extract(config.nerfExtraction);
      this.stageTimings['feature_extraction'] = performance.now() - extractionStart;

      this.emitProgress(
        'gaussian_initialization',
        0.3,
        `Initialized ${gaussianData.count.toLocaleString()} Gaussians from NeRF`,
      );
      this.stageTimings['gaussian_initialization'] = 0; // Included in extraction

      // ── Stage 2: Static/Dynamic Decomposition (optional) ──────────────
      let decomposition: DecompositionResult | undefined;

      if (config.enableDynamicDecomposition && config.temporalFrameProvider) {
        this.emitProgress('decomposition', 0.35, 'Analyzing temporal motion...');

        const decomposer = new StaticDynamicDecomposer(
          (substage, progress) => {
            this.emitProgress(
              'decomposition',
              0.35 + progress * 0.15, // Decomposition = 35-50%
              `Decomposition: ${substage}`,
            );
          },
        );

        const decompStart = performance.now();
        decomposition = await decomposer.decompose(
          gaussianData,
          config.temporalFrameProvider,
          config.decomposition,
        );
        this.stageTimings['decomposition'] = performance.now() - decompStart;

        this.emitProgress(
          'decomposition',
          0.5,
          `Decomposition complete: ${decomposition.stats.staticCount} static, ` +
          `${decomposition.stats.rigidDynamicCount + decomposition.stats.deformDynamicCount} dynamic`,
        );
      } else if (config.enableDynamicDecomposition) {
        // No temporal provider: use gradient-based heuristic
        this.emitProgress('decomposition', 0.35, 'Estimating motion from gradients...');

        const decomposer = new StaticDynamicDecomposer();
        const decompStart = performance.now();
        decomposition = decomposer.decomposeFromGradients(gaussianData, config.decomposition);
        this.stageTimings['decomposition'] = performance.now() - decompStart;

        this.emitProgress(
          'decomposition',
          0.5,
          `Gradient decomposition: ${decomposition.stats.staticCount} static, ` +
          `${decomposition.stats.quasiStaticCount} quasi-static`,
        );
      } else {
        this.stageTimings['decomposition'] = 0;
      }

      // ── Stage 3: Hybrid NeRF-GS Analysis (optional) ───────────────────
      let hybridRepresentation: HybridRepresentationResult | undefined;

      if (config.enableHybridRepresentation) {
        this.emitProgress('hybrid_analysis', 0.55, 'Analyzing hybrid rendering regions...');

        const hybrid = new HybridNeRFGSRepresentation(
          (substage, progress) => {
            this.emitProgress(
              'hybrid_analysis',
              0.55 + progress * 0.15, // Hybrid = 55-70%
              `Hybrid analysis: ${substage}`,
            );
          },
        );

        const hybridStart = performance.now();
        hybridRepresentation = hybrid.analyze(gaussianData, config.hybridRepresentation);
        this.stageTimings['hybrid_analysis'] = performance.now() - hybridStart;

        this.emitProgress(
          'hybrid_analysis',
          0.7,
          `Hybrid analysis: ${hybridRepresentation.stats.gsRegionCount} GS regions, ` +
          `${hybridRepresentation.stats.nerfRegionCount} NeRF regions, ` +
          `${(hybridRepresentation.volumetricFraction * 100).toFixed(1)}% volumetric`,
        );
      } else {
        this.stageTimings['hybrid_analysis'] = 0;
      }

      // ── Stage 4: V3C MIV Fallback Encoding (optional) ─────────────────
      let mivFallback: V3CMIVFallbackResult | undefined;

      if (config.enableMIVFallback && config.mivFallback) {
        this.emitProgress('miv_encoding', 0.75, 'Encoding V3C MIV fallback stream...');

        const encoder = new V3CMIVFallbackEncoder(
          (substage, progress) => {
            this.emitProgress(
              'miv_encoding',
              0.75 + progress * 0.2, // MIV = 75-95%
              `MIV encoding: ${substage}`,
            );
          },
        );

        const mivStart = performance.now();
        mivFallback = await encoder.encode(gaussianData, config.mivFallback);
        this.stageTimings['miv_encoding'] = performance.now() - mivStart;

        this.emitProgress(
          'miv_encoding',
          0.95,
          `MIV encoded: ${mivFallback.patches.length} patches across ` +
          `${mivFallback.v3cMetadata.atlasCount} atlas pages ` +
          `(${(mivFallback.stats.atlasUtilization * 100).toFixed(1)}% utilization)`,
        );
      } else {
        this.stageTimings['miv_encoding'] = 0;
      }

      // ── Stage 5: Finalization ─────────────────────────────────────────
      this.emitProgress('finalization', 0.95, 'Finalizing capture flow...');

      const totalTimeMs = performance.now() - totalStartTime;

      const pipelineStats: CaptureFlowPipelineStats = {
        totalTimeMs,
        stageTimings: this.stageTimings as Record<CaptureFlowStage, number>,
        gaussianCount: gaussianData.count,
        staticGaussianCount: decomposition?.stats.staticCount ?? gaussianData.count,
        dynamicGaussianCount: decomposition
          ? decomposition.stats.rigidDynamicCount +
            decomposition.stats.deformDynamicCount +
            decomposition.stats.transientCount
          : 0,
        volumetricRegionCount: hybridRepresentation?.stats.nerfRegionCount ?? 0,
        mivAtlasCount: mivFallback?.v3cMetadata.atlasCount ?? 0,
        estimatedMemoryMB: (gaussianData.count * BYTES_PER_GAUSSIAN) / (1024 * 1024),
      };

      this.emitProgress('complete', 1, `Capture flow complete in ${(totalTimeMs / 1000).toFixed(1)}s`);

      return {
        gaussianData,
        decomposition,
        hybridRepresentation,
        mivFallback,
        pipelineStats,
      };
    } catch (error) {
      this.emitProgress('error', 0, `Pipeline error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get current pipeline stage.
   */
  getCurrentStage(): CaptureFlowStage {
    return this.currentStage;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private emitProgress(
    stage: CaptureFlowStage,
    overallProgress: number,
    message: string,
  ): void {
    this.currentStage = stage;

    const event: CaptureFlowProgress = {
      stage,
      stageProgress: overallProgress, // Simplified: stage progress = overall in this prototype
      overallProgress: Math.max(0, Math.min(1, overallProgress)),
      message,
      timestamp: performance.now(),
    };

    for (const handler of this.handlers) {
      handler(event);
    }
  }
}
