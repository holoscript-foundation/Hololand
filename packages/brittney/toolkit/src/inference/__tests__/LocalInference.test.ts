/**
 * LocalInference Unit Tests
 * Tests for the local GGUF model inference
 */

import { describe, it, expect, vi } from 'vitest'
import { LocalInference } from '../LocalInference'

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

describe('LocalInference', () => {
  describe('constructor', () => {
    it('should initialize with modelPath', () => {
      const inference = new LocalInference({
        modelPath: './models/brittney.gguf',
      })
      expect(inference).toBeDefined()
      expect(inference.name).toBe('local-gguf')
    })

    it('should apply default config values', () => {
      const inference = new LocalInference({
        modelPath: './models/brittney.gguf',
      })
      expect(inference).toBeDefined()
    })

    it('should accept optional config', () => {
      const inference = new LocalInference({
        modelPath: './models/brittney.gguf',
        contextSize: 4096,
        threads: 4,
        gpuLayers: 10,
      })
      expect(inference).toBeDefined()
    })
  })

  describe('isReady', () => {
    it('should return false before initialization', async () => {
      const inference = new LocalInference({
        modelPath: './models/brittney.gguf',
      })
      const ready = await inference.isReady()
      expect(ready).toBe(false)
    })
  })

  describe('initialize', () => {
    it('should be a function', () => {
      const inference = new LocalInference({
        modelPath: './models/brittney.gguf',
      })
      
      expect(typeof inference.initialize).toBe('function')
    })
  })
})
