/**
 * Post-Processing HoloScript Export
 *
 * Serializes PostProcessingSettings into HoloScript trait property syntax
 * so the Studio IDE user can copy/paste into .hsplus files or programmatically
 * inject post-processing configuration into a scene composition.
 *
 * Output follows the HoloScript trait annotation + property block format:
 * ```hsplus
 * @post_processing {
 *   bloom_enabled: true
 *   bloom_intensity: 1.0
 *   ...
 * }
 * ```
 *
 * @module studio/postProcessingExport
 */

import type {
  PostProcessingSettings,
  BloomSettings,
  DepthOfFieldSettings,
  MotionBlurSettings,
  ColorGradingSettings,
} from './PostProcessingTypes';

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

/** Round a number to n decimal places, avoiding floating-point noise */
function round(value: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Format a number for HoloScript output (no trailing zeros beyond 3dp) */
function fmt(value: number): string {
  const r = round(value);
  // For integers, drop the decimal
  if (Number.isInteger(r)) return String(r);
  return String(r);
}

/** Format an RGB triple as a HoloScript array literal */
function fmtRGB(rgb: [number, number, number]): string {
  return `[${fmt(rgb[0])}, ${fmt(rgb[1])}, ${fmt(rgb[2])}]`;
}

// =============================================================================
// SECTION BUILDERS
// =============================================================================

function buildBloomLines(bloom: BloomSettings, indent: string): string[] {
  const lines: string[] = [];
  lines.push(`${indent}bloom_enabled: ${bloom.enabled}`);
  if (bloom.enabled) {
    lines.push(`${indent}bloom_intensity: ${fmt(bloom.intensity)}`);
    lines.push(`${indent}bloom_threshold: ${fmt(bloom.threshold)}`);
    lines.push(`${indent}bloom_smoothing: ${fmt(bloom.smoothing)}`);
    lines.push(`${indent}bloom_radius: ${fmt(bloom.radius)}`);
  }
  return lines;
}

function buildDepthOfFieldLines(dof: DepthOfFieldSettings, indent: string): string[] {
  const lines: string[] = [];
  lines.push(`${indent}dof_enabled: ${dof.enabled}`);
  if (dof.enabled) {
    lines.push(`${indent}dof_focus_distance: ${fmt(dof.focusDistance)}`);
    lines.push(`${indent}dof_focal_length: ${fmt(dof.focalLength)}`);
    lines.push(`${indent}dof_aperture: ${fmt(dof.aperture)}`);
    lines.push(`${indent}dof_bokeh_blades: ${fmt(dof.bokehBlades)}`);
  }
  return lines;
}

function buildMotionBlurLines(mb: MotionBlurSettings, indent: string): string[] {
  const lines: string[] = [];
  lines.push(`${indent}motion_blur_enabled: ${mb.enabled}`);
  if (mb.enabled) {
    lines.push(`${indent}motion_blur_intensity: ${fmt(mb.intensity)}`);
    lines.push(`${indent}motion_blur_samples: ${fmt(mb.samples)}`);
  }
  return lines;
}

function buildColorGradingLines(cg: ColorGradingSettings, indent: string): string[] {
  const lines: string[] = [];
  lines.push(`${indent}color_grading_enabled: ${cg.enabled}`);
  if (cg.enabled) {
    lines.push(`${indent}exposure: ${fmt(cg.exposure)}`);
    lines.push(`${indent}contrast: ${fmt(cg.contrast)}`);
    lines.push(`${indent}saturation: ${fmt(cg.saturation)}`);
    lines.push(`${indent}temperature: ${fmt(cg.temperature)}`);
    lines.push(`${indent}tint: ${fmt(cg.tint)}`);
    lines.push(`${indent}shadows: ${fmtRGB(cg.shadows)}`);
    lines.push(`${indent}midtones: ${fmtRGB(cg.midtones)}`);
    lines.push(`${indent}highlights: ${fmtRGB(cg.highlights)}`);
    if (cg.vignetteIntensity > 0) {
      lines.push(`${indent}vignette_intensity: ${fmt(cg.vignetteIntensity)}`);
      lines.push(`${indent}vignette_smoothness: ${fmt(cg.vignetteSmoothness)}`);
    }
  }
  return lines;
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

/**
 * Serialize the complete PostProcessingSettings into a HoloScript trait block.
 *
 * @param settings   The post-processing settings to export
 * @param traitName  Custom trait annotation name (default: 'post_processing')
 * @returns          HoloScript source string
 *
 * @example
 * ```ts
 * const source = exportPostProcessingToHoloScript(settings);
 * // =>
 * // @post_processing {
 * //   bloom_enabled: true
 * //   bloom_intensity: 1.0
 * //   ...
 * // }
 * ```
 */
export function exportPostProcessingToHoloScript(
  settings: PostProcessingSettings,
  traitName: string = 'post_processing',
): string {
  const indent = '  ';
  const lines: string[] = [];

  lines.push(`@${traitName} {`);

  // Bloom section
  lines.push(`${indent}// Bloom`);
  lines.push(...buildBloomLines(settings.bloom, indent));
  lines.push('');

  // DOF section
  lines.push(`${indent}// Depth of Field`);
  lines.push(...buildDepthOfFieldLines(settings.depthOfField, indent));
  lines.push('');

  // Motion Blur section
  lines.push(`${indent}// Motion Blur`);
  lines.push(...buildMotionBlurLines(settings.motionBlur, indent));
  lines.push('');

  // Color Grading section
  lines.push(`${indent}// Color Grading`);
  lines.push(...buildColorGradingLines(settings.colorGrading, indent));

  lines.push('}');

  return lines.join('\n');
}

/**
 * Export only the enabled effects as a minimal HoloScript block.
 * Skips entire sections whose enabled flag is false.
 */
export function exportPostProcessingMinimal(
  settings: PostProcessingSettings,
  traitName: string = 'post_processing',
): string {
  const indent = '  ';
  const lines: string[] = [];

  lines.push(`@${traitName} {`);

  if (settings.bloom.enabled) {
    lines.push(...buildBloomLines(settings.bloom, indent));
  }
  if (settings.depthOfField.enabled) {
    lines.push(...buildDepthOfFieldLines(settings.depthOfField, indent));
  }
  if (settings.motionBlur.enabled) {
    lines.push(...buildMotionBlurLines(settings.motionBlur, indent));
  }
  if (settings.colorGrading.enabled) {
    lines.push(...buildColorGradingLines(settings.colorGrading, indent));
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Parse a HoloScript post-processing trait block back into settings.
 * Useful for round-tripping or loading from .hsplus files.
 *
 * @param source  HoloScript source containing a @post_processing block
 * @returns       Partial settings (only fields present in source)
 */
export function parsePostProcessingFromHoloScript(
  source: string,
): Partial<PostProcessingSettings> {
  const result: Partial<PostProcessingSettings> = {};
  const bloom: Partial<BloomSettings> = {};
  const dof: Partial<DepthOfFieldSettings> = {};
  const mb: Partial<MotionBlurSettings> = {};
  const cg: Partial<ColorGradingSettings> = {};

  // Match key: value lines
  const lineRegex = /^\s*([\w_]+)\s*:\s*(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = lineRegex.exec(source)) !== null) {
    const key = match[1];
    const rawVal = match[2].trim();

    const parseBool = (v: string) => v === 'true';
    const parseNum = (v: string) => parseFloat(v);
    const parseRGB = (v: string): [number, number, number] => {
      const nums = v.replace(/[\[\]]/g, '').split(',').map((s) => parseFloat(s.trim()));
      return [nums[0] ?? 0.5, nums[1] ?? 0.5, nums[2] ?? 0.5];
    };

    switch (key) {
      // Bloom
      case 'bloom_enabled': bloom.enabled = parseBool(rawVal); break;
      case 'bloom_intensity': bloom.intensity = parseNum(rawVal); break;
      case 'bloom_threshold': bloom.threshold = parseNum(rawVal); break;
      case 'bloom_smoothing': bloom.smoothing = parseNum(rawVal); break;
      case 'bloom_radius': bloom.radius = parseNum(rawVal); break;
      // DOF
      case 'dof_enabled': dof.enabled = parseBool(rawVal); break;
      case 'dof_focus_distance': dof.focusDistance = parseNum(rawVal); break;
      case 'dof_focal_length': dof.focalLength = parseNum(rawVal); break;
      case 'dof_aperture': dof.aperture = parseNum(rawVal); break;
      case 'dof_bokeh_blades': dof.bokehBlades = parseNum(rawVal); break;
      // Motion Blur
      case 'motion_blur_enabled': mb.enabled = parseBool(rawVal); break;
      case 'motion_blur_intensity': mb.intensity = parseNum(rawVal); break;
      case 'motion_blur_samples': mb.samples = parseNum(rawVal); break;
      // Color Grading
      case 'color_grading_enabled': cg.enabled = parseBool(rawVal); break;
      case 'exposure': cg.exposure = parseNum(rawVal); break;
      case 'contrast': cg.contrast = parseNum(rawVal); break;
      case 'saturation': cg.saturation = parseNum(rawVal); break;
      case 'temperature': cg.temperature = parseNum(rawVal); break;
      case 'tint': cg.tint = parseNum(rawVal); break;
      case 'shadows': cg.shadows = parseRGB(rawVal); break;
      case 'midtones': cg.midtones = parseRGB(rawVal); break;
      case 'highlights': cg.highlights = parseRGB(rawVal); break;
      case 'vignette_intensity': cg.vignetteIntensity = parseNum(rawVal); break;
      case 'vignette_smoothness': cg.vignetteSmoothness = parseNum(rawVal); break;
    }
  }

  if (Object.keys(bloom).length > 0) result.bloom = bloom as BloomSettings;
  if (Object.keys(dof).length > 0) result.depthOfField = dof as DepthOfFieldSettings;
  if (Object.keys(mb).length > 0) result.motionBlur = mb as MotionBlurSettings;
  if (Object.keys(cg).length > 0) result.colorGrading = cg as ColorGradingSettings;

  return result;
}
