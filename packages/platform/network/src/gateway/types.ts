/**
 * Unified Communication Gateway - Type Definitions
 *
 * Canonical intermediate representation for normalizing heterogeneous
 * protocol messages (MCP/A2A agent protocols, VR multiplayer state,
 * and CRDT-based world state) into a single message bus.
 *
 * @module gateway/types
 */

// =============================================================================
// Canonical Intermediate Representation (CIR)
// =============================================================================

/**
 * Every message flowing through the gateway is normalized into a CIR envelope.
 * Originators encode domain-specific payloads; the gateway strips protocol
 * framing, normalizes timestamps, and routes via `channel`.
 */
export interface CanonicalMessage<T = unknown> {
  /** Globally unique message ID (UUIDv4) */
  id: string;
  /** Source protocol that produced this message */
  sourceProtocol: ProtocolType;
  /** Logical routing channel */
  channel: MessageChannel;
  /** Canonical payload after normalization */
  payload: T;
  /** ISO-8601 timestamp of original event */
  originTimestamp: string;
  /** Monotonic gateway-ingress timestamp (ms since epoch) */
  gatewayTimestamp: number;
  /** Causal ordering vector clock */
  vectorClock: Record<string, number>;
  /** Sender identity (agent ID, peer ID, or node ID) */
  senderId: string;
  /** Optional correlation ID for request/response pairing */
  correlationId?: string;
  /** Priority for QoS routing (0 = highest) */
  priority: MessagePriority;
  /** TTL in ms; gateway drops expired messages */
  ttlMs: number;
  /** End-to-end integrity hash (SHA-256 of payload) */
  integrityHash?: string;
}

export type ProtocolType = 'mcp' | 'a2a' | 'photon' | 'mirror' | 'crdt' | 'internal';

export type MessageChannel =
  | 'agent.request'
  | 'agent.response'
  | 'agent.broadcast'
  | 'multiplayer.state'
  | 'multiplayer.event'
  | 'multiplayer.voice'
  | 'world.crdt'
  | 'world.conflict'
  | 'system.health'
  | 'system.metric';

export enum MessagePriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BULK = 4,
}

// =============================================================================
// Protocol Adapter Interface
// =============================================================================

/**
 * Each transport/protocol implements this adapter to translate between
 * its native format and the canonical intermediate representation.
 */
export interface ProtocolAdapter<TNative = unknown> {
  /** Protocol identifier */
  readonly protocol: ProtocolType;
  /** Human-readable adapter name */
  readonly name: string;
  /** Whether this adapter is currently connected */
  readonly connected: boolean;

  /** Convert native protocol message to CIR */
  normalize(native: TNative): CanonicalMessage;
  /** Convert CIR back to native protocol message */
  denormalize(canonical: CanonicalMessage): TNative;
  /** Start the adapter (connect to transport, etc.) */
  start(): Promise<void>;
  /** Gracefully stop the adapter */
  stop(): Promise<void>;
  /** Health check */
  healthCheck(): AdapterHealth;
}

export interface AdapterHealth {
  protocol: ProtocolType;
  connected: boolean;
  latencyMs: number;
  messagesIn: number;
  messagesOut: number;
  errorsLast5Min: number;
  lastHeartbeat: number;
}

// =============================================================================
// CRDT Conflict Resolution Strategy
// =============================================================================

/**
 * Adaptive CRDT resolution strategy based on agent population size.
 * Follows autonomize research prescriptions:
 *   - <15 agents:   operation-based CRDTs (low overhead, strong consistency)
 *   - 15-50 agents: delta-state CRDTs (bandwidth efficient)
 *   - 50+ agents:   hierarchical CRDTs (partitioned authority)
 */
export type CRDTStrategy = 'operation' | 'delta-state' | 'hierarchical';

export interface CRDTResolutionConfig {
  /** Current strategy (auto-selected or forced) */
  strategy: CRDTStrategy;
  /** Force a specific strategy (overrides auto-selection) */
  forceStrategy?: CRDTStrategy;
  /** Agent count thresholds for auto-selection */
  thresholds: {
    operationMax: number;   // default 15
    deltaStateMax: number;  // default 50
  };
  /** For hierarchical strategy: partition configuration */
  partitions?: HierarchicalPartition[];
  /** Maximum allowed clock drift between nodes (ms) */
  maxClockDriftMs: number;
  /** Conflict resolution tiebreaker */
  tiebreaker: 'timestamp' | 'node-priority' | 'merge-all';
}

export interface HierarchicalPartition {
  /** Partition ID */
  id: string;
  /** Authority node for this partition */
  authorityNodeId: string;
  /** Spatial bounds (AABB) */
  bounds: { min: Vector3Like; max: Vector3Like };
  /** Nodes assigned to this partition */
  nodeIds: string[];
}

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

// =============================================================================
// VR Multiplayer State
// =============================================================================

export interface MultiplayerStateUpdate {
  /** Entity being updated */
  entityId: string;
  /** Position in world space */
  position?: Vector3Like;
  /** Rotation (euler or quaternion depending on transport) */
  rotation?: Vector3Like | { x: number; y: number; z: number; w: number };
  /** Velocity for prediction */
  velocity?: Vector3Like;
  /** Sequence number for ordering */
  sequence: number;
  /** Source transport */
  transport: 'photon' | 'mirror';
  /** Room/session ID */
  roomId: string;
}

// =============================================================================
// Gateway Configuration
// =============================================================================

export interface GatewayConfig {
  /** Maximum messages per second (backpressure) */
  maxThroughput: number;
  /** Enable metrics collection */
  metricsEnabled: boolean;
  /** Metrics collection interval (ms) */
  metricsIntervalMs: number;
  /** CRDT conflict resolution configuration */
  crdtConfig: CRDTResolutionConfig;
  /** Adapters to register on startup */
  adapters: ProtocolType[];
  /** Message routing rules */
  routingRules: RoutingRule[];
  /** Dead-letter queue for undeliverable messages */
  deadLetterEnabled: boolean;
  /** Maximum dead-letter queue size */
  deadLetterMaxSize: number;
}

export interface RoutingRule {
  /** Source channel pattern (supports glob: "agent.*") */
  sourcePattern: string;
  /** Target channel(s) */
  targets: MessageChannel[];
  /** Optional transformation */
  transform?: (msg: CanonicalMessage) => CanonicalMessage;
  /** Priority filter (only route messages at or above this priority) */
  minPriority?: MessagePriority;
}

// =============================================================================
// Gateway Events
// =============================================================================

export interface GatewayEventMap {
  'message:received': { message: CanonicalMessage; adapter: ProtocolType };
  'message:routed': { message: CanonicalMessage; targets: MessageChannel[] };
  'message:dropped': { message: CanonicalMessage; reason: string };
  'message:deadletter': { message: CanonicalMessage; error: string };
  'adapter:connected': { protocol: ProtocolType };
  'adapter:disconnected': { protocol: ProtocolType; reason: string };
  'adapter:error': { protocol: ProtocolType; error: string };
  'conflict:detected': { entityId: string; strategy: CRDTStrategy; nodeCount: number };
  'conflict:resolved': { entityId: string; winner: string; strategy: CRDTStrategy };
  'strategy:changed': { from: CRDTStrategy; to: CRDTStrategy; agentCount: number };
  'health:report': { adapters: AdapterHealth[]; throughput: number; queueDepth: number };
}

export type GatewayEventType = keyof GatewayEventMap;
export type GatewayEventHandler<K extends GatewayEventType> = (event: GatewayEventMap[K]) => void;

// =============================================================================
// Gateway Metrics
// =============================================================================

export interface GatewayMetrics {
  /** Total messages processed since startup */
  totalMessages: number;
  /** Messages processed in last interval */
  messagesPerSecond: number;
  /** Average normalization latency (ms) */
  avgNormalizationLatencyMs: number;
  /** Average routing latency (ms) */
  avgRoutingLatencyMs: number;
  /** Messages currently in routing queue */
  queueDepth: number;
  /** Dead-letter queue depth */
  deadLetterDepth: number;
  /** Per-adapter metrics */
  adapterMetrics: Map<ProtocolType, AdapterHealth>;
  /** Current CRDT strategy */
  crdtStrategy: CRDTStrategy;
  /** Active agent count */
  agentCount: number;
  /** Conflict resolution rate */
  conflictsPerSecond: number;
  /** Uptime in seconds */
  uptimeSeconds: number;
}
