/**
 * Tests for AgentMemoryWPG - Wisdom/Pattern/Gotcha Memory System
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AgentMemoryWPG,
  getAgentMemory,
  resetAgentMemory,
  MEMORY_PREFIX,
} from '../AgentMemoryWPG.js';

describe('AgentMemoryWPG', () => {
  let memory: AgentMemoryWPG;

  beforeEach(() => {
    memory = new AgentMemoryWPG();
  });

  // =========================================================================
  // Memory Formation
  // =========================================================================

  describe('memory formation', () => {
    it('adds a Wisdom memory', () => {
      const entry = memory.addWisdom(
        'brittney', 'world-1',
        'Users prefer visual feedback over text',
        0.85,
        ['ux', 'feedback'],
      );

      expect(entry.id).toMatch(/^W\.\d+$/);
      expect(entry.category).toBe('wisdom');
      expect(entry.content).toBe('Users prefer visual feedback over text');
      expect(entry.confidence).toBe(0.85);
      expect(entry.tags).toEqual(['ux', 'feedback']);
      expect(entry.suppressed).toBe(false);
    });

    it('adds a Pattern memory', () => {
      const entry = memory.addPattern(
        'brittney', 'world-1',
        'Motion sickness occurs at > 120 deg/s rotation',
        0.9,
        ['vr', 'health'],
      );

      expect(entry.id).toMatch(/^P\.\d+$/);
      expect(entry.category).toBe('pattern');
    });

    it('adds a Gotcha memory', () => {
      const entry = memory.addGotcha(
        'brittney', 'world-1',
        'Never run inference in VR render loop (11.1ms budget)',
        0.99,
        ['performance', 'vr'],
      );

      expect(entry.id).toMatch(/^G\.\d+$/);
      expect(entry.category).toBe('gotcha');
    });

    it('assigns incrementing IDs', () => {
      const w1 = memory.addWisdom('brittney', 'world-1', 'first', 0.5);
      const w2 = memory.addWisdom('brittney', 'world-1', 'second', 0.6);

      expect(w1.id).toBe('W.001');
      expect(w2.id).toBe('W.002');
    });

    it('assigns independent IDs per category', () => {
      const w = memory.addWisdom('brittney', 'world-1', 'wisdom', 0.5);
      const p = memory.addPattern('brittney', 'world-1', 'pattern', 0.5);
      const g = memory.addGotcha('brittney', 'world-1', 'gotcha', 0.5);

      expect(w.id).toBe('W.001');
      expect(p.id).toBe('P.001');
      expect(g.id).toBe('G.001');
    });

    it('clamps confidence to 0-1 range', () => {
      const high = memory.addWisdom('brittney', 'world-1', 'high', 1.5);
      const low = memory.addWisdom('brittney', 'world-1', 'low', -0.5);

      expect(high.confidence).toBe(1);
      expect(low.confidence).toBe(0);
    });

    it('tracks origin scene', () => {
      const entry = memory.addWisdom('brittney', 'world-1', 'test', 0.5);
      expect(entry.originSceneId).toBe('world-1');
      expect(entry.accessedInScenes).toContain('world-1');
    });

    it('stores source context', () => {
      const entry = memory.addWisdom(
        'brittney', 'world-1', 'test', 0.5,
        [], 'User feedback analysis',
      );
      expect(entry.source).toBe('User feedback analysis');
    });

    it('calls onMemoryFormed callback', () => {
      const callback = vi.fn();
      const memWithCb = new AgentMemoryWPG({ onMemoryFormed: callback });

      memWithCb.addWisdom('brittney', 'world-1', 'test', 0.5);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Memory Access
  // =========================================================================

  describe('memory access', () => {
    it('gets a memory by ID', () => {
      const created = memory.addWisdom('brittney', 'world-1', 'test', 0.5);
      const retrieved = memory.getMemory(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.content).toBe('test');
    });

    it('increments access count on get', () => {
      const created = memory.addWisdom('brittney', 'world-1', 'test', 0.5);
      memory.getMemory(created.id);
      memory.getMemory(created.id);

      expect(created.accessCount).toBe(2);
    });

    it('returns undefined for unknown ID', () => {
      expect(memory.getMemory('W.999')).toBeUndefined();
    });

    it('gets all memories for an agent', () => {
      memory.addWisdom('brittney', 'world-1', 'w1', 0.5);
      memory.addPattern('brittney', 'world-1', 'p1', 0.6);
      memory.addGotcha('brittney', 'world-1', 'g1', 0.7);
      memory.addWisdom('manager', 'world-1', 'w2', 0.8);

      const brittMem = memory.getAgentMemories('brittney');
      expect(brittMem).toHaveLength(3);
    });

    it('sorts by confidence descending', () => {
      memory.addWisdom('brittney', 'world-1', 'low', 0.3);
      memory.addWisdom('brittney', 'world-1', 'high', 0.9);
      memory.addWisdom('brittney', 'world-1', 'mid', 0.6);

      const entries = memory.getAgentMemories('brittney');
      expect(entries[0].confidence).toBe(0.9);
      expect(entries[1].confidence).toBe(0.6);
      expect(entries[2].confidence).toBe(0.3);
    });

    it('excludes suppressed by default', () => {
      const entry = memory.addWisdom('brittney', 'world-1', 'weak', 0.05);
      memory.weaken(entry.id, 1.0); // Force suppression

      const active = memory.getAgentMemories('brittney');
      expect(active).toHaveLength(0);

      const all = memory.getAgentMemories('brittney', true);
      expect(all).toHaveLength(1);
    });
  });

  // =========================================================================
  // Search
  // =========================================================================

  describe('search', () => {
    beforeEach(() => {
      memory.addWisdom('brittney', 'world-1', 'Users prefer visual feedback', 0.85, ['ux']);
      memory.addPattern('brittney', 'world-1', 'Motion sickness at high rotation speed', 0.9, ['vr', 'health']);
      memory.addGotcha('brittney', 'world-1', 'Never block the VR render loop', 0.99, ['performance', 'vr']);
      memory.addWisdom('brittney', 'world-2', 'Dark mode reduces eye strain', 0.7, ['ux', 'accessibility']);
    });

    it('searches by query text', () => {
      const results = memory.search('brittney', { query: 'render loop' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].entry.content).toContain('render loop');
      expect(results[0].relevance).toBeGreaterThan(0);
    });

    it('filters by category', () => {
      const wisdoms = memory.search('brittney', { category: 'wisdom' });
      expect(wisdoms.every(r => r.entry.category === 'wisdom')).toBe(true);
    });

    it('filters by minimum confidence', () => {
      const high = memory.search('brittney', { minConfidence: 0.9 });
      expect(high.every(r => r.entry.confidence >= 0.9)).toBe(true);
    });

    it('filters by tags', () => {
      const vrResults = memory.search('brittney', { tags: ['vr'] });
      expect(vrResults.every(r => r.entry.tags.includes('vr'))).toBe(true);
    });

    it('filters by scene', () => {
      const scene2 = memory.search('brittney', { sceneId: 'world-2' });
      expect(scene2.length).toBeGreaterThan(0);
    });

    it('applies limit', () => {
      const limited = memory.search('brittney', { limit: 2 });
      expect(limited).toHaveLength(2);
    });

    it('returns empty for unknown agent', () => {
      const results = memory.search('unknown', { query: 'test' });
      expect(results).toHaveLength(0);
    });

    it('sorts by relevance', () => {
      const results = memory.search('brittney', { query: 'VR render loop performance' });

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevance).toBeGreaterThanOrEqual(results[i].relevance);
      }
    });

    it('returns all when no query provided', () => {
      const results = memory.search('brittney', {});
      expect(results).toHaveLength(4);
    });
  });

  // =========================================================================
  // Reinforcement
  // =========================================================================

  describe('reinforcement', () => {
    it('increases confidence on reinforce', () => {
      const entry = memory.addWisdom('brittney', 'world-1', 'test', 0.5);
      memory.reinforce(entry.id);

      expect(entry.confidence).toBe(0.6);
      expect(entry.reinforcementCount).toBe(1);
    });

    it('caps confidence at 1.0', () => {
      const entry = memory.addWisdom('brittney', 'world-1', 'test', 0.95);
      memory.reinforce(entry.id);

      expect(entry.confidence).toBe(1.0);
    });

    it('un-suppresses on reinforce', () => {
      const entry = memory.addWisdom('brittney', 'world-1', 'test', 0.05);
      memory.weaken(entry.id, 1.0); // Suppress
      expect(entry.suppressed).toBe(true);

      memory.reinforce(entry.id);
      expect(entry.suppressed).toBe(false);
    });

    it('calls onMemoryReinforced callback', () => {
      const callback = vi.fn();
      const memWithCb = new AgentMemoryWPG({ onMemoryReinforced: callback });

      const entry = memWithCb.addWisdom('brittney', 'world-1', 'test', 0.5);
      memWithCb.reinforce(entry.id);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('weakening', () => {
    it('decreases confidence', () => {
      const entry = memory.addWisdom('brittney', 'world-1', 'test', 0.5);
      memory.weaken(entry.id);

      expect(entry.confidence).toBe(0.4);
    });

    it('auto-suppresses below threshold', () => {
      const entry = memory.addWisdom('brittney', 'world-1', 'test', 0.15);
      memory.weaken(entry.id);

      expect(entry.confidence).toBeCloseTo(0.05, 10);
      expect(entry.suppressed).toBe(true);
    });

    it('calls onMemorySuppressed callback', () => {
      const callback = vi.fn();
      const memWithCb = new AgentMemoryWPG({ onMemorySuppressed: callback });

      const entry = memWithCb.addWisdom('brittney', 'world-1', 'test', 0.05);
      memWithCb.weaken(entry.id, 1.0);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // Relationships
  // =========================================================================

  describe('relationships', () => {
    it('links two memories bidirectionally', () => {
      const w = memory.addWisdom('brittney', 'world-1', 'wisdom', 0.5);
      const g = memory.addGotcha('brittney', 'world-1', 'gotcha', 0.5);

      memory.linkMemories(w.id, g.id);

      expect(w.relatedMemories).toContain(g.id);
      expect(g.relatedMemories).toContain(w.id);
    });

    it('gets related memories', () => {
      const w = memory.addWisdom('brittney', 'world-1', 'wisdom', 0.5);
      const p = memory.addPattern('brittney', 'world-1', 'pattern', 0.5);

      memory.linkMemories(w.id, p.id);

      const related = memory.getRelated(w.id);
      expect(related).toHaveLength(1);
      expect(related[0].id).toBe(p.id);
    });

    it('does not duplicate links', () => {
      const w = memory.addWisdom('brittney', 'world-1', 'wisdom', 0.5);
      const g = memory.addGotcha('brittney', 'world-1', 'gotcha', 0.5);

      memory.linkMemories(w.id, g.id);
      memory.linkMemories(w.id, g.id);

      expect(w.relatedMemories.filter(id => id === g.id)).toHaveLength(1);
    });
  });

  // =========================================================================
  // Scene Integration
  // =========================================================================

  describe('scene integration', () => {
    it('records scene access for all agent memories', () => {
      memory.addWisdom('brittney', 'world-1', 'w1', 0.5);
      memory.addPattern('brittney', 'world-1', 'p1', 0.5);

      memory.recordSceneAccess('brittney', 'world-2');

      const entries = memory.getAgentMemories('brittney');
      for (const entry of entries) {
        expect(entry.accessedInScenes).toContain('world-2');
      }
    });

    it('does not duplicate scene entries', () => {
      memory.addWisdom('brittney', 'world-1', 'w1', 0.5);

      memory.recordSceneAccess('brittney', 'world-1'); // Already recorded
      memory.recordSceneAccess('brittney', 'world-1');

      const entries = memory.getAgentMemories('brittney');
      expect(entries[0].accessedInScenes.filter(s => s === 'world-1')).toHaveLength(1);
    });
  });

  // =========================================================================
  // Decay
  // =========================================================================

  describe('confidence decay', () => {
    it('applies decay to all memories', () => {
      memory.addWisdom('brittney', 'world-1', 'test', 0.5);
      memory.applyDecay();

      const entries = memory.getAgentMemories('brittney');
      expect(entries[0].confidence).toBeLessThan(0.5);
    });

    it('does not decay suppressed memories', () => {
      const entry = memory.addWisdom('brittney', 'world-1', 'test', 0.05);
      memory.weaken(entry.id, 1.0); // Suppress
      const conf = entry.confidence;

      memory.applyDecay();
      expect(entry.confidence).toBe(conf); // Unchanged
    });

    it('suppresses memories that fall below threshold', () => {
      const entry = memory.addWisdom('brittney', 'world-1', 'test', 0.11);
      // Decay enough to go below 0.1 threshold
      for (let i = 0; i < 2; i++) {
        memory.applyDecay();
      }

      expect(entry.suppressed).toBe(true);
    });
  });

  // =========================================================================
  // Bulk Operations
  // =========================================================================

  describe('bulk operations', () => {
    it('exports and imports agent memories', () => {
      memory.addWisdom('brittney', 'world-1', 'w1', 0.5, ['tag1']);
      memory.addPattern('brittney', 'world-1', 'p1', 0.6);

      const exported = memory.exportAgentMemories('brittney');
      expect(exported).toHaveLength(2);

      const memory2 = new AgentMemoryWPG();
      const imported = memory2.importAgentMemories(exported);
      expect(imported).toBe(2);

      const result = memory2.getAgentMemories('brittney');
      expect(result).toHaveLength(2);
    });

    it('does not import duplicates', () => {
      memory.addWisdom('brittney', 'world-1', 'w1', 0.5);
      const exported = memory.exportAgentMemories('brittney');

      const imported = memory.importAgentMemories(exported);
      expect(imported).toBe(0); // Already exists
    });

    it('removes a memory', () => {
      const entry = memory.addWisdom('brittney', 'world-1', 'test', 0.5);
      const removed = memory.removeMemory(entry.id);

      expect(removed).toBe(true);
      expect(memory.getMemory(entry.id)).toBeUndefined();
    });

    it('garbage collects suppressed memories', () => {
      const entry = memory.addWisdom('brittney', 'world-1', 'weak', 0.05);
      memory.addWisdom('brittney', 'world-1', 'strong', 0.95);
      memory.weaken(entry.id, 1.0); // Suppress

      const removed = memory.garbageCollect('brittney');
      expect(removed).toBe(1);
      expect(memory.getAgentMemories('brittney', true)).toHaveLength(1);
    });
  });

  // =========================================================================
  // Metrics
  // =========================================================================

  describe('metrics', () => {
    it('tracks memory metrics', () => {
      memory.addWisdom('brittney', 'world-1', 'w1', 0.5);
      memory.addPattern('brittney', 'world-1', 'p1', 0.6);
      memory.addGotcha('brittney', 'world-1', 'g1', 0.7);
      memory.addWisdom('manager', 'world-1', 'w2', 0.8);

      memory.search('brittney', { query: 'test' });

      const metrics = memory.getMetrics();
      expect(metrics.totalMemories).toBe(4);
      expect(metrics.byCategory.wisdom).toBe(2);
      expect(metrics.byCategory.pattern).toBe(1);
      expect(metrics.byCategory.gotcha).toBe(1);
      expect(metrics.activeMemories).toBe(4);
      expect(metrics.suppressedMemories).toBe(0);
      expect(metrics.uniqueAgents).toBe(2);
      expect(metrics.totalSearches).toBe(1);
    });

    it('reports size', () => {
      memory.addWisdom('brittney', 'world-1', 'w1', 0.5);
      expect(memory.size).toBe(1);
    });
  });

  // =========================================================================
  // Lifecycle
  // =========================================================================

  describe('lifecycle', () => {
    it('destroys all state', () => {
      memory.addWisdom('brittney', 'world-1', 'test', 0.5);
      memory.destroy();

      expect(memory.size).toBe(0);
      expect(memory.getAgentMemories('brittney')).toHaveLength(0);
    });
  });

  // =========================================================================
  // Singleton
  // =========================================================================

  describe('singleton', () => {
    beforeEach(() => {
      resetAgentMemory();
    });

    it('returns the same instance', () => {
      const a = getAgentMemory();
      const b = getAgentMemory();
      expect(a).toBe(b);
    });

    it('resets correctly', () => {
      const a = getAgentMemory();
      a.addWisdom('test', 'world-1', 'test', 0.5);
      resetAgentMemory();

      const b = getAgentMemory();
      expect(b.size).toBe(0);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('edge cases', () => {
    it('handles empty search query', () => {
      memory.addWisdom('brittney', 'world-1', 'test', 0.5);
      const results = memory.search('brittney', { query: '' });
      expect(results).toHaveLength(1);
    });

    it('handles memory prefix constants', () => {
      expect(MEMORY_PREFIX.wisdom).toBe('W');
      expect(MEMORY_PREFIX.pattern).toBe('P');
      expect(MEMORY_PREFIX.gotcha).toBe('G');
    });

    it('enforces per-agent memory limit', () => {
      const smallMem = new AgentMemoryWPG({ maxMemoriesPerAgent: 5 });

      for (let i = 0; i < 10; i++) {
        smallMem.addWisdom('brittney', 'world-1', `w-${i}`, Math.random());
      }

      expect(smallMem.getAgentMemories('brittney', true).length).toBeLessThanOrEqual(5);
    });
  });
});
