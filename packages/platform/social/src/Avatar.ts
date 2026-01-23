/**
 * @hololand/social Avatar
 *
 * Avatar representation for users in the metaverse
 */

import { logger } from './logger';
import type { AvatarConfig, AvatarAppearance, PresenceStatus, Vector3 } from './types';

export class Avatar {
  public readonly id: string;
  public readonly userId: string;
  public displayName: string;
  private position: Vector3;
  private rotation: Vector3;
  private status: PresenceStatus;
  private metadata: Record<string, unknown>;
  private appearance: AvatarAppearance;

  constructor(config: AvatarConfig) {
    this.id = config.id ?? `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    this.userId = config.userId;
    this.displayName = config.displayName;
    this.position = config.position ?? { x: 0, y: 0, z: 0 };
    this.rotation = config.rotation ?? { x: 0, y: 0, z: 0 };
    this.status = 'online';
    this.metadata = config.metadata ?? {};
    this.appearance = config.appearance ?? {};
    logger.info('[Avatar] Created', { id: this.id, userId: this.userId });
  }

  // Position
  getPosition(): Vector3 {
    return { ...this.position };
  }

  setPosition(pos: Vector3): void {
    this.position = pos;
  }

  // Rotation
  getRotation(): Vector3 {
    return { ...this.rotation };
  }

  setRotation(rot: Vector3): void {
    this.rotation = rot;
  }

  // Status
  getStatus(): PresenceStatus {
    return this.status;
  }

  setStatus(status: PresenceStatus): void {
    this.status = status;
  }

  // Appearance
  getAppearance(): AvatarAppearance {
    return { ...this.appearance };
  }

  setAppearance(appearance: Partial<AvatarAppearance>): void {
    this.appearance = { ...this.appearance, ...appearance };
  }

  // Metadata
  getMetadata(): Record<string, unknown> {
    return { ...this.metadata };
  }

  setMetadata(metadata: Record<string, unknown>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  // Serialization
  toJSON(): {
    id: string;
    userId: string;
    displayName: string;
    position: Vector3;
    rotation: Vector3;
    status: PresenceStatus;
    metadata: Record<string, unknown>;
    appearance: AvatarAppearance;
  } {
    return {
      id: this.id,
      userId: this.userId,
      displayName: this.displayName,
      position: this.position,
      rotation: this.rotation,
      status: this.status,
      metadata: this.metadata,
      appearance: this.appearance,
    };
  }
}
