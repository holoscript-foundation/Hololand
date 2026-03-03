/**
 * @hololand/network WebRTCVoiceTransport
 *
 * SFU-based WebRTC voice transport using a LiveKit-style client SDK pattern.
 * Manages RTCPeerConnection instances per participant, Opus codec configuration
 * (48kHz stereo for spatial audio), echo cancellation, noise suppression,
 * automatic reconnection with exponential backoff, and per-participant
 * audio level tracking for speaking indicators.
 *
 * Architecture:
 * - Client connects to an SFU media server (not peer mesh)
 * - Single upstream PeerConnection publishes local audio
 * - One downstream PeerConnection per remote participant subscribes to their track
 * - Server-side mixing/routing handled by the SFU
 */

import { logger } from '../logger';
import type {
  WebRTCVoiceTransportConfig,
  VoiceTransportState,
  VoiceParticipantInfo,
  VoiceTransportEventType,
  VoiceTransportEventHandler,
  VoiceTransportEventMap,
  ICEServerConfig,
} from './types';

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_ICE_SERVERS: ICEServerConfig[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const DEFAULT_CONFIG: Required<WebRTCVoiceTransportConfig> = {
  iceServers: DEFAULT_ICE_SERVERS,
  sampleRate: 48000,
  stereo: true,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  reconnectBaseDelay: 1000,
  reconnectMaxDelay: 30000,
  reconnectMaxAttempts: 10,
  audioLevelInterval: 100,
  speakingThreshold: 0.05,
};

// ============================================================================
// Subscriber Entry (one per remote participant)
// ============================================================================

interface SubscriberEntry {
  participantId: string;
  connection: RTCPeerConnection;
  stream: MediaStream | null;
  audioTrack: MediaStreamTrack | null;
  audioLevel: number;
  isSpeaking: boolean;
}

// ============================================================================
// WebRTCVoiceTransport
// ============================================================================

export class WebRTCVoiceTransport {
  private config: Required<WebRTCVoiceTransportConfig>;
  private state: VoiceTransportState = 'disconnected';
  private roomId: string | null = null;
  private localParticipantId: string | null = null;

  /** Upstream connection: publishes local audio to SFU. */
  private publisherConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private localAudioTrack: MediaStreamTrack | null = null;

  /** Downstream connections: one per remote participant. */
  private subscribers: Map<string, SubscriberEntry> = new Map();

  /** Remote participant info map. */
  private participants: Map<string, VoiceParticipantInfo> = new Map();

  /** Mic enabled state. */
  private micEnabled: boolean = true;
  /** Deafened state. */
  private deafened: boolean = false;

  /** Reconnection state. */
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** Audio level polling. */
  private audioContext: AudioContext | null = null;
  private audioLevelTimer: ReturnType<typeof setInterval> | null = null;
  private analyserNodes: Map<string, AnalyserNode> = new Map();
  private localAnalyser: AnalyserNode | null = null;

  /** Event listeners. */
  private eventListeners: Map<
    VoiceTransportEventType,
    Set<VoiceTransportEventHandler<VoiceTransportEventType>>
  > = new Map();

  /** Signaling callbacks -- wired externally to communicate with the SFU. */
  private signalingSend: ((msg: Record<string, unknown>) => void) | null = null;

  constructor(config: WebRTCVoiceTransportConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('WebRTCVoiceTransport: initialized', {
      sampleRate: this.config.sampleRate,
      stereo: this.config.stereo,
    });
  }

  // ============================================================================
  // Connection Lifecycle
  // ============================================================================

  /**
   * Connect to a voice room on the SFU media server.
   * This acquires local media, creates the publisher PeerConnection,
   * and signals the SFU to join the room.
   */
  async connect(roomId: string, token: string): Promise<void> {
    if (this.state === 'connected') {
      throw new Error('WebRTCVoiceTransport: already connected');
    }

    this.setState('connecting');
    this.roomId = roomId;
    this.reconnectAttempts = 0;

    try {
      // 1. Acquire local audio stream with Opus-optimized constraints
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: this.config.sampleRate },
          channelCount: { ideal: this.config.stereo ? 2 : 1 },
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
        },
      });

      this.localAudioTrack = this.localStream.getAudioTracks()[0] || null;

      // 2. Initialize AudioContext for level monitoring
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
      });

      // 3. Set up local analyser for self-monitoring
      if (this.localAudioTrack && this.audioContext) {
        const sourceNode = this.audioContext.createMediaStreamSource(this.localStream);
        this.localAnalyser = this.audioContext.createAnalyser();
        this.localAnalyser.fftSize = 256;
        this.localAnalyser.smoothingTimeConstant = 0.8;
        sourceNode.connect(this.localAnalyser);
      }

      // 4. Create publisher PeerConnection
      this.publisherConnection = this.createPeerConnection('publisher');

      // Add local tracks to publisher
      if (this.localStream) {
        for (const track of this.localStream.getTracks()) {
          this.publisherConnection.addTrack(track, this.localStream);
        }
      }

      // 5. Create and send SDP offer to SFU
      const offer = await this.publisherConnection.createOffer();

      // Modify SDP for Opus stereo and high quality
      const modifiedSdp = this.configureOpusSdp(offer.sdp || '');
      offer.sdp = modifiedSdp;

      await this.publisherConnection.setLocalDescription(offer);

      // Signal to SFU: join room with offer
      this.sendSignaling({
        type: 'join',
        roomId,
        token,
        offer: this.publisherConnection.localDescription?.sdp,
      });

      // 6. Start audio level polling
      this.startAudioLevelPolling();

      // Generate a local participant ID
      this.localParticipantId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.setState('connected');
      this.emit('connected', {
        roomId,
        participantId: this.localParticipantId,
      });

      logger.info('WebRTCVoiceTransport: connected to room', { roomId });
    } catch (error) {
      logger.error('WebRTCVoiceTransport: connection failed', { error: String(error) });
      this.emit('error', { message: `Connection failed: ${String(error)}` });
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from the voice room.
   * Cleans up all PeerConnections, tracks, and timers.
   */
  disconnect(): void {
    this.cancelReconnect();

    // Stop audio level polling
    this.stopAudioLevelPolling();

    // Close publisher connection
    if (this.publisherConnection) {
      this.publisherConnection.close();
      this.publisherConnection = null;
    }

    // Stop local media
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
      this.localAudioTrack = null;
    }

    // Close all subscriber connections
    for (const [participantId, entry] of this.subscribers) {
      entry.connection.close();
      if (entry.stream) {
        entry.stream.getTracks().forEach((track) => track.stop());
      }
      this.emit('participantLeft', { participantId });
    }
    this.subscribers.clear();
    this.participants.clear();
    this.analyserNodes.clear();
    this.localAnalyser = null;

    // Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // Signal SFU
    if (this.roomId) {
      this.sendSignaling({ type: 'leave', roomId: this.roomId });
    }

    const prevRoomId = this.roomId;
    this.roomId = null;
    this.localParticipantId = null;

    this.setState('disconnected');
    this.emit('disconnected', { reason: 'client_disconnect' });
    logger.info('WebRTCVoiceTransport: disconnected', { roomId: prevRoomId });
  }

  // ============================================================================
  // Mic / Deafen Controls
  // ============================================================================

  setMicEnabled(enabled: boolean): void {
    this.micEnabled = enabled;
    if (this.localAudioTrack) {
      this.localAudioTrack.enabled = enabled;
    }
    logger.debug('WebRTCVoiceTransport: mic', { enabled });
  }

  getMicEnabled(): boolean {
    return this.micEnabled;
  }

  setDeafened(deafened: boolean): void {
    this.deafened = deafened;

    // Mute all subscriber audio when deafened
    for (const entry of this.subscribers.values()) {
      if (entry.audioTrack) {
        entry.audioTrack.enabled = !deafened;
      }
    }

    // Also mute mic when deafened
    if (deafened && this.localAudioTrack) {
      this.localAudioTrack.enabled = false;
    } else if (!deafened && this.micEnabled && this.localAudioTrack) {
      this.localAudioTrack.enabled = true;
    }

    logger.debug('WebRTCVoiceTransport: deafened', { deafened });
  }

  isDeafened(): boolean {
    return this.deafened;
  }

  // ============================================================================
  // Participant Management
  // ============================================================================

  getParticipants(): VoiceParticipantInfo[] {
    return Array.from(this.participants.values());
  }

  getParticipant(participantId: string): VoiceParticipantInfo | undefined {
    return this.participants.get(participantId);
  }

  getLocalParticipantId(): string | null {
    return this.localParticipantId;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // ============================================================================
  // SFU Signaling Handlers
  // ============================================================================

  /**
   * Set the signaling send function (connects to WebSocket or signaling channel).
   */
  setSignalingSend(fn: (msg: Record<string, unknown>) => void): void {
    this.signalingSend = fn;
  }

  /**
   * Handle an incoming signaling message from the SFU.
   * Called by external signaling layer (e.g., WebSocket message handler).
   */
  async handleSignalingMessage(message: Record<string, unknown>): Promise<void> {
    const type = message.type as string;

    switch (type) {
      case 'answer': {
        // SFU answer to our publisher offer
        const sdp = message.sdp as string;
        if (this.publisherConnection) {
          await this.publisherConnection.setRemoteDescription(
            new RTCSessionDescription({ type: 'answer', sdp })
          );
        }
        break;
      }

      case 'participant_joined': {
        const participantId = message.participantId as string;
        const displayName = (message.displayName as string) || participantId;
        await this.addSubscriber(participantId, displayName);
        break;
      }

      case 'participant_left': {
        const participantId = message.participantId as string;
        this.removeSubscriber(participantId);
        break;
      }

      case 'subscriber_offer': {
        // SFU sends us an offer for a subscriber connection
        const participantId = message.participantId as string;
        const sdp = message.sdp as string;
        await this.handleSubscriberOffer(participantId, sdp);
        break;
      }

      case 'ice_candidate': {
        const participantId = message.participantId as string;
        const candidate = message.candidate as RTCIceCandidateInit;
        const target = message.target as string; // 'publisher' or participantId

        const connection =
          target === 'publisher'
            ? this.publisherConnection
            : this.subscribers.get(participantId)?.connection;

        if (connection) {
          await connection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        break;
      }

      case 'room_state': {
        // Initial room state with existing participants
        const participants = message.participants as Array<{
          participantId: string;
          displayName: string;
        }>;
        if (participants) {
          for (const p of participants) {
            await this.addSubscriber(p.participantId, p.displayName);
          }
        }
        break;
      }

      default:
        logger.debug('WebRTCVoiceTransport: unknown signaling message', { type });
    }
  }

  // ============================================================================
  // Subscriber Management (one RTCPeerConnection per remote participant)
  // ============================================================================

  private async addSubscriber(participantId: string, displayName: string): Promise<void> {
    if (this.subscribers.has(participantId)) return;

    const connection = this.createPeerConnection(participantId);

    const entry: SubscriberEntry = {
      participantId,
      connection,
      stream: null,
      audioTrack: null,
      audioLevel: 0,
      isSpeaking: false,
    };

    this.subscribers.set(participantId, entry);

    // Handle incoming audio track from SFU
    connection.ontrack = (event: RTCTrackEvent) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      entry.stream = stream;
      entry.audioTrack = event.track;

      // Apply deafened state
      if (this.deafened) {
        event.track.enabled = false;
      }

      // Set up analyser for this participant
      if (this.audioContext) {
        try {
          const sourceNode = this.audioContext.createMediaStreamSource(stream);
          const analyser = this.audioContext.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          sourceNode.connect(analyser);
          this.analyserNodes.set(participantId, analyser);
        } catch (err) {
          logger.warn('WebRTCVoiceTransport: failed to create analyser', {
            participantId,
            error: String(err),
          });
        }
      }

      const participant: VoiceParticipantInfo = {
        participantId,
        displayName,
        audioTrack: event.track,
        stream,
        audioLevel: 0,
        isSpeaking: false,
        isMuted: false,
      };
      this.participants.set(participantId, participant);

      this.emit('trackSubscribed', {
        participantId,
        track: event.track,
        stream,
      });

      this.emit('participantJoined', { participant });

      logger.debug('WebRTCVoiceTransport: track subscribed', { participantId });
    };

    logger.info('WebRTCVoiceTransport: subscriber added', { participantId, displayName });
  }

  private removeSubscriber(participantId: string): void {
    const entry = this.subscribers.get(participantId);
    if (!entry) return;

    entry.connection.close();
    if (entry.stream) {
      entry.stream.getTracks().forEach((track) => track.stop());
    }

    this.subscribers.delete(participantId);
    this.participants.delete(participantId);
    this.analyserNodes.delete(participantId);

    this.emit('trackUnsubscribed', { participantId });
    this.emit('participantLeft', { participantId });

    logger.info('WebRTCVoiceTransport: subscriber removed', { participantId });
  }

  private async handleSubscriberOffer(participantId: string, sdp: string): Promise<void> {
    let entry = this.subscribers.get(participantId);
    if (!entry) {
      // Auto-create subscriber if needed
      const connection = this.createPeerConnection(participantId);
      entry = {
        participantId,
        connection,
        stream: null,
        audioTrack: null,
        audioLevel: 0,
        isSpeaking: false,
      };
      this.subscribers.set(participantId, entry);
    }

    await entry.connection.setRemoteDescription(
      new RTCSessionDescription({ type: 'offer', sdp })
    );

    const answer = await entry.connection.createAnswer();
    await entry.connection.setLocalDescription(answer);

    this.sendSignaling({
      type: 'subscriber_answer',
      participantId,
      sdp: entry.connection.localDescription?.sdp,
    });
  }

  // ============================================================================
  // RTCPeerConnection Factory
  // ============================================================================

  private createPeerConnection(label: string): RTCPeerConnection {
    const iceServers = this.config.iceServers.map((s) => ({
      urls: s.urls,
      username: s.username,
      credential: s.credential,
    }));

    const connection = new RTCPeerConnection({
      iceServers,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignaling({
          type: 'ice_candidate',
          target: label,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    connection.onconnectionstatechange = () => {
      const connState = connection.connectionState;
      logger.debug('WebRTCVoiceTransport: connection state change', {
        label,
        state: connState,
      });

      if (connState === 'failed') {
        if (label === 'publisher') {
          this.attemptReconnect();
        }
      }
    };

    connection.oniceconnectionstatechange = () => {
      const iceState = connection.iceConnectionState;
      logger.debug('WebRTCVoiceTransport: ICE state change', {
        label,
        state: iceState,
      });
    };

    return connection;
  }

  // ============================================================================
  // Opus SDP Configuration
  // ============================================================================

  /**
   * Modify SDP to configure Opus codec for high-quality spatial audio:
   * - Enable stereo
   * - Set maxaveragebitrate for quality
   * - Set sprop-stereo for sender-side stereo
   */
  private configureOpusSdp(sdp: string): string {
    if (!this.config.stereo) return sdp;

    // Find the Opus payload type
    const opusMatch = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
    if (!opusMatch) return sdp;

    const payloadType = opusMatch[1];

    // Check if fmtp line already exists for this payload
    const fmtpRegex = new RegExp(`a=fmtp:${payloadType} (.+)`);
    const fmtpMatch = sdp.match(fmtpRegex);

    const stereoParams = 'stereo=1;sprop-stereo=1;maxaveragebitrate=128000';

    if (fmtpMatch) {
      // Append to existing fmtp
      sdp = sdp.replace(fmtpRegex, `a=fmtp:${payloadType} ${fmtpMatch[1]};${stereoParams}`);
    } else {
      // Add new fmtp line after the rtpmap line
      sdp = sdp.replace(
        `a=rtpmap:${payloadType} opus/48000/2`,
        `a=rtpmap:${payloadType} opus/48000/2\r\na=fmtp:${payloadType} ${stereoParams}`
      );
    }

    return sdp;
  }

  // ============================================================================
  // Audio Level Monitoring
  // ============================================================================

  private startAudioLevelPolling(): void {
    if (this.audioLevelTimer) return;

    const buffer = new Uint8Array(128);

    this.audioLevelTimer = setInterval(() => {
      // Monitor local audio level
      if (this.localAnalyser && this.localParticipantId) {
        this.localAnalyser.getByteFrequencyData(buffer);
        const level = this.calculateRmsLevel(buffer);
        const isSpeaking = level > this.config.speakingThreshold;

        this.emit('audioLevelChanged', {
          participantId: this.localParticipantId,
          level,
          isSpeaking,
        });
      }

      // Monitor each remote participant's audio level
      for (const [participantId, analyser] of this.analyserNodes) {
        analyser.getByteFrequencyData(buffer);
        const level = this.calculateRmsLevel(buffer);
        const isSpeaking = level > this.config.speakingThreshold;

        const entry = this.subscribers.get(participantId);
        if (entry) {
          entry.audioLevel = level;
          entry.isSpeaking = isSpeaking;
        }

        const participant = this.participants.get(participantId);
        if (participant) {
          participant.audioLevel = level;
          participant.isSpeaking = isSpeaking;
        }

        this.emit('audioLevelChanged', {
          participantId,
          level,
          isSpeaking,
        });
      }
    }, this.config.audioLevelInterval);
  }

  private stopAudioLevelPolling(): void {
    if (this.audioLevelTimer) {
      clearInterval(this.audioLevelTimer);
      this.audioLevelTimer = null;
    }
  }

  /**
   * Calculate RMS (root mean square) audio level from frequency data.
   * Returns a normalized value 0-1.
   */
  private calculateRmsLevel(data: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const normalized = data[i] / 255;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / data.length);
  }

  // ============================================================================
  // Automatic Reconnection (Exponential Backoff)
  // ============================================================================

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectMaxAttempts) {
      this.setState('failed');
      this.emit('reconnectFailed', { attempts: this.reconnectAttempts });
      logger.error('WebRTCVoiceTransport: max reconnect attempts reached', {
        attempts: this.reconnectAttempts,
      });
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
    const delay = Math.min(
      this.config.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts),
      this.config.reconnectMaxDelay
    );

    this.reconnectAttempts++;
    this.setState('reconnecting');

    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      delay,
    });

    logger.info('WebRTCVoiceTransport: reconnecting', {
      attempt: this.reconnectAttempts,
      delay,
    });

    this.reconnectTimer = setTimeout(async () => {
      if (this.state !== 'reconnecting') return;

      try {
        // Re-create publisher connection
        if (this.publisherConnection) {
          this.publisherConnection.close();
        }

        this.publisherConnection = this.createPeerConnection('publisher');

        if (this.localStream) {
          for (const track of this.localStream.getTracks()) {
            this.publisherConnection.addTrack(track, this.localStream);
          }
        }

        const offer = await this.publisherConnection.createOffer();
        offer.sdp = this.configureOpusSdp(offer.sdp || '');
        await this.publisherConnection.setLocalDescription(offer);

        this.sendSignaling({
          type: 'rejoin',
          roomId: this.roomId,
          offer: this.publisherConnection.localDescription?.sdp,
        });

        // Reset on success (actual success confirmed via signaling answer)
        this.reconnectAttempts = 0;
        this.setState('connected');

        logger.info('WebRTCVoiceTransport: reconnected');
      } catch (error) {
        logger.error('WebRTCVoiceTransport: reconnect attempt failed', {
          error: String(error),
        });
        this.attemptReconnect();
      }
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  // ============================================================================
  // ICE Server Configuration
  // ============================================================================

  /**
   * Update ICE server configuration at runtime (e.g., rotate TURN credentials).
   */
  setIceServers(servers: ICEServerConfig[]): void {
    this.config.iceServers = servers;
    logger.info('WebRTCVoiceTransport: ICE servers updated', {
      count: servers.length,
    });
  }

  getIceServers(): ICEServerConfig[] {
    return [...this.config.iceServers];
  }

  // ============================================================================
  // State Management
  // ============================================================================

  getState(): VoiceTransportState {
    return this.state;
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  private setState(newState: VoiceTransportState): void {
    if (this.state === newState) return;
    const previousState = this.state;
    this.state = newState;
    this.emit('stateChanged', { state: newState });
    logger.debug('WebRTCVoiceTransport: state transition', {
      from: previousState,
      to: newState,
    });
  }

  // ============================================================================
  // Signaling Helpers
  // ============================================================================

  private sendSignaling(msg: Record<string, unknown>): void {
    if (this.signalingSend) {
      this.signalingSend(msg);
    } else {
      logger.warn('WebRTCVoiceTransport: no signaling send function set');
    }
  }

  // ============================================================================
  // Callbacks for Participant Lifecycle
  // ============================================================================

  /** Register callback for when a participant joins. */
  onParticipantJoined(
    callback: (participant: VoiceParticipantInfo) => void
  ): () => void {
    return this.on('participantJoined', (event) => callback(event.participant));
  }

  /** Register callback for when a participant leaves. */
  onParticipantLeft(callback: (participantId: string) => void): () => void {
    return this.on('participantLeft', (event) => callback(event.participantId));
  }

  // ============================================================================
  // Event System
  // ============================================================================

  on<T extends VoiceTransportEventType>(
    event: T,
    handler: VoiceTransportEventHandler<T>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(
      handler as VoiceTransportEventHandler<VoiceTransportEventType>
    );
    return () => this.off(event, handler);
  }

  off<T extends VoiceTransportEventType>(
    event: T,
    handler: VoiceTransportEventHandler<T>
  ): void {
    this.eventListeners.get(event)?.delete(
      handler as VoiceTransportEventHandler<VoiceTransportEventType>
    );
  }

  private emit<T extends VoiceTransportEventType>(
    event: T,
    data: VoiceTransportEventMap[T]
  ): void {
    this.eventListeners.get(event)?.forEach((handler) => handler(data));
  }

  // ============================================================================
  // Diagnostics
  // ============================================================================

  /** Get connection stats for the publisher PeerConnection. */
  async getPublisherStats(): Promise<RTCStatsReport | null> {
    if (!this.publisherConnection) return null;
    return this.publisherConnection.getStats();
  }

  /** Get connection stats for a specific subscriber. */
  async getSubscriberStats(participantId: string): Promise<RTCStatsReport | null> {
    const entry = this.subscribers.get(participantId);
    if (!entry) return null;
    return entry.connection.getStats();
  }

  /** Get total participant count (excluding self). */
  getParticipantCount(): number {
    return this.participants.size;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    this.disconnect();
    this.eventListeners.clear();
    logger.info('WebRTCVoiceTransport: destroyed');
  }
}
