/**
 * @hololand/agents/persistence
 *
 * Cross-Scene Agent Persistence Protocol
 *
 * Four integrated modules for agent identity, state, memory, and collaboration
 * that persist across VR/AR scene transitions:
 *
 *   1. AgentDID - W3C DID Core v1.0 compliant decentralized identity
 *   2. AgentStateWAL - Write-Ahead Log for crash-safe state persistence
 *   3. AgentMemoryWPG - Wisdom/Pattern/Gotcha structured memory
 *   4. A2ATaskHandoff - Agent-to-Agent task delegation protocol
 *
 * Architecture:
 *   Scene A --> [Agent exits] --> WAL checkpoint --> Scene B --> [WAL replay] --> State restored
 *                                     |                              |
 *                                  DID persists                  DID resolves
 *                                     |                              |
 *                                  W/P/G memories carry over     A2A tasks follow
 *
 * @version 1.0.0
 */

// =============================================================================
// DID (Decentralized Identity)
// =============================================================================

export {
  AgentDIDRegistry,
  getAgentDIDRegistry,
  resetAgentDIDRegistry,
  createDID,
  parseDID,
  isValidDID,
  createDIDDocument,
  DID_METHOD,
  DID_PREFIX,
  DID_CONTEXT,
} from './AgentDID.js';

export type {
  DIDDocument,
  DIDVerificationMethod,
  DIDServiceEndpoint,
  DIDResolutionResult,
  AgentDIDOptions,
  DIDRegistryMetrics,
  JsonWebKey,
} from './AgentDID.js';

// =============================================================================
// WAL (Write-Ahead Log)
// =============================================================================

export {
  AgentStateWAL,
  getAgentStateWAL,
  resetAgentStateWAL,
} from './AgentStateWAL.js';

export type {
  WALOperationType,
  WALEntry,
  WALCheckpoint,
  SceneTransition,
  AgentStateWALConfig,
  AgentStateWALMetrics,
} from './AgentStateWAL.js';

// =============================================================================
// W/P/G Memory
// =============================================================================

export {
  AgentMemoryWPG,
  getAgentMemory,
  resetAgentMemory,
  MEMORY_PREFIX,
} from './AgentMemoryWPG.js';

export type {
  MemoryCategory,
  MemoryEntry,
  MemoryQuery,
  MemorySearchResult,
  AgentMemoryConfig,
  AgentMemoryMetrics,
} from './AgentMemoryWPG.js';

// =============================================================================
// A2A Task Handoff
// =============================================================================

export {
  A2ATaskHandoff,
  getA2ATaskHandoff,
  resetA2ATaskHandoff,
} from './A2ATaskHandoff.js';

export type {
  TaskState,
  TaskPriority,
  A2ATask,
  TaskResult,
  TaskStateTransition,
  TaskHandoffEvent,
  TaskQuery,
  A2ATaskHandoffConfig,
  A2ATaskHandoffMetrics,
} from './A2ATaskHandoff.js';
