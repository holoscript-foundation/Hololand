/**
 * @hololand/core - Test Suite
 *
 * Tests for HoloScriptBridge and core exports
 */

import { describe, it, expect, vi } from 'vitest';
import {
  // Bridge
  HoloScriptBridge,
  createBridge,
  type WorldInterface,

  // Core re-exports
  HoloScriptParser,
  HoloScriptRuntime,
  HOLOSCRIPT_VERSION,
  HOLOLAND_VERSION,
} from './index';

// =============================================================================
// MOCK WORLD INTERFACE
// =============================================================================

function createMockWorld(): WorldInterface {
  const objects = new Map();
  const handlers = new Map<string, ((data: unknown) => void)[]>();

  return {
    createObject: vi.fn((config) => {
      const obj = {
        id: `obj-${Date.now()}`,
        setPosition: vi.fn(),
        setVisible: vi.fn(),
        getPosition: vi.fn(() => config.position),
      };
      objects.set(obj.id, obj);
      return obj;
    }),
    getObject: vi.fn((id) => objects.get(id)),
    removeObject: vi.fn((id) => objects.delete(id)),
    emit: vi.fn((event, data) => {
      const h = handlers.get(event) || [];
      h.forEach((fn) => fn(data));
    }),
    on: vi.fn((event, handler) => {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event)!.push(handler);
    }),
  };
}

// =============================================================================
// HOLOSCRIPT BRIDGE TESTS
// =============================================================================

describe('HoloScriptBridge', () => {
  describe('initialization', () => {
    it('should create bridge instance with world interface', () => {
      const mockWorld = createMockWorld();
      const bridge = new HoloScriptBridge(mockWorld);
      expect(bridge).toBeDefined();
      expect(bridge).toBeInstanceOf(HoloScriptBridge);
    });

    it('should create bridge via factory function', () => {
      const mockWorld = createMockWorld();
      const bridge = createBridge(mockWorld);
      expect(bridge).toBeDefined();
      expect(bridge).toBeInstanceOf(HoloScriptBridge);
    });

    it('should accept custom config', () => {
      const mockWorld = createMockWorld();
      const bridge = new HoloScriptBridge(mockWorld, {
        autoSync: false,
        debug: true,
      });
      expect(bridge).toBeDefined();
    });
  });
});

// =============================================================================
// CORE EXPORTS TESTS
// =============================================================================

describe('Core Exports', () => {
  describe('HoloScript Parser', () => {
    it('should export HoloScriptParser', () => {
      expect(HoloScriptParser).toBeDefined();
    });

    it('should export HoloScriptRuntime', () => {
      expect(HoloScriptRuntime).toBeDefined();
    });
  });

  describe('Version Constants', () => {
    it('should have HOLOSCRIPT_VERSION', () => {
      expect(HOLOSCRIPT_VERSION).toBeDefined();
      expect(typeof HOLOSCRIPT_VERSION).toBe('string');
    });

    it('should have HOLOLAND_VERSION', () => {
      expect(HOLOLAND_VERSION).toBeDefined();
      expect(typeof HOLOLAND_VERSION).toBe('string');
      expect(HOLOLAND_VERSION).toBe('1.0.0-alpha.1');
    });
  });
});
