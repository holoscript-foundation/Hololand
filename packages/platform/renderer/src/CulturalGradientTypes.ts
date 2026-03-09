/**
 * CulturalGradientTypes
 *
 * Type definitions for procedural cultural gradient generation in HoloLand
 * VR worlds. Cultural parameters vary spatially using noise functions to
 * create natural cultural regions with soft boundaries.
 *
 * BIOLOGICAL INSPIRATION:
 * In the real world, cultural traits do not change abruptly at borders.
 * Instead, they vary continuously across space with gradual transitions.
 * Mountain ranges, rivers, and distance create natural cultural gradients
 * where cooperation norms, social strictness, and openness to outsiders
 * shift smoothly. Villages in the same valley share more cultural traits
 * than villages separated by a mountain pass.
 *
 * PROCEDURAL GENERATION:
 * This system uses layered coherent noise functions (simplex noise) to
 * generate spatially continuous cultural parameter fields. Each cultural
 * dimension (cooperation, norm strictness, punishment severity, openness)
 * is driven by its own noise octave with configurable frequency, amplitude,
 * and seed. The result is a smooth, deterministic cultural landscape where:
 *
 * - Nearby positions share similar cultural values (spatial coherence)
 * - Distinct cultural "regions" emerge naturally from noise peaks/valleys
 * - Boundaries between regions are soft gradients, not hard walls
 * - The landscape is fully deterministic from its seed (reproducible)
 *
 * INTEGRATION:
 * - CulturalTrace: Trace deposit intensity and decay rates are modulated
 *   by the local cultural parameters. In regions with high cooperation,
 *   traces reinforced by multiple agents gain extra intensity. In regions
 *   with strict norms, non-conforming traces decay faster.
 *
 * - CulturalZone: Zone boundaries are informed by cultural gradient
 *   contours. The system detects natural cultural region boundaries
 *   by finding gradient magnitude peaks (where parameters change fastest)
 *   and can auto-generate zone boundaries at those locations.
 *
 * PERFORMANCE:
 *   Noise evaluation:      < 0.001ms per sample (pure math, no allocations)
 *   Full parameter sample:  < 0.005ms (4 noise evaluations per position)
 *   Region detection:       1-5ms for 100x100 grid (off render loop)
 *   Gradient magnitude:     < 0.01ms per sample (finite differences)
 *
 * @module CulturalGradientTypes
 */

import type { Vec3 } from './AgentStateBuffer';

// =============================================================================
// CULTURAL PARAMETERS
// =============================================================================

/**
 * The four fundamental cultural dimensions that vary spatially.
 *
 * These are inspired by cross-cultural psychology (Hofstede, Henrich)
 * and cultural evolution theory (Boyd & Richerson):
 *
 * - cooperationTendency: How much agents in this region cooperate vs.
 *   compete. High values (0.8-1.0) produce commons-sharing, trace-reinforcing
 *   cultures. Low values (0.0-0.2) produce competitive, trace-overwriting
 *   cultures.
 *
 * - normStrictness: How rigidly local norms are enforced. High values
 *   (0.8-1.0) produce "tight" cultures where deviation from expected
 *   behavior is penalized via trust scoring. Low values (0.0-0.2)
 *   produce "loose" cultures with high tolerance for behavioral variation.
 *
 * - punishmentSeverity: How harshly norm violations are sanctioned.
 *   High values (0.8-1.0) produce rapid trust degradation and zone
 *   expulsion for violators. Low values (0.0-0.2) produce gentle
 *   corrections and second chances.
 *
 * - opennessToOutsiders: How welcoming the local culture is to agents
 *   from other cultural regions. High values (0.8-1.0) lower zone entry
 *   barriers and increase cross-zone interaction bandwidth. Low values
 *   (0.0-0.2) increase trust requirements for entry and reduce
 *   interaction bandwidth with outsiders.
 */
export interface CulturalParameters {
  /** Cooperation tendency (0-1). Higher = more cooperative. */
  cooperationTendency: number;
  /** Norm strictness (0-1). Higher = stricter enforcement. */
  normStrictness: number;
  /** Punishment severity (0-1). Higher = harsher sanctions. */
  punishmentSeverity: number;
  /** Openness to outsiders (0-1). Higher = more welcoming. */
  opennessToOutsiders: number;
}

/**
 * Names of the four cultural parameter dimensions.
 */
export type CulturalParameterName = keyof CulturalParameters;

/**
 * All cultural parameter names as an array for iteration.
 */
export const CULTURAL_PARAMETER_NAMES: CulturalParameterName[] = [
  'cooperationTendency',
  'normStrictness',
  'punishmentSeverity',
  'opennessToOutsiders',
];

// =============================================================================
// NOISE CONFIGURATION
// =============================================================================

/**
 * Configuration for a single noise layer driving one cultural parameter.
 *
 * Each parameter can use multiple octaves (fractal noise) for natural-looking
 * variation at different spatial scales:
 * - Large-scale (low frequency) noise creates the broad regional structure
 * - Small-scale (high frequency) noise adds local variation
 */
export interface NoiseLayerConfig {
  /** Spatial frequency (higher = more rapid variation). Default: 0.01 */
  frequency: number;
  /** Amplitude of this layer's contribution (0-1). Default: 1.0 */
  amplitude: number;
  /** Number of fractal octaves. Default: 3 */
  octaves: number;
  /** Frequency multiplier per octave (lacunarity). Default: 2.0 */
  lacunarity: number;
  /** Amplitude multiplier per octave (persistence/gain). Default: 0.5 */
  persistence: number;
  /** Random seed offset for this parameter (added to global seed). Default: 0 */
  seedOffset: number;
}

/**
 * Per-parameter noise configuration with optional bias and clamping.
 */
export interface ParameterNoiseConfig {
  /** Noise layer configuration */
  noise: NoiseLayerConfig;
  /** Bias added after noise evaluation (shifts the mean). Default: 0.5 */
  bias: number;
  /** Output minimum clamp. Default: 0.0 */
  min: number;
  /** Output maximum clamp. Default: 1.0 */
  max: number;
}

// =============================================================================
// GRADIENT CONFIGURATION
// =============================================================================

/**
 * Top-level configuration for the ProceduralCulturalGradient system.
 */
export interface CulturalGradientConfig {
  /** Global random seed (determines the entire cultural landscape). */
  seed: number;

  /** World identifier (for logging and integration). */
  worldId: string;

  /**
   * Per-parameter noise configuration.
   * If a parameter is not specified, defaults are used.
   */
  parameters: {
    cooperationTendency?: Partial<ParameterNoiseConfig>;
    normStrictness?: Partial<ParameterNoiseConfig>;
    punishmentSeverity?: Partial<ParameterNoiseConfig>;
    opennessToOutsiders?: Partial<ParameterNoiseConfig>;
  };

  /**
   * Whether to use 2D noise (x,z only) or 3D noise (x,y,z).
   * 2D is typical for ground-plane worlds; 3D for volumetric.
   * Default: '2d'
   */
  dimensionality: '2d' | '3d';

  /**
   * Resolution of the precomputed gradient grid (cells per axis).
   * Used for region detection and boundary finding.
   * Default: 100
   */
  gridResolution: number;

  /**
   * World-space bounds for the gradient field.
   * Default: { min: { x: -100, y: -10, z: -100 }, max: { x: 100, y: 50, z: 100 } }
   */
  worldBounds: {
    min: Vec3;
    max: Vec3;
  };

  /**
   * Gradient magnitude threshold for detecting cultural region boundaries.
   * Positions where the gradient magnitude exceeds this value are considered
   * boundary candidates. Default: 0.15
   */
  boundaryGradientThreshold: number;

  /**
   * Minimum region area (in grid cells) to be considered a distinct cultural region.
   * Prevents noise artifacts from creating tiny spurious regions. Default: 25
   */
  minRegionSize: number;

  /**
   * Width of the soft boundary blending zone (in world units).
   * Cultural parameters transition smoothly over this distance at boundaries.
   * Default: 5.0
   */
  boundaryBlendWidth: number;

  /**
   * Update frequency for region detection (Hz, off render loop).
   * Region boundaries don't change unless the seed or config changes,
   * so this is typically very low. Default: 0.1 (every 10 seconds)
   */
  regionDetectionHz: number;
}

// =============================================================================
// CULTURAL REGIONS
// =============================================================================

/**
 * A detected cultural region -- a contiguous area with similar cultural
 * parameters, bounded by gradient magnitude peaks.
 */
export interface CulturalRegion {
  /** Unique region identifier */
  id: string;
  /** Centroid position (weighted average of member cells) */
  centroid: Vec3;
  /** Approximate bounding radius in world units */
  radius: number;
  /** Number of grid cells in this region */
  cellCount: number;
  /** Representative cultural parameters (sampled at centroid) */
  parameters: CulturalParameters;
  /** Average cultural parameters across the region */
  averageParameters: CulturalParameters;
  /** Cultural "character" label derived from dominant parameters */
  characterLabel: string;
  /** Grid cell indices belonging to this region */
  cellIndices: number[];
  /** Adjacent region IDs */
  neighborRegionIds: string[];
  /** Boundary contour positions (world-space polyline segments) */
  boundaryPositions: Vec3[];
}

/**
 * A boundary between two cultural regions -- a gradient ridge where
 * cultural parameters change most rapidly.
 */
export interface CulturalRegionBoundary {
  /** Regions on either side */
  regionAId: string;
  regionBId: string;
  /** World-space positions along the boundary */
  positions: Vec3[];
  /** Average gradient magnitude along the boundary */
  averageGradientMagnitude: number;
  /** Cultural parameter difference across the boundary (delta per param) */
  parameterDelta: CulturalParameters;
  /** Soft boundary blend factor (0 at boundary center, 1 at edges) */
  blendWidth: number;
}

// =============================================================================
// SAMPLED OUTPUT
// =============================================================================

/**
 * A fully resolved cultural sample at a world-space position.
 *
 * This is what consumers receive when querying the cultural gradient
 * at a specific location. It includes the raw parameters, the gradient
 * magnitude (how fast parameters are changing), the nearest region,
 * and optional blend information for positions near region boundaries.
 */
export interface CulturalSample {
  /** World-space position this sample was taken at */
  position: Vec3;
  /** Cultural parameters at this position */
  parameters: CulturalParameters;
  /** Gradient magnitude (rate of change, 0 = uniform, high = boundary) */
  gradientMagnitude: number;
  /** Gradient direction (points toward increasing parameters) */
  gradientDirection: Vec3;
  /** ID of the primary cultural region this position belongs to */
  regionId: string | null;
  /** If near a boundary: blend factor (0 = fully in primary region, 1 = fully in neighbor) */
  boundaryBlendFactor: number;
  /** If near a boundary: the neighboring region ID */
  neighborRegionId: string | null;
  /** If near a boundary: blended parameters (weighted mix of both regions) */
  blendedParameters: CulturalParameters | null;
}

// =============================================================================
// STIGMERGIC INTEGRATION
// =============================================================================

/**
 * Modifiers that the cultural gradient applies to stigmergic trace behavior.
 *
 * These modifiers are computed from the local CulturalParameters and used
 * by the StigmergicTraceEngine to adjust trace dynamics:
 *
 * - intensityMultiplier: Scales deposit intensity based on cooperation.
 *   High cooperation = traces from multiple agents reinforce more strongly.
 *
 * - decayMultiplier: Scales decay rate based on norm strictness.
 *   Strict norms = non-conforming traces (wrong category) decay faster.
 *
 * - diffusionMultiplier: Scales diffusion based on openness.
 *   Open cultures = traces spread more widely (ideas flow freely).
 *
 * - reinforcementMultiplier: Scales reinforcement based on cooperation.
 *   Cooperative cultures = reinforcement boost is amplified.
 */
export interface StigmergicModifiers {
  /** Multiplier for trace deposit intensity (0.5 - 2.0) */
  intensityMultiplier: number;
  /** Multiplier for trace decay rate (0.5 - 2.0) */
  decayMultiplier: number;
  /** Multiplier for trace diffusion rate (0.5 - 2.0) */
  diffusionMultiplier: number;
  /** Multiplier for reinforcement boost (0.5 - 2.0) */
  reinforcementMultiplier: number;
}

// =============================================================================
// ZONE INTEGRATION
// =============================================================================

/**
 * Modifiers that the cultural gradient applies to zone boundary behavior.
 *
 * - trustModifier: Adjusts minimum trust score for zone entry based on
 *   local openness. Open cultures lower the trust requirement.
 *
 * - bandwidthModifier: Adjusts interaction bandwidth at zone boundaries
 *   based on local openness. Open cultures increase bandwidth.
 *
 * - permeabilityModifier: Adjusts boundary permeability based on
 *   local openness. Open cultures make boundaries more permeable.
 */
export interface ZoneBoundaryModifiers {
  /** Additive modifier to minimum trust score (-0.3 to +0.3) */
  trustModifier: number;
  /** Multiplicative modifier to interaction bandwidth (0.5 to 2.0) */
  bandwidthModifier: number;
  /** Multiplicative modifier to boundary permeability (0.5 to 2.0) */
  permeabilityModifier: number;
}

// =============================================================================
// EVENTS
// =============================================================================

/**
 * Events emitted by the ProceduralCulturalGradient system.
 */
export interface CulturalGradientEventMap {
  /** Fired when region detection completes */
  'gradient:regions-detected': {
    regions: CulturalRegion[];
    boundaries: CulturalRegionBoundary[];
    detectionTimeMs: number;
  };
  /** Fired when the gradient configuration changes */
  'gradient:config-changed': {
    oldSeed: number;
    newSeed: number;
  };
  /** Fired on errors */
  'gradient:error': {
    message: string;
    code: string;
  };
}

export type CulturalGradientEventType = keyof CulturalGradientEventMap;
export type CulturalGradientEventHandler<T extends CulturalGradientEventType> = (
  event: CulturalGradientEventMap[T],
) => void;

// =============================================================================
// METRICS
// =============================================================================

/**
 * Runtime metrics for the cultural gradient system.
 */
export interface CulturalGradientMetrics {
  /** Whether region detection is running */
  isRunning: boolean;
  /** Global seed */
  seed: number;
  /** Number of detected regions */
  regionCount: number;
  /** Number of detected boundaries */
  boundaryCount: number;
  /** Average gradient magnitude across the world */
  averageGradientMagnitude: number;
  /** Total noise evaluations since startup */
  totalNoiseEvaluations: number;
  /** Average sample time (ms) */
  averageSampleTimeMs: number;
  /** Last region detection time (ms) */
  lastDetectionTimeMs: number;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create default noise layer config.
 */
export function createDefaultNoiseLayerConfig(
  overrides?: Partial<NoiseLayerConfig>,
): NoiseLayerConfig {
  return {
    frequency: overrides?.frequency ?? 0.01,
    amplitude: overrides?.amplitude ?? 1.0,
    octaves: overrides?.octaves ?? 3,
    lacunarity: overrides?.lacunarity ?? 2.0,
    persistence: overrides?.persistence ?? 0.5,
    seedOffset: overrides?.seedOffset ?? 0,
  };
}

/**
 * Create default parameter noise config.
 */
export function createDefaultParameterNoiseConfig(
  seedOffset: number,
  overrides?: Partial<ParameterNoiseConfig>,
): ParameterNoiseConfig {
  return {
    noise: createDefaultNoiseLayerConfig({
      seedOffset,
      ...overrides?.noise,
    }),
    bias: overrides?.bias ?? 0.5,
    min: overrides?.min ?? 0.0,
    max: overrides?.max ?? 1.0,
  };
}

/**
 * Create default CulturalGradientConfig.
 */
export function createDefaultCulturalGradientConfig(
  worldId: string,
  seed?: number,
  overrides?: Partial<CulturalGradientConfig>,
): CulturalGradientConfig {
  return {
    seed: seed ?? Math.floor(Math.random() * 2147483647),
    worldId,
    parameters: overrides?.parameters ?? {},
    dimensionality: overrides?.dimensionality ?? '2d',
    gridResolution: overrides?.gridResolution ?? 100,
    worldBounds: overrides?.worldBounds ?? {
      min: { x: -100, y: -10, z: -100 },
      max: { x: 100, y: 50, z: 100 },
    },
    boundaryGradientThreshold: overrides?.boundaryGradientThreshold ?? 0.15,
    minRegionSize: overrides?.minRegionSize ?? 25,
    boundaryBlendWidth: overrides?.boundaryBlendWidth ?? 5.0,
    regionDetectionHz: overrides?.regionDetectionHz ?? 0.1,
  };
}

/**
 * Create neutral cultural parameters (all 0.5).
 */
export function createNeutralCulturalParameters(): CulturalParameters {
  return {
    cooperationTendency: 0.5,
    normStrictness: 0.5,
    punishmentSeverity: 0.5,
    opennessToOutsiders: 0.5,
  };
}

/**
 * Compute stigmergic modifiers from cultural parameters.
 *
 * Maps the 0-1 cultural parameter range to modifier ranges:
 * - Cooperation (0-1) -> intensity/reinforcement multiplier (0.5-2.0)
 * - Norm strictness (0-1) -> decay multiplier for non-conforming traces (0.5-2.0)
 * - Openness (0-1) -> diffusion multiplier (0.5-2.0)
 */
export function computeStigmergicModifiers(params: CulturalParameters): StigmergicModifiers {
  return {
    intensityMultiplier: 0.5 + params.cooperationTendency * 1.5,
    decayMultiplier: 0.5 + params.normStrictness * 1.5,
    diffusionMultiplier: 0.5 + params.opennessToOutsiders * 1.5,
    reinforcementMultiplier: 0.5 + params.cooperationTendency * 1.5,
  };
}

/**
 * Compute zone boundary modifiers from cultural parameters.
 *
 * Maps openness and strictness to boundary behavior adjustments.
 */
export function computeZoneBoundaryModifiers(params: CulturalParameters): ZoneBoundaryModifiers {
  return {
    // High openness lowers trust requirements (-0.3), low openness raises them (+0.3)
    trustModifier: (0.5 - params.opennessToOutsiders) * 0.6,
    // High openness increases bandwidth, low openness reduces it
    bandwidthModifier: 0.5 + params.opennessToOutsiders * 1.5,
    // High openness increases permeability
    permeabilityModifier: 0.5 + params.opennessToOutsiders * 1.5,
  };
}

/**
 * Derive a character label from cultural parameters.
 *
 * Categorizes the cultural "personality" based on dominant traits.
 */
export function deriveCulturalCharacter(params: CulturalParameters): string {
  const traits: string[] = [];

  if (params.cooperationTendency > 0.7) traits.push('cooperative');
  else if (params.cooperationTendency < 0.3) traits.push('competitive');

  if (params.normStrictness > 0.7) traits.push('tight');
  else if (params.normStrictness < 0.3) traits.push('loose');

  if (params.punishmentSeverity > 0.7) traits.push('punitive');
  else if (params.punishmentSeverity < 0.3) traits.push('forgiving');

  if (params.opennessToOutsiders > 0.7) traits.push('open');
  else if (params.opennessToOutsiders < 0.3) traits.push('insular');

  if (traits.length === 0) return 'moderate';
  return traits.join('-');
}

/**
 * Linearly interpolate between two CulturalParameters.
 *
 * @param a - First parameter set
 * @param b - Second parameter set
 * @param t - Blend factor (0 = a, 1 = b)
 */
export function lerpCulturalParameters(
  a: CulturalParameters,
  b: CulturalParameters,
  t: number,
): CulturalParameters {
  const clampedT = Math.max(0, Math.min(1, t));
  const oneMinusT = 1 - clampedT;
  return {
    cooperationTendency: a.cooperationTendency * oneMinusT + b.cooperationTendency * clampedT,
    normStrictness: a.normStrictness * oneMinusT + b.normStrictness * clampedT,
    punishmentSeverity: a.punishmentSeverity * oneMinusT + b.punishmentSeverity * clampedT,
    opennessToOutsiders: a.opennessToOutsiders * oneMinusT + b.opennessToOutsiders * clampedT,
  };
}
