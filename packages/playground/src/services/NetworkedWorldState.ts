/**
 * Networked World State Service - Tier 3
 * Real-time multiplayer world synchronization
 */

import { EventEmitter } from 'eventemitter3';

export interface NetworkedObject {
  id: string;
  owner: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  velocity?: [number, number, number];
  angularVelocity?: [number, number, number];
  properties: Record<string, any>;
  timestamp: number;
  version: number;
}

export interface WorldState {
  id: string;
  name: string;
  version: number;
  objects: Map<string, NetworkedObject>;
  physics: PhysicsState;
  timestamp: number;
}

export interface PhysicsState {
  gravity: [number, number, number];
  timeScale: number;
  constraints: PhysicsConstraint[];
}

export interface PhysicsConstraint {
  id: string;
  type: 'joint' | 'spring' | 'distance' | 'hinge' | 'ball-socket';
  bodyA: string;
  bodyB?: string;
  anchorA: [number, number, number];
  anchorB?: [number, number, number];
  config: Record<string, number>;
}

export interface StateUpdate {
  type: 'create' | 'update' | 'delete' | 'physics' | 'constraint';
  objectId?: string;
  data: any;
  timestamp: number;
  userId: string;
  sequenceNumber: number;
}

export class NetworkedWorldState extends EventEmitter {
  private world: WorldState;
  private pendingUpdates: StateUpdate[] = [];
  private sequenceNumber = 0;
  private userId: string;
  private websocket: WebSocket | null = null;
  private syncInterval: number | null = null;
  private conflictResolver: ConflictResolver;

  constructor(worldId: string, userId: string, wsUrl: string = 'ws://localhost:3000') {
    super();
    this.userId = userId;
    this.world = {
      id: worldId,
      name: `World-${worldId}`,
      version: 1,
      objects: new Map(),
      physics: {
        gravity: [0, -9.81, 0],
        timeScale: 1,
        constraints: [],
      },
      timestamp: Date.now(),
    };
    this.conflictResolver = new ConflictResolver();
    this.connect(wsUrl);
  }

  // Connection Management
  private connect(wsUrl: string): void {
    try {
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('🌐 Connected to world server');
        this.emit('connected');
        this.startSyncLoop();
      };

      this.websocket.onmessage = (event: MessageEvent) => {
        try {
          const update = JSON.parse(event.data) as StateUpdate;
          this.handleRemoteUpdate(update);
        } catch (error) {
          console.error('Failed to parse network message:', error);
        }
      };

      this.websocket.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

      this.websocket.onclose = () => {
        console.log('⚠️ Disconnected from world server');
        this.emit('disconnected');
        this.stopSyncLoop();
        setTimeout(() => this.connect(wsUrl), 5000); // Reconnect
      };
    } catch (error) {
      console.error('Failed to connect to world server:', error);
    }
  }

  // Object Management
  public createObject(
    id: string,
    type: string,
    position: [number, number, number],
    properties: Record<string, any> = {}
  ): NetworkedObject {
    const obj: NetworkedObject = {
      id,
      owner: this.userId,
      type,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      properties,
      timestamp: Date.now(),
      version: 1,
    };

    this.world.objects.set(id, obj);
    this.queueUpdate({
      type: 'create',
      objectId: id,
      data: obj,
      timestamp: Date.now(),
      userId: this.userId,
      sequenceNumber: ++this.sequenceNumber,
    });

    this.emit('objectCreated', obj);
    return obj;
  }

  public updateObject(
    id: string,
    updates: Partial<NetworkedObject>,
    local: boolean = true
  ): void {
    const existing = this.world.objects.get(id);
    if (!existing) return;

    const updated: NetworkedObject = {
      ...existing,
      ...updates,
      timestamp: Date.now(),
      version: existing.version + 1,
    };

    this.world.objects.set(id, updated);

    if (local) {
      this.queueUpdate({
        type: 'update',
        objectId: id,
        data: updates,
        timestamp: Date.now(),
        userId: this.userId,
        sequenceNumber: ++this.sequenceNumber,
      });
    }

    this.emit('objectUpdated', updated);
  }

  public deleteObject(id: string, local: boolean = true): void {
    const obj = this.world.objects.get(id);
    if (!obj) return;

    this.world.objects.delete(id);

    if (local) {
      this.queueUpdate({
        type: 'delete',
        objectId: id,
        data: { id },
        timestamp: Date.now(),
        userId: this.userId,
        sequenceNumber: ++this.sequenceNumber,
      });
    }

    this.emit('objectDeleted', obj);
  }

  // Physics Constraints
  public addConstraint(constraint: PhysicsConstraint): void {
    this.world.physics.constraints.push(constraint);
    this.queueUpdate({
      type: 'constraint',
      data: constraint,
      timestamp: Date.now(),
      userId: this.userId,
      sequenceNumber: ++this.sequenceNumber,
    });

    this.emit('constraintAdded', constraint);
  }

  public removeConstraint(constraintId: string): void {
    const index = this.world.physics.constraints.findIndex((c) => c.id === constraintId);
    if (index >= 0) {
      this.world.physics.constraints.splice(index, 1);
      this.emit('constraintRemoved', constraintId);
    }
  }

  public createJoint(
    id: string,
    bodyA: string,
    bodyB: string,
    _type: 'hinge' | 'ball-socket' = 'ball-socket',
    anchorA: [number, number, number] = [0, 0, 0],
    anchorB: [number, number, number] = [0, 0, 0]
  ): PhysicsConstraint {
    const constraint: PhysicsConstraint = {
      id,
      type: 'joint',
      bodyA,
      bodyB,
      anchorA,
      anchorB,
      config: {
        breakForce: 1000,
        breakTorque: 1000,
      },
    };

    this.addConstraint(constraint);
    return constraint;
  }

  public createSpring(
    id: string,
    bodyA: string,
    bodyB: string,
    restLength: number = 1,
    stiffness: number = 100,
    damping: number = 0.1
  ): PhysicsConstraint {
    const constraint: PhysicsConstraint = {
      id,
      type: 'spring',
      bodyA,
      bodyB,
      anchorA: [0, 0, 0],
      anchorB: [0, 0, 0],
      config: {
        restLength,
        stiffness,
        damping,
      },
    };

    this.addConstraint(constraint);
    return constraint;
  }

  // Network Updates
  private queueUpdate(update: StateUpdate): void {
    this.pendingUpdates.push(update);
  }

  private startSyncLoop(): void {
    this.syncInterval = window.setInterval(() => this.syncUpdates(), 1000 / 30); // 30 Hz
  }

  private stopSyncLoop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private syncUpdates(): void {
    if (this.pendingUpdates.length === 0 || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    // Batch updates
    const updates = this.pendingUpdates.splice(0, 100);
    const batch = {
      worldId: this.world.id,
      userId: this.userId,
      updates,
      timestamp: Date.now(),
    };

    try {
      this.websocket.send(JSON.stringify(batch));
    } catch (error) {
      console.error('Failed to send updates:', error);
      // Re-queue failed updates
      this.pendingUpdates.unshift(...updates);
    }
  }

  private handleRemoteUpdate(update: StateUpdate): void {
    // Ignore own updates
    if (update.userId === this.userId) return;

    try {
      switch (update.type) {
        case 'create':
          if (update.objectId && update.data) {
            const exists = this.world.objects.has(update.objectId);
            if (!exists) {
              this.world.objects.set(update.objectId, update.data);
              this.emit('objectCreated', update.data);
            }
          }
          break;

        case 'update':
          if (update.objectId) {
            const existing = this.world.objects.get(update.objectId);
            if (existing) {
              // Conflict resolution for concurrent edits
              const resolved = this.conflictResolver.resolve(existing, update.data, update.userId);
              this.updateObject(update.objectId, resolved, false);
            }
          }
          break;

        case 'delete':
          if (update.objectId) {
            this.deleteObject(update.objectId, false);
          }
          break;

        case 'constraint':
          if (update.data) {
            this.world.physics.constraints.push(update.data);
            this.emit('constraintAdded', update.data);
          }
          break;

        case 'physics':
          if (update.data) {
            this.world.physics = { ...this.world.physics, ...update.data };
            this.emit('physicsUpdated', this.world.physics);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling remote update:', error);
    }
  }

  // State Access
  public getWorldState(): WorldState {
    return JSON.parse(JSON.stringify(this.world));
  }

  public getObject(id: string): NetworkedObject | undefined {
    return this.world.objects.get(id);
  }

  public getAllObjects(): NetworkedObject[] {
    return Array.from(this.world.objects.values());
  }

  public getConstraints(): PhysicsConstraint[] {
    return [...this.world.physics.constraints];
  }

  public setGravity(gravity: [number, number, number]): void {
    this.world.physics.gravity = gravity;
    this.queueUpdate({
      type: 'physics',
      data: { gravity },
      timestamp: Date.now(),
      userId: this.userId,
      sequenceNumber: ++this.sequenceNumber,
    });
  }

  public disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.stopSyncLoop();
    this.removeAllListeners();
  }
}

/**
 * Conflict Resolution for Concurrent Edits
 */
class ConflictResolver {
  resolve(local: NetworkedObject, remote: any, _remoteUserId: string): Partial<NetworkedObject> {
    // Last-write-wins for most properties
    const resolved: Partial<NetworkedObject> = {};

    // Position: Use remote if newer
    if (remote.position && remote.timestamp > local.timestamp) {
      resolved.position = remote.position;
    }

    // Rotation: Use remote if newer
    if (remote.rotation && remote.timestamp > local.timestamp) {
      resolved.rotation = remote.rotation;
    }

    // Scale: Use remote if newer
    if (remote.scale && remote.timestamp > local.timestamp) {
      resolved.scale = remote.scale;
    }

    // Properties: Deep merge
    if (remote.properties) {
      resolved.properties = {
        ...local.properties,
        ...remote.properties,
      };
    }

    return resolved;
  }
}
