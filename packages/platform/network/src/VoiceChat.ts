/**
 * @hololand/network VoiceChat
 *
 * WebRTC-based voice chat with spatial audio support
 */

import { logger } from './logger';
import type { NetworkClient } from './NetworkClient';
import type { VoiceConfig, VoiceState, VoiceParticipant, Vector3 } from './types';

const DEFAULT_CONFIG: Required<VoiceConfig> = {
  enabled: true,
  spatial: true,
  maxDistance: 50,
  falloffFactor: 2,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  audioElement: HTMLAudioElement | null;
  volume: number;
}

export interface VoiceChatEventMap {
  participantJoined: { participant: VoiceParticipant };
  participantLeft: { participantId: string };
  stateChanged: { participantId: string; state: VoiceState };
  localStreamStarted: { stream: MediaStream };
  localStreamStopped: void;
  error: { message: string; code?: string };
}

export type VoiceChatEventType = keyof VoiceChatEventMap;
export type VoiceChatEventHandler<T extends VoiceChatEventType> = (
  event: VoiceChatEventMap[T]
) => void;

export class VoiceChat {
  private config: Required<VoiceConfig>;
  private client: NetworkClient;
  private roomId: string | null = null;
  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private participants: Map<string, VoiceParticipant> = new Map();
  private localState: VoiceState = 'muted';
  private localPosition: Vector3 = { x: 0, y: 0, z: 0 };
  private isActive: boolean = false;

  private eventListeners: Map<
    VoiceChatEventType,
    Set<VoiceChatEventHandler<VoiceChatEventType>>
  > = new Map();
  private unsubscribers: (() => void)[] = [];

  // WebRTC configuration
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  constructor(client: NetworkClient, config: VoiceConfig = {}) {
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupMessageHandlers();
    logger.info('VoiceChat initialized', { config: this.config });
  }

  // ============================================================================
  // Voice Chat Control
  // ============================================================================

  async joinVoice(roomId: string): Promise<void> {
    if (this.isActive) {
      throw new Error('Already in voice chat');
    }

    this.roomId = roomId;

    // Request microphone access
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
        },
      });

      this.isActive = true;
      this.localState = 'listening';

      // Notify server
      this.client.send({
        type: 'voiceJoin',
        category: 'voice',
        payload: { roomId },
        timestamp: Date.now(),
      });

      this.emit('localStreamStarted', { stream: this.localStream });
      logger.info('Joined voice chat', { roomId });
    } catch (error) {
      logger.error('Failed to access microphone', { error: String(error) });
      throw new Error('Failed to access microphone');
    }
  }

  leaveVoice(): void {
    if (!this.isActive) return;

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    this.peers.forEach((peer) => {
      peer.connection.close();
      if (peer.audioElement) {
        peer.audioElement.srcObject = null;
      }
    });
    this.peers.clear();
    this.participants.clear();

    // Notify server
    if (this.roomId) {
      this.client.send({
        type: 'voiceLeave',
        category: 'voice',
        payload: { roomId: this.roomId },
        timestamp: Date.now(),
      });
    }

    this.isActive = false;
    this.roomId = null;
    this.localState = 'muted';

    this.emit('localStreamStopped', undefined);
    logger.info('Left voice chat');
  }

  // ============================================================================
  // Mute Controls
  // ============================================================================

  mute(): void {
    if (!this.localStream) return;

    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });

    this.localState = 'muted';
    this.broadcastState();
    logger.debug('Muted microphone');
  }

  unmute(): void {
    if (!this.localStream) return;

    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });

    this.localState = 'speaking';
    this.broadcastState();
    logger.debug('Unmuted microphone');
  }

  toggleMute(): void {
    if (this.localState === 'muted') {
      this.unmute();
    } else {
      this.mute();
    }
  }

  deafen(): void {
    this.localState = 'deafened';
    this.peers.forEach((peer) => {
      if (peer.audioElement) {
        peer.audioElement.muted = true;
      }
    });
    this.broadcastState();
    logger.debug('Deafened');
  }

  undeafen(): void {
    this.localState = this.localStream?.getAudioTracks()[0]?.enabled
      ? 'speaking'
      : 'muted';

    this.peers.forEach((peer) => {
      if (peer.audioElement) {
        peer.audioElement.muted = false;
      }
    });
    this.broadcastState();
    logger.debug('Undeafened');
  }

  private broadcastState(): void {
    if (!this.roomId) return;

    this.client.send({
      type: 'voiceStateChanged',
      category: 'voice',
      payload: { roomId: this.roomId, state: this.localState },
      timestamp: Date.now(),
    });
  }

  // ============================================================================
  // Volume Control
  // ============================================================================

  setParticipantVolume(participantId: string, volume: number): void {
    const peer = this.peers.get(participantId);
    if (peer?.audioElement) {
      peer.volume = Math.max(0, Math.min(1, volume));
      peer.audioElement.volume = peer.volume;
    }
  }

  getParticipantVolume(participantId: string): number {
    return this.peers.get(participantId)?.volume ?? 1;
  }

  // ============================================================================
  // Spatial Audio
  // ============================================================================

  updateLocalPosition(position: Vector3): void {
    this.localPosition = position;

    if (!this.config.spatial) return;

    // Update volumes based on distance
    this.participants.forEach((participant) => {
      if (!participant.position) return;

      const distance = this.calculateDistance(this.localPosition, participant.position);
      const volume = this.calculateSpatialVolume(distance);

      this.setParticipantVolume(participant.id, volume);
    });
  }

  updateParticipantPosition(participantId: string, position: Vector3): void {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.position = position;

      if (this.config.spatial) {
        const distance = this.calculateDistance(this.localPosition, position);
        const volume = this.calculateSpatialVolume(distance);
        this.setParticipantVolume(participantId, volume);
      }
    }
  }

  private calculateDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private calculateSpatialVolume(distance: number): number {
    if (distance >= this.config.maxDistance) {
      return 0;
    }

    const normalizedDistance = distance / this.config.maxDistance;
    return Math.pow(1 - normalizedDistance, this.config.falloffFactor);
  }

  // ============================================================================
  // WebRTC Signaling
  // ============================================================================

  private setupMessageHandlers(): void {
    // Handle new participant
    this.unsubscribers.push(
      this.client.onMessage('voiceParticipantJoined', async (message) => {
        const { participantId, displayName } = message.payload as {
          participantId: string;
          displayName: string;
        };

        const participant: VoiceParticipant = {
          id: participantId,
          displayName,
          state: 'listening',
          volume: 1,
          isMuted: false,
          isDeafened: false,
        };

        this.participants.set(participantId, participant);
        this.emit('participantJoined', { participant });

        // Initiate WebRTC connection
        await this.createPeerConnection(participantId, true);
      })
    );

    // Handle participant left
    this.unsubscribers.push(
      this.client.onMessage('voiceParticipantLeft', (message) => {
        const { participantId } = message.payload as { participantId: string };

        this.closePeerConnection(participantId);
        this.participants.delete(participantId);
        this.emit('participantLeft', { participantId });
      })
    );

    // Handle state change
    this.unsubscribers.push(
      this.client.onMessage('voiceStateChanged', (message) => {
        const { participantId, state } = message.payload as {
          participantId: string;
          state: VoiceState;
        };

        const participant = this.participants.get(participantId);
        if (participant) {
          participant.state = state;
          participant.isMuted = state === 'muted';
          participant.isDeafened = state === 'deafened';
        }

        this.emit('stateChanged', { participantId, state });
      })
    );

    // Handle WebRTC offer
    this.unsubscribers.push(
      this.client.onMessage('rtcOffer', async (message) => {
        const { fromId, offer } = message.payload as {
          fromId: string;
          offer: RTCSessionDescriptionInit;
        };

        let peer = this.peers.get(fromId);
        if (!peer) {
          await this.createPeerConnection(fromId, false);
          peer = this.peers.get(fromId);
        }

        if (peer) {
          await peer.connection.setRemoteDescription(offer);
          const answer = await peer.connection.createAnswer();
          await peer.connection.setLocalDescription(answer);

          this.client.send({
            type: 'rtcAnswer',
            category: 'voice',
            payload: { toId: fromId, answer },
            timestamp: Date.now(),
          });
        }
      })
    );

    // Handle WebRTC answer
    this.unsubscribers.push(
      this.client.onMessage('rtcAnswer', async (message) => {
        const { fromId, answer } = message.payload as {
          fromId: string;
          answer: RTCSessionDescriptionInit;
        };

        const peer = this.peers.get(fromId);
        if (peer) {
          await peer.connection.setRemoteDescription(answer);
        }
      })
    );

    // Handle ICE candidate
    this.unsubscribers.push(
      this.client.onMessage('rtcIceCandidate', async (message) => {
        const { fromId, candidate } = message.payload as {
          fromId: string;
          candidate: RTCIceCandidateInit;
        };

        const peer = this.peers.get(fromId);
        if (peer) {
          await peer.connection.addIceCandidate(candidate);
        }
      })
    );
  }

  private async createPeerConnection(
    peerId: string,
    isInitiator: boolean
  ): Promise<void> {
    const connection = new RTCPeerConnection(this.rtcConfig);

    const peer: PeerConnection = {
      peerId,
      connection,
      audioElement: null,
      volume: 1,
    };

    // Add local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        connection.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.client.send({
          type: 'rtcIceCandidate',
          category: 'voice',
          payload: { toId: peerId, candidate: event.candidate },
          timestamp: Date.now(),
        });
      }
    };

    // Handle remote stream
    connection.ontrack = (event) => {
      const audioElement = new Audio();
      audioElement.srcObject = event.streams[0];
      audioElement.autoplay = true;
      audioElement.volume = peer.volume;

      peer.audioElement = audioElement;
      logger.debug('Remote stream received', { peerId });
    };

    this.peers.set(peerId, peer);

    // Create offer if initiator
    if (isInitiator) {
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      this.client.send({
        type: 'rtcOffer',
        category: 'voice',
        payload: { toId: peerId, offer },
        timestamp: Date.now(),
      });
    }
  }

  private closePeerConnection(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connection.close();
      if (peer.audioElement) {
        peer.audioElement.srcObject = null;
      }
      this.peers.delete(peerId);
    }
  }

  // ============================================================================
  // Event System
  // ============================================================================

  on<T extends VoiceChatEventType>(
    event: T,
    handler: VoiceChatEventHandler<T>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(
      handler as VoiceChatEventHandler<VoiceChatEventType>
    );

    return () => this.off(event, handler);
  }

  off<T extends VoiceChatEventType>(
    event: T,
    handler: VoiceChatEventHandler<T>
  ): void {
    this.eventListeners.get(event)?.delete(
      handler as VoiceChatEventHandler<VoiceChatEventType>
    );
  }

  private emit<T extends VoiceChatEventType>(
    event: T,
    data: VoiceChatEventMap[T]
  ): void {
    this.eventListeners.get(event)?.forEach((handler) => handler(data));
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getParticipants(): VoiceParticipant[] {
    return Array.from(this.participants.values());
  }

  getParticipant(id: string): VoiceParticipant | undefined {
    return this.participants.get(id);
  }

  getLocalState(): VoiceState {
    return this.localState;
  }

  isInVoice(): boolean {
    return this.isActive;
  }

  isMuted(): boolean {
    return this.localState === 'muted';
  }

  isDeafened(): boolean {
    return this.localState === 'deafened';
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    this.leaveVoice();
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.eventListeners.clear();
    logger.info('VoiceChat destroyed');
  }
}
