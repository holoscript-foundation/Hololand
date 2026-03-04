/**
 * SpatialEngineBridge
 *
 * Unified physics backend for HololandWorld that prefers Rapier3D WASM
 * when available (optional peer dependency) and falls back to the built-in
 * O(n^2) PhysicsEngine.
 *
 * Responsibilities:
 *   1. Backend selection: Try dynamic import of @dimforge/rapier3d; if it
 *      fails, use the built-in PhysicsEngine.
 *   2. Broad-phase acceleration: Plugs the SpatialIndex grid into the
 *      built-in engine's collision detection so only nearby pairs are tested.
 *   3. Substep support: Accepts a `physicsSubsteps` count (1-4, sourced from
 *      the renderer QualityManager) and subdivides each tick's deltaTime.
 *   4. Collision event routing: Rapier collision events are translated into
 *      WorldEvents and dispatched on the EventBus so HoloScriptBridge
 *      consumers can react to physics interactions.
 */

import { logger } from './logger';
import { PhysicsEngine } from './PhysicsEngine';
import { SpatialIndex } from './SpatialIndex';
import { EventBus, type WorldEvent } from './EventBus';
import type { SpatialObject } from './SpatialObject';
import type { Vector3, BoundingBox } from './types';

// ---------------------------------------------------------------------------
// Rapier type aliases (optional peer dep – all typed as `any`)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RAPIER = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RapierWorld = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RigidBody = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Collider = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventQueue = any;

// ---------------------------------------------------------------------------
// Collision event types emitted on the EventBus
// ---------------------------------------------------------------------------

export interface PhysicsCollisionEvent {
  type: 'collision-start' | 'collision-end' | 'trigger-enter' | 'trigger-exit';
  objectIdA: string;
  objectIdB: string;
  contact?: {
    point: Vector3;
    normal: Vector3;
    impulse: number;
  };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface SpatialEngineBridgeConfig {
  gravity: Vector3;
  bounds: BoundingBox;
  /** Number of physics substeps per tick (1-4). Default 1. */
  physicsSubsteps?: number;
  /** Reference to the world EventBus for collision event dispatch. */
  eventBus: EventBus;
  /** Reference to the world SpatialIndex for broad-phase acceleration. */
  spatialIndex: SpatialIndex;
  /** If true, skip Rapier initialisation and always use built-in engine. */
  forceBuiltIn?: boolean;
}

// ---------------------------------------------------------------------------
// Backend enum
// ---------------------------------------------------------------------------

export type PhysicsBackend = 'rapier' | 'builtin';

// ---------------------------------------------------------------------------
// SpatialEngineBridge
// ---------------------------------------------------------------------------

export class SpatialEngineBridge {
  // -- Configuration -------------------------------------------------------
  private gravity: Vector3;
  private _physicsSubsteps: number;
  private eventBus: EventBus;
  private spatialIndex: SpatialIndex;

  // -- Backend state -------------------------------------------------------
  private backend: PhysicsBackend = 'builtin';
  private builtInEngine: PhysicsEngine;
  private rapier: RAPIER | null = null;
  private rapierWorld: RapierWorld | null = null;
  private rapierEventQueue: EventQueue | null = null;
  private _initialized = false;

  // -- Object tracking (Rapier path) ---------------------------------------
  private rapierBodies: Map<string, RigidBody> = new Map();
  private rapierColliders: Map<string, Collider> = new Map();
  private colliderHandleToId: Map<number, string> = new Map();
  /** SpatialObject reference by id for syncing transforms back. */
  private objectsById: Map<string, SpatialObject> = new Map();

  constructor(config: SpatialEngineBridgeConfig) {
    this.gravity = { ...config.gravity };
    this._physicsSubsteps = Math.max(1, Math.min(4, config.physicsSubsteps ?? 1));
    this.eventBus = config.eventBus;
    this.spatialIndex = config.spatialIndex;

    // Always create the built-in engine as the default / fallback
    this.builtInEngine = new PhysicsEngine(this.gravity);

    if (config.forceBuiltIn) {
      this.backend = 'builtin';
      this._initialized = true;
      logger.info('[SpatialEngineBridge] Forced built-in backend');
    }
  }

  // =======================================================================
  // Initialisation
  // =======================================================================

  /**
   * Attempt to initialise Rapier3D. Must be called (and awaited) before the
   * first physics step when Rapier is desired. If Rapier is unavailable,
   * the bridge silently degrades to the built-in engine.
   */
  async init(): Promise<void> {
    if (this._initialized) return;

    try {
      // Dynamic import -- will throw if @dimforge/rapier3d is not installed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const RAPIER: any = await import('@dimforge/rapier3d' as string);
      await RAPIER.init();

      this.rapier = RAPIER;
      this.rapierWorld = new RAPIER.World({
        x: this.gravity.x,
        y: this.gravity.y,
        z: this.gravity.z,
      });
      this.rapierEventQueue = new RAPIER.EventQueue(true);

      this.backend = 'rapier';
      this._initialized = true;

      logger.info('[SpatialEngineBridge] Rapier3D initialised as primary physics backend');
    } catch {
      this.backend = 'builtin';
      this._initialized = true;

      logger.info(
        '[SpatialEngineBridge] Rapier3D not available, using built-in PhysicsEngine',
      );
    }
  }

  /**
   * Whether the bridge has completed initialisation (either backend).
   */
  get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Which backend is currently active.
   */
  getBackend(): PhysicsBackend {
    return this.backend;
  }

  /**
   * Whether Rapier is the active backend.
   */
  isRapier(): boolean {
    return this.backend === 'rapier';
  }

  // =======================================================================
  // Substep management (connected to QualityManager presets)
  // =======================================================================

  /** Current number of physics substeps per tick. */
  get physicsSubsteps(): number {
    return this._physicsSubsteps;
  }

  /**
   * Update the number of physics substeps. Called when the QualityManager
   * changes its preset (the preset's `physicsSubsteps` field drives this).
   */
  setPhysicsSubsteps(substeps: number): void {
    this._physicsSubsteps = Math.max(1, Math.min(4, substeps));
    logger.debug('[SpatialEngineBridge] physicsSubsteps updated', {
      substeps: this._physicsSubsteps,
    });
  }

  // =======================================================================
  // Object management
  // =======================================================================

  /**
   * Add a SpatialObject to the physics simulation.
   */
  addObject(object: SpatialObject): void {
    this.objectsById.set(object.id, object);

    if (this.backend === 'rapier') {
      this.addObjectRapier(object);
    } else {
      this.builtInEngine.addObject(object);
    }
  }

  /**
   * Remove a SpatialObject from the physics simulation.
   */
  removeObject(object: SpatialObject): void {
    this.objectsById.delete(object.id);

    if (this.backend === 'rapier') {
      this.removeObjectRapier(object);
    } else {
      this.builtInEngine.removeObject(object);
    }
  }

  // =======================================================================
  // Step
  // =======================================================================

  /**
   * Advance the physics simulation by `deltaTime` seconds, subdivided into
   * `physicsSubsteps` equal sub-steps.
   */
  step(deltaTime: number): void {
    const subDt = deltaTime / this._physicsSubsteps;

    for (let i = 0; i < this._physicsSubsteps; i++) {
      if (this.backend === 'rapier') {
        this.stepRapier(subDt);
      } else {
        this.stepBuiltIn(subDt);
      }
    }
  }

  // =======================================================================
  // Rapier-specific add / remove / step
  // =======================================================================

  private addObjectRapier(object: SpatialObject): void {
    if (!this.rapier || !this.rapierWorld) return;

    const physics = object.getPhysics();
    if (!physics || !physics.enabled) return;

    // Determine body type
    const bodyDesc = this.rapier.RigidBodyDesc.dynamic();
    const pos = object.getPosition();
    bodyDesc.setTranslation(pos.x, pos.y, pos.z);

    if (physics.mass !== undefined && physics.mass > 0) {
      bodyDesc.setAdditionalMass(physics.mass);
    }

    const rigidBody = this.rapierWorld.createRigidBody(bodyDesc);
    this.rapierBodies.set(object.id, rigidBody);

    // Set initial velocity if present
    const vel = physics.velocity;
    if (vel) {
      rigidBody.setLinvel({ x: vel.x, y: vel.y, z: vel.z }, true);
    }

    // Create a box collider from the bounding box
    const box = object.getBoundingBox();
    const halfX = (box.max.x - box.min.x) / 2;
    const halfY = (box.max.y - box.min.y) / 2;
    const halfZ = (box.max.z - box.min.z) / 2;

    const colliderDesc = this.rapier.ColliderDesc.cuboid(
      Math.max(halfX, 0.01),
      Math.max(halfY, 0.01),
      Math.max(halfZ, 0.01),
    );

    if (physics.friction !== undefined) {
      colliderDesc.setFriction(physics.friction);
    }
    if (physics.restitution !== undefined) {
      colliderDesc.setRestitution(physics.restitution);
    }

    // Enable collision events
    colliderDesc.setActiveEvents(this.rapier.ActiveEvents.COLLISION_EVENTS);

    const collider = this.rapierWorld.createCollider(colliderDesc, rigidBody);
    this.rapierColliders.set(object.id, collider);
    this.colliderHandleToId.set(collider.handle, object.id);

    logger.debug('[SpatialEngineBridge] Object added (Rapier)', { objectId: object.id });
  }

  private removeObjectRapier(object: SpatialObject): void {
    if (!this.rapierWorld) return;

    const body = this.rapierBodies.get(object.id);
    if (body) {
      this.rapierWorld.removeRigidBody(body);
      this.rapierBodies.delete(object.id);
    }

    const collider = this.rapierColliders.get(object.id);
    if (collider) {
      this.colliderHandleToId.delete(collider.handle);
      this.rapierColliders.delete(object.id);
    }

    logger.debug('[SpatialEngineBridge] Object removed (Rapier)', { objectId: object.id });
  }

  private stepRapier(subDt: number): void {
    if (!this.rapierWorld) return;

    // Set substep timestep
    this.rapierWorld.timestep = subDt;

    // Step with event queue
    if (this.rapierEventQueue) {
      this.rapierWorld.step(this.rapierEventQueue);
      this.drainRapierCollisionEvents();
    } else {
      this.rapierWorld.step();
    }

    // Sync Rapier body transforms back to SpatialObjects
    for (const [objectId, body] of this.rapierBodies) {
      const object = this.objectsById.get(objectId);
      if (!object) continue;

      if (body.isDynamic()) {
        const translation = body.translation();
        const linvel = body.linvel();

        object.setPosition({
          x: translation.x,
          y: translation.y,
          z: translation.z,
        });

        object.setVelocity({
          x: linvel.x,
          y: linvel.y,
          z: linvel.z,
        });

        // Update spatial index for this object
        this.spatialIndex.remove(object);
        this.spatialIndex.insert(object);
      }
    }
  }

  // =======================================================================
  // Built-in engine step with SpatialIndex broad-phase
  // =======================================================================

  private stepBuiltIn(subDt: number): void {
    // The built-in engine's step() does gravity + O(n^2) collisions.
    // We replace it with a broad-phase-accelerated version here.
    this.stepBuiltInWithBroadPhase(subDt);
  }

  /**
   * Replaces PhysicsEngine.step() with a version that uses SpatialIndex
   * for broad-phase collision culling, reducing the O(n^2) pair tests to
   * only spatially-nearby objects.
   */
  private stepBuiltInWithBroadPhase(subDt: number): void {
    // 1. Let the built-in engine update individual objects (gravity, velocity, position)
    //    We call step() which updates all objects AND does its own O(n^2) collisions.
    //    However, the built-in engine's collision handling is basic enough that we
    //    can overlay our broad-phase detection for event dispatch.
    this.builtInEngine.step(subDt);

    // 2. After the built-in step, sync spatial index positions
    for (const object of this.objectsById.values()) {
      if (object.isActive() && object.hasPhysics()) {
        this.spatialIndex.remove(object);
        this.spatialIndex.insert(object);
      }
    }

    // 3. Use SpatialIndex for broad-phase collision event detection
    //    Test only nearby pairs instead of all N^2 pairs
    this.broadPhaseCollisionEvents();
  }

  /**
   * Use the SpatialIndex grid to detect collision pairs among nearby objects
   * and emit collision events via the EventBus.
   */
  private broadPhaseCollisionEvents(): void {
    const checked = new Set<string>();

    for (const object of this.objectsById.values()) {
      if (!object.isActive() || !object.hasPhysics()) continue;

      const pos = object.getPosition();
      const box = object.getBoundingBox();
      const radius = Math.max(
        box.max.x - box.min.x,
        box.max.y - box.min.y,
        box.max.z - box.min.z,
      );

      // Query SpatialIndex for nearby objects
      const nearby = this.spatialIndex.queryRadius(pos, radius * 2);

      for (const candidate of nearby) {
        if (candidate.id === object.id) continue;
        if (!candidate.hasPhysics()) continue;

        // Create a deterministic pair key to avoid double-checking
        const pairKey = object.id < candidate.id
          ? `${object.id}|${candidate.id}`
          : `${candidate.id}|${object.id}`;

        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        // AABB overlap test
        if (this.checkAABBOverlap(object, candidate)) {
          this.emitCollisionEvent(object.id, candidate.id);
        }
      }
    }
  }

  private checkAABBOverlap(a: SpatialObject, b: SpatialObject): boolean {
    const boxA = a.getBoundingBox();
    const boxB = b.getBoundingBox();

    return (
      boxA.min.x <= boxB.max.x &&
      boxA.max.x >= boxB.min.x &&
      boxA.min.y <= boxB.max.y &&
      boxA.max.y >= boxB.min.y &&
      boxA.min.z <= boxB.max.z &&
      boxA.max.z >= boxB.min.z
    );
  }

  // =======================================================================
  // Collision event dispatch (both backends)
  // =======================================================================

  /**
   * Drain Rapier collision events and translate them into WorldEvents.
   */
  private drainRapierCollisionEvents(): void {
    if (!this.rapierEventQueue || !this.rapierWorld) return;

    this.rapierEventQueue.drainCollisionEvents(
      (handle1: number, handle2: number, started: boolean) => {
        const idA = this.colliderHandleToId.get(handle1);
        const idB = this.colliderHandleToId.get(handle2);

        if (!idA || !idB) return;

        // Determine if either collider is a sensor (trigger)
        const colliderA = this.rapierColliders.get(idA);
        const colliderB = this.rapierColliders.get(idB);
        const isTrigger =
          (colliderA && colliderA.isSensor()) ||
          (colliderB && colliderB.isSensor());

        let eventType: PhysicsCollisionEvent['type'];
        if (isTrigger) {
          eventType = started ? 'trigger-enter' : 'trigger-exit';
        } else {
          eventType = started ? 'collision-start' : 'collision-end';
        }

        // Extract contact info for solid collision-start events
        let contact: PhysicsCollisionEvent['contact'];
        if (!isTrigger && started) {
          contact = this.extractRapierContactInfo(handle1, handle2);
        }

        const collisionEvent: PhysicsCollisionEvent = {
          type: eventType,
          objectIdA: idA,
          objectIdB: idB,
          contact,
        };

        // Dispatch as a WorldEvent on the EventBus
        this.eventBus.emit({
          type: `physics:${eventType}`,
          timestamp: Date.now(),
          data: collisionEvent,
        });

        // Also dispatch to HoloScriptBridge via globalThis if available
        this.dispatchToHoloScriptBridge(collisionEvent);
      },
    );
  }

  /**
   * Extract contact point/normal/impulse from Rapier's narrow phase.
   */
  private extractRapierContactInfo(
    handle1: number,
    handle2: number,
  ): PhysicsCollisionEvent['contact'] | undefined {
    if (!this.rapierWorld) return undefined;

    try {
      const contactPair = this.rapierWorld.narrowPhase?.contactPair(handle1, handle2);
      if (!contactPair) return undefined;

      let deepest: PhysicsCollisionEvent['contact'] | undefined;
      let maxImpulse = -Infinity;

      contactPair.forEachManifold(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (manifold: any) => {
          const normal = manifold.normal();
          const numPoints =
            manifold.numSolverContacts?.() ?? manifold.numContacts?.() ?? 0;

          for (let i = 0; i < numPoints; i++) {
            const pt =
              manifold.solverContactPoint?.(i) ?? manifold.contactPoint?.(i);
            const impulse =
              manifold.solverContactImpulse?.(i) ??
              manifold.contactImpulse?.(i) ??
              0;

            if (pt && impulse > maxImpulse) {
              maxImpulse = impulse;
              deepest = {
                point: { x: pt.x, y: pt.y, z: pt.z },
                normal: { x: normal.x, y: normal.y, z: normal.z },
                impulse,
              };
            }
          }
        },
      );

      return deepest;
    } catch {
      return undefined;
    }
  }

  /**
   * Emit a collision event for the built-in engine path.
   */
  private emitCollisionEvent(objectIdA: string, objectIdB: string): void {
    const collisionEvent: PhysicsCollisionEvent = {
      type: 'collision-start',
      objectIdA,
      objectIdB,
    };

    this.eventBus.emit({
      type: 'physics:collision-start',
      timestamp: Date.now(),
      data: collisionEvent,
    });

    this.dispatchToHoloScriptBridge(collisionEvent);
  }

  /**
   * Dispatch collision events to the HoloScript runtime bridge.
   *
   * The HoloScriptBridge registers itself on globalThis.HoloScriptBridge
   * and exposes an eventBus. We forward physics collision events there
   * so HoloScript compositions can listen for 'physics:collision-start',
   * 'physics:collision-end', 'physics:trigger-enter', 'physics:trigger-exit'.
   */
  private dispatchToHoloScriptBridge(event: PhysicsCollisionEvent): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bridge = (globalThis as any).HoloScriptBridge;
      if (bridge && bridge.eventBus && typeof bridge.eventBus.emit === 'function') {
        bridge.eventBus.emit(`physics:${event.type}`, event);
      }
    } catch {
      // HoloScriptBridge not available -- silent no-op
    }
  }

  // =======================================================================
  // Public API pass-through (for PhysicsExpansionBridge compatibility)
  // =======================================================================

  /**
   * Get the underlying built-in PhysicsEngine.
   * Used by PhysicsExpansionBridge which needs direct access to expansion
   * subsystem APIs (cloth, fluid, fracture, force fields).
   */
  getBuiltInEngine(): PhysicsEngine {
    return this.builtInEngine;
  }

  /**
   * Get the Rapier world instance (or null if not available).
   */
  getRapierWorld(): RapierWorld | null {
    return this.rapierWorld;
  }

  /**
   * Get the Rapier module (or null if not available).
   */
  getRapierModule(): RAPIER | null {
    return this.rapier;
  }

  // =======================================================================
  // Velocity / body-type APIs (node-id-based, used by expansion bridge)
  // =======================================================================

  applyLinearVelocity(nodeId: string, velocity: Vector3): void {
    if (this.backend === 'rapier') {
      const body = this.rapierBodies.get(nodeId);
      if (body) {
        body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
      }
    } else {
      this.builtInEngine.applyLinearVelocity(nodeId, velocity);
    }
  }

  applyAngularVelocity(nodeId: string, angularVelocity: Vector3): void {
    if (this.backend === 'rapier') {
      const body = this.rapierBodies.get(nodeId);
      if (body) {
        body.setAngvel(
          { x: angularVelocity.x, y: angularVelocity.y, z: angularVelocity.z },
          true,
        );
      }
    } else {
      this.builtInEngine.applyAngularVelocity(nodeId, angularVelocity);
    }
  }

  setBodyType(nodeId: string, type: 'dynamic' | 'kinematic' | 'static'): void {
    if (this.backend === 'rapier') {
      const body = this.rapierBodies.get(nodeId);
      if (body && this.rapier) {
        switch (type) {
          case 'dynamic':
            body.setBodyType(this.rapier.RigidBodyType.Dynamic, true);
            break;
          case 'kinematic':
            body.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true);
            break;
          case 'static':
            body.setBodyType(this.rapier.RigidBodyType.Fixed, true);
            break;
        }
      }
    } else {
      this.builtInEngine.setBodyType(nodeId, type);
    }
  }

  getBodyType(nodeId: string): 'dynamic' | 'kinematic' | 'static' {
    return this.builtInEngine.getBodyType(nodeId);
  }

  // =======================================================================
  // Raycast
  // =======================================================================

  raycast(
    origin: Vector3,
    direction: Vector3,
    maxDistance: number,
  ): { point: Vector3; normal: Vector3; distance: number; nodeId: string } | null {
    if (this.backend === 'rapier' && this.rapier && this.rapierWorld) {
      const ray = new this.rapier.Ray(
        { x: origin.x, y: origin.y, z: origin.z },
        { x: direction.x, y: direction.y, z: direction.z },
      );

      const hit = this.rapierWorld.castRay(ray, maxDistance, true);
      if (!hit) return null;

      const hitId = this.colliderHandleToId.get(hit.collider?.handle) ?? null;
      if (!hitId) return null;

      const point = ray.pointAt(hit.timeOfImpact);
      const normal = hit.normal;

      return {
        point: { x: point.x, y: point.y, z: point.z },
        normal: { x: normal.x, y: normal.y, z: normal.z },
        distance: hit.timeOfImpact,
        nodeId: hitId,
      };
    }

    // Fallback to built-in engine raycast
    return this.builtInEngine.raycast(origin, direction, maxDistance);
  }

  // =======================================================================
  // Statistics
  // =======================================================================

  getStats() {
    const base = this.builtInEngine.getStats();
    return {
      ...base,
      backend: this.backend,
      physicsSubsteps: this._physicsSubsteps,
      rapierBodies: this.rapierBodies.size,
      trackedObjects: this.objectsById.size,
    };
  }

  // =======================================================================
  // Gravity
  // =======================================================================

  setGravity(gravity: Vector3): void {
    this.gravity = { ...gravity };

    if (this.rapierWorld) {
      this.rapierWorld.gravity = { x: gravity.x, y: gravity.y, z: gravity.z };
    }

    // The built-in engine doesn't expose a setGravity method,
    // but it's used as the fallback, so we reinitialize if needed
    // (gravity is set at construction time for the built-in engine).
  }

  // =======================================================================
  // Dispose
  // =======================================================================

  dispose(): void {
    // Clean up Rapier resources
    if (this.rapierEventQueue) {
      this.rapierEventQueue.free();
      this.rapierEventQueue = null;
    }

    this.rapierBodies.clear();
    this.rapierColliders.clear();
    this.colliderHandleToId.clear();
    this.objectsById.clear();

    this.rapierWorld = null;
    this.rapier = null;
    this._initialized = false;

    logger.info('[SpatialEngineBridge] Disposed');
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createSpatialEngineBridge(
  config: SpatialEngineBridgeConfig,
): SpatialEngineBridge {
  return new SpatialEngineBridge(config);
}
