/**
 * useRendererToggle Hook
 *
 * React hook that manages:
 *   1. WebGPU / WebGL2 capability detection (async on mount)
 *   2. Active backend selection with user override
 *   3. localStorage persistence of the user's preference
 *   4. Per-frame performance stats via PerformanceMonitor
 *
 * @module studio/useRendererToggle
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type * as THREE from 'three';

import {
  type RendererBackend,
  type RendererCapabilities,
  detectRendererCapabilities,
  saveRendererPreference,
  resolveRendererBackend,
  clearRendererPreference,
} from './RendererDetector';
import { PerformanceMonitor, type RenderStats } from './PerformanceMonitor';

// =============================================================================
// TYPES
// =============================================================================

export interface UseRendererToggleOptions {
  /** The Three.js WebGLRenderer (or WebGPURenderer) instance to monitor */
  renderer?: THREE.WebGLRenderer;
  /** How often (ms) to push stats updates to React state (default: 250) */
  statsRefreshInterval?: number;
  /** Callback when the user switches renderer backend */
  onBackendChange?: (backend: RendererBackend) => void;
  /** Whether to start sampling immediately (default: true) */
  autoStart?: boolean;
}

export interface UseRendererToggleReturn {
  /** Current active renderer backend */
  activeBackend: RendererBackend;
  /** Detected capabilities (null until async detection completes) */
  capabilities: RendererCapabilities | null;
  /** Whether capabilities are still being detected */
  detecting: boolean;
  /** Real-time rendering stats */
  stats: RenderStats;
  /** Whether WebGPU is available */
  webgpuAvailable: boolean;
  /** Whether WebGL2 is available */
  webgl2Available: boolean;
  /** Switch to a specific backend */
  setBackend: (backend: RendererBackend) => void;
  /** Toggle between WebGPU and WebGL2 */
  toggleBackend: () => void;
  /** Reset to auto-detected preference */
  resetPreference: () => void;
  /** GPU name string (for display) */
  gpuName: string;
  /** Whether the monitor is actively sampling */
  isSampling: boolean;
  /** Start sampling */
  startSampling: () => void;
  /** Stop sampling */
  stopSampling: () => void;
  /** The underlying PerformanceMonitor (for advanced use) */
  monitor: PerformanceMonitor;
}

// =============================================================================
// DEFAULT STATS
// =============================================================================

const EMPTY_STATS: RenderStats = {
  fps: 0,
  frameTimeMs: 0,
  gpuUtilization: -1,
  drawCalls: 0,
  triangles: 0,
  textures: 0,
  programs: 0,
  geometries: 0,
  gpuMemoryMB: -1,
  backendLabel: 'Detecting...',
};

// =============================================================================
// HOOK
// =============================================================================

export function useRendererToggle(
  options: UseRendererToggleOptions = {},
): UseRendererToggleReturn {
  const {
    renderer,
    statsRefreshInterval = 250,
    onBackendChange,
    autoStart = true,
  } = options;

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  const [capabilities, setCapabilities] = useState<RendererCapabilities | null>(
    null,
  );
  const [detecting, setDetecting] = useState(true);
  const [activeBackend, setActiveBackend] = useState<RendererBackend>('webgl2');
  const [stats, setStats] = useState<RenderStats>(EMPTY_STATS);
  const [isSampling, setIsSampling] = useState(autoStart);

  // -------------------------------------------------------------------------
  // Refs
  // -------------------------------------------------------------------------

  const monitorRef = useRef<PerformanceMonitor>(new PerformanceMonitor());
  const rafIdRef = useRef<number | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const onBackendChangeRef = useRef(onBackendChange);
  onBackendChangeRef.current = onBackendChange;

  // -------------------------------------------------------------------------
  // Detect capabilities on mount
  // -------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const caps = await detectRendererCapabilities();
        if (cancelled) return;

        setCapabilities(caps);
        const resolved = resolveRendererBackend(caps);
        setActiveBackend(resolved);
        monitorRef.current.setBackendLabel(
          resolved === 'webgpu' ? 'WebGPU' : 'WebGL2',
        );
      } catch {
        // Detection failed - default to WebGL2
        if (!cancelled) {
          setActiveBackend('webgl2');
          monitorRef.current.setBackendLabel('WebGL2');
        }
      } finally {
        if (!cancelled) {
          setDetecting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Attach monitor to renderer when it changes
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (renderer) {
      monitorRef.current.attach(renderer);
    }
  }, [renderer]);

  // -------------------------------------------------------------------------
  // Per-frame sampling loop
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!isSampling) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      return;
    }

    const tick = () => {
      monitorRef.current.sample();

      // Throttle React state updates
      const now = performance.now();
      if (now - lastRefreshRef.current >= statsRefreshInterval) {
        lastRefreshRef.current = now;
        setStats(monitorRef.current.getStats());
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isSampling, statsRefreshInterval]);

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      monitorRef.current.dispose();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const setBackend = useCallback(
    (backend: RendererBackend) => {
      setActiveBackend(backend);
      saveRendererPreference(backend);
      monitorRef.current.setBackendLabel(
        backend === 'webgpu' ? 'WebGPU' : 'WebGL2',
      );
      monitorRef.current.reset();
      onBackendChangeRef.current?.(backend);
    },
    [],
  );

  const toggleBackend = useCallback(() => {
    setActiveBackend((prev) => {
      const next: RendererBackend = prev === 'webgpu' ? 'webgl2' : 'webgpu';
      saveRendererPreference(next);
      monitorRef.current.setBackendLabel(
        next === 'webgpu' ? 'WebGPU' : 'WebGL2',
      );
      monitorRef.current.reset();
      onBackendChangeRef.current?.(next);
      return next;
    });
  }, []);

  const resetPreference = useCallback(() => {
    clearRendererPreference();
    if (capabilities) {
      const resolved = resolveRendererBackend(capabilities);
      setActiveBackend(resolved);
      monitorRef.current.setBackendLabel(
        resolved === 'webgpu' ? 'WebGPU' : 'WebGL2',
      );
      monitorRef.current.reset();
      onBackendChangeRef.current?.(resolved);
    }
  }, [capabilities]);

  const startSampling = useCallback(() => setIsSampling(true), []);
  const stopSampling = useCallback(() => setIsSampling(false), []);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const webgpuAvailable = capabilities?.webgpuSupported ?? false;
  const webgl2Available = capabilities?.webgl2Supported ?? true;

  let gpuName = 'Detecting...';
  if (capabilities) {
    if (activeBackend === 'webgpu' && capabilities.gpuAdapterInfo) {
      const ai = capabilities.gpuAdapterInfo;
      gpuName = ai.description !== 'WebGPU Adapter'
        ? ai.description
        : `${ai.vendor} ${ai.architecture}`.trim() || 'WebGPU Device';
    } else if (capabilities.webgl2RendererInfo) {
      gpuName = capabilities.webgl2RendererInfo;
    } else {
      gpuName = 'Unknown GPU';
    }
  }

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    activeBackend,
    capabilities,
    detecting,
    stats,
    webgpuAvailable,
    webgl2Available,
    setBackend,
    toggleBackend,
    resetPreference,
    gpuName,
    isSampling,
    startSampling,
    stopSampling,
    monitor: monitorRef.current,
  };
}
