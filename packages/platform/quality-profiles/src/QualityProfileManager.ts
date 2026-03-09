/**
 * QualityProfileManager
 *
 * Service for managing domain-specific quality tier profiles.
 * Integrates with HololandRenderer and HoloScript compositions.
 */

import type { QualitySettings } from '@hololand/renderer';
import {
  QualityProfileName,
  QualityProfile,
  CompositionQualityMetadata,
  QualityTraitConfig,
  QUALITY_PROFILES,
  RenderingPriority,
} from './types';

// =============================================================================
// QUALITY PROFILE MANAGER
// =============================================================================

export interface QualityProfileManagerOptions {
  /** Default profile when none specified */
  defaultProfile?: QualityProfileName;

  /** Enable automatic profile selection based on metadata */
  autoApply?: boolean;

  /** Callback when profile changes */
  onProfileChange?: (profile: QualityProfile, metadata?: CompositionQualityMetadata) => void;

  /** Callback for trait configuration application */
  onTraitConfigChange?: (traitConfig: QualityTraitConfig) => void;
}

export class QualityProfileManager {
  private currentProfile: QualityProfile;
  private currentMetadata?: CompositionQualityMetadata;
  private options: Required<QualityProfileManagerOptions>;

  constructor(options: QualityProfileManagerOptions = {}) {
    this.options = {
      defaultProfile: options.defaultProfile ?? 'industrial',
      autoApply: options.autoApply ?? true,
      onProfileChange: options.onProfileChange ?? (() => {}),
      onTraitConfigChange: options.onTraitConfigChange ?? (() => {}),
    };

    // Set initial profile
    this.currentProfile = QUALITY_PROFILES[this.options.defaultProfile];
  }

  // ===========================================================================
  // PROFILE MANAGEMENT
  // ===========================================================================

  /**
   * Get the current active profile
   */
  getProfile(): Readonly<QualityProfile> {
    return this.currentProfile;
  }

  /**
   * Get profile by name
   */
  getProfileByName(name: QualityProfileName): Readonly<QualityProfile> {
    return QUALITY_PROFILES[name];
  }

  /**
   * Get all available profiles
   */
  getAllProfiles(): readonly QualityProfile[] {
    return Object.values(QUALITY_PROFILES);
  }

  /**
   * Set active profile
   */
  setProfile(name: QualityProfileName, metadata?: CompositionQualityMetadata): void {
    this.currentProfile = QUALITY_PROFILES[name];
    this.currentMetadata = metadata;

    this.options.onProfileChange(this.currentProfile, metadata);
    this.options.onTraitConfigChange(this.getEffectiveTraitConfig());
  }

  /**
   * Apply profile from composition metadata
   */
  applyFromMetadata(metadata: CompositionQualityMetadata): void {
    if (!this.options.autoApply) {
      return;
    }

    const profileName = metadata.profile ?? this.options.defaultProfile;
    this.setProfile(profileName, metadata);
  }

  // ===========================================================================
  // SETTINGS COMPUTATION
  // ===========================================================================

  /**
   * Get effective quality settings with metadata overrides applied
   */
  getEffectiveQualitySettings(): QualitySettings {
    const baseSettings = this.currentProfile.renderSettings;
    const overrides = this.currentMetadata?.overrides ?? {};

    return {
      ...baseSettings,
      ...overrides,
    };
  }

  /**
   * Get effective trait configuration with metadata overrides applied
   */
  getEffectiveTraitConfig(): QualityTraitConfig {
    const baseConfig = this.currentProfile.traitConfig;
    const overrides = this.currentMetadata?.traitOverrides ?? {};

    return {
      lod: { ...baseConfig.lod, ...overrides.lod } as typeof baseConfig.lod,
      physics: { ...baseConfig.physics, ...overrides.physics } as typeof baseConfig.physics,
      networking: { ...baseConfig.networking, ...overrides.networking } as typeof baseConfig.networking,
      material: { ...baseConfig.material, ...overrides.material } as typeof baseConfig.material,
      animation: { ...baseConfig.animation, ...overrides.animation } as typeof baseConfig.animation,
    };
  }

  /**
   * Get effective rendering priority
   */
  getEffectivePriority(): RenderingPriority {
    return this.currentMetadata?.priorityOverride ?? this.currentProfile.priority;
  }

  // ===========================================================================
  // PROFILE RECOMMENDATION
  // ===========================================================================

  /**
   * Recommend profile based on use case tags
   */
  recommendProfileByTags(tags: string[]): QualityProfileName {
    const profiles = Object.values(QUALITY_PROFILES);

    // Score each profile by tag overlap
    const scores = profiles.map((profile) => {
      const overlap = tags.filter((tag) => profile.tags.includes(tag.toLowerCase()));
      return { name: profile.name, score: overlap.length };
    });

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Return highest scoring profile, or default if no matches
    return scores[0]?.score > 0 ? scores[0].name : this.options.defaultProfile;
  }

  /**
   * Recommend profile based on device type
   */
  recommendProfileByDevice(deviceType: string): QualityProfileName {
    const profiles = Object.values(QUALITY_PROFILES);

    for (const profile of profiles) {
      if (profile.recommendedDevices?.includes(deviceType)) {
        return profile.name;
      }
    }

    // Fallback logic
    if (deviceType.includes('quest') || deviceType.includes('mobile')) {
      return 'mobile';
    }
    if (deviceType.includes('pcvr') || deviceType.includes('desktop')) {
      return 'cinematic';
    }

    return this.options.defaultProfile;
  }

  /**
   * Recommend profile based on rendering priority
   */
  recommendProfileByPriority(priority: RenderingPriority): QualityProfileName {
    const profiles = Object.values(QUALITY_PROFILES);

    for (const profile of profiles) {
      if (profile.priority === priority) {
        return profile.name;
      }
    }

    return this.options.defaultProfile;
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Get profile summary for display
   */
  getProfileSummary(name?: QualityProfileName): string {
    const profile = name ? QUALITY_PROFILES[name] : this.currentProfile;

    const features: string[] = [];

    // Add key distinguishing features
    if (profile.priority === 'data-accuracy') {
      features.push(`Physics: ${profile.physicsAccuracy}`);
      features.push(`Collision: ${profile.traitConfig.physics?.collisionDetection}`);
    }

    if (profile.priority === 'visual-fidelity') {
      if (profile.renderSettings.bloom) features.push('Bloom');
      if (profile.renderSettings.ssao) features.push('SSAO');
      if (profile.renderSettings.ssr) features.push('SSR');
      features.push(`Shadows: ${profile.renderSettings.shadowMapSize}`);
    }

    if (profile.priority === 'performance') {
      features.push(`LOD Bias: ${profile.renderSettings.lodBias}`);
      features.push(`Target: ${profile.renderSettings.targetFPS} FPS`);
    }

    features.push(`Audio: ${profile.audioQuality}`);
    features.push(`Network: ${profile.networkSyncRate}Hz`);

    return `${profile.displayName} (${profile.priority}): ${features.join(', ')}`;
  }

  /**
   * Compare two profiles and get differences
   */
  compareProfiles(a: QualityProfileName, b: QualityProfileName): string[] {
    const profileA = QUALITY_PROFILES[a];
    const profileB = QUALITY_PROFILES[b];

    const diffs: string[] = [];

    // Priority
    if (profileA.priority !== profileB.priority) {
      diffs.push(`Priority: ${profileA.priority} → ${profileB.priority}`);
    }

    // Render settings differences
    const renderA = profileA.renderSettings;
    const renderB = profileB.renderSettings;

    if (renderA.shadowMapSize !== renderB.shadowMapSize) {
      diffs.push(`Shadow map: ${renderA.shadowMapSize} → ${renderB.shadowMapSize}`);
    }

    if (renderA.maxTextureSize !== renderB.maxTextureSize) {
      diffs.push(`Texture size: ${renderA.maxTextureSize} → ${renderB.maxTextureSize}`);
    }

    if (renderA.maxPolyCount !== renderB.maxPolyCount) {
      diffs.push(`Poly count: ${renderA.maxPolyCount} → ${renderB.maxPolyCount}`);
    }

    if (renderA.targetFPS !== renderB.targetFPS) {
      diffs.push(`Target FPS: ${renderA.targetFPS} → ${renderB.targetFPS}`);
    }

    // Physics accuracy
    if (profileA.physicsAccuracy !== profileB.physicsAccuracy) {
      diffs.push(`Physics: ${profileA.physicsAccuracy} → ${profileB.physicsAccuracy}`);
    }

    // Audio quality
    if (profileA.audioQuality !== profileB.audioQuality) {
      diffs.push(`Audio: ${profileA.audioQuality} → ${profileB.audioQuality}`);
    }

    // Network sync rate
    if (profileA.networkSyncRate !== profileB.networkSyncRate) {
      diffs.push(`Network sync: ${profileA.networkSyncRate}Hz → ${profileB.networkSyncRate}Hz`);
    }

    return diffs;
  }

  /**
   * Validate composition metadata
   */
  validateMetadata(metadata: CompositionQualityMetadata): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check profile exists
    if (metadata.profile && !QUALITY_PROFILES[metadata.profile]) {
      errors.push(`Unknown profile: ${metadata.profile}`);
    }

    // Validate overrides (basic sanity checks)
    if (metadata.overrides) {
      if (metadata.overrides.targetFPS && metadata.overrides.targetFPS < 30) {
        errors.push('Target FPS too low (min 30)');
      }
      if (metadata.overrides.pixelRatio && metadata.overrides.pixelRatio > 2.0) {
        errors.push('Pixel ratio too high (max 2.0)');
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a new QualityProfileManager instance
 */
export function createQualityProfileManager(
  options?: QualityProfileManagerOptions
): QualityProfileManager {
  return new QualityProfileManager(options);
}

// Singleton instance
let defaultManager: QualityProfileManager | null = null;

/**
 * Get or create the default QualityProfileManager
 */
export function getQualityProfileManager(
  options?: QualityProfileManagerOptions
): QualityProfileManager {
  if (!defaultManager) {
    defaultManager = new QualityProfileManager(options);
  }
  return defaultManager;
}
