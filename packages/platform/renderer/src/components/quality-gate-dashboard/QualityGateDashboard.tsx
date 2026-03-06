/**
 * QualityGateDashboard Component
 *
 * Top-level dashboard that orchestrates the progressive quality gate
 * visualization for autonomous agent workflows. Shows three-tier
 * confidence levels with color-coded risk indicators, failure detection,
 * human escalation interface, and trust calibration display.
 *
 * Architecture:
 * ```
 *   <QualityGateDashboard>
 *       |
 *       |-- useQualityGateDashboard() hook (or external state)
 *       |
 *       |-- Header (live/paused toggle, status)
 *       |-- <TierOverviewPanel />
 *       |-- <FailureDetectionPanel />
 *       |-- <EscalationPanel />
 *       |-- <CalibrationDisplay />
 *       |-- AlertsPanel
 * ```
 *
 * Display Modes:
 *   - dashboard:   Full dashboard with all panels
 *   - compact:     Minimal HUD bar for VR overlay
 *   - escalation:  Escalation-only view for human operators
 *   - overlay:     Semi-transparent overlay for VR HUD
 *
 * VR Safety:
 *   This component does NOT render at 90Hz. The useQualityGateDashboard
 *   hook batches updates and the caller should throttle data pushes to
 *   at most 10Hz.
 *
 * Accessibility (WCAG 2.1 AA):
 *   - role="region" with aria-label on top-level container
 *   - role="status" for live metrics updates
 *   - role="log" for alerts list
 *   - All interactive elements keyboard accessible
 *   - Minimum 4.5:1 contrast ratios throughout
 *
 * @module quality-gate-dashboard/QualityGateDashboard
 */

import React, { useMemo } from 'react';
import {
  useQualityGateDashboard,
  type UseQualityGateDashboardConfig,
} from './useQualityGateDashboard';
import { TierOverviewPanel } from './TierOverviewPanel';
import { FailureDetectionPanel } from './FailureDetectionPanel';
import { EscalationPanel } from './EscalationPanel';
import { CalibrationDisplay } from './CalibrationDisplay';
import type {
  QualityGateTheme,
  QualityGateDisplayMode,
  QualityGatePanel,
  QualityGateDashboardState,
  QualityGateDashboardActions,
  QualityGateAlert,
} from './types';
import {
  DEFAULT_QG_THEME,
  getTierColor,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface QualityGateDashboardProps {
  /** Display mode (default: 'dashboard') */
  mode?: QualityGateDisplayMode;
  /** Which panels to show (default: all) */
  panels?: QualityGatePanel[];
  /** Hook configuration (used when no external state is provided) */
  config?: UseQualityGateDashboardConfig;
  /** Externally managed state (bypasses internal hook) */
  externalState?: QualityGateDashboardState;
  /** Externally managed actions (bypasses internal hook) */
  externalActions?: QualityGateDashboardActions;
  /** Theme overrides */
  theme?: Partial<QualityGateTheme>;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Accessible label override */
  ariaLabel?: string;
}

const ALL_PANELS: QualityGatePanel[] = [
  'tier-overview', 'workflows', 'failures', 'escalations', 'calibration', 'alerts',
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const QualityGateDashboard: React.FC<QualityGateDashboardProps> = ({
  mode = 'dashboard',
  panels = ALL_PANELS,
  config,
  externalState,
  externalActions,
  theme: themeOverride,
  className,
  style,
  ariaLabel = 'Quality Gate Dashboard',
}) => {
  // Use external state/actions if provided, otherwise use internal hook
  const [internalState, internalActions] = useQualityGateDashboard(config);
  const state = externalState ?? internalState;
  const actions = externalActions ?? internalActions;

  const theme = useMemo(
    () => ({ ...DEFAULT_QG_THEME, ...themeOverride }),
    [themeOverride],
  );

  const containerStyles = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontFamily: theme.fontFamily,
      fontSize: `calc(0.85rem * ${theme.fontScale})`,
      color: theme.textPrimary,
      backgroundColor: theme.containerBackground,
      borderRadius: theme.borderRadius,
      border: `1px solid ${theme.borderColor}`,
      overflow: 'hidden',
    };

    switch (mode) {
      case 'overlay':
        return {
          ...base,
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
        };
      case 'compact':
        return {
          ...base,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem 1rem',
        };
      case 'escalation':
        return {
          ...base,
          display: 'flex',
          flexDirection: 'column',
        };
      case 'dashboard':
      default:
        return {
          ...base,
          display: 'flex',
          flexDirection: 'column',
        };
    }
  }, [mode, theme]);

  // Compact mode: single-line HUD bar
  if (mode === 'compact') {
    return (
      <div
        className={className}
        style={{ ...containerStyles, ...style }}
        role="status"
        aria-label={ariaLabel}
      >
        <CompactHUD state={state} actions={actions} theme={theme} />
      </div>
    );
  }

  // Escalation-only mode
  if (mode === 'escalation') {
    return (
      <div
        className={className}
        style={{ ...containerStyles, ...style }}
        role="region"
        aria-label={ariaLabel}
      >
        <DashboardHeader state={state} actions={actions} theme={theme} />
        <EscalationPanel
          escalations={state.pendingEscalations}
          actions={actions}
          theme={theme}
        />
      </div>
    );
  }

  // Full dashboard and overlay modes
  return (
    <div
      className={className}
      style={{ ...containerStyles, ...style }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header */}
      <DashboardHeader state={state} actions={actions} theme={theme} />

      {/* Panels */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Tier Overview */}
        {panels.includes('tier-overview') && (
          <TierOverviewPanel state={state} theme={theme} />
        )}

        {/* Failure Detection */}
        {panels.includes('failures') && (
          <FailureDetectionPanel
            workflows={state.workflows}
            theme={theme}
          />
        )}

        {/* Escalations */}
        {panels.includes('escalations') && (
          <EscalationPanel
            escalations={state.pendingEscalations}
            actions={actions}
            theme={theme}
          />
        )}

        {/* Calibration */}
        {panels.includes('calibration') && (
          <CalibrationDisplay
            calibration={state.calibration}
            theme={theme}
          />
        )}

        {/* Alerts */}
        {panels.includes('alerts') && state.alerts.length > 0 && (
          <AlertsPanel alerts={state.alerts} actions={actions} theme={theme} />
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SubProps {
  state: QualityGateDashboardState;
  actions: QualityGateDashboardActions;
  theme: QualityGateTheme;
}

// -- Dashboard Header --

const DashboardHeader: React.FC<SubProps> = ({ state, actions, theme }) => {
  const hasFailures = state.activeFailureCount > 0;
  const hasPendingEscalations = state.pendingEscalations.length > 0;

  const statusColor = hasFailures
    ? theme.errorColor
    : hasPendingEscalations
      ? theme.warningColor
      : theme.successColor;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        backgroundColor: theme.cardBackground,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Status indicator */}
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            display: 'inline-block',
            boxShadow: state.isLive ? `0 0 6px ${statusColor}` : 'none',
          }}
          aria-hidden="true"
        />
        <span
          style={{
            fontWeight: 600,
            fontSize: `calc(0.9rem * ${theme.fontScale})`,
          }}
        >
          Quality Gate
        </span>

        {/* Stale data indicator */}
        {state.isStale && (
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              color: theme.warningColor,
              border: `1px solid ${theme.warningColor}`,
              borderRadius: '3px',
              padding: '0.05rem 0.3rem',
            }}
            role="alert"
          >
            STALE
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
        {/* Tier mini-badges */}
        {(['tier1', 'tier2', 'tier3'] as const).map((tier) => {
          const count = state.tierCounts[tier];
          if (count === 0) return null;
          const color = getTierColor(tier, theme);
          return (
            <span
              key={tier}
              style={{
                fontSize: `calc(0.6rem * ${theme.fontScale})`,
                fontWeight: 600,
                color,
                border: `1px solid ${color}`,
                borderRadius: '4px',
                padding: '0.05rem 0.3rem',
              }}
              aria-label={`Tier ${tier.slice(-1)}: ${count}`}
            >
              T{tier.slice(-1)}:{count}
            </span>
          );
        })}

        {/* Live/Paused toggle */}
        <button
          type="button"
          onClick={() => actions.toggleLive()}
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontWeight: 500,
            fontFamily: theme.fontFamily,
            color: state.isLive ? theme.successColor : theme.warningColor,
            backgroundColor: 'transparent',
            border: `1px solid ${state.isLive ? theme.successColor : theme.warningColor}`,
            borderRadius: '4px',
            padding: '0.15rem 0.5rem',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          aria-label={state.isLive ? 'Pause live data feed' : 'Resume live data feed'}
          onMouseEnter={(e) => {
            const c = state.isLive ? theme.successColor : theme.warningColor;
            (e.target as HTMLButtonElement).style.backgroundColor = `${c}20`;
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
          }}
        >
          {state.isLive ? 'Live' : 'Paused'}
        </button>
      </div>
    </div>
  );
};

// -- Compact HUD --

const CompactHUD: React.FC<SubProps> = ({ state, actions, theme }) => {
  const hasFailures = state.activeFailureCount > 0;
  const statusColor = hasFailures ? theme.errorColor : theme.successColor;

  return (
    <>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <span style={{ fontWeight: 600, fontSize: `calc(0.8rem * ${theme.fontScale})` }}>
        QG
      </span>
      {(['tier1', 'tier2', 'tier3'] as const).map((tier) => {
        const count = state.tierCounts[tier];
        const color = getTierColor(tier, theme);
        return (
          <span
            key={tier}
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              fontWeight: 600,
              color,
            }}
          >
            T{tier.slice(-1)}:{count}
          </span>
        );
      })}
      {state.activeFailureCount > 0 && (
        <>
          <span style={{ color: theme.textMuted }}>|</span>
          <span
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.errorColor,
            }}
          >
            {state.activeFailureCount} fail
          </span>
        </>
      )}
      {state.pendingEscalations.length > 0 && (
        <>
          <span style={{ color: theme.textMuted }}>|</span>
          <span
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.tier3Color,
            }}
          >
            {state.pendingEscalations.length} esc
          </span>
        </>
      )}
      <button
        type="button"
        onClick={() => actions.toggleLive()}
        style={{
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
          fontFamily: theme.fontFamily,
          color: state.isLive ? theme.successColor : theme.warningColor,
          backgroundColor: 'transparent',
          border: `1px solid ${state.isLive ? theme.successColor : theme.warningColor}`,
          borderRadius: '3px',
          padding: '0.1rem 0.3rem',
          cursor: 'pointer',
          marginLeft: 'auto',
        }}
        aria-label={state.isLive ? 'Pause live data' : 'Resume live data'}
      >
        {state.isLive ? 'Live' : 'Paused'}
      </button>
    </>
  );
};

// -- Alerts Panel --

interface AlertsPanelProps {
  alerts: QualityGateAlert[];
  actions: QualityGateDashboardActions;
  theme: QualityGateTheme;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, actions, theme }) => {
  const severityColor = (severity: QualityGateAlert['severity']): string => {
    switch (severity) {
      case 'critical': return theme.errorColor;
      case 'warning': return theme.warningColor;
      case 'info': return theme.textSecondary;
      default: return theme.textMuted;
    }
  };

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
      }}
    >
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
          Alerts ({alerts.length})
        </span>
        {alerts.length > 0 && (
          <button
            type="button"
            onClick={() => actions.clearAlerts()}
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
            aria-label="Clear all quality gate alerts"
          >
            Clear All
          </button>
        )}
      </div>
      <div
        role="log"
        aria-label="Quality gate alerts"
        aria-live="polite"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          maxHeight: '180px',
          overflowY: 'auto',
        }}
      >
        {alerts.slice(0, 15).map((alert) => (
          <div
            key={alert.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.4rem',
              padding: '0.3rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: 'rgba(255,255,255,0.02)',
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: severityColor(alert.severity),
                marginTop: '0.4em',
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <span style={{ color: theme.textMuted, flexShrink: 0, minWidth: '48px' }}>
              {new Date(alert.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
            <span style={{ color: theme.textSecondary, flex: 1 }}>
              {alert.message}
            </span>
            <button
              type="button"
              onClick={() => actions.dismissAlert(alert.id)}
              style={{
                fontSize: `calc(0.55rem * ${theme.fontScale})`,
                fontFamily: theme.fontFamily,
                color: theme.textMuted,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '0 0.2rem',
                flexShrink: 0,
              }}
              aria-label={`Dismiss alert: ${alert.message}`}
            >
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QualityGateDashboard;
