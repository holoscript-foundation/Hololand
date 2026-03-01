/**
 * SpatialCRDTSync — Bridges CRDTRoom entity state to a Three.js scene graph
 *
 * Provides:
 * - Automatic Three.js Object3D creation/update/removal from CRDT entity state
 * - Smooth interpolation between remote state updates
 * - Interest-based rendering (only render entities in view)
 * - Player avatar management (spawn/despawn/move)
 * - Optimized frame-budget rendering (limits update cost per frame)
 * - Sync tier awareness (critical entities update every frame, low-priority at reduced rate)
 *
 * Usage:
 *   const room = new CRDTRoom(client, nodeId, config);
 *   const sync = new SpatialCRDTSync(room, scene, camera);
 *   sync.start();
 *   // In render loop:
 *   sync.update(delta);
 *
 * @module SpatialCRDTSync
 */

import { logger } from './logger';
import type { Vector3 as NetVector3 } from './types';
import type { CRDTRoom, EntityCRDTState, PlayerPresenceData, SyncTier } from './CRDTRoom';

// =============================================================================
// Types
// =============================================================================

/** Three.js-compatible 3D object interface (avoids hard dependency on Three) */
export interface SpatialObject3D {
  position: { x: number; y: number; z: number; set(x: number, y: number, z: number): void };
  rotation: { x: number; y: number; z: number; set(x: number, y: number, z: number): void };
  scale: { x: number; y: number; z: number; set(x: number, y: number, z: number): void };
  visible: boolean;
  name: string;
  userData: Record<string, unknown>;
  parent: SpatialObject3D | null;
}

/** Scene interface (subset of THREE.Scene) */
export interface SpatialScene {
  add(object: SpatialObject3D): void;
  remove(object: SpatialObject3D): void;
  getObjectByName(name: string): SpatialObject3D | undefined;
  children: SpatialObject3D[];
}

/** Camera interface for view frustum calculations */
export interface SpatialCamera {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

/** Factory for creating spatial objects from entity state */
export type EntityObjectFactory = (
  entityState: EntityCRDTState
) => SpatialObject3D;

/** Factory for creating player avatar objects */
export type AvatarFactory = (
  playerData: PlayerPresenceData
) => SpatialObject3D;

/** Interpolation state for smooth movement */
interface InterpolationState {
  entityId: string;
  sourcePosition: NetVector3;
  targetPosition: NetVector3;
  sourceRotation: NetVector3;
  targetRotation: NetVector3;
  progress: number; // 0 to 1
  duration: number; // ms
  startTime: number;
}

/** Configuration for spatial CRDT sync */
export interface SpatialCRDTSyncConfig {
  /** Scene to synchronize objects into */
  scene: SpatialScene;
  /** Camera for view-distance calculations */
  camera: SpatialCamera;
  /** CRDT room to synchronize from */
  room: CRDTRoom;
  /** Factory to create 3D objects for entities (optional; default creates stub objects) */
  entityFactory?: EntityObjectFactory;
  /** Factory to create avatar objects for players (optional) */
  avatarFactory?: AvatarFactory;
  /** Enable smooth interpolation for remote entity movement */
  interpolation?: boolean;
  /** Interpolation duration in seconds */
  interpolationDuration?: number;
  /** Maximum entities to update per frame (frame budget) */
  maxUpdatesPerFrame?: number;
  /** View distance for visibility culling */
  viewDistance?: number;
  /** Prefix for entity object names in the scene */
  entityPrefix?: string;
  /** Prefix for avatar object names in the scene */
  avatarPrefix?: string;
  /** How often to sync entity positions to network (Hz) */
  localSyncRateHz?: number;
  /** Sync tiers and their frame-skip counts */
  tierFrameSkips?: Record<SyncTier, number>;
}

// =============================================================================
// Default factories
// =============================================================================

/** Default entity factory creates a minimal stub object */
function defaultEntityFactory(state: EntityCRDTState): SpatialObject3D {
  return {
    position: {
      x: state.position.x,
      y: state.position.y,
      z: state.position.z,
      set(x: number, y: number, z: number) {
        this.x = x; this.y = y; this.z = z;
      },
    },
    rotation: {
      x: state.rotation.x,
      y: state.rotation.y,
      z: state.rotation.z,
      set(x: number, y: number, z: number) {
        this.x = x; this.y = y; this.z = z;
      },
    },
    scale: {
      x: state.scale.x,
      y: state.scale.y,
      z: state.scale.z,
      set(x: number, y: number, z: number) {
        this.x = x; this.y = y; this.z = z;
      },
    },
    visible: true,
    name: `entity_${state.entityId}`,
    userData: { entityId: state.entityId, entityType: state.entityType },
    parent: null,
  };
}

function defaultAvatarFactory(data: PlayerPresenceData): SpatialObject3D {
  return {
    position: {
      x: data.position.x,
      y: data.position.y,
      z: data.position.z,
      set(x: number, y: number, z: number) {
        this.x = x; this.y = y; this.z = z;
      },
    },
    rotation: {
      x: data.rotation.x,
      y: data.rotation.y,
      z: data.rotation.z,
      set(x: number, y: number, z: number) {
        this.x = x; this.y = y; this.z = z;
      },
    },
    scale: {
      x: 1, y: 1, z: 1,
      set(x: number, y: number, z: number) {
        this.x = x; this.y = y; this.z = z;
      },
    },
    visible: true,
    name: `avatar_${data.playerId}`,
    userData: { playerId: data.playerId, displayName: data.displayName },
    parent: null,
  };
}

// =============================================================================
// SpatialCRDTSync
// =============================================================================

export class SpatialCRDTSync {
  private scene: SpatialScene;
  private camera: SpatialCamera;
  private room: CRDTRoom;
  private entityFactory: EntityObjectFactory;
  private avatarFactory: AvatarFactory;

  // Config
  private interpolationEnabled: boolean;
  private interpolationDuration: number;
  private maxUpdatesPerFrame: number;
  private viewDistance: number;
  private entityPrefix: string;
  private avatarPrefix: string;
  private localSyncRateHz: number;
  private tierFrameSkips: Record<SyncTier, number>;

  // State tracking
  private managedEntities: Map<string, SpatialObject3D> = new Map();
  private managedAvatars: Map<string, SpatialObject3D> = new Map();
  private interpolationStates: Map<string, InterpolationState> = new Map();
  private entityVisibility: Map<string, boolean> = new Map();

  // Frame management
  private frameCount: number = 0;
  private updateQueue: string[] = [];
  private lastLocalSync: number = 0;
  private localSyncInterval: number;

  // Event unsubscribers
  private unsubscribers: Array<() => void> = [];

  // Running state
  private running: boolean = false;

  constructor(config: SpatialCRDTSyncConfig) {
    this.scene = config.scene;
    this.camera = config.camera;
    this.room = config.room;
    this.entityFactory = config.entityFactory ?? defaultEntityFactory;
    this.avatarFactory = config.avatarFactory ?? defaultAvatarFactory;

    this.interpolationEnabled = config.interpolation ?? true;
    this.interpolationDuration = config.interpolationDuration ?? 0.1;
    this.maxUpdatesPerFrame = config.maxUpdatesPerFrame ?? 50;
    this.viewDistance = config.viewDistance ?? 100;
    this.entityPrefix = config.entityPrefix ?? 'entity_';
    this.avatarPrefix = config.avatarPrefix ?? 'avatar_';
    this.localSyncRateHz = config.localSyncRateHz ?? 20;
    this.localSyncInterval = 1000 / this.localSyncRateHz;

    this.tierFrameSkips = config.tierFrameSkips ?? {
      critical: 1, // every frame
      high: 2,     // every 2 frames
      normal: 4,   // every 4 frames
      low: 8,      // every 8 frames
      dormant: 30, // every 30 frames
    };

    logger.info('SpatialCRDTSync created', {
      roomId: this.room.roomId,
      viewDistance: this.viewDistance,
      interpolation: this.interpolationEnabled,
    });
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /** Start synchronization between CRDT room and scene */
  start(): void {
    if (this.running) return;
    this.running = true;

    // Subscribe to room events
    this.unsubscribers.push(
      this.room.on('entity:added', (event) => this.onEntityAdded(event.entityId, event.state))
    );

    this.unsubscribers.push(
      this.room.on('entity:updated', (event) => this.onEntityUpdated(event.entityId, event.state))
    );

    this.unsubscribers.push(
      this.room.on('entity:removed', (event) => this.onEntityRemoved(event.entityId))
    );

    this.unsubscribers.push(
      this.room.on('player:joined', (event) => this.onPlayerJoined(event.player))
    );

    this.unsubscribers.push(
      this.room.on('player:left', (event) => this.onPlayerLeft(event.playerId))
    );

    this.unsubscribers.push(
      this.room.on('player:updated', (event) => this.onPlayerUpdated(event.player))
    );

    // Sync existing entities
    this.syncAllEntities();
    this.syncAllPlayers();

    logger.info('SpatialCRDTSync started');
  }

  /** Stop synchronization */
  stop(): void {
    if (!this.running) return;
    this.running = false;

    // Unsubscribe from events
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];

    logger.info('SpatialCRDTSync stopped');
  }

  /** Clean up all managed scene objects */
  dispose(): void {
    this.stop();

    // Remove all managed entities from scene
    for (const [, obj] of this.managedEntities) {
      this.scene.remove(obj);
    }
    this.managedEntities.clear();

    // Remove all managed avatars from scene
    for (const [, obj] of this.managedAvatars) {
      this.scene.remove(obj);
    }
    this.managedAvatars.clear();

    this.interpolationStates.clear();
    this.entityVisibility.clear();
    this.updateQueue = [];

    logger.info('SpatialCRDTSync disposed');
  }

  // ===========================================================================
  // Frame Update (call from render loop)
  // ===========================================================================

  /** Call this every frame from the render loop */
  update(deltaTime: number): void {
    if (!this.running) return;

    this.frameCount++;

    // 1. Process interpolations
    this.updateInterpolations(deltaTime);

    // 2. Process update queue (frame-budgeted)
    this.processUpdateQueue();

    // 3. Update visibility based on camera position
    this.updateVisibility();

    // 4. Sync local entity positions to network (rate-limited)
    const now = Date.now();
    if (now - this.lastLocalSync >= this.localSyncInterval) {
      this.syncLocalEntitiesToNetwork();
      this.lastLocalSync = now;
    }
  }

  // ===========================================================================
  // Entity Handlers
  // ===========================================================================

  private onEntityAdded(entityId: string, state: EntityCRDTState): void {
    if (this.managedEntities.has(entityId)) return;

    const obj = this.entityFactory(state);
    obj.name = `${this.entityPrefix}${entityId}`;
    obj.userData.entityId = entityId;
    obj.userData.entityType = state.entityType;
    obj.userData.ownerId = state.ownerId;

    this.scene.add(obj);
    this.managedEntities.set(entityId, obj);

    // Set initial visibility
    this.updateEntityVisibility(entityId, state);
  }

  private onEntityUpdated(entityId: string, state: EntityCRDTState): void {
    const obj = this.managedEntities.get(entityId);
    if (!obj) {
      // Entity might have been added remotely; create it
      this.onEntityAdded(entityId, state);
      return;
    }

    // Check if this is a local entity (skip remote update to avoid jitter)
    if (state.ownerId === this.room.localNodeId) {
      return; // Local entities are controlled by the scene, not the network
    }

    if (this.interpolationEnabled) {
      // Start interpolation toward new state
      this.startInterpolation(entityId, obj, state);
    } else {
      // Immediate update
      obj.position.set(state.position.x, state.position.y, state.position.z);
      obj.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
      obj.scale.set(state.scale.x, state.scale.y, state.scale.z);
    }

    // Update visibility
    this.updateEntityVisibility(entityId, state);
  }

  private onEntityRemoved(entityId: string): void {
    const obj = this.managedEntities.get(entityId);
    if (obj) {
      this.scene.remove(obj);
      this.managedEntities.delete(entityId);
    }
    this.interpolationStates.delete(entityId);
    this.entityVisibility.delete(entityId);
  }

  // ===========================================================================
  // Player Avatar Handlers
  // ===========================================================================

  private onPlayerJoined(player: PlayerPresenceData): void {
    // Don't create avatar for local player (they have their own camera/avatar)
    if (player.playerId === this.room.localNodeId) return;

    if (this.managedAvatars.has(player.playerId)) return;

    const avatar = this.avatarFactory(player);
    avatar.name = `${this.avatarPrefix}${player.playerId}`;
    avatar.userData.playerId = player.playerId;
    avatar.userData.displayName = player.displayName;

    this.scene.add(avatar);
    this.managedAvatars.set(player.playerId, avatar);
  }

  private onPlayerLeft(playerId: string): void {
    const avatar = this.managedAvatars.get(playerId);
    if (avatar) {
      this.scene.remove(avatar);
      this.managedAvatars.delete(playerId);
    }
    this.interpolationStates.delete(`avatar_${playerId}`);
  }

  private onPlayerUpdated(player: PlayerPresenceData): void {
    if (player.playerId === this.room.localNodeId) return;

    const avatar = this.managedAvatars.get(player.playerId);
    if (!avatar) {
      this.onPlayerJoined(player);
      return;
    }

    if (this.interpolationEnabled) {
      this.startAvatarInterpolation(player.playerId, avatar, player);
    } else {
      avatar.position.set(player.position.x, player.position.y, player.position.z);
      avatar.rotation.set(player.rotation.x, player.rotation.y, player.rotation.z);
    }
  }

  // ===========================================================================
  // Interpolation
  // ===========================================================================

  private startInterpolation(
    entityId: string,
    obj: SpatialObject3D,
    state: EntityCRDTState
  ): void {
    this.interpolationStates.set(entityId, {
      entityId,
      sourcePosition: {
        x: obj.position.x,
        y: obj.position.y,
        z: obj.position.z,
      },
      targetPosition: state.position,
      sourceRotation: {
        x: obj.rotation.x,
        y: obj.rotation.y,
        z: obj.rotation.z,
      },
      targetRotation: state.rotation,
      progress: 0,
      duration: this.interpolationDuration,
      startTime: Date.now(),
    });
  }

  private startAvatarInterpolation(
    playerId: string,
    obj: SpatialObject3D,
    data: PlayerPresenceData
  ): void {
    this.interpolationStates.set(`avatar_${playerId}`, {
      entityId: `avatar_${playerId}`,
      sourcePosition: {
        x: obj.position.x,
        y: obj.position.y,
        z: obj.position.z,
      },
      targetPosition: data.position,
      sourceRotation: {
        x: obj.rotation.x,
        y: obj.rotation.y,
        z: obj.rotation.z,
      },
      targetRotation: data.rotation,
      progress: 0,
      duration: this.interpolationDuration,
      startTime: Date.now(),
    });
  }

  private updateInterpolations(deltaTime: number): void {
    const completed: string[] = [];

    for (const [key, interp] of this.interpolationStates) {
      interp.progress += deltaTime / interp.duration;

      if (interp.progress >= 1) {
        interp.progress = 1;
        completed.push(key);
      }

      const t = this.smoothstep(interp.progress);

      // Determine which object to update
      let obj: SpatialObject3D | undefined;
      if (key.startsWith('avatar_')) {
        const playerId = key.replace('avatar_', '');
        obj = this.managedAvatars.get(playerId);
      } else {
        obj = this.managedEntities.get(key);
      }

      if (obj) {
        // Lerp position
        obj.position.set(
          this.lerp(interp.sourcePosition.x, interp.targetPosition.x, t),
          this.lerp(interp.sourcePosition.y, interp.targetPosition.y, t),
          this.lerp(interp.sourcePosition.z, interp.targetPosition.z, t)
        );

        // Lerp rotation
        obj.rotation.set(
          this.lerpAngle(interp.sourceRotation.x, interp.targetRotation.x, t),
          this.lerpAngle(interp.sourceRotation.y, interp.targetRotation.y, t),
          this.lerpAngle(interp.sourceRotation.z, interp.targetRotation.z, t)
        );
      }
    }

    // Clean up completed interpolations
    for (const key of completed) {
      this.interpolationStates.delete(key);
    }
  }

  // ===========================================================================
  // Visibility Culling
  // ===========================================================================

  private updateVisibility(): void {
    const camPos = this.camera.position;
    const viewDistSq = this.viewDistance * this.viewDistance;

    for (const [entityId, obj] of this.managedEntities) {
      const dx = obj.position.x - camPos.x;
      const dy = obj.position.y - camPos.y;
      const dz = obj.position.z - camPos.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      const visible = distSq <= viewDistSq;
      obj.visible = visible;
      this.entityVisibility.set(entityId, visible);
    }

    // Avatars are always visible within view distance
    for (const [, avatar] of this.managedAvatars) {
      const dx = avatar.position.x - camPos.x;
      const dy = avatar.position.y - camPos.y;
      const dz = avatar.position.z - camPos.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      avatar.visible = distSq <= viewDistSq;
    }
  }

  private updateEntityVisibility(entityId: string, state: EntityCRDTState): void {
    const camPos = this.camera.position;
    const dx = state.position.x - camPos.x;
    const dy = state.position.y - camPos.y;
    const dz = state.position.z - camPos.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const visible = distSq <= this.viewDistance * this.viewDistance;

    this.entityVisibility.set(entityId, visible);

    const obj = this.managedEntities.get(entityId);
    if (obj) {
      obj.visible = visible;
    }
  }

  // ===========================================================================
  // Frame-Budgeted Update Queue
  // ===========================================================================

  private processUpdateQueue(): void {
    // Re-populate queue if empty
    if (this.updateQueue.length === 0) {
      const entityIds = this.room.getEntityIds();
      // Sort by sync tier priority
      this.updateQueue = entityIds.filter((id) => {
        const tier = this.room.getEntitiesBySyncTier('critical').includes(id)
          ? 'critical'
          : this.room.getEntitiesBySyncTier('high').includes(id)
          ? 'high'
          : 'normal';

        const skip = this.tierFrameSkips[tier];
        return this.frameCount % skip === 0;
      });
    }

    // Process up to maxUpdatesPerFrame
    let processed = 0;
    while (this.updateQueue.length > 0 && processed < this.maxUpdatesPerFrame) {
      const entityId = this.updateQueue.shift()!;
      const state = this.room.getEntity(entityId);
      if (state) {
        const obj = this.managedEntities.get(entityId);
        if (obj && !this.interpolationStates.has(entityId)) {
          // Apply current CRDT state to scene object
          obj.position.set(state.position.x, state.position.y, state.position.z);
          obj.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
          obj.scale.set(state.scale.x, state.scale.y, state.scale.z);
        }
      }
      processed++;
    }
  }

  // ===========================================================================
  // Local Entity Sync (Scene -> Network)
  // ===========================================================================

  /** Read positions of locally-owned scene objects and push to CRDT room */
  private syncLocalEntitiesToNetwork(): void {
    const localEntities = this.room.getEntitiesByOwner(this.room.localNodeId);

    for (const entity of localEntities) {
      const obj = this.managedEntities.get(entity.entityId);
      if (!obj) continue;

      // Check if position changed
      const posChanged =
        Math.abs(obj.position.x - entity.position.x) > 0.001 ||
        Math.abs(obj.position.y - entity.position.y) > 0.001 ||
        Math.abs(obj.position.z - entity.position.z) > 0.001;

      const rotChanged =
        Math.abs(obj.rotation.x - entity.rotation.x) > 0.001 ||
        Math.abs(obj.rotation.y - entity.rotation.y) > 0.001 ||
        Math.abs(obj.rotation.z - entity.rotation.z) > 0.001;

      if (posChanged || rotChanged) {
        this.room.updateEntity(entity.entityId, {
          position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
          rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
          scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
        });
      }
    }
  }

  // ===========================================================================
  // Bulk Sync
  // ===========================================================================

  /** Sync all current CRDT entities to the scene */
  private syncAllEntities(): void {
    const entities = this.room.getAllEntities();
    for (const entity of entities) {
      this.onEntityAdded(entity.entityId, entity);
    }
  }

  /** Sync all current players to the scene as avatars */
  private syncAllPlayers(): void {
    const players = this.room.getAllPlayers();
    for (const player of players) {
      this.onPlayerJoined(player);
    }
  }

  // ===========================================================================
  // Math Utilities
  // ===========================================================================

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    // Shortest-path angle interpolation
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  // ===========================================================================
  // Accessors
  // ===========================================================================

  /** Get all managed entity objects */
  getManagedEntities(): Map<string, SpatialObject3D> {
    return new Map(this.managedEntities);
  }

  /** Get all managed avatar objects */
  getManagedAvatars(): Map<string, SpatialObject3D> {
    return new Map(this.managedAvatars);
  }

  /** Get entity object by ID */
  getEntityObject(entityId: string): SpatialObject3D | undefined {
    return this.managedEntities.get(entityId);
  }

  /** Get avatar object by player ID */
  getAvatarObject(playerId: string): SpatialObject3D | undefined {
    return this.managedAvatars.get(playerId);
  }

  /** Check if an entity is visible */
  isEntityVisible(entityId: string): boolean {
    return this.entityVisibility.get(entityId) ?? false;
  }

  /** Get sync stats */
  getStats(): {
    managedEntities: number;
    managedAvatars: number;
    activeInterpolations: number;
    visibleEntities: number;
    updateQueueSize: number;
    frameCount: number;
  } {
    let visibleCount = 0;
    for (const v of this.entityVisibility.values()) {
      if (v) visibleCount++;
    }

    return {
      managedEntities: this.managedEntities.size,
      managedAvatars: this.managedAvatars.size,
      activeInterpolations: this.interpolationStates.size,
      visibleEntities: visibleCount,
      updateQueueSize: this.updateQueue.length,
      frameCount: this.frameCount,
    };
  }
}
