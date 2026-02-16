import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PresenceTracker } from '../src/services/PresenceTracker';
import type { PresenceEvent } from '../src/services/PresenceTracker';

describe('PresenceTracker', () => {
  let tracker: PresenceTracker;

  beforeEach(() => {
    tracker = new PresenceTracker({
      heartbeatTimeout: 5000,
      reaperInterval: 1000,
      idleThreshold: 3000,
      awayThreshold: 6000,
    });
  });

  afterEach(() => {
    tracker.destroy();
  });

  // ==========================================================================
  // Construction
  // ==========================================================================

  describe('construction', () => {
    it('creates with defaults', () => {
      const t = new PresenceTracker();
      expect(t.getPeerCount()).toBe(0);
      t.destroy();
    });

    it('creates with custom config', () => {
      expect(tracker.getPeerCount()).toBe(0);
    });
  });

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  describe('lifecycle', () => {
    it('start and stop are idempotent', () => {
      tracker.start();
      tracker.start(); // no-op
      tracker.stop();
      tracker.stop(); // no-op
    });

    it('destroy clears everything', () => {
      tracker.connect('p1');
      tracker.connect('p2');
      expect(tracker.getPeerCount()).toBe(2);

      tracker.destroy();
      expect(tracker.getPeerCount()).toBe(0);
    });
  });

  // ==========================================================================
  // Connect / Disconnect
  // ==========================================================================

  describe('connect', () => {
    it('adds a peer as online', () => {
      const peer = tracker.connect('p1', { displayName: 'Alice' });
      expect(peer.peerId).toBe('p1');
      expect(peer.displayName).toBe('Alice');
      expect(peer.status).toBe('online');
      expect(peer.roomId).toBeNull();
      expect(tracker.getPeerCount()).toBe(1);
    });

    it('uses peerId as default display name', () => {
      const peer = tracker.connect('p1');
      expect(peer.displayName).toBe('p1');
    });

    it('emits peer_connected event', () => {
      const events: PresenceEvent[] = [];
      tracker.onEvent((e) => events.push(e));

      tracker.connect('p1');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('peer_connected');
      expect(events[0].peerId).toBe('p1');
    });

    it('handles reconnect of existing peer', () => {
      tracker.connect('p1', { displayName: 'Alice' });
      const reconnected = tracker.connect('p1', { displayName: 'Alice2' });
      expect(reconnected.displayName).toBe('Alice2');
      expect(reconnected.status).toBe('online');
      expect(tracker.getPeerCount()).toBe(1);
    });

    it('stores metadata', () => {
      const peer = tracker.connect('p1', { metadata: { avatar: 'elf' } });
      expect(peer.metadata.avatar).toBe('elf');
    });

    it('throws when max peers reached', () => {
      const small = new PresenceTracker({ maxPeers: 2 });
      small.connect('p1');
      small.connect('p2');
      expect(() => small.connect('p3')).toThrow('Maximum peer limit');
      small.destroy();
    });
  });

  describe('disconnect', () => {
    it('removes a peer', () => {
      tracker.connect('p1');
      tracker.disconnect('p1');
      expect(tracker.getPeerCount()).toBe(0);
      expect(tracker.isOnline('p1')).toBe(false);
    });

    it('emits peer_disconnected event', () => {
      tracker.connect('p1');
      const events: PresenceEvent[] = [];
      tracker.onEvent((e) => events.push(e));

      tracker.disconnect('p1', 'left');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('peer_disconnected');
      expect(events[0].data.reason).toBe('left');
    });

    it('removes peer from room index on disconnect', () => {
      tracker.connect('p1');
      tracker.setRoom('p1', 'room-1');
      expect(tracker.getRoomCount('room-1')).toBe(1);

      tracker.disconnect('p1');
      expect(tracker.getRoomCount('room-1')).toBe(0);
    });

    it('no-ops for unknown peer', () => {
      tracker.disconnect('nonexistent'); // should not throw
    });
  });

  // ==========================================================================
  // Heartbeat & Activity
  // ==========================================================================

  describe('heartbeat', () => {
    it('returns true for known peer', () => {
      tracker.connect('p1');
      expect(tracker.heartbeat('p1')).toBe(true);
    });

    it('returns false for unknown peer', () => {
      expect(tracker.heartbeat('unknown')).toBe(false);
    });

    it('brings idle peer back to online', () => {
      tracker.connect('p1');
      const peer = tracker.getPeer('p1')!;
      peer.status = 'idle'; // simulate idle

      const events: PresenceEvent[] = [];
      tracker.onEvent((e) => events.push(e));
      tracker.heartbeat('p1');

      expect(peer.status).toBe('online');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('peer_status_changed');
      expect(events[0].data.from).toBe('idle');
      expect(events[0].data.to).toBe('online');
    });
  });

  describe('activity', () => {
    it('updates lastActivity timestamp', () => {
      tracker.connect('p1');
      const peer = tracker.getPeer('p1')!;
      const before = peer.lastActivity;

      // Small delay to ensure different timestamp
      peer.lastActivity = before - 100;
      tracker.activity('p1');
      expect(peer.lastActivity).toBeGreaterThanOrEqual(before - 100);
    });

    it('brings away peer back to online', () => {
      tracker.connect('p1');
      const peer = tracker.getPeer('p1')!;
      peer.status = 'away';

      const events: PresenceEvent[] = [];
      tracker.onEvent((e) => events.push(e));
      tracker.activity('p1');

      expect(peer.status).toBe('online');
      expect(events[0].data.from).toBe('away');
    });

    it('no-ops for unknown peer', () => {
      tracker.activity('unknown'); // should not throw
    });
  });

  // ==========================================================================
  // Room Location
  // ==========================================================================

  describe('room tracking', () => {
    it('sets room for a peer', () => {
      tracker.connect('p1');
      tracker.setRoom('p1', 'room-1');

      const peer = tracker.getPeer('p1')!;
      expect(peer.roomId).toBe('room-1');
      expect(tracker.getRoomCount('room-1')).toBe(1);
    });

    it('emits peer_room_changed event', () => {
      tracker.connect('p1');
      const events: PresenceEvent[] = [];
      tracker.onEvent((e) => events.push(e));

      tracker.setRoom('p1', 'room-1');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('peer_room_changed');
      expect(events[0].data.from).toBeNull();
      expect(events[0].data.to).toBe('room-1');
    });

    it('moves peer between rooms', () => {
      tracker.connect('p1');
      tracker.setRoom('p1', 'room-1');
      tracker.setRoom('p1', 'room-2');

      expect(tracker.getRoomCount('room-1')).toBe(0);
      expect(tracker.getRoomCount('room-2')).toBe(1);
    });

    it('removes peer from room when set to null', () => {
      tracker.connect('p1');
      tracker.setRoom('p1', 'room-1');
      tracker.setRoom('p1', null);

      expect(tracker.getRoomCount('room-1')).toBe(0);
      expect(tracker.getPeer('p1')!.roomId).toBeNull();
    });

    it('tracks multiple peers in same room', () => {
      tracker.connect('p1');
      tracker.connect('p2');
      tracker.connect('p3');
      tracker.setRoom('p1', 'room-1');
      tracker.setRoom('p2', 'room-1');
      tracker.setRoom('p3', 'room-2');

      expect(tracker.getRoomCount('room-1')).toBe(2);
      expect(tracker.getRoomCount('room-2')).toBe(1);

      const peersInRoom1 = tracker.getPeersInRoom('room-1');
      expect(peersInRoom1).toHaveLength(2);
      expect(peersInRoom1.map((p) => p.peerId).sort()).toEqual(['p1', 'p2']);
    });

    it('getOccupiedRooms returns only non-empty rooms', () => {
      tracker.connect('p1');
      tracker.connect('p2');
      tracker.setRoom('p1', 'room-1');
      tracker.setRoom('p2', 'room-2');

      const rooms = tracker.getOccupiedRooms();
      expect(rooms.sort()).toEqual(['room-1', 'room-2']);
    });

    it('cleans up empty room entries from index', () => {
      tracker.connect('p1');
      tracker.setRoom('p1', 'room-1');
      tracker.setRoom('p1', null);

      // room-1 should be cleaned from index
      expect(tracker.getOccupiedRooms()).toEqual([]);
    });

    it('no-ops for unknown peer', () => {
      tracker.setRoom('unknown', 'room-1'); // should not throw
    });
  });

  // ==========================================================================
  // Queries
  // ==========================================================================

  describe('queries', () => {
    it('getPeer returns peer or undefined', () => {
      tracker.connect('p1');
      expect(tracker.getPeer('p1')).toBeDefined();
      expect(tracker.getPeer('unknown')).toBeUndefined();
    });

    it('isOnline checks status', () => {
      tracker.connect('p1');
      expect(tracker.isOnline('p1')).toBe(true);
      expect(tracker.isOnline('unknown')).toBe(false);
    });

    it('getPeersByStatus filters correctly', () => {
      tracker.connect('p1');
      tracker.connect('p2');
      tracker.getPeer('p2')!.status = 'idle';

      expect(tracker.getPeersByStatus('online')).toHaveLength(1);
      expect(tracker.getPeersByStatus('idle')).toHaveLength(1);
      expect(tracker.getPeersByStatus('away')).toHaveLength(0);
    });

    it('getAllPeers returns all tracked peers', () => {
      tracker.connect('p1');
      tracker.connect('p2');
      expect(tracker.getAllPeers()).toHaveLength(2);
    });

    it('getSnapshot returns comprehensive status', () => {
      tracker.connect('p1');
      tracker.connect('p2');
      tracker.connect('p3');
      tracker.getPeer('p2')!.status = 'idle';
      tracker.getPeer('p3')!.status = 'away';
      tracker.setRoom('p1', 'room-1');
      tracker.setRoom('p2', 'room-1');

      const snapshot = tracker.getSnapshot();
      expect(snapshot.totalOnline).toBe(1);
      expect(snapshot.totalIdle).toBe(1);
      expect(snapshot.totalAway).toBe(1);
      expect(snapshot.roomCounts.get('room-1')).toBe(2);
      expect(snapshot.peers).toHaveLength(3);
    });
  });

  // ==========================================================================
  // Heartbeat Reaper
  // ==========================================================================

  describe('reaper', () => {
    it('times out peers with stale heartbeats', () => {
      tracker.connect('p1');
      const peer = tracker.getPeer('p1')!;
      peer.lastHeartbeat = Date.now() - 10000; // 10s ago, timeout is 5s

      const events: PresenceEvent[] = [];
      tracker.onEvent((e) => events.push(e));

      tracker._reapNow();

      expect(tracker.getPeerCount()).toBe(0);
      const timeoutEvent = events.find((e) => e.type === 'peer_timeout');
      expect(timeoutEvent).toBeDefined();
      expect(timeoutEvent!.peerId).toBe('p1');
    });

    it('transitions online → idle after idle threshold', () => {
      tracker.connect('p1');
      const peer = tracker.getPeer('p1')!;
      peer.lastActivity = Date.now() - 4000; // 4s ago, idle threshold is 3s

      const events: PresenceEvent[] = [];
      tracker.onEvent((e) => events.push(e));

      tracker._reapNow();

      expect(peer.status).toBe('idle');
      expect(events[0].type).toBe('peer_status_changed');
      expect(events[0].data.from).toBe('online');
      expect(events[0].data.to).toBe('idle');
    });

    it('transitions idle → away after away threshold', () => {
      tracker.connect('p1');
      const peer = tracker.getPeer('p1')!;
      peer.status = 'idle';
      peer.lastActivity = Date.now() - 7000; // 7s ago, away threshold is 6s

      const events: PresenceEvent[] = [];
      tracker.onEvent((e) => events.push(e));

      tracker._reapNow();

      expect(peer.status).toBe('away');
      expect(events[0].data.from).toBe('idle');
      expect(events[0].data.to).toBe('away');
    });

    it('removes timed-out peer from room index', () => {
      tracker.connect('p1');
      tracker.setRoom('p1', 'room-1');
      tracker.getPeer('p1')!.lastHeartbeat = Date.now() - 10000;

      tracker._reapNow();

      expect(tracker.getRoomCount('room-1')).toBe(0);
    });

    it('does not affect peers with fresh heartbeats', () => {
      tracker.connect('p1');
      tracker.heartbeat('p1');

      tracker._reapNow();

      expect(tracker.getPeerCount()).toBe(1);
      expect(tracker.getPeer('p1')!.status).toBe('online');
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('events', () => {
    it('subscribe and unsubscribe', () => {
      const events: PresenceEvent[] = [];
      const callback = (e: PresenceEvent) => events.push(e);

      const unsub = tracker.onEvent(callback);
      tracker.connect('p1');
      expect(events).toHaveLength(1);

      unsub();
      tracker.connect('p2');
      expect(events).toHaveLength(1); // no new events
    });

    it('listener errors do not crash tracker', () => {
      tracker.onEvent(() => { throw new Error('boom'); });
      expect(() => tracker.connect('p1')).not.toThrow();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('handles rapid connect/disconnect', () => {
      for (let i = 0; i < 100; i++) {
        tracker.connect(`p${i}`);
      }
      expect(tracker.getPeerCount()).toBe(100);

      for (let i = 0; i < 100; i++) {
        tracker.disconnect(`p${i}`);
      }
      expect(tracker.getPeerCount()).toBe(0);
    });

    it('getPeersInRoom returns empty for unknown room', () => {
      expect(tracker.getPeersInRoom('nonexistent')).toEqual([]);
    });

    it('getRoomCount returns 0 for unknown room', () => {
      expect(tracker.getRoomCount('nonexistent')).toBe(0);
    });
  });
});
