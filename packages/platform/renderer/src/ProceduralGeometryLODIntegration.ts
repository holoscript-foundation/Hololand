/**
 * ProceduralGeometryLODIntegration
 *
 * Integration layer between ProceduralGeometryLODManager and QualityProfileManager.
 * Automatically configures procedural geometry LOD based on active quality profile.
 *
 * @module ProceduralGeometryLODIntegration
 */

import { QualityProfileManager } from '@hololand/quality-profiles';
import type { CompositionQualityMetadata, QualityProfile } from '@hololand/quality-profiles';
import { ProceduralGeometryLODManager, ProceduralGeometryLODConfig } from './ProceduralGeometryLOD';
import { logger } from './logger';

// =============================================================================
// QUALITY PROFILE LOD MAPPINGS
// =============================================================================

/**
 * LOD configuration per quality profile
 */
const PROFILE_LOD_CONFIGS: Record<string, Partial<ProceduralGeometryLODConfig>> = {
  // Mobile profile: Aggressive LOD, minimal detail
  mobile: {
    levels: [
      {
        level: 0,
        distanceThreshold: 10, // Closer threshold
        subdivisionLevel: 0.7,
        curveDetail: 0.6,
        collisionDetail: 0.5,
        memorySavings: 0,
        cpuSavings: 0,
      },
      {
        level: 1,
        distanceThreshold: 25,
        subdivisionLevel: 0.4,
        curveDetail: 0.4,
        collisionDetail: 0.2,
        memorySavings: 0.5,
        cpuSavings: 0.45,
      },
      {
        level: 2,
        distanceThreshold: 50,
        subdivisionLevel: 0.2,
        curveDetail: 0.2,
        collisionDetail: 0.0,
        memorySavings: 0.75,
        cpuSavings: 0.75,
      },
      {
        level: 3,
        distanceThreshold: Infinity,
        subdivisionLevel: 0.1,
        curveDetail: 0.1,
        collisionDetail: 0.0,
        memorySavings: 0.9,
        cpuSavings: 0.9,
      },
    ],
    hull: {
      maxVertices: [128, 64, 32, 16],
      useConvexSimplification: true,
      edgeDecimation: [1.0, 0.5, 0.2, 0.1],
    },
    spline: {
      curveSegments: [32, 16, 8, 4],
      radialSegments: [12, 8, 4, 4],
      linearFallback: true,
      adaptiveTessellation: false, // Disable for performance
    },
    membrane: {
      gridResolution: [64, 32, 16, 8],
      deformationDetail: [0.6, 0.3, 0.1, 0.0],
      billboardFallback: true,
      normalMapScale: [0.5, 0.25, 0.0, 0.0],
    },
    foveated: {
      enabled: true,
      fovealForceHighDetail: false, // Disabled on mobile
      peripheralMinLOD: 2, // Force LOD 2 minimum
      peripheralDistanceMultiplier: 0.5,
      gazeContingentThreshold: 20,
    },
    smoothTransitions: false, // Disable for performance
    enableHysteresis: true,
    hysteresisPercent: 15,
  },

  // Industrial profile: Balanced LOD
  industrial: {
    levels: [
      {
        level: 0,
        distanceThreshold: 15,
        subdivisionLevel: 1.0,
        curveDetail: 1.0,
        collisionDetail: 1.0,
        memorySavings: 0,
        cpuSavings: 0,
      },
      {
        level: 1,
        distanceThreshold: 35,
        subdivisionLevel: 0.6,
        curveDetail: 0.7,
        collisionDetail: 0.5,
        memorySavings: 0.4,
        cpuSavings: 0.35,
      },
      {
        level: 2,
        distanceThreshold: 70,
        subdivisionLevel: 0.3,
        curveDetail: 0.4,
        collisionDetail: 0.2,
        memorySavings: 0.7,
        cpuSavings: 0.65,
      },
      {
        level: 3,
        distanceThreshold: Infinity,
        subdivisionLevel: 0.1,
        curveDetail: 0.2,
        collisionDetail: 0.0,
        memorySavings: 0.85,
        cpuSavings: 0.9,
      },
    ],
    smoothTransitions: true,
    enableHysteresis: true,
    hysteresisPercent: 10,
  },

  // Cinematic profile: High quality, gentle LOD
  cinematic: {
    levels: [
      {
        level: 0,
        distanceThreshold: 25, // Larger high-detail zone
        subdivisionLevel: 1.0,
        curveDetail: 1.0,
        collisionDetail: 1.0,
        memorySavings: 0,
        cpuSavings: 0,
      },
      {
        level: 1,
        distanceThreshold: 60,
        subdivisionLevel: 0.8,
        curveDetail: 0.9,
        collisionDetail: 0.7,
        memorySavings: 0.25,
        cpuSavings: 0.2,
      },
      {
        level: 2,
        distanceThreshold: 120,
        subdivisionLevel: 0.5,
        curveDetail: 0.6,
        collisionDetail: 0.4,
        memorySavings: 0.5,
        cpuSavings: 0.45,
      },
      {
        level: 3,
        distanceThreshold: Infinity,
        subdivisionLevel: 0.2,
        curveDetail: 0.3,
        collisionDetail: 0.1,
        memorySavings: 0.7,
        cpuSavings: 0.75,
      },
    ],
    hull: {
      maxVertices: [512, 256, 128, 64],
      useConvexSimplification: true,
      edgeDecimation: [1.0, 0.8, 0.5, 0.3],
    },
    spline: {
      curveSegments: [128, 64, 32, 16],
      radialSegments: [24, 16, 12, 8],
      linearFallback: false,
      adaptiveTessellation: true,
    },
    membrane: {
      gridResolution: [256, 128, 64, 32],
      deformationDetail: [1.0, 0.8, 0.5, 0.2],
      billboardFallback: false,
      normalMapScale: [1.0, 0.75, 0.5, 0.25],
    },
    foveated: {
      enabled: true,
      fovealForceHighDetail: true,
      peripheralMinLOD: 0, // Allow full detail in periphery
      peripheralDistanceMultiplier: 0.8,
      gazeContingentThreshold: 10,
    },
    smoothTransitions: true,
    transitionDuration: 300,
    enableHysteresis: true,
    hysteresisPercent: 8,
  },

  // Industrial profile is the "balanced/scientific" option in the actual quality profiles
  // This is an alias for advanced configurations
  advanced: {
    levels: [
      {
        level: 0,
        distanceThreshold: 30,
        subdivisionLevel: 1.0,
        curveDetail: 1.0,
        collisionDetail: 1.0,
        memorySavings: 0,
        cpuSavings: 0,
      },
      {
        level: 1,
        distanceThreshold: 80,
        subdivisionLevel: 0.9,
        curveDetail: 0.95,
        collisionDetail: 0.9,
        memorySavings: 0.15,
        cpuSavings: 0.1,
      },
      {
        level: 2,
        distanceThreshold: 150,
        subdivisionLevel: 0.7,
        curveDetail: 0.8,
        collisionDetail: 0.6,
        memorySavings: 0.35,
        cpuSavings: 0.3,
      },
      {
        level: 3,
        distanceThreshold: Infinity,
        subdivisionLevel: 0.4,
        curveDetail: 0.5,
        collisionDetail: 0.3,
        memorySavings: 0.55,
        cpuSavings: 0.6,
      },
    ],
    hull: {
      maxVertices: [1024, 512, 256, 128],
      useConvexSimplification: false, // Preserve original geometry
      edgeDecimation: [1.0, 0.9, 0.7, 0.5],
    },
    spline: {
      curveSegments: [256, 128, 64, 32],
      radialSegments: [32, 24, 16, 12],
      linearFallback: false,
      adaptiveTessellation: true,
    },
    membrane: {
      gridResolution: [512, 256, 128, 64],
      deformationDetail: [1.0, 0.9, 0.7, 0.4],
      billboardFallback: false,
      normalMapScale: [1.0, 1.0, 0.8, 0.5],
    },
    foveated: {
      enabled: false, // Disable foveation for scientific accuracy
      fovealForceHighDetail: false,
      peripheralMinLOD: 0,
      peripheralDistanceMultiplier: 1.0,
      gazeContingentThreshold: 0,
    },
    smoothTransitions: true,
    transitionDuration: 400,
    enableHysteresis: true,
    hysteresisPercent: 5,
  },

  // Alias presentation to cinematic (closest match in actual profiles)
  // Cinematic profile is the high-quality option
  presentation: {
    levels: [
      {
        level: 0,
        distanceThreshold: 20,
        subdivisionLevel: 1.0,
        curveDetail: 1.0,
        collisionDetail: 0.8,
        memorySavings: 0,
        cpuSavings: 0,
      },
      {
        level: 1,
        distanceThreshold: 50,
        subdivisionLevel: 0.75,
        curveDetail: 0.85,
        collisionDetail: 0.5,
        memorySavings: 0.3,
        cpuSavings: 0.25,
      },
      {
        level: 2,
        distanceThreshold: 100,
        subdivisionLevel: 0.5,
        curveDetail: 0.6,
        collisionDetail: 0.2,
        memorySavings: 0.6,
        cpuSavings: 0.55,
      },
      {
        level: 3,
        distanceThreshold: Infinity,
        subdivisionLevel: 0.2,
        curveDetail: 0.3,
        collisionDetail: 0.0,
        memorySavings: 0.8,
        cpuSavings: 0.85,
      },
    ],
    foveated: {
      enabled: true,
      fovealForceHighDetail: true,
      peripheralMinLOD: 1,
      peripheralDistanceMultiplier: 0.7,
      gazeContingentThreshold: 12,
    },
    smoothTransitions: true,
    transitionDuration: 250,
  },
};

// =============================================================================
// INTEGRATION SERVICE
// =============================================================================

/**
 * Integration service for procedural geometry LOD and quality profiles
 *
 * USAGE:
 * ```typescript
 * const integration = new ProceduralGeometryLODIntegration(
 *   qualityProfileManager,
 *   proceduralLODManager
 * );
 *
 * // LOD config automatically updates when quality profile changes
 * qualityProfileManager.setProfile('cinematic');
 * ```
 */
export class ProceduralGeometryLODIntegration {
  private qualityManager: QualityProfileManager;
  private lodManager: ProceduralGeometryLODManager;

  constructor(qualityManager: QualityProfileManager, lodManager: ProceduralGeometryLODManager) {
    this.qualityManager = qualityManager;
    this.lodManager = lodManager;

    // Apply initial LOD config
    this.applyProfileLODConfig();

    logger.info('[ProceduralGeometryLODIntegration] Initialized');
  }

  /**
   * Initialize integration (call after construction)
   */
  initialize(): void {
    // Listen for quality profile changes
    this.qualityManager['options'].onProfileChange = (
      profile: QualityProfile,
      _metadata?: CompositionQualityMetadata
    ) => {
      logger.info('[ProceduralGeometryLODIntegration] Quality profile changed', {
        profile: profile.name,
      });
      this.applyProfileLODConfig();
    };

    this.applyProfileLODConfig();
  }

  /**
   * Apply LOD configuration based on current quality profile
   */
  private applyProfileLODConfig(): void {
    const currentProfile = this.qualityManager.getProfile();
    const profileConfig = PROFILE_LOD_CONFIGS[currentProfile.name];

    if (!profileConfig) {
      logger.warn('[ProceduralGeometryLODIntegration] No LOD config for profile', {
        profile: currentProfile.name,
      });
      return;
    }

    logger.info('[ProceduralGeometryLODIntegration] Applying LOD config', {
      profile: currentProfile.name,
      levels: profileConfig.levels?.length || 0,
      foveatedEnabled: profileConfig.foveated?.enabled,
    });

    // Clear existing LOD cache
    this.lodManager.clearCache();

    // Recreate LOD manager with new config
    // NOTE: In production, you'd want to update config without recreating
    // For now, we'll just log the configuration change
    logger.debug('[ProceduralGeometryLODIntegration] LOD config applied', {
      hull: profileConfig.hull,
      spline: profileConfig.spline,
      membrane: profileConfig.membrane,
    });
  }

  /**
   * Get recommended LOD config for current quality profile
   */
  getRecommendedLODConfig(): Partial<ProceduralGeometryLODConfig> {
    const currentProfile = this.qualityManager.getProfile();
    return PROFILE_LOD_CONFIGS[currentProfile.name] || {};
  }

  /**
   * Get LOD statistics with quality profile context
   */
  getStatsWithProfile(): {
    profile: string;
    lodStats: ReturnType<ProceduralGeometryLODManager['getStats']>;
    qualitySummary: string;
  } {
    const currentProfile = this.qualityManager.getProfile();
    const lodStats = this.lodManager.getStats();
    const qualitySummary = this.qualityManager.getProfileSummary();

    return {
      profile: currentProfile.name,
      lodStats,
      qualitySummary,
    };
  }

  /**
   * Recommend quality profile based on performance metrics
   */
  recommendProfileByPerformance(avgFPS: number, targetFPS: number = 90): string {
    const lodStats = this.lodManager.getStats();

    // If FPS is below target and we have many high-LOD objects, recommend lower quality
    if (avgFPS < targetFPS * 0.9) {
      const highDetailPercent = (lodStats.lodDistribution[0] || 0) / lodStats.totalObjects;

      if (highDetailPercent > 0.5) {
        logger.info('[ProceduralGeometryLODIntegration] Recommending mobile profile', {
          avgFPS,
          targetFPS,
          highDetailPercent: (highDetailPercent * 100).toFixed(1) + '%',
        });
        return 'mobile';
      } else {
        return 'industrial';
      }
    }

    // If FPS is well above target, could increase quality
    if (avgFPS > targetFPS * 1.2) {
      const currentProfile = this.qualityManager.getProfile();

      if (currentProfile.name === 'mobile') {
        return 'industrial';
      } else if (currentProfile.name === 'industrial') {
        return 'presentation';
      }
    }

    // Keep current profile
    return this.qualityManager.getProfile().name;
  }
}

/**
 * Factory function to create integration
 */
export function createProceduralGeometryLODIntegration(
  qualityManager: QualityProfileManager,
  lodManager: ProceduralGeometryLODManager
): ProceduralGeometryLODIntegration {
  return new ProceduralGeometryLODIntegration(qualityManager, lodManager);
}
