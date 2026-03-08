/**
 * ScoreOverviewPanel
 *
 * Displays the overall WCAG 2.1 compliance score as a large gauge and
 * per-principle breakdown bars (Perceivable, Operable, Understandable, Robust).
 * Also shows pass/fail/warning counts for quick triage.
 *
 * Accessibility:
 *   - role="region" with aria-label
 *   - role="meter" for the compliance score
 *   - Minimum 4.5:1 contrast ratios
 *
 * @module accessibility-audit-dashboard/ScoreOverviewPanel
 */

import React, { useMemo } from 'react';
import type {
  AccessibilityAuditReport,
  A11yTheme,
  WCAGPrinciple,
} from './types';
import { getPrincipleColor, getPrincipleLabel, getStatusColor } from './types';

// =============================================================================
// PROPS
// =============================================================================

export interface ScoreOverviewPanelProps {
  /** The audit report to display */
  report: AccessibilityAuditReport;
  /** Theme configuration */
  theme: A11yTheme;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ScoreOverviewPanel: React.FC<ScoreOverviewPanelProps> = ({
  report,
  theme,
}) => {
  const { summary, complianceScore, passesLevelAA } = report;

  const scoreColor = useMemo(() => {
    if (complianceScore >= 80) return theme.passColor;
    if (complianceScore >= 50) return theme.warningColor;
    return theme.failColor;
  }, [complianceScore, theme]);

  const principles: WCAGPrinciple[] = ['perceivable', 'operable', 'understandable', 'robust'];

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
      }}
      role="region"
      aria-label="Compliance Score Overview"
    >
      {/* Section Header */}
      <div
        style={{
          fontSize: `calc(0.75rem * ${theme.fontScale})`,
          fontWeight: 600,
          color: theme.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.75rem',
        }}
      >
        WCAG 2.1 AA Compliance
      </div>

      {/* Main Score + Badge Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '0.75rem',
        }}
      >
        {/* Score Gauge */}
        <div
          role="meter"
          aria-label="Overall compliance score"
          aria-valuenow={complianceScore}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            fontSize: `calc(2.2rem * ${theme.fontScale})`,
            fontWeight: 700,
            color: scoreColor,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {complianceScore}
          <span
            style={{
              fontSize: `calc(0.8rem * ${theme.fontScale})`,
              color: theme.textMuted,
              fontWeight: 400,
            }}
          >
            %
          </span>
        </div>

        {/* Level AA Badge */}
        <span
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: passesLevelAA ? theme.passColor : theme.failColor,
            border: `1px solid ${passesLevelAA ? theme.passColor : theme.failColor}`,
            borderRadius: '4px',
            padding: '0.15rem 0.5rem',
          }}
          role="status"
          aria-label={passesLevelAA ? 'Passes WCAG 2.1 Level AA' : 'Fails WCAG 2.1 Level AA'}
        >
          {passesLevelAA ? 'PASSES AA' : 'FAILS AA'}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Summary Counts */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <CountBadge
            count={summary.criteriaPassed}
            label="passed"
            color={theme.passColor}
            theme={theme}
          />
          <CountBadge
            count={summary.criteriaFailed}
            label="failed"
            color={theme.failColor}
            theme={theme}
          />
          <CountBadge
            count={summary.criteriaWarning}
            label="warnings"
            color={theme.warningColor}
            theme={theme}
          />
        </div>
      </div>

      {/* Principle Bars */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
        }}
      >
        {principles.map((principle) => {
          const score = summary.principleScores[principle];
          const color = getPrincipleColor(principle, theme);
          return (
            <PrincipleBar
              key={principle}
              label={getPrincipleLabel(principle)}
              score={score}
              color={color}
              theme={theme}
            />
          );
        })}
      </div>

      {/* Object Stats */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '0.75rem',
          fontSize: `calc(0.65rem * ${theme.fontScale})`,
          color: theme.textMuted,
        }}
      >
        <span>{summary.totalObjects} objects</span>
        <span>{summary.interactiveObjects} interactive</span>
        <span>{summary.visualObjects} visual</span>
        <span>{summary.audioObjects} audio</span>
        <span>{summary.animatedObjects} animated</span>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface CountBadgeProps {
  count: number;
  label: string;
  color: string;
  theme: A11yTheme;
}

const CountBadge: React.FC<CountBadgeProps> = ({ count, label, color, theme }) => (
  <span
    style={{
      fontSize: `calc(0.6rem * ${theme.fontScale})`,
      fontWeight: 600,
      color,
      border: `1px solid ${color}30`,
      borderRadius: '4px',
      padding: '0.1rem 0.35rem',
      fontVariantNumeric: 'tabular-nums',
    }}
    aria-label={`${count} criteria ${label}`}
  >
    {count} {label}
  </span>
);

interface PrincipleBarProps {
  label: string;
  score: number;
  color: string;
  theme: A11yTheme;
}

const PrincipleBar: React.FC<PrincipleBarProps> = ({ label, score, color, theme }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    }}
    role="meter"
    aria-label={`${label} score`}
    aria-valuenow={score}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <span
      style={{
        width: '100px',
        fontSize: `calc(0.65rem * ${theme.fontScale})`,
        color: theme.textSecondary,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
    <div
      style={{
        flex: 1,
        height: '6px',
        backgroundColor: `${color}15`,
        borderRadius: '3px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${score}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: '3px',
          transition: 'width 0.3s ease',
        }}
      />
    </div>
    <span
      style={{
        width: '36px',
        textAlign: 'right',
        fontSize: `calc(0.65rem * ${theme.fontScale})`,
        fontWeight: 600,
        color,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {score}%
    </span>
  </div>
);

export default ScoreOverviewPanel;
