import { logger } from './logger';
import { Avatar } from './Avatar';
import type { AvatarConfig } from './types';

export class PresenceManager {
  private avatars: Map<string, Avatar>;

  constructor() {
    this.avatars = new Map();
    logger.info('[PresenceManager] Initialized');
  }

  addAvatar(config: AvatarConfig): Avatar {
    const avatar = new Avatar(config);
    this.avatars.set(avatar.id, avatar);
    logger.info('[PresenceManager] Avatar added', { avatarId: avatar.id });
    return avatar;
  }

  removeAvatar(avatarId: string): boolean {
    return this.avatars.delete(avatarId);
  }

  getAvatar(avatarId: string): Avatar | undefined {
    return this.avatars.get(avatarId);
  }

  getAllAvatars(): Avatar[] {
    return Array.from(this.avatars.values());
  }

  getOnlineCount(): number {
    return Array.from(this.avatars.values()).filter(a => a.getStatus() === 'online').length;
  }
}
