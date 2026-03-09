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

export { HoloScriptR3FRenderer } from './HoloScriptR3FRenderer';
export type { HoloScriptR3FRendererProps } from './HoloScriptR3FRenderer';

export { HoloScriptPlayground } from './HoloScriptPlayground';
export type { HoloScriptPlaygroundProps } from './HoloScriptPlayground';

export { NetworkProvider, NetworkContext, useNetwork } from './NetworkContext';
export { SyncedEntity } from './SyncedEntity';
export { DeformableEntity } from './DeformableEntity';
export { IntelligenceEntity } from './IntelligenceEntity';
export { InteractionEntity } from './InteractionEntity';
export { AnimatedEntity } from './AnimatedEntity';
export type { AnimationConfig, AnimatedEntityProps } from './AnimatedEntity';
export { HoloCompositionRenderer } from './HoloCompositionRenderer';
export type { HoloCompositionRendererProps } from './HoloCompositionRenderer';

// HoloScript Runtime Context (bridges imperative runtime ↔ declarative R3F)
export {
  HoloRuntimeContext,
  HoloRuntimeProvider,
  useHoloRuntime,
  useHoloVariable,
  useHoloEvent,
} from './RuntimeContext';
export type { HoloRuntimeContextValue, HoloRuntimeProviderProps } from './RuntimeContext';

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

// Dragon Preview Component (Studio/Inspector Tool)
export { DragonPreview } from './DragonPreview';
export type { DragonPreviewProps } from './DragonPreview';
