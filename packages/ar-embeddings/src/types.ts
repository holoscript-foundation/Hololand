/**
 * @hololand/ar-embeddings - Type Definitions
 * 
 * Person re-identification embedding types.
 */

// =============================================================================
// EMBEDDING TYPES
// =============================================================================

/**
 * Feature embedding vector
 */
export interface Embedding {
  /** Feature vector (typically 128-512 dimensions) */
  vector: Float32Array;
  /** Dimensionality */
  dimensions: number;
  /** L2 normalization applied */
  normalized: boolean;
  /** Timestamp of extraction */
  timestamp: number;
}

/**
 * Person embedding with metadata
 */
export interface PersonEmbedding extends Embedding {
  /** Detection ID from @hololand/ar-detection */
  detectionId: number;
  /** Source bounding box */
  boundingBox: BoundingBox;
  /** Image quality score [0-1] */
  quality: number;
  /** Occlusion level [0-1] (0 = no occlusion) */
  occlusion: number;
}

/**
 * Bounding box
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// =============================================================================
// GALLERY & MATCHING
// =============================================================================

/**
 * Gallery entry for known person
 */
export interface GalleryEntry {
  /** Unique person ID */
  personId: string;
  /** Multiple embeddings for this person (different views/poses) */
  embeddings: Embedding[];
  /** Display name (optional) */
  name?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** First seen timestamp */
  firstSeen: number;
  /** Last seen timestamp */
  lastSeen: number;
}

/**
 * Match result from gallery search
 */
export interface MatchResult {
  /** Matched person ID */
  personId: string;
  /** Similarity score [0-1] */
  similarity: number;
  /** Distance (1 - similarity for cosine) */
  distance: number;
  /** Confidence based on gallery size and match quality */
  confidence: number;
}

// =============================================================================
// MODEL CONFIGURATION
// =============================================================================

export type ModelBackend = 'tfjs' | 'onnx';
export type ModelType = 'osnet' | 'fastreid' | 'custom';

export interface EmbeddingModelConfig {
  /** Model type */
  model: ModelType;
  /** Model backend */
  backend: ModelBackend;
  /** Model path (URL or local path) */
  modelPath: string;
  /** Input image size */
  inputSize: { width: number; height: number };
  /** Output embedding dimensions */
  outputDimensions: number;
  /** Apply L2 normalization */
  normalize: boolean;
  /** Preprocessing mean (RGB) */
  mean?: [number, number, number];
  /** Preprocessing std (RGB) */
  std?: [number, number, number];
}

export const DEFAULT_MODEL_CONFIG: EmbeddingModelConfig = {
  model: 'osnet',
  backend: 'onnx',
  modelPath: 'https://cdn.example.com/models/osnet_x0_25.onnx',
  inputSize: { width: 128, height: 256 },
  outputDimensions: 512,
  normalize: true,
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
};

// =============================================================================
// MATCHING CONFIGURATION
// =============================================================================

export type DistanceMetric = 'cosine' | 'euclidean' | 'manhattan';

export interface MatchingConfig {
  /** Distance metric */
  metric: DistanceMetric;
  /** Similarity threshold for positive match */
  threshold: number;
  /** Maximum candidates to return */
  topK: number;
  /** Minimum quality for embedding */
  minQuality: number;
  /** Maximum occlusion for embedding */
  maxOcclusion: number;
}

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  metric: 'cosine',
  threshold: 0.6,
  topK: 5,
  minQuality: 0.5,
  maxOcclusion: 0.5,
};
