/**
 * @hololand/backend — LobbyServer
 *
 * Application-level lobby server that orchestrates sessions, rooms,
 * and presence. Transport-agnostic — accepts a send callback per
 * session instead of owning the WebSocket layer.
 *
 * Architecture:
 *   Transport (WebSocket/WebRTC)
 *       ↓ messages
 *   LobbyServer
 *       ├── PresenceTracker  (online/offline, heartbeat)
 *       ├── RoomService      (room CRUD, search, categories)
 *       └── SessionManager   (connect, reconnect, auth tokens)
 *
 * Usage:
 *   const lobby = new LobbyServer({ maxSessions: 1000 });
 *   lobby.start();
 *
 *   // On WebSocket connection:
 *   const session = lobby.createSession(ws.id, (msg) => ws.send(JSON.stringify(msg)));
 *
 *   // On WebSocket message:
 *   lobby.handleMessage(session.id, JSON.parse(data));
 *
 *   // On WebSocket close:
 *   lobby.destroySession(session.id);
 */

import { PresenceTracker } from './PresenceTracker';
import type { PeerPresence, PresenceStatus, PresenceSnapshot, PresenceConfig } from './PresenceTracker';
import { RoomService } from './RoomService';
import type { RoomRecord, RoomPublicInfo, RoomSearchQuery, RoomSearchResult, RoomServiceConfig, RoomStatus } from './RoomService';
import { MatchmakingService } from './MatchmakingService';
import type { GameModeConfig, EnqueueOptions, MatchmakingServiceConfig } from './MatchmakingService';

// ============================================================================
// Types
// ============================================================================

export interface LobbySession {
  id: string;
  peerId: string;
  displayName: string;
  connectedAt: number;
  lastActivity: number;
  authenticated: boolean;
  send: LobbySessionSend;
  metadata: Record<string, unknown>;
}

export type LobbySessionSend = (message: LobbyMessage) => void;

export interface LobbyMessage {
  type: string;
  payload?: Record<string, unknown>;
  requestId?: string;
  timestamp: number;
}

export interface LobbyResponse {
  type: string;
  success: boolean;
  payload?: Record<string, unknown>;
  error?: string;
  requestId?: string;
  timestamp: number;
}

export interface LobbyServerConfig {
  /** Maximum concurrent sessions. Default: 5000 */
  maxSessions?: number;
  /** Require authentication before room operations. Default: false */
  requireAuth?: boolean;
  /** Presence tracker configuration. */
  presence?: PresenceConfig;
  /** Room service configuration. */
  rooms?: RoomServiceConfig;
  /** Matchmaking service configuration. */
  matchmaking?: Omit<MatchmakingServiceConfig, 'roomService'>;
}

export type LobbyEventType =
  | 'session_created'
  | 'session_destroyed'
  | 'session_authenticated'
  | 'error';

export interface LobbyEvent {
  type: LobbyEventType;
  sessionId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

type LobbyEventCallback = (event: LobbyEvent) => void;

/** Pluggable authentication function. Receives token → returns peerId or null. */
export type AuthenticateFn = (token: string, sessionId: string) => Promise<string | null> | string | null;

// ============================================================================
// Message types the lobby understands
// ============================================================================

const LOBBY_MESSAGE_TYPES = [
  'authenticate',
  'heartbeat',
  'create_room',
  'join_room',
  'leave_room',
  'list_rooms',
  'search_rooms',
  'room_info',
  'kick_player',
  'lock_room',
  'unlock_room',
  'close_room',
  'update_room',
  'get_presence',
  'get_room_presence',
  'set_display_name',
  'mm_register_mode',
  'mm_enqueue',
  'mm_enqueue_party',
  'mm_dequeue',
  'mm_queue_status',
  'mm_queue_stats',
] as const;

export type LobbyMessageType = (typeof LOBBY_MESSAGE_TYPES)[number];

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_CONFIG: Required<LobbyServerConfig> = {
  maxSessions: 5_000,
  requireAuth: false,
  presence: {},
  rooms: {},
  matchmaking: {},
};

// ============================================================================
// LobbyServer
// ============================================================================

export class LobbyServer {
  private config: Required<LobbyServerConfig>;
  readonly presence: PresenceTracker;
  readonly rooms: RoomService;
  readonly matchmaking: MatchmakingService;

  private sessions: Map<string, LobbySession> = new Map();
  private peerToSession: Map<string, string> = new Map(); // peerId → sessionId
  private listeners: Set<LobbyEventCallback> = new Set();
  private authenticateFn: AuthenticateFn | null = null;
  private running = false;
  private nextSessionId = 1;

  constructor(config: LobbyServerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.presence = new PresenceTracker(this.config.presence);
    this.rooms = new RoomService(this.config.rooms);
    this.matchmaking = new MatchmakingService({
      ...this.config.matchmaking,
      roomService: this.rooms,
    });

    this.wireInternalEvents();
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /** Start the lobby server (presence reaper, matchmaking, etc.). */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.presence.start();
    this.matchmaking.start();
  }

  /** Stop the lobby server. */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.presence.stop();
    this.matchmaking.stop();
  }

  /** Full cleanup — stops everything, clears all state. */
  destroy(): void {
    this.stop();
    this.sessions.clear();
    this.peerToSession.clear();
    this.listeners.clear();
    this.presence.destroy();
    this.rooms.destroy();
    this.matchmaking.destroy();
  }

  /** Set the authentication function. */
  setAuthenticator(fn: AuthenticateFn): void {
    this.authenticateFn = fn;
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /** Create a new session for an incoming connection. */
  createSession(
    peerId: string,
    send: LobbySessionSend,
    opts: { displayName?: string; metadata?: Record<string, unknown> } = {}
  ): LobbySession {
    if (this.sessions.size >= this.config.maxSessions) {
      throw new Error(`Maximum session limit reached (${this.config.maxSessions})`);
    }

    // If peer already has a session, destroy the old one (reconnect)
    const existingSessionId = this.peerToSession.get(peerId);
    if (existingSessionId) {
      this.destroySession(existingSessionId, 'reconnect');
    }

    const now = Date.now();
    const session: LobbySession = {
      id: `sess_${(this.nextSessionId++).toString(36)}_${Date.now().toString(36)}`,
      peerId,
      displayName: opts.displayName ?? peerId,
      connectedAt: now,
      lastActivity: now,
      authenticated: !this.config.requireAuth,
      send,
      metadata: opts.metadata ?? {},
    };

    this.sessions.set(session.id, session);
    this.peerToSession.set(peerId, session.id);

    // Register in presence
    this.presence.connect(peerId, {
      displayName: session.displayName,
      metadata: opts.metadata,
    });

    this.emitEvent({
      type: 'session_created',
      sessionId: session.id,
      timestamp: now,
      data: { peerId },
    });

    // Send welcome
    session.send({
      type: 'welcome',
      payload: {
        sessionId: session.id,
        peerId,
        authenticated: session.authenticated,
        serverTime: now,
      },
      timestamp: now,
    });

    return session;
  }

  /** Destroy a session (on disconnect, kick, etc.). */
  destroySession(sessionId: string, reason = 'disconnect'): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Remove from matchmaking queue
    this.matchmaking.dequeue(session.peerId);

    // Remove from rooms
    this.rooms.handlePlayerDisconnect(session.peerId);

    // Remove from presence
    this.presence.disconnect(session.peerId, reason);

    // Clean up maps
    this.peerToSession.delete(session.peerId);
    this.sessions.delete(sessionId);

    this.emitEvent({
      type: 'session_destroyed',
      sessionId,
      timestamp: Date.now(),
      data: { peerId: session.peerId, reason },
    });
  }

  /** Get a session by ID. */
  getSession(sessionId: string): LobbySession | undefined {
    return this.sessions.get(sessionId);
  }

  /** Get a session by peer ID. */
  getSessionByPeer(peerId: string): LobbySession | undefined {
    const sessionId = this.peerToSession.get(peerId);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  /** Get number of active sessions. */
  getSessionCount(): number {
    return this.sessions.size;
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  /** Handle an incoming message from a session. */
  async handleMessage(sessionId: string, message: LobbyMessage): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.lastActivity = Date.now();
    this.presence.activity(session.peerId);

    try {
      switch (message.type as LobbyMessageType) {
        case 'authenticate':
          await this.handleAuthenticate(session, message);
          break;
        case 'heartbeat':
          this.handleHeartbeat(session, message);
          break;
        case 'create_room':
          this.handleCreateRoom(session, message);
          break;
        case 'join_room':
          this.handleJoinRoom(session, message);
          break;
        case 'leave_room':
          this.handleLeaveRoom(session, message);
          break;
        case 'list_rooms':
          this.handleListRooms(session, message);
          break;
        case 'search_rooms':
          this.handleSearchRooms(session, message);
          break;
        case 'room_info':
          this.handleRoomInfo(session, message);
          break;
        case 'kick_player':
          this.handleKickPlayer(session, message);
          break;
        case 'lock_room':
          this.handleLockRoom(session, message);
          break;
        case 'unlock_room':
          this.handleUnlockRoom(session, message);
          break;
        case 'close_room':
          this.handleCloseRoom(session, message);
          break;
        case 'update_room':
          this.handleUpdateRoom(session, message);
          break;
        case 'get_presence':
          this.handleGetPresence(session, message);
          break;
        case 'get_room_presence':
          this.handleGetRoomPresence(session, message);
          break;
        case 'set_display_name':
          this.handleSetDisplayName(session, message);
          break;
        case 'mm_register_mode':
          this.handleMmRegisterMode(session, message);
          break;
        case 'mm_enqueue':
          this.handleMmEnqueue(session, message);
          break;
        case 'mm_enqueue_party':
          this.handleMmEnqueueParty(session, message);
          break;
        case 'mm_dequeue':
          this.handleMmDequeue(session, message);
          break;
        case 'mm_queue_status':
          this.handleMmQueueStatus(session, message);
          break;
        case 'mm_queue_stats':
          this.handleMmQueueStats(session, message);
          break;
        default:
          this.sendError(session, message, `Unknown message type: ${message.type}`);
      }
    } catch (err) {
      this.sendError(session, message, (err as Error).message);
    }
  }

  // ============================================================================
  // Message Handlers
  // ============================================================================

  private async handleAuthenticate(session: LobbySession, message: LobbyMessage): Promise<void> {
    if (!this.authenticateFn) {
      // No authenticator configured — auto-authenticate
      session.authenticated = true;
      this.sendResponse(session, message, true, { authenticated: true });
      return;
    }

    const token = (message.payload as { token?: string })?.token;
    if (!token) {
      this.sendError(session, message, 'Token required');
      return;
    }

    const peerId = await this.authenticateFn(token, session.id);
    if (peerId) {
      session.authenticated = true;
      this.emitEvent({
        type: 'session_authenticated',
        sessionId: session.id,
        timestamp: Date.now(),
        data: { peerId: session.peerId },
      });
      this.sendResponse(session, message, true, { authenticated: true, peerId });
    } else {
      this.sendError(session, message, 'Authentication failed');
    }
  }

  private handleHeartbeat(session: LobbySession, message: LobbyMessage): void {
    this.presence.heartbeat(session.peerId);
    this.sendResponse(session, message, true, { serverTime: Date.now() });
  }

  private handleCreateRoom(session: LobbySession, message: LobbyMessage): void {
    this.requireAuth(session);
    const payload = (message.payload ?? {}) as {
      name?: string;
      maxPlayers?: number;
      isPrivate?: boolean;
      password?: string;
      category?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    };

    if (!payload.name) {
      this.sendError(session, message, 'Room name required');
      return;
    }

    const room = this.rooms.create({
      name: payload.name,
      hostId: session.peerId,
      maxPlayers: payload.maxPlayers,
      isPrivate: payload.isPrivate,
      password: payload.password,
      category: payload.category,
      tags: payload.tags,
      metadata: payload.metadata,
    });

    this.presence.setRoom(session.peerId, room.id);

    this.sendResponse(session, message, true, {
      room: this.rooms.getRoomPublicInfo(room.id),
    });
  }

  private handleJoinRoom(session: LobbySession, message: LobbyMessage): void {
    this.requireAuth(session);
    const payload = (message.payload ?? {}) as { roomId?: string; password?: string };
    if (!payload.roomId) {
      this.sendError(session, message, 'Room ID required');
      return;
    }

    const room = this.rooms.join(payload.roomId, session.peerId, payload.password);
    this.presence.setRoom(session.peerId, room.id);

    // Notify other players in the room
    this.broadcastToRoom(room.id, {
      type: 'player_joined',
      payload: {
        peerId: session.peerId,
        displayName: session.displayName,
        roomId: room.id,
      },
      timestamp: Date.now(),
    }, session.peerId);

    this.sendResponse(session, message, true, {
      room: this.rooms.getRoomPublicInfo(room.id),
      players: this.rooms.getPlayers(room.id),
    });
  }

  private handleLeaveRoom(session: LobbySession, message: LobbyMessage): void {
    const currentRoom = this.rooms.getPlayerRoom(session.peerId);
    if (!currentRoom) {
      this.sendError(session, message, 'Not in a room');
      return;
    }

    const roomId = currentRoom.id;

    // Notify other players before leaving
    this.broadcastToRoom(roomId, {
      type: 'player_left',
      payload: {
        peerId: session.peerId,
        displayName: session.displayName,
        roomId,
      },
      timestamp: Date.now(),
    }, session.peerId);

    this.rooms.leave(roomId, session.peerId);
    this.presence.setRoom(session.peerId, null);

    this.sendResponse(session, message, true, { roomId });
  }

  private handleListRooms(session: LobbySession, message: LobbyMessage): void {
    const result = this.rooms.search({ publicOnly: true, openOnly: false });
    this.sendResponse(session, message, true, {
      rooms: result.rooms,
      total: result.total,
    });
  }

  private handleSearchRooms(session: LobbySession, message: LobbyMessage): void {
    const query = (message.payload ?? {}) as RoomSearchQuery;
    const result = this.rooms.search(query);
    this.sendResponse(session, message, true, {
      rooms: result.rooms,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  }

  private handleRoomInfo(session: LobbySession, message: LobbyMessage): void {
    const { roomId } = (message.payload ?? {}) as { roomId?: string };
    if (!roomId) {
      this.sendError(session, message, 'Room ID required');
      return;
    }

    const info = this.rooms.getRoomPublicInfo(roomId);
    if (!info) {
      this.sendError(session, message, 'Room not found');
      return;
    }

    this.sendResponse(session, message, true, {
      room: info,
      players: this.rooms.getPlayers(roomId),
    });
  }

  private handleKickPlayer(session: LobbySession, message: LobbyMessage): void {
    this.requireAuth(session);
    const { roomId, playerId, reason } = (message.payload ?? {}) as {
      roomId?: string;
      playerId?: string;
      reason?: string;
    };

    if (!roomId || !playerId) {
      this.sendError(session, message, 'Room ID and player ID required');
      return;
    }

    const success = this.rooms.kick(roomId, playerId, session.peerId, reason ?? 'Kicked');
    if (!success) {
      this.sendError(session, message, 'Cannot kick player (not host or player not found)');
      return;
    }

    // Notify kicked player
    const kickedSession = this.getSessionByPeer(playerId);
    if (kickedSession) {
      this.presence.setRoom(playerId, null);
      kickedSession.send({
        type: 'kicked',
        payload: { roomId, reason: reason ?? 'Kicked' },
        timestamp: Date.now(),
      });
    }

    this.sendResponse(session, message, true, { kicked: playerId });
  }

  private handleLockRoom(session: LobbySession, message: LobbyMessage): void {
    this.requireAuth(session);
    const { roomId } = (message.payload ?? {}) as { roomId?: string };
    if (!roomId) {
      this.sendError(session, message, 'Room ID required');
      return;
    }

    const success = this.rooms.lockRoom(roomId, session.peerId);
    if (!success) {
      this.sendError(session, message, 'Cannot lock room');
      return;
    }

    this.broadcastToRoom(roomId, {
      type: 'room_locked',
      payload: { roomId },
      timestamp: Date.now(),
    });

    this.sendResponse(session, message, true, { roomId, status: 'locked' });
  }

  private handleUnlockRoom(session: LobbySession, message: LobbyMessage): void {
    this.requireAuth(session);
    const { roomId } = (message.payload ?? {}) as { roomId?: string };
    if (!roomId) {
      this.sendError(session, message, 'Room ID required');
      return;
    }

    const success = this.rooms.unlockRoom(roomId, session.peerId);
    if (!success) {
      this.sendError(session, message, 'Cannot unlock room');
      return;
    }

    this.broadcastToRoom(roomId, {
      type: 'room_unlocked',
      payload: { roomId },
      timestamp: Date.now(),
    });

    this.sendResponse(session, message, true, { roomId, status: 'open' });
  }

  private handleCloseRoom(session: LobbySession, message: LobbyMessage): void {
    this.requireAuth(session);
    const { roomId } = (message.payload ?? {}) as { roomId?: string };
    if (!roomId) {
      this.sendError(session, message, 'Room ID required');
      return;
    }

    const success = this.rooms.closeRoom(roomId, session.peerId);
    if (!success) {
      this.sendError(session, message, 'Cannot close room');
      return;
    }

    this.broadcastToRoom(roomId, {
      type: 'room_closed',
      payload: { roomId },
      timestamp: Date.now(),
    });

    this.sendResponse(session, message, true, { roomId, status: 'closed' });
  }

  private handleUpdateRoom(session: LobbySession, message: LobbyMessage): void {
    this.requireAuth(session);
    const { roomId, ...updates } = (message.payload ?? {}) as {
      roomId?: string;
      name?: string;
      category?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
      maxPlayers?: number;
      isPrivate?: boolean;
    };

    if (!roomId) {
      this.sendError(session, message, 'Room ID required');
      return;
    }

    // Only host can update
    const room = this.rooms.getRoom(roomId);
    if (!room || room.hostId !== session.peerId) {
      this.sendError(session, message, 'Only the host can update room settings');
      return;
    }

    const updated = this.rooms.update(roomId, updates);
    if (!updated) {
      this.sendError(session, message, 'Room not found');
      return;
    }

    this.sendResponse(session, message, true, {
      room: this.rooms.getRoomPublicInfo(roomId),
    });
  }

  private handleGetPresence(session: LobbySession, message: LobbyMessage): void {
    const { peerId } = (message.payload ?? {}) as { peerId?: string };

    if (peerId) {
      const peer = this.presence.getPeer(peerId);
      this.sendResponse(session, message, true, { peer: peer ?? null });
    } else {
      const snapshot = this.presence.getSnapshot();
      this.sendResponse(session, message, true, {
        totalOnline: snapshot.totalOnline,
        totalIdle: snapshot.totalIdle,
        totalAway: snapshot.totalAway,
        peers: snapshot.peers,
      });
    }
  }

  private handleGetRoomPresence(session: LobbySession, message: LobbyMessage): void {
    const { roomId } = (message.payload ?? {}) as { roomId?: string };
    if (!roomId) {
      this.sendError(session, message, 'Room ID required');
      return;
    }

    const peers = this.presence.getPeersInRoom(roomId);
    this.sendResponse(session, message, true, {
      roomId,
      peers,
      count: peers.length,
    });
  }

  private handleSetDisplayName(session: LobbySession, message: LobbyMessage): void {
    const { displayName } = (message.payload ?? {}) as { displayName?: string };
    if (!displayName || displayName.trim().length === 0) {
      this.sendError(session, message, 'Display name required');
      return;
    }

    session.displayName = displayName.trim();
    const peer = this.presence.getPeer(session.peerId);
    if (peer) {
      peer.displayName = session.displayName;
    }

    this.sendResponse(session, message, true, { displayName: session.displayName });
  }

  // ============================================================================
  // Matchmaking Handlers
  // ============================================================================

  private handleMmRegisterMode(session: LobbySession, message: LobbyMessage): void {
    this.requireAuth(session);
    const payload = (message.payload ?? {}) as { name?: string } & GameModeConfig;

    if (!payload.name) {
      this.sendError(session, message, 'Mode name required');
      return;
    }

    const { name, ...config } = payload;
    this.matchmaking.addMode(name, config);
    this.sendResponse(session, message, true, { mode: name, registered: true });
  }

  private handleMmEnqueue(session: LobbySession, message: LobbyMessage): void {
    this.requireAuth(session);
    const payload = (message.payload ?? {}) as {
      mode?: string;
      skillRating?: number;
      region?: string;
      metadata?: Record<string, unknown>;
    };

    if (!payload.mode) {
      this.sendError(session, message, 'Mode required');
      return;
    }

    const entry = this.matchmaking.enqueue(session.peerId, payload.mode, {
      skillRating: payload.skillRating,
      region: payload.region,
      metadata: payload.metadata,
    });

    this.sendResponse(session, message, true, {
      entryId: entry.id,
      mode: entry.mode,
      position: this.matchmaking.getQueuePosition(session.peerId),
    });
  }

  private handleMmEnqueueParty(session: LobbySession, message: LobbyMessage): void {
    this.requireAuth(session);
    const payload = (message.payload ?? {}) as {
      mode?: string;
      memberIds?: string[];
      skillRating?: number;
      region?: string;
      metadata?: Record<string, unknown>;
    };

    if (!payload.mode) {
      this.sendError(session, message, 'Mode required');
      return;
    }

    if (!payload.memberIds || payload.memberIds.length === 0) {
      this.sendError(session, message, 'Member IDs required');
      return;
    }

    const entry = this.matchmaking.enqueueParty(
      session.peerId,
      payload.memberIds,
      payload.mode,
      {
        skillRating: payload.skillRating,
        region: payload.region,
        metadata: payload.metadata,
      }
    );

    this.sendResponse(session, message, true, {
      entryId: entry.id,
      mode: entry.mode,
      playerIds: entry.playerIds,
      position: this.matchmaking.getQueuePosition(session.peerId),
    });
  }

  private handleMmDequeue(session: LobbySession, message: LobbyMessage): void {
    const removed = this.matchmaking.dequeue(session.peerId);
    this.sendResponse(session, message, true, { removed });
  }

  private handleMmQueueStatus(session: LobbySession, message: LobbyMessage): void {
    const entry = this.matchmaking.getQueueEntry(session.peerId);
    if (!entry) {
      this.sendResponse(session, message, true, { queued: false });
      return;
    }

    this.sendResponse(session, message, true, {
      queued: true,
      mode: entry.mode,
      position: this.matchmaking.getQueuePosition(session.peerId),
      enqueuedAt: entry.enqueuedAt,
      waitTime: Date.now() - entry.enqueuedAt,
    });
  }

  private handleMmQueueStats(session: LobbySession, message: LobbyMessage): void {
    const payload = (message.payload ?? {}) as { mode?: string };

    if (payload.mode) {
      const stats = this.matchmaking.getQueueStats(payload.mode);
      if (!stats) {
        this.sendError(session, message, `Mode "${payload.mode}" not found`);
        return;
      }
      this.sendResponse(session, message, true, { stats });
    } else {
      const allStats = this.matchmaking.getAllQueueStats();
      this.sendResponse(session, message, true, { stats: allStats });
    }
  }

  // ============================================================================
  // Broadcasting
  // ============================================================================

  /** Send a message to all players in a room. */
  broadcastToRoom(roomId: string, message: LobbyMessage, excludePeerId?: string): void {
    const playerIds = this.rooms.getPlayers(roomId);
    for (const playerId of playerIds) {
      if (playerId === excludePeerId) continue;
      const session = this.getSessionByPeer(playerId);
      if (session) {
        session.send(message);
      }
    }
  }

  /** Send a message to all connected sessions. */
  broadcast(message: LobbyMessage): void {
    for (const session of this.sessions.values()) {
      session.send(message);
    }
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: LobbyEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.offEvent(callback);
  }

  offEvent(callback: LobbyEventCallback): void {
    this.listeners.delete(callback);
  }

  private emitEvent(event: LobbyEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // swallow
      }
    }
  }

  // ============================================================================
  // Stats
  // ============================================================================

  getStats(): {
    sessions: number;
    rooms: number;
    onlinePeers: number;
    matchmakingQueued: number;
    matchmakingModes: number;
    running: boolean;
  } {
    const mmStats = this.matchmaking.getStats();
    return {
      sessions: this.sessions.size,
      rooms: this.rooms.getRoomCount(),
      onlinePeers: this.presence.getPeerCount(),
      matchmakingQueued: mmStats.totalQueued,
      matchmakingModes: mmStats.modes,
      running: this.running,
    };
  }

  // ============================================================================
  // Internal
  // ============================================================================

  /** Wire internal events between subsystems. */
  private wireInternalEvents(): void {
    // When presence times out a peer, clean up session, rooms, and matchmaking
    this.presence.onEvent((event) => {
      if (event.type === 'peer_timeout') {
        const sessionId = this.peerToSession.get(event.peerId);
        if (sessionId) {
          // Remove from matchmaking queue
          this.matchmaking.dequeue(event.peerId);
          // Remove from rooms
          this.rooms.handlePlayerDisconnect(event.peerId);
          // Then clean up session
          this.peerToSession.delete(event.peerId);
          this.sessions.delete(sessionId);
          this.emitEvent({
            type: 'session_destroyed',
            sessionId,
            timestamp: event.timestamp,
            data: { peerId: event.peerId, reason: 'heartbeat_timeout' },
          });
        }
      }
    });

    // When a room emits player_left, update presence room location
    this.rooms.onEvent((event) => {
      if (event.type === 'player_left') {
        const playerId = event.data.playerId as string;
        // Only clear room in presence if player isn't in another room
        const currentRoom = this.rooms.getPlayerRoom(playerId);
        if (!currentRoom) {
          this.presence.setRoom(playerId, null);
        }
      }
    });

    // When matchmaking finds a match, notify matched players
    this.matchmaking.onEvent((event) => {
      if (event.type === 'match_found' || event.type === 'backfill_found') {
        const playerIds = event.data.playerIds as string[];
        const now = Date.now();
        for (const playerId of playerIds) {
          const session = this.getSessionByPeer(playerId);
          if (session) {
            session.send({
              type: 'mm_match_found',
              payload: {
                matchId: event.data.matchId,
                mode: event.data.mode,
                roomId: event.data.roomId,
                playerIds: event.data.playerIds,
                teams: event.data.teams,
                isBackfill: event.type === 'backfill_found',
              } as Record<string, unknown>,
              timestamp: now,
            });

            // Update presence with room
            if (event.data.roomId) {
              this.presence.setRoom(playerId, event.data.roomId as string);
            }
          }
        }
      }

      if (event.type === 'queue_expired') {
        const playerIds = event.data.playerIds as string[];
        const now = Date.now();
        for (const playerId of playerIds) {
          const session = this.getSessionByPeer(playerId);
          if (session) {
            session.send({
              type: 'mm_queue_expired',
              payload: {
                mode: event.data.mode,
                waitTime: event.data.waitTime,
              } as Record<string, unknown>,
              timestamp: now,
            });
          }
        }
      }
    });
  }

  /** Throw if auth is required and session is not authenticated. */
  private requireAuth(session: LobbySession): void {
    if (this.config.requireAuth && !session.authenticated) {
      throw new Error('Authentication required');
    }
  }

  /** Send a success response. */
  private sendResponse(
    session: LobbySession,
    request: LobbyMessage,
    success: boolean,
    payload: Record<string, unknown>
  ): void {
    const response: LobbyResponse = {
      type: `${request.type}_response`,
      success,
      payload,
      requestId: request.requestId,
      timestamp: Date.now(),
    };
    session.send(response);
  }

  /** Send an error response. */
  private sendError(session: LobbySession, request: LobbyMessage, error: string): void {
    const response: LobbyResponse = {
      type: `${request.type}_response`,
      success: false,
      error,
      requestId: request.requestId,
      timestamp: Date.now(),
    };
    session.send(response);

    this.emitEvent({
      type: 'error',
      sessionId: session.id,
      timestamp: Date.now(),
      data: { messageType: request.type, error },
    });
  }
}
