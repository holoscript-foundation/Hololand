/**
 * @vitest-environment jsdom
 */

/**
 * Tests for WebXR Platform Detection Types and Constants
 *
 * Validates:
 * - All platform labels are defined and non-empty
 * - All platform icons are defined and non-empty
 * - Feature status icons are complete
 * - Feature descriptions cover all features
 * - Default session mode support is properly initialized
 * - Recommended features are defined for all platforms
 * - Default theme has required properties
 */

import { describe, it, expect } from 'vitest';
import {
  PLATFORM_LABELS,
  PLATFORM_ICONS,
  FEATURE_STATUS_ICONS,
  FEATURE_DESCRIPTIONS,
  DEFAULT_SESSION_MODE_SUPPORT,
  PLATFORM_RECOMMENDED_FEATURES,
  DEFAULT_XR_PLATFORM_THEME,
} from '../types';
import type {
  XRPlatformType,
  XRFeatureName,
  XRFeatureStatus,
  XRSessionMode,
  XRSessionModeSupport,
  XRPlatformCapabilities,
  XRFeatureCapability,
  XRRecommendedFeatures,
  UseWebXRPlatformState,
  XRPlatformTheme,
} from '../types';

// =============================================================================
// PLATFORM LABELS
// =============================================================================

describe('PLATFORM_LABELS', () => {
  const allPlatforms: XRPlatformType[] = [
    'visionos-safari',
    'meta-quest',
    'chrome-android-xr',
    'desktop-fallback',
    'unknown',
  ];

  it('should have labels for all platform types', () => {
    for (const platform of allPlatforms) {
      expect(PLATFORM_LABELS[platform]).toBeDefined();
      expect(PLATFORM_LABELS[platform].length).toBeGreaterThan(0);
    }
  });

  it('should have unique labels for each platform', () => {
    const labels = Object.values(PLATFORM_LABELS);
    const unique = new Set(labels);
    expect(unique.size).toBe(labels.length);
  });

  it('should contain expected platform labels', () => {
    expect(PLATFORM_LABELS['visionos-safari']).toBe('Apple Vision Pro');
    expect(PLATFORM_LABELS['meta-quest']).toBe('Meta Quest');
    expect(PLATFORM_LABELS['chrome-android-xr']).toBe('Chrome Android XR');
    expect(PLATFORM_LABELS['desktop-fallback']).toBe('Desktop (Fallback)');
    expect(PLATFORM_LABELS['unknown']).toBe('Unknown XR Device');
  });
});

// =============================================================================
// PLATFORM ICONS
// =============================================================================

describe('PLATFORM_ICONS', () => {
  const allPlatforms: XRPlatformType[] = [
    'visionos-safari',
    'meta-quest',
    'chrome-android-xr',
    'desktop-fallback',
    'unknown',
  ];

  it('should have icons for all platform types', () => {
    for (const platform of allPlatforms) {
      expect(PLATFORM_ICONS[platform]).toBeDefined();
      expect(PLATFORM_ICONS[platform].length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// FEATURE STATUS ICONS
// =============================================================================

describe('FEATURE_STATUS_ICONS', () => {
  const allStatuses: XRFeatureStatus[] = [
    'available',
    'unavailable',
    'requires-permission',
    'unknown',
  ];

  it('should have icons for all feature statuses', () => {
    for (const status of allStatuses) {
      expect(FEATURE_STATUS_ICONS[status]).toBeDefined();
      expect(FEATURE_STATUS_ICONS[status].length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// FEATURE DESCRIPTIONS
// =============================================================================

describe('FEATURE_DESCRIPTIONS', () => {
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

  it('should have descriptions for all features', () => {
    for (const feature of allFeatures) {
      expect(FEATURE_DESCRIPTIONS[feature]).toBeDefined();
      expect(FEATURE_DESCRIPTIONS[feature].length).toBeGreaterThan(10);
    }
  });

  it('should not have duplicate descriptions', () => {
    const descriptions = Object.values(FEATURE_DESCRIPTIONS);
    const unique = new Set(descriptions);
    expect(unique.size).toBe(descriptions.length);
  });
});

// =============================================================================
// DEFAULT SESSION MODE SUPPORT
// =============================================================================

describe('DEFAULT_SESSION_MODE_SUPPORT', () => {
  it('should have all three session modes', () => {
    const modes: XRSessionMode[] = ['inline', 'immersive-vr', 'immersive-ar'];
    for (const mode of modes) {
      expect(DEFAULT_SESSION_MODE_SUPPORT[mode]).toBeDefined();
    }
  });

  it('should default all modes to unknown', () => {
    expect(DEFAULT_SESSION_MODE_SUPPORT['inline']).toBe('unknown');
    expect(DEFAULT_SESSION_MODE_SUPPORT['immersive-vr']).toBe('unknown');
    expect(DEFAULT_SESSION_MODE_SUPPORT['immersive-ar']).toBe('unknown');
  });
});

// =============================================================================
// PLATFORM RECOMMENDED FEATURES
// =============================================================================

describe('PLATFORM_RECOMMENDED_FEATURES', () => {
  const allPlatforms: XRPlatformType[] = [
    'visionos-safari',
    'meta-quest',
    'chrome-android-xr',
    'desktop-fallback',
    'unknown',
  ];

  it('should have recommendations for all platforms', () => {
    for (const platform of allPlatforms) {
      const rec = PLATFORM_RECOMMENDED_FEATURES[platform];
      expect(rec).toBeDefined();
      expect(rec.required).toBeInstanceOf(Array);
      expect(rec.optional).toBeInstanceOf(Array);
    }
  });

  it('should have visionOS prefer immersive-vr', () => {
    expect(PLATFORM_RECOMMENDED_FEATURES['visionos-safari'].preferredSessionMode).toBe('immersive-vr');
  });

  it('should have Meta Quest prefer immersive-vr', () => {
    expect(PLATFORM_RECOMMENDED_FEATURES['meta-quest'].preferredSessionMode).toBe('immersive-vr');
  });

  it('should have Chrome Android prefer immersive-ar', () => {
    expect(PLATFORM_RECOMMENDED_FEATURES['chrome-android-xr'].preferredSessionMode).toBe('immersive-ar');
  });

  it('should have desktop fallback prefer null session mode', () => {
    expect(PLATFORM_RECOMMENDED_FEATURES['desktop-fallback'].preferredSessionMode).toBeNull();
  });

  it('should include hand-tracking for Meta Quest required features', () => {
    expect(PLATFORM_RECOMMENDED_FEATURES['meta-quest'].required).toContain('hand-tracking');
  });

  it('should include hit-test for Chrome Android required features', () => {
    expect(PLATFORM_RECOMMENDED_FEATURES['chrome-android-xr'].required).toContain('hit-test');
  });

  it('should not have required features overlap with optional features', () => {
    for (const platform of allPlatforms) {
      const rec = PLATFORM_RECOMMENDED_FEATURES[platform];
      for (const req of rec.required) {
        expect(rec.optional).not.toContain(req);
      }
    }
  });
});

// =============================================================================
// DEFAULT THEME
// =============================================================================

describe('DEFAULT_XR_PLATFORM_THEME', () => {
  it('should have all required theme properties', () => {
    expect(DEFAULT_XR_PLATFORM_THEME.fontFamily).toBeTruthy();
    expect(DEFAULT_XR_PLATFORM_THEME.fontScale).toBe(1);
    expect(DEFAULT_XR_PLATFORM_THEME.borderRadius).toBeTruthy();
    expect(DEFAULT_XR_PLATFORM_THEME.textPrimary).toMatch(/^#[0-9A-Fa-f]+$/);
    expect(DEFAULT_XR_PLATFORM_THEME.textSecondary).toMatch(/^#[0-9A-Fa-f]+$/);
  });

  it('should have feature status colors', () => {
    expect(DEFAULT_XR_PLATFORM_THEME.featureAvailableColor).toMatch(/^#[0-9A-Fa-f]+$/);
    expect(DEFAULT_XR_PLATFORM_THEME.featureUnavailableColor).toMatch(/^#[0-9A-Fa-f]+$/);
    expect(DEFAULT_XR_PLATFORM_THEME.featureUnknownColor).toMatch(/^#[0-9A-Fa-f]+$/);
    expect(DEFAULT_XR_PLATFORM_THEME.featurePermissionColor).toMatch(/^#[0-9A-Fa-f]+$/);
  });

  it('should have platform color sets for all platforms', () => {
    const allPlatforms: XRPlatformType[] = [
      'visionos-safari',
      'meta-quest',
      'chrome-android-xr',
      'desktop-fallback',
      'unknown',
    ];
    for (const platform of allPlatforms) {
      const colors = DEFAULT_XR_PLATFORM_THEME.platformColors[platform];
      expect(colors).toBeDefined();
      expect(colors!.color).toBeTruthy();
      expect(colors!.backgroundColor).toBeTruthy();
      expect(colors!.borderColor).toBeTruthy();
    }
  });
});

// =============================================================================
// TYPE STRUCTURAL TESTS (compile-time verification via runtime checks)
// =============================================================================

describe('Type structural verification', () => {
  it('XRPlatformCapabilities should have all required fields', () => {
    const mockCapabilities: XRPlatformCapabilities = {
      platform: 'desktop-fallback',
      platformLabel: 'Desktop (Fallback)',
      xrSupported: false,
      xrApiPresent: false,
      sessionModes: {
        'inline': 'unsupported',
        'immersive-vr': 'unsupported',
        'immersive-ar': 'unsupported',
      },
      features: [],
      recommended: {
        required: [],
        optional: [],
        preferredSessionMode: null,
      },
      userAgent: 'test',
      detectedAt: Date.now(),
    };

    expect(mockCapabilities.platform).toBe('desktop-fallback');
    expect(mockCapabilities.xrSupported).toBe(false);
    expect(mockCapabilities.features).toBeInstanceOf(Array);
    expect(mockCapabilities.detectedAt).toBeGreaterThan(0);
  });

  it('XRFeatureCapability should have all required fields', () => {
    const mockFeature: XRFeatureCapability = {
      name: 'hand-tracking',
      status: 'available',
      description: 'Test description',
    };

    expect(mockFeature.name).toBe('hand-tracking');
    expect(mockFeature.status).toBe('available');
    expect(mockFeature.description).toBeTruthy();
  });

  it('UseWebXRPlatformState should have all required fields', () => {
    const mockState: UseWebXRPlatformState = {
      loading: false,
      error: null,
      capabilities: null,
      redetect: () => {},
    };

    expect(mockState.loading).toBe(false);
    expect(mockState.error).toBeNull();
    expect(mockState.capabilities).toBeNull();
    expect(typeof mockState.redetect).toBe('function');
  });
});
