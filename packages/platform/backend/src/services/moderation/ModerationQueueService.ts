/**
 * @hololand/backend -- ModerationQueueService
 *
 * Reviewer assignment system with queue management, SLA tracking,
 * appeal flow, and full audit trail integration.
 *
 * Architecture:
 *
 *   Content flagged by ContentModerationService
 *       |
 *       v
 *   [ModerationQueueService.enqueue()]
 *       |
 *       v
 *   Queue prioritization (critical first, then FIFO by submission time)
 *       |
 *       v
 *   [assignNext(moderatorId)] -- round-robin among active moderators
 *       |
 *       v
 *   Moderator reviews --> [resolveItem()] --> AuditLog entry
 *       |
 *       v  (if user disagrees)
 *   [submitAppeal()] --> different reviewer assigned
 *       |
 *       v
 *   [resolveAppeal()] --> final decision --> AuditLog entry
 *
 * SLA targets:
 *   - Standard items: 24h response target
 *   - Urgent items (high severity): 4h response target
 *   - Critical items (CSAM/threats): 4h response target
 *
 * Audit trail: Every moderation action is logged with moderator ID,
 * action taken, reason, timestamp, and content snapshot (AuditLogTrait).
 *
 * @version 1.0.0
 */

import type {
  ContentType,
  Severity,
  LayerResult,
} from './ContentModerationService';

// =============================================================================
// TYPES
// =============================================================================

/** Priority levels for queue items. Higher number = higher priority. */
export type QueuePriority = 'critical' | 'urgent' | 'standard';

/** Status of a moderation queue item. */
export type QueueItemStatus =
  | 'pending'
  | 'assigned'
  | 'resolved'
  | 'appealed'
  | 'appeal_assigned'
  | 'appeal_resolved';

/** Decision a moderator can make on an item. */
export type ModerationDecision = 'approve' | 'reject' | 'escalate';

/** SLA compliance status for an item. */
export type SLAStatus = 'within_sla' | 'at_risk' | 'breached';

/** An item in the moderation queue. */
export interface ModerationQueueItem {
  /** Unique identifier for the queue item. */
  id: string;
  /** The content being moderated. */
  content: string;
  /** Snapshot of content at time of submission (immutable for audit). */
  contentSnapshot: string;
  /** Type of content (chat, listing, description, etc). */
  contentType: ContentType;
  /** User ID who created the content. */
  userId: string;
  /** Tenant ID for multi-tenant environments. */
  tenantId?: string;
  /** Severity as determined by the moderation pipeline. */
  severity: Severity;
  /** Queue priority derived from severity. */
  priority: QueuePriority;
  /** Results from automated moderation layers. */
  layerResults: LayerResult[];
  /** Reason for entering the queue. */
  reason: string;
  /** Current status in the queue workflow. */
  status: QueueItemStatus;
  /** ISO timestamp when submitted to queue. */
  submittedAt: string;
  /** ISO timestamp when assigned to a moderator. */
  assignedAt?: string;
  /** ISO timestamp when resolved. */
  resolvedAt?: string;
  /** ID of the assigned moderator. */
  assignedModeratorId?: string;
  /** Moderator's decision. */
  decision?: ModerationDecision;
  /** Moderator's reason for the decision. */
  decisionReason?: string;
  /** SLA target deadline (ISO timestamp). */
  slaDeadline: string;
}

/** An appeal submitted by a user. */
export interface ModerationAppeal {
  /** Unique identifier for the appeal. */
  id: string;
  /** Reference to the original queue item. */
  originalItemId: string;
  /** User who submitted the appeal. */
  userId: string;
  /** User's reason for appealing. */
  appealReason: string;
  /** Status of the appeal. */
  status: 'pending' | 'assigned' | 'resolved';
  /** ISO timestamp when the appeal was submitted. */
  submittedAt: string;
  /** ISO timestamp when assigned to a reviewer. */
  assignedAt?: string;
  /** ISO timestamp when resolved. */
  resolvedAt?: string;
  /** ID of the appeal reviewer (different from original reviewer). */
  assignedModeratorId?: string;
  /** Appeal reviewer's decision. */
  decision?: ModerationDecision;
  /** Appeal reviewer's reason. */
  decisionReason?: string;
  /** SLA deadline for the appeal. */
  slaDeadline: string;
}

/** A moderator's profile in the system. */
export interface Moderator {
  /** Unique moderator ID. */
  id: string;
  /** Whether the moderator is currently active and accepting assignments. */
  active: boolean;
  /** Number of items currently assigned. */
  currentLoad: number;
  /** Maximum items a moderator can have assigned at once. */
  maxLoad: number;
  /** Total items resolved by this moderator. */
  totalResolved: number;
  /** Total items resolved within SLA. */
  totalWithinSLA: number;
  /** ISO timestamp of last assignment. */
  lastAssignedAt?: string;
  /** Round-robin index for assignment ordering. */
  assignmentIndex: number;
}

/** An entry in the audit log. */
export interface AuditLogEntry {
  /** Unique audit log entry ID. */
  id: string;
  /** ISO timestamp of the action. */
  timestamp: string;
  /** Type of action performed. */
  actionType: AuditActionType;
  /** ID of the moderator who performed the action. */
  moderatorId: string;
  /** ID of the queue item or appeal acted upon. */
  targetId: string;
  /** The decision or action taken. */
  action: string;
  /** Reason provided by the moderator. */
  reason: string;
  /** Snapshot of the content at the time of action. */
  contentSnapshot: string;
  /** Content type for context. */
  contentType: ContentType;
  /** User ID of the content author. */
  userId: string;
  /** Tenant ID if applicable. */
  tenantId?: string;
  /** Additional metadata. */
  metadata?: Record<string, unknown>;
}

/** Types of audit log actions. */
export type AuditActionType =
  | 'item_enqueued'
  | 'item_assigned'
  | 'item_resolved'
  | 'appeal_submitted'
  | 'appeal_assigned'
  | 'appeal_resolved'
  | 'moderator_registered'
  | 'moderator_deactivated';

/** Moderator performance statistics. */
export interface ModeratorStats {
  moderatorId: string;
  totalAssigned: number;
  totalResolved: number;
  totalWithinSLA: number;
  slaComplianceRate: number;
  averageResolutionTimeMs: number;
  currentLoad: number;
  active: boolean;
}

/** Platform-wide SLA compliance report. */
export interface SLAComplianceReport {
  totalItems: number;
  resolvedItems: number;
  pendingItems: number;
  withinSLA: number;
  atRisk: number;
  breached: number;
  overallComplianceRate: number;
  byPriority: {
    critical: { total: number; withinSLA: number; breached: number };
    urgent: { total: number; withinSLA: number; breached: number };
    standard: { total: number; withinSLA: number; breached: number };
  };
  generatedAt: string;
}

/** Filters for querying the moderation queue. */
export interface QueueFilters {
  status?: QueueItemStatus | QueueItemStatus[];
  priority?: QueuePriority | QueuePriority[];
  severity?: Severity | Severity[];
  contentType?: ContentType | ContentType[];
  tenantId?: string;
  /** Only items submitted after this ISO timestamp. */
  submittedAfter?: string;
  /** Only items submitted before this ISO timestamp. */
  submittedBefore?: string;
  /** Limit results. */
  limit?: number;
  /** Offset for pagination. */
  offset?: number;
}

/** Configuration for the ModerationQueueService. */
export interface ModerationQueueServiceConfig {
  /** SLA target for standard items in milliseconds. Default: 24 hours. */
  standardSLAMs?: number;
  /** SLA target for urgent items in milliseconds. Default: 4 hours. */
  urgentSLAMs?: number;
  /** SLA target for critical items in milliseconds. Default: 4 hours. */
  criticalSLAMs?: number;
  /** Maximum items per moderator. Default: 20. */
  maxModeratorLoad?: number;
  /** Percentage of SLA remaining to trigger "at risk". Default: 0.25 (25%). */
  slaAtRiskThreshold?: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_QUEUE_CONFIG: Required<ModerationQueueServiceConfig> = {
  standardSLAMs: 24 * 60 * 60 * 1000,  // 24 hours
  urgentSLAMs: 4 * 60 * 60 * 1000,     // 4 hours
  criticalSLAMs: 4 * 60 * 60 * 1000,   // 4 hours
  maxModeratorLoad: 20,
  slaAtRiskThreshold: 0.25,
};

// =============================================================================
// SLA UTILITY
// =============================================================================

/**
 * Determine queue priority from severity.
 * Critical severity and CSAM-related -> critical priority.
 * High severity -> urgent priority.
 * Everything else -> standard priority.
 */
function severityToPriority(severity: Severity): QueuePriority {
  switch (severity) {
    case 'critical': return 'critical';
    case 'high': return 'urgent';
    default: return 'standard';
  }
}

/** Priority ordering for queue sorting (higher = processed first). */
const PRIORITY_ORDER: Record<QueuePriority, number> = {
  critical: 3,
  urgent: 2,
  standard: 1,
};

// =============================================================================
// ModerationQueueService
// =============================================================================

/**
 * ModerationQueueService
 *
 * Manages the moderation review queue with:
 * - Round-robin reviewer assignment among active moderators
 * - SLA tracking (24h standard, 4h urgent/critical)
 * - Queue prioritization (critical first, then FIFO)
 * - Appeal flow (different reviewer, final decision)
 * - Full audit trail (AuditLogTrait)
 *
 * Usage:
 *   const queueService = new ModerationQueueService();
 *   queueService.registerModerator('mod-1');
 *   queueService.registerModerator('mod-2');
 *
 *   // Enqueue from pipeline
 *   const item = queueService.enqueue({
 *     content: 'some flagged content',
 *     contentType: 'chat',
 *     userId: 'user-123',
 *     severity: 'high',
 *     layerResults: [...],
 *     reason: 'Flagged by Layer 1',
 *   });
 *
 *   // Moderator picks up next item
 *   const assigned = queueService.assignNext('mod-1');
 *
 *   // Moderator resolves
 *   queueService.resolveItem(assigned.id, 'mod-1', 'reject', 'Contains slur');
 *
 *   // User appeals
 *   queueService.submitAppeal(assigned.id, 'user-123', 'I was quoting a movie');
 *
 *   // Different moderator resolves appeal
 *   const appeal = queueService.getAppealQueue()[0];
 *   queueService.resolveAppeal(appeal.id, 'mod-2', 'approve', 'Context confirms quote');
 */
export class ModerationQueueService {
  private config: Required<ModerationQueueServiceConfig>;

  /** All queue items indexed by ID. */
  private items: Map<string, ModerationQueueItem> = new Map();
  /** All appeals indexed by ID. */
  private appeals: Map<string, ModerationAppeal> = new Map();
  /** Registered moderators indexed by ID. */
  private moderators: Map<string, Moderator> = new Map();
  /** Audit log entries (append-only). */
  private auditLog: AuditLogEntry[] = [];
  /** Resolution times for stats calculations (moderatorId -> durations in ms). */
  private resolutionTimes: Map<string, number[]> = new Map();
  /** Monotonically incrementing ID counters. */
  private nextItemId: number = 1;
  private nextAppealId: number = 1;
  private nextAuditId: number = 1;
  /** Round-robin counter for moderator assignment. */
  private roundRobinCounter: number = 0;

  constructor(config: ModerationQueueServiceConfig = {}) {
    this.config = {
      ...DEFAULT_QUEUE_CONFIG,
      ...config,
    };
  }

  // ===========================================================================
  // Moderator Management
  // ===========================================================================

  /**
   * Register a moderator to receive queue assignments.
   *
   * @param moderatorId - Unique moderator identifier
   * @param maxLoad - Maximum concurrent assignments (default from config)
   */
  registerModerator(moderatorId: string, maxLoad?: number): void {
    if (this.moderators.has(moderatorId)) {
      // Re-activate if already registered
      const mod = this.moderators.get(moderatorId)!;
      mod.active = true;
      mod.maxLoad = maxLoad ?? this.config.maxModeratorLoad;
      return;
    }

    this.moderators.set(moderatorId, {
      id: moderatorId,
      active: true,
      currentLoad: 0,
      maxLoad: maxLoad ?? this.config.maxModeratorLoad,
      totalResolved: 0,
      totalWithinSLA: 0,
      lastAssignedAt: undefined,
      assignmentIndex: this.moderators.size,
    });

    this.appendAuditEntry({
      actionType: 'moderator_registered',
      moderatorId,
      targetId: moderatorId,
      action: 'register',
      reason: 'Moderator registered',
      contentSnapshot: '',
      contentType: 'chat',
      userId: moderatorId,
    });
  }

  /**
   * Deactivate a moderator. They will not receive new assignments but
   * can still resolve their current items.
   *
   * @param moderatorId - Moderator to deactivate
   */
  deactivateModerator(moderatorId: string): void {
    const mod = this.moderators.get(moderatorId);
    if (mod) {
      mod.active = false;

      this.appendAuditEntry({
        actionType: 'moderator_deactivated',
        moderatorId,
        targetId: moderatorId,
        action: 'deactivate',
        reason: 'Moderator deactivated',
        contentSnapshot: '',
        contentType: 'chat',
        userId: moderatorId,
      });
    }
  }

  /**
   * Get a list of active moderators.
   */
  getActiveModerators(): Moderator[] {
    return [...this.moderators.values()].filter(m => m.active);
  }

  // ===========================================================================
  // Queue Operations
  // ===========================================================================

  /**
   * Enqueue a content item for moderation review.
   *
   * @param params - Item details
   * @returns The created queue item
   */
  enqueue(params: {
    content: string;
    contentType: ContentType;
    userId: string;
    severity: Severity;
    layerResults: LayerResult[];
    reason: string;
    tenantId?: string;
  }): ModerationQueueItem {
    const now = new Date();
    const priority = severityToPriority(params.severity);
    const slaMs = this.getSLAForPriority(priority);
    const slaDeadline = new Date(now.getTime() + slaMs).toISOString();

    const item: ModerationQueueItem = {
      id: `mq_${this.nextItemId++}_${now.getTime()}`,
      content: params.content,
      contentSnapshot: params.content, // Immutable snapshot
      contentType: params.contentType,
      userId: params.userId,
      tenantId: params.tenantId,
      severity: params.severity,
      priority,
      layerResults: [...params.layerResults],
      reason: params.reason,
      status: 'pending',
      submittedAt: now.toISOString(),
      slaDeadline,
    };

    this.items.set(item.id, item);

    this.appendAuditEntry({
      actionType: 'item_enqueued',
      moderatorId: 'system',
      targetId: item.id,
      action: 'enqueue',
      reason: params.reason,
      contentSnapshot: item.contentSnapshot,
      contentType: params.contentType,
      userId: params.userId,
      tenantId: params.tenantId,
      metadata: {
        severity: params.severity,
        priority,
        slaDeadline,
      },
    });

    return { ...item };
  }

  /**
   * Get the moderation queue for a specific moderator, filtered and sorted.
   * Returns items assigned to the moderator plus unassigned items they could pick up.
   *
   * @param moderatorId - Moderator requesting the queue view
   * @param filters - Optional filters
   * @returns Sorted array of queue items
   */
  getQueue(moderatorId: string, filters?: QueueFilters): ModerationQueueItem[] {
    let results = [...this.items.values()];

    // Show items assigned to this moderator OR pending items
    results = results.filter(item =>
      item.assignedModeratorId === moderatorId ||
      item.status === 'pending'
    );

    // Apply filters
    if (filters) {
      results = this.applyFilters(results, filters);
    }

    // Sort: priority descending, then by submission time ascending (FIFO)
    results.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    });

    return results.map(item => ({ ...item }));
  }

  /**
   * Assign the next highest-priority pending item to a moderator.
   * Uses round-robin distribution among active moderators.
   *
   * @param moderatorId - Moderator requesting an assignment
   * @returns The assigned item, or undefined if no items available or moderator at capacity
   */
  assignNext(moderatorId: string): ModerationQueueItem | undefined {
    const moderator = this.moderators.get(moderatorId);
    if (!moderator || !moderator.active) {
      return undefined;
    }

    // Check load capacity
    if (moderator.currentLoad >= moderator.maxLoad) {
      return undefined;
    }

    // Get pending items sorted by priority (critical first) then FIFO
    const pendingItems = [...this.items.values()]
      .filter(item => item.status === 'pending')
      .sort((a, b) => {
        const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      });

    if (pendingItems.length === 0) {
      return undefined;
    }

    const item = pendingItems[0];
    const now = new Date().toISOString();

    item.status = 'assigned';
    item.assignedModeratorId = moderatorId;
    item.assignedAt = now;

    moderator.currentLoad += 1;
    moderator.lastAssignedAt = now;
    this.roundRobinCounter += 1;

    this.appendAuditEntry({
      actionType: 'item_assigned',
      moderatorId,
      targetId: item.id,
      action: 'assign',
      reason: `Assigned to moderator (priority: ${item.priority})`,
      contentSnapshot: item.contentSnapshot,
      contentType: item.contentType,
      userId: item.userId,
      tenantId: item.tenantId,
      metadata: {
        priority: item.priority,
        severity: item.severity,
        slaDeadline: item.slaDeadline,
      },
    });

    return { ...item };
  }

  /**
   * Auto-assign pending items across all active moderators using round-robin.
   * Distributes items evenly, respecting load limits.
   *
   * @returns Number of items assigned
   */
  autoAssignPending(): number {
    const activeMods = this.getActiveModerators()
      .filter(m => m.currentLoad < m.maxLoad)
      .sort((a, b) => a.assignmentIndex - b.assignmentIndex);

    if (activeMods.length === 0) return 0;

    const pendingItems = [...this.items.values()]
      .filter(item => item.status === 'pending')
      .sort((a, b) => {
        const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      });

    let assigned = 0;
    let modIndex = this.roundRobinCounter % activeMods.length;

    for (const item of pendingItems) {
      // Find next moderator with capacity (round-robin)
      let attempts = 0;
      while (attempts < activeMods.length) {
        const mod = activeMods[modIndex % activeMods.length];
        if (mod.currentLoad < mod.maxLoad) {
          const now = new Date().toISOString();
          item.status = 'assigned';
          item.assignedModeratorId = mod.id;
          item.assignedAt = now;

          mod.currentLoad += 1;
          mod.lastAssignedAt = now;

          this.appendAuditEntry({
            actionType: 'item_assigned',
            moderatorId: mod.id,
            targetId: item.id,
            action: 'auto_assign',
            reason: `Auto-assigned via round-robin (priority: ${item.priority})`,
            contentSnapshot: item.contentSnapshot,
            contentType: item.contentType,
            userId: item.userId,
            tenantId: item.tenantId,
          });

          assigned += 1;
          modIndex += 1;
          break;
        }
        modIndex += 1;
        attempts += 1;
      }

      if (attempts >= activeMods.length) break; // All moderators at capacity
    }

    this.roundRobinCounter = modIndex;
    return assigned;
  }

  /**
   * Resolve a queue item with a moderator's decision.
   *
   * @param itemId - Queue item ID
   * @param moderatorId - ID of the resolving moderator
   * @param decision - approve, reject, or escalate
   * @param reason - Moderator's reason for the decision
   * @returns The resolved item, or undefined if not found/unauthorized
   */
  resolveItem(
    itemId: string,
    moderatorId: string,
    decision: ModerationDecision,
    reason: string,
  ): ModerationQueueItem | undefined {
    const item = this.items.get(itemId);
    if (!item) return undefined;

    // Only the assigned moderator can resolve, or any moderator if unassigned
    if (item.assignedModeratorId && item.assignedModeratorId !== moderatorId) {
      return undefined;
    }

    // Ensure item is in a resolvable state
    if (item.status !== 'assigned' && item.status !== 'pending') {
      return undefined;
    }

    const now = new Date();
    item.status = 'resolved';
    item.decision = decision;
    item.decisionReason = reason;
    item.resolvedAt = now.toISOString();
    if (!item.assignedModeratorId) {
      item.assignedModeratorId = moderatorId;
      item.assignedAt = now.toISOString();
    }

    // Update moderator stats
    const moderator = this.moderators.get(moderatorId);
    if (moderator) {
      moderator.currentLoad = Math.max(0, moderator.currentLoad - 1);
      moderator.totalResolved += 1;

      // Check SLA compliance
      const withinSLA = now.getTime() <= new Date(item.slaDeadline).getTime();
      if (withinSLA) {
        moderator.totalWithinSLA += 1;
      }

      // Track resolution time
      const assignedTime = item.assignedAt ? new Date(item.assignedAt).getTime() : new Date(item.submittedAt).getTime();
      const resolutionTime = now.getTime() - assignedTime;
      if (!this.resolutionTimes.has(moderatorId)) {
        this.resolutionTimes.set(moderatorId, []);
      }
      this.resolutionTimes.get(moderatorId)!.push(resolutionTime);
    }

    this.appendAuditEntry({
      actionType: 'item_resolved',
      moderatorId,
      targetId: item.id,
      action: decision,
      reason,
      contentSnapshot: item.contentSnapshot,
      contentType: item.contentType,
      userId: item.userId,
      tenantId: item.tenantId,
      metadata: {
        severity: item.severity,
        priority: item.priority,
        slaDeadline: item.slaDeadline,
        withinSLA: now.getTime() <= new Date(item.slaDeadline).getTime(),
        resolutionTimeMs: item.assignedAt
          ? now.getTime() - new Date(item.assignedAt).getTime()
          : undefined,
      },
    });

    return { ...item };
  }

  // ===========================================================================
  // Appeal Flow
  // ===========================================================================

  /**
   * Submit an appeal for a resolved moderation decision.
   * Appeals are assigned to a different reviewer than the original.
   * Appeal decisions are final.
   *
   * @param itemId - The original queue item ID
   * @param userId - The user submitting the appeal
   * @param reason - User's reason for appealing
   * @returns The created appeal, or undefined if item not found or not appealable
   */
  submitAppeal(
    itemId: string,
    userId: string,
    reason: string,
  ): ModerationAppeal | undefined {
    const item = this.items.get(itemId);
    if (!item) return undefined;

    // Can only appeal resolved items
    if (item.status !== 'resolved') return undefined;

    // Can only appeal items that were rejected
    if (item.decision !== 'reject') return undefined;

    // Can only appeal your own content
    if (item.userId !== userId) return undefined;

    // Check if already appealed
    const existingAppeal = [...this.appeals.values()].find(
      a => a.originalItemId === itemId
    );
    if (existingAppeal) return undefined;

    const now = new Date();
    // Appeals get urgent SLA
    const slaMs = this.getSLAForPriority('urgent');
    const slaDeadline = new Date(now.getTime() + slaMs).toISOString();

    const appeal: ModerationAppeal = {
      id: `ma_${this.nextAppealId++}_${now.getTime()}`,
      originalItemId: itemId,
      userId,
      appealReason: reason,
      status: 'pending',
      submittedAt: now.toISOString(),
      slaDeadline,
    };

    this.appeals.set(appeal.id, appeal);

    // Update item status
    item.status = 'appealed';

    this.appendAuditEntry({
      actionType: 'appeal_submitted',
      moderatorId: 'user',
      targetId: appeal.id,
      action: 'appeal',
      reason,
      contentSnapshot: item.contentSnapshot,
      contentType: item.contentType,
      userId,
      tenantId: item.tenantId,
      metadata: {
        originalItemId: itemId,
        originalDecision: item.decision,
        originalModeratorId: item.assignedModeratorId,
      },
    });

    return { ...appeal };
  }

  /**
   * Get all pending appeals.
   * Sorted by priority (based on original item severity) then FIFO.
   */
  getAppealQueue(): ModerationAppeal[] {
    return [...this.appeals.values()]
      .filter(a => a.status === 'pending' || a.status === 'assigned')
      .sort((a, b) => {
        // Sort by submission time (FIFO)
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      })
      .map(a => ({ ...a }));
  }

  /**
   * Assign a pending appeal to a moderator.
   * Ensures the appeal reviewer is different from the original reviewer.
   *
   * @param appealId - Appeal ID
   * @param moderatorId - Moderator to assign
   * @returns The assigned appeal, or undefined if invalid
   */
  assignAppeal(appealId: string, moderatorId: string): ModerationAppeal | undefined {
    const appeal = this.appeals.get(appealId);
    if (!appeal || appeal.status !== 'pending') return undefined;

    const originalItem = this.items.get(appeal.originalItemId);
    if (!originalItem) return undefined;

    // Appeal must go to a DIFFERENT reviewer than the original
    if (originalItem.assignedModeratorId === moderatorId) {
      return undefined;
    }

    const moderator = this.moderators.get(moderatorId);
    if (!moderator || !moderator.active) return undefined;
    if (moderator.currentLoad >= moderator.maxLoad) return undefined;

    const now = new Date().toISOString();
    appeal.status = 'assigned';
    appeal.assignedModeratorId = moderatorId;
    appeal.assignedAt = now;

    moderator.currentLoad += 1;

    // Update original item status
    originalItem.status = 'appeal_assigned';

    this.appendAuditEntry({
      actionType: 'appeal_assigned',
      moderatorId,
      targetId: appeal.id,
      action: 'assign_appeal',
      reason: `Appeal assigned (original reviewer: ${originalItem.assignedModeratorId})`,
      contentSnapshot: originalItem.contentSnapshot,
      contentType: originalItem.contentType,
      userId: appeal.userId,
      tenantId: originalItem.tenantId,
    });

    return { ...appeal };
  }

  /**
   * Resolve an appeal. Appeal decision is final.
   *
   * @param appealId - Appeal ID
   * @param moderatorId - Resolving moderator ID
   * @param decision - approve or reject (escalate not available for appeals)
   * @param reason - Moderator's reason
   * @returns The resolved appeal, or undefined if invalid
   */
  resolveAppeal(
    appealId: string,
    moderatorId: string,
    decision: ModerationDecision,
    reason: string,
  ): ModerationAppeal | undefined {
    const appeal = this.appeals.get(appealId);
    if (!appeal) return undefined;

    // Only assigned reviewer can resolve
    if (appeal.assignedModeratorId !== moderatorId) return undefined;
    if (appeal.status !== 'assigned') return undefined;

    const originalItem = this.items.get(appeal.originalItemId);
    if (!originalItem) return undefined;

    const now = new Date();
    appeal.status = 'resolved';
    appeal.decision = decision;
    appeal.decisionReason = reason;
    appeal.resolvedAt = now.toISOString();

    // Update original item
    originalItem.status = 'appeal_resolved';

    // If appeal is approved, override the original decision
    if (decision === 'approve') {
      originalItem.decision = 'approve';
      originalItem.decisionReason = `Overturned on appeal: ${reason}`;
    }

    // Update moderator stats
    const moderator = this.moderators.get(moderatorId);
    if (moderator) {
      moderator.currentLoad = Math.max(0, moderator.currentLoad - 1);
      moderator.totalResolved += 1;

      const withinSLA = now.getTime() <= new Date(appeal.slaDeadline).getTime();
      if (withinSLA) {
        moderator.totalWithinSLA += 1;
      }
    }

    this.appendAuditEntry({
      actionType: 'appeal_resolved',
      moderatorId,
      targetId: appeal.id,
      action: decision,
      reason,
      contentSnapshot: originalItem.contentSnapshot,
      contentType: originalItem.contentType,
      userId: appeal.userId,
      tenantId: originalItem.tenantId,
      metadata: {
        originalItemId: appeal.originalItemId,
        originalDecision: originalItem.decision,
        appealDecision: decision,
        withinSLA: now.getTime() <= new Date(appeal.slaDeadline).getTime(),
        isFinal: true,
      },
    });

    return { ...appeal };
  }

  // ===========================================================================
  // Statistics & SLA
  // ===========================================================================

  /**
   * Get performance statistics for a specific moderator.
   *
   * @param moderatorId - Moderator ID
   * @returns ModeratorStats or undefined if moderator not found
   */
  getModeratorStats(moderatorId: string): ModeratorStats | undefined {
    const moderator = this.moderators.get(moderatorId);
    if (!moderator) return undefined;

    const times = this.resolutionTimes.get(moderatorId) ?? [];
    const avgResolutionTime = times.length > 0
      ? times.reduce((sum, t) => sum + t, 0) / times.length
      : 0;

    // Count total items ever assigned to this moderator from audit log
    const totalAssigned = this.auditLog.filter(
      e => e.moderatorId === moderatorId &&
      (e.actionType === 'item_assigned' || e.actionType === 'appeal_assigned')
    ).length;

    return {
      moderatorId,
      totalAssigned,
      totalResolved: moderator.totalResolved,
      totalWithinSLA: moderator.totalWithinSLA,
      slaComplianceRate: moderator.totalResolved > 0
        ? moderator.totalWithinSLA / moderator.totalResolved
        : 1.0,
      averageResolutionTimeMs: Math.round(avgResolutionTime),
      currentLoad: moderator.currentLoad,
      active: moderator.active,
    };
  }

  /**
   * Get platform-wide SLA compliance report.
   *
   * @returns SLAComplianceReport
   */
  getSLACompliance(): SLAComplianceReport {
    const now = new Date();
    const allItems = [...this.items.values()];

    const resolvedItems = allItems.filter(i =>
      i.status === 'resolved' || i.status === 'appeal_resolved'
    );
    const pendingItems = allItems.filter(i =>
      i.status === 'pending' || i.status === 'assigned' ||
      i.status === 'appealed' || i.status === 'appeal_assigned'
    );

    let withinSLA = 0;
    let atRisk = 0;
    let breached = 0;

    const byPriority = {
      critical: { total: 0, withinSLA: 0, breached: 0 },
      urgent: { total: 0, withinSLA: 0, breached: 0 },
      standard: { total: 0, withinSLA: 0, breached: 0 },
    };

    for (const item of allItems) {
      byPriority[item.priority].total += 1;

      const slaStatus = this.getItemSLAStatus(item, now);

      switch (slaStatus) {
        case 'within_sla':
          withinSLA += 1;
          byPriority[item.priority].withinSLA += 1;
          break;
        case 'at_risk':
          atRisk += 1;
          // Still technically within SLA
          byPriority[item.priority].withinSLA += 1;
          break;
        case 'breached':
          breached += 1;
          byPriority[item.priority].breached += 1;
          break;
      }
    }

    return {
      totalItems: allItems.length,
      resolvedItems: resolvedItems.length,
      pendingItems: pendingItems.length,
      withinSLA,
      atRisk,
      breached,
      overallComplianceRate: allItems.length > 0
        ? (withinSLA + atRisk) / allItems.length
        : 1.0,
      byPriority,
      generatedAt: now.toISOString(),
    };
  }

  // ===========================================================================
  // Audit Trail
  // ===========================================================================

  /**
   * Get the full audit log.
   * Supports optional filtering by target ID or moderator ID.
   *
   * @param filter - Optional filter criteria
   * @returns Array of audit log entries
   */
  getAuditLog(filter?: {
    targetId?: string;
    moderatorId?: string;
    actionType?: AuditActionType;
    limit?: number;
  }): AuditLogEntry[] {
    let entries = [...this.auditLog];

    if (filter?.targetId) {
      entries = entries.filter(e => e.targetId === filter.targetId);
    }
    if (filter?.moderatorId) {
      entries = entries.filter(e => e.moderatorId === filter.moderatorId);
    }
    if (filter?.actionType) {
      entries = entries.filter(e => e.actionType === filter.actionType);
    }

    // Most recent first
    entries.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (filter?.limit) {
      entries = entries.slice(0, filter.limit);
    }

    return entries;
  }

  // ===========================================================================
  // Item Retrieval
  // ===========================================================================

  /**
   * Get a specific queue item by ID.
   */
  getItem(itemId: string): ModerationQueueItem | undefined {
    const item = this.items.get(itemId);
    return item ? { ...item } : undefined;
  }

  /**
   * Get a specific appeal by ID.
   */
  getAppeal(appealId: string): ModerationAppeal | undefined {
    const appeal = this.appeals.get(appealId);
    return appeal ? { ...appeal } : undefined;
  }

  /**
   * Get all items matching the given filters.
   */
  getAllItems(filters?: QueueFilters): ModerationQueueItem[] {
    let results = [...this.items.values()];

    if (filters) {
      results = this.applyFilters(results, filters);
    }

    results.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    });

    return results.map(item => ({ ...item }));
  }

  // ===========================================================================
  // Internals
  // ===========================================================================

  /**
   * Get SLA duration for a given priority level.
   */
  private getSLAForPriority(priority: QueuePriority): number {
    switch (priority) {
      case 'critical': return this.config.criticalSLAMs;
      case 'urgent': return this.config.urgentSLAMs;
      case 'standard': return this.config.standardSLAMs;
    }
  }

  /**
   * Determine the SLA status of an item.
   */
  private getItemSLAStatus(item: ModerationQueueItem, now: Date): SLAStatus {
    const deadline = new Date(item.slaDeadline).getTime();

    // If resolved, check if it was resolved within SLA
    if (item.resolvedAt) {
      return new Date(item.resolvedAt).getTime() <= deadline
        ? 'within_sla'
        : 'breached';
    }

    // For pending/assigned items, check current time against deadline
    const timeRemaining = deadline - now.getTime();
    const totalSLA = this.getSLAForPriority(item.priority);
    const threshold = totalSLA * this.config.slaAtRiskThreshold;

    if (timeRemaining <= 0) return 'breached';
    if (timeRemaining <= threshold) return 'at_risk';
    return 'within_sla';
  }

  /**
   * Apply filters to a list of queue items.
   */
  private applyFilters(
    items: ModerationQueueItem[],
    filters: QueueFilters,
  ): ModerationQueueItem[] {
    let result = items;

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      result = result.filter(i => statuses.includes(i.status));
    }
    if (filters.priority) {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
      result = result.filter(i => priorities.includes(i.priority));
    }
    if (filters.severity) {
      const severities = Array.isArray(filters.severity) ? filters.severity : [filters.severity];
      result = result.filter(i => severities.includes(i.severity));
    }
    if (filters.contentType) {
      const types = Array.isArray(filters.contentType) ? filters.contentType : [filters.contentType];
      result = result.filter(i => types.includes(i.contentType));
    }
    if (filters.tenantId) {
      result = result.filter(i => i.tenantId === filters.tenantId);
    }
    if (filters.submittedAfter) {
      const after = new Date(filters.submittedAfter).getTime();
      result = result.filter(i => new Date(i.submittedAt).getTime() >= after);
    }
    if (filters.submittedBefore) {
      const before = new Date(filters.submittedBefore).getTime();
      result = result.filter(i => new Date(i.submittedAt).getTime() <= before);
    }

    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? result.length;
    result = result.slice(offset, offset + limit);

    return result;
  }

  /**
   * Append an entry to the audit log (AuditLogTrait).
   * Every moderation action is recorded with:
   * - Moderator ID
   * - Action taken
   * - Reason
   * - Timestamp
   * - Content snapshot (immutable)
   */
  private appendAuditEntry(params: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const entry: AuditLogEntry = {
      id: `audit_${this.nextAuditId++}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...params,
    };
    this.auditLog.push(entry);
  }
}
