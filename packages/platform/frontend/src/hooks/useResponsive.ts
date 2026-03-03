/**
 * Responsive Utility Hooks
 *
 * A collection of React hooks for responsive design that leverage
 * ResizeObserver and matchMedia with debounced updates.
 *
 * Hooks:
 *   - useIsMobile()            - viewport < 768px
 *   - useIsTablet()            - viewport 768-1024px
 *   - useViewportSize()        - { width, height }
 *   - useOrientation()         - 'portrait' | 'landscape'
 *   - usePrefersReducedMotion() - accessibility preference
 *
 * @module hooks/useResponsive
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const DEBOUNCE_MS = 150;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Generic debounce that returns the latest value after `delay` ms of
 * inactivity. Uses `requestAnimationFrame` fallback when available for
 * smoother visual updates.
 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Subscribe to a `matchMedia` query and return whether it matches.
 * Falls back gracefully on SSR where `window` is unavailable.
 */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Modern browsers support addEventListener; legacy uses addListener.
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
    } else {
      mql.addListener(handler);
    }

    // Sync on mount in case SSR value differs.
    setMatches(mql.matches);

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handler);
      } else {
        mql.removeListener(handler);
      }
    };
  }, [query]);

  return matches;
}

// ---------------------------------------------------------------------------
// Public hooks
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the viewport width is below 768px.
 *
 * ```tsx
 * const isMobile = useIsMobile();
 * return isMobile ? <MobileNav /> : <DesktopNav />;
 * ```
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}

/**
 * Returns `true` when the viewport width is between 768px and 1024px
 * (inclusive of 768, exclusive of 1024).
 */
export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`,
  );
}

/** Viewport size dimensions. */
export interface ViewportSize {
  width: number;
  height: number;
}

/**
 * Returns the current viewport `{ width, height }`.
 * Updates are debounced by 150 ms to avoid layout thrashing.
 */
export function useViewportSize(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>(() => {
    if (typeof window === 'undefined') return { width: 0, height: 0 };
    return { width: window.innerWidth, height: window.innerHeight };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const update = () => {
      // Use rAF so measurement happens right before paint.
      rafId = requestAnimationFrame(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });
      });
    };

    const debouncedUpdate = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(update, DEBOUNCE_MS);
    };

    // Try ResizeObserver on the documentElement for the most reliable signal.
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(debouncedUpdate);
      ro.observe(document.documentElement);
    } else {
      // Fallback for environments without ResizeObserver.
      window.addEventListener('resize', debouncedUpdate);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', debouncedUpdate);
    };
  }, []);

  return size;
}

/** Orientation type returned by `useOrientation`. */
export type Orientation = 'portrait' | 'landscape';

/**
 * Returns the current device orientation as `'portrait'` or `'landscape'`.
 * Uses the `(orientation: portrait)` media query so it works on both
 * mobile devices and resized desktop windows.
 */
export function useOrientation(): Orientation {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  return isPortrait ? 'portrait' : 'landscape';
}

/**
 * Returns `true` when the user has requested reduced motion via their
 * operating system accessibility settings (`prefers-reduced-motion: reduce`).
 *
 * Use this hook to disable or simplify animations for users who are
 * sensitive to motion.
 *
 * ```tsx
 * const reducedMotion = usePrefersReducedMotion();
 * const transition = reducedMotion ? 'none' : 'transform 300ms ease';
 * ```
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
