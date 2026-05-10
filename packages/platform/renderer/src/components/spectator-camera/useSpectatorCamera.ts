/**
 * useSpectatorCamera
 *
 * React hook for managing the spectator camera system.
 * Provides state management, camera control, scene capture,
 * and capture history for the non-XR spectator camera.
 *
 * USAGE:
 * ```tsx
 * function SpectatorView() {
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *   const { state, actions } = useSpectatorCamera({
 *     previewFPS: 30,
 *     maxHistory: 20,
 *   });
 *
 *   return (
 *     <div>
 *       <canvas ref={canvasRef} />
 *       <button onClick={() => actions.capture(canvasRef.current!)}>
 *         Capture
 *       </button>
 *       <p>Mode: {state.camera.mode}</p>
 *       <p>Captures: {state.history.length}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @module spectator-camera/useSpectatorCamera
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SpectatorCameraController } from './SpectatorCameraController';
import { SpectatorCaptureEngine } from './SpectatorCaptureEngine';

import type {
  UseSpectatorCameraConfig,
  SpectatorCameraHookState,
  SpectatorCameraHookActions,
  SpectatorCameraState,
  SpectatorCaptureConfig,
  SpectatorStatus,
  SpectatorPerformanceMetrics,
  CinematicPlaybackState,
  CaptureHistoryEntry,
  CaptureResult,
  SpectatorCameraMode,
  CinematicWaypoint,
} from './types';

import {
  DEFAULT_SPECTATOR_CAMERA_STATE,
  DEFAULT_CAPTURE_CONFIG,
  DEFAULT_PLAYBACK_STATE,
} from './types';

// =============================================================================
// DEFAULT HOOK CONFIG
// =============================================================================

const DEFAULT_HOOK_CONFIG: Required<UseSpectatorCameraConfig> = {
  initialCamera: {},
  captureConfig: {},
  orbitConfig: {},
  flyConfig: {},
  cinematicConfig: {},
  maxHistory: 20,
  previewFPS: 30,
};

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

/**
 * React hook for managing the spectator camera system.
 *
 * @param config Hook configuration
 * @returns State and actions for controlling the spectator camera
 */
export function useSpectatorCamera(config?: UseSpectatorCameraConfig): {
  state: SpectatorCameraHookState;
  actions: SpectatorCameraHookActions;
} {
  const mergedConfig = { ...DEFAULT_HOOK_CONFIG, ...config };

  // Refs for mutable instances
  const controllerRef = useRef<SpectatorCameraController | null>(null);
  const captureEngineRef = useRef<SpectatorCaptureEngine | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const frameTimesRef = useRef<number[]>([]);

  // State
  const [status, setStatus] = useState<SpectatorStatus>('inactive');
  const [camera, setCamera] = useState<SpectatorCameraState>({
    ...DEFAULT_SPECTATOR_CAMERA_STATE,
    ...mergedConfig.initialCamera,
  });
  const [captureConfig, setCaptureConfigState] = useState<SpectatorCaptureConfig>({
    ...DEFAULT_CAPTURE_CONFIG,
    ...mergedConfig.captureConfig,
  });
  const [playback, setPlayback] = useState<CinematicPlaybackState>(DEFAULT_PLAYBACK_STATE);
  const [performanceMetrics, setPerformance] = useState<SpectatorPerformanceMetrics>({
    fps: 0,
    frameTimeMs: 0,
    renderWidth: 0,
    renderHeight: 0,
    withinBudget: true,
    captureCount: 0,
    historyMemoryBytes: 0,
  });
  const [history, setHistory] = useState<CaptureHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize controller and capture engine
  useEffect(() => {
    const controller = new SpectatorCameraController({
      initialCamera: mergedConfig.initialCamera,
      orbitConfig: mergedConfig.orbitConfig,
      flyConfig: mergedConfig.flyConfig,
      cinematicConfig: mergedConfig.cinematicConfig,
      onStateChange: (newState) => {
        setCamera(newState);
      },
    });

    const captureEngine = new SpectatorCaptureEngine(mergedConfig.captureConfig);

    controllerRef.current = controller;
    captureEngineRef.current = captureEngine;
    setStatus('ready');

    return () => {
      controller.dispose();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update loop for camera controller
  const startPreviewLoop = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;

    const targetFrameMs = 1000 / mergedConfig.previewFPS;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const deltaMs = now - lastTime;

      if (deltaMs >= targetFrameMs) {
        lastTime = now - (deltaMs % targetFrameMs);

        // Update controller
        const updatedCamera = controller.update(deltaMs);
        setCamera({ ...updatedCamera });

        // Update playback state for cinematic mode
        if (updatedCamera.mode === 'cinematic') {
          setPlayback({ ...controller.getPlaybackState() });
        }

        // Track frame performance
        frameTimesRef.current.push(deltaMs);
        if (frameTimesRef.current.length > 60) {
          frameTimesRef.current.shift();
        }

        // Update performance metrics every 30 frames
        if (frameTimesRef.current.length % 30 === 0) {
          const avgFrameMs =
            frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
          setPerformance((prev) => ({
            ...prev,
            fps: 1000 / avgFrameMs,
            frameTimeMs: avgFrameMs,
            withinBudget: avgFrameMs <= targetFrameMs * 1.2,
          }));
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    setStatus('previewing');
  }, [mergedConfig.previewFPS]);

  // Auto-start preview loop when status becomes ready
  useEffect(() => {
    if (status === 'ready') {
      startPreviewLoop();
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [status, startPreviewLoop]);

  // ===========================================================================
  // ACTIONS
  // ===========================================================================

  const setMode = useCallback((mode: SpectatorCameraMode) => {
    controllerRef.current?.setMode(mode);
    setCamera((prev) => ({ ...prev, mode }));
  }, []);

  const setCameraAction = useCallback(
    (position: [number, number, number], target: [number, number, number]) => {
      controllerRef.current?.setCamera(position, target);
    },
    []
  );

  const setFovY = useCallback((fov: number) => {
    controllerRef.current?.setFovY(fov);
  }, []);

  const resetCamera = useCallback(() => {
    controllerRef.current?.reset();
  }, []);

  const setCaptureConfig = useCallback((config: Partial<SpectatorCaptureConfig>) => {
    setCaptureConfigState((prev) => ({ ...prev, ...config }));
    captureEngineRef.current?.setConfig(config);
  }, []);

  const capture = useCallback(
    async (canvas: HTMLCanvasElement): Promise<CaptureResult> => {
      const engine = captureEngineRef.current;
      const controller = controllerRef.current;
      if (!engine || !controller) {
        throw new Error('Spectator camera not initialized');
      }

      setStatus('capturing');
      setError(null);

      try {
        const currentCamera = controller.getCamera();
        const result = await engine.capture(canvas, { ...currentCamera });

        // Add to history
        const entry = engine.createHistoryEntry(result);
        setHistory((prev) => {
          const updated = [entry, ...prev];
          if (updated.length > mergedConfig.maxHistory) {
            updated.pop();
          }
          return updated;
        });

        // Update performance
        setPerformance((prev) => ({
          ...prev,
          captureCount: engine.getCaptureCount(),
          historyMemoryBytes: engine.estimateHistoryMemory(history),
        }));

        setStatus('previewing');
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown capture error';
        setError(errorMsg);
        setStatus('error');
        throw err;
      }
    },
    [history, mergedConfig.maxHistory]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    setPerformance((prev) => ({
      ...prev,
      historyMemoryBytes: 0,
    }));
  }, []);

  const removeCapture = useCallback((id: string) => {
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const downloadCapture = useCallback((entry: CaptureHistoryEntry) => {
    captureEngineRef.current?.downloadCapture(entry);
  }, []);

  const playCinematic = useCallback(() => {
    controllerRef.current?.playCinematic();
    setStatus('playing');
  }, []);

  const pauseCinematic = useCallback(() => {
    controllerRef.current?.pauseCinematic();
    setStatus('paused');
  }, []);

  const stopCinematic = useCallback(() => {
    controllerRef.current?.stopCinematic();
    setStatus('previewing');
    setPlayback(DEFAULT_PLAYBACK_STATE);
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    controllerRef.current?.setPlaybackSpeed(speed);
  }, []);

  const addWaypoint = useCallback((waypoint: CinematicWaypoint) => {
    controllerRef.current?.addWaypoint(waypoint);
  }, []);

  const removeWaypoint = useCallback((index: number) => {
    controllerRef.current?.removeWaypoint(index);
  }, []);

  const setAutoRotate = useCallback((speed: number) => {
    controllerRef.current?.setAutoRotateSpeed(speed);
  }, []);

  // ===========================================================================
  // RETURN
  // ===========================================================================

  const state: SpectatorCameraHookState = {
    status,
    camera,
    captureConfig,
    playback,
    performance: performanceMetrics,
    history,
    error,
  };

  const actions: SpectatorCameraHookActions = {
    setMode,
    setCamera: setCameraAction,
    setFovY,
    resetCamera,
    setCaptureConfig,
    capture,
    clearHistory,
    removeCapture,
    downloadCapture,
    playCinematic,
    pauseCinematic,
    stopCinematic,
    setPlaybackSpeed,
    addWaypoint,
    removeWaypoint,
    setAutoRotate,
  };

  return { state, actions };
}
