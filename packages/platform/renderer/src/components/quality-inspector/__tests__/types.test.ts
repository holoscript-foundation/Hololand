/**
 * Type Tests for Quality Inspector
 *
 * Validates type definitions and type safety.
 */

import { describe, it, expect } from 'vitest';
import type {
  FireEffectParams,
  LODParams,
  GeometryParams,
  QualityPreset,
  QualityInspectorProps,
  InspectorTab,
  ProfileMetadata,
} from '../types';
import type { QualityProfileName } from '@hololand/quality-profiles';

describe('Quality Inspector Types', () => {
  describe('FireEffectParams', () => {
    it('has correct shape', () => {
      const fireEffect: FireEffectParams = {
        intensity: 0.8,
        color: '#ff6600',
        particleCount: 500,
        sizeScale: 1.0,
        emissionRate: 100,
      };

      expect(fireEffect.intensity).toBeTypeOf('number');
      expect(fireEffect.color).toBeTypeOf('string');
      expect(fireEffect.particleCount).toBeTypeOf('number');
      expect(fireEffect.sizeScale).toBeTypeOf('number');
      expect(fireEffect.emissionRate).toBeTypeOf('number');
    });

    it('accepts valid intensity range', () => {
      const minIntensity: FireEffectParams = {
        intensity: 0,
        color: '#000000',
        particleCount: 10,
        sizeScale: 0.1,
        emissionRate: 10,
      };

      const maxIntensity: FireEffectParams = {
        intensity: 1,
        color: '#ffffff',
        particleCount: 5000,
        sizeScale: 5.0,
        emissionRate: 1000,
      };

      expect(minIntensity.intensity).toBe(0);
      expect(maxIntensity.intensity).toBe(1);
    });
  });

  describe('LODParams', () => {
    it('has correct shape', () => {
      const lodParams: LODParams = {
        enabled: true,
        levels: 4,
        distanceMultiplier: 1.2,
        autoSwitch: true,
        maxDistanceLOD0: 100,
      };

      expect(lodParams.enabled).toBeTypeOf('boolean');
      expect(lodParams.levels).toBeTypeOf('number');
      expect(lodParams.distanceMultiplier).toBeTypeOf('number');
      expect(lodParams.autoSwitch).toBeTypeOf('boolean');
      expect(lodParams.maxDistanceLOD0).toBeTypeOf('number');
    });

    it('can be disabled', () => {
      const disabledLOD: LODParams = {
        enabled: false,
        levels: 3,
        distanceMultiplier: 1.5,
        autoSwitch: false,
        maxDistanceLOD0: 50,
      };

      expect(disabledLOD.enabled).toBe(false);
    });
  });

  describe('GeometryParams', () => {
    it('has correct shape', () => {
      const geometryParams: GeometryParams = {
        maxPolyCount: 1000000,
        maxTextureSize: 2048,
        anisotropy: 8,
        shadowMapSize: 2048,
      };

      expect(geometryParams.maxPolyCount).toBeTypeOf('number');
      expect(geometryParams.maxTextureSize).toBeTypeOf('number');
      expect(geometryParams.anisotropy).toBeTypeOf('number');
      expect(geometryParams.shadowMapSize).toBeTypeOf('number');
    });

    it('accepts various resolutions', () => {
      const lowQuality: GeometryParams = {
        maxPolyCount: 50000,
        maxTextureSize: 512,
        anisotropy: 1,
        shadowMapSize: 512,
      };

      const highQuality: GeometryParams = {
        maxPolyCount: 5000000,
        maxTextureSize: 8192,
        anisotropy: 16,
        shadowMapSize: 8192,
      };

      expect(lowQuality.maxPolyCount).toBeLessThan(highQuality.maxPolyCount);
      expect(lowQuality.maxTextureSize).toBeLessThan(highQuality.maxTextureSize);
    });
  });

  describe('QualityPreset', () => {
    it('has correct shape', () => {
      const preset: QualityPreset = {
        id: 'preset-1',
        name: 'My Preset',
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

      expect(preset.id).toBeTypeOf('string');
      expect(preset.name).toBeTypeOf('string');
      expect(preset.profile).toBeTypeOf('string');
      expect(preset.lod).toBeTypeOf('object');
      expect(preset.geometry).toBeTypeOf('object');
      expect(preset.isCustom).toBeTypeOf('boolean');
      expect(preset.createdAt).toBeTypeOf('number');
    });

    it('can include optional fire effect', () => {
      const presetWithFire: QualityPreset = {
        id: 'preset-2',
        name: 'Fire Preset',
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
        fireEffect: {
          intensity: 0.9,
          color: '#ff3300',
          particleCount: 1000,
          sizeScale: 1.5,
          emissionRate: 200,
        },
        isCustom: true,
        createdAt: Date.now(),
      };

      expect(presetWithFire.fireEffect).toBeDefined();
      expect(presetWithFire.fireEffect?.intensity).toBe(0.9);
    });

    it('accepts all quality profile types', () => {
      const profiles: QualityProfileName[] = ['industrial', 'cinematic', 'mobile'];

      profiles.forEach((profile) => {
        const preset: QualityPreset = {
          id: `preset-${profile}`,
          name: `${profile} preset`,
          profile,
          lod: {
            enabled: true,
            levels: 3,
            distanceMultiplier: 1.5,
            autoSwitch: true,
            maxDistanceLOD0: 50,
          },
          geometry: {
            maxPolyCount: 500000,
            maxTextureSize: 1024,
            anisotropy: 4,
            shadowMapSize: 1024,
          },
          isCustom: false,
          createdAt: Date.now(),
        };

        expect(preset.profile).toBe(profile);
      });
    });
  });

  describe('QualityInspectorProps', () => {
    it('has correct shape with required props', () => {
      const props: QualityInspectorProps = {
        currentProfile: 'industrial',
      };

      expect(props.currentProfile).toBeTypeOf('string');
    });

    it('accepts all optional props', () => {
      const props: QualityInspectorProps = {
        currentProfile: 'cinematic',
        onProfileChange: (profile: QualityProfileName) => {},
        onLODChange: (params: LODParams) => {},
        onGeometryChange: (params: GeometryParams) => {},
        onFireEffectChange: (params: FireEffectParams) => {},
        onPresetSave: (preset: QualityPreset) => {},
        onPresetLoad: (preset: QualityPreset) => {},
        presets: [],
        showFireControls: true,
        enablePreview: true,
        className: 'custom-class',
      };

      expect(props.onProfileChange).toBeTypeOf('function');
      expect(props.onLODChange).toBeTypeOf('function');
      expect(props.onGeometryChange).toBeTypeOf('function');
      expect(props.onFireEffectChange).toBeTypeOf('function');
      expect(props.onPresetSave).toBeTypeOf('function');
      expect(props.onPresetLoad).toBeTypeOf('function');
      expect(props.presets).toBeTypeOf('object');
      expect(props.showFireControls).toBeTypeOf('boolean');
      expect(props.enablePreview).toBeTypeOf('boolean');
      expect(props.className).toBeTypeOf('string');
    });
  });

  describe('InspectorTab', () => {
    it('accepts valid tab values', () => {
      const tabs: InspectorTab[] = ['quality', 'lod', 'geometry', 'fire'];

      tabs.forEach((tab) => {
        const activeTab: InspectorTab = tab;
        expect(['quality', 'lod', 'geometry', 'fire']).toContain(activeTab);
      });
    });
  });

  describe('ProfileMetadata', () => {
    it('has correct shape', () => {
      const metadata: ProfileMetadata = {
        name: 'cinematic',
        label: 'Cinematic',
        color: '#8b5cf6',
        description: 'Maximal visual quality',
      };

      expect(metadata.name).toBeTypeOf('string');
      expect(metadata.label).toBeTypeOf('string');
      expect(metadata.color).toBeTypeOf('string');
      expect(metadata.description).toBeTypeOf('string');
    });

    it('can represent all profile types', () => {
      const profiles: ProfileMetadata[] = [
        {
          name: 'industrial',
          label: 'Industrial',
          color: '#3b82f6',
          description: 'Data accuracy',
        },
        {
          name: 'cinematic',
          label: 'Cinematic',
          color: '#8b5cf6',
          description: 'Visual fidelity',
        },
        {
          name: 'mobile',
          label: 'Mobile',
          color: '#10b981',
          description: 'Performance',
        },
      ];

      expect(profiles).toHaveLength(3);
      expect(profiles.map((p) => p.name)).toEqual(['industrial', 'cinematic', 'mobile']);
    });
  });
});
