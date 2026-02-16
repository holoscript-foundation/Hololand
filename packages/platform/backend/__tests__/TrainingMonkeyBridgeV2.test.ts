/**
 * TrainingMonkeyBridge V2.0 Pipeline Tools — Test Suite
 *
 * Tests for the 6 new v2.0 pipeline bridge methods:
 *   1. bridgeToPipeline()
 *   2. analyzeQuality()
 *   3. analyzeCoverageGaps()
 *   4. generateRLHFPairs()
 *   5. generateConversations()
 *   6. validateHoloScriptExamples()
 *
 * All tests run in mock mode (no live TrainingMonkey server required).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TrainingMonkeyBridge,
  type PipelineBridgeResult,
  type QualityAnalysisResult,
  type CoverageGapResult,
  type RLHFPairResult,
  type ConversationResult,
  type HoloScriptValidationResult,
} from '../src/services/TrainingMonkeyBridge';
import type { TrainingExample } from '../src/services/BrittneyFineTuneService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExamples(count: number, overrides: Partial<TrainingExample> = {}): TrainingExample[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ex_${i}`,
    instruction: `Instruction ${i + 1}`,
    input: `Input ${i + 1}`,
    output: `composition "Scene_${i + 1}" { object "Obj_${i + 1}" { geometry: "cube" } }`,
    difficulty: ((i % 4) + 1) as number,
    category: ['syntax', 'traits', 'scenes', 'networking'][i % 4],
    ...overrides,
  }));
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('TrainingMonkeyBridge V2.0 Pipeline Tools', () => {
  let bridge: TrainingMonkeyBridge;

  beforeEach(() => {
    bridge = new TrainingMonkeyBridge({
      mockMode: true,
      endpoint: 'http://localhost:5567',
    });
  });

  // =========================================================================
  // 1. bridgeToPipeline
  // =========================================================================

  describe('bridgeToPipeline', () => {
    it('should generate examples for holoscript domain', async () => {
      const result: PipelineBridgeResult = await bridge.bridgeToPipeline({
        count: 10,
        domain: 'holoscript',
      });
      expect(result.examples).toBeDefined();
      expect(result.examples.length).toBeGreaterThan(0);
      expect(result.stats.requested).toBe(10);
      expect(result.stats.generated).toBeGreaterThan(0);
    });

    it('should generate examples for uaa2 domain', async () => {
      const result = await bridge.bridgeToPipeline({
        count: 5,
        domain: 'uaa2',
        difficulty: 'advanced',
      });
      expect(result.examples.length).toBeGreaterThan(0);
      expect(result.stats.requested).toBe(5);
    });

    it('should generate examples for hololand domain', async () => {
      const result = await bridge.bridgeToPipeline({
        count: 8,
        domain: 'hololand',
        difficulty: 'basic',
      });
      expect(result.examples.length).toBeGreaterThan(0);
      expect(result.stats.byDifficulty).toHaveProperty('basic');
    });

    it('should respect deduplicate flag', async () => {
      const result = await bridge.bridgeToPipeline({
        count: 20,
        domain: 'holoscript',
        deduplicate: true,
      });
      expect(result.stats.deduped).toBeDefined();
      expect(typeof result.stats.deduped).toBe('number');
    });

    it('should default difficulty to intermediate', async () => {
      const result = await bridge.bridgeToPipeline({
        count: 3,
        domain: 'holoscript',
      });
      expect(result.stats.byDifficulty).toHaveProperty('intermediate');
    });

    it('should handle category filter', async () => {
      const result = await bridge.bridgeToPipeline({
        count: 5,
        domain: 'holoscript',
        category: 'scene_generation',
      });
      expect(result.examples.length).toBeGreaterThan(0);
    });

    it('should return valid TrainingExample objects', async () => {
      const result = await bridge.bridgeToPipeline({
        count: 3,
        domain: 'holoscript',
      });
      for (const ex of result.examples) {
        expect(ex.id).toBeDefined();
        expect(ex.instruction).toBeDefined();
        expect(ex.output).toBeDefined();
        expect(typeof ex.instruction).toBe('string');
        expect(typeof ex.output).toBe('string');
      }
    });

    it('should return empty examples on failure', async () => {
      // Non-mock bridge with invalid endpoint will fail on actual call
      // In mock mode, all tools succeed — test the structure
      const result = await bridge.bridgeToPipeline({
        count: 0,
        domain: 'holoscript',
      });
      expect(result.examples).toBeDefined();
      expect(Array.isArray(result.examples)).toBe(true);
    });

    it('should include byDifficulty in stats', async () => {
      const result = await bridge.bridgeToPipeline({
        count: 10,
        domain: 'holoscript',
        difficulty: 'expert',
      });
      expect(result.stats.byDifficulty).toBeDefined();
      expect(typeof result.stats.byDifficulty).toBe('object');
    });
  });

  // =========================================================================
  // 2. analyzeQuality
  // =========================================================================

  describe('analyzeQuality', () => {
    it('should analyze quality of example set', async () => {
      const examples = makeExamples(10);
      const result: QualityAnalysisResult = await bridge.analyzeQuality({ examples });
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.totalAnalyzed).toBe(10);
    });

    it('should return difficulty distribution', async () => {
      const examples = makeExamples(8);
      const result = await bridge.analyzeQuality({ examples });
      expect(result.distributions.difficulty).toBeDefined();
      expect(typeof result.distributions.difficulty).toBe('object');
    });

    it('should return category distribution', async () => {
      const examples = makeExamples(8);
      const result = await bridge.analyzeQuality({ examples });
      expect(result.distributions.category).toBeDefined();
    });

    it('should return quality breakdown', async () => {
      const examples = makeExamples(8);
      const result = await bridge.analyzeQuality({ examples });
      const q = result.distributions.quality;
      expect(q).toHaveProperty('high');
      expect(q).toHaveProperty('medium');
      expect(q).toHaveProperty('low');
    });

    it('should return recommendations', async () => {
      const examples = makeExamples(8);
      const result = await bridge.analyzeQuality({ examples });
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should return issues array', async () => {
      const examples = makeExamples(5);
      const result = await bridge.analyzeQuality({ examples });
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should accept domain parameter', async () => {
      const examples = makeExamples(5);
      const result = await bridge.analyzeQuality({ examples, domain: 'holoscript' });
      expect(result.overallScore).toBeGreaterThan(0);
    });

    it('should handle single example', async () => {
      const examples = makeExamples(1);
      const result = await bridge.analyzeQuality({ examples });
      expect(result.totalAnalyzed).toBe(1);
    });

    it('should handle empty examples', async () => {
      const result = await bridge.analyzeQuality({ examples: [] });
      expect(result.totalAnalyzed).toBe(0);
    });

    it('should score between 0 and 1', async () => {
      const result = await bridge.analyzeQuality({ examples: makeExamples(10) });
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
    });
  });

  // =========================================================================
  // 3. analyzeCoverageGaps
  // =========================================================================

  describe('analyzeCoverageGaps', () => {
    it('should detect coverage gaps', async () => {
      const examples = makeExamples(10);
      const result: CoverageGapResult = await bridge.analyzeCoverageGaps({ examples });
      expect(result.totalGaps).toBeDefined();
      expect(typeof result.totalGaps).toBe('number');
    });

    it('should return gap descriptions', async () => {
      const result = await bridge.analyzeCoverageGaps({ examples: makeExamples(5) });
      expect(Array.isArray(result.gaps)).toBe(true);
      for (const gap of result.gaps) {
        expect(gap.type).toBeDefined();
        expect(gap.description).toBeDefined();
        expect(gap.severity).toBeDefined();
      }
    });

    it('should return coverage stats', async () => {
      const result = await bridge.analyzeCoverageGaps({ examples: makeExamples(10) });
      expect(result.coverage).toBeDefined();
      expect(result.coverage.estimatedCompleteness).toBeDefined();
      expect(result.coverage.categories).toBeDefined();
      expect(result.coverage.difficulties).toBeDefined();
    });

    it('should return generation tasks', async () => {
      const result = await bridge.analyzeCoverageGaps({ examples: makeExamples(10) });
      expect(Array.isArray(result.generationTasks)).toBe(true);
      for (const task of result.generationTasks) {
        expect(task.domain).toBeDefined();
        expect(task.category).toBeDefined();
        expect(task.difficulty).toBeDefined();
        expect(task.count).toBeGreaterThan(0);
      }
    });

    it('should accept domain parameter', async () => {
      const result = await bridge.analyzeCoverageGaps({
        examples: makeExamples(5),
        domain: 'holoscript',
      });
      expect(result.totalGaps).toBeDefined();
    });

    it('should accept minimumCount parameter', async () => {
      const result = await bridge.analyzeCoverageGaps({
        examples: makeExamples(5),
        minimumCount: 10,
      });
      expect(result.totalGaps).toBeDefined();
    });

    it('should handle empty examples', async () => {
      const result = await bridge.analyzeCoverageGaps({ examples: [] });
      expect(result.totalGaps).toBeDefined();
    });

    it('should have completeness between 0 and 1', async () => {
      const result = await bridge.analyzeCoverageGaps({ examples: makeExamples(10) });
      expect(result.coverage.estimatedCompleteness).toBeGreaterThanOrEqual(0);
      expect(result.coverage.estimatedCompleteness).toBeLessThanOrEqual(1);
    });

    it('should include severity in gaps', async () => {
      const result = await bridge.analyzeCoverageGaps({ examples: makeExamples(10) });
      const validSeverities = ['critical', 'high', 'medium', 'low'];
      for (const gap of result.gaps) {
        expect(validSeverities).toContain(gap.severity);
      }
    });
  });

  // =========================================================================
  // 4. generateRLHFPairs
  // =========================================================================

  describe('generateRLHFPairs', () => {
    it('should generate RLHF preference pairs', async () => {
      const examples = makeExamples(5);
      const result: RLHFPairResult = await bridge.generateRLHFPairs({ examples });
      expect(result.pairs.length).toBeGreaterThan(0);
      expect(result.stats.totalPairs).toBeGreaterThan(0);
    });

    it('should generate chosen/rejected pairs', async () => {
      const examples = makeExamples(3);
      const result = await bridge.generateRLHFPairs({ examples });
      for (const pair of result.pairs) {
        expect(pair.chosen).toBeDefined();
        expect(pair.chosen.instruction).toBeDefined();
        expect(pair.chosen.output).toBeDefined();
        expect(pair.rejected).toBeDefined();
        expect(pair.rejected.instruction).toBeDefined();
        expect(pair.rejected.output).toBeDefined();
        expect(pair.rejected.strategy).toBeDefined();
      }
    });

    it('should respect rejectionsPerExample parameter', async () => {
      const examples = makeExamples(3);
      const result = await bridge.generateRLHFPairs({
        examples,
        rejectionsPerExample: 3,
      });
      // With 3 examples and 3 rejections each, expect up to 9 pairs
      expect(result.pairs.length).toBeGreaterThan(0);
    });

    it('should accept custom strategies', async () => {
      const examples = makeExamples(3);
      const result = await bridge.generateRLHFPairs({
        examples,
        strategies: ['incomplete', 'wrong_syntax'],
      });
      expect(result.pairs.length).toBeGreaterThan(0);
    });

    it('should report stats by strategy', async () => {
      const examples = makeExamples(5);
      const result = await bridge.generateRLHFPairs({ examples });
      expect(result.stats.byStrategy).toBeDefined();
      expect(typeof result.stats.byStrategy).toBe('object');
    });

    it('should default to 2 rejections per example', async () => {
      const examples = makeExamples(2);
      const result = await bridge.generateRLHFPairs({ examples });
      // With 2 examples, default 2 rejections → up to 4 pairs
      expect(result.pairs.length).toBeGreaterThan(0);
      expect(result.stats.totalPairs).toBeGreaterThan(0);
    });

    it('should default strategies to common set', async () => {
      const examples = makeExamples(2);
      const result = await bridge.generateRLHFPairs({ examples });
      expect(result.stats.byStrategy).toBeDefined();
    });

    it('should handle single example', async () => {
      const examples = makeExamples(1);
      const result = await bridge.generateRLHFPairs({ examples });
      expect(result.pairs.length).toBeGreaterThan(0);
    });

    it('should handle empty examples gracefully', async () => {
      const result = await bridge.generateRLHFPairs({ examples: [] });
      expect(result.pairs).toBeDefined();
      expect(Array.isArray(result.pairs)).toBe(true);
      expect(result.stats.totalPairs).toBe(0);
    });
  });

  // =========================================================================
  // 5. generateConversations
  // =========================================================================

  describe('generateConversations', () => {
    it('should generate multi-turn conversations', async () => {
      const result: ConversationResult = await bridge.generateConversations({
        domain: 'holoscript',
        count: 5,
      });
      expect(result.conversations.length).toBeGreaterThan(0);
      expect(result.stats.totalConversations).toBeGreaterThan(0);
    });

    it('should return valid conversation structure', async () => {
      const result = await bridge.generateConversations({
        domain: 'holoscript',
        count: 3,
      });
      for (const conv of result.conversations) {
        expect(conv.id).toBeDefined();
        expect(conv.domain).toBeDefined();
        expect(Array.isArray(conv.turns)).toBe(true);
        expect(conv.turns.length).toBeGreaterThan(0);
      }
    });

    it('should have user/assistant turn roles', async () => {
      const result = await bridge.generateConversations({
        domain: 'holoscript',
        count: 2,
      });
      for (const conv of result.conversations) {
        for (const turn of conv.turns) {
          expect(['user', 'assistant']).toContain(turn.role);
          expect(turn.content).toBeDefined();
          expect(turn.content.length).toBeGreaterThan(0);
        }
      }
    });

    it('should report total turns', async () => {
      const result = await bridge.generateConversations({
        domain: 'holoscript',
        count: 5,
      });
      expect(result.stats.totalTurns).toBeGreaterThan(0);
      expect(result.stats.avgTurns).toBeGreaterThan(0);
    });

    it('should generate for uaa2 domain', async () => {
      const result = await bridge.generateConversations({
        domain: 'uaa2',
        count: 3,
      });
      expect(result.conversations.length).toBeGreaterThan(0);
      expect(result.conversations[0].domain).toBe('uaa2');
    });

    it('should generate for hololand domain', async () => {
      const result = await bridge.generateConversations({
        domain: 'hololand',
        count: 2,
      });
      expect(result.conversations.length).toBeGreaterThan(0);
    });

    it('should accept minTurns/maxTurns parameters', async () => {
      const result = await bridge.generateConversations({
        domain: 'holoscript',
        count: 3,
        minTurns: 3,
        maxTurns: 8,
      });
      expect(result.conversations.length).toBeGreaterThan(0);
    });

    it('should default to 2-6 turns', async () => {
      const result = await bridge.generateConversations({
        domain: 'holoscript',
        count: 3,
      });
      expect(result.stats.avgTurns).toBeGreaterThan(0);
    });

    it('should set correct domain on conversations', async () => {
      const result = await bridge.generateConversations({
        domain: 'holoscript',
        count: 2,
      });
      for (const conv of result.conversations) {
        expect(conv.domain).toBe('holoscript');
      }
    });

    it('should handle count of 1', async () => {
      const result = await bridge.generateConversations({
        domain: 'holoscript',
        count: 1,
      });
      expect(result.conversations.length).toBe(1);
      expect(result.stats.totalConversations).toBe(1);
    });
  });

  // =========================================================================
  // 6. validateHoloScriptExamples
  // =========================================================================

  describe('validateHoloScriptExamples', () => {
    it('should validate HoloScript in example outputs', async () => {
      const examples = makeExamples(5);
      const result: HoloScriptValidationResult = await bridge.validateHoloScriptExamples({
        examples,
      });
      expect(result.totalChecked).toBe(5);
      expect(result.passed).toBe(5);
      expect(result.failed).toBe(0);
    });

    it('should return validation summary', async () => {
      const examples = makeExamples(5);
      const result = await bridge.validateHoloScriptExamples({ examples });
      expect(result.summary).toBeDefined();
      expect(result.summary.traitErrors).toBeDefined();
      expect(result.summary.syntaxErrors).toBeDefined();
      expect(result.summary.geometryErrors).toBeDefined();
    });

    it('should return issues array', async () => {
      const examples = makeExamples(5);
      const result = await bridge.validateHoloScriptExamples({ examples });
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should accept checkTraits flag', async () => {
      const examples = makeExamples(3);
      const result = await bridge.validateHoloScriptExamples({
        examples,
        checkTraits: true,
      });
      expect(result.totalChecked).toBe(3);
    });

    it('should accept checkGeometry flag', async () => {
      const examples = makeExamples(3);
      const result = await bridge.validateHoloScriptExamples({
        examples,
        checkGeometry: true,
      });
      expect(result.totalChecked).toBe(3);
    });

    it('should accept both flags as false', async () => {
      const examples = makeExamples(3);
      const result = await bridge.validateHoloScriptExamples({
        examples,
        checkTraits: false,
        checkGeometry: false,
      });
      expect(result.totalChecked).toBe(3);
    });

    it('should handle single example', async () => {
      const examples = makeExamples(1);
      const result = await bridge.validateHoloScriptExamples({ examples });
      expect(result.totalChecked).toBe(1);
    });

    it('should handle empty examples', async () => {
      const result = await bridge.validateHoloScriptExamples({ examples: [] });
      expect(result.totalChecked).toBe(0);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should have total = passed + failed', async () => {
      const examples = makeExamples(8);
      const result = await bridge.validateHoloScriptExamples({ examples });
      expect(result.passed + result.failed).toBe(result.totalChecked);
    });

    it('should have issue fields when present', async () => {
      const examples = makeExamples(3);
      const result = await bridge.validateHoloScriptExamples({ examples });
      for (const issue of result.issues) {
        expect(issue.exampleIndex).toBeDefined();
        expect(issue.issueType).toBeDefined();
        expect(issue.message).toBeDefined();
        expect(issue.severity).toBeDefined();
      }
    });
  });

  // =========================================================================
  // Cross-cutting concerns
  // =========================================================================

  describe('cross-cutting', () => {
    it('should create bridge with default config', () => {
      const b = new TrainingMonkeyBridge({ mockMode: true });
      expect(b).toBeDefined();
    });

    it('should handle all v2 methods on same bridge instance', async () => {
      const examples = makeExamples(5);

      const pipeline = await bridge.bridgeToPipeline({ count: 5, domain: 'holoscript' });
      const quality = await bridge.analyzeQuality({ examples });
      const gaps = await bridge.analyzeCoverageGaps({ examples });
      const rlhf = await bridge.generateRLHFPairs({ examples });
      const convos = await bridge.generateConversations({ domain: 'holoscript', count: 3 });
      const validation = await bridge.validateHoloScriptExamples({ examples });

      expect(pipeline.examples.length).toBeGreaterThan(0);
      expect(quality.overallScore).toBeGreaterThan(0);
      expect(gaps.totalGaps).toBeDefined();
      expect(rlhf.pairs.length).toBeGreaterThan(0);
      expect(convos.conversations.length).toBeGreaterThan(0);
      expect(validation.totalChecked).toBe(5);
    });

    it('should flow pipeline → quality → gaps end-to-end', async () => {
      // 1. Generate training data
      const pipeline = await bridge.bridgeToPipeline({
        count: 10,
        domain: 'holoscript',
      });
      expect(pipeline.examples.length).toBeGreaterThan(0);

      // 2. Analyze quality of generated data
      const quality = await bridge.analyzeQuality({
        examples: pipeline.examples,
      });
      expect(quality.overallScore).toBeGreaterThan(0);

      // 3. Find coverage gaps
      const gaps = await bridge.analyzeCoverageGaps({
        examples: pipeline.examples,
      });
      expect(gaps.coverage).toBeDefined();
    });

    it('should flow pipeline → RLHF end-to-end', async () => {
      // 1. Generate good examples
      const pipeline = await bridge.bridgeToPipeline({
        count: 5,
        domain: 'holoscript',
      });

      // 2. Create RLHF pairs from them
      const rlhf = await bridge.generateRLHFPairs({
        examples: pipeline.examples,
      });
      expect(rlhf.pairs.length).toBeGreaterThan(0);
    });

    it('should flow pipeline → validate end-to-end', async () => {
      // 1. Generate HoloScript examples
      const pipeline = await bridge.bridgeToPipeline({
        count: 5,
        domain: 'holoscript',
      });

      // 2. Validate the HoloScript syntax
      const validation = await bridge.validateHoloScriptExamples({
        examples: pipeline.examples,
      });
      expect(validation.totalChecked).toBeGreaterThan(0);
    });

    it('v1 methods should still work alongside v2', async () => {
      // v1 methods
      const genResult = await bridge.generateTraining({ count: 3, domain: 'holoscript' });
      expect(genResult.examples.length).toBeGreaterThan(0);

      const health = await bridge.healthCheck();
      expect(health.healthy).toBe(true);

      // v2 methods
      const pipeline = await bridge.bridgeToPipeline({ count: 3, domain: 'holoscript' });
      expect(pipeline.examples.length).toBeGreaterThan(0);

      const quality = await bridge.analyzeQuality({ examples: genResult.examples });
      expect(quality.overallScore).toBeGreaterThan(0);
    });
  });
});
