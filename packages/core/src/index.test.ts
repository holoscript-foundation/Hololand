/**
 * @hololand/core - Test Suite
 *
 * Tests for HoloScriptBridge and core exports
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  // Bridge
  HoloScriptBridge,
  createBridge,
  type BridgeConfig,
  
  // Core re-exports
  HoloScriptParser,
  HoloScriptRuntime,
  HOLOSCRIPT_VERSION,
  HOLOLAND_VERSION,
  
  // Types
  type ASTNode,
  type ExecutionResult,
  type SpatialPosition,
} from './index'

// =============================================================================
// HOLOSCRIPT BRIDGE TESTS
// =============================================================================

describe('HoloScriptBridge', () => {
  describe('initialization', () => {
    it('should create bridge instance', () => {
      const bridge = new HoloScriptBridge({ worldId: 'test-world' })
      expect(bridge).toBeDefined()
      expect(bridge).toBeInstanceOf(HoloScriptBridge)
    })

    it('should create bridge via factory function', () => {
      const bridge = createBridge({ worldId: 'test-world' })
      expect(bridge).toBeDefined()
      expect(bridge).toBeInstanceOf(HoloScriptBridge)
    })
  })
})

// =============================================================================
// CORE EXPORTS TESTS
// =============================================================================

describe('Core Exports', () => {
  describe('HoloScript Parser', () => {
    it('should export HoloScriptParser', () => {
      expect(HoloScriptParser).toBeDefined()
    })
    
    it('should export HoloScriptRuntime', () => {
      expect(HoloScriptRuntime).toBeDefined()
    })
  })

  describe('Version Constants', () => {
    it('should have HOLOSCRIPT_VERSION', () => {
      expect(HOLOSCRIPT_VERSION).toBeDefined()
      expect(typeof HOLOSCRIPT_VERSION).toBe('string')
    })

    it('should have HOLOLAND_VERSION', () => {
      expect(HOLOLAND_VERSION).toBeDefined()
      expect(typeof HOLOLAND_VERSION).toBe('string')
      expect(HOLOLAND_VERSION).toBe('1.0.0-alpha.1')
    })
  })
})
