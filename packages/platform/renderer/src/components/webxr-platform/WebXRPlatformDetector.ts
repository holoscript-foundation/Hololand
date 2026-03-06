/**
 * WebXR Platform Detection Utility
 *
 * Pure detection functions that probe the browser environment to identify
 * the XR platform, supported session modes, and available features.
 *
 * Detection Strategy:
 * 1. Check navigator.xr presence (WebXR Device API)
 * 2. Probe session mode support via isSessionSupported()
 * 3. Identify platform from user agent + session mode fingerprint
 * 4. Enumerate feature capabilities based on platform profile
 * 5. Build recommended feature set
 *
 * Platform Fingerprints:
 * - visionOS Safari: immersive-vr YES, immersive-ar NO, UA contains "Safari" + no "Chrome"
 * - Meta Quest: immersive-vr YES, immersive-ar YES, UA contains "OculusBrowser" or "Quest"
 * - Chrome Android XR: immersive-ar YES, UA contains "Chrome" + "Android"
 * - Desktop: navigator.xr absent or no immersive modes supported
 *
 * @module webxr-platform/WebXRPlatformDetector
 */

import type {
  XRPlatformType,
  XRSessionMode,
  XRSessionModeStatus,
  XRSessionModeSupport,
  XRFeatureName,
  XRFeatureCapability,
  XRPlatformCapabilities,
  XRRecommendedFeatures,
} from './types';

import {
  PLATFORM_LABELS,
  FEATURE_DESCRIPTIONS,
  DEFAULT_SESSION_MODE_SUPPORT,
  PLATFORM_RECOMMENDED_FEATURES,
} from './types';

// =============================================================================
// SESSION MODE DETECTION
// =============================================================================

/**
 * Check if a specific XR session mode is supported.
 * Returns 'supported', 'unsupported', or 'unknown' (on error).
 */
export async function checkSessionModeSupport(
  xr: XRSystem,
  mode: XRSessionMode,
): Promise<XRSessionModeStatus> {
  try {
    const supported = await xr.isSessionSupported(mode);
    return supported ? 'supported' : 'unsupported';
  } catch {
    return 'unknown';
  }
}

/**
 * Probe all three XR session modes in parallel and return the support matrix.
 */
export async function detectSessionModes(xr: XRSystem): Promise<XRSessionModeSupport> {
  const modes: XRSessionMode[] = ['inline', 'immersive-vr', 'immersive-ar'];

  const results = await Promise.all(
    modes.map((mode) => checkSessionModeSupport(xr, mode)),
  );

  return {
    'inline': results[0],
    'immersive-vr': results[1],
    'immersive-ar': results[2],
  };
}

// =============================================================================
// PLATFORM IDENTIFICATION
// =============================================================================

/**
 * Detect whether the user agent indicates visionOS Safari.
 *
 * visionOS Safari characteristics:
 * - Contains "Safari" but NOT "Chrome" (to exclude Chrome-based browsers)
 * - May contain "AppleWebKit" and not "CriOS" or "FxiOS"
 * - Does NOT have immersive-ar support
 * - Supports the <model> HTML element
 */
export function isVisionOSSafari(ua: string, _sessionModes: XRSessionModeSupport): boolean {
  const hasAppleWebKit = ua.includes('AppleWebKit');
  const hasSafari = ua.includes('Safari');
  const hasChrome = ua.includes('Chrome') || ua.includes('CriOS');
  const hasFx = ua.includes('FxiOS');

  // visionOS Safari: AppleWebKit-based Safari, no Chrome/Firefox
  if (hasAppleWebKit && hasSafari && !hasChrome && !hasFx) {
    // visionOS might also be detected by xrCompatible or model element support
    // but user-agent is the primary heuristic
    return true;
  }

  return false;
}

/**
 * Detect whether the user agent indicates Meta Quest Browser.
 *
 * Quest Browser characteristics:
 * - Contains "OculusBrowser" or "Quest" in user agent
 * - Supports both immersive-vr AND immersive-ar
 * - Has hand tracking, plane detection, passthrough capabilities
 */
export function isMetaQuestBrowser(ua: string, sessionModes: XRSessionModeSupport): boolean {
  const hasOculus = ua.includes('OculusBrowser');
  const hasQuest = ua.includes('Quest');
  const hasMetaXR = ua.includes('MetaXR');

  // Direct UA detection
  if (hasOculus || hasQuest || hasMetaXR) {
    return true;
  }

  // Heuristic: Android + both immersive modes + not Chrome Android (which lacks VR)
  // This catches cases where Quest browser UA might be modified
  if (
    ua.includes('Android') &&
    sessionModes['immersive-vr'] === 'supported' &&
    sessionModes['immersive-ar'] === 'supported' &&
    !ua.includes('Chrome')
  ) {
    return true;
  }

  return false;
}

/**
 * Detect whether the user agent indicates Chrome on Android with ARCore.
 *
 * Chrome Android XR characteristics:
 * - Contains "Chrome" and "Android" in user agent
 * - Supports immersive-ar (via ARCore)
 * - Typically does NOT support immersive-vr
 * - Has plane detection, hit-test capabilities
 */
export function isChromeAndroidXR(ua: string, sessionModes: XRSessionModeSupport): boolean {
  const hasChrome = ua.includes('Chrome');
  const hasAndroid = ua.includes('Android');
  const hasAR = sessionModes['immersive-ar'] === 'supported';

  return hasChrome && hasAndroid && hasAR;
}

/**
 * Identify the XR platform from the user agent string and session mode support.
 * The order of checks matters (more specific checks first).
 */
export function identifyPlatform(
  ua: string,
  sessionModes: XRSessionModeSupport,
  xrApiPresent: boolean,
): XRPlatformType {
  if (!xrApiPresent) {
    return 'desktop-fallback';
  }

  // Check in order of specificity
  // Meta Quest must be checked before Chrome Android because Quest also has Android in UA
  if (isMetaQuestBrowser(ua, sessionModes)) {
    return 'meta-quest';
  }

  if (isChromeAndroidXR(ua, sessionModes)) {
    return 'chrome-android-xr';
  }

  if (isVisionOSSafari(ua, sessionModes)) {
    return 'visionos-safari';
  }

  // If XR API is present but no immersive modes are supported, treat as desktop fallback
  const hasImmersiveSupport =
    sessionModes['immersive-vr'] === 'supported' ||
    sessionModes['immersive-ar'] === 'supported';

  if (!hasImmersiveSupport) {
    return 'desktop-fallback';
  }

  return 'unknown';
}

// =============================================================================
// FEATURE DETECTION
// =============================================================================

/**
 * Platform-specific feature availability profiles.
 * These define the expected feature support for each known platform.
 */
const PLATFORM_FEATURE_PROFILES: Record<XRPlatformType, Partial<Record<XRFeatureName, 'available' | 'unavailable' | 'requires-permission'>>> = {
  'visionos-safari': {
    'plane-detection': 'unavailable',
    'hit-test': 'unavailable',
    'hand-tracking': 'available',
    'mesh-detection': 'unavailable',
    'passthrough': 'unavailable',
    'anchors': 'unavailable',
    'depth-sensing': 'unavailable',
    'light-estimation': 'unavailable',
    'model-element': 'available',
    'dom-overlay': 'unavailable',
    'layers': 'available',
    'bounded-reference-space': 'available',
    'local-floor': 'available',
  },
  'meta-quest': {
    'plane-detection': 'available',
    'hit-test': 'available',
    'hand-tracking': 'available',
    'mesh-detection': 'requires-permission',
    'passthrough': 'available',
    'anchors': 'available',
    'depth-sensing': 'requires-permission',
    'light-estimation': 'unavailable',
    'model-element': 'unavailable',
    'dom-overlay': 'available',
    'layers': 'available',
    'bounded-reference-space': 'available',
    'local-floor': 'available',
  },
  'chrome-android-xr': {
    'plane-detection': 'available',
    'hit-test': 'available',
    'hand-tracking': 'unavailable',
    'mesh-detection': 'unavailable',
    'passthrough': 'unavailable',
    'anchors': 'available',
    'depth-sensing': 'available',
    'light-estimation': 'available',
    'model-element': 'unavailable',
    'dom-overlay': 'available',
    'layers': 'unavailable',
    'bounded-reference-space': 'unavailable',
    'local-floor': 'available',
  },
  'desktop-fallback': {
    'plane-detection': 'unavailable',
    'hit-test': 'unavailable',
    'hand-tracking': 'unavailable',
    'mesh-detection': 'unavailable',
    'passthrough': 'unavailable',
    'anchors': 'unavailable',
    'depth-sensing': 'unavailable',
    'light-estimation': 'unavailable',
    'model-element': 'unavailable',
    'dom-overlay': 'unavailable',
    'layers': 'unavailable',
    'bounded-reference-space': 'unavailable',
    'local-floor': 'unavailable',
  },
  'unknown': {
    // Features are unknown for unidentified platforms
  },
};

/**
 * Build the feature capability list for a detected platform.
 */
export function detectFeatures(platform: XRPlatformType): XRFeatureCapability[] {
  const profile = PLATFORM_FEATURE_PROFILES[platform];
  const allFeatures: XRFeatureName[] = [
    'plane-detection',
    'hit-test',
    'hand-tracking',
    'mesh-detection',
    'passthrough',
    'anchors',
    'depth-sensing',
    'light-estimation',
    'model-element',
    'dom-overlay',
    'layers',
    'bounded-reference-space',
    'local-floor',
  ];

  return allFeatures.map((name): XRFeatureCapability => ({
    name,
    status: profile[name] ?? 'unknown',
    description: FEATURE_DESCRIPTIONS[name],
  }));
}

/**
 * Get the recommended features for a platform.
 */
export function getRecommendedFeatures(platform: XRPlatformType): XRRecommendedFeatures {
  return PLATFORM_RECOMMENDED_FEATURES[platform] ?? PLATFORM_RECOMMENDED_FEATURES['unknown'];
}

// =============================================================================
// MAIN DETECTION FUNCTION
// =============================================================================

/**
 * Configuration for the detection process.
 */
export interface DetectionConfig {
  /** Override user agent (useful for testing) */
  userAgent?: string;
  /** Override navigator.xr (useful for testing) */
  xrSystem?: XRSystem | null;
  /** Skip async session mode probing (faster, less accurate) */
  skipSessionProbe?: boolean;
}

/**
 * Perform full WebXR platform detection.
 *
 * This is the main entry point. It:
 * 1. Checks for navigator.xr presence
 * 2. Probes session mode support
 * 3. Identifies the platform
 * 4. Enumerates feature capabilities
 * 5. Builds recommended feature set
 *
 * @param config - Optional configuration overrides
 * @returns Complete platform capabilities object
 */
export async function detectWebXRPlatform(
  config?: DetectionConfig,
): Promise<XRPlatformCapabilities> {
  const ua = config?.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');

  // Check if WebXR Device API is present
  const xr = config?.xrSystem !== undefined
    ? config.xrSystem
    : (typeof navigator !== 'undefined' && 'xr' in navigator ? (navigator as Navigator & { xr: XRSystem }).xr : null);

  const xrApiPresent = xr !== null && xr !== undefined;

  // Probe session modes
  let sessionModes: XRSessionModeSupport;
  if (xrApiPresent && !config?.skipSessionProbe) {
    sessionModes = await detectSessionModes(xr!);
  } else {
    sessionModes = { ...DEFAULT_SESSION_MODE_SUPPORT };
    if (!xrApiPresent) {
      sessionModes['inline'] = 'unsupported';
      sessionModes['immersive-vr'] = 'unsupported';
      sessionModes['immersive-ar'] = 'unsupported';
    }
  }

  // Identify the platform
  const platform = identifyPlatform(ua, sessionModes, xrApiPresent);

  // Detect features based on platform profile
  const features = detectFeatures(platform);

  // Get recommended features
  const recommended = getRecommendedFeatures(platform);

  // Check if any XR mode is supported
  const xrSupported =
    sessionModes['immersive-vr'] === 'supported' ||
    sessionModes['immersive-ar'] === 'supported' ||
    sessionModes['inline'] === 'supported';

  return {
    platform,
    platformLabel: PLATFORM_LABELS[platform],
    xrSupported,
    xrApiPresent,
    sessionModes,
    features,
    recommended,
    userAgent: ua,
    detectedAt: Date.now(),
  };
}

/**
 * Synchronous platform detection using only user agent heuristics.
 * Faster but less accurate (does not probe session mode support).
 * Useful for initial render before async detection completes.
 */
export function detectPlatformSync(
  userAgent?: string,
): XRPlatformType {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');

  // Quick UA-based heuristics (no session probing)
  if (ua.includes('OculusBrowser') || ua.includes('Quest') || ua.includes('MetaXR')) {
    return 'meta-quest';
  }

  if (ua.includes('Chrome') && ua.includes('Android')) {
    return 'chrome-android-xr';
  }

  if (ua.includes('AppleWebKit') && ua.includes('Safari') && !ua.includes('Chrome')) {
    // Could be visionOS or regular Safari. Without session probing
    // we cannot confirm visionOS, so return unknown if XR-ish hints exist
    return 'visionos-safari';
  }

  return 'desktop-fallback';
}
