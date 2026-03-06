/**
 * player.ts — Player synchronization classes
 *
 * Exports:
 *  - TransformInterpolator: smooth position/rotation interpolation
 *  - PlayerSyncManager: sync player state across network
 *  - VoiceChatManager: voice chat coordination
 *  - RPCManager: remote procedure call system
 *  - ObjectSyncManager: object ownership & sync
 */

import type { NetworkClient } from './NetworkClient';

// ============================================================================
// Common Types
// ============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface TransformState {
  position: Vec3;
  rotation: Quaternion;
  velocity?: Vec3;
  timestamp: number;
}

// ============================================================================
// TransformInterpolator
// ============================================================================

export interface InterpolatorConfig {
  lerpFactor?: number;
  slerpFactor?: number;
  maxExtrapolationMs?: number;
  snapThreshold?: number;
  bufferSize?: number;
}

interface InterpolationSnapshot {
  state: TransformState;
  receivedAt: number;
}

export class TransformInterpolator {
  private config: Required<InterpolatorConfig>;
  private buffer: InterpolationSnapshot[] = [];
  private current: TransformState;

  constructor(config?: InterpolatorConfig) {
    this.config = {
      lerpFactor: config?.lerpFactor ?? 0.15,
      slerpFactor: config?.slerpFactor ?? 0.15,
      maxExtrapolationMs: config?.maxExtrapolationMs ?? 200,
      snapThreshold: config?.snapThreshold ?? 5.0,
      bufferSize: config?.bufferSize ?? 10,
    };

    this.current = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      timestamp: Date.now(),
    };
  }

  pushState(state: TransformState): void {
    this.buffer.push({ state, receivedAt: Date.now() });
    if (this.buffer.length > this.config.bufferSize) {
      this.buffer.shift();
    }
  }

  getInterpolated(now?: number): TransformState {
    const time = now ?? Date.now();

    if (this.buffer.length === 0) return this.current;

    const latest = this.buffer[this.buffer.length - 1].state;

    // Snap if too far away
    const dist = this.distanceSq(this.current.position, latest.position);
    if (dist > this.config.snapThreshold * this.config.snapThreshold) {
      this.current = { ...latest, timestamp: time };
      return this.current;
    }

    // Lerp position
    this.current.position = this.lerp3(
      this.current.position,
      latest.position,
      this.config.lerpFactor
    );

    // Slerp rotation
    this.current.rotation = this.slerpQuat(
      this.current.rotation,
      latest.rotation,
      this.config.slerpFactor
    );

    this.current.timestamp = time;
    return this.current;
  }

  getCurrent(): TransformState {
    return this.current;
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  reset(state?: TransformState): void {
    this.buffer = [];
    if (state) {
      this.current = { ...state };
    }
  }

  private lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  }

  private slerpQuat(a: Quaternion, b: Quaternion, t: number): Quaternion {
    // Simplified linear slerp for network sync (accurate enough at small deltas)
    let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    const target = { ...b };

    if (dot < 0) {
      dot = -dot;
      target.x = -target.x;
      target.y = -target.y;
      target.z = -target.z;
      target.w = -target.w;
    }

    const result = {
      x: a.x + (target.x - a.x) * t,
      y: a.y + (target.y - a.y) * t,
      z: a.z + (target.z - a.z) * t,
      w: a.w + (target.w - a.w) * t,
    };

    // Normalize
    const len = Math.sqrt(
      result.x ** 2 + result.y ** 2 + result.z ** 2 + result.w ** 2
    );
    if (len > 0) {
      result.x /= len;
      result.y /= len;
      result.z /= len;
      result.w /= len;
    }

    return result;
  }

  private distanceSq(a: Vec3, b: Vec3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
  }
}

// ============================================================================
// PlayerSyncManager
// ============================================================================

export interface PlayerState {
  playerId: string;
  transform: TransformState;
  health?: number;
  animation?: string;
  customData?: Record<string, any>;
  lastUpdate: number;
}

export interface PlayerSyncConfig {
  client: NetworkClient;
  localPlayerId: string;
  syncRate?: number;
  interpolation?: boolean;
  deadReckoningMs?: number;
}

export class PlayerSyncManager {
  private client: NetworkClient;
  private localPlayerId: string;
  private syncRate: number;
  private players: Map<string, PlayerState> = new Map();
  private interpolators: Map<string, TransformInterpolator> = new Map();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private localTransform: TransformState;
  private listeners: Map<string, Set<(players: Map<string, PlayerState>) => void>> =
    new Map();

  constructor(config: PlayerSyncConfig) {
    this.client = config.client;
    this.localPlayerId = config.localPlayerId;
    this.syncRate = config.syncRate ?? 20;
    this.localTransform = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      timestamp: Date.now(),
    };

    this.client.onMessage('playerUpdate', (msg) => {
      this.handlePlayerUpdate(msg.payload);
    });

    this.client.onMessage('playerJoin', (msg) => {
      this.handlePlayerJoin(msg.payload);
    });

    this.client.onMessage('playerLeave', (msg) => {
      this.handlePlayerLeave(msg.payload);
    });
  }

  start(): void {
    if (this.syncTimer) return;
    const interval = 1000 / this.syncRate;
    this.syncTimer = setInterval(() => this.sendLocalState(), interval);
  }

  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  setLocalTransform(transform: TransformState): void {
    this.localTransform = transform;
  }

  getPlayer(playerId: string): PlayerState | undefined {
    return this.players.get(playerId);
  }

  getAllPlayers(): Map<string, PlayerState> {
    return new Map(this.players);
  }

  getLocalPlayerId(): string {
    return this.localPlayerId;
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  getInterpolatedTransform(playerId: string): TransformState | undefined {
    return this.interpolators.get(playerId)?.getInterpolated();
  }

  onChange(
    event: string,
    handler: (players: Map<string, PlayerState>) => void
  ): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  private sendLocalState(): void {
    this.client.send({
      type: 'playerUpdate',
      category: 'player',
      payload: {
        playerId: this.localPlayerId,
        transform: this.localTransform,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    });
  }

  private handlePlayerUpdate(payload: any): void {
    const { playerId, transform } = payload;
    if (playerId === this.localPlayerId) return;

    const existing = this.players.get(playerId);
    const state: PlayerState = {
      playerId,
      transform,
      health: payload.health ?? existing?.health,
      animation: payload.animation ?? existing?.animation,
      customData: payload.customData ?? existing?.customData,
      lastUpdate: Date.now(),
    };
    this.players.set(playerId, state);

    // Update interpolator
    let interp = this.interpolators.get(playerId);
    if (!interp) {
      interp = new TransformInterpolator();
      this.interpolators.set(playerId, interp);
    }
    interp.pushState(transform);

    this.emit('update');
  }

  private handlePlayerJoin(payload: any): void {
    const { playerId } = payload;
    this.players.set(playerId, {
      playerId,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        timestamp: Date.now(),
      },
      lastUpdate: Date.now(),
    });
    this.interpolators.set(playerId, new TransformInterpolator());
    this.emit('join');
  }

  private handlePlayerLeave(payload: any): void {
    const { playerId } = payload;
    this.players.delete(playerId);
    this.interpolators.delete(playerId);
    this.emit('leave');
  }

  private emit(event: string): void {
    this.listeners.get(event)?.forEach((h) => h(this.players));
  }
}

// ============================================================================
// VoiceChatManager
// ============================================================================

export interface VoiceChatConfig {
  client: NetworkClient;
  localPlayerId: string;
  spatialAudio?: boolean;
  maxDistance?: number;
  codec?: string;
}

export interface VoicePeer {
  playerId: string;
  muted: boolean;
  volume: number;
  speaking: boolean;
  distance?: number;
}

export class VoiceChatManager {
  private client: NetworkClient;
  private localPlayerId: string;
  private spatialAudio: boolean;
  private maxDistance: number;
  private muted: boolean = false;
  private peers: Map<string, VoicePeer> = new Map();
  private onSpeakingChangeHandlers: Set<(peer: VoicePeer) => void> = new Set();

  constructor(config: VoiceChatConfig) {
    this.client = config.client;
    this.localPlayerId = config.localPlayerId;
    this.spatialAudio = config.spatialAudio ?? true;
    this.maxDistance = config.maxDistance ?? 50;

    this.client.onMessage('voiceState', (msg) => {
      this.handleVoiceState(msg.payload);
    });
  }

  mute(): void {
    this.muted = true;
    this.client.send({
      type: 'voiceState',
      category: 'voice',
      payload: { playerId: this.localPlayerId, muted: true },
      timestamp: Date.now(),
    });
  }

  unmute(): void {
    this.muted = false;
    this.client.send({
      type: 'voiceState',
      category: 'voice',
      payload: { playerId: this.localPlayerId, muted: false },
      timestamp: Date.now(),
    });
  }

  isMuted(): boolean {
    return this.muted;
  }

  setPeerVolume(playerId: string, volume: number): void {
    const peer = this.peers.get(playerId);
    if (peer) peer.volume = Math.max(0, Math.min(1, volume));
  }

  mutePeer(playerId: string): void {
    const peer = this.peers.get(playerId);
    if (peer) peer.muted = true;
  }

  unmutePeer(playerId: string): void {
    const peer = this.peers.get(playerId);
    if (peer) peer.muted = false;
  }

  getPeer(playerId: string): VoicePeer | undefined {
    return this.peers.get(playerId);
  }

  getAllPeers(): Map<string, VoicePeer> {
    return new Map(this.peers);
  }

  isSpatialAudioEnabled(): boolean {
    return this.spatialAudio;
  }

  getMaxDistance(): number {
    return this.maxDistance;
  }

  onSpeakingChange(handler: (peer: VoicePeer) => void): () => void {
    this.onSpeakingChangeHandlers.add(handler);
    return () => this.onSpeakingChangeHandlers.delete(handler);
  }

  private handleVoiceState(payload: any): void {
    const { playerId, speaking, muted } = payload;
    if (playerId === this.localPlayerId) return;

    let peer = this.peers.get(playerId);
    if (!peer) {
      peer = { playerId, muted: false, volume: 1.0, speaking: false };
      this.peers.set(playerId, peer);
    }
    if (speaking !== undefined) {
      peer.speaking = speaking;
      this.onSpeakingChangeHandlers.forEach((h) => h(peer!));
    }
    if (muted !== undefined) peer.muted = muted;
  }
}

// ============================================================================
// RPCManager
// ============================================================================

export type RPCHandler = (args: any, callerId: string) => any | Promise<any>;

export interface RPCCall {
  id: string;
  method: string;
  args: any;
  callerId: string;
  timestamp: number;
}

export interface RPCResponse {
  id: string;
  result?: any;
  error?: string;
}

export class RPCManager {
  private client: NetworkClient;
  private handlers: Map<string, RPCHandler> = new Map();
  private pendingCalls: Map<
    string,
    { resolve: (v: any) => void; reject: (e: Error) => void; timeout: ReturnType<typeof setTimeout> }
  > = new Map();
  private callTimeout: number;
  private nextId: number = 1;

  constructor(client: NetworkClient, callTimeout?: number) {
    this.client = client;
    this.callTimeout = callTimeout ?? 10000;

    this.client.onMessage('rpcCall', (msg) => {
      this.handleRPCCall(msg.payload as RPCCall);
    });

    this.client.onMessage('rpcResponse', (msg) => {
      this.handleRPCResponse(msg.payload as RPCResponse);
    });
  }

  register(method: string, handler: RPCHandler): () => void {
    this.handlers.set(method, handler);
    return () => this.handlers.delete(method);
  }

  async call(method: string, args?: any, targetId?: string): Promise<any> {
    const id = `rpc_${this.nextId++}_${Date.now()}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(id);
        reject(new Error(`RPC call ${method} timed out`));
      }, this.callTimeout);

      this.pendingCalls.set(id, { resolve, reject, timeout });

      const message: any = {
        type: 'rpcCall',
        category: 'rpc',
        payload: {
          id,
          method,
          args: args ?? {},
          callerId: 'local',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };

      if (targetId) {
        message.payload.targetId = targetId;
      }

      this.client.send(message);
    });
  }

  getRegisteredMethods(): string[] {
    return [...this.handlers.keys()];
  }

  getPendingCallCount(): number {
    return this.pendingCalls.size;
  }

  private async handleRPCCall(call: RPCCall): Promise<void> {
    const handler = this.handlers.get(call.method);
    const response: RPCResponse = { id: call.id };

    if (!handler) {
      response.error = `Unknown RPC method: ${call.method}`;
    } else {
      try {
        response.result = await handler(call.args, call.callerId);
      } catch (err: any) {
        response.error = err.message || 'RPC handler error';
      }
    }

    this.client.send({
      type: 'rpcResponse',
      category: 'rpc',
      payload: response,
      timestamp: Date.now(),
    });
  }

  private handleRPCResponse(response: RPCResponse): void {
    const pending = this.pendingCalls.get(response.id);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingCalls.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error));
    } else {
      pending.resolve(response.result);
    }
  }
}

// ============================================================================
// ObjectSyncManager
// ============================================================================

export interface SyncedObject {
  objectId: string;
  ownerId: string;
  state: Record<string, any>;
  transform?: TransformState;
  lastUpdate: number;
}

export interface ObjectSyncConfig {
  client: NetworkClient;
  localPlayerId: string;
  syncRate?: number;
}

export class ObjectSyncManager {
  private client: NetworkClient;
  private localPlayerId: string;
  private syncRate: number;
  private objects: Map<string, SyncedObject> = new Map();
  private ownedObjects: Set<string> = new Set();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private dirtyObjects: Set<string> = new Set();
  private listeners: Map<string, Set<(obj: SyncedObject) => void>> = new Map();

  constructor(config: ObjectSyncConfig) {
    this.client = config.client;
    this.localPlayerId = config.localPlayerId;
    this.syncRate = config.syncRate ?? 20;

    this.client.onMessage('objectSync', (msg) => {
      this.handleObjectSync(msg.payload);
    });

    this.client.onMessage('ownershipTransfer', (msg) => {
      this.handleOwnershipTransfer(msg.payload);
    });
  }

  start(): void {
    if (this.syncTimer) return;
    const interval = 1000 / this.syncRate;
    this.syncTimer = setInterval(() => this.flush(), interval);
  }

  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  registerObject(objectId: string, initialState?: Record<string, any>): void {
    const obj: SyncedObject = {
      objectId,
      ownerId: this.localPlayerId,
      state: initialState ?? {},
      lastUpdate: Date.now(),
    };
    this.objects.set(objectId, obj);
    this.ownedObjects.add(objectId);
  }

  updateObject(objectId: string, state: Record<string, any>): void {
    const obj = this.objects.get(objectId);
    if (!obj) return;
    obj.state = { ...obj.state, ...state };
    obj.lastUpdate = Date.now();
    if (this.ownedObjects.has(objectId)) {
      this.dirtyObjects.add(objectId);
    }
  }

  updateTransform(objectId: string, transform: TransformState): void {
    const obj = this.objects.get(objectId);
    if (!obj) return;
    obj.transform = transform;
    obj.lastUpdate = Date.now();
    if (this.ownedObjects.has(objectId)) {
      this.dirtyObjects.add(objectId);
    }
  }

  requestOwnership(objectId: string): void {
    this.client.send({
      type: 'ownershipRequest',
      category: 'object',
      payload: { objectId, requesterId: this.localPlayerId },
      timestamp: Date.now(),
    });
  }

  releaseOwnership(objectId: string): void {
    this.ownedObjects.delete(objectId);
    this.client.send({
      type: 'ownershipRelease',
      category: 'object',
      payload: { objectId, playerId: this.localPlayerId },
      timestamp: Date.now(),
    });
  }

  getObject(objectId: string): SyncedObject | undefined {
    return this.objects.get(objectId);
  }

  getAllObjects(): Map<string, SyncedObject> {
    return new Map(this.objects);
  }

  getOwnedObjects(): string[] {
    return [...this.ownedObjects];
  }

  isOwner(objectId: string): boolean {
    return this.ownedObjects.has(objectId);
  }

  onObjectChange(
    objectId: string,
    handler: (obj: SyncedObject) => void
  ): () => void {
    if (!this.listeners.has(objectId))
      this.listeners.set(objectId, new Set());
    this.listeners.get(objectId)!.add(handler);
    return () => this.listeners.get(objectId)?.delete(handler);
  }

  private flush(): void {
    if (this.dirtyObjects.size === 0) return;

    for (const objectId of this.dirtyObjects) {
      const obj = this.objects.get(objectId);
      if (!obj) continue;

      this.client.send({
        type: 'objectSync',
        category: 'object',
        payload: {
          objectId: obj.objectId,
          ownerId: obj.ownerId,
          state: obj.state,
          transform: obj.transform,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });
    }
    this.dirtyObjects.clear();
  }

  private handleObjectSync(payload: any): void {
    const { objectId, ownerId, state, transform } = payload;
    if (this.ownedObjects.has(objectId)) return; // Don't overwrite locally owned

    const obj: SyncedObject = {
      objectId,
      ownerId,
      state: state ?? {},
      transform,
      lastUpdate: Date.now(),
    };
    this.objects.set(objectId, obj);
    this.listeners.get(objectId)?.forEach((h) => h(obj));
    this.listeners.get('*')?.forEach((h) => h(obj));
  }

  private handleOwnershipTransfer(payload: any): void {
    const { objectId, newOwnerId } = payload;
    const obj = this.objects.get(objectId);
    if (!obj) return;

    obj.ownerId = newOwnerId;
    if (newOwnerId === this.localPlayerId) {
      this.ownedObjects.add(objectId);
    } else {
      this.ownedObjects.delete(objectId);
    }
  }
}
