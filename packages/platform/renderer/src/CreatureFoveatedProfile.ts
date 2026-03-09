/**
 * CreatureFoveatedProfile
 *
 * Foveated rendering profile for organic creatures in VR.
 * Combines gaze-contingent rendering with body-region importance
 * to maximize visual quality within the 11.1ms frame budget.
 *
 * STRATEGY:
 * - Foveal zone (0-10 deg from gaze): Full detail on looked-at region
 * - Parafoveal zone (10-25 deg): LOD 0-1 detail
 * - Peripheral zone (25+ deg): LOD 2-3 detail
 *
 * INTEGRATION POINTS:
 * - FoveatedGaussianRenderer: Gaze data provider
 * - ProceduralGeometryLODManager: LOD switching
 * - DragonMeshBatcher: Batch group visibility
 * - VolumetricFireRenderer: Foveated fire quality
 *
 * PERFORMANCE BUDGET: < 0.3ms for foveation calculations per frame
 *
 * @module CreatureFoveatedProfile
 */

import * as THREE from 'three';
import { logger } from './logger';
import type { FoveatedLODModifiers } from './ProceduralGeometryLOD';
import type { CreatureBodyRegion } from './DragonMeshBatcher';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Foveated rendering zone
 */
export type FoveatedZoneType = 'foveal' | 'parafoveal' | 'peripheral';

/**
 * Eye tracking data (from WebXR or fixed center)
 */
export interface EyeTrackingData {
  /** Gaze direction (normalized) */
  gazeDirection: THREE.Vector3;
  /** Gaze origin (camera position) */
  gazeOrigin: THREE.Vector3;
  /** Left eye gaze ray (for stereo rendering) */
  leftEye?: { direction: THREE.Vector3; origin: THREE.Vector3 };
  /** Right eye gaze ray (for stereo rendering) */
  rightEye?: { direction: THREE.Vector3; origin: THREE.Vector3 };
  /** Whether eye tracking is available */
  hasEyeTracking: boolean;
  /** Eye tracking confidence (0-1) */
  confidence: number;
}

/**
 * Foveated zone configuration
 */
export interface FoveatedZoneConfig {
  /** Zone type */
  zone: FoveatedZoneType;
  /** Angular radius from gaze center (degrees) */
  angularRadius: number;
  /** Quality multiplier for this zone (0-1) */
  qualityMultiplier: number;
  /** LOD level override for this zone (-1 = use distance-based) */
  lodOverride: number;
  /** Render resolution scale for this zone */
  renderScale: number;
  /** Animation detail level (0=disabled, 1=full) */
  animationDetail: number;
  /** Fire/volumetric quality level for this zone */
  volumetricQuality: number;
}

/**
 * Body region foveated state
 */
export interface RegionFoveatedState {
  /** Body region */
  region: CreatureBodyRegion;
  /** Current foveated zone */
  zone: FoveatedZoneType;
  /** Angular distance from gaze center (degrees) */
  angularDistance: number;
  /** Effective quality multiplier */
  qualityMultiplier: number;
  /** Active LOD level */
  activeLOD: number;
  /** Whether region is currently visible */
  visible: boolean;
  /** Importance weight for this region */
  importance: number;
}

/**
 * Creature foveated profile configuration
 */
export interface CreatureFoveatedConfig {
  /** Foveated zones */
  zones: FoveatedZoneConfig[];
  /** Body region importance weights */
  regionImportance: Record<CreatureBodyRegion, number>;
  /** Whether to use smooth zone transitions */
  smoothTransitions: boolean;
  /** Transition blend width (degrees) */
  transitionBlendWidth: number;
  /** Minimum quality for any visible region (prevents pop-in) */
  minimumQuality: number;
  /** Whether to apply foveation to volumetric fire */
  foveatedFire: boolean;
  /** Whether to apply foveation to animations */
  foveatedAnimations: boolean;
  /** Frame budget for foveation calculations (ms) */
  computeBudgetMs: number;
  /** Update frequency (every N frames) */
  updateEveryNFrames: number;
}

/**
 * Foveated rendering metrics
 */
export interface CreatureFoveatedMetrics {
  /** Current gaze-targeted body region */
  gazeTargetRegion: CreatureBodyRegion | null;
  /** Regions in foveal zone */
  fovealRegions: number;
  /** Regions in parafoveal zone */
  parafovealRegions: number;
  /** Regions in peripheral zone */
  peripheralRegions: number;
  /** Average quality multiplier across all regions */
  averageQuality: number;
  /** Estimated vertex savings from foveation */
  vertexSavingsPercent: number;
  /** Computation time for last foveation update (ms) */
  lastComputeTimeMs: number;
  /** Whether eye tracking is active */
  eyeTrackingActive: boolean;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default foveated zone configuration for VR creatures
 */
const DEFAULT_FOVEATED_ZONES: FoveatedZoneConfig[] = [
  {
    zone: 'foveal',
    angularRadius: 10,
    qualityMultiplier: 1.0,
    lodOverride: 0,           // Force LOD 0 in foveal zone
    renderScale: 1.0,
    animationDetail: 1.0,
    volumetricQuality: 1.0,
  },
  {
    zone: 'parafoveal',
    angularRadius: 25,
    qualityMultiplier: 0.7,
    lodOverride: -1,          // Use distance-based LOD
    renderScale: 0.75,
    animationDetail: 0.7,
    volumetricQuality: 0.6,
  },
  {
    zone: 'peripheral',
    angularRadius: 180,       // Everything else
    qualityMultiplier: 0.3,
    lodOverride: 2,           // Force at least LOD 2 in periphery
    renderScale: 0.5,
    animationDetail: 0.3,
    volumetricQuality: 0.2,
  },
];

/**
 * Default body region importance for dragon/creature
 */
const DEFAULT_REGION_IMPORTANCE: Record<CreatureBodyRegion, number> = {
  head: 1.0,
  jaw: 0.9,
  neck: 0.7,
  torso: 0.6,
  'wing-left': 0.5,
  'wing-right': 0.5,
  'leg-front-left': 0.4,
  'leg-front-right': 0.4,
  'leg-back-left': 0.3,
  'leg-back-right': 0.3,
  tail: 0.3,
  spines: 0.2,
  fire: 0.8,
  embers: 0.3,
  smoke: 0.2,
  platform: 0.1,
  lighting: 0.0,
};

const DEFAULT_CREATURE_FOVEATED_CONFIG: CreatureFoveatedConfig = {
  zones: DEFAULT_FOVEATED_ZONES,
  regionImportance: DEFAULT_REGION_IMPORTANCE,
  smoothTransitions: true,
  transitionBlendWidth: 5,   // 5 degree blend between zones
  minimumQuality: 0.1,
  foveatedFire: true,
  foveatedAnimations: true,
  computeBudgetMs: 0.3,
  updateEveryNFrames: 2,     // Update foveation every other frame
};

// =============================================================================
// CREATURE FOVEATED RENDERER
// =============================================================================

/**
 * CreatureFoveatedRenderer manages gaze-contingent quality distribution
 * across body regions of complex organic models.
 *
 * @example
 * ```typescript
 * const foveated = new CreatureFoveatedRenderer();
 *
 * // Each frame:
 * const eyeData = getEyeTrackingData(); // From WebXR
 * const regionPositions = getRegionCentroids(dragon);
 * const states = foveated.update(eyeData, regionPositions);
 *
 * // Apply foveated states to LOD manager
 * for (const state of states) {
 *   if (state.activeLOD >= 0) {
 *     lodManager.forceLOD(state.region, state.activeLOD);
 *   }
 * }
 * ```
 */
export class CreatureFoveatedRenderer {
  private config: CreatureFoveatedConfig;
  private regionStates: Map<CreatureBodyRegion, RegionFoveatedState> = new Map();
  private frameCount: number = 0;
  private metrics: CreatureFoveatedMetrics;

  // Cached vectors to avoid per-frame allocation
  private tempVec3 = new THREE.Vector3();
  private tempDirection = new THREE.Vector3();

  constructor(config?: Partial<CreatureFoveatedConfig>) {
    this.config = { ...DEFAULT_CREATURE_FOVEATED_CONFIG, ...config };

    this.metrics = {
      gazeTargetRegion: null,
      fovealRegions: 0,
      parafovealRegions: 0,
      peripheralRegions: 0,
      averageQuality: 1.0,
      vertexSavingsPercent: 0,
      lastComputeTimeMs: 0,
      eyeTrackingActive: false,
    };

    logger.info('[CreatureFoveatedRenderer] Initialized', {
      zones: this.config.zones.map(z => `${z.zone}:${z.angularRadius}deg`),
      foveatedFire: this.config.foveatedFire,
      foveatedAnimations: this.config.foveatedAnimations,
    });
  }

  /**
   * Update foveated rendering states for all body regions.
   *
   * @param eyeData - Current eye tracking data
   * @param regionCentroids - Map of body region to world position
   * @returns Array of region foveated states
   */
  update(
    eyeData: EyeTrackingData,
    regionCentroids: Map<CreatureBodyRegion, THREE.Vector3>
  ): RegionFoveatedState[] {
    this.frameCount++;

    // Skip update on non-update frames
    if (this.frameCount % this.config.updateEveryNFrames !== 0) {
      return Array.from(this.regionStates.values());
    }

    const startTime = performance.now();
    this.metrics.eyeTrackingActive = eyeData.hasEyeTracking;

    let closestRegion: CreatureBodyRegion | null = null;
    let closestAngle = Infinity;

    let fovealCount = 0;
    let parafovealCount = 0;
    let peripheralCount = 0;
    let totalQuality = 0;
    let regionCount = 0;

    for (const [region, centroid] of regionCentroids) {
      // Calculate angular distance from gaze center
      this.tempDirection.subVectors(centroid, eyeData.gazeOrigin).normalize();
      const angleDeg = THREE.MathUtils.radToDeg(
        eyeData.gazeDirection.angleTo(this.tempDirection)
      );

      // Determine zone
      const zone = this.getZone(angleDeg);
      const zoneConfig = this.config.zones.find(z => z.zone === zone)!;

      // Calculate quality with smooth transitions
      let qualityMultiplier = zoneConfig.qualityMultiplier;
      if (this.config.smoothTransitions) {
        qualityMultiplier = this.smoothZoneTransition(
          angleDeg,
          qualityMultiplier
        );
      }

      // Apply region importance
      const importance = this.config.regionImportance[region] || 0.5;
      qualityMultiplier = Math.max(
        this.config.minimumQuality,
        qualityMultiplier * (0.5 + importance * 0.5) // Importance boosts quality floor
      );

      // Determine LOD level
      let activeLOD = zoneConfig.lodOverride;
      if (activeLOD < 0) {
        // Use quality-based LOD
        if (qualityMultiplier >= 0.8) activeLOD = 0;
        else if (qualityMultiplier >= 0.5) activeLOD = 1;
        else if (qualityMultiplier >= 0.2) activeLOD = 2;
        else activeLOD = 3;
      }

      const state: RegionFoveatedState = {
        region,
        zone,
        angularDistance: angleDeg,
        qualityMultiplier,
        activeLOD,
        visible: qualityMultiplier > 0,
        importance,
      };

      this.regionStates.set(region, state);

      // Track closest region
      if (angleDeg < closestAngle) {
        closestAngle = angleDeg;
        closestRegion = region;
      }

      // Count zones
      switch (zone) {
        case 'foveal': fovealCount++; break;
        case 'parafoveal': parafovealCount++; break;
        case 'peripheral': peripheralCount++; break;
      }

      totalQuality += qualityMultiplier;
      regionCount++;
    }

    // Update metrics
    this.metrics.gazeTargetRegion = closestRegion;
    this.metrics.fovealRegions = fovealCount;
    this.metrics.parafovealRegions = parafovealCount;
    this.metrics.peripheralRegions = peripheralCount;
    this.metrics.averageQuality = regionCount > 0 ? totalQuality / regionCount : 1.0;
    this.metrics.vertexSavingsPercent = (1.0 - this.metrics.averageQuality) * 100;
    this.metrics.lastComputeTimeMs = performance.now() - startTime;

    return Array.from(this.regionStates.values());
  }

  /**
   * Get the foveated zone for a given angular distance.
   */
  private getZone(angleDeg: number): FoveatedZoneType {
    for (const zone of this.config.zones) {
      if (angleDeg <= zone.angularRadius) {
        return zone.zone;
      }
    }
    return 'peripheral';
  }

  /**
   * Apply smooth zone transition blending.
   */
  private smoothZoneTransition(
    angleDeg: number,
    baseQuality: number
  ): number {
    const blendWidth = this.config.transitionBlendWidth;

    for (let i = 0; i < this.config.zones.length - 1; i++) {
      const currentZone = this.config.zones[i];
      const nextZone = this.config.zones[i + 1];
      const boundary = currentZone.angularRadius;

      if (angleDeg >= boundary - blendWidth && angleDeg <= boundary + blendWidth) {
        // Blend between zones
        const t = (angleDeg - (boundary - blendWidth)) / (blendWidth * 2);
        const smoothT = t * t * (3 - 2 * t); // Smoothstep
        return THREE.MathUtils.lerp(
          currentZone.qualityMultiplier,
          nextZone.qualityMultiplier,
          smoothT
        );
      }
    }

    return baseQuality;
  }

  /**
   * Get the fire quality level based on gaze position relative to fire region.
   */
  getFireQuality(): number {
    if (!this.config.foveatedFire) return 1.0;

    const fireState = this.regionStates.get('fire');
    if (!fireState) return 0.5;

    const zoneConfig = this.config.zones.find(z => z.zone === fireState.zone);
    return zoneConfig?.volumetricQuality || 0.5;
  }

  /**
   * Get animation detail level for a specific animation.
   */
  getAnimationDetail(animationRegion: CreatureBodyRegion): number {
    if (!this.config.foveatedAnimations) return 1.0;

    const state = this.regionStates.get(animationRegion);
    if (!state) return 0.5;

    const zoneConfig = this.config.zones.find(z => z.zone === state.zone);
    return zoneConfig?.animationDetail || 0.5;
  }

  /**
   * Get current foveated rendering metrics.
   */
  getMetrics(): CreatureFoveatedMetrics {
    return { ...this.metrics };
  }

  /**
   * Get foveated LOD modifiers for ProceduralGeometryLODManager.
   */
  getFoveatedLODModifiers(): FoveatedLODModifiers {
    return {
      enabled: true,
      fovealForceHighDetail: true,
      peripheralMinLOD: 1,
      peripheralDistanceMultiplier: 0.7,
      gazeContingentThreshold: this.config.zones[0]?.angularRadius || 10,
    };
  }

  /**
   * Create default eye tracking data (fixed center, no eye tracking).
   */
  static createDefaultEyeData(
    cameraPosition: THREE.Vector3,
    cameraDirection: THREE.Vector3
  ): EyeTrackingData {
    return {
      gazeDirection: cameraDirection.clone().normalize(),
      gazeOrigin: cameraPosition.clone(),
      hasEyeTracking: false,
      confidence: 0.5,
    };
  }
}

/**
 * Factory function
 */
export function createCreatureFoveatedRenderer(
  config?: Partial<CreatureFoveatedConfig>
): CreatureFoveatedRenderer {
  return new CreatureFoveatedRenderer(config);
}
