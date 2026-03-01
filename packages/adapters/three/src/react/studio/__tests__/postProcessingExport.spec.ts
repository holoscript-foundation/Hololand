/**
 * Tests for postProcessingExport
 *
 * Verifies HoloScript serialization and round-tripping:
 *   - Full export with all effects
 *   - Minimal export (only enabled effects)
 *   - Parse round-trip accuracy
 *   - Custom trait names
 *   - Edge cases (all disabled, extreme values)
 *
 * @module studio/__tests__/postProcessingExport.spec
 */

import { describe, it, expect } from 'vitest';
import {
  exportPostProcessingToHoloScript,
  exportPostProcessingMinimal,
  parsePostProcessingFromHoloScript,
} from '../postProcessingExport';
import {
  DEFAULT_POST_PROCESSING,
  DEFAULT_BLOOM,
  DEFAULT_DEPTH_OF_FIELD,
  DEFAULT_MOTION_BLUR,
  DEFAULT_COLOR_GRADING,
  type PostProcessingSettings,
} from '../PostProcessingTypes';

// =============================================================================
// HELPERS
// =============================================================================

function makeSettings(overrides: Partial<PostProcessingSettings> = {}): PostProcessingSettings {
  return {
    bloom: { ...(overrides.bloom || DEFAULT_BLOOM) },
    depthOfField: { ...(overrides.depthOfField || DEFAULT_DEPTH_OF_FIELD) },
    motionBlur: { ...(overrides.motionBlur || DEFAULT_MOTION_BLUR) },
    colorGrading: { ...(overrides.colorGrading || DEFAULT_COLOR_GRADING) },
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('exportPostProcessingToHoloScript', () => {
  it('should produce a valid HoloScript trait block', () => {
    const source = exportPostProcessingToHoloScript(DEFAULT_POST_PROCESSING);

    expect(source).toContain('@post_processing {');
    expect(source).toContain('bloom_enabled: false');
    expect(source).toContain('dof_enabled: false');
    expect(source).toContain('motion_blur_enabled: false');
    expect(source).toContain('color_grading_enabled: false');
    expect(source.endsWith('}')).toBe(true);
  });

  it('should include all bloom parameters when bloom is enabled', () => {
    const settings = makeSettings({
      bloom: { enabled: true, intensity: 2.5, threshold: 0.7, smoothing: 0.1, radius: 10 },
    });

    const source = exportPostProcessingToHoloScript(settings);

    expect(source).toContain('bloom_enabled: true');
    expect(source).toContain('bloom_intensity: 2.5');
    expect(source).toContain('bloom_threshold: 0.7');
    expect(source).toContain('bloom_smoothing: 0.1');
    expect(source).toContain('bloom_radius: 10');
  });

  it('should omit bloom detail lines when bloom is disabled', () => {
    const settings = makeSettings({
      bloom: { enabled: false, intensity: 2.5, threshold: 0.7, smoothing: 0.1, radius: 10 },
    });

    const source = exportPostProcessingToHoloScript(settings);

    expect(source).toContain('bloom_enabled: false');
    expect(source).not.toContain('bloom_intensity');
  });

  it('should include DOF parameters when enabled', () => {
    const settings = makeSettings({
      depthOfField: {
        enabled: true,
        focusDistance: 15.5,
        focalLength: 85,
        aperture: 1.8,
        bokehBlades: 7,
      },
    });

    const source = exportPostProcessingToHoloScript(settings);

    expect(source).toContain('dof_enabled: true');
    expect(source).toContain('dof_focus_distance: 15.5');
    expect(source).toContain('dof_focal_length: 85');
    expect(source).toContain('dof_aperture: 1.8');
    expect(source).toContain('dof_bokeh_blades: 7');
  });

  it('should include color grading RGB triplets', () => {
    const settings = makeSettings({
      colorGrading: {
        ...DEFAULT_COLOR_GRADING,
        enabled: true,
        shadows: [0.4, 0.35, 0.55],
        midtones: [0.5, 0.45, 0.55],
        highlights: [0.55, 0.5, 0.6],
      },
    });

    const source = exportPostProcessingToHoloScript(settings);

    expect(source).toContain('shadows: [0.4, 0.35, 0.55]');
    expect(source).toContain('midtones: [0.5, 0.45, 0.55]');
    expect(source).toContain('highlights: [0.55, 0.5, 0.6]');
  });

  it('should include vignette when intensity > 0', () => {
    const settings = makeSettings({
      colorGrading: {
        ...DEFAULT_COLOR_GRADING,
        enabled: true,
        vignetteIntensity: 0.3,
        vignetteSmoothness: 0.6,
      },
    });

    const source = exportPostProcessingToHoloScript(settings);

    expect(source).toContain('vignette_intensity: 0.3');
    expect(source).toContain('vignette_smoothness: 0.6');
  });

  it('should omit vignette when intensity is 0', () => {
    const settings = makeSettings({
      colorGrading: {
        ...DEFAULT_COLOR_GRADING,
        enabled: true,
        vignetteIntensity: 0,
      },
    });

    const source = exportPostProcessingToHoloScript(settings);

    expect(source).not.toContain('vignette_intensity');
  });

  it('should use a custom trait name', () => {
    const source = exportPostProcessingToHoloScript(DEFAULT_POST_PROCESSING, 'scene_fx');

    expect(source).toContain('@scene_fx {');
    expect(source).not.toContain('@post_processing');
  });

  it('should include section comments', () => {
    const source = exportPostProcessingToHoloScript(DEFAULT_POST_PROCESSING);

    expect(source).toContain('// Bloom');
    expect(source).toContain('// Depth of Field');
    expect(source).toContain('// Motion Blur');
    expect(source).toContain('// Color Grading');
  });
});

describe('exportPostProcessingMinimal', () => {
  it('should produce empty block when all effects disabled', () => {
    const source = exportPostProcessingMinimal(DEFAULT_POST_PROCESSING);

    expect(source).toContain('@post_processing {');
    expect(source).toContain('}');
    // Should NOT contain any _enabled lines since all are disabled
    expect(source).not.toContain('bloom_intensity');
    expect(source).not.toContain('dof_focus_distance');
  });

  it('should only include enabled effects', () => {
    const settings = makeSettings({
      bloom: { ...DEFAULT_BLOOM, enabled: true, intensity: 2.0 },
      // DOF disabled
      motionBlur: { ...DEFAULT_MOTION_BLUR, enabled: true, intensity: 0.7 },
      // Color grading disabled
    });

    const source = exportPostProcessingMinimal(settings);

    expect(source).toContain('bloom_enabled: true');
    expect(source).toContain('bloom_intensity: 2');
    expect(source).toContain('motion_blur_enabled: true');
    expect(source).toContain('motion_blur_intensity: 0.7');
    expect(source).not.toContain('dof_enabled');
    expect(source).not.toContain('color_grading_enabled');
  });
});

describe('parsePostProcessingFromHoloScript', () => {
  it('should parse bloom settings from HoloScript source', () => {
    const source = `@post_processing {
  bloom_enabled: true
  bloom_intensity: 2.5
  bloom_threshold: 0.7
  bloom_smoothing: 0.1
  bloom_radius: 10
}`;

    const result = parsePostProcessingFromHoloScript(source);

    expect(result.bloom?.enabled).toBe(true);
    expect(result.bloom?.intensity).toBe(2.5);
    expect(result.bloom?.threshold).toBe(0.7);
    expect(result.bloom?.smoothing).toBe(0.1);
    expect(result.bloom?.radius).toBe(10);
  });

  it('should parse DOF settings', () => {
    const source = `@fx {
  dof_enabled: true
  dof_focus_distance: 15.5
  dof_focal_length: 85
  dof_aperture: 1.8
  dof_bokeh_blades: 7
}`;

    const result = parsePostProcessingFromHoloScript(source);

    expect(result.depthOfField?.enabled).toBe(true);
    expect(result.depthOfField?.focusDistance).toBe(15.5);
    expect(result.depthOfField?.focalLength).toBe(85);
    expect(result.depthOfField?.aperture).toBe(1.8);
    expect(result.depthOfField?.bokehBlades).toBe(7);
  });

  it('should parse color grading with RGB arrays', () => {
    const source = `@post_processing {
  color_grading_enabled: true
  exposure: 0.5
  contrast: 0.2
  saturation: -0.1
  temperature: 5500
  tint: 0.05
  shadows: [0.4, 0.35, 0.55]
  midtones: [0.5, 0.45, 0.55]
  highlights: [0.55, 0.5, 0.6]
  vignette_intensity: 0.3
  vignette_smoothness: 0.6
}`;

    const result = parsePostProcessingFromHoloScript(source);

    expect(result.colorGrading?.enabled).toBe(true);
    expect(result.colorGrading?.exposure).toBe(0.5);
    expect(result.colorGrading?.contrast).toBe(0.2);
    expect(result.colorGrading?.saturation).toBe(-0.1);
    expect(result.colorGrading?.temperature).toBe(5500);
    expect(result.colorGrading?.tint).toBe(0.05);
    expect(result.colorGrading?.shadows).toEqual([0.4, 0.35, 0.55]);
    expect(result.colorGrading?.midtones).toEqual([0.5, 0.45, 0.55]);
    expect(result.colorGrading?.highlights).toEqual([0.55, 0.5, 0.6]);
    expect(result.colorGrading?.vignetteIntensity).toBe(0.3);
    expect(result.colorGrading?.vignetteSmoothness).toBe(0.6);
  });

  it('should round-trip through export and parse', () => {
    const original = makeSettings({
      bloom: { enabled: true, intensity: 2.5, threshold: 0.7, smoothing: 0.1, radius: 10 },
      depthOfField: {
        enabled: true,
        focusDistance: 15,
        focalLength: 85,
        aperture: 1.8,
        bokehBlades: 7,
      },
      motionBlur: { enabled: true, intensity: 0.5, samples: 8 },
      colorGrading: {
        enabled: true,
        exposure: 0.1,
        contrast: 0.15,
        saturation: -0.1,
        temperature: 5800,
        tint: 0.05,
        shadows: [0.45, 0.42, 0.5],
        midtones: [0.5, 0.5, 0.5],
        highlights: [0.55, 0.52, 0.48],
        vignetteIntensity: 0.3,
        vignetteSmoothness: 0.6,
      },
    });

    const source = exportPostProcessingToHoloScript(original);
    const parsed = parsePostProcessingFromHoloScript(source);

    // Bloom
    expect(parsed.bloom?.enabled).toBe(original.bloom.enabled);
    expect(parsed.bloom?.intensity).toBe(original.bloom.intensity);
    expect(parsed.bloom?.threshold).toBe(original.bloom.threshold);

    // DOF
    expect(parsed.depthOfField?.enabled).toBe(original.depthOfField.enabled);
    expect(parsed.depthOfField?.focusDistance).toBe(original.depthOfField.focusDistance);
    expect(parsed.depthOfField?.aperture).toBe(original.depthOfField.aperture);

    // Motion blur
    expect(parsed.motionBlur?.enabled).toBe(original.motionBlur.enabled);
    expect(parsed.motionBlur?.intensity).toBe(original.motionBlur.intensity);
    expect(parsed.motionBlur?.samples).toBe(original.motionBlur.samples);

    // Color grading
    expect(parsed.colorGrading?.enabled).toBe(original.colorGrading.enabled);
    expect(parsed.colorGrading?.exposure).toBe(original.colorGrading.exposure);
    expect(parsed.colorGrading?.temperature).toBe(original.colorGrading.temperature);
    expect(parsed.colorGrading?.shadows).toEqual(original.colorGrading.shadows);
  });

  it('should return empty result for source with no recognized keys', () => {
    const source = `@unrelated {
  foo: bar
  baz: 42
}`;

    const result = parsePostProcessingFromHoloScript(source);

    expect(Object.keys(result)).toHaveLength(0);
  });

  it('should handle comments in source gracefully', () => {
    const source = `@post_processing {
  // Bloom settings
  bloom_enabled: true
  bloom_intensity: 1.5
  // This line is a comment
}`;

    const result = parsePostProcessingFromHoloScript(source);

    expect(result.bloom?.enabled).toBe(true);
    expect(result.bloom?.intensity).toBe(1.5);
  });
});
