/**
 * CRDTRoom — CRDT-backed multiplayer room for scalable spatial computing
 *
 * Combines CRDT data structures with room lifecycle management to provide:
 * - Conflict-free entity state via LWW-Map per entity
 * - Player presence via OR-Set (add/remove without coordination)
 * - Shared room metadata via LWW-Map
 * - Interest-based sync regions for bandwidth optimization
 * - Delta compression and batched network updates
 * - Automatic peer discovery and state reconciliation
 *
 * Architecture:
 *   CRDTRoom owns a set of CRDT documents that together represent room state:
 *     - entityStates: LWWMap<EntityCRDTState>  (position, rotation, scale, metadata per entity)
 *     - playerPresence: ORSet<string>           (player IDs currently in room)
 *     - playerData: LWWMap<PlayerPresenceData>  (player cursors, avatars, voice state)
 *     - roomMetadata: LWWMap<any>               (room name, config, permissions)
 *     - chatHistory: RGASequence<ChatEntry>     (ordered chat log)
 *
 *   CRDTNetworkBridge handles delta serialization and network transport.
 *   InterestManager filters which entities sync to which peers.
 *
 * @module CRDTRoom
 */

import { logger } from './logger';
import type { NetworkClient } from './NetworkClient';
import type {
  Vector3,
  PlayerInfo,
  PlayerRole,
  RoomInfo,
  RoomState,
  NetworkMessage,
  MessageCategory,
} from './types';

import {
  LWWMap,
  LWWRegister,
  ORSet,
  RGASequence,
  GCounter,
  JSONDoc,
  createVectorClock,
  incrementClock,
  mergeClock,
  compareClock,
} from './crdt';
import type { VectorClock } from './crdt';

// =============================================================================
// Types
// =============================================================================

/** Serializable entity state stored in CRDT map */
export interface EntityCRDTState {
  entityId: string;
  ownerId: string;
  entityType: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  velocity?: Vector3;
  metadata: Record<string, unknown>;
  lastUpdated: number;
}

/** Player presence data tracked by CRDT */
export interface PlayerPresenceData {
  playerId: string;
  displayName: string;
  role: PlayerRole;
  position: Vector3;
  rotation: Vector3;
  avatarUrl?: string;
  voiceState: 'muted' | 'speaking' | 'listening' | 'deafened';
  cursorPosition?: Vector3;
  joinedAt: number;
  lastHeartbeat: number;
  metadata: Record<string, unknown>;
}

/** Chat entry stored in RGA sequence */
export interface ChatEntry {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system' | 'emote';
}

/** Interest region for spatial partitioning */
export interface InterestRegion {
  id: string;
  center: Vector3;
  radius: number;
  priority: number; // 0 = critical, 1 = high, 2 = normal, 3 = low
  syncRateHz: number;
  entities: Set<string>;
}

/** Sync tier determines update frequency */
export type SyncTier = 'critical' | 'high' | 'normal' | 'low' | 'dormant';

/** Configuration for a CRDT room */
export interface CRDTRoomConfig {
  roomId: string;
  roomName: string;
  maxPlayers: number;
  /** Max entities before spatial partitioning activates */
  entityThreshold?: number;
  /** Base sync rate in Hz for normal-priority entities */
  baseSyncRateHz?: number;
  /** Maximum delta batch size before forced flush */
  maxBatchSize?: number;
  /** Delta flush interval in ms */
  flushIntervalMs?: number;
  /** Enable interest-based spatial filtering */
  interestManagement?: boolean;
  /** View distance for interest filtering */
  viewDistance?: number;
  /** Heartbeat interval for presence detection (ms) */
  heartbeatIntervalMs?: number;
  /** Time after which a player is considered stale (ms) */
  presenceTimeoutMs?: number;
  /** Maximum chat history entries retained */
  maxChatHistory?: number;
  /** Enable Merkle tree integrity verification */
  merkleVerification?: boolean;
  /** Privacy setting */
  isPrivate?: boolean;
  /** Room password if private */
  password?: string;
  /** Custom room metadata */
  metadata?: Record<string, unknown>;
}

/** Events emitted by CRDTRoom */
export interface CRDTRoomEventMap {
  'entity:added': { entityId: string; state: EntityCRDTState };
  'entity:updated': { entityId: string; state: EntityCRDTState; delta: Partial<EntityCRDTState> };
  'entity:removed': { entityId: string };
  'player:joined': { player: PlayerPresenceData };
  'player:left': { playerId: string; reason: string };
  'player:updated': { player: PlayerPresenceData };
  'chat:message': { entry: ChatEntry };
  'room:metadata': { key: string; value: unknown };
  'sync:delta-sent': { count: number; bytesEstimate: number };
  'sync:delta-received': { peerId: string; count: number };
  'sync:full-state': { peerId: string };
  'sync:conflict': { entityId: string; localValue: unknown; remoteValue: unknown };
  'room:state-changed': { state: RoomState };
  'room:error': { message: string; code: string };
}

export type CRDTRoomEventType = keyof CRDTRoomEventMap;
export type CRDTRoomEventHandler<T extends CRDTRoomEventType> = (
  event: CRDTRoomEventMap[T]
) => void;

/** Serialized room state for full-state sync and persistence */
export interface SerializedCRDTRoomState {
  roomId: string;
  vectorClock: VectorClock;
  entities: Record<string, { value: EntityCRDTState; timestamp: number }>;
  players: string[]; // player IDs in OR-Set
  playerData: Record<string, { value: PlayerPresenceData | null; timestamp: number }>;
  roomMetadata: Record<string, { value: unknown; timestamp: number }>;
  chatHistory: ChatEntry[];
  timestamp: number;
}

// =============================================================================
// CRDTRoom
// =============================================================================

export class CRDTRoom {
  // --- Identity ---
  readonly roomId: string;
  readonly localNodeId: string;
  private config: Required<CRDTRoomConfig>;
  private roomState: RoomState = 'open';

  // --- CRDT Documents ---
  private entityStates: LWWMap<EntityCRDTState>;
  private playerPresence: ORSet<string>;
  private playerData: LWWMap<PlayerPresenceData>;
  private roomMetadata: LWWMap<unknown>;
  private chatHistory: RGASequence<ChatEntry>;
  private entityCounter: GCounter;

  // --- Vector Clock ---
  private vectorClock: VectorClock;

  // --- Interest Management ---
  private regions: Map<string, InterestRegion> = new Map();
  private entityToRegion: Map<string, string> = new Map();

  // --- Sync Tiers ---
  private entitySyncTiers: Map<string, SyncTier> = new Map();
  private syncTierRates: Record<SyncTier, number>;

  // --- Network ---
  private client: NetworkClient;
  private pendingDeltas: Array<{
    crdtId: string;
    operation: string;
    args: unknown[];
    clock: VectorClock;
    timestamp: number;
  }> = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private presenceCheckTimer: ReturnType<typeof setInterval> | null = null;

  // --- Events ---
  private eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  // --- Dedup ---
  private appliedDeltaIds: Set<string> = new Set();
  private readonly maxAppliedCache = 10_000;

  // --- Metrics ---
  private deltasSent = 0;
  private deltasReceived = 0;
  private conflictsResolved = 0;
  private bytesSentEstimate = 0;
  private bytesReceivedEstimate = 0;

  constructor(
    client: NetworkClient,
    localNodeId: string,
    config: CRDTRoomConfig
  ) {
    this.client = client;
    this.localNodeId = localNodeId;
    this.roomId = config.roomId;

    // Apply defaults
    this.config = {
      roomId: config.roomId,
      roomName: config.roomName,
      maxPlayers: config.maxPlayers,
      entityThreshold: config.entityThreshold ?? 200,
      baseSyncRateHz: config.baseSyncRateHz ?? 20,
      maxBatchSize: config.maxBatchSize ?? 50,
      flushIntervalMs: config.flushIntervalMs ?? 50,
      interestManagement: config.interestManagement ?? true,
      viewDistance: config.viewDistance ?? 100,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 5_000,
      presenceTimeoutMs: config.presenceTimeoutMs ?? 15_000,
      maxChatHistory: config.maxChatHistory ?? 200,
      merkleVerification: config.merkleVerification ?? false,
      isPrivate: config.isPrivate ?? false,
      password: config.password ?? '',
      metadata: config.metadata ?? {},
    };

    // Sync tier rates (Hz)
    this.syncTierRates = {
      critical: this.config.baseSyncRateHz * 2,
      high: this.config.baseSyncRateHz,
      normal: this.config.baseSyncRateHz / 2,
      low: this.config.baseSyncRateHz / 4,
      dormant: 1,
    };

    // Initialize CRDTs
    this.entityStates = new LWWMap<EntityCRDTState>(localNodeId);
    this.playerPresence = new ORSet<string>(localNodeId);
    this.playerData = new LWWMap<PlayerPresenceData>(localNodeId);
    this.roomMetadata = new LWWMap<unknown>(localNodeId);
    this.chatHistory = new RGASequence<ChatEntry>(localNodeId);
    this.entityCounter = new GCounter(localNodeId);
    this.vectorClock = createVectorClock(localNodeId);

    // Set initial room metadata
    this.roomMetadata.set('name', config.roomName);
    this.roomMetadata.set('maxPlayers', config.maxPlayers);
    this.roomMetadata.set('isPrivate', config.isPrivate ?? false);
    this.roomMetadata.set('createdAt', Date.now());
    if (config.metadata) {
      for (const [k, v] of Object.entries(config.metadata)) {
        this.roomMetadata.set(`custom.${k}`, v);
      }
    }

    // Setup network message handlers
    this.setupNetworkHandlers();

    logger.info('CRDTRoom created', {
      roomId: this.roomId,
      nodeId: localNodeId,
      maxPlayers: config.maxPlayers,
    });
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /** Start the room's sync timers and join the room network */
  start(): void {
    // Delta flush timer
    this.flushTimer = setInterval(
      () => this.flushDeltas(),
      this.config.flushIntervalMs
    );

    // Heartbeat timer
    this.heartbeatTimer = setInterval(
      () => this.sendHeartbeat(),
      this.config.heartbeatIntervalMs
    );

    // Presence check timer
    this.presenceCheckTimer = setInterval(
      () => this.checkPresence(),
      this.config.presenceTimeoutMs / 2
    );

    // Add self to presence
    this.playerPresence.add(this.localNodeId);

    // Announce join
    this.client.send({
      type: 'crdtRoom:join',
      category: 'room' as MessageCategory,
      payload: { roomId: this.roomId, nodeId: this.localNodeId },
      timestamp: Date.now(),
    });

    logger.info('CRDTRoom started', { roomId: this.roomId });
  }

  /** Stop sync timers and leave the room network */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.presenceCheckTimer) {
      clearInterval(this.presenceCheckTimer);
      this.presenceCheckTimer = null;
    }

    // Flush remaining deltas
    this.flushDeltas();

    // Announce leave
    this.client.send({
      type: 'crdtRoom:leave',
      category: 'room' as MessageCategory,
      payload: { roomId: this.roomId, nodeId: this.localNodeId },
      timestamp: Date.now(),
    });

    logger.info('CRDTRoom stopped', { roomId: this.roomId });
  }

  /** Destroy the room and clean up all resources */
  destroy(): void {
    this.stop();
    this.eventListeners.clear();
    this.regions.clear();
    this.entityToRegion.clear();
    this.entitySyncTiers.clear();
    this.pendingDeltas = [];
    this.appliedDeltaIds.clear();
    logger.info('CRDTRoom destroyed', { roomId: this.roomId });
  }

  // ===========================================================================
  // Entity Management
  // ===========================================================================

  /** Add or update an entity in the room */
  setEntity(entityId: string, state: EntityCRDTState): void {
    const existing = this.entityStates.get(entityId) as EntityCRDTState | null | undefined;
    const now = Date.now();

    const fullState: EntityCRDTState = {
      ...state,
      entityId,
      lastUpdated: now,
    };

    this.entityStates.set(entityId, fullState, now);
    this.entityCounter.increment();
    this.tickClock();

    // Assign to interest region
    if (this.config.interestManagement) {
      this.assignEntityToRegion(entityId, fullState.position);
    }

    // Compute sync tier based on entity type and distance
    this.updateEntitySyncTier(entityId, fullState);

    // Record delta
    this.recordDelta('entityStates', 'set', [entityId, fullState, now]);

    // Emit event
    if (!existing) {
      this.emit('entity:added', { entityId, state: fullState });
    } else {
      const delta: Partial<EntityCRDTState> = {};
      const prev = existing as EntityCRDTState;
      if (prev.position !== fullState.position) delta.position = fullState.position;
      if (prev.rotation !== fullState.rotation) delta.rotation = fullState.rotation;
      if (prev.scale !== fullState.scale) delta.scale = fullState.scale;
      this.emit('entity:updated', { entityId, state: fullState, delta });
    }
  }

  /** Update only changed fields of an entity (delta update) */
  updateEntity(entityId: string, partial: Partial<EntityCRDTState>): void {
    const existing = this.entityStates.get(entityId) as EntityCRDTState | null | undefined;
    if (!existing) {
      logger.warn('Cannot update non-existent entity', { entityId });
      return;
    }

    const merged: EntityCRDTState = {
      ...(existing as EntityCRDTState),
      ...partial,
      entityId,
      lastUpdated: Date.now(),
    };

    this.setEntity(entityId, merged);
  }

  /** Remove an entity from the room */
  removeEntity(entityId: string): void {
    this.entityStates.delete(entityId);
    this.entityToRegion.delete(entityId);
    this.entitySyncTiers.delete(entityId);
    this.tickClock();

    this.recordDelta('entityStates', 'delete', [entityId]);

    // Remove from interest regions
    for (const region of this.regions.values()) {
      region.entities.delete(entityId);
    }

    this.emit('entity:removed', { entityId });
  }

  /** Get an entity's state */
  getEntity(entityId: string): EntityCRDTState | undefined {
    const val = this.entityStates.get(entityId);
    return val !== null && val !== undefined ? val as EntityCRDTState : undefined;
  }

  /** Get all entity IDs */
  getEntityIds(): string[] {
    return this.entityStates.keys();
  }

  /** Get all entities */
  getAllEntities(): EntityCRDTState[] {
    return this.entityStates.entries().map(([, v]) => v as EntityCRDTState);
  }

  /** Get entity count */
  getEntityCount(): number {
    return this.entityStates.size();
  }

  /** Get entities owned by a specific player */
  getEntitiesByOwner(ownerId: string): EntityCRDTState[] {
    return this.getAllEntities().filter((e) => e.ownerId === ownerId);
  }

  /** Get entities by type */
  getEntitiesByType(entityType: string): EntityCRDTState[] {
    return this.getAllEntities().filter((e) => e.entityType === entityType);
  }

  /** Get entities within radius of a point */
  getEntitiesInRadius(center: Vector3, radius: number): EntityCRDTState[] {
    return this.getAllEntities().filter((e) => {
      const dx = e.position.x - center.x;
      const dy = e.position.y - center.y;
      const dz = e.position.z - center.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz) <= radius;
    });
  }

  // ===========================================================================
  // Player Presence
  // ===========================================================================

  /** Add a player to the room with presence data */
  addPlayer(data: PlayerPresenceData): void {
    if (this.playerPresence.values().length >= this.config.maxPlayers) {
      this.emit('room:error', {
        message: 'Room is full',
        code: 'ROOM_FULL',
      });
      return;
    }

    this.playerPresence.add(data.playerId);
    this.playerData.set(data.playerId, data, Date.now());
    this.tickClock();

    this.recordDelta('playerPresence', 'add', [data.playerId]);
    this.recordDelta('playerData', 'set', [data.playerId, data, Date.now()]);

    this.emit('player:joined', { player: data });
    logger.info('Player joined CRDTRoom', {
      playerId: data.playerId,
      roomId: this.roomId,
    });
  }

  /** Remove a player from the room */
  removePlayer(playerId: string, reason: string = 'left'): void {
    this.playerPresence.remove(playerId);
    this.playerData.delete(playerId);
    this.tickClock();

    this.recordDelta('playerPresence', 'remove', [playerId]);
    this.recordDelta('playerData', 'delete', [playerId]);

    // Remove entities owned by this player (optional cleanup)
    const ownedEntities = this.getEntitiesByOwner(playerId);
    for (const entity of ownedEntities) {
      this.removeEntity(entity.entityId);
    }

    this.emit('player:left', { playerId, reason });
    logger.info('Player left CRDTRoom', {
      playerId,
      roomId: this.roomId,
      reason,
    });
  }

  /** Update a player's presence data */
  updatePlayer(playerId: string, partial: Partial<PlayerPresenceData>): void {
    const existing = this.playerData.get(playerId) as PlayerPresenceData | null | undefined;
    if (!existing) return;

    const merged: PlayerPresenceData = {
      ...(existing as PlayerPresenceData),
      ...partial,
      playerId,
      lastHeartbeat: Date.now(),
    };

    this.playerData.set(playerId, merged, Date.now());
    this.tickClock();

    this.recordDelta('playerData', 'set', [playerId, merged, Date.now()]);
    this.emit('player:updated', { player: merged });
  }

  /** Get player presence data */
  getPlayer(playerId: string): PlayerPresenceData | undefined {
    const val = this.playerData.get(playerId);
    return val !== null && val !== undefined ? val as PlayerPresenceData : undefined;
  }

  /** Get all active player IDs */
  getPlayerIds(): string[] {
    return this.playerPresence.values();
  }

  /** Get all player presence data */
  getAllPlayers(): PlayerPresenceData[] {
    return this.getPlayerIds()
      .map((id) => this.getPlayer(id))
      .filter((p): p is PlayerPresenceData => p !== undefined);
  }

  /** Get player count */
  getPlayerCount(): number {
    return this.playerPresence.size();
  }

  /** Check if room is full */
  isFull(): boolean {
    return this.getPlayerCount() >= this.config.maxPlayers;
  }

  // ===========================================================================
  // Chat
  // ===========================================================================

  /** Send a chat message */
  sendChat(senderId: string, senderName: string, content: string, type: ChatEntry['type'] = 'text'): void {
    const entry: ChatEntry = {
      id: `chat_${this.localNodeId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId,
      senderName,
      content,
      timestamp: Date.now(),
      type,
    };

    this.chatHistory.append(entry);
    this.tickClock();

    // Trim chat history
    while (this.chatHistory.length() > this.config.maxChatHistory) {
      this.chatHistory.remove(0);
    }

    this.recordDelta('chatHistory', 'append', [entry]);
    this.emit('chat:message', { entry });
  }

  /** Get chat history */
  getChatHistory(): ChatEntry[] {
    return this.chatHistory.values();
  }

  // ===========================================================================
  // Room Metadata
  // ===========================================================================

  /** Set a room metadata value */
  setRoomMetadata(key: string, value: unknown): void {
    this.roomMetadata.set(key, value, Date.now());
    this.tickClock();
    this.recordDelta('roomMetadata', 'set', [key, value, Date.now()]);
    this.emit('room:metadata', { key, value });
  }

  /** Get a room metadata value */
  getRoomMetadata(key: string): unknown {
    return this.roomMetadata.get(key);
  }

  /** Get all room metadata */
  getAllRoomMetadata(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of this.roomMetadata.entries()) {
      result[k] = v;
    }
    return result;
  }

  /** Get room name */
  getRoomName(): string {
    return (this.roomMetadata.get('name') as string) || this.config.roomName;
  }

  /** Get room state */
  getRoomState(): RoomState {
    return this.roomState;
  }

  /** Set room state (open/closed/locked) */
  setRoomState(state: RoomState): void {
    this.roomState = state;
    this.setRoomMetadata('state', state);
    this.emit('room:state-changed', { state });
  }

  // ===========================================================================
  // Interest Management (Spatial Partitioning)
  // ===========================================================================

  /** Add or update an interest region for spatial filtering */
  addInterestRegion(region: Omit<InterestRegion, 'entities'>): void {
    const existing = this.regions.get(region.id);
    if (existing) {
      existing.center = region.center;
      existing.radius = region.radius;
      existing.priority = region.priority;
      existing.syncRateHz = region.syncRateHz;
    } else {
      this.regions.set(region.id, {
        ...region,
        entities: new Set(),
      });
    }

    // Re-assign entities to regions
    this.reassignEntitiesToRegions();
  }

  /** Remove an interest region */
  removeInterestRegion(regionId: string): void {
    this.regions.delete(regionId);
    // Remove entity assignments to this region
    for (const [entityId, regId] of this.entityToRegion) {
      if (regId === regionId) {
        this.entityToRegion.delete(entityId);
      }
    }
  }

  /** Get entities visible from a viewer position within view distance */
  getEntitiesInView(viewerPosition: Vector3, viewDistance?: number): EntityCRDTState[] {
    const dist = viewDistance ?? this.config.viewDistance;
    return this.getEntitiesInRadius(viewerPosition, dist);
  }

  /** Get entities filtered by sync tier */
  getEntitiesBySyncTier(tier: SyncTier): string[] {
    const result: string[] = [];
    for (const [entityId, t] of this.entitySyncTiers) {
      if (t === tier) result.push(entityId);
    }
    return result;
  }

  /** Assign an entity to the nearest interest region */
  private assignEntityToRegion(entityId: string, position: Vector3): void {
    let bestRegion: InterestRegion | null = null;
    let bestDistance = Infinity;

    for (const region of this.regions.values()) {
      const dx = position.x - region.center.x;
      const dy = position.y - region.center.y;
      const dz = position.z - region.center.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist <= region.radius && dist < bestDistance) {
        bestDistance = dist;
        bestRegion = region;
      }
    }

    // Remove from previous region
    const prevRegionId = this.entityToRegion.get(entityId);
    if (prevRegionId) {
      this.regions.get(prevRegionId)?.entities.delete(entityId);
    }

    // Assign to new region
    if (bestRegion) {
      bestRegion.entities.add(entityId);
      this.entityToRegion.set(entityId, bestRegion.id);
    } else {
      this.entityToRegion.delete(entityId);
    }
  }

  /** Re-assign all entities to their nearest regions */
  private reassignEntitiesToRegions(): void {
    for (const [entityId] of this.entityStates.entries()) {
      const entity = this.entityStates.get(entityId) as EntityCRDTState | null;
      if (entity) {
        this.assignEntityToRegion(entityId, entity.position);
      }
    }
  }

  /** Compute sync tier for an entity based on its type and viewer proximity */
  private updateEntitySyncTier(entityId: string, state: EntityCRDTState): void {
    // Player-owned entities and high-priority types get critical/high tier
    if (state.ownerId === this.localNodeId) {
      this.entitySyncTiers.set(entityId, 'critical');
      return;
    }

    // Determine tier by region priority if available
    const regionId = this.entityToRegion.get(entityId);
    if (regionId) {
      const region = this.regions.get(regionId);
      if (region) {
        const tierMap: Record<number, SyncTier> = {
          0: 'critical',
          1: 'high',
          2: 'normal',
          3: 'low',
        };
        this.entitySyncTiers.set(entityId, tierMap[region.priority] || 'normal');
        return;
      }
    }

    // Default tier based on entity type
    if (state.entityType === 'player' || state.entityType === 'npc') {
      this.entitySyncTiers.set(entityId, 'high');
    } else if (state.entityType === 'dynamic') {
      this.entitySyncTiers.set(entityId, 'normal');
    } else {
      this.entitySyncTiers.set(entityId, 'low');
    }
  }

  // ===========================================================================
  // Network: Delta Operations
  // ===========================================================================

  /** Record a local CRDT operation as a delta for network transmission */
  private recordDelta(crdtId: string, operation: string, args: unknown[]): void {
    this.pendingDeltas.push({
      crdtId,
      operation,
      args,
      clock: { ...this.vectorClock },
      timestamp: Date.now(),
    });

    // Auto-flush if batch full
    if (this.pendingDeltas.length >= this.config.maxBatchSize) {
      this.flushDeltas();
    }
  }

  /** Flush pending deltas to the network */
  private flushDeltas(): void {
    if (this.pendingDeltas.length === 0) return;

    const batch = this.pendingDeltas.splice(0, this.config.maxBatchSize);
    const bytesEstimate = JSON.stringify(batch).length;

    this.client.send({
      type: 'crdtRoom:deltas',
      category: 'state' as MessageCategory,
      payload: {
        roomId: this.roomId,
        sourceNodeId: this.localNodeId,
        deltas: batch,
        vectorClock: this.vectorClock,
      },
      timestamp: Date.now(),
    });

    this.deltasSent += batch.length;
    this.bytesSentEstimate += bytesEstimate;

    this.emit('sync:delta-sent', { count: batch.length, bytesEstimate });
  }

  /** Request a full state sync from peers (used on join or reconnect) */
  requestFullSync(): void {
    this.client.send({
      type: 'crdtRoom:requestSync',
      category: 'state' as MessageCategory,
      payload: {
        roomId: this.roomId,
        requesterId: this.localNodeId,
        vectorClock: this.vectorClock,
      },
      timestamp: Date.now(),
    });
  }

  /** Serialize full room state for transmission */
  serializeState(): SerializedCRDTRoomState {
    return {
      roomId: this.roomId,
      vectorClock: { ...this.vectorClock },
      entities: this.entityStates.toJSON() as any,
      players: this.playerPresence.values(),
      playerData: this.playerData.toJSON() as any,
      roomMetadata: this.roomMetadata.toJSON() as any,
      chatHistory: this.chatHistory.values(),
      timestamp: Date.now(),
    };
  }

  /** Apply a full state sync received from a peer */
  applyFullState(state: SerializedCRDTRoomState): void {
    // Merge vector clocks
    this.vectorClock = mergeClock(this.vectorClock, state.vectorClock);

    // Apply entity states
    if (state.entities) {
      for (const [entityId, entry] of Object.entries(state.entities)) {
        if (entry && typeof entry === 'object' && 'value' in entry && entry.value) {
          const existing = this.entityStates.get(entityId) as EntityCRDTState | null | undefined;
          if (!existing || entry.timestamp > (existing as any)?.lastUpdated) {
            this.entityStates.set(entityId, entry.value as EntityCRDTState, entry.timestamp);
          }
        }
      }
    }

    // Apply player data
    if (state.playerData) {
      for (const [playerId, entry] of Object.entries(state.playerData)) {
        if (entry && typeof entry === 'object' && 'value' in entry && entry.value) {
          this.playerData.set(playerId, entry.value as PlayerPresenceData, entry.timestamp);
        }
      }
    }

    // Apply player presence
    if (state.players) {
      for (const playerId of state.players) {
        if (!this.playerPresence.has(playerId)) {
          this.playerPresence.add(playerId);
        }
      }
    }

    // Apply room metadata
    if (state.roomMetadata) {
      for (const [key, entry] of Object.entries(state.roomMetadata)) {
        if (entry && typeof entry === 'object' && 'value' in entry) {
          this.roomMetadata.set(key, (entry as any).value, (entry as any).timestamp);
        }
      }
    }

    this.emit('sync:full-state', { peerId: 'remote' });
    logger.info('Full state applied to CRDTRoom', { roomId: this.roomId });
  }

  // ===========================================================================
  // Network: Message Handlers
  // ===========================================================================

  private setupNetworkHandlers(): void {
    // Handle incoming deltas
    this.client.onMessage('crdtRoom:deltas', (msg) => {
      const payload = msg.payload as {
        roomId: string;
        sourceNodeId: string;
        deltas: Array<{
          crdtId: string;
          operation: string;
          args: unknown[];
          clock: VectorClock;
          timestamp: number;
        }>;
        vectorClock: VectorClock;
      };

      if (payload.roomId !== this.roomId) return;
      if (payload.sourceNodeId === this.localNodeId) return;

      this.handleIncomingDeltas(payload.sourceNodeId, payload.deltas, payload.vectorClock);
    });

    // Handle full sync request
    this.client.onMessage('crdtRoom:requestSync', (msg) => {
      const payload = msg.payload as {
        roomId: string;
        requesterId: string;
        vectorClock: VectorClock;
      };

      if (payload.roomId !== this.roomId) return;
      if (payload.requesterId === this.localNodeId) return;

      // Respond with full state
      this.client.send({
        type: 'crdtRoom:fullState',
        category: 'state' as MessageCategory,
        payload: {
          roomId: this.roomId,
          responderId: this.localNodeId,
          requesterId: payload.requesterId,
          state: this.serializeState(),
        },
        timestamp: Date.now(),
      });
    });

    // Handle full state response
    this.client.onMessage('crdtRoom:fullState', (msg) => {
      const payload = msg.payload as {
        roomId: string;
        responderId: string;
        requesterId: string;
        state: SerializedCRDTRoomState;
      };

      if (payload.roomId !== this.roomId) return;
      if (payload.requesterId !== this.localNodeId) return;

      this.applyFullState(payload.state);
    });

    // Handle player join notification
    this.client.onMessage('crdtRoom:join', (msg) => {
      const payload = msg.payload as { roomId: string; nodeId: string };
      if (payload.roomId !== this.roomId) return;
      if (payload.nodeId === this.localNodeId) return;

      // Peer just joined — send them our full state
      this.client.send({
        type: 'crdtRoom:fullState',
        category: 'state' as MessageCategory,
        payload: {
          roomId: this.roomId,
          responderId: this.localNodeId,
          requesterId: payload.nodeId,
          state: this.serializeState(),
        },
        timestamp: Date.now(),
      });
    });

    // Handle player leave notification
    this.client.onMessage('crdtRoom:leave', (msg) => {
      const payload = msg.payload as { roomId: string; nodeId: string };
      if (payload.roomId !== this.roomId) return;
      if (payload.nodeId === this.localNodeId) return;

      this.removePlayer(payload.nodeId, 'disconnected');
    });

    // Handle heartbeat
    this.client.onMessage('crdtRoom:heartbeat', (msg) => {
      const payload = msg.payload as {
        roomId: string;
        nodeId: string;
        timestamp: number;
      };

      if (payload.roomId !== this.roomId) return;
      if (payload.nodeId === this.localNodeId) return;

      // Update player heartbeat
      const player = this.getPlayer(payload.nodeId);
      if (player) {
        this.playerData.set(
          payload.nodeId,
          { ...player, lastHeartbeat: Date.now() },
          Date.now()
        );
      }
    });
  }

  /** Handle incoming deltas from a remote peer */
  private handleIncomingDeltas(
    sourceNodeId: string,
    deltas: Array<{
      crdtId: string;
      operation: string;
      args: unknown[];
      clock: VectorClock;
      timestamp: number;
    }>,
    remoteClock: VectorClock
  ): void {
    let applied = 0;

    for (const delta of deltas) {
      // Dedup check
      const deltaKey = `${sourceNodeId}:${delta.crdtId}:${delta.timestamp}`;
      if (this.appliedDeltaIds.has(deltaKey)) continue;
      this.appliedDeltaIds.add(deltaKey);

      // Trim dedup cache
      if (this.appliedDeltaIds.size > this.maxAppliedCache) {
        const iter = this.appliedDeltaIds.values();
        for (let i = 0; i < 1000; i++) {
          const next = iter.next();
          if (!next.done) this.appliedDeltaIds.delete(next.value);
        }
      }

      // Apply the delta to the appropriate CRDT
      try {
        this.applyDelta(delta.crdtId, delta.operation, delta.args, delta.timestamp);
        applied++;
      } catch (err: any) {
        logger.error('Failed to apply CRDT delta', {
          crdtId: delta.crdtId,
          operation: delta.operation,
          error: err.message,
        });
      }
    }

    // Merge vector clock
    this.vectorClock = mergeClock(this.vectorClock, remoteClock);

    this.deltasReceived += applied;

    if (applied > 0) {
      this.emit('sync:delta-received', {
        peerId: sourceNodeId,
        count: applied,
      });
    }
  }

  /** Apply a single delta operation to the appropriate CRDT */
  private applyDelta(
    crdtId: string,
    operation: string,
    args: unknown[],
    timestamp: number
  ): void {
    switch (crdtId) {
      case 'entityStates': {
        if (operation === 'set' && args.length >= 2) {
          const [entityId, state, ts] = args as [string, EntityCRDTState, number?];
          const existing = this.entityStates.get(entityId as string);
          this.entityStates.set(entityId, state, ts ?? timestamp);

          if (!existing) {
            this.emit('entity:added', { entityId, state });
          } else {
            this.emit('entity:updated', { entityId, state, delta: {} });
          }
        } else if (operation === 'delete' && args.length >= 1) {
          const [entityId] = args as [string];
          this.entityStates.delete(entityId);
          this.emit('entity:removed', { entityId });
        }
        break;
      }

      case 'playerPresence': {
        if (operation === 'add' && args.length >= 1) {
          const [playerId] = args as [string];
          this.playerPresence.add(playerId);
        } else if (operation === 'remove' && args.length >= 1) {
          const [playerId] = args as [string];
          this.playerPresence.remove(playerId);
        }
        break;
      }

      case 'playerData': {
        if (operation === 'set' && args.length >= 2) {
          const [playerId, data, ts] = args as [string, PlayerPresenceData, number?];
          this.playerData.set(playerId, data, ts ?? timestamp);
          this.emit('player:updated', { player: data });
        } else if (operation === 'delete' && args.length >= 1) {
          const [playerId] = args as [string];
          this.playerData.delete(playerId);
        }
        break;
      }

      case 'roomMetadata': {
        if (operation === 'set' && args.length >= 2) {
          const [key, value, ts] = args as [string, unknown, number?];
          this.roomMetadata.set(key, value, ts ?? timestamp);
          this.emit('room:metadata', { key, value });
        }
        break;
      }

      case 'chatHistory': {
        if (operation === 'append' && args.length >= 1) {
          const [entry] = args as [ChatEntry];
          this.chatHistory.append(entry);
          this.emit('chat:message', { entry });
        }
        break;
      }

      default:
        logger.warn('Unknown CRDT for delta', { crdtId });
    }
  }

  // ===========================================================================
  // Heartbeat & Presence
  // ===========================================================================

  /** Send heartbeat to peers */
  private sendHeartbeat(): void {
    this.client.send({
      type: 'crdtRoom:heartbeat',
      category: 'state' as MessageCategory,
      payload: {
        roomId: this.roomId,
        nodeId: this.localNodeId,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });

    // Update own heartbeat
    const self = this.getPlayer(this.localNodeId);
    if (self) {
      this.playerData.set(
        this.localNodeId,
        { ...self, lastHeartbeat: Date.now() },
        Date.now()
      );
    }
  }

  /** Check for stale players and remove them */
  private checkPresence(): void {
    const now = Date.now();
    const staleThreshold = this.config.presenceTimeoutMs;

    for (const playerId of this.getPlayerIds()) {
      if (playerId === this.localNodeId) continue;

      const player = this.getPlayer(playerId);
      if (player && now - player.lastHeartbeat > staleThreshold) {
        logger.info('Removing stale player', { playerId, roomId: this.roomId });
        this.removePlayer(playerId, 'timeout');
      }
    }
  }

  // ===========================================================================
  // Vector Clock
  // ===========================================================================

  /** Increment the local vector clock */
  private tickClock(): void {
    this.vectorClock = incrementClock(this.vectorClock, this.localNodeId);
  }

  /** Get the current vector clock */
  getVectorClock(): VectorClock {
    return { ...this.vectorClock };
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  on<T extends CRDTRoomEventType>(
    event: T,
    handler: CRDTRoomEventHandler<T>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);

    return () => this.off(event, handler);
  }

  off<T extends CRDTRoomEventType>(
    event: T,
    handler: CRDTRoomEventHandler<T>
  ): void {
    this.eventListeners.get(event)?.delete(handler);
  }

  private emit<T extends CRDTRoomEventType>(
    event: T,
    data: CRDTRoomEventMap[T]
  ): void {
    this.eventListeners.get(event)?.forEach((handler) => {
      try {
        (handler as CRDTRoomEventHandler<T>)(data);
      } catch (err) {
        logger.error('Event handler error', { event, error: String(err) });
      }
    });
  }

  // ===========================================================================
  // Metrics & Stats
  // ===========================================================================

  /** Get room statistics */
  getStats(): {
    roomId: string;
    roomName: string;
    players: number;
    maxPlayers: number;
    entities: number;
    regions: number;
    deltasSent: number;
    deltasReceived: number;
    conflictsResolved: number;
    bytesSentEstimate: number;
    bytesReceivedEstimate: number;
    pendingDeltas: number;
    vectorClockSize: number;
    chatMessages: number;
    syncTiers: Record<SyncTier, number>;
  } {
    const tierCounts: Record<SyncTier, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0,
      dormant: 0,
    };
    for (const tier of this.entitySyncTiers.values()) {
      tierCounts[tier]++;
    }

    return {
      roomId: this.roomId,
      roomName: this.getRoomName(),
      players: this.getPlayerCount(),
      maxPlayers: this.config.maxPlayers,
      entities: this.getEntityCount(),
      regions: this.regions.size,
      deltasSent: this.deltasSent,
      deltasReceived: this.deltasReceived,
      conflictsResolved: this.conflictsResolved,
      bytesSentEstimate: this.bytesSentEstimate,
      bytesReceivedEstimate: this.bytesReceivedEstimate,
      pendingDeltas: this.pendingDeltas.length,
      vectorClockSize: Object.keys(this.vectorClock).length,
      chatMessages: this.chatHistory.length(),
      syncTiers: tierCounts,
    };
  }

  /** Get room info in the standard RoomInfo format */
  getRoomInfo(): RoomInfo {
    return {
      id: this.roomId,
      name: this.getRoomName(),
      playerCount: this.getPlayerCount(),
      maxPlayers: this.config.maxPlayers,
      state: this.roomState,
      isPrivate: this.config.isPrivate,
      hostId: this.localNodeId, // In peer-to-peer CRDT rooms, each node is its own authority
      createdAt: (this.roomMetadata.get('createdAt') as number) || Date.now(),
      metadata: this.getAllRoomMetadata(),
    };
  }
}
