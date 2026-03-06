import { describe, it, expect, beforeEach } from 'vitest';
import { NPCMemory } from '../NPCMemory';
import { WorkingMemory } from '../WorkingMemory';
import { EpisodicMemory } from '../EpisodicMemory';
import { MemoryPruner } from '../MemoryPruner';

describe('WorkingMemory', () => {
  it('stores and retrieves recent entries', () => {
    const wm = new WorkingMemory(30_000);
    wm.add('saw player', {}, 0.5);
    expect(wm.size()).toBe(1);
    expect(wm.getRecent()[0].event).toBe('saw player');
  });

  it('filters by importance', () => {
    const wm = new WorkingMemory(30_000);
    wm.add('low', {}, 0.1);
    wm.add('high', {}, 0.9);
    expect(wm.getByImportance(0.5).length).toBe(1);
  });
});

describe('EpisodicMemory', () => {
  it('stores and searches episodes', () => {
    const em = new EpisodicMemory(100);
    em.store({ description: 'Player greeted me warmly', context: {}, importance: 0.8, participants: ['player1'], emotionalValence: 0.7 });
    const results = em.search('greeted');
    expect(results.length).toBe(1);
    expect(results[0].description).toContain('greeted');
  });

  it('limits to max episodes', () => {
    const em = new EpisodicMemory(5);
    for (let i = 0; i < 10; i++) em.store({ description: `Event ${i}`, context: {}, importance: i / 10, participants: [], emotionalValence: 0 });
    expect(em.size()).toBe(5);
  });
});

describe('NPCMemory', () => {
  let npc: NPCMemory;
  beforeEach(() => { npc = new NPCMemory('npc1'); });

  it('perceives events into working memory', () => {
    npc.perceive('Player approached', {}, 0.5);
    expect(npc.getRecentContext().length).toBe(1);
  });

  it('stores high-importance events to episodic memory', () => {
    npc.perceive('Player saved my life', {}, 0.9);
    expect(npc.recallEpisodes('saved').length).toBe(1);
  });

  it('does not store low-importance events to episodic', () => {
    npc.perceive('Heard ambient noise', {}, 0.3);
    expect(npc.recallEpisodes('noise').length).toBe(0);
  });
});

describe('MemoryPruner', () => {
  it('prunes low-value memories', () => {
    const em = new EpisodicMemory(100);
    em.store({ description: 'Important event', context: {}, importance: 1.0, participants: [], emotionalValence: 0 });
    em.store({ description: 'Trivial event', context: {}, importance: 0.01, participants: [], emotionalValence: 0 });
    const pruner = new MemoryPruner(em, 0.2);
    const pruned = pruner.prune();
    expect(pruned).toBeGreaterThanOrEqual(1);
  });
});
