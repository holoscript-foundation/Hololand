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

export interface BrittneyConfig {
  // Local model settings
  modelName: string;
  modelPath: string;
  contextSize: number;

  // Cloud provider settings (optional)
  cloudProvider?: 'openai' | 'anthropic' | 'azure' | 'google' | null;
  cloudApiKey?: string;
  cloudModel?: string;
  cloudEndpoint?: string;  // For Azure or custom endpoints
  preferCloud: boolean;

  // Server settings
  port: number;
  host: string;

  // Behavior settings
  autoLoad: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// =============================================================================
// Defaults
// =============================================================================

const CONFIG_DIR = join(homedir(), '.hololand');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const MODELS_DIR = join(CONFIG_DIR, 'models');
const DEFAULT_MODEL_NAME = 'brittney-v1';
const DEFAULT_MODEL_PATH = join(MODELS_DIR, 'brittney-v1.gguf');

const DEFAULT_CONFIG: BrittneyConfig = {
  modelName: DEFAULT_MODEL_NAME,
  modelPath: DEFAULT_MODEL_PATH,
  contextSize: 8192,

  cloudProvider: null,
  cloudApiKey: undefined,
  cloudModel: undefined,
  cloudEndpoint: undefined,
  preferCloud: false,

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
      console.warn('[Brittney] Failed to parse config file, using defaults');
    }
  }

  // Override with environment variables
  config = {
    ...config,
    modelName: process.env.BRITTNEY_MODEL_NAME || config.modelName,
    modelPath: process.env.BRITTNEY_MODEL_PATH || config.modelPath,
    contextSize: parseInt(process.env.BRITTNEY_CONTEXT_SIZE || '') || config.contextSize,

    cloudProvider: (process.env.BRITTNEY_CLOUD_PROVIDER as BrittneyConfig['cloudProvider']) || config.cloudProvider,
    cloudApiKey: process.env.BRITTNEY_CLOUD_API_KEY || 
                 process.env.OPENAI_API_KEY || 
                 process.env.ANTHROPIC_API_KEY || 
                 config.cloudApiKey,
    cloudModel: process.env.BRITTNEY_CLOUD_MODEL || config.cloudModel,
    cloudEndpoint: process.env.BRITTNEY_CLOUD_ENDPOINT || 
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
  delete (newConfig as any).cloudApiKey;

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
  BRITTNEY_CLOUD_PROVIDER: 'Cloud provider: openai, anthropic, azure, google',
  BRITTNEY_CLOUD_API_KEY: 'API key for cloud provider',
  BRITTNEY_CLOUD_MODEL: 'Model name for cloud provider',
  BRITTNEY_CLOUD_ENDPOINT: 'Custom endpoint for Azure or self-hosted',
  BRITTNEY_PREFER_CLOUD: 'Prefer cloud over local (default: false)',

  // Also supports standard env vars
  OPENAI_API_KEY: 'OpenAI API key (fallback)',
  ANTHROPIC_API_KEY: 'Anthropic API key (fallback)',
  AZURE_OPENAI_ENDPOINT: 'Azure OpenAI endpoint (fallback)',

  // Server
  BRITTNEY_PORT: 'Server port (default: 11435)',
  BRITTNEY_HOST: 'Server host (default: localhost)',

  // Behavior
  BRITTNEY_AUTO_LOAD: 'Auto-load model on start (default: true)',
  BRITTNEY_LOG_LEVEL: 'Log level: debug, info, warn, error',
};
