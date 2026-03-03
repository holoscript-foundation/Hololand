/**
 * @hololand/backend -- AbusePreventionService
 *
 * Anti-abuse measures for the public-facing HoloLand platform.
 * Provides IP reputation tracking, device fingerprinting, CAPTCHA
 * integration stubs, and account creation velocity checks.
 *
 * Subsystems:
 *
 * 1. IP Reputation Tracking
 *    - Flags IPs with multiple failed auth attempts
 *    - Tracks attempt counts within sliding windows
 *    - Reputation scores: good (0-2 failures), suspicious (3-5), blocked (6+)
 *    - Auto-decay after configurable cooldown period
 *
 * 2. Device Fingerprint Logging
 *    - Hashes User-Agent + screen resolution into a fingerprint
 *    - Tracks fingerprints per user and per IP
 *    - Detects rapid device switching (potential account sharing/botting)
 *
 * 3. CAPTCHA Integration Stub
 *    - Supports recaptcha, hcaptcha, and turnstile providers
 *    - Returns challenge token validator functions
 *    - Stub implementation for development; real validation in production
 *
 * 4. Account Creation Velocity Check
 *    - Max 3 accounts per IP per day (configurable)
 *    - Tracks creation timestamps per IP
 *    - Prevents rapid account farming
 *
 * Usage:
 *   const abuse = AbusePreventionService.getInstance();
 *
 *   // Check before auth
 *   const ipStatus = abuse.getIPReputation('192.168.1.1');
 *   if (ipStatus.blocked) { return res.status(403).json({ error: 'IP blocked' }); }
 *
 *   // Record failed auth
 *   abuse.recordFailedAuth('192.168.1.1');
 *
 *   // Check account creation
 *   const canCreate = abuse.checkAccountCreationVelocity('192.168.1.1');
 *   if (!canCreate.allowed) { return res.status(429).json({ error: canCreate.reason }); }
 *
 *   // Validate CAPTCHA
 *   const captchaValid = await abuse.validateCaptcha('turnstile', captchaToken);
 *
 * @version 1.0.0
 */

import crypto from 'crypto';

// =============================================================================
// Types
// =============================================================================

export type IPReputationLevel = 'good' | 'suspicious' | 'blocked';

export type CaptchaProvider = 'recaptcha' | 'hcaptcha' | 'turnstile';

export interface IPReputationRecord {
  ip: string;
  failedAttempts: number;
  /** Timestamps of failed attempts (for sliding window). */
  attemptTimestamps: number[];
  reputation: IPReputationLevel;
  firstFailureAt: number;
  lastFailureAt: number;
  /** Whether this IP is manually blocked. */
  manuallyBlocked: boolean;
  blockedAt?: number;
  blockedReason?: string;
}

export interface IPReputationStatus {
  ip: string;
  reputation: IPReputationLevel;
  failedAttempts: number;
  blocked: boolean;
  /** If blocked, when the block will auto-expire. */
  blockedUntil?: number;
  /** If suspicious, how many more failures until blocked. */
  attemptsUntilBlocked: number;
}

export interface DeviceFingerprint {
  hash: string;
  userAgent: string;
  screenResolution: string;
  firstSeenAt: number;
  lastSeenAt: number;
  /** IPs that have used this fingerprint. */
  associatedIPs: Set<string>;
  /** User IDs that have used this fingerprint. */
  associatedUsers: Set<string>;
}

export interface DeviceFingerprintInput {
  userAgent: string;
  screenResolution?: string;
}

export interface CaptchaValidationResult {
  valid: boolean;
  provider: CaptchaProvider;
  error?: string;
  /** Score from the provider (0.0 - 1.0, higher = more likely human). */
  score?: number;
}

export interface AccountCreationCheck {
  allowed: boolean;
  reason?: string;
  /** Accounts created from this IP in the current window. */
  accountsCreated: number;
  /** Maximum allowed accounts per window. */
  maxAccounts: number;
  /** When the window resets. */
  windowResetsAt: number;
}

export interface AbusePreventionServiceConfig {
  /** Failed attempts before IP is marked suspicious. Default: 3. */
  suspiciousThreshold?: number;
  /** Failed attempts before IP is blocked. Default: 6. */
  blockedThreshold?: number;
  /** Sliding window for failed attempts in ms. Default: 3600000 (1 hour). */
  failureWindowMs?: number;
  /** Auto-unblock duration in ms. Default: 3600000 (1 hour). */
  blockDurationMs?: number;
  /** Max accounts per IP per day. Default: 3. */
  maxAccountsPerIPPerDay?: number;
  /** Account creation window in ms. Default: 86400000 (24 hours). */
  accountCreationWindowMs?: number;
  /** CAPTCHA secret keys by provider (for production validation). */
  captchaSecrets?: Partial<Record<CaptchaProvider, string>>;
  /** Max device fingerprints to track per IP before flagging. Default: 10. */
  maxFingerprintsPerIP?: number;
}

// =============================================================================
// Defaults
// =============================================================================

const DEFAULTS = {
  suspiciousThreshold: 3,
  blockedThreshold: 6,
  failureWindowMs: 3_600_000,      // 1 hour
  blockDurationMs: 3_600_000,       // 1 hour
  maxAccountsPerIPPerDay: 3,
  accountCreationWindowMs: 86_400_000, // 24 hours
  maxFingerprintsPerIP: 10,
};

// =============================================================================
// Service
// =============================================================================

export class AbusePreventionService {
  private static instance: AbusePreventionService | null = null;

  private readonly config: Required<Omit<AbusePreventionServiceConfig, 'captchaSecrets'>> & {
    captchaSecrets: Partial<Record<CaptchaProvider, string>>;
  };

  /** IP reputation records. */
  private ipRecords: Map<string, IPReputationRecord> = new Map();

  /** Device fingerprints indexed by hash. */
  private fingerprints: Map<string, DeviceFingerprint> = new Map();

  /** IP -> Set of fingerprint hashes. */
  private ipFingerprints: Map<string, Set<string>> = new Map();

  /** Account creation timestamps per IP. */
  private accountCreations: Map<string, number[]> = new Map();

  /** Cleanup timer for periodic maintenance. */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: AbusePreventionServiceConfig = {}) {
    this.config = {
      suspiciousThreshold: config.suspiciousThreshold ?? DEFAULTS.suspiciousThreshold,
      blockedThreshold: config.blockedThreshold ?? DEFAULTS.blockedThreshold,
      failureWindowMs: config.failureWindowMs ?? DEFAULTS.failureWindowMs,
      blockDurationMs: config.blockDurationMs ?? DEFAULTS.blockDurationMs,
      maxAccountsPerIPPerDay: config.maxAccountsPerIPPerDay ?? DEFAULTS.maxAccountsPerIPPerDay,
      accountCreationWindowMs: config.accountCreationWindowMs ?? DEFAULTS.accountCreationWindowMs,
      captchaSecrets: config.captchaSecrets ?? {},
      maxFingerprintsPerIP: config.maxFingerprintsPerIP ?? DEFAULTS.maxFingerprintsPerIP,
    };

    this.startCleanup();
  }

  static getInstance(): AbusePreventionService {
    if (!AbusePreventionService.instance) {
      AbusePreventionService.instance = new AbusePreventionService();
    }
    return AbusePreventionService.instance;
  }

  // ---------------------------------------------------------------------------
  // 1. IP Reputation Tracking
  // ---------------------------------------------------------------------------

  /**
   * Record a failed authentication attempt for an IP.
   * Updates the reputation score based on failure count within the sliding window.
   */
  recordFailedAuth(ip: string): IPReputationStatus {
    const now = Date.now();
    let record = this.ipRecords.get(ip);

    if (!record) {
      record = {
        ip,
        failedAttempts: 0,
        attemptTimestamps: [],
        reputation: 'good',
        firstFailureAt: now,
        lastFailureAt: now,
        manuallyBlocked: false,
      };
      this.ipRecords.set(ip, record);
    }

    // Add timestamp and prune old ones outside the window
    record.attemptTimestamps.push(now);
    record.lastFailureAt = now;
    this.pruneOldAttempts(record);

    // Update failure count based on remaining timestamps
    record.failedAttempts = record.attemptTimestamps.length;

    // Update reputation
    record.reputation = this.calculateReputation(record);

    return this.toIPReputationStatus(record);
  }

  /**
   * Record a successful authentication (resets failure count for the IP).
   */
  recordSuccessfulAuth(ip: string): void {
    const record = this.ipRecords.get(ip);
    if (record && !record.manuallyBlocked) {
      record.failedAttempts = 0;
      record.attemptTimestamps = [];
      record.reputation = 'good';
    }
  }

  /**
   * Get the current reputation status of an IP.
   */
  getIPReputation(ip: string): IPReputationStatus {
    const record = this.ipRecords.get(ip);

    if (!record) {
      return {
        ip,
        reputation: 'good',
        failedAttempts: 0,
        blocked: false,
        attemptsUntilBlocked: this.config.blockedThreshold,
      };
    }

    // Prune old attempts before evaluating
    this.pruneOldAttempts(record);
    record.failedAttempts = record.attemptTimestamps.length;
    record.reputation = this.calculateReputation(record);

    return this.toIPReputationStatus(record);
  }

  /**
   * Manually block an IP address.
   */
  blockIP(ip: string, reason: string = 'Manual block'): void {
    let record = this.ipRecords.get(ip);

    if (!record) {
      record = {
        ip,
        failedAttempts: 0,
        attemptTimestamps: [],
        reputation: 'blocked',
        firstFailureAt: Date.now(),
        lastFailureAt: Date.now(),
        manuallyBlocked: true,
        blockedAt: Date.now(),
        blockedReason: reason,
      };
      this.ipRecords.set(ip, record);
    } else {
      record.manuallyBlocked = true;
      record.reputation = 'blocked';
      record.blockedAt = Date.now();
      record.blockedReason = reason;
    }
  }

  /**
   * Unblock a manually blocked IP.
   */
  unblockIP(ip: string): boolean {
    const record = this.ipRecords.get(ip);
    if (!record) return false;

    record.manuallyBlocked = false;
    record.blockedAt = undefined;
    record.blockedReason = undefined;
    record.failedAttempts = 0;
    record.attemptTimestamps = [];
    record.reputation = 'good';

    return true;
  }

  // ---------------------------------------------------------------------------
  // 2. Device Fingerprint Logging
  // ---------------------------------------------------------------------------

  /**
   * Log a device fingerprint for an IP and optional user.
   * Returns the fingerprint hash and whether it's a new device.
   */
  logDeviceFingerprint(
    ip: string,
    input: DeviceFingerprintInput,
    userId?: string,
  ): { hash: string; isNew: boolean; fingerprintCount: number } {
    const hash = this.computeFingerprintHash(input);
    const now = Date.now();

    let fingerprint = this.fingerprints.get(hash);
    const isNew = !fingerprint;

    if (!fingerprint) {
      fingerprint = {
        hash,
        userAgent: input.userAgent,
        screenResolution: input.screenResolution ?? 'unknown',
        firstSeenAt: now,
        lastSeenAt: now,
        associatedIPs: new Set(),
        associatedUsers: new Set(),
      };
      this.fingerprints.set(hash, fingerprint);
    }

    fingerprint.lastSeenAt = now;
    fingerprint.associatedIPs.add(ip);
    if (userId) {
      fingerprint.associatedUsers.add(userId);
    }

    // Track fingerprint per IP
    let ipFps = this.ipFingerprints.get(ip);
    if (!ipFps) {
      ipFps = new Set();
      this.ipFingerprints.set(ip, ipFps);
    }
    ipFps.add(hash);

    return {
      hash,
      isNew,
      fingerprintCount: ipFps.size,
    };
  }

  /**
   * Check if an IP has too many unique device fingerprints (potential botting).
   */
  hasExcessiveFingerprints(ip: string): boolean {
    const ipFps = this.ipFingerprints.get(ip);
    if (!ipFps) return false;
    return ipFps.size > this.config.maxFingerprintsPerIP;
  }

  /**
   * Get fingerprint count for an IP.
   */
  getFingerprintCount(ip: string): number {
    return this.ipFingerprints.get(ip)?.size ?? 0;
  }

  /**
   * Get users associated with a fingerprint.
   */
  getUsersForFingerprint(hash: string): string[] {
    const fp = this.fingerprints.get(hash);
    return fp ? Array.from(fp.associatedUsers) : [];
  }

  // ---------------------------------------------------------------------------
  // 3. CAPTCHA Integration Stub
  // ---------------------------------------------------------------------------

  /**
   * Validate a CAPTCHA challenge token.
   *
   * Stub implementation for development. In production, this calls the
   * provider's verification API with the configured secret key.
   *
   * @param provider The CAPTCHA provider (recaptcha, hcaptcha, turnstile).
   * @param token The challenge response token from the client.
   * @param remoteIP Optional IP address of the client for additional validation.
   */
  async validateCaptcha(
    provider: CaptchaProvider,
    token: string,
    remoteIP?: string,
  ): Promise<CaptchaValidationResult> {
    if (!token) {
      return { valid: false, provider, error: 'CAPTCHA token is required' };
    }

    const secret = this.config.captchaSecrets[provider];

    // If no secret is configured, use stub validation
    if (!secret) {
      return this.stubCaptchaValidation(provider, token);
    }

    // Production validation (real API calls)
    try {
      return await this.realCaptchaValidation(provider, secret, token, remoteIP);
    } catch (error) {
      console.error(`[AbusePreventionService] CAPTCHA validation error (${provider}):`, error);
      return {
        valid: false,
        provider,
        error: 'CAPTCHA validation service unavailable',
      };
    }
  }

  /**
   * Get a CAPTCHA challenge token validator function for a specific provider.
   * Returns a function that can be used in middleware.
   */
  getCaptchaValidator(provider: CaptchaProvider): (token: string, remoteIP?: string) => Promise<CaptchaValidationResult> {
    return (token: string, remoteIP?: string) => this.validateCaptcha(provider, token, remoteIP);
  }

  // ---------------------------------------------------------------------------
  // 4. Account Creation Velocity Check
  // ---------------------------------------------------------------------------

  /**
   * Check if an IP is allowed to create another account.
   * Enforces max accounts per IP per day (configurable).
   */
  checkAccountCreationVelocity(ip: string): AccountCreationCheck {
    const now = Date.now();
    const windowStart = now - this.config.accountCreationWindowMs;

    // Get and prune creation timestamps
    let timestamps = this.accountCreations.get(ip) ?? [];
    timestamps = timestamps.filter(t => t > windowStart);
    this.accountCreations.set(ip, timestamps);

    const accountsCreated = timestamps.length;
    const allowed = accountsCreated < this.config.maxAccountsPerIPPerDay;

    // Window resets at the earliest timestamp + windowMs
    const windowResetsAt = timestamps.length > 0
      ? timestamps[0] + this.config.accountCreationWindowMs
      : now + this.config.accountCreationWindowMs;

    return {
      allowed,
      reason: allowed ? undefined : `Maximum ${this.config.maxAccountsPerIPPerDay} accounts per IP per day exceeded`,
      accountsCreated,
      maxAccounts: this.config.maxAccountsPerIPPerDay,
      windowResetsAt,
    };
  }

  /**
   * Record that an account was created from this IP.
   * Call this AFTER successful account creation.
   */
  recordAccountCreation(ip: string): void {
    const timestamps = this.accountCreations.get(ip) ?? [];
    timestamps.push(Date.now());
    this.accountCreations.set(ip, timestamps);
  }

  // ---------------------------------------------------------------------------
  // Composite Checks
  // ---------------------------------------------------------------------------

  /**
   * Run all abuse prevention checks for a signup attempt.
   * Returns a combined result with the most restrictive check.
   */
  async checkSignupAbuse(
    ip: string,
    fingerprint: DeviceFingerprintInput,
    captchaToken?: string,
    captchaProvider?: CaptchaProvider,
  ): Promise<{
    allowed: boolean;
    reasons: string[];
    ipReputation: IPReputationStatus;
    velocityCheck: AccountCreationCheck;
    captchaResult?: CaptchaValidationResult;
  }> {
    const reasons: string[] = [];

    // 1. IP reputation
    const ipReputation = this.getIPReputation(ip);
    if (ipReputation.blocked) {
      reasons.push('IP address is blocked due to suspicious activity');
    }

    // 2. Account creation velocity
    const velocityCheck = this.checkAccountCreationVelocity(ip);
    if (!velocityCheck.allowed) {
      reasons.push(velocityCheck.reason!);
    }

    // 3. Device fingerprint
    this.logDeviceFingerprint(ip, fingerprint);
    if (this.hasExcessiveFingerprints(ip)) {
      reasons.push('Too many unique devices from this IP address');
    }

    // 4. CAPTCHA (if provided)
    let captchaResult: CaptchaValidationResult | undefined;
    if (captchaToken && captchaProvider) {
      captchaResult = await this.validateCaptcha(captchaProvider, captchaToken, ip);
      if (!captchaResult.valid) {
        reasons.push(captchaResult.error ?? 'CAPTCHA verification failed');
      }
    }

    return {
      allowed: reasons.length === 0,
      reasons,
      ipReputation,
      velocityCheck,
      captchaResult,
    };
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  getStats(): {
    trackedIPs: number;
    blockedIPs: number;
    suspiciousIPs: number;
    trackedFingerprints: number;
    accountCreationRecords: number;
  } {
    let blocked = 0;
    let suspicious = 0;

    for (const record of this.ipRecords.values()) {
      this.pruneOldAttempts(record);
      record.failedAttempts = record.attemptTimestamps.length;
      record.reputation = this.calculateReputation(record);

      if (record.reputation === 'blocked') blocked++;
      if (record.reputation === 'suspicious') suspicious++;
    }

    return {
      trackedIPs: this.ipRecords.size,
      blockedIPs: blocked,
      suspiciousIPs: suspicious,
      trackedFingerprints: this.fingerprints.size,
      accountCreationRecords: this.accountCreations.size,
    };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.ipRecords.clear();
    this.fingerprints.clear();
    this.ipFingerprints.clear();
    this.accountCreations.clear();
    if (AbusePreventionService.instance === this) {
      AbusePreventionService.instance = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private calculateReputation(record: IPReputationRecord): IPReputationLevel {
    if (record.manuallyBlocked) return 'blocked';

    // Check if auto-block has expired
    if (record.blockedAt) {
      const blockExpiry = record.blockedAt + this.config.blockDurationMs;
      if (Date.now() > blockExpiry && !record.manuallyBlocked) {
        record.blockedAt = undefined;
        record.failedAttempts = 0;
        record.attemptTimestamps = [];
        return 'good';
      }
    }

    if (record.failedAttempts >= this.config.blockedThreshold) {
      if (!record.blockedAt) {
        record.blockedAt = Date.now();
      }
      return 'blocked';
    }
    if (record.failedAttempts >= this.config.suspiciousThreshold) return 'suspicious';
    return 'good';
  }

  private pruneOldAttempts(record: IPReputationRecord): void {
    const cutoff = Date.now() - this.config.failureWindowMs;
    record.attemptTimestamps = record.attemptTimestamps.filter(t => t > cutoff);
  }

  private toIPReputationStatus(record: IPReputationRecord): IPReputationStatus {
    const blocked = record.reputation === 'blocked';
    let blockedUntil: number | undefined;

    if (blocked && record.blockedAt && !record.manuallyBlocked) {
      blockedUntil = record.blockedAt + this.config.blockDurationMs;
    }

    return {
      ip: record.ip,
      reputation: record.reputation,
      failedAttempts: record.failedAttempts,
      blocked,
      blockedUntil,
      attemptsUntilBlocked: Math.max(0, this.config.blockedThreshold - record.failedAttempts),
    };
  }

  private computeFingerprintHash(input: DeviceFingerprintInput): string {
    const raw = `${input.userAgent}|${input.screenResolution ?? 'unknown'}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
  }

  /**
   * Stub CAPTCHA validation for development.
   * Accepts any non-empty token that doesn't start with "invalid".
   */
  private stubCaptchaValidation(
    provider: CaptchaProvider,
    token: string,
  ): CaptchaValidationResult {
    // Development stub: accept any token that doesn't start with "invalid"
    const isValid = token.length > 0 && !token.startsWith('invalid');

    return {
      valid: isValid,
      provider,
      score: isValid ? 0.9 : 0.1,
      error: isValid ? undefined : 'Invalid CAPTCHA token (stub validation)',
    };
  }

  /**
   * Real CAPTCHA validation via provider API.
   * Called when a secret key is configured for the provider.
   */
  private async realCaptchaValidation(
    provider: CaptchaProvider,
    secret: string,
    token: string,
    remoteIP?: string,
  ): Promise<CaptchaValidationResult> {
    const endpoints: Record<CaptchaProvider, string> = {
      recaptcha: 'https://www.google.com/recaptcha/api/siteverify',
      hcaptcha: 'https://hcaptcha.com/siteverify',
      turnstile: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    };

    const endpoint = endpoints[provider];
    const params = new URLSearchParams();
    params.set('secret', secret);
    params.set('response', token);
    if (remoteIP) {
      params.set('remoteip', remoteIP);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      return {
        valid: false,
        provider,
        error: `CAPTCHA provider returned status ${response.status}`,
      };
    }

    const data = await response.json() as any;

    return {
      valid: data.success === true,
      provider,
      score: data.score,
      error: data.success ? undefined : (data['error-codes']?.join(', ') ?? 'Verification failed'),
    };
  }

  /**
   * Periodic cleanup of stale records.
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();

      // Clean up stale IP records (no attempts in 2x the failure window)
      const ipCutoff = now - (this.config.failureWindowMs * 2);
      for (const [ip, record] of this.ipRecords.entries()) {
        if (
          !record.manuallyBlocked &&
          record.lastFailureAt < ipCutoff &&
          record.attemptTimestamps.length === 0
        ) {
          this.ipRecords.delete(ip);
        }
      }

      // Clean up stale account creation records
      const creationCutoff = now - this.config.accountCreationWindowMs;
      for (const [ip, timestamps] of this.accountCreations.entries()) {
        const filtered = timestamps.filter(t => t > creationCutoff);
        if (filtered.length === 0) {
          this.accountCreations.delete(ip);
        } else {
          this.accountCreations.set(ip, filtered);
        }
      }
    }, 300_000); // Every 5 minutes

    // Allow process to exit
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      (this.cleanupTimer as NodeJS.Timeout).unref();
    }
  }
}

// =============================================================================
// Singleton accessor
// =============================================================================

export function getAbusePreventionService(): AbusePreventionService {
  return AbusePreventionService.getInstance();
}
