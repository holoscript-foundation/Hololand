/**
 * Physics Integration for HoloScript Three.js Adapter
 *
 * Provides physics simulation using Rapier3D
 * with automatic sync to Three.js objects.
 *
 * Rapier is an optional peer dependency - physics features
 * are only available when @dimforge/rapier3d is installed.
 */

import * as THREE from 'three';

// Use any for Rapier types since it's optional
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

/**
 * Physics body configuration
 */
export interface PhysicsBodyConfig {
  type: 'static' | 'dynamic' | 'kinematic';
  mass?: number;
  friction?: number;
  restitution?: number;
  linearDamping?: number;
  angularDamping?: number;
  colliderType?: 'box' | 'sphere' | 'capsule' | 'trimesh' | 'convex';
  isTrigger?: boolean;
}

/**
 * Physics event types
 */
export type PhysicsEventType = 'collision-start' | 'collision-end' | 'trigger-enter' | 'trigger-exit';

export interface PhysicsEvent {
  type: PhysicsEventType;
  bodyA: THREE.Object3D;
  bodyB: THREE.Object3D;
  contact?: {
    point: THREE.Vector3;
    normal: THREE.Vector3;
    impulse: number;
  };
}

/**
 * Physics world manager
 */
export class PhysicsWorld {
  private rapier: RAPIER | null = null;
  private world: RapierWorld | null = null;
  private eventQueue: EventQueue | null = null;
  private bodies: Map<THREE.Object3D, RigidBody> = new Map();
  private colliders: Map<THREE.Object3D, Collider> = new Map();
  /** Reverse map: collider handle -> Object3D for O(1) lookup in raycast and event dispatch */
  private colliderToObject: Map<number, THREE.Object3D> = new Map();
  private eventListeners: Map<PhysicsEventType, Set<(event: PhysicsEvent) => void>> = new Map();
  private gravity: THREE.Vector3;
  private initialized = false;

  constructor(gravity: THREE.Vector3 = new THREE.Vector3(0, -9.81, 0)) {
    this.gravity = gravity;
  }

  /**
   * Initialize the physics world (must be called before use)
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic import of Rapier (optional dependency)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const RAPIER: any = await import('@dimforge/rapier3d' as string);
      await RAPIER.init();

      this.rapier = RAPIER;
      this.world = new RAPIER.World({ x: this.gravity.x, y: this.gravity.y, z: this.gravity.z });
      this.eventQueue = new RAPIER.EventQueue(true);
      this.initialized = true;
    } catch (error) {
      console.warn('Rapier physics not available. Install @dimforge/rapier3d to enable physics.', error);
    }
  }

  /**
   * Check if physics is available
   */
  isAvailable(): boolean {
    return this.initialized && this.world !== null;
  }

  /**
   * Add a physics body to a Three.js object
   */
  addBody(object: THREE.Object3D, config: PhysicsBodyConfig): void {
    if (!this.rapier || !this.world) {
      console.warn('Physics not initialized. Call init() first.');
      return;
    }

    // Create rigid body description
    let bodyDesc;
    switch (config.type) {
      case 'static':
        bodyDesc = this.rapier.RigidBodyDesc.fixed();
        break;
      case 'kinematic':
        bodyDesc = this.rapier.RigidBodyDesc.kinematicPositionBased();
        break;
      case 'dynamic':
      default:
        bodyDesc = this.rapier.RigidBodyDesc.dynamic();
        break;
    }

    // Set position and rotation from object
    const pos = object.position;
    const quat = object.quaternion;
    bodyDesc.setTranslation(pos.x, pos.y, pos.z);
    bodyDesc.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });

    // Set damping
    if (config.linearDamping !== undefined) {
      bodyDesc.setLinearDamping(config.linearDamping);
    }
    if (config.angularDamping !== undefined) {
      bodyDesc.setAngularDamping(config.angularDamping);
    }

    // Create the rigid body
    const rigidBody = this.world.createRigidBody(bodyDesc);
    this.bodies.set(object, rigidBody);

    // Create collider based on object geometry
    const colliderDesc = this.createColliderDesc(object, config);
    if (colliderDesc) {
      if (config.friction !== undefined) {
        colliderDesc.setFriction(config.friction);
      }
      if (config.restitution !== undefined) {
        colliderDesc.setRestitution(config.restitution);
      }
      if (config.isTrigger) {
        colliderDesc.setSensor(true);
      }

      // Enable collision events so the EventQueue receives them
      colliderDesc.setActiveEvents(this.rapier.ActiveEvents.COLLISION_EVENTS);

      const collider = this.world.createCollider(colliderDesc, rigidBody);
      this.colliders.set(object, collider);
      this.colliderToObject.set(collider.handle, object);
    }

    // Store reference for sync
    object.userData.physicsBody = rigidBody;
  }

  /**
   * Create collider description based on object geometry
   */
  private createColliderDesc(object: THREE.Object3D, config: PhysicsBodyConfig) {
    if (!this.rapier) return null;

    // Get bounding box for sizing
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);

    const colliderType = config.colliderType || this.inferColliderType(object);

    switch (colliderType) {
      case 'sphere': {
        const radius = Math.max(size.x, size.y, size.z) / 2;
        return this.rapier.ColliderDesc.ball(radius);
      }
      case 'capsule': {
        const capsuleRadius = Math.max(size.x, size.z) / 2;
        const halfHeight = size.y / 2 - capsuleRadius;
        return this.rapier.ColliderDesc.capsule(Math.max(0, halfHeight), capsuleRadius);
      }
      case 'trimesh': {
        const trimeshDesc = this.createTrimeshDesc(object);
        if (trimeshDesc) return trimeshDesc;
        // Fall through to box if geometry is unavailable
        console.warn('PhysicsWorld: trimesh collider requires BufferGeometry with index; falling back to box.');
        return this.rapier.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
      }
      case 'convex': {
        const convexDesc = this.createConvexHullDesc(object);
        if (convexDesc) return convexDesc;
        // Fall through to box if geometry is unavailable
        console.warn('PhysicsWorld: convex hull collider requires BufferGeometry; falling back to box.');
        return this.rapier.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
      }
      case 'box':
      default: {
        return this.rapier.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2);
      }
    }
  }

  /**
   * Create a trimesh collider description from a Mesh's BufferGeometry.
   * Returns null if the object doesn't have suitable geometry.
   */
  private createTrimeshDesc(object: THREE.Object3D): ReturnType<typeof this.rapier.ColliderDesc.trimesh> | null {
    if (!this.rapier) return null;
    if (!(object instanceof THREE.Mesh)) return null;

    const geometry = object.geometry;
    if (!(geometry instanceof THREE.BufferGeometry)) return null;

    const positionAttr = geometry.getAttribute('position');
    if (!positionAttr) return null;

    // Rapier expects a Float32Array of vertices
    const vertices = new Float32Array(positionAttr.count * 3);
    for (let i = 0; i < positionAttr.count; i++) {
      vertices[i * 3] = positionAttr.getX(i);
      vertices[i * 3 + 1] = positionAttr.getY(i);
      vertices[i * 3 + 2] = positionAttr.getZ(i);
    }

    // Rapier expects a Uint32Array of triangle indices
    const index = geometry.getIndex();
    if (!index) return null; // trimesh requires indexed geometry

    const indices = new Uint32Array(index.count);
    for (let i = 0; i < index.count; i++) {
      indices[i] = index.getX(i);
    }

    return this.rapier.ColliderDesc.trimesh(vertices, indices);
  }

  /**
   * Create a convex hull collider description from a Mesh's BufferGeometry.
   * Returns null if the object doesn't have suitable geometry.
   */
  private createConvexHullDesc(object: THREE.Object3D): ReturnType<typeof this.rapier.ColliderDesc.convexHull> | null {
    if (!this.rapier) return null;
    if (!(object instanceof THREE.Mesh)) return null;

    const geometry = object.geometry;
    if (!(geometry instanceof THREE.BufferGeometry)) return null;

    const positionAttr = geometry.getAttribute('position');
    if (!positionAttr) return null;

    // Rapier expects a Float32Array of points for convex hull computation
    const points = new Float32Array(positionAttr.count * 3);
    for (let i = 0; i < positionAttr.count; i++) {
      points[i * 3] = positionAttr.getX(i);
      points[i * 3 + 1] = positionAttr.getY(i);
      points[i * 3 + 2] = positionAttr.getZ(i);
    }

    // convexHull returns null if the point set is degenerate
    return this.rapier.ColliderDesc.convexHull(points);
  }

  /**
   * Infer collider type from object geometry
   */
  private inferColliderType(object: THREE.Object3D): 'box' | 'sphere' | 'capsule' {
    if (object instanceof THREE.Mesh) {
      const geo = object.geometry;
      if (geo instanceof THREE.SphereGeometry) return 'sphere';
      if (geo instanceof THREE.CapsuleGeometry) return 'capsule';
    }
    return 'box';
  }

  /**
   * Remove a physics body
   */
  removeBody(object: THREE.Object3D): void {
    if (!this.world) return;

    const body = this.bodies.get(object);
    if (body) {
      this.world.removeRigidBody(body);
      this.bodies.delete(object);
    }

    const collider = this.colliders.get(object);
    if (collider) {
      this.colliderToObject.delete(collider.handle);
      this.colliders.delete(object);
    }

    delete object.userData.physicsBody;
  }

  /**
   * Step the physics simulation
   */
  step(deltaTime?: number): void {
    if (!this.world) return;

    // Apply custom timestep when provided
    if (deltaTime !== undefined) {
      this.world.timestep = deltaTime;
    }

    // Step the world with event queue to collect collision events
    if (this.eventQueue) {
      this.world.step(this.eventQueue);
      this.drainCollisionEvents();
    } else {
      this.world.step();
    }

    // Sync Three.js objects with physics bodies
    this.bodies.forEach((body, object) => {
      if (body.isDynamic() || body.isKinematic()) {
        const translation = body.translation();
        const rotation = body.rotation();

        object.position.set(translation.x, translation.y, translation.z);
        object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      }
    });
  }

  /**
   * Drain collision events from the event queue and dispatch to listeners.
   *
   * Rapier's drainCollisionEvents callback receives:
   *   handle1: number  - collider handle of first body
   *   handle2: number  - collider handle of second body
   *   started: boolean - true if collision began, false if ended
   *
   * For sensor (trigger) colliders the events map to trigger-enter / trigger-exit.
   * For solid colliders they map to collision-start / collision-end.
   */
  private drainCollisionEvents(): void {
    if (!this.eventQueue || !this.world) return;

    this.eventQueue.drainCollisionEvents((handle1: number, handle2: number, started: boolean) => {
      const objectA = this.colliderToObject.get(handle1);
      const objectB = this.colliderToObject.get(handle2);

      // Both colliders must map to tracked objects
      if (!objectA || !objectB) return;

      // Determine if either collider is a sensor (trigger)
      const colliderA = this.colliders.get(objectA);
      const colliderB = this.colliders.get(objectB);
      const isTrigger = (colliderA && colliderA.isSensor()) || (colliderB && colliderB.isSensor());

      let eventType: PhysicsEventType;
      if (isTrigger) {
        eventType = started ? 'trigger-enter' : 'trigger-exit';
      } else {
        eventType = started ? 'collision-start' : 'collision-end';
      }

      // Build contact info for solid collision-start events
      let contact: PhysicsEvent['contact'];
      if (!isTrigger && started) {
        contact = this.extractContactInfo(handle1, handle2);
      }

      const event: PhysicsEvent = {
        type: eventType,
        bodyA: objectA,
        bodyB: objectB,
        contact,
      };

      this.emitEvent(event);
    });
  }

  /**
   * Extract contact point, normal, and impulse from the narrow-phase contact pair.
   */
  private extractContactInfo(
    handle1: number,
    handle2: number
  ): PhysicsEvent['contact'] | undefined {
    if (!this.world) return undefined;

    try {
      const contactPair = this.world.narrowPhase?.contactPair(handle1, handle2);
      if (!contactPair) return undefined;

      // Iterate manifolds to find the deepest contact
      let deepestPoint: { point: THREE.Vector3; normal: THREE.Vector3; impulse: number } | undefined;
      let maxImpulse = -Infinity;

      contactPair.forEachManifold(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (manifold: any) => {
          const normal = manifold.normal();
          const numPoints = manifold.numSolverContacts?.() ?? manifold.numContacts?.() ?? 0;

          for (let i = 0; i < numPoints; i++) {
            const pt = manifold.solverContactPoint?.(i) ?? manifold.contactPoint?.(i);
            const impulse = manifold.solverContactImpulse?.(i) ?? manifold.contactImpulse?.(i) ?? 0;

            if (pt && impulse > maxImpulse) {
              maxImpulse = impulse;
              deepestPoint = {
                point: new THREE.Vector3(pt.x, pt.y, pt.z),
                normal: new THREE.Vector3(normal.x, normal.y, normal.z),
                impulse,
              };
            }
          }
        }
      );

      return deepestPoint;
    } catch {
      // Contact info is best-effort; gracefully degrade
      return undefined;
    }
  }

  /**
   * Emit a physics event to all registered listeners
   */
  private emitEvent(event: PhysicsEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (!listeners) return;
    listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error(`PhysicsWorld: Error in ${event.type} listener:`, error);
      }
    });
  }

  /**
   * Apply a force to a body
   */
  applyForce(object: THREE.Object3D, force: THREE.Vector3, point?: THREE.Vector3): void {
    const body = this.bodies.get(object);
    if (!body || !body.isDynamic()) return;

    if (point) {
      body.applyForceAtPoint({ x: force.x, y: force.y, z: force.z }, { x: point.x, y: point.y, z: point.z }, true);
    } else {
      body.applyForce({ x: force.x, y: force.y, z: force.z }, true);
    }
  }

  /**
   * Apply an impulse to a body
   */
  applyImpulse(object: THREE.Object3D, impulse: THREE.Vector3, point?: THREE.Vector3): void {
    const body = this.bodies.get(object);
    if (!body || !body.isDynamic()) return;

    if (point) {
      body.applyImpulseAtPoint({ x: impulse.x, y: impulse.y, z: impulse.z }, { x: point.x, y: point.y, z: point.z }, true);
    } else {
      body.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
    }
  }

  /**
   * Set velocity of a body
   */
  setVelocity(object: THREE.Object3D, velocity: THREE.Vector3): void {
    const body = this.bodies.get(object);
    if (!body) return;
    body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
  }

  /**
   * Get velocity of a body
   */
  getVelocity(object: THREE.Object3D): THREE.Vector3 | null {
    const body = this.bodies.get(object);
    if (!body) return null;
    const vel = body.linvel();
    return new THREE.Vector3(vel.x, vel.y, vel.z);
  }

  /**
   * Set angular velocity of a body
   */
  setAngularVelocity(object: THREE.Object3D, angularVelocity: THREE.Vector3): void {
    const body = this.bodies.get(object);
    if (!body) return;
    body.setAngvel({ x: angularVelocity.x, y: angularVelocity.y, z: angularVelocity.z }, true);
  }

  /**
   * Add event listener
   */
  on(event: PhysicsEventType, callback: (event: PhysicsEvent) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    return () => this.eventListeners.get(event)?.delete(callback);
  }

  /**
   * Set gravity
   */
  setGravity(gravity: THREE.Vector3): void {
    this.gravity.copy(gravity);
    if (this.world) {
      this.world.gravity = { x: gravity.x, y: gravity.y, z: gravity.z };
    }
  }

  /**
   * Raycast into the physics world
   */
  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number = 100
  ): { object: THREE.Object3D; point: THREE.Vector3; normal: THREE.Vector3; distance: number } | null {
    if (!this.rapier || !this.world) return null;

    const ray = new this.rapier.Ray(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: direction.x, y: direction.y, z: direction.z }
    );

    const hit = this.world.castRay(ray, maxDistance, true);
    if (!hit) return null;

    // O(1) reverse lookup: collider handle -> Three.js object
    const hitObject = this.colliderToObject.get(hit.collider?.handle) ?? null;
    if (!hitObject) return null;

    const point = ray.pointAt(hit.timeOfImpact);
    const normal = hit.normal;

    return {
      object: hitObject,
      point: new THREE.Vector3(point.x, point.y, point.z),
      normal: new THREE.Vector3(normal.x, normal.y, normal.z),
      distance: hit.timeOfImpact,
    };
  }

  /**
   * Dispose of physics resources
   */
  dispose(): void {
    if (this.eventQueue) {
      this.eventQueue.free();
      this.eventQueue = null;
    }
    this.bodies.clear();
    this.colliders.clear();
    this.colliderToObject.clear();
    this.world = null;
    this.rapier = null;
    this.initialized = false;
  }
}

/**
 * Create a physics world instance
 */
export function createPhysicsWorld(gravity?: THREE.Vector3): PhysicsWorld {
  return new PhysicsWorld(gravity);
}
