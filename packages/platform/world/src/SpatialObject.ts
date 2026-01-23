/**
 * SpatialObject - Objects that exist in the Hololand world
 */

import { logger } from './logger';
import type { Vector3, Quaternion, BoundingBox } from './types';

export interface SpatialObjectConfig {
  id?: string;
  type: string;
  position?: Vector3;
  rotation?: Quaternion;
  scale?: Vector3;
  metadata?: Record<string, any>;
  physics?: {
    enabled: boolean;
    mass?: number;
    velocity?: Vector3;
    friction?: number;
    restitution?: number;
  };
  interactive?: boolean;
  visible?: boolean;
}

export class SpatialObject {
  public readonly id: string;
  public readonly type: string;
  private position: Vector3;
  private rotation: Quaternion;
  private scale: Vector3;
  private metadata: Record<string, any>;
  private physics: SpatialObjectConfig['physics'];
  private interactive: boolean;
  private visible: boolean;
  private active: boolean;
  private parent: SpatialObject | null;
  private children: Set<SpatialObject>;

  constructor(config: SpatialObjectConfig) {
    this.id = config.id ?? this.generateId();
    this.type = config.type;
    this.position = config.position ?? { x: 0, y: 0, z: 0 };
    this.rotation = config.rotation ?? { x: 0, y: 0, z: 0, w: 1 };
    this.scale = config.scale ?? { x: 1, y: 1, z: 1 };
    this.metadata = config.metadata ?? {};
    this.physics = config.physics;
    this.interactive = config.interactive ?? false;
    this.visible = config.visible ?? true;
    this.active = true;
    this.parent = null;
    this.children = new Set();

    logger.debug('[SpatialObject] Created', {
      id: this.id,
      type: this.type,
      position: this.position,
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `obj_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get position
   */
  getPosition(): Vector3 {
    return { ...this.position };
  }

  /**
   * Set position
   */
  setPosition(position: Vector3): void {
    this.position = { ...position };
  }

  /**
   * Get rotation
   */
  getRotation(): Quaternion {
    return { ...this.rotation };
  }

  /**
   * Set rotation
   */
  setRotation(rotation: Quaternion): void {
    this.rotation = { ...rotation };
  }

  /**
   * Get scale
   */
  getScale(): Vector3 {
    return { ...this.scale };
  }

  /**
   * Set scale
   */
  setScale(scale: Vector3): void {
    this.scale = { ...scale };
  }

  /**
   * Get metadata
   */
  getMetadata(): Record<string, any> {
    return { ...this.metadata };
  }

  /**
   * Set metadata value
   */
  setMetadata(key: string, value: any): void {
    this.metadata[key] = value;
  }

  /**
   * Check if object has physics
   */
  hasPhysics(): boolean {
    return this.physics?.enabled ?? false;
  }

  /**
   * Get physics properties
   */
  getPhysics(): SpatialObjectConfig['physics'] {
    return this.physics ? { ...this.physics } : undefined;
  }

  /**
   * Update physics velocity
   */
  setVelocity(velocity: Vector3): void {
    if (this.physics) {
      this.physics.velocity = { ...velocity };
    }
  }

  /**
   * Get velocity
   */
  getVelocity(): Vector3 | undefined {
    return this.physics?.velocity ? { ...this.physics.velocity } : undefined;
  }

  /**
   * Check if object is interactive
   */
  isInteractive(): boolean {
    return this.interactive;
  }

  /**
   * Set interactive
   */
  setInteractive(interactive: boolean): void {
    this.interactive = interactive;
  }

  /**
   * Check if object is visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Set visible
   */
  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  /**
   * Check if object is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Set active
   */
  setActive(active: boolean): void {
    this.active = active;
  }

  /**
   * Get bounding box
   */
  getBoundingBox(): BoundingBox {
    const halfScale = {
      x: this.scale.x / 2,
      y: this.scale.y / 2,
      z: this.scale.z / 2,
    };

    return {
      min: {
        x: this.position.x - halfScale.x,
        y: this.position.y - halfScale.y,
        z: this.position.z - halfScale.z,
      },
      max: {
        x: this.position.x + halfScale.x,
        y: this.position.y + halfScale.y,
        z: this.position.z + halfScale.z,
      },
    };
  }

  /**
   * Calculate distance to another object
   */
  distanceTo(other: SpatialObject): number {
    const dx = this.position.x - other.position.x;
    const dy = this.position.y - other.position.y;
    const dz = this.position.z - other.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Add child object
   */
  addChild(child: SpatialObject): void {
    if (child.parent) {
      child.parent.removeChild(child);
    }
    this.children.add(child);
    child.parent = this;
  }

  /**
   * Remove child object
   */
  removeChild(child: SpatialObject): boolean {
    const removed = this.children.delete(child);
    if (removed) {
      child.parent = null;
    }
    return removed;
  }

  /**
   * Get children
   */
  getChildren(): SpatialObject[] {
    return Array.from(this.children);
  }

  /**
   * Get parent
   */
  getParent(): SpatialObject | null {
    return this.parent;
  }

  /**
   * Update object (called every tick)
   */
  update(_deltaTime: number): void {
    // Override in subclasses
  }

  /**
   * Destroy object
   */
  destroy(): void {
    // Remove all children
    for (const child of this.children) {
      child.parent = null;
    }
    this.children.clear();

    // Remove from parent
    if (this.parent) {
      this.parent.removeChild(this);
    }

    this.active = false;

    logger.debug('[SpatialObject] Destroyed', { id: this.id });
  }

  /**
   * Serialize to JSON
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      position: this.position,
      rotation: this.rotation,
      scale: this.scale,
      metadata: this.metadata,
      physics: this.physics,
      interactive: this.interactive,
      visible: this.visible,
      active: this.active,
      childCount: this.children.size,
    };
  }
}
