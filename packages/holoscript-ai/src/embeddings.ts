/**
 * @holoscript/ai - Embeddings Module
 *
 * Vector embeddings and similarity search for HoloScript AI.
 */

import type { AIProvider, EmbeddingOptions } from './types.js';

/**
 * Vector similarity functions
 */
export const Similarity = {
  /**
   * Cosine similarity between two vectors
   */
  cosine(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  },

  /**
   * Euclidean distance between two vectors
   */
  euclidean(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }

    return Math.sqrt(sum);
  },

  /**
   * Dot product between two vectors
   */
  dotProduct(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }

    return sum;
  },

  /**
   * Manhattan distance between two vectors
   */
  manhattan(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs(a[i] - b[i]);
    }

    return sum;
  },
};

/**
 * Embedded document
 */
export interface EmbeddedDocument<T = unknown> {
  id: string;
  content: string;
  embedding: number[];
  metadata?: T;
}

/**
 * Search result
 */
export interface SearchResult<T = unknown> {
  document: EmbeddedDocument<T>;
  score: number;
  distance?: number;
}

/**
 * Vector store options
 */
export interface VectorStoreOptions {
  /** Similarity function to use */
  similarity?: 'cosine' | 'euclidean' | 'dotProduct';
}

/**
 * In-memory vector store
 */
export class VectorStore<T = unknown> {
  private documents: Map<string, EmbeddedDocument<T>> = new Map();
  private options: VectorStoreOptions;
  private similarityFn: (a: number[], b: number[]) => number;

  constructor(options: VectorStoreOptions = {}) {
    this.options = {
      similarity: 'cosine',
      ...options,
    };

    switch (this.options.similarity) {
      case 'euclidean':
        // Convert distance to similarity (higher is better)
        this.similarityFn = (a, b) => 1 / (1 + Similarity.euclidean(a, b));
        break;
      case 'dotProduct':
        this.similarityFn = Similarity.dotProduct;
        break;
      default:
        this.similarityFn = Similarity.cosine;
    }
  }

  /**
   * Add a document to the store
   */
  add(document: EmbeddedDocument<T>): void {
    this.documents.set(document.id, document);
  }

  /**
   * Add multiple documents
   */
  addMany(documents: EmbeddedDocument<T>[]): void {
    for (const doc of documents) {
      this.add(doc);
    }
  }

  /**
   * Get a document by ID
   */
  get(id: string): EmbeddedDocument<T> | undefined {
    return this.documents.get(id);
  }

  /**
   * Remove a document
   */
  remove(id: string): boolean {
    return this.documents.delete(id);
  }

  /**
   * Clear all documents
   */
  clear(): void {
    this.documents.clear();
  }

  /**
   * Get the number of documents
   */
  get size(): number {
    return this.documents.size;
  }

  /**
   * Search for similar documents
   */
  search(queryEmbedding: number[], limit = 10, threshold?: number): SearchResult<T>[] {
    const results: SearchResult<T>[] = [];

    for (const doc of this.documents.values()) {
      const score = this.similarityFn(queryEmbedding, doc.embedding);

      if (threshold === undefined || score >= threshold) {
        results.push({
          document: doc,
          score,
          distance: this.options.similarity === 'euclidean' ? Similarity.euclidean(queryEmbedding, doc.embedding) : undefined,
        });
      }
    }

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Get all documents
   */
  getAll(): EmbeddedDocument<T>[] {
    return Array.from(this.documents.values());
  }

  /**
   * Export store to JSON
   */
  toJSON(): { documents: EmbeddedDocument<T>[]; options: VectorStoreOptions } {
    return {
      documents: this.getAll(),
      options: this.options,
    };
  }

  /**
   * Import from JSON
   */
  static fromJSON<T>(json: { documents: EmbeddedDocument<T>[]; options?: VectorStoreOptions }): VectorStore<T> {
    const store = new VectorStore<T>(json.options);
    store.addMany(json.documents);
    return store;
  }
}

/**
 * Embedding service that wraps a provider
 */
export class EmbeddingService {
  private provider: AIProvider;
  private cache: Map<string, number[]> = new Map();
  private options: EmbeddingOptions;

  constructor(provider: AIProvider, options: EmbeddingOptions = {}) {
    this.provider = provider;
    this.options = options;
  }

  /**
   * Embed a single text
   */
  async embed(text: string): Promise<number[]> {
    // Check cache
    const cached = this.cache.get(text);
    if (cached) return cached;

    const response = await this.provider.embed([text], this.options);
    const embedding = response.embeddings[0];

    // Cache the result
    this.cache.set(text, embedding);

    return embedding;
  }

  /**
   * Embed multiple texts
   */
  async embedMany(texts: string[]): Promise<number[][]> {
    // Check which texts need embedding
    const uncached: string[] = [];
    const results: Map<string, number[]> = new Map();

    for (const text of texts) {
      const cached = this.cache.get(text);
      if (cached) {
        results.set(text, cached);
      } else {
        uncached.push(text);
      }
    }

    // Embed uncached texts
    if (uncached.length > 0) {
      const response = await this.provider.embed(uncached, this.options);
      for (let i = 0; i < uncached.length; i++) {
        const text = uncached[i];
        const embedding = response.embeddings[i];
        this.cache.set(text, embedding);
        results.set(text, embedding);
      }
    }

    // Return in original order
    return texts.map((text) => results.get(text)!);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  get cacheSize(): number {
    return this.cache.size;
  }
}

/**
 * RAG (Retrieval-Augmented Generation) helper
 */
export class RAGHelper<T = unknown> {
  private store: VectorStore<T>;
  private embeddingService: EmbeddingService;

  constructor(provider: AIProvider, options?: { embedding?: EmbeddingOptions; store?: VectorStoreOptions }) {
    this.embeddingService = new EmbeddingService(provider, options?.embedding);
    this.store = new VectorStore<T>(options?.store);
  }

  /**
   * Index a document
   */
  async index(id: string, content: string, metadata?: T): Promise<void> {
    const embedding = await this.embeddingService.embed(content);
    this.store.add({ id, content, embedding, metadata });
  }

  /**
   * Index multiple documents
   */
  async indexMany(documents: Array<{ id: string; content: string; metadata?: T }>): Promise<void> {
    const contents = documents.map((d) => d.content);
    const embeddings = await this.embeddingService.embedMany(contents);

    for (let i = 0; i < documents.length; i++) {
      this.store.add({
        id: documents[i].id,
        content: documents[i].content,
        embedding: embeddings[i],
        metadata: documents[i].metadata,
      });
    }
  }

  /**
   * Search for relevant documents
   */
  async search(query: string, limit = 5): Promise<SearchResult<T>[]> {
    const queryEmbedding = await this.embeddingService.embed(query);
    return this.store.search(queryEmbedding, limit);
  }

  /**
   * Get context for a query (formatted for LLM)
   */
  async getContext(query: string, limit = 5): Promise<string> {
    const results = await this.search(query, limit);

    if (results.length === 0) {
      return 'No relevant context found.';
    }

    return results.map((r, i) => `[${i + 1}] ${r.document.content}`).join('\n\n');
  }

  /**
   * Get the underlying store
   */
  getStore(): VectorStore<T> {
    return this.store;
  }

  /**
   * Clear all indexed documents
   */
  clear(): void {
    this.store.clear();
    this.embeddingService.clearCache();
  }
}

/**
 * Chunk text into smaller pieces
 */
export function chunkText(
  text: string,
  options: {
    maxChunkSize?: number;
    overlap?: number;
    separator?: string;
  } = {}
): string[] {
  const { maxChunkSize = 1000, overlap = 100, separator = '\n\n' } = options;

  // First, split by separator
  const paragraphs = text.split(separator);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + separator.length <= maxChunkSize) {
      currentChunk += (currentChunk ? separator : '') + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }

      if (paragraph.length > maxChunkSize) {
        // Split long paragraph into smaller chunks
        let start = 0;
        while (start < paragraph.length) {
          const end = Math.min(start + maxChunkSize, paragraph.length);
          chunks.push(paragraph.slice(start, end));
          start = end - overlap;
        }
        currentChunk = '';
      } else {
        currentChunk = paragraph;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Chunk HoloScript code intelligently
 */
export function chunkHoloScript(code: string): string[] {
  const chunks: string[] = [];

  // Split by top-level constructs
  const constructRegex = /^(orb|world|material|system|fn|import|export)\s+/gm;
  let lastIndex = 0;
  let match;

  while ((match = constructRegex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      const chunk = code.slice(lastIndex, match.index).trim();
      if (chunk) chunks.push(chunk);
    }
    lastIndex = match.index;
  }

  // Add remaining code
  if (lastIndex < code.length) {
    const chunk = code.slice(lastIndex).trim();
    if (chunk) chunks.push(chunk);
  }

  return chunks;
}
