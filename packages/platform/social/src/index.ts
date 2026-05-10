type Listener<T = any> = (payload: T) => void;

class EventHub {
  private listeners = new Map<string, Set<Listener>>();

  on<T = any>(event: string, listener: Listener<T>): () => void {
    const bucket = this.listeners.get(event) ?? new Set<Listener>();
    bucket.add(listener as Listener);
    this.listeners.set(event, bucket);
    return () => bucket.delete(listener as Listener);
  }

  protected emit<T = any>(event: string, payload: T): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
    }
  }
}

export const HOLOLAND_SOCIAL_VERSION = '1.0.0-compat';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline' | 'invisible' | 'dnd';

export interface Friend {
  odId: string;
  displayName: string;
  status: PresenceStatus;
  addedAt: number;
  isFavorite?: boolean;
  lastSeen?: number;
  statusMessage?: string;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  toDisplayName: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export interface BlockedUser {
  userId: string;
  displayName: string;
  blockedAt: number;
  reason?: string;
}

export interface PartyMember {
  userId: string;
  displayName: string;
  role: 'leader' | 'member';
  joinedAt: number;
}

export interface Party {
  id: string;
  name: string;
  privacy: 'public' | 'friends' | 'invite' | 'friends_only' | 'invite_only';
  maxSize: number;
  members: PartyMember[];
  voiceEnabled: boolean;
  createdAt: number;
}

export interface PartyInvite {
  id: string;
  partyId: string;
  partyName: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  toDisplayName: string;
  createdAt: number;
  expiresAt: number;
}

export interface Emote {
  id: string;
  emoteId: string;
  name: string;
  icon: string;
  unlocked: boolean;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high';
  read: boolean;
  createdAt: number;
  data?: Record<string, unknown>;
  actions?: Array<{ label: string; action: string; primary?: boolean }>;
}

export class FriendSystem extends EventHub {
  public friends = new Map<string, Friend>();
  public pendingRequests = new Map<string, FriendRequest>();
  public blockedUsers = new Map<string, BlockedUser>();
  private networkCallback: ((type: string, data: unknown) => void) | null = null;

  constructor(private readonly userId: string, private readonly displayName: string) {
    super();
  }

  setNetworkCallback(callback: (type: string, data: unknown) => void): void {
    this.networkCallback = callback;
  }

  sendFriendRequest(toUserId: string, toDisplayName: string, message?: string): FriendRequest {
    const request: FriendRequest = {
      id: `req_${Date.now()}`,
      fromUserId: this.userId,
      fromDisplayName: this.displayName,
      toUserId,
      toDisplayName,
      message,
      status: 'pending',
      createdAt: Date.now(),
    };
    this.networkCallback?.('friend_request', request);
    return request;
  }

  acceptFriendRequest(requestId: string): void {
    const request = this.pendingRequests.get(requestId);
    if (!request) return;
    request.status = 'accepted';
    const friend: Friend = {
      odId: request.fromUserId,
      displayName: request.fromDisplayName,
      status: 'online',
      addedAt: Date.now(),
    };
    this.friends.set(friend.odId, friend);
    this.pendingRequests.delete(requestId);
    this.emit('friendAdded', { friend });
  }

  rejectFriendRequest(requestId: string): void {
    this.pendingRequests.delete(requestId);
  }

  unblockUser(userId: string): void {
    this.blockedUsers.delete(userId);
  }

  setFavorite(userId: string, favorite: boolean): void {
    const friend = this.friends.get(userId);
    if (friend) friend.isFavorite = favorite;
  }

  getFriends(): Friend[] {
    return Array.from(this.friends.values());
  }

  getOnlineFriends(): Friend[] {
    return this.getFriends().filter((friend) => friend.status === 'online');
  }

  getPendingRequests(): FriendRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  getBlockedUsers(): BlockedUser[] {
    return Array.from(this.blockedUsers.values());
  }

  handleNetworkEvent(type: string, data: unknown): void {
    if (type === 'friend_request') {
      const request = data as FriendRequest;
      this.pendingRequests.set(request.id, request);
      this.emit('friendRequestReceived', { request });
    }
  }
}

export class PartySystem extends EventHub {
  public pendingInvites = new Map<string, PartyInvite>();
  private currentParty: Party | null = null;
  private networkCallback: ((type: string, data: unknown) => void) | null = null;

  constructor(private readonly userId: string, private readonly displayName: string) {
    super();
  }

  setNetworkCallback(callback: (type: string, data: unknown) => void): void {
    this.networkCallback = callback;
  }

  createParty(options: {
    name: string;
    privacy?: Party['privacy'];
    maxSize?: number;
    maxMembers?: number;
    voiceEnabled?: boolean;
  }): Party {
    const party: Party = {
      id: `party_${Date.now()}`,
      name: options.name,
      privacy: options.privacy ?? 'friends',
      maxSize: options.maxSize ?? options.maxMembers ?? 8,
      members: [
        {
          userId: this.userId,
          displayName: this.displayName,
          role: 'leader',
          joinedAt: Date.now(),
        },
      ],
      voiceEnabled: options.voiceEnabled ?? true,
      createdAt: Date.now(),
    };
    this.currentParty = party;
    this.emit('partyCreated', { party });
    return party;
  }

  getCurrentParty(): Party | null {
    return this.currentParty;
  }

  leaveParty(): void {
    const party = this.currentParty;
    this.currentParty = null;
    this.emit('partyLeft', { party });
  }

  sendInvite(toUserId: string, toDisplayName: string): PartyInvite {
    const party = this.currentParty ?? this.createParty({ name: `${this.displayName}'s Party` });
    const invite: PartyInvite = {
      id: `invite_${Date.now()}`,
      partyId: party.id,
      partyName: party.name,
      fromUserId: this.userId,
      fromDisplayName: this.displayName,
      toUserId,
      toDisplayName,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
    this.networkCallback?.('party_invite', invite);
    return invite;
  }

  getPendingInvites(): PartyInvite[] {
    return Array.from(this.pendingInvites.values());
  }

  acceptInvite(inviteId: string): void {
    const invite = this.pendingInvites.get(inviteId);
    if (!invite) return;
    this.currentParty = {
      id: invite.partyId,
      name: invite.partyName,
      privacy: 'invite',
      maxSize: 8,
      members: [
        {
          userId: this.userId,
          displayName: this.displayName,
          role: 'member',
          joinedAt: Date.now(),
        },
      ],
      voiceEnabled: true,
      createdAt: Date.now(),
    };
    this.pendingInvites.delete(inviteId);
    this.emit('partyJoined', { party: this.currentParty });
  }

  declineInvite(inviteId: string): void {
    this.pendingInvites.delete(inviteId);
  }

  handleNetworkEvent(type: string, data: unknown): void {
    if (type === 'party_invite') {
      const invite = data as PartyInvite;
      this.pendingInvites.set(invite.id, invite);
      this.emit('partyInviteReceived', { invite });
    }
  }
}

export class EmoteSystem extends EventHub {
  private emotes: Emote[] = [
    { id: 'wave', emoteId: 'wave', name: 'Wave', icon: 'o/', unlocked: true },
    { id: 'dance', emoteId: 'dance', name: 'Dance', icon: '<>', unlocked: true },
    { id: 'cheer', emoteId: 'cheer', name: 'Cheer', icon: '!!', unlocked: true },
    { id: 'think', emoteId: 'think', name: 'Think', icon: '?', unlocked: true },
  ];

  constructor(private readonly userId: string, private readonly displayName: string) {
    super();
  }

  getEmotes(): Emote[] {
    return [...this.emotes];
  }

  getEmote(emoteId: string): Emote | undefined {
    return this.emotes.find((emote) => emote.id === emoteId || emote.emoteId === emoteId);
  }

  playEmote(emoteId: string): void {
    const emote = this.getEmote(emoteId);
    if (!emote || !emote.unlocked) {
      throw new Error(`Emote unavailable: ${emoteId}`);
    }
    this.emit('emotePerformed', { emote, userId: this.userId, displayName: this.displayName });
  }
}

export class NotificationSystem extends EventHub {
  private notifications: Notification[] = [];
  private presence: PresenceStatus = 'offline';

  constructor(private readonly userId: string) {
    super();
  }

  push(notification: Omit<Notification, 'id' | 'read' | 'createdAt'> & Partial<Notification>): Notification {
    const next: Notification = {
      id: notification.id ?? `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority ?? 'normal',
      read: notification.read ?? false,
      createdAt: notification.createdAt ?? Date.now(),
      data: notification.data,
      actions: notification.actions,
    };
    this.notifications.unshift(next);
    this.emit('notificationReceived', { notification: next });
    return next;
  }

  notifyFriendRequest(fromDisplayName: string, requestId: string): void {
    this.push({
      type: 'friend_request',
      title: 'Friend Request',
      message: `${fromDisplayName} wants to connect`,
      priority: 'normal',
      data: { requestId },
      actions: [
        { label: 'Accept', action: 'accept_friend', primary: true },
        { label: 'Decline', action: 'reject_friend' },
      ],
    });
  }

  notifyPartyInvite(fromDisplayName: string, partyName: string, inviteId: string): void {
    this.push({
      type: 'party_invite',
      title: 'Party Invite',
      message: `${fromDisplayName} invited you to ${partyName}`,
      priority: 'normal',
      data: { inviteId },
      actions: [
        { label: 'Join', action: 'join_party', primary: true },
        { label: 'Decline', action: 'decline_party' },
      ],
    });
  }

  notifyAchievement(title: string, message: string): void {
    this.push({ type: 'achievement', title, message, priority: 'normal' });
  }

  notifyFriendOnline(displayName: string, friendId: string): void {
    this.push({
      type: 'friend_online',
      title: 'Friend Online',
      message: `${displayName} is online`,
      priority: 'low',
      data: { friendId },
    });
  }

  notifySystem(title: string, message: string): void {
    this.push({ type: 'system', title, message, priority: 'low' });
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter((notification) => !notification.read).length;
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find((item) => item.id === notificationId);
    if (notification) {
      notification.read = true;
      this.emit('notificationRead', { notification });
    }
  }

  setPresence(status: PresenceStatus): void {
    this.presence = status;
  }

  setStatusMessage(message?: string): void {
    this.emit('statusMessageChanged', { message });
  }

  setActivityInWorld(worldId: string, worldName: string): void {
    this.emit('activityChanged', { worldId, worldName });
  }
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
