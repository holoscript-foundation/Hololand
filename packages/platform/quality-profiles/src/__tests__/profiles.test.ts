/**
 * Tests for quality profile definitions
 */

import { describe, it, expect } from 'vitest';
import {
  INDUSTRIAL_PROFILE,
  CINEMATIC_PROFILE,
  MOBILE_PROFILE,
  QUALITY_PROFILES,
} from '../types';

describe('Quality Profile Definitions', () => {
  describe('INDUSTRIAL_PROFILE', () => {
    it('should have correct metadata', () => {
      expect(INDUSTRIAL_PROFILE.name).toBe('industrial');
      expect(INDUSTRIAL_PROFILE.displayName).toBe('Industrial');
      expect(INDUSTRIAL_PROFILE.priority).toBe('data-accuracy');
    });

    it('should prioritize precision over visuals', () => {
      expect(INDUSTRIAL_PROFILE.physicsAccuracy).toBe('exact');
      expect(INDUSTRIAL_PROFILE.renderSettings.physicsSubsteps).toBe(4);
      expect(INDUSTRIAL_PROFILE.renderSettings.postProcessing).toBe(false);
      expect(INDUSTRIAL_PROFILE.renderSettings.bloom).toBe(false);
    });

    it('should have appropriate IoT tags', () => {
      expect(INDUSTRIAL_PROFILE.tags).toContain('digital-twin');
      expect(INDUSTRIAL_PROFILE.tags).toContain('iot');
      expect(INDUSTRIAL_PROFILE.tags).toContain('precision');
    });

    it('should configure continuous collision detection', () => {
      expect(INDUSTRIAL_PROFILE.traitConfig.physics?.collisionDetection).toBe('continuous');
    });

    it('should enable PBR for accurate material properties', () => {
      expect(INDUSTRIAL_PROFILE.renderSettings.materialType).toBe('physical');
      expect(INDUSTRIAL_PROFILE.traitConfig.material?.pbrEnabled).toBe(true);
      expect(INDUSTRIAL_PROFILE.traitConfig.material?.roughnessMetallic).toBe(true);
    });

    it('should target 60 FPS for desktop stability', () => {
      expect(INDUSTRIAL_PROFILE.renderSettings.targetFPS).toBe(60);
    });

    it('should use medium audio for alerts', () => {
      expect(INDUSTRIAL_PROFILE.audioQuality).toBe('medium');
    });

    it('should sync at 10Hz for real-time IoT data', () => {
      expect(INDUSTRIAL_PROFILE.networkSyncRate).toBe(10);
    });
  });

  describe('CINEMATIC_PROFILE', () => {
    it('should have correct metadata', () => {
      expect(CINEMATIC_PROFILE.name).toBe('cinematic');
      expect(CINEMATIC_PROFILE.displayName).toBe('Cinematic');
      expect(CINEMATIC_PROFILE.priority).toBe('visual-fidelity');
    });

    it('should maximize visual quality', () => {
      expect(CINEMATIC_PROFILE.renderSettings.shadowMapSize).toBe(4096);
      expect(CINEMATIC_PROFILE.renderSettings.maxTextureSize).toBe(4096);
      expect(CINEMATIC_PROFILE.renderSettings.postProcessing).toBe(true);
      expect(CINEMATIC_PROFILE.renderSettings.bloom).toBe(true);
      expect(CINEMATIC_PROFILE.renderSettings.ssao).toBe(true);
      expect(CINEMATIC_PROFILE.renderSettings.ssr).toBe(true);
    });

    it('should have entertainment tags', () => {
      expect(CINEMATIC_PROFILE.tags).toContain('marketing');
      expect(CINEMATIC_PROFILE.tags).toContain('entertainment');
      expect(CINEMATIC_PROFILE.tags).toContain('showcase');
    });

    it('should enable all material features', () => {
      expect(CINEMATIC_PROFILE.traitConfig.material?.pbrEnabled).toBe(true);
      expect(CINEMATIC_PROFILE.traitConfig.material?.normalMaps).toBe(true);
      expect(CINEMATIC_PROFILE.traitConfig.material?.roughnessMetallic).toBe(true);
    });

    it('should use studio-quality audio', () => {
      expect(CINEMATIC_PROFILE.audioQuality).toBe('studio');
    });

    it('should support high animation quality', () => {
      expect(CINEMATIC_PROFILE.traitConfig.animation?.maxFPS).toBe(60);
      expect(CINEMATIC_PROFILE.traitConfig.animation?.blending).toBe(true);
      expect(CINEMATIC_PROFILE.traitConfig.animation?.morphTargets).toBe(true);
    });

    it('should minimize LOD bias for quality', () => {
      expect(CINEMATIC_PROFILE.renderSettings.lodBias).toBe(0);
    });

    it('should use higher pixel ratio', () => {
      expect(CINEMATIC_PROFILE.renderSettings.pixelRatio).toBe(1.5);
    });
  });

  describe('MOBILE_PROFILE', () => {
    it('should have correct metadata', () => {
      expect(MOBILE_PROFILE.name).toBe('mobile');
      expect(MOBILE_PROFILE.displayName).toBe('Mobile');
      expect(MOBILE_PROFILE.priority).toBe('performance');
    });

    it('should aggressively optimize for performance', () => {
      expect(MOBILE_PROFILE.renderSettings.shadowMapSize).toBe(512);
      expect(MOBILE_PROFILE.renderSettings.maxTextureSize).toBe(512);
      expect(MOBILE_PROFILE.renderSettings.lodBias).toBe(2);
      expect(MOBILE_PROFILE.renderSettings.postProcessing).toBe(false);
      expect(MOBILE_PROFILE.renderSettings.pixelRatio).toBe(0.75);
    });

    it('should have mobile tags', () => {
      expect(MOBILE_PROFILE.tags).toContain('quest');
      expect(MOBILE_PROFILE.tags).toContain('mobile-ar');
      expect(MOBILE_PROFILE.tags).toContain('battery-efficient');
    });

    it('should use basic physics', () => {
      expect(MOBILE_PROFILE.physicsAccuracy).toBe('basic');
      expect(MOBILE_PROFILE.traitConfig.physics?.substeps).toBe(1);
      expect(MOBILE_PROFILE.traitConfig.physics?.collisionDetection).toBe('discrete');
    });

    it('should disable PBR for performance', () => {
      expect(MOBILE_PROFILE.traitConfig.material?.pbrEnabled).toBe(false);
      expect(MOBILE_PROFILE.traitConfig.material?.normalMaps).toBe(false);
    });

    it('should target 72 FPS for Quest', () => {
      expect(MOBILE_PROFILE.renderSettings.targetFPS).toBe(72);
    });

    it('should use aggressive LOD', () => {
      expect(MOBILE_PROFILE.traitConfig.lod?.levels).toBe(5);
      expect(MOBILE_PROFILE.traitConfig.lod?.distanceMultiplier).toBe(2.0);
    });

    it('should conserve bandwidth', () => {
      expect(MOBILE_PROFILE.networkSyncRate).toBe(5);
      expect(MOBILE_PROFILE.traitConfig.networking?.compression).toBe(true);
    });
  });

  describe('QUALITY_PROFILES map', () => {
    it('should contain all three profiles', () => {
      expect(Object.keys(QUALITY_PROFILES)).toHaveLength(3);
      expect(QUALITY_PROFILES.industrial).toBe(INDUSTRIAL_PROFILE);
      expect(QUALITY_PROFILES.cinematic).toBe(CINEMATIC_PROFILE);
      expect(QUALITY_PROFILES.mobile).toBe(MOBILE_PROFILE);
    });
  });

  describe('profile consistency', () => {
    const profiles = Object.values(QUALITY_PROFILES);

    it('should all have required fields', () => {
      profiles.forEach((profile) => {
        expect(profile.name).toBeDefined();
        expect(profile.displayName).toBeDefined();
        expect(profile.description).toBeDefined();
        expect(profile.priority).toBeDefined();
        expect(profile.renderSettings).toBeDefined();
        expect(profile.physicsAccuracy).toBeDefined();
        expect(profile.audioQuality).toBeDefined();
        expect(profile.networkSyncRate).toBeDefined();
        expect(profile.traitConfig).toBeDefined();
        expect(profile.tags).toBeDefined();
      });
    });

    it('should have valid target FPS values', () => {
      profiles.forEach((profile) => {
        expect(profile.renderSettings.targetFPS).toBeGreaterThanOrEqual(30);
        expect(profile.renderSettings.targetFPS).toBeLessThanOrEqual(120);
      });
    });

    it('should have valid pixel ratio values', () => {
      profiles.forEach((profile) => {
        expect(profile.renderSettings.pixelRatio).toBeGreaterThan(0);
        expect(profile.renderSettings.pixelRatio).toBeLessThanOrEqual(2.0);
      });
    });

    it('should have valid shadow map sizes (power of 2)', () => {
      profiles.forEach((profile) => {
        const size = profile.renderSettings.shadowMapSize;
        expect(Math.log2(size) % 1).toBe(0); // Is power of 2
        expect(size).toBeGreaterThanOrEqual(512);
        expect(size).toBeLessThanOrEqual(4096);
      });
    });

    it('should have valid texture sizes (power of 2)', () => {
      profiles.forEach((profile) => {
        const size = profile.renderSettings.maxTextureSize;
        expect(Math.log2(size) % 1).toBe(0); // Is power of 2
        expect(size).toBeGreaterThanOrEqual(512);
        expect(size).toBeLessThanOrEqual(4096);
      });
    });

    it('should have consistent trait config structure', () => {
      profiles.forEach((profile) => {
        expect(profile.traitConfig.lod).toBeDefined();
        expect(profile.traitConfig.physics).toBeDefined();
        expect(profile.traitConfig.networking).toBeDefined();
        expect(profile.traitConfig.material).toBeDefined();
        expect(profile.traitConfig.animation).toBeDefined();
      });
    });
  });

  describe('profile differentiation', () => {
    const profiles = Object.values(QUALITY_PROFILES);

    it('should have different priorities', () => {
      const priorities = profiles.map(p => p.priority);
      const uniquePriorities = new Set(priorities);
      expect(uniquePriorities.size).toBe(3); // All different
    });

    it('should have different shadow map sizes', () => {
      const sizes = profiles.map(p => p.renderSettings.shadowMapSize);
      const uniqueSizes = new Set(sizes);
      expect(uniqueSizes.size).toBe(3); // All different
    });

    it('should have different physics accuracy levels', () => {
      const accuracies = profiles.map(p => p.physicsAccuracy);
      const uniqueAccuracies = new Set(accuracies);
      expect(uniqueAccuracies.size).toBe(3); // All different
    });

    it('should have ordered performance characteristics', () => {
      // Mobile should be most aggressive on performance
      expect(MOBILE_PROFILE.renderSettings.lodBias).toBeGreaterThan(INDUSTRIAL_PROFILE.renderSettings.lodBias);
      expect(MOBILE_PROFILE.renderSettings.lodBias).toBeGreaterThan(CINEMATIC_PROFILE.renderSettings.lodBias);

      // Cinematic should have highest texture quality
      expect(CINEMATIC_PROFILE.renderSettings.maxTextureSize).toBeGreaterThan(INDUSTRIAL_PROFILE.renderSettings.maxTextureSize);
      expect(CINEMATIC_PROFILE.renderSettings.maxTextureSize).toBeGreaterThan(MOBILE_PROFILE.renderSettings.maxTextureSize);

      // Industrial should have highest physics precision
      const physicsOrder = ['basic', 'standard', 'exact'];
      expect(physicsOrder.indexOf(INDUSTRIAL_PROFILE.physicsAccuracy)).toBeGreaterThan(
        physicsOrder.indexOf(CINEMATIC_PROFILE.physicsAccuracy)
      );
      expect(physicsOrder.indexOf(INDUSTRIAL_PROFILE.physicsAccuracy)).toBeGreaterThan(
        physicsOrder.indexOf(MOBILE_PROFILE.physicsAccuracy)
      );
    });
  });
});
