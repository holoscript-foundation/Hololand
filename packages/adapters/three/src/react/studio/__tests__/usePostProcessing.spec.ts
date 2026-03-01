/**
 * Tests for usePostProcessing hook
 *
 * Verifies post-processing state management:
 *   - Default settings initialization
 *   - Per-effect partial updates
 *   - Toggle enable/disable for each effect
 *   - Preset application
 *   - Reset to defaults
 *   - HoloScript export
 *   - localStorage persistence
 *   - Derived values (hasActiveEffects, activeEffectCount)
 *
 * @module studio/__tests__/usePostProcessing.spec
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePostProcessing } from '../usePostProcessing';
import {
  DEFAULT_POST_PROCESSING,
  DEFAULT_BLOOM,
  DEFAULT_DEPTH_OF_FIELD,
  DEFAULT_MOTION_BLUR,
  DEFAULT_COLOR_GRADING,
  BUILT_IN_PRESETS,
} from '../PostProcessingTypes';

// =============================================================================
// MOCKS
// =============================================================================

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get _store() { return store; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock the export function since it depends on postProcessingExport
vi.mock('../postProcessingExport', () => ({
  exportPostProcessingToHoloScript: vi.fn((settings: any, traitName?: string) => {
    return `@${traitName || 'post_processing'} {\n  bloom_enabled: ${settings.bloom.enabled}\n}`;
  }),
}));

// =============================================================================
// TESTS
// =============================================================================

describe('usePostProcessing', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  describe('initialization', () => {
    it('should return default settings when no options provided', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      expect(result.current.settings.bloom).toEqual(DEFAULT_BLOOM);
      expect(result.current.settings.depthOfField).toEqual(DEFAULT_DEPTH_OF_FIELD);
      expect(result.current.settings.motionBlur).toEqual(DEFAULT_MOTION_BLUR);
      expect(result.current.settings.colorGrading).toEqual(DEFAULT_COLOR_GRADING);
    });

    it('should respect initialSettings override', () => {
      const { result } = renderHook(() =>
        usePostProcessing({
          persist: false,
          initialSettings: {
            bloom: { ...DEFAULT_BLOOM, enabled: true, intensity: 2.5 },
          },
        }),
      );

      expect(result.current.settings.bloom.enabled).toBe(true);
      expect(result.current.settings.bloom.intensity).toBe(2.5);
      // Other fields should stay default
      expect(result.current.settings.depthOfField).toEqual(DEFAULT_DEPTH_OF_FIELD);
    });

    it('should load from localStorage when persist is true', () => {
      const stored = {
        ...DEFAULT_POST_PROCESSING,
        bloom: { ...DEFAULT_BLOOM, enabled: true, intensity: 3.0 },
      };
      localStorageMock.setItem(
        'hololand-studio-postprocessing',
        JSON.stringify(stored),
      );

      const { result } = renderHook(() =>
        usePostProcessing({ persist: true }),
      );

      expect(result.current.settings.bloom.enabled).toBe(true);
      expect(result.current.settings.bloom.intensity).toBe(3.0);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem(
        'hololand-studio-postprocessing',
        'not valid json!!!',
      );

      const { result } = renderHook(() =>
        usePostProcessing({ persist: true }),
      );

      // Should fall back to defaults
      expect(result.current.settings.bloom).toEqual(DEFAULT_BLOOM);
    });
  });

  // ---------------------------------------------------------------------------
  // Per-effect updates
  // ---------------------------------------------------------------------------

  describe('bloom updates', () => {
    it('should update bloom settings partially', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      act(() => {
        result.current.updateBloom({ intensity: 4.0 });
      });

      expect(result.current.settings.bloom.intensity).toBe(4.0);
      // Other bloom fields unchanged
      expect(result.current.settings.bloom.threshold).toBe(DEFAULT_BLOOM.threshold);
    });

    it('should toggle bloom enabled', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      expect(result.current.settings.bloom.enabled).toBe(false);

      act(() => {
        result.current.toggleBloom();
      });

      expect(result.current.settings.bloom.enabled).toBe(true);

      act(() => {
        result.current.toggleBloom();
      });

      expect(result.current.settings.bloom.enabled).toBe(false);
    });
  });

  describe('depth of field updates', () => {
    it('should update DOF settings partially', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      act(() => {
        result.current.updateDepthOfField({ focusDistance: 25, aperture: 1.4 });
      });

      expect(result.current.settings.depthOfField.focusDistance).toBe(25);
      expect(result.current.settings.depthOfField.aperture).toBe(1.4);
      expect(result.current.settings.depthOfField.focalLength).toBe(
        DEFAULT_DEPTH_OF_FIELD.focalLength,
      );
    });

    it('should toggle DOF enabled', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      act(() => {
        result.current.toggleDepthOfField();
      });

      expect(result.current.settings.depthOfField.enabled).toBe(true);
    });
  });

  describe('motion blur updates', () => {
    it('should update motion blur settings', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      act(() => {
        result.current.updateMotionBlur({ intensity: 0.8, samples: 12 });
      });

      expect(result.current.settings.motionBlur.intensity).toBe(0.8);
      expect(result.current.settings.motionBlur.samples).toBe(12);
    });

    it('should toggle motion blur enabled', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      act(() => {
        result.current.toggleMotionBlur();
      });

      expect(result.current.settings.motionBlur.enabled).toBe(true);
    });
  });

  describe('color grading updates', () => {
    it('should update color grading settings', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      act(() => {
        result.current.updateColorGrading({
          exposure: 1.5,
          contrast: 0.3,
          temperature: 5000,
        });
      });

      expect(result.current.settings.colorGrading.exposure).toBe(1.5);
      expect(result.current.settings.colorGrading.contrast).toBe(0.3);
      expect(result.current.settings.colorGrading.temperature).toBe(5000);
      // Unmodified fields stay default
      expect(result.current.settings.colorGrading.saturation).toBe(
        DEFAULT_COLOR_GRADING.saturation,
      );
    });

    it('should toggle color grading enabled', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      act(() => {
        result.current.toggleColorGrading();
      });

      expect(result.current.settings.colorGrading.enabled).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Presets
  // ---------------------------------------------------------------------------

  describe('presets', () => {
    it('should expose built-in presets', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      expect(result.current.presets.length).toBe(BUILT_IN_PRESETS.length);
      expect(result.current.presets[0].name).toBe('None');
    });

    it('should apply a preset by name', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      act(() => {
        result.current.applyPreset('Cinematic');
      });

      const cinematic = BUILT_IN_PRESETS.find((p) => p.name === 'Cinematic')!;
      expect(result.current.settings.bloom.enabled).toBe(cinematic.settings.bloom.enabled);
      expect(result.current.settings.bloom.intensity).toBe(cinematic.settings.bloom.intensity);
      expect(result.current.activePreset).toBe('Cinematic');
    });

    it('should clear active preset when settings are manually changed', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      act(() => {
        result.current.applyPreset('Neon');
      });

      expect(result.current.activePreset).toBe('Neon');

      act(() => {
        result.current.updateBloom({ intensity: 0.1 });
      });

      expect(result.current.activePreset).toBeNull();
    });

    it('should ignore unknown preset names', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      const before = { ...result.current.settings };

      act(() => {
        result.current.applyPreset('NonExistentPreset');
      });

      // Settings should not change
      expect(result.current.settings.bloom).toEqual(before.bloom);
    });
  });

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  describe('resetAll', () => {
    it('should restore all settings to defaults', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      // Modify everything
      act(() => {
        result.current.updateBloom({ enabled: true, intensity: 5 });
        result.current.updateDepthOfField({ enabled: true, focusDistance: 1 });
        result.current.updateMotionBlur({ enabled: true, intensity: 1 });
        result.current.updateColorGrading({ enabled: true, exposure: 3 });
      });

      // Reset
      act(() => {
        result.current.resetAll();
      });

      expect(result.current.settings.bloom).toEqual(DEFAULT_BLOOM);
      expect(result.current.settings.depthOfField).toEqual(DEFAULT_DEPTH_OF_FIELD);
      expect(result.current.settings.motionBlur).toEqual(DEFAULT_MOTION_BLUR);
      expect(result.current.settings.colorGrading).toEqual(DEFAULT_COLOR_GRADING);
      expect(result.current.activePreset).toBe('None');
    });
  });

  // ---------------------------------------------------------------------------
  // HoloScript export
  // ---------------------------------------------------------------------------

  describe('exportToHoloScript', () => {
    it('should return a HoloScript string', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      let exportedSource: string = '';

      act(() => {
        exportedSource = result.current.exportToHoloScript();
      });

      expect(exportedSource).toContain('@post_processing');
      expect(exportedSource).toContain('bloom_enabled');
    });

    it('should accept a custom trait name', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      let source: string = '';

      act(() => {
        source = result.current.exportToHoloScript('my_fx');
      });

      expect(source).toContain('@my_fx');
    });

    it('should call onExport callback', () => {
      const onExport = vi.fn();
      const { result } = renderHook(() =>
        usePostProcessing({ persist: false, onExport }),
      );

      act(() => {
        result.current.exportToHoloScript();
      });

      expect(onExport).toHaveBeenCalledTimes(1);
      expect(typeof onExport.mock.calls[0][0]).toBe('string');
    });
  });

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  describe('persistence', () => {
    it('should save to localStorage on update when persist is true', () => {
      const { result } = renderHook(() =>
        usePostProcessing({ persist: true, storageKey: 'test-pp' }),
      );

      act(() => {
        result.current.updateBloom({ intensity: 2.2 });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-pp',
        expect.any(String),
      );

      const saved = JSON.parse(localStorageMock.setItem.mock.calls.at(-1)![1]);
      expect(saved.bloom.intensity).toBe(2.2);
    });

    it('should NOT save to localStorage when persist is false', () => {
      const { result } = renderHook(() =>
        usePostProcessing({ persist: false }),
      );

      act(() => {
        result.current.updateBloom({ intensity: 2.2 });
      });

      // setItem should not be called (beyond any initial calls)
      const ppCalls = localStorageMock.setItem.mock.calls.filter(
        (c: any[]) => c[0] === 'hololand-studio-postprocessing',
      );
      expect(ppCalls.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  describe('derived values', () => {
    it('should report hasActiveEffects = false when all disabled', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      expect(result.current.hasActiveEffects).toBe(false);
      expect(result.current.activeEffectCount).toBe(0);
    });

    it('should count active effects correctly', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      act(() => {
        result.current.toggleBloom();
        result.current.toggleColorGrading();
      });

      expect(result.current.hasActiveEffects).toBe(true);
      expect(result.current.activeEffectCount).toBe(2);
    });

    it('should count all 4 effects when all enabled', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      act(() => {
        result.current.toggleBloom();
        result.current.toggleDepthOfField();
        result.current.toggleMotionBlur();
        result.current.toggleColorGrading();
      });

      expect(result.current.activeEffectCount).toBe(4);
    });
  });

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------

  describe('callbacks', () => {
    it('should call onChange when any setting changes', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        usePostProcessing({ persist: false, onChange }),
      );

      act(() => {
        result.current.updateBloom({ intensity: 1.5 });
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0].bloom.intensity).toBe(1.5);
    });

    it('should call onPresetApply when a preset is applied', () => {
      const onPresetApply = vi.fn();
      const { result } = renderHook(() =>
        usePostProcessing({ persist: false, onPresetApply }),
      );

      act(() => {
        result.current.applyPreset('Cinematic');
      });

      expect(onPresetApply).toHaveBeenCalledTimes(1);
      expect(onPresetApply.mock.calls[0][0].name).toBe('Cinematic');
    });
  });

  // ---------------------------------------------------------------------------
  // setSettings (replace all)
  // ---------------------------------------------------------------------------

  describe('setSettings', () => {
    it('should replace the entire settings object', () => {
      const { result } = renderHook(() => usePostProcessing({ persist: false }));

      const custom = {
        ...DEFAULT_POST_PROCESSING,
        bloom: { ...DEFAULT_BLOOM, enabled: true, intensity: 4.0 },
        motionBlur: { ...DEFAULT_MOTION_BLUR, enabled: true, samples: 16 },
      };

      act(() => {
        result.current.setSettings(custom);
      });

      expect(result.current.settings.bloom.enabled).toBe(true);
      expect(result.current.settings.bloom.intensity).toBe(4.0);
      expect(result.current.settings.motionBlur.enabled).toBe(true);
      expect(result.current.settings.motionBlur.samples).toBe(16);
    });
  });
});
