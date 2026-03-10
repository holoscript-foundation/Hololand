/**
 * useCinematicCamera
 *
 * React hook for managing the cinematic camera system.
 * Provides state management, keyframe editing, playback control,
 * preset application, undo/redo, and video export orchestration.
 *
 * USAGE:
 * ```tsx
 * function CinematicEditor() {
 *   const { state, actions } = useCinematicCamera({
 *     previewFPS: 30,
 *     maxUndoHistory: 50,
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={actions.play}>Play</button>
 *       <button onClick={() => actions.captureKeyframe()}>
 *         Add Keyframe
 *       </button>
 *       <p>Keyframes: {state.sequence.keyframes.length}</p>
 *       <p>Time: {state.playback.currentTime.toFixed(1)}s</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @module cinematic-camera/useCinematicCamera
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { CinematicPathEngine } from './CinematicPathEngine';
import { RemotionExportBridge } from './RemotionExportBridge';
import { generatePresetKeyframes } from './CameraPresetLibrary';

import type {
  UseCinematicCameraConfig,
  CinematicCameraHookState,
  CinematicCameraHookActions,
  CinematicSequence,
  CinematicKeyframe,
  CinematicPlaybackState,
  EvaluatedCameraState,
  TimelineSelection,
  ExportProgress,
  RemotionExportConfig,
  RemotionRenderRequest,
  RemotionRenderResult,
  CameraPresetConfig,
} from './types';

import {
  DEFAULT_CINEMATIC_PLAYBACK,
  DEFAULT_EVALUATED_CAMERA,
  DEFAULT_TIMELINE_SELECTION,
  DEFAULT_EXPORT_PROGRESS,
  DEFAULT_REMOTION_EXPORT,
  createDefaultKeyframe,
  createDefaultSequence,
  generateKeyframeId,
} from './types';

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useCinematicCamera(
  config?: UseCinematicCameraConfig,
): { state: CinematicCameraHookState; actions: CinematicCameraHookActions } {
  const previewFPS = config?.previewFPS ?? 30;
  const maxUndoHistory = config?.maxUndoHistory ?? 50;

  // Refs for mutable instances
  const engineRef = useRef<CinematicPathEngine | null>(null);
  const exportBridgeRef = useRef<RemotionExportBridge | null>(null);
  const animFrameRef = useRef<number>(0);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackOffsetRef = useRef<number>(0);

  // Undo history
  const undoStackRef = useRef<CinematicSequence[]>([]);
  const redoStackRef = useRef<CinematicSequence[]>([]);

  // State
  const [sequence, setSequence] = useState<CinematicSequence>(() =>
    createDefaultSequence(config?.initialSequence),
  );
  const [playback, setPlayback] = useState<CinematicPlaybackState>(DEFAULT_CINEMATIC_PLAYBACK);
  const [camera, setCamera] = useState<EvaluatedCameraState>(DEFAULT_EVALUATED_CAMERA);
  const [selection, setSelection] = useState<TimelineSelection>(DEFAULT_TIMELINE_SELECTION);
  const [exportProgress, setExportProgress] = useState<ExportProgress>(DEFAULT_EXPORT_PROGRESS);
  const [exportConfig, setExportConfigState] = useState<RemotionExportConfig>({
    ...DEFAULT_REMOTION_EXPORT,
    ...config?.exportConfig,
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize engine and export bridge
  useEffect(() => {
    const engine = new CinematicPathEngine(sequence);
    const bridge = new RemotionExportBridge(engine, exportConfig);

    bridge.onProgress((progress) => {
      setExportProgress({ ...progress });
    });

    engineRef.current = engine;
    exportBridgeRef.current = bridge;

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync engine when sequence changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSequence(sequence);
    }
  }, [sequence]);

  // ===========================================================================
  // UNDO / REDO
  // ===========================================================================

  const pushUndoState = useCallback((seq: CinematicSequence) => {
    undoStackRef.current.push(JSON.parse(JSON.stringify(seq)));
    if (undoStackRef.current.length > maxUndoHistory) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = []; // Clear redo on new action
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(false);
  }, [maxUndoHistory]);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(JSON.parse(JSON.stringify(sequence)));
    setSequence(prev);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
  }, [sequence]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(JSON.parse(JSON.stringify(sequence)));
    setSequence(next);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
  }, [sequence]);

  // ===========================================================================
  // PLAYBACK LOOP
  // ===========================================================================

  const stopPlaybackLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
  }, []);

  const startPlaybackLoop = useCallback(() => {
    stopPlaybackLoop();

    const engine = engineRef.current;
    if (!engine) return;

    const duration = engine.getDuration();
    if (duration <= 0) return;

    const targetFrameMs = 1000 / previewFPS;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const deltaMs = now - lastTime;

      if (deltaMs >= targetFrameMs) {
        lastTime = now - (deltaMs % targetFrameMs);

        const elapsed = (now - playbackStartTimeRef.current) / 1000 * sequence.playbackSpeed;
        const currentTime = playbackOffsetRef.current + elapsed;

        let adjustedTime = currentTime;
        let loopCount = 0;

        if (sequence.loop && duration > 0) {
          loopCount = Math.floor(currentTime / duration);
          adjustedTime = currentTime - loopCount * duration;
        } else if (currentTime >= duration) {
          // Reached end
          adjustedTime = duration;
          setPlayback((prev) => ({
            ...prev,
            isPlaying: false,
            isPaused: false,
            currentTime: duration,
            progress: 1,
          }));
          setCamera(engine.evaluate(duration));
          stopPlaybackLoop();
          return;
        }

        const evaluated = engine.evaluate(adjustedTime);
        setCamera(evaluated);

        setPlayback((prev) => ({
          ...prev,
          currentTime: adjustedTime,
          progress: duration > 0 ? adjustedTime / duration : 0,
          loopCount,
          frameCount: prev.frameCount + 1,
        }));
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  }, [previewFPS, sequence.playbackSpeed, sequence.loop, stopPlaybackLoop]);

  // ===========================================================================
  // PLAYBACK ACTIONS
  // ===========================================================================

  const play = useCallback(() => {
    if (playback.isPaused) {
      // Resume from pause
      playbackStartTimeRef.current = performance.now();
      playbackOffsetRef.current = playback.currentTime;
    } else {
      // Start from beginning or current scrub position
      playbackStartTimeRef.current = performance.now();
      playbackOffsetRef.current = playback.currentTime;
    }

    setPlayback((prev) => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
    }));

    startPlaybackLoop();
  }, [playback.isPaused, playback.currentTime, startPlaybackLoop]);

  const pause = useCallback(() => {
    stopPlaybackLoop();
    setPlayback((prev) => ({
      ...prev,
      isPlaying: false,
      isPaused: true,
    }));
  }, [stopPlaybackLoop]);

  const stop = useCallback(() => {
    stopPlaybackLoop();
    playbackOffsetRef.current = 0;

    setPlayback({
      ...DEFAULT_CINEMATIC_PLAYBACK,
    });

    const engine = engineRef.current;
    if (engine) {
      setCamera(engine.evaluate(0));
    }
  }, [stopPlaybackLoop]);

  const scrubTo = useCallback((time: number) => {
    const engine = engineRef.current;
    if (!engine) return;

    const duration = engine.getDuration();
    const clampedTime = Math.max(0, Math.min(duration, time));

    playbackOffsetRef.current = clampedTime;

    setPlayback((prev) => ({
      ...prev,
      currentTime: clampedTime,
      progress: duration > 0 ? clampedTime / duration : 0,
    }));

    setCamera(engine.evaluate(clampedTime));
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    const clampedSpeed = Math.max(0.1, Math.min(5.0, speed));
    setSequence((prev) => ({
      ...prev,
      playbackSpeed: clampedSpeed,
      modifiedAt: Date.now(),
    }));
  }, []);

  const toggleLoop = useCallback(() => {
    setSequence((prev) => ({
      ...prev,
      loop: !prev.loop,
      modifiedAt: Date.now(),
    }));
  }, []);

  // ===========================================================================
  // KEYFRAME ACTIONS
  // ===========================================================================

  const addKeyframe = useCallback((partial: Partial<CinematicKeyframe>): string => {
    pushUndoState(sequence);

    const kf = createDefaultKeyframe(partial.time ?? playback.currentTime, partial);

    setSequence((prev) => {
      const keyframes = [...prev.keyframes, kf].sort((a, b) => a.time - b.time);
      const duration = keyframes.length > 0 ? keyframes[keyframes.length - 1].time : 0;
      return {
        ...prev,
        keyframes,
        duration,
        modifiedAt: Date.now(),
      };
    });

    return kf.id;
  }, [sequence, playback.currentTime, pushUndoState]);

  const updateKeyframe = useCallback((id: string, updates: Partial<CinematicKeyframe>) => {
    pushUndoState(sequence);

    setSequence((prev) => {
      const keyframes = prev.keyframes.map((kf) =>
        kf.id === id ? { ...kf, ...updates } : kf,
      ).sort((a, b) => a.time - b.time);

      const duration = keyframes.length > 0 ? keyframes[keyframes.length - 1].time : 0;

      return {
        ...prev,
        keyframes,
        duration,
        modifiedAt: Date.now(),
      };
    });
  }, [sequence, pushUndoState]);

  const removeKeyframe = useCallback((id: string) => {
    pushUndoState(sequence);

    setSequence((prev) => {
      const keyframes = prev.keyframes.filter((kf) => kf.id !== id);
      const duration = keyframes.length > 0 ? keyframes[keyframes.length - 1].time : 0;

      return {
        ...prev,
        keyframes,
        duration,
        modifiedAt: Date.now(),
      };
    });

    // Remove from selection
    setSelection((prev) => ({
      ...prev,
      selectedKeyframes: prev.selectedKeyframes.filter((sid) => sid !== id),
    }));
  }, [sequence, pushUndoState]);

  const duplicateKeyframe = useCallback((id: string): string => {
    const kf = sequence.keyframes.find((k) => k.id === id);
    if (!kf) return '';

    const newId = generateKeyframeId();
    const duplicated: CinematicKeyframe = {
      ...JSON.parse(JSON.stringify(kf)),
      id: newId,
      time: kf.time + 1, // Offset by 1 second
      label: kf.label ? `${kf.label} (copy)` : undefined,
    };

    pushUndoState(sequence);

    setSequence((prev) => {
      const keyframes = [...prev.keyframes, duplicated].sort((a, b) => a.time - b.time);
      const duration = keyframes[keyframes.length - 1].time;
      return {
        ...prev,
        keyframes,
        duration,
        modifiedAt: Date.now(),
      };
    });

    return newId;
  }, [sequence, pushUndoState]);

  const captureKeyframe = useCallback((): string => {
    // Capture current camera state as a new keyframe at the current playhead
    return addKeyframe({
      time: playback.currentTime,
      position: [...camera.position],
      target: [...camera.target],
      up: [...camera.up],
      fovY: camera.fovY,
      roll: camera.roll,
      dofFocusDistance: camera.dofFocusDistance,
      dofAperture: camera.dofAperture,
      label: `Keyframe at ${playback.currentTime.toFixed(1)}s`,
    });
  }, [addKeyframe, playback.currentTime, camera]);

  // ===========================================================================
  // SELECTION ACTIONS
  // ===========================================================================

  const selectKeyframe = useCallback((id: string, multi?: boolean) => {
    setSelection((prev) => {
      if (multi) {
        const isSelected = prev.selectedKeyframes.includes(id);
        return {
          ...prev,
          selectedKeyframes: isSelected
            ? prev.selectedKeyframes.filter((sid) => sid !== id)
            : [...prev.selectedKeyframes, id],
          isMultiSelect: true,
        };
      }
      return {
        ...prev,
        selectedKeyframes: [id],
        isMultiSelect: false,
      };
    });
  }, []);

  const deselectAll = useCallback(() => {
    setSelection(DEFAULT_TIMELINE_SELECTION);
  }, []);

  // ===========================================================================
  // PRESET ACTIONS
  // ===========================================================================

  const applyPreset = useCallback((presetConfig: CameraPresetConfig) => {
    pushUndoState(sequence);

    const presetKeyframes = generatePresetKeyframes(presetConfig);

    setSequence((prev) => {
      // Append preset keyframes, offsetting time by current sequence duration
      const offset = prev.duration;
      const offsetKeyframes = presetKeyframes.map((kf) => ({
        ...kf,
        id: generateKeyframeId(),
        time: kf.time + offset,
      }));

      const keyframes = [...prev.keyframes, ...offsetKeyframes].sort((a, b) => a.time - b.time);
      const duration = keyframes.length > 0 ? keyframes[keyframes.length - 1].time : 0;

      return {
        ...prev,
        keyframes,
        duration,
        modifiedAt: Date.now(),
      };
    });
  }, [sequence, pushUndoState]);

  // ===========================================================================
  // SEQUENCE MANAGEMENT
  // ===========================================================================

  const setSequenceName = useCallback((name: string) => {
    setSequence((prev) => ({ ...prev, name, modifiedAt: Date.now() }));
  }, []);

  const clearSequence = useCallback(() => {
    pushUndoState(sequence);
    stop();
    setSequence(createDefaultSequence({ name: sequence.name }));
  }, [sequence, pushUndoState, stop]);

  const importSequence = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as CinematicSequence;
      if (!parsed.keyframes || !Array.isArray(parsed.keyframes)) {
        throw new Error('Invalid sequence: missing keyframes array');
      }
      pushUndoState(sequence);
      stop();
      setSequence({
        ...createDefaultSequence(),
        ...parsed,
        modifiedAt: Date.now(),
      });
      setError(null);
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : 'Invalid JSON'}`);
    }
  }, [sequence, pushUndoState, stop]);

  const exportSequenceJson = useCallback((): string => {
    return JSON.stringify(sequence, null, 2);
  }, [sequence]);

  // ===========================================================================
  // EXPORT ACTIONS
  // ===========================================================================

  const setExportConfig = useCallback((config: Partial<RemotionExportConfig>) => {
    setExportConfigState((prev) => {
      const updated = { ...prev, ...config };
      exportBridgeRef.current?.setConfig(updated);
      return updated;
    });
  }, []);

  const startExport = useCallback(async (
    renderFn?: (config: RemotionRenderRequest) => Promise<RemotionRenderResult>,
  ) => {
    const bridge = exportBridgeRef.current;
    if (!bridge) {
      setError('Export bridge not initialized');
      return;
    }

    if (sequence.keyframes.length < 2) {
      setError('Need at least 2 keyframes to export');
      return;
    }

    setError(null);

    if (renderFn) {
      // Use Remotion SSR
      const result = await bridge.exportWithRemotion(renderFn);
      if (!result.success) {
        setError(result.error ?? 'Export failed');
      }
    } else {
      // Fallback: generate composition code for manual export
      setError('No render function provided. Use the generated Remotion composition code for manual export.');
    }
  }, [sequence.keyframes.length]);

  const cancelExport = useCallback(() => {
    exportBridgeRef.current?.cancel();
  }, []);

  // ===========================================================================
  // RETURN
  // ===========================================================================

  const state: CinematicCameraHookState = {
    sequence,
    playback,
    camera,
    selection,
    exportProgress,
    exportConfig,
    canUndo,
    canRedo,
    error,
  };

  const actions: CinematicCameraHookActions = {
    // Playback
    play,
    pause,
    stop,
    scrubTo,
    setPlaybackSpeed,
    toggleLoop,

    // Keyframes
    addKeyframe,
    updateKeyframe,
    removeKeyframe,
    duplicateKeyframe,
    captureKeyframe,

    // Selection
    selectKeyframe,
    deselectAll,

    // Presets
    applyPreset,

    // Sequence management
    setSequenceName,
    clearSequence,
    importSequence,
    exportSequenceJson,

    // Export
    setExportConfig,
    startExport,
    cancelExport,

    // Undo/Redo
    undo,
    redo,
  };

  return { state, actions };
}
