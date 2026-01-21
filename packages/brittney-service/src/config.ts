/**
 * Brittney Configuration
 *
 * Loads configuration from:
 * 1. Environment variables
 * 2. Config file (~/.hololand/config.json)
 * 3. Defaults
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// =============================================================================
// Types
// =============================================================================

export type CloudProviderType = 'openai' | 'anthropic' | 'azure' | 'google' | 'grok';

export interface ApiKeys {
  openai?: string;
  anthropic?: string;
  azure?: string;
  google?: string;
  gemini?: string; // Alias for google
  grok?: string;
}

export interface ProviderEndpoints {
  azure?: string; // Azure OpenAI resource URL
}

export interface BrittneyConfig {
  // Local model settings
  modelName: string;
  modelPath: string;
  contextSize: number;

  // Cloud provider settings (optional)
  cloudProvider?: CloudProviderType | null;
  cloudApiKey?: string; // Legacy single key (still supported)
  apiKeys?: ApiKeys; // NEW: Multiple provider keys
  providerEndpoints?: ProviderEndpoints; // Provider-specific endpoints
  cloudModel?: string;
  cloudEndpoint?: string; // For Azure or custom endpoints
  preferCloud: boolean;

  // Security settings
  disallowPublicCloudAccess: boolean; // Prevent unauthenticated users from using cloud APIs
  adminApiKey?: string; // Optional API key for authenticated admin operations

  // Server settings
  port: number;
  host: string;

  // Behavior settings
  autoLoad: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Prompt enhancement settings
  promptBooster?: {
    level: 'off' | 'basic' | 'enhanced' | 'maximum';
    physics: boolean;
    materials: boolean;
    spatial: boolean;
    performance: boolean;
    vr: boolean;
  };
}

// =============================================================================
// Defaults
// =============================================================================

const CONFIG_DIR = join(homedir(), '.hololand');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const MODELS_DIR = join(CONFIG_DIR, 'models');
const ASSETS_DIR = join(CONFIG_DIR, 'assets', 'models');
const DEFAULT_MODEL_NAME = 'brittney-v1';
const DEFAULT_MODEL_PATH = join(MODELS_DIR, 'brittney-v1.gguf');

// Fine-tuned Brittney models on OpenAI
export const BRITTNEY_MODELS = {
  // V1: Trained on 94 curated HoloScript examples - best for code generation
  // Used in Hololand for free LLM HoloScript assistance
  holoscript: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4',
  // V2: Trained on 10K examples - broader knowledge, design patterns
  // Used in uAA2 service for agent assistance
  general: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney-v2:CzuzuPXc',
  // Default for Hololand is V1 (HoloScript specialist)
  default: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4',
};

const DEFAULT_CONFIG: BrittneyConfig = {
  modelName: DEFAULT_MODEL_NAME,
  modelPath: DEFAULT_MODEL_PATH,
  contextSize: 8192,

  cloudProvider: null, // Disabled by default - use local Ollama only
  cloudApiKey: undefined,
  apiKeys: {},
  cloudModel: BRITTNEY_MODELS.holoscript, // V1 for Hololand
  cloudEndpoint: undefined,
  preferCloud: false, // Use local inference by default

  // Security: Prevent public users from accessing cloud APIs
  disallowPublicCloudAccess: true,
  adminApiKey: process.env.BRITTNEY_ADMIN_KEY,

  port: 11435,
  host: 'localhost',

  autoLoad: true,
  logLevel: 'info',
};

// =============================================================================
// Config Loading
// =============================================================================

export async function loadConfig(): Promise<BrittneyConfig> {
  // Ensure config directory exists
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (!existsSync(MODELS_DIR)) {
    mkdirSync(MODELS_DIR, { recursive: true });
  }

  // Start with defaults
  let config = { ...DEFAULT_CONFIG };

  // Load from config file if exists
  if (existsSync(CONFIG_FILE)) {
    try {
      const fileContent = readFileSync(CONFIG_FILE, 'utf-8');
      const fileConfig = JSON.parse(fileContent);
      config = { ...config, ...fileConfig };
    } catch (error) {
      console.warn('[✱brittney] Failed to parse config file, using defaults');
    }
  }

  // Merge apiKeys from file with env vars
  const apiKeys: ApiKeys = {
    ...config.apiKeys,
    openai: process.env.OPENAI_API_KEY || config.apiKeys?.openai,
    anthropic: process.env.ANTHROPIC_API_KEY || config.apiKeys?.anthropic,
    azure: process.env.AZURE_OPENAI_API_KEY || config.apiKeys?.azure,
    google: process.env.GOOGLE_API_KEY || config.apiKeys?.google,
    grok: process.env.GROK_API_KEY || process.env.XAI_API_KEY || config.apiKeys?.grok,
  };

  // Determine active provider
  const cloudProvider =
    (process.env.BRITTNEY_CLOUD_PROVIDER as CloudProviderType) || config.cloudProvider;

  // Resolve the active API key: explicit > apiKeys[provider] > legacy cloudApiKey
  const resolveApiKey = (): string | undefined => {
    // Explicit env var takes priority
    if (process.env.BRITTNEY_CLOUD_API_KEY) return process.env.BRITTNEY_CLOUD_API_KEY;
    // Then check apiKeys for current provider
    if (cloudProvider && apiKeys[cloudProvider]) return apiKeys[cloudProvider];
    // Fall back to legacy single key
    return config.cloudApiKey;
  };

  // Override with environment variables
  config = {
    ...config,
    modelName: process.env.BRITTNEY_MODEL_NAME || config.modelName,
    modelPath: process.env.BRITTNEY_MODEL_PATH || config.modelPath,
    contextSize: parseInt(process.env.BRITTNEY_CONTEXT_SIZE || '') || config.contextSize,

    cloudProvider,
    apiKeys,
    cloudApiKey: resolveApiKey(),
    cloudModel: process.env.BRITTNEY_CLOUD_MODEL || config.cloudModel,
    cloudEndpoint:
      process.env.BRITTNEY_CLOUD_ENDPOINT ||
      process.env.AZURE_OPENAI_ENDPOINT ||
      config.cloudEndpoint,
    preferCloud: process.env.BRITTNEY_PREFER_CLOUD === 'true' || config.preferCloud,

    port: parseInt(process.env.BRITTNEY_PORT || '') || config.port,
    host: process.env.BRITTNEY_HOST || config.host,

    autoLoad: process.env.BRITTNEY_AUTO_LOAD !== 'false' && config.autoLoad,
    logLevel: (process.env.BRITTNEY_LOG_LEVEL as BrittneyConfig['logLevel']) || config.logLevel,
  };

  return config;
}

/**
 * Get API key for a specific provider
 */
export function getApiKeyForProvider(
  config: BrittneyConfig,
  provider: CloudProviderType
): string | undefined {
  return (
    config.apiKeys?.[provider] ||
    (config.cloudProvider === provider ? config.cloudApiKey : undefined)
  );
}

export async function saveConfig(config: Partial<BrittneyConfig>): Promise<void> {
  // Ensure config directory exists
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // Load existing config
  let existingConfig: Partial<BrittneyConfig> = {};
  if (existsSync(CONFIG_FILE)) {
    try {
      const fileContent = readFileSync(CONFIG_FILE, 'utf-8');
      existingConfig = JSON.parse(fileContent);
    } catch {
      // Ignore parse errors
    }
  }

  // Merge and save
  const newConfig = { ...existingConfig, ...config };

  // Don't save API keys to file - they should stay in env vars or keychain
  delete (newConfig as Partial<BrittneyConfig>).cloudApiKey;

  writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf-8');
}

// =============================================================================
// Config Paths
// =============================================================================

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getModelsDir(): string {
  return MODELS_DIR;
}

export function getConfigFile(): string {
  return CONFIG_FILE;
}

export function getAssetsDir(): string {
  return ASSETS_DIR;
}

// =============================================================================
// Model Management
// =============================================================================

export function isModelDownloaded(modelName: string = DEFAULT_MODEL_NAME): boolean {
  const modelPath = join(MODELS_DIR, `${modelName}.gguf`);
  return existsSync(modelPath);
}

export function getModelPath(modelName: string = DEFAULT_MODEL_NAME): string {
  return join(MODELS_DIR, `${modelName}.gguf`);
}

// =============================================================================
// Environment Variable Reference
// =============================================================================

export const ENV_VARS = {
  // Model
  BRITTNEY_MODEL_NAME: 'Name of the local model (default: brittney-v1)',
  BRITTNEY_MODEL_PATH: 'Path to the GGUF model file',
  BRITTNEY_CONTEXT_SIZE: 'Context window size (default: 8192)',

  // Cloud
  BRITTNEY_CLOUD_PROVIDER: 'Cloud provider: openai, anthropic, azure, google, grok',
  BRITTNEY_CLOUD_API_KEY: 'API key for cloud provider',
  BRITTNEY_CLOUD_MODEL: 'Model name for cloud provider',
  BRITTNEY_CLOUD_ENDPOINT: 'Custom endpoint for Azure or self-hosted',
  BRITTNEY_PREFER_CLOUD: 'Prefer cloud over local (default: false)',

  // Also supports standard env vars
  OPENAI_API_KEY: 'OpenAI API key (fallback)',
  ANTHROPIC_API_KEY: 'Anthropic API key (fallback)',
  GROK_API_KEY: 'Grok (xAI) API key (fallback)',
  XAI_API_KEY: 'xAI API key (alias for GROK_API_KEY)',
  AZURE_OPENAI_ENDPOINT: 'Azure OpenAI endpoint (fallback)',

  // Server
  BRITTNEY_PORT: 'Server port (default: 11435)',
  BRITTNEY_HOST: 'Server host (default: localhost)',

  // Behavior
  BRITTNEY_AUTO_LOAD: 'Auto-load model on start (default: true)',
  BRITTNEY_LOG_LEVEL: 'Log level: debug, info, warn, error',
};
