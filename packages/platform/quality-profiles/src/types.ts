/**
 * Quality Tier Profile Types
 *
 * Domain-specific rendering optimization profiles for industrial,
 * cinematic, and mobile use cases.
 */

// =============================================================================
// QUALITY PROFILE TYPES
// =============================================================================

/**
 * Renderer quality settings consumed by quality profiles.
 */
export interface QualitySettings {
  shadowsEnabled: boolean;
  shadowMapSize: number;
  shadowType: 'basic' | 'pcf' | 'pcfsoft' | 'vsm';
  materialType: 'basic' | 'standard' | 'physical';
  maxTextureSize: number;
  anisotropy: number;
  maxPolyCount: number;
  lodBias: number;
  postProcessing: boolean;
  bloom: boolean;
  ssao: boolean;
  ssr: boolean;
  toneMapping: boolean;
  antialiasing: 'none' | 'fxaa' | 'smaa' | 'taa';
  hdriEnvironment: boolean;
  envMapResolution: number;
  realTimeReflections: boolean;
  maxAnimatedObjects: number;
  physicsSubsteps: number;
  targetFPS: number;
  pixelRatio: number;
}

/**
 * Quality profile names for domain-specific optimization
 */
export type QualityProfileName = 'industrial' | 'cinematic' | 'mobile';

/**
 * Rendering priority for profile optimization
 */
export type RenderingPriority =
  | 'data-accuracy' // Precise measurements, collision, IoT
  | 'visual-fidelity' // Ray tracing, high-res textures, post-processing
  | 'performance'; // Aggressive LOD, compression, simplified shaders

/**
 * Physics accuracy levels
 */
export type PhysicsAccuracy = 'none' | 'basic' | 'standard' | 'precise' | 'exact';

/**
 * Audio quality levels
 */
export type AudioQuality = 'low' | 'medium' | 'high' | 'studio';

/**
 * Network synchronization rate (Hz)
 */
export type NetworkSyncRate = 1 | 5 | 10 | 20 | 30 | 60;

/**
 * Trait configurations for HoloScript compositions
 */
export interface QualityTraitConfig {
  /** LOD trait configuration */
  lod?: {
    enabled: boolean;
    levels: number;
    distanceMultiplier: number;
    autoSwitch: boolean;
  };

  /** Physics trait configuration */
  physics?: {
    enabled: boolean;
    accuracy: PhysicsAccuracy;
    collisionDetection: 'discrete' | 'continuous';
    substeps: number;
  };

  /** Networking trait configuration */
  networking?: {
    enabled: boolean;
    syncRate: NetworkSyncRate;
    interpolation: boolean;
    compression: boolean;
  };

  /** Material trait configuration */
  material?: {
    pbrEnabled: boolean;
    normalMaps: boolean;
    roughnessMetallic: boolean;
    emissive: boolean;
    maxTextureResolution: number;
  };

  /** Animation trait configuration */
  animation?: {
    enabled: boolean;
    maxFPS: number;
    blending: boolean;
    morphTargets: boolean;
  };
}

/**
 * Complete quality profile definition
 */
export interface QualityProfile {
  /** Profile identifier */
  name: QualityProfileName;

  /** Human-readable display name */
  displayName: string;

  /** Profile description */
  description: string;

  /** Primary rendering priority */
  priority: RenderingPriority;

  /** Base renderer quality settings */
  renderSettings: QualitySettings;

  /** Physics simulation accuracy */
  physicsAccuracy: PhysicsAccuracy;

  /** Audio quality level */
  audioQuality: AudioQuality;

  /** Network synchronization rate (Hz) */
  networkSyncRate: NetworkSyncRate;

  /** Recommended trait configurations */
  traitConfig: QualityTraitConfig;

  /** Use case tags */
  tags: string[];

  /** Recommended for device types */
  recommendedDevices?: string[];
}

// =============================================================================
// COMPOSITION METADATA
// =============================================================================

/**
 * Composition metadata for quality profile selection
 */
export interface CompositionQualityMetadata {
  /** Quality profile to apply */
  profile?: QualityProfileName;

  /** Custom overrides to profile settings */
  overrides?: Partial<QualitySettings>;

  /** Trait-specific overrides */
  traitOverrides?: Partial<QualityTraitConfig>;

  /** Priority override (for custom profiles) */
  priorityOverride?: RenderingPriority;
}

// =============================================================================
// PROFILE PRESETS
// =============================================================================

/**
 * Industrial profile: Data accuracy over visual fidelity
 *
 * Optimized for:
 * - Digital twins
 * - IoT sensor visualization
 * - Factory floor simulations
 * - Precision measurement tools
 * - CAD/BIM viewers
 */
export const INDUSTRIAL_PROFILE: QualityProfile = {
  name: 'industrial',
  displayName: 'Industrial',
  description:
    'Prioritizes data accuracy, high-precision collision, minimal visual fidelity. Optimized for digital twin and IoT use cases.',
  priority: 'data-accuracy',

  renderSettings: {
    // Shadows: Basic for spatial awareness only
    shadowsEnabled: true,
    shadowMapSize: 1024,
    shadowType: 'basic',

    // Materials: Standard PBR for accurate material properties
    materialType: 'physical',
    maxTextureSize: 1024, // Lower textures, focus on geometry
    anisotropy: 4,

    // Geometry: High poly count for accurate meshes
    maxPolyCount: 500000, // Precise CAD models can be dense
    lodBias: 0.5, // Conservative LOD switching

    // Post-processing: Minimal, only essential
    postProcessing: false,
    bloom: false,
    ssao: false,
    ssr: false,
    toneMapping: false,
    antialiasing: 'fxaa', // Just for clean edges

    // Environment: Simple for consistent lighting
    hdriEnvironment: false,
    envMapResolution: 128,
    realTimeReflections: false,

    // Physics/Animation: Maximum accuracy
    maxAnimatedObjects: 50,
    physicsSubsteps: 4, // High precision

    // Performance: 60 FPS target, standard pixel ratio
    targetFPS: 60,
    pixelRatio: 1.0,
  },

  physicsAccuracy: 'exact',
  audioQuality: 'medium', // Alerts and notifications
  networkSyncRate: 10, // Real-time IoT data

  traitConfig: {
    lod: {
      enabled: true,
      levels: 3,
      distanceMultiplier: 1.5, // Conservative switching
      autoSwitch: true,
    },
    physics: {
      enabled: true,
      accuracy: 'exact',
      collisionDetection: 'continuous',
      substeps: 4,
    },
    networking: {
      enabled: true,
      syncRate: 10,
      interpolation: true,
      compression: true,
    },
    material: {
      pbrEnabled: true,
      normalMaps: false, // Skip for performance
      roughnessMetallic: true, // Accurate material properties
      emissive: true, // Status indicators
      maxTextureResolution: 1024,
    },
    animation: {
      enabled: true,
      maxFPS: 30, // Machinery animations
      blending: false,
      morphTargets: false,
    },
  },

  tags: ['digital-twin', 'iot', 'precision', 'simulation', 'cad', 'bim'],
  recommendedDevices: ['hololens2', 'hololens', 'varjo', 'workstation'],
};

/**
 * Cinematic profile: Maximal visual quality
 *
 * Optimized for:
 * - Marketing demos
 * - Architectural visualization
 * - Entertainment experiences
 * - Product showcases
 * - Film/TV pre-visualization
 */
export const CINEMATIC_PROFILE: QualityProfile = {
  name: 'cinematic',
  displayName: 'Cinematic',
  description:
    'Maximal visual quality with ray tracing, high-res textures, advanced post-processing for entertainment and marketing.',
  priority: 'visual-fidelity',

  renderSettings: {
    // Shadows: Soft, high-resolution
    shadowsEnabled: true,
    shadowMapSize: 4096,
    shadowType: 'pcfsoft',

    // Materials: Full PBR with all features
    materialType: 'physical',
    maxTextureSize: 4096,
    anisotropy: 16,

    // Geometry: High poly for beauty shots
    maxPolyCount: 2000000,
    lodBias: 0, // Minimal LOD, max quality

    // Post-processing: Everything enabled
    postProcessing: true,
    bloom: true,
    ssao: true,
    ssr: true,
    toneMapping: true,
    antialiasing: 'taa',

    // Environment: Full HDRI with high-res
    hdriEnvironment: true,
    envMapResolution: 1024,
    realTimeReflections: true,

    // Physics/Animation: High quality animations
    maxAnimatedObjects: 100,
    physicsSubsteps: 3, // Good enough for visuals

    // Performance: 60 FPS for desktop, higher pixel ratio
    targetFPS: 60,
    pixelRatio: 1.5,
  },

  physicsAccuracy: 'standard', // Not critical for visuals
  audioQuality: 'studio', // Immersive soundscapes
  networkSyncRate: 20, // Smooth multi-user

  traitConfig: {
    lod: {
      enabled: true,
      levels: 4,
      distanceMultiplier: 0.8, // Prefer higher quality
      autoSwitch: true,
    },
    physics: {
      enabled: true,
      accuracy: 'standard',
      collisionDetection: 'discrete',
      substeps: 3,
    },
    networking: {
      enabled: true,
      syncRate: 20,
      interpolation: true,
      compression: false, // Quality over bandwidth
    },
    material: {
      pbrEnabled: true,
      normalMaps: true,
      roughnessMetallic: true,
      emissive: true,
      maxTextureResolution: 4096,
    },
    animation: {
      enabled: true,
      maxFPS: 60,
      blending: true,
      morphTargets: true,
    },
  },

  tags: ['marketing', 'archviz', 'entertainment', 'showcase', 'previz'],
  recommendedDevices: ['desktop', 'pcvr'],
};

/**
 * Mobile profile: Aggressive optimization for standalone headsets
 *
 * Optimized for:
 * - Quest standalone (Quest 2/3/Pro)
 * - Mobile AR (phones/tablets)
 * - Low-power devices
 * - Battery-constrained scenarios
 */
export const MOBILE_PROFILE: QualityProfile = {
  name: 'mobile',
  displayName: 'Mobile',
  description:
    'Aggressive LOD, texture compression, simplified shaders for Quest standalone and mobile AR.',
  priority: 'performance',

  renderSettings: {
    // Shadows: Basic, low resolution
    shadowsEnabled: true,
    shadowMapSize: 512,
    shadowType: 'basic',

    // Materials: Standard, compressed textures
    materialType: 'standard',
    maxTextureSize: 512,
    anisotropy: 1,

    // Geometry: Aggressive LOD
    maxPolyCount: 50000,
    lodBias: 2,

    // Post-processing: Disabled for performance
    postProcessing: false,
    bloom: false,
    ssao: false,
    ssr: false,
    toneMapping: false,
    antialiasing: 'none',

    // Environment: Minimal
    hdriEnvironment: false,
    envMapResolution: 128,
    realTimeReflections: false,

    // Physics/Animation: Limited
    maxAnimatedObjects: 10,
    physicsSubsteps: 1,

    // Performance: 72 FPS for Quest, reduced pixel ratio
    targetFPS: 72,
    pixelRatio: 0.75,
  },

  physicsAccuracy: 'basic',
  audioQuality: 'low', // Minimal processing
  networkSyncRate: 5, // Conserve bandwidth

  traitConfig: {
    lod: {
      enabled: true,
      levels: 5,
      distanceMultiplier: 2.0, // Aggressive switching
      autoSwitch: true,
    },
    physics: {
      enabled: true,
      accuracy: 'basic',
      collisionDetection: 'discrete',
      substeps: 1,
    },
    networking: {
      enabled: true,
      syncRate: 5,
      interpolation: true,
      compression: true,
    },
    material: {
      pbrEnabled: false, // Use simple materials
      normalMaps: false,
      roughnessMetallic: false,
      emissive: true, // Keep for UI
      maxTextureResolution: 512,
    },
    animation: {
      enabled: true,
      maxFPS: 30,
      blending: false,
      morphTargets: false,
    },
  },

  tags: ['quest', 'mobile-ar', 'standalone', 'battery-efficient'],
  recommendedDevices: ['mobile', 'tablet', 'quest2', 'quest3', 'questPro'],
};

/**
 * Map of all quality profiles
 */
export const QUALITY_PROFILES: Record<QualityProfileName, QualityProfile> = {
  industrial: INDUSTRIAL_PROFILE,
  cinematic: CINEMATIC_PROFILE,
  mobile: MOBILE_PROFILE,
};
