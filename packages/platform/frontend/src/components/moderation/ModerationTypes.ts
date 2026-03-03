/**
 * Moderation Dashboard Types
 *
 * Defines the type system for the content moderation UI including queue management,
 * settings configuration, appeal reviews, and analytics metrics.
 *
 * @module moderation/ModerationTypes
 */

// =============================================================================
// CONTENT TYPES
// =============================================================================

/** Types of content that can be moderated */
export type ContentType = 'chat' | 'listing' | 'description' | 'profile';

/** Severity levels for moderation items */
export type Severity = 'low' | 'medium' | 'high' | 'critical';

/** Priority levels for queue ordering */
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

/** Status of a moderation queue item */
export type ModerationStatus = 'pending' | 'assigned' | 'resolved';

/** Moderation action taken on content */
export type ModerationAction = 'allow' | 'warn' | 'remove' | 'ban';

/** Appeal status */
export type AppealStatus = 'pending' | 'approved' | 'rejected';

// =============================================================================
// QUEUE ITEM
// =============================================================================

/** A single item in the moderation queue */
export interface ModerationItem {
  id: string;
  /** The content being reviewed */
  content: string;
  /** Type of content */
  contentType: ContentType;
  /** Severity classification */
  severity: Severity;
  /** Priority for queue ordering */
  priority: Priority;
  /** Current status */
  status: ModerationStatus;
  /** Action taken (if resolved) */
  action?: ModerationAction;
  /** Rejection reason (if rejected) */
  rejectionReason?: string;
  /** Rules that were triggered */
  triggeredRules: string[];
  /** ID of assigned moderator */
  assignedModeratorId?: string;
  /** Name of assigned moderator */
  assignedModeratorName?: string;
  /** Tenant / world ID */
  tenantId: string;
  /** Tenant / world name */
  tenantName: string;
  /** User who submitted the content */
  submittedBy: string;
  /** When the content was submitted */
  submittedAt: string;
  /** SLA deadline for resolution */
  slaDeadline: string;
  /** When the item was resolved */
  resolvedAt?: string;
  /** Who resolved the item */
  resolvedBy?: string;
}

// =============================================================================
// SLA
// =============================================================================

/** SLA status derived from deadline comparison */
export type SLAStatus = 'on-track' | 'at-risk' | 'breached';

/** SLA tier configuration */
export interface SLATier {
  severity: Severity;
  deadlineMinutes: number;
  atRiskThresholdMinutes: number;
}

// =============================================================================
// MODERATOR
// =============================================================================

/** Moderator info */
export interface Moderator {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isOnline: boolean;
}

/** Moderator performance stats */
export interface ModeratorPerformance {
  moderatorId: string;
  moderatorName: string;
  itemsResolved: number;
  avgResolutionTimeMinutes: number;
  slaCompliancePercent: number;
}

// =============================================================================
// QUEUE FILTERS
// =============================================================================

/** Filters for the moderation queue */
export interface ModerationFilters {
  status?: ModerationStatus;
  priority?: Priority;
  contentType?: ContentType;
  severity?: Severity;
  tenantId?: string;
  searchQuery?: string;
}

// =============================================================================
// QUEUE STATS
// =============================================================================

/** Summary statistics for the queue header */
export interface QueueStats {
  totalPending: number;
  assignedToMe: number;
  slaCompliancePercent: number;
  resolvedToday: number;
}

// =============================================================================
// SETTINGS
// =============================================================================

/** A single word filter entry */
export interface WordFilter {
  id: string;
  word: string;
  addedAt: string;
  addedBy: string;
}

/** A URL pattern filter */
export interface LinkFilter {
  id: string;
  pattern: string;
  addedAt: string;
  addedBy: string;
}

/** Rate limit configuration */
export interface RateLimitConfig {
  messagesPerMinute: number;
  enabled: boolean;
}

/** Escalation threshold configuration */
export interface EscalationThresholds {
  warnsBeforeMute: number;
  mutesBeforeBan: number;
}

/** Per-rule auto-moderation toggle */
export interface AutoModerationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  ruleType: 'word-filter' | 'link-filter' | 'rate-limit' | 'spam-detection' | 'toxicity';
}

/** Full moderation settings for a tenant/world */
export interface ModerationSettings {
  tenantId: string;
  tenantName: string;
  wordFilters: WordFilter[];
  linkFilters: LinkFilter[];
  contentTypeToggles: Record<ContentType, boolean>;
  rateLimit: RateLimitConfig;
  escalationThresholds: EscalationThresholds;
  autoModerationRules: AutoModerationRule[];
}

// =============================================================================
// APPEALS
// =============================================================================

/** An appeal submitted by a user */
export interface Appeal {
  id: string;
  /** The original moderation item */
  originalItem: ModerationItem;
  /** Original moderation decision */
  originalDecision: {
    action: ModerationAction;
    reason: string;
    moderatorName: string;
    decidedAt: string;
  };
  /** Reason the user submitted for appeal */
  appealReason: string;
  /** Status of the appeal */
  status: AppealStatus;
  /** Who is reviewing (must be different from original moderator) */
  reviewerId?: string;
  reviewerName?: string;
  /** Appeal resolution details */
  resolution?: {
    decision: 'upheld' | 'overturned';
    reason: string;
    decidedAt: string;
    decidedBy: string;
  };
  submittedAt: string;
}

// =============================================================================
// METRICS
// =============================================================================

/** Daily moderation count for bar chart */
export interface DailyModerationCount {
  date: string;
  count: number;
}

/** SLA compliance data point for trend line */
export interface SLACompliancePoint {
  date: string;
  compliancePercent: number;
}

/** Actions breakdown for pie chart */
export interface ActionsBreakdown {
  action: ModerationAction;
  count: number;
  percentage: number;
}

/** Triggered rule stats */
export interface TriggeredRuleStat {
  ruleName: string;
  triggerCount: number;
  lastTriggeredAt: string;
}

/** Full metrics snapshot */
export interface ModerationMetricsData {
  dailyCounts: DailyModerationCount[];
  slaComplianceTrend: SLACompliancePoint[];
  actionsBreakdown: ActionsBreakdown[];
  topTriggeredRules: TriggeredRuleStat[];
  moderatorPerformance: ModeratorPerformance[];
  /** Period covered */
  period: { start: string; end: string };
}

// =============================================================================
// CONTENT TYPE ICONS
// =============================================================================

/** Content type display config */
export const CONTENT_TYPE_CONFIG: Record<ContentType, { icon: string; label: string }> = {
  chat: { icon: 'MSG', label: 'Chat Message' },
  listing: { icon: 'LST', label: 'Marketplace Listing' },
  description: { icon: 'DSC', label: 'Description' },
  profile: { icon: 'PRF', label: 'User Profile' },
};

/** Severity display config */
export const SEVERITY_CONFIG: Record<Severity, { label: string; colorKey: 'info' | 'warning' | 'error' | 'error' }> = {
  low: { label: 'Low', colorKey: 'info' },
  medium: { label: 'Medium', colorKey: 'warning' },
  high: { label: 'High', colorKey: 'error' },
  critical: { label: 'Critical', colorKey: 'error' },
};

/** Priority sort order (higher = more urgent) */
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  urgent: 3,
};
