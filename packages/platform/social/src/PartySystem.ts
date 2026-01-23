/**
 * @hololand/social PartySystem
 *
 * Party management for group activities and voice chat
 */

import { logger } from './logger';
import type {
  Party,
  PartyMember,
  PartyConfig,
  PartyInvite,
  PartyPrivacy,
  SocialEventMap,
  SocialEventType,
  SocialEventHandler,
} from './types';

const DEFAULT_CONFIG: Required<PartyConfig> = {
  name: 'Party',
  maxMembers: 8,
  privacy: 'friends_only',
  voiceEnabled: true,
};

export class PartySystem {
  private localUserId: string;
  private localDisplayName: string;
  private currentParty: Party | null = null;
  private pendingInvites: Map<string, PartyInvite> = new Map();

  private eventListeners: Map<
    SocialEventType,
    Set<SocialEventHandler<SocialEventType>>
  > = new Map();

  // Callbacks for network/voice integration
  private sendRequest?: (type: string, data: unknown) => void;
  private onVoiceJoin?: (channelId: string) => void;
  private onVoiceLeave?: () => void;

  constructor(userId: string, displayName: string) {
    this.localUserId = userId;
    this.localDisplayName = displayName;
    logger.info('[PartySystem] Initialized', { userId });
  }

  // ============================================================================
  // Integration
  // ============================================================================

  setNetworkCallback(callback: (type: string, data: unknown) => void): void {
    this.sendRequest = callback;
  }

  setVoiceCallbacks(
    onJoin: (channelId: string) => void,
    onLeave: () => void
  ): void {
    this.onVoiceJoin = onJoin;
    this.onVoiceLeave = onLeave;
  }

  handleNetworkEvent(type: string, data: unknown): void {
    switch (type) {
      case 'party_invite':
        this.handleInvite(data as PartyInvite);
        break;
      case 'party_joined':
        this.handlePartyJoined(data as Party);
        break;
      case 'party_member_joined':
        this.handleMemberJoined(data as { partyId: string; member: PartyMember });
        break;
      case 'party_member_left':
        this.handleMemberLeft(data as { partyId: string; userId: string });
        break;
      case 'party_leader_changed':
        this.handleLeaderChanged(data as { partyId: string; newLeaderId: string });
        break;
      case 'party_disbanded':
        this.handleDisbanded((data as { partyId: string }).partyId);
        break;
    }
  }

  // ============================================================================
  // Party Creation
  // ============================================================================

  createParty(config: PartyConfig = {}): Party {
    if (this.currentParty) {
      throw new Error('Already in a party');
    }

    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    const party: Party = {
      id: this.generateId('party'),
      name: fullConfig.name,
      leaderId: this.localUserId,
      members: [
        {
          userId: this.localUserId,
          displayName: this.localDisplayName,
          role: 'leader',
          joinedAt: Date.now(),
          isMuted: false,
          isDeafened: false,
        },
      ],
      maxMembers: fullConfig.maxMembers,
      privacy: fullConfig.privacy,
      voiceEnabled: fullConfig.voiceEnabled,
      voiceChannelId: fullConfig.voiceEnabled ? this.generateId('voice') : undefined,
      createdAt: Date.now(),
    };

    this.currentParty = party;

    // Send to network
    this.sendRequest?.('party_create', party);

    // Join voice if enabled
    if (party.voiceEnabled && party.voiceChannelId) {
      this.onVoiceJoin?.(party.voiceChannelId);
    }

    this.emit('partyJoined', { party });

    logger.info('[PartySystem] Party created', { partyId: party.id });
    return party;
  }

  // ============================================================================
  // Invitations
  // ============================================================================

  sendInvite(toUserId: string, toDisplayName: string): PartyInvite {
    if (!this.currentParty) {
      throw new Error('Not in a party');
    }

    if (!this.isLeader()) {
      throw new Error('Only party leader can send invites');
    }

    if (this.currentParty.members.length >= this.currentParty.maxMembers) {
      throw new Error('Party is full');
    }

    const invite: PartyInvite = {
      id: this.generateId('inv'),
      partyId: this.currentParty.id,
      partyName: this.currentParty.name,
      fromUserId: this.localUserId,
      fromDisplayName: this.localDisplayName,
      toUserId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };

    // Send to network
    this.sendRequest?.('party_invite', invite);

    logger.info('[PartySystem] Invite sent', { toUserId });
    return invite;
  }

  private handleInvite(invite: PartyInvite): void {
    // Check if expired
    if (Date.now() > invite.expiresAt) {
      logger.debug('[PartySystem] Ignored expired invite', { inviteId: invite.id });
      return;
    }

    this.pendingInvites.set(invite.id, invite);
    this.emit('partyInviteReceived', { invite });

    logger.info('[PartySystem] Invite received', { fromUserId: invite.fromUserId });
  }

  acceptInvite(inviteId: string): void {
    const invite = this.pendingInvites.get(inviteId);
    if (!invite) {
      throw new Error('Invite not found');
    }

    if (Date.now() > invite.expiresAt) {
      this.pendingInvites.delete(inviteId);
      throw new Error('Invite has expired');
    }

    if (this.currentParty) {
      this.leaveParty();
    }

    this.pendingInvites.delete(inviteId);

    // Send to network
    this.sendRequest?.('party_invite_accept', { inviteId, partyId: invite.partyId });

    logger.info('[PartySystem] Invite accepted', { partyId: invite.partyId });
  }

  rejectInvite(inviteId: string): void {
    const invite = this.pendingInvites.get(inviteId);
    if (!invite) {
      throw new Error('Invite not found');
    }

    this.pendingInvites.delete(inviteId);

    // Send to network
    this.sendRequest?.('party_invite_reject', { inviteId });

    logger.info('[PartySystem] Invite rejected', { inviteId });
  }

  private handlePartyJoined(party: Party): void {
    this.currentParty = party;

    // Join voice if enabled
    if (party.voiceEnabled && party.voiceChannelId) {
      this.onVoiceJoin?.(party.voiceChannelId);
    }

    this.emit('partyJoined', { party });
  }

  // ============================================================================
  // Party Management
  // ============================================================================

  leaveParty(): void {
    if (!this.currentParty) {
      throw new Error('Not in a party');
    }

    const partyId = this.currentParty.id;

    // Leave voice
    if (this.currentParty.voiceEnabled) {
      this.onVoiceLeave?.();
    }

    // If leader and others remain, transfer leadership
    if (this.isLeader() && this.currentParty.members.length > 1) {
      const newLeader = this.currentParty.members.find(
        (m) => m.userId !== this.localUserId
      );
      if (newLeader) {
        this.transferLeadership(newLeader.userId);
      }
    }

    // Send to network
    this.sendRequest?.('party_leave', { partyId });

    this.currentParty = null;
    this.emit('partyLeft', { partyId });

    logger.info('[PartySystem] Left party', { partyId });
  }

  disbandParty(): void {
    if (!this.currentParty) {
      throw new Error('Not in a party');
    }

    if (!this.isLeader()) {
      throw new Error('Only party leader can disband');
    }

    const partyId = this.currentParty.id;

    // Leave voice
    if (this.currentParty.voiceEnabled) {
      this.onVoiceLeave?.();
    }

    // Send to network
    this.sendRequest?.('party_disband', { partyId });

    this.currentParty = null;
    this.emit('partyDisbanded', { partyId });

    logger.info('[PartySystem] Party disbanded', { partyId });
  }

  kickMember(userId: string): void {
    if (!this.currentParty) {
      throw new Error('Not in a party');
    }

    if (!this.isLeader()) {
      throw new Error('Only party leader can kick members');
    }

    if (userId === this.localUserId) {
      throw new Error('Cannot kick yourself');
    }

    // Send to network
    this.sendRequest?.('party_kick', {
      partyId: this.currentParty.id,
      userId,
    });

    logger.info('[PartySystem] Member kicked', { userId });
  }

  transferLeadership(newLeaderId: string): void {
    if (!this.currentParty) {
      throw new Error('Not in a party');
    }

    if (!this.isLeader()) {
      throw new Error('Only party leader can transfer leadership');
    }

    const newLeader = this.currentParty.members.find(
      (m) => m.userId === newLeaderId
    );
    if (!newLeader) {
      throw new Error('User is not in party');
    }

    // Send to network
    this.sendRequest?.('party_transfer_leader', {
      partyId: this.currentParty.id,
      newLeaderId,
    });

    logger.info('[PartySystem] Leadership transferred', { newLeaderId });
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private handleMemberJoined(data: { partyId: string; member: PartyMember }): void {
    if (!this.currentParty || this.currentParty.id !== data.partyId) return;

    this.currentParty.members.push(data.member);
    this.emit('partyMemberJoined', data);

    logger.info('[PartySystem] Member joined', { userId: data.member.userId });
  }

  private handleMemberLeft(data: { partyId: string; userId: string }): void {
    if (!this.currentParty || this.currentParty.id !== data.partyId) return;

    this.currentParty.members = this.currentParty.members.filter(
      (m) => m.userId !== data.userId
    );
    this.emit('partyMemberLeft', data);

    logger.info('[PartySystem] Member left', { userId: data.userId });
  }

  private handleLeaderChanged(data: { partyId: string; newLeaderId: string }): void {
    if (!this.currentParty || this.currentParty.id !== data.partyId) return;

    // Update roles
    this.currentParty.members.forEach((m) => {
      m.role = m.userId === data.newLeaderId ? 'leader' : 'member';
    });
    this.currentParty.leaderId = data.newLeaderId;

    this.emit('partyLeaderChanged', data);

    logger.info('[PartySystem] Leader changed', { newLeaderId: data.newLeaderId });
  }

  private handleDisbanded(partyId: string): void {
    if (!this.currentParty || this.currentParty.id !== partyId) return;

    // Leave voice
    if (this.currentParty.voiceEnabled) {
      this.onVoiceLeave?.();
    }

    this.currentParty = null;
    this.emit('partyDisbanded', { partyId });

    logger.info('[PartySystem] Party disbanded', { partyId });
  }

  // ============================================================================
  // Voice Controls
  // ============================================================================

  setMuted(muted: boolean): void {
    if (!this.currentParty) return;

    const member = this.currentParty.members.find(
      (m) => m.userId === this.localUserId
    );
    if (member) {
      member.isMuted = muted;
    }

    // Network would handle actual mute
    this.sendRequest?.('party_voice_mute', {
      partyId: this.currentParty.id,
      muted,
    });
  }

  setDeafened(deafened: boolean): void {
    if (!this.currentParty) return;

    const member = this.currentParty.members.find(
      (m) => m.userId === this.localUserId
    );
    if (member) {
      member.isDeafened = deafened;
    }

    this.sendRequest?.('party_voice_deafen', {
      partyId: this.currentParty.id,
      deafened,
    });
  }

  // ============================================================================
  // Queries
  // ============================================================================

  getParty(): Party | null {
    return this.currentParty;
  }

  isInParty(): boolean {
    return this.currentParty !== null;
  }

  isLeader(): boolean {
    return this.currentParty?.leaderId === this.localUserId;
  }

  getMembers(): PartyMember[] {
    return this.currentParty?.members ?? [];
  }

  getMember(userId: string): PartyMember | undefined {
    return this.currentParty?.members.find((m) => m.userId === userId);
  }

  getMemberCount(): number {
    return this.currentParty?.members.length ?? 0;
  }

  getPendingInvites(): PartyInvite[] {
    // Clean up expired invites
    const now = Date.now();
    this.pendingInvites.forEach((invite, id) => {
      if (now > invite.expiresAt) {
        this.pendingInvites.delete(id);
      }
    });

    return Array.from(this.pendingInvites.values());
  }

  // ============================================================================
  // World Sync
  // ============================================================================

  setCurrentWorld(worldId: string): void {
    if (!this.currentParty) return;

    this.currentParty.currentWorldId = worldId;

    this.sendRequest?.('party_world_update', {
      partyId: this.currentParty.id,
      worldId,
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
}
