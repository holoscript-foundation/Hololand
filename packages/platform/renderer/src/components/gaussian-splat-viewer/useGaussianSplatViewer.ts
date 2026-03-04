/**
 * useGaussianSplatViewer Hook
 *
 * React hook that manages the full WebGPU Gaussian splatting viewer lifecycle:
 * - WebGPU device initialization
 * - PLY data loading and GPU upload
 * - Orbit camera controller
 * - Render loop management
 * - Performance metrics polling
 *
 * ARCHITECTURE:
 * ```
 *   useGaussianSplatViewer() hook
 *       |
 *       |-- WebGPUSplatRenderer (WebGPU pipeline)
 *       |       |-- Sort key gen compute shader
 *       |       |-- Wait-free radix sort (4 digit passes)
 *       |       |-- Instanced quad rasterization
 *       |
 *       |-- OrbitCameraController (input handling)
 *       |-- PlyLoader (data loading)
 *       |
 *       |-- React state polling (500ms interval)
 * ```
 *
 * The hook polls metrics at a low frequency (2Hz default) to avoid
 * unnecessary React re-renders during the 60fps render loop.
 *
 * @module gaussian-splat-viewer/useGaussianSplatViewer
 */

import { useState, useRef, useCallback, useEffect } from 'react';

import { WebGPUSplatRenderer, createWebGPUSplatRenderer } from './WebGPUSplatRenderer';
import { OrbitCameraController, createOrbitCameraController } from './OrbitCameraController';
import { loadPlyFromUrl } from './PlyLoader';
import type {
  GaussianSplatViewerState,
  GaussianSplatViewerActions,
  ViewerStatus,
  SplatRenderConfig,
  SplatCloudData,
  CameraState,
  CameraControllerConfig,
} from './types';
import { DEFAULT_CAMERA_STATE, DEFAULT_RENDER_CONFIG } from './types';

// =============================================================================
// HOOK CONFIGURATION
// =============================================================================

/**
 * Configuration for the useGaussianSplatViewer hook.
 */
export interface UseGaussianSplatViewerConfig {
  /** Render configuration overrides */
  renderConfig?: Partial<SplatRenderConfig>;
  /** Camera controller configuration */
  cameraConfig?: Partial<CameraControllerConfig>;
  /** Initial camera state */
  initialCamera?: Partial<CameraState>;
  /** How often to poll stats for React updates (ms, default: 500) */
  statsPollingIntervalMs?: number;
  /** Whether to auto-start rendering after data load (default: true) */
  autoStart?: boolean;
  /** PLY URL to auto-load on mount (optional) */
  autoLoadUrl?: string;
}

const DEFAULT_HOOK_CONFIG: Required<Omit<UseGaussianSplatViewerConfig, 'autoLoadUrl'>> & { autoLoadUrl?: string } = {
  renderConfig: {},
  cameraConfig: {},
  initialCamera: {},
  statsPollingIntervalMs: 500,
  autoStart: true,
  autoLoadUrl: undefined,
};

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * React hook for managing the WebGPU Gaussian splatting viewer.
 *
 * @param canvasRef - React ref to the canvas element
 * @param config - Hook configuration
 * @returns [state, actions] tuple
 *
 * @example
 * ```tsx
 * const canvasRef = useRef<HTMLCanvasElement>(null);
 * const [state, actions] = useGaussianSplatViewer(canvasRef, {
 *   autoLoadUrl: '/models/scene.ply',
 *   autoStart: true,
 * });
 *
 * return (
 *   <canvas ref={canvasRef} width={1920} height={1080} />
 * );
 * ```
 */
export function useGaussianSplatViewer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  config?: UseGaussianSplatViewerConfig,
): [GaussianSplatViewerState, GaussianSplatViewerActions] {
  const resolvedConfig = { ...DEFAULT_HOOK_CONFIG, ...config };

  // ─── Refs (stable across renders) ──────────────────────────────────

  const rendererRef = useRef<WebGPUSplatRenderer | null>(null);
  const controllerRef = useRef<OrbitCameraController | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraUpdateFrameRef = useRef<number | null>(null);
  const isDisposedRef = useRef(false);
  const splatDataRef = useRef<SplatCloudData | null>(null);

  // ─── React State ───────────────────────────────────────────────────

  const [state, setState] = useState<GaussianSplatViewerState>({
    status: 'idle',
    camera: { ...DEFAULT_CAMERA_STATE, ...resolvedConfig.initialCamera },
    stats: null,
    lastFrame: null,
    splatCount: 0,
    isLoaded: false,
    error: null,
    adapterInfo: null,
  });

  // ─── Stats Polling ─────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    pollingIntervalRef.current = setInterval(() => {
      if (isDisposedRef.current) return;

      const renderer = rendererRef.current;
      if (!renderer) return;

      const stats = renderer.getStats();
      const lastFrame = renderer.getLastMetrics();

      setState(prev => ({
        ...prev,
        stats,
        lastFrame,
      }));
    }, resolvedConfig.statsPollingIntervalMs);
  }, [resolvedConfig.statsPollingIntervalMs]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // ─── Camera Update Loop ────────────────────────────────────────────

  const startCameraLoop = useCallback(() => {
    const renderer = rendererRef.current;
    const controller = controllerRef.current;
    if (!renderer || !controller) return;

    const loop = () => {
      if (isDisposedRef.current) return;

      const currentCamera = renderer.getCamera();
      const updatedCamera = controller.update(currentCamera as CameraState);
      renderer.setCamera(updatedCamera);

      cameraUpdateFrameRef.current = requestAnimationFrame(loop);
    };

    cameraUpdateFrameRef.current = requestAnimationFrame(loop);
  }, []);

  const stopCameraLoop = useCallback(() => {
    if (cameraUpdateFrameRef.current !== null) {
      cancelAnimationFrame(cameraUpdateFrameRef.current);
      cameraUpdateFrameRef.current = null;
    }
  }, []);

  // ─── Actions ───────────────────────────────────────────────────────

  const initializeRenderer = useCallback(async (): Promise<boolean> => {
    const canvas = canvasRef.current;
    if (!canvas || isDisposedRef.current) return false;

    setState(prev => ({ ...prev, status: 'initializing', error: null }));

    // Create renderer
    const renderer = createWebGPUSplatRenderer(
      resolvedConfig.renderConfig,
      { ...DEFAULT_CAMERA_STATE, ...resolvedConfig.initialCamera },
    );
    rendererRef.current = renderer;

    const success = await renderer.initialize(canvas);

    if (!success) {
      setState(prev => ({
        ...prev,
        status: 'no-webgpu',
        error: 'WebGPU is not available in this browser',
      }));
      return false;
    }

    // Create camera controller
    const controller = createOrbitCameraController(resolvedConfig.cameraConfig);
    controller.attach(canvas);
    controller.setFromCamera({
      ...DEFAULT_CAMERA_STATE,
      ...resolvedConfig.initialCamera,
    } as CameraState);
    controllerRef.current = controller;

    setState(prev => ({
      ...prev,
      status: 'ready',
      adapterInfo: renderer.getAdapterInfo(),
    }));

    return true;
  }, [canvasRef, resolvedConfig]);

  const loadPLY = useCallback(async (url: string) => {
    if (isDisposedRef.current) return;

    const renderer = rendererRef.current;
    if (!renderer) {
      // Auto-initialize if needed
      const success = await initializeRenderer();
      if (!success) return;
    }

    setState(prev => ({ ...prev, status: 'loading', error: null }));

    try {
      const data = await loadPlyFromUrl(url, (_progress) => {
        // Could update loading progress in state
      });

      splatDataRef.current = data;
      rendererRef.current!.uploadSplatData(data);

      // Fit camera to bounds
      const controller = controllerRef.current;
      if (controller) {
        controller.fitToBounds(data.boundsMin, data.boundsMax);
      }

      setState(prev => ({
        ...prev,
        status: 'ready',
        splatCount: data.count,
        isLoaded: true,
      }));

      // Auto-start if configured
      if (resolvedConfig.autoStart) {
        startRendering();
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: String(error),
      }));
    }
  }, [initializeRenderer, resolvedConfig.autoStart]);

  const loadData = useCallback(async (data: SplatCloudData) => {
    if (isDisposedRef.current) return;

    const renderer = rendererRef.current;
    if (!renderer) {
      const success = await initializeRenderer();
      if (!success) return;
    }

    splatDataRef.current = data;
    rendererRef.current!.uploadSplatData(data);

    const controller = controllerRef.current;
    if (controller) {
      controller.fitToBounds(data.boundsMin, data.boundsMax);
    }

    setState(prev => ({
      ...prev,
      status: 'ready',
      splatCount: data.count,
      isLoaded: true,
    }));

    if (resolvedConfig.autoStart) {
      startRendering();
    }
  }, [initializeRenderer, resolvedConfig.autoStart]);

  const startRendering = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer || renderer.getIsRendering()) return;

    renderer.startRenderLoop();
    startCameraLoop();
    startPolling();

    setState(prev => ({ ...prev, status: 'rendering' }));
  }, [startCameraLoop, startPolling]);

  const stopRendering = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    renderer.stopRenderLoop();
    stopCameraLoop();
    stopPolling();

    setState(prev => ({ ...prev, status: 'ready' }));
  }, [stopCameraLoop, stopPolling]);

  const togglePause = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (renderer.getIsRendering()) {
      renderer.stopRenderLoop();
      setState(prev => ({ ...prev, status: 'paused' }));
    } else {
      renderer.startRenderLoop();
      setState(prev => ({ ...prev, status: 'rendering' }));
    }
  }, []);

  const resetCamera = useCallback(() => {
    const controller = controllerRef.current;
    const data = splatDataRef.current;
    if (!controller) return;

    if (data) {
      controller.fitToBounds(data.boundsMin, data.boundsMax);
    } else {
      controller.setPosition([0, 0, 3], [0, 0, 0]);
    }
  }, []);

  const setCameraAction = useCallback((
    position: [number, number, number],
    target: [number, number, number],
  ) => {
    const controller = controllerRef.current;
    if (controller) {
      controller.setPosition(position, target);
    }
  }, []);

  const setRenderConfig = useCallback((cfg: Partial<SplatRenderConfig>) => {
    const renderer = rendererRef.current;
    if (renderer) {
      renderer.setConfig(cfg);
    }
  }, []);

  const renderSingleFrame = useCallback(() => {
    const renderer = rendererRef.current;
    if (renderer) {
      renderer.renderFrame();
    }
  }, []);

  const dispose = useCallback(() => {
    isDisposedRef.current = true;
    stopPolling();
    stopCameraLoop();

    controllerRef.current?.dispose();
    rendererRef.current?.dispose();

    controllerRef.current = null;
    rendererRef.current = null;
    splatDataRef.current = null;

    setState({
      status: 'idle',
      camera: { ...DEFAULT_CAMERA_STATE },
      stats: null,
      lastFrame: null,
      splatCount: 0,
      isLoaded: false,
      error: null,
      adapterInfo: null,
    });
  }, [stopPolling, stopCameraLoop]);

  // ─── Effect: auto-initialize and auto-load ─────────────────────────

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (cancelled || isDisposedRef.current) return;

      const success = await initializeRenderer();
      if (!success || cancelled) return;

      if (resolvedConfig.autoLoadUrl) {
        await loadPLY(resolvedConfig.autoLoadUrl);
      }
    };

    // Wait for canvas to be available
    if (canvasRef.current) {
      init();
    }

    return () => {
      cancelled = true;
      isDisposedRef.current = true;
      stopPolling();
      stopCameraLoop();
      controllerRef.current?.dispose();
      rendererRef.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Return ────────────────────────────────────────────────────────

  const actions: GaussianSplatViewerActions = {
    loadPLY,
    loadData,
    startRendering,
    stopRendering,
    togglePause,
    resetCamera,
    setCamera: setCameraAction,
    setRenderConfig,
    renderSingleFrame,
    dispose,
  };

  return [state, actions];
}
