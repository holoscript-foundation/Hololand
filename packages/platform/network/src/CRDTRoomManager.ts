/**
 * CRDTRoomManager — Manages lifecycle, discovery, and scaling of CRDT rooms
 *
 * Provides:
 * - Room creation/join/leave lifecycle management
 * - Room directory (listing, searching, filtering)
 * - Room capacity monitoring and auto-scaling via sharding
 * - Multi-room support (a client can observe multiple rooms)
 * - Room persistence and recovery via state serialization
 * - Health monitoring and metrics aggregation
 *
 * Scaling Strategy:
 *   When a room exceeds its entity threshold, the manager can split it into
 *   "shard rooms" based on spatial partitions. Each shard room is a full
 *   CRDTRoom operating on a spatial sub-region. A "portal" system allows
 *   entities to migrate between shards transparently.
 *
 * @module CRDTRoomManager
 */

import { logger } from './logger';
import type { NetworkClient } from './NetworkClient';
import type { RoomInfo, RoomState, Vector3, MessageCategory } from './types';

import {
  CRDTRoom,
  type CRDTRoomConfig,
  type EntityCRDTState,
  type PlayerPresenceData,
  type SerializedCRDTRoomState,
  type InterestRegion,
} from './CRDTRoom';

// =============================================================================
// Types
// =============================================================================

/** Room directory entry (visible to clients searching for rooms) */
export interface CRDTRoomDirectoryEntry {
  roomId: string;
  roomName: string;
  playerCount: number;
  maxPlayers: number;
  entityCount: number;
  state: RoomState;
  isPrivate: boolean;
  region?: string; // geographic region for latency routing
  tags: string[];
  createdAt: number;
  metadata: Record<string, unknown>;
}

/** Configuration for the room manager */
export interface CRDTRoomManagerConfig {
  /** Network client for communication */
  client: NetworkClient;
  /** Unique node ID for this client */
  localNodeId: string;
  /** Maximum rooms a single client can be active in simultaneously */
  maxActiveRooms?: number;
  /** Enable automatic room sharding when entity threshold exceeded */
  autoShard?: boolean;
  /** Entity count at which to trigger sharding */
  shardThreshold?: number;
  /** Minimum entities per shard to prevent over-splitting */
  minEntitiesPerShard?: number;
  /** Geographic region for room affinity */
  region?: string;
  /** Room state persistence adapter (optional) */
  persistenceAdapter?: RoomPersistenceAdapter;
  /** Health check interval in ms */
  healthCheckIntervalMs?: number;
}

/** Interface for persisting/loading room state */
export interface RoomPersistenceAdapter {
  save(roomId: string, state: SerializedCRDTRoomState): Promise<void>;
  load(roomId: string): Promise<SerializedCRDTRoomState | null>;
  delete(roomId: string): Promise<void>;
  listRooms(): Promise<string[]>;
}

/** Room shard information */
export interface RoomShard {
  shardId: string;
  parentRoomId: string;
  boundingBox: {
    min: Vector3;
    max: Vector3;
  };
  room: CRDTRoom;
}

/** Events emitted by the room manager */
export interface CRDTRoomManagerEventMap {
  'room:created': { room: CRDTRoom; config: CRDTRoomConfig };
  'room:joined': { room: CRDTRoom; roomId: string };
  'room:left': { roomId: string; reason: string };
  'room:destroyed': { roomId: string };
  'room:sharded': { parentRoomId: string; shards: RoomShard[] };
  'room:merged': { parentRoomId: string; mergedShardIds: string[] };
  'directory:updated': { rooms: CRDTRoomDirectoryEntry[] };
  'health:warning': { roomId: string; metric: string; value: number; threshold: number };
  'error': { message: string; code: string; roomId?: string };
}

export type CRDTRoomManagerEventType = keyof CRDTRoomManagerEventMap;
export type CRDTRoomManagerEventHandler<T extends CRDTRoomManagerEventType> = (
  event: CRDTRoomManagerEventMap[T]
) => void;

// =============================================================================
// CRDTRoomManager
// =============================================================================

export class CRDTRoomManager {
  private client: NetworkClient;
  private localNodeId: string;
  private config: Required<Omit<CRDTRoomManagerConfig, 'client' | 'localNodeId' | 'persistenceAdapter'>> & {
    persistenceAdapter?: RoomPersistenceAdapter;
  };

  // Active rooms this client is participating in
  private activeRooms: Map<string, CRDTRoom> = new Map();

  // Room shards for scaled rooms
  private shards: Map<string, RoomShard[]> = new Map(); // parentRoomId -> shards

  // Room directory cache
  private directoryCache: Map<string, CRDTRoomDirectoryEntry> = new Map();
  private directoryCacheAge: number = 0;
  private readonly directoryCacheTTL = 10_000; // 10s

  // Health monitoring
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;

  // Events
  private eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor(managerConfig: CRDTRoomManagerConfig) {
    this.client = managerConfig.client;
    this.localNodeId = managerConfig.localNodeId;

    this.config = {
      maxActiveRooms: managerConfig.maxActiveRooms ?? 5,
      autoShard: managerConfig.autoShard ?? true,
      shardThreshold: managerConfig.shardThreshold ?? 500,
      minEntitiesPerShard: managerConfig.minEntitiesPerShard ?? 50,
      region: managerConfig.region ?? 'default',
      persistenceAdapter: managerConfig.persistenceAdapter,
      healthCheckIntervalMs: managerConfig.healthCheckIntervalMs ?? 30_000,
    };

    this.setupNetworkHandlers();

    logger.info('CRDTRoomManager initialized', {
      nodeId: this.localNodeId,
      maxActiveRooms: this.config.maxActiveRooms,
      autoShard: this.config.autoShard,
    });
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /** Start health monitoring */
  start(): void {
    this.healthCheckTimer = setInterval(
      () => this.runHealthCheck(),
      this.config.healthCheckIntervalMs
    );
    logger.info('CRDTRoomManager started');
  }

  /** Stop health monitoring and leave all rooms */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Leave all active rooms
    for (const [roomId, room] of this.activeRooms) {
      room.stop();
      room.destroy();
    }
    this.activeRooms.clear();
    this.shards.clear();

    logger.info('CRDTRoomManager stopped');
  }

  // ===========================================================================
  // Room Creation & Joining
  // ===========================================================================

  /** Create a new CRDT room and join it */
  createRoom(roomConfig: CRDTRoomConfig): CRDTRoom {
    if (this.activeRooms.size >= this.config.maxActiveRooms) {
      throw new Error(
        `Cannot create room: max active rooms (${this.config.maxActiveRooms}) reached`
      );
    }

    if (this.activeRooms.has(roomConfig.roomId)) {
      throw new Error(`Room ${roomConfig.roomId} already exists locally`);
    }

    const room = new CRDTRoom(this.client, this.localNodeId, roomConfig);
    this.activeRooms.set(roomConfig.roomId, room);

    // Announce room to directory
    this.announceRoom(room);

    // Start room
    room.start();

    this.emit('room:created', { room, config: roomConfig });

    logger.info('Room created', {
      roomId: roomConfig.roomId,
      roomName: roomConfig.roomName,
    });

    return room;
  }

  /**
   * Create a CRDT room from a @crdt-room trait configuration.
   *
   * Accepts the output from CRDTRoomTraitHandler.toOutput() and creates a fully
   * configured room with interest regions, shard settings, and sync tiers applied.
   *
   * @param traitOutput - Output from CRDTRoomTraitHandler.toOutput(roomId)
   * @returns Created and started CRDTRoom with all trait settings applied
   */
  createRoomFromTrait(traitOutput: {
    roomConfig: CRDTRoomConfig;
    managerConfig: {
      autoShard: boolean;
      shardThreshold: number;
      minEntitiesPerShard: number;
    };
    interestRegions: Array<{
      id: string;
      center: { x: number; y: number; z: number };
      radius: number;
      priority: number;
      syncRateHz: number;
    }>;
    syncTierMap: Record<string, string>;
    persistence: {
      enabled: boolean;
      autoSaveIntervalMs: number;
    };
  }): CRDTRoom {
    // Apply sharding settings from trait to manager config
    if (traitOutput.managerConfig.autoShard) {
      this.config.autoShard = true;
      this.config.shardThreshold = traitOutput.managerConfig.shardThreshold;
      this.config.minEntitiesPerShard = traitOutput.managerConfig.minEntitiesPerShard;
    }

    // Create the room using standard createRoom
    const room = this.createRoom(traitOutput.roomConfig);

    // Apply interest regions from trait config
    for (const region of traitOutput.interestRegions) {
      room.addInterestRegion({
        id: region.id,
        center: region.center,
        radius: region.radius,
        priority: region.priority,
        syncRateHz: region.syncRateHz,
      });
    }

    // Store sync tier map in room metadata for entity assignment
    if (Object.keys(traitOutput.syncTierMap).length > 0) {
      room.setRoomMetadata('traitSyncTiers', traitOutput.syncTierMap);
    }

    // Setup auto-save if persistence is enabled
    if (traitOutput.persistence.enabled && this.config.persistenceAdapter) {
      const roomId = traitOutput.roomConfig.roomId;
      const interval = traitOutput.persistence.autoSaveIntervalMs;

      const autoSaveTimer = setInterval(() => {
        if (this.activeRooms.has(roomId)) {
          this.saveRoom(roomId).catch((err) => {
            logger.error('Auto-save failed', { roomId, error: String(err) });
          });
        } else {
          clearInterval(autoSaveTimer);
        }
      }, interval);

      // Store timer reference in room metadata for cleanup
      room.setRoomMetadata('autoSaveTimerId', autoSaveTimer);
    }

    logger.info('Room created from @crdt-room trait', {
      roomId: traitOutput.roomConfig.roomId,
      roomName: traitOutput.roomConfig.roomName,
      interestRegions: traitOutput.interestRegions.length,
      syncTiers: Object.keys(traitOutput.syncTierMap).length,
      sharding: traitOutput.managerConfig.autoShard,
      persistence: traitOutput.persistence.enabled,
    });

    return room;
  }

  /** Join an existing CRDT room by ID */
  async joinRoom(roomId: string, playerData: PlayerPresenceData): Promise<CRDTRoom> {
    if (this.activeRooms.size >= this.config.maxActiveRooms) {
      throw new Error(
        `Cannot join room: max active rooms (${this.config.maxActiveRooms}) reached`
      );
    }

    if (this.activeRooms.has(roomId)) {
      return this.activeRooms.get(roomId)!;
    }

    // Lookup room info from directory
    const directoryEntry = this.directoryCache.get(roomId);

    // Create local room representation
    const room = new CRDTRoom(this.client, this.localNodeId, {
      roomId,
      roomName: directoryEntry?.roomName ?? roomId,
      maxPlayers: directoryEntry?.maxPlayers ?? 50,
      metadata: directoryEntry?.metadata,
    });

    this.activeRooms.set(roomId, room);

    // Start room and add self as player
    room.start();
    room.addPlayer(playerData);

    // Request full state from peers
    room.requestFullSync();

    this.emit('room:joined', { room, roomId });

    logger.info('Joined room', { roomId });

    return room;
  }

  /** Leave a room */
  leaveRoom(roomId: string, reason: string = 'left'): void {
    const room = this.activeRooms.get(roomId);
    if (!room) {
      logger.warn('Cannot leave room: not in room', { roomId });
      return;
    }

    room.removePlayer(this.localNodeId, reason);
    room.stop();
    room.destroy();
    this.activeRooms.delete(roomId);

    // Clean up any shards
    this.shards.delete(roomId);

    this.emit('room:left', { roomId, reason });
    logger.info('Left room', { roomId, reason });
  }

  /** Destroy a room entirely (host only) */
  destroyRoom(roomId: string): void {
    const room = this.activeRooms.get(roomId);
    if (room) {
      room.stop();
      room.destroy();
      this.activeRooms.delete(roomId);
    }

    // Notify directory
    this.client.send({
      type: 'crdtRoomManager:destroyRoom',
      category: 'room' as MessageCategory,
      payload: { roomId, nodeId: this.localNodeId },
      timestamp: Date.now(),
    });

    // Clean up shards
    const roomShards = this.shards.get(roomId);
    if (roomShards) {
      for (const shard of roomShards) {
        shard.room.stop();
        shard.room.destroy();
      }
      this.shards.delete(roomId);
    }

    // Remove from directory
    this.directoryCache.delete(roomId);

    // Persistence cleanup
    if (this.config.persistenceAdapter) {
      this.config.persistenceAdapter.delete(roomId).catch((err) => {
        logger.error('Failed to delete persisted room', { roomId, error: String(err) });
      });
    }

    this.emit('room:destroyed', { roomId });
    logger.info('Room destroyed', { roomId });
  }

  // ===========================================================================
  // Room Access
  // ===========================================================================

  /** Get an active room by ID */
  getRoom(roomId: string): CRDTRoom | undefined {
    return this.activeRooms.get(roomId);
  }

  /** Get all active rooms */
  getActiveRooms(): CRDTRoom[] {
    return Array.from(this.activeRooms.values());
  }

  /** Get active room IDs */
  getActiveRoomIds(): string[] {
    return Array.from(this.activeRooms.keys());
  }

  /** Get active room count */
  getActiveRoomCount(): number {
    return this.activeRooms.size;
  }

  /** Check if client is in a specific room */
  isInRoom(roomId: string): boolean {
    return this.activeRooms.has(roomId);
  }

  // ===========================================================================
  // Room Directory
  // ===========================================================================

  /** Request room directory from the server */
  async refreshDirectory(): Promise<CRDTRoomDirectoryEntry[]> {
    return new Promise((resolve) => {
      const unsub = this.client.onMessage('crdtRoomManager:directory', (msg) => {
        unsub();
        const payload = msg.payload as { rooms: CRDTRoomDirectoryEntry[] };

        // Update cache
        this.directoryCache.clear();
        for (const entry of payload.rooms) {
          this.directoryCache.set(entry.roomId, entry);
        }
        this.directoryCacheAge = Date.now();

        this.emit('directory:updated', { rooms: payload.rooms });
        resolve(payload.rooms);
      });

      this.client.send({
        type: 'crdtRoomManager:listRooms',
        category: 'room' as MessageCategory,
        payload: { region: this.config.region },
        timestamp: Date.now(),
      });

      // Timeout fallback
      setTimeout(() => {
        unsub();
        resolve(Array.from(this.directoryCache.values()));
      }, 5000);
    });
  }

  /** Get cached room directory */
  getDirectory(): CRDTRoomDirectoryEntry[] {
    return Array.from(this.directoryCache.values());
  }

  /** Search directory by name, tags, or metadata */
  searchDirectory(query: {
    name?: string;
    tags?: string[];
    isPrivate?: boolean;
    hasSpace?: boolean;
    region?: string;
  }): CRDTRoomDirectoryEntry[] {
    let results = Array.from(this.directoryCache.values());

    if (query.name) {
      const lowerName = query.name.toLowerCase();
      results = results.filter((r) =>
        r.roomName.toLowerCase().includes(lowerName)
      );
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter((r) =>
        query.tags!.some((tag) => r.tags.includes(tag))
      );
    }

    if (query.isPrivate !== undefined) {
      results = results.filter((r) => r.isPrivate === query.isPrivate);
    }

    if (query.hasSpace) {
      results = results.filter((r) => r.playerCount < r.maxPlayers);
    }

    if (query.region) {
      results = results.filter((r) => r.region === query.region);
    }

    return results;
  }

  /** Announce a room to the directory server */
  private announceRoom(room: CRDTRoom): void {
    const info = room.getRoomInfo();
    const entry: CRDTRoomDirectoryEntry = {
      roomId: info.id,
      roomName: info.name,
      playerCount: info.playerCount,
      maxPlayers: info.maxPlayers,
      entityCount: room.getEntityCount(),
      state: info.state,
      isPrivate: info.isPrivate,
      region: this.config.region,
      tags: [],
      createdAt: info.createdAt,
      metadata: info.metadata ?? {},
    };

    this.directoryCache.set(info.id, entry);

    this.client.send({
      type: 'crdtRoomManager:announceRoom',
      category: 'room' as MessageCategory,
      payload: entry,
      timestamp: Date.now(),
    });
  }

  // ===========================================================================
  // Auto-Sharding
  // ===========================================================================

  /** Check if a room needs sharding and perform it */
  evaluateShard(roomId: string): RoomShard[] | null {
    if (!this.config.autoShard) return null;

    const room = this.activeRooms.get(roomId);
    if (!room) return null;

    const entityCount = room.getEntityCount();
    if (entityCount < this.config.shardThreshold) return null;

    logger.info('Room exceeds entity threshold, sharding', {
      roomId,
      entityCount,
      threshold: this.config.shardThreshold,
    });

    return this.shardRoom(roomId);
  }

  /** Split a room into spatial shards */
  shardRoom(roomId: string): RoomShard[] {
    const room = this.activeRooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    const entities = room.getAllEntities();
    if (entities.length === 0) return [];

    // Compute bounding box of all entities
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const entity of entities) {
      minX = Math.min(minX, entity.position.x);
      minY = Math.min(minY, entity.position.y);
      minZ = Math.min(minZ, entity.position.z);
      maxX = Math.max(maxX, entity.position.x);
      maxY = Math.max(maxY, entity.position.y);
      maxZ = Math.max(maxZ, entity.position.z);
    }

    // Determine number of shards (power of 2 spatial split)
    const targetEntitiesPerShard = Math.max(
      this.config.minEntitiesPerShard,
      Math.floor(entities.length / 4)
    );
    const numShards = Math.min(
      8,
      Math.max(2, Math.ceil(entities.length / targetEntitiesPerShard))
    );

    // Split along the longest axis
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;

    let splitAxis: 'x' | 'y' | 'z' = 'x';
    if (rangeY > rangeX && rangeY > rangeZ) splitAxis = 'y';
    else if (rangeZ > rangeX && rangeZ > rangeY) splitAxis = 'z';

    // Create shard boundaries
    const shards: RoomShard[] = [];
    const sliceSize =
      (splitAxis === 'x' ? rangeX : splitAxis === 'y' ? rangeY : rangeZ) /
      numShards;

    for (let i = 0; i < numShards; i++) {
      const shardId = `${roomId}_shard_${i}`;

      const shardMin: Vector3 = { x: minX, y: minY, z: minZ };
      const shardMax: Vector3 = { x: maxX, y: maxY, z: maxZ };

      if (splitAxis === 'x') {
        shardMin.x = minX + i * sliceSize;
        shardMax.x = minX + (i + 1) * sliceSize;
      } else if (splitAxis === 'y') {
        shardMin.y = minY + i * sliceSize;
        shardMax.y = minY + (i + 1) * sliceSize;
      } else {
        shardMin.z = minZ + i * sliceSize;
        shardMax.z = minZ + (i + 1) * sliceSize;
      }

      // Create shard room
      const shardRoom = new CRDTRoom(this.client, this.localNodeId, {
        roomId: shardId,
        roomName: `${room.getRoomName()} [Shard ${i}]`,
        maxPlayers: room.getRoomInfo().maxPlayers,
        interestManagement: true,
        metadata: {
          parentRoomId: roomId,
          shardIndex: i,
          boundingBox: { min: shardMin, max: shardMax },
        },
      });

      // Populate shard with entities in its bounding box
      for (const entity of entities) {
        const pos = entity.position;
        const inBounds =
          pos[splitAxis as keyof Vector3] >= shardMin[splitAxis as keyof Vector3] &&
          pos[splitAxis as keyof Vector3] < shardMax[splitAxis as keyof Vector3];

        if (inBounds) {
          shardRoom.setEntity(entity.entityId, entity);
        }
      }

      shardRoom.start();

      shards.push({
        shardId,
        parentRoomId: roomId,
        boundingBox: { min: shardMin, max: shardMax },
        room: shardRoom,
      });
    }

    this.shards.set(roomId, shards);

    this.emit('room:sharded', { parentRoomId: roomId, shards });

    logger.info('Room sharded', {
      roomId,
      shardCount: shards.length,
      splitAxis,
    });

    return shards;
  }

  /** Merge shards back into a single room when entity count drops */
  mergeShards(parentRoomId: string): void {
    const roomShards = this.shards.get(parentRoomId);
    if (!roomShards || roomShards.length === 0) return;

    const parentRoom = this.activeRooms.get(parentRoomId);
    if (!parentRoom) return;

    // Collect all entities from shards
    const mergedShardIds: string[] = [];
    for (const shard of roomShards) {
      const entities = shard.room.getAllEntities();
      for (const entity of entities) {
        parentRoom.setEntity(entity.entityId, entity);
      }
      shard.room.stop();
      shard.room.destroy();
      mergedShardIds.push(shard.shardId);
    }

    this.shards.delete(parentRoomId);

    this.emit('room:merged', { parentRoomId, mergedShardIds });

    logger.info('Shards merged', {
      parentRoomId,
      mergedCount: mergedShardIds.length,
    });
  }

  /** Get shards for a room */
  getShards(roomId: string): RoomShard[] {
    return this.shards.get(roomId) ?? [];
  }

  /** Find which shard a position belongs to */
  getShardForPosition(roomId: string, position: Vector3): RoomShard | undefined {
    const roomShards = this.shards.get(roomId);
    if (!roomShards) return undefined;

    for (const shard of roomShards) {
      const { min, max } = shard.boundingBox;
      if (
        position.x >= min.x && position.x < max.x &&
        position.y >= min.y && position.y < max.y &&
        position.z >= min.z && position.z < max.z
      ) {
        return shard;
      }
    }

    return undefined;
  }

  // ===========================================================================
  // Persistence
  // ===========================================================================

  /** Save room state to persistence adapter */
  async saveRoom(roomId: string): Promise<void> {
    if (!this.config.persistenceAdapter) {
      logger.warn('No persistence adapter configured');
      return;
    }

    const room = this.activeRooms.get(roomId);
    if (!room) {
      logger.warn('Cannot save room: not found', { roomId });
      return;
    }

    const state = room.serializeState();
    await this.config.persistenceAdapter.save(roomId, state);
    logger.info('Room state saved', { roomId });
  }

  /** Load room state from persistence adapter */
  async loadRoom(roomId: string): Promise<CRDTRoom | null> {
    if (!this.config.persistenceAdapter) {
      logger.warn('No persistence adapter configured');
      return null;
    }

    const state = await this.config.persistenceAdapter.load(roomId);
    if (!state) {
      logger.warn('No persisted state found', { roomId });
      return null;
    }

    // Create room and apply loaded state
    const room = new CRDTRoom(this.client, this.localNodeId, {
      roomId: state.roomId,
      roomName: 'Loaded Room',
      maxPlayers: 50,
    });

    room.applyFullState(state);
    room.start();

    this.activeRooms.set(roomId, room);

    logger.info('Room loaded from persistence', { roomId });

    return room;
  }

  /** Save all active rooms */
  async saveAllRooms(): Promise<void> {
    if (!this.config.persistenceAdapter) return;

    const promises = Array.from(this.activeRooms.keys()).map((roomId) =>
      this.saveRoom(roomId)
    );
    await Promise.all(promises);

    logger.info('All rooms saved', { count: this.activeRooms.size });
  }

  // ===========================================================================
  // Health Monitoring
  // ===========================================================================

  /** Run health check on all active rooms */
  private runHealthCheck(): void {
    for (const [roomId, room] of this.activeRooms) {
      const stats = room.getStats();

      // Check entity count vs threshold
      if (
        this.config.autoShard &&
        stats.entities >= this.config.shardThreshold
      ) {
        this.emit('health:warning', {
          roomId,
          metric: 'entities',
          value: stats.entities,
          threshold: this.config.shardThreshold,
        });

        // Auto-shard if enabled
        if (!this.shards.has(roomId)) {
          this.evaluateShard(roomId);
        }
      }

      // Check pending deltas (network bottleneck)
      if (stats.pendingDeltas > 100) {
        this.emit('health:warning', {
          roomId,
          metric: 'pendingDeltas',
          value: stats.pendingDeltas,
          threshold: 100,
        });
      }

      // Check player count
      if (stats.players >= stats.maxPlayers * 0.9) {
        this.emit('health:warning', {
          roomId,
          metric: 'playerCapacity',
          value: stats.players,
          threshold: stats.maxPlayers,
        });
      }

      // Update directory entry
      const entry = this.directoryCache.get(roomId);
      if (entry) {
        entry.playerCount = stats.players;
        entry.entityCount = stats.entities;
      }
    }

    // Check for shards that can be merged
    for (const [parentId, roomShards] of this.shards) {
      const totalEntities = roomShards.reduce(
        (sum, shard) => sum + shard.room.getEntityCount(),
        0
      );

      if (totalEntities < this.config.shardThreshold / 2) {
        logger.info('Shard entity count dropped, considering merge', {
          parentRoomId: parentId,
          totalEntities,
        });
        this.mergeShards(parentId);
      }
    }
  }

  // ===========================================================================
  // Network Handlers
  // ===========================================================================

  private setupNetworkHandlers(): void {
    // Handle directory responses
    this.client.onMessage('crdtRoomManager:directory', (msg) => {
      const payload = msg.payload as { rooms: CRDTRoomDirectoryEntry[] };

      this.directoryCache.clear();
      for (const entry of payload.rooms) {
        this.directoryCache.set(entry.roomId, entry);
      }
      this.directoryCacheAge = Date.now();
    });

    // Handle room announcements from other peers
    this.client.onMessage('crdtRoomManager:announceRoom', (msg) => {
      const entry = msg.payload as CRDTRoomDirectoryEntry;
      this.directoryCache.set(entry.roomId, entry);
    });

    // Handle room destruction notifications
    this.client.onMessage('crdtRoomManager:destroyRoom', (msg) => {
      const payload = msg.payload as { roomId: string; nodeId: string };
      this.directoryCache.delete(payload.roomId);

      // If we're in this room, leave it
      if (this.activeRooms.has(payload.roomId)) {
        this.leaveRoom(payload.roomId, 'room_destroyed');
      }
    });
  }

  // ===========================================================================
  // Aggregated Metrics
  // ===========================================================================

  /** Get aggregated statistics across all active rooms */
  getAggregatedStats(): {
    activeRooms: number;
    totalPlayers: number;
    totalEntities: number;
    totalShards: number;
    totalDeltasSent: number;
    totalDeltasReceived: number;
    directorySize: number;
    roomStats: Array<ReturnType<CRDTRoom['getStats']>>;
  } {
    const roomStats = Array.from(this.activeRooms.values()).map((room) =>
      room.getStats()
    );

    let totalShards = 0;
    for (const shardList of this.shards.values()) {
      totalShards += shardList.length;
    }

    return {
      activeRooms: this.activeRooms.size,
      totalPlayers: roomStats.reduce((sum, s) => sum + s.players, 0),
      totalEntities: roomStats.reduce((sum, s) => sum + s.entities, 0),
      totalShards,
      totalDeltasSent: roomStats.reduce((sum, s) => sum + s.deltasSent, 0),
      totalDeltasReceived: roomStats.reduce(
        (sum, s) => sum + s.deltasReceived,
        0
      ),
      directorySize: this.directoryCache.size,
      roomStats,
    };
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  on<T extends CRDTRoomManagerEventType>(
    event: T,
    handler: CRDTRoomManagerEventHandler<T>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off<T extends CRDTRoomManagerEventType>(
    event: T,
    handler: CRDTRoomManagerEventHandler<T>
  ): void {
    this.eventListeners.get(event)?.delete(handler);
  }

  private emit<T extends CRDTRoomManagerEventType>(
    event: T,
    data: CRDTRoomManagerEventMap[T]
  ): void {
    this.eventListeners.get(event)?.forEach((handler) => {
      try {
        (handler as CRDTRoomManagerEventHandler<T>)(data);
      } catch (err) {
        logger.error('Event handler error', { event, error: String(err) });
      }
    });
  }
}
