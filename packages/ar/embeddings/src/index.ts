/**
 * @hololand/ar-embeddings
 * 
 * Person re-identification embeddings for AR tracking.
 * 
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │                          Architecture                               │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │                                                                     │
 * │  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐   │
 * │  │ Person Crop │────▶│ Preprocessor│────▶│ ReID Model          │   │
 * │  │             │     │ (resize,    │     │ (OSNet, FastReID)   │   │
 * │  └─────────────┘     │  normalize) │     └──────────┬──────────┘   │
 * │                      └─────────────┘                │              │
 * │                                                     ▼              │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                    Embedding Vector                          │   │
 * │  │                (512-dim, L2 normalized)                      │   │
 * │  └───────────────────────────┬─────────────────────────────────┘   │
 * │                              │                                     │
 * │                              ▼                                     │
 * │  ┌─────────────────────────────────────────────────────────────┐   │
 * │  │                    Embedding Matcher                         │   │
 * │  │  - Gallery management                                        │   │
 * │  │  - Cosine similarity matching                                │   │
 * │  │  - Multi-view fusion                                         │   │
 * │  └─────────────────────────────────────────────────────────────┘   │
 * │                                                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 * 
 * Usage:
 * 
 * ```typescript
 * import { EmbeddingExtractor, EmbeddingMatcher } from '@hololand/ar-embeddings';
 * 
 * // Initialize extractor
 * const extractor = new EmbeddingExtractor({
 *   model: 'osnet',
 *   backend: 'onnx',
 * });
 * await extractor.initialize();
 * 
 * // Initialize matcher
 * const matcher = new EmbeddingMatcher({
 *   metric: 'cosine',
 *   threshold: 0.6,
 * });
 * 
 * // Extract embedding from person crop
 * const embedding = await extractor.extract(personCrop);
 * 
 * // Match against gallery
 * const matches = matcher.match(embedding);
 * 
 * // Add to gallery for future matching
 * matcher.addToGallery('person_123', embedding);
 * ```
 */

// Types
export * from './types';

// Image Preprocessing
export { ImagePreprocessor, type PreprocessConfig } from './ImagePreprocessor';

// Embedding Extraction
export { EmbeddingExtractor } from './EmbeddingExtractor';

// Embedding Matching
export { EmbeddingMatcher } from './EmbeddingMatcher';
