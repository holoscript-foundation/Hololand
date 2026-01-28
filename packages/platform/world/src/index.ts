/**
 * @hololand/world
 *
 * VR World Runtime & Spatial Management
 * The core world engine powering the Hololand metaverse
 */

// Main world class
export { HololandWorld, type WorldConfig, type WorldState } from './HololandWorld';

// Spatial objects
export { SpatialObject, type SpatialObjectConfig } from './SpatialObject';

// Physics engine
export { PhysicsEngine } from './PhysicsEngine';

// Spatial indexing
export { SpatialIndex } from './SpatialIndex';

// Event system
export { EventBus, type WorldEvent } from './EventBus';

// Logger
export { setHololandWorldLogger, resetLogger, type HololandWorldLogger } from './logger';

// Systems & Managers
export { NPCSystem, type NPCTrait } from './systems/NPCSystem';
export { DialogManager, type DialogNode, type DialogOption } from './managers/DialogManager';
export { HoloScriptLoader } from './utils/HoloScriptLoader';

// Composition Loader (NEW - loads .holo files)
export {
  CompositionLoader,
  CompositionError,
  loadComposition,
  loadHolo,
  loadHsPlus,
  type LoadedComposition,
  type TemplateDefinition,
  type ActionDefinition,
  type EnvironmentConfig,
  type CompositionLogic,
} from './loaders/CompositionLoader';

// Types
export type { Vector3, Quaternion, BoundingBox, Transform } from './types';

// Physics joints and ragdoll (merged from @holoscript/physics-joints)
export * from './PhysicsJoints';

// Constants
export const HOLOLAND_WORLD_VERSION = '1.0.0-alpha.1';

export const DEFAULT_WORLD_BOUNDS = {
  min: { x: -1000, y: -1000, z: -1000 },
  max: { x: 1000, y: 1000, z: 1000 },
};

export const DEFAULT_GRAVITY = { x: 0, y: -9.81, z: 0 };

export const DEFAULT_TICK_RATE = 60; // 60 FPS

// Utility functions
export function createWorld(config: Partial<import('./HololandWorld').WorldConfig> & { name: string }) {
  const world = new (require('./HololandWorld').HololandWorld)(config);
  return world;
}

export function vectorDistance(a: import('./types').Vector3, b: import('./types').Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function vectorAdd(a: import('./types').Vector3, b: import('./types').Vector3): import('./types').Vector3 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

export function vectorSubtract(a: import('./types').Vector3, b: import('./types').Vector3): import('./types').Vector3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

export function vectorScale(v: import('./types').Vector3, scalar: number): import('./types').Vector3 {
  return {
    x: v.x * scalar,
    y: v.y * scalar,
    z: v.z * scalar,
  };
}

// Export everything as default for convenience
import { HololandWorld } from './HololandWorld';
import { SpatialObject } from './SpatialObject';
import { PhysicsEngine } from './PhysicsEngine';
export * from './PhysicsEngine';
export * from './types';
export * from './PhysicsExpansionBridge';
import { SpatialIndex } from './SpatialIndex';
import { EventBus } from './EventBus';
import { NPCSystem } from './systems/NPCSystem';
import { DialogManager } from './managers/DialogManager';
import { HoloScriptLoader } from './utils/HoloScriptLoader';

export default {
  HololandWorld,
  SpatialObject,
  PhysicsEngine,
  SpatialIndex,
  EventBus,
  NPCSystem,
  DialogManager,
  HoloScriptLoader,
  createWorld,
  vectorDistance,
  vectorAdd,
  vectorSubtract,
  vectorScale,
  HOLOLAND_WORLD_VERSION,
  DEFAULT_WORLD_BOUNDS,
  DEFAULT_GRAVITY,
  DEFAULT_TICK_RATE,
};
