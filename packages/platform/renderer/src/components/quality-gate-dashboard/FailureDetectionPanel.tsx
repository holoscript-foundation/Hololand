/**
 * FailureDetectionPanel Component
 *
 * Displays real-time failure detection status across agent workflows.
 * Shows failed workflows grouped by failure category with retry options
 * and diagnostic details.
 *
 * @module quality-gate-dashboard/FailureDetectionPanel
 */

import React, { useMemo } from 'react';
import type {
  AgentWorkflow,
  FailureCategory,
  QualityGateTheme,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface FailureDetectionPanelProps {
  /** All workflows (filtered to failed internally) */
  workflows: AgentWorkflow[];
  /** Theme */
  theme: QualityGateTheme;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
}

// =============================================================================
// FAILURE CATEGORY CONFIG
// =============================================================================

interface FailureCategoryMeta {
  label: string;
  icon: string;
  color: string;
}

const FAILURE_CATEGORY_CONFIG: Record<FailureCategory, FailureCategoryMeta> = {
  timeout: { label: 'Timeout', icon: '\u23F1', color: '#f97316' },
  assertion_failure: { label: 'Assertion', icon: '\u2717', color: '#ef4444' },
  resource_exhaustion: { label: 'Resources', icon: '\u26A0', color: '#eab308' },
  permission_denied: { label: 'Permission', icon: '\uD83D\uDEAB', color: '#dc2626' },
  dependency_failure: { label: 'Dependency', icon: '\u26D4', color: '#f97316' },
  validation_error: { label: 'Validation', icon: '\u2718', color: '#ef4444' },
  unknown: { label: 'Unknown', icon: '?', color: '#6b7280' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const FailureDetectionPanel: React.FC<FailureDetectionPanelProps> = ({
  workflows,
  theme,
  className,
  style,
}) => {
  const failedWorkflows = useMemo(
    () => workflows.filter((w) => w.status === 'failed'),
    [workflows],
  );

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<FailureCategory, number>> = {};
    for (const w of failedWorkflows) {
      const cat = w.failure?.category ?? 'unknown';
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [failedWorkflows]);

  return (
    <div
      className={className}
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        ...style,
      }}
      role="region"
      aria-label={`Failure detection: ${failedWorkflows.length} failures`}
    >
      {/* Header */}
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
            Failure Detection
          </span>
          {failedWorkflows.length > 0 && (
            <span
              style={{
                fontSize: `calc(0.6rem * ${theme.fontScale})`,
                fontWeight: 700,
                color: '#fff',
                backgroundColor: theme.errorColor,
                borderRadius: '999px',
                padding: '0.1rem 0.4rem',
                minWidth: '1.2rem',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
              role="status"
              aria-label={`${failedWorkflows.length} active failure${failedWorkflows.length !== 1 ? 's' : ''}`}
            >
              {failedWorkflows.length}
            </span>
          )}
        </div>
        {/* Status indicator */}
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: failedWorkflows.length > 0 ? theme.errorColor : theme.successColor,
            display: 'inline-block',
            boxShadow: failedWorkflows.length > 0
              ? `0 0 6px ${theme.errorColor}`
              : `0 0 6px ${theme.successColor}`,
          }}
          aria-hidden="true"
        />
      </div>

      {/* No failures state */}
      {failedWorkflows.length === 0 && (
        <div
          style={{
            padding: '0.75rem',
            textAlign: 'center',
            color: theme.successColor,
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
            fontWeight: 500,
          }}
        >
          All workflows executing normally. No failures detected.
        </div>
      )}

      {/* Category summary bar */}
      {failedWorkflows.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.3rem',
              marginBottom: '0.5rem',
            }}
          >
            {(Object.entries(categoryCounts) as [FailureCategory, number][]).map(
              ([category, count]) => {
                const meta = FAILURE_CATEGORY_CONFIG[category];
                return (
                  <span
                    key={category}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      fontSize: `calc(0.6rem * ${theme.fontScale})`,
                      fontWeight: 600,
                      color: meta.color,
                      backgroundColor: `${meta.color}15`,
                      border: `1px solid ${meta.color}40`,
                      borderRadius: '999px',
                      padding: '0.1rem 0.4rem',
                    }}
                    title={`${meta.label}: ${count} failure${count !== 1 ? 's' : ''}`}
                  >
                    <span aria-hidden="true">{meta.icon}</span>
                    {meta.label}: {count}
                  </span>
                );
              },
            )}
          </div>

          {/* Failed workflow list */}
          <div
            role="log"
            aria-label="Failed workflows"
            aria-live="polite"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3rem',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {failedWorkflows.slice(0, 20).map((workflow) => (
              <FailureRow key={workflow.id} workflow={workflow} theme={theme} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface FailureRowProps {
  workflow: AgentWorkflow;
  theme: QualityGateTheme;
}

const FailureRow: React.FC<FailureRowProps> = ({ workflow, theme }) => {
  const failure = workflow.failure;
  const categoryMeta = failure
    ? FAILURE_CATEGORY_CONFIG[failure.category]
    : FAILURE_CATEGORY_CONFIG.unknown;

  const failedAgo = useMemo(() => {
    const diff = Date.now() - workflow.lastUpdateAt;
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return `${Math.floor(diff / 3_600_000)}h ago`;
  }, [workflow.lastUpdateAt]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.4rem',
        padding: '0.35rem 0.5rem',
        borderRadius: '4px',
        backgroundColor: 'rgba(239, 68, 68, 0.04)',
        fontSize: `calc(0.7rem * ${theme.fontScale})`,
      }}
    >
      {/* Category indicator */}
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          backgroundColor: categoryMeta.color,
          marginTop: '0.4em',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />

      {/* Workflow info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ fontWeight: 600, color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {workflow.workflowName}
          </span>
          <span style={{ color: theme.textMuted, flexShrink: 0 }}>
            ({workflow.agentName})
          </span>
        </div>
        <div style={{ color: theme.textSecondary, fontSize: `calc(0.6rem * ${theme.fontScale})`, lineHeight: 1.3 }}>
          {failure?.message ?? 'Unknown failure'}
          {failure && (
            <span style={{ color: theme.textMuted }}>
              {' '}| Step {failure.failedAtStep}/{workflow.totalSteps}
              {failure.retryable && ` | Retry ${failure.retryCount}/${failure.maxRetries}`}
            </span>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <span
        style={{
          fontSize: `calc(0.55rem * ${theme.fontScale})`,
          color: theme.textMuted,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {failedAgo}
      </span>
    </div>
  );
};

export default FailureDetectionPanel;
