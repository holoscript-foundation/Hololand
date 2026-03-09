/**
 * DriftDetectionAlerts Component
 *
 * Displays cultural drift detection alerts with severity levels,
 * dimension context, magnitude indicators, and drift direction arrows.
 * Alerts are sorted by severity (critical first) then by recency.
 *
 * Severity Levels:
 *   - Critical (red):  Drift magnitude > 8%, requires immediate attention
 *   - Warning (amber):  Drift magnitude 5-8%, monitor closely
 *   - Info (blue):      Drift magnitude 3-5%, informational
 *
 * Features:
 *   - Severity-colour-coded alert cards
 *   - Dimension label with pole indicators (e.g., "Individualist <-> Collectivist")
 *   - Magnitude bar visualization
 *   - Drift direction arrow
 *   - Affected agent count
 *   - Acknowledge / clear actions
 *   - Auto-sorted by severity then timestamp
 *
 * Accessibility (WCAG 2.1 AA):
 *   - role="log" with aria-live="polite" for alert list
 *   - role="alert" on critical alerts
 *   - Acknowledge buttons with descriptive aria-labels
 *   - Colour is NOT the sole severity channel (text labels included)
 *   - Minimum 4.5:1 contrast for all text
 *
 * @module cultural-compatibility-dashboard/DriftDetectionAlerts
 */

import React, { useMemo } from 'react';
import type {
  DriftAlert,
  CompatibilityDashboardTheme,
  CulturalCompatibilityActions,
} from './types';
import {
  DEFAULT_COMPATIBILITY_THEME,
  getSeverityColor,
  DIMENSION_LABELS,
} from './types';
import type { CulturalDimension } from '../../CulturalHealthTypes';

// =============================================================================
// PROPS
// =============================================================================

export interface DriftDetectionAlertsProps {
  /** Drift alerts to display */
  alerts: DriftAlert[];
  /** Dashboard actions for acknowledge/clear */
  actions: Pick<CulturalCompatibilityActions, 'acknowledgeDriftAlert' | 'clearDriftAlerts'>;
  /** Theme overrides */
  theme?: Partial<CompatibilityDashboardTheme>;
  /** Custom CSS styles */
  style?: React.CSSProperties;
  /** Maximum alerts to display (default: 15) */
  maxVisible?: number;
}

// =============================================================================
// SEVERITY ORDER
// =============================================================================

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

// =============================================================================
// COMPONENT
// =============================================================================

export const DriftDetectionAlerts: React.FC<DriftDetectionAlertsProps> = ({
  alerts,
  actions,
  theme: themeOverride,
  style,
  maxVisible = 15,
}) => {
  const theme = useMemo(
    () => ({ ...DEFAULT_COMPATIBILITY_THEME, ...themeOverride }),
    [themeOverride],
  );

  // Sort by severity (critical first) then by timestamp (newest first)
  const sorted = useMemo(
    () =>
      [...alerts]
        .sort((a, b) => {
          const severityDiff =
            (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
          if (severityDiff !== 0) return severityDiff;
          return b.timestamp - a.timestamp;
        })
        .slice(0, maxVisible),
    [alerts, maxVisible],
  );

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        ...style,
      }}
    >
      {/* Panel header */}
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
            Drift Alerts ({alerts.length})
          </span>
          {criticalCount > 0 && (
            <span
              style={{
                fontSize: `calc(0.55rem * ${theme.fontScale})`,
                color: theme.criticalColor,
                fontWeight: 700,
                border: `1px solid ${theme.criticalColor}`,
                borderRadius: '3px',
                padding: '0 0.25rem',
              }}
            >
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span
              style={{
                fontSize: `calc(0.55rem * ${theme.fontScale})`,
                color: theme.moderateColor,
                fontWeight: 600,
                border: `1px solid ${theme.moderateColor}`,
                borderRadius: '3px',
                padding: '0 0.25rem',
              }}
            >
              {warningCount} warning
            </span>
          )}
        </div>
        {alerts.length > 0 && (
          <button
            type="button"
            onClick={() => actions.clearDriftAlerts()}
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontFamily: theme.fontFamily,
              color: theme.textMuted,
              backgroundColor: 'transparent',
              border: `1px solid ${theme.borderColor}`,
              borderRadius: '3px',
              padding: '0.1rem 0.35rem',
              cursor: 'pointer',
            }}
            aria-label="Clear all drift alerts"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Alert list */}
      <div
        role="log"
        aria-label="Cultural drift detection alerts"
        aria-live="polite"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem',
          maxHeight: '250px',
          overflowY: 'auto',
        }}
      >
        {sorted.map((alert) => (
          <DriftAlertCard
            key={alert.id}
            alert={alert}
            onAcknowledge={actions.acknowledgeDriftAlert}
            theme={theme}
          />
        ))}
        {alerts.length === 0 && (
          <div
            style={{
              padding: '0.75rem',
              textAlign: 'center',
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              color: theme.textMuted,
            }}
          >
            No drift alerts detected
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// DRIFT ALERT CARD
// =============================================================================

interface DriftAlertCardProps {
  alert: DriftAlert;
  onAcknowledge: (id: string) => void;
  theme: CompatibilityDashboardTheme;
}

const DriftAlertCard: React.FC<DriftAlertCardProps> = ({
  alert,
  onAcknowledge,
  theme,
}) => {
  const severityColor = getSeverityColor(alert.severity, theme);
  const dimLabel = DIMENSION_LABELS[alert.dimension];
  const isCritical = alert.severity === 'critical';

  // Direction arrow: -1 = toward poleA, +1 = toward poleB
  const directionArrow = alert.driftDirection > 0 ? '\u2192' : alert.driftDirection < 0 ? '\u2190' : '\u2194';
  const directionLabel =
    alert.driftDirection > 0
      ? dimLabel.poleB
      : alert.driftDirection < 0
        ? dimLabel.poleA
        : 'Stable';

  // Magnitude as percentage for the bar
  const magnitudePct = Math.min(alert.driftMagnitude * 100 / 10, 100); // normalize 0-10% range

  return (
    <div
      role={isCritical ? 'alert' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
        padding: '0.4rem 0.5rem',
        borderRadius: '5px',
        backgroundColor: `${severityColor}08`,
        borderLeft: `3px solid ${severityColor}`,
        fontSize: `calc(0.7rem * ${theme.fontScale})`,
      }}
    >
      {/* Row 1: Severity, timestamp, dimension, acknowledge button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        {/* Severity dot */}
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: severityColor,
            display: 'inline-block',
            flexShrink: 0,
            boxShadow: isCritical ? `0 0 4px ${severityColor}` : 'none',
          }}
          aria-hidden="true"
        />

        {/* Severity label */}
        <span
          style={{
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            fontWeight: 700,
            color: severityColor,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
        >
          {alert.severity}
        </span>

        {/* Timestamp */}
        <span
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            color: theme.textMuted,
            flexShrink: 0,
          }}
        >
          {new Date(alert.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>

        {/* Dimension label */}
        <span
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            color: theme.accentColor,
            fontWeight: 600,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {dimLabel.label}
        </span>

        {/* Acknowledge button */}
        <button
          type="button"
          onClick={() => onAcknowledge(alert.id)}
          style={{
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            fontFamily: theme.fontFamily,
            color: theme.textMuted,
            backgroundColor: 'transparent',
            border: `1px solid ${theme.borderColor}`,
            borderRadius: '3px',
            padding: '0.05rem 0.25rem',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          aria-label={`Acknowledge drift alert: ${alert.message}`}
        >
          Ack
        </button>
      </div>

      {/* Row 2: Message */}
      <div style={{ color: theme.textSecondary }}>
        {alert.message}
      </div>

      {/* Row 3: Magnitude bar + direction arrow + affected agents */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {/* Magnitude label */}
        <span
          style={{
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            color: theme.textMuted,
            flexShrink: 0,
          }}
        >
          Mag:
        </span>

        {/* Magnitude bar */}
        <div
          role="meter"
          aria-label={`Drift magnitude: ${(alert.driftMagnitude * 100).toFixed(1)}%`}
          aria-valuenow={Math.round(alert.driftMagnitude * 100)}
          aria-valuemin={0}
          aria-valuemax={10}
          style={{
            width: '60px',
            height: '4px',
            borderRadius: '2px',
            backgroundColor: theme.borderColor,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${magnitudePct}%`,
              borderRadius: '2px',
              backgroundColor: severityColor,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Magnitude value */}
        <span
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: severityColor,
            flexShrink: 0,
          }}
        >
          {(alert.driftMagnitude * 100).toFixed(1)}%
        </span>

        {/* Separator */}
        <span style={{ color: theme.borderColor }}>|</span>

        {/* Direction arrow + label */}
        <span
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            color: theme.accentColor,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {directionArrow} {directionLabel}
        </span>

        {/* Affected agents */}
        {alert.affectedAgentCount > 0 && (
          <>
            <span style={{ color: theme.borderColor }}>|</span>
            <span
              style={{
                fontSize: `calc(0.55rem * ${theme.fontScale})`,
                color: theme.textMuted,
              }}
            >
              {alert.affectedAgentCount} agents
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default DriftDetectionAlerts;
