/**
 * @hololand/ar-tracking - HoloScript Module Exports
 */

export {
  // AST Types
  type TrackingBlock,
  type AnchorSpec,
  type TrackingHandler,
  type TrackingEventType,
  type TrackingStatement,
  type SpawnStatement,
  type BindStatement,
  type DespawnStatement,
  type TriggerStatement,
  type CallStatement,
  type PositionRef,
  
  // Runtime Types
  type TrackingContext,
  type TrackedPersonProxy,
  type CharacterInstance,
  
  // Functions
  trackingFunctions,
  parseTrackingBlock,
  executeHandler,
  createPersonProxy,
} from './bindings';
