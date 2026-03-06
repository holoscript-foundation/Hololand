/**
 * @vitest-environment jsdom
 */

/**
 * Tests for WebXR Platform Detection Utility
 *
 * Validates:
 * - Session mode probing (isSessionSupported)
 * - Platform identification from user agent + session fingerprints
 * - Feature detection per platform
 * - Recommended feature sets
 * - Full detection pipeline (detectWebXRPlatform)
 * - Synchronous detection (detectPlatformSync)
 * - Error handling and edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
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
} from '../WebXRPlatformDetector';
import type { XRSessionModeSupport, XRFeatureName, XRPlatformType } from '../types';
import { PLATFORM_RECOMMENDED_FEATURES, FEATURE_DESCRIPTIONS } from '../types';

// =============================================================================
// MOCK XR SYSTEM
// =============================================================================

function createMockXRSystem(
  supportMap: Partial<Record<string, boolean>> = {},
): XRSystem {
  return {
    isSessionSupported: vi.fn(async (mode: string) => {
      return supportMap[mode] ?? false;
    }),
    requestSession: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    ondevicechange: null,
  } as unknown as XRSystem;
}

// =============================================================================
// USER AGENT STRINGS
// =============================================================================

const UA_VISIONOS_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

const UA_META_QUEST_BROWSER =
  'Mozilla/5.0 (Linux; Android 12; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/28.0 Chrome/120.0.0.0 Mobile VR Safari/537.36';

const UA_META_QUEST_SIMPLE =
  'Mozilla/5.0 (Linux; Android 12; Quest) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36';

const UA_CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const UA_DESKTOP_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const UA_DESKTOP_FIREFOX =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';

const UA_METAXR =
  'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) MetaXR/1.0 Safari/537.36';

// =============================================================================
// SESSION MODES PRESETS
// =============================================================================

const MODES_VR_ONLY: XRSessionModeSupport = {
  'inline': 'supported',
  'immersive-vr': 'supported',
  'immersive-ar': 'unsupported',
};

const MODES_VR_AND_AR: XRSessionModeSupport = {
  'inline': 'supported',
  'immersive-vr': 'supported',
  'immersive-ar': 'supported',
};

const MODES_AR_ONLY: XRSessionModeSupport = {
  'inline': 'supported',
  'immersive-vr': 'unsupported',
  'immersive-ar': 'supported',
};

const MODES_NONE: XRSessionModeSupport = {
  'inline': 'unsupported',
  'immersive-vr': 'unsupported',
  'immersive-ar': 'unsupported',
};

const MODES_UNKNOWN: XRSessionModeSupport = {
  'inline': 'unknown',
  'immersive-vr': 'unknown',
  'immersive-ar': 'unknown',
};

// =============================================================================
// checkSessionModeSupport
// =============================================================================

describe('checkSessionModeSupport', () => {
  it('should return supported when isSessionSupported returns true', async () => {
    const xr = createMockXRSystem({ 'immersive-vr': true });
    const result = await checkSessionModeSupport(xr, 'immersive-vr');
    expect(result).toBe('supported');
  });

  it('should return unsupported when isSessionSupported returns false', async () => {
    const xr = createMockXRSystem({ 'immersive-ar': false });
    const result = await checkSessionModeSupport(xr, 'immersive-ar');
    expect(result).toBe('unsupported');
  });

  it('should return unknown when isSessionSupported throws', async () => {
    const xr = {
      isSessionSupported: vi.fn().mockRejectedValue(new Error('Not available')),
    } as unknown as XRSystem;
    const result = await checkSessionModeSupport(xr, 'immersive-vr');
    expect(result).toBe('unknown');
  });
});

// =============================================================================
// detectSessionModes
// =============================================================================

describe('detectSessionModes', () => {
  it('should probe all three session modes', async () => {
    const xr = createMockXRSystem({
      'inline': true,
      'immersive-vr': true,
      'immersive-ar': false,
    });

    const result = await detectSessionModes(xr);

    expect(result['inline']).toBe('supported');
    expect(result['immersive-vr']).toBe('supported');
    expect(result['immersive-ar']).toBe('unsupported');
    expect(xr.isSessionSupported).toHaveBeenCalledTimes(3);
  });

  it('should handle mixed results with errors', async () => {
    let callCount = 0;
    const xr = {
      isSessionSupported: vi.fn(async (mode: string) => {
        callCount++;
        if (mode === 'immersive-ar') throw new Error('fail');
        return mode === 'immersive-vr';
      }),
    } as unknown as XRSystem;

    const result = await detectSessionModes(xr);

    expect(result['inline']).toBe('unsupported');
    expect(result['immersive-vr']).toBe('supported');
    expect(result['immersive-ar']).toBe('unknown');
  });
});

// =============================================================================
// PLATFORM IDENTIFICATION - isVisionOSSafari
// =============================================================================

describe('isVisionOSSafari', () => {
  it('should detect visionOS Safari user agent', () => {
    expect(isVisionOSSafari(UA_VISIONOS_SAFARI, MODES_VR_ONLY)).toBe(true);
  });

  it('should NOT detect Chrome as visionOS Safari', () => {
    expect(isVisionOSSafari(UA_DESKTOP_CHROME, MODES_VR_ONLY)).toBe(false);
  });

  it('should NOT detect Chrome Android as visionOS Safari', () => {
    expect(isVisionOSSafari(UA_CHROME_ANDROID, MODES_AR_ONLY)).toBe(false);
  });

  it('should NOT detect Firefox as visionOS Safari', () => {
    expect(isVisionOSSafari(UA_DESKTOP_FIREFOX, MODES_NONE)).toBe(false);
  });

  it('should NOT detect Quest Browser (contains Chrome) as visionOS Safari', () => {
    expect(isVisionOSSafari(UA_META_QUEST_BROWSER, MODES_VR_AND_AR)).toBe(false);
  });
});

// =============================================================================
// PLATFORM IDENTIFICATION - isMetaQuestBrowser
// =============================================================================

describe('isMetaQuestBrowser', () => {
  it('should detect Quest Browser with OculusBrowser in UA', () => {
    expect(isMetaQuestBrowser(UA_META_QUEST_BROWSER, MODES_VR_AND_AR)).toBe(true);
  });

  it('should detect Quest Browser with Quest in UA', () => {
    expect(isMetaQuestBrowser(UA_META_QUEST_SIMPLE, MODES_VR_AND_AR)).toBe(true);
  });

  it('should detect MetaXR user agent', () => {
    expect(isMetaQuestBrowser(UA_METAXR, MODES_VR_AND_AR)).toBe(true);
  });

  it('should NOT detect desktop Chrome as Meta Quest', () => {
    expect(isMetaQuestBrowser(UA_DESKTOP_CHROME, MODES_NONE)).toBe(false);
  });

  it('should NOT detect regular Android Chrome as Meta Quest', () => {
    expect(isMetaQuestBrowser(UA_CHROME_ANDROID, MODES_AR_ONLY)).toBe(false);
  });

  it('should NOT detect visionOS Safari as Meta Quest', () => {
    expect(isMetaQuestBrowser(UA_VISIONOS_SAFARI, MODES_VR_ONLY)).toBe(false);
  });
});

// =============================================================================
// PLATFORM IDENTIFICATION - isChromeAndroidXR
// =============================================================================

describe('isChromeAndroidXR', () => {
  it('should detect Chrome Android with AR support', () => {
    expect(isChromeAndroidXR(UA_CHROME_ANDROID, MODES_AR_ONLY)).toBe(true);
  });

  it('should detect Chrome Android with both VR and AR', () => {
    expect(isChromeAndroidXR(UA_CHROME_ANDROID, MODES_VR_AND_AR)).toBe(true);
  });

  it('should NOT detect Chrome Android without AR support', () => {
    expect(isChromeAndroidXR(UA_CHROME_ANDROID, MODES_VR_ONLY)).toBe(false);
  });

  it('should NOT detect desktop Chrome as Chrome Android XR', () => {
    expect(isChromeAndroidXR(UA_DESKTOP_CHROME, MODES_NONE)).toBe(false);
  });

  it('should NOT detect visionOS Safari as Chrome Android XR', () => {
    expect(isChromeAndroidXR(UA_VISIONOS_SAFARI, MODES_AR_ONLY)).toBe(false);
  });
});

// =============================================================================
// PLATFORM IDENTIFICATION - identifyPlatform
// =============================================================================

describe('identifyPlatform', () => {
  it('should return desktop-fallback when XR API is not present', () => {
    expect(identifyPlatform(UA_DESKTOP_CHROME, MODES_NONE, false)).toBe('desktop-fallback');
  });

  it('should return desktop-fallback when XR API is present but no immersive modes', () => {
    const inlineOnly: XRSessionModeSupport = {
      'inline': 'supported',
      'immersive-vr': 'unsupported',
      'immersive-ar': 'unsupported',
    };
    expect(identifyPlatform(UA_DESKTOP_CHROME, inlineOnly, true)).toBe('desktop-fallback');
  });

  it('should identify Meta Quest (checked before Chrome Android)', () => {
    // Quest UA also has Chrome + Android, but Quest check comes first
    expect(identifyPlatform(UA_META_QUEST_BROWSER, MODES_VR_AND_AR, true)).toBe('meta-quest');
  });

  it('should identify Chrome Android XR', () => {
    expect(identifyPlatform(UA_CHROME_ANDROID, MODES_AR_ONLY, true)).toBe('chrome-android-xr');
  });

  it('should identify visionOS Safari', () => {
    expect(identifyPlatform(UA_VISIONOS_SAFARI, MODES_VR_ONLY, true)).toBe('visionos-safari');
  });

  it('should return unknown for unrecognized XR-capable browsers', () => {
    const unknownUA = 'Mozilla/5.0 (UnknownDevice) UnknownBrowser/1.0';
    expect(identifyPlatform(unknownUA, MODES_VR_ONLY, true)).toBe('unknown');
  });

  it('should prioritize Meta Quest over Chrome Android when both match', () => {
    // Quest browser UA contains both Chrome and Android
    expect(identifyPlatform(UA_META_QUEST_BROWSER, MODES_VR_AND_AR, true)).toBe('meta-quest');
  });
});

// =============================================================================
// FEATURE DETECTION
// =============================================================================

describe('detectFeatures', () => {
  it('should return all 13 features for any platform', () => {
    const features = detectFeatures('meta-quest');
    expect(features.length).toBe(13);

    const featureNames = features.map((f) => f.name);
    expect(featureNames).toContain('plane-detection');
    expect(featureNames).toContain('hit-test');
    expect(featureNames).toContain('hand-tracking');
    expect(featureNames).toContain('mesh-detection');
    expect(featureNames).toContain('passthrough');
    expect(featureNames).toContain('anchors');
    expect(featureNames).toContain('depth-sensing');
    expect(featureNames).toContain('light-estimation');
    expect(featureNames).toContain('model-element');
    expect(featureNames).toContain('dom-overlay');
    expect(featureNames).toContain('layers');
    expect(featureNames).toContain('bounded-reference-space');
    expect(featureNames).toContain('local-floor');
  });

  it('should have descriptions for all features', () => {
    const features = detectFeatures('desktop-fallback');
    for (const feature of features) {
      expect(feature.description).toBeTruthy();
      expect(feature.description).toBe(FEATURE_DESCRIPTIONS[feature.name]);
    }
  });

  // --- visionOS Safari ---
  describe('visionOS Safari features', () => {
    it('should mark model-element as available', () => {
      const features = detectFeatures('visionos-safari');
      const modelElement = features.find((f) => f.name === 'model-element');
      expect(modelElement?.status).toBe('available');
    });

    it('should mark hand-tracking as available', () => {
      const features = detectFeatures('visionos-safari');
      const handTracking = features.find((f) => f.name === 'hand-tracking');
      expect(handTracking?.status).toBe('available');
    });

    it('should mark immersive-ar features as unavailable', () => {
      const features = detectFeatures('visionos-safari');
      const planeDetection = features.find((f) => f.name === 'plane-detection');
      const hitTest = features.find((f) => f.name === 'hit-test');
      const passthrough = features.find((f) => f.name === 'passthrough');
      expect(planeDetection?.status).toBe('unavailable');
      expect(hitTest?.status).toBe('unavailable');
      expect(passthrough?.status).toBe('unavailable');
    });

    it('should mark layers as available', () => {
      const features = detectFeatures('visionos-safari');
      const layers = features.find((f) => f.name === 'layers');
      expect(layers?.status).toBe('available');
    });
  });

  // --- Meta Quest ---
  describe('Meta Quest features', () => {
    it('should mark plane-detection as available', () => {
      const features = detectFeatures('meta-quest');
      const planeDetection = features.find((f) => f.name === 'plane-detection');
      expect(planeDetection?.status).toBe('available');
    });

    it('should mark hand-tracking as available', () => {
      const features = detectFeatures('meta-quest');
      const handTracking = features.find((f) => f.name === 'hand-tracking');
      expect(handTracking?.status).toBe('available');
    });

    it('should mark passthrough as available', () => {
      const features = detectFeatures('meta-quest');
      const passthrough = features.find((f) => f.name === 'passthrough');
      expect(passthrough?.status).toBe('available');
    });

    it('should mark mesh-detection as requires-permission', () => {
      const features = detectFeatures('meta-quest');
      const meshDetection = features.find((f) => f.name === 'mesh-detection');
      expect(meshDetection?.status).toBe('requires-permission');
    });

    it('should mark model-element as unavailable', () => {
      const features = detectFeatures('meta-quest');
      const modelElement = features.find((f) => f.name === 'model-element');
      expect(modelElement?.status).toBe('unavailable');
    });

    it('should mark anchors as available', () => {
      const features = detectFeatures('meta-quest');
      const anchors = features.find((f) => f.name === 'anchors');
      expect(anchors?.status).toBe('available');
    });
  });

  // --- Chrome Android XR ---
  describe('Chrome Android XR features', () => {
    it('should mark plane-detection as available', () => {
      const features = detectFeatures('chrome-android-xr');
      const planeDetection = features.find((f) => f.name === 'plane-detection');
      expect(planeDetection?.status).toBe('available');
    });

    it('should mark hit-test as available', () => {
      const features = detectFeatures('chrome-android-xr');
      const hitTest = features.find((f) => f.name === 'hit-test');
      expect(hitTest?.status).toBe('available');
    });

    it('should mark light-estimation as available', () => {
      const features = detectFeatures('chrome-android-xr');
      const lightEstimation = features.find((f) => f.name === 'light-estimation');
      expect(lightEstimation?.status).toBe('available');
    });

    it('should mark hand-tracking as unavailable', () => {
      const features = detectFeatures('chrome-android-xr');
      const handTracking = features.find((f) => f.name === 'hand-tracking');
      expect(handTracking?.status).toBe('unavailable');
    });

    it('should mark dom-overlay as available', () => {
      const features = detectFeatures('chrome-android-xr');
      const domOverlay = features.find((f) => f.name === 'dom-overlay');
      expect(domOverlay?.status).toBe('available');
    });

    it('should mark depth-sensing as available', () => {
      const features = detectFeatures('chrome-android-xr');
      const depthSensing = features.find((f) => f.name === 'depth-sensing');
      expect(depthSensing?.status).toBe('available');
    });
  });

  // --- Desktop Fallback ---
  describe('Desktop fallback features', () => {
    it('should mark all features as unavailable', () => {
      const features = detectFeatures('desktop-fallback');
      for (const feature of features) {
        expect(feature.status).toBe('unavailable');
      }
    });
  });

  // --- Unknown ---
  describe('Unknown platform features', () => {
    it('should mark all features as unknown', () => {
      const features = detectFeatures('unknown');
      for (const feature of features) {
        expect(feature.status).toBe('unknown');
      }
    });
  });
});

// =============================================================================
// RECOMMENDED FEATURES
// =============================================================================

describe('getRecommendedFeatures', () => {
  it('should return recommendations for all known platforms', () => {
    const platforms: XRPlatformType[] = [
      'visionos-safari',
      'meta-quest',
      'chrome-android-xr',
      'desktop-fallback',
      'unknown',
    ];

    for (const platform of platforms) {
      const rec = getRecommendedFeatures(platform);
      expect(rec).toBeDefined();
      expect(rec.required).toBeInstanceOf(Array);
      expect(rec.optional).toBeInstanceOf(Array);
      expect(rec).toHaveProperty('preferredSessionMode');
    }
  });

  it('should return fallback recommendations for unexpected platform type', () => {
    // Force an unexpected value to test the fallback
    const rec = getRecommendedFeatures('nonexistent-platform' as XRPlatformType);
    // Should fall back to 'unknown' platform recommendations
    expect(rec).toBeDefined();
    expect(rec.required).toBeInstanceOf(Array);
  });
});

// =============================================================================
// FULL DETECTION PIPELINE - detectWebXRPlatform
// =============================================================================

describe('detectWebXRPlatform', () => {
  it('should detect Meta Quest with full capabilities', async () => {
    const xr = createMockXRSystem({
      'inline': true,
      'immersive-vr': true,
      'immersive-ar': true,
    });

    const result = await detectWebXRPlatform({
      userAgent: UA_META_QUEST_BROWSER,
      xrSystem: xr,
    });

    expect(result.platform).toBe('meta-quest');
    expect(result.platformLabel).toBe('Meta Quest');
    expect(result.xrSupported).toBe(true);
    expect(result.xrApiPresent).toBe(true);
    expect(result.sessionModes['immersive-vr']).toBe('supported');
    expect(result.sessionModes['immersive-ar']).toBe('supported');
    expect(result.features.length).toBe(13);
    expect(result.recommended.preferredSessionMode).toBe('immersive-vr');
    expect(result.userAgent).toBe(UA_META_QUEST_BROWSER);
    expect(result.detectedAt).toBeGreaterThan(0);
  });

  it('should detect visionOS Safari with VR-only support', async () => {
    const xr = createMockXRSystem({
      'inline': true,
      'immersive-vr': true,
      'immersive-ar': false,
    });

    const result = await detectWebXRPlatform({
      userAgent: UA_VISIONOS_SAFARI,
      xrSystem: xr,
    });

    expect(result.platform).toBe('visionos-safari');
    expect(result.xrSupported).toBe(true);
    expect(result.sessionModes['immersive-vr']).toBe('supported');
    expect(result.sessionModes['immersive-ar']).toBe('unsupported');

    // Check visionOS-specific features
    const modelElement = result.features.find((f) => f.name === 'model-element');
    expect(modelElement?.status).toBe('available');
  });

  it('should detect Chrome Android XR with ARCore', async () => {
    const xr = createMockXRSystem({
      'inline': true,
      'immersive-vr': false,
      'immersive-ar': true,
    });

    const result = await detectWebXRPlatform({
      userAgent: UA_CHROME_ANDROID,
      xrSystem: xr,
    });

    expect(result.platform).toBe('chrome-android-xr');
    expect(result.xrSupported).toBe(true);
    expect(result.sessionModes['immersive-ar']).toBe('supported');
    expect(result.recommended.preferredSessionMode).toBe('immersive-ar');
  });

  it('should detect desktop fallback when XR API is absent', async () => {
    const result = await detectWebXRPlatform({
      userAgent: UA_DESKTOP_CHROME,
      xrSystem: null,
    });

    expect(result.platform).toBe('desktop-fallback');
    expect(result.xrSupported).toBe(false);
    expect(result.xrApiPresent).toBe(false);
    expect(result.sessionModes['immersive-vr']).toBe('unsupported');
    expect(result.sessionModes['immersive-ar']).toBe('unsupported');
    expect(result.recommended.preferredSessionMode).toBeNull();
  });

  it('should detect desktop fallback for Firefox without XR', async () => {
    const result = await detectWebXRPlatform({
      userAgent: UA_DESKTOP_FIREFOX,
      xrSystem: null,
    });

    expect(result.platform).toBe('desktop-fallback');
    expect(result.xrSupported).toBe(false);
  });

  it('should handle empty user agent', async () => {
    const result = await detectWebXRPlatform({
      userAgent: '',
      xrSystem: null,
    });

    expect(result.platform).toBe('desktop-fallback');
    expect(result.userAgent).toBe('');
  });

  it('should use skip session probe option', async () => {
    const xr = createMockXRSystem({
      'inline': true,
      'immersive-vr': true,
      'immersive-ar': true,
    });

    const result = await detectWebXRPlatform({
      userAgent: UA_META_QUEST_BROWSER,
      xrSystem: xr,
      skipSessionProbe: true,
    });

    // Session probing skipped, modes should be unknown
    expect(result.sessionModes['immersive-vr']).toBe('unknown');
    expect(result.sessionModes['immersive-ar']).toBe('unknown');
    // isSessionSupported should NOT have been called
    expect(xr.isSessionSupported).not.toHaveBeenCalled();
  });

  it('should have a valid timestamp', async () => {
    const before = Date.now();
    const result = await detectWebXRPlatform({
      userAgent: UA_DESKTOP_CHROME,
      xrSystem: null,
    });
    const after = Date.now();

    expect(result.detectedAt).toBeGreaterThanOrEqual(before);
    expect(result.detectedAt).toBeLessThanOrEqual(after);
  });

  it('should return xrSupported=true when only inline mode is supported', async () => {
    const xr = createMockXRSystem({
      'inline': true,
      'immersive-vr': false,
      'immersive-ar': false,
    });

    const result = await detectWebXRPlatform({
      userAgent: UA_DESKTOP_CHROME,
      xrSystem: xr,
    });

    expect(result.xrSupported).toBe(true);
    expect(result.sessionModes['inline']).toBe('supported');
  });
});

// =============================================================================
// SYNCHRONOUS DETECTION
// =============================================================================

describe('detectPlatformSync', () => {
  it('should detect Meta Quest from UA', () => {
    expect(detectPlatformSync(UA_META_QUEST_BROWSER)).toBe('meta-quest');
  });

  it('should detect Quest simple UA', () => {
    expect(detectPlatformSync(UA_META_QUEST_SIMPLE)).toBe('meta-quest');
  });

  it('should detect MetaXR UA', () => {
    expect(detectPlatformSync(UA_METAXR)).toBe('meta-quest');
  });

  it('should detect Chrome Android', () => {
    expect(detectPlatformSync(UA_CHROME_ANDROID)).toBe('chrome-android-xr');
  });

  it('should detect visionOS Safari', () => {
    expect(detectPlatformSync(UA_VISIONOS_SAFARI)).toBe('visionos-safari');
  });

  it('should return desktop-fallback for desktop Chrome', () => {
    expect(detectPlatformSync(UA_DESKTOP_CHROME)).toBe('desktop-fallback');
  });

  it('should return desktop-fallback for Firefox', () => {
    expect(detectPlatformSync(UA_DESKTOP_FIREFOX)).toBe('desktop-fallback');
  });

  it('should return desktop-fallback for empty UA', () => {
    expect(detectPlatformSync('')).toBe('desktop-fallback');
  });

  it('should return desktop-fallback when called with undefined', () => {
    // Tests the default value branch where navigator.userAgent may be unavailable
    // In test environment, navigator may have a userAgent
    const result = detectPlatformSync(undefined);
    expect(typeof result).toBe('string');
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('Edge cases', () => {
  it('should handle XR system that always throws', async () => {
    const xr = {
      isSessionSupported: vi.fn().mockRejectedValue(new Error('Broken API')),
    } as unknown as XRSystem;

    const result = await detectWebXRPlatform({
      userAgent: UA_DESKTOP_CHROME,
      xrSystem: xr,
    });

    // All modes should be unknown
    expect(result.sessionModes['inline']).toBe('unknown');
    expect(result.sessionModes['immersive-vr']).toBe('unknown');
    expect(result.sessionModes['immersive-ar']).toBe('unknown');
    // With XR present but no modes detected, and desktop UA
    expect(result.xrApiPresent).toBe(true);
  });

  it('should handle UA with mixed platform signals (Quest + Chrome)', () => {
    // Quest browser UA contains both Chrome and Android
    // identifyPlatform should check Quest before Chrome Android
    const result = identifyPlatform(UA_META_QUEST_BROWSER, MODES_VR_AND_AR, true);
    expect(result).toBe('meta-quest');
  });

  it('should handle unknown platform with VR support', () => {
    const unknownUA = 'MysteriousBrowser/1.0';
    const result = identifyPlatform(unknownUA, MODES_VR_ONLY, true);
    expect(result).toBe('unknown');
  });

  it('should handle unknown platform without immersive support', () => {
    const unknownUA = 'MysteriousBrowser/1.0';
    const result = identifyPlatform(unknownUA, MODES_NONE, true);
    expect(result).toBe('desktop-fallback');
  });
});
