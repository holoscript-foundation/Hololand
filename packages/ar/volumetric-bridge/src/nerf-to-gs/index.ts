/**
 * NeRF-to-GS Capture Flow Module
 *
 * Prototype pipeline for converting Neural Radiance Field (NeRF) models into
 * 3D Gaussian Splatting (3DGS) representations, with:
 *
 * - NeRF feature extraction for GS initialization (density/color -> positions/scales/rotations)
 * - Static/dynamic decomposition with lookahead temporal classification
 * - V2NeRF-style hybrid representation (GS for surfaces, volumetric NeRF for difficult regions)
 * - V3C MIV (MPEG Immersive Video) fallback path for legacy decoder compatibility
 *
 * Research references:
 *   - NeRF-GS (ICCV 2025): NeRF feature alignment for GS initialization
 *   - DeGauss (ICCV 2025): Dynamic-static decomposition with Gaussian splatting
 *   - DeSiRe-GS (CVPR 2025): 4D street Gaussians for static-dynamic decomposition
 *   - HybridNeRF (CVPR 2024): Adaptive volumetric surface rendering
 *   - ISO/IEC 23090-5 (V3C), ISO/IEC 23090-12 (MIV)
 *
 * @module volumetric-bridge/nerf-to-gs
 */

// ─── Types ──────────────────────────────────────────────────────────────────
export type {
  // NeRF Feature Extraction
  NeRFModelFormat,
  NeRFSample,
  NeRFFeatureExtractionConfig,
  NeRFFeatureExtractionResult,
  NeRFExtractionMetadata,

  // Static/Dynamic Decomposition
  MotionClass,
  GaussianMotionDescriptor,
  DecompositionConfig,
  DecompositionResult,
  DecompositionStats,

  // Hybrid Representation
  RegionRenderMode,
  HybridRegion,
  HybridRepresentationConfig,
  HybridRepresentationResult,
  HybridAnalysisStats,
  VolumetricTrigger,

  // V3C MIV Fallback
  V3CProfile,
  MIVAtlasConfig,
  V3CMIVFallbackConfig,
  V3CMIVFallbackResult,
  V3CBitstreamMetadata,
  MIVEncodingStats,
  MIVAtlasPatch,
  MIVSourceView,

  // Capture Flow Orchestrator
  CaptureFlowStage,
  CaptureFlowProgress,
  NeRFToGSCaptureConfig,
  NeRFToGSCaptureResult,
  CaptureFlowPipelineStats,
  CaptureFlowEventHandler,
  TemporalFrameProvider,
} from './types';

// ─── NeRF Feature Extraction ────────────────────────────────────────────────
export {
  NeRFFeatureExtractor,
  BakedDensityGridQuery,
  HttpNeRFQuery,
} from './NeRFFeatureExtractor';
export type { INeRFDensityQuery } from './NeRFFeatureExtractor';

// ─── Static/Dynamic Decomposition ──────────────────────────────────────────
export { StaticDynamicDecomposer } from './StaticDynamicDecomposer';

// ─── Hybrid NeRF-GS Representation ────────────────────────────────────────
export { HybridNeRFGSRepresentation } from './HybridNeRFGSRepresentation';

// ─── V3C MIV Fallback Encoder ──────────────────────────────────────────────
export {
  V3CMIVFallbackEncoder,
  generateOrbitalViews,
} from './V3CMIVFallbackEncoder';

// ─── Capture Flow Orchestrator ─────────────────────────────────────────────
export { NeRFToGSCaptureFlow } from './NeRFToGSCaptureFlow';
