/**
 * @hololand/network VoiceChannelManager
 *
 * Manages voice channel CRUD (create/join/leave/list), participant tracking per channel,
 * permission model (owner can mute others, moderators can mute), capacity limits
 * (default 25 per channel), voice activity detection (VAD) using AnalyserNode FFT,
 * and push-to-talk support as alternative to VAD.
 *
 * Integrates with:
 * - WebRTCVoiceTransport for actual media transport
 * - SpatialAudioEngine for 3D audio positioning
 * - StateSync infrastructure for voice state synchronization
 */

import { logger } from '../logger';
import type { StateSync } from '../StateSync';
import type { WebRTCVoiceTransport } from './WebRTCVoiceTransport';
import type { SpatialAudioEngine } from './SpatialAudioEngine';
import type {
  VoiceChannel,
  ChannelParticipant,
  ChannelPermission,
  InputMode,
  VoiceChannelConfig,
  VoiceChannelEventType,
  VoiceChannelEventHandler,
  VoiceChannelEventMap,
  VoiceSyncState,
} from './types';

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_CONFIG: Required<VoiceChannelConfig> = {
  defaultCapacity: 25,
  maxChannelsPerUser: 1,
  vadFftSize: 256,
  vadThreshold: 30,
  vadSmoothingTimeConstant: 0.8,
  inputMode: 'vad',
  pushToTalkKey: 'KeyV',
};

// ============================================================================
// VoiceChannelManager
// ============================================================================

export class VoiceChannelManager {
  private config: Required<VoiceChannelConfig>;

  /** All channels indexed by ID. */
  private channels: Map<string, VoiceChannel> = new Map();

  /** Per-channel participant tracking. */
  private channelParticipants: Map<string, Map<string, ChannelParticipant>> = new Map();

  /** Participant permissions per channel: channelId -> participantId -> permission. */
  private permissions: Map<string, Map<string, ChannelPermission>> = new Map();

  /** Which channel each participant is in (participantId -> channelId). */
  private participantChannels: Map<string, string> = new Map();

  /** Local participant ID. */
  private localParticipantId: string | null = null;
  private localDisplayName: string = 'Unknown';

  /** Current input mode. */
  private inputMode: InputMode;
  private isPushToTalkActive: boolean = false;

  /** VAD state. */
  private vadAnalyser: AnalyserNode | null = null;
  private vadAudioContext: AudioContext | null = null;
  private vadTimer: ReturnType<typeof setInterval> | null = null;
  private vadBuffer: Uint8Array | null = null;
  private localIsSpeaking: boolean = false;

  /** Keyboard handler for push-to-talk. */
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyupHandler: ((e: KeyboardEvent) => void) | null = null;

  /** Integration references. */
  private transport: WebRTCVoiceTransport | null = null;
  private spatialAudio: SpatialAudioEngine | null = null;
  private stateSync: StateSync | null = null;

  /** Event listeners. */
  private eventListeners: Map<
    VoiceChannelEventType,
    Set<VoiceChannelEventHandler<VoiceChannelEventType>>
  > = new Map();

  constructor(config: VoiceChannelConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.inputMode = this.config.inputMode;
    logger.info('VoiceChannelManager: initialized', {
      defaultCapacity: this.config.defaultCapacity,
      inputMode: this.inputMode,
    });
  }

  // ============================================================================
  // Integration Wiring
  // ============================================================================

  /**
   * Wire the voice transport for media management.
   */
  setTransport(transport: WebRTCVoiceTransport): void {
    this.transport = transport;

    // Listen for transport participant events
    transport.onParticipantJoined((participant) => {
      const channelId = this.participantChannels.get(this.localParticipantId || '');
      if (channelId) {
        this.handleRemoteParticipantJoined(channelId, participant.participantId, participant.displayName);
      }
    });

    transport.onParticipantLeft((participantId) => {
      const channelId = this.participantChannels.get(participantId);
      if (channelId) {
        this.handleRemoteParticipantLeft(channelId, participantId);
      }
    });

    logger.debug('VoiceChannelManager: transport wired');
  }

  /**
   * Wire the spatial audio engine for 3D positioning.
   */
  setSpatialAudio(spatialAudio: SpatialAudioEngine): void {
    this.spatialAudio = spatialAudio;
    logger.debug('VoiceChannelManager: spatial audio wired');
  }

  /**
   * Wire the StateSync for voice state synchronization.
   * Voice state is broadcast as SyncState metadata with type 'voice'.
   */
  setStateSync(stateSync: StateSync): void {
    this.stateSync = stateSync;
    logger.debug('VoiceChannelManager: StateSync wired');
  }

  /**
   * Set the local participant identity.
   */
  setLocalParticipant(participantId: string, displayName: string): void {
    this.localParticipantId = participantId;
    this.localDisplayName = displayName;
  }

  // ============================================================================
  // Channel CRUD
  // ============================================================================

  /**
   * Create a new voice channel.
   */
  createChannel(
    name: string,
    options?: { capacity?: number; metadata?: Record<string, unknown> }
  ): VoiceChannel {
    const id = `vc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ownerId = this.localParticipantId || 'system';

    const channel: VoiceChannel = {
      id,
      name,
      ownerId,
      capacity: options?.capacity ?? this.config.defaultCapacity,
      participantIds: [],
      createdAt: Date.now(),
      metadata: options?.metadata,
    };

    this.channels.set(id, channel);
    this.channelParticipants.set(id, new Map());
    this.permissions.set(id, new Map());

    // Owner gets owner permission
    if (this.localParticipantId) {
      this.permissions.get(id)!.set(this.localParticipantId, 'owner');
    }

    this.emit('channelCreated', { channel: { ...channel } });
    logger.info('VoiceChannelManager: channel created', { id, name, capacity: channel.capacity });

    return { ...channel };
  }

  /**
   * Delete a voice channel. Only the owner can delete.
   */
  deleteChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    // Permission check: only owner
    if (!this.hasPermission(channelId, this.localParticipantId || '', 'owner')) {
      logger.warn('VoiceChannelManager: permission denied for channel deletion', { channelId });
      return false;
    }

    // Remove all participants
    const participants = this.channelParticipants.get(channelId);
    if (participants) {
      for (const participantId of participants.keys()) {
        this.participantChannels.delete(participantId);
        this.emit('participantLeft', { channelId, participantId });
      }
    }

    this.channels.delete(channelId);
    this.channelParticipants.delete(channelId);
    this.permissions.delete(channelId);

    this.emit('channelDeleted', { channelId });
    logger.info('VoiceChannelManager: channel deleted', { channelId });

    return true;
  }

  /**
   * List all channels.
   */
  listChannels(): VoiceChannel[] {
    return Array.from(this.channels.values()).map((ch) => ({ ...ch }));
  }

  /**
   * Get a specific channel.
   */
  getChannel(channelId: string): VoiceChannel | undefined {
    const ch = this.channels.get(channelId);
    return ch ? { ...ch } : undefined;
  }

  // ============================================================================
  // Join / Leave
  // ============================================================================

  /**
   * Join a voice channel.
   */
  async joinChannel(channelId: string): Promise<boolean> {
    if (!this.localParticipantId) {
      logger.warn('VoiceChannelManager: no local participant set');
      return false;
    }

    const channel = this.channels.get(channelId);
    if (!channel) {
      this.emit('error', { message: `Channel not found: ${channelId}`, code: 'CHANNEL_NOT_FOUND' });
      return false;
    }

    // Check capacity
    if (channel.participantIds.length >= channel.capacity) {
      this.emit('error', { message: `Channel full: ${channelId}`, code: 'CHANNEL_FULL' });
      return false;
    }

    // Leave current channel if in one
    const currentChannel = this.participantChannels.get(this.localParticipantId);
    if (currentChannel && currentChannel !== channelId) {
      await this.leaveChannel(currentChannel);
    }

    // Add to channel
    channel.participantIds.push(this.localParticipantId);
    this.participantChannels.set(this.localParticipantId, channelId);

    const participant: ChannelParticipant = {
      participantId: this.localParticipantId,
      displayName: this.localDisplayName,
      permission: this.permissions.get(channelId)?.get(this.localParticipantId) || 'member',
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      joinedAt: Date.now(),
    };

    this.channelParticipants.get(channelId)?.set(this.localParticipantId, participant);

    // Set default permission if not already set
    if (!this.permissions.get(channelId)?.has(this.localParticipantId)) {
      this.permissions.get(channelId)?.set(this.localParticipantId, 'member');
    }

    // Start VAD
    this.startVAD();

    // Sync voice state
    this.syncVoiceState(channelId);

    this.emit('participantJoined', { channelId, participant: { ...participant } });
    logger.info('VoiceChannelManager: joined channel', {
      channelId,
      participantId: this.localParticipantId,
    });

    return true;
  }

  /**
   * Leave a voice channel.
   */
  async leaveChannel(channelId: string): Promise<void> {
    if (!this.localParticipantId) return;

    const channel = this.channels.get(channelId);
    if (!channel) return;

    // Remove from channel
    channel.participantIds = channel.participantIds.filter(
      (id) => id !== this.localParticipantId
    );
    this.participantChannels.delete(this.localParticipantId);
    this.channelParticipants.get(channelId)?.delete(this.localParticipantId);

    // Stop VAD
    this.stopVAD();

    this.emit('participantLeft', { channelId, participantId: this.localParticipantId });
    logger.info('VoiceChannelManager: left channel', {
      channelId,
      participantId: this.localParticipantId,
    });
  }

  // ============================================================================
  // Permission Model
  // ============================================================================

  /**
   * Set a participant's permission level in a channel.
   * Only owner can promote/demote.
   */
  setPermission(channelId: string, participantId: string, permission: ChannelPermission): boolean {
    if (!this.hasPermission(channelId, this.localParticipantId || '', 'owner')) {
      logger.warn('VoiceChannelManager: only owner can set permissions');
      return false;
    }

    const perms = this.permissions.get(channelId);
    if (!perms) return false;

    perms.set(participantId, permission);
    logger.debug('VoiceChannelManager: permission set', {
      channelId,
      participantId,
      permission,
    });
    return true;
  }

  /**
   * Check if a participant has at least a given permission level.
   */
  private hasPermission(
    channelId: string,
    participantId: string,
    requiredLevel: ChannelPermission
  ): boolean {
    const perms = this.permissions.get(channelId);
    if (!perms) return false;

    const actual = perms.get(participantId);
    if (!actual) return false;

    const levels: Record<ChannelPermission, number> = {
      owner: 3,
      moderator: 2,
      member: 1,
    };

    return levels[actual] >= levels[requiredLevel];
  }

  /**
   * Mute another participant. Requires owner or moderator permission.
   */
  muteParticipant(channelId: string, participantId: string): boolean {
    if (!this.localParticipantId) return false;

    if (!this.hasPermission(channelId, this.localParticipantId, 'moderator')) {
      logger.warn('VoiceChannelManager: insufficient permission to mute');
      return false;
    }

    const participant = this.channelParticipants.get(channelId)?.get(participantId);
    if (!participant) return false;

    participant.isMuted = true;

    this.emit('participantMuted', {
      channelId,
      participantId,
      byId: this.localParticipantId,
    });

    logger.info('VoiceChannelManager: participant muted', {
      channelId,
      participantId,
      byId: this.localParticipantId,
    });

    return true;
  }

  /**
   * Unmute another participant. Requires owner or moderator permission.
   */
  unmuteParticipant(channelId: string, participantId: string): boolean {
    if (!this.localParticipantId) return false;

    if (!this.hasPermission(channelId, this.localParticipantId, 'moderator')) {
      logger.warn('VoiceChannelManager: insufficient permission to unmute');
      return false;
    }

    const participant = this.channelParticipants.get(channelId)?.get(participantId);
    if (!participant) return false;

    participant.isMuted = false;

    this.emit('participantUnmuted', {
      channelId,
      participantId,
      byId: this.localParticipantId,
    });

    logger.info('VoiceChannelManager: participant unmuted', {
      channelId,
      participantId,
      byId: this.localParticipantId,
    });

    return true;
  }

  // ============================================================================
  // Voice Activity Detection (VAD)
  // ============================================================================

  /**
   * Start voice activity detection using AnalyserNode FFT.
   */
  private startVAD(): void {
    if (this.vadTimer) return;
    if (this.inputMode !== 'vad') return;

    // Get local stream from transport
    const stream = this.transport?.getLocalStream();
    if (!stream) {
      logger.warn('VoiceChannelManager: no local stream for VAD');
      return;
    }

    try {
      this.vadAudioContext = new AudioContext();
      const source = this.vadAudioContext.createMediaStreamSource(stream);

      this.vadAnalyser = this.vadAudioContext.createAnalyser();
      this.vadAnalyser.fftSize = this.config.vadFftSize;
      this.vadAnalyser.smoothingTimeConstant = this.config.vadSmoothingTimeConstant;

      source.connect(this.vadAnalyser);

      this.vadBuffer = new Uint8Array(this.vadAnalyser.frequencyBinCount);

      // Poll at ~50ms intervals
      this.vadTimer = setInterval(() => {
        this.processVAD();
      }, 50);

      logger.debug('VoiceChannelManager: VAD started');
    } catch (error) {
      logger.error('VoiceChannelManager: failed to start VAD', {
        error: String(error),
      });
    }
  }

  /**
   * Stop voice activity detection.
   */
  private stopVAD(): void {
    if (this.vadTimer) {
      clearInterval(this.vadTimer);
      this.vadTimer = null;
    }

    if (this.vadAudioContext && this.vadAudioContext.state !== 'closed') {
      this.vadAudioContext.close().catch(() => {});
      this.vadAudioContext = null;
    }

    this.vadAnalyser = null;
    this.vadBuffer = null;
    this.localIsSpeaking = false;

    logger.debug('VoiceChannelManager: VAD stopped');
  }

  /**
   * Process VAD: analyze frequency data to detect speech.
   */
  private processVAD(): void {
    if (!this.vadAnalyser || !this.vadBuffer || !this.localParticipantId) return;

    this.vadAnalyser.getByteFrequencyData(this.vadBuffer);

    // Calculate average energy across frequency bins
    let sum = 0;
    for (let i = 0; i < this.vadBuffer.length; i++) {
      sum += this.vadBuffer[i];
    }
    const average = sum / this.vadBuffer.length;

    const wasSpeaking = this.localIsSpeaking;
    this.localIsSpeaking = average > this.config.vadThreshold;

    // Only emit on state change
    if (this.localIsSpeaking !== wasSpeaking) {
      const channelId = this.participantChannels.get(this.localParticipantId);
      if (channelId) {
        // Update local participant state
        const participant = this.channelParticipants.get(channelId)?.get(this.localParticipantId);
        if (participant) {
          participant.isSpeaking = this.localIsSpeaking;
        }

        this.emit('voiceActivity', {
          channelId,
          participantId: this.localParticipantId,
          isSpeaking: this.localIsSpeaking,
        });

        // Sync voice state
        this.syncVoiceState(channelId);
      }
    }
  }

  // ============================================================================
  // Push-to-Talk
  // ============================================================================

  /**
   * Set the input mode (VAD or push-to-talk).
   */
  setInputMode(mode: InputMode): void {
    const previousMode = this.inputMode;
    this.inputMode = mode;

    if (mode === 'vad' && previousMode !== 'vad') {
      this.removePushToTalkListeners();
      this.startVAD();
    } else if (mode === 'push-to-talk' && previousMode !== 'push-to-talk') {
      this.stopVAD();
      this.setupPushToTalk();
    }

    this.emit('inputModeChanged', { mode });
    logger.info('VoiceChannelManager: input mode changed', { mode });
  }

  getInputMode(): InputMode {
    return this.inputMode;
  }

  /**
   * Set up push-to-talk keyboard listeners.
   */
  private setupPushToTalk(): void {
    if (typeof globalThis.addEventListener !== 'function') return;

    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.code === this.config.pushToTalkKey && !this.isPushToTalkActive) {
        this.isPushToTalkActive = true;
        this.handlePushToTalkStateChange(true);
      }
    };

    this.keyupHandler = (e: KeyboardEvent) => {
      if (e.code === this.config.pushToTalkKey && this.isPushToTalkActive) {
        this.isPushToTalkActive = false;
        this.handlePushToTalkStateChange(false);
      }
    };

    globalThis.addEventListener('keydown', this.keydownHandler);
    globalThis.addEventListener('keyup', this.keyupHandler);

    logger.debug('VoiceChannelManager: push-to-talk listeners set up', {
      key: this.config.pushToTalkKey,
    });
  }

  /**
   * Remove push-to-talk keyboard listeners.
   */
  private removePushToTalkListeners(): void {
    if (typeof globalThis.removeEventListener !== 'function') return;

    if (this.keydownHandler) {
      globalThis.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.keyupHandler) {
      globalThis.removeEventListener('keyup', this.keyupHandler);
      this.keyupHandler = null;
    }
  }

  /**
   * Handle push-to-talk activation/deactivation.
   */
  private handlePushToTalkStateChange(active: boolean): void {
    if (!this.localParticipantId) return;

    // Enable/disable mic via transport
    if (this.transport) {
      this.transport.setMicEnabled(active);
    }

    this.localIsSpeaking = active;

    const channelId = this.participantChannels.get(this.localParticipantId);
    if (channelId) {
      const participant = this.channelParticipants.get(channelId)?.get(this.localParticipantId);
      if (participant) {
        participant.isSpeaking = active;
        participant.isMuted = !active;
      }

      this.emit('voiceActivity', {
        channelId,
        participantId: this.localParticipantId,
        isSpeaking: active,
      });

      this.syncVoiceState(channelId);
    }
  }

  // ============================================================================
  // StateSync Integration
  // ============================================================================

  /**
   * Broadcast local voice state through StateSync.
   * Voice state is stored as SyncState metadata with a 'voice' key.
   */
  private syncVoiceState(channelId: string): void {
    if (!this.stateSync || !this.localParticipantId) return;

    const voiceState: VoiceSyncState = {
      channelId,
      isMuted: this.transport ? !this.transport.getMicEnabled() : false,
      isDeafened: this.transport?.isDeafened() ?? false,
      isSpeaking: this.localIsSpeaking,
      audioLevel: 0,
      inputMode: this.inputMode,
      timestamp: Date.now(),
    };

    // Use StateSync to broadcast voice state
    this.stateSync.processState({
      objectId: `voice:${this.localParticipantId}`,
      metadata: { voice: voiceState },
      timestamp: Date.now(),
      sequence: Date.now(),
    });
  }

  /**
   * Handle incoming voice state from StateSync (remote participants).
   */
  handleRemoteVoiceState(participantId: string, voiceState: VoiceSyncState): void {
    const channelId = voiceState.channelId;
    const participants = this.channelParticipants.get(channelId);
    if (!participants) return;

    const participant = participants.get(participantId);
    if (participant) {
      participant.isMuted = voiceState.isMuted;
      participant.isDeafened = voiceState.isDeafened;
      participant.isSpeaking = voiceState.isSpeaking;

      if (voiceState.isSpeaking !== participant.isSpeaking) {
        this.emit('voiceActivity', {
          channelId,
          participantId,
          isSpeaking: voiceState.isSpeaking,
        });
      }
    }
  }

  // ============================================================================
  // Remote Participant Handlers
  // ============================================================================

  private handleRemoteParticipantJoined(
    channelId: string,
    participantId: string,
    displayName: string
  ): void {
    const channel = this.channels.get(channelId);
    if (!channel) return;

    if (!channel.participantIds.includes(participantId)) {
      channel.participantIds.push(participantId);
    }

    const participant: ChannelParticipant = {
      participantId,
      displayName,
      permission: 'member',
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      joinedAt: Date.now(),
    };

    this.channelParticipants.get(channelId)?.set(participantId, participant);
    this.participantChannels.set(participantId, channelId);

    if (!this.permissions.get(channelId)?.has(participantId)) {
      this.permissions.get(channelId)?.set(participantId, 'member');
    }

    this.emit('participantJoined', { channelId, participant: { ...participant } });
    logger.debug('VoiceChannelManager: remote participant joined', {
      channelId,
      participantId,
    });
  }

  private handleRemoteParticipantLeft(channelId: string, participantId: string): void {
    const channel = this.channels.get(channelId);
    if (!channel) return;

    channel.participantIds = channel.participantIds.filter((id) => id !== participantId);
    this.channelParticipants.get(channelId)?.delete(participantId);
    this.participantChannels.delete(participantId);

    this.emit('participantLeft', { channelId, participantId });
    logger.debug('VoiceChannelManager: remote participant left', {
      channelId,
      participantId,
    });
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Get all participants in a channel.
   */
  getChannelParticipants(channelId: string): ChannelParticipant[] {
    const participants = this.channelParticipants.get(channelId);
    if (!participants) return [];
    return Array.from(participants.values()).map((p) => ({ ...p }));
  }

  /**
   * Get the channel the local participant is currently in.
   */
  getCurrentChannelId(): string | null {
    if (!this.localParticipantId) return null;
    return this.participantChannels.get(this.localParticipantId) || null;
  }

  /**
   * Get the current channel.
   */
  getCurrentChannel(): VoiceChannel | null {
    const id = this.getCurrentChannelId();
    if (!id) return null;
    return this.getChannel(id) || null;
  }

  /**
   * Check if the local participant is speaking.
   */
  isLocalSpeaking(): boolean {
    return this.localIsSpeaking;
  }

  /**
   * Get participant count for a channel.
   */
  getChannelParticipantCount(channelId: string): number {
    return this.channelParticipants.get(channelId)?.size ?? 0;
  }

  // ============================================================================
  // Event System
  // ============================================================================

  on<T extends VoiceChannelEventType>(
    event: T,
    handler: VoiceChannelEventHandler<T>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(
      handler as VoiceChannelEventHandler<VoiceChannelEventType>
    );
    return () => this.off(event, handler);
  }

  off<T extends VoiceChannelEventType>(
    event: T,
    handler: VoiceChannelEventHandler<T>
  ): void {
    this.eventListeners.get(event)?.delete(
      handler as VoiceChannelEventHandler<VoiceChannelEventType>
    );
  }

  private emit<T extends VoiceChannelEventType>(
    event: T,
    data: VoiceChannelEventMap[T]
  ): void {
    this.eventListeners.get(event)?.forEach((handler) => handler(data));
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    // Leave current channel
    const currentChannel = this.getCurrentChannelId();
    if (currentChannel) {
      this.leaveChannel(currentChannel).catch(() => {});
    }

    // Stop VAD
    this.stopVAD();

    // Remove PTT listeners
    this.removePushToTalkListeners();

    // Clear all state
    this.channels.clear();
    this.channelParticipants.clear();
    this.permissions.clear();
    this.participantChannels.clear();
    this.eventListeners.clear();

    this.transport = null;
    this.spatialAudio = null;
    this.stateSync = null;

    logger.info('VoiceChannelManager: destroyed');
  }
}
