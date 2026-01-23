/**
 * Brittney Service - Public API
 *
 * HoloScript+ powered AI service for Hololand VR/AR development.
 */

export { BrittneyServer } from './server.js';
export { BrittneyInference } from './inference.js';
export { CloudProvider } from './cloud-provider.js';
export { AgentOrchestrator } from './orchestrator.js';
export {
  loadConfig,
  saveConfig,
  getConfigDir,
  getModelsDir,
  isModelDownloaded,
  getModelPath,
  getApiKeyForProvider,
  ENV_VARS,
} from './config.js';
export type { BrittneyConfig, CloudProviderType, ApiKeys } from './config.js';
export type { OrchestratorConfig, OrchestratorRequest, OrchestratorResponse, TaskCategory } from './orchestrator.js';

export type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  BrittneyContext,
} from './server.js';

// HoloScript+ Knowledge Service
export {
  KnowledgeService,
  getKnowledgeService,
  createKnowledgeService,
} from './knowledge/index.js';
export type { SearchResult, KnowledgeEvent } from './knowledge/index.js';

// HoloScript+ Orchestration Runtime
export {
  OrchestrationRuntime,
  createOrchestrationRuntime,
} from './orchestration/index.js';
export type { OrchestrationState, OrchestrationEvent, ProviderConfig } from './orchestration/index.js';

// Knowledge Pipeline (Network Feature)
export {
  KnowledgePipeline,
  getKnowledgePipeline,
  createKnowledgePipeline,
} from './knowledge-pipeline.js';
export type {
  KnowledgeEntry,
  TrainingExample,
  VRAMStatus,
  PipelineConfig,
  ContributionResult,
} from './knowledge-pipeline.js';
