import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  configureBrittney,
  getBrittneyConfig,
  getBrittneyContextMenuActions,
  onBrittneyEvent,
  type BrittneyConfig,
} from '../src/BrittneyIntegration';

describe('BrittneyIntegration', () => {
  describe('configureBrittney', () => {
    it('should set configuration options', () => {
      const config: BrittneyConfig = {
        apiEndpoint: 'https://custom.api.com/brittney',
        apiKey: 'test-key-123',
        model: 'brittney-v4',
        maxTokens: 4096,
        temperature: 0.5,
        timeout: 60000,
      };

      configureBrittney(config);
      const result = getBrittneyConfig();

      expect(result.apiEndpoint).toBe('https://custom.api.com/brittney');
      expect(result.apiKey).toBe('test-key-123');
      expect(result.model).toBe('brittney-v4');
      expect(result.maxTokens).toBe(4096);
      expect(result.temperature).toBe(0.5);
      expect(result.timeout).toBe(60000);
    });

    it('should use defaults for missing options', () => {
      configureBrittney({ apiKey: 'only-key' });
      const result = getBrittneyConfig();

      expect(result.apiKey).toBe('only-key');
      expect(result.apiEndpoint).toBe('http://localhost:3001/api/brittney');
      expect(result.model).toBe('brittney-v3');
      expect(result.maxTokens).toBe(2048);
    });
  });

  describe('getBrittneyContextMenuActions', () => {
    it('should return list of context menu actions', () => {
      const actions = getBrittneyContextMenuActions();

      expect(actions).toBeInstanceOf(Array);
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should include required action properties', () => {
      const actions = getBrittneyContextMenuActions();

      for (const action of actions) {
        expect(action.id).toBeDefined();
        expect(typeof action.id).toBe('string');
        expect(action.label).toBeDefined();
        expect(typeof action.label).toBe('string');
        expect(action.handler).toBeDefined();
        expect(typeof action.handler).toBe('function');
      }
    });

    it('should include specific actions', () => {
      const actions = getBrittneyContextMenuActions();
      const actionIds = actions.map(a => a.id);

      expect(actionIds).toContain('brittney-generate-child');
      expect(actionIds).toContain('brittney-explain');
      expect(actionIds).toContain('brittney-add-interaction');
      expect(actionIds).toContain('brittney-optimize');
      expect(actionIds).toContain('brittney-duplicate-varied');
    });
  });

  describe('onBrittneyEvent', () => {
    it('should subscribe to events and return unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = onBrittneyEvent('test-event', handler);

      expect(typeof unsubscribe).toBe('function');

      // Unsubscribe
      unsubscribe();
    });

    it('should allow multiple subscribers to same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsub1 = onBrittneyEvent('multi-event', handler1);
      const unsub2 = onBrittneyEvent('multi-event', handler2);

      expect(typeof unsub1).toBe('function');
      expect(typeof unsub2).toBe('function');

      unsub1();
      unsub2();
    });
  });

  describe('Integration types', () => {
    it('should export all required types', async () => {
      const module = await import('../src/BrittneyIntegration');

      // Check function exports
      expect(typeof module.configureBrittney).toBe('function');
      expect(typeof module.getBrittneyConfig).toBe('function');
      expect(typeof module.generateFromPrompt).toBe('function');
      expect(typeof module.explainNode).toBe('function');
      expect(typeof module.analyzeScene).toBe('function');
      expect(typeof module.getBrittneyContextMenuActions).toBe('function');
      expect(typeof module.onBrittneyEvent).toBe('function');
      expect(typeof module.quickGenerateScene).toBe('function');
      expect(typeof module.quickAddObject).toBe('function');
      expect(typeof module.applyGeneratedHoloScript).toBe('function');
    });
  });
});
