/**
 * @hololand/services - Platform Services
 *
 * Comprehensive service layer for agent communication, CRDT synchronization,
 * and MVC object persistence in the HoloLand VR/AR platform.
 *
 * @packageDocumentation
 */

// Main service
export { AgentCommunicationManager } from './AgentCommunicationManager';
export type {
  AgentCommunicationConfig,
  AgentMessage,
  MessageDeliveryStatus,
  WebRTCConnectionState,
  DeltaSyncState,
  CommunicationStats,
  MVCObjectType,
  MVCObject,
} from './AgentCommunicationManager';

// Delta CRDT Sync Engine
export { DeltaCRDTSyncEngine } from './DeltaCRDTSyncEngine';
export type {
  DeltaCRDTSyncConfig,
  DeltaBatch,
  VectorClock,
  SyncStats,
} from './DeltaCRDTSyncEngine';

// WebRTC Manager
export { WebRTCManager } from './WebRTCManager';
export type {
  WebRTCManagerConfig,
  ConnectionStateChangeEvent,
} from './WebRTCManager';

// Message Router
export { MessageRouter } from './MessageRouter';
export type {
  MessageRouterConfig,
} from './MessageRouter';

// MVC Persistence Layer
export { MVCPersistenceLayer } from './MVCPersistenceLayer';
export type {
  MVCPersistenceConfig,
  StorageStats,
  QueryOptions,
} from './MVCPersistenceLayer';
