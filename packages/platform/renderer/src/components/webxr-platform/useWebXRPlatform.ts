/**
 * useWebXRPlatform React Hook
 *
 * Provides reactive WebXR platform detection with loading/error states.
 * Runs detection on mount, caches results, and exposes a redetect function
 * for re-probing after permission changes or device reconnection.
 *
 * Usage:
 * ```tsx
 * const { loading, error, capabilities, redetect } = useWebXRPlatform();
 *
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage message={error} />;
 *
 * // Use capabilities.platform, capabilities.sessionModes, etc.
 * const { platform, features, recommended } = capabilities;
 * ```
 *
 * @module webxr-platform/useWebXRPlatform
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { UseWebXRPlatformState, XRPlatformCapabilities } from './types';
import { detectWebXRPlatform } from './WebXRPlatformDetector';
import type { DetectionConfig } from './WebXRPlatformDetector';

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseWebXRPlatformOptions {
  /**
   * Whether to run detection automatically on mount.
   * Set to false for manual control via redetect().
   * @default true
   */
  autoDetect?: boolean;

  /**
   * Override detection config (useful for testing or SSR).
   */
  detectionConfig?: DetectionConfig;

  /**
   * Callback fired when detection completes successfully.
   */
  onDetected?: (capabilities: XRPlatformCapabilities) => void;

  /**
   * Callback fired when detection fails.
   */
  onError?: (error: string) => void;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * React hook for WebXR platform detection.
 *
 * Returns a state object with loading, error, capabilities, and redetect().
 * Detection runs once on mount by default and caches the result.
 *
 * @param options - Configuration options
 * @returns UseWebXRPlatformState
 */
export function useWebXRPlatform(
  options?: UseWebXRPlatformOptions,
): UseWebXRPlatformState {
  const {
    autoDetect = true,
    detectionConfig,
    onDetected,
    onError,
  } = options ?? {};

  const [loading, setLoading] = useState<boolean>(autoDetect);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<XRPlatformCapabilities | null>(null);

  // Track if component is mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  // Track detection in progress to prevent concurrent runs
  const detectingRef = useRef(false);

  /**
   * Run platform detection.
   * Safe to call multiple times; concurrent calls are deduplicated.
   */
  const detect = useCallback(async () => {
    if (detectingRef.current) return;
    detectingRef.current = true;

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await detectWebXRPlatform(detectionConfig);

      if (mountedRef.current) {
        setCapabilities(result);
        setLoading(false);
        setError(null);
        onDetected?.(result);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'WebXR platform detection failed';

      if (mountedRef.current) {
        setError(message);
        setLoading(false);
        setCapabilities(null);
        onError?.(message);
      }
    } finally {
      detectingRef.current = false;
    }
  }, [detectionConfig, onDetected, onError]);

  /**
   * Publicly exposed redetect function.
   * Clears cached results and re-runs detection.
   */
  const redetect = useCallback(() => {
    setCapabilities(null);
    void detect();
  }, [detect]);

  // Auto-detect on mount
  useEffect(() => {
    if (autoDetect) {
      void detect();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoDetect, detect]);

  return {
    loading,
    error,
    capabilities,
    redetect,
  };
}

export default useWebXRPlatform;
