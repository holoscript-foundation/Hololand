/**
 * Brittney Model Registry
 * 
 * Official registry of available Brittney AI models.
 * Free models are MIT licensed and available for download.
 */

export interface ModelInfo {
  /** Unique model identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Semantic version */
  version: string;
  /** Human-readable size */
  size: string;
  /** Size in bytes for progress tracking */
  sizeBytes: number;
  /** SHA-256 checksum for verification */
  checksum: string;
  /** Download URL */
  downloadUrl: string;
  /** License type */
  license: 'MIT' | 'proprietary';
  /** Feature list */
  features: string[];
  /** Minimum RAM requirement */
  minMemory: string;
  /** Whether this is the recommended model */
  recommended: boolean;
  /** Model file format */
  format: 'gguf' | 'onnx' | 'safetensors';
  /** Quantization level if applicable */
  quantization?: 'f16' | 'q4_k_m' | 'q5_k_m' | 'q8_0';
  /** Release date */
  releaseDate: string;
  /** Release notes URL */
  releaseNotes?: string;
}

/**
 * GitHub releases base URL
 */
const RELEASES_BASE = 'https://github.com/hololand/hololand/releases/download';

/**
 * Model Registry - All available Brittney models
 * 
 * V1 Free IS the expert model - we're giving users the best quality.
 */
export const MODEL_REGISTRY: Record<string, ModelInfo> = {
  // ===== FREE TIER (MIT) - EXPERT MODEL =====
  
  'v1-free': {
    id: 'v1-free',
    name: 'Brittney V1 Expert (Free)',
    version: '1.0.0',
    size: '1.57 GB',
    sizeBytes: 1_646_572_544,
    checksum: 'sha256:pending-release', // Updated on release
    downloadUrl: `${RELEASES_BASE}/brittney-v1.0.0/brittney-v1-expert.gguf`,
    license: 'MIT',
    features: [
      'HoloScript expert-level assistance',
      'Advanced code completion',
      'World building mastery',
      'VR/AR development patterns',
      'Error diagnosis & fixes',
      'Best-in-class quality',
    ],
    minMemory: '4 GB',
    recommended: true,
    format: 'gguf',
    quantization: 'f16',
    releaseDate: '2026-01-25',
    releaseNotes: `${RELEASES_BASE}/brittney-v1.0.0`,
  },
  
  'v1-q4': {
    id: 'v1-q4',
    name: 'Brittney V1 Expert Q4',
    version: '1.0.0',
    size: '0.9 GB',
    sizeBytes: 943_718_400,
    checksum: 'sha256:pending-release',
    downloadUrl: `${RELEASES_BASE}/brittney-v1.0.0/brittney-v1-expert-q4.gguf`,
    license: 'MIT',
    features: [
      'HoloScript expert assistance',
      'Fast inference',
      'Mobile-optimized',
    ],
    minMemory: '2 GB',
    recommended: false,
    format: 'gguf',
    quantization: 'q4_k_m',
    releaseDate: '2026-01-25',
  },
  
  'v1-q8': {
    id: 'v1-q8',
    name: 'Brittney V1 Expert Q8',
    version: '1.0.0',
    size: '1.2 GB',
    sizeBytes: 1_288_490_189,
    checksum: 'sha256:pending-release',
    downloadUrl: `${RELEASES_BASE}/brittney-v1.0.0/brittney-v1-expert-q8.gguf`,
    license: 'MIT',
    features: [
      'HoloScript expert assistance',
      'Better quality than Q4',
      'Balanced speed/quality',
    ],
    minMemory: '3 GB',
    recommended: false,
    format: 'gguf',
    quantization: 'q8_0',
    releaseDate: '2026-01-25',
  },
};

/**
 * Get model info by ID
 */
export function getModelInfo(modelId: string): ModelInfo | undefined {
  return MODEL_REGISTRY[modelId];
}

/**
 * Get recommended model for a given memory constraint
 */
export function getRecommendedModel(availableMemoryGB: number): ModelInfo {
  if (availableMemoryGB >= 4) {
    return MODEL_REGISTRY['v1-free'];
  } else if (availableMemoryGB >= 3) {
    return MODEL_REGISTRY['v1-q8'];
  } else {
    return MODEL_REGISTRY['v1-q4'];
  }
}

/**
 * Get all free models
 */
export function getFreeModels(): ModelInfo[] {
  return Object.values(MODEL_REGISTRY).filter(m => m.license === 'MIT');
}

/**
 * Get the default/recommended model
 */
export function getDefaultModel(): ModelInfo {
  return MODEL_REGISTRY['v1-free'];
}

/**
 * Model download URL with optional mirror support
 */
export function getDownloadUrl(modelId: string, mirror?: string): string {
  const model = MODEL_REGISTRY[modelId];
  if (!model) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  
  if (mirror) {
    return `${mirror}/brittney-v${model.version}/${modelId}.gguf`;
  }
  
  return model.downloadUrl;
}
