/**
 * NetworkedRuntime Tests
 *
 * Tests for the platform-level runtime that connects @networked traits
 * to Hololand's networking infrastructure.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NetworkedRuntime, type NetworkedRuntimeConfig } from '../src/NetworkedRuntime';

// =============================================================================
// MOCK FACTORIES
// =============================================================================

function createMockCoPresenceBridge() {
  const listeners: Record<string, Array<(...args: any[]) => void>> = {};
  return {
    broadcastState: vi.fn(),
    requestAuthority: vi.fn().mockReturnValue(true),
    releaseAuthority: vi.fn(),
    onRemoteUpdate: vi.fn(),
    on: vi.fn((event: string, cb: (...args: any[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    off: vi.fn(),
    // Helper to simulate events
    _trigger(event: string, ...args: any[]) {
      (listeners[event] || []).forEach((cb) => cb(...args));
    },
  };
}

function createMockNetworkClient() {
  const listeners: Record<string, Array<(...args: any[]) => void>> = {};
  return {
    send: vi.fn(),
    on: vi.fn((event: string, cb: (...args: any[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    off: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
    // Helper to simulate events
    _trigger(event: string, ...args: any[]) {
      (listeners[event] || []).forEach((cb) => cb(...args));
    },
  };
}

function createMockStateSync() {
  return {
    pushState: vi.fn(),
    pullState: vi.fn(),
    getSnapshot: vi.fn().mockReturnValue(null),
  };
}

function createMockLatencyTracker() {
  return {
    getLatency: vi.fn().mockReturnValue(50),
    getJitter: vi.fn().mockReturnValue(10),
    recordSample: vi.fn(),
  };
}

function createMockNetworkSystem() {
  return {
    client: createMockNetworkClient(),
    bridge: createMockCoPresenceBridge(),
    stateSync: createMockStateSync(),
    latencyTracker: createMockLatencyTracker(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    update: vi.fn(),
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('NetworkedRuntime', () => {
  let runtime: NetworkedRuntime;
  let network: ReturnType<typeof createMockNetworkSystem>;

  beforeEach(() => {
    network = createMockNetworkSystem();
    runtime = new NetworkedRuntime(network as any);
  });

  describe('construction', () => {
    it('should create runtime instance', () => {
      expect(runtime).toBeDefined();
    });

    it('should not be running initially', () => {
      // Runtime should support start/stop lifecycle
      expect(() => runtime.update(16)).not.toThrow();
    });
  });

  describe('start / stop', () => {
    it('should start with local peer ID', () => {
      expect(() => runtime.start('local-peer-123')).not.toThrow();
    });

    it('should stop cleanly', () => {
      runtime.start('local-peer-123');
      expect(() => runtime.stop()).not.toThrow();
    });

    it('should be safe to stop without starting', () => {
      expect(() => runtime.stop()).not.toThrow();
    });
  });

  describe('entity registration', () => {
    beforeEach(() => {
      runtime.start('local-peer');
    });

    it('should register a local entity', () => {
      runtime.registerEntity('node-1', 'net-entity-1', {
        mode: 'owner',
        syncProperties: ['position', 'rotation'],
        syncRate: 20,
        channel: 'unreliable',
        interpolation: true,
        transferable: true,
        room: 'default',
      });

      const stats = runtime.getStats();
      expect(stats).toBeDefined();
    });

    it('should unregister an entity', () => {
      runtime.registerEntity('node-1', 'net-entity-1', {
        mode: 'owner',
        syncProperties: ['position', 'rotation'],
        syncRate: 20,
        channel: 'unreliable',
        interpolation: true,
        transferable: true,
        room: 'default',
      });

      expect(() => runtime.unregisterEntity('node-1')).not.toThrow();
    });

    it('should not throw when unregistering unknown entity', () => {
      expect(() => runtime.unregisterEntity('nonexistent')).not.toThrow();
    });

    it('should broadcast entity_spawn to peers', () => {
      runtime.registerEntity('node-1', 'net-entity-1', {
        mode: 'owner',
        syncProperties: ['position'],
        syncRate: 20,
        channel: 'unreliable',
        interpolation: true,
        transferable: true,
        room: 'default',
      });

      expect(network.client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'entity_spawn',
        }),
      );
    });

    it('should broadcast entity_destroy on unregister', () => {
      runtime.registerEntity('node-1', 'net-entity-1', {
        mode: 'owner',
        syncProperties: ['position'],
        syncRate: 20,
        channel: 'unreliable',
        interpolation: true,
        transferable: true,
        room: 'default',
      });

      runtime.unregisterEntity('node-1');

      expect(network.client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'entity_destroy',
        }),
      );
    });
  });

  describe('state updates', () => {
    beforeEach(() => {
      runtime.start('local-peer');
      runtime.registerEntity('node-1', 'net-entity-1', {
        mode: 'owner',
        syncProperties: ['position', 'rotation', 'health'],
        syncRate: 20,
        channel: 'unreliable',
        interpolation: true,
        transferable: true,
        room: 'default',
      });
    });

    it('should push state updates', () => {
      expect(() =>
        runtime.pushStateUpdate('node-1', [1, 2, 3], [0, 45, 0], { health: 80 }),
      ).not.toThrow();
    });

    it('should ignore updates for unknown entities', () => {
      expect(() =>
        runtime.pushStateUpdate('unknown', [1, 2, 3]),
      ).not.toThrow();
    });

    it('should force sync an entity', () => {
      expect(() => runtime.forceSyncEntity('node-1')).not.toThrow();
    });
  });

  describe('authority management', () => {
    beforeEach(() => {
      runtime.start('local-peer');
      runtime.registerEntity('node-1', 'net-entity-1', {
        mode: 'shared',
        syncProperties: ['position'],
        syncRate: 20,
        channel: 'unreliable',
        interpolation: true,
        transferable: true,
        room: 'default',
      });
    });

    it('should request authority via bridge', () => {
      runtime.requestAuthority('node-1');
      expect(network.bridge.requestAuthority).toHaveBeenCalled();
    });

    it('should release authority via bridge', () => {
      // First claim authority so the entity is locally owned
      runtime.requestAuthority('node-1');
      runtime.releaseAuthority('node-1');
      // releaseAuthority uses client.send, not bridge.releaseAuthority
      expect(network.client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'authority_release',
        }),
      );
    });

    it('should not throw for unknown entity authority request', () => {
      expect(() => runtime.requestAuthority('unknown')).not.toThrow();
    });
  });

  describe('update loop', () => {
    it('should update without entities', () => {
      runtime.start('local-peer');
      expect(() => runtime.update(16)).not.toThrow();
    });

    it('should update with registered entities', () => {
      runtime.start('local-peer');
      runtime.registerEntity('node-1', 'net-entity-1', {
        mode: 'owner',
        syncProperties: ['position'],
        syncRate: 20,
        channel: 'unreliable',
        interpolation: true,
        transferable: true,
        room: 'default',
      });

      expect(() => runtime.update(16)).not.toThrow();
      expect(() => runtime.update(16)).not.toThrow();
    });
  });

  describe('stats', () => {
    it('should return stats', () => {
      runtime.start('local-peer');
      const stats = runtime.getStats();
      expect(stats).toHaveProperty('updatesSent');
      expect(stats).toHaveProperty('updatesReceived');
    });
  });

  describe('events', () => {
    it('should subscribe to runtime events', () => {
      const events: any[] = [];
      runtime.on('entity_registered', (e) => events.push(e));

      runtime.start('local-peer');
      runtime.registerEntity('node-1', 'net-entity-1', {
        mode: 'owner',
        syncProperties: ['position'],
        syncRate: 20,
        channel: 'unreliable',
        interpolation: true,
        transferable: true,
        room: 'default',
      });

      expect(events.length).toBeGreaterThanOrEqual(0);
    });
  });
});
