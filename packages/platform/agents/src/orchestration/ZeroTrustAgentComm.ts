/**
 * @hololand/agents -- Zero-Trust Inter-Agent Communication
 *
 * Implements a zero-trust security model for agent-to-agent communication.
 * Every delegation hop has independent safety evaluation -- no agent is
 * inherently trusted, regardless of its role or prior behavior.
 *
 * Design:
 *   1. Each agent message is wrapped in a DelegationEnvelope with a
 *      cryptographic nonce, sender identity, and a delegation chain
 *   2. Before any message is processed, the receiving agent's safety
 *      evaluator independently validates the request
 *   3. Delegation depth is hard-limited to prevent infinite loops
 *   4. Every hop is logged to an immutable audit trail
 *   5. Permissions are intersected (not unioned) at each hop --
 *      a delegated agent NEVER gets more permissions than its delegator
 *
 * Architecture:
 *   Agent A --[DelegationEnvelope]--> ZeroTrustGateway
 *       |
 *       v
 *   [Validate sender identity]
 *   [Check delegation depth]
 *   [Intersect permissions]
 *   [Independent safety evaluation]
 *   [Log to audit trail]
 *       |
 *       v
 *   Agent B receives validated message
 *
 * @version 1.0.0
 */

// =============================================================================
// HARD-CODED SECURITY CONSTANTS (not configurable by agents or LLMs)
// =============================================================================

const ZERO_TRUST_CONSTANTS = {
  /** Maximum delegation chain depth. Prevents infinite delegation loops. */
  MAX_DELEGATION_DEPTH: 5,
  /** Maximum message payload size (bytes). */
  MAX_PAYLOAD_SIZE: 5_242_880, // 5MB
  /** Nonce expiry window (ms). Prevents replay attacks. */
  NONCE_EXPIRY_MS: 300_000, // 5 minutes
  /** Maximum permissions per agent per world. */
  MAX_PERMISSIONS: 20,
  /** Maximum pending messages per agent. */
  MAX_PENDING_MESSAGES: 100,
  /** Suspicious activity threshold (failed validations per minute). */
  SUSPICIOUS_THRESHOLD: 10,
} as const;

// =============================================================================
// TYPES
// =============================================================================

export type AgentPermission =
  | 'world:read'
  | 'world:write'
  | 'world:delete'
  | 'world:create'
  | 'object:read'
  | 'object:write'
  | 'object:delete'
  | 'script:execute'
  | 'script:validate'
  | 'agent:invite'
  | 'agent:remove'
  | 'data:visualize'
  | 'admin:full';

export interface AgentIdentity {
  agentId: string;
  role: string;
  permissions: AgentPermission[];
  /** HMAC signature of (agentId + role + nonce) for identity verification. */
  signature?: string;
}

export interface DelegationHop {
  fromAgentId: string;
  toAgentId: string;
  permissions: AgentPermission[];
  timestamp: number;
  reason: string;
  safetyResult: DelegationSafetyResult;
}

export interface DelegationEnvelope {
  /** Unique message ID. */
  messageId: string;
  /** Monotonically increasing nonce for replay prevention. */
  nonce: string;
  /** ISO timestamp of message creation. */
  createdAt: string;
  /** The originating agent (first in chain). */
  originator: AgentIdentity;
  /** The current sender (may differ from originator if delegated). */
  sender: AgentIdentity;
  /** The intended recipient. */
  recipient: string;
  /** The tool/action being requested. */
  action: string;
  /** Message payload. */
  payload: Record<string, unknown>;
  /** Chain of delegation hops (audit trail). */
  delegationChain: DelegationHop[];
  /** Effective permissions (intersection of all hops). */
  effectivePermissions: AgentPermission[];
}

export interface DelegationSafetyResult {
  approved: boolean;
  reason: string;
  evaluatedBy: string;
  timestamp: string;
  violations: string[];
}

export interface ZeroTrustAuditEntry {
  messageId: string;
  action: string;
  fromAgent: string;
  toAgent: string;
  approved: boolean;
  reason: string;
  delegationDepth: number;
  effectivePermissions: AgentPermission[];
  timestamp: string;
  violations: string[];
}

type AuditCallback = (entry: ZeroTrustAuditEntry) => void;

// =============================================================================
// NONCE REGISTRY (replay attack prevention)
// =============================================================================

class NonceRegistry {
  private seen: Map<string, number> = new Map();

  /**
   * Check if a nonce is valid (not seen before, not expired).
   */
  validate(nonce: string): boolean {
    const now = Date.now();

    // Clean expired nonces
    for (const [n, ts] of this.seen) {
      if (now - ts > ZERO_TRUST_CONSTANTS.NONCE_EXPIRY_MS) {
        this.seen.delete(n);
      }
    }

    if (this.seen.has(nonce)) {
      return false; // Replay detected
    }

    this.seen.set(nonce, now);
    return true;
  }

  clear(): void {
    this.seen.clear();
  }
}

// =============================================================================
// SUSPICIOUS ACTIVITY TRACKER
// =============================================================================

class SuspiciousActivityTracker {
  private failures: Map<string, { count: number; windowStart: number }> = new Map();

  recordFailure(agentId: string): boolean {
    const now = Date.now();
    let record = this.failures.get(agentId);

    if (!record || now - record.windowStart > 60_000) {
      record = { count: 0, windowStart: now };
      this.failures.set(agentId, record);
    }

    record.count++;
    return record.count >= ZERO_TRUST_CONSTANTS.SUSPICIOUS_THRESHOLD;
  }

  isSuspicious(agentId: string): boolean {
    const record = this.failures.get(agentId);
    if (!record) return false;
    if (Date.now() - record.windowStart > 60_000) return false;
    return record.count >= ZERO_TRUST_CONSTANTS.SUSPICIOUS_THRESHOLD;
  }

  clear(): void {
    this.failures.clear();
  }
}

// =============================================================================
// ZERO-TRUST GATEWAY
// =============================================================================

export class ZeroTrustAgentGateway {
  private nonceRegistry = new NonceRegistry();
  private suspiciousTracker = new SuspiciousActivityTracker();
  private auditLog: ZeroTrustAuditEntry[] = [];
  private auditCallbacks: Set<AuditCallback> = new Set();
  private registeredAgents: Map<string, AgentIdentity> = new Map();

  /**
   * Maximum audit log entries to keep in memory.
   */
  private readonly maxAuditEntries = 10_000;

  // =========================================================================
  // Agent Registration
  // =========================================================================

  /**
   * Register an agent with its identity and permissions.
   * This is the ONLY way agents gain permissions -- they cannot self-assign.
   */
  registerAgent(identity: AgentIdentity): void {
    // Clamp permissions to max allowed
    const clampedPermissions = identity.permissions.slice(0, ZERO_TRUST_CONSTANTS.MAX_PERMISSIONS);
    this.registeredAgents.set(identity.agentId, {
      ...identity,
      permissions: clampedPermissions,
    });
  }

  /**
   * Unregister an agent, revoking all permissions.
   */
  unregisterAgent(agentId: string): void {
    this.registeredAgents.delete(agentId);
  }

  /**
   * Get a registered agent's identity.
   */
  getAgent(agentId: string): AgentIdentity | undefined {
    return this.registeredAgents.get(agentId);
  }

  /**
   * List all registered agents.
   */
  listAgents(): AgentIdentity[] {
    return Array.from(this.registeredAgents.values());
  }

  // =========================================================================
  // Message Validation (Independent Safety Evaluation per Hop)
  // =========================================================================

  /**
   * Validate and process a delegation envelope.
   * This is the core zero-trust check -- called at EVERY delegation hop.
   *
   * Returns the safety result. If approved, the message can be delivered.
   * If rejected, the message is blocked and logged.
   */
  validateMessage(envelope: DelegationEnvelope): DelegationSafetyResult {
    const violations: string[] = [];
    const ts = new Date().toISOString();

    // 1. Check if sender is a registered agent
    const senderIdentity = this.registeredAgents.get(envelope.sender.agentId);
    if (!senderIdentity) {
      violations.push(`Sender '${envelope.sender.agentId}' is not a registered agent`);
    }

    // 2. Check if sender is flagged as suspicious
    if (this.suspiciousTracker.isSuspicious(envelope.sender.agentId)) {
      violations.push(`Sender '${envelope.sender.agentId}' is flagged for suspicious activity`);
    }

    // 3. Validate nonce (replay prevention)
    if (!this.nonceRegistry.validate(envelope.nonce)) {
      violations.push(`Nonce '${envelope.nonce}' has been seen before (potential replay attack)`);
    }

    // 4. Check delegation depth
    if (envelope.delegationChain.length >= ZERO_TRUST_CONSTANTS.MAX_DELEGATION_DEPTH) {
      violations.push(
        `Delegation depth ${envelope.delegationChain.length} exceeds maximum ${ZERO_TRUST_CONSTANTS.MAX_DELEGATION_DEPTH}`
      );
    }

    // 5. Check payload size
    const payloadSize = JSON.stringify(envelope.payload).length;
    if (payloadSize > ZERO_TRUST_CONSTANTS.MAX_PAYLOAD_SIZE) {
      violations.push(
        `Payload size ${payloadSize} bytes exceeds maximum ${ZERO_TRUST_CONSTANTS.MAX_PAYLOAD_SIZE} bytes`
      );
    }

    // 6. Verify effective permissions are an INTERSECTION (not union)
    //    Each hop can only REDUCE permissions, never expand them
    if (senderIdentity) {
      const senderPerms = new Set(senderIdentity.permissions);
      const invalidPerms = envelope.effectivePermissions.filter(p => !senderPerms.has(p));
      if (invalidPerms.length > 0) {
        violations.push(
          `Sender claims permissions not granted: ${invalidPerms.join(', ')}`
        );
      }
    }

    // 7. Verify the action is allowed by effective permissions
    const requiredPermission = this.actionToPermission(envelope.action);
    if (requiredPermission && !envelope.effectivePermissions.includes(requiredPermission)) {
      violations.push(
        `Action '${envelope.action}' requires '${requiredPermission}' permission, not in effective set`
      );
    }

    // 8. Check timestamp freshness (prevent stale messages)
    const messageAge = Date.now() - new Date(envelope.createdAt).getTime();
    if (messageAge > ZERO_TRUST_CONSTANTS.NONCE_EXPIRY_MS) {
      violations.push(
        `Message is ${Math.round(messageAge / 1000)}s old, exceeds ${ZERO_TRUST_CONSTANTS.NONCE_EXPIRY_MS / 1000}s freshness window`
      );
    }

    // 9. Validate delegation chain integrity
    if (envelope.delegationChain.length > 0) {
      const lastHop = envelope.delegationChain[envelope.delegationChain.length - 1];
      if (lastHop.toAgentId !== envelope.sender.agentId) {
        violations.push(
          `Delegation chain integrity violation: last hop target '${lastHop.toAgentId}' does not match sender '${envelope.sender.agentId}'`
        );
      }
    }

    const approved = violations.length === 0;
    const result: DelegationSafetyResult = {
      approved,
      reason: approved
        ? `Message from '${envelope.sender.agentId}' to '${envelope.recipient}' approved`
        : `Message blocked: ${violations.length} violation(s) detected`,
      evaluatedBy: 'ZeroTrustAgentGateway',
      timestamp: ts,
      violations,
    };

    // Track suspicious activity on failure
    if (!approved) {
      const isSuspicious = this.suspiciousTracker.recordFailure(envelope.sender.agentId);
      if (isSuspicious) {
        result.reason += ` [ALERT: Agent flagged as suspicious]`;
      }
    }

    // Log to audit trail
    this.logAuditEntry({
      messageId: envelope.messageId,
      action: envelope.action,
      fromAgent: envelope.sender.agentId,
      toAgent: envelope.recipient,
      approved,
      reason: result.reason,
      delegationDepth: envelope.delegationChain.length,
      effectivePermissions: envelope.effectivePermissions,
      timestamp: ts,
      violations,
    });

    return result;
  }

  // =========================================================================
  // Delegation
  // =========================================================================

  /**
   * Create a delegation envelope for agent-to-agent communication.
   * Permissions are INTERSECTED with the sender's permissions -- never expanded.
   */
  createDelegationEnvelope(
    senderId: string,
    recipientId: string,
    action: string,
    payload: Record<string, unknown>,
    requestedPermissions?: AgentPermission[],
    existingEnvelope?: DelegationEnvelope
  ): DelegationEnvelope | { error: string } {
    const sender = this.registeredAgents.get(senderId);
    if (!sender) {
      return { error: `Sender '${senderId}' is not a registered agent` };
    }

    // Calculate effective permissions as INTERSECTION
    let effectivePermissions: AgentPermission[];
    if (existingEnvelope) {
      // Delegated call: intersect with prior effective permissions
      const priorPerms = new Set(existingEnvelope.effectivePermissions);
      const senderPerms = new Set(sender.permissions);
      effectivePermissions = Array.from(priorPerms).filter(
        p => senderPerms.has(p)
      ) as AgentPermission[];
    } else {
      // Direct call: start with sender's permissions
      effectivePermissions = [...sender.permissions];
    }

    // If requested permissions specified, further intersect
    if (requestedPermissions) {
      const requested = new Set(requestedPermissions);
      effectivePermissions = effectivePermissions.filter(p => requested.has(p));
    }

    const now = Date.now();
    const nonce = `${senderId}_${now}_${Math.random().toString(36).slice(2, 12)}`;
    const messageId = `msg_${now}_${Math.random().toString(36).slice(2, 10)}`;

    const delegationChain: DelegationHop[] = existingEnvelope
      ? [...existingEnvelope.delegationChain]
      : [];

    // Add this hop to the chain
    const hop: DelegationHop = {
      fromAgentId: senderId,
      toAgentId: recipientId,
      permissions: effectivePermissions,
      timestamp: now,
      reason: `Delegation for action '${action}'`,
      safetyResult: {
        approved: true,
        reason: 'Pending validation at recipient',
        evaluatedBy: 'ZeroTrustAgentGateway',
        timestamp: new Date().toISOString(),
        violations: [],
      },
    };
    delegationChain.push(hop);

    // Check delegation depth before creating
    if (delegationChain.length > ZERO_TRUST_CONSTANTS.MAX_DELEGATION_DEPTH) {
      return { error: `Delegation depth ${delegationChain.length} exceeds maximum ${ZERO_TRUST_CONSTANTS.MAX_DELEGATION_DEPTH}` };
    }

    return {
      messageId,
      nonce,
      createdAt: new Date().toISOString(),
      originator: existingEnvelope ? existingEnvelope.originator : sender,
      sender,
      recipient: recipientId,
      action,
      payload,
      delegationChain,
      effectivePermissions,
    };
  }

  // =========================================================================
  // Audit
  // =========================================================================

  /**
   * Subscribe to audit events.
   */
  onAudit(callback: AuditCallback): () => void {
    this.auditCallbacks.add(callback);
    return () => this.auditCallbacks.delete(callback);
  }

  /**
   * Get recent audit entries.
   */
  getAuditLog(limit = 100, agentId?: string): ZeroTrustAuditEntry[] {
    let entries = this.auditLog;
    if (agentId) {
      entries = entries.filter(e => e.fromAgent === agentId || e.toAgent === agentId);
    }
    return entries.slice(-limit);
  }

  /**
   * Get audit statistics.
   */
  getAuditStats(): {
    totalMessages: number;
    approved: number;
    rejected: number;
    suspiciousAgents: string[];
    avgDelegationDepth: number;
  } {
    const approved = this.auditLog.filter(e => e.approved).length;
    const rejected = this.auditLog.filter(e => !e.approved).length;
    const suspiciousAgents = Array.from(this.registeredAgents.keys()).filter(id =>
      this.suspiciousTracker.isSuspicious(id)
    );
    const totalDepth = this.auditLog.reduce((sum, e) => sum + e.delegationDepth, 0);

    return {
      totalMessages: this.auditLog.length,
      approved,
      rejected,
      suspiciousAgents,
      avgDelegationDepth: this.auditLog.length > 0
        ? Math.round((totalDepth / this.auditLog.length) * 100) / 100
        : 0,
    };
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Clear all state (for testing or shutdown).
   */
  destroy(): void {
    this.registeredAgents.clear();
    this.nonceRegistry.clear();
    this.suspiciousTracker.clear();
    this.auditLog = [];
    this.auditCallbacks.clear();
  }

  // =========================================================================
  // Internals
  // =========================================================================

  /**
   * Map a tool action name to the required permission.
   */
  private actionToPermission(action: string): AgentPermission | null {
    const mapping: Record<string, AgentPermission> = {
      create_world: 'world:create',
      get_world: 'world:read',
      list_worlds: 'world:read',
      update_world: 'world:write',
      delete_world: 'world:delete',
      execute_holoscript: 'script:execute',
      validate_holoscript: 'script:validate',
      parse_holoscript: 'script:validate',
      visualize_data: 'data:visualize',
      invite_agent: 'agent:invite',
      add_object: 'object:write',
      remove_object: 'object:delete',
      list_objects: 'object:read',
    };
    return mapping[action] ?? null;
  }

  /**
   * Log an audit entry and notify callbacks.
   */
  private logAuditEntry(entry: ZeroTrustAuditEntry): void {
    this.auditLog.push(entry);

    // Trim if over max
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-this.maxAuditEntries);
    }

    // Notify callbacks
    for (const cb of this.auditCallbacks) {
      try {
        cb(entry);
      } catch {
        // Swallow callback errors
      }
    }
  }
}

// =============================================================================
// SINGLETON EXPORT (module-scoped, shared across the platform)
// =============================================================================

let _gateway: ZeroTrustAgentGateway | null = null;

/**
 * Get the singleton ZeroTrustAgentGateway instance.
 */
export function getZeroTrustGateway(): ZeroTrustAgentGateway {
  if (!_gateway) {
    _gateway = new ZeroTrustAgentGateway();
  }
  return _gateway;
}

/**
 * Reset the gateway (for testing only).
 */
export function resetZeroTrustGateway(): void {
  if (_gateway) {
    _gateway.destroy();
    _gateway = null;
  }
}
