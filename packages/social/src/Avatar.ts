import { logger } from './logger';
import type { AvatarConfig, PresenceStatus } from './types';

export class Avatar {
  public readonly id: string;
  public readonly userId: string;
  public displayName: string;
  private position: { x: number; y: number; z: number };
  private status: PresenceStatus;
  private metadata: Record<string, any>;

  constructor(config: AvatarConfig) {
    this.id = config.id ?? `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    this.userId = config.userId;
    this.displayName = config.displayName;
    this.position = config.position ?? { x: 0, y: 0, z: 0 };
    this.status = 'online';
    this.metadata = config.metadata ?? {};
    logger.info('[Avatar] Created', { id: this.id, userId: this.userId });
  }

  getPosition() { return { ...this.position }; }
  setPosition(pos: { x: number; y: number; z: number }) { this.position = pos; }
  getStatus() { return this.status; }
  setStatus(status: PresenceStatus) { this.status = status; }
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      displayName: this.displayName,
      position: this.position,
      status: this.status,
      metadata: this.metadata,
    };
  }
}
