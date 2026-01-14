/**
 * @hololand/social Types
 *
 * Type definitions for social features v2.0
 */

// ============================================================================
// Avatar Types
// ============================================================================

export interface AvatarConfig {
  id?: string;
  userId: string;
  displayName: string;
  position?: Vector3;
  rotation?: Vector3;
  metadata?: Record<string, unknown>;
  appearance?: AvatarAppearance;
}

export interface AvatarAppearance {
  model?: string;
  skinTone?: string;
  hairStyle?: string;
  hairColor?: string;
  outfit?: string;
  accessories?: string[];
}

export type PresenceStatus = 'online' | 'away' | 'busy' | 'dnd' | 'offline';

// ============================================================================
// Friend System Types
// ============================================================================

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  status: FriendRequestStatus;
  message?: string;
  createdAt: number;
  respondedAt?: number;
}

export interface Friend {
  userId: string;
  displayName: string;
  status: PresenceStatus;
  statusMessage?: string;
  avatarUrl?: string;
  addedAt: number;
  lastSeenAt: number;
  isFavorite: boolean;
  mutualFriends?: number;
}

export interface BlockedUser {
  userId: string;
  displayName: string;
  blockedAt: number;
  reason?: string;
}

// ============================================================================
// Party System Types
// ============================================================================

export type PartyPrivacy = 'public' | 'friends_only' | 'invite_only';

export interface PartyConfig {
  name?: string;
  maxMembers?: number;
  privacy?: PartyPrivacy;
  voiceEnabled?: boolean;
}

export interface Party {
  id: string;
  name: string;
  leaderId: string;
  members: PartyMember[];
  maxMembers: number;
  privacy: PartyPrivacy;
  voiceEnabled: boolean;
  voiceChannelId?: string;
  createdAt: number;
  currentWorldId?: string;
}

export interface PartyMember {
  userId: string;
  displayName: string;
  role: 'leader' | 'member';
  joinedAt: number;
  isMuted: boolean;
  isDeafened: boolean;
}

export interface PartyInvite {
  id: string;
  partyId: string;
  partyName: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  createdAt: number;
  expiresAt: number;
}

// ============================================================================
// Emote System Types
// ============================================================================

export type EmoteCategory = 'greeting' | 'expression' | 'dance' | 'action' | 'reaction';

export interface Emote {
  id: string;
  name: string;
  category: EmoteCategory;
  animation: string;
  duration: number; // ms
  icon?: string;
  sound?: string;
  isLooping: boolean;
  unlocked: boolean;
}

export interface Gesture {
  id: string;
  name: string;
  trigger: 'button' | 'voice' | 'motion';
  animation: string;
  duration: number;
  canInterrupt: boolean;
}

export interface EmotePerformed {
  emoteId: string;
  userId: string;
  displayName: string;
  position: Vector3;
  timestamp: number;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'friend_online'
  | 'party_invite'
  | 'party_joined'
  | 'message'
  | 'mention'
  | 'achievement'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: number;
  expiresAt?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  label: string;
  action: string;
  primary?: boolean;
}

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  showInVR: boolean;
  friendRequests: boolean;
  friendOnline: boolean;
  partyInvites: boolean;
  messages: boolean;
  mentions: boolean;
  achievements: boolean;
}

// ============================================================================
// Status Types
// ============================================================================

export interface UserStatus {
  userId: string;
  presence: PresenceStatus;
  statusMessage?: string;
  activity?: StatusActivity;
  lastUpdated: number;
}

export interface StatusActivity {
  type: 'in_world' | 'building' | 'shopping' | 'chatting' | 'idle';
  worldId?: string;
  worldName?: string;
  details?: string;
  startedAt: number;
}

// ============================================================================
// Event Types
// ============================================================================

export interface SocialEvent {
  type: string;
  timestamp: number;
  data?: unknown;
}

export interface SocialEventMap {
  // Friend events
  friendRequestReceived: { request: FriendRequest };
  friendRequestAccepted: { friend: Friend };
  friendRequestRejected: { requestId: string };
  friendRemoved: { userId: string };
  friendOnline: { friend: Friend };
  friendOffline: { userId: string };
  friendStatusChanged: { userId: string; status: PresenceStatus };

  // Party events
  partyInviteReceived: { invite: PartyInvite };
  partyJoined: { party: Party };
  partyLeft: { partyId: string };
  partyMemberJoined: { partyId: string; member: PartyMember };
  partyMemberLeft: { partyId: string; userId: string };
  partyLeaderChanged: { partyId: string; newLeaderId: string };
  partyDisbanded: { partyId: string };

  // Emote events
  emotePerformed: { emote: EmotePerformed };
  gesturePerformed: { userId: string; gesture: Gesture };

  // Notification events
  notificationReceived: { notification: Notification };
  notificationRead: { notificationId: string };
  notificationCleared: { notificationId: string };
}

export type SocialEventType = keyof SocialEventMap;

export type SocialEventHandler<T extends SocialEventType> = (
  event: SocialEventMap[T]
) => void;

// ============================================================================
// Utility Types
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}
