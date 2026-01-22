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
export { NetworkClient } from './NetworkClient';
export { NetworkServer } from './NetworkServer';
export type { ServerConfig, ClientConnection } from './NetworkServer';

// Room management
export { Room, RoomManager } from './Room';
export type { RoomEventMap, RoomEventType, RoomEventHandler } from './Room';

// State synchronization
export { StateSync } from './StateSync';
export { RelayService } from './RelayService';
export type { RelayConfig, AutonomousAgent } from './RelayService';

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
  HOLOLAND_NETWORK_VERSION,
};
