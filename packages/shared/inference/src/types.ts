/**
 * @hololand/inference - Type Definitions
 *
 * Unified types for all AI providers (Local + BYOK Cloud)
 */

// =============================================================================
// Provider Types
// =============================================================================

export type ProviderType =
  | 'local'              // Ollama or embedded llama.cpp
  | 'openai'             // OpenAI API (BYOK)
  | 'anthropic'          // Anthropic API (BYOK)
  | 'google'             // Google AI / Gemini (BYOK)
  | 'grok'               // xAI Grok (BYOK)
  | 'azure'              // Azure OpenAI (BYOK)
  | 'infinityassistant'  // InfinityAssistant.io cloud service
  | 'custom';            // Custom OpenAI-compatible endpoint

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  enabled: boolean;
}

// =============================================================================
// Inference Types
// =============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface InferenceRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;

  // Provider routing hints
  preferLocal?: boolean;
  forceProvider?: ProviderType;

  // HoloScript-specific context
  holoContext?: {
    currentScene?: string;
    holograms?: Array<{ id: string; type: string; position?: { x: number; y: number; z: number } }>;
    recentCommands?: string[];
  };
}

export interface InferenceResponse {
  id: string;
  content: string;
  model: string;
  provider: ProviderType;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs?: number;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

// =============================================================================
// Model Types
// =============================================================================

export interface ModelInfo {
  name: string;
  displayName: string;
  provider: ProviderType;
  size?: number;  // bytes
  quantization?: string;
  capabilities: ('chat' | 'code' | 'holoscript' | 'vision')[];
  isLocal: boolean;
  isDownloaded?: boolean;
}

// Pre-configured Brittney models
export const BRITTNEY_MODELS = {
  // Local GGUF models (Ollama)
  local: {
    expert: 'brittney-v4-expert:latest',
    holoscript: 'brittney-v1:latest',
    general: 'brittney-v2:latest',
    quantized: 'brittney-v3-q4:latest',
  },
  // Cloud fine-tuned models (OpenAI - for BYOK users)
  cloud: {
    holoscript: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4',
    general: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney-v2:CzuzuPXc',
  },
} as const;

// =============================================================================
// Settings Types
// =============================================================================

export interface InferenceSettings {
  // Primary provider
  activeProvider: ProviderType;

  // Local settings
  local: {
    enabled: boolean;
    ollamaUrl: string;
    defaultModel: string;
    autoDownloadModel: boolean;
  };

  // BYOK provider configurations
  providers: Record<ProviderType, ProviderConfig>;

  // Behavior
  fallbackToCloud: boolean;
  preferLocalWhenAvailable: boolean;

  // Performance
  maxRetries: number;
  timeoutMs: number;
}

export const DEFAULT_SETTINGS: InferenceSettings = {
  activeProvider: 'local',

  local: {
    enabled: true,
    ollamaUrl: 'http://localhost:11434',
    defaultModel: BRITTNEY_MODELS.local.expert,
    autoDownloadModel: true,
  },

  providers: {
    local: { type: 'local', enabled: true },
    openai: { type: 'openai', enabled: false },
    anthropic: { type: 'anthropic', enabled: false },
    google: { type: 'google', enabled: false },
    grok: { type: 'grok', enabled: false },
    azure: { type: 'azure', enabled: false },
    infinityassistant: { type: 'infinityassistant', enabled: false, endpoint: 'http://localhost:3002' },
    custom: { type: 'custom', enabled: false },
  },

  fallbackToCloud: true,
  preferLocalWhenAvailable: true,

  maxRetries: 2,
  timeoutMs: 120000,
};

// =============================================================================
// Status Types
// =============================================================================

export interface ProviderStatus {
  type: ProviderType;
  available: boolean;
  error?: string;
  models?: ModelInfo[];
  latencyMs?: number;
}

export interface InferenceStatus {
  ready: boolean;
  activeProvider: ProviderType;
  providers: ProviderStatus[];
  localModelDownloaded: boolean;
}
