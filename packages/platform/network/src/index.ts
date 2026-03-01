/**
 * @hololand/network
 *
 * Real-time networking and multiplayer for the Hololand metaverse
 *
 * Features:
 * - WebSocket client/server architecture
 * - Room system for virtual spaces
 * - State synchronization with interpolation
 * - Interest management for network optimization
 * - WebRTC voice chat with spatial audio
 * - Real-time text messaging
 */

// Core networking
export * from './NetworkClient';
export * from './CoPresenceBridge';
export * from './AutonomousAgentBridge';
export * from './AgentSystem';
export * from './HololandNetwork';
export * from './types';
export { NetworkServer } from './NetworkServer';
export type { ServerConfig, ClientConnection } from './NetworkServer';

// Room management
export { Room, RoomManager } from './Room';
export type { RoomEventMap, RoomEventType, RoomEventHandler } from './Room';

// State synchronization
export { StateSync } from './StateSync';
export { RelayService } from './RelayService';
export type { RelayConfig, AutonomousAgent } from './RelayService';

// Latency compensation
export { LatencyTracker } from './LatencyTracker';
export { JitterBuffer } from './JitterBuffer';
export { CorrectionBudget } from './CorrectionBudget';
export type { BlendType, PendingCorrection, CorrectedState } from './CorrectionBudget';

// Math utilities for networked interpolation
export {
  vec3Add, vec3Sub, vec3Scale, vec3Lerp, vec3Length, vec3Distance,
  quatNormalize, quatSlerp, quatFromEuler, quatToEuler,
  catmullRom, hermiteInterpolate, cubicBezier,
} from './MathUtils';

// Neural Ollama Bridge - AI Agent Integration
export {
  NeuralOllamaBridge,
  AgentFactory,
  createNeuralBridge,
  setupNeuralRoom,
} from './NeuralOllamaBridge';
export type {
  OllamaConfig,
  AgentDefinition,
  AgentType,
  AgentCapability,
  ThoughtResult,
  AgentAction,
  ThoughtContext,
  ConversationEntry,
} from './NeuralOllamaBridge';

// NPC Personality Templates
export {
  ALL_PERSONALITY_TEMPLATES,
  MERCHANT_TEMPLATES,
  GUARD_TEMPLATES,
  QUEST_GIVER_TEMPLATES,
  COMPANION_TEMPLATES,
  VILLAIN_TEMPLATES,
  AMBIENT_TEMPLATES,
  SERVICE_TEMPLATES,
  ENTERTAINMENT_TEMPLATES,
  MYSTERY_TEMPLATES,
  getPersonalityTemplate,
  getTemplatesByCategory,
  searchTemplatesByTag,
  searchTemplates,
  templateToAgentDefinition,
  getCategoryStats,
} from './PersonalityTemplates';
export type { PersonalityTemplate, PersonalityCategory } from './PersonalityTemplates';

// Interest management
export { InterestManager } from './InterestManager';
export { SpatialHashGrid } from './SpatialHashGrid';
export type { CellCoords, GridStats } from './SpatialHashGrid';
export { ServerInterestManager } from './ServerInterestManager';
export type {
  ServerInterestConfig,
  ViewerState,
  EntityRelevance,
  InterestStats,
} from './ServerInterestManager';

// Voice chat
export { VoiceChat } from './VoiceChat';
export type {
  VoiceChatEventMap,
  VoiceChatEventType,
  VoiceChatEventHandler,
} from './VoiceChat';

// Text chat
export { TextChat } from './TextChat';
export type {
  TextChatEventMap,
  TextChatEventType,
  TextChatEventHandler,
} from './TextChat';

// Logger
export { setHololandNetworkLogger } from './logger';
export type { HololandNetworkLogger } from './logger';

// Types
export type {
  // Connection
  ConnectionState,
  ConnectionConfig,
  ConnectionInfo,

  // Room
  RoomState,
  RoomConfig,
  RoomInfo,
  PlayerRole,
  PlayerInfo,

  // State sync
  SyncConfig,
  SyncState,
  StateSnapshot,
  Quaternion,
  ObjectPriority,

  // Interest management
  InterestConfig,
  InterestZone,

  // Voice chat
  VoiceState,
  VoiceConfig,
  VoiceParticipant,

  // Text chat
  MessageType,
  ChatMessage,
  ChatConfig,

  // Network messages
  MessageCategory,
  NetworkMessage,

  // RPC
  RPCConfig,
  RPCRequest,
  RPCResponse,

  // Events
  NetworkEventMap,
  NetworkEventType,
  NetworkEventHandler,

  // Utilities
  Vector3,
  Transform,
} from './types';

// Network transports (merged from @holoscript/network)
export * from './NetworkTransports';

// Multiplayer sync (merged from @holoscript/multiplayer)
export * from './MultiplayerSync';

// CRDT state sync (merged from @holoscript/state-sync)
export * from './CRDTStateSync';

// Yjs-compatible CRDT Collaboration — awareness protocol, cursor presence, conflict resolution
export {
  AwarenessProtocol,
  ConflictDetector,
  createAwarenessProtocol,
  createConflictDetector,
} from './YjsCollaboration';
export type {
  UserColor,
  CursorPosition,
  SelectionRange,
  AwarenessState,
  AwarenessEventType,
  AwarenessEvent,
  AwarenessConfig,
  EditConflict,
  ConflictingEdit,
  ConflictResolutionStrategy,
} from './YjsCollaboration';

// Networked Runtime — connects @networked trait to network transport
export { NetworkedRuntime } from './NetworkedRuntime';
export type { NetworkedEntityConfig, NetworkedRuntimeConfig, RuntimeStats, NetworkedRuntimeEvent } from './NetworkedRuntime';

// State Authority — centralized ownership management
export { StateAuthority } from './StateAuthority';
export type { AuthorityMode, ConflictStrategy, AuthorityEntry, AuthorityClaim, AuthorityConfig, AuthorityEvent } from './StateAuthority';

// CRDT Room System — conflict-free multiplayer rooms with spatial partitioning
export { CRDTRoom } from './CRDTRoom';
export type {
  EntityCRDTState,
  PlayerPresenceData,
  ChatEntry,
  InterestRegion,
  SyncTier,
  CRDTRoomConfig,
  CRDTRoomEventMap,
  CRDTRoomEventType,
  CRDTRoomEventHandler,
  SerializedCRDTRoomState,
} from './CRDTRoom';

// CRDT Room Manager — room lifecycle, directory, sharding, persistence
export { CRDTRoomManager } from './CRDTRoomManager';
export type {
  CRDTRoomDirectoryEntry,
  CRDTRoomManagerConfig,
  RoomPersistenceAdapter,
  RoomShard,
  CRDTRoomManagerEventMap,
  CRDTRoomManagerEventType,
  CRDTRoomManagerEventHandler,
} from './CRDTRoomManager';

// Spatial CRDT Sync — bridges CRDT room state to Three.js scene graph
export { SpatialCRDTSync } from './SpatialCRDTSync';
export type {
  SpatialObject3D,
  SpatialScene,
  SpatialCamera,
  EntityObjectFactory,
  AvatarFactory,
  SpatialCRDTSyncConfig,
} from './SpatialCRDTSync';

// Version
export const HOLOLAND_NETWORK_VERSION = '1.0.0-alpha.1';

// Default exports for convenience
import { NetworkClient } from './NetworkClient';
import { NetworkServer } from './NetworkServer';
import { Room, RoomManager } from './Room';
import { StateSync } from './StateSync';
import { RelayService } from './RelayService';
import { InterestManager } from './InterestManager';
import { VoiceChat } from './VoiceChat';
import { TextChat } from './TextChat';
import { NeuralOllamaBridge, AgentFactory } from './NeuralOllamaBridge';
import { NetworkedRuntime } from './NetworkedRuntime';
import { StateAuthority } from './StateAuthority';
import { CRDTRoom } from './CRDTRoom';
import { CRDTRoomManager } from './CRDTRoomManager';
import { SpatialCRDTSync } from './SpatialCRDTSync';

export default {
  NetworkClient,
  NetworkServer,
  Room,
  RoomManager,
  StateSync,
  RelayService,
  InterestManager,
  VoiceChat,
  TextChat,
  NeuralOllamaBridge,
  AgentFactory,
  NetworkedRuntime,
  StateAuthority,
  CRDTRoom,
  CRDTRoomManager,
  SpatialCRDTSync,
  HOLOLAND_NETWORK_VERSION,
};
