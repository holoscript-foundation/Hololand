/**
 * Knowledge Pipeline for Brittney Network
 *
 * Enables:
 * 1. RAG-based retrieval for inference enhancement
 * 2. Knowledge contribution from authenticated clients
 * 3. VRAM-based training boost when management has GPU resources
 * 4. Real-time knowledge synchronization across the network
 *
 * Pattern: P.NETWORK.KNOWLEDGE.01
 */

import { EventEmitter } from 'events';
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

// =============================================================================
// Types
// =============================================================================

export interface KnowledgeEntry {
  id: string;
  category: string;
  content: string;
  keywords: string[];
  source: 'curated' | 'contributed' | 'generated';
  contributor?: string;
  timestamp: number;
  quality?: number; // 0-1 score from validation
  embedding?: number[]; // For vector search (future)
}

export interface TrainingExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  metadata?: {
    category?: string;
    contributor?: string;
    timestamp?: number;
  };
}

export interface VRAMStatus {
  available: boolean;
  totalMB: number;
  freeMB: number;
  gpuName: string;
  cudaAvailable: boolean;
  canTrain: boolean;
  recommendedBatchSize: number;
}

export interface PipelineConfig {
  knowledgeDir: string;
  trainingDir: string;
  minVRAMForTraining: number; // MB
  autoValidate: boolean;
  syncInterval: number; // ms
}

export interface ContributionResult {
  accepted: boolean;
  entryId?: string;
  reason?: string;
  queuedForTraining?: boolean;
}

// =============================================================================
// Default Configuration
// =============================================================================

const CONFIG_DIR = join(homedir(), '.hololand');
const KNOWLEDGE_DIR = join(CONFIG_DIR, 'knowledge');
const TRAINING_DIR = join(CONFIG_DIR, 'training');

const DEFAULT_CONFIG: PipelineConfig = {
  knowledgeDir: KNOWLEDGE_DIR,
  trainingDir: TRAINING_DIR,
  minVRAMForTraining: 8192, // 8GB minimum
  autoValidate: true,
  syncInterval: 60000, // 1 minute
};

// =============================================================================
// Knowledge Pipeline
// =============================================================================

export class KnowledgePipeline extends EventEmitter {
  private config: PipelineConfig;
  private knowledge: Map<string, KnowledgeEntry> = new Map();
  private trainingQueue: TrainingExample[] = [];
  private vramStatus: VRAMStatus | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<PipelineConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ensureDirectories();
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  private ensureDirectories(): void {
    if (!existsSync(this.config.knowledgeDir)) {
      mkdirSync(this.config.knowledgeDir, { recursive: true });
    }
    if (!existsSync(this.config.trainingDir)) {
      mkdirSync(this.config.trainingDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    // Load existing knowledge
    await this.loadKnowledge();

    // Check VRAM status
    this.vramStatus = await this.checkVRAM();

    // Start sync if interval set
    if (this.config.syncInterval > 0) {
      this.startSync();
    }

    this.emit('initialized', {
      knowledgeCount: this.knowledge.size,
      vramStatus: this.vramStatus,
    });
  }

  // ===========================================================================
  // Knowledge Management
  // ===========================================================================

  private async loadKnowledge(): Promise<void> {
    const knowledgePath = join(this.config.knowledgeDir, 'knowledge.json');

    if (existsSync(knowledgePath)) {
      try {
        const data = JSON.parse(readFileSync(knowledgePath, 'utf-8'));
        for (const entry of data.entries || []) {
          this.knowledge.set(entry.id, entry);
        }
      } catch (error) {
        this.emit('error', { type: 'load_knowledge', error });
      }
    }
  }

  private saveKnowledge(): void {
    const knowledgePath = join(this.config.knowledgeDir, 'knowledge.json');
    const data = {
      version: 1,
      lastModified: Date.now(),
      entries: Array.from(this.knowledge.values()),
    };
    writeFileSync(knowledgePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Search knowledge base for relevant entries
   */
  search(query: string, options: { limit?: number; categories?: string[] } = {}): KnowledgeEntry[] {
    const { limit = 5, categories } = options;
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    let entries = Array.from(this.knowledge.values());

    // Filter by categories
    if (categories && categories.length > 0) {
      entries = entries.filter(e => categories.includes(e.category));
    }

    // Score entries
    const scored = entries.map(entry => {
      let score = 0;

      // Keyword matches
      for (const keyword of entry.keywords) {
        if (queryLower.includes(keyword)) score += 3;
        for (const word of queryWords) {
          if (keyword.includes(word) || word.includes(keyword)) score += 1;
        }
      }

      // Content matches
      if (entry.content.toLowerCase().includes(queryLower)) score += 2;

      // Quality boost
      if (entry.quality) score *= (0.5 + entry.quality * 0.5);

      return { entry, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.entry);
  }

  /**
   * Build RAG context for a query
   */
  buildRAGContext(query: string, limit = 3): string {
    const results = this.search(query, { limit });

    if (results.length === 0) return '';

    let context = '\n\n# Relevant Knowledge\n';
    context += 'Based on your query, here are relevant patterns:\n\n';

    results.forEach((result, i) => {
      context += `## Example ${i + 1} (${result.category})\n`;
      context += '```holoscript\n' + result.content + '\n```\n\n';
    });

    return context;
  }

  // ===========================================================================
  // Knowledge Contribution (Network Feature)
  // ===========================================================================

  /**
   * Contribute knowledge from authenticated clients
   */
  async contribute(
    entry: Omit<KnowledgeEntry, 'id' | 'timestamp' | 'quality'>,
    contributorId: string
  ): Promise<ContributionResult> {
    // Generate ID
    const id = `${entry.category}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    // Validate content
    if (this.config.autoValidate) {
      const validation = this.validateEntry(entry);
      if (!validation.valid) {
        return {
          accepted: false,
          reason: validation.reason,
        };
      }
    }

    // Create full entry
    const fullEntry: KnowledgeEntry = {
      ...entry,
      id,
      timestamp: Date.now(),
      contributor: contributorId,
      quality: 0.5, // Initial quality score
    };

    // Add to knowledge base
    this.knowledge.set(id, fullEntry);
    this.saveKnowledge();

    // Queue for training if valid
    const queuedForTraining = await this.queueForTraining(fullEntry);

    this.emit('contribution', {
      id,
      category: entry.category,
      contributor: contributorId,
      queuedForTraining,
    });

    return {
      accepted: true,
      entryId: id,
      queuedForTraining,
    };
  }

  private validateEntry(entry: Omit<KnowledgeEntry, 'id' | 'timestamp' | 'quality'>): { valid: boolean; reason?: string } {
    // Check required fields
    if (!entry.content || entry.content.length < 10) {
      return { valid: false, reason: 'Content too short' };
    }

    if (!entry.category) {
      return { valid: false, reason: 'Category required' };
    }

    if (!entry.keywords || entry.keywords.length === 0) {
      return { valid: false, reason: 'Keywords required' };
    }

    // Check for HoloScript syntax markers
    const hasValidSyntax =
      entry.content.includes('object ') ||
      entry.content.includes('scene ') ||
      entry.content.includes('prefab ') ||
      entry.content.includes('ui ') ||
      entry.content.includes('orb ') ||
      entry.content.includes('particles ') ||
      entry.content.includes('light ') ||
      entry.content.includes('audio ');

    if (!hasValidSyntax) {
      return { valid: false, reason: 'Content must contain valid HoloScript' };
    }

    return { valid: true };
  }

  // ===========================================================================
  // VRAM Detection and Training Boost
  // ===========================================================================

  /**
   * Check GPU VRAM availability
   */
  async checkVRAM(): Promise<VRAMStatus> {
    const status: VRAMStatus = {
      available: false,
      totalMB: 0,
      freeMB: 0,
      gpuName: 'Unknown',
      cudaAvailable: false,
      canTrain: false,
      recommendedBatchSize: 1,
    };

    try {
      // Try nvidia-smi first (NVIDIA GPUs)
      const nvidiaSmi = this.tryNvidiaSmi();
      if (nvidiaSmi) {
        status.available = true;
        status.totalMB = nvidiaSmi.totalMB;
        status.freeMB = nvidiaSmi.freeMB;
        status.gpuName = nvidiaSmi.gpuName;
        status.cudaAvailable = true;
        status.canTrain = status.freeMB >= this.config.minVRAMForTraining;
        status.recommendedBatchSize = this.calculateBatchSize(status.freeMB);
      }
    } catch {
      // No NVIDIA GPU available
    }

    this.vramStatus = status;
    this.emit('vram_checked', status);
    return status;
  }

  private tryNvidiaSmi(): { totalMB: number; freeMB: number; gpuName: string } | null {
    try {
      const output = execSync(
        'nvidia-smi --query-gpu=memory.total,memory.free,name --format=csv,noheader,nounits',
        { encoding: 'utf-8', timeout: 5000 }
      );

      const lines = output.trim().split('\n');
      if (lines.length > 0) {
        const parts = lines[0].split(', ');
        return {
          totalMB: parseInt(parts[0], 10),
          freeMB: parseInt(parts[1], 10),
          gpuName: parts[2] || 'NVIDIA GPU',
        };
      }
    } catch {
      // nvidia-smi not available or failed
    }
    return null;
  }

  private calculateBatchSize(freeMB: number): number {
    // Conservative batch size calculation
    // Assumes ~2GB per batch for small models
    if (freeMB < 8192) return 1;
    if (freeMB < 16384) return 2;
    if (freeMB < 24576) return 4;
    if (freeMB < 32768) return 8;
    return 16;
  }

  // ===========================================================================
  // Training Queue
  // ===========================================================================

  /**
   * Queue a knowledge entry for training
   */
  private async queueForTraining(entry: KnowledgeEntry): Promise<boolean> {
    if (!this.vramStatus?.canTrain) {
      return false;
    }

    // Convert to training example
    const example: TrainingExample = {
      messages: [
        {
          role: 'system',
          content: 'You are Brittney, an AI assistant for HoloScript development.',
        },
        {
          role: 'user',
          content: this.generatePromptFromEntry(entry),
        },
        {
          role: 'assistant',
          content: entry.content,
        },
      ],
      metadata: {
        category: entry.category,
        contributor: entry.contributor,
        timestamp: entry.timestamp,
      },
    };

    this.trainingQueue.push(example);

    // Save to training queue file
    const queuePath = join(this.config.trainingDir, 'training-queue.jsonl');
    appendFileSync(queuePath, JSON.stringify(example) + '\n', 'utf-8');

    this.emit('training_queued', {
      entryId: entry.id,
      queueSize: this.trainingQueue.length,
    });

    return true;
  }

  private generatePromptFromEntry(entry: KnowledgeEntry): string {
    // Generate a realistic user prompt from the entry
    const categoryPrompts: Record<string, string[]> = {
      objects: ['Create a %k', 'Make a %k object', 'I need a %k'],
      animation: ['Add a %k animation', 'Make it %k', 'Create a %k effect'],
      interaction: ['Make it %k', 'Add %k interaction', 'I want to %k it'],
      effects: ['Create a %k effect', 'Add %k particles', 'Make %k'],
      ui: ['Create a %k UI', 'Add a %k panel', 'Make a %k interface'],
      gameplay: ['Create a %k', 'Make a %k mechanic', 'Add %k'],
      scene: ['Create a %k scene', 'Make a %k environment', 'Build a %k'],
    };

    const templates = categoryPrompts[entry.category] || ['Create a %k in HoloScript'];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const keyword = entry.keywords[0] || entry.category;

    return template.replace('%k', keyword);
  }

  /**
   * Get training queue status
   */
  getTrainingQueueStatus(): {
    queueSize: number;
    canTrain: boolean;
    vramStatus: VRAMStatus | null;
  } {
    return {
      queueSize: this.trainingQueue.length,
      canTrain: this.vramStatus?.canTrain || false,
      vramStatus: this.vramStatus,
    };
  }

  /**
   * Flush training queue (admin only)
   */
  async flushTrainingQueue(): Promise<{ flushed: number; savedTo: string }> {
    const timestamp = Date.now();
    const outputPath = join(
      this.config.trainingDir,
      `training-data-${timestamp}.jsonl`
    );

    // Write all queued examples
    const content = this.trainingQueue.map(e => JSON.stringify(e)).join('\n');
    writeFileSync(outputPath, content + '\n', 'utf-8');

    const flushed = this.trainingQueue.length;
    this.trainingQueue = [];

    // Clear queue file
    const queuePath = join(this.config.trainingDir, 'training-queue.jsonl');
    if (existsSync(queuePath)) {
      writeFileSync(queuePath, '', 'utf-8');
    }

    this.emit('training_flushed', { flushed, savedTo: outputPath });

    return { flushed, savedTo: outputPath };
  }

  // ===========================================================================
  // Network Sync
  // ===========================================================================

  private startSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer as unknown as NodeJS.Timeout);
    }

    this.syncTimer = setInterval(() => {
      this.emit('sync', {
        knowledgeCount: this.knowledge.size,
        trainingQueueSize: this.trainingQueue.length,
        timestamp: Date.now(),
      });
    }, this.config.syncInterval);
  }

  stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer as unknown as NodeJS.Timeout);
      this.syncTimer = null;
    }
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  getStats(): {
    totalEntries: number;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
    trainingQueueSize: number;
    vramAvailable: boolean;
  } {
    const byCategory: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const entry of this.knowledge.values()) {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
      bySource[entry.source] = (bySource[entry.source] || 0) + 1;
    }

    return {
      totalEntries: this.knowledge.size,
      byCategory,
      bySource,
      trainingQueueSize: this.trainingQueue.length,
      vramAvailable: this.vramStatus?.available || false,
    };
  }
}

// =============================================================================
// Singleton
// =============================================================================

let pipelineInstance: KnowledgePipeline | null = null;

export function getKnowledgePipeline(config?: Partial<PipelineConfig>): KnowledgePipeline {
  if (!pipelineInstance) {
    pipelineInstance = new KnowledgePipeline(config);
  }
  return pipelineInstance;
}

export function createKnowledgePipeline(config?: Partial<PipelineConfig>): KnowledgePipeline {
  return new KnowledgePipeline(config);
}
