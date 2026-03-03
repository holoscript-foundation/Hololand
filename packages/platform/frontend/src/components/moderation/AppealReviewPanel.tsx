/**
 * AppealReviewPanel Component
 *
 * Appeal queue view for reviewing user appeals with:
 *   - Appeal reason displayed alongside original content
 *   - Original moderation decision details
 *   - Approve/reject appeal buttons with reason field
 *   - "Different reviewer" badge ensuring fresh review
 *   - Appeal status indicators
 *
 * Follows the PostProcessingControls inline-style + ARIA pattern.
 *
 * @module moderation/AppealReviewPanel
 */

import React, { useState, useCallback } from 'react';
import {
  type Appeal,
  type AppealStatus,
  CONTENT_TYPE_CONFIG,
  SEVERITY_CONFIG,
} from './ModerationTypes';
import { adminStyles, COLORS, FONTS } from '../admin/AdminStyles';

// =============================================================================
// PROPS
// =============================================================================

export interface AppealReviewPanelProps {
  /** List of appeals to review */
  appeals: Appeal[];
  /** Current reviewer's moderator ID */
  currentReviewerId: string;
  /** Current reviewer's name */
  currentReviewerName: string;
  /** Approve an appeal (overturn original decision) */
  onApproveAppeal: (appealId: string, reason: string) => void;
  /** Reject an appeal (uphold original decision) */
  onRejectAppeal: (appealId: string, reason: string) => void;
  /** Loading state */
  loading?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Get appeal status badge style */
function getAppealStatusStyle(status: AppealStatus): React.CSSProperties {
  const map: Record<AppealStatus, React.CSSProperties> = {
    pending: { ...adminStyles.badge, ...adminStyles.badgeWarning },
    approved: { ...adminStyles.badge, ...adminStyles.badgeSuccess },
    rejected: { ...adminStyles.badge, ...adminStyles.badgeError },
  };
  return map[status];
}

// =============================================================================
// APPEAL CARD SUB-COMPONENT
// =============================================================================

const AppealCard: React.FC<{
  appeal: Appeal;
  currentReviewerId: string;
  currentReviewerName: string;
  onApprove: (appealId: string, reason: string) => void;
  onReject: (appealId: string, reason: string) => void;
}> = ({ appeal, currentReviewerId, currentReviewerName, onApprove, onReject }) => {
  const [reviewReason, setReviewReason] = useState('');
  const [expanded, setExpanded] = useState(false);

  const isDifferentReviewer =
    appeal.originalItem.resolvedBy !== currentReviewerId;

  const isPending = appeal.status === 'pending';
  const contentTypeConfig = CONTENT_TYPE_CONFIG[appeal.originalItem.contentType];

  const handleApprove = useCallback(() => {
    if (reviewReason.trim()) {
      onApprove(appeal.id, reviewReason.trim());
      setReviewReason('');
    }
  }, [appeal.id, reviewReason, onApprove]);

  const handleReject = useCallback(() => {
    if (reviewReason.trim()) {
      onReject(appeal.id, reviewReason.trim());
      setReviewReason('');
    }
  }, [appeal.id, reviewReason, onReject]);

  return (
    <div
      style={{
        ...adminStyles.card,
        marginBottom: 8,
        position: 'relative',
      }}
      role="article"
      aria-label={`Appeal ${appeal.id}`}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={getAppealStatusStyle(appeal.status)}>
            {appeal.status.toUpperCase()}
          </span>
          <span
            style={{
              ...adminStyles.tag,
              backgroundColor: COLORS.bgCard,
              color: COLORS.textSecondary,
            }}
            title={contentTypeConfig.label}
          >
            {contentTypeConfig.icon}
          </span>
          {isDifferentReviewer && (
            <span
              style={{
                ...adminStyles.badge,
                ...adminStyles.badgeAccent,
                fontSize: 8,
              }}
              title="This appeal is being reviewed by a different moderator than the one who made the original decision"
            >
              DIFFERENT REVIEWER
            </span>
          )}
          {!isDifferentReviewer && isPending && (
            <span
              style={{
                ...adminStyles.badge,
                ...adminStyles.badgeWarning,
                fontSize: 8,
              }}
              title="Warning: You made the original decision on this item"
            >
              SAME REVIEWER - REASSIGN
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 8,
            color: COLORS.textDim,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          Submitted {new Date(appeal.submittedAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* Appeal reason */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: COLORS.textMuted,
            marginBottom: 4,
          }}
        >
          Appeal Reason
        </div>
        <div
          style={{
            fontSize: 10,
            color: COLORS.textPrimary,
            lineHeight: 1.5,
            padding: '6px 10px',
            backgroundColor: COLORS.bgInput,
            borderRadius: 4,
            border: `1px solid ${COLORS.borderLight}`,
          }}
        >
          {appeal.appealReason}
        </div>
      </div>

      {/* Original content (collapsible) */}
      <div style={{ marginBottom: 10 }}>
        <button
          style={{
            ...adminStyles.button,
            fontSize: 9,
            padding: '3px 8px',
            marginBottom: 6,
          }}
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={`original-content-${appeal.id}`}
        >
          {expanded ? 'Hide' : 'Show'} Original Content
        </button>

        {expanded && (
          <div
            id={`original-content-${appeal.id}`}
            style={{
              padding: '8px 10px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 4,
              border: `1px solid ${COLORS.borderLight}`,
            }}
          >
            {/* Original content text */}
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: COLORS.textMuted,
                marginBottom: 4,
              }}
            >
              Original Content
            </div>
            <div
              style={{
                fontSize: 10,
                color: COLORS.textPrimary,
                lineHeight: 1.5,
                marginBottom: 10,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {appeal.originalItem.content}
            </div>

            {/* Original decision */}
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: COLORS.textMuted,
                marginBottom: 4,
              }}
            >
              Original Decision
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                fontSize: 10,
              }}
            >
              <div>
                <span style={{ color: COLORS.textMuted }}>Action: </span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      appeal.originalDecision.action === 'ban'
                        ? COLORS.error
                        : appeal.originalDecision.action === 'remove'
                        ? COLORS.error
                        : appeal.originalDecision.action === 'warn'
                        ? COLORS.warning
                        : COLORS.success,
                  }}
                >
                  {appeal.originalDecision.action.toUpperCase()}
                </span>
              </div>
              <div>
                <span style={{ color: COLORS.textMuted }}>By: </span>
                <span style={{ color: COLORS.textSecondary }}>
                  {appeal.originalDecision.moderatorName}
                </span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: COLORS.textMuted }}>Reason: </span>
                <span style={{ color: COLORS.textSecondary }}>
                  {appeal.originalDecision.reason}
                </span>
              </div>
              <div>
                <span style={{ color: COLORS.textMuted }}>Date: </span>
                <span style={{ color: COLORS.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                  {new Date(appeal.originalDecision.decidedAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Triggered rules */}
              {appeal.originalItem.triggeredRules.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: COLORS.textMuted }}>Triggered Rules: </span>
                  <span style={{ display: 'inline-flex', gap: 3, flexWrap: 'wrap' }}>
                    {appeal.originalItem.triggeredRules.map((rule) => (
                      <span
                        key={rule}
                        style={{
                          ...adminStyles.tag,
                          backgroundColor: COLORS.warningBg,
                          color: COLORS.warning,
                        }}
                      >
                        {rule}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Resolution (if already decided) */}
      {appeal.resolution && (
        <div
          style={{
            padding: '6px 10px',
            backgroundColor:
              appeal.resolution.decision === 'overturned' ? COLORS.successBg : COLORS.errorBg,
            borderRadius: 4,
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, marginBottom: 2 }}>
            Decision: {appeal.resolution.decision.toUpperCase()}
          </div>
          <div style={{ fontSize: 10, color: COLORS.textSecondary }}>
            {appeal.resolution.reason}
          </div>
          <div style={{ fontSize: 8, color: COLORS.textMuted, marginTop: 2 }}>
            By {appeal.resolution.decidedBy} on{' '}
            {new Date(appeal.resolution.decidedAt).toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Action area (only for pending appeals with different reviewer) */}
      {isPending && isDifferentReviewer && (
        <div
          style={{
            borderTop: `1px solid ${COLORS.borderLight}`,
            paddingTop: 8,
          }}
        >
          <label
            style={{
              fontSize: 9,
              color: COLORS.textMuted,
              display: 'block',
              marginBottom: 4,
            }}
          >
            Review Decision Reason:
          </label>
          <textarea
            value={reviewReason}
            onChange={(e) => setReviewReason(e.target.value)}
            placeholder="Provide reasoning for your appeal decision..."
            style={{
              ...adminStyles.input,
              minHeight: 50,
              resize: 'vertical',
              marginBottom: 8,
            }}
            aria-label="Appeal review reason"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{ ...adminStyles.button, ...adminStyles.buttonSuccess }}
              onClick={handleApprove}
              disabled={!reviewReason.trim()}
              aria-label="Approve appeal (overturn original decision)"
            >
              Approve Appeal (Overturn)
            </button>
            <button
              style={{ ...adminStyles.button, ...adminStyles.buttonDanger }}
              onClick={handleReject}
              disabled={!reviewReason.trim()}
              aria-label="Reject appeal (uphold original decision)"
            >
              Reject Appeal (Uphold)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AppealReviewPanel = React.memo<AppealReviewPanelProps>(
  function AppealReviewPanel(props) {
    const {
      appeals,
      currentReviewerId,
      currentReviewerName,
      onApproveAppeal,
      onRejectAppeal,
      loading = false,
    } = props;

    const [statusFilter, setStatusFilter] = useState<AppealStatus | ''>('');

    const filteredAppeals = statusFilter
      ? appeals.filter((a) => a.status === statusFilter)
      : appeals;

    // Stats
    const pendingCount = appeals.filter((a) => a.status === 'pending').length;
    const approvedCount = appeals.filter((a) => a.status === 'approved').length;
    const rejectedCount = appeals.filter((a) => a.status === 'rejected').length;

    return (
      <div style={adminStyles.panelRoot} role="region" aria-label="Appeal review panel">
        {/* Header */}
        <div style={adminStyles.panelHeader}>
          <span style={adminStyles.panelTitle}>Appeal Queue</span>
          {loading && (
            <span style={{ fontSize: 9, color: COLORS.textMuted }}>Loading...</span>
          )}
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            padding: '8px 16px',
          }}
        >
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Pending</span>
            <span style={{ ...adminStyles.statValue, color: COLORS.warning }}>
              {pendingCount}
            </span>
          </div>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Approved</span>
            <span style={{ ...adminStyles.statValue, color: COLORS.success }}>
              {approvedCount}
            </span>
          </div>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Rejected</span>
            <span style={{ ...adminStyles.statValue, color: COLORS.error }}>
              {rejectedCount}
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div style={adminStyles.toolbar}>
          <select
            style={adminStyles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value as AppealStatus | ''))}
            aria-label="Filter appeals by status"
          >
            <option value="">All Appeals ({appeals.length})</option>
            <option value="pending">Pending ({pendingCount})</option>
            <option value="approved">Approved ({approvedCount})</option>
            <option value="rejected">Rejected ({rejectedCount})</option>
          </select>
        </div>

        {/* Appeal list */}
        <div style={{ ...adminStyles.panelBody, padding: '8px 16px' }}>
          {filteredAppeals.length === 0 ? (
            <div style={adminStyles.emptyState}>
              {loading ? 'Loading appeals...' : 'No appeals match current filters'}
            </div>
          ) : (
            filteredAppeals.map((appeal) => (
              <AppealCard
                key={appeal.id}
                appeal={appeal}
                currentReviewerId={currentReviewerId}
                currentReviewerName={currentReviewerName}
                onApprove={onApproveAppeal}
                onReject={onRejectAppeal}
              />
            ))
          )}
        </div>
      </div>
    );
  }
);

export default AppealReviewPanel;
