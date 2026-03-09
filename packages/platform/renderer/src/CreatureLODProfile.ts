/**
 * CreatureLODProfile
 *
 * Dragon/creature-specific LOD profiles for the ProceduralGeometryLODManager.
 * Provides distance-based detail reduction strategies tuned for organic models
 * with hull, spline, and membrane procedural geometry.
 *
 * The Inferno Wyrm has:
 * - 3 hull geometries (torso, skull, 4x paws) at resolution 20-48
 * - 13 spline geometries (neck, tail, wing bones, legs, fingers, horns)
 * - 8 membrane geometries (wing membranes, sub-membranes)
 *
 * LOD STRATEGY:
 * - LOD 0 (0-5m): Full detail. All procedural geometry at original resolution.
 * - LOD 1 (5-15m): Medium detail. Hull -40%, Spline -50%, Membrane -40%.
 * - LOD 2 (15-35m): Low detail. Hull -70%, Spline -75%, Membrane -70%.
 *   Disable sub-membranes. Simplify paw hulls.
 * - LOD 3 (35m+): Minimal detail. Hull bounding box, Spline linear,
 *   Membrane billboard. Merge small details (teeth, claws) into parent.
 *
 * @module CreatureLODProfile
 */

import type {
  ProceduralGeometryLODConfig,
  HullLODConfig,
  SplineLODConfig,
  MembraneLODConfig,
  FoveatedLODModifiers,
  ProceduralLODLevel,
} from './ProceduralGeometryLOD';
import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Creature size class for LOD distance calibration
 */
export type CreatureSizeClass = 'small' | 'medium' | 'large' | 'colossal';

/**
 * Creature detail importance for body regions
 */
export interface RegionDetailImportance {
  /** Head region importance (0-1). Higher = maintain detail longer. */
  head: number;
  /** Body core importance */
  body: number;
  /** Wings/appendage importance */
  appendages: number;
  /** Tail importance */
  tail: number;
  /** Decorative elements (spines, scales) importance */
  decorative: number;
  /** Fire/particle effects importance */
  effects: number;
}

/**
 * Creature LOD profile configuration
 */
export interface CreatureLODProfileConfig {
  /** Creature size class */
  sizeClass: CreatureSizeClass;
  /** Bounding sphere radius (meters) */
  boundingRadius: number;
  /** Region importance weights */
  regionImportance: RegionDetailImportance;
  /** Number of hull geometries */
  hullCount: number;
  /** Number of spline geometries */
  splineCount: number;
  /** Number of membrane geometries */
  membraneCount: number;
  /** Total vertex count at full detail */
  totalVerticesFullDetail: number;
  /** Enable animation LOD (disable animations at distance) */
  enableAnimationLOD: boolean;
  /** Animation disable distance (meters) */
  animationDisableDistance: number;
  /** Enable small detail merging at LOD 2+ */
  enableDetailMerging: boolean;
  /** Small detail threshold (objects smaller than this in screen pixels get merged) */
  smallDetailThreshold: number;
}

/**
 * LOD profile output - ready for ProceduralGeometryLODManager
 */
export interface CreatureLODOutput {
  /** ProceduralGeometryLODConfig for the LOD manager */
  lodConfig: ProceduralGeometryLODConfig;
  /** Per-region LOD recommendations */
  regionRecommendations: RegionLODRecommendation[];
  /** Animation LOD thresholds */
  animationLOD: AnimationLODConfig;
  /** Detail merging targets */
  detailMerging: DetailMergingConfig;
  /** Estimated vertex counts per LOD level */
  vertexCountPerLevel: [number, number, number, number];
  /** Estimated memory savings per LOD level (MB) */
  memorySavingsPerLevel: [number, number, number, number];
}

/**
 * Per-region LOD recommendation
 */
export interface RegionLODRecommendation {
  /** Region name */
  region: string;
  /** LOD 0 detail level */
  lod0Detail: number;
  /** LOD 1 detail level */
  lod1Detail: number;
  /** LOD 2 detail level */
  lod2Detail: number;
  /** LOD 3 detail level */
  lod3Detail: number;
  /** Whether region should be hidden at LOD 3 */
  hideAtLOD3: boolean;
  /** Recommendation text */
  recommendation: string;
}

/**
 * Animation LOD configuration
 */
export interface AnimationLODConfig {
  /** Enable animation LOD gating */
  enabled: boolean;
  /** Per-animation distance thresholds */
  thresholds: AnimationLODThreshold[];
}

/**
 * Per-animation LOD threshold
 */
export interface AnimationLODThreshold {
  /** Animation name */
  name: string;
  /** Priority (1=highest, maintain longer) */
  priority: number;
  /** Distance at which animation is disabled (meters) */
  disableDistance: number;
  /** Distance at which animation is simplified (half keyframes) */
  simplifyDistance: number;
}

/**
 * Detail merging configuration
 */
export interface DetailMergingConfig {
  /** Enable detail merging */
  enabled: boolean;
  /** Objects to merge at LOD 2 */
  mergeAtLOD2: string[];
  /** Objects to hide at LOD 3 */
  hideAtLOD3: string[];
  /** Objects to replace with billboards at LOD 3 */
  billboardAtLOD3: string[];
}

// =============================================================================
// SIZE CLASS DISTANCE SCALES
// =============================================================================

/**
 * LOD distance thresholds scaled by creature size class
 */
const SIZE_CLASS_DISTANCES: Record<CreatureSizeClass, [number, number, number, number]> = {
  small: [3, 8, 20, Infinity],     // 0-3m, 3-8m, 8-20m, 20m+
  medium: [5, 15, 35, Infinity],   // 0-5m, 5-15m, 15-35m, 35m+
  large: [10, 25, 60, Infinity],   // 0-10m, 10-25m, 25-60m, 60m+
  colossal: [20, 50, 100, Infinity], // 0-20m, 20-50m, 50-100m, 100m+
};

// =============================================================================
// DRAGON-SPECIFIC LOD PROFILE
// =============================================================================

/**
 * Default configuration for the Inferno Wyrm dragon.
 *
 * The dragon spans approximately:
 * - Width: 7.6m (wing tip to wing tip)
 * - Height: 5.5m (feet to horn tips)
 * - Depth: 10.0m (snout to tail barb)
 * - Bounding sphere radius: ~5.5m
 */
export const DRAGON_LOD_PROFILE: CreatureLODProfileConfig = {
  sizeClass: 'large',
  boundingRadius: 5.5,
  regionImportance: {
    head: 1.0,       // Always prioritize head detail (eyes, teeth, horns)
    body: 0.7,       // Torso can lose detail sooner
    appendages: 0.6, // Wings can simplify at distance
    tail: 0.4,       // Tail is lowest priority
    decorative: 0.3, // Spines, scales are pure decoration
    effects: 0.8,    // Fire effects should remain visible
  },
  hullCount: 7,       // TorsoHull, SkullHull, FLPaw, FRPaw, BLPaw, BRPaw
  splineCount: 13,    // NeckSpline, TailSpline, 2x WingBone, 8x WingFinger, 2x Horn, 4x Leg
  membraneCount: 8,   // 2x WingMembrane, 6x SubMembrane
  totalVerticesFullDetail: 78400, // Estimated from geometry types
  enableAnimationLOD: true,
  animationDisableDistance: 50,
  enableDetailMerging: true,
  smallDetailThreshold: 4, // 4 pixels
};

// =============================================================================
// PROFILE GENERATOR
// =============================================================================

/**
 * Generate a complete creature LOD profile from configuration.
 *
 * @param config - Creature LOD profile configuration
 * @returns LOD output ready for ProceduralGeometryLODManager integration
 *
 * @example
 * ```typescript
 * const dragonLOD = generateCreatureLODProfile(DRAGON_LOD_PROFILE);
 *
 * // Use with ProceduralGeometryLODManager
 * const lodManager = new ProceduralGeometryLODManager(dragonLOD.lodConfig);
 *
 * // Register dragon hull geometries
 * lodManager.register('TorsoHull', torsoMesh, 'hull', torsoGeometry);
 * lodManager.register('SkullHull', skullMesh, 'hull', skullGeometry);
 * ```
 */
export function generateCreatureLODProfile(
  config: CreatureLODProfileConfig
): CreatureLODOutput {
  const distances = SIZE_CLASS_DISTANCES[config.sizeClass];

  // Generate LOD levels
  const levels: ProceduralLODLevel[] = [
    {
      level: 0,
      distanceThreshold: distances[0],
      subdivisionLevel: 1.0,
      curveDetail: 1.0,
      collisionDetail: 1.0,
      memorySavings: 0,
      cpuSavings: 0,
    },
    {
      level: 1,
      distanceThreshold: distances[1],
      subdivisionLevel: 0.6,
      curveDetail: 0.5,
      collisionDetail: 0.5,
      memorySavings: 0.40,
      cpuSavings: 0.35,
    },
    {
      level: 2,
      distanceThreshold: distances[2],
      subdivisionLevel: 0.3,
      curveDetail: 0.25,
      collisionDetail: 0.2,
      memorySavings: 0.70,
      cpuSavings: 0.65,
    },
    {
      level: 3,
      distanceThreshold: distances[3],
      subdivisionLevel: 0.1,
      curveDetail: 0.1,
      collisionDetail: 0.0,
      memorySavings: 0.85,
      cpuSavings: 0.90,
    },
  ];

  // Hull LOD config (for torso, skull, paws)
  const hull: HullLODConfig = {
    maxVertices: [
      1024,  // LOD 0: Full hull resolution
      512,   // LOD 1: Half vertices
      128,   // LOD 2: Convex hull approximation
      32,    // LOD 3: Bounding box
    ],
    useConvexSimplification: true,
    edgeDecimation: [1.0, 0.6, 0.3, 0.1],
  };

  // Spline LOD config (for neck, tail, wings, legs, horns)
  const spline: SplineLODConfig = {
    curveSegments: [
      64,   // LOD 0: Smooth curves
      24,   // LOD 1: Moderate segments
      8,    // LOD 2: Coarse segments
      4,    // LOD 3: Linear approximation
    ],
    radialSegments: [
      16,   // LOD 0: Round tubes
      8,    // LOD 1: Octagonal
      4,    // LOD 2: Square-ish
      4,    // LOD 3: Minimal
    ],
    linearFallback: true,
    adaptiveTessellation: true,
  };

  // Membrane LOD config (for wing membranes)
  const membrane: MembraneLODConfig = {
    gridResolution: [
      64,   // LOD 0: High-detail membrane
      32,   // LOD 1: Medium
      12,   // LOD 2: Low-detail
      4,    // LOD 3: Billboard replacement
    ],
    deformationDetail: [1.0, 0.5, 0.2, 0.0],
    billboardFallback: true,
    normalMapScale: [1.0, 0.5, 0.25, 0.0],
  };

  // Foveated modifiers (VR-specific)
  const foveated: FoveatedLODModifiers = {
    enabled: true,
    fovealForceHighDetail: true,
    peripheralMinLOD: 1,
    peripheralDistanceMultiplier: 0.7,
    gazeContingentThreshold: 12,
  };

  const lodConfig: ProceduralGeometryLODConfig = {
    levels,
    hull,
    spline,
    membrane,
    foveated,
    smoothTransitions: true,
    transitionDuration: 250,
    enableHysteresis: true,
    hysteresisPercent: 12,
  };

  // Generate region recommendations
  const regionRecommendations = generateRegionRecommendations(config);

  // Generate animation LOD config
  const animationLOD = generateAnimationLOD(config);

  // Generate detail merging config
  const detailMerging = generateDetailMerging(config);

  // Estimate vertex counts per level
  const fullVerts = config.totalVerticesFullDetail;
  const vertexCountPerLevel: [number, number, number, number] = [
    fullVerts,
    Math.round(fullVerts * 0.55),
    Math.round(fullVerts * 0.25),
    Math.round(fullVerts * 0.10),
  ];

  // Estimate memory savings (assuming 32 bytes per vertex)
  const fullMemoryMB = (fullVerts * 32) / (1024 * 1024);
  const memorySavingsPerLevel: [number, number, number, number] = [
    0,
    +(fullMemoryMB * 0.40).toFixed(2),
    +(fullMemoryMB * 0.70).toFixed(2),
    +(fullMemoryMB * 0.85).toFixed(2),
  ];

  const output: CreatureLODOutput = {
    lodConfig,
    regionRecommendations,
    animationLOD,
    detailMerging,
    vertexCountPerLevel,
    memorySavingsPerLevel,
  };

  logger.info('[CreatureLODProfile] Generated creature LOD profile', {
    sizeClass: config.sizeClass,
    boundingRadius: config.boundingRadius,
    levels: levels.map(l => `${l.level}:${l.distanceThreshold}m`),
    vertexCountPerLevel,
    memorySavingsPerLevel: memorySavingsPerLevel.map(v => v + 'MB'),
  });

  return output;
}

// =============================================================================
// INTERNAL GENERATORS
// =============================================================================

function generateRegionRecommendations(
  config: CreatureLODProfileConfig
): RegionLODRecommendation[] {
  const imp = config.regionImportance;

  return [
    {
      region: 'head',
      lod0Detail: 1.0,
      lod1Detail: 0.9 * imp.head,
      lod2Detail: 0.6 * imp.head,
      lod3Detail: 0.3 * imp.head,
      hideAtLOD3: false,
      recommendation: 'Maintain eye detail (4-layer eyes) through LOD 1. Merge teeth at LOD 2. Simplify horns at LOD 2+.',
    },
    {
      region: 'body',
      lod0Detail: 1.0,
      lod1Detail: 0.7 * imp.body,
      lod2Detail: 0.4 * imp.body,
      lod3Detail: 0.15 * imp.body,
      hideAtLOD3: false,
      recommendation: 'TorsoHull: reduce resolution from 48 to 24/12/6. Hide belly scales at LOD 2. Hide ribs at LOD 3.',
    },
    {
      region: 'wings',
      lod0Detail: 1.0,
      lod1Detail: 0.6 * imp.appendages,
      lod2Detail: 0.3 * imp.appendages,
      lod3Detail: 0.1 * imp.appendages,
      hideAtLOD3: false,
      recommendation: 'Merge sub-membranes into main membrane at LOD 1. Billboard membranes at LOD 3. Hide wing claws at LOD 2.',
    },
    {
      region: 'legs',
      lod0Detail: 1.0,
      lod1Detail: 0.6 * imp.appendages,
      lod2Detail: 0.3 * imp.appendages,
      lod3Detail: 0.1 * imp.appendages,
      hideAtLOD3: false,
      recommendation: 'Simplify paw hulls from res-20 to 10/5. Hide toes at LOD 2. Hide dewclaws at LOD 1.',
    },
    {
      region: 'tail',
      lod0Detail: 1.0,
      lod1Detail: 0.5 * imp.tail,
      lod2Detail: 0.2 * imp.tail,
      lod3Detail: 0.05 * imp.tail,
      hideAtLOD3: false,
      recommendation: 'Reduce TailSpline segments from 8 to 4/2. Hide tail spines at LOD 2. Simplify tail barb at LOD 1.',
    },
    {
      region: 'spines',
      lod0Detail: 1.0,
      lod1Detail: 0.5 * imp.decorative,
      lod2Detail: 0.2 * imp.decorative,
      lod3Detail: 0.0,
      hideAtLOD3: true,
      recommendation: 'Instance all 12 back spines + 8 tail spines + 4 neck spines. Hide at LOD 3.',
    },
    {
      region: 'fire',
      lod0Detail: 1.0,
      lod1Detail: 0.8 * imp.effects,
      lod2Detail: 0.5 * imp.effects,
      lod3Detail: 0.2 * imp.effects,
      hideAtLOD3: false,
      recommendation: 'Use VolumetricFireRenderer at LOD 0-1. Reduce raymarch steps at LOD 2. Billboard fire at LOD 3.',
    },
  ];
}

function generateAnimationLOD(
  config: CreatureLODProfileConfig
): AnimationLODConfig {
  if (!config.enableAnimationLOD) {
    return { enabled: false, thresholds: [] };
  }

  const baseDisable = config.animationDisableDistance;

  return {
    enabled: true,
    thresholds: [
      // Priority 1: Core body animations (visible at greatest distance)
      { name: 'breathe', priority: 1, disableDistance: baseDisable, simplifyDistance: baseDisable * 0.6 },
      { name: 'neckWave', priority: 1, disableDistance: baseDisable * 0.8, simplifyDistance: baseDisable * 0.5 },
      { name: 'tailSway', priority: 1, disableDistance: baseDisable * 0.8, simplifyDistance: baseDisable * 0.5 },

      // Priority 2: Wing animations (large motion, visible at distance)
      { name: 'flapLeft', priority: 2, disableDistance: baseDisable * 0.7, simplifyDistance: baseDisable * 0.4 },
      { name: 'flapRight', priority: 2, disableDistance: baseDisable * 0.7, simplifyDistance: baseDisable * 0.4 },

      // Priority 3: Head detail animations
      { name: 'nod', priority: 3, disableDistance: baseDisable * 0.5, simplifyDistance: baseDisable * 0.3 },
      { name: 'chomp', priority: 3, disableDistance: baseDisable * 0.5, simplifyDistance: baseDisable * 0.3 },

      // Priority 4: Eye/glow animations (only visible up close)
      { name: 'eyeGlow', priority: 4, disableDistance: baseDisable * 0.3, simplifyDistance: baseDisable * 0.2 },

      // Priority 5: Fire animations (handled by volumetric fire system)
      { name: 'firePulse', priority: 5, disableDistance: baseDisable * 0.6, simplifyDistance: baseDisable * 0.3 },
      { name: 'fireFlicker1', priority: 5, disableDistance: baseDisable * 0.6, simplifyDistance: baseDisable * 0.3 },
      { name: 'fireFlicker2', priority: 5, disableDistance: baseDisable * 0.6, simplifyDistance: baseDisable * 0.3 },
      { name: 'fireFlicker3', priority: 5, disableDistance: baseDisable * 0.6, simplifyDistance: baseDisable * 0.3 },

      // Priority 6: Particle animations (lowest priority)
      { name: 'emberDrift1', priority: 6, disableDistance: baseDisable * 0.4, simplifyDistance: baseDisable * 0.2 },
      { name: 'emberDrift2', priority: 6, disableDistance: baseDisable * 0.4, simplifyDistance: baseDisable * 0.2 },
      { name: 'emberDrift3', priority: 6, disableDistance: baseDisable * 0.4, simplifyDistance: baseDisable * 0.2 },
      { name: 'emberDrift4', priority: 6, disableDistance: baseDisable * 0.4, simplifyDistance: baseDisable * 0.2 },
      { name: 'smokeRise1', priority: 6, disableDistance: baseDisable * 0.3, simplifyDistance: baseDisable * 0.15 },
      { name: 'smokeRise2', priority: 6, disableDistance: baseDisable * 0.3, simplifyDistance: baseDisable * 0.15 },
      { name: 'hazePulse', priority: 6, disableDistance: baseDisable * 0.3, simplifyDistance: baseDisable * 0.15 },
      { name: 'tendrilUL', priority: 6, disableDistance: baseDisable * 0.4, simplifyDistance: baseDisable * 0.2 },
      { name: 'tendrilUR', priority: 6, disableDistance: baseDisable * 0.4, simplifyDistance: baseDisable * 0.2 },
    ],
  };
}

function generateDetailMerging(
  config: CreatureLODProfileConfig
): DetailMergingConfig {
  if (!config.enableDetailMerging) {
    return { enabled: false, mergeAtLOD2: [], hideAtLOD3: [], billboardAtLOD3: [] };
  }

  return {
    enabled: true,
    mergeAtLOD2: [
      // Merge teeth into jaw/skull
      'UpperTooth1', 'UpperTooth2', 'UpperTooth3', 'UpperTooth4', 'UpperTooth5', 'UpperFang',
      'LowerTooth1', 'LowerTooth2', 'LowerTooth3', 'LowerTooth4', 'LowerTooth5', 'LowerFang',
      // Merge claws into paw hulls
      'FLClaw1', 'FLClaw2', 'FLClaw3', 'FLDewclaw',
      'FRClaw1', 'FRClaw2', 'FRClaw3', 'FRDewclaw',
      'BLClaw1', 'BLClaw2', 'BLClaw3', 'BLDewclaw',
      'BRClaw1', 'BRClaw2', 'BRClaw3', 'BRDewclaw',
      // Merge toes into paw hulls
      'FLToe1', 'FLToe2', 'FLToe3',
      'FRToe1', 'FRToe2', 'FRToe3',
      'BLToe1', 'BLToe2', 'BLToe3',
      'BRToe1', 'BRToe2', 'BRToe3',
      // Merge eye layers into single emissive sphere
      'LeftEyeIris', 'LeftEyePupil', 'LeftEyeGlow',
      'RightEyeIris', 'RightEyePupil', 'RightEyeGlow',
      // Merge nostrils into skull
      'LeftNostril', 'RightNostril',
    ],
    hideAtLOD3: [
      // Hide all decorative detail
      'BellyScale1', 'BellyScale2', 'BellyScale3', 'BellyScale4',
      'BellyScale5', 'BellyScale6', 'BellyScale7', 'BellyScale8',
      'RibLeft1', 'RibLeft2', 'RibRight1', 'RibRight2',
      'NeckScale1', 'NeckScale2',
      'CrownHorn1', 'CrownHorn2', 'CrownHorn3', 'CrownHorn4',
      'LeftWingClaw', 'RightWingClaw',
      'TailBarbLeft', 'TailBarbRight',
      'Tongue',
      // Hide sub-membranes (merged into main membrane)
      'LeftSubMembrane12', 'LeftSubMembrane23', 'LeftSubMembrane34',
      'RightSubMembrane12', 'RightSubMembrane23', 'RightSubMembrane34',
      // Hide individual embers/smoke (handled by particles)
      'Ember5', 'Ember6', 'Ember7', 'Ember8',
      'Smoke3', 'Smoke4',
    ],
    billboardAtLOD3: [
      // Convert wing membranes to billboards
      'LeftWingMembrane', 'RightWingMembrane',
      // Convert ear fins to billboards
      'LeftEarFin', 'RightEarFin',
    ],
  };
}

/**
 * Create a dragon-specific LOD profile using the default Inferno Wyrm configuration.
 *
 * @returns Complete LOD profile for the dragon
 */
export function createDragonLODProfile(): CreatureLODOutput {
  return generateCreatureLODProfile(DRAGON_LOD_PROFILE);
}
