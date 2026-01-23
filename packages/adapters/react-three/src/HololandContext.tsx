/**
 * @hololand/react-three - Context
 *
 * React context for sharing world and renderer instances
 */

import { createContext, useContext } from 'react';
import type { HololandWorld } from '@hololand/world';
import type { HololandRenderer } from '@hololand/renderer';

export interface HololandContextValue {
  world: HololandWorld | null;
  renderer: HololandRenderer | null;
  isReady: boolean;
}

export const HololandContext = createContext<HololandContextValue>({
  world: null,
  renderer: null,
  isReady: false,
});

/**
 * Hook to access Hololand world and renderer
 *
 * @example
 * ```tsx
 * const { world, renderer, isReady } = useHololand();
 *
 * if (isReady) {
 *   world.addObject({ ... });
 * }
 * ```
 */
export const useHololand = () => {
  const context = useContext(HololandContext);
  if (!context) {
    throw new Error('useHololand must be used within a HololandCanvas');
  }
  return context;
};

/**
 * Hook to access just the world instance
 */
export const useHololandWorld = () => {
  const { world, isReady } = useHololand();
  if (!isReady || !world) {
    throw new Error('World not ready yet');
  }
  return world;
};

/**
 * Hook to access just the renderer instance
 */
export const useHololandRenderer = () => {
  const { renderer, isReady } = useHololand();
  if (!isReady || !renderer) {
    throw new Error('Renderer not ready yet');
  }
  return renderer;
};
