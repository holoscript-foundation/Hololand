/**
 * @hololand/backend -- AutoModerationRules
 *
 * Configurable rules engine for automated content moderation.
 * Supports per-tenant rule overrides, multiple rule types, action policies,
 * escalation ladders, and a time-decaying strike system.
 *
 * Architecture:
 *
 *   Content Input + userId + tenantId
 *       |
 *       v
 *   [AutoModerationRules.evaluateRules()]
 *       |
 *       ├── word_filter        -- custom blocklist per tenant
 *       ├── content_type_filter -- disable certain content types
 *       ├── rate_limit         -- max messages per minute
 *       ├── repeat_content     -- detect spam/flooding
 *       └── link_filter        -- block URLs matching patterns
 *       |
 *       v
 *   RuleEvaluationResult
 *       |
 *       ├── action: warn / mute / ban
 *       ├── escalation check (strikes system)
 *       └── strike recorded with 30-day decay
 *
 * Escalation ladder:
 *   3 warns  --> auto-mute for 1 hour
 *   3 mutes  --> auto-ban (pending review)
 *
 * Strike decay:
 *   Strikes expire after 30 days (configurable).
 *   Only active (non-expired) strikes count toward escalation.
 *
 * Per-tenant overrides:
 *   Each tenant can customize thresholds, enabled rules, blocked words,
 *   blocked link patterns, rate limits, and action policies.
 *
 * Integration:
 *   Wire into ContentModerationService as pre-processing hook.
 *   evaluateRules() runs BEFORE the multi-layer pipeline.
 *   If rules trigger an action, the pipeline can short-circuit.
 *
 * @version 1.0.0
 */

import type { ContentType, ModerationAction } from './ContentModerationService';

// =============================================================================
// TYPES
// =============================================================================

/** Available rule types. */
export type RuleType =
  | 'word_filter'
  | 'content_type_filter'
  | 'rate_limit'
  | 'repeat_content'
  | 'link_filter';

/** Actions that can be taken by auto-moderation rules. */
export type RuleAction = 'warn' | 'mute' | 'ban';

/** Configuration for a single auto-moderation rule. */
export interface AutoModerationRule {
  /** Unique rule identifier. */
  id: string;
  /** Type of rule. */
  type: RuleType;
  /** Whether this rule is enabled. */
  enabled: boolean;
  /** Human-readable description. */
  description: string;
  /** Action to take on first offense. */
  firstOffenseAction: RuleAction;
  /** Action to take on repeat offenses. */
  repeatOffenseAction: RuleAction;
  /** Action to take on severe violations. */
  severeAction: RuleAction;
  /** Rule-specific configuration. */
  config: RuleConfig;
}

/** Union type for rule-specific configurations. */
export type RuleConfig =
  | WordFilterConfig
  | ContentTypeFilterConfig
  | RateLimitConfig
  | RepeatContentConfig
  | LinkFilterConfig;

/** Configuration for word_filter rules. */
export interface WordFilterConfig {
  type: 'word_filter';
  /** Custom blocklist of words/phrases. */
  blockedWords: string[];
  /** Whether to apply leet-speak normalization. */
  normalizeLeetSpeak: boolean;
  /** Whether to check for partial matches within words. */
  partialMatch: boolean;
}

/** Configuration for content_type_filter rules. */
export interface ContentTypeFilterConfig {
  type: 'content_type_filter';
  /** Content types that are blocked. */
  blockedContentTypes: ContentType[];
}

/** Configuration for rate_limit rules. */
export interface RateLimitConfig {
  type: 'rate_limit';
  /** Maximum messages allowed per window. */
  maxMessages: number;
  /** Time window in milliseconds. Default: 60000 (1 minute). */
  windowMs: number;
}

/** Configuration for repeat_content rules. */
export interface RepeatContentConfig {
  type: 'repeat_content';
  /** Number of identical/similar messages to trigger detection. */
  threshold: number;
  /** Time window to check for repeats in milliseconds. */
  windowMs: number;
  /** Similarity threshold (0-1). 1.0 = exact match only. */
  similarityThreshold: number;
}

/** Configuration for link_filter rules. */
export interface LinkFilterConfig {
  type: 'link_filter';
  /** Regex patterns for blocked URLs. */
  blockedPatterns: string[];
  /** Whether to block ALL links. */
  blockAllLinks: boolean;
  /** Allowed URL patterns (whitelist, overrides blocked). */
  allowedPatterns: string[];
}

/** A strike recorded against a user. */
export interface UserStrike {
  /** Unique strike ID. */
  id: string;
  /** User who received the strike. */
  userId: string;
  /** Reason for the strike. */
  reason: string;
  /** Which rule triggered the strike. */
  ruleId: string;
  /** Rule type that triggered. */
  ruleType: RuleType;
  /** Action taken. */
  action: RuleAction;
  /** ISO timestamp when the strike was issued. */
  issuedAt: string;
  /** ISO timestamp when the strike expires. */
  expiresAt: string;
  /** Whether the strike has been manually revoked. */
  revoked: boolean;
}

/** Result of evaluating all rules against content. */
export interface RuleEvaluationResult {
  /** Whether any rule was triggered. */
  triggered: boolean;
  /** The action to take (highest severity from all triggered rules). */
  action: RuleAction | null;
  /** Equivalent ModerationAction for pipeline integration. */
  moderationAction: ModerationAction;
  /** Which rules were triggered. */
  triggeredRules: TriggeredRule[];
  /** Current active strike count for the user. */
  activeStrikes: number;
  /** Whether an escalation was applied. */
  escalated: boolean;
  /** Escalation details if applicable. */
  escalationDetails?: string;
  /** ISO timestamp. */
  timestamp: string;
}

/** Details about a triggered rule. */
export interface TriggeredRule {
  ruleId: string;
  ruleType: RuleType;
  action: RuleAction;
  reason: string;
  /** Rule-specific match details. */
  matchDetails?: string;
}

/** Per-tenant rule override configuration. */
export interface TenantRuleOverrides {
  /** Tenant identifier. */
  tenantId: string;
  /** Override specific rules. Key is rule ID. */
  ruleOverrides: Map<string, Partial<AutoModerationRule>>;
  /** Additional tenant-specific blocked words (merged with defaults). */
  additionalBlockedWords?: string[];
  /** Additional tenant-specific blocked link patterns. */
  additionalBlockedLinkPatterns?: string[];
  /** Tenant-specific rate limit override (messages per minute). */
  rateLimitOverride?: number;
  /** Tenant-specific escalation thresholds. */
  escalationOverrides?: {
    warnsBeforeMute?: number;
    mutesBeforeBan?: number;
  };
  /** Tenant-specific strike decay in milliseconds. */
  strikeDecayMs?: number;
}

/** Configuration for the AutoModerationRules engine. */
export interface AutoModerationRulesConfig {
  /** Default strike decay period in milliseconds. Default: 30 days. */
  strikeDecayMs?: number;
  /** Number of warns before auto-mute. Default: 3. */
  warnsBeforeMute?: number;
  /** Number of mutes before auto-ban review. Default: 3. */
  mutesBeforeBan?: number;
  /** Duration of auto-mute in milliseconds. Default: 1 hour. */
  autoMuteDurationMs?: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_AUTO_MOD_CONFIG: Required<AutoModerationRulesConfig> = {
  strikeDecayMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  warnsBeforeMute: 3,
  mutesBeforeBan: 3,
  autoMuteDurationMs: 60 * 60 * 1000, // 1 hour
};

// =============================================================================
// LEET-SPEAK NORMALIZATION (shared with ContentModerationService)
// =============================================================================

const LEET_SPEAK_MAP: Record<string, string> = {
  '@': 'a', '4': 'a', '8': 'b', '(': 'c', '{': 'c', '<': 'c',
  '3': 'e', '6': 'g', '#': 'h', '1': 'i', '!': 'i', '|': 'i',
  '7': 'l', '0': 'o', '9': 'p', '2': 'r', '$': 's', '5': 's',
  '+': 't',
};

function normalizeLeet(text: string): string {
  let normalized = '';
  for (const char of text.toLowerCase()) {
    normalized += LEET_SPEAK_MAP[char] ?? char;
  }
  return normalized.replace(/[\s\-_.!@#$%^&*()+=<>?,/\\|[\]{}~`'"]/g, '');
}

// =============================================================================
// DEFAULT RULES
// =============================================================================

/**
 * Built-in default rules applied to all tenants.
 * Tenants can override these via per-tenant configuration.
 */
function createDefaultRules(): AutoModerationRule[] {
  return [
    {
      id: 'default_word_filter',
      type: 'word_filter',
      enabled: true,
      description: 'Blocks messages containing custom blocklisted words',
      firstOffenseAction: 'warn',
      repeatOffenseAction: 'mute',
      severeAction: 'ban',
      config: {
        type: 'word_filter',
        blockedWords: [], // Tenant-specific, empty by default (main blocklist is in ContentModerationService)
        normalizeLeetSpeak: true,
        partialMatch: false,
      },
    },
    {
      id: 'default_content_type_filter',
      type: 'content_type_filter',
      enabled: false, // Disabled by default, tenants opt-in
      description: 'Blocks certain content types from being submitted',
      firstOffenseAction: 'warn',
      repeatOffenseAction: 'warn',
      severeAction: 'mute',
      config: {
        type: 'content_type_filter',
        blockedContentTypes: [],
      },
    },
    {
      id: 'default_rate_limit',
      type: 'rate_limit',
      enabled: true,
      description: 'Limits messages per minute to prevent spam flooding',
      firstOffenseAction: 'warn',
      repeatOffenseAction: 'mute',
      severeAction: 'ban',
      config: {
        type: 'rate_limit',
        maxMessages: 30,
        windowMs: 60_000, // 1 minute
      },
    },
    {
      id: 'default_repeat_content',
      type: 'repeat_content',
      enabled: true,
      description: 'Detects repeated identical or similar messages (spam/flooding)',
      firstOffenseAction: 'warn',
      repeatOffenseAction: 'mute',
      severeAction: 'ban',
      config: {
        type: 'repeat_content',
        threshold: 3,
        windowMs: 60_000, // 1 minute
        similarityThreshold: 0.85,
      },
    },
    {
      id: 'default_link_filter',
      type: 'link_filter',
      enabled: true,
      description: 'Blocks messages containing URLs matching blocked patterns',
      firstOffenseAction: 'warn',
      repeatOffenseAction: 'mute',
      severeAction: 'ban',
      config: {
        type: 'link_filter',
        blockedPatterns: [
          'bit\\.ly', 'tinyurl\\.com', 'goo\\.gl', // URL shorteners (often used for phishing)
          'discord\\.gg', // External invite links
          'grabify\\.link', 'iplogger', // IP loggers
        ],
        blockAllLinks: false,
        allowedPatterns: [
          'hololand\\.io',
          'github\\.com',
        ],
      },
    },
  ];
}

// =============================================================================
// URL DETECTION
// =============================================================================

/** Regex to detect URLs in text. */
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

// =============================================================================
// SIMILARITY DETECTION
// =============================================================================

/**
 * Simple Jaccard similarity on word n-grams.
 * Returns a value between 0 (no overlap) and 1 (identical).
 */
function computeSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 1.0;
  if (wordsA.size === 0 || wordsB.size === 0) return 0.0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection += 1;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// =============================================================================
// AutoModerationRules Engine
// =============================================================================

/**
 * AutoModerationRules
 *
 * Configurable rules engine for automated content moderation.
 *
 * Features:
 * - Per-tenant rule overrides (thresholds, actions, custom blocklists)
 * - 5 rule types: word_filter, content_type_filter, rate_limit, repeat_content, link_filter
 * - Action policies: warn (first offense), mute (repeat), ban (severe)
 * - Escalation ladder: 3 warns -> auto-mute 1h, 3 mutes -> auto-ban review
 * - Strike system with 30-day decay
 *
 * Usage:
 *   const rules = new AutoModerationRules();
 *
 *   // Evaluate content
 *   const result = rules.evaluateRules('some message', 'user-123', 'tenant-abc');
 *
 *   if (result.triggered) {
 *     // Take action based on result.action and result.moderationAction
 *   }
 *
 *   // Set tenant-specific rules
 *   rules.setTenantRules('tenant-abc', {
 *     tenantId: 'tenant-abc',
 *     ruleOverrides: new Map([
 *       ['default_rate_limit', { config: { type: 'rate_limit', maxMessages: 10, windowMs: 60000 } }],
 *     ]),
 *     additionalBlockedWords: ['competitor-name'],
 *   });
 *
 * Integration with ContentModerationService:
 *   Wire evaluateRules() as a pre-processing hook before the multi-layer pipeline.
 *   If result.triggered and result.moderationAction !== 'allow', short-circuit.
 */
export class AutoModerationRules {
  private config: Required<AutoModerationRulesConfig>;

  /** Default rules (apply to all tenants). */
  private defaultRules: AutoModerationRule[];

  /** Per-tenant rule overrides. */
  private tenantOverrides: Map<string, TenantRuleOverrides> = new Map();

  /** User strikes. Key: userId. */
  private userStrikes: Map<string, UserStrike[]> = new Map();

  /** Rate limit tracking. Key: `${userId}:${ruleId}`. Value: timestamps of messages. */
  private rateLimitWindows: Map<string, number[]> = new Map();

  /** Recent messages for repeat detection. Key: `${userId}:${ruleId}`. Value: {content, timestamp}[]. */
  private recentMessages: Map<string, Array<{ content: string; timestamp: number }>> = new Map();

  /** Monotonically incrementing ID counter for strikes. */
  private nextStrikeId: number = 1;

  constructor(config: AutoModerationRulesConfig = {}) {
    this.config = {
      ...DEFAULT_AUTO_MOD_CONFIG,
      ...config,
    };
    this.defaultRules = createDefaultRules();
  }

  // ===========================================================================
  // Rule Evaluation (Main Entry Point)
  // ===========================================================================

  /**
   * Evaluate all applicable rules against content.
   * This is the main entry point, designed to be called as a pre-processing
   * hook in ContentModerationService.
   *
   * @param content - The content to evaluate
   * @param userId - User who created the content
   * @param tenantId - Tenant context
   * @param contentType - Type of content (default: 'chat')
   * @returns RuleEvaluationResult with action and triggered rules
   */
  evaluateRules(
    content: string,
    userId: string,
    tenantId?: string,
    contentType: ContentType = 'chat',
  ): RuleEvaluationResult {
    const now = new Date();
    const rules = this.getEffectiveRules(tenantId);
    const triggeredRules: TriggeredRule[] = [];

    // Evaluate each enabled rule
    for (const rule of rules) {
      if (!rule.enabled) continue;

      const triggered = this.evaluateSingleRule(rule, content, userId, tenantId, contentType, now);
      if (triggered) {
        triggeredRules.push(triggered);
      }
    }

    if (triggeredRules.length === 0) {
      return {
        triggered: false,
        action: null,
        moderationAction: 'allow',
        triggeredRules: [],
        activeStrikes: this.getActiveStrikeCount(userId, tenantId),
        escalated: false,
        timestamp: now.toISOString(),
      };
    }

    // Determine the highest severity action from triggered rules
    const actionPriority: Record<RuleAction, number> = { warn: 1, mute: 2, ban: 3 };
    let highestAction: RuleAction = 'warn';

    for (const tr of triggeredRules) {
      if (actionPriority[tr.action] > actionPriority[highestAction]) {
        highestAction = tr.action;
      }
    }

    // Record strikes for each triggered rule
    for (const tr of triggeredRules) {
      this.addStrike(userId, tr.reason, tr.ruleId, tr.ruleType, tr.action, tenantId);
    }

    // Check escalation ladder
    const escalationResult = this.checkEscalation(userId, tenantId);
    if (escalationResult.escalated) {
      if (actionPriority[escalationResult.action!] > actionPriority[highestAction]) {
        highestAction = escalationResult.action!;
      }
    }

    return {
      triggered: true,
      action: highestAction,
      moderationAction: this.ruleActionToModerationAction(highestAction),
      triggeredRules,
      activeStrikes: this.getActiveStrikeCount(userId, tenantId),
      escalated: escalationResult.escalated,
      escalationDetails: escalationResult.details,
      timestamp: now.toISOString(),
    };
  }

  // ===========================================================================
  // Tenant Rule Management
  // ===========================================================================

  /**
   * Get the effective rules for a tenant (default rules with tenant overrides merged).
   *
   * @param tenantId - Tenant ID (undefined for default rules only)
   * @returns Array of effective rules
   */
  getRulesForTenant(tenantId?: string): AutoModerationRule[] {
    return this.getEffectiveRules(tenantId);
  }

  /**
   * Set per-tenant rule overrides.
   *
   * @param tenantId - Tenant identifier
   * @param overrides - Tenant-specific overrides
   */
  setTenantRules(tenantId: string, overrides: Omit<TenantRuleOverrides, 'tenantId'>): void {
    this.tenantOverrides.set(tenantId, {
      tenantId,
      ...overrides,
    });
  }

  /**
   * Remove all tenant-specific rule overrides.
   *
   * @param tenantId - Tenant to remove overrides for
   */
  removeTenantRules(tenantId: string): void {
    this.tenantOverrides.delete(tenantId);
  }

  /**
   * Get tenant-specific overrides.
   *
   * @param tenantId - Tenant ID
   * @returns Tenant overrides or undefined
   */
  getTenantOverrides(tenantId: string): TenantRuleOverrides | undefined {
    const overrides = this.tenantOverrides.get(tenantId);
    return overrides ? { ...overrides } : undefined;
  }

  // ===========================================================================
  // Strike System
  // ===========================================================================

  /**
   * Get all active (non-expired, non-revoked) strikes for a user.
   *
   * @param userId - User ID
   * @param tenantId - Optional tenant context for decay override
   * @returns Array of active strikes
   */
  getUserStrikes(userId: string, tenantId?: string): UserStrike[] {
    const strikes = this.userStrikes.get(userId) ?? [];
    const now = Date.now();

    return strikes.filter(s =>
      !s.revoked &&
      new Date(s.expiresAt).getTime() > now
    ).map(s => ({ ...s }));
  }

  /**
   * Manually add a strike to a user (for admin/moderator use).
   *
   * @param userId - User ID
   * @param reason - Reason for the strike
   * @param ruleId - Optional rule ID that triggered the strike
   * @param ruleType - Optional rule type
   * @param action - The action associated with the strike
   * @param tenantId - Optional tenant context
   * @returns The created strike
   */
  addStrike(
    userId: string,
    reason: string,
    ruleId: string = 'manual',
    ruleType: RuleType = 'word_filter',
    action: RuleAction = 'warn',
    tenantId?: string,
  ): UserStrike {
    const now = new Date();
    const decayMs = this.getStrikeDecay(tenantId);

    const strike: UserStrike = {
      id: `strike_${this.nextStrikeId++}_${now.getTime()}`,
      userId,
      reason,
      ruleId,
      ruleType,
      action,
      issuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + decayMs).toISOString(),
      revoked: false,
    };

    if (!this.userStrikes.has(userId)) {
      this.userStrikes.set(userId, []);
    }
    this.userStrikes.get(userId)!.push(strike);

    return { ...strike };
  }

  /**
   * Revoke a specific strike.
   *
   * @param userId - User ID
   * @param strikeId - Strike ID to revoke
   * @returns true if the strike was found and revoked
   */
  revokeStrike(userId: string, strikeId: string): boolean {
    const strikes = this.userStrikes.get(userId);
    if (!strikes) return false;

    const strike = strikes.find(s => s.id === strikeId);
    if (!strike) return false;

    strike.revoked = true;
    return true;
  }

  /**
   * Get the escalation action for a user based on their active strikes.
   * Returns the appropriate escalation action based on the escalation ladder:
   *   3 warns  -> auto-mute for 1 hour
   *   3 mutes  -> auto-ban review
   *
   * @param userId - User ID
   * @param tenantId - Optional tenant context for escalation overrides
   * @returns Escalation action or null if no escalation triggered
   */
  getEscalationAction(userId: string, tenantId?: string): {
    action: RuleAction | null;
    reason: string | null;
  } {
    const result = this.checkEscalation(userId, tenantId);
    return {
      action: result.escalated ? result.action : null,
      reason: result.escalated ? result.details : null,
    };
  }

  // ===========================================================================
  // Individual Rule Evaluators
  // ===========================================================================

  /**
   * Evaluate a single rule against content.
   */
  private evaluateSingleRule(
    rule: AutoModerationRule,
    content: string,
    userId: string,
    tenantId: string | undefined,
    contentType: ContentType,
    now: Date,
  ): TriggeredRule | null {
    switch (rule.type) {
      case 'word_filter':
        return this.evaluateWordFilter(rule, content, userId, tenantId);
      case 'content_type_filter':
        return this.evaluateContentTypeFilter(rule, contentType);
      case 'rate_limit':
        return this.evaluateRateLimit(rule, userId, now);
      case 'repeat_content':
        return this.evaluateRepeatContent(rule, content, userId, now);
      case 'link_filter':
        return this.evaluateLinkFilter(rule, content, userId, tenantId);
      default:
        return null;
    }
  }

  /**
   * Word filter: Check content against blocked word list.
   */
  private evaluateWordFilter(
    rule: AutoModerationRule,
    content: string,
    userId: string,
    tenantId?: string,
  ): TriggeredRule | null {
    const config = rule.config as WordFilterConfig;

    // Merge tenant additional blocked words
    const blockedWords = [...config.blockedWords];
    if (tenantId) {
      const tenantOverride = this.tenantOverrides.get(tenantId);
      if (tenantOverride?.additionalBlockedWords) {
        blockedWords.push(...tenantOverride.additionalBlockedWords);
      }
    }

    if (blockedWords.length === 0) return null;

    const normalizedContent = config.normalizeLeetSpeak
      ? normalizeLeet(content)
      : content.toLowerCase();

    const matchedWords: string[] = [];
    for (const word of blockedWords) {
      const normalizedWord = config.normalizeLeetSpeak
        ? normalizeLeet(word)
        : word.toLowerCase();

      if (config.partialMatch) {
        if (normalizedContent.includes(normalizedWord)) {
          matchedWords.push(word);
        }
      } else {
        // Word boundary match using regex
        const escaped = normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (regex.test(normalizedContent)) {
          matchedWords.push(word);
        }
      }
    }

    if (matchedWords.length === 0) return null;

    const action = this.getActionForUser(rule, userId);

    return {
      ruleId: rule.id,
      ruleType: 'word_filter',
      action,
      reason: `Blocked words detected: ${matchedWords.slice(0, 5).join(', ')}`,
      matchDetails: `Matched ${matchedWords.length} word(s)`,
    };
  }

  /**
   * Content type filter: Check if the content type is blocked.
   */
  private evaluateContentTypeFilter(
    rule: AutoModerationRule,
    contentType: ContentType,
  ): TriggeredRule | null {
    const config = rule.config as ContentTypeFilterConfig;

    if (!config.blockedContentTypes.includes(contentType)) return null;

    return {
      ruleId: rule.id,
      ruleType: 'content_type_filter',
      action: rule.firstOffenseAction,
      reason: `Content type '${contentType}' is not allowed`,
      matchDetails: `Blocked content type: ${contentType}`,
    };
  }

  /**
   * Rate limit: Check if user exceeds message rate.
   */
  private evaluateRateLimit(
    rule: AutoModerationRule,
    userId: string,
    now: Date,
  ): TriggeredRule | null {
    const config = rule.config as RateLimitConfig;
    const key = `${userId}:${rule.id}`;
    const nowMs = now.getTime();
    const windowStart = nowMs - config.windowMs;

    // Get or initialize window
    let timestamps = this.rateLimitWindows.get(key);
    if (!timestamps) {
      timestamps = [];
      this.rateLimitWindows.set(key, timestamps);
    }

    // Prune old entries
    const pruned = timestamps.filter(t => t > windowStart);
    this.rateLimitWindows.set(key, pruned);

    // Add current message
    pruned.push(nowMs);

    if (pruned.length <= config.maxMessages) return null;

    const action = this.getActionForUser(rule, userId);

    return {
      ruleId: rule.id,
      ruleType: 'rate_limit',
      action,
      reason: `Rate limit exceeded: ${pruned.length}/${config.maxMessages} messages in ${config.windowMs / 1000}s`,
      matchDetails: `${pruned.length} messages in window`,
    };
  }

  /**
   * Repeat content: Detect spam/flooding via similar repeated messages.
   */
  private evaluateRepeatContent(
    rule: AutoModerationRule,
    content: string,
    userId: string,
    now: Date,
  ): TriggeredRule | null {
    const config = rule.config as RepeatContentConfig;
    const key = `${userId}:${rule.id}`;
    const nowMs = now.getTime();
    const windowStart = nowMs - config.windowMs;

    // Get or initialize recent messages
    let messages = this.recentMessages.get(key);
    if (!messages) {
      messages = [];
      this.recentMessages.set(key, messages);
    }

    // Prune old entries
    const pruned = messages.filter(m => m.timestamp > windowStart);
    this.recentMessages.set(key, pruned);

    // Add current message
    pruned.push({ content, timestamp: nowMs });

    // Count similar messages
    let similarCount = 0;
    for (const msg of pruned) {
      if (msg.timestamp === nowMs && msg.content === content) continue; // Skip current

      const similarity = config.similarityThreshold >= 1.0
        ? (msg.content === content ? 1.0 : 0.0)
        : computeSimilarity(msg.content, content);

      if (similarity >= config.similarityThreshold) {
        similarCount += 1;
      }
    }

    if (similarCount < config.threshold) return null;

    const action = this.getActionForUser(rule, userId);

    return {
      ruleId: rule.id,
      ruleType: 'repeat_content',
      action,
      reason: `Repeated content detected: ${similarCount + 1} similar messages in ${config.windowMs / 1000}s`,
      matchDetails: `${similarCount + 1} similar messages (threshold: ${config.threshold})`,
    };
  }

  /**
   * Link filter: Check for blocked URL patterns in content.
   */
  private evaluateLinkFilter(
    rule: AutoModerationRule,
    content: string,
    userId: string,
    tenantId?: string,
  ): TriggeredRule | null {
    const config = rule.config as LinkFilterConfig;

    // Find all URLs in content
    const urls = content.match(URL_REGEX);
    if (!urls && !config.blockAllLinks) return null;
    if (!urls) return null;

    // Merge tenant additional patterns
    const blockedPatterns = [...config.blockedPatterns];
    if (tenantId) {
      const tenantOverride = this.tenantOverrides.get(tenantId);
      if (tenantOverride?.additionalBlockedLinkPatterns) {
        blockedPatterns.push(...tenantOverride.additionalBlockedLinkPatterns);
      }
    }

    // Check allowed patterns first (whitelist)
    const allowedRegexes = config.allowedPatterns.map(p => {
      try { return new RegExp(p, 'i'); } catch { return null; }
    }).filter(Boolean) as RegExp[];

    const blockedRegexes = blockedPatterns.map(p => {
      try { return new RegExp(p, 'i'); } catch { return null; }
    }).filter(Boolean) as RegExp[];

    const blockedUrls: string[] = [];

    for (const url of urls) {
      // Check if URL is whitelisted
      const isAllowed = allowedRegexes.some(re => re.test(url));
      if (isAllowed) continue;

      if (config.blockAllLinks) {
        blockedUrls.push(url);
        continue;
      }

      // Check against blocked patterns
      const isBlocked = blockedRegexes.some(re => re.test(url));
      if (isBlocked) {
        blockedUrls.push(url);
      }
    }

    if (blockedUrls.length === 0) return null;

    const action = this.getActionForUser(rule, userId);

    return {
      ruleId: rule.id,
      ruleType: 'link_filter',
      action,
      reason: `Blocked link(s) detected: ${blockedUrls.slice(0, 3).join(', ')}`,
      matchDetails: `${blockedUrls.length} blocked URL(s)`,
    };
  }

  // ===========================================================================
  // Escalation Ladder
  // ===========================================================================

  /**
   * Check if user should be escalated based on accumulated strikes.
   */
  private checkEscalation(
    userId: string,
    tenantId?: string,
  ): { escalated: boolean; action: RuleAction | null; details: string | null } {
    const activeStrikes = this.getUserStrikes(userId, tenantId);

    const warnsBeforeMute = this.getEscalationThreshold('warnsBeforeMute', tenantId);
    const mutesBeforeBan = this.getEscalationThreshold('mutesBeforeBan', tenantId);

    const warnCount = activeStrikes.filter(s => s.action === 'warn').length;
    const muteCount = activeStrikes.filter(s => s.action === 'mute').length;

    // Check mutes threshold first (higher severity)
    if (muteCount >= mutesBeforeBan) {
      return {
        escalated: true,
        action: 'ban',
        details: `Escalation: ${muteCount} mutes reached (threshold: ${mutesBeforeBan}). Auto-ban for review.`,
      };
    }

    // Check warns threshold
    if (warnCount >= warnsBeforeMute) {
      return {
        escalated: true,
        action: 'mute',
        details: `Escalation: ${warnCount} warns reached (threshold: ${warnsBeforeMute}). Auto-mute for ${this.config.autoMuteDurationMs / 60000} minute(s).`,
      };
    }

    return { escalated: false, action: null, details: null };
  }

  // ===========================================================================
  // Internals
  // ===========================================================================

  /**
   * Get effective rules for a tenant (default rules merged with overrides).
   */
  private getEffectiveRules(tenantId?: string): AutoModerationRule[] {
    if (!tenantId) return [...this.defaultRules];

    const overrides = this.tenantOverrides.get(tenantId);
    if (!overrides) return [...this.defaultRules];

    return this.defaultRules.map(rule => {
      const override = overrides.ruleOverrides.get(rule.id);
      if (!override) return { ...rule };

      // Deep merge the rule with override
      const merged: AutoModerationRule = {
        ...rule,
        ...override,
        id: rule.id, // ID cannot be overridden
        type: rule.type, // Type cannot be overridden
        config: override.config
          ? { ...rule.config, ...override.config }
          : { ...rule.config },
      };

      // Handle rate limit override at tenant level
      if (rule.type === 'rate_limit' && overrides.rateLimitOverride !== undefined) {
        (merged.config as RateLimitConfig).maxMessages = overrides.rateLimitOverride;
      }

      return merged;
    });
  }

  /**
   * Determine the appropriate action for a user based on their offense history.
   */
  private getActionForUser(rule: AutoModerationRule, userId: string): RuleAction {
    const strikes = this.userStrikes.get(userId) ?? [];
    const ruleStrikes = strikes.filter(
      s => s.ruleId === rule.id && !s.revoked && new Date(s.expiresAt).getTime() > Date.now()
    );

    if (ruleStrikes.length === 0) return rule.firstOffenseAction;
    if (ruleStrikes.length < 3) return rule.repeatOffenseAction;
    return rule.severeAction;
  }

  /**
   * Get the number of active (non-expired, non-revoked) strikes for a user.
   */
  private getActiveStrikeCount(userId: string, tenantId?: string): number {
    return this.getUserStrikes(userId, tenantId).length;
  }

  /**
   * Get strike decay period, considering tenant overrides.
   */
  private getStrikeDecay(tenantId?: string): number {
    if (tenantId) {
      const overrides = this.tenantOverrides.get(tenantId);
      if (overrides?.strikeDecayMs) return overrides.strikeDecayMs;
    }
    return this.config.strikeDecayMs;
  }

  /**
   * Get escalation threshold, considering tenant overrides.
   */
  private getEscalationThreshold(
    thresholdType: 'warnsBeforeMute' | 'mutesBeforeBan',
    tenantId?: string,
  ): number {
    if (tenantId) {
      const overrides = this.tenantOverrides.get(tenantId);
      if (overrides?.escalationOverrides?.[thresholdType] !== undefined) {
        return overrides.escalationOverrides[thresholdType]!;
      }
    }
    return this.config[thresholdType];
  }

  /**
   * Convert a RuleAction to a ModerationAction for pipeline integration.
   */
  private ruleActionToModerationAction(action: RuleAction): ModerationAction {
    switch (action) {
      case 'warn': return 'warn';
      case 'mute': return 'remove'; // Mute = remove content
      case 'ban': return 'ban';
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clean up expired data (rate limit windows, recent messages, expired strikes).
   * Call periodically to prevent memory growth.
   */
  cleanup(): void {
    const now = Date.now();

    // Clean up rate limit windows
    for (const [key, timestamps] of this.rateLimitWindows) {
      const pruned = timestamps.filter(t => t > now - 120_000); // Keep 2 minutes
      if (pruned.length === 0) {
        this.rateLimitWindows.delete(key);
      } else {
        this.rateLimitWindows.set(key, pruned);
      }
    }

    // Clean up recent messages
    for (const [key, messages] of this.recentMessages) {
      const pruned = messages.filter(m => m.timestamp > now - 120_000);
      if (pruned.length === 0) {
        this.recentMessages.delete(key);
      } else {
        this.recentMessages.set(key, pruned);
      }
    }

    // Clean up expired strikes
    for (const [userId, strikes] of this.userStrikes) {
      const active = strikes.filter(s =>
        !s.revoked && new Date(s.expiresAt).getTime() > now
      );
      if (active.length === 0) {
        this.userStrikes.delete(userId);
      } else {
        this.userStrikes.set(userId, active);
      }
    }
  }
}
