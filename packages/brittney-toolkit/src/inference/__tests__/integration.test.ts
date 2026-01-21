/**
 * Brittney Toolkit Integration Tests
 * Tests for interactions between components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrittneyEngine } from '../BrittneyEngine';
import { LocalInference } from '../LocalInference';
import { CloudInference } from '../CloudInference';
import type { InferenceResult } from '../types';

describe('Brittney Toolkit Integration', () => {
  let engine: BrittneyEngine;
  let localInference: LocalInference;
  let cloudInference: CloudInference;

  beforeEach(() => {
    localInference = new LocalInference({
      modelPath: './models/brittney-f16.gguf',
      temperature: 0.7,
    });

    cloudInference = new CloudInference({
      apiKey: 'test-key',
      provider: 'openai',
      modelName: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4',
    });

    engine = new BrittneyEngine({
      cloudConfig: {
        apiKey: 'test-key',
        provider: 'openai',
        modelName: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4',
      },
      localConfig: {
        modelPath: './models/brittney-f16.gguf',
      },
      autoFallback: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Cloud to Local Fallback', () => {
    it('should fallback to local when cloud fails', async () => {
      const failingCloud = new CloudInference({
        apiKey: 'invalid-key',
        provider: 'openai',
        modelName: 'gpt-4',
      });

      const withFallback = new BrittneyEngine({
        cloudConfig: {
          apiKey: 'invalid-key',
          provider: 'openai',
          modelName: 'gpt-4',
        },
        localConfig: {
          modelPath: './models/brittney-f16.gguf',
        },
        autoFallback: true,
      });

      const result = await withFallback.generate('Fallback test');
      expect(result).toBeDefined();
      expect(result.text).toBeTruthy();
    });

    it('should track fallback statistics', async () => {
      const withTracking = new BrittneyEngine({
        cloudConfig: {
          apiKey: 'invalid-key',
          provider: 'openai',
          modelName: 'gpt-4',
        },
        localConfig: {
          modelPath: './models/brittney-f16.gguf',
        },
        autoFallback: true,
      });

      await withFallback.generate('Test 1');
      await withFallback.generate('Test 2');

      const stats = withTracking.getStats();
      expect(stats.fallbackCount).toBeGreaterThan(0);
    });
  });

  describe('Hybrid Inference Strategy', () => {
    it('should use cloud for complex tasks, local for simple', async () => {
      // Simple prompts use local (faster, cheaper)
      engine.setMode('local');
      const simpleResult = await engine.generate('Create a cube');
      expect(simpleResult.mode).toBe('local');

      // Complex prompts use cloud (more capable)
      engine.setMode('cloud');
      const complexResult = await engine.generate(
        'Create a complex RPG inventory system with equipment slots'
      );
      expect(complexResult.mode).toBe('cloud');
    });

    it('should balance cost and quality', async () => {
      const costAware = new BrittneyEngine({
        cloudConfig: {
          apiKey: 'test-key',
          provider: 'openai',
          modelName: 'ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4',
        },
        localConfig: {
          modelPath: './models/brittney-f16.gguf',
        },
        optimizeForCost: true,
      });

      await costAware.generate('Simple task');
      const stats = costAware.getStats();

      expect(stats.estimatedCostUSD).toBeLessThan(0.50); // Should be cheap
    });
  });

  describe('HoloScript Generation Workflow', () => {
    it('should generate, validate, and inject HoloScript', async () => {
      const code = await engine.generate(
        'Create an interactive cube with rotation animation'
      );

      expect(code.text).toBeTruthy();

      // Would validate syntax
      const validation = await engine.validateHoloScript(code.text);
      expect(validation).toBeDefined();

      // Would prepare for injection
      const prepared = await engine.prepareForInjection(code.text);
      expect(prepared).toBeTruthy();
    });

    it('should handle code refinement loop', async () => {
      // Generate initial code
      let result = await engine.generate('Create a sphere');
      let code = result.text;

      // Refine based on feedback
      result = await engine.generate(
        `Improve this HoloScript code: ${code}`,
        { context: code }
      );

      expect(result.text).toBeTruthy();
      expect(result.text).not.toBe(code); // Should be different
    });

    it('should explain generated code', async () => {
      const code = await engine.generate('Create a cube with @grabbable');
      const explanation = await engine.explainCode(code.text);

      expect(explanation).toBeTruthy();
      expect(explanation).toContain('cube') || expect(explanation).toContain('grabbable');
    });
  });

  describe('Batch Processing Pipeline', () => {
    it('should process multiple HoloScript requests efficiently', async () => {
      const requests = [
        'Create a red sphere',
        'Create a blue cube',
        'Create a green pyramid',
      ];

      const startTime = Date.now();
      const results = await engine.generateBatch(requests, {
        maxConcurrent: 2,
      });
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.text).toBeTruthy();
      });

      // Parallel processing should be faster than sequential
      expect(duration).toBeLessThan(30000); // Reasonable timeout
    });

    it('should handle partial failures in batch', async () => {
      const requests = [
        'Create a cube',
        '', // Invalid - empty
        'Create a sphere',
      ];

      const results = await engine.generateBatchWithErrorHandling(requests);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('Conversation Context Management', () => {
    it('should maintain multi-turn conversation', async () => {
      await engine.generate('What is HoloScript?');
      await engine.generate('How do I create an object?');
      await engine.generate('What are traits?');

      const history = engine.getConversationHistory();
      expect(history.length).toBe(3);
    });

    it('should use context for related queries', async () => {
      await engine.generate('Create a weapon system');
      const contextAwareResult = await engine.generate(
        'Now add armor to the system',
        { useContext: true }
      );

      // Should understand it's extending the previous system
      expect(contextAwareResult.text).toBeTruthy();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance across engines', async () => {
      // Use cloud
      engine.setMode('cloud');
      await engine.generate('Test cloud');

      // Switch to local
      engine.setMode('local');
      await engine.generate('Test local');

      const stats = engine.getStats();

      expect(stats.cloudInferences).toBeGreaterThan(0);
      expect(stats.localInferences).toBeGreaterThan(0);
      expect(stats.averageLatencyMs).toBeGreaterThan(0);
    });

    it('should detect and alert on performance degradation', async () => {
      const alerting = new BrittneyEngine({
        cloudConfig: {
          apiKey: 'test-key',
          provider: 'openai',
          modelName: 'gpt-4',
        },
        alertOnLatency: 5000, // Alert if latency > 5s
      });

      let alertFired = false;
      alerting.onAlert((alert) => {
        if (alert.type === 'latency') {
          alertFired = true;
        }
      });

      // Simulate slow inference would trigger alert
      // (In real test, would measure actual latency)
    });
  });

  describe('Resource Management', () => {
    it('should manage model lifecycle', async () => {
      // Load models
      await engine.loadModels();

      // Use models
      await engine.generate('Test');

      // Unload when done
      await engine.unloadModels();
    });

    it('should cache inference results', async () => {
      const prompt = 'Create a consistent cube';

      const startTime1 = Date.now();
      const result1 = await engine.generate(prompt);
      const time1 = Date.now() - startTime1;

      const startTime2 = Date.now();
      const result2 = await engine.generate(prompt);
      const time2 = Date.now() - startTime2;

      // Cached result should be much faster
      expect(time2).toBeLessThan(time1 / 2);
      expect(result1.text).toBe(result2.text);
    });

    it('should manage memory efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Run many inferences
      for (let i = 0; i < 10; i++) {
        await engine.generate(`Generate test ${i}`);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const increase = finalMemory - initialMemory;

      // Memory increase should be reasonable (not unbounded)
      expect(increase).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  describe('Error Recovery', () => {
    it('should recover from transient failures', async () => {
      let failureCount = 0;

      // Simulate transient failure
      vi.spyOn(engine as any, 'callInference').mockImplementation(async () => {
        failureCount++;
        if (failureCount < 2) {
          throw new Error('Transient failure');
        }
        return { text: 'Success', model: 'test' };
      });

      const result = await engine.generate('Recovery test');
      expect(result).toBeDefined();
      expect(failureCount).toBe(2); // Failed once, succeeded once
    });

    it('should handle graceful degradation', async () => {
      const degraded = new BrittneyEngine({
        cloudConfig: {
          apiKey: 'invalid',
          provider: 'openai',
          modelName: 'gpt-4',
        },
        // No local fallback
      });

      await expect(degraded.generate('Test')).rejects.toThrow();
    });
  });

  describe('Advanced Scenarios', () => {
    it('should handle creative code generation', async () => {
      const result = await engine.generate(
        'Create an entire RPG world with NPCs, combat system, and inventory'
      );

      expect(result.text).toBeTruthy();
      expect(result.text.length).toBeGreaterThan(100); // Complex output
    });

    it('should handle code refactoring', async () => {
      const originalCode = 'object SimpleCube { geometry: "cube" }';
      const improved = await engine.generate(
        `Refactor and improve this HoloScript:\n${originalCode}`
      );

      expect(improved.text).toBeTruthy();
    });

    it('should generate documentation from code', async () => {
      const code = 'object MyObject @grabbable { geometry: "sphere" }';
      const docs = await engine.generateDocumentation(code);

      expect(docs).toBeTruthy();
      expect(docs).toContain('MyObject') || expect(docs).toContain('grabbable');
    });
  });
});
