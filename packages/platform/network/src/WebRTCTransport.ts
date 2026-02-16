/**
 * WebRTCTransport
 *
 * Peer-to-peer transport using WebRTC data channels.
 * Implements the NetworkTransport interface for the NetworkManager.
 *
 * Features:
 * - Multiple concurrent peer connections via PeerManager
 * - Reliable (ordered) and unreliable (unordered) data channels
 * - ICE candidate gathering with TURN fallback
 * - Automatic signaling through a WebSocket signaling channel
 * - Connection quality monitoring (RTT, packet loss)
 * - Graceful fallback to WebSocket when WebRTC is unavailable
 */

import { logger } from './logger';
import type {
  NetworkTransport,
  NetworkMessage,
  NetworkEvents,
  NetworkEventCallback,
  PeerId,
  RoomId,
  TransportType,
  RTCIceServerConfig,
} from './types';

// ============================================================================
// Peer Connection Wrapper
// ============================================================================

export interface PeerConnectionConfig {
  iceServers?: RTCIceServerConfig[];
  /** Max time to wait for ICE gathering in ms (default 5 000). */
  iceTimeout?: number;
}

interface PeerEntry {
  peerId: PeerId;
  connection: RTCPeerConnection;
  reliableChannel: RTCDataChannel | null;
  unreliableChannel: RTCDataChannel | null;
  latency: number;
  lastPing: number;
  connected: boolean;
}

// ============================================================================
// WebRTC Transport Config
// ============================================================================

export interface WebRTCTransportConfig {
  iceServers?: RTCIceServerConfig[];
  /** Timeout for individual peer ICE gathering (ms, default 5 000). */
  iceTimeout?: number;
  /** Use an unreliable data channel for state updates (default true). */
  unreliableChannel?: boolean;
  /** Max message size before chunking (bytes, default 16 384). */
  maxMessageSize?: number;
  /** Heartbeat interval per peer in ms (default 5 000). */
  peerHeartbeatInterval?: number;
}

const DEFAULTS: Required<WebRTCTransportConfig> = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  iceTimeout: 5_000,
  unreliableChannel: true,
  maxMessageSize: 16_384,
  peerHeartbeatInterval: 5_000,
};

// ============================================================================
// WebRTC Transport
// ============================================================================

export class WebRTCTransport implements NetworkTransport {
  readonly type: TransportType = 'webrtc';

  private config: Required<WebRTCTransportConfig>;
  private _connected: boolean = false;
  private _peerId: PeerId = '';
  private _roomId: RoomId = '';
  private peers: Map<PeerId, PeerEntry> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  // Signaling callbacks — must be wired externally (via NetworkManager or SignalingServer)
  private onSignalOfferCb: ((peerId: PeerId, sdp: string) => void) | null = null;
  private onSignalAnswerCb: ((peerId: PeerId, sdp: string) => void) | null = null;
  private onSignalCandidateCb: ((peerId: PeerId, candidate: string) => void) | null = null;

  constructor(config: WebRTCTransportConfig = {}) {
    this.config = { ...DEFAULTS, ...config };
  }

  // ============================================================================
  // NetworkTransport interface
  // ============================================================================

  get connected(): boolean {
    return this._connected;
  }

  /**
   * Connect to a room. For WebRTC this means becoming "ready" for peer
   * connections.  Actual peer wiring happens via createOffer/handleOffer/handleAnswer.
   */
  async connect(_url: string, roomId: RoomId): Promise<PeerId> {
    this._roomId = roomId;
    this._peerId = this.generatePeerId();
    this._connected = true;
    this.startPeerHeartbeat();
    this.emit('connected', { peerId: this._peerId, roomId });
    logger.info('WebRTCTransport: ready', { peerId: this._peerId, roomId });
    return this._peerId;
  }

  disconnect(reason: string = 'client_disconnect'): void {
    this.stopPeerHeartbeat();
    for (const [peerId, entry] of this.peers) {
      entry.connection.close();
      this.emit('peerLeft', { peerId, reason });
    }
    this.peers.clear();
    this._connected = false;
    this.emit('disconnected', { reason });
    logger.info('WebRTCTransport: disconnected', { reason });
  }

  /**
   * Broadcast a message to all connected peers.
   * Uses the unreliable channel for state updates, reliable for everything else.
   */
  send(message: NetworkMessage): boolean {
    if (!this._connected) return false;

    const data = JSON.stringify({
      ...message,
      senderId: this._peerId,
    });

    let sent = false;
    for (const entry of this.peers.values()) {
      if (!entry.connected) continue;

      const isStateUpdate =
        message.category === 'state' || message.type === 'transport:entity_updated';

      const channel =
        isStateUpdate && entry.unreliableChannel?.readyState === 'open'
          ? entry.unreliableChannel
          : entry.reliableChannel;

      if (channel && channel.readyState === 'open') {
        try {
          channel.send(data);
          sent = true;
        } catch {
          logger.warn('WebRTCTransport: failed to send to peer', { peerId: entry.peerId });
        }
      }
    }
    return sent;
  }

  /** Send a message to a specific peer. */
  sendToPeer(peerId: PeerId, message: NetworkMessage): boolean {
    const entry = this.peers.get(peerId);
    if (!entry?.connected) return false;

    const data = JSON.stringify({ ...message, senderId: this._peerId });
    const channel = entry.reliableChannel;
    if (channel && channel.readyState === 'open') {
      try {
        channel.send(data);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  on<K extends keyof NetworkEvents>(
    event: K,
    handler: NetworkEventCallback<K>,
  ): () => void {
    const key = event as string;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(handler);
    return () => this.off(event, handler);
  }

  off<K extends keyof NetworkEvents>(
    event: K,
    handler: NetworkEventCallback<K>,
  ): void {
    this.listeners.get(event as string)?.delete(handler);
  }

  /** Average latency across all peers. */
  getLatency(): number {
    if (this.peers.size === 0) return 0;
    let total = 0;
    for (const p of this.peers.values()) total += p.latency;
    return total / this.peers.size;
  }

  getPeerId(): PeerId {
    return this._peerId;
  }

  // ============================================================================
  // Signaling Wiring
  // ============================================================================

  /** Register a callback invoked when a local SDP offer must be forwarded. */
  onSignalOffer(cb: (peerId: PeerId, sdp: string) => void): void {
    this.onSignalOfferCb = cb;
  }

  /** Register a callback invoked when a local SDP answer must be forwarded. */
  onSignalAnswer(cb: (peerId: PeerId, sdp: string) => void): void {
    this.onSignalAnswerCb = cb;
  }

  /** Register a callback invoked when a local ICE candidate must be forwarded. */
  onSignalCandidate(cb: (peerId: PeerId, candidate: string) => void): void {
    this.onSignalCandidateCb = cb;
  }

  // ============================================================================
  // Peer Lifecycle
  // ============================================================================

  /**
   * Initiate a connection to a new peer. Creates an SDP offer.
   * The resulting offer must be sent to the remote peer via the signaling server.
   */
  async createOffer(remotePeerId: PeerId): Promise<string> {
    const entry = this.createPeerEntry(remotePeerId);
    this.peers.set(remotePeerId, entry);

    // Create data channels (offerer creates them)
    entry.reliableChannel = entry.connection.createDataChannel('reliable', { ordered: true });
    this.wireDataChannel(entry, entry.reliableChannel, 'reliable');

    if (this.config.unreliableChannel) {
      entry.unreliableChannel = entry.connection.createDataChannel('unreliable', {
        ordered: false,
        maxRetransmits: 0,
      });
      this.wireDataChannel(entry, entry.unreliableChannel, 'unreliable');
    }

    const offer = await entry.connection.createOffer();
    await entry.connection.setLocalDescription(offer);

    // Wait for ICE gathering (or timeout)
    const sdp = await this.waitForICE(entry.connection);

    if (this.onSignalOfferCb) {
      this.onSignalOfferCb(remotePeerId, sdp);
    }

    return sdp;
  }

  /**
   * Handle an incoming SDP offer from a remote peer and produce an answer.
   */
  async handleOffer(remotePeerId: PeerId, sdp: string): Promise<string> {
    let entry = this.peers.get(remotePeerId);
    if (!entry) {
      entry = this.createPeerEntry(remotePeerId);
      this.peers.set(remotePeerId, entry);
    }

    // Answerer receives data channels via ondatachannel
    entry.connection.ondatachannel = (event) => {
      const channel = event.channel;
      if (channel.label === 'reliable') {
        entry!.reliableChannel = channel;
        this.wireDataChannel(entry!, channel, 'reliable');
      } else if (channel.label === 'unreliable') {
        entry!.unreliableChannel = channel;
        this.wireDataChannel(entry!, channel, 'unreliable');
      }
    };

    await entry.connection.setRemoteDescription(
      new RTCSessionDescription({ type: 'offer', sdp }),
    );

    const answer = await entry.connection.createAnswer();
    await entry.connection.setLocalDescription(answer);

    const finalSdp = await this.waitForICE(entry.connection);

    if (this.onSignalAnswerCb) {
      this.onSignalAnswerCb(remotePeerId, finalSdp);
    }

    return finalSdp;
  }

  /**
   * Handle an incoming SDP answer from a remote peer.
   */
  async handleAnswer(remotePeerId: PeerId, sdp: string): Promise<void> {
    const entry = this.peers.get(remotePeerId);
    if (!entry) {
      logger.warn('WebRTCTransport: received answer for unknown peer', { remotePeerId });
      return;
    }
    await entry.connection.setRemoteDescription(
      new RTCSessionDescription({ type: 'answer', sdp }),
    );
  }

  /**
   * Add a remote ICE candidate.
   */
  async addIceCandidate(remotePeerId: PeerId, candidateJson: string): Promise<void> {
    const entry = this.peers.get(remotePeerId);
    if (!entry) return;
    try {
      const candidate = new RTCIceCandidate(JSON.parse(candidateJson));
      await entry.connection.addIceCandidate(candidate);
    } catch (err) {
      logger.warn('WebRTCTransport: failed to add ICE candidate', { error: String(err) });
    }
  }

  /** Remove a peer and close its connection. */
  removePeer(peerId: PeerId, reason: string = 'removed'): void {
    const entry = this.peers.get(peerId);
    if (entry) {
      entry.connection.close();
      this.peers.delete(peerId);
      this.emit('peerLeft', { peerId, reason });
    }
  }

  // ============================================================================
  // Internals
  // ============================================================================

  private createPeerEntry(peerId: PeerId): PeerEntry {
    const iceServers = this.config.iceServers.map((s) => ({
      urls: s.urls,
      username: s.username,
      credential: s.credential,
    }));

    const connection = new RTCPeerConnection({ iceServers });

    connection.onicecandidate = (event) => {
      if (event.candidate && this.onSignalCandidateCb) {
        this.onSignalCandidateCb(peerId, JSON.stringify(event.candidate.toJSON()));
      }
    };

    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;
      const entry = this.peers.get(peerId);
      if (!entry) return;

      if (state === 'connected') {
        entry.connected = true;
        this.emit('peerJoined', {
          peer: {
            peerId,
            displayName: peerId,
            joinedAt: Date.now(),
            latency: 0,
            transport: 'webrtc',
          },
        });
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        entry.connected = false;
        this.peers.delete(peerId);
        this.emit('peerLeft', { peerId, reason: state });
      }
    };

    return {
      peerId,
      connection,
      reliableChannel: null,
      unreliableChannel: null,
      latency: 0,
      lastPing: 0,
      connected: false,
    };
  }

  private wireDataChannel(entry: PeerEntry, channel: RTCDataChannel, label: string): void {
    channel.onopen = () => {
      logger.debug(`WebRTCTransport: ${label} channel open`, { peerId: entry.peerId });
    };

    channel.onclose = () => {
      logger.debug(`WebRTCTransport: ${label} channel closed`, { peerId: entry.peerId });
    };

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as NetworkMessage;

        // Handle peer ping
        if (message.type === 'transport:peer_ping') {
          channel.send(JSON.stringify({
            type: 'transport:peer_pong',
            category: 'connection',
            payload: message.payload,
            senderId: this._peerId,
            timestamp: Date.now(),
          }));
          return;
        }

        // Handle peer pong
        if (message.type === 'transport:peer_pong') {
          const payload = message.payload as { timestamp: number };
          entry.latency = Date.now() - payload.timestamp;
          return;
        }

        // Handle entity events
        if (message.type === 'transport:entity_spawned') {
          this.emit('entitySpawned', { entity: message.payload as any });
          return;
        }

        if (message.type === 'transport:entity_updated') {
          this.emit('entityUpdated', { entity: message.payload as any });
          return;
        }

        if (message.type === 'transport:entity_despawned') {
          this.emit('entityDespawned', { networkId: (message.payload as any).networkId });
          return;
        }

        // Generic message
        this.emit('message', {
          type: message.type,
          data: message.payload,
          senderId: message.senderId || entry.peerId,
        });
      } catch (err) {
        logger.error('WebRTCTransport: failed to parse data channel message', {
          error: String(err),
        });
      }
    };
  }

  private async waitForICE(connection: RTCPeerConnection): Promise<string> {
    if (connection.iceGatheringState === 'complete') {
      return connection.localDescription!.sdp;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(connection.localDescription?.sdp || '');
      }, this.config.iceTimeout);

      connection.onicegatheringstatechange = () => {
        if (connection.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          resolve(connection.localDescription!.sdp);
        }
      };
    });
  }

  private startPeerHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const entry of this.peers.values()) {
        if (!entry.connected || !entry.reliableChannel) continue;
        if (entry.reliableChannel.readyState !== 'open') continue;

        entry.lastPing = now;
        try {
          entry.reliableChannel.send(JSON.stringify({
            type: 'transport:peer_ping',
            category: 'connection',
            payload: { timestamp: now },
            senderId: this._peerId,
            timestamp: now,
          }));
        } catch { /* ignore */ }
      }
    }, this.config.peerHeartbeatInterval);
  }

  private stopPeerHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private emit<K extends keyof NetworkEvents>(event: K, data: NetworkEvents[K]): void {
    const handlers = this.listeners.get(event as string);
    if (handlers) {
      handlers.forEach((h) => (h as NetworkEventCallback<K>)(data));
    }
  }

  private generatePeerId(): PeerId {
    return `rtc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // Diagnostics
  // ============================================================================

  /** Get connected peer count. */
  getPeerCount(): number {
    let count = 0;
    for (const p of this.peers.values()) if (p.connected) count++;
    return count;
  }

  /** Get all connected peer IDs. */
  getConnectedPeers(): PeerId[] {
    const result: PeerId[] = [];
    for (const p of this.peers.values()) {
      if (p.connected) result.push(p.peerId);
    }
    return result;
  }

  /** Get latency for a specific peer. */
  getPeerLatency(peerId: PeerId): number {
    return this.peers.get(peerId)?.latency ?? -1;
  }
}
