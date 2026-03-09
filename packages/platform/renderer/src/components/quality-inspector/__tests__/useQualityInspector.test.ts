/**
 * useQualityInspector Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQualityInspector } from '../useQualityInspector';
import type { QualityPreset } from '../types';

describe('useQualityInspector', () => {
  const mockOnProfileChange = vi.fn();
  const mockOnLODChange = vi.fn();
  const mockOnGeometryChange = vi.fn();
  const mockOnFireEffectChange = vi.fn();

  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Initialization', () => {
    it('initializes with default profile', () => {
      const { result } = renderHook(() => useQualityInspector());

      expect(result.current.currentProfile).toBe('industrial');
      expect(result.current.presets).toEqual([]);
    });

    it('initializes with custom initial profile', () => {
      const { result } = renderHook(() =>
        useQualityInspector({ initialProfile: 'cinematic' })
      );

      expect(result.current.currentProfile).toBe('cinematic');
    });

    it('loads presets from localStorage on mount', () => {
      const mockPresets: QualityPreset[] = [
        {
          id: 'preset-1',
          name: 'Test Preset',
          profile: 'cinematic',
          lod: {
            enabled: true,
            levels: 4,
            distanceMultiplier: 1.2,
            autoSwitch: true,
            maxDistanceLOD0: 75,
          },
          geometry: {
            maxPolyCount: 1000000,
            maxTextureSize: 2048,
            anisotropy: 8,
            shadowMapSize: 2048,
          },
          isCustom: true,
          createdAt: Date.now(),
        },
      ];

      localStorageMock.setItem('hololand:quality-inspector:presets', JSON.stringify(mockPresets));

      const { result } = renderHook(() => useQualityInspector({ persistPresets: true }));

      expect(result.current.presets).toEqual(mockPresets);
    });

    it('handles corrupt localStorage data gracefully', () => {
      localStorageMock.setItem('hololand:quality-inspector:presets', 'invalid json');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useQualityInspector({ persistPresets: true }));

      expect(result.current.presets).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Profile Management', () => {
    it('updates current profile when setProfile is called', () => {
      const { result } = renderHook(() => useQualityInspector());

      act(() => {
        result.current.setProfile('mobile');
      });

      expect(result.current.currentProfile).toBe('mobile');
    });

    it('calls onProfileChange callback when profile is set', () => {
      const { result } = renderHook(() =>
        useQualityInspector({ onProfileChange: mockOnProfileChange })
      );

      act(() => {
        result.current.setProfile('cinematic');
      });

      expect(mockOnProfileChange).toHaveBeenCalledWith('cinematic');
    });
  });

  describe('Preset Management', () => {
    const testPreset: QualityPreset = {
      id: 'preset-test',
      name: 'Test Preset',
      profile: 'cinematic',
      lod: {
        enabled: true,
        levels: 4,
        distanceMultiplier: 1.2,
        autoSwitch: true,
        maxDistanceLOD0: 75,
      },
      geometry: {
        maxPolyCount: 1000000,
        maxTextureSize: 2048,
        anisotropy: 8,
        shadowMapSize: 2048,
      },
      isCustom: true,
      createdAt: Date.now(),
    };

    it('adds a new preset', () => {
      const { result } = renderHook(() => useQualityInspector());

      act(() => {
        result.current.savePreset(testPreset);
      });

      expect(result.current.presets).toHaveLength(1);
      expect(result.current.presets[0]).toEqual(testPreset);
    });

    it('updates existing preset with same ID', () => {
      const { result } = renderHook(() => useQualityInspector());

      act(() => {
        result.current.savePreset(testPreset);
      });

      const updatedPreset = { ...testPreset, name: 'Updated Preset' };

      act(() => {
        result.current.savePreset(updatedPreset);
      });

      expect(result.current.presets).toHaveLength(1);
      expect(result.current.presets[0].name).toBe('Updated Preset');
    });

    it('persists presets to localStorage', () => {
      const { result } = renderHook(() => useQualityInspector({ persistPresets: true }));

      act(() => {
        result.current.savePreset(testPreset);
      });

      const stored = localStorageMock.getItem('hololand:quality-inspector:presets');
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!) as QualityPreset[];
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual(testPreset);
    });

    it('does not persist when persistPresets is false', () => {
      const { result } = renderHook(() => useQualityInspector({ persistPresets: false }));

      act(() => {
        result.current.savePreset(testPreset);
      });

      const stored = localStorageMock.getItem('hololand:quality-inspector:presets');
      expect(stored).toBeNull();
    });

    it('loads a preset and calls callbacks', () => {
      const { result } = renderHook(() =>
        useQualityInspector({
          onProfileChange: mockOnProfileChange,
          onLODChange: mockOnLODChange,
          onGeometryChange: mockOnGeometryChange,
        })
      );

      act(() => {
        result.current.loadPreset(testPreset);
      });

      expect(result.current.currentProfile).toBe('cinematic');
      expect(mockOnProfileChange).toHaveBeenCalledWith('cinematic');
      expect(mockOnLODChange).toHaveBeenCalledWith(testPreset.lod);
      expect(mockOnGeometryChange).toHaveBeenCalledWith(testPreset.geometry);
    });

    it('loads preset with fire effect', () => {
      const presetWithFire: QualityPreset = {
        ...testPreset,
        fireEffect: {
          intensity: 0.7,
          color: '#ff5500',
          particleCount: 800,
          sizeScale: 1.2,
          emissionRate: 150,
        },
      };

      const { result } = renderHook(() =>
        useQualityInspector({
          onFireEffectChange: mockOnFireEffectChange,
        })
      );

      act(() => {
        result.current.loadPreset(presetWithFire);
      });

      expect(mockOnFireEffectChange).toHaveBeenCalledWith(presetWithFire.fireEffect);
    });

    it('deletes a preset', () => {
      const { result } = renderHook(() => useQualityInspector());

      act(() => {
        result.current.savePreset(testPreset);
      });

      expect(result.current.presets).toHaveLength(1);

      act(() => {
        result.current.deletePreset(testPreset.id);
      });

      expect(result.current.presets).toHaveLength(0);
    });

    it('clears all presets', () => {
      const { result } = renderHook(() => useQualityInspector());

      act(() => {
        result.current.savePreset(testPreset);
        result.current.savePreset({ ...testPreset, id: 'preset-2', name: 'Preset 2' });
      });

      expect(result.current.presets).toHaveLength(2);

      act(() => {
        result.current.clearPresets();
      });

      expect(result.current.presets).toHaveLength(0);
    });
  });

  describe('Import/Export', () => {
    const testPresets: QualityPreset[] = [
      {
        id: 'preset-1',
        name: 'Preset 1',
        profile: 'cinematic',
        lod: {
          enabled: true,
          levels: 4,
          distanceMultiplier: 1.2,
          autoSwitch: true,
          maxDistanceLOD0: 75,
        },
        geometry: {
          maxPolyCount: 1000000,
          maxTextureSize: 2048,
          anisotropy: 8,
          shadowMapSize: 2048,
        },
        isCustom: true,
        createdAt: Date.now(),
      },
      {
        id: 'preset-2',
        name: 'Preset 2',
        profile: 'mobile',
        lod: {
          enabled: true,
          levels: 5,
          distanceMultiplier: 2.0,
          autoSwitch: true,
          maxDistanceLOD0: 30,
        },
        geometry: {
          maxPolyCount: 50000,
          maxTextureSize: 512,
          anisotropy: 1,
          shadowMapSize: 512,
        },
        isCustom: true,
        createdAt: Date.now(),
      },
    ];

    it('exports presets as JSON', () => {
      const { result } = renderHook(() => useQualityInspector());

      act(() => {
        testPresets.forEach((preset) => result.current.savePreset(preset));
      });

      const exported = result.current.exportPresets();
      const parsed = JSON.parse(exported) as QualityPreset[];

      expect(parsed).toHaveLength(2);
      expect(parsed).toEqual(testPresets);
    });

    it('imports valid presets JSON', () => {
      const { result } = renderHook(() => useQualityInspector());

      const json = JSON.stringify(testPresets);

      let success: boolean = false;
      act(() => {
        success = result.current.importPresets(json);
      });

      expect(success).toBe(true);
      expect(result.current.presets).toEqual(testPresets);
    });

    it('merges imported presets with existing ones', () => {
      const { result } = renderHook(() => useQualityInspector());

      act(() => {
        result.current.savePreset(testPresets[0]);
      });

      const newPreset = {
        ...testPresets[1],
        id: 'preset-new',
      };

      const json = JSON.stringify([newPreset]);

      act(() => {
        result.current.importPresets(json);
      });

      expect(result.current.presets).toHaveLength(2);
    });

    it('updates existing preset on import with same ID', () => {
      const { result } = renderHook(() => useQualityInspector());

      act(() => {
        result.current.savePreset(testPresets[0]);
      });

      const updatedPreset = {
        ...testPresets[0],
        name: 'Updated Name',
      };

      const json = JSON.stringify([updatedPreset]);

      act(() => {
        result.current.importPresets(json);
      });

      expect(result.current.presets).toHaveLength(1);
      expect(result.current.presets[0].name).toBe('Updated Name');
    });

    it('rejects invalid JSON', () => {
      const { result } = renderHook(() => useQualityInspector());

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      let success: boolean = true;
      act(() => {
        success = result.current.importPresets('invalid json');
      });

      expect(success).toBe(false);
      expect(result.current.presets).toHaveLength(0);

      consoleSpy.mockRestore();
    });

    it('rejects JSON that is not an array', () => {
      const { result } = renderHook(() => useQualityInspector());

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      let success: boolean = true;
      act(() => {
        success = result.current.importPresets('{"invalid": "structure"}');
      });

      expect(success).toBe(false);

      consoleSpy.mockRestore();
    });

    it('rejects presets with missing required fields', () => {
      const { result } = renderHook(() => useQualityInspector());

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const invalidPresets = [
        {
          id: 'preset-1',
          // Missing name, profile, lod, geometry
        },
      ];

      let success: boolean = true;
      act(() => {
        success = result.current.importPresets(JSON.stringify(invalidPresets));
      });

      expect(success).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});
