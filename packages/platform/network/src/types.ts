/**
 * @hololand/network Types
 *
 * Type definitions for real-time networking and multiplayer
 */

// ============================================================================
// Connection Types
// ============================================================================

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface ConnectionConfig {
  url: string;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  timeout?: number;
}

export interface ConnectionInfo {
  clientId: string;
  state: ConnectionState;
  latency: number;
  connectedAt: number;
  serverUrl: string;
}

// ============================================================================
// Room Types
// ============================================================================

export type RoomState = 'creating' | 'open' | 'closed' | 'locked';

export interface RoomConfig {
  id?: string;
  name: string;
  maxPlayers?: number;
  isPrivate?: boolean;
  password?: string;
  metadata?: Record<string, unknown>;
}

export interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  state: RoomState;
  isPrivate: boolean;
  hostId: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export type PlayerRole = 'host' | 'moderator' | 'player' | 'spectator';

export interface PlayerInfo {
  id: string;
  displayName: string;
  role: PlayerRole;
  joinedAt: number;
  position?: Vector3;
  rotation?: Vector3;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// State Synchronization Types
// ============================================================================

export interface SyncConfig {
  interpolation?: boolean;
  interpolationDelay?: number;
  predictionEnabled?: boolean;
  snapshotRate?: number;
  priorityByDistance?: boolean;
  /** Use adaptive delay based on RTT jitter (overrides interpolationDelay) */
  adaptiveDelay?: boolean;
  /** Enable velocity-based extrapolation when no future states available */
  extrapolationEnabled?: boolean;
  /** Max extrapolation time in ms (prevents runaway prediction) */
  extrapolationLimit?: number;
  /** Per-frame correction budget in meters (limits visual pop) */
  correctionBudgetPerFrame?: number;
  /** Jitter buffer size (number of states to hold for reordering) */
  jitterBufferSize?: number;
}

/** Quaternion for gimbal-lock-free rotation */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Object priority for tiered correction blending */
export type ObjectPriority = 'local' | 'high' | 'medium' | 'low';

export interface SyncState {
  objectId: string;
  position?: Vector3;
  rotation?: Vector3;
  /** Quaternion rotation (preferred over Euler rotation) */
  rotationQuat?: Quaternion;
  scale?: Vector3;
  velocity?: Vector3;
  /** Angular velocity for rotation prediction */
  angularVelocity?: Vector3;
  /** Linear acceleration for quadratic extrapolation */
  acceleration?: Vector3;
  metadata?: Record<string, unknown>;
  timestamp: number;
  sequence: number;
}

export interface StateSnapshot {
  timestamp: number;
  sequence: number;
  states: SyncState[];
}

// ============================================================================
// Interest Management Types
// ============================================================================

export interface InterestConfig {
  viewDistance?: number;
  updateRate?: number;
  priorityLevels?: number;
}

export interface InterestZone {
  id: string;
  center: Vector3;
  radius: number;
  priority: number;
}

// ============================================================================
// Voice Chat Types
// ============================================================================

export type VoiceState = 'muted' | 'speaking' | 'listening' | 'deafened';

export interface VoiceConfig {
  enabled?: boolean;
  spatial?: boolean;
  maxDistance?: number;
  falloffFactor?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface VoiceParticipant {
  id: string;
  displayName: string;
  state: VoiceState;
  volume: number;
  position?: Vector3;
  isMuted: boolean;
  isDeafened: boolean;
}

// ============================================================================
// Text Chat Types
// ============================================================================

export type MessageType = 'text' | 'system' | 'emote' | 'whisper';

export interface ChatMessage {
  id: string;
  type: MessageType;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  roomId?: string;
  targetId?: string; // for whispers
  metadata?: Record<string, unknown>;
}

export interface ChatConfig {
  maxMessageLength?: number;
  rateLimit?: number;
  profanityFilter?: boolean;
  allowEmotes?: boolean;
  historySize?: number;
}

// ============================================================================
// Network Message Types
// ============================================================================

export type MessageCategory =
  | 'connection'
  | 'room'
  | 'state'
  | 'voice'
  | 'chat'
  | 'rpc'
  | 'custom';

export interface NetworkMessage<T = unknown> {
  type: string;
  category: MessageCategory;
  payload: T;
  senderId?: string;
  timestamp: number;
  sequence?: number;
}

// ============================================================================
// RPC Types
// ============================================================================

export interface RPCConfig {
  timeout?: number;
  retries?: number;
}

export interface RPCRequest {
  id: string;
  method: string;
  params?: unknown[];
  timestamp: number;
}

export interface RPCResponse {
  id: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
  timestamp: number;
}

// ============================================================================
// Event Types
// ============================================================================

export interface NetworkEventMap {
  // Connection events
  connected: { clientId: string; serverUrl: string };
  disconnected: { reason: string; code?: number };
  reconnecting: { attempt: number; maxAttempts: number };
  error: { message: string; code?: string };
  latency: { ms: number };

  // Room events
  roomCreated: { room: RoomInfo };
  roomJoined: { room: RoomInfo; player: PlayerInfo };
  roomLeft: { roomId: string; reason: string };
  playerJoined: { roomId: string; player: PlayerInfo };
  playerLeft: { roomId: string; playerId: string; reason: string };
  roomStateChanged: { roomId: string; state: RoomState };
  hostChanged: { roomId: string; newHostId: string };

  // State events
  stateUpdate: { states: SyncState[] };
  snapshot: { snapshot: StateSnapshot };

  // Voice events
  voiceStateChanged: { playerId: string; state: VoiceState };
  voiceStreamStarted: { playerId: string };
  voiceStreamEnded: { playerId: string };

  // Chat events
  chatMessage: { message: ChatMessage };
  chatHistory: { messages: ChatMessage[] };
}

export type NetworkEventType = keyof NetworkEventMap;

export type NetworkEventHandler<T extends NetworkEventType> = (
  event: NetworkEventMap[T]
) => void;

// ============================================================================
// Utility Types
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Transform {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
}
