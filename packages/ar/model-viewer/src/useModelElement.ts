/**
 * useModelElement — React hook for managing the HTML <model> element JS API
 *
 * Provides a declarative interface over the imperative HTMLModelElement API,
 * managing play/pause state, animation selection, entity transforms, and
 * camera control. Handles the async lifecycle of model loading and error states.
 *
 * Usage:
 * ```tsx
 * function MyModelViewer() {
 *   const {
 *     ref,
 *     loadingState,
 *     isPlaying,
 *     play,
 *     pause,
 *     getEntityTransform,
 *     setEntityTransform,
 *   } = useModelElement({ src: 'scene.usdz' });
 *
 *   return <model ref={ref} src="scene.usdz" />;
 * }
 * ```
 *
 * @module model-viewer/useModelElement
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import type {
  HTMLModelElement,
  ModelLoadingState,
  ModelError,
  ModelAnimation,
  EntityTransform,
  ModelCamera,
  UseModelElementReturn,
} from './types';

/** Options for the useModelElement hook */
export interface UseModelElementOptions {
  /** URL of the USDZ model. When changed, triggers a reload. */
  src: string;

  /** Whether animations should autoplay. Default: false */
  autoplay?: boolean;

  /** Initial animation to play by name */
  initialAnimation?: string;

  /** Whether animations should loop. Default: false */
  loop?: boolean;

  /** Called when model finishes loading */
  onLoad?: () => void;

  /** Called when model loading fails */
  onError?: (error: ModelError) => void;

  /** Called when playback state changes */
  onPlaybackChange?: (state: 'playing' | 'paused' | 'stopped') => void;

  /** Called on timeupdate events */
  onTimeUpdate?: (currentTime: number) => void;

  /** Called when an entity transform changes */
  onEntityChange?: (entityName: string, transform: EntityTransform) => void;
}

/**
 * React hook for managing the HTML <model> element's JavaScript API.
 *
 * Returns a ref to attach to the <model> element along with state and
 * control functions for playback, entity transforms, and camera.
 */
export function useModelElement(options: UseModelElementOptions): UseModelElementReturn {
  const {
    src,
    autoplay = false,
    initialAnimation,
    loop = false,
    onLoad,
    onError,
    onPlaybackChange,
    onTimeUpdate,
    onEntityChange,
  } = options;

  const ref = useRef<HTMLModelElement | null>(null);
  const [loadingState, setLoadingState] = useState<ModelLoadingState>('idle');
  const [error, setError] = useState<ModelError | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [animations, setAnimations] = useState<ModelAnimation[]>([]);
  const [entityNames, setEntityNames] = useState<string[]>([]);

  // Store latest callbacks in refs to avoid re-attaching listeners on every render
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  const onPlaybackChangeRef = useRef(onPlaybackChange);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onEntityChangeRef = useRef(onEntityChange);

  useEffect(() => {
    onLoadRef.current = onLoad;
    onErrorRef.current = onError;
    onPlaybackChangeRef.current = onPlaybackChange;
    onTimeUpdateRef.current = onTimeUpdate;
    onEntityChangeRef.current = onEntityChange;
  });

  // ── Attach event listeners and handle model loading lifecycle ────────

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) {
      setLoadingState('idle');
      return;
    }

    setLoadingState('loading');
    setError(null);

    // Handle load
    const handleLoad = () => {
      setLoadingState('ready');
      setError(null);

      // Populate metadata from the loaded model
      if (el.animations) {
        setAnimations([...el.animations]);
      }
      if (el.entityNames) {
        setEntityNames([...el.entityNames]);
      }
      if (typeof el.duration === 'number') {
        setDuration(el.duration);
      }

      // Apply initial configuration
      if (loop) {
        el.loop = true;
      }
      if (initialAnimation && el.currentAnimation !== undefined) {
        el.currentAnimation = initialAnimation;
      }
      if (autoplay) {
        el.play();
      }

      onLoadRef.current?.();
    };

    // Handle error
    const handleError = (e: Event) => {
      const errorEvent = e as ErrorEvent;
      const modelError: ModelError = {
        message: errorEvent.message || `Failed to load model: ${src}`,
        originalEvent: errorEvent,
      };
      setLoadingState('error');
      setError(modelError);
      onErrorRef.current?.(modelError);
    };

    // Handle play
    const handlePlay = () => {
      setIsPlaying(true);
      onPlaybackChangeRef.current?.('playing');
    };

    // Handle pause
    const handlePause = () => {
      setIsPlaying(false);
      onPlaybackChangeRef.current?.('paused');
    };

    // Handle ended
    const handleEnded = () => {
      setIsPlaying(false);
      onPlaybackChangeRef.current?.('stopped');
    };

    // Handle timeupdate
    const handleTimeUpdate = () => {
      if (typeof el.currentTime === 'number') {
        setCurrentTime(el.currentTime);
        onTimeUpdateRef.current?.(el.currentTime);
      }
    };

    // Handle entity changes
    const handleEntityChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ entityName: string; transform: EntityTransform }>;
      if (customEvent.detail) {
        onEntityChangeRef.current?.(customEvent.detail.entityName, customEvent.detail.transform);
      }
    };

    // Attach listeners
    el.addEventListener('load', handleLoad);
    el.addEventListener('error', handleError);
    el.addEventListener('play', handlePlay);
    el.addEventListener('pause', handlePause);
    el.addEventListener('ended', handleEnded);
    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('entitychange', handleEntityChange);

    // If the model element has a `ready` promise, await it.
    // This handles the case where `src` was already set before the hook ran.
    if (el.ready) {
      el.ready.then(handleLoad).catch((err: Error) => {
        const modelError: ModelError = {
          message: err?.message || `Failed to load model: ${src}`,
        };
        setLoadingState('error');
        setError(modelError);
        onErrorRef.current?.(modelError);
      });
    }

    // Cleanup
    return () => {
      el.removeEventListener('load', handleLoad);
      el.removeEventListener('error', handleError);
      el.removeEventListener('play', handlePlay);
      el.removeEventListener('pause', handlePause);
      el.removeEventListener('ended', handleEnded);
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('entitychange', handleEntityChange);
    };
  }, [src, autoplay, initialAnimation, loop]);

  // ── Control Functions ─────────────────────────────────────────────────

  const play = useCallback(() => {
    ref.current?.play();
  }, []);

  const pause = useCallback(() => {
    ref.current?.pause();
  }, []);

  const togglePlayback = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      el.play();
    } else {
      el.pause();
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    const el = ref.current;
    if (el && typeof el.currentTime === 'number') {
      el.currentTime = Math.max(0, Math.min(time, el.duration || Infinity));
    }
  }, []);

  const setAnimation = useCallback((name: string) => {
    const el = ref.current;
    if (el && el.currentAnimation !== undefined) {
      el.currentAnimation = name;
    }
  }, []);

  const getEntityTransform = useCallback((entityName: string): EntityTransform | null => {
    const el = ref.current;
    if (!el || !el.getEntityTransform) return null;
    return el.getEntityTransform(entityName);
  }, []);

  const setEntityTransform = useCallback(
    (entityName: string, transform: Partial<EntityTransform>) => {
      const el = ref.current;
      if (!el || !el.setEntityTransform) return;
      el.setEntityTransform(entityName, transform);
    },
    [],
  );

  const getCamera = useCallback((): ModelCamera | null => {
    const el = ref.current;
    if (!el || !el.getCamera) return null;
    return el.getCamera();
  }, []);

  const setCamera = useCallback((camera: Partial<ModelCamera>) => {
    const el = ref.current;
    if (!el || !el.setCamera) return;
    el.setCamera(camera);
  }, []);

  const retry = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setLoadingState('loading');
    setError(null);
    // Force reload by resetting src
    const currentSrc = el.src;
    el.src = '';
    // Use microtask to ensure the attribute clear takes effect
    queueMicrotask(() => {
      el.src = currentSrc;
    });
  }, []);

  return {
    ref,
    loadingState,
    error,
    isPlaying,
    currentTime,
    duration,
    animations,
    entityNames,
    play,
    pause,
    togglePlayback,
    seekTo,
    setAnimation,
    getEntityTransform,
    setEntityTransform,
    getCamera,
    setCamera,
    retry,
  };
}
