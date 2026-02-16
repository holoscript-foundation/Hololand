import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AICompanionService,
  type AICompanionConfig,
  type CompanionCreateOptions,
  type CompanionEvent,
  type CompanionInfo,
  type BehaviorState,
  type EmotionalState,
  type MemoryEntry,
  type Conversation,
  type RelationshipRecord,
  type WorldKnowledge,
} from '../src/services/AICompanionService';

// ============================================================================
// Helpers
// ============================================================================

function makePersonality(overrides: Partial<CompanionCreateOptions['personality']> = {}) {
  return {
    traits: overrides.traits ?? ['friendly', 'brave'] as any,
    backstory: overrides.backstory ?? 'A wandering knight.',
    speechStyle: overrides.speechStyle ?? 'formal',
    voiceTone: overrides.voiceTone ?? 'deep',
    catchphrases: overrides.catchphrases ?? ['Well met!'],
  };
}

function makeOpts(overrides: Partial<CompanionCreateOptions> = {}): CompanionCreateOptions {
  return {
    name: overrides.name ?? 'Sir Lancelot',
    title: overrides.title,
    personality: overrides.personality ?? makePersonality(),
    worldId: overrides.worldId ?? 'world_1',
    position: overrides.position,
    health: overrides.health,
    level: overrides.level,
    schedule: overrides.schedule,
    transitions: overrides.transitions,
  };
}

function collectEvents(service: AICompanionService): CompanionEvent[] {
  const events: CompanionEvent[] = [];
  service.onEvent(e => events.push(e));
  return events;
}

// ============================================================================
// Tests
// ============================================================================

describe('AICompanionService', () => {
  let svc: AICompanionService;

  beforeEach(() => {
    svc = new AICompanionService();
    svc.start();
  });

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------
  describe('lifecycle', () => {
    it('starts and stops', () => {
      const s = new AICompanionService();
      expect(s.isRunning()).toBe(false);
      s.start();
      expect(s.isRunning()).toBe(true);
      s.stop();
      expect(s.isRunning()).toBe(false);
    });

    it('start is idempotent', () => {
      svc.start();
      expect(svc.isRunning()).toBe(true);
    });

    it('stop is idempotent', () => {
      svc.stop();
      svc.stop();
      expect(svc.isRunning()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Companion CRUD
  // --------------------------------------------------------------------------
  describe('companion CRUD', () => {
    it('creates a companion with defaults', () => {
      const c = svc.createCompanion(makeOpts());
      expect(c.id).toMatch(/^comp_/);
      expect(c.name).toBe('Sir Lancelot');
      expect(c.currentBehavior).toBe('idle');
      expect(c.currentMood).toBe('neutral');
      expect(c.position).toEqual([0, 0, 0]);
      expect(c.health).toBe(100);
      expect(c.maxHealth).toBe(100);
      expect(c.level).toBe(1);
      expect(c.active).toBe(true);
    });

    it('creates with custom position, health, level', () => {
      const c = svc.createCompanion(makeOpts({
        position: [10, 5, -3],
        health: 200,
        level: 5,
        title: 'The Brave',
      }));
      expect(c.position).toEqual([10, 5, -3]);
      expect(c.health).toBe(200);
      expect(c.level).toBe(5);
      expect(c.title).toBe('The Brave');
    });

    it('emits companion_created event', () => {
      const events = collectEvents(svc);
      svc.createCompanion(makeOpts());
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('companion_created');
    });

    it('rejects empty name', () => {
      expect(() => svc.createCompanion(makeOpts({ name: '   ' }))).toThrow('name required');
    });

    it('rejects empty personality traits', () => {
      expect(() => svc.createCompanion(makeOpts({
        personality: makePersonality({ traits: [] as any }),
      }))).toThrow('At least one personality trait required');
    });

    it('enforces max companions per world', () => {
      const s = new AICompanionService({ maxCompanionsPerWorld: 2 });
      s.start();
      s.createCompanion(makeOpts({ name: 'A' }));
      s.createCompanion(makeOpts({ name: 'B' }));
      expect(() => s.createCompanion(makeOpts({ name: 'C' }))).toThrow('Maximum companions per world');
    });

    it('get returns a companion', () => {
      const c = svc.createCompanion(makeOpts());
      const fetched = svc.getCompanion(c.id);
      expect(fetched).toBeDefined();
      expect(fetched!.name).toBe('Sir Lancelot');
    });

    it('get returns undefined for missing', () => {
      expect(svc.getCompanion('nope')).toBeUndefined();
    });

    it('lists companions', () => {
      svc.createCompanion(makeOpts({ name: 'A', worldId: 'w1' }));
      svc.createCompanion(makeOpts({ name: 'B', worldId: 'w2' }));
      expect(svc.listCompanions().length).toBe(2);
      expect(svc.listCompanions('w1').length).toBe(1);
    });

    it('removes a companion', () => {
      const c = svc.createCompanion(makeOpts());
      const events = collectEvents(svc);
      expect(svc.removeCompanion(c.id)).toBe(true);
      expect(svc.getCompanion(c.id)).toBeUndefined();
      expect(events.some(e => e.type === 'companion_removed')).toBe(true);
    });

    it('remove returns false for missing', () => {
      expect(svc.removeCompanion('nope')).toBe(false);
    });

    it('activate/deactivate companion', () => {
      const c = svc.createCompanion(makeOpts());
      const deactivated = svc.deactivateCompanion(c.id);
      expect(deactivated.active).toBe(false);

      const activated = svc.activateCompanion(c.id);
      expect(activated.active).toBe(true);
    });

    it('activate throws if already active', () => {
      const c = svc.createCompanion(makeOpts());
      expect(() => svc.activateCompanion(c.id)).toThrow('already active');
    });

    it('deactivate throws if already inactive', () => {
      const c = svc.createCompanion(makeOpts());
      svc.deactivateCompanion(c.id);
      expect(() => svc.deactivateCompanion(c.id)).toThrow('already inactive');
    });

    it('deactivate ends active conversations', () => {
      const c = svc.createCompanion(makeOpts());
      const conv = svc.startConversation(c.id, 'player_1');
      svc.deactivateCompanion(c.id);
      const fetched = svc.getConversation(conv.id);
      expect(fetched!.active).toBe(false);
    });

    it('remove ends active conversations', () => {
      const c = svc.createCompanion(makeOpts());
      const conv = svc.startConversation(c.id, 'player_1');
      svc.removeCompanion(c.id);
      const fetched = svc.getConversation(conv.id);
      expect(fetched!.active).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Behavior
  // --------------------------------------------------------------------------
  describe('behavior', () => {
    it('sets behavior', () => {
      const c = svc.createCompanion(makeOpts());
      const updated = svc.setBehavior(c.id, 'patrol');
      expect(updated.currentBehavior).toBe('patrol');
    });

    it('emits behavior_changed event', () => {
      const c = svc.createCompanion(makeOpts());
      const events = collectEvents(svc);
      svc.setBehavior(c.id, 'combat');
      expect(events.some(e => e.type === 'behavior_changed' && (e.data as any).to === 'combat')).toBe(true);
    });

    it('returns same companion if behavior unchanged', () => {
      const c = svc.createCompanion(makeOpts());
      const events = collectEvents(svc);
      svc.setBehavior(c.id, 'idle'); // already idle
      expect(events.length).toBe(0);
    });

    it('enforces transition rules when defined', () => {
      const c = svc.createCompanion(makeOpts({
        transitions: [
          { from: 'idle', to: 'patrol', condition: 'daytime', priority: 1 },
          { from: 'patrol', to: 'idle', condition: 'nighttime', priority: 1 },
        ],
      }));
      svc.setBehavior(c.id, 'patrol'); // idle→patrol allowed
      expect(() => svc.setBehavior(c.id, 'combat')).toThrow('not allowed');
    });

    it('throws for missing companion', () => {
      expect(() => svc.setBehavior('nope', 'idle')).toThrow('not found');
    });
  });

  // --------------------------------------------------------------------------
  // Mood
  // --------------------------------------------------------------------------
  describe('mood', () => {
    it('sets mood', () => {
      const c = svc.createCompanion(makeOpts());
      const updated = svc.setMood(c.id, 'happy');
      expect(updated.currentMood).toBe('happy');
    });

    it('emits mood_changed', () => {
      const c = svc.createCompanion(makeOpts());
      const events = collectEvents(svc);
      svc.setMood(c.id, 'angry');
      expect(events[0].type).toBe('mood_changed');
    });

    it('no event if mood unchanged', () => {
      const c = svc.createCompanion(makeOpts());
      const events = collectEvents(svc);
      svc.setMood(c.id, 'neutral');
      expect(events.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Position
  // --------------------------------------------------------------------------
  describe('position', () => {
    it('updates position', () => {
      const c = svc.createCompanion(makeOpts());
      const updated = svc.setPosition(c.id, [5, 10, 15]);
      expect(updated.position).toEqual([5, 10, 15]);
    });

    it('throws for missing companion', () => {
      expect(() => svc.setPosition('nope', [0, 0, 0])).toThrow('not found');
    });
  });

  // --------------------------------------------------------------------------
  // Schedule
  // --------------------------------------------------------------------------
  describe('schedule', () => {
    it('sets schedule entries', () => {
      const c = svc.createCompanion(makeOpts());
      const entries = [
        { timeStart: 6, timeEnd: 12, behavior: 'patrol' as BehaviorState, location: [0, 0, 0] as [number, number, number], description: 'Morning patrol' },
        { timeStart: 12, timeEnd: 18, behavior: 'trade' as BehaviorState, location: null, description: 'Afternoon trade' },
      ];
      const updated = svc.setSchedule(c.id, entries);
      expect(updated.schedule.length).toBe(2);
    });

    it('enforces max schedule entries', () => {
      const s = new AICompanionService({ maxScheduleEntries: 2 });
      s.start();
      const c = s.createCompanion(makeOpts());
      const entries = Array.from({ length: 3 }, (_, i) => ({
        timeStart: i, timeEnd: i + 1, behavior: 'idle' as BehaviorState, location: null, description: `entry ${i}`,
      }));
      expect(() => s.setSchedule(c.id, entries)).toThrow('Maximum');
    });

    it('validates time range', () => {
      const c = svc.createCompanion(makeOpts());
      expect(() => svc.setSchedule(c.id, [
        { timeStart: -1, timeEnd: 5, behavior: 'idle', location: null, description: 'bad' },
      ])).toThrow('0-23');
    });

    it('gets scheduled behavior for hour', () => {
      const c = svc.createCompanion(makeOpts());
      svc.setSchedule(c.id, [
        { timeStart: 6, timeEnd: 12, behavior: 'patrol', location: null, description: 'Morning' },
        { timeStart: 22, timeEnd: 4, behavior: 'sleep', location: null, description: 'Night' },
      ]);
      const morning = svc.getScheduledBehavior(c.id, 8);
      expect(morning!.behavior).toBe('patrol');

      // Midnight wraps
      const night = svc.getScheduledBehavior(c.id, 23);
      expect(night!.behavior).toBe('sleep');

      const earlyMorning = svc.getScheduledBehavior(c.id, 2);
      expect(earlyMorning!.behavior).toBe('sleep');

      // No schedule at 14
      const afternoon = svc.getScheduledBehavior(c.id, 14);
      expect(afternoon).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // Memory
  // --------------------------------------------------------------------------
  describe('memory', () => {
    it('adds a memory', () => {
      const c = svc.createCompanion(makeOpts());
      const mem = svc.addMemory(c.id, {
        type: 'interaction',
        content: 'Met the hero at the tavern',
        importance: 0.7,
        playerId: 'player_1',
        tags: ['tavern', 'meeting'],
      });
      expect(mem.id).toMatch(/^mem_/);
      expect(mem.importance).toBe(0.7);
      expect(mem.forgotten).toBe(false);
    });

    it('clamps importance 0-1', () => {
      const c = svc.createCompanion(makeOpts());
      const high = svc.addMemory(c.id, { type: 'knowledge', content: 'x', importance: 5 });
      expect(high.importance).toBe(1);
      const low = svc.addMemory(c.id, { type: 'knowledge', content: 'y', importance: -2 });
      expect(low.importance).toBe(0);
    });

    it('recalls memories sorted by importance', () => {
      const c = svc.createCompanion(makeOpts());
      svc.addMemory(c.id, { type: 'interaction', content: 'low', importance: 0.2 });
      svc.addMemory(c.id, { type: 'interaction', content: 'high', importance: 0.9 });
      svc.addMemory(c.id, { type: 'observation', content: 'med', importance: 0.5 });

      const all = svc.recallMemories(c.id);
      expect(all[0].content).toBe('high');
      expect(all.length).toBe(3);
    });

    it('filters by type', () => {
      const c = svc.createCompanion(makeOpts());
      svc.addMemory(c.id, { type: 'interaction', content: 'a', importance: 0.5 });
      svc.addMemory(c.id, { type: 'observation', content: 'b', importance: 0.5 });

      const interactions = svc.recallMemories(c.id, { type: 'interaction' });
      expect(interactions.length).toBe(1);
      expect(interactions[0].content).toBe('a');
    });

    it('filters by playerId', () => {
      const c = svc.createCompanion(makeOpts());
      svc.addMemory(c.id, { type: 'interaction', content: 'a', importance: 0.5, playerId: 'p1' });
      svc.addMemory(c.id, { type: 'interaction', content: 'b', importance: 0.5, playerId: 'p2' });

      const p1Mems = svc.recallMemories(c.id, { playerId: 'p1' });
      expect(p1Mems.length).toBe(1);
    });

    it('filters by tags', () => {
      const c = svc.createCompanion(makeOpts());
      svc.addMemory(c.id, { type: 'interaction', content: 'a', importance: 0.5, tags: ['quest'] });
      svc.addMemory(c.id, { type: 'interaction', content: 'b', importance: 0.5, tags: ['trade'] });

      const quest = svc.recallMemories(c.id, { tags: ['quest'] });
      expect(quest.length).toBe(1);
    });

    it('filters by minImportance', () => {
      const c = svc.createCompanion(makeOpts());
      svc.addMemory(c.id, { type: 'interaction', content: 'low', importance: 0.1 });
      svc.addMemory(c.id, { type: 'interaction', content: 'high', importance: 0.8 });

      const important = svc.recallMemories(c.id, { minImportance: 0.5 });
      expect(important.length).toBe(1);
      expect(important[0].content).toBe('high');
    });

    it('limits recall results', () => {
      const c = svc.createCompanion(makeOpts());
      for (let i = 0; i < 10; i++) {
        svc.addMemory(c.id, { type: 'interaction', content: `m${i}`, importance: i * 0.1 });
      }
      const limited = svc.recallMemories(c.id, { limit: 3 });
      expect(limited.length).toBe(3);
    });

    it('increments recallCount', () => {
      const c = svc.createCompanion(makeOpts());
      const mem = svc.addMemory(c.id, { type: 'interaction', content: 'test', importance: 0.5 });
      expect(mem.recallCount).toBe(0);

      const recalled = svc.recallMemories(c.id);
      // recall updates in-place, check via second recall
      const recalled2 = svc.recallMemories(c.id);
      expect(recalled2[0].recallCount).toBe(2);
    });

    it('forgets a memory manually', () => {
      const c = svc.createCompanion(makeOpts());
      const mem = svc.addMemory(c.id, { type: 'interaction', content: 'secret', importance: 0.9 });
      expect(svc.forgetMemory(c.id, mem.id)).toBe(true);
      const recalled = svc.recallMemories(c.id);
      expect(recalled.length).toBe(0);
    });

    it('forget returns false for already forgotten', () => {
      const c = svc.createCompanion(makeOpts());
      const mem = svc.addMemory(c.id, { type: 'interaction', content: 'x', importance: 0.5 });
      svc.forgetMemory(c.id, mem.id);
      expect(svc.forgetMemory(c.id, mem.id)).toBe(false);
    });

    it('auto-forgets lowest importance on capacity', () => {
      const s = new AICompanionService({ maxMemoriesPerCompanion: 3 });
      s.start();
      const c = s.createCompanion(makeOpts());
      const events = collectEvents(s);

      s.addMemory(c.id, { type: 'interaction', content: 'a', importance: 0.5 });
      s.addMemory(c.id, { type: 'interaction', content: 'b', importance: 0.3 });
      s.addMemory(c.id, { type: 'interaction', content: 'c', importance: 0.8 });
      // This add should evict lowest (b, 0.3)
      s.addMemory(c.id, { type: 'interaction', content: 'd', importance: 0.6 });

      const recalled = s.recallMemories(c.id);
      expect(recalled.length).toBe(3);
      expect(recalled.every(m => m.content !== 'b')).toBe(true);
      expect(events.some(e => e.type === 'memory_forgotten' && (e.data as any).reason === 'capacity')).toBe(true);
    });

    it('forgetLowImportance cleans up', () => {
      const c = svc.createCompanion(makeOpts());
      svc.addMemory(c.id, { type: 'interaction', content: 'low', importance: 0.05 });
      svc.addMemory(c.id, { type: 'interaction', content: 'high', importance: 0.5 });

      const count = svc.forgetLowImportance(c.id);
      expect(count).toBe(1);
      expect(svc.recallMemories(c.id).length).toBe(1);
    });

    it('getMemoryCount returns stats', () => {
      const c = svc.createCompanion(makeOpts());
      svc.addMemory(c.id, { type: 'interaction', content: 'a', importance: 0.5 });
      svc.addMemory(c.id, { type: 'interaction', content: 'b', importance: 0.5 });
      svc.forgetMemory(c.id, svc.recallMemories(c.id)[0].id);

      const counts = svc.getMemoryCount(c.id);
      expect(counts.total).toBe(2);
      expect(counts.active).toBe(1);
      expect(counts.forgotten).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Conversations
  // --------------------------------------------------------------------------
  describe('conversations', () => {
    it('starts a conversation', () => {
      const c = svc.createCompanion(makeOpts());
      const conv = svc.startConversation(c.id, 'player_1');
      expect(conv.id).toMatch(/^conv_/);
      expect(conv.active).toBe(true);
      expect(conv.turns.length).toBe(0);
    });

    it('emits conversation_started', () => {
      const c = svc.createCompanion(makeOpts());
      const events = collectEvents(svc);
      svc.startConversation(c.id, 'player_1');
      expect(events[0].type).toBe('conversation_started');
    });

    it('throws for inactive companion', () => {
      const c = svc.createCompanion(makeOpts());
      svc.deactivateCompanion(c.id);
      expect(() => svc.startConversation(c.id, 'player_1')).toThrow('not active');
    });

    it('throws for missing companion', () => {
      expect(() => svc.startConversation('nope', 'player_1')).toThrow('not found');
    });

    it('enforces max active conversations', () => {
      const s = new AICompanionService({ maxActiveConversations: 1 });
      s.start();
      const c = s.createCompanion(makeOpts());
      s.startConversation(c.id, 'player_1');
      expect(() => s.startConversation(c.id, 'player_2')).toThrow('Maximum active conversations');
    });

    it('prevents duplicate conversation with same player', () => {
      const c = svc.createCompanion(makeOpts());
      svc.startConversation(c.id, 'player_1');
      expect(() => svc.startConversation(c.id, 'player_1')).toThrow('Already in conversation');
    });

    it('adds dialogue turns', () => {
      const c = svc.createCompanion(makeOpts());
      const conv = svc.startConversation(c.id, 'player_1');
      const updated = svc.addDialogueTurn(conv.id, {
        speaker: 'player',
        text: 'Hello there!',
      });
      expect(updated.turns.length).toBe(1);
      expect(updated.turns[0].speaker).toBe('player');

      const updated2 = svc.addDialogueTurn(conv.id, {
        speaker: 'companion',
        text: 'Well met, traveler!',
        mood: 'happy',
      });
      expect(updated2.turns.length).toBe(2);
    });

    it('extracts topics from dialogue', () => {
      const c = svc.createCompanion(makeOpts());
      const conv = svc.startConversation(c.id, 'player_1');
      svc.addDialogueTurn(conv.id, {
        speaker: 'player',
        text: 'Tell me about the ancient dragon quest',
      });
      const fetched = svc.getConversation(conv.id)!;
      expect(fetched.topics.length).toBeGreaterThan(0);
      expect(fetched.topics.some(t => t === 'ancient' || t === 'dragon' || t === 'quest' || t === 'about')).toBe(true);
    });

    it('auto-ends conversation at max turns', () => {
      const s = new AICompanionService({ maxConversationTurns: 2 });
      s.start();
      const c = s.createCompanion(makeOpts());
      const conv = s.startConversation(c.id, 'player_1');
      s.addDialogueTurn(conv.id, { speaker: 'player', text: 'Hello' });
      s.addDialogueTurn(conv.id, { speaker: 'companion', text: 'Hi' });
      expect(() => s.addDialogueTurn(conv.id, { speaker: 'player', text: 'Bye' })).toThrow('maximum turns');
    });

    it('throws for dialogue on ended conversation', () => {
      const c = svc.createCompanion(makeOpts());
      const conv = svc.startConversation(c.id, 'player_1');
      svc.endConversation(conv.id);
      expect(() => svc.addDialogueTurn(conv.id, { speaker: 'player', text: 'x' })).toThrow('ended');
    });

    it('ends a conversation and creates memory', () => {
      const c = svc.createCompanion(makeOpts());
      const conv = svc.startConversation(c.id, 'player_1');
      svc.addDialogueTurn(conv.id, { speaker: 'player', text: 'Let us discuss the sword quest together' });

      const events = collectEvents(svc);
      const ended = svc.endConversation(conv.id);
      expect(ended.active).toBe(false);
      expect(ended.endedAt).toBeDefined();
      expect(events.some(e => e.type === 'conversation_ended')).toBe(true);

      // Should have created a memory
      const mems = svc.recallMemories(c.id, { type: 'interaction' });
      expect(mems.length).toBe(1);
      expect(mems[0].content).toContain('conversation');
    });

    it('throws when ending already ended conversation', () => {
      const c = svc.createCompanion(makeOpts());
      const conv = svc.startConversation(c.id, 'player_1');
      svc.endConversation(conv.id);
      expect(() => svc.endConversation(conv.id)).toThrow('already ended');
    });

    it('gets active conversations for companion', () => {
      const c = svc.createCompanion(makeOpts());
      svc.startConversation(c.id, 'player_1');
      svc.startConversation(c.id, 'player_2');
      const active = svc.getActiveConversations(c.id);
      expect(active.length).toBe(2);
    });

    it('gets conversation history', () => {
      const c = svc.createCompanion(makeOpts());
      const conv1 = svc.startConversation(c.id, 'player_1');
      svc.endConversation(conv1.id);
      svc.startConversation(c.id, 'player_1'); // can start new one now

      const history = svc.getConversationHistory(c.id, 'player_1');
      expect(history.length).toBe(2);
    });

    it('gets conversation history without player filter', () => {
      const c = svc.createCompanion(makeOpts());
      svc.startConversation(c.id, 'player_1');
      svc.startConversation(c.id, 'player_2');
      expect(svc.getConversationHistory(c.id).length).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // Relationships
  // --------------------------------------------------------------------------
  describe('relationships', () => {
    it('creates relationship on first interaction', () => {
      const c = svc.createCompanion(makeOpts());
      svc.startConversation(c.id, 'player_1');
      const rel = svc.getRelationship(c.id, 'player_1');
      expect(rel).toBeDefined();
      expect(rel!.tier).toBe('stranger');
      expect(rel!.affinity).toBe(0);
    });

    it('returns undefined for non-existent relationship', () => {
      const c = svc.createCompanion(makeOpts());
      expect(svc.getRelationship(c.id, 'nobody')).toBeUndefined();
    });

    it('increments affinity through interactions', () => {
      const c = svc.createCompanion(makeOpts());
      const conv = svc.startConversation(c.id, 'player_1');
      // Each dialogue turn increments interaction
      for (let i = 0; i < 5; i++) {
        svc.addDialogueTurn(conv.id, { speaker: 'player', text: `Message ${i} to companion` });
      }
      const rel = svc.getRelationship(c.id, 'player_1')!;
      expect(rel.affinity).toBeGreaterThan(0);
      expect(rel.interactionCount).toBe(5);
    });

    it('adjustAffinity changes affinity', () => {
      const c = svc.createCompanion(makeOpts());
      svc.startConversation(c.id, 'player_1'); // creates relationship
      const rel = svc.adjustAffinity(c.id, 'player_1', 50);
      expect(rel.affinity).toBe(50);
    });

    it('adjustAffinity clamps to -100/100', () => {
      const c = svc.createCompanion(makeOpts());
      svc.adjustAffinity(c.id, 'player_1', 200);
      expect(svc.getRelationship(c.id, 'player_1')!.affinity).toBe(100);

      svc.adjustAffinity(c.id, 'player_1', -300);
      expect(svc.getRelationship(c.id, 'player_1')!.affinity).toBe(-100);
    });

    it('adjustTrust changes trust', () => {
      const c = svc.createCompanion(makeOpts());
      const rel = svc.adjustTrust(c.id, 'player_1', 30);
      expect(rel.trust).toBe(30);
    });

    it('adjustTrust clamps to 0-100', () => {
      const c = svc.createCompanion(makeOpts());
      svc.adjustTrust(c.id, 'player_1', 200);
      expect(svc.getRelationship(c.id, 'player_1')!.trust).toBe(100);
    });

    it('tier progresses with affinity + trust', () => {
      const c = svc.createCompanion(makeOpts());
      const events = collectEvents(svc);
      // stranger → acquaintance (combined avg >= 0 and < 20)
      svc.adjustAffinity(c.id, 'player_1', 10);
      svc.adjustTrust(c.id, 'player_1', 10);
      expect(svc.getRelationship(c.id, 'player_1')!.tier).toBe('acquaintance');

      // → friendly (combined avg >= 20)
      svc.adjustAffinity(c.id, 'player_1', 15);
      svc.adjustTrust(c.id, 'player_1', 15);
      expect(svc.getRelationship(c.id, 'player_1')!.tier).toBe('friendly');

      // → bonded (combined avg >= 80)
      svc.adjustAffinity(c.id, 'player_1', 75);
      svc.adjustTrust(c.id, 'player_1', 75);
      expect(svc.getRelationship(c.id, 'player_1')!.tier).toBe('bonded');

      expect(events.some(e => e.type === 'relationship_tier_changed')).toBe(true);
    });

    it('addRelationshipNote stores notes', () => {
      const c = svc.createCompanion(makeOpts());
      svc.adjustAffinity(c.id, 'player_1', 1); // ensure relationship exists
      const rel = svc.addRelationshipNote(c.id, 'player_1', 'Helped me in battle');
      expect(rel.notes).toContain('Helped me in battle');
    });

    it('getCompanionRelationships lists all', () => {
      const c = svc.createCompanion(makeOpts());
      svc.adjustAffinity(c.id, 'p1', 1);
      svc.adjustAffinity(c.id, 'p2', 1);
      const rels = svc.getCompanionRelationships(c.id);
      expect(rels.length).toBe(2);
    });

    it('getPlayerRelationships lists all', () => {
      const c1 = svc.createCompanion(makeOpts({ name: 'A' }));
      const c2 = svc.createCompanion(makeOpts({ name: 'B' }));
      svc.adjustAffinity(c1.id, 'player_1', 1);
      svc.adjustAffinity(c2.id, 'player_1', 1);
      const rels = svc.getPlayerRelationships('player_1');
      expect(rels.length).toBe(2);
    });

    it('throws for missing companion on adjustAffinity', () => {
      expect(() => svc.adjustAffinity('nope', 'p1', 10)).toThrow('not found');
    });

    it('removes relationships when companion removed', () => {
      const c = svc.createCompanion(makeOpts());
      svc.adjustAffinity(c.id, 'player_1', 10);
      svc.removeCompanion(c.id);
      expect(svc.getRelationship(c.id, 'player_1')).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // World Knowledge
  // --------------------------------------------------------------------------
  describe('world knowledge', () => {
    it('adds knowledge', () => {
      const k = svc.addWorldKnowledge({
        topic: 'Dragon Lair',
        content: 'Located in the northern mountains',
        source: 'lore',
        worldId: 'world_1',
        addedBy: 'system',
      });
      expect(k.id).toMatch(/^wk_/);
      expect(k.topic).toBe('Dragon Lair');
    });

    it('prevents duplicate topics', () => {
      svc.addWorldKnowledge({ topic: 'Castle', content: 'Big', source: 'a', worldId: 'w1', addedBy: 's' });
      expect(() => svc.addWorldKnowledge({
        topic: 'castle', content: 'Also big', source: 'b', worldId: 'w1', addedBy: 's',
      })).toThrow('already exists');
    });

    it('enforces max world knowledge', () => {
      const s = new AICompanionService({ maxWorldKnowledge: 2 });
      s.start();
      s.addWorldKnowledge({ topic: 'A', content: 'x', source: 'a', worldId: 'w1', addedBy: 's' });
      s.addWorldKnowledge({ topic: 'B', content: 'y', source: 'b', worldId: 'w1', addedBy: 's' });
      expect(() => s.addWorldKnowledge({
        topic: 'C', content: 'z', source: 'c', worldId: 'w1', addedBy: 's',
      })).toThrow('Maximum world knowledge');
    });

    it('queries all knowledge in a world', () => {
      svc.addWorldKnowledge({ topic: 'T1', content: 'C1', source: 'a', worldId: 'w1', addedBy: 's' });
      svc.addWorldKnowledge({ topic: 'T2', content: 'C2', source: 'b', worldId: 'w1', addedBy: 's' });
      expect(svc.queryWorldKnowledge('w1').length).toBe(2);
    });

    it('queries with text filter', () => {
      svc.addWorldKnowledge({ topic: 'Dragon', content: 'Fire breathing', source: 'a', worldId: 'w1', addedBy: 's' });
      svc.addWorldKnowledge({ topic: 'Goblin', content: 'Small and sneaky', source: 'b', worldId: 'w1', addedBy: 's' });
      expect(svc.queryWorldKnowledge('w1', 'dragon').length).toBe(1);
    });

    it('returns empty for unknown world', () => {
      expect(svc.queryWorldKnowledge('nonexistent').length).toBe(0);
    });

    it('removes knowledge', () => {
      const k = svc.addWorldKnowledge({ topic: 'X', content: 'Y', source: 'a', worldId: 'w1', addedBy: 's' });
      expect(svc.removeWorldKnowledge('w1', k.id)).toBe(true);
      expect(svc.queryWorldKnowledge('w1').length).toBe(0);
    });

    it('remove returns false for missing', () => {
      expect(svc.removeWorldKnowledge('w1', 'nope')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Event system
  // --------------------------------------------------------------------------
  describe('event system', () => {
    it('unsubscribes via returned function', () => {
      const events: CompanionEvent[] = [];
      const unsub = svc.onEvent(e => events.push(e));
      svc.createCompanion(makeOpts({ name: 'A' }));
      expect(events.length).toBe(1);
      unsub();
      svc.createCompanion(makeOpts({ name: 'B' }));
      expect(events.length).toBe(1); // no new events
    });

    it('multiple listeners all receive events', () => {
      const e1: CompanionEvent[] = [];
      const e2: CompanionEvent[] = [];
      svc.onEvent(e => e1.push(e));
      svc.onEvent(e => e2.push(e));
      svc.createCompanion(makeOpts());
      expect(e1.length).toBe(1);
      expect(e2.length).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------
  describe('stats', () => {
    it('returns empty stats for fresh service', () => {
      const stats = svc.getStats();
      expect(stats.totalCompanions).toBe(0);
      expect(stats.activeCompanions).toBe(0);
      expect(stats.totalMemories).toBe(0);
      expect(stats.totalConversations).toBe(0);
      expect(stats.averageAffinity).toBe(0);
    });

    it('returns populated stats', () => {
      const c = svc.createCompanion(makeOpts());
      svc.addMemory(c.id, { type: 'interaction', content: 'test', importance: 0.5 });
      svc.startConversation(c.id, 'player_1');
      svc.adjustAffinity(c.id, 'player_1', 50);

      const stats = svc.getStats();
      expect(stats.totalCompanions).toBe(1);
      expect(stats.activeCompanions).toBe(1);
      expect(stats.totalMemories).toBe(1);
      expect(stats.totalConversations).toBe(1);
      expect(stats.activeConversations).toBe(1);
      expect(stats.totalRelationships).toBe(1);
      expect(stats.averageAffinity).toBe(50);
      expect(stats.companionsByBehavior['idle']).toBe(1);
      expect(stats.companionsByMood['neutral']).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases & integration
  // --------------------------------------------------------------------------
  describe('integration', () => {
    it('full lifecycle: create → converse → remember → relate', () => {
      const companion = svc.createCompanion(makeOpts({ name: 'Merlin' }));
      const conv = svc.startConversation(companion.id, 'hero_1');

      svc.addDialogueTurn(conv.id, { speaker: 'player', text: 'Tell me about the ancient prophecy and the sword' });
      svc.addDialogueTurn(conv.id, { speaker: 'companion', text: 'The prophecy speaks of a chosen warrior', mood: 'excited' });

      svc.endConversation(conv.id);

      // Companion should remember the conversation
      const memories = svc.recallMemories(companion.id);
      expect(memories.length).toBeGreaterThan(0);

      // Relationship should have formed
      const rel = svc.getRelationship(companion.id, 'hero_1');
      expect(rel).toBeDefined();
      expect(rel!.interactionCount).toBeGreaterThan(0);

      // Stats should reflect activity
      const stats = svc.getStats();
      expect(stats.totalConversations).toBe(1);
    });

    it('companion with schedule, transitions, and world knowledge', () => {
      const c = svc.createCompanion(makeOpts({
        name: 'Guard Captain',
        schedule: [
          { timeStart: 6, timeEnd: 18, behavior: 'patrol', location: [10, 0, 10], description: 'Day patrol' },
          { timeStart: 18, timeEnd: 6, behavior: 'guard', location: [0, 0, 0], description: 'Night guard' },
        ],
        transitions: [
          { from: 'patrol', to: 'guard', condition: 'nightfall', priority: 1 },
          { from: 'guard', to: 'patrol', condition: 'dawn', priority: 1 },
          { from: 'idle', to: 'patrol', condition: 'start', priority: 1 },
        ],
      }));

      // Set to patrol (idle → patrol allowed)
      svc.setBehavior(c.id, 'patrol');

      // Add world knowledge
      svc.addWorldKnowledge({
        topic: 'Gate Location',
        content: 'The main gate is at [0,0,0]',
        source: 'guard',
        worldId: c.worldId,
        addedBy: c.id,
      });

      const scheduled = svc.getScheduledBehavior(c.id, 10);
      expect(scheduled!.behavior).toBe('patrol');

      const knowledge = svc.queryWorldKnowledge(c.worldId, 'gate');
      expect(knowledge.length).toBe(1);
    });
  });
});
