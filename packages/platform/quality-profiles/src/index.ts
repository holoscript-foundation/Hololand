/**
 * @hololand/quality-profiles
 *
 * Domain-specific rendering optimization profiles for HoloLand platform.
 *
 * @example
 * ```typescript
 * import { QualityProfileManager, QUALITY_PROFILES } from '@hololand/quality-profiles';
 *
 * // Create manager with default profile
 * const profileManager = new QualityProfileManager({
 *   defaultProfile: 'industrial',
 *   autoApply: true,
 * });
 *
 * // Apply from composition metadata
 * profileManager.applyFromMetadata({ profile: 'cinematic' });
 *
 * // Get effective settings for renderer
 * const qualitySettings = profileManager.getEffectiveQualitySettings();
 * ```
 */

// =============================================================================
// EXPORTS
// =============================================================================

// Types
export type {
  QualityProfileName,
  RenderingPriority,
  PhysicsAccuracy,
  AudioQuality,
  NetworkSyncRate,
  QualityTraitConfig,
  QualityProfile,
  CompositionQualityMetadata,
} from './types';

// Presets
export {
  INDUSTRIAL_PROFILE,
  CINEMATIC_PROFILE,
  MOBILE_PROFILE,
  QUALITY_PROFILES,
} from './types';

// Manager
export {
  QualityProfileManager,
  createQualityProfileManager,
  getQualityProfileManager,
} from './QualityProfileManager';

export type { QualityProfileManagerOptions } from './QualityProfileManager';
