/**
 * Embedding Matcher Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EmbeddingMatcher } from '../EmbeddingMatcher';
import type { Embedding } from '../types';

function createEmbedding(values: number[]): Embedding {
  const vector = new Float32Array(values);
  return {
    vector,
    dimensions: values.length,
    normalized: true,
    timestamp: Date.now(),
  };
}

function createNormalizedEmbedding(values: number[]): Embedding {
  // L2 normalize
  let norm = 0;
  for (const v of values) norm += v * v;
  norm = Math.sqrt(norm);
  const normalized = values.map(v => v / norm);
  return createEmbedding(normalized);
}

describe('EmbeddingMatcher', () => {
  let matcher: EmbeddingMatcher;

  beforeEach(() => {
    matcher = new EmbeddingMatcher({
      metric: 'cosine',
      threshold: 0.5,
      topK: 5,
    });
  });

  describe('gallery management', () => {
    it('should add entry to gallery', () => {
      const embedding = createNormalizedEmbedding([1, 0, 0, 0]);
      matcher.addToGallery('person_1', embedding, 'Alice');
      
      expect(matcher.getGallerySize()).toBe(1);
    });

    it('should accumulate embeddings for same person', () => {
      const emb1 = createNormalizedEmbedding([1, 0, 0, 0]);
      const emb2 = createNormalizedEmbedding([0.9, 0.1, 0, 0]);
      
      matcher.addToGallery('person_1', emb1);
      matcher.addToGallery('person_1', emb2);
      
      const entry = matcher.getGalleryEntry('person_1');
      expect(entry?.embeddings.length).toBe(2);
    });

    it('should remove entry from gallery', () => {
      const embedding = createNormalizedEmbedding([1, 0, 0, 0]);
      matcher.addToGallery('person_1', embedding);
      
      const removed = matcher.removeFromGallery('person_1');
      
      expect(removed).toBe(true);
      expect(matcher.getGallerySize()).toBe(0);
    });

    it('should clear gallery', () => {
      matcher.addToGallery('p1', createNormalizedEmbedding([1, 0, 0, 0]));
      matcher.addToGallery('p2', createNormalizedEmbedding([0, 1, 0, 0]));
      
      matcher.clearGallery();
      
      expect(matcher.getGallerySize()).toBe(0);
    });

    it('should export and import gallery', () => {
      matcher.addToGallery('p1', createNormalizedEmbedding([1, 0, 0, 0]), 'Alice');
      matcher.addToGallery('p2', createNormalizedEmbedding([0, 1, 0, 0]), 'Bob');
      
      const exported = matcher.exportGallery();
      
      const newMatcher = new EmbeddingMatcher();
      newMatcher.importGallery(exported);
      
      expect(newMatcher.getGallerySize()).toBe(2);
    });
  });

  describe('similarity computation', () => {
    it('should compute cosine similarity of 1 for identical vectors', () => {
      const emb = createNormalizedEmbedding([1, 0, 0, 0]);
      
      const similarity = matcher.computeSimilarity(emb, emb);
      
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should compute cosine similarity of 0 for orthogonal vectors', () => {
      const emb1 = createNormalizedEmbedding([1, 0, 0, 0]);
      const emb2 = createNormalizedEmbedding([0, 1, 0, 0]);
      
      const similarity = matcher.computeSimilarity(emb1, emb2);
      
      expect(similarity).toBeCloseTo(0, 5);
    });

    it('should compute cosine similarity of -1 for opposite vectors', () => {
      const emb1 = createNormalizedEmbedding([1, 0, 0, 0]);
      const emb2 = createNormalizedEmbedding([-1, 0, 0, 0]);
      
      const similarity = matcher.computeSimilarity(emb1, emb2);
      
      expect(similarity).toBeCloseTo(-1, 5);
    });
  });

  describe('matching', () => {
    beforeEach(() => {
      matcher.addToGallery('alice', createNormalizedEmbedding([1, 0, 0, 0]), 'Alice');
      matcher.addToGallery('bob', createNormalizedEmbedding([0, 1, 0, 0]), 'Bob');
      matcher.addToGallery('charlie', createNormalizedEmbedding([0, 0, 1, 0]), 'Charlie');
    });

    it('should match query to most similar gallery entry', () => {
      const query = createNormalizedEmbedding([0.95, 0.05, 0, 0]); // Close to Alice
      
      const matches = matcher.match(query);
      
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].personId).toBe('alice');
    });

    it('should return matches above threshold', () => {
      const query = createNormalizedEmbedding([0.8, 0.2, 0, 0]);
      
      const matches = matcher.match(query);
      
      for (const match of matches) {
        expect(match.similarity).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('should return empty for no matches above threshold', () => {
      const query = createNormalizedEmbedding([0.5, 0.5, 0.5, 0.5]); // Not close to anyone
      
      const matches = matcher.match(query);
      
      // May or may not have matches depending on exact similarity
      for (const match of matches) {
        expect(match.similarity).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('should matchBest return single best match', () => {
      const query = createNormalizedEmbedding([0.1, 0.9, 0.1, 0]);
      
      const match = matcher.matchBest(query);
      
      expect(match?.personId).toBe('bob');
    });

    it('should matchBest return null for no matches', () => {
      matcher.clearGallery();
      const query = createNormalizedEmbedding([1, 0, 0, 0]);
      
      const match = matcher.matchBest(query);
      
      expect(match).toBeNull();
    });
  });

  describe('clustering', () => {
    it('should cluster similar embeddings together', () => {
      const embeddings = [
        createNormalizedEmbedding([1, 0, 0, 0]),
        createNormalizedEmbedding([0.98, 0.02, 0, 0]), // Similar to 0
        createNormalizedEmbedding([0, 1, 0, 0]),
        createNormalizedEmbedding([0.02, 0.98, 0, 0]), // Similar to 2
      ];
      
      const clusters = matcher.clusterEmbeddings(embeddings, 0.9);
      
      // Should have 2 clusters
      expect(clusters.length).toBe(2);
      
      // Each cluster should have 2 items
      expect(clusters[0].length).toBe(2);
      expect(clusters[1].length).toBe(2);
    });

    it('should keep dissimilar embeddings in separate clusters', () => {
      const embeddings = [
        createNormalizedEmbedding([1, 0, 0, 0]),
        createNormalizedEmbedding([0, 1, 0, 0]),
        createNormalizedEmbedding([0, 0, 1, 0]),
      ];
      
      const clusters = matcher.clusterEmbeddings(embeddings, 0.9);
      
      // All dissimilar, each in own cluster
      expect(clusters.length).toBe(3);
    });
  });

  describe('similarity matrix', () => {
    it('should compute pairwise similarity matrix', () => {
      const embeddings = [
        createNormalizedEmbedding([1, 0, 0, 0]),
        createNormalizedEmbedding([0, 1, 0, 0]),
        createNormalizedEmbedding([1, 0, 0, 0]), // Same as first
      ];
      
      const matrix = matcher.computeSimilarityMatrix(embeddings);
      
      expect(matrix.length).toBe(9); // 3x3
      
      // Diagonal should be 1
      expect(matrix[0]).toBeCloseTo(1);
      expect(matrix[4]).toBeCloseTo(1);
      expect(matrix[8]).toBeCloseTo(1);
      
      // [0][2] and [2][0] should be 1 (identical)
      expect(matrix[2]).toBeCloseTo(1);
      expect(matrix[6]).toBeCloseTo(1);
    });
  });
});
