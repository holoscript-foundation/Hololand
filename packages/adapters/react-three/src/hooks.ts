/**
 * @hololand/react-three - Hooks
 *
 * React hooks for interacting with Hololand worlds
 */

import { useEffect, useCallback, useState } from 'react';
import type { SpatialObject, SpatialObjectConfig } from '@hololand/world';
import { useHololandWorld } from './HololandContext';

/**
 * Hook to add an object programmatically
 *
 * @example
 * ```tsx
 * const addObject = useHololandObject();
 *
 * const handleClick = () => {
 *   const obj = addObject({
 *     type: 'sphere',
 *     position: { x: 0, y: 5, z: 0 },
 *     metadata: { radius: 1, color: 0xff0000 },
 *   });
 *   console.log('Added object:', obj.id);
 * };
 * ```
 */
export const useHololandObject = () => {
  const world = useHololandWorld();

  return useCallback(
    (config: Omit<SpatialObjectConfig, 'id'> & { id?: string }): SpatialObject => {
      const objectId = config.id || `object-${Math.random().toString(36).substring(2, 11)}`;
      return world.addObject({
        ...config,
        id: objectId,
      });
    },
    [world]
  );
};

/**
 * Hook to query nearby objects
 *
 * @example
 * ```tsx
 * const nearbyObjects = useNearbyObjects({ x: 0, y: 0, z: 0 }, 10);
 * console.log(`Found ${nearbyObjects.length} nearby objects`);
 * ```
 */
export const useNearbyObjects = (
  position: { x: number; y: number; z: number },
  radius: number
): SpatialObject[] => {
  const world = useHololandWorld();
  const [objects, setObjects] = useState<SpatialObject[]>([]);

  useEffect(() => {
    const updateNearby = () => {
      const nearby = world.queryNearby(position, radius);
      setObjects(nearby);
    };

    updateNearby();

    // Update every frame (could be optimized with a custom interval)
    const interval = setInterval(updateNearby, 100);

    return () => clearInterval(interval);
  }, [world, position.x, position.y, position.z, radius]);

  return objects;
};

/**
 * Hook to track a specific object
 *
 * @example
 * ```tsx
 * const ball = useTrackedObject('ball-1');
 * console.log('Ball position:', ball?.position);
 * ```
 */
export const useTrackedObject = (objectId: string): SpatialObject | null => {
  const world = useHololandWorld();
  const [object, setObject] = useState<SpatialObject | null>(null);

  useEffect(() => {
    const updateObject = () => {
      const obj = world.getObject(objectId);
      setObject(obj || null);
    };

    updateObject();

    const interval = setInterval(updateObject, 100);

    return () => clearInterval(interval);
  }, [world, objectId]);

  return object;
};

/**
 * Hook to listen to world events
 *
 * @example
 * ```tsx
 * useWorldEvent('object:added', (data) => {
 *   console.log('Object added:', data.object.id);
 * });
 * ```
 */
export const useWorldEvent = (event: string, handler: (data: any) => void) => {
  const world = useHololandWorld();

  useEffect(() => {
    // on() returns an unsubscribe function
    const unsubscribe = world.on(event, handler);

    return () => {
      unsubscribe();
    };
  }, [world, event, handler]);
};

/**
 * Hook for physics simulation control
 *
 * @example
 * ```tsx
 * const { isRunning, start, stop } = usePhysics();
 *
 * return (
 *   <button onClick={isRunning ? stop : start}>
 *     {isRunning ? 'Pause' : 'Play'}
 *   </button>
 * );
 * ```
 */
export const usePhysics = () => {
  const world = useHololandWorld();
  const [isRunning, setIsRunning] = useState(true);

  const start = useCallback(() => {
    world.start();
    setIsRunning(true);
  }, [world]);

  const stop = useCallback(() => {
    world.stop();
    setIsRunning(false);
  }, [world]);

  return { isRunning, start, stop };
};
