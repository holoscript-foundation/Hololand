/**
 * @hololand/mcp-server -- MCP Tool-Call Audit Logger
 *
 * Comprehensive audit logging for ALL MCP tool calls across the 8 core
 * HoloLand MCP tools plus extended tools (Brittney, HoloScript, etc.).
 *
 * Every tool invocation is logged with:
 *   - Tool name, arguments, and trace ID
 *   - Caller identity (agent ID or 'anonymous')
 *   - Timestamp and duration
 *   - Success/failure status and error details
 *   - Safety invariant check results (from VRSafetyInvariants)
 *   - Zero-trust validation results (from ZeroTrustAgentComm)
 *
 * The audit log is:
 *   - Append-only (entries cannot be modified or deleted at runtime)
 *   - Bounded (configurable max entries, oldest evicted first)
 *   - Observable (callbacks for real-time monitoring)
 *   - Exportable (JSON format for external SIEM integration)
 *
 * The 8 core MCP tools audited:
 *   1. create_world
 *   2. execute_holoscript
 *   3. visualize_data
 *   4. invite_agent
 *   5. get_world
 *   6. list_worlds
 *   7. update_world
 *   8. delete_world
 *
 * @version 1.0.0
 */

// =============================================================================
// TYPES
// =============================================================================

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AuditOutcome = 'success' | 'failure' | 'blocked_by_safety' | 'blocked_by_zero_trust';

export interface MCPAuditEntry {
  /** Unique audit entry ID. */
  id: string;
  /** MCP trace ID (correlates with response). */
  traceId: string;
  /** Tool name that was called. */
  tool: string;
  /** Sanitized arguments (secrets redacted). */
  args: Record<string, unknown>;
  /** Agent ID or caller identifier. */
  callerId: string;
  /** ISO timestamp of the call. */
  timestamp: string;
  /** Duration of the call in milliseconds (-1 if not yet completed). */
  durationMs: number;
  /** Outcome of the call. */
  outcome: AuditOutcome;
  /** Severity level for alerting. */
  severity: AuditSeverity;
  /** Error message if failed. */
  error?: string;
  /** Safety invariant results (if safety checks were run). */
  safetyResults?: Array<{
    invariant: string;
    allowed: boolean;
    reason: string;
  }>;
  /** Zero-trust validation result (if agent communication was validated). */
  zeroTrustResult?: {
    approved: boolean;
    reason: string;
    violations: string[];
  };
  /** Whether this is one of the 8 core MCP tools. */
  isCoreToolCall: boolean;
  /** IP or connection metadata (if available). */
  connectionMeta?: Record<string, string>;
}

export interface AuditLogStats {
  totalEntries: number;
  coreToolCalls: number;
  extendedToolCalls: number;
  successCount: number;
  failureCount: number;
  blockedBySafety: number;
  blockedByZeroTrust: number;
  avgDurationMs: number;
  topToolsByUsage: Array<{ tool: string; count: number }>;
  topCallers: Array<{ callerId: string; count: number }>;
  recentErrors: Array<{ tool: string; error: string; timestamp: string }>;
}

type AuditObserver = (entry: MCPAuditEntry) => void;

// =============================================================================
// CONSTANTS
// =============================================================================

/** The 8 core HoloLand MCP tools. */
const CORE_MCP_TOOLS = new Set([
  'create_world',
  'execute_holoscript',
  'visualize_data',
  'invite_agent',
  'get_world',
  'list_worlds',
  'update_world',
  'delete_world',
]);

/** Argument keys that should be redacted in audit logs. */
const REDACTED_ARG_KEYS = new Set([
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'authorization',
  'credentials',
  'private_key',
  'privateKey',
]);

/** Maximum audit entries kept in memory. */
const MAX_AUDIT_ENTRIES = 50_000;

/** Maximum recent errors to track. */
const MAX_RECENT_ERRORS = 100;

// =============================================================================
// MCP AUDIT LOGGER
// =============================================================================

export class MCPAuditLogger {
  private entries: MCPAuditEntry[] = [];
  private observers: Set<AuditObserver> = new Set();
  private recentErrors: Array<{ tool: string; error: string; timestamp: string }> = [];
  private toolUsageCounts: Map<string, number> = new Map();
  private callerUsageCounts: Map<string, number> = new Map();

  // =========================================================================
  // Logging
  // =========================================================================

  /**
   * Log a tool call start. Returns the audit entry ID for completion tracking.
   */
  logCallStart(
    tool: string,
    args: Record<string, unknown>,
    traceId: string,
    callerId: string = 'anonymous',
    connectionMeta?: Record<string, string>
  ): string {
    const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const sanitizedArgs = this.sanitizeArgs(args);

    const entry: MCPAuditEntry = {
      id,
      traceId,
      tool,
      args: sanitizedArgs,
      callerId,
      timestamp: new Date().toISOString(),
      durationMs: -1,
      outcome: 'success', // Will be updated on completion
      severity: 'info',
      isCoreToolCall: CORE_MCP_TOOLS.has(tool),
      connectionMeta,
    };

    this.appendEntry(entry);

    // Track usage counts
    this.toolUsageCounts.set(tool, (this.toolUsageCounts.get(tool) ?? 0) + 1);
    this.callerUsageCounts.set(callerId, (this.callerUsageCounts.get(callerId) ?? 0) + 1);

    return id;
  }

  /**
   * Log that a call was blocked by VR safety invariants.
   */
  logSafetyBlock(
    auditId: string,
    safetyResults: Array<{ invariant: string; allowed: boolean; reason: string }>
  ): void {
    const entry = this.findEntry(auditId);
    if (!entry) return;

    entry.outcome = 'blocked_by_safety';
    entry.severity = 'warning';
    entry.safetyResults = safetyResults;
    entry.durationMs = Date.now() - new Date(entry.timestamp).getTime();
    entry.error = `Blocked by safety invariants: ${safetyResults
      .filter(r => !r.allowed)
      .map(r => r.invariant)
      .join(', ')}`;

    this.notifyObservers(entry);
  }

  /**
   * Log that a call was blocked by zero-trust validation.
   */
  logZeroTrustBlock(
    auditId: string,
    result: { approved: boolean; reason: string; violations: string[] }
  ): void {
    const entry = this.findEntry(auditId);
    if (!entry) return;

    entry.outcome = 'blocked_by_zero_trust';
    entry.severity = 'warning';
    entry.zeroTrustResult = result;
    entry.durationMs = Date.now() - new Date(entry.timestamp).getTime();
    entry.error = `Blocked by zero-trust: ${result.violations.join('; ')}`;

    this.notifyObservers(entry);
  }

  /**
   * Log successful completion of a tool call.
   */
  logCallSuccess(auditId: string): void {
    const entry = this.findEntry(auditId);
    if (!entry) return;

    entry.outcome = 'success';
    entry.severity = 'info';
    entry.durationMs = Date.now() - new Date(entry.timestamp).getTime();

    this.notifyObservers(entry);
  }

  /**
   * Log a failed tool call.
   */
  logCallFailure(auditId: string, error: string): void {
    const entry = this.findEntry(auditId);
    if (!entry) return;

    entry.outcome = 'failure';
    entry.severity = 'error';
    entry.error = error;
    entry.durationMs = Date.now() - new Date(entry.timestamp).getTime();

    // Track recent errors
    this.recentErrors.push({
      tool: entry.tool,
      error,
      timestamp: entry.timestamp,
    });
    if (this.recentErrors.length > MAX_RECENT_ERRORS) {
      this.recentErrors.shift();
    }

    this.notifyObservers(entry);
  }

  // =========================================================================
  // Querying
  // =========================================================================

  /**
   * Get recent audit entries, optionally filtered.
   */
  getEntries(options?: {
    limit?: number;
    tool?: string;
    callerId?: string;
    outcome?: AuditOutcome;
    coreOnly?: boolean;
    since?: string;
  }): MCPAuditEntry[] {
    let filtered = this.entries;

    if (options?.tool) {
      filtered = filtered.filter(e => e.tool === options.tool);
    }
    if (options?.callerId) {
      filtered = filtered.filter(e => e.callerId === options.callerId);
    }
    if (options?.outcome) {
      filtered = filtered.filter(e => e.outcome === options.outcome);
    }
    if (options?.coreOnly) {
      filtered = filtered.filter(e => e.isCoreToolCall);
    }
    if (options?.since) {
      const sinceTime = new Date(options.since).getTime();
      filtered = filtered.filter(e => new Date(e.timestamp).getTime() >= sinceTime);
    }

    const limit = options?.limit ?? 100;
    return filtered.slice(-limit);
  }

  /**
   * Get a specific audit entry by ID.
   */
  getEntry(auditId: string): MCPAuditEntry | undefined {
    return this.entries.find(e => e.id === auditId);
  }

  /**
   * Get comprehensive audit statistics.
   */
  getStats(): AuditLogStats {
    const coreToolCalls = this.entries.filter(e => e.isCoreToolCall).length;
    const successCount = this.entries.filter(e => e.outcome === 'success').length;
    const failureCount = this.entries.filter(e => e.outcome === 'failure').length;
    const blockedBySafety = this.entries.filter(e => e.outcome === 'blocked_by_safety').length;
    const blockedByZeroTrust = this.entries.filter(e => e.outcome === 'blocked_by_zero_trust').length;

    const completedEntries = this.entries.filter(e => e.durationMs >= 0);
    const avgDurationMs = completedEntries.length > 0
      ? Math.round(completedEntries.reduce((sum, e) => sum + e.durationMs, 0) / completedEntries.length)
      : 0;

    // Top tools by usage
    const topToolsByUsage = Array.from(this.toolUsageCounts.entries())
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top callers
    const topCallers = Array.from(this.callerUsageCounts.entries())
      .map(([callerId, count]) => ({ callerId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEntries: this.entries.length,
      coreToolCalls,
      extendedToolCalls: this.entries.length - coreToolCalls,
      successCount,
      failureCount,
      blockedBySafety,
      blockedByZeroTrust,
      avgDurationMs,
      topToolsByUsage,
      topCallers,
      recentErrors: this.recentErrors.slice(-10),
    };
  }

  // =========================================================================
  // Export
  // =========================================================================

  /**
   * Export audit log as JSON (for SIEM/external logging integration).
   */
  exportJSON(options?: { since?: string; coreOnly?: boolean }): string {
    const entries = this.getEntries({
      limit: MAX_AUDIT_ENTRIES,
      since: options?.since,
      coreOnly: options?.coreOnly,
    });

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      server: 'hololand-mcp',
      version: '1.0.0',
      entryCount: entries.length,
      stats: this.getStats(),
      entries,
    }, null, 2);
  }

  // =========================================================================
  // Observing
  // =========================================================================

  /**
   * Subscribe to audit events in real-time.
   * Returns an unsubscribe function.
   */
  observe(callback: AuditObserver): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Clear all audit data (for testing only).
   */
  clear(): void {
    this.entries = [];
    this.recentErrors = [];
    this.toolUsageCounts.clear();
    this.callerUsageCounts.clear();
    this.observers.clear();
  }

  /**
   * Get total entry count.
   */
  get size(): number {
    return this.entries.length;
  }

  // =========================================================================
  // Internals
  // =========================================================================

  /**
   * Sanitize arguments by redacting sensitive fields.
   */
  private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (REDACTED_ARG_KEYS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeArgs(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Find an entry by ID (for updating).
   */
  private findEntry(auditId: string): MCPAuditEntry | undefined {
    // Search from the end (most recent) for performance
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i].id === auditId) {
        return this.entries[i];
      }
    }
    return undefined;
  }

  /**
   * Append an entry (bounded, oldest evicted first).
   */
  private appendEntry(entry: MCPAuditEntry): void {
    this.entries.push(entry);
    if (this.entries.length > MAX_AUDIT_ENTRIES) {
      this.entries = this.entries.slice(-MAX_AUDIT_ENTRIES);
    }
  }

  /**
   * Notify all observers of an audit event.
   */
  private notifyObservers(entry: MCPAuditEntry): void {
    for (const cb of this.observers) {
      try {
        cb(entry);
      } catch {
        // Swallow observer errors
      }
    }
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let _auditLogger: MCPAuditLogger | null = null;

/**
 * Get the singleton MCPAuditLogger instance.
 */
export function getMCPAuditLogger(): MCPAuditLogger {
  if (!_auditLogger) {
    _auditLogger = new MCPAuditLogger();
  }
  return _auditLogger;
}

/**
 * Reset the audit logger (for testing only).
 */
export function resetMCPAuditLogger(): void {
  if (_auditLogger) {
    _auditLogger.clear();
    _auditLogger = null;
  }
}
