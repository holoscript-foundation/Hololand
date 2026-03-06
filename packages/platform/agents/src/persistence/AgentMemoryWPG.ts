/**
 * @hololand/agents -- W/P/G (Wisdom/Pattern/Gotcha) Cross-Scene Agent Memory
 *
 * Implements a structured memory system for agents that persists across
 * scene transitions. Based on the Wisdom/Pattern/Gotcha (W/P/G) taxonomy
 * used in the uAA2++ protocol for intelligence compounding.
 *
 * MEMORY CATEGORIES:
 *   - Wisdom (W): Fundamental truths the agent has learned
 *     Example: "W.042 | Users prefer concise responses | 0.95"
 *
 *   - Pattern (P): Recurring structures the agent has observed
 *     Example: "P.017 | VR users get motion sick at > 120 deg/s rotation | 0.88"
 *
 *   - Gotcha (G): Known pitfalls and edge cases
 *     Example: "G.005 | Never run inference in VR render loop | 0.99"
 *
 * CROSS-SCENE PERSISTENCE:
 *   Memories persist across scene transitions via the WAL integration.
 *   Each memory has a confidence score (0-1) that decays over time
 *   and strengthens with reinforcement.
 *
 * SEARCH:
 *   TF-IDF based relevance scoring for memory retrieval.
 *   Agents can query their memory for contextually relevant entries.
 *
 * @version 1.0.0
 */

import { createDID } from './AgentDID.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Memory category type
 */
export type MemoryCategory = 'wisdom' | 'pattern' | 'gotcha';

/**
 * Memory category prefix for display
 */
export const MEMORY_PREFIX: Record<MemoryCategory, string> = {
  wisdom: 'W',
  pattern: 'P',
  gotcha: 'G',
};

/**
 * A single memory entry
 */
export interface MemoryEntry {
  /** Unique memory ID (e.g., W.042, P.017, G.005) */
  id: string;
  /** Memory category */
  category: MemoryCategory;
  /** The memory content/description */
  content: string;
  /** Confidence score (0-1, higher = more certain) */
  confidence: number;
  /** Agent DID that owns this memory */
  agentDID: string;
  /** Scene where this memory was first created */
  originSceneId: string;
  /** Scenes where this memory has been accessed */
  accessedInScenes: string[];
  /** Tags for search/categorization */
  tags: string[];
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last access */
  lastAccessedAt: string;
  /** ISO timestamp of last reinforcement */
  lastReinforcedAt: string;
  /** Number of times this memory was reinforced */
  reinforcementCount: number;
  /** Number of times this memory was accessed */
  accessCount: number;
  /** Related memory IDs */
  relatedMemories: string[];
  /** Source context (what triggered the memory formation) */
  source?: string;
  /** Whether this memory is suppressed (low confidence, pending garbage collection) */
  suppressed: boolean;
}

/**
 * Memory search query
 */
export interface MemoryQuery {
  /** Free-text search query */
  query?: string;
  /** Filter by category */
  category?: MemoryCategory;
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Filter by tags (OR logic) */
  tags?: string[];
  /** Filter by scene ID */
  sceneId?: string;
  /** Maximum number of results */
  limit?: number;
  /** Include suppressed memories */
  includeSuppressed?: boolean;
}

/**
 * Memory search result with relevance score
 */
export interface MemorySearchResult {
  /** The memory entry */
  entry: MemoryEntry;
  /** Relevance score (0-1, based on search query match) */
  relevance: number;
}

/**
 * Memory system configuration
 */
export interface AgentMemoryConfig {
  /** Confidence decay rate per hour (default: 0.01) */
  confidenceDecayPerHour?: number;
  /** Confidence boost on reinforcement (default: 0.1) */
  reinforcementBoost?: number;
  /** Minimum confidence before suppression (default: 0.1) */
  suppressionThreshold?: number;
  /** Maximum memories per agent (default: 10000) */
  maxMemoriesPerAgent?: number;
  /** Maximum total memories across all agents (default: 100000) */
  maxTotalMemories?: number;
  /** Whether to auto-suppress low confidence memories (default: true) */
  autoSuppress?: boolean;
  /** Callback when a memory is formed */
  onMemoryFormed?: (entry: MemoryEntry) => void;
  /** Callback when a memory is reinforced */
  onMemoryReinforced?: (entry: MemoryEntry) => void;
  /** Callback when a memory is suppressed */
  onMemorySuppressed?: (entry: MemoryEntry) => void;
}

/**
 * Memory system metrics
 */
export interface AgentMemoryMetrics {
  /** Total memories across all agents */
  totalMemories: number;
  /** Memories by category */
  byCategory: Record<MemoryCategory, number>;
  /** Active (non-suppressed) memories */
  activeMemories: number;
  /** Suppressed memories */
  suppressedMemories: number;
  /** Average confidence across all memories */
  averageConfidence: number;
  /** Number of unique agents with memories */
  uniqueAgents: number;
  /** Total search queries performed */
  totalSearches: number;
  /** Average search results per query */
  avgSearchResults: number;
}

// =============================================================================
// AGENT MEMORY SYSTEM
// =============================================================================

/**
 * Cross-scene W/P/G memory system for agents.
 *
 * Usage:
 * ```typescript
 * const memory = new AgentMemoryWPG();
 *
 * // Form memories
 * memory.addWisdom('brittney', 'scene-1', 'Users prefer visual feedback', 0.85, ['ux', 'feedback']);
 * memory.addPattern('brittney', 'scene-1', 'Motion sickness at > 120 deg/s', 0.9, ['vr', 'health']);
 * memory.addGotcha('brittney', 'scene-1', 'Never block VR render loop', 0.99, ['performance']);
 *
 * // Search memories (cross-scene)
 * const results = memory.search('brittney', { query: 'render loop', minConfidence: 0.5 });
 * // Results sorted by relevance, containing G.001 about render loop blocking
 *
 * // Scene transition - memories persist automatically
 * // In scene-2, the same memories are available:
 * const allWisdom = memory.search('brittney', { category: 'wisdom' });
 * ```
 */
export class AgentMemoryWPG {
  private readonly config: Required<AgentMemoryConfig>;
  private memories: Map<string, MemoryEntry> = new Map(); // id -> entry
  private agentIndex: Map<string, Set<string>> = new Map(); // agentDID -> Set<memoryId>
  private counters: Record<MemoryCategory, number> = { wisdom: 0, pattern: 0, gotcha: 0 };
  private totalSearches: number = 0;
  private totalSearchResults: number = 0;

  constructor(config?: AgentMemoryConfig) {
    this.config = {
      confidenceDecayPerHour: config?.confidenceDecayPerHour ?? 0.01,
      reinforcementBoost: config?.reinforcementBoost ?? 0.1,
      suppressionThreshold: config?.suppressionThreshold ?? 0.1,
      maxMemoriesPerAgent: config?.maxMemoriesPerAgent ?? 10000,
      maxTotalMemories: config?.maxTotalMemories ?? 100000,
      autoSuppress: config?.autoSuppress ?? true,
      onMemoryFormed: config?.onMemoryFormed ?? (() => {}),
      onMemoryReinforced: config?.onMemoryReinforced ?? (() => {}),
      onMemorySuppressed: config?.onMemorySuppressed ?? (() => {}),
    };
  }

  // =========================================================================
  // Memory Formation
  // =========================================================================

  /**
   * Add a Wisdom memory.
   *
   * @param agentId - Agent identifier
   * @param sceneId - Scene where the wisdom was learned
   * @param content - The wisdom content
   * @param confidence - Confidence score (0-1)
   * @param tags - Optional tags
   * @param source - Optional source context
   * @returns The created memory entry
   */
  addWisdom(
    agentId: string,
    sceneId: string,
    content: string,
    confidence: number,
    tags: string[] = [],
    source?: string,
  ): MemoryEntry {
    return this.addMemory(agentId, 'wisdom', sceneId, content, confidence, tags, source);
  }

  /**
   * Add a Pattern memory.
   */
  addPattern(
    agentId: string,
    sceneId: string,
    content: string,
    confidence: number,
    tags: string[] = [],
    source?: string,
  ): MemoryEntry {
    return this.addMemory(agentId, 'pattern', sceneId, content, confidence, tags, source);
  }

  /**
   * Add a Gotcha memory.
   */
  addGotcha(
    agentId: string,
    sceneId: string,
    content: string,
    confidence: number,
    tags: string[] = [],
    source?: string,
  ): MemoryEntry {
    return this.addMemory(agentId, 'gotcha', sceneId, content, confidence, tags, source);
  }

  /**
   * Add a memory of any category.
   */
  addMemory(
    agentId: string,
    category: MemoryCategory,
    sceneId: string,
    content: string,
    confidence: number,
    tags: string[] = [],
    source?: string,
  ): MemoryEntry {
    const did = createDID(agentId);
    const prefix = MEMORY_PREFIX[category];
    const num = ++this.counters[category];
    const id = `${prefix}.${String(num).padStart(3, '0')}`;

    const now = new Date().toISOString();
    const entry: MemoryEntry = {
      id,
      category,
      content,
      confidence: Math.max(0, Math.min(1, confidence)),
      agentDID: did,
      originSceneId: sceneId,
      accessedInScenes: [sceneId],
      tags,
      createdAt: now,
      lastAccessedAt: now,
      lastReinforcedAt: now,
      reinforcementCount: 0,
      accessCount: 0,
      relatedMemories: [],
      source,
      suppressed: false,
    };

    this.memories.set(id, entry);

    // Update agent index
    if (!this.agentIndex.has(did)) {
      this.agentIndex.set(did, new Set());
    }
    this.agentIndex.get(did)!.add(id);

    // Enforce per-agent limit
    this.enforceAgentLimit(did);

    // Enforce total limit
    this.enforceTotalLimit();

    this.config.onMemoryFormed(entry);
    return entry;
  }

  // =========================================================================
  // Memory Access
  // =========================================================================

  /**
   * Get a specific memory by ID.
   */
  getMemory(memoryId: string): MemoryEntry | undefined {
    const entry = this.memories.get(memoryId);
    if (entry) {
      entry.accessCount++;
      entry.lastAccessedAt = new Date().toISOString();
    }
    return entry;
  }

  /**
   * Get all memories for an agent.
   */
  getAgentMemories(agentId: string, includeSuppressed = false): MemoryEntry[] {
    const did = createDID(agentId);
    const ids = this.agentIndex.get(did);
    if (!ids) return [];

    const entries: MemoryEntry[] = [];
    for (const id of ids) {
      const entry = this.memories.get(id);
      if (entry && (includeSuppressed || !entry.suppressed)) {
        entries.push(entry);
      }
    }

    return entries.sort((a, b) => b.confidence - a.confidence);
  }

  // =========================================================================
  // Search
  // =========================================================================

  /**
   * Search agent memories with relevance scoring.
   *
   * Uses TF-IDF-inspired scoring combining:
   *   - Text match (keyword overlap with content)
   *   - Confidence weight
   *   - Recency bonus
   *   - Tag match bonus
   *
   * @param agentId - Agent identifier
   * @param query - Search query
   * @returns Sorted search results with relevance scores
   */
  search(agentId: string, query: MemoryQuery): MemorySearchResult[] {
    const did = createDID(agentId);
    const ids = this.agentIndex.get(did);
    if (!ids) return [];

    this.totalSearches++;

    // Get candidate memories
    let candidates: MemoryEntry[] = [];
    for (const id of ids) {
      const entry = this.memories.get(id);
      if (entry) candidates.push(entry);
    }

    // Apply filters
    if (!query.includeSuppressed) {
      candidates = candidates.filter(e => !e.suppressed);
    }
    if (query.category) {
      candidates = candidates.filter(e => e.category === query.category);
    }
    if (query.minConfidence !== undefined) {
      candidates = candidates.filter(e => e.confidence >= query.minConfidence!);
    }
    if (query.tags && query.tags.length > 0) {
      const queryTags = new Set(query.tags.map(t => t.toLowerCase()));
      candidates = candidates.filter(e =>
        e.tags.some(t => queryTags.has(t.toLowerCase())),
      );
    }
    if (query.sceneId) {
      candidates = candidates.filter(e =>
        e.originSceneId === query.sceneId ||
        e.accessedInScenes.includes(query.sceneId!),
      );
    }

    // Score results
    const results: MemorySearchResult[] = candidates.map(entry => {
      let relevance = 0;

      // Text match scoring
      if (query.query) {
        relevance += this.calculateTextRelevance(query.query, entry);
      } else {
        // No query text - use confidence as base relevance
        relevance = entry.confidence;
      }

      // Update access tracking
      entry.accessCount++;
      entry.lastAccessedAt = new Date().toISOString();

      return { entry, relevance };
    });

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    // Apply limit
    const limited = query.limit ? results.slice(0, query.limit) : results;

    this.totalSearchResults += limited.length;
    return limited;
  }

  // =========================================================================
  // Reinforcement
  // =========================================================================

  /**
   * Reinforce a memory (increase confidence).
   * Called when the memory proves accurate/useful.
   *
   * @param memoryId - Memory to reinforce
   * @returns Updated memory entry or undefined
   */
  reinforce(memoryId: string): MemoryEntry | undefined {
    const entry = this.memories.get(memoryId);
    if (!entry) return undefined;

    entry.confidence = Math.min(1, entry.confidence + this.config.reinforcementBoost);
    entry.reinforcementCount++;
    entry.lastReinforcedAt = new Date().toISOString();
    entry.suppressed = false; // Un-suppress if reinforced

    this.config.onMemoryReinforced(entry);
    return entry;
  }

  /**
   * Weaken a memory (decrease confidence).
   * Called when the memory proves inaccurate/unhelpful.
   *
   * @param memoryId - Memory to weaken
   * @param amount - Amount to decrease confidence (default: reinforcementBoost)
   * @returns Updated memory entry or undefined
   */
  weaken(memoryId: string, amount?: number): MemoryEntry | undefined {
    const entry = this.memories.get(memoryId);
    if (!entry) return undefined;

    const decrease = amount ?? this.config.reinforcementBoost;
    entry.confidence = Math.max(0, entry.confidence - decrease);

    // Auto-suppress if below threshold
    if (this.config.autoSuppress && entry.confidence < this.config.suppressionThreshold) {
      entry.suppressed = true;
      this.config.onMemorySuppressed(entry);
    }

    return entry;
  }

  // =========================================================================
  // Relationships
  // =========================================================================

  /**
   * Link two related memories.
   */
  linkMemories(memoryId1: string, memoryId2: string): boolean {
    const entry1 = this.memories.get(memoryId1);
    const entry2 = this.memories.get(memoryId2);
    if (!entry1 || !entry2) return false;

    if (!entry1.relatedMemories.includes(memoryId2)) {
      entry1.relatedMemories.push(memoryId2);
    }
    if (!entry2.relatedMemories.includes(memoryId1)) {
      entry2.relatedMemories.push(memoryId1);
    }

    return true;
  }

  /**
   * Get all memories related to a given memory.
   */
  getRelated(memoryId: string): MemoryEntry[] {
    const entry = this.memories.get(memoryId);
    if (!entry) return [];

    return entry.relatedMemories
      .map(id => this.memories.get(id))
      .filter((e): e is MemoryEntry => e !== undefined);
  }

  // =========================================================================
  // Scene Integration
  // =========================================================================

  /**
   * Record that an agent's memories were accessed in a new scene.
   * Called on scene enter to track cross-scene memory usage.
   *
   * @param agentId - Agent identifier
   * @param sceneId - The new scene ID
   */
  recordSceneAccess(agentId: string, sceneId: string): void {
    const did = createDID(agentId);
    const ids = this.agentIndex.get(did);
    if (!ids) return;

    for (const id of ids) {
      const entry = this.memories.get(id);
      if (entry && !entry.accessedInScenes.includes(sceneId)) {
        entry.accessedInScenes.push(sceneId);
      }
    }
  }

  /**
   * Apply confidence decay to all memories.
   * Should be called periodically (e.g., every hour).
   */
  applyDecay(): void {
    for (const entry of this.memories.values()) {
      if (entry.suppressed) continue;

      entry.confidence = Math.max(0, entry.confidence - this.config.confidenceDecayPerHour);

      if (this.config.autoSuppress && entry.confidence < this.config.suppressionThreshold) {
        entry.suppressed = true;
        this.config.onMemorySuppressed(entry);
      }
    }
  }

  // =========================================================================
  // Bulk Operations
  // =========================================================================

  /**
   * Export all memories for an agent (for persistence or transfer).
   */
  exportAgentMemories(agentId: string): MemoryEntry[] {
    return this.getAgentMemories(agentId, true);
  }

  /**
   * Import memories for an agent (from persistence or transfer).
   */
  importAgentMemories(entries: MemoryEntry[]): number {
    let imported = 0;
    for (const entry of entries) {
      if (!this.memories.has(entry.id)) {
        this.memories.set(entry.id, entry);

        if (!this.agentIndex.has(entry.agentDID)) {
          this.agentIndex.set(entry.agentDID, new Set());
        }
        this.agentIndex.get(entry.agentDID)!.add(entry.id);

        // Update counters
        const num = parseInt(entry.id.split('.')[1], 10);
        if (num > this.counters[entry.category]) {
          this.counters[entry.category] = num;
        }

        imported++;
      }
    }
    return imported;
  }

  /**
   * Remove a memory by ID.
   */
  removeMemory(memoryId: string): boolean {
    const entry = this.memories.get(memoryId);
    if (!entry) return false;

    this.memories.delete(memoryId);
    const agentIds = this.agentIndex.get(entry.agentDID);
    if (agentIds) {
      agentIds.delete(memoryId);
    }

    return true;
  }

  /**
   * Remove all suppressed memories for an agent (garbage collection).
   */
  garbageCollect(agentId: string): number {
    const did = createDID(agentId);
    const ids = this.agentIndex.get(did);
    if (!ids) return 0;

    let removed = 0;
    for (const id of Array.from(ids)) {
      const entry = this.memories.get(id);
      if (entry?.suppressed) {
        this.memories.delete(id);
        ids.delete(id);
        removed++;
      }
    }

    return removed;
  }

  // =========================================================================
  // Metrics
  // =========================================================================

  /**
   * Get memory system metrics.
   */
  getMetrics(): AgentMemoryMetrics {
    const all = Array.from(this.memories.values());
    const active = all.filter(e => !e.suppressed);
    const suppressed = all.filter(e => e.suppressed);

    const byCategory: Record<MemoryCategory, number> = { wisdom: 0, pattern: 0, gotcha: 0 };
    for (const entry of active) {
      byCategory[entry.category]++;
    }

    const avgConfidence = active.length > 0
      ? active.reduce((sum, e) => sum + e.confidence, 0) / active.length
      : 0;

    return {
      totalMemories: all.length,
      byCategory,
      activeMemories: active.length,
      suppressedMemories: suppressed.length,
      averageConfidence: Math.round(avgConfidence * 1000) / 1000,
      uniqueAgents: this.agentIndex.size,
      totalSearches: this.totalSearches,
      avgSearchResults: this.totalSearches > 0
        ? Math.round(this.totalSearchResults / this.totalSearches)
        : 0,
    };
  }

  /**
   * Get the total number of memories.
   */
  get size(): number {
    return this.memories.size;
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Clear all memory state.
   */
  destroy(): void {
    this.memories.clear();
    this.agentIndex.clear();
    this.counters = { wisdom: 0, pattern: 0, gotcha: 0 };
    this.totalSearches = 0;
    this.totalSearchResults = 0;
  }

  // =========================================================================
  // Internals
  // =========================================================================

  /**
   * TF-IDF inspired text relevance scoring.
   */
  private calculateTextRelevance(queryText: string, entry: MemoryEntry): number {
    const queryTokens = this.tokenize(queryText);
    const contentTokens = this.tokenize(entry.content);
    const tagTokens = entry.tags.map(t => t.toLowerCase());

    if (queryTokens.length === 0) return entry.confidence;

    // Calculate term overlap
    let matchCount = 0;
    let exactBonus = 0;

    for (const qToken of queryTokens) {
      // Content match
      for (const cToken of contentTokens) {
        if (cToken === qToken) {
          matchCount += 2; // Exact match bonus
        } else if (cToken.includes(qToken) || qToken.includes(cToken)) {
          matchCount += 1; // Partial match
        }
      }

      // Tag match (higher weight)
      for (const tToken of tagTokens) {
        if (tToken === qToken) {
          matchCount += 3;
          exactBonus += 0.1;
        }
      }
    }

    // Normalize by query length
    const termScore = matchCount / (queryTokens.length * 3); // Max 3 per token

    // Combine with confidence and recency
    const confidenceWeight = entry.confidence * 0.3;
    const recencyBonus = this.calculateRecencyBonus(entry.lastAccessedAt) * 0.1;

    return Math.min(1, termScore * 0.6 + confidenceWeight + recencyBonus + exactBonus);
  }

  /**
   * Tokenize text into lowercase words.
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  /**
   * Calculate a recency bonus (0-1) based on last access time.
   */
  private calculateRecencyBonus(lastAccessedAt: string): number {
    const ageMs = Date.now() - new Date(lastAccessedAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    // Exponential decay: bonus halves every 24 hours
    return Math.exp(-ageHours / 24);
  }

  /**
   * Enforce per-agent memory limit.
   */
  private enforceAgentLimit(agentDID: string): void {
    const ids = this.agentIndex.get(agentDID);
    if (!ids || ids.size <= this.config.maxMemoriesPerAgent) return;

    // Remove lowest confidence, oldest memories first
    const entries = Array.from(ids)
      .map(id => this.memories.get(id))
      .filter((e): e is MemoryEntry => e !== undefined)
      .sort((a, b) => {
        // Sort by: suppressed first, then lowest confidence, then oldest
        if (a.suppressed !== b.suppressed) return a.suppressed ? -1 : 1;
        if (a.confidence !== b.confidence) return a.confidence - b.confidence;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    const toRemove = ids.size - this.config.maxMemoriesPerAgent;
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.memories.delete(entries[i].id);
      ids.delete(entries[i].id);
    }
  }

  /**
   * Enforce total memory limit across all agents.
   */
  private enforceTotalLimit(): void {
    if (this.memories.size <= this.config.maxTotalMemories) return;

    // Remove suppressed memories first, then lowest confidence
    const all = Array.from(this.memories.values())
      .sort((a, b) => {
        if (a.suppressed !== b.suppressed) return a.suppressed ? -1 : 1;
        return a.confidence - b.confidence;
      });

    const toRemove = this.memories.size - this.config.maxTotalMemories;
    for (let i = 0; i < toRemove && i < all.length; i++) {
      const entry = all[i];
      this.memories.delete(entry.id);
      const agentIds = this.agentIndex.get(entry.agentDID);
      if (agentIds) agentIds.delete(entry.id);
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let _memorySystem: AgentMemoryWPG | null = null;

/**
 * Get the singleton AgentMemoryWPG instance.
 */
export function getAgentMemory(config?: AgentMemoryConfig): AgentMemoryWPG {
  if (!_memorySystem) {
    _memorySystem = new AgentMemoryWPG(config);
  }
  return _memorySystem;
}

/**
 * Reset the memory system (for testing).
 */
export function resetAgentMemory(): void {
  if (_memorySystem) {
    _memorySystem.destroy();
    _memorySystem = null;
  }
}
