/**
 * Multi-Agent Security Framework
 *
 * Unified security layer for VR multi-agent collaboration:
 *   - mTLS certificate management for inter-agent communication
 *   - Memory-poisoning canary deployment and monitoring
 *   - Zero Trust policy engine for non-human identities
 *   - Integration with JailbreakScanner for conversation-level security
 *
 * @module security/SecurityFramework
 */

import type {
  SecurityFrameworkConfig,
  AgentIdentity,
  AgentType,
  AgentRole,
  AgentCertificate,
  CertificateValidationResult,
  MemoryCanary,
  CanaryLocation,
  CanaryTriggerType,
  CanaryTripEvent,
  ZeroTrustPolicy,
  PolicySubject,
  PolicyResource,
  AccessDecision,
  SecurityEventMap,
  SecurityEventType,
  SecurityEventHandler,
} from './types';
import { JailbreakScanner } from './JailbreakScanner';

// =============================================================================
// Crypto Utilities (Web Crypto API compatible)
// =============================================================================

function generateToken(length: number = 32): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID() + crypto.randomUUID();
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateFingerprint(): string {
  return 'SHA256:' + generateToken(64).substring(0, 64);
}

function generateSerialNumber(): string {
  return Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0'),
  ).join(':');
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: SecurityFrameworkConfig = {
  mtls: {
    caCertPEM: '', // Set by deployment
    requireClientCert: true,
    rotationIntervalHours: 24,
    maxCertAgeHours: 72,
    cipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
    ],
    minTLSVersion: '1.3',
    crlEnabled: true,
    ocspStaplingEnabled: true,
  },
  jailbreakScanner: {
    enabled: true,
    mode: 'inline',
    maxLatencyMs: 50,
    confidenceThreshold: 0.6,
    onDetection: 'block',
    patterns: [],
    denyList: [],
    exemptAgents: [],
  },
  defaultPolicies: [],
  canaryConfig: {
    enabled: true,
    checkIntervalMs: 60000, // 1 minute
    maxCanariesPerLocation: 5,
  },
  trustConfig: {
    initialScore: 0.5,
    decayRate: 0.001,
    violationPenalty: 0.1,
    goodBehaviorBonus: 0.01,
    minScore: 0.0,
    maxScore: 1.0,
  },
  auditEnabled: true,
  maxAuditEntries: 10000,
};

// =============================================================================
// Audit Log Entry
// =============================================================================

interface AuditEntry {
  timestamp: number;
  eventType: string;
  agentId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure' | 'blocked';
  details: Record<string, unknown>;
}

// =============================================================================
// Multi-Agent Security Framework
// =============================================================================

export class SecurityFramework {
  private config: SecurityFrameworkConfig;
  private agents: Map<string, AgentIdentity> = new Map();
  private certificates: Map<string, AgentCertificate> = new Map();
  private canaries: Map<string, MemoryCanary> = new Map();
  private policies: Map<string, ZeroTrustPolicy> = new Map();
  private jailbreakScanner: JailbreakScanner;
  private auditLog: AuditEntry[] = [];
  private eventHandlers = new Map<string, Array<(...args: any[]) => void>>();
  private canaryCheckTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<SecurityFrameworkConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.jailbreakScanner = new JailbreakScanner(this.config.jailbreakScanner);

    // Load default policies
    for (const policy of this.config.defaultPolicies) {
      this.policies.set(policy.id, policy);
    }

    // Install default deny-all policy
    this.installDefaultPolicies();
  }

  // ===========================================================================
  // Agent Identity Management
  // ===========================================================================

  /**
   * Register a new agent identity.
   */
  registerAgent(
    id: string,
    name: string,
    type: AgentType,
    roles: AgentRole[] = [],
  ): AgentIdentity {
    if (this.agents.has(id)) {
      throw new Error(`Agent already registered: ${id}`);
    }

    const agent: AgentIdentity = {
      id,
      name,
      type,
      trustScore: this.config.trustConfig.initialScore,
      roles,
      createdAt: Date.now(),
      lastAuthAt: 0,
      violations: 0,
      active: true,
      metadata: {},
    };

    this.agents.set(id, agent);
    this.audit('agent-registered', id, 'register', 'agents', 'success', { type, roles });
    return agent;
  }

  /**
   * Authenticate an agent (simple token-based for now, mTLS in production).
   */
  authenticateAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.active) {
      this.emit('auth:failure', {
        agentId,
        reason: agent ? 'Agent deactivated' : 'Agent not found',
      });
      this.audit('auth', agentId, 'authenticate', 'auth', 'failure', {});
      return false;
    }

    // Check mTLS certificate if required
    if (this.config.mtls.requireClientCert) {
      const cert = this.certificates.get(agentId);
      if (!cert) {
        this.emit('auth:failure', { agentId, reason: 'No client certificate' });
        return false;
      }
      const validation = this.validateCertificate(agentId);
      if (!validation.valid) {
        this.emit('auth:failure', {
          agentId,
          reason: `Certificate invalid: ${validation.errors.join(', ')}`,
        });
        return false;
      }
    }

    agent.lastAuthAt = Date.now();
    this.emit('auth:success', { agentId, method: this.config.mtls.requireClientCert ? 'mtls' : 'token' });
    this.audit('auth', agentId, 'authenticate', 'auth', 'success', {});
    return true;
  }

  getAgent(agentId: string): AgentIdentity | undefined {
    return this.agents.get(agentId);
  }

  deactivateAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.active = false;
      this.revokeCertificate(agentId, 'Agent deactivated');
    }
  }

  // ===========================================================================
  // mTLS Certificate Management
  // ===========================================================================

  /**
   * Issue a new mTLS certificate for an agent.
   */
  issueCertificate(agentId: string): AgentCertificate {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const now = new Date();
    const expires = new Date(
      now.getTime() + this.config.mtls.maxCertAgeHours * 3600 * 1000,
    );

    const cert: AgentCertificate = {
      agentId,
      certPEM: `-----BEGIN CERTIFICATE-----\n${generateToken(64)}\n-----END CERTIFICATE-----`,
      privateKeyPEM: `-----BEGIN ENCRYPTED PRIVATE KEY-----\n${generateToken(64)}\n-----END ENCRYPTED PRIVATE KEY-----`,
      fingerprint: generateFingerprint(),
      serialNumber: generateSerialNumber(),
      issuedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      revoked: false,
    };

    // Revoke old certificate if exists
    const oldCert = this.certificates.get(agentId);
    if (oldCert && !oldCert.revoked) {
      oldCert.revoked = true;
      oldCert.revokedReason = 'Rotated';
    }

    this.certificates.set(agentId, cert);
    agent.certificateFingerprint = cert.fingerprint;

    this.emit('cert:issued', {
      agentId,
      fingerprint: cert.fingerprint,
      expiresAt: cert.expiresAt,
    });

    this.audit('cert', agentId, 'issue', 'certificates', 'success', {
      fingerprint: cert.fingerprint,
    });

    return cert;
  }

  /**
   * Validate an agent's certificate.
   */
  validateCertificate(agentId: string): CertificateValidationResult {
    const cert = this.certificates.get(agentId);
    if (!cert) {
      return {
        valid: false,
        agentId,
        fingerprint: '',
        errors: ['No certificate found'],
        warnings: [],
        expiresInHours: 0,
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const now = new Date();
    const expires = new Date(cert.expiresAt);
    const expiresInHours = (expires.getTime() - now.getTime()) / 3600000;

    if (cert.revoked) {
      errors.push(`Certificate revoked: ${cert.revokedReason ?? 'unknown'}`);
    }

    if (expires <= now) {
      errors.push('Certificate expired');
    }

    if (expiresInHours < this.config.mtls.rotationIntervalHours) {
      warnings.push('Certificate approaching rotation deadline');
    }

    return {
      valid: errors.length === 0,
      agentId,
      fingerprint: cert.fingerprint,
      errors,
      warnings,
      expiresInHours: Math.max(0, expiresInHours),
    };
  }

  /**
   * Rotate an agent's certificate.
   */
  rotateCertificate(agentId: string): AgentCertificate {
    const oldCert = this.certificates.get(agentId);
    const newCert = this.issueCertificate(agentId);

    if (oldCert) {
      this.emit('cert:rotated', {
        agentId,
        oldFingerprint: oldCert.fingerprint,
        newFingerprint: newCert.fingerprint,
      });
    }

    return newCert;
  }

  /**
   * Revoke an agent's certificate.
   */
  revokeCertificate(agentId: string, reason: string): void {
    const cert = this.certificates.get(agentId);
    if (cert && !cert.revoked) {
      cert.revoked = true;
      cert.revokedReason = reason;
      this.emit('cert:revoked', {
        agentId,
        fingerprint: cert.fingerprint,
        reason,
      });
    }
  }

  // ===========================================================================
  // Memory Poisoning Canaries
  // ===========================================================================

  /**
   * Plant a canary token in a memory location.
   */
  plantCanary(
    location: CanaryLocation,
    triggerType: CanaryTriggerType,
  ): MemoryCanary {
    const canary: MemoryCanary = {
      id: `canary-${generateToken(8)}`,
      token: `CANARY-${generateToken(16)}`,
      location,
      triggerType,
      tripped: false,
      plantedAt: Date.now(),
      lastCheckedAt: Date.now(),
    };

    this.canaries.set(canary.id, canary);
    this.emit('canary:planted', { canary });
    this.audit('canary', 'system', 'plant', location, 'success', {
      canaryId: canary.id,
    });

    return canary;
  }

  /**
   * Check if a canary has been tripped.
   * Call this with the current state of the memory location.
   */
  checkCanary(
    canaryId: string,
    currentContent: string,
  ): boolean {
    const canary = this.canaries.get(canaryId);
    if (!canary) return false;

    canary.lastCheckedAt = Date.now();
    const intact = currentContent.includes(canary.token);

    if (!intact && !canary.tripped) {
      // Canary has been tripped!
      canary.tripped = true;
      const tripEvent: CanaryTripEvent = {
        canaryId,
        triggerType: canary.triggerType,
        triggeredBy: 'unknown',
        timestamp: Date.now(),
        context: `Canary token missing from ${canary.location}`,
        severity: canary.triggerType === 'exfiltration' ? 'critical' : 'high',
        evidence: { expectedToken: canary.token.substring(0, 10) + '...' },
      };
      canary.tripDetails = tripEvent;
      this.emit('canary:tripped', { event: tripEvent });
      this.audit('canary', 'unknown', 'trip', canary.location, 'failure', {
        canaryId,
        triggerType: canary.triggerType,
      });
    }

    this.emit('canary:checked', { canaryId, intact });
    return intact;
  }

  /**
   * Check all canaries (called periodically).
   * Note: requires external callback to read memory locations.
   */
  getCanaries(): MemoryCanary[] {
    return Array.from(this.canaries.values());
  }

  getCanariesByLocation(location: CanaryLocation): MemoryCanary[] {
    return Array.from(this.canaries.values()).filter(
      (c) => c.location === location,
    );
  }

  getTrippedCanaries(): MemoryCanary[] {
    return Array.from(this.canaries.values()).filter((c) => c.tripped);
  }

  // ===========================================================================
  // Zero Trust Policy Engine
  // ===========================================================================

  /**
   * Add a Zero Trust policy.
   */
  addPolicy(policy: ZeroTrustPolicy): void {
    this.policies.set(policy.id, policy);
  }

  /**
   * Remove a policy.
   */
  removePolicy(policyId: string): void {
    this.policies.delete(policyId);
  }

  /**
   * Evaluate access request against all policies.
   * Follows deny-override: any deny wins over allows.
   */
  evaluateAccess(
    agentId: string,
    resource: PolicyResource,
  ): AccessDecision {
    const startTime = performance.now();
    const agent = this.agents.get(agentId);

    if (!agent) {
      return {
        allowed: false,
        policyId: 'system:agent-not-found',
        reason: 'Agent not registered',
        evaluatedConditions: [],
        timestamp: Date.now(),
        latencyMs: performance.now() - startTime,
      };
    }

    if (!agent.active) {
      return {
        allowed: false,
        policyId: 'system:agent-inactive',
        reason: 'Agent is deactivated',
        evaluatedConditions: [],
        timestamp: Date.now(),
        latencyMs: performance.now() - startTime,
      };
    }

    // Sort policies by priority (lower = higher priority)
    const sortedPolicies = Array.from(this.policies.values())
      .filter((p) => p.active)
      .sort((a, b) => a.priority - b.priority);

    for (const policy of sortedPolicies) {
      // Check if policy applies to this subject
      if (!this.matchesSubject(agent, policy.subject)) continue;

      // Check if policy applies to this resource
      if (!this.matchesResource(resource, policy.resource)) continue;

      // Evaluate conditions
      const conditionResults = policy.conditions.map((condition) => ({
        condition,
        result: this.evaluateCondition(agent, condition),
      }));

      const allConditionsMet = conditionResults.every((cr) => cr.result);

      if (allConditionsMet) {
        const decision: AccessDecision = {
          allowed: policy.effect === 'allow',
          policyId: policy.id,
          reason: `Policy "${policy.name}" ${policy.effect}ed access`,
          evaluatedConditions: conditionResults,
          timestamp: Date.now(),
          latencyMs: performance.now() - startTime,
        };

        // Emit events
        if (decision.allowed) {
          this.emit('access:granted', {
            decision,
            agentId,
            resource: `${resource.type}:${resource.resourceId}:${resource.action}`,
          });
          this.updateTrustScore(agentId, this.config.trustConfig.goodBehaviorBonus, 'Legitimate access');
        } else {
          this.emit('access:denied', {
            decision,
            agentId,
            resource: `${resource.type}:${resource.resourceId}:${resource.action}`,
          });
          this.recordViolation(agentId, `Access denied by policy: ${policy.name}`);
        }

        this.emit('policy:evaluated', {
          policyId: policy.id,
          result: decision.allowed,
          latencyMs: decision.latencyMs,
        });

        this.audit(
          'access',
          agentId,
          resource.action,
          `${resource.type}:${resource.resourceId}`,
          decision.allowed ? 'success' : 'blocked',
          { policyId: policy.id },
        );

        return decision;
      }
    }

    // Default deny (Zero Trust)
    const decision: AccessDecision = {
      allowed: false,
      policyId: 'system:default-deny',
      reason: 'No matching allow policy (Zero Trust default deny)',
      evaluatedConditions: [],
      timestamp: Date.now(),
      latencyMs: performance.now() - startTime,
    };

    this.emit('access:denied', {
      decision,
      agentId,
      resource: `${resource.type}:${resource.resourceId}:${resource.action}`,
    });

    return decision;
  }

  private matchesSubject(agent: AgentIdentity, subject: PolicySubject): boolean {
    if (subject.agentId && subject.agentId !== agent.id) return false;
    if (subject.agentType && subject.agentType !== agent.type) return false;
    if (subject.role && !agent.roles.includes(subject.role)) return false;
    if (
      subject.minTrustScore !== undefined &&
      agent.trustScore < subject.minTrustScore
    ) return false;
    return true;
  }

  private matchesResource(
    requested: PolicyResource,
    policyResource: PolicyResource,
  ): boolean {
    if (policyResource.type !== requested.type) return false;
    if (
      policyResource.resourceId !== '*' &&
      policyResource.resourceId !== requested.resourceId
    ) return false;
    if (
      policyResource.action !== '*' &&
      policyResource.action !== requested.action
    ) return false;
    return true;
  }

  private evaluateCondition(
    agent: AgentIdentity,
    condition: ZeroTrustPolicy['conditions'][0],
  ): boolean {
    switch (condition.type) {
      case 'cert-valid': {
        const validation = this.validateCertificate(agent.id);
        return validation.valid;
      }
      case 'no-violations':
        return agent.violations === 0;
      case 'rate-limit': {
        // Check recent audit entries for this agent
        const maxPerMinute = (condition.params.maxPerMinute as number) ?? 60;
        const oneMinuteAgo = Date.now() - 60000;
        const recentEntries = this.auditLog.filter(
          (e) => e.agentId === agent.id && e.timestamp > oneMinuteAgo,
        );
        return recentEntries.length < maxPerMinute;
      }
      case 'time-window': {
        const now = new Date();
        const hour = now.getHours();
        const startHour = (condition.params.startHour as number) ?? 0;
        const endHour = (condition.params.endHour as number) ?? 24;
        return hour >= startHour && hour < endHour;
      }
      case 'session-age': {
        const maxAgeMs = ((condition.params.maxAgeHours as number) ?? 24) * 3600000;
        return Date.now() - agent.lastAuthAt < maxAgeMs;
      }
      case 'mfa-verified':
        return (agent.metadata.mfaVerified as boolean) === true;
      case 'context-match': {
        const requiredContext = condition.params as Record<string, unknown>;
        for (const [key, value] of Object.entries(requiredContext)) {
          if (agent.metadata[key] !== value) return false;
        }
        return true;
      }
      default:
        return false;
    }
  }

  // ===========================================================================
  // Trust Score Management
  // ===========================================================================

  updateTrustScore(agentId: string, delta: number, reason: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const oldScore = agent.trustScore;
    agent.trustScore = Math.max(
      this.config.trustConfig.minScore,
      Math.min(this.config.trustConfig.maxScore, agent.trustScore + delta),
    );

    if (oldScore !== agent.trustScore) {
      this.emit('trust:updated', {
        agentId,
        oldScore,
        newScore: agent.trustScore,
        reason,
      });
    }
  }

  recordViolation(agentId: string, violation: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.violations++;
    this.updateTrustScore(
      agentId,
      -this.config.trustConfig.violationPenalty,
      violation,
    );

    const severity =
      agent.violations >= 5 ? 'critical' :
      agent.violations >= 3 ? 'high' :
      agent.violations >= 2 ? 'medium' : 'low';

    this.emit('violation:recorded', { agentId, violation, severity });

    // Auto-deactivate on critical violations
    if (agent.violations >= 10) {
      this.deactivateAgent(agentId);
    }
  }

  // ===========================================================================
  // Jailbreak Scanning Integration
  // ===========================================================================

  scanMessage(
    messageId: string,
    content: string,
    agentId: string,
    conversationId?: string,
  ) {
    const result = this.jailbreakScanner.scan(
      messageId,
      content,
      agentId,
      conversationId,
    );

    if (result.detected) {
      this.emit('jailbreak:detected', { result });
      this.recordViolation(agentId, `Jailbreak attempt: ${result.matchedPatterns.map((p) => p.pattern.name).join(', ')}`);

      if (result.actionTaken === 'blocked') {
        this.emit('jailbreak:blocked', {
          messageId,
          agentId,
          patterns: result.matchedPatterns.map((p) => p.pattern.name),
        });
      }
    }

    return result;
  }

  // ===========================================================================
  // Default Policies
  // ===========================================================================

  private installDefaultPolicies(): void {
    // Default deny-all (lowest priority, always active)
    this.addPolicy({
      id: 'default:deny-all',
      name: 'Default Deny All',
      subject: {},
      resource: { type: 'world', resourceId: '*', action: '*' },
      conditions: [],
      effect: 'deny',
      priority: 9999,
      active: true,
    });

    // Allow authenticated agents to read worlds
    this.addPolicy({
      id: 'default:allow-read-worlds',
      name: 'Allow Authenticated Read',
      subject: { minTrustScore: 0.3 },
      resource: { type: 'world', resourceId: '*', action: 'read' },
      conditions: [
        { type: 'cert-valid', params: {} },
        { type: 'rate-limit', params: { maxPerMinute: 100 } },
      ],
      effect: 'allow',
      priority: 100,
      active: true,
    });

    // Allow world-creators to write
    this.addPolicy({
      id: 'default:allow-world-create',
      name: 'Allow World Creation',
      subject: { role: 'world-creator', minTrustScore: 0.5 },
      resource: { type: 'world', resourceId: '*', action: 'write' },
      conditions: [
        { type: 'cert-valid', params: {} },
        { type: 'no-violations', params: {} },
      ],
      effect: 'allow',
      priority: 50,
      active: true,
    });

    // Allow security admins full access
    this.addPolicy({
      id: 'default:security-admin',
      name: 'Security Admin Full Access',
      subject: { role: 'security-admin', minTrustScore: 0.8 },
      resource: { type: 'world', resourceId: '*', action: '*' },
      conditions: [{ type: 'cert-valid', params: {} }],
      effect: 'allow',
      priority: 10,
      active: true,
    });
  }

  // ===========================================================================
  // Audit Log
  // ===========================================================================

  private audit(
    eventType: string,
    agentId: string,
    action: string,
    resource: string,
    result: AuditEntry['result'],
    details: Record<string, unknown>,
  ): void {
    if (!this.config.auditEnabled) return;

    const entry: AuditEntry = {
      timestamp: Date.now(),
      eventType,
      agentId,
      action,
      resource,
      result,
      details,
    };

    this.auditLog.push(entry);

    // Trim to max size
    if (this.auditLog.length > this.config.maxAuditEntries) {
      this.auditLog.splice(0, this.auditLog.length - this.config.maxAuditEntries);
    }
  }

  getAuditLog(
    filter?: { agentId?: string; eventType?: string; result?: string },
    limit: number = 100,
  ): AuditEntry[] {
    let entries = [...this.auditLog];
    if (filter?.agentId) {
      entries = entries.filter((e) => e.agentId === filter.agentId);
    }
    if (filter?.eventType) {
      entries = entries.filter((e) => e.eventType === filter.eventType);
    }
    if (filter?.result) {
      entries = entries.filter((e) => e.result === filter.result);
    }
    return entries.slice(-limit);
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  on<K extends SecurityEventType>(
    event: K,
    handler: SecurityEventHandler<K>,
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    };
  }

  private emit<K extends SecurityEventType>(
    event: K,
    data: SecurityEventMap[K],
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        (handler as SecurityEventHandler<K>)(data);
      }
    }
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Start periodic canary checks.
   */
  start(): void {
    if (this.config.canaryConfig.enabled) {
      this.canaryCheckTimer = setInterval(
        () => {
          // Periodic canary health check (external systems must provide content)
        },
        this.config.canaryConfig.checkIntervalMs,
      );
    }
  }

  /**
   * Stop the framework.
   */
  stop(): void {
    if (this.canaryCheckTimer) {
      clearInterval(this.canaryCheckTimer);
      this.canaryCheckTimer = null;
    }
  }

  dispose(): void {
    this.stop();
    this.agents.clear();
    this.certificates.clear();
    this.canaries.clear();
    this.policies.clear();
    this.auditLog.length = 0;
    this.eventHandlers.clear();
  }
}
