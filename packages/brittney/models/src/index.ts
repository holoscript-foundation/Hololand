/**
 * @hololand/brittney-models
 * 
 * Official model registry and download utilities for Brittney AI.
 * 
 * @example
 * ```typescript
 * import { downloadModel, getModelPath, MODEL_REGISTRY } from '@hololand/brittney-models';
 * 
 * // Download the free V1 model
 * await downloadModel('v1-free');
 * 
 * // Get path to downloaded model
 * const modelPath = await getModelPath('v1-free');
 * ```
 * 
 * @packageDocumentation
 */

export {
  MODEL_REGISTRY,
  getModelInfo,
  getRecommendedModel,
  getFreeModels,
  getDefaultModel,
  getDownloadUrl,
  type ModelInfo,
} from './registry.js';

export {
  downloadModel,
  getModelPath,
  isModelDownloaded,
  getDefaultModelsDir,
  type DownloadOptions,
  type DownloadProgress,
  type DownloadResult,
} from './download.js';

/**
 * Package version
 */
export const VERSION = '1.0.0';

/**
 * Quick start helper - downloads the recommended free model
 */
export async function quickStart(options?: { destination?: string }): Promise<string> {
  const { downloadModel } = await import('./download.js');
  const { getDefaultModel } = await import('./registry.js');
  const model = getDefaultModel();
  const result = await downloadModel(model.id, options);
  return result.path;
}
