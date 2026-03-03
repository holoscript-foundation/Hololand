/**
 * @hololand/backend -- OpenSignupService
 *
 * Removes invite-only gates and provides a public signup flow with
 * abuse prevention, email domain validation, and feature-flag-controlled
 * gradual rollout.
 *
 * Subsystems:
 *
 * 1. Signup Flow
 *    - isSignupOpen()  -- checks the `invite_only` feature flag
 *    - canUserSignUp(email, ip) -- rate limits + abuse prevention + email
 *      domain validation (blocks disposable email domains)
 *    - processSignup(email, username, password) -- orchestrates: abuse
 *      check -> rate limit -> create account -> email verification ->
 *      assign initial free-tier quotas
 *
 * 2. Email Domain Validation
 *    - Built-in blocklist of ~100 disposable email providers
 *    - Custom allow/block lists configurable at runtime
 *
 * 3. Feature Flag System
 *    - getFeatureFlag(flagName) / setFeatureFlag(flagName, value, description)
 *    - listFeatureFlags() -- for admin dashboard
 *    - Default flags: invite_only, require_email_verification,
 *      enable_marketplace, enable_voice, enable_remix
 *
 * Usage:
 *   const signup = OpenSignupService.getInstance();
 *
 *   if (signup.isSignupOpen()) {
 *     const check = signup.canUserSignUp('user@example.com', '1.2.3.4');
 *     if (check.allowed) {
 *       const result = await signup.processSignup('user@example.com', 'alice', 'P@ssw0rd!');
 *     }
 *   }
 *
 *   signup.setFeatureFlag('enable_marketplace', true, 'Marketplace launched');
 *   const flags = signup.listFeatureFlags();
 *
 * @version 1.0.0
 */

import crypto from 'crypto';
import { AbusePreventionService, getAbusePreventionService } from './AbusePreventionService';
import { RateLimitService, getRateLimitService } from './RateLimitService';
import { EmailVerificationService, getEmailVerificationService } from './EmailVerificationService';

// =============================================================================
// Types
// =============================================================================

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  updatedAt: number;
  updatedBy: string;
}

export interface SignupEligibility {
  allowed: boolean;
  reasons: string[];
}

export interface SignupResult {
  success: boolean;
  userId?: string;
  email?: string;
  username?: string;
  error?: string;
  /** Whether email verification was sent. */
  verificationSent: boolean;
  /** Initial quotas assigned to the account. */
  quotas?: FreeTierQuotas;
}

export interface FreeTierQuotas {
  maxWorlds: number;
  maxAssetsPerWorld: number;
  maxStorageMb: number;
  maxMonthlyVisits: number;
  /** Starting credit balance in cents. */
  startingCreditCents: number;
}

export interface OpenSignupServiceConfig {
  /** Maximum signups per IP per hour. Default: 3. */
  maxSignupsPerIPPerHour?: number;
  /** Maximum signups per email domain per hour. Default: 10. */
  maxSignupsPerDomainPerHour?: number;
  /** Minimum password length. Default: 8. */
  minPasswordLength?: number;
  /** Whether to require email verification. Default: true. */
  requireEmailVerification?: boolean;
  /** Additional disposable email domains to block. */
  additionalBlockedDomains?: string[];
  /** Domains to always allow (bypass blocklist). */
  allowedDomains?: string[];
  /** Free tier quota configuration. */
  freeTierQuotas?: Partial<FreeTierQuotas>;
}

// =============================================================================
// Disposable Email Domain Blocklist
// =============================================================================

const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'tempmail.com', 'temp-mail.org', 'throwaway.email', 'yopmail.com',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'dispostable.com',
  'mailnesia.com', 'maildrop.cc', 'discard.email', 'mailcatch.com',
  'trashmail.com', 'trashmail.net', 'trashmail.me', 'trashmail.org',
  'bugmenot.com', 'mytemp.email', 'tempmailaddress.com', 'emailondeck.com',
  'fakeinbox.com', 'getnada.com', 'inboxbear.com', 'mailsac.com',
  'mohmal.com', 'tempail.com', 'tempr.email', 'throwam.com',
  'tmpmail.net', 'tmpmail.org', 'trash-mail.com', '10minutemail.com',
  '10minutemail.net', 'minutemail.com', 'mintemail.com', 'tempinbox.com',
  'binkmail.com', 'bobmail.info', 'chammy.info', 'devnullmail.com',
  'dispostable.com', 'dodgit.com', 'emailgo.de', 'emailmiser.com',
  'emailsensei.com', 'emailtemporario.com.br', 'ephemail.net', 'filzmail.com',
  'getairmail.com', 'guerrillamail.biz', 'guerrillamail.de', 'harakirimail.com',
  'imstations.com', 'incognitomail.org', 'ipoo.org', 'jetable.org',
  'kasmail.com', 'koszmail.pl', 'kurzepost.de', 'lhsdv.com',
  'lookugly.com', 'lr78.com', 'maileater.com', 'mailexpire.com',
  'mailforspam.com', 'mailin8r.com', 'mailinator.net', 'mailinator2.com',
  'mailincubator.com', 'mailme.lv', 'mailnull.com', 'mailzilla.com',
  'mezimages.net', 'mmmmail.com', 'mt2015.com', 'mytrashmail.com',
  'nobulk.com', 'noclickemail.com', 'nogmailspam.info', 'nomail.xl.cx',
  'nospam.ze.tc', 'nomail2me.com', 'nospamfor.us', 'nowmymail.com',
  'objectmail.com', 'obobbo.com', 'onewaymail.com', 'ordinaryamerican.net',
  'owlpic.com', 'pjjkp.com', 'proxymail.eu', 'putthisinyouremail.com',
  'reallymymail.com', 'recode.me', 'regbypass.com', 'safetymail.info',
  'skeefmail.com', 'slaskpost.se', 'slipry.net', 'sogetthis.com',
  'spambox.us', 'spamfree24.org', 'spamgourmet.com', 'spamhole.com',
  'spaml.com', 'spamspot.com', 'superrito.com',
]);

// =============================================================================
// Default Feature Flags
// =============================================================================

const DEFAULT_FEATURE_FLAGS: FeatureFlag[] = [
  {
    name: 'invite_only',
    enabled: false,
    description: 'When enabled, only users with valid invite codes can sign up.',
    updatedAt: Date.now(),
    updatedBy: 'system',
  },
  {
    name: 'require_email_verification',
    enabled: true,
    description: 'Require email verification before account activation.',
    updatedAt: Date.now(),
    updatedBy: 'system',
  },
  {
    name: 'enable_marketplace',
    enabled: true,
    description: 'Enable the asset marketplace for buying/selling worlds and assets.',
    updatedAt: Date.now(),
    updatedBy: 'system',
  },
  {
    name: 'enable_voice',
    enabled: false,
    description: 'Enable spatial voice chat in worlds.',
    updatedAt: Date.now(),
    updatedBy: 'system',
  },
  {
    name: 'enable_remix',
    enabled: true,
    description: 'Allow users to remix published worlds.',
    updatedAt: Date.now(),
    updatedBy: 'system',
  },
];

// =============================================================================
// Default Quotas
// =============================================================================

const DEFAULT_FREE_TIER_QUOTAS: FreeTierQuotas = {
  maxWorlds: 10,
  maxAssetsPerWorld: 50,
  maxStorageMb: 1024,
  maxMonthlyVisits: 10_000,
  startingCreditCents: 0,
};

// =============================================================================
// Service
// =============================================================================

export class OpenSignupService {
  private static instance: OpenSignupService | null = null;

  private readonly config: Required<Omit<OpenSignupServiceConfig, 'additionalBlockedDomains' | 'allowedDomains' | 'freeTierQuotas'>>;
  private readonly freeTierQuotas: FreeTierQuotas;

  /** Feature flags indexed by name. */
  private featureFlags: Map<string, FeatureFlag> = new Map();

  /** Blocked email domains (built-in + configured). */
  private blockedDomains: Set<string>;

  /** Explicitly allowed domains (bypass blocklist). */
  private allowedDomains: Set<string>;

  /** IP -> signup timestamps for per-IP rate limiting. */
  private ipSignupTimestamps: Map<string, number[]> = new Map();

  /** Domain -> signup timestamps for per-domain rate limiting. */
  private domainSignupTimestamps: Map<string, number[]> = new Map();

  /** In-memory user store (maps userId -> user record). Production uses DB. */
  private users: Map<string, {
    userId: string;
    email: string;
    username: string;
    passwordHash: string;
    createdAt: number;
    emailVerified: boolean;
    quotas: FreeTierQuotas;
  }> = new Map();

  /** Username -> userId index for uniqueness checks. */
  private usernameIndex: Map<string, string> = new Map();

  /** Email -> userId index for uniqueness checks. */
  private emailIndex: Map<string, string> = new Map();

  /** References to collaborating services. */
  private abuseService: AbusePreventionService | null = null;
  private rateLimitService: RateLimitService | null = null;
  private emailVerificationService: EmailVerificationService | null = null;

  /** Cleanup timer. */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: OpenSignupServiceConfig = {}) {
    this.config = {
      maxSignupsPerIPPerHour: config.maxSignupsPerIPPerHour ?? 3,
      maxSignupsPerDomainPerHour: config.maxSignupsPerDomainPerHour ?? 10,
      minPasswordLength: config.minPasswordLength ?? 8,
      requireEmailVerification: config.requireEmailVerification ?? true,
    };

    this.freeTierQuotas = {
      ...DEFAULT_FREE_TIER_QUOTAS,
      ...config.freeTierQuotas,
    };

    // Build blocked domains set
    this.blockedDomains = new Set(DISPOSABLE_EMAIL_DOMAINS);
    if (config.additionalBlockedDomains) {
      for (const domain of config.additionalBlockedDomains) {
        this.blockedDomains.add(domain.toLowerCase());
      }
    }

    // Build allowed domains set
    this.allowedDomains = new Set(
      (config.allowedDomains ?? []).map((d) => d.toLowerCase())
    );

    // Initialize feature flags
    for (const flag of DEFAULT_FEATURE_FLAGS) {
      this.featureFlags.set(flag.name, { ...flag });
    }

    this.startCleanup();
  }

  static getInstance(config?: OpenSignupServiceConfig): OpenSignupService {
    if (!OpenSignupService.instance) {
      OpenSignupService.instance = new OpenSignupService(config);
    }
    return OpenSignupService.instance;
  }

  // ---------------------------------------------------------------------------
  // 1. Signup Flow
  // ---------------------------------------------------------------------------

  /**
   * Check whether public signup is currently open.
   * Returns false if the `invite_only` feature flag is enabled.
   */
  isSignupOpen(): boolean {
    const inviteOnly = this.featureFlags.get('invite_only');
    return inviteOnly ? !inviteOnly.enabled : true;
  }

  /**
   * Check whether a specific email/IP combination is eligible to sign up.
   * Performs rate-limit checks, abuse prevention, and email domain validation.
   */
  canUserSignUp(email: string, ip: string): SignupEligibility {
    const reasons: string[] = [];

    // 1. Check if signup is open
    if (!this.isSignupOpen()) {
      reasons.push('Signup is currently invite-only. Please use an invite code.');
    }

    // 2. Validate email format
    if (!this.isValidEmail(email)) {
      reasons.push('Invalid email address format.');
    }

    // 3. Email domain validation (disposable email check)
    const domain = this.extractDomain(email);
    if (domain && !this.allowedDomains.has(domain) && this.blockedDomains.has(domain)) {
      reasons.push('Disposable email addresses are not allowed. Please use a permanent email.');
    }

    // 4. Check if email is already registered
    if (this.emailIndex.has(email.toLowerCase().trim())) {
      reasons.push('An account with this email already exists.');
    }

    // 5. IP-based rate limiting
    const ipCheck = this.checkIPSignupRate(ip);
    if (!ipCheck.allowed) {
      reasons.push(`Too many signups from this IP address. Please try again later.`);
    }

    // 6. Domain-based rate limiting
    if (domain) {
      const domainCheck = this.checkDomainSignupRate(domain);
      if (!domainCheck.allowed) {
        reasons.push('Too many signups from this email domain. Please try again later.');
      }
    }

    // 7. Abuse prevention (IP reputation)
    try {
      const abuse = this.getAbuseService();
      const ipReputation = abuse.getIPReputation(ip);
      if (ipReputation.blocked) {
        reasons.push('This IP address has been blocked due to suspicious activity.');
      }
    } catch {
      // Abuse service not available -- allow signup
    }

    return {
      allowed: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Process a full signup flow.
   *
   * Orchestrates:
   *   1. Abuse check + rate limiting
   *   2. Validate email, username, password
   *   3. Create account with hashed password
   *   4. Send email verification (if feature flag enabled)
   *   5. Assign initial free-tier quotas
   *
   * @param email     User's email address.
   * @param username  Desired username.
   * @param password  Password (plaintext, will be hashed).
   * @param ip        Client IP address for abuse prevention.
   */
  async processSignup(
    email: string,
    username: string,
    password: string,
    ip: string = '127.0.0.1',
  ): Promise<SignupResult> {
    // Step 1: Eligibility check
    const eligibility = this.canUserSignUp(email, ip);
    if (!eligibility.allowed) {
      return {
        success: false,
        error: eligibility.reasons[0],
        verificationSent: false,
      };
    }

    // Step 2: Validate username
    const usernameValidation = this.validateUsername(username);
    if (!usernameValidation.valid) {
      return {
        success: false,
        error: usernameValidation.error,
        verificationSent: false,
      };
    }

    // Check username uniqueness
    if (this.usernameIndex.has(username.toLowerCase())) {
      return {
        success: false,
        error: 'This username is already taken.',
        verificationSent: false,
      };
    }

    // Step 3: Validate password strength
    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: passwordValidation.error,
        verificationSent: false,
      };
    }

    // Step 4: Create account
    const userId = crypto.randomBytes(16).toString('hex');
    const normalizedEmail = email.toLowerCase().trim();
    const passwordHash = this.hashPassword(password);

    const userRecord = {
      userId,
      email: normalizedEmail,
      username: username.trim(),
      passwordHash,
      createdAt: Date.now(),
      emailVerified: false,
      quotas: { ...this.freeTierQuotas },
    };

    this.users.set(userId, userRecord);
    this.usernameIndex.set(username.toLowerCase(), userId);
    this.emailIndex.set(normalizedEmail, userId);

    // Record signup for rate limiting
    this.recordIPSignup(ip);
    const domain = this.extractDomain(normalizedEmail);
    if (domain) {
      this.recordDomainSignup(domain);
    }

    // Record account creation with abuse service
    try {
      const abuse = this.getAbuseService();
      abuse.recordAccountCreation(ip);
    } catch {
      // Abuse service not available -- continue
    }

    // Step 5: Email verification
    let verificationSent = false;
    const requireVerification = this.featureFlags.get('require_email_verification');
    if (requireVerification?.enabled ?? this.config.requireEmailVerification) {
      try {
        const verifier = this.getEmailVerificationService();
        await verifier.generateVerificationToken(userId, normalizedEmail);
        verificationSent = true;
      } catch (err) {
        console.error('[OpenSignupService] Email verification failed:', err);
        // Account is created but verification email failed -- non-fatal
      }
    } else {
      // If verification is not required, mark email as verified immediately
      userRecord.emailVerified = true;
    }

    return {
      success: true,
      userId,
      email: normalizedEmail,
      username: username.trim(),
      verificationSent,
      quotas: userRecord.quotas,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Email Domain Validation
  // ---------------------------------------------------------------------------

  /**
   * Check if an email domain is blocked (disposable).
   */
  isEmailDomainBlocked(email: string): boolean {
    const domain = this.extractDomain(email);
    if (!domain) return false;
    if (this.allowedDomains.has(domain)) return false;
    return this.blockedDomains.has(domain);
  }

  /**
   * Add a domain to the blocklist at runtime.
   */
  addBlockedDomain(domain: string): void {
    this.blockedDomains.add(domain.toLowerCase());
  }

  /**
   * Remove a domain from the blocklist at runtime.
   */
  removeBlockedDomain(domain: string): void {
    this.blockedDomains.delete(domain.toLowerCase());
  }

  /**
   * Add a domain to the allowlist (bypasses blocklist).
   */
  addAllowedDomain(domain: string): void {
    this.allowedDomains.add(domain.toLowerCase());
  }

  /**
   * Get the number of blocked email domains.
   */
  getBlockedDomainCount(): number {
    return this.blockedDomains.size;
  }

  // ---------------------------------------------------------------------------
  // 3. Feature Flag System
  // ---------------------------------------------------------------------------

  /**
   * Get the current value of a feature flag.
   * Returns undefined if the flag does not exist.
   */
  getFeatureFlag(flagName: string): FeatureFlag | undefined {
    return this.featureFlags.get(flagName);
  }

  /**
   * Check whether a feature flag is enabled. Returns false if the flag
   * does not exist.
   */
  isFeatureEnabled(flagName: string): boolean {
    return this.featureFlags.get(flagName)?.enabled ?? false;
  }

  /**
   * Set or create a feature flag.
   *
   * @param flagName     Unique flag identifier.
   * @param enabled      Whether the flag is enabled.
   * @param description  Human-readable description of the flag.
   * @param updatedBy    Who made the change (for audit trail). Default: 'admin'.
   */
  setFeatureFlag(
    flagName: string,
    enabled: boolean,
    description?: string,
    updatedBy: string = 'admin',
  ): FeatureFlag {
    const existing = this.featureFlags.get(flagName);

    const flag: FeatureFlag = {
      name: flagName,
      enabled,
      description: description ?? existing?.description ?? '',
      updatedAt: Date.now(),
      updatedBy,
    };

    this.featureFlags.set(flagName, flag);
    return flag;
  }

  /**
   * List all feature flags.
   */
  listFeatureFlags(): FeatureFlag[] {
    return Array.from(this.featureFlags.values());
  }

  /**
   * Delete a feature flag. Returns true if the flag existed.
   */
  deleteFeatureFlag(flagName: string): boolean {
    return this.featureFlags.delete(flagName);
  }

  // ---------------------------------------------------------------------------
  // Query API
  // ---------------------------------------------------------------------------

  /**
   * Look up a user by email.
   */
  getUserByEmail(email: string): { userId: string; email: string; username: string; emailVerified: boolean } | undefined {
    const userId = this.emailIndex.get(email.toLowerCase().trim());
    if (!userId) return undefined;
    const user = this.users.get(userId);
    if (!user) return undefined;
    return {
      userId: user.userId,
      email: user.email,
      username: user.username,
      emailVerified: user.emailVerified,
    };
  }

  /**
   * Look up a user by username.
   */
  getUserByUsername(username: string): { userId: string; email: string; username: string; emailVerified: boolean } | undefined {
    const userId = this.usernameIndex.get(username.toLowerCase());
    if (!userId) return undefined;
    const user = this.users.get(userId);
    if (!user) return undefined;
    return {
      userId: user.userId,
      email: user.email,
      username: user.username,
      emailVerified: user.emailVerified,
    };
  }

  /**
   * Get total registered user count.
   */
  getUserCount(): number {
    return this.users.size;
  }

  /**
   * Get service statistics.
   */
  getStats(): {
    totalUsers: number;
    verifiedUsers: number;
    unverifiedUsers: number;
    featureFlags: number;
    blockedDomains: number;
    signupOpen: boolean;
  } {
    let verified = 0;
    let unverified = 0;

    for (const user of this.users.values()) {
      if (user.emailVerified) verified++;
      else unverified++;
    }

    return {
      totalUsers: this.users.size,
      verifiedUsers: verified,
      unverifiedUsers: unverified,
      featureFlags: this.featureFlags.size,
      blockedDomains: this.blockedDomains.size,
      signupOpen: this.isSignupOpen(),
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
    this.users.clear();
    this.usernameIndex.clear();
    this.emailIndex.clear();
    this.featureFlags.clear();
    this.ipSignupTimestamps.clear();
    this.domainSignupTimestamps.clear();

    if (OpenSignupService.instance === this) {
      OpenSignupService.instance = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internals -- Validation
  // ---------------------------------------------------------------------------

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private extractDomain(email: string): string | null {
    const parts = email.toLowerCase().trim().split('@');
    return parts.length === 2 ? parts[1] : null;
  }

  private validateUsername(username: string): { valid: boolean; error?: string } {
    const trimmed = username.trim();

    if (trimmed.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters long.' };
    }
    if (trimmed.length > 30) {
      return { valid: false, error: 'Username must be 30 characters or fewer.' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return { valid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores.' };
    }
    if (/^[_-]/.test(trimmed) || /[_-]$/.test(trimmed)) {
      return { valid: false, error: 'Username cannot start or end with a hyphen or underscore.' };
    }

    return { valid: true };
  }

  private validatePassword(password: string): { valid: boolean; error?: string } {
    if (password.length < this.config.minPasswordLength) {
      return { valid: false, error: `Password must be at least ${this.config.minPasswordLength} characters long.` };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one uppercase letter.' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one lowercase letter.' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one digit.' };
    }

    return { valid: true };
  }

  /**
   * Hash a password using SHA-256 with a random salt.
   * In production, use bcrypt or argon2 instead.
   */
  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
    return `${salt}:${hash}`;
  }

  // ---------------------------------------------------------------------------
  // Internals -- Rate Limiting
  // ---------------------------------------------------------------------------

  private checkIPSignupRate(ip: string): { allowed: boolean } {
    const now = Date.now();
    const windowMs = 3_600_000; // 1 hour

    let timestamps = this.ipSignupTimestamps.get(ip) ?? [];
    timestamps = timestamps.filter((t) => t > now - windowMs);
    this.ipSignupTimestamps.set(ip, timestamps);

    return { allowed: timestamps.length < this.config.maxSignupsPerIPPerHour };
  }

  private recordIPSignup(ip: string): void {
    const timestamps = this.ipSignupTimestamps.get(ip) ?? [];
    timestamps.push(Date.now());
    this.ipSignupTimestamps.set(ip, timestamps);
  }

  private checkDomainSignupRate(domain: string): { allowed: boolean } {
    const now = Date.now();
    const windowMs = 3_600_000; // 1 hour

    let timestamps = this.domainSignupTimestamps.get(domain) ?? [];
    timestamps = timestamps.filter((t) => t > now - windowMs);
    this.domainSignupTimestamps.set(domain, timestamps);

    return { allowed: timestamps.length < this.config.maxSignupsPerDomainPerHour };
  }

  private recordDomainSignup(domain: string): void {
    const timestamps = this.domainSignupTimestamps.get(domain) ?? [];
    timestamps.push(Date.now());
    this.domainSignupTimestamps.set(domain, timestamps);
  }

  // ---------------------------------------------------------------------------
  // Internals -- Service Accessors
  // ---------------------------------------------------------------------------

  private getAbuseService(): AbusePreventionService {
    if (!this.abuseService) {
      this.abuseService = getAbusePreventionService();
    }
    return this.abuseService;
  }

  private getRateLimitService(): RateLimitService {
    if (!this.rateLimitService) {
      this.rateLimitService = getRateLimitService();
    }
    return this.rateLimitService;
  }

  private getEmailVerificationService(): EmailVerificationService {
    if (!this.emailVerificationService) {
      this.emailVerificationService = getEmailVerificationService();
    }
    return this.emailVerificationService;
  }

  // ---------------------------------------------------------------------------
  // Internals -- Cleanup
  // ---------------------------------------------------------------------------

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const windowMs = 3_600_000; // 1 hour

      // Clean up stale IP signup timestamps
      for (const [ip, timestamps] of this.ipSignupTimestamps.entries()) {
        const filtered = timestamps.filter((t) => t > now - windowMs);
        if (filtered.length === 0) {
          this.ipSignupTimestamps.delete(ip);
        } else {
          this.ipSignupTimestamps.set(ip, filtered);
        }
      }

      // Clean up stale domain signup timestamps
      for (const [domain, timestamps] of this.domainSignupTimestamps.entries()) {
        const filtered = timestamps.filter((t) => t > now - windowMs);
        if (filtered.length === 0) {
          this.domainSignupTimestamps.delete(domain);
        } else {
          this.domainSignupTimestamps.set(domain, filtered);
        }
      }
    }, 300_000); // Every 5 minutes

    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      (this.cleanupTimer as NodeJS.Timeout).unref();
    }
  }
}

// =============================================================================
// Singleton Accessor
// =============================================================================

export function getOpenSignupService(): OpenSignupService {
  return OpenSignupService.getInstance();
}
