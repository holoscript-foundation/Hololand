/**
 * @hololand/world
 *
 * VR World Runtime & Spatial Management
 * The core world engine powering the Hololand metaverse
 *
 * Physics backend: Prefers Rapier3D WASM (optional peer dep) for
 * production-quality rigid-body simulation. Falls back to the built-in
 * O(n^2) PhysicsEngine when Rapier is unavailable.
 *
 * The SpatialEngineBridge unifies both backends and adds:
 *   - SpatialIndex-accelerated broad-phase collision culling
 *   - Quality-preset-driven physics substeps (1-4)
 *   - Collision event dispatch to EventBus + HoloScriptBridge
 */

import { logger } from './logger';
import { SpatialObject, type SpatialObjectConfig } from './SpatialObject';
import { PhysicsEngine } from './PhysicsEngine';
import { SpatialIndex } from './SpatialIndex';
import { SpatialEngineBridge, type PhysicsBackend } from './SpatialEngineBridge';
import { EventBus, type WorldEvent } from './EventBus';
import type { Vector3, BoundingBox } from './types';

export interface WorldConfig {
  name: string;
  bounds?: BoundingBox;
  gravity?: Vector3;
  enablePhysics?: boolean;
  tickRate?: number;
  /**
   * Number of physics substeps per tick (1-4).
   * Driven by renderer quality presets (QualitySettings.physicsSubsteps).
   * Higher values = more accurate at the cost of CPU.
   *   1 = low quality / mobile
   *   2 = medium quality
   *   3 = high quality / PC VR
   *   4 = ultra quality / desktop
   */
  physicsSubsteps?: number;
  /**
   * If true, skip Rapier initialisation and always use the built-in engine.
   * Useful for testing or environments where WASM is not available.
   */
  forceBuiltInPhysics?: boolean;
}

export interface WorldState {
  name: string;
  objects: Map<string, SpatialObject>;
  totalObjects: number;
  bounds: BoundingBox;
  gravity: Vector3;
  uptime: number;
  lastTick: number;
}

/**
 * HololandWorld - The VR World Runtime
 *
 * Manages spatial objects, physics, and world state in the Hololand metaverse.
 *
 * Physics is managed through the SpatialEngineBridge which:
 *   - Attempts to load Rapier3D as the primary physics backend
 *   - Falls back to the built-in PhysicsEngine if Rapier is unavailable
 *   - Uses SpatialIndex for broad-phase collision acceleration
 *   - Supports configurable physics substeps from quality presets
 *   - Routes collision events to EventBus and HoloScriptBridge
 */
export class HololandWorld {
  private config: Required<WorldConfig>;
  private objects: Map<string, SpatialObject>;
  /**
   * @deprecated Direct access to PhysicsEngine. Use `spatialEngineBridge`
   * or `getPhysicsEngine()` instead. Retained for backward compatibility
   * with PhysicsExpansionBridge and existing consumers.
   */
  private physics: PhysicsEngine;
  private spatialIndex: SpatialIndex;
  private spatialEngineBridge: SpatialEngineBridge;
  private eventBus: EventBus;
  private isRunning: boolean;
  private tickInterval: NodeJS.Timeout | null;
  private startTime: number;
  private _physicsInitialized = false;

  constructor(config: WorldConfig) {
    this.config = {
      name: config.name,
      bounds: config.bounds ?? {
        min: { x: -1000, y: -1000, z: -1000 },
        max: { x: 1000, y: 1000, z: 1000 },
      },
      gravity: config.gravity ?? { x: 0, y: -9.81, z: 0 },
      enablePhysics: config.enablePhysics ?? true,
      tickRate: config.tickRate ?? 60, // 60 ticks per second
      physicsSubsteps: config.physicsSubsteps ?? 1,
      forceBuiltInPhysics: config.forceBuiltInPhysics ?? false,
    };

    this.objects = new Map();
    this.eventBus = new EventBus();
    this.spatialIndex = new SpatialIndex(this.config.bounds);

    // Create the built-in engine (always available, used as fallback)
    this.physics = new PhysicsEngine(this.config.gravity);

    // Create the unified SpatialEngineBridge
    this.spatialEngineBridge = new SpatialEngineBridge({
      gravity: this.config.gravity,
      bounds: this.config.bounds,
      physicsSubsteps: this.config.physicsSubsteps,
      eventBus: this.eventBus,
      spatialIndex: this.spatialIndex,
      forceBuiltIn: this.config.forceBuiltInPhysics,
    });

    this.isRunning = false;
    this.tickInterval = null;
    this.startTime = Date.now();

    logger.info('[HololandWorld] World created', {
      name: this.config.name,
      bounds: this.config.bounds,
      enablePhysics: this.config.enablePhysics,
      physicsSubsteps: this.config.physicsSubsteps,
      forceBuiltInPhysics: this.config.forceBuiltInPhysics,
    });
  }

  /**
   * Initialise the physics backend.
   *
   * Attempts to load Rapier3D as the primary backend. If unavailable,
   * silently falls back to the built-in PhysicsEngine.
   *
   * This is async because Rapier requires a WASM module load. Call this
   * before `start()` if you want Rapier support. If you skip this call
   * the world will use the built-in engine.
   */
  async initPhysics(): Promise<void> {
    if (this._physicsInitialized) return;

    await this.spatialEngineBridge.init();
    this._physicsInitialized = true;

    logger.info('[HololandWorld] Physics initialised', {
      backend: this.spatialEngineBridge.getBackend(),
      physicsSubsteps: this.config.physicsSubsteps,
    });
  }

  /**
   * Start the world simulation.
   *
   * If `initPhysics()` hasn't been called yet, the bridge will auto-init
   * with the built-in engine (no Rapier attempt). For Rapier support,
   * call `await world.initPhysics()` before `world.start()`.
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[HololandWorld] World already running');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();

    const tickInterval = 1000 / this.config.tickRate;
    this.tickInterval = setInterval(() => this.tick(), tickInterval);

    this.eventBus.emit({
      type: 'world:started',
      timestamp: Date.now(),
      data: {
        worldName: this.config.name,
        physicsBackend: this.spatialEngineBridge.getBackend(),
        physicsSubsteps: this.config.physicsSubsteps,
      },
    });

    logger.info('[HololandWorld] World started', {
      tickRate: this.config.tickRate,
      tickInterval,
      physicsBackend: this.spatialEngineBridge.getBackend(),
    });
  }

  /**
   * Stop the world simulation
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[HololandWorld] World not running');
      return;
    }

    this.isRunning = false;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.eventBus.emit({
      type: 'world:stopped',
      timestamp: Date.now(),
      data: { worldName: this.config.name },
    });

    logger.info('[HololandWorld] World stopped');
  }

  /**
   * World tick - updates physics (with substeps) and objects.
   *
   * Physics substeps are handled by SpatialEngineBridge.step() which
   * subdivides deltaTime into `physicsSubsteps` equal sub-steps.
   */
  private tick(): void {
    const startTime = performance.now();
    const deltaTime = 1 / this.config.tickRate;

    // Update physics through the unified bridge (handles substeps internally)
    if (this.config.enablePhysics) {
      this.spatialEngineBridge.step(deltaTime);
    }

    // Update objects
    for (const object of this.objects.values()) {
      if (object.isActive()) {
        object.update(deltaTime);
      }
    }

    // Emit tick event
    const duration = performance.now() - startTime;
    this.eventBus.emit({
      type: 'world:tick',
      timestamp: Date.now(),
      data: {
        duration,
        objectCount: this.objects.size,
        physicsBackend: this.spatialEngineBridge.getBackend(),
      },
    });
  }

  /**
   * Add object to world
   */
  addObject(config: SpatialObjectConfig): SpatialObject {
    const object = new SpatialObject(config);

    if (this.objects.has(object.id)) {
      throw new Error(`[HololandWorld] Object with id ${object.id} already exists`);
    }

    // Check bounds
    if (!this.isInBounds(object.getPosition())) {
      logger.warn('[HololandWorld] Object outside world bounds', {
        objectId: object.id,
        position: object.getPosition(),
      });
    }

    this.objects.set(object.id, object);
    this.spatialIndex.insert(object);

    if (this.config.enablePhysics && object.hasPhysics()) {
      // Add to the unified bridge (routes to Rapier or built-in)
      this.spatialEngineBridge.addObject(object);
    }

    this.eventBus.emit({
      type: 'object:added',
      timestamp: Date.now(),
      data: { objectId: object.id, config },
    });

    logger.debug('[HololandWorld] Object added', {
      objectId: object.id,
      position: object.getPosition(),
    });

    return object;
  }

  /**
   * Remove object from world
   */
  removeObject(objectId: string): boolean {
    const object = this.objects.get(objectId);
    if (!object) {
      logger.warn('[HololandWorld] Object not found', { objectId });
      return false;
    }

    this.objects.delete(objectId);
    this.spatialIndex.remove(object);

    if (this.config.enablePhysics && object.hasPhysics()) {
      // Remove from the unified bridge
      this.spatialEngineBridge.removeObject(object);
    }

    object.destroy();

    this.eventBus.emit({
      type: 'object:removed',
      timestamp: Date.now(),
      data: { objectId },
    });

    logger.debug('[HololandWorld] Object removed', { objectId });

    return true;
  }

  /**
   * Get object by ID
   */
  getObject(objectId: string): SpatialObject | undefined {
    return this.objects.get(objectId);
  }

  /**
   * Get all objects
   */
  getAllObjects(): SpatialObject[] {
    return Array.from(this.objects.values());
  }

  /**
   * Query objects near a position
   */
  queryNearby(position: Vector3, radius: number): SpatialObject[] {
    return this.spatialIndex.queryRadius(position, radius);
  }

  /**
   * Query objects in a bounding box
   */
  queryBox(box: BoundingBox): SpatialObject[] {
    return this.spatialIndex.queryBox(box);
  }

  /**
   * Check if position is within world bounds
   */
  isInBounds(position: Vector3): boolean {
    return (
      position.x >= this.config.bounds.min.x &&
      position.x <= this.config.bounds.max.x &&
      position.y >= this.config.bounds.min.y &&
      position.y <= this.config.bounds.max.y &&
      position.z >= this.config.bounds.min.z &&
      position.z <= this.config.bounds.max.z
    );
  }

  /**
   * Get world state snapshot
   */
  getState(): WorldState {
    return {
      name: this.config.name,
      objects: new Map(this.objects),
      totalObjects: this.objects.size,
      bounds: this.config.bounds,
      gravity: this.config.gravity,
      uptime: Date.now() - this.startTime,
      lastTick: Date.now(),
    };
  }

  /**
   * Subscribe to world events.
   *
   * Physics collision events are available with these types:
   *   - 'physics:collision-start' - two bodies began touching
   *   - 'physics:collision-end'   - two bodies stopped touching
   *   - 'physics:trigger-enter'   - body entered a trigger volume
   *   - 'physics:trigger-exit'    - body left a trigger volume
   *
   * Event data is a PhysicsCollisionEvent with objectIdA, objectIdB,
   * and optional contact info (point, normal, impulse).
   */
  on(eventType: string, handler: (event: WorldEvent) => void): () => void {
    return this.eventBus.on(eventType, handler);
  }

  /**
   * Emit custom event
   */
  emit(event: WorldEvent): void {
    this.eventBus.emit(event);
  }

  // =========================================================================
  // Physics substep control (connected to QualityManager)
  // =========================================================================

  /**
   * Update the number of physics substeps.
   *
   * This is the integration point with the renderer QualityManager:
   * when the quality preset changes, call this method with the new
   * preset's `physicsSubsteps` value.
   *
   * @example
   * ```ts
   * qualityManager.onQualityChange = (settings) => {
   *   world.setPhysicsSubsteps(settings.physicsSubsteps);
   * };
   * ```
   */
  setPhysicsSubsteps(substeps: number): void {
    this.config.physicsSubsteps = Math.max(1, Math.min(4, substeps));
    this.spatialEngineBridge.setPhysicsSubsteps(this.config.physicsSubsteps);

    logger.info('[HololandWorld] Physics substeps updated', {
      substeps: this.config.physicsSubsteps,
    });
  }

  // =========================================================================
  // Physics backend access
  // =========================================================================

  /**
   * Get the active physics backend type.
   */
  getPhysicsBackend(): PhysicsBackend {
    return this.spatialEngineBridge.getBackend();
  }

  /**
   * Get the SpatialEngineBridge for advanced physics operations.
   *
   * Use this to access Rapier-specific features when available,
   * or to wire up PhysicsExpansionBridge.
   */
  getSpatialEngineBridge(): SpatialEngineBridge {
    return this.spatialEngineBridge;
  }

  /**
   * Get the underlying built-in PhysicsEngine.
   *
   * @deprecated Prefer `getSpatialEngineBridge()` for new code.
   * This accessor is retained for backward compatibility with
   * PhysicsExpansionBridge and other existing consumers.
   */
  getPhysicsEngine(): PhysicsEngine {
    return this.physics;
  }

  /**
   * Get the EventBus for subscribing to world and physics events.
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Get world statistics
   */
  getStats() {
    const bridgeStats = this.spatialEngineBridge.getStats();
    return {
      ...bridgeStats,
      name: this.config.name,
      objectCount: this.objects.size,
      activeObjects: Array.from(this.objects.values()).filter((o) => o.isActive()).length,
      uptime: Date.now() - this.startTime,
      isRunning: this.isRunning,
      tickRate: this.config.tickRate,
      physicsEnabled: this.config.enablePhysics,
      physicsBackend: this.spatialEngineBridge.getBackend(),
      physicsSubsteps: this.config.physicsSubsteps,
    };
  }

  /**
   * Clear all objects from world
   */
  clear(): void {
    logger.info('[HololandWorld] Clearing world', {
      objectCount: this.objects.size,
    });

    for (const object of this.objects.values()) {
      this.removeObject(object.id);
    }

    this.eventBus.emit({
      type: 'world:cleared',
      timestamp: Date.now(),
      data: { worldName: this.config.name },
    });
  }

  /**
   * Destroy the world
   */
  destroy(): void {
    logger.info('[HololandWorld] Destroying world', {
      name: this.config.name,
    });

    this.stop();
    this.clear();
    this.spatialEngineBridge.dispose();
    this.eventBus.removeAllListeners();

    this.eventBus.emit({
      type: 'world:destroyed',
      timestamp: Date.now(),
      data: { worldName: this.config.name },
    });
  }
}
