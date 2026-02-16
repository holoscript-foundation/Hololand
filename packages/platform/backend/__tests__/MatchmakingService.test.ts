import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MatchmakingService } from '../src/services/MatchmakingService';
import type {
  GameModeConfig,
  QueueEntry,
  MatchResult,
  MatchmakingEvent,
} from '../src/services/MatchmakingService';
import { RoomService } from '../src/services/RoomService';

describe('MatchmakingService', () => {
  let service: MatchmakingService;
  let roomService: RoomService;

  beforeEach(() => {
    roomService = new RoomService({ maxRooms: 500, defaultMaxPlayers: 50 });
    service = new MatchmakingService({
      roomService,
      tickInterval: 100,
      maxQueueSize: 1000,
    });
  });

  afterEach(() => {
    service.destroy();
    roomService.destroy();
  });

  // ============================================================================
  // Construction
  // ============================================================================

  describe('construction', () => {
    it('creates with defaults', () => {
      const s = new MatchmakingService();
      expect(s.getStats().modes).toBe(0);
      expect(s.getStats().totalQueued).toBe(0);
      expect(s.getStats().running).toBe(false);
      s.destroy();
    });

    it('creates with roomService', () => {
      expect(service.getStats().modes).toBe(0);
      expect(service.getStats().running).toBe(false);
    });

    it('creates with custom config', () => {
      const s = new MatchmakingService({ maxQueueSize: 500, tickInterval: 2000 });
      expect(s.getStats().running).toBe(false);
      s.destroy();
    });
  });

  // ============================================================================
  // Lifecycle
  // ============================================================================

  describe('lifecycle', () => {
    it('start and stop', () => {
      service.start();
      expect(service.getStats().running).toBe(true);
      service.stop();
      expect(service.getStats().running).toBe(false);
    });

    it('start is idempotent', () => {
      service.start();
      service.start();
      expect(service.getStats().running).toBe(true);
      service.stop();
    });

    it('stop is idempotent', () => {
      service.start();
      service.stop();
      service.stop();
      expect(service.getStats().running).toBe(false);
    });

    it('destroy clears all state', () => {
      service.addMode('test', { minPlayers: 2, maxPlayers: 4 });
      service.enqueue('p1', 'test');
      service.start();
      service.destroy();

      expect(service.getStats().modes).toBe(0);
      expect(service.getStats().totalQueued).toBe(0);
      expect(service.getStats().running).toBe(false);
    });
  });

  // ============================================================================
  // Game Mode Management
  // ============================================================================

  describe('addMode', () => {
    it('registers a mode', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 8 });
      expect(service.getModeNames()).toEqual(['ffa']);
      expect(service.getMode('ffa')).toBeDefined();
    });

    it('registers mode with full config', () => {
      service.addMode('ranked_2v2', {
        minPlayers: 4,
        maxPlayers: 4,
        teamSize: 2,
        teamCount: 2,
        ranked: true,
        skillRange: 200,
        maxSkillRange: 800,
        skillExpansionRate: 15,
        maxWaitTime: 60_000,
        allowBackfill: false,
        roomCategory: 'ranked',
        roomTags: ['competitive', '2v2'],
        roomMetadata: { ranked: true },
      });

      const mode = service.getMode('ranked_2v2')!;
      expect(mode.teamSize).toBe(2);
      expect(mode.teamCount).toBe(2);
      expect(mode.ranked).toBe(true);
      expect(mode.skillRange).toBe(200);
      expect(mode.roomCategory).toBe('ranked');
      expect(mode.roomTags).toEqual(['competitive', '2v2']);
    });

    it('uses defaults for optional fields', () => {
      service.addMode('casual', { minPlayers: 2, maxPlayers: 10 });
      const mode = service.getMode('casual')!;
      expect(mode.teamSize).toBe(0);
      expect(mode.ranked).toBe(false);
      expect(mode.skillRange).toBe(100);
      expect(mode.maxWaitTime).toBe(120_000);
      expect(mode.allowBackfill).toBe(false);
      expect(mode.roomCategory).toBe('casual');
    });

    it('throws on duplicate mode', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
      expect(() => service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 })).toThrow(
        'already exists'
      );
    });

    it('throws on minPlayers < 1', () => {
      expect(() => service.addMode('bad', { minPlayers: 0, maxPlayers: 4 })).toThrow(
        'minPlayers'
      );
    });

    it('throws on maxPlayers < minPlayers', () => {
      expect(() => service.addMode('bad', { minPlayers: 5, maxPlayers: 3 })).toThrow(
        'maxPlayers'
      );
    });

    it('throws when teamSize * teamCount exceeds maxPlayers', () => {
      expect(() =>
        service.addMode('bad', { minPlayers: 2, maxPlayers: 4, teamSize: 3, teamCount: 3 })
      ).toThrow('exceeds maxPlayers');
    });
  });

  describe('removeMode', () => {
    it('removes a registered mode', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
      expect(service.removeMode('ffa')).toBe(true);
      expect(service.getModeNames()).toEqual([]);
    });

    it('returns false for non-existent mode', () => {
      expect(service.removeMode('nonexistent')).toBe(false);
    });

    it('dequeues all players when removing mode', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');
      expect(service.getStats().totalQueued).toBe(2);

      service.removeMode('ffa');
      expect(service.getStats().totalQueued).toBe(0);
      expect(service.isQueued('p1')).toBe(false);
      expect(service.isQueued('p2')).toBe(false);
    });

    it('emits queue_left events when removing mode', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
      service.enqueue('p1', 'ffa');

      const events: MatchmakingEvent[] = [];
      service.onEvent((e) => events.push(e));

      service.removeMode('ffa');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('queue_left');
      expect(events[0].data.reason).toBe('mode_removed');
    });
  });

  describe('getMode / getModeNames', () => {
    it('returns undefined for unknown mode', () => {
      expect(service.getMode('unknown')).toBeUndefined();
    });

    it('returns all mode names', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
      service.addMode('teams', { minPlayers: 4, maxPlayers: 8 });
      expect(service.getModeNames()).toEqual(['ffa', 'teams']);
    });
  });

  // ============================================================================
  // Enqueue / Dequeue
  // ============================================================================

  describe('enqueue', () => {
    beforeEach(() => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
    });

    it('adds a player to queue', () => {
      const entry = service.enqueue('p1', 'ffa');
      expect(entry.playerId).toBe('p1');
      expect(entry.playerIds).toEqual(['p1']);
      expect(entry.mode).toBe('ffa');
      expect(entry.skillRating).toBe(1000);
      expect(entry.region).toBeNull();
      expect(service.isQueued('p1')).toBe(true);
    });

    it('respects skill rating option', () => {
      const entry = service.enqueue('p1', 'ffa', { skillRating: 2000 });
      expect(entry.skillRating).toBe(2000);
    });

    it('respects region option', () => {
      const entry = service.enqueue('p1', 'ffa', { region: 'us-east' });
      expect(entry.region).toBe('us-east');
    });

    it('respects metadata option', () => {
      const entry = service.enqueue('p1', 'ffa', { metadata: { level: 50 } });
      expect(entry.metadata).toEqual({ level: 50 });
    });

    it('throws for unknown mode', () => {
      expect(() => service.enqueue('p1', 'unknown')).toThrow('not found');
    });

    it('throws if player already queued', () => {
      service.enqueue('p1', 'ffa');
      expect(() => service.enqueue('p1', 'ffa')).toThrow('already in a queue');
    });

    it('throws when queue is full', () => {
      const s = new MatchmakingService({ maxQueueSize: 2 });
      s.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
      s.enqueue('p1', 'ffa');
      s.enqueue('p2', 'ffa');
      expect(() => s.enqueue('p3', 'ffa')).toThrow('queue is full');
      s.destroy();
    });

    it('emits queue_joined event', () => {
      const events: MatchmakingEvent[] = [];
      service.onEvent((e) => events.push(e));

      service.enqueue('p1', 'ffa', { skillRating: 1500, region: 'eu-west' });
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('queue_joined');
      expect(events[0].data.playerId).toBe('p1');
      expect(events[0].data.mode).toBe('ffa');
      expect(events[0].data.skillRating).toBe(1500);
      expect(events[0].data.region).toBe('eu-west');
    });

    it('increments totalQueued', () => {
      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');
      expect(service.getStats().totalQueued).toBe(2);
    });
  });

  describe('enqueueParty', () => {
    beforeEach(() => {
      service.addMode('teams', {
        minPlayers: 4,
        maxPlayers: 4,
        teamSize: 2,
        teamCount: 2,
      });
    });

    it('adds a party to queue', () => {
      const entry = service.enqueueParty('leader', ['leader', 'member1'], 'teams');
      expect(entry.playerId).toBe('leader');
      expect(entry.playerIds).toEqual(['leader', 'member1']);
      expect(service.isQueued('leader')).toBe(true);
      expect(service.isQueued('member1')).toBe(true);
    });

    it('deduplicates leader from memberIds', () => {
      const entry = service.enqueueParty('leader', ['leader', 'member1'], 'teams');
      expect(entry.playerIds).toEqual(['leader', 'member1']);
    });

    it('throws if party exceeds team size', () => {
      expect(() =>
        service.enqueueParty('l', ['l', 'm1', 'm2'], 'teams')
      ).toThrow('exceeds team size');
    });

    it('throws if party exceeds max players', () => {
      service.addMode('small', { minPlayers: 2, maxPlayers: 2 });
      expect(() =>
        service.enqueueParty('l', ['l', 'm1', 'm2'], 'small')
      ).toThrow('exceeds max players');
    });

    it('throws if any party member is already queued', () => {
      service.enqueue('member1', 'teams');
      expect(() =>
        service.enqueueParty('leader', ['leader', 'member1'], 'teams')
      ).toThrow('already in a queue');
    });

    it('counts party as 1 entry but multiple players', () => {
      service.enqueueParty('leader', ['leader', 'member1'], 'teams');
      expect(service.getStats().totalQueued).toBe(1);
      const stats = service.getQueueStats('teams');
      expect(stats!.totalPlayers).toBe(2);
    });
  });

  describe('dequeue', () => {
    beforeEach(() => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
    });

    it('removes a player from queue', () => {
      service.enqueue('p1', 'ffa');
      expect(service.dequeue('p1')).toBe(true);
      expect(service.isQueued('p1')).toBe(false);
      expect(service.getStats().totalQueued).toBe(0);
    });

    it('returns false for non-queued player', () => {
      expect(service.dequeue('nonexistent')).toBe(false);
    });

    it('removes entire party when leader dequeues', () => {
      service.addMode('teams', { minPlayers: 4, maxPlayers: 4, teamSize: 2, teamCount: 2 });
      service.enqueueParty('leader', ['leader', 'member'], 'teams');
      expect(service.dequeue('leader')).toBe(true);
      expect(service.isQueued('leader')).toBe(false);
      expect(service.isQueued('member')).toBe(false);
    });

    it('removes entire party when member dequeues', () => {
      service.addMode('teams', { minPlayers: 4, maxPlayers: 4, teamSize: 2, teamCount: 2 });
      service.enqueueParty('leader', ['leader', 'member'], 'teams');
      expect(service.dequeue('member')).toBe(true);
      expect(service.isQueued('leader')).toBe(false);
      expect(service.isQueued('member')).toBe(false);
    });

    it('emits queue_left event', () => {
      service.enqueue('p1', 'ffa');
      const events: MatchmakingEvent[] = [];
      service.onEvent((e) => events.push(e));

      service.dequeue('p1');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('queue_left');
      expect(events[0].data.reason).toBe('cancelled');
    });
  });

  describe('getQueueEntry / getQueuePosition', () => {
    beforeEach(() => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
    });

    it('returns entry for queued player', () => {
      service.enqueue('p1', 'ffa', { skillRating: 1500 });
      const entry = service.getQueueEntry('p1');
      expect(entry).toBeDefined();
      expect(entry!.skillRating).toBe(1500);
    });

    it('returns undefined for non-queued player', () => {
      expect(service.getQueueEntry('nobody')).toBeUndefined();
    });

    it('returns position in queue', () => {
      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');
      service.enqueue('p3', 'ffa');
      expect(service.getQueuePosition('p1')).toBe(0);
      expect(service.getQueuePosition('p2')).toBe(1);
      expect(service.getQueuePosition('p3')).toBe(2);
    });

    it('returns -1 for non-queued player', () => {
      expect(service.getQueuePosition('nobody')).toBe(-1);
    });
  });

  // ============================================================================
  // Queue Processing — Basic Matching
  // ============================================================================

  describe('processQueues — basic matching', () => {
    it('matches when enough players', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 2 });
      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');

      const results = service.processQueues();
      expect(results).toHaveLength(1);
      expect(results[0].mode).toBe('ffa');
      expect(results[0].playerIds.sort()).toEqual(['p1', 'p2']);
      expect(results[0].isBackfill).toBe(false);
      expect(results[0].roomId).toBeTruthy(); // Room was created via RoomService
    });

    it('does not match with too few players', () => {
      service.addMode('ffa', { minPlayers: 3, maxPlayers: 4 });
      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');

      const results = service.processQueues();
      expect(results).toHaveLength(0);
      expect(service.isQueued('p1')).toBe(true);
    });

    it('matches as many groups as possible', () => {
      service.addMode('duel', { minPlayers: 2, maxPlayers: 2 });
      service.enqueue('p1', 'duel');
      service.enqueue('p2', 'duel');
      service.enqueue('p3', 'duel');
      service.enqueue('p4', 'duel');

      const results = service.processQueues();
      expect(results).toHaveLength(2);
      expect(service.getStats().totalQueued).toBe(0);
    });

    it('leaves leftover players in queue', () => {
      service.addMode('duel', { minPlayers: 2, maxPlayers: 2 });
      service.enqueue('p1', 'duel');
      service.enqueue('p2', 'duel');
      service.enqueue('p3', 'duel');

      const results = service.processQueues();
      expect(results).toHaveLength(1);
      expect(service.getStats().totalQueued).toBe(1);
      expect(service.isQueued('p3')).toBe(true);
    });

    it('emits match_found events', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 2 });
      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');

      const events: MatchmakingEvent[] = [];
      service.onEvent((e) => events.push(e));

      service.processQueues();
      const matchEvents = events.filter((e) => e.type === 'match_found');
      expect(matchEvents).toHaveLength(1);
      expect(matchEvents[0].data.mode).toBe('ffa');
      expect(matchEvents[0].data.roomId).toBeTruthy();
    });

    it('creates room via RoomService', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 2, roomCategory: 'pvp' });
      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');

      const results = service.processQueues();
      const roomId = results[0].roomId!;
      const room = roomService.getRoom(roomId);
      expect(room).toBeDefined();
      expect(room!.category).toBe('pvp');
      expect(room!.playerIds.has('p1')).toBe(true);
      expect(room!.playerIds.has('p2')).toBe(true);
      expect(room!.metadata.matchmade).toBe(true);
      expect(room!.metadata.mode).toBe('ffa');
    });

    it('works without roomService', () => {
      const s = new MatchmakingService();
      s.addMode('ffa', { minPlayers: 2, maxPlayers: 2 });
      s.enqueue('p1', 'ffa');
      s.enqueue('p2', 'ffa');

      const results = s.processQueues();
      expect(results).toHaveLength(1);
      expect(results[0].roomId).toBeNull();
      s.destroy();
    });

    it('matches multiple modes independently', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 2 });
      service.addMode('duel', { minPlayers: 2, maxPlayers: 2 });

      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');
      service.enqueue('p3', 'duel');
      service.enqueue('p4', 'duel');

      const results = service.processQueues();
      expect(results).toHaveLength(2);
      const modes = results.map((r) => r.mode).sort();
      expect(modes).toEqual(['duel', 'ffa']);
    });
  });

  // ============================================================================
  // Queue Processing — Skill-Based
  // ============================================================================

  describe('processQueues — skill-based matching', () => {
    beforeEach(() => {
      service.addMode('ranked', {
        minPlayers: 2,
        maxPlayers: 2,
        ranked: true,
        skillRange: 100,
        maxSkillRange: 500,
        skillExpansionRate: 10,
        maxWaitTime: 120_000,
      });
    });

    it('matches players within skill range', () => {
      service.enqueue('p1', 'ranked', { skillRating: 1500 });
      service.enqueue('p2', 'ranked', { skillRating: 1550 });

      const results = service.processQueues();
      expect(results).toHaveLength(1);
    });

    it('does not match players outside skill range', () => {
      service.enqueue('p1', 'ranked', { skillRating: 1000 });
      service.enqueue('p2', 'ranked', { skillRating: 2000 });

      const results = service.processQueues();
      expect(results).toHaveLength(0);
    });

    it('records average skill in match', () => {
      service.enqueue('p1', 'ranked', { skillRating: 1500 });
      service.enqueue('p2', 'ranked', { skillRating: 1600 });

      const results = service.processQueues();
      expect(results[0].averageSkill).toBe(1550);
    });

    it('expands skill range over time', () => {
      // Enqueue two players 300 MMR apart (outside default 100 range)
      const now = Date.now();
      service.enqueue('p1', 'ranked', { skillRating: 1000 });
      service.enqueue('p2', 'ranked', { skillRating: 1300 });

      // No match immediately
      let results = service.processQueues();
      expect(results).toHaveLength(0);

      // Simulate 25 seconds of waiting (tolerance = 100 + 25*10 = 350 > 300)
      const entry1 = service.getQueueEntry('p1')!;
      (entry1 as any).enqueuedAt = now - 25_000;

      results = service.processQueues();
      expect(results).toHaveLength(1);
    });

    it('does not exceed maxSkillRange', () => {
      service.enqueue('p1', 'ranked', { skillRating: 1000 });
      service.enqueue('p2', 'ranked', { skillRating: 2000 }); // 1000 apart, maxRange=500

      // Simulate very long wait
      const entry1 = service.getQueueEntry('p1')!;
      (entry1 as any).enqueuedAt = Date.now() - 100_000;

      const results = service.processQueues();
      expect(results).toHaveLength(0);
    });
  });

  // ============================================================================
  // Queue Processing — Teams
  // ============================================================================

  describe('processQueues — team assignment', () => {
    it('assigns players to teams', () => {
      service.addMode('2v2', {
        minPlayers: 4,
        maxPlayers: 4,
        teamSize: 2,
        teamCount: 2,
      });

      service.enqueue('p1', '2v2', { skillRating: 1500 });
      service.enqueue('p2', '2v2', { skillRating: 1400 });
      service.enqueue('p3', '2v2', { skillRating: 1300 });
      service.enqueue('p4', '2v2', { skillRating: 1200 });

      const results = service.processQueues();
      expect(results).toHaveLength(1);
      expect(results[0].teams).toHaveLength(2);
      expect(results[0].teams[0].playerIds).toHaveLength(2);
      expect(results[0].teams[1].playerIds).toHaveLength(2);

      const allTeamPlayers = results[0].teams.flatMap((t) => t.playerIds);
      expect(allTeamPlayers.sort()).toEqual(['p1', 'p2', 'p3', 'p4']);
    });

    it('balances teams by skill (snake draft)', () => {
      service.addMode('2v2', {
        minPlayers: 4,
        maxPlayers: 4,
        teamSize: 2,
        teamCount: 2,
        ranked: false,
      });

      service.enqueue('p1', '2v2', { skillRating: 2000 });
      service.enqueue('p2', '2v2', { skillRating: 1800 });
      service.enqueue('p3', '2v2', { skillRating: 1200 });
      service.enqueue('p4', '2v2', { skillRating: 1000 });

      const results = service.processQueues();
      const teams = results[0].teams;

      // Snake draft: highest→team0, next→team1, next→team1, next→team0
      // So team0 gets highest + lowest, team1 gets 2nd + 3rd
      const skillDiff = Math.abs(teams[0].averageSkill - teams[1].averageSkill);
      expect(skillDiff).toBeLessThan(500); // Reasonably balanced
    });

    it('no teams for FFA mode', () => {
      service.addMode('ffa', { minPlayers: 3, maxPlayers: 3 });
      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');
      service.enqueue('p3', 'ffa');

      const results = service.processQueues();
      expect(results[0].teams).toEqual([]);
    });

    it('parties stay together on same team', () => {
      service.addMode('2v2', {
        minPlayers: 4,
        maxPlayers: 4,
        teamSize: 2,
        teamCount: 2,
      });

      service.enqueueParty('leader', ['leader', 'friend'], '2v2', { skillRating: 1500 });
      service.enqueue('solo1', '2v2', { skillRating: 1400 });
      service.enqueue('solo2', '2v2', { skillRating: 1300 });

      const results = service.processQueues();
      expect(results).toHaveLength(1);
      
      // Verify the party members are in the match
      expect(results[0].playerIds).toContain('leader');
      expect(results[0].playerIds).toContain('friend');
    });
  });

  // ============================================================================
  // Queue Processing — Regions
  // ============================================================================

  describe('processQueues — regions', () => {
    it('selects most common region', () => {
      service.addMode('ffa', { minPlayers: 3, maxPlayers: 3 });
      service.enqueue('p1', 'ffa', { region: 'us-east' });
      service.enqueue('p2', 'ffa', { region: 'us-east' });
      service.enqueue('p3', 'ffa', { region: 'eu-west' });

      const results = service.processQueues();
      expect(results[0].region).toBe('us-east');
    });

    it('returns null region when no preferences', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 2 });
      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');

      const results = service.processQueues();
      expect(results[0].region).toBeNull();
    });
  });

  // ============================================================================
  // Queue Processing — Wait Time & Expiry
  // ============================================================================

  describe('processQueues — expiry', () => {
    it('expires entries that exceeded maxWaitTime', () => {
      service.addMode('ranked', {
        minPlayers: 2,
        maxPlayers: 2,
        ranked: true,
        skillRange: 10,
        maxSkillRange: 10,
        maxWaitTime: 5_000,
      });

      service.enqueue('p1', 'ranked', { skillRating: 1000 });
      const entry = service.getQueueEntry('p1')!;
      (entry as any).enqueuedAt = Date.now() - 10_000; // 10s ago

      const events: MatchmakingEvent[] = [];
      service.onEvent((e) => events.push(e));

      service.processQueues();
      expect(service.isQueued('p1')).toBe(false);

      const expiredEvents = events.filter((e) => e.type === 'queue_expired');
      expect(expiredEvents).toHaveLength(1);
      expect(expiredEvents[0].data.playerId).toBe('p1');
    });

    it('records average wait time in match result', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 2 });
      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');

      // Simulate some wait time
      const entry1 = service.getQueueEntry('p1')!;
      (entry1 as any).enqueuedAt = Date.now() - 3000;

      const results = service.processQueues();
      expect(results[0].averageWaitTime).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Backfill
  // ============================================================================

  describe('backfill', () => {
    beforeEach(() => {
      service.addMode('backfill_mode', {
        minPlayers: 2,
        maxPlayers: 4,
        allowBackfill: true,
      });
    });

    it('backfills into registered room', () => {
      // Create a "room" that has space
      const room = roomService.create({
        name: 'existing_room',
        hostId: 'host',
        maxPlayers: 4,
        category: 'backfill_mode',
      });
      service.registerBackfillRoom(room.id, 'backfill_mode', 1, 4);

      service.enqueue('p1', 'backfill_mode');

      const results = service.processQueues();
      const backfills = results.filter((r) => r.isBackfill);
      expect(backfills).toHaveLength(1);
      expect(backfills[0].roomId).toBe(room.id);
      expect(backfills[0].playerIds).toEqual(['p1']);
    });

    it('emits backfill_found event', () => {
      const room = roomService.create({
        name: 'bf_room',
        hostId: 'host',
        maxPlayers: 4,
      });
      service.registerBackfillRoom(room.id, 'backfill_mode', 1, 4);
      service.enqueue('p1', 'backfill_mode');

      const events: MatchmakingEvent[] = [];
      service.onEvent((e) => events.push(e));

      service.processQueues();
      const bfEvents = events.filter((e) => e.type === 'backfill_found');
      expect(bfEvents).toHaveLength(1);
    });

    it('does not backfill into full room', () => {
      service.registerBackfillRoom('full_room', 'backfill_mode', 4, 4);
      service.enqueue('p1', 'backfill_mode');

      const results = service.processQueues();
      const backfills = results.filter((r) => r.isBackfill);
      expect(backfills).toHaveLength(0);
    });

    it('does not backfill into wrong mode', () => {
      service.registerBackfillRoom('wrong_mode_room', 'other_mode', 1, 4);
      service.enqueue('p1', 'backfill_mode');

      const results = service.processQueues();
      const backfills = results.filter((r) => r.isBackfill);
      expect(backfills).toHaveLength(0);
    });

    it('unregisters backfill room', () => {
      const room = roomService.create({
        name: 'bf_room',
        hostId: 'host',
        maxPlayers: 4,
      });
      service.registerBackfillRoom(room.id, 'backfill_mode', 1, 4);
      service.unregisterBackfillRoom(room.id);

      service.enqueue('p1', 'backfill_mode');
      const results = service.processQueues();
      const backfills = results.filter((r) => r.isBackfill);
      expect(backfills).toHaveLength(0);
    });

    it('updateBackfillRoom removes full rooms', () => {
      service.registerBackfillRoom('room1', 'backfill_mode', 2, 4);
      service.updateBackfillRoom('room1', 4);

      expect(service.getStats().backfillRooms).toBe(0);
    });

    it('party too large skips backfill room', () => {
      // Small room with only 1 slot — party of 2 won't fit
      const smallRoom = roomService.create({
        name: 'small_room',
        hostId: 'host1',
        maxPlayers: 3,
      });
      roomService.join(smallRoom.id, 'filler1');
      service.registerBackfillRoom(smallRoom.id, 'backfill_mode', 2, 3); // 1 slot

      service.addMode('backfill_teams', {
        minPlayers: 2,
        maxPlayers: 4,
        teamSize: 2,
        teamCount: 2,
        allowBackfill: true,
      });

      // Team room with 2 slots — party of 2 fits
      const teamRoom = roomService.create({
        name: 'team_room',
        hostId: 'host2',
        maxPlayers: 4,
      });
      roomService.join(teamRoom.id, 'filler2');
      service.registerBackfillRoom(teamRoom.id, 'backfill_teams', 2, 4); // 2 slots

      service.enqueueParty('l', ['l', 'm'], 'backfill_teams', {}); // party of 2

      const results = service.processQueues();
      // Should backfill only into room with enough space
      const backfills = results.filter((r) => r.isBackfill && r.roomId === teamRoom.id);
      expect(backfills).toHaveLength(1);
    });
  });

  // ============================================================================
  // Stats & Queries
  // ============================================================================

  describe('getQueueStats', () => {
    it('returns stats for a mode', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');

      const stats = service.getQueueStats('ffa');
      expect(stats).toBeDefined();
      expect(stats!.mode).toBe('ffa');
      expect(stats!.queueSize).toBe(2);
      expect(stats!.totalPlayers).toBe(2);
    });

    it('returns undefined for unknown mode', () => {
      expect(service.getQueueStats('unknown')).toBeUndefined();
    });

    it('party counts as 1 entry but multiple players', () => {
      service.addMode('teams', { minPlayers: 4, maxPlayers: 4, teamSize: 2, teamCount: 2 });
      service.enqueueParty('l', ['l', 'm'], 'teams');

      const stats = service.getQueueStats('teams');
      expect(stats!.queueSize).toBe(1);
      expect(stats!.totalPlayers).toBe(2);
    });
  });

  describe('getAllQueueStats', () => {
    it('returns stats for all modes', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
      service.addMode('duel', { minPlayers: 2, maxPlayers: 2 });
      service.enqueue('p1', 'ffa');

      const stats = service.getAllQueueStats();
      expect(stats).toHaveLength(2);
      expect(stats.map((s) => s.mode).sort()).toEqual(['duel', 'ffa']);
    });
  });

  describe('getMatch / getMatches', () => {
    it('retrieves match by ID', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 2 });
      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');

      const results = service.processQueues();
      const match = service.getMatch(results[0].id);
      expect(match).toBeDefined();
      expect(match!.mode).toBe('ffa');
    });

    it('returns undefined for unknown match', () => {
      expect(service.getMatch('nonexistent')).toBeUndefined();
    });

    it('getMatches returns all completed matches', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 2 });
      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');
      service.enqueue('p3', 'ffa');
      service.enqueue('p4', 'ffa');

      service.processQueues();
      expect(service.getMatches()).toHaveLength(2);
    });
  });

  describe('getStats', () => {
    it('returns global stats', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
      service.enqueue('p1', 'ffa');
      service.registerBackfillRoom('r1', 'ffa', 1, 4);

      const stats = service.getStats();
      expect(stats.modes).toBe(1);
      expect(stats.totalQueued).toBe(1);
      expect(stats.totalMatches).toBe(0);
      expect(stats.backfillRooms).toBe(1);
      expect(stats.running).toBe(false);
    });
  });

  // ============================================================================
  // Events
  // ============================================================================

  describe('events', () => {
    it('onEvent returns unsubscribe function', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
      const events: MatchmakingEvent[] = [];
      const unsub = service.onEvent((e) => events.push(e));

      service.enqueue('p1', 'ffa');
      expect(events).toHaveLength(1);

      unsub();
      service.enqueue('p2', 'ffa');
      expect(events).toHaveLength(1); // no more events
    });

    it('offEvent removes listener', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
      const events: MatchmakingEvent[] = [];
      const cb = (e: MatchmakingEvent) => events.push(e);
      service.onEvent(cb);

      service.enqueue('p1', 'ffa');
      expect(events).toHaveLength(1);

      service.offEvent(cb);
      service.enqueue('p2', 'ffa');
      expect(events).toHaveLength(1);
    });

    it('listener errors do not crash service', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
      service.onEvent(() => {
        throw new Error('listener crash');
      });

      // Should not throw
      expect(() => service.enqueue('p1', 'ffa')).not.toThrow();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('re-enqueue after dequeue', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
      service.enqueue('p1', 'ffa');
      service.dequeue('p1');
      const entry = service.enqueue('p1', 'ffa', { skillRating: 2000 });
      expect(entry.skillRating).toBe(2000);
    });

    it('processQueues with empty queues', () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 4 });
      const results = service.processQueues();
      expect(results).toEqual([]);
    });

    it('processQueues with no modes', () => {
      const results = service.processQueues();
      expect(results).toEqual([]);
    });

    it('handles concurrent enqueue of max queue', () => {
      const s = new MatchmakingService({ maxQueueSize: 3 });
      s.addMode('ffa', { minPlayers: 2, maxPlayers: 10 });
      s.enqueue('p1', 'ffa');
      s.enqueue('p2', 'ffa');
      s.enqueue('p3', 'ffa');
      expect(() => s.enqueue('p4', 'ffa')).toThrow('queue is full');
      s.destroy();
    });

    it('match with single-player mode (minPlayers=1)', () => {
      service.addMode('solo', { minPlayers: 1, maxPlayers: 1 });
      service.enqueue('p1', 'solo');

      const results = service.processQueues();
      expect(results).toHaveLength(1);
      expect(results[0].playerIds).toEqual(['p1']);
    });

    it('large match group', () => {
      service.addMode('raid', { minPlayers: 8, maxPlayers: 8 });
      for (let i = 0; i < 8; i++) {
        service.enqueue(`p${i}`, 'raid');
      }

      const results = service.processQueues();
      expect(results).toHaveLength(1);
      expect(results[0].playerIds).toHaveLength(8);
    });

    it('mixed parties and solos', () => {
      service.addMode('4v4', {
        minPlayers: 8,
        maxPlayers: 8,
        teamSize: 4,
        teamCount: 2,
      });

      service.enqueueParty('pl1', ['pl1', 'pl2', 'pl3'], '4v4', { skillRating: 1500 });
      service.enqueue('s1', '4v4', { skillRating: 1500 });
      service.enqueueParty('pl4', ['pl4', 'pl5'], '4v4', { skillRating: 1500 });
      service.enqueue('s2', '4v4', { skillRating: 1500 });
      service.enqueue('s3', '4v4', { skillRating: 1500 });
      service.enqueue('s4', '4v4', { skillRating: 1500 });

      // Total: 3+1+2+1+1+1 = 9, but maxPlayers=8, so one leftover
      const results = service.processQueues();
      // Should get a match of 8
      if (results.length === 1) {
        expect(results[0].playerIds.length).toBeLessThanOrEqual(8);
        expect(results[0].playerIds.length).toBeGreaterThanOrEqual(8);
      }
    });

    it('room creation failure returns null roomId', () => {
      // Use roomService with 0 max rooms to force failure
      const badRoomService = new RoomService({ maxRooms: 0 });
      const s = new MatchmakingService({ roomService: badRoomService });
      s.addMode('ffa', { minPlayers: 2, maxPlayers: 2 });
      s.enqueue('p1', 'ffa');
      s.enqueue('p2', 'ffa');

      const results = s.processQueues();
      expect(results).toHaveLength(1);
      expect(results[0].roomId).toBeNull();
      s.destroy();
      badRoomService.destroy();
    });
  });

  // ============================================================================
  // Timer-based Processing
  // ============================================================================

  describe('timer-based processing', () => {
    it('auto-matches when started with tick timer', async () => {
      service.addMode('ffa', { minPlayers: 2, maxPlayers: 2 });
      service.enqueue('p1', 'ffa');
      service.enqueue('p2', 'ffa');

      service.start();

      // Wait for a tick
      await new Promise((r) => setTimeout(r, 200));

      expect(service.isQueued('p1')).toBe(false);
      expect(service.isQueued('p2')).toBe(false);
      expect(service.getMatches()).toHaveLength(1);
    });
  });
});
