import {
  createFriendSystem,
  createPartySystem,
  createEmoteSystem,
  createNotificationSystem,
  FriendSystem,
  PartySystem,
  EmoteSystem,
  NotificationSystem,
} from '@hololand/social';
import { getNetworkClient } from './networkService';

// Singleton social systems
let friendSystem: FriendSystem | null = null;
let partySystem: PartySystem | null = null;
let emoteSystem: EmoteSystem | null = null;
let notificationSystem: NotificationSystem | null = null;

/**
 * Initialize all social systems for a user
 */
export function initSocialSystems(userId: string, displayName: string) {
  // Create all systems
  friendSystem = createFriendSystem(userId, displayName);
  partySystem = createPartySystem(userId, displayName);
  emoteSystem = createEmoteSystem(userId, displayName);
  notificationSystem = createNotificationSystem(userId);

  // Set up network callbacks
  const client = getNetworkClient();
  if (client) {
    const networkCallback = (type: string, data: unknown) => {
      client.send({ type, payload: data });
    };

    friendSystem.setNetworkCallback(networkCallback);
    partySystem.setNetworkCallback(networkCallback);
  }

  // Set up notification listeners
  friendSystem.on('friendRequestReceived', ({ request }) => {
    notificationSystem?.notifyFriendRequest(request.fromDisplayName, request.id);
  });

  partySystem.on('partyInviteReceived', ({ invite }) => {
    notificationSystem?.notifyPartyInvite(invite.fromDisplayName, invite.partyName, invite.id);
  });

  // Set initial presence
  notificationSystem.setPresence('online');

  return {
    friends: friendSystem,
    party: partySystem,
    emotes: emoteSystem,
    notifications: notificationSystem,
  };
}

/**
 * Handle incoming network events
 */
export function handleNetworkEvent(type: string, data: unknown) {
  friendSystem?.handleNetworkEvent(type, data);
  partySystem?.handleNetworkEvent(type, data);
}

/**
 * Clean up social systems
 */
export function destroySocialSystems() {
  friendSystem = null;
  partySystem = null;
  emoteSystem = null;
  notificationSystem = null;
}

// Getters for individual systems
export function getFriendSystem(): FriendSystem | null {
  return friendSystem;
}

export function getPartySystem(): PartySystem | null {
  return partySystem;
}

export function getEmoteSystem(): EmoteSystem | null {
  return emoteSystem;
}

export function getNotificationSystem(): NotificationSystem | null {
  return notificationSystem;
}

// Convenience functions

/**
 * Send a friend request
 */
export function sendFriendRequest(toUserId: string, toDisplayName: string, message?: string) {
  return friendSystem?.sendFriendRequest(toUserId, toDisplayName, message);
}

/**
 * Accept a friend request
 */
export function acceptFriendRequest(requestId: string) {
  return friendSystem?.acceptFriendRequest(requestId);
}

/**
 * Get online friends
 */
export function getOnlineFriends() {
  return friendSystem?.getOnlineFriends() || [];
}

/**
 * Create a party
 */
export function createParty(options: {
  name: string;
  maxMembers?: number;
  privacy?: 'public' | 'friends_only' | 'invite_only';
  voiceEnabled?: boolean;
}) {
  return partySystem?.createParty({
    name: options.name,
    maxMembers: options.maxMembers || 8,
    privacy: options.privacy || 'friends_only',
    voiceEnabled: options.voiceEnabled ?? true,
  });
}

/**
 * Invite to party
 */
export function inviteToParty(userId: string, displayName: string) {
  return partySystem?.sendInvite(userId, displayName);
}

/**
 * Play an emote
 */
export function playEmote(emoteId: string) {
  return emoteSystem?.playEmote(emoteId);
}

/**
 * Get all emotes
 */
export function getEmotes() {
  return emoteSystem?.getEmotes() || [];
}

/**
 * Set user presence status
 */
export function setPresence(status: 'online' | 'away' | 'busy' | 'dnd' | 'offline') {
  notificationSystem?.setPresence(status);
}

/**
 * Set activity in world
 */
export function setActivityInWorld(worldId: string, worldName: string) {
  notificationSystem?.setActivityInWorld(worldId, worldName);
}

/**
 * Get unread notifications
 */
export function getUnreadNotifications() {
  return notificationSystem?.getNotifications().filter((n) => !n.read) || [];
}

/**
 * Mark notification as read
 */
export function markNotificationRead(notificationId: string) {
  notificationSystem?.markAsRead(notificationId);
}
