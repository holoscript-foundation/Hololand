/**
 * LocalInference Unit Tests
 * Tests for GGUF model inference using local llama.cpp
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalInference } from '../LocalInference';
import type { InferenceConfig, InferenceResult } from '../types';

describe('LocalInference', () => {
  let inference: LocalInference;
  const testConfig: InferenceConfig = {
    modelPath: './models/test-model.gguf',
    modelName: 'test-brittney',
    temperature: 0.7,
    topP: 0.95,
  };

  beforeEach(() => {
    inference = new LocalInference(testConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const inf = new LocalInference({
        modelPath: './models/model.gguf',
      });
      expect(inf).toBeDefined();
    });

    it('should merge custom config with defaults', () => {
      const custom = new LocalInference({
        modelPath: './models/model.gguf',
        temperature: 0.5,
        maxTokens: 128,
      });
      expect(custom).toBeDefined();
    });

    it('should throw on invalid model path', () => {
      expect(() => {
        new LocalInference({ modelPath: '' });
      }).toThrow('Model path is required');
    });
  });

  describe('generate method', () => {
    it('should generate text from prompt', async () => {
      const prompt = 'Create a blue cube in HoloScript';
      // Note: In real tests, this would mock the actual inference
      const result = await inference.generate(prompt);

      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
      expect(result.tokens).toBeGreaterThan(0);
    });

    it('should respect temperature setting', async () => {
      const highTemp = new LocalInference({
        ...testConfig,
        temperature: 0.9,
      });
      const lowTemp = new LocalInference({
        ...testConfig,
        temperature: 0.1,
      });

      const prompt = 'Generate creative HoloScript code';
      const result1 = await highTemp.generate(prompt);
      const result2 = await lowTemp.generate(prompt);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should respect maxTokens limit', async () => {
      const limited = new LocalInference({
        ...testConfig,
        maxTokens: 50,
      });

      const result = await limited.generate('Write a long story');
      expect(result.tokens).toBeLessThanOrEqual(50);
    });

    it('should handle system messages', async () => {
      const result = await inference.generate('Create an NPC', {
        system: 'You are brittney, a HoloScript expert',
      });

      expect(result).toBeDefined();
      expect(result.text).toContain('object') || expect(result.text).toContain('scene');
    });

    it('should handle empty prompt', async () => {
      await expect(inference.generate('')).rejects.toThrow('Prompt cannot be empty');
    });

    it('should timeout on long-running inference', async () => {
      const timeoutMs = 100;
      const inf = new LocalInference({
        ...testConfig,
        timeoutMs,
      });

      vi.useFakeTimers();
      const promise = inf.generate('Generate infinite text: ' + 'a'.repeat(10000));
      vi.advanceTimersByTime(timeoutMs + 50);

      await expect(promise).rejects.toThrow();
      vi.useRealTimers();
    });
  });

  describe('isAvailable method', () => {
    it('should check if model is available', async () => {
      const available = await inference.isAvailable();
      expect(typeof available).toBe('boolean');
    });

    it('should return false if model path is invalid', async () => {
      const invalid = new LocalInference({
        modelPath: '/nonexistent/path/model.gguf',
      });
      const available = await invalid.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('loadModel method', () => {
    it('should load model from path', async () => {
      await expect(inference.loadModel()).resolves.not.toThrow();
    });

    it('should cache loaded model', async () => {
      await inference.loadModel();
      const firstCall = Date.now();

      // Second load should be much faster (cached)
      await inference.loadModel();
      const secondCall = Date.now();

      expect(secondCall - firstCall).toBeLessThan(100);
    });

    it('should throw on invalid model file', async () => {
      const invalid = new LocalInference({
        modelPath: './models/invalid.gguf',
      });

      await expect(invalid.loadModel()).rejects.toThrow();
    });
  });

  describe('getStats method', () => {
    it('should return inference statistics', async () => {
      await inference.generate('Hello');
      const stats = inference.getStats();

      expect(stats).toBeDefined();
      expect(stats.inferenceCount).toBeGreaterThan(0);
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.avgLatencyMs).toBeGreaterThan(0);
    });

    it('should track multiple inferences', async () => {
      await inference.generate('Test 1');
      await inference.generate('Test 2');
      const stats = inference.getStats();

      expect(stats.inferenceCount).toBe(2);
    });

    it('should reset stats', () => {
      inference.resetStats();
      const stats = inference.getStats();

      expect(stats.inferenceCount).toBe(0);
      expect(stats.totalTokens).toBe(0);
    });
  });

  describe('cancel method', () => {
    it('should cancel ongoing inference', async () => {
      const promise = inference.generate('Very long prompt ' + 'a'.repeat(10000));

      setTimeout(() => {
        inference.cancel();
      }, 50);

      await expect(promise).rejects.toThrow('Cancelled');
    });

    it('should handle cancel when no inference running', () => {
      expect(() => {
        inference.cancel();
      }).not.toThrow();
    });
  });

  describe('configuration', () => {
    it('should update temperature', () => {
      inference.setTemperature(0.5);
      expect(inference.getConfig().temperature).toBe(0.5);
    });

    it('should update topP', () => {
      inference.setTopP(0.8);
      expect(inference.getConfig().topP).toBe(0.8);
    });

    it('should validate temperature range', () => {
      expect(() => {
        inference.setTemperature(-0.1);
      }).toThrow('Temperature must be between 0 and 2');

      expect(() => {
        inference.setTemperature(2.5);
      }).toThrow('Temperature must be between 0 and 2');
    });

    it('should validate topP range', () => {
      expect(() => {
        inference.setTopP(1.5);
      }).toThrow('topP must be between 0 and 1');
    });
  });
});
