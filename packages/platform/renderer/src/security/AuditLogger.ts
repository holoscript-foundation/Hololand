/**
 * Append-only audit logger for CRDT operations and cross-reality handoffs.
 *
 * All entries are immutable once created. The log trims oldest entries
 * (FIFO) when `maxEntries` is exceeded so memory stays bounded.
 *
 * @module security/AuditLogger
 */

export interface AuditEntry {
  /** Unique identifier for this audit entry. */
  id: string;
  /** Unix epoch timestamp (ms) when the entry was created. */
  timestamp: number;
  /** The kind of event being recorded. */
  eventType:
    | 'handoff:initiated'
    | 'handoff:completed'
    | 'handoff:failed'
    | 'crdt:operation'
    | 'crdt:rejected'
    | 'auth:token-issued'
    | 'auth:token-revoked'
    | 'rate:limited';
  /** Identifier of the device that triggered the event. */
  deviceId: string;
  /** Identifier of the agent involved. */
  agentId: string;
  /** Arbitrary structured details about the event. */
  details: Record<string, unknown>;
  /** Severity level of this event. */
  severity: 'info' | 'warn' | 'error' | 'critical';
}

/**
 * Monotonically increasing counter used as part of the entry id
 * to guarantee uniqueness within a single process.
 */
let idCounter = 0;

export class AuditLogger {
  private entries: AuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries: number = 10_000) {
    this.maxEntries = maxEntries;
  }

  // ── write path (append-only) ──────────────────────────────────────────

  /**
   * Append an audit event.
   *
   * `id` and `timestamp` are generated automatically; the caller provides
   * all other fields.
   */
  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const auditEntry: AuditEntry = {
      id: `audit:${Date.now()}:${++idCounter}:${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      ...entry,
    };

    this.entries.push(auditEntry);
    this.trim();

    return auditEntry;
  }

  // ── read / query path ─────────────────────────────────────────────────

  /** Return all entries whose `eventType` matches. */
  queryByType(eventType: AuditEntry['eventType']): AuditEntry[] {
    return this.entries.filter((e) => e.eventType === eventType);
  }

  /** Return all entries from a given device. */
  queryByDevice(deviceId: string): AuditEntry[] {
    return this.entries.filter((e) => e.deviceId === deviceId);
  }

  /** Return entries whose timestamp falls within `[startMs, endMs]`. */
  queryByTimeRange(startMs: number, endMs: number): AuditEntry[] {
    return this.entries.filter(
      (e) => e.timestamp >= startMs && e.timestamp <= endMs,
    );
  }

  /** Return entries at the given severity level. */
  queryBySeverity(severity: AuditEntry['severity']): AuditEntry[] {
    return this.entries.filter((e) => e.severity === severity);
  }

  /** Total number of stored entries. */
  get size(): number {
    return this.entries.length;
  }

  /** Export a defensive copy of every entry (for compliance / archival). */
  exportAll(): AuditEntry[] {
    return [...this.entries];
  }

  // ── internal ──────────────────────────────────────────────────────────

  /** Trim oldest entries so the log never exceeds `maxEntries` (FIFO). */
  private trim(): void {
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(this.entries.length - this.maxEntries);
    }
  }
}
