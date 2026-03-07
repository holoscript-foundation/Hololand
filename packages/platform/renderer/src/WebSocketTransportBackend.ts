/**
 * WebSocketTransportBackend
 *
 * Real WebSocket signaling and WebRTC DataChannel transport.
 *
 * ARCHITECTURE:
 * 1. WebSocket connects to a relay server for signaling
 * 2. WebRTC DataChannel is established peer-to-peer for low-latency data
 * 3. Falls back to WebSocket relay if WebRTC fails
 *
 * PROTOCOL:
 * - JOIN: { type: 'join', roomId, deviceId, formFactor }
 * - SIGNAL: { type: 'signal', to, from, signal } (WebRTC signaling)
 * - RELAY: { type: 'relay', to, from, message } (WebSocket relay fallback)
 * - LEAVE: { type: 'leave', deviceId }
 */

import { logger } from './logger';
import type {
  TransportMessage,
  TransportMessageType,
  ConnectionState,
  PeerInfo,
} from './NetworkTransportAdapter';

// ============================================================================
// SIGNALING TYPES
// ============================================================================

export type SignalingMessageType = 'join' | 'signal' | 'relay' | 'leave' | 'peers' | 'error';

export interface SignalingMessage {
  type: SignalingMessageType;
  from?: string;
  to?: string;
  roomId?: string;
  deviceId?: string;
  formFactor?: string;
  displayName?: string;
  signal?: RTCSessionDescriptionInit | RTCIceCandidateInit;
  message?: TransportMessage;
  peers?: Array<{ deviceId: string; formFactor: string; displayName: string }>;
  error?: string;
}

// ============================================================================
// CONFIG
// ============================================================================

export interface WebSocketTransportConfig {
  /** WebSocket relay server URL */
  relayUrl: string;
  /** Room ID for device discovery */
  roomId: string;
  /** This device's ID */
  deviceId: string;
  /** This device's display name */
  displayName: string;
  /** This device's form factor */
  formFactor: string;
  /** ICE servers for WebRTC (STUN/TURN) */
  iceServers?: RTCIceServer[];
  /** Prefer WebRTC DataChannel when available (default: true) */
  preferWebRTC?: boolean;
  /** WebSocket reconnect interval (default: 3000ms) */
  reconnectIntervalMs?: number;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Heartbeat interval (default: 15000ms) */
  heartbeatIntervalMs?: number;
}

// ============================================================================
// PEER CONNECTION STATE
// ============================================================================

interface PeerConnection {
  deviceId: string;
  formFactor: string;
  displayName: string;
  state: ConnectionState;
  /** WebRTC peer connection (null if using relay fallback) */
  rtcConnection: RTCPeerConnection | null;
  /** WebRTC data channel (null if using relay fallback) */
  dataChannel: RTCDataChannel | null;
  /** Whether using WebSocket relay instead of WebRTC */
  usingRelay: boolean;
  connectedAt: number;
  latencyMs: number;
  lastPingTimestamp: number;
}

// ============================================================================
// BACKEND EVENTS
// ============================================================================

export interface WebSocketTransportEvents {
  'peer:joined': { deviceId: string; formFactor: string; displayName: string };
  'peer:left': { deviceId: string };
  'peer:connected': { peer: PeerInfo };
  'peer:disconnected': { deviceId: string; reason: string };
  'message': { message: TransportMessage; from: string };
  'signaling:connected': Record<string, never>;
  'signaling:disconnected': { reason: string };
  'signaling:error': { error: string };
}

export type WebSocketTransportEventType = keyof WebSocketTransportEvents;

// ============================================================================
// METRICS
// ============================================================================

export interface WebSocketTransportMetrics {
  signalingState: 'disconnected' | 'connecting' | 'connected';
  connectedPeers: number;
  webrtcPeers: number;
  relayPeers: number;
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  reconnectAttempts: number;
  averageLatencyMs: number;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

export class WebSocketTransportBackend {
  private config: Required<WebSocketTransportConfig>;
  private ws: WebSocket | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private messageHandlers: Map<
    TransportMessageType,
    Set<(msg: TransportMessage, from: string) => void>
  > = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private signalingState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private messagesSent = 0;
  private messagesReceived = 0;
  private bytesTransferred = 0;
  private seq = 0;

  constructor(config: WebSocketTransportConfig) {
    this.config = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      preferWebRTC: true,
      reconnectIntervalMs: 3000,
      maxReconnectAttempts: 10,
      heartbeatIntervalMs: 15000,
      ...config,
    };
  }

  // --------------------------------------------------------------------------
  // CONNECTION MANAGEMENT
  // --------------------------------------------------------------------------

  /** Connect to the signaling server */
  connect(): void {
    if (this.signalingState !== 'disconnected') return;
    this.signalingState = 'connecting';

    try {
      this.ws = new WebSocket(this.config.relayUrl);
      this.ws.onopen = () => this.onSignalingOpen();
      this.ws.onmessage = (event) => this.onSignalingMessage(event);
      this.ws.onclose = (event) => this.onSignalingClose(event);
      this.ws.onerror = () => this.onSignalingError();
    } catch (err) {
      logger.warn(`[WSTransport] Failed to connect: ${err}`);
      this.scheduleReconnect();
    }
  }

  /** Disconnect from signaling server and all peers */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Close all peer connections
    for (const peerId of this.peers.keys()) {
      this.closePeerConnection(peerId, 'disconnect');
    }
    this.peers.clear();

    // Close WebSocket
    if (this.ws) {
      this.sendSignaling({ type: 'leave', deviceId: this.config.deviceId });
      this.ws.close();
      this.ws = null;
    }

    this.signalingState = 'disconnected';
    this.emit('signaling:disconnected', { reason: 'user-initiated' });
  }

  /** Send a message to a specific peer */
  send(peerId: string, type: TransportMessageType, payload: unknown): boolean {
    const peer = this.peers.get(peerId);
    if (!peer || peer.state !== 'connected') return false;

    const message: TransportMessage = {
      type,
      payload,
      deviceId: this.config.deviceId,
      timestamp: Date.now(),
      seq: this.seq++,
    };

    const data = JSON.stringify(message);
    this.bytesTransferred += data.length;
    this.messagesSent++;

    if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
      // Send via WebRTC DataChannel
      peer.dataChannel.send(data);
      return true;
    } else {
      // Fallback: relay via WebSocket
      this.sendSignaling({
        type: 'relay',
        to: peerId,
        from: this.config.deviceId,
        message,
      });
      return true;
    }
  }

  /** Broadcast to all connected peers */
  broadcast(type: TransportMessageType, payload: unknown): number {
    let sent = 0;
    for (const [peerId, peer] of this.peers) {
      if (peer.state === 'connected') {
        if (this.send(peerId, type, payload)) sent++;
      }
    }
    return sent;
  }

  /** Register handler for a message type */
  onMessage(
    type: TransportMessageType,
    handler: (msg: TransportMessage, from: string) => void,
  ): void {
    if (!this.messageHandlers.has(type)) this.messageHandlers.set(type, new Set());
    this.messageHandlers.get(type)!.add(handler);
  }

  /** Remove handler for a message type */
  offMessage(
    type: TransportMessageType,
    handler: (msg: TransportMessage, from: string) => void,
  ): void {
    this.messageHandlers.get(type)?.delete(handler);
  }

  // --------------------------------------------------------------------------
  // PEER INFO
  // --------------------------------------------------------------------------

  /** Get info about a specific peer */
  getPeer(peerId: string): PeerInfo | undefined {
    const peer = this.peers.get(peerId);
    if (!peer) return undefined;
    return {
      deviceId: peer.deviceId,
      formFactor: peer.formFactor,
      displayName: peer.displayName,
      connectionState: peer.state,
      transportType: peer.usingRelay ? 'websocket' : 'webrtc',
      latencyMs: peer.latencyMs,
      connectedAt: peer.connectedAt,
    };
  }

  /** Get all connected peers */
  getConnectedPeers(): PeerInfo[] {
    return [...this.peers.values()]
      .filter((p) => p.state === 'connected')
      .map((p) => ({
        deviceId: p.deviceId,
        formFactor: p.formFactor,
        displayName: p.displayName,
        connectionState: p.state,
        transportType: p.usingRelay ? ('websocket' as const) : ('webrtc' as const),
        latencyMs: p.latencyMs,
        connectedAt: p.connectedAt,
      }));
  }

  /** Check if a specific peer is connected */
  isConnected(peerId: string): boolean {
    return this.peers.get(peerId)?.state === 'connected';
  }

  // --------------------------------------------------------------------------
  // METRICS
  // --------------------------------------------------------------------------

  /** Get transport metrics snapshot */
  getMetrics(): WebSocketTransportMetrics {
    const peers = this.getConnectedPeers();
    return {
      signalingState: this.signalingState,
      connectedPeers: peers.length,
      webrtcPeers: peers.filter((p) => p.transportType === 'webrtc').length,
      relayPeers: peers.filter((p) => p.transportType === 'websocket').length,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      bytesTransferred: this.bytesTransferred,
      reconnectAttempts: this.reconnectAttempts,
      averageLatencyMs:
        peers.length > 0
          ? peers.reduce((s, p) => s + p.latencyMs, 0) / peers.length
          : 0,
    };
  }

  // --------------------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------------------

  /** Subscribe to a backend event */
  on<T extends WebSocketTransportEventType>(
    event: T,
    handler: (data: WebSocketTransportEvents[T]) => void,
  ): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler as (data: unknown) => void);
  }

  /** Unsubscribe from a backend event */
  off<T extends WebSocketTransportEventType>(
    event: T,
    handler: (data: WebSocketTransportEvents[T]) => void,
  ): void {
    this.listeners.get(event)?.delete(handler as (data: unknown) => void);
  }

  // --------------------------------------------------------------------------
  // LIFECYCLE
  // --------------------------------------------------------------------------

  /** Tear down all connections and clear all state */
  dispose(): void {
    this.disconnect();
    this.listeners.clear();
    this.messageHandlers.clear();
  }

  // --------------------------------------------------------------------------
  // INTERNAL: SIGNALING
  // --------------------------------------------------------------------------

  private onSignalingOpen(): void {
    this.signalingState = 'connected';
    this.reconnectAttempts = 0;
    this.emit('signaling:connected', {} as Record<string, never>);

    // Join room
    this.sendSignaling({
      type: 'join',
      roomId: this.config.roomId,
      deviceId: this.config.deviceId,
      formFactor: this.config.formFactor,
      displayName: this.config.displayName,
    });

    // Start heartbeat
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.config.heartbeatIntervalMs);
  }

  private onSignalingMessage(event: MessageEvent): void {
    try {
      const msg: SignalingMessage = JSON.parse(event.data as string);
      switch (msg.type) {
        case 'peers':
          this.handlePeersList(msg);
          break;
        case 'join':
          this.handlePeerJoined(msg);
          break;
        case 'leave':
          this.handlePeerLeft(msg);
          break;
        case 'signal':
          this.handleWebRTCSignal(msg);
          break;
        case 'relay':
          this.handleRelayMessage(msg);
          break;
        case 'error':
          logger.warn(`[WSTransport] Server error: ${msg.error}`);
          break;
      }
    } catch (err) {
      logger.warn(`[WSTransport] Failed to parse signaling message: ${err}`);
    }
  }

  private onSignalingClose(event: CloseEvent): void {
    this.signalingState = 'disconnected';
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.emit('signaling:disconnected', {
      reason: event.reason || 'connection-closed',
    });
    this.scheduleReconnect();
  }

  private onSignalingError(): void {
    this.emit('signaling:error', { error: 'WebSocket connection error' });
  }

  private sendSignaling(msg: SignalingMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.warn('[WSTransport] Max reconnect attempts reached');
      return;
    }
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(
      () => this.connect(),
      this.config.reconnectIntervalMs,
    );
  }

  // --------------------------------------------------------------------------
  // INTERNAL: PEER MANAGEMENT
  // --------------------------------------------------------------------------

  private handlePeersList(msg: SignalingMessage): void {
    if (!msg.peers) return;
    for (const p of msg.peers) {
      if (p.deviceId === this.config.deviceId) continue;
      this.initiatePeerConnection(p.deviceId, p.formFactor, p.displayName);
    }
  }

  private handlePeerJoined(msg: SignalingMessage): void {
    if (!msg.deviceId || msg.deviceId === this.config.deviceId) return;
    this.emit('peer:joined', {
      deviceId: msg.deviceId,
      formFactor: msg.formFactor ?? 'unknown',
      displayName: msg.displayName ?? msg.deviceId,
    });
    this.initiatePeerConnection(
      msg.deviceId,
      msg.formFactor ?? 'unknown',
      msg.displayName ?? msg.deviceId,
    );
  }

  private handlePeerLeft(msg: SignalingMessage): void {
    if (!msg.deviceId) return;
    this.closePeerConnection(msg.deviceId, 'peer-left');
    this.emit('peer:left', { deviceId: msg.deviceId });
  }

  private initiatePeerConnection(
    peerId: string,
    formFactor: string,
    displayName: string,
  ): void {
    if (this.peers.has(peerId)) return;

    const peer: PeerConnection = {
      deviceId: peerId,
      formFactor,
      displayName,
      state: 'connecting',
      rtcConnection: null,
      dataChannel: null,
      usingRelay: !this.config.preferWebRTC,
      connectedAt: 0,
      latencyMs: -1,
      lastPingTimestamp: 0,
    };
    this.peers.set(peerId, peer);

    if (this.config.preferWebRTC && typeof RTCPeerConnection !== 'undefined') {
      this.setupWebRTC(peerId, peer);
    } else {
      // Use relay fallback immediately
      peer.usingRelay = true;
      peer.state = 'connected';
      peer.connectedAt = Date.now();
      this.emitPeerConnected(peer);
    }
  }

  private setupWebRTC(peerId: string, peer: PeerConnection): void {
    try {
      const rtc = new RTCPeerConnection({
        iceServers: this.config.iceServers,
      });
      peer.rtcConnection = rtc;

      // Create data channel
      const dc = rtc.createDataChannel('cross-reality', { ordered: true });
      peer.dataChannel = dc;

      dc.onopen = () => {
        peer.state = 'connected';
        peer.usingRelay = false;
        peer.connectedAt = Date.now();
        this.emitPeerConnected(peer);
      };

      dc.onmessage = (event) =>
        this.handleDataChannelMessage(event, peerId);

      dc.onclose = () =>
        this.closePeerConnection(peerId, 'datachannel-closed');

      rtc.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignaling({
            type: 'signal',
            to: peerId,
            from: this.config.deviceId,
            signal: event.candidate.toJSON(),
          });
        }
      };

      rtc.onnegotiationneeded = async () => {
        try {
          const offer = await rtc.createOffer();
          await rtc.setLocalDescription(offer);
          this.sendSignaling({
            type: 'signal',
            to: peerId,
            from: this.config.deviceId,
            signal: rtc.localDescription!,
          });
        } catch (err) {
          logger.warn(
            `[WSTransport] WebRTC negotiation failed for ${peerId}, falling back to relay`,
          );
          peer.usingRelay = true;
          peer.state = 'connected';
          peer.connectedAt = Date.now();
          this.emitPeerConnected(peer);
        }
      };

      // Timeout: fall back to relay if WebRTC doesn't connect in 5s
      setTimeout(() => {
        if (peer.state === 'connecting') {
          logger.info(
            `[WSTransport] WebRTC timeout for ${peerId}, using relay`,
          );
          peer.usingRelay = true;
          peer.state = 'connected';
          peer.connectedAt = Date.now();
          this.emitPeerConnected(peer);
        }
      }, 5000);
    } catch (err) {
      // WebRTC not available, use relay
      peer.usingRelay = true;
      peer.state = 'connected';
      peer.connectedAt = Date.now();
      this.emitPeerConnected(peer);
    }
  }

  private async handleWebRTCSignal(msg: SignalingMessage): Promise<void> {
    if (!msg.from || !msg.signal) return;
    let peer = this.peers.get(msg.from);
    if (!peer) {
      // New peer initiating connection
      peer = {
        deviceId: msg.from,
        formFactor: 'unknown',
        displayName: msg.from,
        state: 'connecting',
        rtcConnection: null,
        dataChannel: null,
        usingRelay: false,
        connectedAt: 0,
        latencyMs: -1,
        lastPingTimestamp: 0,
      };
      this.peers.set(msg.from, peer);
    }

    if (!peer.rtcConnection && typeof RTCPeerConnection !== 'undefined') {
      const rtc = new RTCPeerConnection({
        iceServers: this.config.iceServers,
      });
      peer.rtcConnection = rtc;

      rtc.ondatachannel = (event) => {
        peer!.dataChannel = event.channel;
        event.channel.onopen = () => {
          peer!.state = 'connected';
          peer!.connectedAt = Date.now();
          this.emitPeerConnected(peer!);
        };
        event.channel.onmessage = (e) =>
          this.handleDataChannelMessage(e, msg.from!);
        event.channel.onclose = () =>
          this.closePeerConnection(msg.from!, 'datachannel-closed');
      };

      rtc.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignaling({
            type: 'signal',
            to: msg.from!,
            from: this.config.deviceId,
            signal: event.candidate.toJSON(),
          });
        }
      };
    }

    const rtc = peer.rtcConnection;
    if (!rtc) return;

    try {
      const signal = msg.signal as RTCSessionDescriptionInit & RTCIceCandidateInit;
      if (signal.type === 'offer') {
        await rtc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await rtc.createAnswer();
        await rtc.setLocalDescription(answer);
        this.sendSignaling({
          type: 'signal',
          to: msg.from,
          from: this.config.deviceId,
          signal: rtc.localDescription!,
        });
      } else if (signal.type === 'answer') {
        await rtc.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.candidate) {
        await rtc.addIceCandidate(new RTCIceCandidate(signal));
      }
    } catch (err) {
      logger.warn(`[WSTransport] WebRTC signal handling failed: ${err}`);
    }
  }

  private handleRelayMessage(msg: SignalingMessage): void {
    if (!msg.from || !msg.message) return;
    this.messagesReceived++;
    this.handleIncomingMessage(msg.message, msg.from);
  }

  private handleDataChannelMessage(event: MessageEvent, from: string): void {
    try {
      const message: TransportMessage = JSON.parse(event.data as string);
      this.messagesReceived++;
      this.handleIncomingMessage(message, from);
    } catch (err) {
      logger.warn(
        `[WSTransport] Failed to parse data channel message: ${err}`,
      );
    }
  }

  private handleIncomingMessage(
    message: TransportMessage,
    from: string,
  ): void {
    // Handle ping/pong internally
    if (message.type === 'ping') {
      this.send(from, 'pong', { originalTimestamp: message.timestamp });
      return;
    }
    if (message.type === 'pong') {
      const peer = this.peers.get(from);
      if (peer) {
        const payload = message.payload as { originalTimestamp: number };
        peer.latencyMs = Date.now() - payload.originalTimestamp;
      }
      return;
    }

    // Notify type-specific handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      for (const h of handlers) h(message, from);
    }
    this.emit('message', { message, from });
  }

  private closePeerConnection(peerId: string, reason: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    if (peer.dataChannel) {
      try {
        peer.dataChannel.close();
      } catch {
        // Ignore close errors
      }
    }
    if (peer.rtcConnection) {
      try {
        peer.rtcConnection.close();
      } catch {
        // Ignore close errors
      }
    }

    peer.state = 'disconnected';
    this.peers.delete(peerId);
    this.emit('peer:disconnected', { deviceId: peerId, reason });
  }

  private emitPeerConnected(peer: PeerConnection): void {
    this.emit('peer:connected', {
      peer: {
        deviceId: peer.deviceId,
        formFactor: peer.formFactor,
        displayName: peer.displayName,
        connectionState: peer.state,
        transportType: peer.usingRelay
          ? ('websocket' as const)
          : ('webrtc' as const),
        latencyMs: peer.latencyMs,
        connectedAt: peer.connectedAt,
      },
    });
    logger.info(
      `[WSTransport] Peer connected: ${peer.deviceId} via ${peer.usingRelay ? 'relay' : 'WebRTC'}`,
    );
  }

  private emit<T extends WebSocketTransportEventType>(
    event: T,
    data: WebSocketTransportEvents[T],
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const h of handlers) h(data);
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createWebSocketTransportBackend(
  config: WebSocketTransportConfig,
): WebSocketTransportBackend {
  return new WebSocketTransportBackend(config);
}
