/**
 * @hololand/inference
 *
 * Unified AI inference layer for Hololand
 *
 * Features:
 * - Local inference via Ollama (FREE)
 * - BYOK cloud providers (OpenAI, Anthropic, Google, Grok, Azure)
 * - Automatic provider selection and fallback
 * - HoloScript-optimized model routing
 *
 * Usage:
 *
 * ```typescript
 * import { createInferenceClient } from '@hololand/inference';
 *
 * // Create client with local-first settings
 * const client = createInferenceClient({
 *   activeProvider: 'local',
 *   local: {
 *     enabled: true,
 *     ollamaUrl: 'http://localhost:11434',
 *     defaultModel: 'brittney-qwen-v23:latest',
 *   },
 * });
 *
 * // Initialize providers
 * await client.initialize();
 *
 * // Chat (auto-selects best provider)
 * const response = await client.chat({
 *   messages: [
 *     { role: 'user', content: 'Create a HoloScript scene with a spinning cube' }
 *   ],
 * });
 *
 * // Stream response
 * for await (const chunk of client.chatStream({ messages })) {
 *   process.stdout.write(chunk.content);
 * }
 *
 * // Configure BYOK provider
 * client.configureProvider('openai', {
 *   apiKey: 'sk-...',
 *   enabled: true,
 * });
 * ```
 */

// Main client
export { InferenceClient, createInferenceClient } from './client.js';

// Types
export type {
  ProviderType,
  ProviderConfig,
  ChatMessage,
  InferenceRequest,
  InferenceResponse,
  StreamChunk,
  ModelInfo,
  InferenceSettings,
  InferenceStatus,
  ProviderStatus,
} from './types.js';

export { BRITTNEY_MODELS, DEFAULT_SETTINGS } from './types.js';

// Providers (for advanced usage)
export {
  OllamaProvider,
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  GrokProvider,
  DeepSeekProvider,
  createBrittneyCloudProvider,
} from './providers/index.js';

// uAA2++ wisdom injection
export {
  injectWisdom,
  DEFAULT_WISDOM_CONFIG,
  type WisdomInjectionConfig,
  type WisdomInjectionLevel,
} from './wisdom-injector.js';

// Cost tracking
export {
  CostTracker,
  getCostTracker,
  MODEL_PRICING,
  type CallCostRecord,
  type CostSummary,
  type ModelPricing,
} from './cost-tracker.js';

// Integrations (safe public interfaces for external systems)
export {
  // Spatial Fleet Integration
  type Vector3 as SpatialVector3,
  type SpatialEntity,
  type SpatialZone,
  type SpatialConnection,
  type FleetVisualizationData,
  type FleetDataAdapter,
  generateFleetVisualizationHoloScript,
  DemoFleetAdapter,
  FleetVisualizationBridge,
  getFleetVisualizationBridge,
} from './integrations/index.js';
