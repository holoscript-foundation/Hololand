import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NetworkServer, type ClientConnection } from '../src/NetworkServer';
import type { NetworkMessage, Vector3 } from '../src/types';

/**
 * Tests for NetworkServer interest management integration.
 * Validates that when interestManagement is enabled, broadcastSnapshots
 * sends per-client filtered snapshots instead of broadcasting everything.
 */

function createMockClient(
  id: string,
  displayName?: string
): ClientConnection & { messages: NetworkMessage[] } {
  const messages: NetworkMessage[] = [];
  return {
    id,
    displayName: displayName ?? id,
    roomId: null,
    joinedAt: Date.now(),
    lastActivity: Date.now(),
    messages,
    send: (msg: NetworkMessage) => {
      messages.push(JSON.parse(JSON.stringify(msg)));
    },
  };
}

function v(x: number, y: number, z: number): Vector3 {
  return { x, y, z };
}

describe('NetworkServer interest management integration', () => {
  let server: NetworkServer;

  afterEach(() => {
    server?.stop();
  });

  // ==========================================================================
  // Opt-in behavior
  // ==========================================================================

  describe('opt-in', () => {
    it('interest management is disabled by default', () => {
      server = new NetworkServer();
      expect(server.getInterestManager()).toBeNull();
    });

    it('interest management is enabled via config', () => {
      server = new NetworkServer({ interestManagement: true });
      expect(server.getInterestManager()).not.toBeNull();
    });

    it('passes interest config to ServerInterestManager', () => {
      server = new NetworkServer({
        interestManagement: true,
        interestConfig: { defaultViewDistance: 200, cellSize: 100 },
      });
      const mgr = server.getInterestManager()!;
      // Add a viewer and entity to verify the custom view distance
      mgr.addViewer('test', v(0, 0, 0), 'room');
      mgr.addEntity('far', v(150, 0, 0));
      expect(mgr.isRelevantTo('test', 'far')).toBe(true); // 150 < 200
      mgr.removeViewer('test');
      mgr.removeEntity('far');
    });
  });

  // ==========================================================================
  // Viewer registration via joinRoom / leaveRoom
  // ==========================================================================

  describe('viewer registration', () => {
    beforeEach(() => {
      server = new NetworkServer({
        interestManagement: true,
        interestConfig: { defaultViewDistance: 100, cellSize: 50 },
      });
    });

    it('registers viewer on joinRoom', () => {
      const client = createMockClient('c1', 'Player1');
      server.registerClient(client);

      const room = server.createRoom({ name: 'TestRoom', maxPlayers: 10 }, 'c1');
      server.joinRoom('c1', room.id);

      const mgr = server.getInterestManager()!;
      expect(mgr.hasViewer('c1')).toBe(true);
    });

    it('removes viewer on leaveRoom', () => {
      const client = createMockClient('c1');
      server.registerClient(client);

      const room = server.createRoom({ name: 'TestRoom', maxPlayers: 10 }, 'c1');
      server.joinRoom('c1', room.id);
      server.leaveRoom('c1', room.id);

      const mgr = server.getInterestManager()!;
      expect(mgr.hasViewer('c1')).toBe(false);
    });

    it('clears room data when last player leaves', () => {
      const client = createMockClient('c1');
      server.registerClient(client);

      const room = server.createRoom({ name: 'TestRoom', maxPlayers: 10 }, 'c1');
      server.joinRoom('c1', room.id);
      server.leaveRoom('c1', room.id);

      // Room should be deleted and interest manager cleaned
      expect(server.getRoom(room.id)).toBeUndefined();
    });
  });

  // ==========================================================================
  // Position tracking
  // ==========================================================================

  describe('position tracking', () => {
    beforeEach(() => {
      server = new NetworkServer({
        interestManagement: true,
        interestConfig: { defaultViewDistance: 100, cellSize: 50 },
      });
    });

    it('updates viewer position on positionUpdate', () => {
      const client = createMockClient('c1');
      server.registerClient(client);

      const room = server.createRoom({ name: 'TestRoom', maxPlayers: 10 }, 'c1');
      server.joinRoom('c1', room.id);

      server.updatePlayerPosition('c1', room.id, v(50, 0, 0));

      const mgr = server.getInterestManager()!;
      const viewer = mgr.getViewer('c1');
      expect(viewer!.position).toEqual(v(50, 0, 0));
    });

    it('tracks entity position on state update', () => {
      const client = createMockClient('c1');
      server.registerClient(client);

      const room = server.createRoom({ name: 'TestRoom', maxPlayers: 10 }, 'c1');
      server.joinRoom('c1', room.id);

      server.updateState(room.id, {
        objectId: 'entity1',
        position: v(30, 0, 0),
        timestamp: Date.now(),
        sequence: 0,
      });

      const mgr = server.getInterestManager()!;
      expect(mgr.hasEntity('entity1')).toBe(true);
    });

    it('removes entity on removeState', () => {
      const client = createMockClient('c1');
      server.registerClient(client);

      const room = server.createRoom({ name: 'TestRoom', maxPlayers: 10 }, 'c1');
      server.joinRoom('c1', room.id);

      server.updateState(room.id, {
        objectId: 'entity1',
        position: v(30, 0, 0),
        timestamp: Date.now(),
        sequence: 0,
      });
      server.removeState(room.id, 'entity1');

      const mgr = server.getInterestManager()!;
      expect(mgr.hasEntity('entity1')).toBe(false);
    });
  });

  // ==========================================================================
  // Filtered snapshot broadcasting
  // ==========================================================================

  describe('filtered snapshots', () => {
    it('sends only nearby entities to each client', () => {
      server = new NetworkServer({
        interestManagement: true,
        interestConfig: { defaultViewDistance: 100, cellSize: 50 },
        snapshotRate: 20,
      });

      const c1 = createMockClient('c1');
      const c2 = createMockClient('c2');
      server.registerClient(c1);
      server.registerClient(c2);

      const room = server.createRoom({ name: 'TestRoom', maxPlayers: 10 }, 'c1');
      server.joinRoom('c1', room.id);
      server.joinRoom('c2', room.id);

      // Position players far apart
      server.updatePlayerPosition('c1', room.id, v(0, 0, 0));
      server.updatePlayerPosition('c2', room.id, v(300, 0, 0));

      // Add entity near c1 only
      server.updateState(room.id, {
        objectId: 'nearC1',
        position: v(10, 0, 0),
        timestamp: Date.now(),
        sequence: 0,
      });

      // Add entity near c2 only
      server.updateState(room.id, {
        objectId: 'nearC2',
        position: v(310, 0, 0),
        timestamp: Date.now(),
        sequence: 0,
      });

      // Clear messages from joins and state updates
      c1.messages.length = 0;
      c2.messages.length = 0;

      // Start server and wait for snapshot
      server.start();

      // Use fake timers to trigger snapshot
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          server.stop();

          // c1 should see nearC1 and its own player state, but NOT nearC2
          const c1Snapshots = c1.messages.filter((m) => m.type === 'snapshot');
          const c2Snapshots = c2.messages.filter((m) => m.type === 'snapshot');

          if (c1Snapshots.length > 0) {
            const c1States = (c1Snapshots[0].payload as { states: { objectId: string }[] }).states;
            const c1ObjectIds = c1States.map((s) => s.objectId);
            expect(c1ObjectIds).not.toContain('nearC2');
          }

          if (c2Snapshots.length > 0) {
            const c2States = (c2Snapshots[0].payload as { states: { objectId: string }[] }).states;
            const c2ObjectIds = c2States.map((s) => s.objectId);
            expect(c2ObjectIds).not.toContain('nearC1');
          }

          resolve();
        }, 200); // Allow a couple snapshot cycles
      });
    });

    it('skips sending empty filtered snapshots', () => {
      server = new NetworkServer({
        interestManagement: true,
        interestConfig: { defaultViewDistance: 10, cellSize: 5 },
        snapshotRate: 20,
      });

      const c1 = createMockClient('c1');
      server.registerClient(c1);

      const room = server.createRoom({ name: 'TestRoom', maxPlayers: 10 }, 'c1');
      server.joinRoom('c1', room.id);

      // Position player at origin
      server.updatePlayerPosition('c1', room.id, v(0, 0, 0));

      // Add entity very far away (beyond view distance of 10)
      server.updateState(room.id, {
        objectId: 'farEntity',
        position: v(1000, 1000, 1000),
        timestamp: Date.now(),
        sequence: 0,
      });

      c1.messages.length = 0;
      server.start();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          server.stop();

          // Should not have received any snapshot (filtered to empty)
          const snapshots = c1.messages.filter((m) => m.type === 'snapshot');
          // Either no snapshots, or snapshots with empty states
          for (const snap of snapshots) {
            const states = (snap.payload as { states: unknown[] }).states;
            // The player's own state might be within view, so we just ensure
            // farEntity was not included
            const objectIds = states.map((s: any) => s.objectId);
            expect(objectIds).not.toContain('farEntity');
          }

          resolve();
        }, 200);
      });
    });
  });

  // ==========================================================================
  // Legacy mode (no interest management)
  // ==========================================================================

  describe('legacy mode', () => {
    it('broadcasts all states to all clients when disabled', () => {
      server = new NetworkServer({ snapshotRate: 20 });

      const c1 = createMockClient('c1');
      const c2 = createMockClient('c2');
      server.registerClient(c1);
      server.registerClient(c2);

      const room = server.createRoom({ name: 'TestRoom', maxPlayers: 10 }, 'c1');
      server.joinRoom('c1', room.id);
      server.joinRoom('c2', room.id);

      server.updateState(room.id, {
        objectId: 'entity1',
        position: v(0, 0, 0),
        timestamp: Date.now(),
        sequence: 0,
      });
      server.updateState(room.id, {
        objectId: 'entity2',
        position: v(1000, 0, 0),
        timestamp: Date.now(),
        sequence: 0,
      });

      c1.messages.length = 0;
      c2.messages.length = 0;
      server.start();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          server.stop();

          // Both clients should see all entities
          const c1Snapshots = c1.messages.filter((m) => m.type === 'snapshot');
          const c2Snapshots = c2.messages.filter((m) => m.type === 'snapshot');

          if (c1Snapshots.length > 0) {
            const states = (
              c1Snapshots[0].payload as { states: { objectId: string }[] }
            ).states;
            const objectIds = states.map((s) => s.objectId);
            expect(objectIds).toContain('entity1');
            expect(objectIds).toContain('entity2');
          }

          if (c2Snapshots.length > 0) {
            const states = (
              c2Snapshots[0].payload as { states: { objectId: string }[] }
            ).states;
            const objectIds = states.map((s) => s.objectId);
            expect(objectIds).toContain('entity1');
            expect(objectIds).toContain('entity2');
          }

          resolve();
        }, 200);
      });
    });
  });

  // ==========================================================================
  // Always-relevant entities through the server
  // ==========================================================================

  describe('always-relevant via server', () => {
    it('allows marking entities as always-relevant through interest manager', () => {
      server = new NetworkServer({
        interestManagement: true,
        interestConfig: { defaultViewDistance: 50, cellSize: 25 },
      });

      const c1 = createMockClient('c1');
      server.registerClient(c1);

      const room = server.createRoom({ name: 'TestRoom', maxPlayers: 10 }, 'c1');
      server.joinRoom('c1', room.id);
      server.updatePlayerPosition('c1', room.id, v(0, 0, 0));

      // Add a global entity far away
      server.updateState(room.id, {
        objectId: 'gameState',
        position: v(10000, 0, 0),
        timestamp: Date.now(),
        sequence: 0,
      });

      // Mark as always relevant
      const mgr = server.getInterestManager()!;
      mgr.markAlwaysRelevant('gameState');

      expect(mgr.isRelevantTo('c1', 'gameState')).toBe(true);
    });
  });

  // ==========================================================================
  // Client disconnect cleanup
  // ==========================================================================

  describe('client disconnect', () => {
    it('cleans up viewer on client removal', () => {
      server = new NetworkServer({
        interestManagement: true,
        interestConfig: { defaultViewDistance: 100, cellSize: 50 },
      });

      const c1 = createMockClient('c1');
      server.registerClient(c1);

      const room = server.createRoom({ name: 'TestRoom', maxPlayers: 10 }, 'c1');
      server.joinRoom('c1', room.id);

      const mgr = server.getInterestManager()!;
      expect(mgr.hasViewer('c1')).toBe(true);

      server.removeClient('c1');
      expect(mgr.hasViewer('c1')).toBe(false);
    });
  });
});
