/**
 * @hololand/social v2.0
 *
 * Social features for the Hololand metaverse
 *
 * Features:
 * - Avatar system with appearance customization
 * - Presence management and tracking
 * - Friend system with requests and blocking
 * - Party system with group voice chat
 * - Emotes and gestures for non-verbal communication
 * - Notifications and status messages
 */

// Core systems
export { Avatar } from './Avatar';
export { PresenceManager } from './PresenceManager';

// v2.0 systems
export { FriendSystem } from './FriendSystem';
export { PartySystem } from './PartySystem';
export { EmoteSystem } from './EmoteSystem';
export { NotificationSystem } from './NotificationSystem';

// Logger
export { setHololandSocialLogger } from './logger';
export type { HololandSocialLogger } from './logger';

// Types - Avatar
export type {
  AvatarConfig,
  AvatarAppearance,
  PresenceStatus,
  Vector3,
} from './types';

// Types - Friend System
export type {
  FriendRequestStatus,
  FriendRequest,
  Friend,
  BlockedUser,
} from './types';

// Types - Party System
export type {
  PartyPrivacy,
  PartyConfig,
  Party,
  PartyMember,
  PartyInvite,
} from './types';

// Types - Emote System
export type {
  EmoteCategory,
  Emote,
  Gesture,
  EmotePerformed,
} from './types';

// Types - Notification System
export type {
  NotificationType,
  NotificationPriority,
  Notification,
  NotificationAction,
  NotificationPreferences,
  UserStatus,
  StatusActivity,
} from './types';

// Types - Events
export type {
  SocialEvent,
  SocialEventMap,
  SocialEventType,
  SocialEventHandler,
} from './types';

// Version
export const HOLOLAND_SOCIAL_VERSION = '2.0.0-alpha.1';

// Factory functions
export function createPresenceManager(): PresenceManager {
  return new PresenceManager();
}

export function createFriendSystem(userId: string, displayName: string): FriendSystem {
  return new FriendSystem(userId, displayName);
}

export function createPartySystem(userId: string, displayName: string): PartySystem {
  return new PartySystem(userId, displayName);
}

export function createEmoteSystem(userId: string, displayName: string): EmoteSystem {
  return new EmoteSystem(userId, displayName);
}

export function createNotificationSystem(userId: string): NotificationSystem {
  return new NotificationSystem(userId);
}

// Default export
import { Avatar } from './Avatar';
import { PresenceManager } from './PresenceManager';
import { FriendSystem } from './FriendSystem';
import { PartySystem } from './PartySystem';
import { EmoteSystem } from './EmoteSystem';
import { NotificationSystem } from './NotificationSystem';

export default {
  Avatar,
  PresenceManager,
  FriendSystem,
  PartySystem,
  EmoteSystem,
  NotificationSystem,
  createPresenceManager,
  createFriendSystem,
  createPartySystem,
  createEmoteSystem,
  createNotificationSystem,
  HOLOLAND_SOCIAL_VERSION,
};
