/**
 * @hololand/social
 *
 * Social features for the Hololand metaverse
 * Avatars, presence, and social interactions
 */

export { Avatar } from './Avatar';
export { PresenceManager } from './PresenceManager';
export { setHololandSocialLogger, type HololandSocialLogger } from './logger';
export type { AvatarConfig, PresenceStatus, SocialEvent } from './types';

export const HOLOLAND_SOCIAL_VERSION = '1.0.0-alpha.1';

export function createPresenceManager() {
  const { PresenceManager } = require('./PresenceManager');
  return new PresenceManager();
}

import { Avatar } from './Avatar';
import { PresenceManager } from './PresenceManager';

export default {
  Avatar,
  PresenceManager,
  createPresenceManager,
  HOLOLAND_SOCIAL_VERSION,
};
