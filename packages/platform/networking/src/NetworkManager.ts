/**
 * @hololand/networking NetworkManager
 *
 * Top-level network manager that ties together TieredStateSync with
 * transport, connection management, and bandwidth monitoring.
 * Designed for 200 entities at 90fps in VR multiplayer.
 */

import {
  TieredStateSync,
  type TieredStateSyncConfig,
  type SyncMetrics,
} from './TieredStateSync';
import { ConsistencyLevel } from './ConsistencyTier';
import type { EntityState, ClientInput, StateSnapshot } from './ServerAuthority';
import type { PredictedState } from './ClientPrediction';

export interface NetworkManagerConfig extends Partial<TieredStateSyncConfig> {
  /** Unique identifier for this network session. */
  sessionId?: string;
  /** Maximum clients in this session. */
  maxClients: number;
  /** Network tick rate (may differ from render rate). */
  networkTickRateHz: number;
}

const DEFAULT_NET_CONFIG: NetworkManagerConfig = {
  maxClients: 32,
  networkTickRateHz: 60,
  targetFps: 90,
  maxEntities: 200,
  bandwidthBudgetBytesPerSec: 50_000,
};

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface ClientConnection {
  clientId: string;
  state: ConnectionState;
  latencyMs: number;
  lastPingTime: number;
  entityIds: string[];
}

export interface NetworkEvent {
  type: 'client_connected' | 'client_disconnected' | 'entity_registered' | 'entity_removed' | 'tick';
  timestamp: number;
  data: Record<string, unknown>;
}

type EventHandler = (event: NetworkEvent) => void;

/**
 * High-level network manager for HoloLand multiplayer.
 */
export class NetworkManager {
  private config: NetworkManagerConfig;
  private sync: TieredStateSync;
  private clients: Map<string, ClientConnection> = new Map();
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private running: boolean = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private sessionId: string;

  constructor(config?: Partial<NetworkManagerConfig>) {
    this.config = { ...DEFAULT_NET_CONFIG, ...config };
    this.sessionId = this.config.sessionId ?? this.generateSessionId();
    this.sync = new TieredStateSync({
      targetFps: this.config.targetFps,
      maxEntities: this.config.maxEntities,
      bandwidthBudgetBytesPerSec: this.config.bandwidthBudgetBytesPerSec,
      serverConfig: this.config.serverConfig,
      predictionConfig: this.config.predictionConfig,
    });
  }

  /**
   * Start the network tick loop.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    const intervalMs = 1000 / this.config.networkTickRateHz;
    this.tickTimer = setInterval(() => this.networkTick(), intervalMs);
  }

  /**
   * Stop the network tick loop.
   */
  stop(): void {
    this.running = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  /**
   * Connect a client to the session.
   */
  connectClient(clientId: string): boolean {
    if (this.clients.size >= this.config.maxClients) return false;
    if (this.clients.has(clientId)) return false;

    const connection: ClientConnection = {
      clientId,
      state: 'connected',
      latencyMs: 0,
      lastPingTime: Date.now(),
      entityIds: [],
    };
    this.clients.set(clientId, connection);

    this.emit({
      type: 'client_connected',
      timestamp: Date.now(),
      data: { clientId },
    });

    return true;
  }

  /**
   * Disconnect a client from the session.
   */
  disconnectClient(clientId: string): void {
    const connection = this.clients.get(clientId);
    if (!connection) return;

    // Remove all entities owned by this client
    for (const entityId of connection.entityIds) {
      this.sync.removeEntity(entityId);
    }

    this.clients.delete(clientId);

    this.emit({
      type: 'client_disconnected',
      timestamp: Date.now(),
      data: { clientId },
    });
  }

  /**
   * Register an entity for a connected client.
   */
  registerEntity(
    clientId: string,
    entity: EntityState,
    tier: ConsistencyLevel = ConsistencyLevel.Relaxed,
  ): boolean {
    const connection = this.clients.get(clientId);
    if (!connection) return false;

    const registered = this.sync.registerEntity(entity, tier);
    if (registered) {
      connection.entityIds.push(entity.entityId);
      this.emit({
        type: 'entity_registered',
        timestamp: Date.now(),
        data: { clientId, entityId: entity.entityId, tier },
      });
    }
    return registered;
  }

  /**
   * Submit input for processing.
   */
  submitInput(input: ClientInput): PredictedState | null {
    const connection = this.clients.get(input.clientId);
    if (!connection || connection.state !== 'connected') return null;
    return this.sync.submitInput(input);
  }

  /**
   * Update client latency from a ping measurement.
   */
  updateLatency(clientId: string, latencyMs: number): void {
    const connection = this.clients.get(clientId);
    if (connection) {
      connection.latencyMs = latencyMs;
      connection.lastPingTime = Date.now();
    }
  }

  /**
   * Subscribe to network events.
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Get sync metrics.
   */
  getMetrics(): SyncMetrics {
    return this.sync.getMetrics();
  }

  /**
   * Get all connected clients.
   */
  getClients(): ClientConnection[] {
    return Array.from(this.clients.values()).map((c) => ({ ...c }));
  }

  /**
   * Get session ID.
   */
  getSessionId(): string {
    return this.sessionId;
  }

  isRunning(): boolean {
    return this.running;
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getSync(): TieredStateSync {
    return this.sync;
  }

  // ============================================================================
  // Private
  // ============================================================================

  private networkTick(): void {
    const snapshot = this.sync.processTick();
    this.emit({
      type: 'tick',
      timestamp: Date.now(),
      data: { tick: snapshot.tick, entityCount: snapshot.entities.length },
    });
  }

  private emit(event: NetworkEvent): void {
    const handlers = this.eventHandlers.get(event.type) ?? [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch {
        // Swallow handler errors
      }
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }
}
