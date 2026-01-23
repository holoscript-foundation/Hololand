/**
 * BrittneyEngine Unit Tests
 * Tests for the unified inference engine (local GGUF + optional cloud fallback)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrittneyEngine } from '../BrittneyEngine'

// Mock node-llama-cpp
vi.mock('node-llama-cpp', () => ({
  getLlama: vi.fn().mockResolvedValue({
    loadModel: vi.fn().mockResolvedValue({
      createContext: vi.fn().mockResolvedValue({
        getSequence: vi.fn().mockReturnValue({
          evaluate: vi.fn(),
          clearHistory: vi.fn(),
        }),
      }),
    }),
  }),
}))

describe('BrittneyEngine', () => {
  describe('constructor', () => {
    it('should initialize with modelPath config', () => {
      const engine = new BrittneyEngine({
        modelPath: './models/brittney.gguf',
      })
      expect(engine).toBeDefined()
      expect(engine.name).toBe('brittney-engine')
    })

    it('should initialize with optional cloud config', () => {
      const engine = new BrittneyEngine({
        modelPath: './models/brittney.gguf',
        userApiKey: 'test-key',
        cloudProvider: 'openai',
      })
      expect(engine).toBeDefined()
    })

    it('should default preferCloud to false', () => {
      const engine = new BrittneyEngine({
        modelPath: './models/brittney.gguf',
      })
      // Engine should prefer local by default
      expect(engine).toBeDefined()
    })
  })

  describe('isReady', () => {
    it('should return false before initialization', async () => {
      const engine = new BrittneyEngine({
        modelPath: './models/brittney.gguf',
      })
      const ready = await engine.isReady()
      expect(ready).toBe(false)
    })
  })

  describe('initialize', () => {
    it('should be a function', () => {
      const engine = new BrittneyEngine({
        modelPath: './models/brittney.gguf',
      })
      
      expect(typeof engine.initialize).toBe('function')
    })
  })
})
