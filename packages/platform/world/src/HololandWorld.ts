/**
 * @hololand/world
 *
 * VR World Runtime & Spatial Management
 * The core world engine powering the Hololand metaverse
 */

import { logger } from './logger';
import { SpatialObject, type SpatialObjectConfig } from './SpatialObject';
import { PhysicsEngine } from './PhysicsEngine';
import { SpatialIndex } from './SpatialIndex';
import { EventBus, type WorldEvent } from './EventBus';
import type { Vector3, BoundingBox } from './types';

export interface WorldConfig {
  name: string;
  bounds?: BoundingBox;
  gravity?: Vector3;
  enablePhysics?: boolean;
  tickRate?: number;
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
 * Manages spatial objects, physics, and world state in the Hololand metaverse
 */
export class HololandWorld {
  private config: Required<WorldConfig>;
  private objects: Map<string, SpatialObject>;
  private physics: PhysicsEngine;
  private spatialIndex: SpatialIndex;
  private eventBus: EventBus;
  private isRunning: boolean;
  private tickInterval: NodeJS.Timeout | null;
  private startTime: number;

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
    };

    this.objects = new Map();
    this.physics = new PhysicsEngine(this.config.gravity);
    this.spatialIndex = new SpatialIndex(this.config.bounds);
    this.eventBus = new EventBus();
    this.isRunning = false;
    this.tickInterval = null;
    this.startTime = Date.now();

    logger.info('[HololandWorld] World created', {
      name: this.config.name,
      bounds: this.config.bounds,
      enablePhysics: this.config.enablePhysics,
    });
  }

  /**
   * Start the world simulation
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
      data: { worldName: this.config.name },
    });

    logger.info('[HololandWorld] World started', {
      tickRate: this.config.tickRate,
      tickInterval,
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
   * World tick - updates physics and objects
   */
  private tick(): void {
    const startTime = performance.now();

    // Update physics
    if (this.config.enablePhysics) {
      this.physics.step(1 / this.config.tickRate);
    }

    // Update objects
    for (const object of this.objects.values()) {
      if (object.isActive()) {
        object.update(1 / this.config.tickRate);
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
      this.physics.addObject(object);
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
      this.physics.removeObject(object);
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
   * Subscribe to world events
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

  /**
   * Get world statistics
   */
  getStats() {
    return {
      name: this.config.name,
      objectCount: this.objects.size,
      activeObjects: Array.from(this.objects.values()).filter((o) => o.isActive()).length,
      uptime: Date.now() - this.startTime,
      isRunning: this.isRunning,
      tickRate: this.config.tickRate,
      physicsEnabled: this.config.enablePhysics,
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
    this.eventBus.removeAllListeners();

    this.eventBus.emit({
      type: 'world:destroyed',
      timestamp: Date.now(),
      data: { worldName: this.config.name },
    });
  }
}
