import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import { AuditLogger } from '../security/AuditLogger';
import type { AuditEntry } from '../security/AuditLogger';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger(100);
  });

  // ── 1. append-only: entries are immutable once created ──────────────

  it('should append entries with auto-generated id and timestamp', () => {
    const entry = logger.log({
      eventType: 'handoff:initiated',
      deviceId: 'device-1',
      agentId: 'agent-1',
      details: { target: 'device-2' },
      severity: 'info',
    });

    expect(entry.id).toMatch(/^audit:/);
    expect(entry.timestamp).toBeGreaterThan(0);
    expect(entry.eventType).toBe('handoff:initiated');
    expect(logger.size).toBe(1);

    // Log a second entry and verify both are present
    logger.log({
      eventType: 'handoff:completed',
      deviceId: 'device-1',
      agentId: 'agent-1',
      details: {},
      severity: 'info',
    });
    expect(logger.size).toBe(2);
  });

  // ── 2. query by event type ──────────────────────────────────────────

  it('should query entries by event type', () => {
    logger.log({
      eventType: 'crdt:operation',
      deviceId: 'device-1',
      agentId: 'agent-1',
      details: { key: 'pos' },
      severity: 'info',
    });
    logger.log({
      eventType: 'crdt:rejected',
      deviceId: 'device-1',
      agentId: 'agent-1',
      details: { reason: 'conflict' },
      severity: 'warn',
    });
    logger.log({
      eventType: 'crdt:operation',
      deviceId: 'device-2',
      agentId: 'agent-2',
      details: { key: 'rot' },
      severity: 'info',
    });

    const ops = logger.queryByType('crdt:operation');
    expect(ops).toHaveLength(2);
    expect(ops.every((e) => e.eventType === 'crdt:operation')).toBe(true);

    const rejected = logger.queryByType('crdt:rejected');
    expect(rejected).toHaveLength(1);
  });

  // ── 3. query by time range ──────────────────────────────────────────

  it('should query entries by time range', () => {
    vi.useFakeTimers();

    const t0 = Date.now();

    logger.log({
      eventType: 'handoff:initiated',
      deviceId: 'device-1',
      agentId: 'agent-1',
      details: {},
      severity: 'info',
    });

    vi.advanceTimersByTime(5000);
    const t1 = Date.now();

    logger.log({
      eventType: 'handoff:completed',
      deviceId: 'device-1',
      agentId: 'agent-1',
      details: {},
      severity: 'info',
    });

    vi.advanceTimersByTime(5000);

    logger.log({
      eventType: 'handoff:failed',
      deviceId: 'device-1',
      agentId: 'agent-1',
      details: { error: 'timeout' },
      severity: 'error',
    });

    // Query only entries from t1 onward (should exclude the first)
    const results = logger.queryByTimeRange(t1, Date.now());
    expect(results).toHaveLength(2);
    expect(results[0].eventType).toBe('handoff:completed');
    expect(results[1].eventType).toBe('handoff:failed');

    vi.useRealTimers();
  });

  // ── 4. trim at maxEntries (FIFO) ───────────────────────────────────

  it('should trim oldest entries when maxEntries is exceeded', () => {
    const smallLogger = new AuditLogger(5);

    for (let i = 0; i < 10; i++) {
      smallLogger.log({
        eventType: 'crdt:operation',
        deviceId: `device-${i}`,
        agentId: 'agent-1',
        details: { seq: i },
        severity: 'info',
      });
    }

    expect(smallLogger.size).toBe(5);

    const all = smallLogger.exportAll();
    // Should have kept the last 5 entries (seq 5..9)
    expect((all[0].details as { seq: number }).seq).toBe(5);
    expect((all[4].details as { seq: number }).seq).toBe(9);
  });

  // ── 5. exportAll returns a defensive copy ───────────────────────────

  it('should export all entries as a defensive copy', () => {
    logger.log({
      eventType: 'auth:token-issued',
      deviceId: 'device-1',
      agentId: 'agent-1',
      details: { token: 'tok-abc' },
      severity: 'info',
    });
    logger.log({
      eventType: 'rate:limited',
      deviceId: 'device-2',
      agentId: 'agent-2',
      details: { remaining: 0 },
      severity: 'warn',
    });

    const exported = logger.exportAll();
    expect(exported).toHaveLength(2);

    // Mutating the exported array should not affect the logger
    exported.pop();
    expect(logger.size).toBe(2);
  });
});
