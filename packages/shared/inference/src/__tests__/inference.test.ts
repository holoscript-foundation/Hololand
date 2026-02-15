/**
 * @hololand/inference - Test Suite
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  InferenceClient,
  createInferenceClient,
  BRITTNEY_MODELS,
  DEFAULT_SETTINGS,
} from '../src/index.js';
import type { InferenceSettings, ProviderType } from '../src/types.js';

describe('@hololand/inference', () => {
  describe('createInferenceClient', () => {
    it('should create a client with default settings', () => {
      const client = createInferenceClient();
      expect(client).toBeInstanceOf(InferenceClient);
    });

    it('should create a client with custom settings', () => {
      const client = createInferenceClient({
        activeProvider: 'openai',
        local: {
          enabled: false,
          ollamaUrl: 'http://custom:11434',
          defaultModel: 'custom-model',
          autoDownloadModel: false,
        },
      });
      expect(client).toBeInstanceOf(InferenceClient);
    });
  });

  describe('BRITTNEY_MODELS', () => {
    it('should have local models defined', () => {
      expect(BRITTNEY_MODELS.local.expert).toBe('brittney-qwen-v23:latest');
      expect(BRITTNEY_MODELS.local.holoscript).toBe('brittney-v1:latest');
      expect(BRITTNEY_MODELS.local.general).toBe('brittney-v2:latest');
    });

    it('should have cloud models defined', () => {
      expect(BRITTNEY_MODELS.cloud.holoscript).toContain('ft:gpt-4o-mini');
      expect(BRITTNEY_MODELS.cloud.general).toContain('ft:gpt-4o-mini');
    });
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should have local provider as default', () => {
      expect(DEFAULT_SETTINGS.activeProvider).toBe('local');
    });

    it('should have local enabled by default', () => {
      expect(DEFAULT_SETTINGS.local.enabled).toBe(true);
    });

    it('should have fallback to cloud enabled', () => {
      expect(DEFAULT_SETTINGS.fallbackToCloud).toBe(true);
    });

    it('should have all provider types configured', () => {
      const providerTypes: ProviderType[] = [
        'local', 'openai', 'anthropic', 'google', 'grok', 'azure', 'infinityassistant', 'custom'
      ];
      
      for (const type of providerTypes) {
        expect(DEFAULT_SETTINGS.providers[type]).toBeDefined();
        expect(DEFAULT_SETTINGS.providers[type].type).toBe(type);
      }
    });
  });

  describe('InferenceClient', () => {
    let client: InferenceClient;

    beforeEach(() => {
      client = createInferenceClient({
        local: { enabled: false, ollamaUrl: '', defaultModel: '', autoDownloadModel: false },
      });
    });

    it('should initialize without errors', async () => {
      await expect(client.initialize()).resolves.not.toThrow();
    });

    it('should report status', async () => {
      await client.initialize();
      const status = await client.getStatus();
      
      expect(status).toHaveProperty('ready');
      expect(status).toHaveProperty('activeProvider');
      expect(status).toHaveProperty('providers');
      expect(Array.isArray(status.providers)).toBe(true);
    });
  });
});
