/**
 * CalibrationDisplay Component
 *
 * Displays trust calibration metrics for the quality gate system.
 * Shows how well the confidence tiers match actual outcomes:
 *   - Overall calibration score
 *   - Tier 1 accuracy (how often autonomous decisions were correct)
 *   - Tier 2 escalation rate
 *   - Tier 3 approval rate
 *   - False positive/negative counts
 *   - Tier distribution chart
 *
 * @module quality-gate-dashboard/CalibrationDisplay
 */

import React, { useMemo } from 'react';
import type {
  TrustCalibration,
  ConfidenceTier,
  QualityGateTheme,
} from './types';
import { getTierColor, CONFIDENCE_TIER_CONFIG } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface CalibrationDisplayProps {
  /** Trust calibration data */
  calibration: TrustCalibration | null;
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

export const CalibrationDisplay: React.FC<CalibrationDisplayProps> = ({
  calibration,
  theme,
  className,
  style,
}) => {
  if (!calibration) {
    return (
      <div
        className={className}
        style={{
          padding: '0.75rem 1rem',
          borderBottom: `1px solid ${theme.borderColor}`,
          ...style,
        }}
      >
        <SectionHeader theme={theme} />
        <div
          style={{
            padding: '0.75rem',
            textAlign: 'center',
            color: theme.textMuted,
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
          }}
        >
          No calibration data available yet. Waiting for sufficient decision history.
        </div>
      </div>
    );
  }

  const calibrationColor = useMemo(() => {
    if (calibration.calibrationScore >= 0.8) return theme.successColor;
    if (calibration.calibrationScore >= 0.6) return theme.warningColor;
    return theme.errorColor;
  }, [calibration.calibrationScore, theme]);

  const windowDuration = useMemo(() => {
    const diff = calibration.windowEnd - calibration.windowStart;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h`;
    return `${Math.round(diff / 86_400_000)}d`;
  }, [calibration.windowStart, calibration.windowEnd]);

  const totalDistribution = useMemo(() => {
    return Object.values(calibration.tierDistribution).reduce((sum, v) => sum + v, 0);
  }, [calibration.tierDistribution]);

  return (
    <div
      className={className}
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        ...style,
      }}
      role="region"
      aria-label="Trust calibration metrics"
    >
      <SectionHeader theme={theme} />

      {/* Calibration score gauge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem',
          padding: '0.5rem 0.6rem',
          borderRadius: theme.borderRadius,
          backgroundColor: theme.cardBackground,
        }}
      >
        {/* Score circle */}
        <div
          style={{
            position: 'relative',
            width: '52px',
            height: '52px',
            flexShrink: 0,
          }}
        >
          {/* Background circle */}
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle
              cx="26"
              cy="26"
              r="22"
              fill="none"
              stroke={theme.borderColor}
              strokeWidth="4"
            />
            <circle
              cx="26"
              cy="26"
              r="22"
              fill="none"
              stroke={calibrationColor}
              strokeWidth="4"
              strokeDasharray={`${calibration.calibrationScore * 138.23} 138.23`}
              strokeLinecap="round"
              transform="rotate(-90 26 26)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          </svg>
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: `calc(0.75rem * ${theme.fontScale})`,
              fontWeight: 700,
              color: calibrationColor,
            }}
            role="status"
            aria-label={`Calibration score: ${(calibration.calibrationScore * 100).toFixed(0)}%`}
          >
            {(calibration.calibrationScore * 100).toFixed(0)}%
          </span>
        </div>

        {/* Score details */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: `calc(0.8rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.textPrimary,
              marginBottom: '0.15rem',
            }}
          >
            Calibration Score
          </div>
          <div
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              color: theme.textMuted,
              lineHeight: 1.3,
            }}
          >
            {calibration.totalDecisions} decisions over {windowDuration} window
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}
        role="status"
        aria-label="Calibration metrics breakdown"
      >
        <MetricCell
          label="Tier 1 Accuracy"
          value={`${(calibration.tier1Accuracy * 100).toFixed(0)}%`}
          valueColor={calibration.tier1Accuracy >= 0.95 ? theme.successColor : theme.warningColor}
          theme={theme}
        />
        <MetricCell
          label="Tier 2 Escalation"
          value={`${(calibration.tier2EscalationRate * 100).toFixed(0)}%`}
          valueColor={calibration.tier2EscalationRate <= 0.15 ? theme.successColor : theme.warningColor}
          theme={theme}
        />
        <MetricCell
          label="Tier 3 Approval"
          value={`${(calibration.tier3ApprovalRate * 100).toFixed(0)}%`}
          valueColor={theme.textPrimary}
          theme={theme}
        />
      </div>

      {/* False positive/negative row */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.3rem 0.5rem',
            borderRadius: '4px',
            backgroundColor: calibration.falsePositives > 0 ? 'rgba(234, 179, 8, 0.06)' : 'transparent',
            border: `1px solid ${calibration.falsePositives > 0 ? theme.warningColor + '30' : theme.borderColor}`,
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
          }}
        >
          <span style={{ color: theme.textMuted }}>False Positives</span>
          <span
            style={{
              fontWeight: 600,
              color: calibration.falsePositives > 0 ? theme.warningColor : theme.textMuted,
            }}
          >
            {calibration.falsePositives}
          </span>
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.3rem 0.5rem',
            borderRadius: '4px',
            backgroundColor: calibration.falseNegatives > 0 ? 'rgba(239, 68, 68, 0.06)' : 'transparent',
            border: `1px solid ${calibration.falseNegatives > 0 ? theme.errorColor + '30' : theme.borderColor}`,
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
          }}
        >
          <span style={{ color: theme.textMuted }}>False Negatives</span>
          <span
            style={{
              fontWeight: 600,
              color: calibration.falseNegatives > 0 ? theme.errorColor : theme.textMuted,
            }}
          >
            {calibration.falseNegatives}
          </span>
        </div>
      </div>

      {/* Tier distribution */}
      <div>
        <div
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: theme.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '0.3rem',
          }}
        >
          Decision Distribution
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {(['tier1', 'tier2', 'tier3'] as ConfidenceTier[]).map((tier) => {
            const count = calibration.tierDistribution[tier] ?? 0;
            const pct = totalDistribution > 0 ? (count / totalDistribution) * 100 : 0;
            const color = getTierColor(tier, theme);
            const meta = CONFIDENCE_TIER_CONFIG[tier];

            return (
              <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    fontSize: `calc(0.6rem * ${theme.fontScale})`,
                    color: theme.textMuted,
                    minWidth: '70px',
                    flexShrink: 0,
                  }}
                >
                  {meta.label}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '3px',
                    backgroundColor: theme.borderColor,
                    overflow: 'hidden',
                  }}
                  role="meter"
                  aria-label={`${meta.label}: ${pct.toFixed(0)}%`}
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: color,
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: `calc(0.55rem * ${theme.fontScale})`,
                    color: theme.textMuted,
                    minWidth: '42px',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {count} ({pct.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SectionHeaderProps {
  theme: QualityGateTheme;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ theme }) => (
  <div style={{ marginBottom: '0.5rem' }}>
    <span
      style={{
        fontSize: `calc(0.75rem * ${theme.fontScale})`,
        fontWeight: 600,
        color: theme.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      Trust Calibration
    </span>
  </div>
);

interface MetricCellProps {
  label: string;
  value: string;
  valueColor: string;
  theme: QualityGateTheme;
}

const MetricCell: React.FC<MetricCellProps> = ({ label, value, valueColor, theme }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
    <span
      style={{
        fontSize: `calc(0.55rem * ${theme.fontScale})`,
        color: theme.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: `calc(0.85rem * ${theme.fontScale})`,
        fontWeight: 600,
        color: valueColor,
      }}
    >
      {value}
    </span>
  </div>
);

export default CalibrationDisplay;
