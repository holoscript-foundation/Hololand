/**
 * Feature detection for the HTML <model> element.
 *
 * Detects whether the browser supports the native <model> element
 * (currently only visionOS Safari 18+). Provides fallback recommendations
 * for unsupported browsers.
 *
 * @module model-viewer/featureDetection
 */

/** Browser support result */
export interface ModelElementSupport {
  /** Whether the browser supports the native <model> element */
  supported: boolean;
  /** Whether we're running on visionOS */
  isVisionOS: boolean;
  /** Whether WebGL is available (for three.js fallback) */
  hasWebGL: boolean;
  /** Whether WebGL2 is available */
  hasWebGL2: boolean;
  /** Recommended fallback strategy */
  fallbackStrategy: FallbackStrategy;
}

/** Recommended fallback rendering strategy */
export type FallbackStrategy =
  | 'native'     // Use the native <model> element
  | 'threejs'    // Use three.js with USDZLoader
  | 'quicklook'  // Use Apple Quick Look AR link
  | 'image'      // Show static poster/fallback image
  | 'none';      // No rendering possible

/**
 * Cache the detection result so we only probe once per page load.
 */
let _cachedSupport: ModelElementSupport | null = null;

/**
 * Detect whether the current browser supports the HTML <model> element.
 *
 * Detection strategy:
 * 1. Check if `HTMLModelElement` exists on the window (visionOS Safari 18+)
 * 2. Check if `document.createElement('model')` returns a real HTMLModelElement
 *    (not a generic HTMLUnknownElement)
 * 3. Check visionOS user agent hints
 * 4. Fall through to WebGL checks for three.js fallback
 *
 * @returns ModelElementSupport with detection results and recommended fallback
 */
export function detectModelElementSupport(): ModelElementSupport {
  if (_cachedSupport) return _cachedSupport;

  // SSR guard
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    _cachedSupport = {
      supported: false,
      isVisionOS: false,
      hasWebGL: false,
      hasWebGL2: false,
      fallbackStrategy: 'none',
    };
    return _cachedSupport;
  }

  const isVisionOS = detectVisionOS();
  const supported = detectNativeModelElement();
  const hasWebGL = detectWebGL();
  const hasWebGL2 = detectWebGL2();

  let fallbackStrategy: FallbackStrategy;
  if (supported) {
    fallbackStrategy = 'native';
  } else if (hasWebGL2 || hasWebGL) {
    fallbackStrategy = 'threejs';
  } else if (isAppleDevice()) {
    fallbackStrategy = 'quicklook';
  } else {
    fallbackStrategy = 'image';
  }

  _cachedSupport = {
    supported,
    isVisionOS,
    hasWebGL,
    hasWebGL2,
    fallbackStrategy,
  };

  return _cachedSupport;
}

/**
 * Check if the native <model> element constructor exists.
 *
 * On visionOS Safari 18+, `document.createElement('model')` returns an
 * instance of HTMLModelElement (which has `ready`, `play`, etc.), not
 * an HTMLUnknownElement.
 */
function detectNativeModelElement(): boolean {
  try {
    // Check 1: Does the global constructor exist?
    if ('HTMLModelElement' in window) {
      return true;
    }

    // Check 2: Does createElement produce a non-unknown element?
    const testEl = document.createElement('model');
    // In browsers that don't support <model>, this will be HTMLUnknownElement
    if (testEl.constructor.name !== 'HTMLUnknownElement' && 'ready' in testEl) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Detect if running on visionOS via user agent or client hints.
 */
function detectVisionOS(): boolean {
  try {
    const ua = navigator.userAgent;
    // visionOS Safari identifies itself with "visionOS" or "XROS" in the UA string
    if (/visionOS|XROS/i.test(ua)) {
      return true;
    }
    // Check navigator.platform for xros (client hints)
    if (typeof navigator.platform === 'string' && /xros/i.test(navigator.platform)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Detect if running on an Apple device (for Quick Look AR fallback).
 */
function isAppleDevice(): boolean {
  try {
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(ua);
  } catch {
    return false;
  }
}

/**
 * Detect WebGL 1 support.
 */
function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return gl !== null;
  } catch {
    return false;
  }
}

/**
 * Detect WebGL 2 support.
 */
function detectWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    return gl2 !== null;
  } catch {
    return false;
  }
}

/**
 * Reset the cached support detection. Useful for testing.
 * @internal
 */
export function _resetDetectionCache(): void {
  _cachedSupport = null;
}
