/**
 * TierOverviewPanel Component
 *
 * Displays a summary of the three-tier confidence distribution with
 * color-coded risk indicators (green/yellow/red for Tier 1/2/3).
 *
 * Shows:
 *   - Tier distribution bar (proportional width per tier)
 *   - Per-tier counts and percentages
 *   - Active workflow count
 *   - Failure and escalation highlights
 *
 * @module quality-gate-dashboard/TierOverviewPanel
 */

import React, { useMemo } from 'react';
import type {
  ConfidenceTier,
  QualityGateTheme,
  QualityGateDashboardState,
} from './types';
import {
  CONFIDENCE_TIER_CONFIG,
  getTierColor,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface TierOverviewPanelProps {
  /** Dashboard state */
  state: QualityGateDashboardState;
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

const ALL_TIERS: ConfidenceTier[] = ['tier1', 'tier2', 'tier3'];

export const TierOverviewPanel: React.FC<TierOverviewPanelProps> = ({
  state,
  theme,
  className,
  style,
}) => {
  const totalWorkflows = state.workflows.length;

  const tierPercentages = useMemo(() => {
    if (totalWorkflows === 0) {
      return { tier1: 0, tier2: 0, tier3: 0 };
    }
    return {
      tier1: (state.tierCounts.tier1 / totalWorkflows) * 100,
      tier2: (state.tierCounts.tier2 / totalWorkflows) * 100,
      tier3: (state.tierCounts.tier3 / totalWorkflows) * 100,
    };
  }, [state.tierCounts, totalWorkflows]);

  return (
    <div
      className={className}
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        ...style,
      }}
      role="region"
      aria-label="Confidence tier overview"
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: theme.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Tier Distribution
        </span>
        <span
          style={{
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            color: theme.textMuted,
          }}
        >
          {totalWorkflows} workflow{totalWorkflows !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Distribution bar */}
      <div
        role="meter"
        aria-label="Confidence tier distribution"
        aria-valuenow={totalWorkflows}
        aria-valuemin={0}
        style={{
          display: 'flex',
          height: '8px',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: theme.borderColor,
          marginBottom: '0.75rem',
        }}
      >
        {ALL_TIERS.map((tier) => {
          const pct = tierPercentages[tier];
          if (pct === 0) return null;
          return (
            <div
              key={tier}
              style={{
                width: `${pct}%`,
                backgroundColor: getTierColor(tier, theme),
                transition: 'width 0.3s ease',
              }}
              title={`${CONFIDENCE_TIER_CONFIG[tier].label}: ${state.tierCounts[tier]} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      {/* Tier cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
        }}
      >
        {ALL_TIERS.map((tier) => {
          const meta = CONFIDENCE_TIER_CONFIG[tier];
          const count = state.tierCounts[tier];
          const pct = tierPercentages[tier];
          const tierColor = getTierColor(tier, theme);

          return (
            <div
              key={tier}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '0.5rem 0.6rem',
                borderRadius: theme.borderRadius,
                backgroundColor: meta.backgroundColor,
                border: `1px solid ${meta.borderColor}`,
                transition: 'transform 0.15s ease',
              }}
              role="status"
              aria-label={`${meta.label}: ${count} workflows, ${pct.toFixed(0)}%`}
            >
              {/* Tier indicator dot + label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: tierColor,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <span
                  style={{
                    fontSize: `calc(0.65rem * ${theme.fontScale})`,
                    fontWeight: 600,
                    color: tierColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {meta.label}
                </span>
              </div>

              {/* Count */}
              <span
                style={{
                  fontSize: `calc(1.1rem * ${theme.fontScale})`,
                  fontWeight: 700,
                  color: theme.textPrimary,
                  lineHeight: 1.2,
                }}
              >
                {count}
              </span>

              {/* Percentage */}
              <span
                style={{
                  fontSize: `calc(0.6rem * ${theme.fontScale})`,
                  color: theme.textMuted,
                }}
              >
                {totalWorkflows > 0 ? `${pct.toFixed(0)}%` : '--'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Quick stats row */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '0.75rem',
          paddingTop: '0.5rem',
          borderTop: `1px solid ${theme.borderColor}`,
        }}
      >
        <QuickStat
          label="Running"
          value={state.statusCounts.running}
          color={theme.accentColor}
          theme={theme}
        />
        <QuickStat
          label="Failed"
          value={state.statusCounts.failed}
          color={theme.errorColor}
          theme={theme}
        />
        <QuickStat
          label="Pending Approval"
          value={state.statusCounts.pending_approval}
          color={theme.tier3Color}
          theme={theme}
        />
        <QuickStat
          label="Completed"
          value={state.statusCounts.completed}
          color={theme.successColor}
          theme={theme}
        />
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface QuickStatProps {
  label: string;
  value: number;
  color: string;
  theme: QualityGateTheme;
}

const QuickStat: React.FC<QuickStatProps> = ({ label, value, color, theme }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.05rem' }}>
    <span
      style={{
        fontSize: `calc(0.55rem * ${theme.fontScale})`,
        color: theme.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: `calc(0.85rem * ${theme.fontScale})`,
        fontWeight: 600,
        color: value > 0 ? color : theme.textMuted,
      }}
    >
      {value}
    </span>
  </div>
);

export default TierOverviewPanel;
