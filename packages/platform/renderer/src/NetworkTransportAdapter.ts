/**
 * NetworkTransportAdapter
 *
 * Abstract transport layer for cross-reality device communication.
 * Provides a unified interface over WebRTC data channels (peer-to-peer,
 * low-latency, nearby devices) and WebSocket (cloud relay, fallback).
 *
 * TRANSPORT SELECTION:
 * - WebRTC: Preferred for nearby devices (same room/building), <50ms latency
 * - WebSocket: Fallback for remote devices, cloud relay, NAT traversal failures
 * - Auto: Attempts WebRTC first, falls back to WebSocket
 *
 * WIRE FORMAT:
 * All messages use a typed envelope with binary payload support:
 * { type: string, payload: unknown, timestamp: number, deviceId: string }
 *
 * @module NetworkTransportAdapter
 */

import { logger } from './logger';

// =============================================================================
// MESSAGE TYPES
// =============================================================================

/**
 * Wire message envelope for all cross-reality communication.
 */
export interface TransportMessage<T = unknown> {
  /** Message type identifier */
  type: TransportMessageType;
  /** Message payload */
  payload: T;
  /** Sender device ID */
  deviceId: string;
  /** Message timestamp (ms since epoch) */
  timestamp: number;
  /** Sequence number for ordering */
  seq: number;
}

export type TransportMessageType =
  | 'discovery:announce'      // Device announces presence
  | 'discovery:response'      // Response to announcement
  | 'handoff:initiate'        // Begin cross-reality handoff
  | 'handoff:mvc-payload'     // MVC payload transfer
  | 'handoff:ack'             // Acknowledge receipt
  | 'sync:crdt-delta'         // CRDT delta for anchor sync
  | 'sync:crdt-batch'         // Compressed CRDT batch
  | 'sync:full-state'         // Full state sync request/response
  | 'ping'                    // Latency measurement
  | 'pong'                    // Latency response
  | 'custom';                 // Application-defined

// =============================================================================
// CONNECTION STATE
// =============================================================================

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

export interface PeerInfo {
  deviceId: string;
  formFactor: string;
  displayName: string;
  connectionState: ConnectionState;
  transportType: 'webrtc' | 'websocket';
  latencyMs: number;
  connectedAt: number;
}

// =============================================================================
// TRANSPORT EVENTS
// =============================================================================

export interface TransportEventMap {
  'connected': { peer: PeerInfo };
  'disconnected': { deviceId: string; reason: string };
  'message': { message: TransportMessage; from: string };
  'error': { deviceId: string; error: string };
  'latency': { deviceId: string; latencyMs: number };
}

export type TransportEventType = keyof TransportEventMap;

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface NetworkTransportConfig {
  /** This device's ID */
  deviceId: string;
  /** This device's display name */
  displayName: string;
  /** This device's form factor */
  formFactor: string;
  /** WebSocket relay URL (for fallback) */
  relayUrl?: string;
  /** ICE servers for WebRTC (STUN/TURN) */
  iceServers?: Array<{ urls: string; username?: string; credential?: string }>;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect interval in ms (default: 3000) */
  reconnectIntervalMs?: number;
  /** Maximum reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Ping interval for latency measurement (default: 5000ms) */
  pingIntervalMs?: number;
}

// =============================================================================
// TRANSPORT ADAPTER
// =============================================================================

export class NetworkTransportAdapter {
  private config: Required<NetworkTransportConfig>;
  private peers: Map<string, PeerInfo> = new Map();
  private listeners: Map<string, Set<(event: any) => void>> = new Map();
  private messageHandlers: Map<TransportMessageType, Set<(msg: TransportMessage, from: string) => void>> = new Map();
  private seq = 0;
  private pingTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();

  constructor(config: NetworkTransportConfig) {
    this.config = {
      relayUrl: '',
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      autoReconnect: true,
      reconnectIntervalMs: 3000,
      maxReconnectAttempts: 5,
      pingIntervalMs: 5000,
      ...config,
    };

    logger.info('[NetworkTransport] Initialized', { deviceId: this.config.deviceId });
  }

  // ---------------------------------------------------------------------------
  // CONNECTION MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Connect to a peer device.
   */
  connect(peerId: string, options?: { displayName?: string; formFactor?: string; transport?: 'webrtc' | 'websocket' | 'auto' }): void {
    const transport = options?.transport ?? 'auto';
    const peer: PeerInfo = {
      deviceId: peerId,
      formFactor: options?.formFactor ?? 'unknown',
      displayName: options?.displayName ?? peerId,
      connectionState: 'connecting',
      transportType: transport === 'auto' ? 'websocket' : transport,
      latencyMs: -1,
      connectedAt: 0,
    };

    this.peers.set(peerId, peer);

    // Simulate connection establishment
    // In production, this would initiate WebRTC signaling or WebSocket connection
    peer.connectionState = 'connected';
    peer.connectedAt = Date.now();
    this.reconnectAttempts.set(peerId, 0);

    this.emit('connected', { peer: { ...peer } });
    this.startPingLoop(peerId);

    logger.info(`[NetworkTransport] Connected to ${peerId} via ${peer.transportType}`);
  }

  /**
   * Disconnect from a peer device.
   */
  disconnect(peerId: string, reason: string = 'user-initiated'): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;

    this.stopPingLoop(peerId);
    peer.connectionState = 'disconnected';
    this.peers.delete(peerId);

    this.emit('disconnected', { deviceId: peerId, reason });
    logger.info(`[NetworkTransport] Disconnected from ${peerId}: ${reason}`);
  }

  /**
   * Disconnect from all peers.
   */
  disconnectAll(): void {
    for (const peerId of [...this.peers.keys()]) {
      this.disconnect(peerId, 'disconnect-all');
    }
  }

  /**
   * Get info about a connected peer.
   */
  getPeer(peerId: string): PeerInfo | undefined {
    const peer = this.peers.get(peerId);
    return peer ? { ...peer } : undefined;
  }

  /**
   * Get all connected peers.
   */
  getConnectedPeers(): PeerInfo[] {
    return [...this.peers.values()]
      .filter(p => p.connectionState === 'connected')
      .map(p => ({ ...p }));
  }

  /**
   * Check if connected to a specific peer.
   */
  isConnected(peerId: string): boolean {
    return this.peers.get(peerId)?.connectionState === 'connected';
  }

  // ---------------------------------------------------------------------------
  // MESSAGING
  // ---------------------------------------------------------------------------

  /**
   * Send a typed message to a specific peer.
   */
  send<T>(peerId: string, type: TransportMessageType, payload: T): boolean {
    const peer = this.peers.get(peerId);
    if (!peer || peer.connectionState !== 'connected') {
      logger.warn(`[NetworkTransport] Cannot send to ${peerId}: not connected`);
      return false;
    }

    const message: TransportMessage<T> = {
      type,
      payload,
      deviceId: this.config.deviceId,
      timestamp: Date.now(),
      seq: this.seq++,
    };

    // Notify message handlers on the receiving side
    // In production, this would go through the actual transport
    this.notifyMessageHandlers(message, peerId);

    return true;
  }

  /**
   * Broadcast a message to all connected peers.
   */
  broadcast<T>(type: TransportMessageType, payload: T): number {
    let sent = 0;
    for (const peer of this.peers.values()) {
      if (peer.connectionState === 'connected') {
        if (this.send(peer.deviceId, type, payload)) {
          sent++;
        }
      }
    }
    return sent;
  }

  /**
   * Simulate receiving a message from a remote peer.
   * Used for testing and for wiring up actual transport backends.
   */
  receiveMessage(message: TransportMessage, fromPeerId: string): void {
    // Handle ping/pong internally
    if (message.type === 'ping') {
      this.send(fromPeerId, 'pong', { originalTimestamp: message.timestamp });
      return;
    }

    if (message.type === 'pong') {
      const peer = this.peers.get(fromPeerId);
      if (peer) {
        const payload = message.payload as { originalTimestamp: number };
        peer.latencyMs = Date.now() - payload.originalTimestamp;
        this.emit('latency', { deviceId: fromPeerId, latencyMs: peer.latencyMs });
      }
      return;
    }

    // Notify handlers
    this.notifyMessageHandlers(message, fromPeerId);
    this.emit('message', { message, from: fromPeerId });
  }

  /**
   * Register a handler for a specific message type.
   */
  onMessage(type: TransportMessageType, handler: (msg: TransportMessage, from: string) => void): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
  }

  /**
   * Remove a message handler.
   */
  offMessage(type: TransportMessageType, handler: (msg: TransportMessage, from: string) => void): void {
    this.messageHandlers.get(type)?.delete(handler);
  }

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------

  getMetrics() {
    const peers = this.getConnectedPeers();
    return {
      connectedPeers: peers.length,
      averageLatencyMs: peers.length > 0
        ? peers.reduce((sum, p) => sum + (p.latencyMs >= 0 ? p.latencyMs : 0), 0) / peers.length
        : 0,
      messagesSent: this.seq,
      transportBreakdown: {
        webrtc: peers.filter(p => p.transportType === 'webrtc').length,
        websocket: peers.filter(p => p.transportType === 'websocket').length,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------

  on<T extends TransportEventType>(event: T, handler: (data: TransportEventMap[T]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as any);
  }

  off<T extends TransportEventType>(event: T, handler: (data: TransportEventMap[T]) => void): void {
    this.listeners.get(event)?.delete(handler as any);
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  dispose(): void {
    this.disconnectAll();
    this.listeners.clear();
    this.messageHandlers.clear();
  }

  // ---------------------------------------------------------------------------
  // INTERNAL
  // ---------------------------------------------------------------------------

  private emit<T extends TransportEventType>(event: T, data: TransportEventMap[T]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(data);
      }
    }
  }

  private notifyMessageHandlers(message: TransportMessage, from: string): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(message, from);
      }
    }
  }

  private startPingLoop(peerId: string): void {
    const timer = setInterval(() => {
      if (this.isConnected(peerId)) {
        this.send(peerId, 'ping', { timestamp: Date.now() });
      }
    }, this.config.pingIntervalMs);
    this.pingTimers.set(peerId, timer);
  }

  private stopPingLoop(peerId: string): void {
    const timer = this.pingTimers.get(peerId);
    if (timer) {
      clearInterval(timer);
      this.pingTimers.delete(peerId);
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createNetworkTransportAdapter(config: NetworkTransportConfig): NetworkTransportAdapter {
  return new NetworkTransportAdapter(config);
}
