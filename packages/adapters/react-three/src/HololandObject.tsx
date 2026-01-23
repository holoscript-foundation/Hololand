/**
 * @hololand/react-three - HololandObject Component
 *
 * Declarative component for adding objects to the Hololand world
 */

import { useEffect, useRef } from 'react';
import type { SpatialObjectConfig } from '@hololand/world';
import { useHololandWorld } from './HololandContext';

export interface HololandObjectProps extends Omit<SpatialObjectConfig, 'id'> {
  id?: string;
  onAdded?: (objectId: string) => void;
  onRemoved?: (objectId: string) => void;
}

/**
 * HololandObject - Declarative object component
 *
 * @example
 * ```tsx
 * <HololandObject
 *   type="sphere"
 *   position={{ x: 0, y: 5, z: 0 }}
 *   metadata={{ radius: 1, color: 0xff0000 }}
 *   physics={{ enabled: true, mass: 1 }}
 * />
 * ```
 */
export const HololandObject: React.FC<HololandObjectProps> = ({
  id: propId,
  type,
  position,
  rotation,
  scale,
  metadata,
  physics,
  interactive,
  visible,
  onAdded,
  onRemoved,
}) => {
  const world = useHololandWorld();
  const objectIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Generate ID if not provided
    const objectId = propId || `object-${Math.random().toString(36).substring(2, 11)}`;
    objectIdRef.current = objectId;

    // Add object to world
    try {
      world.addObject({
        id: objectId,
        type,
        position,
        rotation,
        scale,
        metadata,
        physics,
        interactive,
        visible,
      });

      onAdded?.(objectId);
    } catch (error) {
      console.error('Failed to add Hololand object:', error);
    }

    // Cleanup: remove object on unmount
    return () => {
      if (objectIdRef.current) {
        try {
          world.removeObject(objectIdRef.current);
          onRemoved?.(objectIdRef.current);
        } catch (error) {
          console.error('Failed to remove Hololand object:', error);
        }
      }
    };
  }, []); // Only run on mount/unmount

  // Update object properties when they change
  useEffect(() => {
    if (!objectIdRef.current) return;

    const obj = world.getObject(objectIdRef.current);
    if (!obj) return;

    // Update position using setter
    if (position) {
      obj.setPosition(position);
    }

    // Update rotation using setter
    if (rotation) {
      obj.setRotation(rotation);
    }

    // Update scale using setter
    if (scale) {
      obj.setScale(scale);
    }

    // Update visibility using setter
    if (visible !== undefined) {
      obj.setVisible(visible);
    }

    // Note: metadata and physics config can't be hot-reloaded easily
    // Objects need to be recreated for those changes
  }, [position, rotation, scale, visible]);

  return null; // This component doesn't render anything in React
};
