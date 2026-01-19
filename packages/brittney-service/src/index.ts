/**
 * Brittney Service - Public API
 */

export { BrittneyServer } from './server.js';
export { BrittneyInference } from './inference.js';
export { CloudProvider } from './cloud-provider.js';
export {
  loadConfig,
  saveConfig,
  getConfigDir,
  getModelsDir,
  isModelDownloaded,
  getModelPath,
  ENV_VARS,
} from './config.js';
export type { BrittneyConfig } from './config.js';

export type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  BrittneyContext,
} from './server.js';
