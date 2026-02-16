/**
 * NetworkedRuntime
 *
 * Platform-level runtime that connects HoloScript's `@networked` trait to
 * Hololand's real-time networking infrastructure.
 *
 * Architecture:
 * ```
 * HoloScript @networked trait
 *       ↕ (events: networked:register, networked:state_update, ...)
 * NetworkedRuntime (this file)
 *       ↕
 * ┌─────────────────────────────────────────────┐
 * │ CoPresenceBridge  (authority, broadcast)     │
 * │ StateSync         (interpolation, jitter)    │
 * │ InterestManager   (spatial filtering)        │
 * │ NetworkClient     (WebSocket transport)      │
 * └─────────────────────────────────────────────┘
 * ```
 *
 * Usage:
 * ```ts
 * import { createHololandNetwork } from './HololandNetwork';
 * import { NetworkedRuntime } from './NetworkedRuntime';
 *
 * const network = createHololandNetwork(config);
 * const runtime = new NetworkedRuntime(network);
 *
 * // Register a HoloScript node with @networked trait
 * runtime.registerEntity('player_1', 'net_player_abc', {
 *   mode: 'owner',
 *   syncProperties: ['position', 'rotation'],
 *   syncRate: 20,
 * });
 *
 * // In game loop
 * runtime.update(deltaTime);
 * ```
 *
 * @version 1.0.0
 */

import type { NetworkSystem } from './HololandNetwork';
import type { SyncState, Vector3 } from './types';

// =============================================================================
// TYPES
// =============================================================================

export type AuthorityMode = 'owner' | 'shared' | 'server';

export interface NetworkedEntityConfig {
  /** Authority mode */
  mode: AuthorityMode;
  /** Which properties to synchronize */
  syncProperties: string[];
  /** Updates per second */
  syncRate: number;
  /** Network channel reliability */
  channel?: 'reliable' | 'unreliable' | 'ordered';
  /** Enable interpolation */
  interpolation?: boolean;
  /** Can ownership be transferred */
  transferable?: boolean;
  /** Room/channel for scoping */
  room?: string;
}

export interface NetworkedEntity {
  /** Node ID in the HoloScript scene */
  nodeId: string;
  /** Unique network entity ID */
  networkId: string;
  /** Configuration */
  config: NetworkedEntityConfig;
  /** Current authority owner (peer ID) */
  authorityOwner: string | null;
  /** Whether local client has authority */
  isLocalAuthority: boolean;
  /** Last sync timestamp */
  lastSyncTime: number;
  /** Sync accumulator for rate limiting */
  syncAccumulator: number;
  /** Sequence number */
  sequence: number;
  /** Last known position */
  lastPosition: Vector3 | null;
  /** Last known rotation */
  lastRotation: Vector3 | null;
  /** Custom synced state */
  customState: Record<string, unknown>;
  /** Registration timestamp */
  registeredAt: number;
}

export interface RuntimeStats {
  /** Number of registered entities */
  entityCount: number;
  /** Number of locally owned entities */
  localEntities: number;
  /** Number of remote entities */
  remoteEntities: number;
  /** Total state updates sent this session */
  updatesSent: number;
  /** Total state updates received this session */
  updatesReceived: number;
  /** Average latency (from LatencyTracker) */
  averageLatency: number;
}

export type NetworkedRuntimeEvent =
  | { type: 'entity_registered'; nodeId: string; networkId: string }
  | { type: 'entity_unregistered'; nodeId: string; networkId: string }
  | { type: 'authority_changed'; nodeId: string; isLocal: boolean; owner: string | null }
  | { type: 'state_received'; nodeId: string; state: Record<string, unknown> }
  | { type: 'entity_spawned'; nodeId: string; networkId: string; peerId: string }
  | { type: 'entity_destroyed'; nodeId: string; networkId: string };

type EventCallback = (event: NetworkedRuntimeEvent) => void;

// =============================================================================
// RUNTIME
// =============================================================================

export class NetworkedRuntime {
  private network: NetworkSystem;
  private entities: Map<string, NetworkedEntity> = new Map(); // networkId → entity
  private nodeToNetwork: Map<string, string> = new Map();     // nodeId → networkId
  private listeners: Map<string, EventCallback[]> = new Map();
  private localPeerId: string = '';
  private stats = {
    updatesSent: 0,
    updatesReceived: 0,
  };
  private isRunning: boolean = false;

  constructor(network: NetworkSystem) {
    this.network = network;
    this.setupNetworkListeners();
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Start the runtime. Call after network.connect().
   */
  start(localPeerId: string): void {
    this.localPeerId = localPeerId;
    this.isRunning = true;
  }

  /**
   * Stop the runtime and unregister all entities.
   */
  stop(): void {
    this.isRunning = false;
    const networkIds = [...this.entities.keys()];
    for (const networkId of networkIds) {
      const entity = this.entities.get(networkId);
      if (entity) {
        this.unregisterEntity(entity.nodeId);
      }
    }
  }

  /**
   * Per-frame update. Call from the game loop.
   * @param delta Time since last frame in seconds
   */
  update(delta: number): void {
    if (!this.isRunning) return;

    for (const entity of this.entities.values()) {
      if (entity.isLocalAuthority) {
        this.tickLocalEntity(entity, delta);
      }
    }

    // Update underlying network system
    this.network.update(delta);
  }

  // ===========================================================================
  // Entity Registration
  // ===========================================================================

  /**
   * Register a HoloScript node for network synchronization.
   * Called when `@networked` trait is attached to a node.
   */
  registerEntity(
    nodeId: string,
    networkId: string,
    config: NetworkedEntityConfig,
  ): NetworkedEntity {
    if (this.nodeToNetwork.has(nodeId)) {
      // Already registered — update config
      const existingNetId = this.nodeToNetwork.get(nodeId)!;
      const existing = this.entities.get(existingNetId)!;
      existing.config = config;
      return existing;
    }

    const entity: NetworkedEntity = {
      nodeId,
      networkId,
      config,
      authorityOwner: config.mode === 'owner' ? this.localPeerId : null,
      isLocalAuthority: config.mode === 'owner',
      lastSyncTime: 0,
      syncAccumulator: 0,
      sequence: 0,
      lastPosition: null,
      lastRotation: null,
      customState: {},
      registeredAt: Date.now(),
    };

    this.entities.set(networkId, entity);
    this.nodeToNetwork.set(nodeId, networkId);

    // Register with CoPresenceBridge for authority tracking
    if (entity.isLocalAuthority) {
      this.network.bridge.requestAuthority(networkId);
    }

    // Broadcast spawn to other peers
    this.network.client.send({
      type: 'entity_spawn',
      category: 'world',
      payload: {
        networkId,
        nodeId,
        config: {
          mode: config.mode,
          syncProperties: config.syncProperties,
          syncRate: config.syncRate,
        },
        peerId: this.localPeerId,
      },
      timestamp: Date.now(),
    });

    this.emit({ type: 'entity_registered', nodeId, networkId });
    return entity;
  }

  /**
   * Unregister a node from network synchronization.
   * Called when `@networked` trait is detached.
   */
  unregisterEntity(nodeId: string): void {
    const networkId = this.nodeToNetwork.get(nodeId);
    if (!networkId) return;

    const entity = this.entities.get(networkId);
    if (!entity) return;

    // Broadcast destroy to peers
    this.network.client.send({
      type: 'entity_destroy',
      category: 'world',
      payload: { networkId, nodeId },
      timestamp: Date.now(),
    });

    this.entities.delete(networkId);
    this.nodeToNetwork.delete(nodeId);

    this.emit({ type: 'entity_unregistered', nodeId, networkId });
  }

  // ===========================================================================
  // State Updates (Local → Network)
  // ===========================================================================

  /**
   * Push a local state update for a node. Rate-limited by entity config.
   */
  pushStateUpdate(
    nodeId: string,
    position?: Vector3,
    rotation?: Vector3,
    customState?: Record<string, unknown>,
  ): void {
    const networkId = this.nodeToNetwork.get(nodeId);
    if (!networkId) return;

    const entity = this.entities.get(networkId);
    if (!entity || !entity.isLocalAuthority) return;

    if (position) entity.lastPosition = position;
    if (rotation) entity.lastRotation = rotation;
    if (customState) {
      Object.assign(entity.customState, customState);
    }
  }

  /**
   * Force an immediate state sync (bypasses rate limiting).
   * Use for important events like grab release.
   */
  forceSyncEntity(nodeId: string): void {
    const networkId = this.nodeToNetwork.get(nodeId);
    if (!networkId) return;

    const entity = this.entities.get(networkId);
    if (!entity || !entity.isLocalAuthority) return;

    this.sendStateUpdate(entity, true);
  }

  // ===========================================================================
  // Authority Management
  // ===========================================================================

  /**
   * Request authority over an entity (for 'shared' mode objects).
   */
  requestAuthority(nodeId: string): boolean {
    const networkId = this.nodeToNetwork.get(nodeId);
    if (!networkId) return false;

    const entity = this.entities.get(networkId);
    if (!entity) return false;
    if (entity.isLocalAuthority) return true; // Already have it

    // Try to claim via CoPresenceBridge
    const granted = this.network.bridge.requestAuthority(networkId);
    if (granted) {
      entity.isLocalAuthority = true;
      entity.authorityOwner = this.localPeerId;

      // Notify peers
      this.network.client.send({
        type: 'authority_claim',
        category: 'world',
        payload: {
          networkId,
          nodeId,
          peerId: this.localPeerId,
        },
        timestamp: Date.now(),
      });

      this.emit({
        type: 'authority_changed',
        nodeId,
        isLocal: true,
        owner: this.localPeerId,
      });
    }

    return granted;
  }

  /**
   * Release authority over an entity.
   */
  releaseAuthority(nodeId: string): void {
    const networkId = this.nodeToNetwork.get(nodeId);
    if (!networkId) return;

    const entity = this.entities.get(networkId);
    if (!entity || !entity.isLocalAuthority) return;

    entity.isLocalAuthority = false;
    entity.authorityOwner = null;

    this.network.client.send({
      type: 'authority_release',
      category: 'world',
      payload: { networkId, nodeId },
      timestamp: Date.now(),
    });

    this.emit({
      type: 'authority_changed',
      nodeId,
      isLocal: false,
      owner: null,
    });
  }

  // ===========================================================================
  // Queries
  // ===========================================================================

  /** Get a registered entity by node ID */
  getEntity(nodeId: string): NetworkedEntity | undefined {
    const networkId = this.nodeToNetwork.get(nodeId);
    return networkId ? this.entities.get(networkId) : undefined;
  }

  /** Get a registered entity by network ID */
  getEntityByNetworkId(networkId: string): NetworkedEntity | undefined {
    return this.entities.get(networkId);
  }

  /** Get all registered entities */
  getAllEntities(): NetworkedEntity[] {
    return Array.from(this.entities.values());
  }

  /** Get runtime statistics */
  getStats(): RuntimeStats {
    let localCount = 0;
    let remoteCount = 0;
    for (const entity of this.entities.values()) {
      if (entity.isLocalAuthority) localCount++;
      else remoteCount++;
    }

    return {
      entityCount: this.entities.size,
      localEntities: localCount,
      remoteEntities: remoteCount,
      updatesSent: this.stats.updatesSent,
      updatesReceived: this.stats.updatesReceived,
      averageLatency: this.network.latencyTracker.getAverageLatency?.() || 0,
    };
  }

  /** Check if the runtime is active */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  // ===========================================================================
  // Internal: Tick & Sync
  // ===========================================================================

  private tickLocalEntity(entity: NetworkedEntity, delta: number): void {
    const syncInterval = 1000 / entity.config.syncRate;
    entity.syncAccumulator += delta * 1000;

    if (entity.syncAccumulator >= syncInterval) {
      entity.syncAccumulator -= syncInterval;
      this.sendStateUpdate(entity, false);
    }
  }

  private sendStateUpdate(entity: NetworkedEntity, highPriority: boolean): void {
    entity.sequence++;

    const syncState: SyncState = {
      objectId: entity.networkId,
      timestamp: Date.now(),
      sequence: entity.sequence,
    };

    if (entity.config.syncProperties.includes('position') && entity.lastPosition) {
      syncState.position = entity.lastPosition;
    }
    if (entity.config.syncProperties.includes('rotation') && entity.lastRotation) {
      syncState.rotation = entity.lastRotation;
    }

    // Add custom state
    if (Object.keys(entity.customState).length > 0) {
      syncState.metadata = { ...entity.customState };
    }

    // Broadcast through CoPresenceBridge
    this.network.bridge.broadcastState(entity.networkId, {
      ...syncState,
      __type: 'networked_state',
      __priority: highPriority ? 10 : entity.config.syncRate > 30 ? 2 : 1,
    } as Record<string, unknown>);

    this.stats.updatesSent++;
  }

  // ===========================================================================
  // Internal: Network Listeners
  // ===========================================================================

  private setupNetworkListeners(): void {
    // Listen for remote state updates via CoPresenceBridge
    this.network.bridge.on?.('stateUpdate', (data: unknown) => {
      const update = data as {
        nodeId: string;
        state: Record<string, unknown>;
        version: number;
      };
      this.handleRemoteStateUpdate(update);
    });

    // Listen for incoming network messages
    this.network.client.on('message', (msg: any) => {
      this.handleNetworkMessage(msg);
    });
  }

  private handleRemoteStateUpdate(update: {
    nodeId: string;
    state: Record<string, unknown>;
    version: number;
  }): void {
    const networkId = update.nodeId; // CoPresenceBridge uses nodeId as entity key
    const entity = this.entities.get(networkId);

    if (!entity || entity.isLocalAuthority) return; // Ignore our own updates

    // Apply position/rotation for interpolation
    const state = update.state;
    if (state.position) {
      entity.lastPosition = state.position as Vector3;
    }
    if (state.rotation) {
      entity.lastRotation = state.rotation as Vector3;
    }
    if (state.metadata) {
      Object.assign(entity.customState, state.metadata as Record<string, unknown>);
    }

    this.stats.updatesReceived++;

    this.emit({
      type: 'state_received',
      nodeId: entity.nodeId,
      state: state,
    });
  }

  private handleNetworkMessage(msg: Record<string, unknown>): void {
    const type = msg.type as string;
    const payload = msg.payload as Record<string, unknown>;

    if (!payload) return;

    switch (type) {
      case 'entity_spawn': {
        const { networkId, nodeId, config, peerId } = payload as {
          networkId: string;
          nodeId: string;
          config: NetworkedEntityConfig;
          peerId: string;
        };

        // Don't re-register our own entities
        if (peerId === this.localPeerId) return;

        // Register remote entity
        if (!this.entities.has(networkId)) {
          const entity: NetworkedEntity = {
            nodeId,
            networkId,
            config,
            authorityOwner: peerId,
            isLocalAuthority: false,
            lastSyncTime: 0,
            syncAccumulator: 0,
            sequence: 0,
            lastPosition: null,
            lastRotation: null,
            customState: {},
            registeredAt: Date.now(),
          };

          this.entities.set(networkId, entity);
          this.nodeToNetwork.set(nodeId, networkId);

          this.emit({
            type: 'entity_spawned',
            nodeId,
            networkId,
            peerId,
          });
        }
        break;
      }

      case 'entity_destroy': {
        const { networkId, nodeId } = payload as { networkId: string; nodeId: string };
        const entity = this.entities.get(networkId);
        if (entity && !entity.isLocalAuthority) {
          this.entities.delete(networkId);
          this.nodeToNetwork.delete(nodeId);
          this.emit({ type: 'entity_destroyed', nodeId, networkId });
        }
        break;
      }

      case 'authority_claim': {
        const { networkId, nodeId, peerId } = payload as {
          networkId: string;
          nodeId: string;
          peerId: string;
        };
        const entity = this.entities.get(networkId);
        if (entity) {
          entity.isLocalAuthority = peerId === this.localPeerId;
          entity.authorityOwner = peerId;
          this.emit({
            type: 'authority_changed',
            nodeId,
            isLocal: entity.isLocalAuthority,
            owner: peerId,
          });
        }
        break;
      }

      case 'authority_release': {
        const { networkId, nodeId } = payload as { networkId: string; nodeId: string };
        const entity = this.entities.get(networkId);
        if (entity) {
          entity.authorityOwner = null;
          entity.isLocalAuthority = false;
          this.emit({
            type: 'authority_changed',
            nodeId,
            isLocal: false,
            owner: null,
          });
        }
        break;
      }
    }
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  on(type: string, callback: EventCallback): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
  }

  off(type: string, callback: EventCallback): void {
    const arr = this.listeners.get(type);
    if (arr) {
      const idx = arr.indexOf(callback);
      if (idx !== -1) arr.splice(idx, 1);
    }
  }

  private emit(event: NetworkedRuntimeEvent): void {
    const arr = this.listeners.get(event.type);
    if (arr) {
      for (const cb of arr) cb(event);
    }
    // Also emit to wildcard listeners
    const all = this.listeners.get('*');
    if (all) {
      for (const cb of all) cb(event);
    }
  }
}

export default NetworkedRuntime;
