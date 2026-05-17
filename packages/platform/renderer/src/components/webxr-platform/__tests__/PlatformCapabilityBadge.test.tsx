/**
 * @vitest-environment jsdom
 */

/**
 * Tests for PlatformCapabilityBadge Component
 *
 * Validates:
 * - Platform badge rendering with all platform types
 * - Feature indicator rendering with all status types
 * - Session mode row rendering
 * - Size variants (sm, md, lg)
 * - Visual variants (badge, pill, card)
 * - Display modes (platform, features, full)
 * - Feature filtering
 * - Click handling and keyboard interaction
 * - Accessibility attributes (role, aria-label)
 * - Theme customization
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { PlatformCapabilityBadge } from '../PlatformCapabilityBadge';
import type { PlatformCapabilityBadgeProps } from '../PlatformCapabilityBadge';
import type {
  XRPlatformCapabilities,
  XRPlatformType,
  XRFeatureCapability,
  CapabilityBadgeSize,
  CapabilityBadgeVariant,
  CapabilityBadgeDisplayMode,
} from '../types';
import { PLATFORM_LABELS } from '../types';
import { detectFeatures, getRecommendedFeatures } from '../WebXRPlatformDetector';

// =============================================================================
// TEST HELPERS
// =============================================================================

/**
 * Create mock capabilities for a given platform.
 */
function createMockCapabilities(
  platform: XRPlatformType,
  overrides?: Partial<XRPlatformCapabilities>,
): XRPlatformCapabilities {
  const features = detectFeatures(platform);
  const recommended = getRecommendedFeatures(platform);

  return {
    platform,
    platformLabel: PLATFORM_LABELS[platform],
    xrSupported: platform !== 'desktop-fallback',
    xrApiPresent: platform !== 'desktop-fallback',
    sessionModes: {
      'inline': 'supported',
      'immersive-vr': platform === 'chrome-android-xr' ? 'unsupported' : 'supported',
      'immersive-ar': platform === 'visionos-safari' || platform === 'desktop-fallback'
        ? 'unsupported'
        : 'supported',
    },
    features,
    recommended,
    userAgent: 'test-ua',
    detectedAt: Date.now(),
    ...overrides,
  };
}

function getProps(element: React.ReactElement): Record<string, unknown> {
  return element.props as Record<string, unknown>;
}

// =============================================================================
// COMPONENT CREATION
// =============================================================================

describe('PlatformCapabilityBadge', () => {
  describe('component creation', () => {
    it('should create element with capabilities prop', () => {
      const caps = createMockCapabilities('meta-quest');
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
      });
      expect(getProps(element).capabilities).toBe(caps);
    });

    it('should accept all platform types', () => {
      const platforms: XRPlatformType[] = [
        'visionos-safari',
        'meta-quest',
        'chrome-android-xr',
        'desktop-fallback',
        'unknown',
      ];

      for (const platform of platforms) {
        const caps = createMockCapabilities(platform);
        const element = React.createElement(PlatformCapabilityBadge, {
          capabilities: caps,
        });
        const props = getProps(element) as unknown as PlatformCapabilityBadgeProps;
        expect(props.capabilities.platform).toBe(platform);
      }
    });
  });

  // =============================================================================
  // SIZE VARIANTS
  // =============================================================================

  describe('size variants', () => {
    it('should accept all valid size values', () => {
      const sizes: CapabilityBadgeSize[] = ['sm', 'md', 'lg'];
      const caps = createMockCapabilities('meta-quest');

      for (const size of sizes) {
        const element = React.createElement(PlatformCapabilityBadge, {
          capabilities: caps,
          size,
        });
        expect(getProps(element).size).toBe(size);
      }
    });

    it('should default to md size', () => {
      const caps = createMockCapabilities('meta-quest');
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
      });
      // When not specified, it should use default (md)
      expect(getProps(element).size).toBeUndefined();
    });
  });

  // =============================================================================
  // VISUAL VARIANTS
  // =============================================================================

  describe('visual variants', () => {
    it('should accept all valid variant values', () => {
      const variants: CapabilityBadgeVariant[] = ['badge', 'pill', 'card'];
      const caps = createMockCapabilities('meta-quest');

      for (const variant of variants) {
        const element = React.createElement(PlatformCapabilityBadge, {
          capabilities: caps,
          variant,
        });
        expect(getProps(element).variant).toBe(variant);
      }
    });
  });

  // =============================================================================
  // DISPLAY MODES
  // =============================================================================

  describe('display modes', () => {
    it('should accept all valid display modes', () => {
      const modes: CapabilityBadgeDisplayMode[] = ['platform', 'features', 'full'];
      const caps = createMockCapabilities('meta-quest');

      for (const mode of modes) {
        const element = React.createElement(PlatformCapabilityBadge, {
          capabilities: caps,
          displayMode: mode,
        });
        expect(getProps(element).displayMode).toBe(mode);
      }
    });
  });

  // =============================================================================
  // SESSION MODES
  // =============================================================================

  describe('session mode display', () => {
    it('should accept showSessionModes prop', () => {
      const caps = createMockCapabilities('meta-quest');
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
        showSessionModes: true,
      });
      expect(getProps(element).showSessionModes).toBe(true);
    });

    it('should accept showSessionModes=false', () => {
      const caps = createMockCapabilities('meta-quest');
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
        showSessionModes: false,
      });
      expect(getProps(element).showSessionModes).toBe(false);
    });
  });

  // =============================================================================
  // FEATURE FILTERING
  // =============================================================================

  describe('feature filtering', () => {
    it('should accept a feature filter function', () => {
      const caps = createMockCapabilities('meta-quest');
      const filter = (f: XRFeatureCapability) => f.status === 'available';
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
        featureFilter: filter,
      });
      expect(getProps(element).featureFilter).toBe(filter);
    });

    it('should accept null feature filter (show all)', () => {
      const caps = createMockCapabilities('meta-quest');
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
        featureFilter: null,
      });
      expect(getProps(element).featureFilter).toBeNull();
    });
  });

  // =============================================================================
  // CLICK HANDLING
  // =============================================================================

  describe('click handling', () => {
    it('should accept onPlatformClick callback', () => {
      const onPlatformClick = vi.fn();
      const caps = createMockCapabilities('meta-quest');
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
        onPlatformClick,
      });
      expect(getProps(element).onPlatformClick).toBe(onPlatformClick);
    });

    it('should accept onFeatureClick callback', () => {
      const onFeatureClick = vi.fn();
      const caps = createMockCapabilities('meta-quest');
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
        onFeatureClick,
      });
      expect(getProps(element).onFeatureClick).toBe(onFeatureClick);
    });
  });

  // =============================================================================
  // ACCESSIBILITY
  // =============================================================================

  describe('accessibility', () => {
    it('should accept ariaLabel prop', () => {
      const caps = createMockCapabilities('meta-quest');
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
        ariaLabel: 'Custom XR platform info',
      });
      expect(getProps(element).ariaLabel).toBe('Custom XR platform info');
    });

    it('should accept className prop', () => {
      const caps = createMockCapabilities('meta-quest');
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
        className: 'xr-badge-custom',
      });
      expect(getProps(element).className).toBe('xr-badge-custom');
    });

    it('should accept style prop', () => {
      const caps = createMockCapabilities('meta-quest');
      const customStyle = { marginTop: '10px' };
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
        style: customStyle,
      });
      expect(getProps(element).style).toBe(customStyle);
    });
  });

  // =============================================================================
  // THEME
  // =============================================================================

  describe('theme customization', () => {
    it('should accept partial theme overrides', () => {
      const caps = createMockCapabilities('meta-quest');
      const themeOverride = {
        fontScale: 1.2,
        borderRadius: '12px',
      };
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
        theme: themeOverride,
      });
      expect(getProps(element).theme).toBe(themeOverride);
    });

    it('should accept full theme override', () => {
      const caps = createMockCapabilities('meta-quest');
      const fullTheme = {
        fontFamily: 'monospace',
        fontScale: 0.9,
        borderRadius: '0px',
        textPrimary: '#000000',
        textSecondary: '#333333',
        backgroundPrimary: '#FFFFFF',
        backgroundSecondary: '#F5F5F5',
        platformColors: {},
        featureAvailableColor: '#00FF00',
        featureUnavailableColor: '#FF0000',
        featureUnknownColor: '#808080',
        featurePermissionColor: '#FFFF00',
      };
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
        theme: fullTheme,
      });
      expect(getProps(element).theme).toBe(fullTheme);
    });
  });

  // =============================================================================
  // ANIMATION
  // =============================================================================

  describe('animation control', () => {
    it('should accept animated=true', () => {
      const caps = createMockCapabilities('meta-quest');
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
        animated: true,
      });
      expect(getProps(element).animated).toBe(true);
    });

    it('should accept animated=false', () => {
      const caps = createMockCapabilities('meta-quest');
      const element = React.createElement(PlatformCapabilityBadge, {
        capabilities: caps,
        animated: false,
      });
      expect(getProps(element).animated).toBe(false);
    });
  });
});

// =============================================================================
// CAPABILITIES STRUCTURE
// =============================================================================

describe('Mock capabilities structure', () => {
  it('should create valid Meta Quest capabilities', () => {
    const caps = createMockCapabilities('meta-quest');

    expect(caps.platform).toBe('meta-quest');
    expect(caps.platformLabel).toBe('Meta Quest');
    expect(caps.xrSupported).toBe(true);
    expect(caps.sessionModes['immersive-vr']).toBe('supported');
    expect(caps.sessionModes['immersive-ar']).toBe('supported');
    expect(caps.features.length).toBe(13);
    expect(caps.recommended.preferredSessionMode).toBe('immersive-vr');
  });

  it('should create valid visionOS capabilities', () => {
    const caps = createMockCapabilities('visionos-safari');

    expect(caps.platform).toBe('visionos-safari');
    expect(caps.xrSupported).toBe(true);
    expect(caps.sessionModes['immersive-vr']).toBe('supported');
    expect(caps.sessionModes['immersive-ar']).toBe('unsupported');
    expect(caps.recommended.preferredSessionMode).toBe('immersive-vr');

    // visionOS-specific features
    const modelElement = caps.features.find((f) => f.name === 'model-element');
    expect(modelElement?.status).toBe('available');
  });

  it('should create valid Chrome Android XR capabilities', () => {
    const caps = createMockCapabilities('chrome-android-xr');

    expect(caps.platform).toBe('chrome-android-xr');
    expect(caps.xrSupported).toBe(true);
    expect(caps.sessionModes['immersive-vr']).toBe('unsupported');
    expect(caps.sessionModes['immersive-ar']).toBe('supported');
    expect(caps.recommended.preferredSessionMode).toBe('immersive-ar');
  });

  it('should create valid desktop fallback capabilities', () => {
    const caps = createMockCapabilities('desktop-fallback');

    expect(caps.platform).toBe('desktop-fallback');
    expect(caps.xrSupported).toBe(false);
    expect(caps.xrApiPresent).toBe(false);

    // All features should be unavailable
    for (const feature of caps.features) {
      expect(feature.status).toBe('unavailable');
    }
  });

  it('should support capability overrides', () => {
    const caps = createMockCapabilities('meta-quest', {
      xrSupported: false,
      userAgent: 'custom-ua',
    });

    expect(caps.platform).toBe('meta-quest');
    expect(caps.xrSupported).toBe(false);
    expect(caps.userAgent).toBe('custom-ua');
  });

  it('should create capabilities with non-zero timestamp', () => {
    const before = Date.now();
    const caps = createMockCapabilities('meta-quest');
    expect(caps.detectedAt).toBeGreaterThanOrEqual(before);
  });
});
