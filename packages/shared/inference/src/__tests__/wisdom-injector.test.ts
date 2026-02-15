/**
 * uAA2++ Wisdom Injector - Test Suite
 */
import { describe, it, expect } from 'vitest';
import {
  injectWisdom,
  DEFAULT_WISDOM_CONFIG,
  type WisdomInjectionConfig,
} from '../wisdom-injector.js';
import type { InferenceRequest, ProviderType } from '../types.js';

function makeRequest(messages: Array<{ role: 'system' | 'user'; content: string }>): InferenceRequest {
  return { messages };
}

const userOnly = makeRequest([{ role: 'user', content: 'Create a spinning cube' }]);

const withSystem = makeRequest([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Create a spinning cube' },
]);

const withHoloSystem = makeRequest([
  { role: 'system', content: 'You are a HoloScript+ assistant. Use geometry: for shapes.' },
  { role: 'user', content: 'Create a spinning cube' },
]);

describe('injectWisdom', () => {
  // =========================================================================
  // Skip conditions
  // =========================================================================

  describe('skip conditions', () => {
    it('should skip when level is off', () => {
      const config: WisdomInjectionConfig = { ...DEFAULT_WISDOM_CONFIG, level: 'off' };
      const result = injectWisdom(userOnly, 'openai', 'gpt-4o', config);
      expect(result).toBe(userOnly);
    });

    it('should skip for local brittney models', () => {
      const result = injectWisdom(userOnly, 'local', 'brittney-qwen-v23:latest');
      expect(result).toBe(userOnly);
    });

    it('should NOT skip for local non-brittney models', () => {
      const result = injectWisdom(userOnly, 'local', 'llama3:latest');
      expect(result).not.toBe(userOnly);
      expect(result.messages[0].content).toContain('HoloScript+');
    });

    it('should skip for OpenAI fine-tuned models', () => {
      const result = injectWisdom(userOnly, 'openai', 'ft:gpt-4o-mini:brittney:xyz');
      expect(result).toBe(userOnly);
    });

    it('should skip for infinityassistant provider', () => {
      const result = injectWisdom(userOnly, 'infinityassistant', 'mistral-nemo');
      expect(result).toBe(userOnly);
    });

    it('should NOT skip local brittney when skipForLocalBrittney is false', () => {
      const config: WisdomInjectionConfig = { ...DEFAULT_WISDOM_CONFIG, skipForLocalBrittney: false };
      const result = injectWisdom(userOnly, 'local', 'brittney-qwen-v23:latest', config);
      expect(result).not.toBe(userOnly);
    });
  });

  // =========================================================================
  // Injection content
  // =========================================================================

  describe('injection content', () => {
    it('should inject full wisdom by default', () => {
      const result = injectWisdom(userOnly, 'grok', 'grok-3');
      const system = result.messages.find((m) => m.role === 'system');
      expect(system).toBeDefined();
      expect(system!.content).toContain('=== WISDOM (Core Rules) ===');
      expect(system!.content).toContain('=== PATTERNS (Structure) ===');
      expect(system!.content).toContain('=== GOTCHAS (Avoid These) ===');
    });

    it('should inject basic wisdom when configured', () => {
      const config: WisdomInjectionConfig = { ...DEFAULT_WISDOM_CONFIG, level: 'basic' };
      const result = injectWisdom(userOnly, 'grok', 'grok-3', config);
      const system = result.messages.find((m) => m.role === 'system');
      expect(system).toBeDefined();
      expect(system!.content).toContain('W.001');
      expect(system!.content).not.toContain('=== WISDOM (Core Rules) ===');
    });

    it('should contain W/P/G entries in full mode', () => {
      const result = injectWisdom(userOnly, 'openai', 'gpt-4o');
      const system = result.messages.find((m) => m.role === 'system');
      expect(system!.content).toMatch(/W\.\d{3}/);
      expect(system!.content).toMatch(/P\.\d{3}/);
      expect(system!.content).toMatch(/G\.\d{3}/);
    });

    it('should downgrade to basic when existing system has HoloScript knowledge', () => {
      const result = injectWisdom(withHoloSystem, 'grok', 'grok-3');
      const system = result.messages.find((m) => m.role === 'system');
      expect(system!.content).toContain('[HoloScript+ Quick Reference]');
      expect(system!.content).not.toContain('=== WISDOM (Core Rules) ===');
    });

    it('should include custom preamble when configured', () => {
      const config: WisdomInjectionConfig = {
        ...DEFAULT_WISDOM_CONFIG,
        customPreamble: 'You are Brittney, a HoloScript expert.',
      };
      const result = injectWisdom(userOnly, 'grok', 'grok-3', config);
      const system = result.messages.find((m) => m.role === 'system');
      expect(system!.content).toContain('You are Brittney, a HoloScript expert.');
    });
  });

  // =========================================================================
  // Injection mechanics
  // =========================================================================

  describe('injection mechanics', () => {
    it('should insert system message when none exists', () => {
      const result = injectWisdom(userOnly, 'openai', 'gpt-4o');
      expect(result.messages.length).toBe(userOnly.messages.length + 1);
      expect(result.messages[0].role).toBe('system');
    });

    it('should prepend to existing system message', () => {
      const result = injectWisdom(withSystem, 'openai', 'gpt-4o');
      expect(result.messages.length).toBe(withSystem.messages.length);
      const system = result.messages.find((m) => m.role === 'system')!;
      expect(system.content).toContain('You are a helpful assistant.');
      expect(system.content).toContain('HoloScript+');
    });

    it('should not mutate the original request', () => {
      const original = JSON.parse(JSON.stringify(userOnly));
      injectWisdom(userOnly, 'openai', 'gpt-4o');
      expect(userOnly).toEqual(original);
    });

    it('should return new object reference', () => {
      const result = injectWisdom(userOnly, 'openai', 'gpt-4o');
      expect(result).not.toBe(userOnly);
      expect(result.messages).not.toBe(userOnly.messages);
    });
  });

  // =========================================================================
  // Provider-specific
  // =========================================================================

  describe('BYOK providers get injection', () => {
    const byokProviders: ProviderType[] = ['openai', 'anthropic', 'google', 'grok', 'deepseek', 'azure', 'custom'];

    for (const provider of byokProviders) {
      it(`should inject wisdom for ${provider}`, () => {
        const result = injectWisdom(userOnly, provider, 'some-model');
        expect(result).not.toBe(userOnly);
        const system = result.messages.find((m) => m.role === 'system');
        expect(system).toBeDefined();
        expect(system!.content).toContain('HoloScript+');
      });
    }
  });
});
