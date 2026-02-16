/**
 * SignalingServer
 *
 * WebRTC signaling server for coordinating peer-to-peer connections.
 * Runs on Node.js and relays SDP offers/answers and ICE candidates
 * between peers trying to establish WebRTC connections.
 *
 * In browser environments, use WebSocketTransport to communicate with
 * a remote signaling server instead.
 *
 * Features:
 * - Room-based signaling (peers only see others in the same room)
 * - Automatic peer discovery (new peers get offers from existing ones)
 * - Heartbeat monitoring for stale connection cleanup
 * - Event hooks for monitoring
 */

import { logger } from './logger';
import type { PeerId, RoomId } from './types';

// ============================================================================
// Types
// ============================================================================

export interface SignalingServerOptions {
  /** Port to listen on (default 8080). */
  port?: number;
  /** Path for WebSocket upgrade (default '/signaling'). */
  path?: string;
  /** Max peers per room (default 50). */
  maxPeersPerRoom?: number;
  /** Heartbeat interval in ms (default 30 000). */
  heartbeatInterval?: number;
  /** Peer timeout in ms — remove if no heartbeat (default 60 000). */
  peerTimeout?: number;
}

export interface SignalingPeer {
  peerId: PeerId;
  roomId: RoomId;
  joinedAt: number;
  lastSeen: number;
  send: (data: string) => void;
}

export interface SignalingMessage {
  type:
    | 'join'
    | 'leave'
    | 'offer'
    | 'answer'
    | 'candidate'
    | 'peer_list'
    | 'peer_joined'
    | 'peer_left'
    | 'heartbeat'
    | 'error';
  peerId?: PeerId;
  fromPeerId?: PeerId;
  targetPeerId?: PeerId;
  roomId?: RoomId;
  sdp?: string;
  candidate?: string;
  peers?: PeerId[];
  error?: string;
  message?: string;
}

type SignalingEventType = 'peerJoined' | 'peerLeft' | 'roomCreated' | 'roomEmpty' | 'error';
type SignalingEventHandler = (data: any) => void;

// ============================================================================
// SignalingServer
// ============================================================================

export class SignalingServer {
  private config: Required<SignalingServerOptions>;
  private rooms: Map<RoomId, Map<PeerId, SignalingPeer>> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _running: boolean = false;
  private listeners: Map<SignalingEventType, Set<SignalingEventHandler>> = new Map();

  constructor(options: SignalingServerOptions = {}) {
    this.config = {
      port: options.port ?? 8080,
      path: options.path ?? '/signaling',
      maxPeersPerRoom: options.maxPeersPerRoom ?? 50,
      heartbeatInterval: options.heartbeatInterval ?? 30_000,
      peerTimeout: options.peerTimeout ?? 60_000,
    };
  }

  // ============================================================================
  // Server Lifecycle
  // ============================================================================

  /**
   * Start the signaling server.
   * In a real deployment this would bind a WebSocket server to the configured port.
   * Here we expose the message-handling API so it can be wired to any WS server.
   */
  start(): void {
    if (this._running) return;
    this._running = true;
    this.startHeartbeat();
    logger.info('SignalingServer: started', {
      port: this.config.port,
      path: this.config.path,
    });
  }

  /** Stop the server and disconnect all peers. */
  stop(): void {
    this.stopHeartbeat();
    for (const [roomId, peers] of this.rooms) {
      for (const [peerId, peer] of peers) {
        this.sendToPeer(peer, { type: 'leave', peerId });
      }
      peers.clear();
    }
    this.rooms.clear();
    this._running = false;
    logger.info('SignalingServer: stopped');
  }

  get running(): boolean {
    return this._running;
  }

  // ============================================================================
  // Peer Management (called by the WS layer for each connected client)
  // ============================================================================

  /**
   * Handle an incoming signaling message from a peer.
   * Accepts either `(peer, message)` or `(message, send)` for flexibility.
   */
  handleMessage(peerOrMessage: SignalingPeer | SignalingMessage, messageOrSend?: SignalingMessage | ((data: string) => void)): void {
    let peer: SignalingPeer | null = null;
    let message: SignalingMessage;
    let send: (data: string) => void;

    if (typeof (peerOrMessage as SignalingPeer).send === 'function') {
      // Called as handleMessage(peer, message)
      peer = peerOrMessage as SignalingPeer;
      message = messageOrSend as SignalingMessage;
      send = (data: string) => peer!.send(data);
      // Attach peerId from peer if not on message
      if (!message.peerId) message.peerId = peer.peerId;
    } else {
      // Called as handleMessage(message, send)
      message = peerOrMessage as SignalingMessage;
      send = messageOrSend as (data: string) => void;
    }

    switch (message.type) {
      case 'join':
        this.handleJoin(message, send);
        break;
      case 'leave':
        this.handleLeave(message);
        break;
      case 'offer':
        this.relayToPeer(message, send);
        break;
      case 'answer':
        this.relayToPeer(message, send);
        break;
      case 'candidate':
        this.relayToPeer(message, send);
        break;
      case 'heartbeat':
        this.handleHeartbeat(message);
        break;
      default:
        send(JSON.stringify({ type: 'error', error: `Unknown message type: ${message.type}` }));
    }
  }

  /** Remove a peer by ID (e.g. on WebSocket close). */
  removePeer(peerId: PeerId): void {
    for (const [roomId, peers] of this.rooms) {
      if (peers.has(peerId)) {
        peers.delete(peerId);
        // Notify remaining peers
        for (const peer of peers.values()) {
          this.sendToPeer(peer, { type: 'peer_left', peerId, roomId });
        }
        this.emitEvent('peerLeft', { peerId, roomId });

        if (peers.size === 0) {
          this.rooms.delete(roomId);
          this.emitEvent('roomEmpty', { roomId });
        }
        break;
      }
    }
  }

  // ============================================================================
  // Message Handlers
  // ============================================================================

  private handleJoin(message: SignalingMessage, send: (data: string) => void): void {
    const { peerId, roomId } = message;
    if (!peerId || !roomId) {
      send(JSON.stringify({ type: 'error', error: 'Missing peerId or roomId' }));
      return;
    }

    // Get or create room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
      this.emitEvent('roomCreated', { roomId });
    }
    const room = this.rooms.get(roomId)!;

    // Check capacity
    if (room.size >= this.config.maxPeersPerRoom) {
      send(JSON.stringify({ type: 'error', error: 'Room is full' }));
      return;
    }

    const peer: SignalingPeer = {
      peerId,
      roomId,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      send: (data: string) => send(data),
    };

    // Notify existing peers about the newcomer
    const existingPeerIds: PeerId[] = [];
    for (const existing of room.values()) {
      existingPeerIds.push(existing.peerId);
      this.sendToPeer(existing, { type: 'peer_joined', peerId, roomId });
    }

    // Add peer to room
    room.set(peerId, peer);

    // Send the new peer the list of existing peers
    this.sendToPeer(peer, {
      type: 'peer_list',
      roomId,
      peers: existingPeerIds,
    });

    this.emitEvent('peerJoined', { peerId, roomId });
    logger.info('SignalingServer: peer joined', { peerId, roomId, roomSize: room.size });
  }

  private handleLeave(message: SignalingMessage): void {
    if (message.peerId) {
      this.removePeer(message.peerId);
    }
  }

  private relayToPeer(message: SignalingMessage, senderSend?: (data: string) => void): void {
    const { targetPeerId, peerId } = message;
    if (!targetPeerId || !peerId) return;

    // Find the target peer across all rooms
    for (const room of this.rooms.values()) {
      const target = room.get(targetPeerId);
      if (target) {
        // Add fromPeerId so the receiver knows who sent it
        this.sendToPeer(target, { ...message, fromPeerId: peerId } as any);
        return;
      }
    }

    // Target not found — send error back to sender
    if (senderSend) {
      senderSend(JSON.stringify({ type: 'error', error: `Peer ${targetPeerId} not found` }));
    }
    logger.warn('SignalingServer: target peer not found', { targetPeerId });
  }

  private handleHeartbeat(message: SignalingMessage): void {
    if (!message.peerId) return;
    for (const room of this.rooms.values()) {
      const peer = room.get(message.peerId);
      if (peer) {
        peer.lastSeen = Date.now();
        break;
      }
    }
  }

  // ============================================================================
  // Heartbeat / Cleanup
  // ============================================================================

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.peerTimeout;

      for (const [roomId, room] of this.rooms) {
        const stale: PeerId[] = [];
        for (const [peerId, peer] of room) {
          if (now - peer.lastSeen > timeout) {
            stale.push(peerId);
          }
        }
        for (const peerId of stale) {
          this.removePeer(peerId);
          logger.info('SignalingServer: removed stale peer', { peerId, roomId });
        }
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ============================================================================
  // Events
  // ============================================================================

  on(event: SignalingEventType, handler: SignalingEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  /** Convenience: set a handler for peerJoined events. */
  set onPeerJoined(handler: (peerId: PeerId, roomId: RoomId) => void) {
    this.on('peerJoined', (data: { peerId: PeerId; roomId: RoomId }) =>
      handler(data.peerId, data.roomId),
    );
  }

  /** Convenience: set a handler for peerLeft events. */
  set onPeerLeft(handler: (peerId: PeerId, roomId: RoomId) => void) {
    this.on('peerLeft', (data: { peerId: PeerId; roomId: RoomId }) =>
      handler(data.peerId, data.roomId),
    );
  }

  /** Convenience: set a handler for roomCreated events. */
  set onRoomCreated(handler: (roomId: RoomId) => void) {
    this.on('roomCreated', (data: { roomId: RoomId }) => handler(data.roomId));
  }

  /** Convenience: set a handler for roomEmpty events. */
  set onRoomEmpty(handler: (roomId: RoomId) => void) {
    this.on('roomEmpty', (data: { roomId: RoomId }) => handler(data.roomId));
  }

  private emitEvent(event: SignalingEventType, data: any): void {
    this.listeners.get(event)?.forEach((h) => h(data));
  }

  private sendToPeer(peer: SignalingPeer, message: SignalingMessage): void {
    try {
      peer.send(JSON.stringify(message));
    } catch (err) {
      logger.error('SignalingServer: failed to send to peer', {
        peerId: peer.peerId,
        error: String(err),
      });
    }
  }

  // ============================================================================
  // Query
  // ============================================================================

  /** Get all room IDs. */
  getRooms(): RoomId[] {
    return Array.from(this.rooms.keys());
  }

  /** Get peer count in a room. */
  getRoomSize(roomId: RoomId): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }

  /** Get all peer IDs in a room. */
  getPeersInRoom(roomId: RoomId): PeerId[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.keys());
  }

  /** Total connected peers across all rooms. */
  getTotalPeers(): number {
    let total = 0;
    for (const room of this.rooms.values()) total += room.size;
    return total;
  }
}

// ============================================================================
// Factory function (for Node.js server usage)
// ============================================================================

export function createSignalingServer(
  options: SignalingServerOptions = {},
): SignalingServer {
  const server = new SignalingServer(options);
  server.start();
  return server;
}
