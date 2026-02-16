/**
 * ConversationHarvester Test Suite
 *
 * Tests for chat log harvesting, correction harvesting, scene session
 * harvesting, quality filtering, and deduplication.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConversationHarvester,
  type ChatLog,
  type CorrectionEvent,
  type SceneSession,
} from '../src/services/ConversationHarvester';

describe('ConversationHarvester', () => {
  let harvester: ConversationHarvester;

  beforeEach(() => {
    harvester = new ConversationHarvester({ minQuality: 0.3 });
  });

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('should create with default config', () => {
      const h = new ConversationHarvester();
      expect(h).toBeDefined();
    });

    it('should accept custom config', () => {
      const h = new ConversationHarvester({
        minQuality: 0.8,
        minMessages: 4,
        maxInstructionLength: 500,
        defaultCategory: 'custom_cat',
      });
      expect(h).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Chat Log Harvesting
  // --------------------------------------------------------------------------

  describe('harvestFromLogs', () => {
    const createLog = (messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>): ChatLog => ({
      id: `log_${Date.now()}_${Math.random()}`,
      sessionId: 'session_1',
      messages: messages.map(m => ({ ...m, timestamp: Date.now() })),
      startedAt: Date.now(),
    });

    it('should extract user→assistant turn pairs', () => {
      const log = createLog([
        { role: 'user', content: 'Create a HoloScript scene with a cube that spins and has physics' },
        { role: 'assistant', content: 'composition "SpinCube" {\n  template "Spinner" {\n    @physics\n    geometry: "cube"\n  }\n}' },
      ]);
      const result = harvester.harvestFromLogs([log]);
      expect(result.examples.length).toBe(1);
      expect(result.examples[0].instruction).toContain('HoloScript');
      expect(result.examples[0].output).toContain('composition');
    });

    it('should handle multiple turn pairs in one log', () => {
      const log = createLog([
        { role: 'user', content: 'What is the @grabbable trait used for in HoloScript VR development?' },
        { role: 'assistant', content: 'The @grabbable trait makes objects interactable in VR, allowing users to pick them up with controllers.' },
        { role: 'user', content: 'How do I add it to an object in a HoloScript composition template?' },
        { role: 'assistant', content: 'Add @grabbable to the template:\n\ntemplate "MyObj" {\n  @grabbable\n  geometry: "cube"\n}' },
      ]);
      const result = harvester.harvestFromLogs([log]);
      expect(result.examples.length).toBe(2);
    });

    it('should skip logs with too few messages', () => {
      const log = createLog([
        { role: 'user', content: 'Hi' },
      ]);
      const result = harvester.harvestFromLogs([log]);
      expect(result.examples.length).toBe(0);
      expect(result.stats.filteredTooShort).toBeGreaterThan(0);
    });

    it('should filter low quality examples', () => {
      const h = new ConversationHarvester({ minQuality: 0.9 });
      const log = createLog([
        { role: 'user', content: 'ok' },
        { role: 'assistant', content: 'sure' },
      ]);
      const result = h.harvestFromLogs([log]);
      expect(result.examples.length).toBe(0);
      expect(result.stats.filteredLowQuality).toBeGreaterThan(0);
    });

    it('should include system message when configured', () => {
      const log = createLog([
        { role: 'system', content: 'You are Brittney, a VR AI assistant.' },
        { role: 'user', content: 'Create a networked VR object with physics and grabbable traits' },
        { role: 'assistant', content: 'template "NetObj" {\n  @networked\n  @physics\n  @grabbable\n  geometry: "sphere"\n}' },
      ]);
      const result = harvester.harvestFromLogs([log]);
      expect(result.examples.length).toBe(1);
      expect(result.examples[0].system).toContain('Brittney');
    });

    it('should deduplicate by instruction', () => {
      const log1 = createLog([
        { role: 'user', content: 'Create a VR scene with grabbable cubes' },
        { role: 'assistant', content: 'composition "GrabScene" { }' },
      ]);
      const log2 = createLog([
        { role: 'user', content: 'Create a VR scene with grabbable cubes' },
        { role: 'assistant', content: 'composition "GrabScene2" { }' },
      ]);
      // Same harvester instance → dedup kicks in
      harvester.harvestFromLogs([log1]);
      const result2 = harvester.harvestFromLogs([log2]);
      expect(result2.stats.duplicatesRemoved).toBeGreaterThan(0);
    });

    it('should set category based on content', () => {
      const log = createLog([
        { role: 'user', content: 'Create a HoloScript composition with VR traits' },
        { role: 'assistant', content: 'composition "Demo" {\n  template "Obj" {\n    @grabbable\n    @physics\n  }\n}' },
      ]);
      const result = harvester.harvestFromLogs([log]);
      expect(result.examples[0].category).toBeDefined();
    });

    it('should report accurate stats', () => {
      const logs = [
        createLog([
          { role: 'user', content: 'Build a complex VR world with physics-enabled objects' },
          { role: 'assistant', content: 'composition "World" {\n  template "PhysObj" {\n    @physics\n    @collidable\n  }\n}' },
        ]),
        createLog([
          { role: 'user', content: 'What are HoloScript spatial traits available for VR?' },
          { role: 'assistant', content: '@anchor, @tracked, @world_locked, @hand_tracked, @eye_tracked are the spatial traits in HoloScript.' },
        ]),
      ];
      const result = harvester.harvestFromLogs(logs);
      expect(result.stats.totalProcessed).toBe(2);
      expect(result.stats.examplesCreated).toBeGreaterThan(0);
      expect(result.stats.averageQuality).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // Correction Harvesting
  // --------------------------------------------------------------------------

  describe('harvestFromCorrections', () => {
    const createCorrection = (
      prompt: string,
      original: string,
      corrected: string,
      type: CorrectionEvent['correctionType'] = 'syntax',
    ): CorrectionEvent => ({
      id: `corr_${Date.now()}_${Math.random()}`,
      sessionId: 'sess_1',
      originalPrompt: prompt,
      originalOutput: original,
      correctedOutput: corrected,
      correctionType: type,
      timestamp: Date.now(),
    });

    it('should create examples from corrections', () => {
      const correction = createCorrection(
        'Create a VR object with physics and collision',
        'template "Obj" { geometry: "sper" }', // typo
        'template "Obj" {\n  @physics\n  @collidable\n  geometry: "sphere"\n}',
        'syntax',
      );
      const result = harvester.harvestFromCorrections([correction]);
      expect(result.examples.length).toBe(1);
      expect(result.examples[0].output).toContain('sphere');
      expect(result.examples[0].category).toBe('correction_syntax');
    });

    it('should give corrections a quality boost', () => {
      const correction = createCorrection(
        'Create a template with physics traits',
        'template "X" { }',
        'template "X" {\n  @physics\n  @collidable\n  geometry: "cube"\n}',
      );
      const result = harvester.harvestFromCorrections([correction]);
      expect(result.examples.length).toBe(1);
      const quality = result.examples[0].metadata?.quality as number;
      expect(quality).toBeGreaterThan(0.5);
    });

    it('should skip empty corrections', () => {
      const correction = createCorrection('', '', '');
      const result = harvester.harvestFromCorrections([correction]);
      expect(result.examples.length).toBe(0);
      expect(result.stats.filteredTooShort).toBe(1);
    });

    it('should store originalOutput in metadata', () => {
      const correction = createCorrection(
        'Build a grabbable sphere',
        'orb { shape: "ball" }',
        'template "Sphere" {\n  @grabbable\n  geometry: "sphere"\n}',
      );
      const result = harvester.harvestFromCorrections([correction]);
      expect(result.examples[0].metadata?.originalOutput).toBe('orb { shape: "ball" }');
    });

    it('should handle different correction types', () => {
      const types: CorrectionEvent['correctionType'][] = ['syntax', 'logic', 'style', 'accuracy', 'completeness'];
      for (const type of types) {
        const h = new ConversationHarvester({ minQuality: 0.1 });
        const correction = createCorrection(
          `Fix this ${type} issue in the HoloScript template`,
          'bad output code',
          'corrected output with proper HoloScript composition syntax',
          type,
        );
        const result = h.harvestFromCorrections([correction]);
        expect(result.examples[0].category).toBe(`correction_${type}`);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Scene Session Harvesting
  // --------------------------------------------------------------------------

  describe('harvestFromSceneSessions', () => {
    const createSession = (
      prompt: string,
      holo: string,
      errors?: string[],
      fixes?: string[],
    ): SceneSession => ({
      id: `scene_${Date.now()}_${Math.random()}`,
      prompt,
      generatedHolo: holo,
      finalHolo: fixes ? holo + '\n// fixed' : undefined,
      errors,
      fixes,
      timestamp: Date.now(),
    });

    it('should create examples from scene sessions', () => {
      const session = createSession(
        'Create a marketplace with NPC merchants selling potions',
        'composition "Market" {\n  template "Merchant" {\n    state { inventory: [] }\n  }\n  object "Shop" using "Merchant" { position: [0, 0, 5] }\n}',
      );
      const result = harvester.harvestFromSceneSessions([session]);
      expect(result.examples.length).toBe(1);
      expect(result.examples[0].category).toBe('holoscript_generation');
    });

    it('should create debug examples from error+fix sessions', () => {
      const session = createSession(
        'Create a VR physics scene',
        'composition "Physics" { object "Ball" { geometry: "sper" } }',
        ['TypeError: unknown geometry type "sper"'],
        ['Changed geometry to "sphere"'],
      );
      const result = harvester.harvestFromSceneSessions([session]);
      // Should get both a generation example and a debug example
      expect(result.examples.length).toBe(2);
      const debugEx = result.examples.find(e => e.category === 'holoscript_debugging');
      expect(debugEx).toBeDefined();
      expect(debugEx!.instruction).toContain('Fix');
    });

    it('should use finalHolo when available', () => {
      const session = createSession(
        'Build a VR scene',
        'composition "V1" { }',
        ['missing objects'],
        ['added objects'],
      );
      const result = harvester.harvestFromSceneSessions([session]);
      // The generation example should use finalHolo
      expect(result.examples[0].output).toContain('fixed');
    });

    it('should skip empty sessions', () => {
      const session = createSession('', '');
      const result = harvester.harvestFromSceneSessions([session]);
      expect(result.examples.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Quality Filtering
  // --------------------------------------------------------------------------

  describe('filterByQuality', () => {
    it('should filter examples below threshold', () => {
      const examples = [
        { id: '1', instruction: 'x', output: 'y', metadata: { quality: 0.3 } },
        { id: '2', instruction: 'Create a VR scene', output: 'composition "Demo" { }', metadata: { quality: 0.9 } },
        { id: '3', instruction: 'Hello', output: 'Hi there', metadata: { quality: 0.5 } },
      ];
      const filtered = harvester.filterByQuality(examples, 0.6);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('2');
    });

    it('should use default threshold when not specified', () => {
      const h = new ConversationHarvester({ minQuality: 0.7 });
      const examples = [
        { id: '1', instruction: 'ok', output: 'sure', metadata: { quality: 0.5 } },
        { id: '2', instruction: 'Build a VR world', output: 'composition "World" {}', metadata: { quality: 0.8 } },
      ];
      const filtered = h.filterByQuality(examples);
      expect(filtered.length).toBe(1);
    });

    it('should score quality for examples without metadata', () => {
      const examples = [
        { id: '1', instruction: 'Create a HoloScript composition with interactive VR objects and physics', output: 'composition "Demo" {\n  template "Obj" {\n    @physics\n    @grabbable\n  }\n}' },
      ];
      const filtered = harvester.filterByQuality(examples, 0.5);
      expect(filtered.length).toBe(1); // Should have medium quality
    });
  });

  // --------------------------------------------------------------------------
  // Merge Results
  // --------------------------------------------------------------------------

  describe('mergeResults', () => {
    it('should merge multiple results', () => {
      const r1 = {
        examples: [{ id: 'a', instruction: 'i1', output: 'o1' }],
        stats: { totalProcessed: 1, examplesCreated: 1, filteredLowQuality: 0, filteredTooShort: 0, filteredTooLong: 0, duplicatesRemoved: 0, averageQuality: 0.8, categoryDistribution: { gen: 1 } },
      };
      const r2 = {
        examples: [{ id: 'b', instruction: 'i2', output: 'o2' }],
        stats: { totalProcessed: 2, examplesCreated: 1, filteredLowQuality: 1, filteredTooShort: 0, filteredTooLong: 0, duplicatesRemoved: 0, averageQuality: 0.7, categoryDistribution: { debug: 1 } },
      };

      const merged = harvester.mergeResults(r1, r2);
      expect(merged.examples.length).toBe(2);
      expect(merged.stats.totalProcessed).toBe(3);
      expect(merged.stats.examplesCreated).toBe(2);
    });

    it('should deduplicate across results by id', () => {
      const r1 = {
        examples: [{ id: 'same', instruction: 'i1', output: 'o1' }],
        stats: { totalProcessed: 1, examplesCreated: 1, filteredLowQuality: 0, filteredTooShort: 0, filteredTooLong: 0, duplicatesRemoved: 0, averageQuality: 0.8, categoryDistribution: {} },
      };
      const r2 = {
        examples: [{ id: 'same', instruction: 'i1', output: 'o1' }],
        stats: { totalProcessed: 1, examplesCreated: 1, filteredLowQuality: 0, filteredTooShort: 0, filteredTooLong: 0, duplicatesRemoved: 0, averageQuality: 0.8, categoryDistribution: {} },
      };
      const merged = harvester.mergeResults(r1, r2);
      expect(merged.examples.length).toBe(1);
      expect(merged.stats.duplicatesRemoved).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // Score Quality
  // --------------------------------------------------------------------------

  describe('scoreQuality', () => {
    it('should give higher scores to HoloScript-containing output', () => {
      const plain = harvester.scoreQuality('What is it?', 'It is a thing.');
      const holo = harvester.scoreQuality('Create a VR object', 'composition "Demo" {\n  object "Cube" {\n    @physics\n  }\n}');
      expect(holo).toBeGreaterThan(plain);
    });

    it('should return 0 for empty inputs', () => {
      expect(harvester.scoreQuality('', '')).toBe(0);
      expect(harvester.scoreQuality('test', '')).toBe(0);
    });

    it('should score in valid range', () => {
      const score = harvester.scoreQuality(
        'How do I build a complex VR world?',
        'You can use HoloScript compositions with templates and state management.',
      );
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // Reset
  // --------------------------------------------------------------------------

  describe('resetDedup', () => {
    it('should allow re-processing after reset', () => {
      const log: ChatLog = {
        id: 'log_reset_test',
        sessionId: 'sess',
        messages: [
          { role: 'user', content: 'Build a VR scene with custom HoloScript traits', timestamp: Date.now() },
          { role: 'assistant', content: 'composition "VR" {\n  template "Obj" {\n    @physics\n    @grabbable\n  }\n}', timestamp: Date.now() },
        ],
        startedAt: Date.now(),
      };

      const r1 = harvester.harvestFromLogs([log]);
      expect(r1.examples.length).toBe(1);

      const r2 = harvester.harvestFromLogs([log]);
      expect(r2.stats.duplicatesRemoved).toBe(1);

      harvester.resetDedup();
      const r3 = harvester.harvestFromLogs([log]);
      expect(r3.examples.length).toBe(1);
    });
  });
});
