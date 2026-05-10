/**
 * SpatialEngineBridge (DEPRECATED - THE DUMB GLASS EPOCH)
 *
 * HoloLand has transitioned from a monolithic stateful server environment into an
 * Agent-to-Agent (A2A) dumb terminal governed by HoloScript feeds.
 *
 * Physics and object synchronization are NO LONGER managed by this local engine loop.
 * All spatial logic has been decoupled into the `@holoscript/r3f-renderer` package,
 * which natively consumes `crdt://holomesh/feed` via continuous WebGPU Proof-of-Play (PoP) rendering.
 *
 * Responsibilities (New):
 *   1. Intercept legacy game-loop logic and warn developers to use HoloMesh.
 *   2. Ensure `step()` does absolutely nothing, reclaiming CPU for swarm rendering.
 */

import { logger } from './logger';
import { EventBus } from './EventBus';

export interface SpatialEngineBridgeConfig {
  eventBus: EventBus;
  [key: string]: any; // Accept legacy config without crashing
}

export type PhysicsBackend = 'holomesh-native';
export interface PhysicsCollisionEvent {
  objectA: string;
  objectB: string;
  impulse?: number;
  timestamp: number;
}

export class SpatialEngineBridge {
  private _initialized = false;
  private eventBus: EventBus;

  constructor(config: SpatialEngineBridgeConfig) {
    this.eventBus = config.eventBus;
    logger.warn(
      '[SpatialEngineBridge] Instantiated legacy bridge. HoloLand is now The Dumb Glass.'
    );
  }

  async init(): Promise<void> {
    if (this._initialized) return;
    void this.eventBus;
    this._initialized = true;
    logger.info(
      '[SpatialEngineBridge] Physics is fully handled by @holoscript/r3f-renderer via Loro CRDT streams. Local engine bypassed.'
    );
  }

  get initialized(): boolean {
    return this._initialized;
  }

  getBackend(): PhysicsBackend {
    return 'holomesh-native';
  }

  isRapier(): boolean {
    return false; // Rapier logic handled completely inside AST compilation now
  }

  addObject(_object: any): void {
    logger.warn(
      '[SpatialEngineBridge] addObject ignored: Entities must be spawned natively via crdt://holomesh/feed!'
    );
  }

  removeObject(_object: any): void {
    logger.warn(
      '[SpatialEngineBridge] removeObject ignored: Entities are destroyed via CRDT tombstoning!'
    );
  }

  step(_deltaTime: number): void {
    // STRICT NO-OP
    // The WebGL renderer executes physics natively using react-three-fiber and HoloScript traits!
  }

  setGravity(_gravity: any): void {
    logger.warn(
      '[SpatialEngineBridge] setGravity ignored: Governed by the holomesh spatial compiler.'
    );
  }

  setPhysicsSubsteps(_substeps: number): void {
    logger.warn(
      '[SpatialEngineBridge] setPhysicsSubsteps ignored: HoloMesh native physics owns substeps.'
    );
  }

  getStats() {
    return {
      backend: 'holomesh-native-bypassed',
      physicsSubsteps: 0,
      rapierBodies: 0,
      trackedObjects: 0,
    };
  }

  dispose(): void {
    this._initialized = false;
    logger.info('[SpatialEngineBridge] Disposed dummy bridge');
  }

  // --- Legacy APIs required for compilation stubbing ---
  getBuiltInEngine() {
    return null;
  }
  getRapierWorld() {
    return null;
  }
  getRapierModule() {
    return null;
  }

  applyLinearVelocity(_nodeId: string, _velocity: any): void {}
  applyAngularVelocity(_nodeId: string, _angularVelocity: any): void {}
  setBodyType(_nodeId: string, _type: string): void {}
  getBodyType(_nodeId: string): string {
    return 'kinematic';
  }

  raycast(_origin: any, _direction: any, _maxDistance: number) {
    return null;
  }
}

export function createSpatialEngineBridge(config: SpatialEngineBridgeConfig): SpatialEngineBridge {
  return new SpatialEngineBridge(config);
}
