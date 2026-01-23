/**
 * @hololand/brittney-toolkit
 * 
 * Local-first AI assistant for HoloScript world building.
 * Ships with bundled GGUF model - no cloud required.
 * Users can optionally bring their own API key for cloud providers.
 * 
 * @packageDocumentation
 */

// Inference exports
export { BrittneyEngine, type BrittneyEngineConfig } from './inference/BrittneyEngine';
export { LocalInference, type LocalInferenceConfig } from './inference/LocalInference';
export { CloudInference, type CloudInferenceConfig, type CloudProvider } from './inference/CloudInference';
export { 
  getModelPath, 
  getBestAvailableModel, 
  modelExists,
  MODELS_DIR,
  MODEL_FILES,
  DEFAULT_MODEL,
  DEFAULT_MODEL_CONFIG,
  type ModelConfig,
} from './inference/modelConfig';

// Chat UI exports
export { ChatWidget, type ChatWidgetConfig, type ChatWidgetState } from './chat/ChatWidget';

// Device-adaptive layout exports
export { 
  DeviceLayout, 
  type DeviceType, 
  type LayoutPosition,
  type LayoutConfig,
  type LayoutState,
  type Dimensions,
} from './layout/DeviceLayout';

// Types
export type { 
  ChatMessage,
  ChatRequest, 
  ChatResponse, 
  InferenceProvider, 
  StreamChunk,
  SupportedCloudProvider,
  TokenUsage,
} from './types';

// Version
export const TOOLKIT_VERSION = '1.0.0-alpha.1';

// Bundled model info
export const BUNDLED_MODEL = {
  name: 'brittney-f16',
  file: 'brittney-f16.gguf',
  size: '2.05 GB',
  sizeBytes: 2_200_000_000,
  contextSize: 2048,
  parameters: '1.1B',
  description: 'Brittney V1 - HoloScript specialist (TinyLlama 1.1B fine-tuned)',
  checksum: 'sha256:to-be-computed',
};

// Cloud providers info
export const CLOUD_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    apiKeyEnv: 'OPENAI_API_KEY',
    brittney: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4',
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    apiKeyEnv: 'ANTHROPIC_API_KEY',
  },
  google: {
    name: 'Google AI',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    apiKeyEnv: 'GOOGLE_API_KEY',
  },
  groq: {
    name: 'Groq',
    models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    apiKeyEnv: 'GROQ_API_KEY',
  },
  together: {
    name: 'Together AI',
    models: ['meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo'],
    apiKeyEnv: 'TOGETHER_API_KEY',
  },
  ollama: {
    name: 'Ollama (Local)',
    models: ['brittney:latest', 'brittney:1.1b', 'llama3.2'],
    apiKeyEnv: null,
    endpoint: 'http://localhost:11434',
  },
} as const;
