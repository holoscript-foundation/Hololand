/**
 * @hololand/network NetworkServer
 *
 * Authoritative server/host for Hololand multiplayer rooms
 * Can run as a dedicated server (Node.js) or peer host (browser)
 */

import { logger } from './logger';
import type {
  PlayerInfo,
  RoomInfo,
  RoomConfig,
  RoomState,
  NetworkMessage,
  SyncState,
  StateSnapshot,
  Vector3,
} from './types';

export interface ServerConfig {
  maxRooms?: number;
  maxPlayersPerRoom?: number;
  tickRate?: number; // Updates per second
  snapshotRate?: number; // Snapshots per second
  authRequired?: boolean;
}

export interface ClientConnection {
  id: string;
  displayName: string;
  roomId: string | null;
  joinedAt: number;
  lastActivity: number;
  send: (message: NetworkMessage) => void;
}

const DEFAULT_CONFIG: Required<ServerConfig> = {
  maxRooms: 100,
  maxPlayersPerRoom: 50,
  tickRate: 60,
  snapshotRate: 20,
  authRequired: false,
};

export class NetworkServer {
  private config: Required<ServerConfig>;
  private rooms: Map<string, RoomInfo> = new Map();
  private roomPlayers: Map<string, Map<string, PlayerInfo>> = new Map();
  private roomStates: Map<string, Map<string, SyncState>> = new Map();
  private clients: Map<string, ClientConnection> = new Map();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private snapshotTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private stateSequence: number = 0;

  // Message handlers by type
  private messageHandlers: Map<
    string,
    (client: ClientConnection, message: NetworkMessage) => void
  > = new Map();

  constructor(config: ServerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerDefaultHandlers();
    logger.info('NetworkServer initialized', { config: this.config });
  }

  // ============================================================================
  // Server Lifecycle
  // ============================================================================

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    // Start tick loop
    const tickInterval = 1000 / this.config.tickRate;
    this.tickTimer = setInterval(() => this.tick(), tickInterval);

    // Start snapshot broadcast
    const snapshotInterval = 1000 / this.config.snapshotRate;
    this.snapshotTimer = setInterval(
      () => this.broadcastSnapshots(),
      snapshotInterval
    );

    logger.info('Server started', {
      tickRate: this.config.tickRate,
      snapshotRate: this.config.snapshotRate,
    });
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = null;
    }

    // Disconnect all clients
    this.clients.forEach((client) => {
      this.handleClientDisconnect(client.id, 'server_shutdown');
    });

    logger.info('Server stopped');
  }

  // ============================================================================
  // Client Management
  // ============================================================================

  registerClient(connection: ClientConnection): void {
    this.clients.set(connection.id, connection);
    logger.info('Client registered', { clientId: connection.id });

    // Send welcome message
    connection.send({
      type: 'handshake_ack',
      category: 'connection',
      payload: { clientId: connection.id },
      timestamp: Date.now(),
    });
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.handleClientDisconnect(clientId, 'removed');
      this.clients.delete(clientId);
    }
  }

  handleMessage(clientId: string, message: NetworkMessage): void {
    const client = this.clients.get(clientId);
    if (!client) {
      logger.warn('Message from unknown client', { clientId });
      return;
    }

    client.lastActivity = Date.now();

    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(client, message);
    } else {
      logger.debug('No handler for message type', { type: message.type });
    }
  }

  private handleClientDisconnect(clientId: string, reason: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from room
    if (client.roomId) {
      this.leaveRoom(clientId, client.roomId);
    }

    logger.info('Client disconnected', { clientId, reason });
  }

  // ============================================================================
  // Room Management
  // ============================================================================

  createRoom(config: RoomConfig, hostId: string): RoomInfo {
    if (this.rooms.size >= this.config.maxRooms) {
      throw new Error('Maximum room limit reached');
    }

    const roomId = config.id || this.generateRoomId();
    const room: RoomInfo = {
      id: roomId,
      name: config.name,
      playerCount: 0,
      maxPlayers: config.maxPlayers || this.config.maxPlayersPerRoom,
      state: 'open',
      isPrivate: config.isPrivate || false,
      hostId,
      createdAt: Date.now(),
      metadata: config.metadata,
    };

    this.rooms.set(roomId, room);
    this.roomPlayers.set(roomId, new Map());
    this.roomStates.set(roomId, new Map());

    logger.info('Room created', { roomId, name: config.name, hostId });
    return room;
  }

  joinRoom(clientId: string, roomId: string, password?: string): PlayerInfo {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.state !== 'open') {
      throw new Error(`Room is ${room.state}`);
    }

    if (room.playerCount >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    // Leave current room if in one
    if (client.roomId) {
      this.leaveRoom(clientId, client.roomId);
    }

    const player: PlayerInfo = {
      id: clientId,
      displayName: client.displayName,
      role: room.playerCount === 0 ? 'host' : 'player',
      joinedAt: Date.now(),
      position: { x: 0, y: 0, z: 0 },
    };

    const players = this.roomPlayers.get(roomId)!;
    players.set(clientId, player);
    room.playerCount = players.size;
    client.roomId = roomId;

    // Notify other players
    this.broadcastToRoom(roomId, {
      type: 'playerJoined',
      category: 'room',
      payload: { roomId, player },
      timestamp: Date.now(),
    }, clientId);

    logger.info('Player joined room', { clientId, roomId });
    return player;
  }

  leaveRoom(clientId: string, roomId: string): void {
    const room = this.rooms.get(roomId);
    const players = this.roomPlayers.get(roomId);
    const client = this.clients.get(clientId);

    if (!room || !players) return;

    const player = players.get(clientId);
    if (!player) return;

    players.delete(clientId);
    room.playerCount = players.size;

    if (client) {
      client.roomId = null;
    }

    // Notify other players
    this.broadcastToRoom(roomId, {
      type: 'playerLeft',
      category: 'room',
      payload: { roomId, playerId: clientId, reason: 'left' },
      timestamp: Date.now(),
    });

    // Handle host leaving
    if (player.role === 'host' && players.size > 0) {
      const newHost = players.values().next().value!;
      newHost.role = 'host';
      room.hostId = newHost.id;

      this.broadcastToRoom(roomId, {
        type: 'hostChanged',
        category: 'room',
        payload: { roomId, newHostId: newHost.id },
        timestamp: Date.now(),
      });
    }

    // Delete empty room
    if (players.size === 0) {
      this.rooms.delete(roomId);
      this.roomPlayers.delete(roomId);
      this.roomStates.delete(roomId);
      logger.info('Empty room deleted', { roomId });
    }

    logger.info('Player left room', { clientId, roomId });
  }

  setRoomState(roomId: string, state: RoomState): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.state = state;

    this.broadcastToRoom(roomId, {
      type: 'roomStateChanged',
      category: 'room',
      payload: { roomId, state },
      timestamp: Date.now(),
    });
  }

  getRoomList(): RoomInfo[] {
    return Array.from(this.rooms.values()).filter((room) => !room.isPrivate);
  }

  getRoom(roomId: string): RoomInfo | undefined {
    return this.rooms.get(roomId);
  }

  getRoomPlayers(roomId: string): PlayerInfo[] {
    const players = this.roomPlayers.get(roomId);
    return players ? Array.from(players.values()) : [];
  }

  // ============================================================================
  // State Synchronization
  // ============================================================================

  updateState(roomId: string, state: SyncState): void {
    const states = this.roomStates.get(roomId);
    if (!states) return;

    state.sequence = this.stateSequence++;
    state.timestamp = Date.now();
    states.set(state.objectId, state);
  }

  removeState(roomId: string, objectId: string): void {
    this.roomStates.get(roomId)?.delete(objectId);
  }

  private tick(): void {
    // Process any queued actions, physics, etc.
    // This runs at tickRate (e.g., 60 times per second)
  }

  private broadcastSnapshots(): void {
    this.rooms.forEach((room, roomId) => {
      const states = this.roomStates.get(roomId);
      if (!states || states.size === 0) return;

      const snapshot: StateSnapshot = {
        timestamp: Date.now(),
        sequence: this.stateSequence,
        states: Array.from(states.values()),
      };

      this.broadcastToRoom(roomId, {
        type: 'snapshot',
        category: 'state',
        payload: snapshot,
        timestamp: snapshot.timestamp,
      });
    });
  }

  // ============================================================================
  // Player Position Updates
  // ============================================================================

  updatePlayerPosition(
    clientId: string,
    roomId: string,
    position: Vector3,
    rotation?: Vector3
  ): void {
    const players = this.roomPlayers.get(roomId);
    if (!players) return;

    const player = players.get(clientId);
    if (!player) return;

    player.position = position;

    // Create sync state for player
    this.updateState(roomId, {
      objectId: `player:${clientId}`,
      position,
      rotation,
      timestamp: Date.now(),
      sequence: 0,
    });
  }

  // ============================================================================
  // Messaging
  // ============================================================================

  broadcastToRoom(
    roomId: string,
    message: NetworkMessage,
    excludeClientId?: string
  ): void {
    const players = this.roomPlayers.get(roomId);
    if (!players) return;

    players.forEach((_, playerId) => {
      if (playerId === excludeClientId) return;

      const client = this.clients.get(playerId);
      if (client) {
        client.send(message);
      }
    });
  }

  sendToClient(clientId: string, message: NetworkMessage): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.send(message);
    }
  }

  broadcast(message: NetworkMessage): void {
    this.clients.forEach((client) => {
      client.send(message);
    });
  }

  // ============================================================================
  // Message Handlers
  // ============================================================================

  private registerDefaultHandlers(): void {
    // Ping/Pong
    this.messageHandlers.set('ping', (client, message) => {
      client.send({
        type: 'pong',
        category: 'connection',
        payload: (message.payload as { timestamp: number }).timestamp,
        timestamp: Date.now(),
      });
    });

    // Room operations
    this.messageHandlers.set('createRoom', (client, message) => {
      try {
        const config = message.payload as RoomConfig;
        const room = this.createRoom(config, client.id);
        const player = this.joinRoom(client.id, room.id);

        client.send({
          type: 'roomCreated',
          category: 'room',
          payload: { room, player },
          timestamp: Date.now(),
        });
      } catch (error) {
        client.send({
          type: 'error',
          category: 'room',
          payload: { message: (error as Error).message },
          timestamp: Date.now(),
        });
      }
    });

    this.messageHandlers.set('joinRoom', (client, message) => {
      try {
        const { roomId, password } = message.payload as {
          roomId: string;
          password?: string;
        };
        const player = this.joinRoom(client.id, roomId, password);
        const room = this.rooms.get(roomId)!;
        const players = this.getRoomPlayers(roomId);

        client.send({
          type: 'roomJoined',
          category: 'room',
          payload: { room, player, players },
          timestamp: Date.now(),
        });
      } catch (error) {
        client.send({
          type: 'error',
          category: 'room',
          payload: { message: (error as Error).message },
          timestamp: Date.now(),
        });
      }
    });

    this.messageHandlers.set('leaveRoom', (client, message) => {
      const { roomId } = message.payload as { roomId: string };
      this.leaveRoom(client.id, roomId);

      client.send({
        type: 'roomLeft',
        category: 'room',
        payload: { roomId, reason: 'left' },
        timestamp: Date.now(),
      });
    });

    this.messageHandlers.set('getRoomList', (client) => {
      client.send({
        type: 'roomList',
        category: 'room',
        payload: { rooms: this.getRoomList() },
        timestamp: Date.now(),
      });
    });

    // State updates
    this.messageHandlers.set('stateUpdate', (client, message) => {
      if (!client.roomId) return;

      const state = message.payload as SyncState;
      this.updateState(client.roomId, state);
    });

    // Position updates
    this.messageHandlers.set('positionUpdate', (client, message) => {
      if (!client.roomId) return;

      const { position, rotation } = message.payload as {
        position: Vector3;
        rotation?: Vector3;
      };
      this.updatePlayerPosition(client.id, client.roomId, position, rotation);
    });
  }

  registerHandler(
    type: string,
    handler: (client: ClientConnection, message: NetworkMessage) => void
  ): void {
    this.messageHandlers.set(type, handler);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  getStats(): {
    clientCount: number;
    roomCount: number;
    isRunning: boolean;
  } {
    return {
      clientCount: this.clients.size,
      roomCount: this.rooms.size,
      isRunning: this.isRunning,
    };
  }
}
