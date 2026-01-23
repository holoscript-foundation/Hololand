/**
 * CloudInference Unit Tests
 * Tests for cloud provider inference (user's API key)
 */

import { describe, it, expect, vi } from 'vitest'
import { CloudInference } from '../CloudInference'

// Mock fetch for API calls
global.fetch = vi.fn()

describe('CloudInference', () => {
  describe('constructor', () => {
    it('should initialize with provider and API key', () => {
      const inference = new CloudInference({
        provider: 'openai',
        apiKey: 'test-key',
      })
      expect(inference).toBeDefined()
      expect(inference.name).toBe('cloud-openai')
    })

    it('should support different providers', () => {
      const providers = ['openai', 'anthropic', 'google', 'groq', 'together', 'ollama'] as const
      
      for (const provider of providers) {
        const inference = new CloudInference({
          provider,
          apiKey: 'test-key',
        })
        expect(inference.name).toBe(`cloud-${provider}`)
      }
    })

    it('should accept optional model override', () => {
      const inference = new CloudInference({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4-turbo',
      })
      expect(inference).toBeDefined()
    })

    it('should accept optional base URL', () => {
      const inference = new CloudInference({
        provider: 'ollama',
        apiKey: '',
        baseUrl: 'http://localhost:11434/v1',
      })
      expect(inference).toBeDefined()
    })
  })

  describe('isReady', () => {
    it('should return false before initialization', async () => {
      const inference = new CloudInference({
        provider: 'openai',
        apiKey: 'test-key',
      })
      const ready = await inference.isReady()
      expect(ready).toBe(false)
    })
  })
})
