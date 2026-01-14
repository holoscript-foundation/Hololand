/**
 * @hololand/social FriendSystem
 *
 * Friend management with requests, blocking, and favorites
 */

import { logger } from './logger';
import type {
  Friend,
  FriendRequest,
  FriendRequestStatus,
  BlockedUser,
  PresenceStatus,
  SocialEventMap,
  SocialEventType,
  SocialEventHandler,
} from './types';

export class FriendSystem {
  private localUserId: string;
  private localDisplayName: string;
  private friends: Map<string, Friend> = new Map();
  private pendingRequests: Map<string, FriendRequest> = new Map();
  private blockedUsers: Map<string, BlockedUser> = new Map();

  private eventListeners: Map<
    SocialEventType,
    Set<SocialEventHandler<SocialEventType>>
  > = new Map();

  // Callbacks for network integration
  private sendRequest?: (type: string, data: unknown) => void;

  constructor(userId: string, displayName: string) {
    this.localUserId = userId;
    this.localDisplayName = displayName;
    logger.info('[FriendSystem] Initialized', { userId });
  }

  // ============================================================================
  // Network Integration
  // ============================================================================

  setNetworkCallback(callback: (type: string, data: unknown) => void): void {
    this.sendRequest = callback;
  }

  handleNetworkEvent(type: string, data: unknown): void {
    switch (type) {
      case 'friend_request':
        this.handleIncomingRequest(data as FriendRequest);
        break;
      case 'friend_request_response':
        this.handleRequestResponse(data as { requestId: string; status: FriendRequestStatus });
        break;
      case 'friend_removed':
        this.handleFriendRemoved((data as { userId: string }).userId);
        break;
      case 'friend_status':
        this.handleFriendStatus(data as { userId: string; status: PresenceStatus });
        break;
    }
  }

  // ============================================================================
  // Friend Requests
  // ============================================================================

  sendFriendRequest(toUserId: string, toDisplayName: string, message?: string): FriendRequest {
    if (this.friends.has(toUserId)) {
      throw new Error('User is already a friend');
    }

    if (this.blockedUsers.has(toUserId)) {
      throw new Error('User is blocked');
    }

    const request: FriendRequest = {
      id: this.generateId('req'),
      fromUserId: this.localUserId,
      fromDisplayName: this.localDisplayName,
      toUserId,
      status: 'pending',
      message,
      createdAt: Date.now(),
    };

    this.pendingRequests.set(request.id, request);

    // Send to network
    this.sendRequest?.('friend_request', request);

    logger.info('[FriendSystem] Request sent', { toUserId });
    return request;
  }

  private handleIncomingRequest(request: FriendRequest): void {
    // Check if blocked
    if (this.blockedUsers.has(request.fromUserId)) {
      logger.debug('[FriendSystem] Ignored request from blocked user', {
        fromUserId: request.fromUserId,
      });
      return;
    }

    this.pendingRequests.set(request.id, request);
    this.emit('friendRequestReceived', { request });

    logger.info('[FriendSystem] Request received', { fromUserId: request.fromUserId });
  }

  acceptFriendRequest(requestId: string): Friend {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error('Friend request not found');
    }

    request.status = 'accepted';
    request.respondedAt = Date.now();

    // Add as friend
    const friend: Friend = {
      userId: request.fromUserId,
      displayName: request.fromDisplayName,
      status: 'online',
      addedAt: Date.now(),
      lastSeenAt: Date.now(),
      isFavorite: false,
    };

    this.friends.set(friend.userId, friend);
    this.pendingRequests.delete(requestId);

    // Send to network
    this.sendRequest?.('friend_request_response', {
      requestId,
      status: 'accepted',
    });

    this.emit('friendRequestAccepted', { friend });

    logger.info('[FriendSystem] Request accepted', { userId: friend.userId });
    return friend;
  }

  rejectFriendRequest(requestId: string): void {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error('Friend request not found');
    }

    request.status = 'rejected';
    request.respondedAt = Date.now();
    this.pendingRequests.delete(requestId);

    // Send to network
    this.sendRequest?.('friend_request_response', {
      requestId,
      status: 'rejected',
    });

    this.emit('friendRequestRejected', { requestId });

    logger.info('[FriendSystem] Request rejected', { requestId });
  }

  private handleRequestResponse(response: { requestId: string; status: FriendRequestStatus }): void {
    const request = this.pendingRequests.get(response.requestId);
    if (!request) return;

    if (response.status === 'accepted') {
      const friend: Friend = {
        userId: request.toUserId,
        displayName: request.toUserId, // Would be filled from network
        status: 'online',
        addedAt: Date.now(),
        lastSeenAt: Date.now(),
        isFavorite: false,
      };

      this.friends.set(friend.userId, friend);
      this.emit('friendRequestAccepted', { friend });
    } else {
      this.emit('friendRequestRejected', { requestId: response.requestId });
    }

    this.pendingRequests.delete(response.requestId);
  }

  // ============================================================================
  // Friend Management
  // ============================================================================

  removeFriend(userId: string): void {
    if (!this.friends.has(userId)) {
      throw new Error('User is not a friend');
    }

    this.friends.delete(userId);

    // Send to network
    this.sendRequest?.('friend_removed', { userId });

    this.emit('friendRemoved', { userId });

    logger.info('[FriendSystem] Friend removed', { userId });
  }

  private handleFriendRemoved(userId: string): void {
    if (this.friends.has(userId)) {
      this.friends.delete(userId);
      this.emit('friendRemoved', { userId });
    }
  }

  setFavorite(userId: string, isFavorite: boolean): void {
    const friend = this.friends.get(userId);
    if (!friend) {
      throw new Error('User is not a friend');
    }

    friend.isFavorite = isFavorite;
    logger.debug('[FriendSystem] Favorite updated', { userId, isFavorite });
  }

  // ============================================================================
  // Blocking
  // ============================================================================

  blockUser(userId: string, displayName: string, reason?: string): void {
    // Remove from friends if exists
    if (this.friends.has(userId)) {
      this.friends.delete(userId);
    }

    // Remove pending requests
    this.pendingRequests.forEach((request, id) => {
      if (request.fromUserId === userId || request.toUserId === userId) {
        this.pendingRequests.delete(id);
      }
    });

    const blocked: BlockedUser = {
      userId,
      displayName,
      blockedAt: Date.now(),
      reason,
    };

    this.blockedUsers.set(userId, blocked);

    // Send to network
    this.sendRequest?.('user_blocked', { userId });

    logger.info('[FriendSystem] User blocked', { userId });
  }

  unblockUser(userId: string): void {
    if (!this.blockedUsers.has(userId)) {
      throw new Error('User is not blocked');
    }

    this.blockedUsers.delete(userId);

    // Send to network
    this.sendRequest?.('user_unblocked', { userId });

    logger.info('[FriendSystem] User unblocked', { userId });
  }

  isBlocked(userId: string): boolean {
    return this.blockedUsers.has(userId);
  }

  // ============================================================================
  // Status Updates
  // ============================================================================

  private handleFriendStatus(update: { userId: string; status: PresenceStatus }): void {
    const friend = this.friends.get(update.userId);
    if (!friend) return;

    const previousStatus = friend.status;
    friend.status = update.status;
    friend.lastSeenAt = Date.now();

    if (previousStatus === 'offline' && update.status !== 'offline') {
      this.emit('friendOnline', { friend });
    } else if (previousStatus !== 'offline' && update.status === 'offline') {
      this.emit('friendOffline', { userId: update.userId });
    } else {
      this.emit('friendStatusChanged', { userId: update.userId, status: update.status });
    }
  }

  updateFriendStatus(userId: string, status: PresenceStatus): void {
    const friend = this.friends.get(userId);
    if (friend) {
      this.handleFriendStatus({ userId, status });
    }
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getFriends(): Friend[] {
    return Array.from(this.friends.values());
  }

  getOnlineFriends(): Friend[] {
    return this.getFriends().filter((f) => f.status !== 'offline');
  }

  getFavoriteFriends(): Friend[] {
    return this.getFriends().filter((f) => f.isFavorite);
  }

  getFriend(userId: string): Friend | undefined {
    return this.friends.get(userId);
  }

  isFriend(userId: string): boolean {
    return this.friends.has(userId);
  }

  getPendingRequests(): FriendRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  getIncomingRequests(): FriendRequest[] {
    return this.getPendingRequests().filter(
      (r) => r.toUserId === this.localUserId && r.status === 'pending'
    );
  }

  getOutgoingRequests(): FriendRequest[] {
    return this.getPendingRequests().filter(
      (r) => r.fromUserId === this.localUserId && r.status === 'pending'
    );
  }

  getBlockedUsers(): BlockedUser[] {
    return Array.from(this.blockedUsers.values());
  }

  getFriendCount(): number {
    return this.friends.size;
  }

  getOnlineCount(): number {
    return this.getOnlineFriends().length;
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
    friends: Friend[];
    pendingRequests: FriendRequest[];
    blockedUsers: BlockedUser[];
  } {
    return {
      friends: this.getFriends(),
      pendingRequests: this.getPendingRequests(),
      blockedUsers: this.getBlockedUsers(),
    };
  }

  loadFromJSON(data: {
    friends?: Friend[];
    pendingRequests?: FriendRequest[];
    blockedUsers?: BlockedUser[];
  }): void {
    if (data.friends) {
      this.friends.clear();
      data.friends.forEach((f) => this.friends.set(f.userId, f));
    }
    if (data.pendingRequests) {
      this.pendingRequests.clear();
      data.pendingRequests.forEach((r) => this.pendingRequests.set(r.id, r));
    }
    if (data.blockedUsers) {
      this.blockedUsers.clear();
      data.blockedUsers.forEach((b) => this.blockedUsers.set(b.userId, b));
    }
  }
}
