import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RoomService } from '../src/services/RoomService';
import type { RoomEvent, RoomRecord, RoomPublicInfo } from '../src/services/RoomService';

describe('RoomService', () => {
  let service: RoomService;

  beforeEach(() => {
    service = new RoomService({
      maxRooms: 100,
      defaultMaxPlayers: 10,
      autoDeleteEmpty: true,
      emptyGracePeriod: 0,
    });
  });

  afterEach(() => {
    service.destroy();
  });

  // ==========================================================================
  // Construction
  // ==========================================================================

  describe('construction', () => {
    it('creates with defaults', () => {
      const s = new RoomService();
      expect(s.getRoomCount()).toBe(0);
      s.destroy();
    });

    it('creates with custom config', () => {
      expect(service.getRoomCount()).toBe(0);
    });
  });

  // ==========================================================================
  // Room Creation
  // ==========================================================================

  describe('create', () => {
    it('creates a room with host as first player', () => {
      const room = service.create({ name: 'Arena', hostId: 'host-1' });
      expect(room.name).toBe('Arena');
      expect(room.hostId).toBe('host-1');
      expect(room.status).toBe('open');
      expect(room.playerIds.has('host-1')).toBe(true);
      expect(room.category).toBe('general');
      expect(service.getRoomCount()).toBe(1);
    });

    it('assigns unique IDs', () => {
      const r1 = service.create({ name: 'Room 1', hostId: 'h1' });
      const r2 = service.create({ name: 'Room 2', hostId: 'h2' });
      expect(r1.id).not.toBe(r2.id);
    });

    it('creates room with category and tags', () => {
      const room = service.create({
        name: 'PVP Arena',
        hostId: 'h1',
        category: 'pvp',
        tags: ['combat', 'ranked'],
      });
      expect(room.category).toBe('pvp');
      expect(room.tags).toEqual(['combat', 'ranked']);
    });

    it('creates private room with password', () => {
      const room = service.create({
        name: 'Secret Room',
        hostId: 'h1',
        isPrivate: true,
        password: 'abc123',
      });
      expect(room.isPrivate).toBe(true);
      expect(room.passwordHash).not.toBeNull();
    });

    it('emits room_created event', () => {
      const events: RoomEvent[] = [];
      service.onEvent((e) => events.push(e));

      service.create({ name: 'Test', hostId: 'h1' });
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('room_created');
    });

    it('throws when max rooms reached', () => {
      const small = new RoomService({ maxRooms: 2 });
      small.create({ name: 'R1', hostId: 'h1' });
      small.create({ name: 'R2', hostId: 'h2' });
      expect(() => small.create({ name: 'R3', hostId: 'h3' })).toThrow('Maximum room limit');
      small.destroy();
    });

    it('leaves current room when creating a new one', () => {
      const r1 = service.create({ name: 'R1', hostId: 'h1' });
      const r2 = service.create({ name: 'R2', hostId: 'h1' });
      // h1 should be in r2 only (r1 auto-deleted because it became empty)
      expect(r2.playerIds.has('h1')).toBe(true);
      expect(service.getPlayerRoom('h1')?.id).toBe(r2.id);
    });
  });

  // ==========================================================================
  // Room Deletion
  // ==========================================================================

  describe('delete', () => {
    it('deletes a room and removes all players', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.join(room.id, 'p2');

      const deleted = service.delete(room.id);
      expect(deleted).toBe(true);
      expect(service.getRoomCount()).toBe(0);
      expect(service.getPlayerRoom('h1')).toBeUndefined();
      expect(service.getPlayerRoom('p2')).toBeUndefined();
    });

    it('returns false for nonexistent room', () => {
      expect(service.delete('nonexistent')).toBe(false);
    });

    it('emits room_deleted event', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      const events: RoomEvent[] = [];
      service.onEvent((e) => events.push(e));

      service.delete(room.id);
      const deleted = events.find((e) => e.type === 'room_deleted');
      expect(deleted).toBeDefined();
    });
  });

  // ==========================================================================
  // Join / Leave
  // ==========================================================================

  describe('join', () => {
    it('joins a player into a room', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.join(room.id, 'p2');

      expect(room.playerIds.has('p2')).toBe(true);
      expect(service.getPlayers(room.id)).toContain('p2');
    });

    it('throws for nonexistent room', () => {
      expect(() => service.join('nonexistent', 'p1')).toThrow('Room not found');
    });

    it('throws when room is full', () => {
      const room = service.create({ name: 'Tiny', hostId: 'h1', maxPlayers: 2 });
      service.join(room.id, 'p2');
      expect(() => service.join(room.id, 'p3')).toThrow('Room is full');
    });

    it('throws when room is closed', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.closeRoom(room.id, 'h1');
      expect(() => service.join(room.id, 'p2')).toThrow('Room is closed');
    });

    it('throws when room is locked', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.lockRoom(room.id, 'h1');
      expect(() => service.join(room.id, 'p2')).toThrow('Room is locked');
    });

    it('throws for wrong password', () => {
      const room = service.create({
        name: 'Secret',
        hostId: 'h1',
        password: 'correct',
      });
      expect(() => service.join(room.id, 'p2', 'wrong')).toThrow('Invalid password');
    });

    it('joins with correct password', () => {
      const room = service.create({
        name: 'Secret',
        hostId: 'h1',
        password: 'correct',
      });
      service.join(room.id, 'p2', 'correct');
      expect(room.playerIds.has('p2')).toBe(true);
    });

    it('auto-transitions to full status', () => {
      const room = service.create({ name: 'Tiny', hostId: 'h1', maxPlayers: 2 });
      const events: RoomEvent[] = [];
      service.onEvent((e) => events.push(e));

      service.join(room.id, 'p2');
      expect(room.status).toBe('full');
      const statusEvent = events.find((e) => e.type === 'room_status_changed');
      expect(statusEvent?.data.to).toBe('full');
    });

    it('no-ops when already in the room', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.join(room.id, 'h1'); // already in
      expect(room.playerIds.size).toBe(1);
    });

    it('leaves previous room when joining another', () => {
      const r1 = service.create({ name: 'R1', hostId: 'h1' });
      service.join(r1.id, 'p2');
      const r2 = service.create({ name: 'R2', hostId: 'h2' });
      service.join(r2.id, 'p2');

      expect(service.getPlayerRoom('p2')?.id).toBe(r2.id);
    });

    it('emits player_joined event', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      const events: RoomEvent[] = [];
      service.onEvent((e) => events.push(e));

      service.join(room.id, 'p2');
      const joinEvent = events.find((e) => e.type === 'player_joined');
      expect(joinEvent).toBeDefined();
      expect(joinEvent!.data.playerId).toBe('p2');
    });
  });

  describe('leave', () => {
    it('removes a player from a room', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.join(room.id, 'p2');
      service.leave(room.id, 'p2');

      expect(room.playerIds.has('p2')).toBe(false);
      expect(service.getPlayerRoom('p2')).toBeUndefined();
    });

    it('emits player_left event', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.join(room.id, 'p2');

      const events: RoomEvent[] = [];
      service.onEvent((e) => events.push(e));
      service.leave(room.id, 'p2');

      const leftEvent = events.find((e) => e.type === 'player_left');
      expect(leftEvent).toBeDefined();
    });

    it('transitions full → open when player leaves', () => {
      const room = service.create({ name: 'Tiny', hostId: 'h1', maxPlayers: 2 });
      service.join(room.id, 'p2');
      expect(room.status).toBe('full');

      service.leave(room.id, 'p2');
      expect(room.status).toBe('open');
    });

    it('transfers host when host leaves', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.join(room.id, 'p2');

      const events: RoomEvent[] = [];
      service.onEvent((e) => events.push(e));
      service.leave(room.id, 'h1');

      expect(room.hostId).toBe('p2');
      const hostEvent = events.find((e) => e.type === 'host_changed');
      expect(hostEvent).toBeDefined();
      expect(hostEvent!.data.newHostId).toBe('p2');
    });

    it('auto-deletes empty room', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.leave(room.id, 'h1');
      expect(service.getRoomCount()).toBe(0);
    });

    it('no-ops for unknown room or player', () => {
      service.leave('nonexistent', 'p1'); // should not throw
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.leave(room.id, 'nonexistent'); // should not throw
    });
  });

  // ==========================================================================
  // Kick
  // ==========================================================================

  describe('kick', () => {
    it('host can kick a player', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.join(room.id, 'p2');

      const result = service.kick(room.id, 'p2', 'h1');
      expect(result).toBe(true);
      expect(room.playerIds.has('p2')).toBe(false);
    });

    it('non-host cannot kick', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.join(room.id, 'p2');
      service.join(room.id, 'p3');

      const result = service.kick(room.id, 'p3', 'p2');
      expect(result).toBe(false);
    });

    it('cannot kick yourself', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      expect(service.kick(room.id, 'h1', 'h1')).toBe(false);
    });

    it('returns false for nonexistent room', () => {
      expect(service.kick('nonexistent', 'p1', 'h1')).toBe(false);
    });
  });

  // ==========================================================================
  // Room Status
  // ==========================================================================

  describe('room status', () => {
    it('lockRoom prevents joins', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      const result = service.lockRoom(room.id, 'h1');
      expect(result).toBe(true);
      expect(room.status).toBe('locked');
    });

    it('unlockRoom allows joins again', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.lockRoom(room.id, 'h1');
      service.unlockRoom(room.id, 'h1');
      expect(room.status).toBe('open');
    });

    it('closeRoom permanently closes', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      const result = service.closeRoom(room.id, 'h1');
      expect(result).toBe(true);
      expect(room.status).toBe('closed');
    });

    it('only host can lock/unlock/close', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.join(room.id, 'p2');
      expect(service.lockRoom(room.id, 'p2')).toBe(false);
      expect(service.unlockRoom(room.id, 'p2')).toBe(false);
      expect(service.closeRoom(room.id, 'p2')).toBe(false);
    });

    it('cannot unlock a non-locked room', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      expect(service.unlockRoom(room.id, 'h1')).toBe(false);
    });
  });

  // ==========================================================================
  // Update
  // ==========================================================================

  describe('update', () => {
    it('updates room properties', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      const updated = service.update(room.id, {
        name: 'Updated',
        category: 'pvp',
        tags: ['new-tag'],
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.category).toBe('pvp');
      expect(updated?.tags).toEqual(['new-tag']);
    });

    it('emits room_updated event', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      const events: RoomEvent[] = [];
      service.onEvent((e) => events.push(e));

      service.update(room.id, { name: 'New Name' });
      const updateEvent = events.find((e) => e.type === 'room_updated');
      expect(updateEvent).toBeDefined();
    });

    it('returns undefined for nonexistent room', () => {
      expect(service.update('nonexistent', { name: 'X' })).toBeUndefined();
    });
  });

  // ==========================================================================
  // Search & Query
  // ==========================================================================

  describe('search', () => {
    beforeEach(() => {
      service.create({ name: 'Alpha Arena', hostId: 'h1', category: 'pvp', tags: ['combat'] });
      service.create({ name: 'Beta Lounge', hostId: 'h2', category: 'social', tags: ['chill'] });
      service.create({ name: 'Gamma Arena', hostId: 'h3', category: 'pvp', tags: ['combat', 'ranked'] });
      service.create({ name: 'Private Club', hostId: 'h4', isPrivate: true, category: 'social' });
    });

    it('returns all public rooms by default', () => {
      const result = service.search({ openOnly: false });
      expect(result.total).toBe(3); // excludes private
    });

    it('filters by name', () => {
      const result = service.search({ name: 'arena', openOnly: false });
      expect(result.total).toBe(2);
    });

    it('filters by category', () => {
      const result = service.search({ category: 'pvp', openOnly: false });
      expect(result.total).toBe(2);
    });

    it('filters by tags', () => {
      const result = service.search({ tags: ['ranked'], openOnly: false });
      expect(result.total).toBe(1);
      expect(result.rooms[0].name).toBe('Gamma Arena');
    });

    it('filters by hasSpace', () => {
      const result = service.search({ hasSpace: true, openOnly: false });
      expect(result.total).toBe(3); // all have space
    });

    it('sorts by name ascending', () => {
      const result = service.search({ sortBy: 'name', sortOrder: 'asc', openOnly: false });
      expect(result.rooms[0].name).toBe('Alpha Arena');
    });

    it('sorts by playerCount descending', () => {
      const r1 = service.search({ name: 'alpha', openOnly: false }).rooms[0];
      service.join(r1.id, 'extra-player');

      const result = service.search({ sortBy: 'playerCount', sortOrder: 'desc', openOnly: false });
      expect(result.rooms[0].name).toBe('Alpha Arena');
    });

    it('supports pagination', () => {
      const result = service.search({ limit: 2, offset: 0, openOnly: false });
      expect(result.rooms).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
    });

    it('returns RoomPublicInfo without sensitive fields', () => {
      const result = service.search({ openOnly: false });
      const room = result.rooms[0];
      expect(room).toHaveProperty('playerCount');
      expect(room).not.toHaveProperty('passwordHash');
      expect(room).not.toHaveProperty('playerIds');
    });
  });

  describe('queries', () => {
    it('getRoom returns room or undefined', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      expect(service.getRoom(room.id)).toBeDefined();
      expect(service.getRoom('nonexistent')).toBeUndefined();
    });

    it('getRoomPublicInfo returns sanitized info', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      const info = service.getRoomPublicInfo(room.id);
      expect(info?.name).toBe('Test');
      expect(info?.playerCount).toBe(1);
    });

    it('getPlayerRoom tracks current room', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      expect(service.getPlayerRoom('h1')?.id).toBe(room.id);
      expect(service.getPlayerRoom('unknown')).toBeUndefined();
    });

    it('getPlayers returns player IDs', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.join(room.id, 'p2');
      expect(service.getPlayers(room.id).sort()).toEqual(['h1', 'p2']);
    });

    it('getPlayers returns empty for unknown room', () => {
      expect(service.getPlayers('nonexistent')).toEqual([]);
    });

    it('getRoomsByCategory filters correctly', () => {
      service.create({ name: 'PVP 1', hostId: 'h1', category: 'pvp' });
      service.create({ name: 'Social 1', hostId: 'h2', category: 'social' });
      expect(service.getRoomsByCategory('pvp')).toHaveLength(1);
    });

    it('getCategories returns distinct categories', () => {
      service.create({ name: 'R1', hostId: 'h1', category: 'pvp' });
      service.create({ name: 'R2', hostId: 'h2', category: 'social' });
      service.create({ name: 'R3', hostId: 'h3', category: 'pvp' });
      const cats = service.getCategories();
      expect(cats.sort()).toEqual(['pvp', 'social']);
    });
  });

  // ==========================================================================
  // Disconnect Handler
  // ==========================================================================

  describe('handlePlayerDisconnect', () => {
    it('removes player from their room', () => {
      const room = service.create({ name: 'Test', hostId: 'h1' });
      service.join(room.id, 'p2');

      service.handlePlayerDisconnect('p2');
      expect(room.playerIds.has('p2')).toBe(false);
    });

    it('no-ops for player not in any room', () => {
      service.handlePlayerDisconnect('unknown'); // should not throw
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('events', () => {
    it('subscribe and unsubscribe', () => {
      const events: RoomEvent[] = [];
      const callback = (e: RoomEvent) => events.push(e);

      const unsub = service.onEvent(callback);
      service.create({ name: 'Test', hostId: 'h1' });
      expect(events.length).toBeGreaterThan(0);

      const count = events.length;
      unsub();
      service.create({ name: 'Test2', hostId: 'h2' });
      expect(events.length).toBe(count);
    });

    it('listener errors do not crash service', () => {
      service.onEvent(() => { throw new Error('boom'); });
      expect(() => service.create({ name: 'T', hostId: 'h' })).not.toThrow();
    });
  });

  // ==========================================================================
  // Grace Period
  // ==========================================================================

  describe('empty grace period', () => {
    it('delays deletion when grace period is set', async () => {
      const graceful = new RoomService({
        autoDeleteEmpty: true,
        emptyGracePeriod: 100,
      });

      const room = graceful.create({ name: 'Test', hostId: 'h1' });
      const roomId = room.id;
      graceful.leave(roomId, 'h1');

      // Room should still exist during grace period
      expect(graceful.getRoom(roomId)).toBeDefined();

      // Wait for grace period
      await new Promise((r) => setTimeout(r, 150));
      expect(graceful.getRoom(roomId)).toBeUndefined();
      graceful.destroy();
    });

    it('cancels deletion if player joins during grace', async () => {
      const graceful = new RoomService({
        autoDeleteEmpty: true,
        emptyGracePeriod: 200,
      });

      const room = graceful.create({ name: 'Test', hostId: 'h1' });
      const roomId = room.id;
      graceful.leave(roomId, 'h1');

      // Join before grace expires
      await new Promise((r) => setTimeout(r, 50));
      graceful.join(roomId, 'p2');

      await new Promise((r) => setTimeout(r, 200));
      expect(graceful.getRoom(roomId)).toBeDefined();
      graceful.destroy();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('destroy clears everything', () => {
      service.create({ name: 'R1', hostId: 'h1' });
      service.create({ name: 'R2', hostId: 'h2' });
      service.destroy();
      expect(service.getRoomCount()).toBe(0);
    });
  });
});
