/**
 * MobileWorldViewer
 *
 * Touch-optimized 3D viewer wrapper for mobile viewports.
 *
 * Gesture support:
 *   - Pinch zoom     (two-finger distance delta)
 *   - Swipe rotate   (single finger: horizontal = Y, vertical = X)
 *   - Tap select     (single tap on objects, double tap to focus)
 *   - Pan            (two-finger drag for camera translation)
 *   - Gesture state machine prevents conflicting gestures
 *
 * Performance:
 *   - Updates throttled at 60 fps via requestAnimationFrame
 *   - Passive touch event listeners where possible
 *
 * @module components/mobile/MobileWorldViewer
 */

'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Camera transform state exposed to the parent. */
export interface CameraState {
  rotationX: number;
  rotationY: number;
  zoom: number;
  panX: number;
  panY: number;
}

/** Information about a tapped object. */
export interface TapEvent {
  /** Screen coordinates of the tap. */
  x: number;
  y: number;
  /** Whether this was a double-tap. */
  isDoubleTap: boolean;
}

export interface MobileWorldViewerProps {
  /** Callback when the camera transform changes via gestures. */
  onCameraChange?: (state: CameraState) => void;
  /** Callback when the user taps or double-taps the viewer. */
  onTap?: (event: TapEvent) => void;
  /**
   * The 3D canvas or scene children to render inside the viewer.
   * Typically a `<Canvas>` from `@react-three/fiber`.
   */
  children?: React.ReactNode;
  /** Optional additional class names on the wrapper div. */
  className?: string;
  /** Rotation sensitivity multiplier (default 0.4). */
  rotateSensitivity?: number;
  /** Zoom sensitivity multiplier (default 0.01). */
  zoomSensitivity?: number;
  /** Pan sensitivity multiplier (default 0.5). */
  panSensitivity?: number;
  /** Minimum zoom level (default 0.25). */
  minZoom?: number;
  /** Maximum zoom level (default 4). */
  maxZoom?: number;
}

// ---------------------------------------------------------------------------
// Gesture state machine
// ---------------------------------------------------------------------------

/**
 * Possible gesture states. Once a gesture is "locked" into a mode the
 * state machine will not switch to another mode until all touches are
 * released.
 */
type GestureMode = 'idle' | 'rotate' | 'pinch' | 'pan';

/** Calculate Euclidean distance between two touches. */
function touchDistance(a: Touch, b: Touch): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Calculate the midpoint of two touches. */
function touchMidpoint(a: Touch, b: Touch): { x: number; y: number } {
  return {
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2,
  };
}

// ---------------------------------------------------------------------------
// Double-tap detection constants
// ---------------------------------------------------------------------------

const DOUBLE_TAP_DELAY_MS = 300;
const TAP_MOVE_TOLERANCE = 10;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MobileWorldViewer({
  onCameraChange,
  onTap,
  children,
  className = '',
  rotateSensitivity = 0.4,
  zoomSensitivity = 0.01,
  panSensitivity = 0.5,
  minZoom = 0.25,
  maxZoom = 4,
}: MobileWorldViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Camera state stored in a ref so gesture handlers never cause re-renders.
  const camera = useRef<CameraState>({
    rotationX: 0,
    rotationY: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  // Gesture state machine ref.
  const gestureMode = useRef<GestureMode>('idle');

  // Previous values for delta calculation.
  const prevTouch = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const prevDistance = useRef<number>(0);
  const prevMidpoint = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tap detection.
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapTime = useRef<number>(0);

  // rAF throttle guard.
  const rafPending = useRef(false);

  // -----------------------------------------------------------------------
  // Emit camera change (throttled to one call per animation frame)
  // -----------------------------------------------------------------------
  const emitChange = useCallback(() => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      rafPending.current = false;
      onCameraChange?.({ ...camera.current });
    });
  }, [onCameraChange]);

  // -----------------------------------------------------------------------
  // Touch handlers
  // -----------------------------------------------------------------------

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touches = e.touches;

      if (touches.length === 1) {
        // Single finger -> potential rotate or tap.
        prevTouch.current = { x: touches[0].clientX, y: touches[0].clientY };
        touchStartPos.current = { x: touches[0].clientX, y: touches[0].clientY };
        // Don't lock yet; wait for move.
        if (gestureMode.current === 'idle') {
          gestureMode.current = 'rotate';
        }
      } else if (touches.length === 2) {
        // Two fingers -> decide between pinch or pan on first move.
        prevDistance.current = touchDistance(touches[0], touches[1]);
        prevMidpoint.current = touchMidpoint(touches[0], touches[1]);
        // Default to pinch; pan will be distinguished by midpoint movement.
        gestureMode.current = 'pinch';
      }
    },
    [],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const touches = e.touches;

      if (touches.length === 1 && gestureMode.current === 'rotate') {
        const dx = touches[0].clientX - prevTouch.current.x;
        const dy = touches[0].clientY - prevTouch.current.y;

        camera.current.rotationY += dx * rotateSensitivity;
        camera.current.rotationX += dy * rotateSensitivity;

        // Clamp vertical rotation to avoid gimbal lock.
        camera.current.rotationX = Math.max(
          -90,
          Math.min(90, camera.current.rotationX),
        );

        prevTouch.current = { x: touches[0].clientX, y: touches[0].clientY };
        emitChange();
      } else if (touches.length === 2) {
        const newDist = touchDistance(touches[0], touches[1]);
        const newMid = touchMidpoint(touches[0], touches[1]);

        // Decide gesture mode based on dominant motion.
        const distDelta = Math.abs(newDist - prevDistance.current);
        const midDelta = Math.sqrt(
          (newMid.x - prevMidpoint.current.x) ** 2 +
            (newMid.y - prevMidpoint.current.y) ** 2,
        );

        if (gestureMode.current === 'pinch' && midDelta > distDelta * 1.5) {
          // Midpoint moved significantly more than pinch distance -> pan.
          gestureMode.current = 'pan';
        }

        if (gestureMode.current === 'pinch') {
          // Pinch zoom.
          const delta = (newDist - prevDistance.current) * zoomSensitivity;
          camera.current.zoom = Math.max(
            minZoom,
            Math.min(maxZoom, camera.current.zoom + delta),
          );
        } else if (gestureMode.current === 'pan') {
          // Two-finger pan.
          camera.current.panX += (newMid.x - prevMidpoint.current.x) * panSensitivity;
          camera.current.panY += (newMid.y - prevMidpoint.current.y) * panSensitivity;
        }

        prevDistance.current = newDist;
        prevMidpoint.current = newMid;
        emitChange();
      }
    },
    [rotateSensitivity, zoomSensitivity, panSensitivity, minZoom, maxZoom, emitChange],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      // Detect tap: no significant movement and single touch.
      if (e.touches.length === 0 && gestureMode.current === 'rotate') {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const dx = endX - touchStartPos.current.x;
        const dy = endY - touchStartPos.current.y;

        if (Math.abs(dx) < TAP_MOVE_TOLERANCE && Math.abs(dy) < TAP_MOVE_TOLERANCE) {
          const now = Date.now();
          const isDoubleTap = now - lastTapTime.current < DOUBLE_TAP_DELAY_MS;
          lastTapTime.current = now;

          onTap?.({ x: endX, y: endY, isDoubleTap });
        }
      }

      // Reset gesture mode when all fingers lifted.
      if (e.touches.length === 0) {
        gestureMode.current = 'idle';
      } else if (e.touches.length === 1) {
        // Dropped from 2 fingers to 1 -> switch to rotate.
        gestureMode.current = 'rotate';
        prevTouch.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    },
    [onTap],
  );

  // -----------------------------------------------------------------------
  // Attach passive listeners for performance
  // -----------------------------------------------------------------------

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // touchstart and touchend need { passive: false } to allow
    // preventDefault in subclasses. touchmove is passive for scroll perf.
    const opts: AddEventListenerOptions = { passive: true };
    const nonPassive: AddEventListenerOptions = { passive: false };

    // Prevent default browser gestures (pull-to-refresh, back-swipe) on
    // the viewer surface.
    const preventDefault = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    el.addEventListener('touchstart', handleTouchStart, opts);
    el.addEventListener('touchmove', handleTouchMove, opts);
    el.addEventListener('touchend', handleTouchEnd, opts);
    el.addEventListener('touchmove', preventDefault, nonPassive);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchmove', preventDefault);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full touch-none select-none ${className}`}
      style={{ touchAction: 'none' }}
      role="application"
      aria-label="3D world viewer. Use one finger to rotate, two fingers to zoom or pan, tap to select."
    >
      {children}

      {/* Gesture hint overlay (shown briefly on first visit) */}
      <GestureHint />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gesture hint overlay (fades out after 3 seconds)
// ---------------------------------------------------------------------------

function GestureHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show the hint only once per session.
    const key = 'hololand:gesture-hint-shown';
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return;

    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(key, '1');
      } catch {
        // Ignore storage errors.
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none
                 bg-black/40 text-white text-sm transition-opacity duration-500"
      aria-hidden="true"
    >
      <div className="text-center space-y-2 px-6">
        <p className="font-medium">Touch Controls</p>
        <p className="text-xs text-gray-300">
          1 finger: rotate &bull; 2 fingers: pinch zoom / pan &bull; Tap: select
        </p>
      </div>
    </div>
  );
}
