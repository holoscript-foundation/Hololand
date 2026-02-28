/**
 * @hololand/inference - Type Definitions
 *
 * Unified types for all AI providers (Local + BYOK Cloud)
 */

import type { WisdomInjectionConfig, WisdomInjectionLevel } from './wisdom-injector.js';
export type { WisdomInjectionConfig, WisdomInjectionLevel };

// =============================================================================
// Provider Types
// =============================================================================

export type ProviderType =
  | 'local'              // Ollama or embedded llama.cpp
  | 'brittney-cloud'     // Brittney Cloud managed API (https://api.brittney.ai)
  | 'openai'             // OpenAI API (BYOK)
  | 'anthropic'          // Anthropic API (BYOK)
  | 'google'             // Google AI / Gemini (BYOK)
  | 'grok'               // xAI Grok (BYOK)
  | 'deepseek'           // DeepSeek API (BYOK) - 86% cheaper than GPT-4
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
    expert: 'brittney-qwen-v23:latest',    // V23 Qwen2.5-Coder-7B (201K examples, 3 epochs)
    v22: 'brittney-qwen:latest',           // V22 Qwen2.5-Coder-7B fallback
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

  // uAA2++ wisdom injection for BYOK users (auto-injects HoloScript+ knowledge)
  wisdomInjection?: WisdomInjectionConfig;
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
    'brittney-cloud': { type: 'brittney-cloud', enabled: false },
    openai: { type: 'openai', enabled: false },
    anthropic: { type: 'anthropic', enabled: false },
    google: { type: 'google', enabled: false },
    grok: { type: 'grok', enabled: false },
    deepseek: { type: 'deepseek', enabled: false },
    azure: { type: 'azure', enabled: false },
    infinityassistant: { type: 'infinityassistant', enabled: false, endpoint: 'http://localhost:3002' },
    custom: { type: 'custom', enabled: false },
  },

  fallbackToCloud: true,
  preferLocalWhenAvailable: true,

  maxRetries: 2,
  timeoutMs: 120000,

  wisdomInjection: {
    level: 'full',
    skipForLocalBrittney: true,
    skipForFineTunedModels: true,
  },
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
