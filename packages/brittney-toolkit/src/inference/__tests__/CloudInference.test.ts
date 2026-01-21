/**
 * CloudInference Unit Tests
 * Tests for cloud-based inference (OpenAI API, etc.)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CloudInference } from '../CloudInference';
import type { InferenceConfig, InferenceResult } from '../types';

describe('CloudInference', () => {
  let inference: CloudInference;
  const testConfig: InferenceConfig = {
    apiKey: 'test-api-key',
    provider: 'openai',
    modelName: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4',
    temperature: 0.7,
    maxTokens: 2000,
  };

  beforeEach(() => {
    inference = new CloudInference(testConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(inference).toBeDefined();
    });

    it('should throw on missing API key', () => {
      expect(() => {
        new CloudInference({
          provider: 'openai',
          modelName: 'gpt-4',
        });
      }).toThrow('API key is required');
    });

    it('should support multiple providers', () => {
      const configs = [
        { apiKey: 'key1', provider: 'openai', modelName: 'gpt-4' },
        { apiKey: 'key2', provider: 'anthropic', modelName: 'claude-3' },
        { apiKey: 'key3', provider: 'huggingface', modelName: 'model' },
      ];

      configs.forEach(config => {
        const inf = new CloudInference(config as InferenceConfig);
        expect(inf).toBeDefined();
      });
    });
  });

  describe('generate method', () => {
    it('should generate text from prompt', async () => {
      const prompt = 'Create a spinning cube in HoloScript';
      const result = await inference.generate(prompt);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.model).toBe(testConfig.modelName);
    });

    it('should handle HoloScript code generation', async () => {
      const prompt = 'Create an interactive object with @grabbable trait';
      const result = await inference.generate(prompt);

      expect(result.text).toContain('object') || expect(result.text).toContain('trait');
    });

    it('should include usage statistics', async () => {
      const result = await inference.generate('Test prompt');

      expect(result.usage).toBeDefined();
      expect(result.usage?.promptTokens).toBeGreaterThan(0);
      expect(result.usage?.completionTokens).toBeGreaterThan(0);
    });

    it('should handle streaming responses', async () => {
      const chunks: string[] = [];

      await inference.generate('Streaming test', {
        onChunk: (chunk) => {
          chunks.push(chunk);
        },
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBeTruthy();
    });

    it('should respect maxTokens limit', async () => {
      const limited = new CloudInference({
        ...testConfig,
        maxTokens: 100,
      });

      const result = await limited.generate('Write a long story');
      expect(result.usage?.completionTokens).toBeLessThanOrEqual(100);
    });

    it('should handle system message', async () => {
      const result = await inference.generate('Create an NPC', {
        system: 'You are brittney, an expert in HoloScript and VR development',
      });

      expect(result).toBeDefined();
    });

    it('should handle conversation history', async () => {
      const history = [
        { role: 'user', content: 'What is HoloScript?' },
        { role: 'assistant', content: 'HoloScript is a VR programming language...' },
      ];

      const result = await inference.generate('Tell me more', {
        history,
      });

      expect(result).toBeDefined();
    });

    it('should timeout on slow API response', async () => {
      const slowInference = new CloudInference({
        ...testConfig,
        timeoutMs: 100,
      });

      vi.useFakeTimers();
      const promise = slowInference.generate('Slow test');
      vi.advanceTimersByTime(200);

      await expect(promise).rejects.toThrow();
      vi.useRealTimers();
    });

    it('should handle empty prompt', async () => {
      await expect(inference.generate('')).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      const invalidKey = new CloudInference({
        ...testConfig,
        apiKey: 'invalid-key',
      });

      await expect(invalidKey.generate('Test')).rejects.toThrow();
    });
  });

  describe('isAvailable method', () => {
    it('should verify API connectivity', async () => {
      const available = await inference.isAvailable();
      expect(typeof available).toBe('boolean');
    });

    it('should return false with invalid API key', async () => {
      const invalid = new CloudInference({
        apiKey: 'invalid-key-123',
        provider: 'openai',
        modelName: 'gpt-4',
      });

      const available = await invalid.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('rate limiting and retry', () => {
    it('should handle rate limit errors', async () => {
      const result = await inference.generate('Test with rate limiting');
      expect(result).toBeDefined();
    });

    it('should retry on transient failures', async () => {
      vi.spyOn(inference as any, 'callAPI').mockRejectedValueOnce(
        new Error('Temporary failure')
      );

      const result = await inference.generate('Retry test');
      expect(result).toBeDefined();
    });

    it('should track token usage', async () => {
      await inference.generate('Usage tracking test');
      const stats = inference.getStats();

      expect(stats.totalInputTokens).toBeGreaterThan(0);
      expect(stats.totalOutputTokens).toBeGreaterThan(0);
    });
  });

  describe('batch inference', () => {
    it('should handle multiple prompts', async () => {
      const prompts = [
        'Create a sphere',
        'Create a cube',
        'Create a pyramid',
      ];

      const results = await inference.generateBatch(prompts);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.text).toBeTruthy();
      });
    });

    it('should respect batch rate limiting', async () => {
      const startTime = Date.now();
      const prompts = Array(5).fill('Test prompt');

      await inference.generateBatch(prompts, {
        maxConcurrent: 2,
      });

      const duration = Date.now() - startTime;
      // Should take at least 2x longer due to limiting
      expect(duration).toBeGreaterThan(100);
    });
  });

  describe('configuration', () => {
    it('should update model', () => {
      inference.setModel('gpt-4-turbo');
      expect(inference.getConfig().modelName).toBe('gpt-4-turbo');
    });

    it('should update temperature', () => {
      inference.setTemperature(0.5);
      expect(inference.getConfig().temperature).toBe(0.5);
    });

    it('should update API key', () => {
      const newKey = 'new-api-key';
      inference.setApiKey(newKey);
      expect(inference.getConfig().apiKey).toBe(newKey);
    });

    it('should validate temperature range', () => {
      expect(() => {
        inference.setTemperature(-0.1);
      }).toThrow();
    });
  });

  describe('fallback strategy', () => {
    it('should fallback to local inference on API failure', async () => {
      const withFallback = new CloudInference({
        ...testConfig,
        fallbackToLocal: true,
        localModelPath: './models/fallback.gguf',
      });

      // This would use cloud API if available, falls back to local
      const result = await withFallback.generate('Test fallback');
      expect(result).toBeDefined();
    });
  });

  describe('caching', () => {
    it('should cache identical prompts', async () => {
      const prompt = 'Repeated test prompt';

      const result1 = await inference.generate(prompt);
      const startTime = Date.now();
      const result2 = await inference.generate(prompt);
      const duration = Date.now() - startTime;

      expect(result1.text).toBe(result2.text);
      expect(duration).toBeLessThan(50); // Cached should be fast
    });

    it('should clear cache', () => {
      inference.clearCache();
      expect(inference.getCacheSize()).toBe(0);
    });
  });
});
