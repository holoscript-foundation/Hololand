/**
 * TransportBridge.ts — Bridges NetworkClient ↔ NetworkTransport interface
 *
 * Enables the high-level NetworkManager to use an existing NetworkClient
 * connection by wrapping it as a NetworkTransport. Also provides an adapter
 * for NetworkServer to handle transport-layer entity messages.
 *
 * Use Cases:
 * 1. NetworkClientTransport: Wrap NetworkClient as NetworkTransport so
 *    NetworkManager can be constructed over an existing connection instead
 *    of creating a new WebSocketTransport.
 * 2. ServerTransportHandler: Register transport-layer message handlers on
 *    NetworkServer to translate entity_spawned/updated/despawned messages
 *    into server-side state.
 */

import type { NetworkClient } from './NetworkClient';
import type { NetworkServer } from './NetworkServer';
import type {
  NetworkTransport,
  NetworkMessage,
  NetworkEvents,
  NetworkEventCallback,
  EntityState,
  PeerId,
  RoomId,
  TransportType,
  PeerInfo,
} from './types';

// ============================================================================
// NetworkClientTransport — adapts NetworkClient → NetworkTransport
// ============================================================================

export interface ClientTransportConfig {
  /** Use the NetworkClient's existing connection state. */
  client: NetworkClient;
  /** Override peer ID (defaults to client's ID). */
  peerId?: PeerId;
}

export class NetworkClientTransport implements NetworkTransport {
  readonly type: TransportType = 'websocket';

  private client: NetworkClient;
  private _peerId: PeerId;
  private _roomId: RoomId = '';
  private listeners: Map<string, Set<Function>> = new Map();
  private cleanupFns: Array<() => void> = [];

  constructor(config: ClientTransportConfig) {
    this.client = config.client;
    this._peerId = config.peerId || '';
  }

  // --- NetworkTransport interface ---

  get connected(): boolean {
    return this.client.isConnected();
  }

  async connect(url: string, roomId: RoomId): Promise<PeerId> {
    this._roomId = roomId;

    // If the client isn't connected, connect it
    if (!this.client.isConnected()) {
      await this.client.connect(url);
    }

    // Get or generate peerId from connection info
    const info = this.client.getConnectionInfo();
    this._peerId = this._peerId || info.clientId || `peer_${Date.now()}`;

    // Wire NetworkClient events → NetworkTransport events
    this.wireEvents();

    // Join the room via the client protocol
    this.client.send({
      type: 'joinRoom',
      category: 'room',
      payload: { roomId },
      timestamp: Date.now(),
    });

    return this._peerId;
  }

  disconnect(reason?: string): void {
    // Clean up wired events
    for (const cleanup of this.cleanupFns) {
      cleanup();
    }
    this.cleanupFns = [];

    this.client.send({
      type: 'leaveRoom',
      category: 'room',
      payload: { roomId: this._roomId, reason: reason || 'disconnect' },
      timestamp: Date.now(),
    });
  }

  send(message: NetworkMessage): boolean {
    if (!this.connected) return false;

    // Route through client, tagging with current room
    this.client.sendToRoom(this._roomId, message);
    return true;
  }

  on<K extends keyof NetworkEvents>(
    event: K,
    handler: NetworkEventCallback<K>
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
    handler: NetworkEventCallback<K>
  ): void {
    this.listeners.get(event as string)?.delete(handler);
  }

  getLatency(): number {
    const info = this.client.getConnectionInfo();
    return info.latency;
  }

  getPeerId(): PeerId {
    return this._peerId;
  }

  // --- Internal ---

  private wireEvents(): void {
    // Map NetworkClient events → NetworkTransport events

    // Connected
    const connCleanup = this.client.on('connected', () => {
      this.emit('connected', {
        peerId: this._peerId,
        roomId: this._roomId,
      });
    });
    this.cleanupFns.push(connCleanup);

    // Disconnected
    const discCleanup = this.client.on('disconnected', () => {
      this.emit('disconnected', { reason: 'connection_lost' });
    });
    this.cleanupFns.push(discCleanup);

    // Reconnecting
    const recoCleanup = this.client.on('reconnecting', () => {
      this.emit('reconnecting', { attempt: 1 });
    });
    this.cleanupFns.push(recoCleanup);

    // Error
    const errCleanup = this.client.on('error', (err: any) => {
      this.emit('error', { message: err?.message || 'unknown error' });
    });
    this.cleanupFns.push(errCleanup);

    // Transport-layer entity messages from server/peers
    const entitySpawnCleanup = this.client.onMessage(
      'transport:entity_spawned',
      (msg) => {
        this.emit('entitySpawned', {
          entity: msg.payload as EntityState,
        });
      }
    );
    this.cleanupFns.push(entitySpawnCleanup);

    const entityUpdateCleanup = this.client.onMessage(
      'transport:entity_updated',
      (msg) => {
        this.emit('entityUpdated', {
          entity: msg.payload as EntityState,
        });
      }
    );
    this.cleanupFns.push(entityUpdateCleanup);

    const entityDespawnCleanup = this.client.onMessage(
      'transport:entity_despawned',
      (msg) => {
        const payload = msg.payload as { networkId: string };
        this.emit('entityDespawned', { networkId: payload.networkId });
      }
    );
    this.cleanupFns.push(entityDespawnCleanup);

    // Peer joined/left
    const peerJoinCleanup = this.client.onMessage(
      'transport:peer_joined',
      (msg) => {
        this.emit('peerJoined', { peer: msg.payload as PeerInfo });
      }
    );
    this.cleanupFns.push(peerJoinCleanup);

    const peerLeftCleanup = this.client.onMessage(
      'transport:peer_left',
      (msg) => {
        const payload = msg.payload as { peerId: string; reason: string };
        this.emit('peerLeft', {
          peerId: payload.peerId,
          reason: payload.reason,
        });
      }
    );
    this.cleanupFns.push(peerLeftCleanup);

    // Generic messages → forward as 'message' event
    const msgCleanup = this.client.onMessage('transport:message', (msg) => {
      const payload = msg.payload as {
        type: string;
        data: unknown;
        senderId: string;
      };
      this.emit('message', payload);
    });
    this.cleanupFns.push(msgCleanup);
  }

  private emit<K extends keyof NetworkEvents>(
    event: K,
    data: NetworkEvents[K]
  ): void {
    const handlers = this.listeners.get(event as string);
    if (handlers) {
      handlers.forEach((h) => (h as NetworkEventCallback<K>)(data));
    }
  }
}

// ============================================================================
// ServerTransportHandler — registers transport-layer handlers on NetworkServer
// ============================================================================

export interface ServerTransportHandlerConfig {
  server: NetworkServer;
}

/**
 * Registers message handlers on a NetworkServer instance to handle
 * the transport-layer entity protocol messages (entity_spawned,
 * entity_updated, entity_despawned) that NetworkManager sends.
 *
 * This bridges the gap between clients using NetworkManager (which sends
 * transport:entity_* messages) and a NetworkServer (which manages rooms
 * and state broadcasts).
 */
export class ServerTransportHandler {
  private server: NetworkServer;
  private entityOwners: Map<string, string> = new Map();

  constructor(config: ServerTransportHandlerConfig) {
    this.server = config.server;
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Handle entity spawn — track the entity and broadcast to room
    this.server.registerHandler(
      'transport:entity_spawned',
      (clientId: string, payload: any) => {
        const entity = payload as EntityState;
        entity.ownerId = clientId;

        this.entityOwners.set(entity.networkId, clientId);

        // Store as server state
        this.server.updateState(entity.networkId, {
          type: entity.type,
          ownerId: entity.ownerId,
          position: entity.position,
          rotation: entity.rotation,
          scale: entity.scale,
          syncMode: entity.syncMode,
        });

        // Broadcast to all other clients in the room
        const rooms = this.getClientRooms(clientId);
        for (const roomId of rooms) {
          this.server.broadcastToRoom(roomId, {
            type: 'transport:entity_spawned',
            category: 'state',
            payload: entity,
            timestamp: Date.now(),
          }, clientId);
        }
      }
    );

    // Handle entity update — update state and broadcast
    this.server.registerHandler(
      'transport:entity_updated',
      (clientId: string, payload: any) => {
        const entity = payload as EntityState;

        // Verify ownership
        if (
          this.entityOwners.has(entity.networkId) &&
          this.entityOwners.get(entity.networkId) !== clientId
        ) {
          return; // Not the owner, ignore
        }

        // Update server state
        this.server.updateState(entity.networkId, {
          position: entity.position,
          rotation: entity.rotation,
          scale: entity.scale,
          velocity: entity.velocity,
          metadata: entity.metadata,
        });

        // Broadcast to room
        const rooms = this.getClientRooms(clientId);
        for (const roomId of rooms) {
          this.server.broadcastToRoom(roomId, {
            type: 'transport:entity_updated',
            category: 'state',
            payload: entity,
            timestamp: Date.now(),
          }, clientId);
        }
      }
    );

    // Handle entity despawn — clean up and broadcast
    this.server.registerHandler(
      'transport:entity_despawned',
      (clientId: string, payload: any) => {
        const { networkId } = payload as { networkId: string };

        // Verify ownership
        if (
          this.entityOwners.has(networkId) &&
          this.entityOwners.get(networkId) !== clientId
        ) {
          return;
        }

        this.entityOwners.delete(networkId);
        this.server.removeState(networkId);

        // Broadcast
        const rooms = this.getClientRooms(clientId);
        for (const roomId of rooms) {
          this.server.broadcastToRoom(roomId, {
            type: 'transport:entity_despawned',
            category: 'state',
            payload: { networkId },
            timestamp: Date.now(),
          }, clientId);
        }
      }
    );

    // Handle RPC requests — route to target or broadcast
    this.server.registerHandler(
      'rpc:request',
      (clientId: string, payload: any) => {
        const rooms = this.getClientRooms(clientId);
        for (const roomId of rooms) {
          this.server.broadcastToRoom(roomId, {
            type: 'rpc:request',
            category: 'rpc',
            payload: { ...payload, senderId: clientId },
            timestamp: Date.now(),
          }, clientId);
        }
      }
    );

    // Handle RPC responses — route back to caller
    this.server.registerHandler(
      'rpc:response',
      (clientId: string, payload: any) => {
        // RPC responses are targeted, but for simplicity broadcast to room
        const rooms = this.getClientRooms(clientId);
        for (const roomId of rooms) {
          this.server.broadcastToRoom(roomId, {
            type: 'rpc:response',
            category: 'rpc',
            payload,
            timestamp: Date.now(),
          }, clientId);
        }
      }
    );
  }

  /**
   * Clean up all entities owned by a disconnected client.
   */
  handleClientDisconnect(clientId: string): void {
    const ownedEntities: string[] = [];
    for (const [networkId, ownerId] of this.entityOwners) {
      if (ownerId === clientId) {
        ownedEntities.push(networkId);
      }
    }

    for (const networkId of ownedEntities) {
      this.entityOwners.delete(networkId);
      this.server.removeState(networkId);
    }
  }

  getEntityOwner(networkId: string): string | undefined {
    return this.entityOwners.get(networkId);
  }

  getEntityCount(): number {
    return this.entityOwners.size;
  }

  private getClientRooms(clientId: string): string[] {
    // NetworkServer tracks client-room mapping
    // We use the server's broadcastToRoom which already knows rooms
    // Return all rooms the client is in
    return this.server.getClientRooms?.(clientId) ?? [];
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createClientTransport(
  client: NetworkClient,
  peerId?: PeerId
): NetworkClientTransport {
  return new NetworkClientTransport({ client, peerId });
}

export function createServerTransportHandler(
  server: NetworkServer
): ServerTransportHandler {
  return new ServerTransportHandler({ server });
}
