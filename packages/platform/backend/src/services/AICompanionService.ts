/**
 * @hololand/backend — AICompanionService
 *
 * Manages AI companion NPCs with persistent memory, personality,
 * dialogue generation, behavior trees, and Brittney integration.
 *
 * Features:
 *   - Companion CRUD — create NPCs with personality, backstory, traits
 *   - Memory system — short-term + long-term memory with recall/forget
 *   - Dialogue — conversation threading, mood-aware responses, topic tracking
 *   - Behavior trees — idle/patrol/interact/combat states, transition rules
 *   - Relationship system — affinity/trust per player, relationship tiers
 *   - Schedules — time-of-day routines, location assignments
 *   - World knowledge — companions share knowledge about world state
 *   - Stats & analytics — conversation counts, popular companions, etc.
 */

// ============================================================================
// Types
// ============================================================================

export type PersonalityTrait =
  | 'friendly'
  | 'hostile'
  | 'curious'
  | 'cautious'
  | 'brave'
  | 'cowardly'
  | 'wise'
  | 'naive'
  | 'sarcastic'
  | 'sincere'
  | 'generous'
  | 'greedy'
  | 'loyal'
  | 'treacherous'
  | 'calm'
  | 'aggressive';

export type BehaviorState =
  | 'idle'
  | 'patrol'
  | 'interact'
  | 'combat'
  | 'flee'
  | 'follow'
  | 'guard'
  | 'trade'
  | 'sleep'
  | 'celebrate';

export type RelationshipTier =
  | 'stranger'
  | 'acquaintance'
  | 'friendly'
  | 'companion'
  | 'trusted'
  | 'bonded';

export type EmotionalState =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'fearful'
  | 'surprised'
  | 'disgusted'
  | 'excited';

export type MemoryType = 'interaction' | 'observation' | 'knowledge' | 'emotion' | 'quest';

export interface CompanionPersonality {
  traits: PersonalityTrait[];
  backstory: string;
  speechStyle: string;       // e.g., "formal", "casual", "archaic"
  voiceTone: string;         // e.g., "deep", "cheerful", "raspy"
  catchphrases: string[];
}

export interface MemoryEntry {
  id: string;
  companionId: string;
  type: MemoryType;
  content: string;
  importance: number;        // 0-1, higher = more memorable
  playerId: string | null;   // null for world observations
  tags: string[];
  createdAt: number;
  lastRecalledAt: number;
  recallCount: number;
  forgotten: boolean;
}

export interface DialogueTurn {
  speaker: 'player' | 'companion';
  text: string;
  mood: EmotionalState;
  timestamp: number;
}

export interface Conversation {
  id: string;
  companionId: string;
  playerId: string;
  turns: DialogueTurn[];
  topics: string[];
  startedAt: number;
  endedAt: number | null;
  active: boolean;
}

export interface BehaviorTransition {
  from: BehaviorState;
  to: BehaviorState;
  condition: string;         // human-readable condition
  priority: number;          // higher = evaluated first
}

export interface ScheduleEntry {
  timeStart: number;         // hour 0-23
  timeEnd: number;           // hour 0-23
  behavior: BehaviorState;
  location: [number, number, number] | null;
  description: string;
}

export interface RelationshipRecord {
  companionId: string;
  playerId: string;
  affinity: number;          // -100 to 100
  trust: number;             // 0 to 100
  tier: RelationshipTier;
  interactionCount: number;
  firstMet: number;
  lastInteraction: number;
  notes: string[];
}

export interface CompanionInfo {
  id: string;
  name: string;
  title: string | null;
  personality: CompanionPersonality;
  currentBehavior: BehaviorState;
  currentMood: EmotionalState;
  position: [number, number, number];
  worldId: string;
  health: number;
  maxHealth: number;
  level: number;
  schedule: ScheduleEntry[];
  transitions: BehaviorTransition[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CompanionCreateOptions {
  name: string;
  title?: string;
  personality: CompanionPersonality;
  worldId: string;
  position?: [number, number, number];
  health?: number;
  level?: number;
  schedule?: ScheduleEntry[];
  transitions?: BehaviorTransition[];
}

export interface WorldKnowledge {
  id: string;
  topic: string;
  content: string;
  source: string;
  worldId: string;
  addedBy: string;
  createdAt: number;
}

export interface CompanionStats {
  totalCompanions: number;
  activeCompanions: number;
  totalMemories: number;
  totalConversations: number;
  activeConversations: number;
  totalRelationships: number;
  totalWorldKnowledge: number;
  averageAffinity: number;
  companionsByBehavior: Record<BehaviorState, number>;
  companionsByMood: Record<EmotionalState, number>;
}

export type CompanionEventType =
  | 'companion_created'
  | 'companion_removed'
  | 'companion_activated'
  | 'companion_deactivated'
  | 'behavior_changed'
  | 'mood_changed'
  | 'memory_created'
  | 'memory_forgotten'
  | 'conversation_started'
  | 'conversation_ended'
  | 'dialogue_turn'
  | 'relationship_changed'
  | 'relationship_tier_changed'
  | 'knowledge_added'
  | 'schedule_updated';

export interface CompanionEvent {
  type: CompanionEventType;
  companionId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

// ============================================================================
// Configuration
// ============================================================================

export interface AICompanionConfig {
  /** Maximum companions per world. Default: 100. */
  maxCompanionsPerWorld?: number;
  /** Maximum memories per companion. Default: 500. */
  maxMemoriesPerCompanion?: number;
  /** Maximum active conversations per companion. Default: 3. */
  maxActiveConversations?: number;
  /** Memory importance threshold for auto-forget. Default: 0.1. */
  memoryForgetThreshold?: number;
  /** Maximum conversation turns before auto-end. Default: 50. */
  maxConversationTurns?: number;
  /** Affinity change per interaction. Default: 2. */
  affinityPerInteraction?: number;
  /** Trust change per positive interaction. Default: 1. */
  trustPerPositiveInteraction?: number;
  /** Maximum world knowledge entries per world. Default: 1000. */
  maxWorldKnowledge?: number;
  /** Maximum schedule entries per companion. Default: 24. */
  maxScheduleEntries?: number;
}

const DEFAULT_CONFIG: Required<AICompanionConfig> = {
  maxCompanionsPerWorld: 100,
  maxMemoriesPerCompanion: 500,
  maxActiveConversations: 3,
  memoryForgetThreshold: 0.1,
  maxConversationTurns: 50,
  affinityPerInteraction: 2,
  trustPerPositiveInteraction: 1,
  maxWorldKnowledge: 1000,
  maxScheduleEntries: 24,
};

// ============================================================================
// Relationship tier thresholds
// ============================================================================

function computeTier(affinity: number, trust: number): RelationshipTier {
  const combined = (affinity + trust) / 2;
  if (combined >= 80) return 'bonded';
  if (combined >= 60) return 'trusted';
  if (combined >= 40) return 'companion';
  if (combined >= 20) return 'friendly';
  if (combined >= 0) return 'acquaintance';
  return 'stranger';
}

// ============================================================================
// AICompanionService
// ============================================================================

export class AICompanionService {
  private config: Required<AICompanionConfig>;
  private running = false;
  private listeners: Set<(event: CompanionEvent) => void> = new Set();

  // Data stores
  private companions: Map<string, CompanionInfo> = new Map();
  private memories: Map<string, MemoryEntry[]> = new Map(); // companionId → memories
  private conversations: Map<string, Conversation> = new Map();
  private relationships: Map<string, RelationshipRecord> = new Map(); // `${companionId}:${playerId}`
  private worldKnowledge: Map<string, WorldKnowledge[]> = new Map(); // worldId → knowledge
  private nextId = 1;

  constructor(config: AICompanionConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  start(): void {
    if (this.running) return;
    this.running = true;
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  onEvent(listener: (event: CompanionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(event: CompanionEvent): void {
    for (const cb of this.listeners) cb(event);
  }

  private genId(prefix: string): string {
    return `${prefix}_${this.nextId++}`;
  }

  // --------------------------------------------------------------------------
  // Companion CRUD
  // --------------------------------------------------------------------------

  createCompanion(opts: CompanionCreateOptions): CompanionInfo {
    // Validate personality traits
    if (!opts.personality.traits.length) {
      throw new Error('At least one personality trait required');
    }
    if (!opts.name.trim()) {
      throw new Error('Companion name required');
    }

    // Count companions in world
    const worldCount = Array.from(this.companions.values())
      .filter(c => c.worldId === opts.worldId).length;
    if (worldCount >= this.config.maxCompanionsPerWorld) {
      throw new Error(`Maximum companions per world reached (${this.config.maxCompanionsPerWorld})`);
    }

    const now = Date.now();
    const companion: CompanionInfo = {
      id: this.genId('comp'),
      name: opts.name.trim(),
      title: opts.title ?? null,
      personality: {
        traits: [...opts.personality.traits],
        backstory: opts.personality.backstory,
        speechStyle: opts.personality.speechStyle,
        voiceTone: opts.personality.voiceTone,
        catchphrases: [...opts.personality.catchphrases],
      },
      currentBehavior: 'idle',
      currentMood: 'neutral',
      position: opts.position ?? [0, 0, 0],
      worldId: opts.worldId,
      health: opts.health ?? 100,
      maxHealth: opts.health ?? 100,
      level: opts.level ?? 1,
      schedule: opts.schedule ? [...opts.schedule] : [],
      transitions: opts.transitions ? [...opts.transitions] : [],
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    this.companions.set(companion.id, companion);
    this.memories.set(companion.id, []);

    this.emit({
      type: 'companion_created',
      companionId: companion.id,
      timestamp: now,
      data: { name: companion.name, worldId: companion.worldId },
    });

    return { ...companion };
  }

  getCompanion(companionId: string): CompanionInfo | undefined {
    const c = this.companions.get(companionId);
    return c ? { ...c } : undefined;
  }

  listCompanions(worldId?: string): CompanionInfo[] {
    let results = Array.from(this.companions.values());
    if (worldId) {
      results = results.filter(c => c.worldId === worldId);
    }
    return results.map(c => ({ ...c }));
  }

  removeCompanion(companionId: string): boolean {
    const companion = this.companions.get(companionId);
    if (!companion) return false;

    // End any active conversations
    for (const conv of this.conversations.values()) {
      if (conv.companionId === companionId && conv.active) {
        conv.active = false;
        conv.endedAt = Date.now();
      }
    }

    this.companions.delete(companionId);
    this.memories.delete(companionId);

    // Remove relationships for this companion
    for (const key of this.relationships.keys()) {
      if (key.startsWith(`${companionId}:`)) {
        this.relationships.delete(key);
      }
    }

    this.emit({
      type: 'companion_removed',
      companionId,
      timestamp: Date.now(),
      data: { name: companion.name },
    });

    return true;
  }

  activateCompanion(companionId: string): CompanionInfo {
    const companion = this.companions.get(companionId);
    if (!companion) throw new Error('Companion not found');
    if (companion.active) throw new Error('Companion already active');

    companion.active = true;
    companion.updatedAt = Date.now();

    this.emit({
      type: 'companion_activated',
      companionId,
      timestamp: Date.now(),
      data: {},
    });

    return { ...companion };
  }

  deactivateCompanion(companionId: string): CompanionInfo {
    const companion = this.companions.get(companionId);
    if (!companion) throw new Error('Companion not found');
    if (!companion.active) throw new Error('Companion already inactive');

    companion.active = false;
    companion.updatedAt = Date.now();

    // End active conversations
    for (const conv of this.conversations.values()) {
      if (conv.companionId === companionId && conv.active) {
        conv.active = false;
        conv.endedAt = Date.now();
      }
    }

    this.emit({
      type: 'companion_deactivated',
      companionId,
      timestamp: Date.now(),
      data: {},
    });

    return { ...companion };
  }

  // --------------------------------------------------------------------------
  // Behavior
  // --------------------------------------------------------------------------

  setBehavior(companionId: string, behavior: BehaviorState): CompanionInfo {
    const companion = this.companions.get(companionId);
    if (!companion) throw new Error('Companion not found');

    const oldBehavior = companion.currentBehavior;
    if (oldBehavior === behavior) return { ...companion };

    // Check allowed transitions if any are defined
    if (companion.transitions.length > 0) {
      const allowed = companion.transitions.some(
        t => t.from === oldBehavior && t.to === behavior
      );
      if (!allowed) {
        throw new Error(`Transition from '${oldBehavior}' to '${behavior}' not allowed`);
      }
    }

    companion.currentBehavior = behavior;
    companion.updatedAt = Date.now();

    this.emit({
      type: 'behavior_changed',
      companionId,
      timestamp: Date.now(),
      data: { from: oldBehavior, to: behavior },
    });

    return { ...companion };
  }

  setMood(companionId: string, mood: EmotionalState): CompanionInfo {
    const companion = this.companions.get(companionId);
    if (!companion) throw new Error('Companion not found');

    const oldMood = companion.currentMood;
    if (oldMood === mood) return { ...companion };

    companion.currentMood = mood;
    companion.updatedAt = Date.now();

    this.emit({
      type: 'mood_changed',
      companionId,
      timestamp: Date.now(),
      data: { from: oldMood, to: mood },
    });

    return { ...companion };
  }

  setPosition(companionId: string, position: [number, number, number]): CompanionInfo {
    const companion = this.companions.get(companionId);
    if (!companion) throw new Error('Companion not found');

    companion.position = [...position] as [number, number, number];
    companion.updatedAt = Date.now();
    return { ...companion };
  }

  // --------------------------------------------------------------------------
  // Schedule
  // --------------------------------------------------------------------------

  setSchedule(companionId: string, schedule: ScheduleEntry[]): CompanionInfo {
    const companion = this.companions.get(companionId);
    if (!companion) throw new Error('Companion not found');

    if (schedule.length > this.config.maxScheduleEntries) {
      throw new Error(`Maximum ${this.config.maxScheduleEntries} schedule entries allowed`);
    }

    // Validate time ranges
    for (const entry of schedule) {
      if (entry.timeStart < 0 || entry.timeStart > 23 || entry.timeEnd < 0 || entry.timeEnd > 23) {
        throw new Error('Schedule times must be 0-23');
      }
    }

    companion.schedule = [...schedule];
    companion.updatedAt = Date.now();

    this.emit({
      type: 'schedule_updated',
      companionId,
      timestamp: Date.now(),
      data: { entries: schedule.length },
    });

    return { ...companion };
  }

  getScheduledBehavior(companionId: string, hour: number): ScheduleEntry | undefined {
    const companion = this.companions.get(companionId);
    if (!companion) throw new Error('Companion not found');

    return companion.schedule.find(entry => {
      if (entry.timeStart <= entry.timeEnd) {
        return hour >= entry.timeStart && hour < entry.timeEnd;
      }
      // wraps midnight
      return hour >= entry.timeStart || hour < entry.timeEnd;
    });
  }

  // --------------------------------------------------------------------------
  // Memory
  // --------------------------------------------------------------------------

  addMemory(companionId: string, opts: {
    type: MemoryType;
    content: string;
    importance: number;
    playerId?: string;
    tags?: string[];
  }): MemoryEntry {
    const companion = this.companions.get(companionId);
    if (!companion) throw new Error('Companion not found');

    const memList = this.memories.get(companionId)!;

    // Enforce limit — forget lowest importance memories
    if (memList.filter(m => !m.forgotten).length >= this.config.maxMemoriesPerCompanion) {
      const active = memList.filter(m => !m.forgotten).sort((a, b) => a.importance - b.importance);
      if (active.length > 0) {
        active[0].forgotten = true;
        this.emit({
          type: 'memory_forgotten',
          companionId,
          timestamp: Date.now(),
          data: { memoryId: active[0].id, reason: 'capacity' },
        });
      }
    }

    const importance = Math.max(0, Math.min(1, opts.importance));
    const now = Date.now();
    const memory: MemoryEntry = {
      id: this.genId('mem'),
      companionId,
      type: opts.type,
      content: opts.content,
      importance,
      playerId: opts.playerId ?? null,
      tags: opts.tags ? [...opts.tags] : [],
      createdAt: now,
      lastRecalledAt: now,
      recallCount: 0,
      forgotten: false,
    };

    memList.push(memory);

    this.emit({
      type: 'memory_created',
      companionId,
      timestamp: now,
      data: { memoryId: memory.id, type: memory.type, importance },
    });

    return { ...memory };
  }

  recallMemories(companionId: string, opts?: {
    type?: MemoryType;
    playerId?: string;
    tags?: string[];
    minImportance?: number;
    limit?: number;
  }): MemoryEntry[] {
    const memList = this.memories.get(companionId);
    if (!memList) throw new Error('Companion not found');

    let filtered = memList.filter(m => !m.forgotten);

    if (opts?.type) {
      filtered = filtered.filter(m => m.type === opts.type);
    }
    if (opts?.playerId) {
      filtered = filtered.filter(m => m.playerId === opts.playerId);
    }
    if (opts?.tags?.length) {
      filtered = filtered.filter(m => opts.tags!.some(t => m.tags.includes(t)));
    }
    if (opts?.minImportance !== undefined) {
      filtered = filtered.filter(m => m.importance >= opts.minImportance!);
    }

    // Sort by importance desc, then recency
    filtered.sort((a, b) => b.importance - a.importance || b.createdAt - a.createdAt);

    if (opts?.limit) {
      filtered = filtered.slice(0, opts.limit);
    }

    // Update recall stats
    const now = Date.now();
    for (const mem of filtered) {
      const original = memList.find(m => m.id === mem.id)!;
      original.recallCount++;
      original.lastRecalledAt = now;
    }

    return filtered.map(m => ({ ...m }));
  }

  forgetMemory(companionId: string, memoryId: string): boolean {
    const memList = this.memories.get(companionId);
    if (!memList) throw new Error('Companion not found');

    const memory = memList.find(m => m.id === memoryId);
    if (!memory || memory.forgotten) return false;

    memory.forgotten = true;

    this.emit({
      type: 'memory_forgotten',
      companionId,
      timestamp: Date.now(),
      data: { memoryId, reason: 'manual' },
    });

    return true;
  }

  forgetLowImportance(companionId: string): number {
    const memList = this.memories.get(companionId);
    if (!memList) throw new Error('Companion not found');

    let count = 0;
    for (const mem of memList) {
      if (!mem.forgotten && mem.importance < this.config.memoryForgetThreshold) {
        mem.forgotten = true;
        count++;
      }
    }

    return count;
  }

  getMemoryCount(companionId: string): { total: number; active: number; forgotten: number } {
    const memList = this.memories.get(companionId);
    if (!memList) throw new Error('Companion not found');

    const active = memList.filter(m => !m.forgotten).length;
    return { total: memList.length, active, forgotten: memList.length - active };
  }

  // --------------------------------------------------------------------------
  // Dialogue & Conversations
  // --------------------------------------------------------------------------

  startConversation(companionId: string, playerId: string): Conversation {
    const companion = this.companions.get(companionId);
    if (!companion) throw new Error('Companion not found');
    if (!companion.active) throw new Error('Companion is not active');

    // Check active conversation limit
    const activeCount = Array.from(this.conversations.values())
      .filter(c => c.companionId === companionId && c.active).length;
    if (activeCount >= this.config.maxActiveConversations) {
      throw new Error(`Maximum active conversations reached (${this.config.maxActiveConversations})`);
    }

    // Check if already in conversation with this player
    const existing = Array.from(this.conversations.values())
      .find(c => c.companionId === companionId && c.playerId === playerId && c.active);
    if (existing) {
      throw new Error('Already in conversation with this player');
    }

    const now = Date.now();
    const conv: Conversation = {
      id: this.genId('conv'),
      companionId,
      playerId,
      turns: [],
      topics: [],
      startedAt: now,
      endedAt: null,
      active: true,
    };

    this.conversations.set(conv.id, conv);

    // Update relationship
    this.ensureRelationship(companionId, playerId);

    this.emit({
      type: 'conversation_started',
      companionId,
      timestamp: now,
      data: { conversationId: conv.id, playerId },
    });

    return { ...conv, turns: [...conv.turns] };
  }

  addDialogueTurn(conversationId: string, turn: {
    speaker: 'player' | 'companion';
    text: string;
    mood?: EmotionalState;
  }): Conversation {
    const conv = this.conversations.get(conversationId);
    if (!conv) throw new Error('Conversation not found');
    if (!conv.active) throw new Error('Conversation has ended');

    if (conv.turns.length >= this.config.maxConversationTurns) {
      // Auto-end conversation
      conv.active = false;
      conv.endedAt = Date.now();
      this.emit({
        type: 'conversation_ended',
        companionId: conv.companionId,
        timestamp: Date.now(),
        data: { conversationId, reason: 'max_turns', turns: conv.turns.length },
      });
      throw new Error('Conversation exceeded maximum turns');
    }

    const dialogueTurn: DialogueTurn = {
      speaker: turn.speaker,
      text: turn.text,
      mood: turn.mood ?? 'neutral',
      timestamp: Date.now(),
    };

    conv.turns.push(dialogueTurn);

    // Extract topics (simple: words > 4 chars that appear in turn)
    const words = turn.text.toLowerCase().split(/\s+/)
      .filter(w => w.length > 4)
      .map(w => w.replace(/[^a-z]/g, ''))
      .filter(w => w.length > 4);
    for (const word of words) {
      if (!conv.topics.includes(word)) {
        conv.topics.push(word);
      }
    }

    // Update mood if companion speaking
    if (turn.speaker === 'companion' && turn.mood) {
      const companion = this.companions.get(conv.companionId);
      if (companion && companion.currentMood !== turn.mood) {
        companion.currentMood = turn.mood;
        this.emit({
          type: 'mood_changed',
          companionId: conv.companionId,
          timestamp: Date.now(),
          data: { from: companion.currentMood, to: turn.mood },
        });
      }
    }

    // Update relationship interaction count
    this.incrementInteraction(conv.companionId, conv.playerId);

    this.emit({
      type: 'dialogue_turn',
      companionId: conv.companionId,
      timestamp: Date.now(),
      data: { conversationId, speaker: turn.speaker, turnNumber: conv.turns.length },
    });

    return { ...conv, turns: conv.turns.map(t => ({ ...t })) };
  }

  endConversation(conversationId: string): Conversation {
    const conv = this.conversations.get(conversationId);
    if (!conv) throw new Error('Conversation not found');
    if (!conv.active) throw new Error('Conversation already ended');

    conv.active = false;
    conv.endedAt = Date.now();

    // Create memory of the conversation
    if (conv.turns.length > 0) {
      const summary = `Had a conversation with player ${conv.playerId} about: ${conv.topics.slice(0, 5).join(', ') || 'general topics'}`;
      const memList = this.memories.get(conv.companionId);
      if (memList) {
        const importance = Math.min(1, 0.3 + conv.turns.length * 0.02);
        this.addMemory(conv.companionId, {
          type: 'interaction',
          content: summary,
          importance,
          playerId: conv.playerId,
          tags: conv.topics.slice(0, 5),
        });
      }
    }

    this.emit({
      type: 'conversation_ended',
      companionId: conv.companionId,
      timestamp: Date.now(),
      data: { conversationId, turns: conv.turns.length, topics: conv.topics },
    });

    return { ...conv, turns: conv.turns.map(t => ({ ...t })) };
  }

  getConversation(conversationId: string): Conversation | undefined {
    const conv = this.conversations.get(conversationId);
    return conv ? { ...conv, turns: conv.turns.map(t => ({ ...t })) } : undefined;
  }

  getActiveConversations(companionId: string): Conversation[] {
    return Array.from(this.conversations.values())
      .filter(c => c.companionId === companionId && c.active)
      .map(c => ({ ...c, turns: c.turns.map(t => ({ ...t })) }));
  }

  getConversationHistory(companionId: string, playerId?: string): Conversation[] {
    let results = Array.from(this.conversations.values())
      .filter(c => c.companionId === companionId);
    if (playerId) {
      results = results.filter(c => c.playerId === playerId);
    }
    return results
      .sort((a, b) => b.startedAt - a.startedAt)
      .map(c => ({ ...c, turns: c.turns.map(t => ({ ...t })) }));
  }

  // --------------------------------------------------------------------------
  // Relationships
  // --------------------------------------------------------------------------

  private relationshipKey(companionId: string, playerId: string): string {
    return `${companionId}:${playerId}`;
  }

  private ensureRelationship(companionId: string, playerId: string): RelationshipRecord {
    const key = this.relationshipKey(companionId, playerId);
    let rel = this.relationships.get(key);
    if (!rel) {
      const now = Date.now();
      rel = {
        companionId,
        playerId,
        affinity: 0,
        trust: 0,
        tier: 'stranger',
        interactionCount: 0,
        firstMet: now,
        lastInteraction: now,
        notes: [],
      };
      this.relationships.set(key, rel);
    }
    return rel;
  }

  private incrementInteraction(companionId: string, playerId: string): void {
    const rel = this.ensureRelationship(companionId, playerId);
    rel.interactionCount++;
    rel.lastInteraction = Date.now();

    // Auto-adjust affinity
    const oldAffinity = rel.affinity;
    rel.affinity = Math.min(100, rel.affinity + this.config.affinityPerInteraction);
    rel.trust = Math.min(100, rel.trust + this.config.trustPerPositiveInteraction);

    const oldTier = rel.tier;
    rel.tier = computeTier(rel.affinity, rel.trust);

    if (rel.tier !== oldTier) {
      this.emit({
        type: 'relationship_tier_changed',
        companionId,
        timestamp: Date.now(),
        data: { playerId, from: oldTier, to: rel.tier, affinity: rel.affinity, trust: rel.trust },
      });
    }
  }

  getRelationship(companionId: string, playerId: string): RelationshipRecord | undefined {
    const key = this.relationshipKey(companionId, playerId);
    const rel = this.relationships.get(key);
    return rel ? { ...rel, notes: [...rel.notes] } : undefined;
  }

  adjustAffinity(companionId: string, playerId: string, delta: number): RelationshipRecord {
    const companion = this.companions.get(companionId);
    if (!companion) throw new Error('Companion not found');

    const rel = this.ensureRelationship(companionId, playerId);
    const oldAffinity = rel.affinity;
    rel.affinity = Math.max(-100, Math.min(100, rel.affinity + delta));
    rel.lastInteraction = Date.now();

    const oldTier = rel.tier;
    rel.tier = computeTier(rel.affinity, rel.trust);

    this.emit({
      type: 'relationship_changed',
      companionId,
      timestamp: Date.now(),
      data: { playerId, affinityDelta: delta, oldAffinity, newAffinity: rel.affinity },
    });

    if (rel.tier !== oldTier) {
      this.emit({
        type: 'relationship_tier_changed',
        companionId,
        timestamp: Date.now(),
        data: { playerId, from: oldTier, to: rel.tier },
      });
    }

    return { ...rel, notes: [...rel.notes] };
  }

  adjustTrust(companionId: string, playerId: string, delta: number): RelationshipRecord {
    const companion = this.companions.get(companionId);
    if (!companion) throw new Error('Companion not found');

    const rel = this.ensureRelationship(companionId, playerId);
    rel.trust = Math.max(0, Math.min(100, rel.trust + delta));
    rel.lastInteraction = Date.now();

    const oldTier = rel.tier;
    rel.tier = computeTier(rel.affinity, rel.trust);

    if (rel.tier !== oldTier) {
      this.emit({
        type: 'relationship_tier_changed',
        companionId,
        timestamp: Date.now(),
        data: { playerId, from: oldTier, to: rel.tier },
      });
    }

    return { ...rel, notes: [...rel.notes] };
  }

  addRelationshipNote(companionId: string, playerId: string, note: string): RelationshipRecord {
    const companion = this.companions.get(companionId);
    if (!companion) throw new Error('Companion not found');

    const rel = this.ensureRelationship(companionId, playerId);
    rel.notes.push(note);
    return { ...rel, notes: [...rel.notes] };
  }

  getCompanionRelationships(companionId: string): RelationshipRecord[] {
    return Array.from(this.relationships.values())
      .filter(r => r.companionId === companionId)
      .map(r => ({ ...r, notes: [...r.notes] }));
  }

  getPlayerRelationships(playerId: string): RelationshipRecord[] {
    return Array.from(this.relationships.values())
      .filter(r => r.playerId === playerId)
      .map(r => ({ ...r, notes: [...r.notes] }));
  }

  // --------------------------------------------------------------------------
  // World Knowledge
  // --------------------------------------------------------------------------

  addWorldKnowledge(opts: {
    topic: string;
    content: string;
    source: string;
    worldId: string;
    addedBy: string;
  }): WorldKnowledge {
    if (!this.worldKnowledge.has(opts.worldId)) {
      this.worldKnowledge.set(opts.worldId, []);
    }
    const list = this.worldKnowledge.get(opts.worldId)!;

    if (list.length >= this.config.maxWorldKnowledge) {
      throw new Error(`Maximum world knowledge entries reached (${this.config.maxWorldKnowledge})`);
    }

    // Prevent duplicate topics in same world
    if (list.some(k => k.topic.toLowerCase() === opts.topic.toLowerCase())) {
      throw new Error(`Knowledge about '${opts.topic}' already exists in this world`);
    }

    const entry: WorldKnowledge = {
      id: this.genId('wk'),
      topic: opts.topic,
      content: opts.content,
      source: opts.source,
      worldId: opts.worldId,
      addedBy: opts.addedBy,
      createdAt: Date.now(),
    };

    list.push(entry);

    this.emit({
      type: 'knowledge_added',
      companionId: opts.addedBy,
      timestamp: Date.now(),
      data: { knowledgeId: entry.id, topic: entry.topic, worldId: entry.worldId },
    });

    return { ...entry };
  }

  queryWorldKnowledge(worldId: string, query?: string): WorldKnowledge[] {
    const list = this.worldKnowledge.get(worldId) ?? [];
    if (!query) return list.map(k => ({ ...k }));

    const lower = query.toLowerCase();
    return list
      .filter(k =>
        k.topic.toLowerCase().includes(lower) ||
        k.content.toLowerCase().includes(lower)
      )
      .map(k => ({ ...k }));
  }

  removeWorldKnowledge(worldId: string, knowledgeId: string): boolean {
    const list = this.worldKnowledge.get(worldId);
    if (!list) return false;

    const idx = list.findIndex(k => k.id === knowledgeId);
    if (idx < 0) return false;

    list.splice(idx, 1);
    return true;
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  getStats(): CompanionStats {
    const companions = Array.from(this.companions.values());
    const conversations = Array.from(this.conversations.values());
    const relationships = Array.from(this.relationships.values());

    const companionsByBehavior = {} as Record<BehaviorState, number>;
    const companionsByMood = {} as Record<EmotionalState, number>;

    for (const c of companions) {
      companionsByBehavior[c.currentBehavior] = (companionsByBehavior[c.currentBehavior] ?? 0) + 1;
      companionsByMood[c.currentMood] = (companionsByMood[c.currentMood] ?? 0) + 1;
    }

    let totalMemories = 0;
    for (const memList of this.memories.values()) {
      totalMemories += memList.filter(m => !m.forgotten).length;
    }

    const totalAffinity = relationships.reduce((sum, r) => sum + r.affinity, 0);

    const totalKnowledge = Array.from(this.worldKnowledge.values())
      .reduce((sum, list) => sum + list.length, 0);

    return {
      totalCompanions: companions.length,
      activeCompanions: companions.filter(c => c.active).length,
      totalMemories,
      totalConversations: conversations.length,
      activeConversations: conversations.filter(c => c.active).length,
      totalRelationships: relationships.length,
      totalWorldKnowledge: totalKnowledge,
      averageAffinity: relationships.length > 0 ? totalAffinity / relationships.length : 0,
      companionsByBehavior,
      companionsByMood,
    };
  }
}
