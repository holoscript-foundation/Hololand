/**
 * @hololand/social NotificationSystem
 *
 * Notifications, status messages, and user presence
 */

import { logger } from './logger';
import type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationAction,
  NotificationPreferences,
  UserStatus,
  PresenceStatus,
  StatusActivity,
  SocialEventMap,
  SocialEventType,
  SocialEventHandler,
} from './types';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  sound: true,
  vibration: true,
  showInVR: true,
  friendRequests: true,
  friendOnline: true,
  partyInvites: true,
  messages: true,
  mentions: true,
  achievements: true,
};

export class NotificationSystem {
  private localUserId: string;
  private notifications: Map<string, Notification> = new Map();
  private preferences: NotificationPreferences = { ...DEFAULT_PREFERENCES };
  private status: UserStatus;
  private maxNotifications: number = 100;

  private eventListeners: Map<
    SocialEventType,
    Set<SocialEventHandler<SocialEventType>>
  > = new Map();

  // Callbacks
  private sendRequest?: (type: string, data: unknown) => void;
  private playSound?: (sound: string) => void;
  private showVRNotification?: (notification: Notification) => void;

  constructor(userId: string, displayName?: string) {
    this.localUserId = userId;
    this.status = {
      userId,
      presence: 'online',
      lastUpdated: Date.now(),
    };

    logger.info('[NotificationSystem] Initialized', { userId });
  }

  // ============================================================================
  // Integration
  // ============================================================================

  setNetworkCallback(callback: (type: string, data: unknown) => void): void {
    this.sendRequest = callback;
  }

  setSoundCallback(playSound: (sound: string) => void): void {
    this.playSound = playSound;
  }

  setVRNotificationCallback(
    showVR: (notification: Notification) => void
  ): void {
    this.showVRNotification = showVR;
  }

  handleNetworkEvent(type: string, data: unknown): void {
    switch (type) {
      case 'notification':
        this.handleRemoteNotification(data as Notification);
        break;
      case 'user_status':
        // Handle remote user status updates (for friends list)
        break;
    }
  }

  // ============================================================================
  // Notifications
  // ============================================================================

  push(params: {
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    data?: Record<string, unknown>;
    actions?: NotificationAction[];
    expiresAt?: number;
  }): Notification {
    // Check preferences
    if (!this.preferences.enabled) return this.createNotification(params);
    if (!this.shouldShowNotification(params.type)) {
      return this.createNotification(params);
    }

    const notification: Notification = {
      id: this.generateId('notif'),
      type: params.type,
      priority: params.priority || 'normal',
      title: params.title,
      message: params.message,
      data: params.data,
      read: false,
      createdAt: Date.now(),
      expiresAt: params.expiresAt,
      actions: params.actions,
    };

    this.notifications.set(notification.id, notification);
    this.trimNotifications();

    // Play sound
    if (this.preferences.sound) {
      this.playNotificationSound(notification.priority);
    }

    // Show in VR
    if (this.preferences.showInVR) {
      this.showVRNotification?.(notification);
    }

    this.emit('notificationReceived', { notification });

    logger.debug('[NotificationSystem] Notification pushed', {
      type: notification.type,
    });

    return notification;
  }

  private createNotification(params: {
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    data?: Record<string, unknown>;
    actions?: NotificationAction[];
    expiresAt?: number;
  }): Notification {
    return {
      id: this.generateId('notif'),
      type: params.type,
      priority: params.priority || 'normal',
      title: params.title,
      message: params.message,
      data: params.data,
      read: true, // Mark as read since we're not showing it
      createdAt: Date.now(),
      expiresAt: params.expiresAt,
      actions: params.actions,
    };
  }

  private handleRemoteNotification(notification: Notification): void {
    this.notifications.set(notification.id, notification);
    this.trimNotifications();

    if (this.preferences.sound) {
      this.playNotificationSound(notification.priority);
    }

    if (this.preferences.showInVR) {
      this.showVRNotification?.(notification);
    }

    this.emit('notificationReceived', { notification });
  }

  private shouldShowNotification(type: NotificationType): boolean {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return this.preferences.friendRequests;
      case 'friend_online':
        return this.preferences.friendOnline;
      case 'party_invite':
      case 'party_joined':
        return this.preferences.partyInvites;
      case 'message':
        return this.preferences.messages;
      case 'mention':
        return this.preferences.mentions;
      case 'achievement':
        return this.preferences.achievements;
      case 'system':
        return true;
      default:
        return true;
    }
  }

  private playNotificationSound(priority: NotificationPriority): void {
    const sounds: Record<NotificationPriority, string> = {
      low: 'notif_soft',
      normal: 'notif_default',
      high: 'notif_alert',
      urgent: 'notif_urgent',
    };
    this.playSound?.(sounds[priority]);
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.emit('notificationRead', { notificationId });
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach((notification) => {
      if (!notification.read) {
        notification.read = true;
        this.emit('notificationRead', { notificationId: notification.id });
      }
    });
  }

  clearNotification(notificationId: string): void {
    if (this.notifications.delete(notificationId)) {
      this.emit('notificationCleared', { notificationId });
    }
  }

  clearAll(): void {
    this.notifications.forEach((_, id) => {
      this.emit('notificationCleared', { notificationId: id });
    });
    this.notifications.clear();
  }

  private trimNotifications(): void {
    if (this.notifications.size > this.maxNotifications) {
      // Remove oldest read notifications first
      const sorted = Array.from(this.notifications.entries())
        .sort((a, b) => {
          if (a[1].read !== b[1].read) return a[1].read ? -1 : 1;
          return a[1].createdAt - b[1].createdAt;
        });

      while (this.notifications.size > this.maxNotifications) {
        const [id] = sorted.shift()!;
        this.notifications.delete(id);
      }
    }
  }

  // ============================================================================
  // Status Management
  // ============================================================================

  setPresence(presence: PresenceStatus): void {
    this.status.presence = presence;
    this.status.lastUpdated = Date.now();

    // Broadcast to network
    this.sendRequest?.('status_update', {
      userId: this.localUserId,
      presence,
    });

    logger.debug('[NotificationSystem] Presence updated', { presence });
  }

  setStatusMessage(message: string | undefined): void {
    this.status.statusMessage = message;
    this.status.lastUpdated = Date.now();

    this.sendRequest?.('status_update', {
      userId: this.localUserId,
      statusMessage: message,
    });
  }

  setActivity(activity: StatusActivity | undefined): void {
    this.status.activity = activity;
    this.status.lastUpdated = Date.now();

    this.sendRequest?.('status_update', {
      userId: this.localUserId,
      activity,
    });
  }

  getStatus(): UserStatus {
    return { ...this.status };
  }

  // Activity helpers
  setActivityInWorld(worldId: string, worldName: string): void {
    this.setActivity({
      type: 'in_world',
      worldId,
      worldName,
      startedAt: Date.now(),
    });
  }

  setActivityBuilding(worldId?: string, worldName?: string): void {
    this.setActivity({
      type: 'building',
      worldId,
      worldName,
      details: 'Creating in VR',
      startedAt: Date.now(),
    });
  }

  setActivityIdle(): void {
    this.setActivity({
      type: 'idle',
      startedAt: Date.now(),
    });
  }

  clearActivity(): void {
    this.setActivity(undefined);
  }

  // ============================================================================
  // Preferences
  // ============================================================================

  setPreferences(prefs: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
    logger.debug('[NotificationSystem] Preferences updated', prefs);
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  enableNotifications(enabled: boolean): void {
    this.preferences.enabled = enabled;
  }

  enableSound(enabled: boolean): void {
    this.preferences.sound = enabled;
  }

  enableVRNotifications(enabled: boolean): void {
    this.preferences.showInVR = enabled;
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getNotifications(): Notification[] {
    // Clean up expired
    const now = Date.now();
    this.notifications.forEach((notification, id) => {
      if (notification.expiresAt && notification.expiresAt < now) {
        this.notifications.delete(id);
      }
    });

    return Array.from(this.notifications.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }

  getUnreadNotifications(): Notification[] {
    return this.getNotifications().filter((n) => !n.read);
  }

  getNotificationsByType(type: NotificationType): Notification[] {
    return this.getNotifications().filter((n) => n.type === type);
  }

  getUnreadCount(): number {
    return this.getUnreadNotifications().length;
  }

  hasUnread(): boolean {
    return this.getUnreadCount() > 0;
  }

  getNotification(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  // ============================================================================
  // Convenience Methods for Common Notifications
  // ============================================================================

  notifyFriendRequest(fromDisplayName: string, requestId: string): Notification {
    return this.push({
      type: 'friend_request',
      title: 'Friend Request',
      message: `${fromDisplayName} wants to be your friend`,
      priority: 'normal',
      data: { requestId },
      actions: [
        { id: 'accept', label: 'Accept', action: 'accept_friend', primary: true },
        { id: 'reject', label: 'Reject', action: 'reject_friend' },
      ],
    });
  }

  notifyFriendOnline(displayName: string, userId: string): Notification {
    return this.push({
      type: 'friend_online',
      title: 'Friend Online',
      message: `${displayName} is now online`,
      priority: 'low',
      data: { userId },
    });
  }

  notifyPartyInvite(
    fromDisplayName: string,
    partyName: string,
    inviteId: string
  ): Notification {
    return this.push({
      type: 'party_invite',
      title: 'Party Invite',
      message: `${fromDisplayName} invited you to "${partyName}"`,
      priority: 'high',
      data: { inviteId },
      actions: [
        { id: 'join', label: 'Join', action: 'join_party', primary: true },
        { id: 'decline', label: 'Decline', action: 'decline_party' },
      ],
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });
  }

  notifyAchievement(achievementName: string, description: string): Notification {
    return this.push({
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: `${achievementName}: ${description}`,
      priority: 'high',
    });
  }

  notifySystem(title: string, message: string): Notification {
    return this.push({
      type: 'system',
      title,
      message,
      priority: 'normal',
    });
  }

  // ============================================================================
  // Event System
  // ============================================================================

  on<T extends SocialEventType>(
    event: T,
    handler: SocialEventHandler<T>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler as SocialEventHandler<SocialEventType>);

    return () => this.off(event, handler);
  }

  off<T extends SocialEventType>(event: T, handler: SocialEventHandler<T>): void {
    this.eventListeners.get(event)?.delete(handler as SocialEventHandler<SocialEventType>);
  }

  private emit<T extends SocialEventType>(event: T, data: SocialEventMap[T]): void {
    this.eventListeners.get(event)?.forEach((handler) => handler(data));
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  toJSON(): {
    preferences: NotificationPreferences;
    status: UserStatus;
  } {
    return {
      preferences: this.preferences,
      status: this.status,
    };
  }

  loadFromJSON(data: {
    preferences?: Partial<NotificationPreferences>;
    status?: Partial<UserStatus>;
  }): void {
    if (data.preferences) {
      this.preferences = { ...DEFAULT_PREFERENCES, ...data.preferences };
    }
    if (data.status) {
      this.status = { ...this.status, ...data.status };
    }
  }
}
