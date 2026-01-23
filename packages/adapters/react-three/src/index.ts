/**
 * @hololand/react-three
 *
 * React components and hooks for Hololand VR worlds
 */

// Main components
export { HololandCanvas } from './HololandCanvas';
export type { HololandCanvasProps } from './HololandCanvas';

export { HololandObject } from './HololandObject';
export type { HololandObjectProps } from './HololandObject';

// Context and hooks
export {
  HololandContext,
  useHololand,
  useHololandWorld,
  useHololandRenderer,
} from './HololandContext';
export type { HololandContextValue } from './HololandContext';

export {
  useHololandObject,
  useNearbyObjects,
  useTrackedObject,
  useWorldEvent,
  usePhysics,
} from './hooks';

// Re-export useful types from dependencies
export type {
  SpatialObject,
  SpatialObjectConfig,
  Vector3,
  Quaternion,
  BoundingBox,
  WorldConfig,
} from '@hololand/world';

export type {
  RendererConfig,
  LightingConfig,
  MaterialConfig,
} from '@hololand/renderer';
