/**
 * Brittney Model Configuration
 * 
 * Default paths and model settings for the Brittney inference engine.
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';

// Get package directory (works in ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Default models directory relative to package */
export const MODELS_DIR = resolve(__dirname, '../../models');

/** Model file names */
export const MODEL_FILES = {
  /** Basic model (available now) */
  base: 'brittney-base.gguf',
  /** Enhanced model v2 (coming soon) */
  v2: 'brittney-v2.gguf',
} as const;

/** Default model to use */
export const DEFAULT_MODEL = MODEL_FILES.base;

/**
 * Get the full path to a model file
 */
export function getModelPath(modelName: keyof typeof MODEL_FILES | string = 'base'): string {
  // If it's a key in MODEL_FILES, resolve it
  const fileName = MODEL_FILES[modelName as keyof typeof MODEL_FILES] ?? modelName;
  
  // If already absolute path, return as-is
  if (fileName.includes('/') || fileName.includes('\\')) {
    return resolve(fileName);
  }
  
  return join(MODELS_DIR, fileName);
}

/**
 * Check if a model exists
 */
export function modelExists(modelName: keyof typeof MODEL_FILES | string = 'base'): boolean {
  return existsSync(getModelPath(modelName));
}

/**
 * Get the best available model
 * Prefers v2 if available, falls back to base
 */
export function getBestAvailableModel(): string | null {
  // Prefer v2 if available
  if (modelExists('v2')) {
    return getModelPath('v2');
  }
  
  // Fall back to base
  if (modelExists('base')) {
    return getModelPath('base');
  }
  
  // Check environment variable
  const envPath = process.env.BRITTNEY_MODEL_PATH;
  if (envPath && existsSync(envPath)) {
    return resolve(envPath);
  }
  
  return null;
}

/**
 * Recommended model configuration
 */
export const DEFAULT_MODEL_CONFIG = {
  /** Context window size */
  contextSize: 4096,
  /** Number of GPU layers (0 for CPU-only) */
  gpuLayers: 0,
  /** Number of threads */
  threads: 4,
  /** Temperature for generation */
  temperature: 0.7,
  /** Top-p sampling */
  topP: 0.9,
  /** Max tokens to generate */
  maxTokens: 2048,
} as const;

export type ModelConfig = typeof DEFAULT_MODEL_CONFIG;
