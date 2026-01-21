/**
 * HoloScript+ Knowledge System
 *
 * Loads knowledge, prompts, and server definitions from HoloScript+ files.
 * Provides search and query capabilities for RAG and agent observation.
 *
 * Pattern: P.KNOWLEDGE.HOLOSCRIPT.01
 * Wisdom: W.KNOWLEDGE.DECLARATIVE.01 - "Knowledge should be declarative"
 */

import { EventEmitter } from 'events';
import {
  parseKnowledgeFile,
  parsePromptsFile,
  parseServerFile,
  getKnowledgePath,
  HSKnowledgeFile,
  HSPromptFile,
  HSServerFile,
  HSKnowledgeChunk,
  HSPrompt,
  HSRoute,
} from './hs-parser.js';

// =============================================================================
// Types
// =============================================================================

export interface SearchResult {
  id: string;
  category: string;
  content: string;
  keywords: string[];
  score: number;
}

export interface KnowledgeEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

// =============================================================================
// Knowledge Service
// =============================================================================

export class KnowledgeService extends EventEmitter {
  private knowledge: HSKnowledgeFile | null = null;
  private prompts: HSPromptFile | null = null;
  private server: HSServerFile | null = null;
  private loaded = false;

  /**
   * Load all HoloScript+ files
   */
  async load(): Promise<void> {
    try {
      this.knowledge = parseKnowledgeFile(getKnowledgePath('holoscript-knowledge.hs'));
      this.prompts = parsePromptsFile(getKnowledgePath('brittney-prompts.hs'));
      this.server = parseServerFile(getKnowledgePath('brittney-server.hs'));
      this.loaded = true;

      this.emitEvent('knowledge_loaded', {
        knowledge_chunks: this.knowledge.chunks.length,
        categories: this.knowledge.categories,
        prompts: Array.from(this.prompts.prompts.keys()),
        routes: this.server.routes.length,
      });
    } catch (error) {
      this.emitEvent('knowledge_load_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Emit event for agent observation
   */
  private emitEvent(type: string, data: Record<string, unknown>): void {
    const event: KnowledgeEvent = {
      type,
      timestamp: Date.now(),
      data,
    };
    this.emit('knowledge_event', event);
    this.emit(type, data);
  }

  /**
   * Search knowledge base
   */
  search(query: string, options: { limit?: number; categories?: string[] } = {}): SearchResult[] {
    if (!this.loaded || !this.knowledge) {
      throw new Error('Knowledge not loaded. Call load() first.');
    }

    const { limit = 5, categories } = options;
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    let chunks = this.knowledge.chunks;

    // Filter by categories if specified
    if (categories && categories.length > 0) {
      chunks = chunks.filter(c => categories.includes(c.category));
    }

    // Score each chunk
    const scored = chunks.map(chunk => {
      let score = 0;

      // Keyword matches
      for (const keyword of chunk.keywords) {
        if (queryLower.includes(keyword)) {
          score += 3;
        }
        for (const word of queryWords) {
          if (keyword.includes(word) || word.includes(keyword)) {
            score += 1;
          }
        }
      }

      // Content matches
      if (chunk.content.toLowerCase().includes(queryLower)) {
        score += 2;
      }

      return { ...chunk, score };
    });

    // Sort and return top results
    const results = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    this.emitEvent('knowledge_search', {
      query,
      results_count: results.length,
      categories: categories || 'all',
    });

    return results;
  }

  /**
   * Get a specific prompt by ID
   */
  getPrompt(id: string): HSPrompt | undefined {
    if (!this.loaded || !this.prompts) {
      throw new Error('Knowledge not loaded. Call load() first.');
    }
    return this.prompts.prompts.get(id);
  }

  /**
   * Get all available prompts
   */
  getAllPrompts(): Map<string, HSPrompt> {
    if (!this.loaded || !this.prompts) {
      throw new Error('Knowledge not loaded. Call load() first.');
    }
    return this.prompts.prompts;
  }

  /**
   * Build system prompt for a mode
   */
  buildSystemPrompt(mode: string): string {
    if (!this.loaded || !this.prompts) {
      throw new Error('Knowledge not loaded. Call load() first.');
    }

    const basePrompt = this.prompts.prompts.get('base');
    const modePrompt = this.prompts.prompts.get(mode);

    let systemPrompt = '';

    // Add base identity
    if (basePrompt) {
      if (basePrompt.identity) {
        systemPrompt += basePrompt.identity + '\n\n';
      }
      if (basePrompt.principles) {
        systemPrompt += '# Principles\n';
        for (const principle of basePrompt.principles as string[]) {
          systemPrompt += `- ${principle}\n`;
        }
        systemPrompt += '\n';
      }
      if (basePrompt.expertise) {
        systemPrompt += '# Expertise\n';
        for (const exp of basePrompt.expertise as string[]) {
          systemPrompt += `- ${exp}\n`;
        }
        systemPrompt += '\n';
      }
    }

    // Add mode-specific instructions
    if (modePrompt && modePrompt.instructions) {
      systemPrompt += `# ${mode} Mode Instructions\n`;
      systemPrompt += modePrompt.instructions + '\n\n';

      if (modePrompt.output_format) {
        systemPrompt += '# Output Format\n';
        systemPrompt += modePrompt.output_format + '\n';
      }
    }

    this.emitEvent('prompt_built', {
      mode,
      has_base: !!basePrompt,
      has_mode: !!modePrompt,
    });

    return systemPrompt;
  }

  /**
   * Build RAG context for a query
   */
  buildRAGContext(query: string, limit = 3): string {
    const results = this.search(query, { limit });

    if (results.length === 0) {
      return '';
    }

    let context = '\n\n# Relevant HoloScript Examples\n';
    context += 'Based on your query, here are some relevant patterns:\n\n';

    results.forEach((result, i) => {
      context += `## Example ${i + 1} (${result.category})\n`;
      context += '```holoscript\n';
      context += result.content;
      context += '\n```\n\n';
    });

    return context;
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    if (!this.loaded || !this.knowledge) {
      throw new Error('Knowledge not loaded. Call load() first.');
    }
    return this.knowledge.categories;
  }

  /**
   * Get all routes
   */
  getRoutes(): HSRoute[] {
    if (!this.loaded || !this.server) {
      throw new Error('Knowledge not loaded. Call load() first.');
    }
    return this.server.routes;
  }

  /**
   * Get server port
   */
  getPort(): number {
    if (!this.loaded || !this.server) {
      return 11435; // Default
    }
    return this.server.port;
  }

  /**
   * Check if loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get raw knowledge chunks
   */
  getChunks(): HSKnowledgeChunk[] {
    if (!this.loaded || !this.knowledge) {
      throw new Error('Knowledge not loaded. Call load() first.');
    }
    return this.knowledge.chunks;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let instance: KnowledgeService | null = null;

/**
 * Get the knowledge service singleton
 */
export function getKnowledgeService(): KnowledgeService {
  if (!instance) {
    instance = new KnowledgeService();
  }
  return instance;
}

/**
 * Create a new knowledge service instance
 */
export function createKnowledgeService(): KnowledgeService {
  return new KnowledgeService();
}

// =============================================================================
// Compatibility Exports
// =============================================================================

// Re-export for backward compatibility with existing code
export type {
  HSKnowledgeChunk as KnowledgeChunk,
  HSPrompt as Prompt,
  HSRoute as Route,
} from './hs-parser.js';
