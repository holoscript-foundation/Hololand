/**
 * PhysicsEngine - Physics simulation for spatial objects
 *
 * Supports core rigid-body dynamics (gravity, collisions) plus expansion
 * subsystems consumed by PhysicsExpansionBridge (Phase 13):
 *   - Cloth bodies (PBD cloth simulation state)
 *   - Fluid volumes (SPH / FLIP / MPM state)
 *   - Mesh fracture (Voronoi decomposition fragments)
 *   - Force fields (directional wind, radial, vortex)
 *   - Node-id-based velocity, body-type, and raycast APIs
 */

import { logger } from './logger';
import type { SpatialObject } from './SpatialObject';
import type { Vector3 } from './types';

// ---------------------------------------------------------------------------
// Expansion subsystem state types
// ---------------------------------------------------------------------------

export interface ClothBodyConfig {
  resolution: number;
  stiffness: number;
  damping: number;
  mass: number;
  gravityScale: number;
  selfCollision: boolean;
  pinVertices: number[];
}

export interface ClothBodyState extends ClothBodyConfig {
  windForce: Vector3;
  windResponse: number;
  torn: boolean;
}

export interface FluidVolumeConfig {
  method: 'sph' | 'flip' | 'mpm';
  particleCount: number;
  viscosity: number;
  surfaceTension: number;
  density: number;
}

export interface FractureConfig {
  mode: 'voronoi' | 'predefined' | 'procedural';
  fragmentCount: number;
  impactPoint: Vector3;
  explosionForce: number;
}

export interface ForceFieldConfig {
  type: string;
  direction: Vector3;
  strength: number;
  turbulence: number;
  radius: number;
  falloff: 'linear' | 'quadratic' | 'none';
}

export type BodyType = 'dynamic' | 'kinematic' | 'static';

// ---------------------------------------------------------------------------
// Raycast hit result
// ---------------------------------------------------------------------------

export interface RaycastHit {
  point: Vector3;
  normal: Vector3;
  distance: number;
  nodeId: string;
}

// ---------------------------------------------------------------------------
// PhysicsEngine
// ---------------------------------------------------------------------------

export class PhysicsEngine {
  private gravity: Vector3;
  private objects: Set<SpatialObject>;

  // Node-id index for bridge lookups
  private objectIndex: Map<string, SpatialObject> = new Map();

  // Expansion subsystem state
  private clothBodies: Map<string, ClothBodyState> = new Map();
  private fluidVolumes: Map<string, FluidVolumeConfig> = new Map();
  private forceFields: Map<string, ForceFieldConfig> = new Map();
  private bodyTypes: Map<string, BodyType> = new Map();

  constructor(gravity: Vector3) {
    this.gravity = gravity;
    this.objects = new Set();

    logger.debug('[PhysicsEngine] Initialized', { gravity });
  }

  /**
   * Add object to physics simulation
   */
  addObject(object: SpatialObject): void {
    if (!object.hasPhysics()) {
      logger.warn('[PhysicsEngine] Object has no physics', { objectId: object.id });
      return;
    }

    this.objects.add(object);
    this.objectIndex.set(object.id, object);
    logger.debug('[PhysicsEngine] Object added', { objectId: object.id });
  }

  /**
   * Remove object from physics simulation
   */
  removeObject(object: SpatialObject): boolean {
    const removed = this.objects.delete(object);
    if (removed) {
      this.objectIndex.delete(object.id);
      logger.debug('[PhysicsEngine] Object removed', { objectId: object.id });
    }
    return removed;
  }

  /**
   * Step the physics simulation
   */
  step(deltaTime: number): void {
    for (const object of this.objects) {
      this.updateObject(object, deltaTime);
    }

    // Check for collisions (simplified)
    this.checkCollisions();
  }

  /**
   * Update a single object's physics
   */
  private updateObject(object: SpatialObject, deltaTime: number): void {
    const physics = object.getPhysics();
    if (!physics || !physics.enabled) return;

    const velocity = physics.velocity ?? { x: 0, y: 0, z: 0 };
    // Note: mass is available in physics.mass but not used in simplified physics

    // Apply gravity
    velocity.y += this.gravity.y * deltaTime;

    // Apply friction (simplified air resistance)
    const friction = physics.friction ?? 0.01;
    velocity.x *= 1 - friction;
    velocity.y *= 1 - friction;
    velocity.z *= 1 - friction;

    // Update position based on velocity
    const position = object.getPosition();
    position.x += velocity.x * deltaTime;
    position.y += velocity.y * deltaTime;
    position.z += velocity.z * deltaTime;

    object.setPosition(position);
    object.setVelocity(velocity);

    // Ground collision check (simplified)
    if (position.y < 0) {
      position.y = 0;
      velocity.y = -velocity.y * (physics.restitution ?? 0.5); // Bounce
      object.setPosition(position);
      object.setVelocity(velocity);
    }
  }

  /**
   * Check for collisions between objects (simplified AABB)
   */
  private checkCollisions(): void {
    const objectArray = Array.from(this.objects);

    for (let i = 0; i < objectArray.length; i++) {
      for (let j = i + 1; j < objectArray.length; j++) {
        const objA = objectArray[i];
        const objB = objectArray[j];

        if (this.checkAABBCollision(objA, objB)) {
          this.resolveCollision(objA, objB);
        }
      }
    }
  }

  /**
   * Check AABB collision between two objects
   */
  private checkAABBCollision(objA: SpatialObject, objB: SpatialObject): boolean {
    const boxA = objA.getBoundingBox();
    const boxB = objB.getBoundingBox();

    return (
      boxA.min.x <= boxB.max.x &&
      boxA.max.x >= boxB.min.x &&
      boxA.min.y <= boxB.max.y &&
      boxA.max.y >= boxB.min.y &&
      boxA.min.z <= boxB.max.z &&
      boxA.max.z >= boxB.min.z
    );
  }

  /**
   * Resolve collision between two objects (simplified)
   */
  private resolveCollision(objA: SpatialObject, objB: SpatialObject): void {
    const physicsA = objA.getPhysics();
    const physicsB = objB.getPhysics();

    if (!physicsA || !physicsB) return;

    const velA = physicsA.velocity ?? { x: 0, y: 0, z: 0 };
    const velB = physicsB.velocity ?? { x: 0, y: 0, z: 0 };

    // Simple elastic collision response
    const massA = physicsA.mass ?? 1;
    const massB = physicsB.mass ?? 1;
    const totalMass = massA + massB;

    const newVelA = {
      x: ((massA - massB) * velA.x + 2 * massB * velB.x) / totalMass,
      y: ((massA - massB) * velA.y + 2 * massB * velB.y) / totalMass,
      z: ((massA - massB) * velA.z + 2 * massB * velB.z) / totalMass,
    };

    const newVelB = {
      x: ((massB - massA) * velB.x + 2 * massA * velA.x) / totalMass,
      y: ((massB - massA) * velB.y + 2 * massA * velA.y) / totalMass,
      z: ((massB - massA) * velB.z + 2 * massA * velA.z) / totalMass,
    };

    objA.setVelocity(newVelA);
    objB.setVelocity(newVelB);

    logger.debug('[PhysicsEngine] Collision resolved', {
      objA: objA.id,
      objB: objB.id,
    });
  }

  /**
   * Get physics statistics
   */
  getStats() {
    return {
      objectCount: this.objects.size,
      gravity: this.gravity,
      clothBodies: this.clothBodies.size,
      fluidVolumes: this.fluidVolumes.size,
      forceFields: this.forceFields.size,
    };
  }

  // =========================================================================
  // Node-id-based APIs (consumed by PhysicsExpansionBridge)
  // =========================================================================

  /**
   * Resolve a SpatialObject by its node ID.
   * Returns undefined when the node is not tracked (e.g. a generated fragment
   * that only exists inside the expansion bridge).
   */
  private resolveObject(nodeId: string): SpatialObject | undefined {
    return this.objectIndex.get(nodeId);
  }

  // ---- Velocity & body-type -----------------------------------------------

  /**
   * Set the linear velocity of a physics body by node ID.
   */
  applyLinearVelocity(nodeId: string, velocity: Vector3): void {
    const obj = this.resolveObject(nodeId);
    if (obj) {
      obj.setVelocity(velocity);
    }
    logger.debug('[PhysicsEngine] applyLinearVelocity', { nodeId, velocity });
  }

  /**
   * Set the angular velocity of a physics body by node ID.
   *
   * The simplified SpatialObject model has no angular-velocity field, so this
   * stores the intent for downstream consumers (e.g. a renderer adapter) but
   * does not yet affect the position-based integration loop.
   */
  applyAngularVelocity(nodeId: string, angularVelocity: Vector3): void {
    const obj = this.resolveObject(nodeId);
    if (obj) {
      obj.setMetadata('angularVelocity', angularVelocity);
    }
    logger.debug('[PhysicsEngine] applyAngularVelocity', { nodeId, angularVelocity });
  }

  /**
   * Change a body between dynamic / kinematic / static.
   */
  setBodyType(nodeId: string, type: BodyType): void {
    this.bodyTypes.set(nodeId, type);
    logger.debug('[PhysicsEngine] setBodyType', { nodeId, type });
  }

  /**
   * Get the body type for a node, defaulting to 'dynamic'.
   */
  getBodyType(nodeId: string): BodyType {
    return this.bodyTypes.get(nodeId) ?? 'dynamic';
  }

  // ---- Raycast ------------------------------------------------------------

  /**
   * Cast a ray through the physics world and return the closest hit.
   *
   * Uses a simplified ray-vs-AABB test against all tracked objects.
   */
  raycast(origin: Vector3, direction: Vector3, maxDistance: number): RaycastHit | null {
    let closest: RaycastHit | null = null;

    // Normalise direction
    const len = Math.sqrt(
      direction.x * direction.x + direction.y * direction.y + direction.z * direction.z
    );
    if (len === 0) return null;
    const dir = { x: direction.x / len, y: direction.y / len, z: direction.z / len };

    for (const obj of this.objects) {
      const box = obj.getBoundingBox();
      const hit = this.rayAABB(origin, dir, box.min, box.max);
      if (hit !== null && hit <= maxDistance) {
        if (closest === null || hit < closest.distance) {
          // Compute hit point
          const point: Vector3 = {
            x: origin.x + dir.x * hit,
            y: origin.y + dir.y * hit,
            z: origin.z + dir.z * hit,
          };
          closest = {
            point,
            normal: { x: 0, y: 1, z: 0 }, // simplified – always up
            distance: hit,
            nodeId: obj.id,
          };
        }
      }
    }

    return closest;
  }

  /**
   * Ray-AABB intersection test. Returns distance to intersection or null.
   */
  private rayAABB(origin: Vector3, dir: Vector3, min: Vector3, max: Vector3): number | null {
    let tmin = -Infinity;
    let tmax = Infinity;

    for (const axis of ['x', 'y', 'z'] as const) {
      const invD = 1 / dir[axis];
      let t0 = (min[axis] - origin[axis]) * invD;
      let t1 = (max[axis] - origin[axis]) * invD;
      if (invD < 0) {
        const tmp = t0;
        t0 = t1;
        t1 = tmp;
      }
      tmin = Math.max(tmin, t0);
      tmax = Math.min(tmax, t1);
      if (tmax < tmin) return null;
    }

    return tmin >= 0 ? tmin : null;
  }

  // ---- Cloth bodies -------------------------------------------------------

  /**
   * Register a cloth body for PBD simulation.
   */
  addClothBody(nodeId: string, config: ClothBodyConfig): void {
    this.clothBodies.set(nodeId, {
      ...config,
      windForce: { x: 0, y: 0, z: 0 },
      windResponse: 0,
      torn: false,
    });
    logger.debug('[PhysicsEngine] addClothBody', { nodeId });
  }

  /**
   * Apply a wind force to a cloth body.
   */
  applyClothWind(nodeId: string, windForce: Vector3, windResponse: number): void {
    const cloth = this.clothBodies.get(nodeId);
    if (cloth) {
      cloth.windForce = { ...windForce };
      cloth.windResponse = windResponse;
    }
  }

  /**
   * Tear a cloth body at a given point.
   */
  tearCloth(nodeId: string, _tearPoint: Vector3): void {
    const cloth = this.clothBodies.get(nodeId);
    if (cloth) {
      cloth.torn = true;
      logger.debug('[PhysicsEngine] tearCloth', { nodeId });
    }
  }

  /**
   * Remove a cloth body from the simulation.
   */
  removeClothBody(nodeId: string): void {
    this.clothBodies.delete(nodeId);
    logger.debug('[PhysicsEngine] removeClothBody', { nodeId });
  }

  // ---- Fluid volumes ------------------------------------------------------

  /**
   * Register a fluid volume for SPH / FLIP / MPM simulation.
   */
  addFluidVolume(nodeId: string, config: FluidVolumeConfig): void {
    this.fluidVolumes.set(nodeId, { ...config });
    logger.debug('[PhysicsEngine] addFluidVolume', { nodeId, method: config.method });
  }

  /**
   * Remove a fluid volume from the simulation.
   */
  removeFluidVolume(nodeId: string): void {
    this.fluidVolumes.delete(nodeId);
    logger.debug('[PhysicsEngine] removeFluidVolume', { nodeId });
  }

  // ---- Mesh fracture ------------------------------------------------------

  /**
   * Fracture a mesh using Voronoi decomposition (or other mode).
   *
   * Returns an array of generated fragment node IDs. In this simplified
   * implementation the fragments are virtual IDs; a renderer adapter is
   * responsible for creating the actual visual meshes.
   */
  fractureMesh(nodeId: string, config: FractureConfig): string[] {
    const fragments: string[] = [];
    for (let i = 0; i < config.fragmentCount; i++) {
      fragments.push(`${nodeId}_frag_${i}`);
    }

    logger.debug('[PhysicsEngine] fractureMesh', {
      nodeId,
      mode: config.mode,
      fragments: fragments.length,
    });
    return fragments;
  }

  /**
   * Remove a rigid body (or fragment) by node ID.
   */
  removeBody(nodeId: string): void {
    // Remove from the object index if tracked as a SpatialObject
    const obj = this.objectIndex.get(nodeId);
    if (obj) {
      this.objects.delete(obj);
      this.objectIndex.delete(nodeId);
    }
    // Also clean up any expansion subsystem state keyed by this ID
    this.clothBodies.delete(nodeId);
    this.fluidVolumes.delete(nodeId);
    this.forceFields.delete(nodeId);
    this.bodyTypes.delete(nodeId);
    logger.debug('[PhysicsEngine] removeBody', { nodeId });
  }

  // ---- Force fields -------------------------------------------------------

  /**
   * Add a force field (wind, radial, vortex, etc.).
   */
  addForceField(nodeId: string, config: ForceFieldConfig): void {
    this.forceFields.set(nodeId, { ...config });
    logger.debug('[PhysicsEngine] addForceField', { nodeId, type: config.type });
  }

  /**
   * Remove a force field by node ID.
   */
  removeForceField(nodeId: string): void {
    this.forceFields.delete(nodeId);
    logger.debug('[PhysicsEngine] removeForceField', { nodeId });
  }
}
