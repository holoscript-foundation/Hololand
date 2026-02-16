/**
 * ServerAntiCheat — tests
 *
 * Covers: construction, player registration, position validation,
 * action rate limiting, state validation, violation tracking,
 * trust score model, penalty enforcement, tick (recovery + expiry),
 * manual penalties, events, stats, edge cases.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ServerAntiCheat,
  type ServerAntiCheatConfig,
  type Vec3,
  type AntiCheatEvent,
  type ViolationType,
} from '../src/services/ServerAntiCheat';

// ============================================================================
// Helpers
// ============================================================================

function mkPos(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

// ============================================================================
// Tests
// ============================================================================

describe('ServerAntiCheat', () => {
  let ac: ServerAntiCheat;

  beforeEach(() => {
    ac = new ServerAntiCheat();
  });

  afterEach(() => {
    ac.destroy();
  });

  // --------------------------------------------------------------------------
  // Construction
  // --------------------------------------------------------------------------
  describe('construction', () => {
    it('creates with defaults', () => {
      const cfg = ac.getConfig();
      expect(cfg.maxSpeed).toBe(20);
      expect(cfg.maxTeleportDistance).toBe(100);
      expect(cfg.maxActionsPerSecond).toBe(30);
      expect(cfg.violationWeight).toBe(5);
      expect(cfg.trustRecoveryRate).toBe(0.5);
      expect(cfg.warnThreshold).toBe(50);
      expect(cfg.kickThreshold).toBe(25);
      expect(cfg.banThreshold).toBe(10);
    });

    it('merges custom config', () => {
      const custom = new ServerAntiCheat({ maxSpeed: 10, banThreshold: 5 });
      const cfg = custom.getConfig();
      expect(cfg.maxSpeed).toBe(10);
      expect(cfg.banThreshold).toBe(5);
      expect(cfg.maxTeleportDistance).toBe(100); // default preserved
      custom.destroy();
    });

    it('starts with empty stats', () => {
      const stats = ac.getStats();
      expect(stats.players).toBe(0);
      expect(stats.banned).toBe(0);
      expect(stats.muted).toBe(0);
      expect(stats.totalViolations).toBe(0);
      expect(stats.avgTrustScore).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Player Registration
  // --------------------------------------------------------------------------
  describe('player registration', () => {
    it('registers a player', () => {
      ac.registerPlayer('p1');
      expect(ac.isRegistered('p1')).toBe(true);
    });

    it('registers with custom position', () => {
      ac.registerPlayer('p1', mkPos(5, 10, 15));
      const info = ac.getPlayer('p1');
      expect(info?.position).toEqual({ x: 5, y: 10, z: 15 });
    });

    it('ignores duplicate registration', () => {
      ac.registerPlayer('p1', mkPos(1, 2, 3));
      ac.registerPlayer('p1', mkPos(99, 99, 99));
      expect(ac.getPlayer('p1')?.position).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('unregisters a player', () => {
      ac.registerPlayer('p1');
      ac.unregisterPlayer('p1');
      expect(ac.isRegistered('p1')).toBe(false);
    });

    it('unregister unknown player is no-op', () => {
      expect(() => ac.unregisterPlayer('unknown')).not.toThrow();
    });

    it('returns undefined for unknown player', () => {
      expect(ac.getPlayer('nope')).toBeUndefined();
    });

    it('getPlayerIds returns all registered', () => {
      ac.registerPlayer('a');
      ac.registerPlayer('b');
      ac.registerPlayer('c');
      expect(ac.getPlayerIds().sort()).toEqual(['a', 'b', 'c']);
    });

    it('player starts with trust 100', () => {
      ac.registerPlayer('p1');
      expect(ac.getTrustScore('p1')).toBe(100);
    });

    it('player starts not banned / not muted', () => {
      ac.registerPlayer('p1');
      expect(ac.isBanned('p1')).toBe(false);
      expect(ac.isMuted('p1')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Position Validation
  // --------------------------------------------------------------------------
  describe('position validation', () => {
    beforeEach(() => {
      ac.registerPlayer('p1', mkPos(0, 0, 0));
    });

    it('accepts valid small movement', () => {
      // Wait a small time to have dt > 0
      const result = ac.validatePosition('p1', mkPos(1, 0, 0));
      expect(result.valid).toBe(true);
      expect(result.violation).toBeUndefined();
    });

    it('accepts zero movement', () => {
      const result = ac.validatePosition('p1', mkPos(0, 0, 0));
      expect(result.valid).toBe(true);
    });

    it('detects teleportation', () => {
      const result = ac.validatePosition('p1', mkPos(200, 0, 0));
      expect(result.valid).toBe(false);
      expect(result.violation?.type).toBe('teleport');
      expect(result.violation?.severity).toBe(8);
      expect(result.correctedPosition).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('detects speed violation', () => {
      // First update always accepted (first-frame skip)
      ac.validatePosition('p1', mkPos(0, 0, 0));
      // Now move 50 units in ~0ms — way faster than maxSpeed * tolerance
      const result = ac.validatePosition('p1', mkPos(50, 0, 0));
      expect(result.valid).toBe(false);
      expect(result.violation?.type).toBe('speed');
      expect(result.correctedPosition).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('records violation on speed hack', () => {
      ac.validatePosition('p1', mkPos(0, 0, 0)); // first update
      ac.validatePosition('p1', mkPos(50, 0, 0)); // speed hack
      expect(ac.getViolationCount('p1')).toBe(1);
      expect(ac.getViolations('p1')[0].type).toBe('speed');
    });

    it('deducts trust on violation', () => {
      ac.validatePosition('p1', mkPos(0, 0, 0)); // first update
      const before = ac.getTrustScore('p1');
      ac.validatePosition('p1', mkPos(50, 0, 0)); // speed violation, severity 4
      const after = ac.getTrustScore('p1');
      expect(after).toBeLessThan(before);
      expect(after).toBe(100 - 4 * 5); // severity(4) * weight(5) = 20
    });

    it('returns invalid for unknown player', () => {
      expect(ac.validatePosition('nope', mkPos(1, 0, 0)).valid).toBe(false);
    });

    it('returns invalid for banned player', () => {
      ac.ban('p1');
      const result = ac.validatePosition('p1', mkPos(1, 0, 0));
      expect(result.valid).toBe(false);
      expect(result.correctedPosition).toBeDefined();
    });

    it('updates position on valid movement', () => {
      ac.validatePosition('p1', mkPos(2, 0, 0));
      expect(ac.getPlayer('p1')?.position).toEqual({ x: 2, y: 0, z: 0 });
    });

    it('does not update position on invalid movement', () => {
      ac.validatePosition('p1', mkPos(200, 0, 0));
      expect(ac.getPlayer('p1')?.position).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('custom maxSpeed is respected', () => {
      const strict = new ServerAntiCheat({ maxSpeed: 1, positionTolerance: 1 });
      strict.registerPlayer('p1');
      strict.validatePosition('p1', mkPos(0, 0, 0)); // first update (skipped)
      // 5 units instantly (speed approaches infinity) → violation
      const result = strict.validatePosition('p1', mkPos(5, 0, 0));
      expect(result.valid).toBe(false);
      strict.destroy();
    });

    it('custom maxTeleportDistance is respected', () => {
      const strict = new ServerAntiCheat({ maxTeleportDistance: 10 });
      strict.registerPlayer('p1');
      const result = strict.validatePosition('p1', mkPos(15, 0, 0));
      expect(result.valid).toBe(false);
      expect(result.violation?.type).toBe('teleport');
      strict.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // Action Rate Limiting
  // --------------------------------------------------------------------------
  describe('action rate limiting', () => {
    beforeEach(() => {
      ac.registerPlayer('p1');
    });

    it('allows actions under limit', () => {
      for (let i = 0; i < 30; i++) {
        expect(ac.validateAction('p1').allowed).toBe(true);
      }
    });

    it('blocks action over global limit', () => {
      for (let i = 0; i < 30; i++) {
        ac.validateAction('p1');
      }
      const result = ac.validateAction('p1');
      expect(result.allowed).toBe(false);
      expect(result.violation?.type).toBe('rate_limit');
    });

    it('uses per-action limits when configured', () => {
      const custom = new ServerAntiCheat({
        maxActionsPerSecond: 100,
        actionRateLimits: { 'attack': 3 },
      });
      custom.registerPlayer('p1');

      for (let i = 0; i < 3; i++) {
        expect(custom.validateAction('p1', 'attack').allowed).toBe(true);
      }
      expect(custom.validateAction('p1', 'attack').allowed).toBe(false);

      // Other actions still use global limit
      expect(custom.validateAction('p1', 'move').allowed).toBe(true);
      custom.destroy();
    });

    it('resets window after 1 second', () => {
      vi.useFakeTimers();
      const ac2 = new ServerAntiCheat({ maxActionsPerSecond: 5 });
      ac2.registerPlayer('p1');

      for (let i = 0; i < 5; i++) ac2.validateAction('p1');
      expect(ac2.validateAction('p1').allowed).toBe(false);

      vi.advanceTimersByTime(1001);
      expect(ac2.validateAction('p1').allowed).toBe(true);

      ac2.destroy();
      vi.useRealTimers();
    });

    it('returns not allowed for unknown player', () => {
      expect(ac.validateAction('unknown').allowed).toBe(false);
    });

    it('returns not allowed for banned player', () => {
      ac.ban('p1');
      expect(ac.validateAction('p1').allowed).toBe(false);
    });

    it('records violation on rate limit exceeded', () => {
      for (let i = 0; i < 31; i++) ac.validateAction('p1');
      expect(ac.getViolationCount('p1')).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // State Validation
  // --------------------------------------------------------------------------
  describe('state validation', () => {
    beforeEach(() => {
      ac.registerPlayer('p1');
    });

    it('allows state update when no ownership check is set', () => {
      const result = ac.validateStateUpdate('p1', 'obj1');
      expect(result.valid).toBe(true);
    });

    it('allows when ownership check returns true', () => {
      ac.setOwnershipCheck((peer, obj) => peer === 'p1' && obj === 'obj1');
      expect(ac.validateStateUpdate('p1', 'obj1').valid).toBe(true);
    });

    it('denies when ownership check returns false', () => {
      ac.setOwnershipCheck(() => false);
      const result = ac.validateStateUpdate('p1', 'obj1');
      expect(result.valid).toBe(false);
      expect(result.violation?.type).toBe('state_ownership');
    });

    it('records violation on ownership failure', () => {
      ac.setOwnershipCheck(() => false);
      ac.validateStateUpdate('p1', 'obj1');
      expect(ac.getViolationCount('p1')).toBe(1);
    });

    it('returns invalid for unknown player', () => {
      expect(ac.validateStateUpdate('nope', 'obj1').valid).toBe(false);
    });

    it('returns invalid for banned player', () => {
      ac.ban('p1');
      expect(ac.validateStateUpdate('p1', 'obj1').valid).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Manual Violation Reporting
  // --------------------------------------------------------------------------
  describe('manual violation reporting', () => {
    beforeEach(() => {
      ac.registerPlayer('p1');
    });

    it('reports a custom violation', () => {
      const ok = ac.reportViolation('p1', 'custom', 5, 'Impossible score');
      expect(ok).toBe(true);
      expect(ac.getViolationCount('p1')).toBe(1);
      expect(ac.getViolations('p1')[0].type).toBe('custom');
    });

    it('clamps severity to 1-10', () => {
      ac.reportViolation('p1', 'custom', 99, 'Too high');
      expect(ac.getViolations('p1')[0].severity).toBe(10);

      ac.reportViolation('p1', 'custom', -5, 'Too low');
      expect(ac.getViolations('p1')[1].severity).toBe(1);
    });

    it('returns false for unknown player', () => {
      expect(ac.reportViolation('nope', 'custom', 5, 'Test')).toBe(false);
    });

    it('includes extra data', () => {
      ac.reportViolation('p1', 'custom', 5, 'Test', { score: 9999 });
      expect(ac.getViolations('p1')[0].data).toEqual({ score: 9999 });
    });
  });

  // --------------------------------------------------------------------------
  // Trust Score Model
  // --------------------------------------------------------------------------
  describe('trust score', () => {
    beforeEach(() => {
      ac.registerPlayer('p1');
    });

    it('starts at 100', () => {
      expect(ac.getTrustScore('p1')).toBe(100);
    });

    it('decreases by severity * weight per violation', () => {
      ac.reportViolation('p1', 'custom', 3, 'Test'); // 3 * 5 = 15
      expect(ac.getTrustScore('p1')).toBe(85);
    });

    it('does not go below 0', () => {
      ac.reportViolation('p1', 'custom', 10, 'Big'); // 50
      ac.reportViolation('p1', 'custom', 10, 'Big'); // 50
      ac.reportViolation('p1', 'custom', 10, 'Big'); // would be -50
      expect(ac.getTrustScore('p1')).toBe(0);
    });

    it('returns -1 for unknown player', () => {
      expect(ac.getTrustScore('unknown')).toBe(-1);
    });
  });

  // --------------------------------------------------------------------------
  // Penalty Enforcement (Auto)
  // --------------------------------------------------------------------------
  describe('auto penalty enforcement', () => {
    it('emits warn when crossing warnThreshold', () => {
      ac = new ServerAntiCheat({ warnThreshold: 50, violationWeight: 10 });
      ac.registerPlayer('p1');
      const events: AntiCheatEvent[] = [];
      ac.onEvent(e => events.push(e));

      // 100 → 100 - 5*10 = 50 → exactly at threshold, need to go below
      ac.reportViolation('p1', 'custom', 5, 'First'); // trust = 50, not below
      const warnEvents = events.filter(e => e.type === 'penalty_warn');
      expect(warnEvents).toHaveLength(0);

      // Now cross below 50
      ac.reportViolation('p1', 'custom', 1, 'Cross'); // trust = 40
      const warnEvents2 = events.filter(e => e.type === 'penalty_warn');
      expect(warnEvents2).toHaveLength(1);
    });

    it('emits kick when crossing kickThreshold', () => {
      ac = new ServerAntiCheat({ kickThreshold: 25, violationWeight: 5 });
      ac.registerPlayer('p1');
      const events: AntiCheatEvent[] = [];
      ac.onEvent(e => events.push(e));

      // Drop to just above 25: 100 - 15*5 = 25
      ac.reportViolation('p1', 'custom', 10, 'A'); // 50
      ac.reportViolation('p1', 'custom', 5, 'B');  // 25

      // Cross below 25
      ac.reportViolation('p1', 'custom', 1, 'C');  // 20
      expect(events.some(e => e.type === 'penalty_kick')).toBe(true);
    });

    it('auto-bans when crossing banThreshold', () => {
      ac = new ServerAntiCheat({ banThreshold: 10, violationWeight: 10 });
      ac.registerPlayer('p1');
      const events: AntiCheatEvent[] = [];
      ac.onEvent(e => events.push(e));

      // 100 → 0 in two heavy violations
      ac.reportViolation('p1', 'custom', 9, 'A'); // 10
      ac.reportViolation('p1', 'custom', 1, 'B'); // 0
      expect(ac.isBanned('p1')).toBe(true);
      expect(events.some(e => e.type === 'penalty_ban')).toBe(true);
    });

    it('ban supersedes kick and warn', () => {
      // If trust drops from above warn all the way below ban in one violation,
      // only ban should fire (not warn + kick + ban)
      ac = new ServerAntiCheat({
        warnThreshold: 80,
        kickThreshold: 60,
        banThreshold: 40,
        violationWeight: 10,
      });
      ac.registerPlayer('p1');
      const events: AntiCheatEvent[] = [];
      ac.onEvent(e => events.push(e));

      // Trust 100 → 100 - 7*10 = 30 → crosses all three thresholds
      ac.reportViolation('p1', 'custom', 7, 'Mega cheat');

      expect(events.filter(e => e.type === 'penalty_ban')).toHaveLength(1);
      expect(events.filter(e => e.type === 'penalty_kick')).toHaveLength(0);
      expect(events.filter(e => e.type === 'penalty_warn')).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Manual Penalties
  // --------------------------------------------------------------------------
  describe('manual penalties', () => {
    beforeEach(() => {
      ac.registerPlayer('p1');
    });

    it('manual ban', () => {
      expect(ac.ban('p1')).toBe(true);
      expect(ac.isBanned('p1')).toBe(true);
      expect(ac.getTrustScore('p1')).toBe(0);
    });

    it('manual ban with duration', () => {
      ac.ban('p1', 60_000);
      expect(ac.isBanned('p1')).toBe(true);
      expect(ac.getPenalties('p1')[0].duration).toBe(60_000);
    });

    it('unban', () => {
      ac.ban('p1');
      expect(ac.unban('p1')).toBe(true);
      expect(ac.isBanned('p1')).toBe(false);
    });

    it('ban/unban returns false for unknown', () => {
      expect(ac.ban('nope')).toBe(false);
      expect(ac.unban('nope')).toBe(false);
    });

    it('manual mute', () => {
      expect(ac.mute('p1')).toBe(true);
      expect(ac.isMuted('p1')).toBe(true);
    });

    it('manual mute with duration', () => {
      ac.mute('p1', 30_000);
      expect(ac.isMuted('p1')).toBe(true);
      expect(ac.getPenalties('p1')[0].duration).toBe(30_000);
    });

    it('unmute', () => {
      ac.mute('p1');
      expect(ac.unmute('p1')).toBe(true);
      expect(ac.isMuted('p1')).toBe(false);
    });

    it('mute/unmute returns false for unknown', () => {
      expect(ac.mute('nope')).toBe(false);
      expect(ac.unmute('nope')).toBe(false);
    });

    it('pardon restores trust and clears all', () => {
      ac.reportViolation('p1', 'custom', 5, 'Test');
      ac.ban('p1');
      ac.mute('p1');
      expect(ac.pardon('p1')).toBe(true);
      expect(ac.getTrustScore('p1')).toBe(100);
      expect(ac.isBanned('p1')).toBe(false);
      expect(ac.isMuted('p1')).toBe(false);
      expect(ac.getViolations('p1')).toEqual([]);
    });

    it('pardon returns false for unknown', () => {
      expect(ac.pardon('nope')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Tick — Trust Recovery
  // --------------------------------------------------------------------------
  describe('tick — trust recovery', () => {
    it('recovers trust over time', () => {
      vi.useFakeTimers();
      ac = new ServerAntiCheat({ trustRecoveryRate: 10 }); // 10 points/sec
      ac.registerPlayer('p1');
      ac.reportViolation('p1', 'custom', 4, 'Test'); // trust = 80

      vi.advanceTimersByTime(1000); // 1 sec
      ac.tick();
      // Should recover 10 points → 90
      expect(ac.getTrustScore('p1')).toBeCloseTo(90, 0);

      vi.useRealTimers();
    });

    it('trust caps at 100', () => {
      vi.useFakeTimers();
      ac = new ServerAntiCheat({ trustRecoveryRate: 100 });
      ac.registerPlayer('p1');
      ac.reportViolation('p1', 'custom', 1, 'Minor'); // trust = 95

      vi.advanceTimersByTime(1000);
      ac.tick();
      expect(ac.getTrustScore('p1')).toBe(100);

      vi.useRealTimers();
    });

    it('does not recover trust for banned players', () => {
      vi.useFakeTimers();
      ac = new ServerAntiCheat({ trustRecoveryRate: 100 });
      ac.registerPlayer('p1');
      ac.ban('p1');

      vi.advanceTimersByTime(5000);
      ac.tick();
      expect(ac.getTrustScore('p1')).toBe(0);

      vi.useRealTimers();
    });

    it('emits trust_recovered when crossing above warnThreshold', () => {
      vi.useFakeTimers();
      ac = new ServerAntiCheat({ warnThreshold: 50, trustRecoveryRate: 100 });
      ac.registerPlayer('p1');
      ac.reportViolation('p1', 'custom', 10, 'Big'); // trust = 50
      ac.reportViolation('p1', 'custom', 1, 'Cross'); // trust = 45

      const events: AntiCheatEvent[] = [];
      ac.onEvent(e => events.push(e));

      vi.advanceTimersByTime(1000);
      ac.tick();
      expect(events.some(e => e.type === 'trust_recovered')).toBe(true);

      vi.useRealTimers();
    });
  });

  // --------------------------------------------------------------------------
  // Tick — Penalty Expiry
  // --------------------------------------------------------------------------
  describe('tick — penalty expiry', () => {
    it('expires temp ban', () => {
      vi.useFakeTimers();
      ac.registerPlayer('p1');
      ac.ban('p1', 5000);
      expect(ac.isBanned('p1')).toBe(true);

      vi.advanceTimersByTime(5001);
      ac.tick();
      expect(ac.isBanned('p1')).toBe(false);

      vi.useRealTimers();
    });

    it('expires temp mute', () => {
      vi.useFakeTimers();
      ac.registerPlayer('p1');
      ac.mute('p1', 3000);
      expect(ac.isMuted('p1')).toBe(true);

      vi.advanceTimersByTime(3001);
      ac.tick();
      expect(ac.isMuted('p1')).toBe(false);

      vi.useRealTimers();
    });

    it('permanent ban does not expire', () => {
      vi.useFakeTimers();
      ac.registerPlayer('p1');
      ac.ban('p1'); // no duration = permanent

      vi.advanceTimersByTime(999_999);
      ac.tick();
      expect(ac.isBanned('p1')).toBe(true);

      vi.useRealTimers();
    });

    it('emits penalty_expired event', () => {
      vi.useFakeTimers();
      ac.registerPlayer('p1');
      ac.ban('p1', 1000);

      const events: AntiCheatEvent[] = [];
      ac.onEvent(e => events.push(e));

      vi.advanceTimersByTime(1001);
      ac.tick();
      expect(events.some(e => e.type === 'penalty_expired')).toBe(true);

      vi.useRealTimers();
    });
  });

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------
  describe('events', () => {
    it('emits violation event', () => {
      ac.registerPlayer('p1');
      const events: AntiCheatEvent[] = [];
      ac.onEvent(e => events.push(e));

      ac.reportViolation('p1', 'custom', 3, 'Test');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('violation');
      expect(events[0].peerId).toBe('p1');
      expect(events[0].data.violationType).toBe('custom');
    });

    it('emits ban event on manual ban', () => {
      ac.registerPlayer('p1');
      const events: AntiCheatEvent[] = [];
      ac.onEvent(e => events.push(e));

      ac.ban('p1');
      expect(events.some(e => e.type === 'penalty_ban')).toBe(true);
    });

    it('emits mute event on manual mute', () => {
      ac.registerPlayer('p1');
      const events: AntiCheatEvent[] = [];
      ac.onEvent(e => events.push(e));

      ac.mute('p1');
      expect(events.some(e => e.type === 'penalty_mute')).toBe(true);
    });

    it('emits pardon event', () => {
      ac.registerPlayer('p1');
      const events: AntiCheatEvent[] = [];
      ac.onEvent(e => events.push(e));

      ac.pardon('p1');
      expect(events.some(e => e.type === 'player_pardoned')).toBe(true);
    });

    it('unsubscribe works', () => {
      ac.registerPlayer('p1');
      const events: AntiCheatEvent[] = [];
      const unsub = ac.onEvent(e => events.push(e));

      ac.reportViolation('p1', 'custom', 1, 'A');
      expect(events).toHaveLength(1);

      unsub();
      ac.reportViolation('p1', 'custom', 1, 'B');
      expect(events).toHaveLength(1);
    });

    it('offEvent works', () => {
      ac.registerPlayer('p1');
      const events: AntiCheatEvent[] = [];
      const cb = (e: AntiCheatEvent) => events.push(e);
      ac.onEvent(cb);

      ac.reportViolation('p1', 'custom', 1, 'A');
      expect(events).toHaveLength(1);

      ac.offEvent(cb);
      ac.reportViolation('p1', 'custom', 1, 'B');
      expect(events).toHaveLength(1);
    });

    it('swallows listener errors', () => {
      ac.registerPlayer('p1');
      ac.onEvent(() => { throw new Error('Boom'); });
      expect(() => ac.reportViolation('p1', 'custom', 1, 'Test')).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------
  describe('stats', () => {
    it('calculates stats correctly', () => {
      ac.registerPlayer('p1');
      ac.registerPlayer('p2');
      ac.registerPlayer('p3');
      ac.ban('p1');
      ac.mute('p2');
      ac.reportViolation('p3', 'custom', 2, 'Minor');

      const stats = ac.getStats();
      expect(stats.players).toBe(3);
      expect(stats.banned).toBe(1);
      expect(stats.muted).toBe(1);
      expect(stats.totalViolations).toBeGreaterThanOrEqual(1);
      expect(stats.avgTrustScore).toBeGreaterThan(0);
    });

    it('avgTrustScore is 0 with no players', () => {
      expect(ac.getStats().avgTrustScore).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Violation History Trimming
  // --------------------------------------------------------------------------
  describe('violation history trimming', () => {
    it('trims to maxViolationHistory', () => {
      ac = new ServerAntiCheat({ maxViolationHistory: 5, violationWeight: 0 });
      ac.registerPlayer('p1');

      for (let i = 0; i < 10; i++) {
        ac.reportViolation('p1', 'custom', 1, `V${i}`);
      }
      expect(ac.getViolations('p1')).toHaveLength(5);
      // Should keep the last 5
      expect(ac.getViolations('p1')[0].description).toBe('V5');
    });
  });

  // --------------------------------------------------------------------------
  // Destroy
  // --------------------------------------------------------------------------
  describe('destroy', () => {
    it('clears all state', () => {
      ac.registerPlayer('p1');
      ac.registerPlayer('p2');
      ac.onEvent(() => {});

      ac.destroy();
      expect(ac.getStats().players).toBe(0);
      expect(ac.isRegistered('p1')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------
  describe('edge cases', () => {
    it('isBanned returns false for unknown player', () => {
      expect(ac.isBanned('nope')).toBe(false);
    });

    it('isMuted returns false for unknown player', () => {
      expect(ac.isMuted('nope')).toBe(false);
    });

    it('getViolations returns empty array for unknown player', () => {
      expect(ac.getViolations('nope')).toEqual([]);
    });

    it('getViolationCount returns 0 for unknown player', () => {
      expect(ac.getViolationCount('nope')).toBe(0);
    });

    it('getPenalties returns empty array for unknown player', () => {
      expect(ac.getPenalties('nope')).toEqual([]);
    });

    it('validates position in 3D (diagonal)', () => {
      ac.registerPlayer('p1', mkPos(0, 0, 0));
      // diagonal distance = sqrt(3) ≈ 1.73 — well under limits
      const result = ac.validatePosition('p1', mkPos(1, 1, 1));
      expect(result.valid).toBe(true);
    });

    it('multiple violations accumulate trust deduction', () => {
      ac.registerPlayer('p1');
      // 3 violations of severity 3 → -45 total
      ac.reportViolation('p1', 'custom', 3, 'A');
      ac.reportViolation('p1', 'custom', 3, 'B');
      ac.reportViolation('p1', 'custom', 3, 'C');
      expect(ac.getTrustScore('p1')).toBe(55);
    });

    it('getPlayer returns copy, not reference', () => {
      ac.registerPlayer('p1');
      const info = ac.getPlayer('p1')!;
      info.trustScore = 0;
      expect(ac.getTrustScore('p1')).toBe(100);
    });

    it('getConfig returns copy', () => {
      const cfg = ac.getConfig();
      cfg.maxSpeed = 999;
      expect(ac.getConfig().maxSpeed).toBe(20);
    });

    it('position validation: teleport takes priority over speed', () => {
      // Both teleport distance and speed would be violated
      // Teleport should be the violation type reported
      ac = new ServerAntiCheat({ maxTeleportDistance: 50, maxSpeed: 10 });
      ac.registerPlayer('p1');
      const result = ac.validatePosition('p1', mkPos(200, 0, 0));
      expect(result.violation?.type).toBe('teleport');
    });
  });
});
