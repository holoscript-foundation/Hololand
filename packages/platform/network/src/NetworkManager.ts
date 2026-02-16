/**
 * NetworkManager
 *
 * High-level networking manager that coordinates transports, entity
 * synchronization, and room management. This is the primary API for
 * game code to interact with the network.
 *
 * Features:
 * - Transport-agnostic: works with WebSocket, WebRTC, or hybrid
 * - Entity registration and synchronization
 * - Room join/leave lifecycle
 * - RPC (remote procedure calls) over reliable channel
 * - Automatic state broadcast at configurable tick rate
 * - Event system for game-level network events
 */

import { logger } from './logger';
import { WebSocketTransport } from './WebSocketTransport';
import type { WebRTCTransport } from './WebRTCTransport';
import type {
  NetworkTransport,
  NetworkConfig,
  NetworkEvents,
  NetworkEventCallback,
  EntityState,
  PeerId,
  RoomId,
  NetworkId,
  TransportType,
  SyncMode,
  PeerInfo,
  NetworkMessage,
  RPCDefinition,
  NetworkedTraitConfig,
  Vector3,
} from './types';

// ============================================================================
// Types
// ============================================================================

interface RegisteredEntity {
  networkId: NetworkId;
  ownerId: PeerId;
  type: string;
  syncMode: SyncMode;
  properties: string[];
  lastState: EntityState;
  interpolation: boolean;
  priority: 'local' | 'high' | 'medium' | 'low';
  dirty: boolean;
}

interface PendingRPC {
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

// ============================================================================
// NetworkManager
// ============================================================================

export class NetworkManager {
  private config: Required<NetworkConfig>;
  private transport: NetworkTransport | null = null;
  private _peerId: PeerId = '';
  private _roomId: RoomId = '';
  private _connected: boolean = false;

  // Entities
  private entities: Map<NetworkId, RegisteredEntity> = new Map();
  private remoteEntities: Map<NetworkId, EntityState> = new Map();
  private entityCounter: number = 0;

  // Peers
  private peers: Map<PeerId, PeerInfo> = new Map();

  // RPC
  private rpcHandlers: Map<string, (params: any[]) => any> = new Map();
  private pendingRPCs: Map<string, PendingRPC> = new Map();

  // Sync loop
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private tickCount: number = 0;

  // Event listeners
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(config: NetworkConfig) {
    this.config = {
      serverUrl: config.serverUrl,
      transport: config.transport || 'websocket',
      syncRate: config.syncRate ?? 20,
      interpolation: config.interpolation ?? true,
      prediction: config.prediction ?? true,
      maxPeers: config.maxPeers ?? 50,
      iceServers: config.iceServers ?? [{ urls: 'stun:stun.l.google.com:19302' }],
      heartbeatInterval: config.heartbeatInterval ?? 30_000,
      reconnect: config.reconnect ?? true,
      reconnectAttempts: config.reconnectAttempts ?? 5,
    };
  }

  // ============================================================================
  // Connection Lifecycle
  // ============================================================================

  /**
   * Connect to a room using the configured transport.
   */
  async connect(options?: { roomId?: RoomId; displayName?: string }): Promise<RoomId> {
    const roomId = options?.roomId || this.generateRoomId();
    this._roomId = roomId;

    // Create transport based on config
    if (this.config.transport === 'websocket' || this.config.transport === 'hybrid') {
      this.transport = new WebSocketTransport({
        heartbeatInterval: this.config.heartbeatInterval,
        reconnect: this.config.reconnect,
        reconnectAttempts: this.config.reconnectAttempts,
      });
    }
    // For webrtc-only, a WebRTCTransport would be constructed here.
    // In hybrid mode, WebRTC is layered on top after the WS handshake.

    if (!this.transport) {
      throw new Error(`NetworkManager: unsupported transport "${this.config.transport}"`);
    }

    // Wire transport events
    this.wireTransportEvents(this.transport);

    // Connect
    this._peerId = await this.transport.connect(this.config.serverUrl, roomId);
    this._connected = true;

    // Start sync loop
    this.startSyncLoop();

    logger.info('NetworkManager: connected', {
      peerId: this._peerId,
      roomId,
      transport: this.config.transport,
    });

    return roomId;
  }

  /**
   * Disconnect gracefully.
   */
  disconnect(reason: string = 'user_disconnect'): void {
    this.stopSyncLoop();

    // Notify remotees about despawning our entities
    for (const entity of this.entities.values()) {
      if (entity.ownerId === this._peerId) {
        this.transport?.send({
          type: 'transport:entity_despawned',
          category: 'state',
          payload: { networkId: entity.networkId },
          timestamp: Date.now(),
        });
      }
    }

    this.transport?.disconnect(reason);
    this.transport = null;
    this._connected = false;

    this.entities.clear();
    this.remoteEntities.clear();
    this.peers.clear();
    this.pendingRPCs.forEach((rpc) => {
      clearTimeout(rpc.timeout);
      rpc.reject(new Error('Disconnected'));
    });
    this.pendingRPCs.clear();

    this.emit('disconnected', { reason });
    logger.info('NetworkManager: disconnected', { reason });
  }

  // ============================================================================
  // Entity Management
  // ============================================================================

  /**
   * Register a local entity for network synchronization.
   * Returns a unique NetworkId.
   */
  registerEntity(
    type: string,
    config: Partial<NetworkedTraitConfig> = {},
  ): NetworkId {
    const networkId: NetworkId = `${this._peerId}_e${this.entityCounter++}`;

    const entity: RegisteredEntity = {
      networkId,
      ownerId: this._peerId,
      type,
      syncMode: config.syncMode || 'owner',
      properties: config.properties || ['position', 'rotation'],
      lastState: {
        networkId,
        ownerId: this._peerId,
        type,
        timestamp: Date.now(),
        syncMode: config.syncMode || 'owner',
      },
      interpolation: config.interpolation ?? this.config.interpolation,
      priority: config.priority || 'medium',
      dirty: true,
    };

    this.entities.set(networkId, entity);

    // Notify peers
    if (this._connected && this.transport) {
      this.transport.send({
        type: 'transport:entity_spawned',
        category: 'state',
        payload: entity.lastState,
        timestamp: Date.now(),
      });
    }

    this.emit('entitySpawned', { entity: entity.lastState });
    logger.debug('NetworkManager: entity registered', { networkId, type });
    return networkId;
  }

  /**
   * Update a local entity's state. Changes will be broadcast on the next sync tick.
   */
  updateEntity(
    networkId: NetworkId,
    state: Partial<Pick<EntityState, 'position' | 'rotation' | 'scale' | 'velocity' | 'metadata'>>,
  ): void {
    const entity = this.entities.get(networkId);
    if (!entity) {
      logger.warn('NetworkManager: unknown entity', { networkId });
      return;
    }

    Object.assign(entity.lastState, state, { timestamp: Date.now() });
    entity.dirty = true;
  }

  /**
   * Unregister (despawn) a local entity.
   */
  unregisterEntity(networkId: NetworkId): void {
    const entity = this.entities.get(networkId);
    if (!entity) return;

    this.entities.delete(networkId);

    if (this._connected && this.transport) {
      this.transport.send({
        type: 'transport:entity_despawned',
        category: 'state',
        payload: { networkId },
        timestamp: Date.now(),
      });
    }

    this.emit('entityDespawned', { networkId });
    logger.debug('NetworkManager: entity unregistered', { networkId });
  }

  /**
   * Get the latest state of a remote entity.
   */
  getEntityState(networkId: NetworkId): EntityState | null {
    return this.remoteEntities.get(networkId) ?? this.entities.get(networkId)?.lastState ?? null;
  }

  /**
   * Get all remote entity states.
   */
  getRemoteEntities(): EntityState[] {
    return Array.from(this.remoteEntities.values());
  }

  /**
   * Get all local entity IDs.
   */
  getLocalEntities(): NetworkId[] {
    return Array.from(this.entities.keys());
  }

  // ============================================================================
  // RPC
  // ============================================================================

  /**
   * Register a handler for incoming RPC calls.
   */
  registerRPC(method: string, handler: (params: any[]) => any): void {
    this.rpcHandlers.set(method, handler);
  }

  /**
   * Call a remote procedure on all peers. Returns the first response.
   */
  async callRPC<T = any>(method: string, params: any[] = [], timeoutMs: number = 10_000): Promise<T> {
    const requestId = `rpc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRPCs.delete(requestId);
        reject(new Error(`RPC timeout: ${method}`));
      }, timeoutMs);

      this.pendingRPCs.set(requestId, { resolve, reject, timeout });

      this.transport?.send({
        type: 'rpc:request',
        category: 'rpc',
        payload: { id: requestId, method, params },
        timestamp: Date.now(),
      });
    });
  }

  // ============================================================================
  // Events
  // ============================================================================

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

  // ============================================================================
  // Getters
  // ============================================================================

  get connected(): boolean {
    return this._connected;
  }

  get peerId(): PeerId {
    return this._peerId;
  }

  get roomId(): RoomId {
    return this._roomId;
  }

  get transportType(): TransportType {
    return this.config.transport;
  }

  getLatency(): number {
    return this.transport?.getLatency() ?? 0;
  }

  getPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  getPeerCount(): number {
    return this.peers.size;
  }

  getStats(): {
    connected: boolean;
    peerId: PeerId;
    roomId: RoomId;
    transport: TransportType;
    latency: number;
    localEntities: number;
    remoteEntities: number;
    peers: number;
    tickCount: number;
  } {
    return {
      connected: this._connected,
      peerId: this._peerId,
      roomId: this._roomId,
      transport: this.config.transport,
      latency: this.getLatency(),
      localEntities: this.entities.size,
      remoteEntities: this.remoteEntities.size,
      peers: this.peers.size,
      tickCount: this.tickCount,
    };
  }

  // ============================================================================
  // Sync Loop
  // ============================================================================

  private startSyncLoop(): void {
    const interval = Math.floor(1000 / this.config.syncRate);
    this.syncTimer = setInterval(() => this.syncTick(), interval);
  }

  private stopSyncLoop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private syncTick(): void {
    this.tickCount++;

    if (!this._connected || !this.transport) return;

    // Broadcast dirty local entities
    for (const entity of this.entities.values()) {
      if (!entity.dirty) continue;

      this.transport.send({
        type: 'transport:entity_updated',
        category: 'state',
        payload: entity.lastState,
        timestamp: Date.now(),
      });

      entity.dirty = false;
    }
  }

  // ============================================================================
  // Transport Event Wiring
  // ============================================================================

  private wireTransportEvents(transport: NetworkTransport): void {
    transport.on('peerJoined', (event) => {
      this.peers.set(event.peer.peerId, event.peer);
      this.emit('peerJoined', event);
    });

    transport.on('peerLeft', (event) => {
      this.peers.delete(event.peerId);
      // Remove remote entities owned by this peer
      for (const [nid, entity] of this.remoteEntities) {
        if (entity.ownerId === event.peerId) {
          this.remoteEntities.delete(nid);
          this.emit('entityDespawned', { networkId: nid });
        }
      }
      this.emit('peerLeft', event);
    });

    transport.on('entitySpawned', (event) => {
      if (event.entity.ownerId !== this._peerId) {
        this.remoteEntities.set(event.entity.networkId, event.entity);
      }
      this.emit('entitySpawned', event);
    });

    transport.on('entityUpdated', (event) => {
      if (event.entity.ownerId !== this._peerId) {
        this.remoteEntities.set(event.entity.networkId, event.entity);
      }
      this.emit('entityUpdated', event);
    });

    transport.on('entityDespawned', (event) => {
      this.remoteEntities.delete(event.networkId);
      this.emit('entityDespawned', event);
    });

    transport.on('disconnected', (event) => {
      this._connected = false;
      this.stopSyncLoop();
      this.emit('disconnected', event);
    });

    transport.on('reconnecting', (event) => {
      this.emit('reconnecting', event);
    });

    transport.on('error', (event) => {
      this.emit('error', event);
    });

    transport.on('message', (event) => {
      this.handleIncomingMessage(event);
    });
  }

  private handleIncomingMessage(event: { type: string; data: unknown; senderId: PeerId }): void {
    // Handle RPC requests
    if (event.type === 'rpc:request') {
      const payload = event.data as { id: string; method: string; params?: any[] };
      const handler = this.rpcHandlers.get(payload.method);
      if (handler) {
        try {
          const result = handler(payload.params || []);
          this.transport?.send({
            type: 'rpc:response',
            category: 'rpc',
            payload: { id: payload.id, result },
            timestamp: Date.now(),
          });
        } catch (err) {
          this.transport?.send({
            type: 'rpc:response',
            category: 'rpc',
            payload: { id: payload.id, error: { message: String(err) } },
            timestamp: Date.now(),
          });
        }
      }
      return;
    }

    // Handle RPC responses
    if (event.type === 'rpc:response') {
      const payload = event.data as { id: string; result?: any; error?: { message: string } };
      const pending = this.pendingRPCs.get(payload.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRPCs.delete(payload.id);
        if (payload.error) {
          pending.reject(new Error(payload.error.message));
        } else {
          pending.resolve(payload.result);
        }
      }
      return;
    }

    // Forward to application-level listeners
    this.emit('message', event);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private emit<K extends keyof NetworkEvents>(event: K, data: NetworkEvents[K]): void {
    const handlers = this.listeners.get(event as string);
    if (handlers) {
      handlers.forEach((h) => (h as NetworkEventCallback<K>)(data));
    }
  }

  private generateRoomId(): RoomId {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createNetworkManager(config: NetworkConfig): NetworkManager {
  return new NetworkManager(config);
}
