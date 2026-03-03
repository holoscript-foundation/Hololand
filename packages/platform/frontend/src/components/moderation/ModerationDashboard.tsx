/**
 * ModerationDashboard Component
 *
 * Main moderation review queue interface with:
 *   - Stats bar (pending, assigned, SLA compliance, resolved today)
 *   - Queue filters (status, priority, content type, severity, tenant)
 *   - Sortable queue table (priority-ordered, critical first)
 *   - Per-item actions (approve, reject with reason modal, escalate)
 *   - Bulk actions (select multiple, bulk approve/reject)
 *   - SLA countdown timers with at-risk/breached indicators
 *
 * Follows the PostProcessingControls inline-style + ARIA pattern.
 *
 * @module moderation/ModerationDashboard
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  type ModerationItem,
  type ModerationFilters,
  type QueueStats,
  type ModerationStatus,
  type Priority,
  type ContentType,
  type Severity,
  type SLAStatus,
  CONTENT_TYPE_CONFIG,
  SEVERITY_CONFIG,
  PRIORITY_WEIGHT,
} from './ModerationTypes';
import { adminStyles, COLORS, FONTS } from '../admin/AdminStyles';

// =============================================================================
// PROPS
// =============================================================================

export interface ModerationDashboardProps {
  /** Items in the moderation queue */
  items: ModerationItem[];
  /** Summary statistics */
  stats: QueueStats;
  /** Available tenants for filtering */
  tenants: { id: string; name: string }[];
  /** Current moderator's ID (for "assigned to me" filter) */
  currentModeratorId: string;
  /** Callback when an item is approved */
  onApprove: (itemId: string) => void;
  /** Callback when an item is rejected (with reason) */
  onReject: (itemId: string, reason: string) => void;
  /** Callback when an item is escalated */
  onEscalate: (itemId: string) => void;
  /** Callback for bulk approve */
  onBulkApprove: (itemIds: string[]) => void;
  /** Callback for bulk reject (with reason) */
  onBulkReject: (itemIds: string[], reason: string) => void;
  /** Loading state */
  loading?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Compute SLA status from deadline */
function getSLAStatus(deadline: string): SLAStatus {
  const now = Date.now();
  const deadlineMs = new Date(deadline).getTime();
  const remaining = deadlineMs - now;
  if (remaining <= 0) return 'breached';
  // At-risk if less than 25% of a 1-hour SLA remains (15 min)
  if (remaining < 15 * 60 * 1000) return 'at-risk';
  return 'on-track';
}

/** Format remaining time as HH:MM:SS or "BREACHED" */
function formatSLACountdown(deadline: string): string {
  const now = Date.now();
  const deadlineMs = new Date(deadline).getTime();
  const remaining = deadlineMs - now;
  if (remaining <= 0) return 'BREACHED';
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/** Truncate text to maxLen characters with ellipsis */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

/** Get severity badge style */
function getSeverityBadgeStyle(severity: Severity): React.CSSProperties {
  const colorMap: Record<Severity, { bg: string; fg: string }> = {
    low: { bg: COLORS.infoBg, fg: COLORS.info },
    medium: { bg: COLORS.warningBg, fg: COLORS.warning },
    high: { bg: COLORS.errorBg, fg: COLORS.error },
    critical: { bg: 'rgba(248, 113, 113, 0.3)', fg: '#ff4444' },
  };
  const c = colorMap[severity];
  return {
    ...adminStyles.badge,
    backgroundColor: c.bg,
    color: c.fg,
  };
}

/** Get priority badge style */
function getPriorityBadgeStyle(priority: Priority): React.CSSProperties {
  if (priority === 'urgent') {
    return {
      ...adminStyles.badge,
      backgroundColor: 'rgba(248, 113, 113, 0.3)',
      color: '#ff4444',
    };
  }
  if (priority === 'high') {
    return { ...adminStyles.badge, ...adminStyles.badgeError };
  }
  if (priority === 'normal') {
    return { ...adminStyles.badge, ...adminStyles.badgeWarning };
  }
  return { ...adminStyles.badge, ...adminStyles.badgeInfo };
}

// =============================================================================
// REJECT REASON MODAL
// =============================================================================

const RejectReasonModal: React.FC<{
  isOpen: boolean;
  isBulk: boolean;
  selectedCount: number;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}> = ({ isOpen, isBulk, selectedCount, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
    if (!isOpen) setReason('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Reject reason"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          backgroundColor: COLORS.bgPanel,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: 20,
          minWidth: 400,
          maxWidth: 500,
          fontFamily: FONTS.mono,
        }}
      >
        <h3
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: COLORS.textPrimary,
            margin: '0 0 12px 0',
          }}
        >
          {isBulk ? `Reject ${selectedCount} items` : 'Reject Content'}
        </h3>
        <label
          style={{
            fontSize: 10,
            color: COLORS.textSecondary,
            display: 'block',
            marginBottom: 6,
          }}
        >
          Reason for rejection:
        </label>
        <textarea
          ref={textareaRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe why this content is being rejected..."
          style={{
            ...adminStyles.input,
            minHeight: 80,
            resize: 'vertical',
          }}
          aria-label="Rejection reason"
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 12,
          }}
        >
          <button
            style={adminStyles.button}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            style={{ ...adminStyles.button, ...adminStyles.buttonDanger }}
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SLA TIMER COMPONENT
// =============================================================================

const SLATimer: React.FC<{ deadline: string }> = ({ deadline }) => {
  const [display, setDisplay] = useState(formatSLACountdown(deadline));
  const [slaStatus, setSlaStatus] = useState<SLAStatus>(getSLAStatus(deadline));

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay(formatSLACountdown(deadline));
      setSlaStatus(getSLAStatus(deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const colorMap: Record<SLAStatus, string> = {
    'on-track': COLORS.success,
    'at-risk': COLORS.warning,
    'breached': COLORS.error,
  };

  return (
    <span
      style={{
        fontVariantNumeric: 'tabular-nums',
        fontWeight: slaStatus === 'breached' ? 800 : 600,
        color: colorMap[slaStatus],
        fontSize: 9,
      }}
      title={`SLA Deadline: ${new Date(deadline).toLocaleString()}`}
    >
      {display}
    </span>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ModerationDashboard = React.memo<ModerationDashboardProps>(
  function ModerationDashboard(props) {
    const {
      items,
      stats,
      tenants,
      currentModeratorId,
      onApprove,
      onReject,
      onEscalate,
      onBulkApprove,
      onBulkReject,
      loading = false,
    } = props;

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    const [filters, setFilters] = useState<ModerationFilters>({});
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [rejectModal, setRejectModal] = useState<{
      isOpen: boolean;
      isBulk: boolean;
      targetId?: string;
    }>({ isOpen: false, isBulk: false });

    // -----------------------------------------------------------------------
    // Filtered + sorted items
    // -----------------------------------------------------------------------
    const filteredItems = useMemo(() => {
      let result = [...items];

      if (filters.status) {
        result = result.filter((i) => i.status === filters.status);
      }
      if (filters.priority) {
        result = result.filter((i) => i.priority === filters.priority);
      }
      if (filters.contentType) {
        result = result.filter((i) => i.contentType === filters.contentType);
      }
      if (filters.severity) {
        result = result.filter((i) => i.severity === filters.severity);
      }
      if (filters.tenantId) {
        result = result.filter((i) => i.tenantId === filters.tenantId);
      }
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        result = result.filter(
          (i) =>
            i.content.toLowerCase().includes(q) ||
            i.submittedBy.toLowerCase().includes(q)
        );
      }

      // Sort: critical/urgent first, then by SLA deadline (soonest first)
      result.sort((a, b) => {
        const priorityDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime();
      });

      return result;
    }, [items, filters]);

    // -----------------------------------------------------------------------
    // Selection handlers
    // -----------------------------------------------------------------------
    const toggleSelect = useCallback((id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }, []);

    const toggleSelectAll = useCallback(() => {
      setSelectedIds((prev) => {
        if (prev.size === filteredItems.length) return new Set();
        return new Set(filteredItems.map((i) => i.id));
      });
    }, [filteredItems]);

    // -----------------------------------------------------------------------
    // Action handlers
    // -----------------------------------------------------------------------
    const handleRejectConfirm = useCallback(
      (reason: string) => {
        if (rejectModal.isBulk) {
          onBulkReject(Array.from(selectedIds), reason);
          setSelectedIds(new Set());
        } else if (rejectModal.targetId) {
          onReject(rejectModal.targetId, reason);
        }
        setRejectModal({ isOpen: false, isBulk: false });
      },
      [rejectModal, selectedIds, onBulkReject, onReject]
    );

    const handleBulkApprove = useCallback(() => {
      onBulkApprove(Array.from(selectedIds));
      setSelectedIds(new Set());
    }, [selectedIds, onBulkApprove]);

    // -----------------------------------------------------------------------
    // Filter updater
    // -----------------------------------------------------------------------
    const updateFilter = useCallback(
      <K extends keyof ModerationFilters>(key: K, value: ModerationFilters[K] | undefined) => {
        setFilters((prev) => {
          const next = { ...prev };
          if (value === undefined || value === '') {
            delete next[key];
          } else {
            next[key] = value;
          }
          return next;
        });
      },
      []
    );

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
      <div style={adminStyles.panelRoot} role="region" aria-label="Moderation dashboard">
        {/* ================================================================= */}
        {/* HEADER                                                            */}
        {/* ================================================================= */}
        <div style={adminStyles.panelHeader}>
          <span style={adminStyles.panelTitle}>Moderation Queue</span>
          {loading && (
            <span style={{ fontSize: 9, color: COLORS.textMuted }}>Loading...</span>
          )}
        </div>

        {/* ================================================================= */}
        {/* STATS BAR                                                         */}
        {/* ================================================================= */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            padding: '8px 16px',
          }}
        >
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Total Pending</span>
            <span style={adminStyles.statValue}>{stats.totalPending}</span>
          </div>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Assigned to Me</span>
            <span style={adminStyles.statValue}>{stats.assignedToMe}</span>
          </div>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>SLA Compliance</span>
            <span
              style={{
                ...adminStyles.statValue,
                color: stats.slaCompliancePercent >= 90 ? COLORS.success : stats.slaCompliancePercent >= 70 ? COLORS.warning : COLORS.error,
              }}
            >
              {stats.slaCompliancePercent.toFixed(1)}%
            </span>
          </div>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Resolved Today</span>
            <span style={adminStyles.statValue}>{stats.resolvedToday}</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* FILTERS TOOLBAR                                                   */}
        {/* ================================================================= */}
        <div style={adminStyles.toolbar}>
          {/* Status filter */}
          <select
            style={adminStyles.select}
            value={filters.status || ''}
            onChange={(e) => updateFilter('status', (e.target.value as ModerationStatus) || undefined)}
            aria-label="Filter by status"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Priority filter */}
          <select
            style={adminStyles.select}
            value={filters.priority || ''}
            onChange={(e) => updateFilter('priority', (e.target.value as Priority) || undefined)}
            aria-label="Filter by priority"
          >
            <option value="">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          {/* Content type filter */}
          <select
            style={adminStyles.select}
            value={filters.contentType || ''}
            onChange={(e) => updateFilter('contentType', (e.target.value as ContentType) || undefined)}
            aria-label="Filter by content type"
          >
            <option value="">All Types</option>
            <option value="chat">Chat</option>
            <option value="listing">Listing</option>
            <option value="description">Description</option>
            <option value="profile">Profile</option>
          </select>

          {/* Severity filter */}
          <select
            style={adminStyles.select}
            value={filters.severity || ''}
            onChange={(e) => updateFilter('severity', (e.target.value as Severity) || undefined)}
            aria-label="Filter by severity"
          >
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Tenant filter */}
          <select
            style={adminStyles.select}
            value={filters.tenantId || ''}
            onChange={(e) => updateFilter('tenantId', e.target.value || undefined)}
            aria-label="Filter by tenant"
          >
            <option value="">All Tenants</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Search */}
          <div style={adminStyles.searchContainer}>
            <input
              type="text"
              placeholder="Search content..."
              style={adminStyles.input}
              value={filters.searchQuery || ''}
              onChange={(e) => updateFilter('searchQuery', e.target.value || undefined)}
              aria-label="Search moderation queue"
            />
          </div>
        </div>

        {/* ================================================================= */}
        {/* BULK ACTIONS BAR                                                  */}
        {/* ================================================================= */}
        {selectedIds.size > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              backgroundColor: COLORS.accentBg,
              borderBottom: `1px solid ${COLORS.borderLight}`,
            }}
          >
            <span style={{ fontSize: 10, color: COLORS.accent, fontWeight: 600 }}>
              {selectedIds.size} selected
            </span>
            <button
              style={{ ...adminStyles.button, ...adminStyles.buttonSuccess }}
              onClick={handleBulkApprove}
              aria-label={`Bulk approve ${selectedIds.size} items`}
            >
              Approve All
            </button>
            <button
              style={{ ...adminStyles.button, ...adminStyles.buttonDanger }}
              onClick={() => setRejectModal({ isOpen: true, isBulk: true })}
              aria-label={`Bulk reject ${selectedIds.size} items`}
            >
              Reject All
            </button>
            <button
              style={adminStyles.button}
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* QUEUE TABLE                                                       */}
        {/* ================================================================= */}
        <div style={adminStyles.panelBody}>
          <table style={adminStyles.table} role="table" aria-label="Moderation queue">
            <thead>
              <tr>
                <th style={{ ...adminStyles.tableHeader, width: 32 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleSelectAll}
                    aria-label="Select all items"
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={adminStyles.tableHeader}>Content</th>
                <th style={{ ...adminStyles.tableHeader, width: 50 }}>Type</th>
                <th style={{ ...adminStyles.tableHeader, width: 70 }}>Severity</th>
                <th style={{ ...adminStyles.tableHeader, width: 70 }}>Priority</th>
                <th style={{ ...adminStyles.tableHeader, width: 80 }}>SLA Timer</th>
                <th style={{ ...adminStyles.tableHeader, width: 90 }}>Moderator</th>
                <th style={{ ...adminStyles.tableHeader, width: 80 }}>Submitted</th>
                <th style={{ ...adminStyles.tableHeader, width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      ...adminStyles.tableCell,
                      textAlign: 'center',
                      padding: '24px 12px',
                      color: COLORS.textMuted,
                    }}
                  >
                    {loading ? 'Loading queue...' : 'No items match current filters'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const typeConfig = CONTENT_TYPE_CONFIG[item.contentType];

                  return (
                    <tr
                      key={item.id}
                      style={{
                        ...adminStyles.tableRow,
                        backgroundColor: isSelected ? COLORS.accentBg : undefined,
                      }}
                    >
                      {/* Checkbox */}
                      <td style={adminStyles.tableCell}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          aria-label={`Select item ${item.id}`}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Content preview */}
                      <td style={{ ...adminStyles.tableCell, maxWidth: 300 }}>
                        <div
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: 10,
                          }}
                          title={item.content}
                        >
                          {truncate(item.content, 200)}
                        </div>
                        <div style={{ fontSize: 8, color: COLORS.textDim, marginTop: 1 }}>
                          by {item.submittedBy} in {item.tenantName}
                        </div>
                      </td>

                      {/* Content type icon */}
                      <td style={adminStyles.tableCell}>
                        <span
                          style={{
                            ...adminStyles.tag,
                            backgroundColor: COLORS.bgCard,
                            color: COLORS.textSecondary,
                          }}
                          title={typeConfig.label}
                        >
                          {typeConfig.icon}
                        </span>
                      </td>

                      {/* Severity */}
                      <td style={adminStyles.tableCell}>
                        <span style={getSeverityBadgeStyle(item.severity)}>
                          {item.severity.toUpperCase()}
                        </span>
                      </td>

                      {/* Priority */}
                      <td style={adminStyles.tableCell}>
                        <span style={getPriorityBadgeStyle(item.priority)}>
                          {item.priority.toUpperCase()}
                        </span>
                      </td>

                      {/* SLA Timer */}
                      <td style={adminStyles.tableCell}>
                        {item.status !== 'resolved' ? (
                          <SLATimer deadline={item.slaDeadline} />
                        ) : (
                          <span style={{ fontSize: 9, color: COLORS.success }}>
                            Resolved
                          </span>
                        )}
                      </td>

                      {/* Assigned moderator */}
                      <td style={adminStyles.tableCell}>
                        <span style={{ fontSize: 9, color: COLORS.textSecondary }}>
                          {item.assignedModeratorName || (
                            <span style={{ color: COLORS.textDim }}>Unassigned</span>
                          )}
                        </span>
                      </td>

                      {/* Submitted time */}
                      <td style={adminStyles.tableCell}>
                        <span
                          style={{
                            fontSize: 9,
                            color: COLORS.textMuted,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {new Date(item.submittedAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={adminStyles.tableCell}>
                        {item.status !== 'resolved' ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              style={{ ...adminStyles.button, ...adminStyles.buttonSuccess }}
                              onClick={() => onApprove(item.id)}
                              aria-label={`Approve item ${item.id}`}
                            >
                              Approve
                            </button>
                            <button
                              style={{ ...adminStyles.button, ...adminStyles.buttonDanger }}
                              onClick={() =>
                                setRejectModal({ isOpen: true, isBulk: false, targetId: item.id })
                              }
                              aria-label={`Reject item ${item.id}`}
                            >
                              Reject
                            </button>
                            <button
                              style={{
                                ...adminStyles.button,
                                backgroundColor: COLORS.warningBg,
                                color: COLORS.warning,
                                borderColor: 'rgba(251, 191, 36, 0.3)',
                              }}
                              onClick={() => onEscalate(item.id)}
                              aria-label={`Escalate item ${item.id}`}
                            >
                              Escalate
                            </button>
                          </div>
                        ) : (
                          <span
                            style={{
                              ...adminStyles.badge,
                              ...(item.action === 'allow'
                                ? adminStyles.badgeSuccess
                                : item.action === 'ban'
                                ? adminStyles.badgeError
                                : adminStyles.badgeWarning),
                            }}
                          >
                            {item.action?.toUpperCase()}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ================================================================= */}
        {/* REJECT REASON MODAL                                               */}
        {/* ================================================================= */}
        <RejectReasonModal
          isOpen={rejectModal.isOpen}
          isBulk={rejectModal.isBulk}
          selectedCount={selectedIds.size}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectModal({ isOpen: false, isBulk: false })}
        />
      </div>
    );
  }
);

export default ModerationDashboard;
