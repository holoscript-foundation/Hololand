/**
 * PhysicsEngine - Simple physics simulation for spatial objects
 */

import { logger } from './logger';
import type { SpatialObject } from './SpatialObject';
import type { Vector3 } from './types';

export class PhysicsEngine {
  private gravity: Vector3;
  private objects: Set<SpatialObject>;

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
    logger.debug('[PhysicsEngine] Object added', { objectId: object.id });
  }

  /**
   * Remove object from physics simulation
   */
  removeObject(object: SpatialObject): boolean {
    const removed = this.objects.delete(object);
    if (removed) {
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
    };
  }
}
