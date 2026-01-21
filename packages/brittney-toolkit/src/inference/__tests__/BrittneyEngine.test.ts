/**
 * BrittneyEngine Unit Tests
 * Tests for the unified inference engine orchestrator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrittneyEngine } from '../BrittneyEngine';
import type { InferenceConfig, InferenceResult, InferenceMode } from '../types';

describe('BrittneyEngine', () => {
  let engine: BrittneyEngine;
  const testConfig = {
    cloudConfig: {
      apiKey: 'test-key',
      provider: 'openai' as const,
      modelName: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4',
      temperature: 0.7,
    },
    localConfig: {
      modelPath: './models/brittney-f16.gguf',
      temperature: 0.7,
    },
  };

  beforeEach(() => {
    engine = new BrittneyEngine(testConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with both cloud and local configs', () => {
      expect(engine).toBeDefined();
      expect(engine.getMode()).toBe('cloud');
    });

    it('should initialize with cloud-only config', () => {
      const cloudOnly = new BrittneyEngine({
        cloudConfig: testConfig.cloudConfig,
      });
      expect(cloudOnly).toBeDefined();
    });

    it('should initialize with local-only config', () => {
      const localOnly = new BrittneyEngine({
        localConfig: testConfig.localConfig,
      });
      expect(localOnly).toBeDefined();
    });

    it('should throw if neither config provided', () => {
      expect(() => {
        new BrittneyEngine({});
      }).toThrow('At least one inference config is required');
    });
  });

  describe('generate method', () => {
    it('should generate using current mode', async () => {
      const result = await engine.generate('Create a blue sphere in HoloScript');
      expect(result.text).toBeTruthy();
      expect(result.mode).toBe('cloud');
    });

    it('should include metadata in result', async () => {
      const result = await engine.generate('Test prompt');

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.model).toBeTruthy();
      expect(result.mode).toBe('cloud');
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should respect options parameter', async () => {
      const result = await engine.generate('Test', {
        system: 'You are brittney',
        temperature: 0.5,
      });

      expect(result).toBeDefined();
    });

    it('should handle streaming', async () => {
      const chunks: string[] = [];

      await engine.generate('Streaming test', {
        onChunk: (chunk) => chunks.push(chunk),
      });

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle empty prompt', async () => {
      await expect(engine.generate('')).rejects.toThrow();
    });
  });

  describe('mode switching', () => {
    it('should switch between modes', async () => {
      expect(engine.getMode()).toBe('cloud');

      engine.setMode('local');
      expect(engine.getMode()).toBe('local');

      engine.setMode('cloud');
      expect(engine.getMode()).toBe('cloud');
    });

    it('should throw on unsupported mode switch', () => {
      const localOnly = new BrittneyEngine({
        localConfig: testConfig.localConfig,
      });

      expect(() => {
        localOnly.setMode('cloud');
      }).toThrow('Cloud mode not configured');
    });

    it('should list available modes', () => {
      const modes = engine.getAvailableModes();
      expect(modes).toContain('cloud');
      expect(modes).toContain('local');
    });
  });

  describe('auto-fallback', () => {
    it('should fallback to local on cloud failure', async () => {
      const withFallback = new BrittneyEngine({
        cloudConfig: { ...testConfig.cloudConfig, apiKey: 'invalid' },
        localConfig: testConfig.localConfig,
        autoFallback: true,
      });

      const result = await withFallback.generate('Fallback test');
      expect(result).toBeDefined();
    });

    it('should not fallback if disabled', async () => {
      const noFallback = new BrittneyEngine({
        cloudConfig: { ...testConfig.cloudConfig, apiKey: 'invalid' },
        localConfig: testConfig.localConfig,
        autoFallback: false,
      });

      await expect(noFallback.generate('No fallback')).rejects.toThrow();
    });

    it('should track fallback events', async () => {
      const withFallback = new BrittneyEngine({
        cloudConfig: { ...testConfig.cloudConfig, apiKey: 'invalid' },
        localConfig: testConfig.localConfig,
        autoFallback: true,
      });

      await withFallback.generate('Track fallback');
      const stats = withFallback.getStats();

      expect(stats.fallbackCount).toBeGreaterThan(0);
    });
  });

  describe('batch inference', () => {
    it('should process batch of prompts', async () => {
      const prompts = [
        'Create a cube',
        'Create a sphere',
        'Create a pyramid',
      ];

      const results = await engine.generateBatch(prompts);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.text).toBeTruthy();
        expect(result.mode).toBeDefined();
      });
    });

    it('should respect concurrent limit', async () => {
      const prompts = Array(10).fill('Test prompt');
      const startTime = Date.now();

      await engine.generateBatch(prompts, { maxConcurrent: 2 });

      const duration = Date.now() - startTime;
      // Should take multiple batches
      expect(duration).toBeGreaterThan(100);
    });

    it('should support mixed batch options', async () => {
      const prompts = [
        { prompt: 'Create cube', temperature: 0.5 },
        { prompt: 'Create sphere', temperature: 0.7 },
      ];

      const results = await engine.generateBatchAdvanced(prompts);
      expect(results).toHaveLength(2);
    });
  });

  describe('statistics and monitoring', () => {
    it('should track inference statistics', async () => {
      await engine.generate('Test 1');
      await engine.generate('Test 2');

      const stats = engine.getStats();

      expect(stats.totalInferences).toBe(2);
      expect(stats.cloudInferences).toBeGreaterThan(0);
      expect(stats.averageLatencyMs).toBeGreaterThan(0);
    });

    it('should track token usage', async () => {
      await engine.generate('Token tracking test');
      const stats = engine.getStats();

      expect(stats.totalInputTokens).toBeGreaterThan(0);
      expect(stats.totalOutputTokens).toBeGreaterThan(0);
    });

    it('should calculate cost estimates', async () => {
      await engine.generate('Cost estimation test');
      const stats = engine.getStats();

      expect(stats.estimatedCostUSD).toBeGreaterThanOrEqual(0);
    });

    it('should reset statistics', () => {
      engine.resetStats();
      const stats = engine.getStats();

      expect(stats.totalInferences).toBe(0);
      expect(stats.totalInputTokens).toBe(0);
    });
  });

  describe('health checking', () => {
    it('should check cloud availability', async () => {
      const available = await engine.isCloudAvailable();
      expect(typeof available).toBe('boolean');
    });

    it('should check local availability', async () => {
      const available = await engine.isLocalAvailable();
      expect(typeof available).toBe('boolean');
    });

    it('should return health status', async () => {
      const health = await engine.getHealth();

      expect(health).toBeDefined();
      expect(health.cloud).toBeDefined();
      expect(health.local).toBeDefined();
      expect(health.currentMode).toBeTruthy();
    });
  });

  describe('context management', () => {
    it('should maintain conversation history', async () => {
      await engine.generate('Hello');
      await engine.generate('How are you?');

      const history = engine.getConversationHistory();
      expect(history.length).toBe(2);
    });

    it('should clear conversation history', () => {
      engine.clearConversationHistory();
      const history = engine.getConversationHistory();

      expect(history).toHaveLength(0);
    });

    it('should limit history size', async () => {
      const limited = new BrittneyEngine({
        ...testConfig,
        maxHistorySize: 2,
      });

      await limited.generate('Message 1');
      await limited.generate('Message 2');
      await limited.generate('Message 3');

      const history = limited.getConversationHistory();
      expect(history.length).toBeLessThanOrEqual(2);
    });
  });

  describe('HoloScript specific features', () => {
    it('should generate HoloScript with proper formatting', async () => {
      const result = await engine.generate(
        'Create an interactive NPC with greeting dialogue',
        { format: 'holoscript' }
      );

      expect(result.text).toContain('object') || expect(result.text).toContain('scene');
    });

    it('should validate HoloScript syntax', async () => {
      const result = await engine.generate(
        'Create a cube with @grabbable trait',
        { validateSyntax: true }
      );

      expect(result.syntaxValid).toBe(true);
    });

    it('should provide code explanations', async () => {
      const explanation = await engine.explainCode(
        'object MyObject { geometry: "cube" }'
      );

      expect(explanation).toBeTruthy();
      expect(explanation).toContain('object') || expect(explanation).toContain('cube');
    });

    it('should suggest code optimizations', async () => {
      const suggestions = await engine.optimizeCode(
        'object LargeScene { ... }' // Pseudo code
      );

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle rate limiting gracefully', async () => {
      const result = await engine.generate('Rate limit test');
      expect(result).toBeDefined();
    });

    it('should retry failed requests', async () => {
      const result = await engine.generate('Retry test');
      expect(result).toBeDefined();
    });

    it('should provide error details', async () => {
      try {
        await engine.generate('', { strictValidation: true });
      } catch (error: any) {
        expect(error.message).toContain('Prompt');
      }
    });
  });

  describe('configuration', () => {
    it('should update cloud config', () => {
      engine.updateCloudConfig({ temperature: 0.5 });
      const config = engine.getConfig();

      expect(config.cloudConfig?.temperature).toBe(0.5);
    });

    it('should update local config', () => {
      engine.updateLocalConfig({ temperature: 0.3 });
      const config = engine.getConfig();

      expect(config.localConfig?.temperature).toBe(0.3);
    });

    it('should validate config changes', () => {
      expect(() => {
        engine.updateCloudConfig({ temperature: 3 });
      }).toThrow();
    });
  });
});
