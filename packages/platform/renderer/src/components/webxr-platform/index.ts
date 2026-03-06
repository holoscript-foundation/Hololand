/**
 * WebXR Platform Detection Module
 *
 * Provides platform detection, session mode probing, feature capability
 * enumeration, and UI components for displaying detected XR capabilities.
 *
 * @module webxr-platform
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  XRPlatformType,
  XRSessionMode,
  XRSessionModeStatus,
  XRSessionModeSupport,
  XRFeatureName,
  XRFeatureStatus,
  XRFeatureCapability,
  XRRecommendedFeatures,
  XRPlatformCapabilities,
  UseWebXRPlatformState,
  CapabilityBadgeSize,
  CapabilityBadgeVariant,
  CapabilityBadgeDisplayMode,
  XRPlatformTheme,
  PlatformColorSet,
} from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

export {
  PLATFORM_LABELS,
  PLATFORM_ICONS,
  FEATURE_STATUS_ICONS,
  FEATURE_DESCRIPTIONS,
  DEFAULT_XR_PLATFORM_THEME,
  DEFAULT_SESSION_MODE_SUPPORT,
  PLATFORM_RECOMMENDED_FEATURES,
} from './types';

// =============================================================================
// DETECTOR
// =============================================================================

export {
  checkSessionModeSupport,
  detectSessionModes,
  isVisionOSSafari,
  isMetaQuestBrowser,
  isChromeAndroidXR,
  identifyPlatform,
  detectFeatures,
  getRecommendedFeatures,
  detectWebXRPlatform,
  detectPlatformSync,
} from './WebXRPlatformDetector';

export type {
  DetectionConfig,
} from './WebXRPlatformDetector';

// =============================================================================
// HOOK
// =============================================================================

export {
  useWebXRPlatform,
} from './useWebXRPlatform';

export type {
  UseWebXRPlatformOptions,
} from './useWebXRPlatform';

// =============================================================================
// COMPONENTS
// =============================================================================

export {
  PlatformCapabilityBadge,
} from './PlatformCapabilityBadge';

export type {
  PlatformCapabilityBadgeProps,
} from './PlatformCapabilityBadge';
