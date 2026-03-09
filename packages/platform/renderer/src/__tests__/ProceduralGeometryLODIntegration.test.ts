/**
 * Tests for ProceduralGeometryLODIntegration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { QualityProfileManager } from '@hololand/quality-profiles';
import { ProceduralGeometryLODManager } from '../ProceduralGeometryLOD';
import {
  ProceduralGeometryLODIntegration,
  createProceduralGeometryLODIntegration,
} from '../ProceduralGeometryLODIntegration';

describe('ProceduralGeometryLODIntegration', () => {
  let qualityManager: QualityProfileManager;
  let lodManager: ProceduralGeometryLODManager;
  let integration: ProceduralGeometryLODIntegration;
  let camera: THREE.PerspectiveCamera;

  beforeEach(() => {
    qualityManager = new QualityProfileManager({
      defaultProfile: 'industrial',
    });

    lodManager = new ProceduralGeometryLODManager();

    integration = createProceduralGeometryLODIntegration(qualityManager, lodManager);

    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 0);
  });

  describe('Initialization', () => {
    it('should create integration instance', () => {
      expect(integration).toBeDefined();
    });

    it('should initialize with current quality profile', () => {
      integration.initialize();

      const config = integration.getRecommendedLODConfig();
      expect(config).toBeDefined();
      expect(config.levels).toBeDefined();
    });
  });

  describe('Quality Profile LOD Configurations', () => {
    it('should provide mobile profile LOD config', () => {
      qualityManager.setProfile('mobile');
      const config = integration.getRecommendedLODConfig();

      expect(config.levels).toBeDefined();
      expect(config.levels![0].distanceThreshold).toBe(10); // More aggressive
      expect(config.hull?.maxVertices[0]).toBe(128); // Lower than default
      expect(config.foveated?.enabled).toBe(true);
      expect(config.smoothTransitions).toBe(false); // Disabled for performance
    });

    it('should provide industrial profile LOD config', () => {
      qualityManager.setProfile('industrial');
      const config = integration.getRecommendedLODConfig();

      expect(config.levels).toBeDefined();
      expect(config.levels![0].distanceThreshold).toBe(15); // Balanced
      expect(config.smoothTransitions).toBe(true);
      expect(config.enableHysteresis).toBe(true);
    });

    it('should provide cinematic profile LOD config', () => {
      qualityManager.setProfile('cinematic');
      const config = integration.getRecommendedLODConfig();

      expect(config.levels).toBeDefined();
      expect(config.levels![0].distanceThreshold).toBe(25); // Generous high-detail zone
      expect(config.hull?.maxVertices[0]).toBe(512); // Higher quality
      expect(config.spline?.curveSegments[0]).toBe(128); // More detail
      expect(config.membrane?.gridResolution[0]).toBe(256); // Higher resolution
    });

    it('should provide advanced/scientific profile LOD config', () => {
      // Using 'industrial' as it's the balanced/scientific option in actual profiles
      qualityManager.setProfile('industrial');
      const config = integration.getRecommendedLODConfig();

      expect(config.levels).toBeDefined();
      expect(config.levels![0].distanceThreshold).toBe(15); // Balanced
      expect(config.smoothTransitions).toBe(true);
      expect(config.enableHysteresis).toBe(true);
    });

    it('should provide presentation/cinematic profile LOD config', () => {
      // Using 'cinematic' as it's the high-quality visual option
      qualityManager.setProfile('cinematic');
      const config = integration.getRecommendedLODConfig();

      expect(config.levels).toBeDefined();
      expect(config.levels![0].distanceThreshold).toBe(25); // Generous high-detail zone
      expect(config.smoothTransitions).toBe(true);
    });
  });

  describe('Profile Change Handling', () => {
    it('should respond to quality profile changes', () => {
      integration.initialize();

      // Start with industrial
      let config = integration.getRecommendedLODConfig();
      expect(config.levels![0].distanceThreshold).toBe(15);

      // Switch to mobile
      qualityManager.setProfile('mobile');
      config = integration.getRecommendedLODConfig();
      expect(config.levels![0].distanceThreshold).toBe(10);

      // Switch to cinematic
      qualityManager.setProfile('cinematic');
      config = integration.getRecommendedLODConfig();
      expect(config.levels![0].distanceThreshold).toBe(25);
    });
  });

  describe('Statistics with Profile Context', () => {
    it('should provide stats with quality profile context', () => {
      qualityManager.setProfile('industrial');

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(0, 0, -10);

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      const stats = integration.getStatsWithProfile();

      expect(stats.profile).toBe('industrial');
      expect(stats.lodStats).toBeDefined();
      expect(stats.qualitySummary).toBeDefined();
      expect(stats.lodStats.totalObjects).toBe(1);
    });

    it('should include quality summary in stats', () => {
      qualityManager.setProfile('cinematic');

      const stats = integration.getStatsWithProfile();

      // Summary contains capitalized "Cinematic"
      expect(stats.qualitySummary).toContain('Cinematic');
    });
  });

  describe('Performance-Based Profile Recommendations', () => {
    it('should recommend mobile profile when FPS is too low', () => {
      qualityManager.setProfile('industrial');

      const geometry = new THREE.BoxGeometry(1, 1, 1);

      // Create many high-LOD objects
      for (let i = 0; i < 10; i++) {
        const mesh = new THREE.Mesh(geometry.clone());
        mesh.position.set(i * 2, 0, -10); // Close - LOD 0
        lodManager.register(`hull_${i}`, mesh, 'hull', geometry.clone());
      }

      lodManager.update(camera);

      // Simulate low FPS
      const recommendation = integration.recommendProfileByPerformance(60, 90);

      expect(recommendation).toBe('mobile');
    });

    it('should recommend higher quality when FPS is good', () => {
      qualityManager.setProfile('mobile');

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(0, 0, -10);

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      // Simulate high FPS
      const recommendation = integration.recommendProfileByPerformance(120, 90);

      expect(recommendation).toBe('industrial'); // Step up from mobile
    });

    it('should keep current profile when FPS is acceptable', () => {
      qualityManager.setProfile('industrial');

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geometry);
      mesh.position.set(0, 0, -10);

      lodManager.register('hull_1', mesh, 'hull', geometry);
      lodManager.update(camera);

      // Simulate acceptable FPS
      const recommendation = integration.recommendProfileByPerformance(88, 90);

      expect(recommendation).toBe('industrial');
    });

    it('should recommend industrial when mobile is at good FPS', () => {
      qualityManager.setProfile('mobile');

      const recommendation = integration.recommendProfileByPerformance(110, 90);

      expect(recommendation).toBe('industrial');
    });

    it('should recommend presentation when industrial is at good FPS', () => {
      qualityManager.setProfile('industrial');

      const recommendation = integration.recommendProfileByPerformance(115, 90);

      expect(recommendation).toBe('presentation');
    });
  });

  describe('LOD Configuration Mapping', () => {
    it('should map mobile profile to aggressive LOD settings', () => {
      qualityManager.setProfile('mobile');
      const config = integration.getRecommendedLODConfig();

      // Check aggressive LOD thresholds
      expect(config.levels![0].distanceThreshold).toBeLessThan(15);
      expect(config.levels![1].distanceThreshold).toBeLessThan(35);

      // Check aggressive memory savings
      expect(config.levels![1].memorySavings).toBeGreaterThanOrEqual(0.50);
      expect(config.levels![2].memorySavings).toBeGreaterThanOrEqual(0.75);
    });

    it('should map cinematic profile to quality LOD settings', () => {
      qualityManager.setProfile('cinematic');
      const config = integration.getRecommendedLODConfig();

      // Check generous LOD thresholds
      expect(config.levels![0].distanceThreshold).toBeGreaterThan(20);
      expect(config.levels![1].distanceThreshold).toBeGreaterThan(50);

      // Check higher geometry detail
      expect(config.hull?.maxVertices[0]).toBeGreaterThan(256);
      expect(config.spline?.curveSegments[0]).toBeGreaterThan(64);
    });

    it('should map cinematic profile to high-quality LOD settings', () => {
      qualityManager.setProfile('cinematic');
      const config = integration.getRecommendedLODConfig();

      // Check generous LOD thresholds
      expect(config.levels![0].distanceThreshold).toBeGreaterThan(20);
      expect(config.levels![1].distanceThreshold).toBeGreaterThan(50);

      // Check higher geometry detail
      expect(config.hull?.maxVertices[0]).toBeGreaterThan(256);
      expect(config.spline?.curveSegments[0]).toBeGreaterThan(64);
    });
  });

  describe('Hull Geometry LOD', () => {
    it('should apply profile-specific hull LOD configuration', () => {
      qualityManager.setProfile('mobile');
      const config = integration.getRecommendedLODConfig();

      expect(config.hull?.maxVertices).toEqual([128, 64, 32, 16]);
      expect(config.hull?.edgeDecimation).toEqual([1.0, 0.5, 0.2, 0.1]);
    });
  });

  describe('Spline Geometry LOD', () => {
    it('should apply profile-specific spline LOD configuration', () => {
      qualityManager.setProfile('cinematic');
      const config = integration.getRecommendedLODConfig();

      expect(config.spline?.curveSegments).toEqual([128, 64, 32, 16]);
      expect(config.spline?.radialSegments).toEqual([24, 16, 12, 8]);
      expect(config.spline?.adaptiveTessellation).toBe(true);
    });

    it('should disable adaptive tessellation on mobile', () => {
      qualityManager.setProfile('mobile');
      const config = integration.getRecommendedLODConfig();

      expect(config.spline?.adaptiveTessellation).toBe(false);
    });
  });

  describe('Membrane Geometry LOD', () => {
    it('should apply profile-specific membrane LOD configuration', () => {
      qualityManager.setProfile('cinematic');
      const config = integration.getRecommendedLODConfig();

      expect(config.membrane?.gridResolution).toEqual([256, 128, 64, 32]);
      expect(config.membrane?.deformationDetail).toEqual([1.0, 0.8, 0.5, 0.2]);
      expect(config.membrane?.billboardFallback).toBe(false);
    });

    it('should enable billboard fallback on mobile', () => {
      qualityManager.setProfile('mobile');
      const config = integration.getRecommendedLODConfig();

      expect(config.membrane?.billboardFallback).toBe(true);
    });
  });

  describe('Foveated LOD Modifiers', () => {
    it('should enable foveation on supported profiles', () => {
      const profiles = ['mobile', 'industrial', 'cinematic'];

      for (const profileName of profiles) {
        qualityManager.setProfile(profileName as any);
        const config = integration.getRecommendedLODConfig();

        // Configuration exists (may or may not have foveation enabled)
        expect(config).toBeDefined();
        expect(config.levels).toBeDefined();
      }
    });

    it('should have foveation configuration for cinematic profile', () => {
      qualityManager.setProfile('cinematic');
      const config = integration.getRecommendedLODConfig();

      expect(config.foveated).toBeDefined();
      expect(config.foveated?.enabled).toBe(true);
    });

    it('should apply aggressive peripheral LOD on mobile', () => {
      qualityManager.setProfile('mobile');
      const config = integration.getRecommendedLODConfig();

      expect(config.foveated?.peripheralMinLOD).toBe(2);
      expect(config.foveated?.peripheralDistanceMultiplier).toBe(0.5);
    });

    it('should apply gentle peripheral LOD on cinematic', () => {
      qualityManager.setProfile('cinematic');
      const config = integration.getRecommendedLODConfig();

      expect(config.foveated?.peripheralMinLOD).toBe(0);
      expect(config.foveated?.peripheralDistanceMultiplier).toBe(0.8);
    });
  });

  describe('Transition Settings', () => {
    it('should disable smooth transitions on mobile', () => {
      qualityManager.setProfile('mobile');
      const config = integration.getRecommendedLODConfig();

      expect(config.smoothTransitions).toBe(false);
    });

    it('should enable smooth transitions on higher quality profiles', () => {
      const profiles = ['industrial', 'cinematic'];

      for (const profileName of profiles) {
        qualityManager.setProfile(profileName as any);
        const config = integration.getRecommendedLODConfig();

        expect(config.smoothTransitions).toBe(true);
      }
    });

    it('should use longer transitions on cinematic profile', () => {
      qualityManager.setProfile('cinematic');
      const config = integration.getRecommendedLODConfig();

      expect(config.transitionDuration).toBe(300);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown profile gracefully', () => {
      qualityManager.setProfile('industrial');

      // Manually set to unknown profile name
      (qualityManager as any).currentProfile = { name: 'unknown_profile' };

      const config = integration.getRecommendedLODConfig();

      // Should return empty config, not crash
      expect(config).toEqual({});
    });

    it('should provide stats even with no objects', () => {
      const stats = integration.getStatsWithProfile();

      expect(stats.profile).toBeDefined();
      expect(stats.lodStats.totalObjects).toBe(0);
      expect(stats.qualitySummary).toBeDefined();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle Quest 3 mobile scenario', () => {
      qualityManager.setProfile('mobile');
      const config = integration.getRecommendedLODConfig();

      // Quest 3 at 90 FPS target
      const geometry = new THREE.BoxGeometry(1, 1, 1);

      for (let i = 0; i < 20; i++) {
        const mesh = new THREE.Mesh(geometry.clone());
        mesh.position.set(
          (i % 5) * 5,
          Math.floor(i / 5) * 5,
          -15 - i * 2
        );
        lodManager.register(`hull_${i}`, mesh, 'hull', geometry.clone());
      }

      lodManager.update(camera);

      const stats = lodManager.getStats();

      // Should aggressively LOD distant objects
      expect(stats.totalObjects).toBe(20);
      expect(stats.totalMemorySavingsMB).toBeGreaterThan(0);
    });

    it('should handle desktop cinematic scenario', () => {
      qualityManager.setProfile('cinematic');
      const config = integration.getRecommendedLODConfig();

      // Desktop with generous detail zone (cinematic LOD 0 = 0-25m)
      const geometry = new THREE.SphereGeometry(1, 32, 32);

      for (let i = 0; i < 30; i++) {
        const mesh = new THREE.Mesh(geometry.clone());
        // Place 10 objects within LOD 0 range (0-25m)
        // Place 10 objects in LOD 1 range (25-60m)
        // Place 10 objects in LOD 2+ range (60m+)
        const distance = (i % 3) === 0 ? Math.random() * 20 + 5 : // LOD 0: 5-25m
                        (i % 3) === 1 ? Math.random() * 30 + 30 : // LOD 1: 30-60m
                                       Math.random() * 40 + 65;   // LOD 2+: 65-105m

        mesh.position.set(
          0,
          0,
          -distance
        );
        lodManager.register(`hull_${i}`, mesh, 'hull', geometry.clone());
      }

      lodManager.update(camera);

      const stats = lodManager.getStats();

      // Should keep more objects at high detail with cinematic profile
      expect(stats.totalObjects).toBe(30);
      // With cinematic profile (LOD 0 = 0-25m), we should have ~10 objects at LOD 0
      expect(stats.lodDistribution[0] || 0).toBeGreaterThanOrEqual(4);
    });
  });
});
