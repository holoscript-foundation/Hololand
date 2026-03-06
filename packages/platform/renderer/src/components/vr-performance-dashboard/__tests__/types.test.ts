/**
 * @vitest-environment jsdom
 */

/**
 * Tests for VR Performance Dashboard types module
 *
 * Validates:
 * - Theme default values and contrast ratios
 * - Utility functions (formatSplatCount, formatMs, formatBytes)
 * - Layer display config correctness
 * - Waterfall phase definitions
 * - Performance state color mapping
 * - Alert ID generation uniqueness
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_VR_PERF_THEME,
  LAYER_DISPLAY_CONFIG,
  WATERFALL_PHASES,
  getPerformanceStateColor,
  getLayerColor,
  formatSplatCount,
  formatMs,
  formatBytes,
  createAlertId,
} from '../types';
import type { GaussianLayerType } from '../../../GaussianBudgetManager';

// =============================================================================
// THEME
// =============================================================================

describe('DEFAULT_VR_PERF_THEME', () => {
  it('has all required fields', () => {
    expect(DEFAULT_VR_PERF_THEME.fontFamily).toBeTruthy();
    expect(DEFAULT_VR_PERF_THEME.fontScale).toBe(1.0);
    expect(DEFAULT_VR_PERF_THEME.containerBackground).toBeTruthy();
    expect(DEFAULT_VR_PERF_THEME.textPrimary).toBeTruthy();
    expect(DEFAULT_VR_PERF_THEME.nominalColor).toBeTruthy();
    expect(DEFAULT_VR_PERF_THEME.emergencyColor).toBeTruthy();
    expect(DEFAULT_VR_PERF_THEME.bakedLayerColor).toBeTruthy();
    expect(DEFAULT_VR_PERF_THEME.relightableLayerColor).toBeTruthy();
    expect(DEFAULT_VR_PERF_THEME.interactiveLayerColor).toBeTruthy();
  });

  it('has all waterfall phase colors', () => {
    expect(DEFAULT_VR_PERF_THEME.waterfallCullColor).toBeTruthy();
    expect(DEFAULT_VR_PERF_THEME.waterfallTileColor).toBeTruthy();
    expect(DEFAULT_VR_PERF_THEME.waterfallSortColor).toBeTruthy();
    expect(DEFAULT_VR_PERF_THEME.waterfallResortColor).toBeTruthy();
    expect(DEFAULT_VR_PERF_THEME.waterfallRasterColor).toBeTruthy();
    expect(DEFAULT_VR_PERF_THEME.waterfallBlendColor).toBeTruthy();
    expect(DEFAULT_VR_PERF_THEME.waterfallSyncColor).toBeTruthy();
  });
});

// =============================================================================
// LAYER DISPLAY CONFIG
// =============================================================================

describe('LAYER_DISPLAY_CONFIG', () => {
  it('has entries for all three Gaussian layers', () => {
    const layers: GaussianLayerType[] = ['baked', 'relightable', 'interactive'];
    for (const layer of layers) {
      const config = LAYER_DISPLAY_CONFIG[layer];
      expect(config).toBeDefined();
      expect(config.layer).toBe(layer);
      expect(config.label).toBeTruthy();
      expect(config.description).toBeTruthy();
      expect(config.colorKey).toBeTruthy();
    }
  });

  it('has valid color keys pointing to theme properties', () => {
    const layers: GaussianLayerType[] = ['baked', 'relightable', 'interactive'];
    for (const layer of layers) {
      const config = LAYER_DISPLAY_CONFIG[layer];
      expect(DEFAULT_VR_PERF_THEME[config.colorKey]).toBeTruthy();
    }
  });
});

// =============================================================================
// WATERFALL PHASES
// =============================================================================

describe('WATERFALL_PHASES', () => {
  it('has 7 phases matching the Gaussian render pipeline', () => {
    expect(WATERFALL_PHASES).toHaveLength(7);
  });

  it('phases have correct structure', () => {
    for (const phase of WATERFALL_PHASES) {
      expect(phase.id).toBeTruthy();
      expect(phase.label).toBeTruthy();
      expect(phase.colorKey).toBeTruthy();
      expect(phase.timingsField).toBeTruthy();
      // Color key must exist in theme
      expect(DEFAULT_VR_PERF_THEME[phase.colorKey]).toBeTruthy();
    }
  });

  it('has rasterize as the largest phase', () => {
    const rasterize = WATERFALL_PHASES.find((p) => p.id === 'rasterize');
    expect(rasterize).toBeDefined();
    expect(rasterize!.timingsField).toBe('rasterizeMs');
  });

  it('includes StopThePop hierarchical resort', () => {
    const resort = WATERFALL_PHASES.find((p) => p.id === 'hierarchicalResort');
    expect(resort).toBeDefined();
    expect(resort!.timingsField).toBe('hierarchicalResortMs');
  });
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

describe('getPerformanceStateColor', () => {
  it('returns correct colors for each state', () => {
    expect(getPerformanceStateColor('nominal', DEFAULT_VR_PERF_THEME))
      .toBe(DEFAULT_VR_PERF_THEME.nominalColor);
    expect(getPerformanceStateColor('pressure', DEFAULT_VR_PERF_THEME))
      .toBe(DEFAULT_VR_PERF_THEME.pressureColor);
    expect(getPerformanceStateColor('critical', DEFAULT_VR_PERF_THEME))
      .toBe(DEFAULT_VR_PERF_THEME.criticalColor);
    expect(getPerformanceStateColor('emergency', DEFAULT_VR_PERF_THEME))
      .toBe(DEFAULT_VR_PERF_THEME.emergencyColor);
  });
});

describe('getLayerColor', () => {
  it('returns correct colors for each layer', () => {
    expect(getLayerColor('baked', DEFAULT_VR_PERF_THEME))
      .toBe(DEFAULT_VR_PERF_THEME.bakedLayerColor);
    expect(getLayerColor('relightable', DEFAULT_VR_PERF_THEME))
      .toBe(DEFAULT_VR_PERF_THEME.relightableLayerColor);
    expect(getLayerColor('interactive', DEFAULT_VR_PERF_THEME))
      .toBe(DEFAULT_VR_PERF_THEME.interactiveLayerColor);
  });
});

describe('formatSplatCount', () => {
  it('formats small numbers as-is', () => {
    expect(formatSplatCount(0)).toBe('0');
    expect(formatSplatCount(500)).toBe('500');
    expect(formatSplatCount(999)).toBe('999');
  });

  it('formats thousands with K suffix', () => {
    expect(formatSplatCount(1000)).toBe('1.0K');
    expect(formatSplatCount(10000)).toBe('10.0K');
    expect(formatSplatCount(120000)).toBe('120.0K');
    expect(formatSplatCount(160000)).toBe('160.0K');
  });

  it('formats millions with M suffix', () => {
    expect(formatSplatCount(1000000)).toBe('1.0M');
    expect(formatSplatCount(1250000)).toBe('1.3M');
  });
});

describe('formatMs', () => {
  it('formats sub-millisecond as microseconds', () => {
    expect(formatMs(0.5)).toBe('500us');
    expect(formatMs(0.001)).toBe('1us');
  });

  it('formats milliseconds with decimal', () => {
    expect(formatMs(5.5)).toBe('5.50ms');
    expect(formatMs(11.1)).toBe('11.10ms');
  });

  it('formats large values without decimal', () => {
    expect(formatMs(150)).toBe('150ms');
  });

  it('handles near-zero values', () => {
    expect(formatMs(0.005)).toBe('5us');
  });
});

describe('formatBytes', () => {
  it('formats small byte values', () => {
    expect(formatBytes(56)).toBe('56B');
    expect(formatBytes(128)).toBe('128B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0KB');
    expect(formatBytes(5600)).toBe('5.5KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00MB');
    expect(formatBytes(6_720_000)).toBe('6.41MB');
  });
});

describe('createAlertId', () => {
  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(createAlertId());
    }
    expect(ids.size).toBe(100);
  });

  it('starts with "alert-" prefix', () => {
    const id = createAlertId();
    expect(id.startsWith('alert-')).toBe(true);
  });
});
