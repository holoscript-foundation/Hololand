/**
 * Tests for featureDetection module
 *
 * Verifies browser capability detection for the native <model> element,
 * WebGL, visionOS UA sniffing, and fallback strategy selection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  detectModelElementSupport,
  _resetDetectionCache,
} from '../featureDetection';
import type { ModelElementSupport } from '../featureDetection';

describe('featureDetection', () => {
  beforeEach(() => {
    _resetDetectionCache();
  });

  afterEach(() => {
    // Clean up any global mocks
    delete (window as any).HTMLModelElement;
    vi.restoreAllMocks();
  });

  describe('detectModelElementSupport', () => {
    it('returns cached result on subsequent calls', () => {
      const result1 = detectModelElementSupport();
      const result2 = detectModelElementSupport();
      expect(result1).toBe(result2); // Same reference (cached)
    });

    it('detects native support when HTMLModelElement exists on window', () => {
      (window as any).HTMLModelElement = function HTMLModelElement() {};

      const result = detectModelElementSupport();
      expect(result.supported).toBe(true);
      expect(result.fallbackStrategy).toBe('native');
    });

    it('detects no native support when HTMLModelElement is absent', () => {
      // Ensure HTMLModelElement is not on window (jsdom default)
      delete (window as any).HTMLModelElement;

      const result = detectModelElementSupport();
      expect(result.supported).toBe(false);
    });

    it('recommends threejs fallback when WebGL is available', () => {
      delete (window as any).HTMLModelElement;

      // jsdom doesn't have real WebGL, so mock canvas.getContext
      const mockGetContext = vi.fn((contextType: string) => {
        if (contextType === 'webgl' || contextType === 'webgl2') {
          return {}; // truthy value = WebGL supported
        }
        return null;
      });

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return { getContext: mockGetContext } as any;
        }
        if (tagName === 'model') {
          return { constructor: { name: 'HTMLUnknownElement' } } as any;
        }
        return document.createElement.call(document, tagName);
      });

      _resetDetectionCache();
      const result = detectModelElementSupport();
      expect(result.hasWebGL).toBe(true);
      expect(result.fallbackStrategy).toBe('threejs');
    });

    it('recommends image fallback when no WebGL is available', () => {
      delete (window as any).HTMLModelElement;

      const mockGetContext = vi.fn(() => null);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return { getContext: mockGetContext } as any;
        }
        if (tagName === 'model') {
          return { constructor: { name: 'HTMLUnknownElement' } } as any;
        }
        return document.createElement.call(document, tagName);
      });

      // Mock non-Apple UA
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (X11; Linux x86_64)',
        writable: true,
        configurable: true,
      });

      _resetDetectionCache();
      const result = detectModelElementSupport();
      expect(result.hasWebGL).toBe(false);
      expect(result.fallbackStrategy).toBe('image');
    });

    it('detects visionOS from user agent string', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (visionOS 2.0) AppleWebKit/605.1.15',
        writable: true,
        configurable: true,
      });

      _resetDetectionCache();
      const result = detectModelElementSupport();
      expect(result.isVisionOS).toBe(true);
    });

    it('detects visionOS from XROS user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (XROS 1.0) AppleWebKit/605.1.15',
        writable: true,
        configurable: true,
      });

      _resetDetectionCache();
      const result = detectModelElementSupport();
      expect(result.isVisionOS).toBe(true);
    });

    it('returns false for visionOS on regular browsers', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        writable: true,
        configurable: true,
      });

      _resetDetectionCache();
      const result = detectModelElementSupport();
      expect(result.isVisionOS).toBe(false);
    });

    it('recommends quicklook fallback for Apple devices without WebGL', () => {
      delete (window as any).HTMLModelElement;

      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        writable: true,
        configurable: true,
      });

      const mockGetContext = vi.fn(() => null);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return { getContext: mockGetContext } as any;
        }
        if (tagName === 'model') {
          return { constructor: { name: 'HTMLUnknownElement' } } as any;
        }
        return document.createElement.call(document, tagName);
      });

      _resetDetectionCache();
      const result = detectModelElementSupport();
      expect(result.fallbackStrategy).toBe('quicklook');
    });

    it('detects WebGL2 support separately from WebGL1', () => {
      delete (window as any).HTMLModelElement;

      const mockGetContext = vi.fn((contextType: string) => {
        if (contextType === 'webgl2') return {};
        if (contextType === 'webgl') return {};
        return null;
      });

      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return { getContext: mockGetContext } as any;
        }
        if (tagName === 'model') {
          return { constructor: { name: 'HTMLUnknownElement' } } as any;
        }
        return document.createElement.call(document, tagName);
      });

      _resetDetectionCache();
      const result = detectModelElementSupport();
      expect(result.hasWebGL).toBe(true);
      expect(result.hasWebGL2).toBe(true);
    });
  });

  describe('_resetDetectionCache', () => {
    it('clears the cached result so detection runs again', () => {
      const result1 = detectModelElementSupport();
      _resetDetectionCache();

      // Modify environment
      (window as any).HTMLModelElement = function HTMLModelElement() {};

      const result2 = detectModelElementSupport();
      expect(result1).not.toBe(result2);
      expect(result2.supported).toBe(true);
    });
  });
});
