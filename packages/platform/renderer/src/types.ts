/**
 * Type definitions for @hololand/renderer
 */

// =============================================================================
// QUALITY PRESETS
// =============================================================================

/**
 * Quality preset levels
 * - 'auto': Automatically detect based on device capabilities
 * - 'low': Basic rendering for mobile/Quest 2 (72+ FPS target)
 * - 'medium': Better materials and shadows (Quest 3/Pro)
 * - 'high': Full PBR, HDRI, post-processing (PC VR)
 * - 'ultra': Ray-traced features where available (High-end desktop)
 */
export type QualityPreset = 'auto' | 'low' | 'medium' | 'high' | 'ultra';

/**
 * Detected device type for automatic quality selection
 */
export type DeviceType =
  | 'mobile'
  | 'tablet'
  | 'quest2'
  | 'quest3'
  | 'questPro'
  | 'pcvr'
  | 'desktop'
  | 'unknown';

/**
 * Quality settings that vary by preset
 */
export interface QualitySettings {
  // Shadows
  shadowsEnabled: boolean;
  shadowMapSize: number; // 512, 1024, 2048, 4096
  shadowType: 'basic' | 'pcf' | 'pcfsoft' | 'vsm';

  // Materials
  materialType: 'basic' | 'standard' | 'physical';
  maxTextureSize: number;
  anisotropy: number; // 1, 4, 8, 16

  // Geometry
  maxPolyCount: number;
  lodBias: number; // 0-2, higher = more aggressive LOD

  // Post-processing
  postProcessing: boolean;
  bloom: boolean;
  ssao: boolean;
  ssr: boolean; // Screen-space reflections
  toneMapping: boolean;
  antialiasing: 'none' | 'fxaa' | 'smaa' | 'taa';

  // Environment
  hdriEnvironment: boolean;
  envMapResolution: number; // 128, 256, 512, 1024
  realTimeReflections: boolean;

  // Physics/Animation
  maxAnimatedObjects: number;
  physicsSubsteps: number;

  // Performance targets
  targetFPS: number;
  pixelRatio: number; // 0.5 - 2.0
}

/**
 * Predefined quality presets
 */
export const QUALITY_PRESETS: Record<Exclude<QualityPreset, 'auto'>, QualitySettings> = {
  low: {
    shadowsEnabled: true,
    shadowMapSize: 512,
    shadowType: 'basic',
    materialType: 'standard',
    maxTextureSize: 512,
    anisotropy: 1,
    maxPolyCount: 50000,
    lodBias: 2,
    postProcessing: false,
    bloom: false,
    ssao: false,
    ssr: false,
    toneMapping: false,
    antialiasing: 'none',
    hdriEnvironment: false,
    envMapResolution: 128,
    realTimeReflections: false,
    maxAnimatedObjects: 10,
    physicsSubsteps: 1,
    targetFPS: 72,
    pixelRatio: 0.75,
  },
  medium: {
    shadowsEnabled: true,
    shadowMapSize: 1024,
    shadowType: 'pcf',
    materialType: 'standard',
    maxTextureSize: 1024,
    anisotropy: 4,
    maxPolyCount: 150000,
    lodBias: 1,
    postProcessing: true,
    bloom: false,
    ssao: false,
    ssr: false,
    toneMapping: true,
    antialiasing: 'fxaa',
    hdriEnvironment: true,
    envMapResolution: 256,
    realTimeReflections: false,
    maxAnimatedObjects: 25,
    physicsSubsteps: 2,
    targetFPS: 72,
    pixelRatio: 1.0,
  },
  high: {
    shadowsEnabled: true,
    shadowMapSize: 2048,
    shadowType: 'pcfsoft',
    materialType: 'physical',
    maxTextureSize: 2048,
    anisotropy: 8,
    maxPolyCount: 500000,
    lodBias: 0.5,
    postProcessing: true,
    bloom: true,
    ssao: true,
    ssr: false,
    toneMapping: true,
    antialiasing: 'smaa',
    hdriEnvironment: true,
    envMapResolution: 512,
    realTimeReflections: true,
    maxAnimatedObjects: 50,
    physicsSubsteps: 3,
    targetFPS: 90,
    pixelRatio: 1.0,
  },
  ultra: {
    shadowsEnabled: true,
    shadowMapSize: 4096,
    shadowType: 'pcfsoft',
    materialType: 'physical',
    maxTextureSize: 4096,
    anisotropy: 16,
    maxPolyCount: 2000000,
    lodBias: 0,
    postProcessing: true,
    bloom: true,
    ssao: true,
    ssr: true,
    toneMapping: true,
    antialiasing: 'taa',
    hdriEnvironment: true,
    envMapResolution: 1024,
    realTimeReflections: true,
    maxAnimatedObjects: 100,
    physicsSubsteps: 4,
    targetFPS: 60,
    pixelRatio: typeof window !== 'undefined' && window && window.devicePixelRatio ? window.devicePixelRatio : 1.5,
  },
};

// =============================================================================
// RENDER MODES
// =============================================================================

/**
 * Render modes for universal platform support (Phase 2)
 * - '3d': Standard 3D perspective rendering (default)
 * - '2d': Orthographic 2D rendering for desktop/mobile apps
 * - 'hybrid': 2D UI overlay on 3D world
 * - 'vr': Full WebXR VR mode
 * - 'ar': Augmented reality mode (WebXR AR)
 */
export type RenderMode = '2d' | '3d' | 'hybrid' | 'vr' | 'ar';

// =============================================================================
// RENDERER CONFIG
// =============================================================================

export interface RendererConfig {
  // Quality settings
  quality?: QualityPreset;
  qualityOverrides?: Partial<QualitySettings>;

  // Rendering mode (Phase 2: Universal Rendering)
  renderMode?: RenderMode;

  // Existing 3D options
  enableShadows?: boolean;
  enableVR?: boolean;
  enableControls?: boolean;
  antialias?: boolean;
  backgroundColor?: number;
  cameraPosition?: { x: number; y: number; z: number };
  cameraFov?: number;

  // 2D mode options (Phase 2)
  enable2D?: boolean;
  orthoSize?: number; // Size for orthographic camera

  // Hybrid mode options (Phase 2)
  enableHybrid?: boolean;
  uiCanvasElement?: HTMLCanvasElement; // Separate canvas for 2D UI overlay

  // Environment
  environment?: EnvironmentConfig;

  // Post-processing overrides
  postProcessing?: PostProcessingConfig;
}

// =============================================================================
// ENVIRONMENT
// =============================================================================

export interface EnvironmentConfig {
  /** HDRI environment map URL or preset name */
  hdri?: string;
  /** Skybox type */
  skybox?: 'none' | 'hdri' | 'procedural' | 'gradient';
  /** Sky colors for gradient skybox */
  skyColors?: { top: number; bottom: number };
  /** Procedural sky settings */
  proceduralSky?: {
    turbidity: number;
    rayleigh: number;
    mieCoefficient: number;
    mieDirectionalG: number;
    elevation: number;
    azimuth: number;
  };
  /** Ground settings */
  ground?: {
    enabled: boolean;
    color: number;
    roughness: number;
    metalness: number;
    receiveShadow: boolean;
  };
  /** Fog settings */
  fog?: {
    enabled: boolean;
    type: 'linear' | 'exponential';
    color: number;
    near?: number;
    far?: number;
    density?: number;
  };
}

// =============================================================================
// POST-PROCESSING
// =============================================================================

export interface PostProcessingConfig {
  enabled?: boolean;

  bloom?: {
    enabled: boolean;
    strength: number;
    radius: number;
    threshold: number;
  };

  ssao?: {
    enabled: boolean;
    radius: number;
    intensity: number;
    bias: number;
  };

  ssr?: {
    enabled: boolean;
    maxDistance: number;
    resolution: number;
    thickness: number;
  };

  dof?: {
    enabled: boolean;
    focusDistance: number;
    focalLength: number;
    bokehScale: number;
  };

  toneMapping?: {
    enabled: boolean;
    exposure: number;
    type: 'linear' | 'reinhard' | 'cineon' | 'aces' | 'filmic';
  };

  vignette?: {
    enabled: boolean;
    offset: number;
    darkness: number;
  };

  chromaticAberration?: {
    enabled: boolean;
    offset: number;
  };

  colorGrading?: {
    enabled: boolean;
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
  };
}

// =============================================================================
// ASSET LOADING
// =============================================================================

export interface AssetLoadOptions {
  /** Automatically generate LODs */
  generateLOD?: boolean;
  /** Maximum texture resolution (will downscale if larger) */
  maxTextureSize?: number;
  /** Enable Draco compression for GLTF */
  useDraco?: boolean;
  /** Cache loaded assets */
  cache?: boolean;
  /** Progress callback */
  onProgress?: (progress: number) => void;
}

export interface LoadedAsset {
  id: string;
  type: 'gltf' | 'texture' | 'hdri' | 'audio';
  url: string;
  data: unknown;
  metadata: {
    polyCount?: number;
    textureCount?: number;
    animationCount?: number;
    bounds?: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  };
}

export interface MaterialConfig {
  type: 'standard' | 'basic' | 'phong' | 'physical';
  color?: number | string;
  metalness?: number;
  roughness?: number;
  emissive?: number | string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}

export interface LightingConfig {
  type: 'ambient' | 'directional' | 'point' | 'spot';
  color: number | string;
  intensity: number;
  position?: { x: number; y: number; z: number };
  distance?: number;
  castShadow?: boolean;
}
