/**
 * Post-Processing Types for Studio IDE
 *
 * Defines the type system for real-time post-processing preview controls
 * in the Studio IDE viewport. Covers bloom, depth of field, motion blur,
 * and color grading settings with serialization to HoloScript trait properties.
 *
 * @module studio/PostProcessingTypes
 */

// =============================================================================
// BLOOM SETTINGS
// =============================================================================

/** Bloom (glow) effect parameters */
export interface BloomSettings {
  /** Whether bloom is enabled */
  enabled: boolean;
  /** Bloom intensity multiplier (0-5, default: 1.0) */
  intensity: number;
  /** Luminance threshold: pixels below this brightness are excluded (0-1, default: 0.9) */
  threshold: number;
  /** Softness of the threshold transition (0-1, default: 0.025) */
  smoothing: number;
  /** Blur radius in pixels (1-20, default: 5) */
  radius: number;
}

// =============================================================================
// DEPTH OF FIELD SETTINGS
// =============================================================================

/** Depth of field (bokeh) effect parameters */
export interface DepthOfFieldSettings {
  /** Whether depth of field is enabled */
  enabled: boolean;
  /** Focus distance from camera in world units (0.1-100, default: 10) */
  focusDistance: number;
  /** Focal length in mm, affects bokeh size (10-200, default: 50) */
  focalLength: number;
  /** Aperture f-stop, lower = more blur (0.5-22, default: 2.8) */
  aperture: number;
  /** Number of bokeh blade shapes (3-9, default: 6) */
  bokehBlades: number;
}

// =============================================================================
// MOTION BLUR SETTINGS
// =============================================================================

/** Motion blur effect parameters */
export interface MotionBlurSettings {
  /** Whether motion blur is enabled */
  enabled: boolean;
  /** Blur intensity / shutter angle (0-1, default: 0.5) */
  intensity: number;
  /** Number of samples for quality (1-16, default: 8) */
  samples: number;
}

// =============================================================================
// COLOR GRADING SETTINGS
// =============================================================================

/** Color grading / tone-mapping parameters */
export interface ColorGradingSettings {
  /** Whether color grading is enabled */
  enabled: boolean;
  /** Exposure compensation in EV (-5 to 5, default: 0) */
  exposure: number;
  /** Contrast adjustment (-1 to 1, default: 0) */
  contrast: number;
  /** Saturation adjustment (-1 to 1, default: 0) */
  saturation: number;
  /** Color temperature shift in Kelvin (1000-15000, default: 6500) */
  temperature: number;
  /** Tint shift green-magenta (-1 to 1, default: 0) */
  tint: number;
  /** Shadow lift RGB [r, g, b] each 0-1 */
  shadows: [number, number, number];
  /** Midtone adjustment RGB [r, g, b] each 0-1 */
  midtones: [number, number, number];
  /** Highlight gain RGB [r, g, b] each 0-1 */
  highlights: [number, number, number];
  /** Vignette intensity (0-1, default: 0) */
  vignetteIntensity: number;
  /** Vignette smoothness (0-1, default: 0.5) */
  vignetteSmoothness: number;
}

// =============================================================================
// COMBINED POST-PROCESSING SETTINGS
// =============================================================================

/** Complete post-processing configuration */
export interface PostProcessingSettings {
  /** Bloom (glow) effect */
  bloom: BloomSettings;
  /** Depth of field (bokeh) effect */
  depthOfField: DepthOfFieldSettings;
  /** Motion blur effect */
  motionBlur: MotionBlurSettings;
  /** Color grading / tone-mapping */
  colorGrading: ColorGradingSettings;
}

// =============================================================================
// DEFAULTS
// =============================================================================

export const DEFAULT_BLOOM: BloomSettings = {
  enabled: false,
  intensity: 1.0,
  threshold: 0.9,
  smoothing: 0.025,
  radius: 5,
};

export const DEFAULT_DEPTH_OF_FIELD: DepthOfFieldSettings = {
  enabled: false,
  focusDistance: 10,
  focalLength: 50,
  aperture: 2.8,
  bokehBlades: 6,
};

export const DEFAULT_MOTION_BLUR: MotionBlurSettings = {
  enabled: false,
  intensity: 0.5,
  samples: 8,
};

export const DEFAULT_COLOR_GRADING: ColorGradingSettings = {
  enabled: false,
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 6500,
  tint: 0,
  shadows: [0.5, 0.5, 0.5],
  midtones: [0.5, 0.5, 0.5],
  highlights: [0.5, 0.5, 0.5],
  vignetteIntensity: 0,
  vignetteSmoothness: 0.5,
};

export const DEFAULT_POST_PROCESSING: PostProcessingSettings = {
  bloom: { ...DEFAULT_BLOOM },
  depthOfField: { ...DEFAULT_DEPTH_OF_FIELD },
  motionBlur: { ...DEFAULT_MOTION_BLUR },
  colorGrading: { ...DEFAULT_COLOR_GRADING },
};

// =============================================================================
// SLIDER RANGE METADATA
// =============================================================================

/** Describes the allowed range for a numeric post-processing parameter */
export interface SliderRange {
  min: number;
  max: number;
  step: number;
  label: string;
  unit?: string;
}

/** Range metadata for every slider across all effect groups */
export const SLIDER_RANGES: Record<string, Record<string, SliderRange>> = {
  bloom: {
    intensity: { min: 0, max: 5, step: 0.05, label: 'Intensity' },
    threshold: { min: 0, max: 1, step: 0.01, label: 'Threshold' },
    smoothing: { min: 0, max: 1, step: 0.005, label: 'Smoothing' },
    radius: { min: 1, max: 20, step: 0.5, label: 'Radius', unit: 'px' },
  },
  depthOfField: {
    focusDistance: { min: 0.1, max: 100, step: 0.1, label: 'Focus Distance', unit: 'm' },
    focalLength: { min: 10, max: 200, step: 1, label: 'Focal Length', unit: 'mm' },
    aperture: { min: 0.5, max: 22, step: 0.1, label: 'Aperture', unit: 'f/' },
    bokehBlades: { min: 3, max: 9, step: 1, label: 'Bokeh Blades' },
  },
  motionBlur: {
    intensity: { min: 0, max: 1, step: 0.01, label: 'Intensity' },
    samples: { min: 1, max: 16, step: 1, label: 'Samples' },
  },
  colorGrading: {
    exposure: { min: -5, max: 5, step: 0.05, label: 'Exposure', unit: 'EV' },
    contrast: { min: -1, max: 1, step: 0.01, label: 'Contrast' },
    saturation: { min: -1, max: 1, step: 0.01, label: 'Saturation' },
    temperature: { min: 1000, max: 15000, step: 100, label: 'Temperature', unit: 'K' },
    tint: { min: -1, max: 1, step: 0.01, label: 'Tint' },
    vignetteIntensity: { min: 0, max: 1, step: 0.01, label: 'Vignette' },
    vignetteSmoothness: { min: 0, max: 1, step: 0.01, label: 'Vignette Smoothness' },
  },
};

// =============================================================================
// PRESETS
// =============================================================================

/** Named post-processing preset */
export interface PostProcessingPreset {
  /** Preset display name */
  name: string;
  /** Human-readable description */
  description: string;
  /** The settings to apply */
  settings: PostProcessingSettings;
}

/** Built-in presets for common post-processing looks */
export const BUILT_IN_PRESETS: PostProcessingPreset[] = [
  {
    name: 'None',
    description: 'All effects disabled',
    settings: { ...DEFAULT_POST_PROCESSING },
  },
  {
    name: 'Cinematic',
    description: 'Film-like look with subtle bloom and warm grading',
    settings: {
      bloom: { enabled: true, intensity: 0.8, threshold: 0.85, smoothing: 0.1, radius: 8 },
      depthOfField: { enabled: true, focusDistance: 15, focalLength: 85, aperture: 1.8, bokehBlades: 7 },
      motionBlur: { enabled: true, intensity: 0.3, samples: 8 },
      colorGrading: {
        enabled: true, exposure: 0.1, contrast: 0.15, saturation: -0.1,
        temperature: 5800, tint: 0.05,
        shadows: [0.45, 0.42, 0.5],
        midtones: [0.5, 0.5, 0.5],
        highlights: [0.55, 0.52, 0.48],
        vignetteIntensity: 0.3, vignetteSmoothness: 0.6,
      },
    },
  },
  {
    name: 'Neon',
    description: 'Vibrant glow for sci-fi and cyberpunk scenes',
    settings: {
      bloom: { enabled: true, intensity: 3.0, threshold: 0.6, smoothing: 0.2, radius: 12 },
      depthOfField: { enabled: false, focusDistance: 10, focalLength: 50, aperture: 2.8, bokehBlades: 6 },
      motionBlur: { enabled: false, intensity: 0.5, samples: 8 },
      colorGrading: {
        enabled: true, exposure: 0.2, contrast: 0.3, saturation: 0.4,
        temperature: 7500, tint: -0.1,
        shadows: [0.4, 0.35, 0.55],
        midtones: [0.5, 0.45, 0.55],
        highlights: [0.55, 0.5, 0.6],
        vignetteIntensity: 0.15, vignetteSmoothness: 0.5,
      },
    },
  },
  {
    name: 'Dream',
    description: 'Soft, dreamy atmosphere with heavy bloom and shallow DOF',
    settings: {
      bloom: { enabled: true, intensity: 2.0, threshold: 0.7, smoothing: 0.3, radius: 15 },
      depthOfField: { enabled: true, focusDistance: 5, focalLength: 135, aperture: 1.4, bokehBlades: 8 },
      motionBlur: { enabled: false, intensity: 0.5, samples: 8 },
      colorGrading: {
        enabled: true, exposure: 0.3, contrast: -0.1, saturation: -0.2,
        temperature: 7000, tint: 0.0,
        shadows: [0.5, 0.48, 0.55],
        midtones: [0.52, 0.5, 0.53],
        highlights: [0.55, 0.53, 0.56],
        vignetteIntensity: 0.4, vignetteSmoothness: 0.7,
      },
    },
  },
  {
    name: 'Documentary',
    description: 'Natural, balanced look with minimal processing',
    settings: {
      bloom: { enabled: false, intensity: 1.0, threshold: 0.9, smoothing: 0.025, radius: 5 },
      depthOfField: { enabled: true, focusDistance: 20, focalLength: 35, aperture: 5.6, bokehBlades: 6 },
      motionBlur: { enabled: false, intensity: 0.5, samples: 8 },
      colorGrading: {
        enabled: true, exposure: 0, contrast: 0.05, saturation: -0.05,
        temperature: 6500, tint: 0,
        shadows: [0.5, 0.5, 0.5],
        midtones: [0.5, 0.5, 0.5],
        highlights: [0.5, 0.5, 0.5],
        vignetteIntensity: 0, vignetteSmoothness: 0.5,
      },
    },
  },
];

// =============================================================================
// EVENTS
// =============================================================================

/** Events emitted by the post-processing control system */
export interface PostProcessingEvents {
  /** Settings have changed (any field) */
  onChange: (settings: PostProcessingSettings) => void;
  /** A preset was applied */
  onPresetApply: (preset: PostProcessingPreset) => void;
  /** Settings were exported as HoloScript */
  onExport: (holoScriptSource: string) => void;
  /** Settings were reset to defaults */
  onReset: () => void;
}
