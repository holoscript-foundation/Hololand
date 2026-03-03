/**
 * @hololand/backend -- Content Moderation Module
 *
 * Multi-layer content moderation pipeline with:
 * - ContentModerationService: 4-layer pipeline (blocklist, classifier, LLM, human)
 * - ModerationQueueService: Reviewer assignment, SLA tracking, appeals, audit trail
 * - AutoModerationRules: Configurable rules engine with per-tenant overrides
 *
 * See ContentModerationService.ts for pipeline architecture.
 * See ModerationQueueService.ts for queue/appeal/audit architecture.
 * See AutoModerationRules.ts for rules engine architecture.
 */

// --- ContentModerationService ---
export {
  ContentModerationService,
  quickBlocklistCheck,
  normalizeLeetSpeak,
} from './ContentModerationService';

export type {
  ContentType,
  ModerationAction,
  ModerationLayer,
  Severity,
  ModerationResult,
  LayerResult,
  ModerationConfig,
  ModerationEvent,
  HumanReviewItem,
  NSFWClassification,
} from './ContentModerationService';

// --- ModerationQueueService ---
export {
  ModerationQueueService,
} from './ModerationQueueService';

export type {
  QueuePriority,
  QueueItemStatus,
  ModerationDecision,
  SLAStatus,
  ModerationQueueItem,
  ModerationAppeal,
  Moderator,
  AuditLogEntry,
  AuditActionType,
  ModeratorStats,
  SLAComplianceReport,
  QueueFilters,
  ModerationQueueServiceConfig,
} from './ModerationQueueService';

// --- AutoModerationRules ---
export {
  AutoModerationRules,
} from './AutoModerationRules';

export type {
  RuleType,
  RuleAction,
  AutoModerationRule,
  RuleConfig,
  WordFilterConfig,
  ContentTypeFilterConfig,
  RateLimitConfig,
  RepeatContentConfig,
  LinkFilterConfig,
  UserStrike,
  RuleEvaluationResult,
  TriggeredRule,
  TenantRuleOverrides,
  AutoModerationRulesConfig,
} from './AutoModerationRules';
