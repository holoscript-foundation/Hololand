/**
 * @hololand/network Room
 *
 * Client-side room management for multiplayer sessions
 * Handles room state, players, and synchronization
 */

import { logger } from './logger';
import type { NetworkClient } from './NetworkClient';
import type {
  RoomInfo,
  RoomConfig,
  RoomState,
  PlayerInfo,
  PlayerRole,
  SyncState,
  StateSnapshot,
  Vector3,
  NetworkMessage,
} from './types';

export interface RoomEventMap {
  playerJoined: { player: PlayerInfo };
  playerLeft: { playerId: string; reason: string };
  stateChanged: { state: RoomState };
  hostChanged: { newHostId: string };
  stateUpdate: { states: SyncState[] };
  snapshot: { snapshot: StateSnapshot };
  kicked: { reason: string };
}

export type RoomEventType = keyof RoomEventMap;
export type RoomEventHandler<T extends RoomEventType> = (
  event: RoomEventMap[T]
) => void;

export class Room {
  private client: NetworkClient;
  private info: RoomInfo;
  private players: Map<string, PlayerInfo> = new Map();
  private localPlayerId: string;
  private localState: Map<string, SyncState> = new Map();
  private remoteState: Map<string, SyncState> = new Map();

  private eventListeners: Map<
    RoomEventType,
    Set<RoomEventHandler<RoomEventType>>
  > = new Map();
  private unsubscribers: (() => void)[] = [];

  constructor(client: NetworkClient, info: RoomInfo, localPlayer: PlayerInfo) {
    this.client = client;
    this.info = info;
    this.localPlayerId = localPlayer.id;
    this.players.set(localPlayer.id, localPlayer);

    this.setupMessageHandlers();
    logger.info('Room joined', { roomId: info.id, playerId: localPlayer.id });
  }

  // ============================================================================
  // Room Operations
  // ============================================================================

  leave(): void {
    this.client.send({
      type: 'leaveRoom',
      category: 'room',
      payload: { roomId: this.info.id },
      timestamp: Date.now(),
    });
    this.cleanup();
    logger.info('Left room', { roomId: this.info.id });
  }

  kick(playerId: string, reason: string = 'Kicked by host'): boolean {
    if (!this.isHost()) {
      logger.warn('Only host can kick players');
      return false;
    }

    this.client.send({
      type: 'kickPlayer',
      category: 'room',
      payload: { roomId: this.info.id, playerId, reason },
      timestamp: Date.now(),
    });
    return true;
  }

  setPlayerRole(playerId: string, role: PlayerRole): boolean {
    if (!this.isHost()) {
      logger.warn('Only host can change roles');
      return false;
    }

    this.client.send({
      type: 'setPlayerRole',
      category: 'room',
      payload: { roomId: this.info.id, playerId, role },
      timestamp: Date.now(),
    });
    return true;
  }

  lock(): void {
    if (!this.isHost()) return;

    this.client.send({
      type: 'setRoomState',
      category: 'room',
      payload: { roomId: this.info.id, state: 'locked' },
      timestamp: Date.now(),
    });
  }

  unlock(): void {
    if (!this.isHost()) return;

    this.client.send({
      type: 'setRoomState',
      category: 'room',
      payload: { roomId: this.info.id, state: 'open' },
      timestamp: Date.now(),
    });
  }

  // ============================================================================
  // State Synchronization
  // ============================================================================

  updateLocalState(state: Omit<SyncState, 'timestamp' | 'sequence'>): void {
    const fullState: SyncState = {
      ...state,
      timestamp: Date.now(),
      sequence: 0,
    };

    this.localState.set(state.objectId, fullState);

    this.client.send({
      type: 'stateUpdate',
      category: 'state',
      payload: fullState,
      timestamp: Date.now(),
    });
  }

  removeLocalState(objectId: string): void {
    this.localState.delete(objectId);

    this.client.send({
      type: 'stateRemove',
      category: 'state',
      payload: { objectId },
      timestamp: Date.now(),
    });
  }

  updatePosition(position: Vector3, rotation?: Vector3): void {
    this.client.send({
      type: 'positionUpdate',
      category: 'state',
      payload: { position, rotation },
      timestamp: Date.now(),
    });

    // Update local player
    const localPlayer = this.players.get(this.localPlayerId);
    if (localPlayer) {
      localPlayer.position = position;
    }
  }

  getState(objectId: string): SyncState | undefined {
    return this.remoteState.get(objectId) || this.localState.get(objectId);
  }

  getAllStates(): SyncState[] {
    const allStates = new Map([...this.remoteState, ...this.localState]);
    return Array.from(allStates.values());
  }

  // ============================================================================
  // Message Handlers
  // ============================================================================

  private setupMessageHandlers(): void {
    // Player events
    this.unsubscribers.push(
      this.client.onMessage('playerJoined', (message) => {
        const { roomId, player } = message.payload as {
          roomId: string;
          player: PlayerInfo;
        };
        if (roomId !== this.info.id) return;

        this.players.set(player.id, player);
        this.info.playerCount = this.players.size;
        this.emit('playerJoined', { player });
        logger.info('Player joined', { playerId: player.id });
      })
    );

    this.unsubscribers.push(
      this.client.onMessage('playerLeft', (message) => {
        const { roomId, playerId, reason } = message.payload as {
          roomId: string;
          playerId: string;
          reason: string;
        };
        if (roomId !== this.info.id) return;

        this.players.delete(playerId);
        this.info.playerCount = this.players.size;
        this.emit('playerLeft', { playerId, reason });
        logger.info('Player left', { playerId, reason });
      })
    );

    // Room state
    this.unsubscribers.push(
      this.client.onMessage('roomStateChanged', (message) => {
        const { roomId, state } = message.payload as {
          roomId: string;
          state: RoomState;
        };
        if (roomId !== this.info.id) return;

        this.info.state = state;
        this.emit('stateChanged', { state });
      })
    );

    this.unsubscribers.push(
      this.client.onMessage('hostChanged', (message) => {
        const { roomId, newHostId } = message.payload as {
          roomId: string;
          newHostId: string;
        };
        if (roomId !== this.info.id) return;

        this.info.hostId = newHostId;
        const newHost = this.players.get(newHostId);
        if (newHost) newHost.role = 'host';
        this.emit('hostChanged', { newHostId });
      })
    );

    // State synchronization
    this.unsubscribers.push(
      this.client.onMessage('stateUpdate', (message) => {
        const state = message.payload as SyncState;
        this.remoteState.set(state.objectId, state);
        this.emit('stateUpdate', { states: [state] });
      })
    );

    this.unsubscribers.push(
      this.client.onMessage('snapshot', (message) => {
        const snapshot = message.payload as StateSnapshot;
        snapshot.states.forEach((state) => {
          // Don't overwrite local state
          if (!this.localState.has(state.objectId)) {
            this.remoteState.set(state.objectId, state);
          }
        });
        this.emit('snapshot', { snapshot });
      })
    );

    // Kicked
    this.unsubscribers.push(
      this.client.onMessage('kicked', (message) => {
        const { roomId, reason } = message.payload as {
          roomId: string;
          reason: string;
        };
        if (roomId !== this.info.id) return;

        this.emit('kicked', { reason });
        this.cleanup();
      })
    );
  }

  private cleanup(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.players.clear();
    this.localState.clear();
    this.remoteState.clear();
    this.eventListeners.clear();
  }

  // ============================================================================
  // Event System
  // ============================================================================

  on<T extends RoomEventType>(
    event: T,
    handler: RoomEventHandler<T>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler as RoomEventHandler<RoomEventType>);

    return () => this.off(event, handler);
  }

  off<T extends RoomEventType>(event: T, handler: RoomEventHandler<T>): void {
    this.eventListeners.get(event)?.delete(handler as RoomEventHandler<RoomEventType>);
  }

  private emit<T extends RoomEventType>(event: T, data: RoomEventMap[T]): void {
    this.eventListeners.get(event)?.forEach((handler) => handler(data));
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getId(): string {
    return this.info.id;
  }

  getName(): string {
    return this.info.name;
  }

  getInfo(): RoomInfo {
    return { ...this.info };
  }

  getPlayers(): PlayerInfo[] {
    return Array.from(this.players.values());
  }

  getPlayer(playerId: string): PlayerInfo | undefined {
    return this.players.get(playerId);
  }

  getLocalPlayer(): PlayerInfo | undefined {
    return this.players.get(this.localPlayerId);
  }

  getHostId(): string {
    return this.info.hostId;
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  isHost(): boolean {
    return this.info.hostId === this.localPlayerId;
  }

  isFull(): boolean {
    return this.players.size >= this.info.maxPlayers;
  }

  getRoomState(): RoomState {
    return this.info.state;
  }
}

// ============================================================================
// Room Manager (for client-side room operations)
// ============================================================================

export class RoomManager {
  private client: NetworkClient;
  private currentRoom: Room | null = null;

  constructor(client: NetworkClient) {
    this.client = client;
  }

  async createRoom(config: RoomConfig): Promise<Room> {
    return new Promise((resolve, reject) => {
      const unsub = this.client.onMessage('roomCreated', (message) => {
        unsub();
        const { room, player } = message.payload as {
          room: RoomInfo;
          player: PlayerInfo;
        };
        this.currentRoom = new Room(this.client, room, player);
        resolve(this.currentRoom);
      });

      const errorUnsub = this.client.onMessage('error', (message) => {
        errorUnsub();
        unsub();
        reject(new Error((message.payload as { message: string }).message));
      });

      this.client.send({
        type: 'createRoom',
        category: 'room',
        payload: config,
        timestamp: Date.now(),
      });
    });
  }

  async joinRoom(roomId: string, password?: string): Promise<Room> {
    return new Promise((resolve, reject) => {
      const unsub = this.client.onMessage('roomJoined', (message) => {
        unsub();
        const { room, player, players } = message.payload as {
          room: RoomInfo;
          player: PlayerInfo;
          players: PlayerInfo[];
        };
        this.currentRoom = new Room(this.client, room, player);
        // Add existing players
        players.forEach((p) => {
          if (p.id !== player.id) {
            (this.currentRoom as any).players.set(p.id, p);
          }
        });
        resolve(this.currentRoom);
      });

      const errorUnsub = this.client.onMessage('error', (message) => {
        errorUnsub();
        unsub();
        reject(new Error((message.payload as { message: string }).message));
      });

      this.client.send({
        type: 'joinRoom',
        category: 'room',
        payload: { roomId, password },
        timestamp: Date.now(),
      });
    });
  }

  async getRoomList(): Promise<RoomInfo[]> {
    return new Promise((resolve) => {
      const unsub = this.client.onMessage('roomList', (message) => {
        unsub();
        const { rooms } = message.payload as { rooms: RoomInfo[] };
        resolve(rooms);
      });

      this.client.send({
        type: 'getRoomList',
        category: 'room',
        payload: {},
        timestamp: Date.now(),
      });
    });
  }

  getCurrentRoom(): Room | null {
    return this.currentRoom;
  }

  leaveCurrentRoom(): void {
    if (this.currentRoom) {
      this.currentRoom.leave();
      this.currentRoom = null;
    }
  }
}
