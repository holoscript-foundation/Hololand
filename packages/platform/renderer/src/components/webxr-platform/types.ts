/**
 * WebXR Platform Detection Types
 *
 * Type definitions for the WebXR platform detection utility.
 * Covers platform identification, session mode support matrices,
 * feature capability detection, and recommended feature sets.
 *
 * Supported Platforms:
 * - visionOS Safari: immersive-vr only, model element, no immersive-ar
 * - Meta Quest Browser: immersive-ar + immersive-vr, plane detection, hand tracking, passthrough
 * - Chrome Android XR: ARCore features, plane detection, hit-test
 * - Desktop browsers: no XR support, fallback mode
 *
 * @module webxr-platform/types
 */

// =============================================================================
// PLATFORM TYPES
// =============================================================================

/**
 * Detected XR platform category.
 *
 * - 'visionos-safari': Apple Vision Pro running Safari
 * - 'meta-quest': Meta Quest 2/3/Pro running Quest Browser
 * - 'chrome-android-xr': Chrome on Android with ARCore
 * - 'desktop-fallback': Desktop browser without XR (or unsupported)
 * - 'unknown': XR is available but platform could not be identified
 */
export type XRPlatformType =
  | 'visionos-safari'
  | 'meta-quest'
  | 'chrome-android-xr'
  | 'desktop-fallback'
  | 'unknown';

// =============================================================================
// SESSION MODE SUPPORT
// =============================================================================

/**
 * The three WebXR session modes defined by the WebXR Device API.
 */
export type XRSessionMode = 'inline' | 'immersive-vr' | 'immersive-ar';

/**
 * Support level for a specific session mode on the detected platform.
 *
 * - 'supported': Session mode is available and can be requested
 * - 'unsupported': Session mode is not available on this device
 * - 'unknown': Detection was not performed or failed
 */
export type XRSessionModeStatus = 'supported' | 'unsupported' | 'unknown';

/**
 * Support matrix mapping each XR session mode to its availability status.
 */
export type XRSessionModeSupport = Record<XRSessionMode, XRSessionModeStatus>;

// =============================================================================
// FEATURE CAPABILITIES
// =============================================================================

/**
 * Individual XR features that may be available on a platform.
 * These correspond to WebXR feature descriptors used in
 * XRSessionInit.requiredFeatures / optionalFeatures.
 */
export type XRFeatureName =
  | 'plane-detection'
  | 'hit-test'
  | 'hand-tracking'
  | 'mesh-detection'
  | 'passthrough'
  | 'anchors'
  | 'depth-sensing'
  | 'light-estimation'
  | 'model-element'
  | 'dom-overlay'
  | 'layers'
  | 'bounded-reference-space'
  | 'local-floor';

/**
 * Capability status for an individual feature.
 *
 * - 'available': Feature is confirmed available via isSessionSupported or UA detection
 * - 'unavailable': Feature is confirmed not available
 * - 'requires-permission': Feature exists but needs explicit user grant
 * - 'unknown': Could not determine availability
 */
export type XRFeatureStatus =
  | 'available'
  | 'unavailable'
  | 'requires-permission'
  | 'unknown';

/**
 * A single feature capability entry with metadata.
 */
export interface XRFeatureCapability {
  /** Feature identifier */
  name: XRFeatureName;
  /** Availability status */
  status: XRFeatureStatus;
  /** Human-readable description */
  description: string;
}

// =============================================================================
// RECOMMENDED FEATURE SET
// =============================================================================

/**
 * Recommended features for a specific platform, split into required
 * and optional categories for XRSessionInit construction.
 */
export interface XRRecommendedFeatures {
  /** Features that should be in requiredFeatures */
  required: XRFeatureName[];
  /** Features that should be in optionalFeatures */
  optional: XRFeatureName[];
  /** Preferred XR session mode for this platform */
  preferredSessionMode: XRSessionMode | null;
}

// =============================================================================
// PLATFORM CAPABILITIES (AGGREGATE)
// =============================================================================

/**
 * Complete platform capabilities object returned by the detection utility.
 * This is the primary output of useWebXRPlatform.
 */
export interface XRPlatformCapabilities {
  /** Detected platform type */
  platform: XRPlatformType;
  /** Human-readable platform label */
  platformLabel: string;
  /** Whether any XR session mode is supported */
  xrSupported: boolean;
  /** Whether navigator.xr is present */
  xrApiPresent: boolean;
  /** Session mode support matrix */
  sessionModes: XRSessionModeSupport;
  /** Individual feature capabilities */
  features: XRFeatureCapability[];
  /** Recommended feature configuration for this platform */
  recommended: XRRecommendedFeatures;
  /** Raw user agent string used for detection */
  userAgent: string;
  /** Timestamp of when detection was performed */
  detectedAt: number;
}

// =============================================================================
// HOOK STATE
// =============================================================================

/**
 * State returned by the useWebXRPlatform hook.
 */
export interface UseWebXRPlatformState {
  /** Whether detection is currently in progress */
  loading: boolean;
  /** Error message if detection failed */
  error: string | null;
  /** Detected platform capabilities (null while loading or on error) */
  capabilities: XRPlatformCapabilities | null;
  /** Re-run detection (e.g., after permissions change) */
  redetect: () => void;
}

// =============================================================================
// BADGE COMPONENT PROPS
// =============================================================================

/** Display size for the capability badge */
export type CapabilityBadgeSize = 'sm' | 'md' | 'lg';

/** Visual variant of the badge */
export type CapabilityBadgeVariant = 'badge' | 'pill' | 'card';

/** Display mode for the badge */
export type CapabilityBadgeDisplayMode = 'platform' | 'features' | 'full';

/**
 * Theme configuration for the PlatformCapabilityBadge.
 */
export interface XRPlatformTheme {
  fontFamily: string;
  fontScale: number;
  borderRadius: string;
  textPrimary: string;
  textSecondary: string;
  backgroundPrimary: string;
  backgroundSecondary: string;
  platformColors: Partial<Record<XRPlatformType, PlatformColorSet>>;
  featureAvailableColor: string;
  featureUnavailableColor: string;
  featureUnknownColor: string;
  featurePermissionColor: string;
}

/**
 * Color set for a platform type.
 */
export interface PlatformColorSet {
  color: string;
  backgroundColor: string;
  borderColor: string;
  icon: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Human-readable labels for each platform type.
 */
export const PLATFORM_LABELS: Record<XRPlatformType, string> = {
  'visionos-safari': 'Apple Vision Pro',
  'meta-quest': 'Meta Quest',
  'chrome-android-xr': 'Chrome Android XR',
  'desktop-fallback': 'Desktop (Fallback)',
  'unknown': 'Unknown XR Device',
};

/**
 * Icons for each platform type (unicode characters).
 */
export const PLATFORM_ICONS: Record<XRPlatformType, string> = {
  'visionos-safari': '\u{1F453}',    // glasses
  'meta-quest': '\u{1F3AE}',         // game controller
  'chrome-android-xr': '\u{1F4F1}',  // mobile phone
  'desktop-fallback': '\u{1F5A5}',   // desktop
  'unknown': '\u{2753}',             // question mark
};

/**
 * Icons for feature statuses.
 */
export const FEATURE_STATUS_ICONS: Record<XRFeatureStatus, string> = {
  'available': '\u2705',          // green check
  'unavailable': '\u274C',        // red X
  'requires-permission': '\u{1F512}', // lock
  'unknown': '\u2754',            // grey question
};

/**
 * Human-readable descriptions for each XR feature.
 */
export const FEATURE_DESCRIPTIONS: Record<XRFeatureName, string> = {
  'plane-detection': 'Detects horizontal and vertical surfaces in the environment',
  'hit-test': 'Casts rays against real-world geometry for object placement',
  'hand-tracking': 'Tracks articulated hand joints for gesture input',
  'mesh-detection': 'Reconstructs 3D mesh geometry of the environment',
  'passthrough': 'Renders camera feed behind virtual content (mixed reality)',
  'anchors': 'Creates persistent spatial anchors in the environment',
  'depth-sensing': 'Provides depth buffer from environment sensors',
  'light-estimation': 'Estimates real-world lighting for realistic rendering',
  'model-element': 'Native 3D model rendering via HTML <model> element (visionOS)',
  'dom-overlay': 'Overlays HTML DOM elements on top of XR content',
  'layers': 'WebXR Layers API for compositor-level rendering',
  'bounded-reference-space': 'Room-scale tracking with boundary polygon',
  'local-floor': 'Floor-level reference space for standing experiences',
};

/**
 * Default platform theme.
 */
export const DEFAULT_XR_PLATFORM_THEME: XRPlatformTheme = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontScale: 1,
  borderRadius: '6px',
  textPrimary: '#E8E8E8',
  textSecondary: '#999999',
  backgroundPrimary: '#1A1A2E',
  backgroundSecondary: '#16213E',
  platformColors: {
    'visionos-safari': {
      color: '#FFFFFF',
      backgroundColor: '#1C1C1E',
      borderColor: '#636366',
      icon: '\u{1F453}',
    },
    'meta-quest': {
      color: '#FFFFFF',
      backgroundColor: '#1877F2',
      borderColor: '#3B93FF',
      icon: '\u{1F3AE}',
    },
    'chrome-android-xr': {
      color: '#FFFFFF',
      backgroundColor: '#34A853',
      borderColor: '#4CAF50',
      icon: '\u{1F4F1}',
    },
    'desktop-fallback': {
      color: '#CCCCCC',
      backgroundColor: '#2D2D2D',
      borderColor: '#555555',
      icon: '\u{1F5A5}',
    },
    'unknown': {
      color: '#AAAAAA',
      backgroundColor: '#333333',
      borderColor: '#666666',
      icon: '\u{2753}',
    },
  },
  featureAvailableColor: '#4CAF50',
  featureUnavailableColor: '#F44336',
  featureUnknownColor: '#9E9E9E',
  featurePermissionColor: '#FF9800',
};

/**
 * Default session mode support (all unknown).
 */
export const DEFAULT_SESSION_MODE_SUPPORT: XRSessionModeSupport = {
  'inline': 'unknown',
  'immersive-vr': 'unknown',
  'immersive-ar': 'unknown',
};

/**
 * Recommended features by platform type.
 */
export const PLATFORM_RECOMMENDED_FEATURES: Record<XRPlatformType, XRRecommendedFeatures> = {
  'visionos-safari': {
    required: ['local-floor'],
    optional: ['hand-tracking', 'layers', 'bounded-reference-space'],
    preferredSessionMode: 'immersive-vr',
  },
  'meta-quest': {
    required: ['local-floor', 'hand-tracking'],
    optional: ['plane-detection', 'passthrough', 'anchors', 'mesh-detection', 'hit-test', 'bounded-reference-space', 'layers'],
    preferredSessionMode: 'immersive-vr',
  },
  'chrome-android-xr': {
    required: ['local-floor', 'hit-test'],
    optional: ['plane-detection', 'dom-overlay', 'light-estimation', 'depth-sensing', 'anchors'],
    preferredSessionMode: 'immersive-ar',
  },
  'desktop-fallback': {
    required: [],
    optional: ['dom-overlay'],
    preferredSessionMode: null,
  },
  'unknown': {
    required: ['local-floor'],
    optional: [],
    preferredSessionMode: 'immersive-vr',
  },
};
