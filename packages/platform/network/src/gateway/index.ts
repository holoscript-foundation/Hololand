/**
 * Unified Communication Gateway
 *
 * Single normalization gateway for all HoloLand protocol traffic:
 * - Agent protocols (MCP/A2A) via canonical intermediate representation
 * - VR multiplayer state (Photon Fusion for production, Mirror for dev/test)
 * - World state conflict resolution (adaptive CRDTs by agent population)
 *
 * @module gateway
 */

// Core gateway
export { UnifiedGateway, createUnifiedGateway } from './UnifiedGateway';

// CRDT conflict resolution
export { CRDTConflictResolver } from './CRDTConflictResolver';
export type { CRDTOperation, DeltaState, ConflictEvent } from './CRDTConflictResolver';

// Protocol adapters
export {
  MCPAdapter,
  A2AAdapter,
  PhotonAdapter,
  MirrorAdapter,
  CRDTStateAdapter,
  createAdapter,
} from './ProtocolAdapters';
export type {
  MCPNativeMessage,
  A2ANativeMessage,
  PhotonNativeMessage,
  MirrorNativeMessage,
  CRDTNativeMessage,
} from './ProtocolAdapters';

// Types
export type {
  CanonicalMessage,
  ProtocolType,
  MessageChannel,
  ProtocolAdapter,
  AdapterHealth,
  CRDTStrategy,
  CRDTResolutionConfig,
  HierarchicalPartition,
  MultiplayerStateUpdate,
  GatewayConfig,
  GatewayEventMap,
  GatewayEventType,
  GatewayEventHandler,
  GatewayMetrics,
  RoutingRule,
  Vector3Like,
} from './types';
export { MessagePriority } from './types';
