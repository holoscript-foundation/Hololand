/**
 * CulturalHealthWebSocket
 *
 * WebSocket server that exposes real-time cultural health monitoring data
 * to frontend dashboard clients. Bridges the CulturalHealthMonitor's
 * double-buffered state to WebSocket consumers.
 *
 * DESIGN PRINCIPLES:
 * - Push-based: Server pushes snapshots to clients on each monitor cycle
 * - Subscription-based: Clients can subscribe to specific subsystems
 * - Backpressure-aware: Skips broadcasts if previous send is still buffered
 * - Zero render-loop impact: All WebSocket I/O runs completely off the render path
 *
 * PROTOCOL:
 * ```
 * Client -> Server:
 *   { type: "subscribe", payload: { subsystems: ["norm_adoption", "cooperation"] } }
 *   { type: "unsubscribe", payload: { subsystems: ["drift"] } }
 *   { type: "ping" }
 *
 * Server -> Client:
 *   { type: "snapshot", sequence: N, timestamp: T, payload: CulturalHealthSnapshot }
 *   { type: "norm_update", sequence: N, timestamp: T, payload: TrackedNorm }
 *   { type: "cooperation_update", sequence: N, timestamp: T, payload: CooperationIndex }
 *   { type: "drift_update", sequence: N, timestamp: T, payload: CulturalDriftState }
 *   { type: "boundary_update", sequence: N, timestamp: T, payload: BoundaryPermeabilityState }
 *   { type: "metanorm_update", sequence: N, timestamp: T, payload: MetanormEmergenceState }
 *   { type: "alert", sequence: N, timestamp: T, payload: CulturalHealthAlert }
 *   { type: "pong" }
 * ```
 *
 * USAGE:
 * ```typescript
 * const monitor = createCulturalHealthMonitor({ monitorHz: 2 });
 * const wsServer = createCulturalHealthWebSocket({
 *   monitor,
 *   port: 8080,
 *   path: '/cultural-health',
 * });
 *
 * wsServer.start();
 * monitor.start();
 *
 * // Dashboard clients connect to ws://localhost:8080/cultural-health
 * // and receive automatic snapshots every 500ms (at 2Hz)
 * ```
 *
 * PERFORMANCE CONTRACT:
 * - Snapshot serialization: <1ms for typical state sizes
 * - Broadcast to N clients: <0.5ms (non-blocking send)
 * - Memory per client: ~1KB connection overhead
 * - Max recommended clients: 50 (for <5ms total broadcast time)
 *
 * @module CulturalHealthWebSocket
 */

import { logger } from './logger';
import type { CulturalHealthMonitor } from './CulturalHealthMonitor';
import type {
  CulturalHealthSnapshot,
  CulturalHealthMessage,
  CulturalHealthMessageType,
  CulturalHealthAlert,
} from './CulturalHealthTypes';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Subsystems a client can subscribe to for targeted updates.
 */
export type CulturalHealthSubsystem =
  | 'norm_adoption'
  | 'cooperation'
  | 'drift'
  | 'boundary'
  | 'metanorm'
  | 'alerts';

/**
 * All subsystems list.
 */
export const ALL_SUBSYSTEMS: CulturalHealthSubsystem[] = [
  'norm_adoption',
  'cooperation',
  'drift',
  'boundary',
  'metanorm',
  'alerts',
];

/**
 * Client subscription state.
 */
export interface ClientSubscription {
  /** Client identifier (generated on connect) */
  clientId: string;
  /** Subscribed subsystems (empty = full snapshots only) */
  subsystems: Set<CulturalHealthSubsystem>;
  /** Whether client receives full snapshots */
  receiveFullSnapshots: boolean;
  /** Last sequence number sent to this client */
  lastSentSequence: number;
  /** Connection timestamp */
  connectedAt: number;
  /** Whether the client's send buffer is ready (backpressure) */
  isReady: boolean;
}

/**
 * Abstraction for a WebSocket connection.
 * This allows the server to work with any WebSocket library
 * (ws, uWebSockets.js, browser WebSocket for testing).
 */
export interface WebSocketConnection {
  /** Send a string message to the client */
  send(data: string): void;
  /** Close the connection */
  close(code?: number, reason?: string): void;
  /** Register a message handler */
  onMessage(handler: (data: string) => void): void;
  /** Register a close handler */
  onClose(handler: () => void): void;
  /** Register an error handler */
  onError(handler: (error: Error) => void): void;
  /** Check if the connection is open */
  isOpen(): boolean;
  /** Check buffered amount (for backpressure detection) */
  getBufferedAmount(): number;
}

/**
 * Abstraction for a WebSocket server.
 * Allows plugging in any WS server implementation.
 */
export interface WebSocketServerAdapter {
  /** Start listening for connections */
  start(): void;
  /** Stop the server */
  stop(): void;
  /** Register a connection handler */
  onConnection(handler: (connection: WebSocketConnection) => void): void;
  /** Whether the server is listening */
  isListening(): boolean;
}

/**
 * Configuration for the CulturalHealthWebSocket server.
 */
export interface CulturalHealthWebSocketConfig {
  /** The CulturalHealthMonitor to read state from */
  monitor: CulturalHealthMonitor;
  /** WebSocket server adapter (dependency injection) */
  serverAdapter?: WebSocketServerAdapter;
  /** Maximum number of concurrent clients (default: 50) */
  maxClients?: number;
  /** Whether to send full snapshots on each cycle (default: true) */
  broadcastFullSnapshots?: boolean;
  /** Whether to send subsystem-specific updates (default: true) */
  broadcastSubsystemUpdates?: boolean;
  /** Ping interval in ms for keep-alive (default: 30000) */
  pingIntervalMs?: number;
  /** Backpressure threshold in bytes (default: 65536) */
  backpressureThreshold?: number;
  /** Callback when a client connects */
  onClientConnected?: (clientId: string) => void;
  /** Callback when a client disconnects */
  onClientDisconnected?: (clientId: string) => void;
}

/**
 * Metrics for the WebSocket server.
 */
export interface CulturalHealthWebSocketMetrics {
  /** Whether the server is listening */
  isListening: boolean;
  /** Number of connected clients */
  connectedClients: number;
  /** Total messages sent */
  totalMessagesSent: number;
  /** Total messages received */
  totalMessagesReceived: number;
  /** Messages dropped due to backpressure */
  messagesDropped: number;
  /** Total bytes sent */
  totalBytesSent: number;
  /** Average serialization time in ms */
  averageSerializationMs: number;
  /** Total broadcasts performed */
  totalBroadcasts: number;
}

// =============================================================================
// CULTURAL HEALTH WEBSOCKET SERVER
// =============================================================================

/**
 * WebSocket server for broadcasting cultural health monitoring data
 * to connected dashboard clients.
 *
 * Integrates with CulturalHealthMonitor via the onCycleComplete callback,
 * receiving serializable snapshots and broadcasting to subscribed clients.
 */
export class CulturalHealthWebSocket {
  private readonly config: {
    monitor: CulturalHealthMonitor;
    maxClients: number;
    broadcastFullSnapshots: boolean;
    broadcastSubsystemUpdates: boolean;
    pingIntervalMs: number;
    backpressureThreshold: number;
    onClientConnected: (clientId: string) => void;
    onClientDisconnected: (clientId: string) => void;
  };

  private serverAdapter: WebSocketServerAdapter | null;
  private readonly clients: Map<string, { connection: WebSocketConnection; subscription: ClientSubscription }> = new Map();
  private pingIntervalId: ReturnType<typeof setInterval> | null = null;
  private sequenceCounter: number = 0;

  // Metrics
  private totalMessagesSent: number = 0;
  private totalMessagesReceived: number = 0;
  private messagesDropped: number = 0;
  private totalBytesSent: number = 0;
  private totalBroadcasts: number = 0;
  private serializationTimes: number[] = [];
  private readonly MAX_SERIALIZATION_HISTORY = 60;

  constructor(config: CulturalHealthWebSocketConfig) {
    this.config = {
      monitor: config.monitor,
      maxClients: config.maxClients ?? 50,
      broadcastFullSnapshots: config.broadcastFullSnapshots ?? true,
      broadcastSubsystemUpdates: config.broadcastSubsystemUpdates ?? true,
      pingIntervalMs: config.pingIntervalMs ?? 30_000,
      backpressureThreshold: config.backpressureThreshold ?? 65_536,
      onClientConnected: config.onClientConnected ?? (() => {}),
      onClientDisconnected: config.onClientDisconnected ?? (() => {}),
    };

    this.serverAdapter = config.serverAdapter ?? null;

    logger.info('[CulturalHealthWebSocket] Initialized', {
      maxClients: this.config.maxClients,
      broadcastFullSnapshots: this.config.broadcastFullSnapshots,
      pingIntervalMs: this.config.pingIntervalMs,
    });
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  /**
   * Start the WebSocket server and begin accepting connections.
   */
  start(): void {
    if (!this.serverAdapter) {
      logger.warn('[CulturalHealthWebSocket] No server adapter configured. Start aborted.');
      return;
    }

    // Setup connection handler
    this.serverAdapter.onConnection((connection: WebSocketConnection) => {
      this.handleNewConnection(connection);
    });

    this.serverAdapter.start();

    // Start ping interval
    this.pingIntervalId = setInterval(() => this.pingClients(), this.config.pingIntervalMs);

    logger.info('[CulturalHealthWebSocket] Server started');
  }

  /**
   * Stop the WebSocket server and disconnect all clients.
   */
  stop(): void {
    if (this.pingIntervalId !== null) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    // Close all client connections
    for (const [clientId, { connection }] of this.clients) {
      try {
        connection.close(1000, 'Server shutting down');
      } catch {
        // Ignore close errors during shutdown
      }
    }
    this.clients.clear();

    if (this.serverAdapter) {
      this.serverAdapter.stop();
    }

    logger.info('[CulturalHealthWebSocket] Server stopped');
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    this.stop();
    this.serverAdapter = null;
    logger.info('[CulturalHealthWebSocket] Disposed');
  }

  // ===========================================================================
  // BROADCAST (Called from CulturalHealthMonitor.onCycleComplete)
  // ===========================================================================

  /**
   * Broadcast a cultural health snapshot to all connected clients.
   *
   * This is designed to be used as the onCycleComplete callback
   * in CulturalHealthMonitor configuration.
   *
   * @param snapshot - The serializable snapshot from the monitor
   */
  broadcastSnapshot(snapshot: CulturalHealthSnapshot): void {
    if (this.clients.size === 0) return;

    const startTime = this.now();

    if (this.config.broadcastFullSnapshots) {
      const message: CulturalHealthMessage = {
        type: 'snapshot',
        sequence: this.sequenceCounter++,
        timestamp: Date.now(),
        payload: snapshot,
      };

      const serialized = JSON.stringify(message);
      const bytes = serialized.length;

      for (const [clientId, { connection, subscription }] of this.clients) {
        if (!subscription.receiveFullSnapshots) continue;
        if (!this.canSend(connection)) {
          this.messagesDropped++;
          continue;
        }

        try {
          connection.send(serialized);
          subscription.lastSentSequence = message.sequence;
          this.totalMessagesSent++;
          this.totalBytesSent += bytes;
        } catch (error) {
          logger.warn('[CulturalHealthWebSocket] Failed to send to client', { clientId });
        }
      }
    }

    // Send subsystem-specific updates to subscribed clients
    if (this.config.broadcastSubsystemUpdates) {
      this.broadcastSubsystemUpdates(snapshot);
    }

    this.totalBroadcasts++;

    const duration = this.now() - startTime;
    this.serializationTimes.push(duration);
    if (this.serializationTimes.length > this.MAX_SERIALIZATION_HISTORY) {
      this.serializationTimes.shift();
    }
  }

  /**
   * Broadcast a cultural health alert to all connected clients.
   */
  broadcastAlert(alert: CulturalHealthAlert): void {
    const message: CulturalHealthMessage = {
      type: 'alert',
      sequence: this.sequenceCounter++,
      timestamp: Date.now(),
      payload: alert,
    };

    const serialized = JSON.stringify(message);

    for (const [clientId, { connection, subscription }] of this.clients) {
      if (!subscription.subsystems.has('alerts') && subscription.subsystems.size > 0) continue;
      if (!this.canSend(connection)) {
        this.messagesDropped++;
        continue;
      }

      try {
        connection.send(serialized);
        this.totalMessagesSent++;
        this.totalBytesSent += serialized.length;
      } catch {
        logger.warn('[CulturalHealthWebSocket] Failed to send alert to client', { clientId });
      }
    }
  }

  // ===========================================================================
  // CLIENT MANAGEMENT
  // ===========================================================================

  /**
   * Get the number of connected clients.
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get all client IDs.
   */
  getClientIds(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get subscription state for a client.
   */
  getClientSubscription(clientId: string): Readonly<ClientSubscription> | undefined {
    return this.clients.get(clientId)?.subscription;
  }

  // ===========================================================================
  // METRICS
  // ===========================================================================

  /**
   * Get WebSocket server metrics.
   */
  getMetrics(): CulturalHealthWebSocketMetrics {
    let averageSerialization = 0;
    if (this.serializationTimes.length > 0) {
      averageSerialization = this.serializationTimes.reduce((a, b) => a + b, 0) / this.serializationTimes.length;
    }

    return {
      isListening: this.serverAdapter?.isListening() ?? false,
      connectedClients: this.clients.size,
      totalMessagesSent: this.totalMessagesSent,
      totalMessagesReceived: this.totalMessagesReceived,
      messagesDropped: this.messagesDropped,
      totalBytesSent: this.totalBytesSent,
      averageSerializationMs: Math.round(averageSerialization * 1000) / 1000,
      totalBroadcasts: this.totalBroadcasts,
    };
  }

  // ===========================================================================
  // INTERNAL: CONNECTION HANDLING
  // ===========================================================================

  private handleNewConnection(connection: WebSocketConnection): void {
    if (this.clients.size >= this.config.maxClients) {
      connection.close(1013, 'Maximum client limit reached');
      logger.warn('[CulturalHealthWebSocket] Connection rejected: max clients reached');
      return;
    }

    const clientId = this.generateClientId();
    const subscription: ClientSubscription = {
      clientId,
      subsystems: new Set(),
      receiveFullSnapshots: true,
      lastSentSequence: 0,
      connectedAt: Date.now(),
      isReady: true,
    };

    this.clients.set(clientId, { connection, subscription });

    // Set up message handler
    connection.onMessage((data: string) => {
      this.handleClientMessage(clientId, data);
    });

    // Set up close handler
    connection.onClose(() => {
      this.clients.delete(clientId);
      this.config.onClientDisconnected(clientId);
      logger.debug('[CulturalHealthWebSocket] Client disconnected', { clientId });
    });

    // Set up error handler
    connection.onError((error: Error) => {
      logger.warn('[CulturalHealthWebSocket] Client error', { clientId, error: error.message });
    });

    this.config.onClientConnected(clientId);

    // Send initial snapshot
    const snapshot = this.config.monitor.getSnapshot();
    const initialMessage: CulturalHealthMessage = {
      type: 'snapshot',
      sequence: this.sequenceCounter++,
      timestamp: Date.now(),
      payload: snapshot,
    };

    try {
      connection.send(JSON.stringify(initialMessage));
      this.totalMessagesSent++;
    } catch {
      logger.warn('[CulturalHealthWebSocket] Failed to send initial snapshot', { clientId });
    }

    logger.debug('[CulturalHealthWebSocket] Client connected', { clientId });
  }

  private handleClientMessage(clientId: string, data: string): void {
    this.totalMessagesReceived++;

    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message = JSON.parse(data) as { type: string; payload?: unknown };

      switch (message.type) {
        case 'subscribe': {
          const subsystems = (message.payload as { subsystems?: string[] })?.subsystems ?? [];
          for (const sub of subsystems) {
            if (ALL_SUBSYSTEMS.includes(sub as CulturalHealthSubsystem)) {
              client.subscription.subsystems.add(sub as CulturalHealthSubsystem);
            }
          }
          logger.debug('[CulturalHealthWebSocket] Client subscribed', { clientId, subsystems });
          break;
        }
        case 'unsubscribe': {
          const subsystems = (message.payload as { subsystems?: string[] })?.subsystems ?? [];
          for (const sub of subsystems) {
            client.subscription.subsystems.delete(sub as CulturalHealthSubsystem);
          }
          logger.debug('[CulturalHealthWebSocket] Client unsubscribed', { clientId, subsystems });
          break;
        }
        case 'ping': {
          try {
            client.connection.send(JSON.stringify({ type: 'pong' }));
            this.totalMessagesSent++;
          } catch {
            // Ignore ping response failures
          }
          break;
        }
        default:
          logger.debug('[CulturalHealthWebSocket] Unknown message type', { clientId, type: message.type });
      }
    } catch {
      logger.warn('[CulturalHealthWebSocket] Invalid message from client', { clientId });
    }
  }

  // ===========================================================================
  // INTERNAL: SUBSYSTEM BROADCASTS
  // ===========================================================================

  private broadcastSubsystemUpdates(snapshot: CulturalHealthSnapshot): void {
    const subsystemMessages: Array<{ subsystem: CulturalHealthSubsystem; type: CulturalHealthMessageType; payload: unknown }> = [
      { subsystem: 'norm_adoption', type: 'norm_update', payload: { norms: snapshot.norms, averageAdoptionRate: snapshot.averageAdoptionRate, normLifecycleCounts: snapshot.normLifecycleCounts } },
      { subsystem: 'cooperation', type: 'cooperation_update', payload: { populationCooperation: snapshot.populationCooperation, groupCooperation: snapshot.groupCooperation } },
      { subsystem: 'drift', type: 'drift_update', payload: snapshot.culturalDrift },
      { subsystem: 'boundary', type: 'boundary_update', payload: snapshot.boundaryPermeability },
      { subsystem: 'metanorm', type: 'metanorm_update', payload: snapshot.metanormEmergence },
    ];

    for (const { subsystem, type, payload } of subsystemMessages) {
      const message: CulturalHealthMessage = {
        type,
        sequence: this.sequenceCounter++,
        timestamp: Date.now(),
        payload,
      };

      // Only serialize if there are subscribers
      let serialized: string | null = null;

      for (const [clientId, { connection, subscription }] of this.clients) {
        if (!subscription.subsystems.has(subsystem)) continue;
        if (!this.canSend(connection)) {
          this.messagesDropped++;
          continue;
        }

        // Lazy serialization
        if (serialized === null) {
          serialized = JSON.stringify(message);
        }

        try {
          connection.send(serialized);
          this.totalMessagesSent++;
          this.totalBytesSent += serialized.length;
        } catch {
          logger.warn('[CulturalHealthWebSocket] Failed to send subsystem update', { clientId, subsystem });
        }
      }
    }
  }

  // ===========================================================================
  // INTERNAL: UTILITIES
  // ===========================================================================

  private canSend(connection: WebSocketConnection): boolean {
    if (!connection.isOpen()) return false;
    return connection.getBufferedAmount() < this.config.backpressureThreshold;
  }

  private pingClients(): void {
    const pingMessage = JSON.stringify({ type: 'ping' });

    for (const [clientId, { connection }] of this.clients) {
      if (!connection.isOpen()) {
        this.clients.delete(clientId);
        continue;
      }

      try {
        connection.send(pingMessage);
      } catch {
        // Client likely disconnected
        this.clients.delete(clientId);
      }
    }
  }

  private generateClientId(): string {
    return `cultural-ws-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a CulturalHealthWebSocket server instance.
 *
 * @param config - WebSocket server configuration
 * @returns Configured CulturalHealthWebSocket instance
 *
 * @example
 * ```typescript
 * const monitor = createCulturalHealthMonitor({ monitorHz: 2 });
 * const wsServer = createCulturalHealthWebSocket({
 *   monitor,
 *   maxClients: 50,
 * });
 *
 * // Wire up the monitor to broadcast on each cycle
 * // (Alternative: pass wsServer.broadcastSnapshot as onCycleComplete)
 *
 * wsServer.start();
 * monitor.start();
 * ```
 */
export function createCulturalHealthWebSocket(
  config: CulturalHealthWebSocketConfig,
): CulturalHealthWebSocket {
  return new CulturalHealthWebSocket(config);
}
