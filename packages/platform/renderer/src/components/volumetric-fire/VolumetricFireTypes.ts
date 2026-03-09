/**
 * VolumetricFireTypes
 *
 * Type definitions for GPU-optimized volumetric fire rendering system.
 * Designed for VR frame budgets (11.1ms at 90Hz, target <2ms for fire pass).
 *
 * Architecture:
 *   - Compute shader generates 3D density field (amortized across frames)
 *   - Fragment shader raymarches through density field with temporal reprojection
 *   - Auto quality stepping: 12/24/32/48 steps based on frame budget
 *
 * 9-Layer Fire System:
 *   1. White-hot core (3500K+ blackbody)
 *   2. Inner orange flame (2500-3000K)
 *   3. Mid flame (2000-2500K, primary fire color)
 *   4. Outer glow (1500-2000K, yellow-orange)
 *   5. Tendrils (procedural noise-driven wispy extensions)
 *   6. Heat haze (screen-space distortion)
 *   7. Embers (particle system integration)
 *   8. Smoke (alpha-blended volumetric clouds)
 *   9. Backlit edge glow (subsurface-style rim lighting)
 *
 * @module volumetric-fire/types
 */

// =============================================================================
// CORE FIRE CONFIGURATION
// =============================================================================

/**
 * Volumetric fire material configuration.
 * Balances visual fidelity with VR performance constraints.
 */
export interface VolumetricFireConfig {
  // --- Core Shape ---
  /** Fire volume scale (world units) */
  scale: { x: number; y: number; z: number };
  /** Base fire intensity (0-1, affects all layers) */
  intensity: number;
  /** Fire color temperature in Kelvin (1000-5000K) */
  temperature: number;
  /** Animation speed multiplier (default 1.0) */
  animationSpeed: number;

  // --- Noise Parameters ---
  /** Primary noise scale (controls flame detail density) */
  noiseScale: number;
  /** Noise octaves (1-4, higher = more detail but slower) */
  noiseOctaves: number;
  /** Turbulence intensity (0-1, controls flame chaos) */
  turbulence: number;
  /** Wind direction vector (normalized) */
  windDirection: { x: number; y: number; z: number };
  /** Wind strength (0-2, affects distortion) */
  windStrength: number;

  // --- Layer Visibility & Intensity ---
  layers: {
    whiteHotCore: LayerConfig;
    innerOrange: LayerConfig;
    midFlame: LayerConfig;
    outerGlow: LayerConfig;
    tendrils: LayerConfig;
    heatHaze: LayerConfig;
    embers: LayerConfig;
    smoke: LayerConfig;
    edgeGlow: LayerConfig;
  };

  // --- Performance Budget ---
  /** Quality level (0=low, 1=medium, 2=high, 3=ultra) */
  qualityLevel: 0 | 1 | 2 | 3;
  /** Maximum raymarch steps (auto-adjusted: 12, 24, 32, or 48) */
  maxRaymarchSteps: number;
  /** Enable temporal reprojection (amortizes cost across frames) */
  temporalReprojection: boolean;
  /** Temporal blend factor (0.0-1.0, higher = more smoothing) */
  temporalBlendFactor: number;
  /** Foveated rendering (higher quality in gaze center) */
  foveatedRendering: boolean;

  // --- Compute Shader Settings ---
  /** Enable compute shader density field generation */
  useComputeDensity: boolean;
  /** Density field resolution (32 for VR, 64 for desktop) */
  densityFieldResolution: number;
  /** How many frames between density field recomputes (1=every frame, 2=every other) */
  densityUpdateInterval: number;

  // --- Lighting Integration ---
  /** Fire emits volumetric light (expensive, Quest 3+ only) */
  emitsVolumetricLight: boolean;
  /** Volumetric light radius (world units) */
  volumetricLightRadius: number;
  /** Light scattering intensity (0-1) */
  scatteringIntensity: number;
}

/**
 * Per-layer configuration for fire visual layers.
 */
export interface LayerConfig {
  /** Layer enabled */
  enabled: boolean;
  /** Layer intensity multiplier (0-1) */
  intensity: number;
  /** Layer color override (optional, uses temperature if undefined) */
  color?: { r: number; g: number; b: number };
  /** Layer-specific noise scale multiplier */
  noiseScale?: number;
  /** Layer density threshold (0-1, lower = more visible) */
  densityThreshold?: number;
  /** Layer alpha multiplier (for transparency) */
  alphaMultiplier?: number;
}

// =============================================================================
// GPU UNIFORMS (WGSL-compatible, std140 aligned)
// =============================================================================

/**
 * Uniform buffer layout for WGSL fire shader.
 * Must match the FireUniforms struct in volumetric-fire.wgsl exactly.
 * Total size: 384 bytes (aligned to 256-byte boundary = 512 bytes padded).
 */
export interface FireUniforms {
  // Transform & Camera (256 bytes = 4 mat4 + 2 vec4)
  modelViewMatrix: Float32Array;     // mat4x4<f32> (64 bytes)
  projectionMatrix: Float32Array;    // mat4x4<f32> (64 bytes)
  invViewProjection: Float32Array;   // mat4x4<f32> (64 bytes)
  prevViewProjection: Float32Array;  // mat4x4<f32> (64 bytes)
  cameraPosition: Float32Array;      // vec4<f32> (w = time, 16 bytes)
  fireOrigin: Float32Array;          // vec4<f32> (16 bytes)

  // Fire Core Parameters (64 bytes)
  fireScale: Float32Array;           // vec4<f32> (xyz = scale, w = intensity)
  temperature: number;               // f32 (Kelvin)
  animationSpeed: number;            // f32
  noiseScale: number;                // f32
  noiseOctaves: number;              // u32

  turbulence: number;                // f32
  windStrength: number;              // f32
  maxRaymarchSteps: number;          // u32
  qualityLevel: number;              // u32

  windDirection: Float32Array;       // vec4<f32>

  // Layer Intensities (48 bytes)
  layerIntensities1: Float32Array;   // vec4<f32>
  layerIntensities2: Float32Array;   // vec4<f32>
  layerIntensities3: Float32Array;   // vec4<f32>

  // Temporal Reprojection (16 bytes)
  frameIndex: number;                // u32
  temporalBlendFactor: number;       // f32
  jitterX: number;                   // f32
  jitterY: number;                   // f32

  // Performance Flags (16 bytes)
  flags: number;                     // u32
  renderScale: number;               // f32
  foveaCenterX: number;              // f32
  foveaCenterY: number;              // f32

  // Volume Bounds (32 bytes)
  volumeMin: Float32Array;           // vec4<f32>
  volumeMax: Float32Array;           // vec4<f32>
}

/**
 * Performance flags bitfield for GPU shader.
 */
export enum FireShaderFlags {
  TEMPORAL_REPROJECTION = 1 << 0,
  FOVEATED_RENDERING = 1 << 1,
  VOLUMETRIC_LIGHT = 1 << 2,
  HIGH_QUALITY_NOISE = 1 << 3,
  COMPUTE_DENSITY = 1 << 4,
  EMBERS_ENABLED = 1 << 5,
  SMOKE_ENABLED = 1 << 6,
  HEAT_HAZE_ENABLED = 1 << 7,
  EDGE_GLOW_ENABLED = 1 << 8,
}

// =============================================================================
// AUTO QUALITY STEPPING
// =============================================================================

/**
 * Auto quality step configuration.
 * Maps quality levels to specific raymarch step counts and features.
 */
export interface QualityStep {
  /** Quality level name */
  name: string;
  /** Raymarch step count */
  raymarchSteps: 12 | 24 | 32 | 48;
  /** Noise octaves */
  noiseOctaves: number;
  /** Enable temporal reprojection at this level */
  temporalReprojection: boolean;
  /** Density field resolution */
  densityFieldResolution: number;
  /** Density update interval (frames) */
  densityUpdateInterval: number;
  /** Render scale factor */
  renderScale: number;
  /** Maximum frame budget for this step (ms) */
  frameBudgetMs: number;
}

/**
 * The four auto quality steps.
 * Quality controller moves between these based on frame time.
 */
export const QUALITY_STEPS: Record<0 | 1 | 2 | 3, QualityStep> = {
  0: {
    name: 'low',
    raymarchSteps: 12,
    noiseOctaves: 2,
    temporalReprojection: true,
    densityFieldResolution: 32,
    densityUpdateInterval: 4,
    renderScale: 0.5,
    frameBudgetMs: 1.0,
  },
  1: {
    name: 'medium',
    raymarchSteps: 24,
    noiseOctaves: 3,
    temporalReprojection: true,
    densityFieldResolution: 32,
    densityUpdateInterval: 2,
    renderScale: 0.75,
    frameBudgetMs: 1.5,
  },
  2: {
    name: 'high',
    raymarchSteps: 32,
    noiseOctaves: 3,
    temporalReprojection: true,
    densityFieldResolution: 48,
    densityUpdateInterval: 1,
    renderScale: 0.85,
    frameBudgetMs: 2.0,
  },
  3: {
    name: 'ultra',
    raymarchSteps: 48,
    noiseOctaves: 4,
    temporalReprojection: false,
    densityFieldResolution: 64,
    densityUpdateInterval: 1,
    renderScale: 1.0,
    frameBudgetMs: 3.0,
  },
};

// =============================================================================
// TEMPORAL REPROJECTION STATE
// =============================================================================

/**
 * State for temporal reprojection (maintained between frames).
 */
export interface TemporalReprojectionState {
  /** Previous frame's view-projection matrix */
  prevViewProjection: Float32Array;
  /** Previous frame's fire output texture */
  prevFrameTexture: GPUTexture | null;
  /** Previous frame's density field texture */
  prevDensityField: GPUTexture | null;
  /** Rolling frame index */
  frameIndex: number;
  /** Whether this is the first frame (no history available) */
  isFirstFrame: boolean;
  /** Halton sequence index for sub-pixel jitter */
  haltonIndex: number;
}

// =============================================================================
// RENDER PASS CONFIGURATION
// =============================================================================

/**
 * Volumetric fire render pass configuration.
 * Integrates with HoloLand's multi-pass rendering pipeline.
 */
export interface FireRenderPassConfig {
  /** Render target resolution (downscaled for performance) */
  resolution: { width: number; height: number };
  /** Render scale factor (0.5-1.0, lower = faster) */
  renderScale: number;
  /** Render order (fires render after opaque, before transparent) */
  renderOrder: number;
  /** Blend mode */
  blendMode: 'additive' | 'alpha' | 'premultiplied';
  /** Depth test enabled (avoids overdraw behind solid objects) */
  depthTest: boolean;
  /** Depth write enabled (typically false for volumetrics) */
  depthWrite: boolean;
}

// =============================================================================
// NOISE TEXTURE CONFIGURATION
// =============================================================================

/**
 * 3D noise texture for procedural fire animation.
 * Pre-computed on CPU or GPU for efficiency.
 */
export interface NoiseTextureConfig {
  /** Texture dimensions (power of 2, typically 64-128) */
  dimensions: { width: number; height: number; depth: number };
  /** Noise type */
  type: 'perlin' | 'worley' | 'curl' | 'combined';
  /** Texture format (r8unorm, rg8unorm, rgba8unorm) */
  format: 'r8unorm' | 'rg8unorm' | 'rgba8unorm';
  /** Generate on GPU (faster but requires compute shader support) */
  generateOnGPU: boolean;
  /** Seamless tiling (wraps cleanly) */
  seamless: boolean;
}

// =============================================================================
// COMPUTE PIPELINE STATE
// =============================================================================

/**
 * State for the compute density field pipeline.
 */
export interface ComputePipelineState {
  /** WebGPU compute pipeline */
  pipeline: GPUComputePipeline | null;
  /** Current density field texture */
  densityField: GPUTexture | null;
  /** Previous density field texture (for temporal smoothing) */
  prevDensityField: GPUTexture | null;
  /** Bind group for compute shader */
  bindGroup: GPUBindGroup | null;
  /** Density field resolution */
  resolution: number;
  /** Frames since last density update */
  framesSinceUpdate: number;
}

// =============================================================================
// PERFORMANCE TELEMETRY
// =============================================================================

/**
 * Runtime performance metrics for volumetric fire system.
 */
export interface FirePerformanceMetrics {
  /** GPU time for fire pass (milliseconds) */
  gpuTimeMs: number;
  /** CPU time for uniform updates (milliseconds) */
  cpuTimeMs: number;
  /** Compute shader time (milliseconds) */
  computeTimeMs: number;
  /** Raymarch step count (current) */
  averageRaymarchSteps: number;
  /** Pixels rendered (after foveation/culling) */
  pixelsRendered: number;
  /** Fill rate (pixels/ms) */
  fillRate: number;
  /** Quality level auto-adjusted by budget manager */
  autoQualityLevel: 0 | 1 | 2 | 3;
  /** Budget exceeded (triggers quality downgrade) */
  budgetExceeded: boolean;
  /** Whether temporal reprojection is active */
  temporalActive: boolean;
  /** Density field update count this second */
  densityUpdatesPerSecond: number;
}

// =============================================================================
// PRESET CONFIGURATIONS
// =============================================================================

/**
 * Quality presets optimized for different VR platforms.
 */
export const FIRE_QUALITY_PRESETS: Record<
  'quest2' | 'quest3' | 'questPro' | 'pcvr' | 'desktop',
  Partial<VolumetricFireConfig>
> = {
  quest2: {
    qualityLevel: 0,
    maxRaymarchSteps: 12,
    noiseOctaves: 2,
    temporalReprojection: true,
    temporalBlendFactor: 0.3,
    foveatedRendering: true,
    useComputeDensity: true,
    densityFieldResolution: 32,
    densityUpdateInterval: 4,
    emitsVolumetricLight: false,
    layers: {
      whiteHotCore: { enabled: true, intensity: 1.0 },
      innerOrange: { enabled: true, intensity: 0.9 },
      midFlame: { enabled: true, intensity: 1.0 },
      outerGlow: { enabled: true, intensity: 0.7 },
      tendrils: { enabled: false, intensity: 0 },
      heatHaze: { enabled: false, intensity: 0 },
      embers: { enabled: true, intensity: 0.5 },
      smoke: { enabled: false, intensity: 0 },
      edgeGlow: { enabled: false, intensity: 0 },
    },
  },
  quest3: {
    qualityLevel: 1,
    maxRaymarchSteps: 24,
    noiseOctaves: 3,
    temporalReprojection: true,
    temporalBlendFactor: 0.25,
    foveatedRendering: true,
    useComputeDensity: true,
    densityFieldResolution: 32,
    densityUpdateInterval: 2,
    emitsVolumetricLight: true,
    volumetricLightRadius: 3.0,
    layers: {
      whiteHotCore: { enabled: true, intensity: 1.0 },
      innerOrange: { enabled: true, intensity: 1.0 },
      midFlame: { enabled: true, intensity: 1.0 },
      outerGlow: { enabled: true, intensity: 0.8 },
      tendrils: { enabled: true, intensity: 0.6 },
      heatHaze: { enabled: true, intensity: 0.4 },
      embers: { enabled: true, intensity: 0.7 },
      smoke: { enabled: true, intensity: 0.5 },
      edgeGlow: { enabled: true, intensity: 0.6 },
    },
  },
  questPro: {
    qualityLevel: 2,
    maxRaymarchSteps: 32,
    noiseOctaves: 3,
    temporalReprojection: true,
    temporalBlendFactor: 0.2,
    foveatedRendering: true,
    useComputeDensity: true,
    densityFieldResolution: 48,
    densityUpdateInterval: 1,
    emitsVolumetricLight: true,
    volumetricLightRadius: 5.0,
    layers: {
      whiteHotCore: { enabled: true, intensity: 1.0 },
      innerOrange: { enabled: true, intensity: 1.0 },
      midFlame: { enabled: true, intensity: 1.0 },
      outerGlow: { enabled: true, intensity: 1.0 },
      tendrils: { enabled: true, intensity: 0.8 },
      heatHaze: { enabled: true, intensity: 0.6 },
      embers: { enabled: true, intensity: 0.8 },
      smoke: { enabled: true, intensity: 0.7 },
      edgeGlow: { enabled: true, intensity: 0.8 },
    },
  },
  pcvr: {
    qualityLevel: 3,
    maxRaymarchSteps: 48,
    noiseOctaves: 4,
    temporalReprojection: false,
    temporalBlendFactor: 0.0,
    foveatedRendering: false,
    useComputeDensity: true,
    densityFieldResolution: 64,
    densityUpdateInterval: 1,
    emitsVolumetricLight: true,
    volumetricLightRadius: 8.0,
    layers: {
      whiteHotCore: { enabled: true, intensity: 1.0 },
      innerOrange: { enabled: true, intensity: 1.0 },
      midFlame: { enabled: true, intensity: 1.0 },
      outerGlow: { enabled: true, intensity: 1.0 },
      tendrils: { enabled: true, intensity: 1.0 },
      heatHaze: { enabled: true, intensity: 0.8 },
      embers: { enabled: true, intensity: 1.0 },
      smoke: { enabled: true, intensity: 1.0 },
      edgeGlow: { enabled: true, intensity: 1.0 },
    },
  },
  desktop: {
    qualityLevel: 3,
    maxRaymarchSteps: 48,
    noiseOctaves: 4,
    temporalReprojection: false,
    temporalBlendFactor: 0.0,
    foveatedRendering: false,
    useComputeDensity: true,
    densityFieldResolution: 64,
    densityUpdateInterval: 1,
    emitsVolumetricLight: true,
    volumetricLightRadius: 10.0,
    scatteringIntensity: 0.8,
    layers: {
      whiteHotCore: { enabled: true, intensity: 1.0 },
      innerOrange: { enabled: true, intensity: 1.0 },
      midFlame: { enabled: true, intensity: 1.0 },
      outerGlow: { enabled: true, intensity: 1.0 },
      tendrils: { enabled: true, intensity: 1.0 },
      heatHaze: { enabled: true, intensity: 1.0 },
      embers: { enabled: true, intensity: 1.0 },
      smoke: { enabled: true, intensity: 1.0 },
      edgeGlow: { enabled: true, intensity: 1.0 },
    },
  },
};

/**
 * Default fire configuration (Quest 3 baseline).
 */
export const DEFAULT_FIRE_CONFIG: VolumetricFireConfig = {
  scale: { x: 1.0, y: 2.0, z: 1.0 },
  intensity: 1.0,
  temperature: 2500,
  animationSpeed: 1.0,
  noiseScale: 2.0,
  noiseOctaves: 3,
  turbulence: 0.5,
  windDirection: { x: 0.0, y: 1.0, z: 0.0 },
  windStrength: 0.3,
  qualityLevel: 1,
  maxRaymarchSteps: 24,
  temporalReprojection: true,
  temporalBlendFactor: 0.25,
  foveatedRendering: true,
  useComputeDensity: true,
  densityFieldResolution: 32,
  densityUpdateInterval: 2,
  emitsVolumetricLight: true,
  volumetricLightRadius: 3.0,
  scatteringIntensity: 0.4,
  layers: FIRE_QUALITY_PRESETS.quest3.layers!,
};

// =============================================================================
// HALTON SEQUENCE (for temporal jitter)
// =============================================================================

/**
 * Halton sequence generator for sub-pixel jitter in temporal reprojection.
 * Using bases 2 and 3 for X and Y respectively.
 */
export function haltonSequence(index: number, base: number): number {
  let result = 0.0;
  let f = 1.0 / base;
  let i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  return result;
}

/**
 * Get Halton jitter pair for frame index.
 * Returns [jitterX, jitterY] in [-0.5, 0.5] range.
 */
export function getTemporalJitter(frameIndex: number): [number, number] {
  const sequenceLength = 16;
  const idx = (frameIndex % sequenceLength) + 1;
  return [
    haltonSequence(idx, 2) - 0.5,
    haltonSequence(idx, 3) - 0.5,
  ];
}
