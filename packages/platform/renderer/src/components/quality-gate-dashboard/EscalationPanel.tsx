/**
 * EscalationPanel Component
 *
 * Displays the human escalation interface for Tier 3 approvals.
 * Shows pending escalation requests with risk assessment, proposed
 * actions, and approve/reject/defer controls.
 *
 * Accessibility:
 *   - role="list" for the escalation queue
 *   - All interactive elements keyboard accessible
 *   - Minimum 4.5:1 contrast ratios
 *   - Deadline urgency indicated visually and via aria-label
 *
 * @module quality-gate-dashboard/EscalationPanel
 */

import React, { useMemo, useCallback } from 'react';
import type {
  EscalationRequest,
  QualityGateTheme,
  QualityGateDashboardActions,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface EscalationPanelProps {
  /** Pending escalation requests */
  escalations: EscalationRequest[];
  /** Dashboard actions */
  actions: QualityGateDashboardActions;
  /** Theme */
  theme: QualityGateTheme;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const EscalationPanel: React.FC<EscalationPanelProps> = ({
  escalations,
  actions,
  theme,
  className,
  style,
}) => {
  // Sort by deadline (urgent first), then by creation time
  const sortedEscalations = useMemo(() => {
    return [...escalations].sort((a, b) => {
      // Items with deadlines come first
      if (a.deadline > 0 && b.deadline === 0) return -1;
      if (a.deadline === 0 && b.deadline > 0) return 1;
      // Among items with deadlines, sort by soonest deadline
      if (a.deadline > 0 && b.deadline > 0) return a.deadline - b.deadline;
      // Among items without deadlines, sort by creation time
      return a.createdAt - b.createdAt;
    });
  }, [escalations]);

  if (escalations.length === 0) {
    return (
      <div
        className={className}
        style={{
          padding: '0.75rem 1rem',
          borderBottom: `1px solid ${theme.borderColor}`,
          ...style,
        }}
      >
        <SectionHeader theme={theme} count={0} />
        <div
          style={{
            padding: '1rem',
            textAlign: 'center',
            color: theme.textMuted,
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
          }}
        >
          No pending escalations. All workflows within confidence thresholds.
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        ...style,
      }}
      role="region"
      aria-label={`Human escalation queue: ${escalations.length} pending`}
    >
      <SectionHeader theme={theme} count={escalations.length} />

      <div
        role="list"
        aria-label="Pending escalation requests"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxHeight: '320px',
          overflowY: 'auto',
        }}
      >
        {sortedEscalations.map((escalation) => (
          <EscalationCard
            key={escalation.id}
            escalation={escalation}
            actions={actions}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SectionHeaderProps {
  theme: QualityGateTheme;
  count: number;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ theme, count }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '0.5rem',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <span
        style={{
          fontSize: `calc(0.75rem * ${theme.fontScale})`,
          fontWeight: 600,
          color: theme.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Escalations
      </span>
      {count > 0 && (
        <span
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            fontWeight: 700,
            color: '#fff',
            backgroundColor: theme.tier3Color,
            borderRadius: '999px',
            padding: '0.1rem 0.4rem',
            minWidth: '1.2rem',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
          role="status"
          aria-label={`${count} pending escalation${count !== 1 ? 's' : ''}`}
        >
          {count}
        </span>
      )}
    </div>
  </div>
);

// -- Escalation Card --

interface EscalationCardProps {
  escalation: EscalationRequest;
  actions: QualityGateDashboardActions;
  theme: QualityGateTheme;
}

const EscalationCard: React.FC<EscalationCardProps> = ({
  escalation,
  actions,
  theme,
}) => {
  const now = Date.now();
  const hasDeadline = escalation.deadline > 0;
  const isUrgent = hasDeadline && (escalation.deadline - now) < 60_000; // < 1 minute
  const isExpired = hasDeadline && escalation.deadline < now;

  const timeRemaining = useMemo(() => {
    if (!hasDeadline) return null;
    const diff = escalation.deadline - now;
    if (diff <= 0) return 'Expired';
    if (diff < 60_000) return `${Math.ceil(diff / 1000)}s`;
    if (diff < 3_600_000) return `${Math.ceil(diff / 60_000)}m`;
    return `${Math.ceil(diff / 3_600_000)}h`;
  }, [escalation.deadline, hasDeadline, now]);

  const handleResolve = useCallback(
    (resolution: 'approved' | 'rejected' | 'deferred') => {
      actions.resolveEscalation(escalation.id, resolution, 'human-operator');
    },
    [actions, escalation.id],
  );

  const urgencyColor = isExpired
    ? theme.errorColor
    : isUrgent
      ? theme.warningColor
      : theme.textMuted;

  return (
    <div
      role="listitem"
      style={{
        padding: '0.6rem 0.75rem',
        borderRadius: theme.borderRadius,
        backgroundColor: theme.cardBackground,
        border: `1px solid ${isUrgent || isExpired ? theme.errorColor : theme.borderColor}`,
        transition: 'border-color 0.2s ease',
      }}
      aria-label={`Escalation from ${escalation.agentId}: ${escalation.requestDescription}`}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '0.4rem',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.15rem' }}>
            <span
              style={{
                fontSize: `calc(0.75rem * ${theme.fontScale})`,
                fontWeight: 600,
                color: theme.textPrimary,
              }}
            >
              {escalation.requestDescription}
            </span>
          </div>
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              color: theme.textMuted,
            }}
          >
            Agent: {escalation.agentId} | Confidence: {(escalation.confidenceScore * 100).toFixed(0)}%
          </span>
        </div>

        {/* Deadline badge */}
        {hasDeadline && (
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: urgencyColor,
              border: `1px solid ${urgencyColor}`,
              borderRadius: '4px',
              padding: '0.1rem 0.35rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            role="timer"
            aria-label={isExpired ? 'Deadline expired' : `Time remaining: ${timeRemaining}`}
          >
            {timeRemaining}
          </span>
        )}
      </div>

      {/* Risk summary */}
      <div
        style={{
          fontSize: `calc(0.65rem * ${theme.fontScale})`,
          color: theme.textSecondary,
          padding: '0.3rem 0.5rem',
          backgroundColor: 'rgba(239, 68, 68, 0.06)',
          borderRadius: '4px',
          marginBottom: '0.4rem',
          lineHeight: 1.4,
        }}
      >
        <span style={{ fontWeight: 600, color: theme.tier3Color }}>Risk: </span>
        {escalation.riskSummary}
      </div>

      {/* Proposed action */}
      <div
        style={{
          fontSize: `calc(0.65rem * ${theme.fontScale})`,
          color: theme.textSecondary,
          marginBottom: '0.4rem',
          lineHeight: 1.4,
        }}
      >
        <span style={{ fontWeight: 600 }}>Proposed: </span>
        {escalation.proposedAction}
        {escalation.alternativeAction && (
          <span style={{ display: 'block', marginTop: '0.15rem' }}>
            <span style={{ fontWeight: 600 }}>Alternative: </span>
            {escalation.alternativeAction}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.3rem' }}>
        <ActionButton
          label="Approve"
          color={theme.successColor}
          onClick={() => handleResolve('approved')}
          theme={theme}
          ariaLabel={`Approve escalation: ${escalation.requestDescription}`}
        />
        <ActionButton
          label="Reject"
          color={theme.errorColor}
          onClick={() => handleResolve('rejected')}
          theme={theme}
          ariaLabel={`Reject escalation: ${escalation.requestDescription}`}
        />
        <ActionButton
          label="Defer"
          color={theme.textMuted}
          onClick={() => handleResolve('deferred')}
          theme={theme}
          ariaLabel={`Defer escalation: ${escalation.requestDescription}`}
        />
      </div>
    </div>
  );
};

// -- Action Button --

interface ActionButtonProps {
  label: string;
  color: string;
  onClick: () => void;
  theme: QualityGateTheme;
  ariaLabel: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  color,
  onClick,
  theme,
  ariaLabel,
}) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      fontSize: `calc(0.6rem * ${theme.fontScale})`,
      fontWeight: 600,
      fontFamily: theme.fontFamily,
      color,
      backgroundColor: 'transparent',
      border: `1px solid ${color}`,
      borderRadius: '4px',
      padding: '0.2rem 0.5rem',
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
    }}
    aria-label={ariaLabel}
    onMouseEnter={(e) => {
      (e.target as HTMLButtonElement).style.backgroundColor = `${color}20`;
    }}
    onMouseLeave={(e) => {
      (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
    }}
  >
    {label}
  </button>
);

export default EscalationPanel;
