/**
 * Tests for QualityProfileManager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  QualityProfileManager,
  createQualityProfileManager,
  getQualityProfileManager,
} from '../QualityProfileManager';
import { QUALITY_PROFILES } from '../types';
import type { CompositionQualityMetadata } from '../types';

describe('QualityProfileManager', () => {
  describe('initialization', () => {
    it('should create with default industrial profile', () => {
      const manager = new QualityProfileManager();
      expect(manager.getProfile().name).toBe('industrial');
    });

    it('should create with custom default profile', () => {
      const manager = new QualityProfileManager({ defaultProfile: 'cinematic' });
      expect(manager.getProfile().name).toBe('cinematic');
    });

    it('should call onProfileChange callback on creation', () => {
      const onProfileChange = vi.fn();
      new QualityProfileManager({
        defaultProfile: 'mobile',
        onProfileChange,
      });
      // Not called on creation, only on setProfile
      expect(onProfileChange).not.toHaveBeenCalled();
    });
  });

  describe('profile management', () => {
    let manager: QualityProfileManager;

    beforeEach(() => {
      manager = new QualityProfileManager();
    });

    it('should get current profile', () => {
      const profile = manager.getProfile();
      expect(profile).toBe(QUALITY_PROFILES.industrial);
    });

    it('should get profile by name', () => {
      const cinematic = manager.getProfileByName('cinematic');
      expect(cinematic).toBe(QUALITY_PROFILES.cinematic);
    });

    it('should get all profiles', () => {
      const profiles = manager.getAllProfiles();
      expect(profiles).toHaveLength(3);
      expect(profiles).toContain(QUALITY_PROFILES.industrial);
      expect(profiles).toContain(QUALITY_PROFILES.cinematic);
      expect(profiles).toContain(QUALITY_PROFILES.mobile);
    });

    it('should set active profile', () => {
      manager.setProfile('cinematic');
      expect(manager.getProfile().name).toBe('cinematic');
    });

    it('should call onProfileChange when profile changes', () => {
      const onProfileChange = vi.fn();
      manager = new QualityProfileManager({ onProfileChange });

      manager.setProfile('mobile');
      expect(onProfileChange).toHaveBeenCalledWith(QUALITY_PROFILES.mobile, undefined);
    });

    it('should call onTraitConfigChange when profile changes', () => {
      const onTraitConfigChange = vi.fn();
      manager = new QualityProfileManager({ onTraitConfigChange });

      manager.setProfile('cinematic');
      expect(onTraitConfigChange).toHaveBeenCalled();
      const traitConfig = onTraitConfigChange.mock.calls[0][0];
      expect(traitConfig).toHaveProperty('lod');
      expect(traitConfig).toHaveProperty('physics');
    });
  });

  describe('metadata application', () => {
    let manager: QualityProfileManager;

    beforeEach(() => {
      manager = new QualityProfileManager({ autoApply: true });
    });

    it('should apply profile from metadata', () => {
      const metadata: CompositionQualityMetadata = {
        profile: 'cinematic',
      };

      manager.applyFromMetadata(metadata);
      expect(manager.getProfile().name).toBe('cinematic');
    });

    it('should use default profile if metadata has no profile', () => {
      const metadata: CompositionQualityMetadata = {};
      manager.applyFromMetadata(metadata);
      expect(manager.getProfile().name).toBe('industrial'); // default
    });

    it('should not auto-apply if disabled', () => {
      manager = new QualityProfileManager({ autoApply: false, defaultProfile: 'industrial' });

      const metadata: CompositionQualityMetadata = {
        profile: 'mobile',
      };

      manager.applyFromMetadata(metadata);
      expect(manager.getProfile().name).toBe('industrial'); // unchanged
    });
  });

  describe('settings computation', () => {
    let manager: QualityProfileManager;

    beforeEach(() => {
      manager = new QualityProfileManager();
      manager.setProfile('industrial');
    });

    it('should get base quality settings without overrides', () => {
      const settings = manager.getEffectiveQualitySettings();
      expect(settings).toEqual(QUALITY_PROFILES.industrial.renderSettings);
    });

    it('should apply metadata overrides to quality settings', () => {
      const metadata: CompositionQualityMetadata = {
        profile: 'industrial',
        overrides: {
          targetFPS: 90,
          pixelRatio: 1.5,
        },
      };

      manager.applyFromMetadata(metadata);
      const settings = manager.getEffectiveQualitySettings();

      expect(settings.targetFPS).toBe(90);
      expect(settings.pixelRatio).toBe(1.5);
      // Other settings unchanged
      expect(settings.shadowMapSize).toBe(QUALITY_PROFILES.industrial.renderSettings.shadowMapSize);
    });

    it('should get base trait config without overrides', () => {
      const traitConfig = manager.getEffectiveTraitConfig();
      expect(traitConfig).toEqual(QUALITY_PROFILES.industrial.traitConfig);
    });

    it('should apply metadata overrides to trait config', () => {
      const metadata: CompositionQualityMetadata = {
        profile: 'industrial',
        traitOverrides: {
          physics: {
            enabled: true,
            accuracy: 'basic',
            collisionDetection: 'discrete',
            substeps: 2,
          },
        },
      };

      manager.applyFromMetadata(metadata);
      const traitConfig = manager.getEffectiveTraitConfig();

      expect(traitConfig.physics?.accuracy).toBe('basic');
      expect(traitConfig.physics?.substeps).toBe(2);
    });

    it('should get effective priority from profile', () => {
      manager.setProfile('cinematic');
      expect(manager.getEffectivePriority()).toBe('visual-fidelity');
    });

    it('should get effective priority from metadata override', () => {
      const metadata: CompositionQualityMetadata = {
        profile: 'mobile',
        priorityOverride: 'data-accuracy',
      };

      manager.applyFromMetadata(metadata);
      expect(manager.getEffectivePriority()).toBe('data-accuracy');
    });
  });

  describe('profile recommendation', () => {
    let manager: QualityProfileManager;

    beforeEach(() => {
      manager = new QualityProfileManager();
    });

    it('should recommend industrial profile for IoT tags', () => {
      const tags = ['iot', 'digital-twin', 'precision'];
      const recommended = manager.recommendProfileByTags(tags);
      expect(recommended).toBe('industrial');
    });

    it('should recommend cinematic profile for marketing tags', () => {
      const tags = ['marketing', 'showcase', 'entertainment'];
      const recommended = manager.recommendProfileByTags(tags);
      expect(recommended).toBe('cinematic');
    });

    it('should recommend mobile profile for quest tags', () => {
      const tags = ['quest', 'mobile-ar', 'battery-efficient'];
      const recommended = manager.recommendProfileByTags(tags);
      expect(recommended).toBe('mobile');
    });

    it('should use default profile for no matching tags', () => {
      const tags = ['random', 'unknown'];
      const recommended = manager.recommendProfileByTags(tags);
      expect(recommended).toBe('industrial'); // default
    });

    it('should recommend mobile for Quest devices', () => {
      expect(manager.recommendProfileByDevice('quest2')).toBe('mobile');
      expect(manager.recommendProfileByDevice('quest3')).toBe('mobile');
      expect(manager.recommendProfileByDevice('mobile')).toBe('mobile');
    });

    it('should recommend cinematic for PCVR devices', () => {
      expect(manager.recommendProfileByDevice('pcvr')).toBe('cinematic');
      expect(manager.recommendProfileByDevice('desktop')).toBe('cinematic');
    });

    it('should recommend by priority', () => {
      expect(manager.recommendProfileByPriority('data-accuracy')).toBe('industrial');
      expect(manager.recommendProfileByPriority('visual-fidelity')).toBe('cinematic');
      expect(manager.recommendProfileByPriority('performance')).toBe('mobile');
    });
  });

  describe('utility methods', () => {
    let manager: QualityProfileManager;

    beforeEach(() => {
      manager = new QualityProfileManager();
    });

    it('should generate profile summary', () => {
      const summary = manager.getProfileSummary('industrial');
      expect(summary).toContain('Industrial');
      expect(summary).toContain('data-accuracy');
      expect(summary).toContain('Physics');
    });

    it('should compare profiles and return differences', () => {
      const diffs = manager.compareProfiles('industrial', 'cinematic');
      expect(diffs.length).toBeGreaterThan(0);
      expect(diffs.some(d => d.includes('Priority'))).toBe(true);
      expect(diffs.some(d => d.includes('Shadow map'))).toBe(true);
    });

    it('should validate correct metadata', () => {
      const metadata: CompositionQualityMetadata = {
        profile: 'industrial',
        overrides: { targetFPS: 60 },
      };

      const result = manager.validateMetadata(metadata);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unknown profile in metadata', () => {
      const metadata: CompositionQualityMetadata = {
        profile: 'unknown' as any,
      };

      const result = manager.validateMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown profile: unknown');
    });

    it('should reject invalid targetFPS override', () => {
      const metadata: CompositionQualityMetadata = {
        overrides: { targetFPS: 20 },
      };

      const result = manager.validateMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Target FPS too low (min 30)');
    });

    it('should reject invalid pixelRatio override', () => {
      const metadata: CompositionQualityMetadata = {
        overrides: { pixelRatio: 3.0 },
      };

      const result = manager.validateMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Pixel ratio too high (max 2.0)');
    });
  });

  describe('factory functions', () => {
    it('should create manager via factory', () => {
      const manager = createQualityProfileManager({ defaultProfile: 'mobile' });
      expect(manager.getProfile().name).toBe('mobile');
    });

    it('should get singleton manager', () => {
      const manager1 = getQualityProfileManager();
      const manager2 = getQualityProfileManager();
      expect(manager1).toBe(manager2);
    });
  });
});
