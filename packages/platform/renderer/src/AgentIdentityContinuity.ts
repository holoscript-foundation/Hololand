/**
 * AgentIdentityContinuity
 *
 * Ensures cryptographic identity continuity across cross-reality handoffs.
 * Bridges compile-time RBAC tokens (HoloScript) with runtime DID identity
 * (CRDT engine) and agent identity (CrossRealityAgent).
 *
 * IDENTITY LAYERS:
 * 1. DID (Decentralized Identifier) — persistent across all devices
 * 2. Device Token — per-device JWT with RBAC permissions
 * 3. Session Token — ephemeral, per-handoff session
 *
 * HANDOFF IDENTITY FLOW:
 * Source device → signs handoff claim → transfers DID + session token
 * Target device → verifies DID signature → mints new device token → resumes
 */

import { logger } from './logger';
import type { DIDIdentity } from './CrossRealityContinuityTypes';
import type { CrossRealityAgentIdentity } from './CrossRealityAgent';

// ============================================================================
// IDENTITY TOKEN TYPES
// ============================================================================

export interface HandoffIdentityClaim {
  /** DID of the agent being handed off */
  agentDID: string;
  /** Source device ID */
  sourceDeviceId: string;
  /** Target device ID */
  targetDeviceId: string;
  /** Handoff session token (single-use) */
  sessionToken: string;
  /** RBAC capabilities being transferred */
  capabilities: string[];
  /** Spatial permissions being transferred */
  spatialScopes: string[];
  /** Claim creation timestamp */
  issuedAt: number;
  /** Claim expiry (short-lived, default 30s) */
  expiresAt: number;
  /** Cryptographic signature of the claim */
  signature: string;
}

export interface IdentityVerificationResult {
  valid: boolean;
  agentDID: string | null;
  error: string | null;
  verifiedAt: number;
  /** Capabilities that survived the handoff (intersection of source + target) */
  grantedCapabilities: string[];
  /** Capabilities that were dropped (source had, target doesn't support) */
  droppedCapabilities: string[];
}

export interface IdentityContinuityConfig {
  /** Agent DID identity */
  identity: DIDIdentity;
  /** Agent runtime identity */
  agentIdentity: CrossRealityAgentIdentity;
  /** Secret for signing claims */
  signingSecret: string;
  /** Claim TTL in ms (default: 30000) */
  claimTtlMs?: number;
  /** Maximum allowed clock skew in ms (default: 5000) */
  maxClockSkewMs?: number;
}

export interface IdentityContinuityMetrics {
  claimsIssued: number;
  claimsVerified: number;
  claimsRejected: number;
  handoffsCompleted: number;
  capabilitiesDropped: number;
  averageVerificationMs: number;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

export class AgentIdentityContinuity {
  private config: Required<IdentityContinuityConfig>;
  private metrics: IdentityContinuityMetrics;
  private activeSessionTokens: Map<string, HandoffIdentityClaim> = new Map();
  private revokedTokens: Set<string> = new Set();
  private claimCounter = 0;

  constructor(config: IdentityContinuityConfig) {
    this.config = {
      claimTtlMs: 30_000,
      maxClockSkewMs: 5_000,
      ...config,
    };
    this.metrics = {
      claimsIssued: 0, claimsVerified: 0, claimsRejected: 0,
      handoffsCompleted: 0, capabilitiesDropped: 0, averageVerificationMs: 0,
    };
  }

  /** Issue a handoff identity claim for transferring to target device */
  issueClaim(targetDeviceId: string, sourceDeviceId: string, capabilities?: string[], spatialScopes?: string[]): HandoffIdentityClaim {
    const now = Date.now();
    const sessionToken = `session:${this.config.identity.did}:${++this.claimCounter}:${now}`;
    const agentCaps = capabilities ?? this.config.agentIdentity.capabilities;
    const scopes = spatialScopes ?? ['*'];

    const claimData = `${this.config.identity.did}|${sourceDeviceId}|${targetDeviceId}|${sessionToken}|${agentCaps.join(',')}|${now}`;
    const signature = this.sign(claimData);

    const claim: HandoffIdentityClaim = {
      agentDID: this.config.identity.did,
      sourceDeviceId,
      targetDeviceId,
      sessionToken,
      capabilities: agentCaps,
      spatialScopes: scopes,
      issuedAt: now,
      expiresAt: now + this.config.claimTtlMs,
      signature,
    };

    this.activeSessionTokens.set(sessionToken, claim);
    this.metrics.claimsIssued++;
    logger.info(`[IdentityContinuity] Issued claim for ${targetDeviceId}`);
    return claim;
  }

  /** Verify a received handoff identity claim on the target device */
  verifyClaim(claim: HandoffIdentityClaim, localDeviceId: string, localCapabilities?: string[]): IdentityVerificationResult {
    const start = performance.now();
    const now = Date.now();

    // 1. Check if token is revoked
    if (this.revokedTokens.has(claim.sessionToken)) {
      return this.rejectClaim(claim, 'Token has been revoked', start);
    }

    // 2. Check expiry (with clock skew tolerance)
    if (now > claim.expiresAt + this.config.maxClockSkewMs) {
      return this.rejectClaim(claim, `Claim expired at ${claim.expiresAt}, now is ${now}`, start);
    }

    // 3. Check target device matches
    if (claim.targetDeviceId !== localDeviceId) {
      return this.rejectClaim(claim, `Target mismatch: expected ${claim.targetDeviceId}, got ${localDeviceId}`, start);
    }

    // 4. Verify signature
    const claimData = `${claim.agentDID}|${claim.sourceDeviceId}|${claim.targetDeviceId}|${claim.sessionToken}|${claim.capabilities.join(',')}|${claim.issuedAt}`;
    const expectedSignature = this.sign(claimData);
    if (claim.signature !== expectedSignature) {
      return this.rejectClaim(claim, 'Invalid signature', start);
    }

    // 5. Compute capability intersection
    const targetCaps = localCapabilities ?? this.config.agentIdentity.capabilities;
    const grantedCapabilities = claim.capabilities.filter(c => targetCaps.includes(c) || c === '*');
    const droppedCapabilities = claim.capabilities.filter(c => !targetCaps.includes(c) && c !== '*');

    // 6. Revoke the session token (single-use)
    this.revokedTokens.add(claim.sessionToken);
    this.activeSessionTokens.delete(claim.sessionToken);

    this.metrics.claimsVerified++;
    this.metrics.capabilitiesDropped += droppedCapabilities.length;
    this.metrics.handoffsCompleted++;
    this.updateVerificationLatency(performance.now() - start);

    logger.info(`[IdentityContinuity] Verified claim from ${claim.sourceDeviceId}: ${grantedCapabilities.length} caps granted, ${droppedCapabilities.length} dropped`);

    return {
      valid: true,
      agentDID: claim.agentDID,
      error: null,
      verifiedAt: now,
      grantedCapabilities,
      droppedCapabilities,
    };
  }

  /** Revoke a session token (e.g., handoff cancelled) */
  revokeSessionToken(sessionToken: string): void {
    this.revokedTokens.add(sessionToken);
    this.activeSessionTokens.delete(sessionToken);
  }

  /** Get the agent's DID identity */
  getIdentity(): DIDIdentity { return this.config.identity; }

  /** Get the agent runtime identity */
  getAgentIdentity(): CrossRealityAgentIdentity { return this.config.agentIdentity; }

  /** Get active (not yet verified) session tokens */
  getActiveSessionTokens(): string[] { return [...this.activeSessionTokens.keys()]; }

  /** Get metrics */
  getMetrics(): IdentityContinuityMetrics { return { ...this.metrics }; }

  /** Clean up expired tokens from revocation set */
  pruneExpiredTokens(): number {
    const now = Date.now();
    let pruned = 0;
    // We can't easily prune revoked tokens without storing expiry,
    // so just limit the set size
    if (this.revokedTokens.size > 10000) {
      const toKeep = [...this.revokedTokens].slice(-5000);
      this.revokedTokens = new Set(toKeep);
      pruned = 5000;
    }
    // Prune expired active tokens
    for (const [token, claim] of this.activeSessionTokens) {
      if (now > claim.expiresAt) {
        this.activeSessionTokens.delete(token);
        pruned++;
      }
    }
    return pruned;
  }

  // --- Internal ---

  private rejectClaim(claim: HandoffIdentityClaim, error: string, startTime: number): IdentityVerificationResult {
    this.metrics.claimsRejected++;
    this.updateVerificationLatency(performance.now() - startTime);
    logger.warn(`[IdentityContinuity] Rejected claim: ${error}`);
    return { valid: false, agentDID: claim.agentDID, error, verifiedAt: Date.now(), grantedCapabilities: [], droppedCapabilities: claim.capabilities };
  }

  private sign(data: string): string {
    // Simple deterministic hash for testing. In production: Ed25519 sign.
    let hash = 0;
    const combined = `${this.config.signingSecret}:${data}`;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `idsig:${Math.abs(hash).toString(36)}`;
  }

  private updateVerificationLatency(ms: number): void {
    const total = this.metrics.claimsVerified + this.metrics.claimsRejected;
    this.metrics.averageVerificationMs = (this.metrics.averageVerificationMs * (total - 1) + ms) / total;
  }
}

// Factory
export function createAgentIdentityContinuity(config: IdentityContinuityConfig): AgentIdentityContinuity {
  return new AgentIdentityContinuity(config);
}
