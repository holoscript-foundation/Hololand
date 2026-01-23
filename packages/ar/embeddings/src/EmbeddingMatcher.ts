/**
 * Embedding Matcher
 * 
 * Matches query embeddings against a gallery of known persons.
 */

import type {
  Embedding,
  PersonEmbedding,
  GalleryEntry,
  MatchResult,
  MatchingConfig,
  DistanceMetric,
} from './types';
import { DEFAULT_MATCHING_CONFIG } from './types';

/**
 * Embedding Matcher
 * 
 * Matches embeddings against a gallery for person re-identification.
 */
export class EmbeddingMatcher {
  private config: MatchingConfig;
  private gallery: Map<string, GalleryEntry> = new Map();

  constructor(config?: Partial<MatchingConfig>) {
    this.config = { ...DEFAULT_MATCHING_CONFIG, ...config };
  }

  // ===========================================================================
  // GALLERY MANAGEMENT
  // ===========================================================================

  /**
   * Add entry to gallery
   */
  addToGallery(
    personId: string,
    embedding: Embedding,
    name?: string,
    metadata?: Record<string, unknown>
  ): void {
    const existing = this.gallery.get(personId);
    
    if (existing) {
      // Add embedding to existing entry
      existing.embeddings.push(embedding);
      existing.lastSeen = Date.now();
      
      // Keep gallery size manageable (max 10 embeddings per person)
      if (existing.embeddings.length > 10) {
        existing.embeddings.shift();
      }
    } else {
      // Create new entry
      this.gallery.set(personId, {
        personId,
        embeddings: [embedding],
        name,
        metadata,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      });
    }
  }

  /**
   * Remove entry from gallery
   */
  removeFromGallery(personId: string): boolean {
    return this.gallery.delete(personId);
  }

  /**
   * Clear entire gallery
   */
  clearGallery(): void {
    this.gallery.clear();
  }

  /**
   * Get gallery entry
   */
  getGalleryEntry(personId: string): GalleryEntry | undefined {
    return this.gallery.get(personId);
  }

  /**
   * Get all gallery entries
   */
  getAllGalleryEntries(): GalleryEntry[] {
    return Array.from(this.gallery.values());
  }

  /**
   * Get gallery size
   */
  getGallerySize(): number {
    return this.gallery.size;
  }

  // ===========================================================================
  // MATCHING
  // ===========================================================================

  /**
   * Find matches for a query embedding
   */
  match(query: Embedding): MatchResult[] {
    const results: MatchResult[] = [];

    for (const entry of this.gallery.values()) {
      // Find best matching embedding in this person's gallery
      let bestSimilarity = -Infinity;
      
      for (const galleryEmb of entry.embeddings) {
        const similarity = this.computeSimilarity(query, galleryEmb);
        bestSimilarity = Math.max(bestSimilarity, similarity);
      }

      if (bestSimilarity >= this.config.threshold) {
        results.push({
          personId: entry.personId,
          similarity: bestSimilarity,
          distance: this.similarityToDistance(bestSimilarity),
          confidence: this.computeConfidence(bestSimilarity, entry.embeddings.length),
        });
      }
    }

    // Sort by similarity (descending)
    results.sort((a, b) => b.similarity - a.similarity);

    // Return top K
    return results.slice(0, this.config.topK);
  }

  /**
   * Find best match for a query embedding
   */
  matchBest(query: Embedding): MatchResult | null {
    const matches = this.match(query);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Match with quality filtering
   */
  matchWithQuality(query: PersonEmbedding): MatchResult[] {
    // Filter by quality
    if (query.quality < this.config.minQuality) {
      return [];
    }
    if (query.occlusion > this.config.maxOcclusion) {
      return [];
    }

    return this.match(query);
  }

  /**
   * Batch match multiple queries
   */
  matchBatch(queries: Embedding[]): MatchResult[][] {
    return queries.map(q => this.match(q));
  }

  // ===========================================================================
  // SIMILARITY COMPUTATION
  // ===========================================================================

  /**
   * Compute similarity between two embeddings
   */
  computeSimilarity(a: Embedding, b: Embedding): number {
    if (a.dimensions !== b.dimensions) {
      throw new Error(`Dimension mismatch: ${a.dimensions} vs ${b.dimensions}`);
    }

    switch (this.config.metric) {
      case 'cosine':
        return this.cosineSimilarity(a.vector, b.vector);
      case 'euclidean':
        return this.euclideanSimilarity(a.vector, b.vector);
      case 'manhattan':
        return this.manhattanSimilarity(a.vector, b.vector);
      default:
        return this.cosineSimilarity(a.vector, b.vector);
    }
  }

  /**
   * Cosine similarity (assumes L2 normalized vectors)
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return dot; // For normalized vectors, dot product = cosine similarity
  }

  /**
   * Euclidean similarity (converted from distance)
   */
  private euclideanSimilarity(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    const distance = Math.sqrt(sum);
    // Convert distance to similarity (assuming max distance ~2 for normalized vectors)
    return Math.max(0, 1 - distance / 2);
  }

  /**
   * Manhattan similarity (converted from distance)
   */
  private manhattanSimilarity(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs(a[i] - b[i]);
    }
    // Normalize by dimensions and convert to similarity
    const normalizedDistance = sum / a.length;
    return Math.max(0, 1 - normalizedDistance);
  }

  /**
   * Convert similarity to distance
   */
  private similarityToDistance(similarity: number): number {
    switch (this.config.metric) {
      case 'cosine':
        return 1 - similarity;
      case 'euclidean':
        return 2 * (1 - similarity);
      case 'manhattan':
        return 1 - similarity;
      default:
        return 1 - similarity;
    }
  }

  /**
   * Compute confidence based on match quality and gallery size
   */
  private computeConfidence(similarity: number, gallerySize: number): number {
    // Higher similarity = higher confidence
    let confidence = similarity;
    
    // More samples = higher confidence (up to a point)
    const sizeBonus = Math.min(0.1, gallerySize * 0.02);
    confidence += sizeBonus;
    
    // Scale based on how much above threshold
    const margin = similarity - this.config.threshold;
    if (margin > 0) {
      confidence += margin * 0.5;
    }
    
    return Math.min(1, Math.max(0, confidence));
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Compute pairwise similarity matrix
   */
  computeSimilarityMatrix(embeddings: Embedding[]): Float32Array {
    const n = embeddings.length;
    const matrix = new Float32Array(n * n);
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        matrix[i * n + j] = this.computeSimilarity(embeddings[i], embeddings[j]);
      }
    }
    
    return matrix;
  }

  /**
   * Cluster embeddings using simple agglomerative clustering
   */
  clusterEmbeddings(
    embeddings: Embedding[],
    threshold: number
  ): number[][] {
    const n = embeddings.length;
    const clusters: number[][] = embeddings.map((_, i) => [i]);
    const similarities = this.computeSimilarityMatrix(embeddings);
    
    // Simple agglomerative clustering
    while (true) {
      let bestSim = -Infinity;
      let bestI = -1;
      let bestJ = -1;
      
      // Find most similar pair of clusters
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          // Average linkage
          let sumSim = 0;
          for (const a of clusters[i]) {
            for (const b of clusters[j]) {
              sumSim += similarities[a * n + b];
            }
          }
          const avgSim = sumSim / (clusters[i].length * clusters[j].length);
          
          if (avgSim > bestSim) {
            bestSim = avgSim;
            bestI = i;
            bestJ = j;
          }
        }
      }
      
      // Stop if best similarity below threshold
      if (bestSim < threshold || bestI < 0) break;
      
      // Merge clusters
      clusters[bestI] = [...clusters[bestI], ...clusters[bestJ]];
      clusters.splice(bestJ, 1);
    }
    
    return clusters;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<MatchingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): MatchingConfig {
    return { ...this.config };
  }

  /**
   * Export gallery for persistence
   */
  exportGallery(): GalleryEntry[] {
    return Array.from(this.gallery.values());
  }

  /**
   * Import gallery from saved data
   */
  importGallery(entries: GalleryEntry[]): void {
    this.gallery.clear();
    for (const entry of entries) {
      this.gallery.set(entry.personId, entry);
    }
  }
}
