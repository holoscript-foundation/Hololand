/**
 * @hololand/networking ServerAuthority
 *
 * Server-authoritative game state manager. The server owns the truth for all
 * entity states. Clients send inputs/intents; server validates, applies, and
 * broadcasts authoritative state.
 *
 * Design principles:
 * - All mutations flow through server validation
 * - Server state is the single source of truth
 * - Clients receive snapshots + deltas
 * - Anti-cheat: server rejects invalid state transitions
 */

import { ConsistencyLevel, type StateEntry } from './ConsistencyTier';

export interface Vector3 {
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

export interface EntityState {
  entityId: string;
  ownerId: string;
  position: Vector3;
  rotation: Quaternion;
  velocity: Vector3;
  health: number;
  customState: Record<string, unknown>;
  lastUpdateTick: number;
  consistencyTier: ConsistencyLevel;
}

export interface ClientInput {
  clientId: string;
  entityId: string;
  inputSequence: number;
  timestamp: number;
  moveDirection: Vector3;
  actions: string[];
}

export interface StateSnapshot {
  tick: number;
  timestamp: number;
  entities: EntityState[];
  deltasFromTick?: number;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  correctedState?: Partial<EntityState>;
}

export interface ServerAuthorityConfig {
  tickRateHz: number;
  maxEntities: number;
  maxVelocity: number;
  maxTeleportDistance: number;
  snapshotHistorySize: number;
}

const DEFAULT_CONFIG: ServerAuthorityConfig = {
  tickRateHz: 60,
  maxEntities: 200,
  maxVelocity: 50, // units/sec
  maxTeleportDistance: 5, // units per tick
  snapshotHistorySize: 128,
};

/**
 * Server-authoritative state manager for all networked entities.
 */
export class ServerAuthority {
  private config: ServerAuthorityConfig;
  private entities: Map<string, EntityState> = new Map();
  private entityOwners: Map<string, string> = new Map(); // entityId -> clientId
  private currentTick: number = 0;
  private snapshotHistory: StateSnapshot[] = [];
  private inputBuffer: Map<string, ClientInput[]> = new Map(); // clientId -> inputs
  private tickIntervalMs: number;

  constructor(config?: Partial<ServerAuthorityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.tickIntervalMs = 1000 / this.config.tickRateHz;
  }

  /**
   * Register a new entity with the server. Returns false if at capacity.
   */
  registerEntity(entity: EntityState): boolean {
    if (this.entities.size >= this.config.maxEntities) {
      return false;
    }
    this.entities.set(entity.entityId, { ...entity, lastUpdateTick: this.currentTick });
    this.entityOwners.set(entity.entityId, entity.ownerId);
    return true;
  }

  /**
   * Remove an entity from server tracking.
   */
  removeEntity(entityId: string): boolean {
    const existed = this.entities.delete(entityId);
    this.entityOwners.delete(entityId);
    this.inputBuffer.delete(entityId);
    return existed;
  }

  /**
   * Submit client input for server processing.
   */
  submitInput(input: ClientInput): void {
    if (!this.inputBuffer.has(input.clientId)) {
      this.inputBuffer.set(input.clientId, []);
    }
    this.inputBuffer.get(input.clientId)!.push(input);
  }

  /**
   * Validate a proposed state change against server rules.
   */
  validateStateChange(entityId: string, proposed: Partial<EntityState>): ValidationResult {
    const current = this.entities.get(entityId);
    if (!current) {
      return { valid: false, reason: 'Entity not found' };
    }

    // Velocity check
    if (proposed.velocity) {
      const speed = Math.sqrt(
        proposed.velocity.x ** 2 + proposed.velocity.y ** 2 + proposed.velocity.z ** 2,
      );
      if (speed > this.config.maxVelocity) {
        return {
          valid: false,
          reason: `Velocity ${speed.toFixed(2)} exceeds max ${this.config.maxVelocity}`,
          correctedState: {
            velocity: this.clampVelocity(proposed.velocity, this.config.maxVelocity),
          },
        };
      }
    }

    // Teleport check
    if (proposed.position) {
      const dx = proposed.position.x - current.position.x;
      const dy = proposed.position.y - current.position.y;
      const dz = proposed.position.z - current.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > this.config.maxTeleportDistance) {
        return {
          valid: false,
          reason: `Position delta ${dist.toFixed(2)} exceeds max teleport distance`,
          correctedState: { position: current.position },
        };
      }
    }

    // Health bounds check
    if (proposed.health !== undefined && (proposed.health < 0 || proposed.health > 100)) {
      return {
        valid: false,
        reason: `Health ${proposed.health} out of bounds [0, 100]`,
        correctedState: { health: Math.max(0, Math.min(100, proposed.health)) },
      };
    }

    return { valid: true };
  }

  /**
   * Process all pending inputs and advance the game tick.
   */
  tick(): StateSnapshot {
    this.currentTick++;

    // Process all queued inputs
    for (const [clientId, inputs] of this.inputBuffer) {
      for (const input of inputs) {
        this.processInput(clientId, input);
      }
    }
    this.inputBuffer.clear();

    // Create snapshot
    const snapshot: StateSnapshot = {
      tick: this.currentTick,
      timestamp: Date.now(),
      entities: Array.from(this.entities.values()).map((e) => ({ ...e })),
    };

    // Store in history ring buffer
    this.snapshotHistory.push(snapshot);
    if (this.snapshotHistory.length > this.config.snapshotHistorySize) {
      this.snapshotHistory.shift();
    }

    return snapshot;
  }

  /**
   * Generate a delta snapshot from a given base tick.
   */
  getDeltaSnapshot(baseTick: number): StateSnapshot | null {
    const baseIdx = this.snapshotHistory.findIndex((s) => s.tick === baseTick);
    if (baseIdx === -1) return null;

    const baseSnapshot = this.snapshotHistory[baseIdx];
    const currentEntities = Array.from(this.entities.values());

    // Only include entities that changed since baseTick
    const changedEntities = currentEntities.filter((e) => e.lastUpdateTick > baseTick);

    return {
      tick: this.currentTick,
      timestamp: Date.now(),
      entities: changedEntities.map((e) => ({ ...e })),
      deltasFromTick: baseTick,
    };
  }

  /**
   * Get the authoritative state for an entity.
   */
  getEntityState(entityId: string): EntityState | undefined {
    const state = this.entities.get(entityId);
    return state ? { ...state } : undefined;
  }

  /**
   * Get all entity states.
   */
  getAllEntities(): EntityState[] {
    return Array.from(this.entities.values()).map((e) => ({ ...e }));
  }

  getCurrentTick(): number {
    return this.currentTick;
  }

  getEntityCount(): number {
    return this.entities.size;
  }

  getTickIntervalMs(): number {
    return this.tickIntervalMs;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private processInput(_clientId: string, input: ClientInput): void {
    const entity = this.entities.get(input.entityId);
    if (!entity) return;

    // Only the owner can move their entity
    if (entity.ownerId !== input.clientId) return;

    // Apply movement with validation
    const dt = this.tickIntervalMs / 1000;
    const proposedPosition: Vector3 = {
      x: entity.position.x + input.moveDirection.x * dt,
      y: entity.position.y + input.moveDirection.y * dt,
      z: entity.position.z + input.moveDirection.z * dt,
    };

    const validation = this.validateStateChange(input.entityId, {
      position: proposedPosition,
      velocity: input.moveDirection,
    });

    if (validation.valid) {
      entity.position = proposedPosition;
      entity.velocity = input.moveDirection;
    } else if (validation.correctedState) {
      if (validation.correctedState.position) entity.position = validation.correctedState.position;
      if (validation.correctedState.velocity) entity.velocity = validation.correctedState.velocity;
    }

    entity.lastUpdateTick = this.currentTick;
  }

  private clampVelocity(v: Vector3, maxSpeed: number): Vector3 {
    const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (speed <= maxSpeed) return v;
    const scale = maxSpeed / speed;
    return { x: v.x * scale, y: v.y * scale, z: v.z * scale };
  }
}
