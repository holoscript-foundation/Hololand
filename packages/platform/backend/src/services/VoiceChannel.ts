/**
 * @hololand/backend — VoiceChannel
 *
 * Server-side voice channel management for spatial voice chat.
 * Transport-agnostic — manages channel membership, mute/deafen state,
 * speaking detection, and voice routing. Does NOT handle actual
 * WebRTC/audio transport (that's the client's job). This module tells
 * clients WHO to connect to and manages permissions.
 *
 * Architecture:
 *   Client WebRTC
 *       ↓ signaling
 *   VoiceChannel (server-side)
 *       ├── Channel membership (join/leave)
 *       ├── Mute/deafen state management
 *       ├── Speaking state tracking
 *       ├── Voice routing (who hears whom)
 *       └── SpatialVoiceMixer (3D audio parameters)
 *       ↓
 *   SFU relay hints sent back to clients
 *
 * Usage:
 *   const vc = new VoiceChannel({ maxChannels: 100, maxParticipantsPerChannel: 50 });
 *   const channel = vc.createChannel({ name: 'General', roomId: 'room-1' });
 *   vc.join(channel.id, 'player-1');
 *   vc.setSpeaking('player-1', true);
 *   // Clients receive participant updates via events
 */

import { SpatialVoiceMixer } from './SpatialVoiceMixer';
import type { SpatialVoiceMixerConfig, VoicePosition, VoiceGain } from './SpatialVoiceMixer';

// ============================================================================
// Types
// ============================================================================

/** Configuration for creating a voice channel. */
export interface ChannelCreateOptions {
  /** Human-readable channel name. */
  name: string;
  /** Associated room ID (optional). */
  roomId?: string;
  /** Maximum participants. Default: 50 */
  maxParticipants?: number;
  /** Enable spatial audio for this channel. Default: false */
  spatial?: boolean;
  /** Spatial mixer configuration (when spatial=true). */
  spatialConfig?: Partial<SpatialVoiceMixerConfig>;
  /** Channel is persistent (survives empty). Default: false */
  persistent?: boolean;
  /** Additional metadata. */
  metadata?: Record<string, unknown>;
}

/** A voice channel. */
export interface VoiceChannelRecord {
  /** Unique channel ID. */
  id: string;
  /** Channel name. */
  name: string;
  /** Associated room ID. */
  roomId: string | null;
  /** Max participants. */
  maxParticipants: number;
  /** Whether spatial audio is enabled. */
  spatial: boolean;
  /** Set of participant peer IDs. */
  participantIds: Set<string>;
  /** Whether channel persists when empty. */
  persistent: boolean;
  /** Creation timestamp. */
  createdAt: number;
  /** Additional metadata. */
  metadata: Record<string, unknown>;
}

/** Public channel info (safe to send to clients). */
export interface VoiceChannelInfo {
  id: string;
  name: string;
  roomId: string | null;
  participantCount: number;
  maxParticipants: number;
  spatial: boolean;
  persistent: boolean;
  createdAt: number;
  metadata: Record<string, unknown>;
}

/** Per-participant voice state. */
export interface VoiceParticipant {
  /** Peer ID. */
  peerId: string;
  /** Channel ID the participant is in. */
  channelId: string;
  /** Is self-muted (own mic off). */
  muted: boolean;
  /** Is deafened (can't hear others). */
  deafened: boolean;
  /** Is currently speaking. */
  speaking: boolean;
  /** Volume override (0-2, 1=normal). */
  volume: number;
  /** When they joined. */
  joinedAt: number;
  /** Additional metadata. */
  metadata: Record<string, unknown>;
}

/** Public participant info. */
export interface VoiceParticipantInfo {
  peerId: string;
  channelId: string;
  muted: boolean;
  deafened: boolean;
  speaking: boolean;
  volume: number;
  joinedAt: number;
}

/** Voice channel event types. */
export type VoiceChannelEventType =
  | 'channel_created'
  | 'channel_destroyed'
  | 'participant_joined'
  | 'participant_left'
  | 'participant_muted'
  | 'participant_unmuted'
  | 'participant_deafened'
  | 'participant_undeafened'
  | 'participant_speaking'
  | 'participant_stopped_speaking'
  | 'participant_volume_changed';

export interface VoiceChannelEvent {
  type: VoiceChannelEventType;
  channelId: string;
  peerId?: string;
  timestamp: number;
  data: Record<string, unknown>;
}

type VoiceChannelEventCallback = (event: VoiceChannelEvent) => void;

/** Service-level configuration. */
export interface VoiceChannelConfig {
  /** Maximum channels. Default: 1000 */
  maxChannels?: number;
  /** Default max participants per channel. Default: 50 */
  defaultMaxParticipants?: number;
  /** Auto-destroy empty non-persistent channels. Default: true */
  autoDestroyEmpty?: boolean;
  /** Speaking timeout — auto-set speaking=false after this (ms). Default: 1000 */
  speakingTimeout?: number;
  /** Default spatial mixer config for spatial channels. */
  defaultSpatialConfig?: Partial<SpatialVoiceMixerConfig>;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<VoiceChannelConfig, 'defaultSpatialConfig'>> = {
  maxChannels: 1000,
  defaultMaxParticipants: 50,
  autoDestroyEmpty: true,
  speakingTimeout: 1000,
};

// ============================================================================
// VoiceChannel Service
// ============================================================================

export class VoiceChannel {
  private config: Required<Omit<VoiceChannelConfig, 'defaultSpatialConfig'>>;
  private defaultSpatialConfig: Partial<SpatialVoiceMixerConfig>;

  /** All channels. */
  private channels: Map<string, VoiceChannelRecord> = new Map();

  /** Per-channel spatial mixers (only for spatial channels). */
  private mixers: Map<string, SpatialVoiceMixer> = new Map();

  /** All participants: peerId → VoiceParticipant. */
  private participants: Map<string, VoiceParticipant> = new Map();

  /** Speaking timers: peerId → timeout handle. */
  private speakingTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /** Event listeners. */
  private listeners: Set<VoiceChannelEventCallback> = new Set();

  /** ID generation. */
  private nextChannelId = 1;

  constructor(config: VoiceChannelConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    this.defaultSpatialConfig = config.defaultSpatialConfig ?? {};
  }

  // ============================================================================
  // Channel Management
  // ============================================================================

  /** Create a voice channel. Returns the channel record. */
  createChannel(options: ChannelCreateOptions): VoiceChannelRecord {
    if (this.channels.size >= this.config.maxChannels) {
      throw new Error('Maximum channel limit reached');
    }

    const now = Date.now();
    const id = `vc_${(this.nextChannelId++).toString(36)}_${now.toString(36)}`;
    const maxPart = options.maxParticipants ?? this.config.defaultMaxParticipants;

    if (maxPart < 1) {
      throw new Error('maxParticipants must be at least 1');
    }

    const channel: VoiceChannelRecord = {
      id,
      name: options.name,
      roomId: options.roomId ?? null,
      maxParticipants: maxPart,
      spatial: options.spatial ?? false,
      participantIds: new Set(),
      persistent: options.persistent ?? false,
      createdAt: now,
      metadata: options.metadata ?? {},
    };

    this.channels.set(id, channel);

    // Create spatial mixer if spatial audio is enabled
    if (channel.spatial) {
      const mixerConfig: SpatialVoiceMixerConfig = {
        ...this.defaultSpatialConfig,
        ...options.spatialConfig,
      } as SpatialVoiceMixerConfig;
      this.mixers.set(id, new SpatialVoiceMixer(mixerConfig));
    }

    this.emit({
      type: 'channel_created',
      channelId: id,
      timestamp: now,
      data: { name: channel.name, roomId: channel.roomId, spatial: channel.spatial },
    });

    return channel;
  }

  /** Destroy a voice channel. All participants are removed. */
  destroyChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    // Remove all participants
    for (const peerId of [...channel.participantIds]) {
      this.leave(peerId);
    }

    // Clean up spatial mixer
    const mixer = this.mixers.get(channelId);
    if (mixer) {
      mixer.destroy();
      this.mixers.delete(channelId);
    }

    this.channels.delete(channelId);

    this.emit({
      type: 'channel_destroyed',
      channelId,
      timestamp: Date.now(),
      data: { name: channel.name },
    });

    return true;
  }

  /** Get a channel by ID. */
  getChannel(channelId: string): VoiceChannelRecord | undefined {
    return this.channels.get(channelId);
  }

  /** Get public info for a channel. */
  getChannelInfo(channelId: string): VoiceChannelInfo | undefined {
    const channel = this.channels.get(channelId);
    if (!channel) return undefined;

    return {
      id: channel.id,
      name: channel.name,
      roomId: channel.roomId,
      participantCount: channel.participantIds.size,
      maxParticipants: channel.maxParticipants,
      spatial: channel.spatial,
      persistent: channel.persistent,
      createdAt: channel.createdAt,
      metadata: channel.metadata,
    };
  }

  /** Get all channel infos. */
  getChannels(): VoiceChannelInfo[] {
    return Array.from(this.channels.values()).map((ch) => ({
      id: ch.id,
      name: ch.name,
      roomId: ch.roomId,
      participantCount: ch.participantIds.size,
      maxParticipants: ch.maxParticipants,
      spatial: ch.spatial,
      persistent: ch.persistent,
      createdAt: ch.createdAt,
      metadata: ch.metadata,
    }));
  }

  /** Find channels by room ID. */
  getChannelsByRoom(roomId: string): VoiceChannelInfo[] {
    return this.getChannels().filter((ch) => ch.roomId === roomId);
  }

  // ============================================================================
  // Participant Management
  // ============================================================================

  /** Join a voice channel. A player can only be in one channel at a time. */
  join(channelId: string, peerId: string, metadata: Record<string, unknown> = {}): VoiceParticipant {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel "${channelId}" not found`);
    }

    if (channel.participantIds.size >= channel.maxParticipants) {
      throw new Error(`Channel "${channelId}" is full`);
    }

    // If already in another channel, leave it first
    const existing = this.participants.get(peerId);
    if (existing) {
      this.leave(peerId);
    }

    const participant: VoiceParticipant = {
      peerId,
      channelId,
      muted: false,
      deafened: false,
      speaking: false,
      volume: 1.0,
      joinedAt: Date.now(),
      metadata,
    };

    this.participants.set(peerId, participant);
    channel.participantIds.add(peerId);

    // Register in spatial mixer if spatial
    const mixer = this.mixers.get(channelId);
    if (mixer) {
      mixer.addPeer(peerId);
    }

    this.emit({
      type: 'participant_joined',
      channelId,
      peerId,
      timestamp: Date.now(),
      data: { participantCount: channel.participantIds.size },
    });

    return participant;
  }

  /** Leave the current voice channel. */
  leave(peerId: string): boolean {
    const participant = this.participants.get(peerId);
    if (!participant) return false;

    const { channelId } = participant;
    const channel = this.channels.get(channelId);

    // Clear speaking timer
    this.clearSpeakingTimer(peerId);

    // Remove from spatial mixer
    const mixer = this.mixers.get(channelId);
    if (mixer) {
      mixer.removePeer(peerId);
    }

    // Remove participant
    this.participants.delete(peerId);

    if (channel) {
      channel.participantIds.delete(peerId);

      this.emit({
        type: 'participant_left',
        channelId,
        peerId,
        timestamp: Date.now(),
        data: { participantCount: channel.participantIds.size },
      });

      // Auto-destroy empty non-persistent channels
      if (
        this.config.autoDestroyEmpty &&
        !channel.persistent &&
        channel.participantIds.size === 0
      ) {
        this.destroyChannel(channelId);
      }
    }

    return true;
  }

  /** Check if a peer is in a channel. */
  isInChannel(peerId: string): boolean {
    return this.participants.has(peerId);
  }

  /** Get a participant's voice state. */
  getParticipant(peerId: string): VoiceParticipant | undefined {
    return this.participants.get(peerId);
  }

  /** Get all participants in a channel. */
  getParticipants(channelId: string): VoiceParticipantInfo[] {
    const channel = this.channels.get(channelId);
    if (!channel) return [];

    return Array.from(channel.participantIds)
      .map((pid) => this.participants.get(pid))
      .filter((p): p is VoiceParticipant => !!p)
      .map((p) => ({
        peerId: p.peerId,
        channelId: p.channelId,
        muted: p.muted,
        deafened: p.deafened,
        speaking: p.speaking,
        volume: p.volume,
        joinedAt: p.joinedAt,
      }));
  }

  /** Get which channel a peer is in. */
  getChannelForPeer(peerId: string): string | null {
    return this.participants.get(peerId)?.channelId ?? null;
  }

  // ============================================================================
  // Voice State Control
  // ============================================================================

  /** Set self-muted state. */
  setMuted(peerId: string, muted: boolean): boolean {
    const participant = this.participants.get(peerId);
    if (!participant) return false;
    if (participant.muted === muted) return true;

    participant.muted = muted;

    // If muting, stop speaking
    if (muted && participant.speaking) {
      participant.speaking = false;
      this.clearSpeakingTimer(peerId);
    }

    this.emit({
      type: muted ? 'participant_muted' : 'participant_unmuted',
      channelId: participant.channelId,
      peerId,
      timestamp: Date.now(),
      data: { muted },
    });

    return true;
  }

  /** Set deafened state. */
  setDeafened(peerId: string, deafened: boolean): boolean {
    const participant = this.participants.get(peerId);
    if (!participant) return false;
    if (participant.deafened === deafened) return true;

    participant.deafened = deafened;

    // Deafening also mutes
    if (deafened && !participant.muted) {
      participant.muted = true;
      if (participant.speaking) {
        participant.speaking = false;
        this.clearSpeakingTimer(peerId);
      }
    }

    this.emit({
      type: deafened ? 'participant_deafened' : 'participant_undeafened',
      channelId: participant.channelId,
      peerId,
      timestamp: Date.now(),
      data: { deafened, muted: participant.muted },
    });

    return true;
  }

  /** Report that a peer is speaking. Auto-resets after speakingTimeout. */
  setSpeaking(peerId: string, speaking: boolean): boolean {
    const participant = this.participants.get(peerId);
    if (!participant) return false;

    // Can't speak while muted
    if (speaking && participant.muted) return false;

    const wasSpeaking = participant.speaking;
    participant.speaking = speaking;

    // Clear existing timer
    this.clearSpeakingTimer(peerId);

    if (speaking) {
      // Auto-stop speaking after timeout
      this.speakingTimers.set(
        peerId,
        setTimeout(() => {
          this.setSpeaking(peerId, false);
        }, this.config.speakingTimeout)
      );

      if (!wasSpeaking) {
        this.emit({
          type: 'participant_speaking',
          channelId: participant.channelId,
          peerId,
          timestamp: Date.now(),
          data: {},
        });
      }
    } else if (wasSpeaking) {
      this.emit({
        type: 'participant_stopped_speaking',
        channelId: participant.channelId,
        peerId,
        timestamp: Date.now(),
        data: {},
      });
    }

    return true;
  }

  /** Set volume override for a participant (0-2, 1=normal). */
  setVolume(peerId: string, volume: number): boolean {
    const participant = this.participants.get(peerId);
    if (!participant) return false;

    const clamped = Math.max(0, Math.min(2, volume));
    if (participant.volume === clamped) return true;

    participant.volume = clamped;

    this.emit({
      type: 'participant_volume_changed',
      channelId: participant.channelId,
      peerId,
      timestamp: Date.now(),
      data: { volume: clamped },
    });

    return true;
  }

  // ============================================================================
  // Spatial Voice
  // ============================================================================

  /** Update a peer's 3D position (for spatial channels). */
  updatePosition(peerId: string, position: VoicePosition): boolean {
    const participant = this.participants.get(peerId);
    if (!participant) return false;

    const mixer = this.mixers.get(participant.channelId);
    if (!mixer) return false;

    mixer.updatePosition(peerId, position);
    return true;
  }

  /**
   * Get voice gains for a listener in a spatial channel.
   * Returns what each speaker sounds like from the listener's perspective.
   */
  getVoiceGains(listenerId: string): VoiceGain[] {
    const participant = this.participants.get(listenerId);
    if (!participant) return [];

    const mixer = this.mixers.get(participant.channelId);
    if (!mixer) {
      // Non-spatial: all non-muted participants at full volume
      return this.getNonSpatialGains(listenerId, participant.channelId);
    }

    // Get spatial gains, filter by mute/deafen state
    const gains = mixer.calculateGains(listenerId);
    return gains.filter((g) => {
      const speaker = this.participants.get(g.peerId);
      if (!speaker) return false;
      if (speaker.muted) return false; // Speaker is muted
      if (participant.deafened) return false; // Listener is deafened
      return true;
    }).map((g) => {
      const speaker = this.participants.get(g.peerId)!;
      return { ...g, gain: g.gain * speaker.volume };
    });
  }

  /** Get the spatial mixer for a channel (for advanced configuration). */
  getMixer(channelId: string): SpatialVoiceMixer | undefined {
    return this.mixers.get(channelId);
  }

  // ============================================================================
  // Voice Routing
  // ============================================================================

  /**
   * Get the set of peers that should hear a given speaker.
   * Accounts for mute/deafen state and spatial distance.
   */
  getListeners(speakerId: string): string[] {
    const speaker = this.participants.get(speakerId);
    if (!speaker || speaker.muted) return [];

    const channel = this.channels.get(speaker.channelId);
    if (!channel) return [];

    const mixer = this.mixers.get(speaker.channelId);

    return Array.from(channel.participantIds).filter((pid) => {
      if (pid === speakerId) return false; // Don't hear yourself
      const listener = this.participants.get(pid);
      if (!listener) return false;
      if (listener.deafened) return false;

      // Spatial check: only if within hearing range
      if (mixer) {
        const gains = mixer.calculateGains(pid);
        const speakerGain = gains.find((g) => g.peerId === speakerId);
        if (!speakerGain || speakerGain.gain <= 0) return false;
      }

      return true;
    });
  }

  /**
   * Get routing table for a channel — who can hear whom.
   * Returns Map<speakerId, listenerId[]>.
   */
  getRoutingTable(channelId: string): Map<string, string[]> {
    const channel = this.channels.get(channelId);
    if (!channel) return new Map();

    const table = new Map<string, string[]>();
    for (const peerId of channel.participantIds) {
      table.set(peerId, this.getListeners(peerId));
    }
    return table;
  }

  // ============================================================================
  // Stats & Queries
  // ============================================================================

  /** Get global stats. */
  getStats(): {
    channels: number;
    participants: number;
    spatialChannels: number;
    speaking: number;
    muted: number;
  } {
    let spatialChannels = 0;
    let speaking = 0;
    let muted = 0;

    for (const ch of this.channels.values()) {
      if (ch.spatial) spatialChannels++;
    }
    for (const p of this.participants.values()) {
      if (p.speaking) speaking++;
      if (p.muted) muted++;
    }

    return {
      channels: this.channels.size,
      participants: this.participants.size,
      spatialChannels,
      speaking,
      muted,
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  /** Subscribe to voice channel events. Returns unsubscribe function. */
  onEvent(callback: VoiceChannelEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.offEvent(callback);
  }

  /** Unsubscribe from events. */
  offEvent(callback: VoiceChannelEventCallback): void {
    this.listeners.delete(callback);
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /** Destroy service, clean up all channels and timers. */
  destroy(): void {
    // Clear all speaking timers
    for (const timer of this.speakingTimers.values()) {
      clearTimeout(timer);
    }
    this.speakingTimers.clear();

    // Destroy all mixers
    for (const mixer of this.mixers.values()) {
      mixer.destroy();
    }
    this.mixers.clear();

    this.channels.clear();
    this.participants.clear();
    this.listeners.clear();
  }

  // ============================================================================
  // Internals
  // ============================================================================

  /** Get gains for a non-spatial channel (everyone at full volume). */
  private getNonSpatialGains(listenerId: string, channelId: string): VoiceGain[] {
    const channel = this.channels.get(channelId);
    if (!channel) return [];

    const listener = this.participants.get(listenerId);
    if (!listener || listener.deafened) return [];

    return Array.from(channel.participantIds)
      .filter((pid) => {
        if (pid === listenerId) return false;
        const speaker = this.participants.get(pid);
        return speaker && !speaker.muted;
      })
      .map((pid) => {
        const speaker = this.participants.get(pid)!;
        return {
          peerId: pid,
          gain: speaker.volume,
          pan: 0,
          distance: 0,
        };
      });
  }

  private clearSpeakingTimer(peerId: string): void {
    const timer = this.speakingTimers.get(peerId);
    if (timer) {
      clearTimeout(timer);
      this.speakingTimers.delete(peerId);
    }
  }

  private emit(event: VoiceChannelEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // swallow listener errors
      }
    }
  }
}
