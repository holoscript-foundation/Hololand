/**
 * VRPerformanceDashboard Component
 *
 * Top-level dashboard that orchestrates the Gaussian Budget Utilization
 * and Frame Time Waterfall panels, plus summary metrics and alerts.
 *
 * Architecture:
 * ```
 *   <VRPerformanceDashboard>
 *       |
 *       |-- useVRPerformance() hook (or external state)
 *       |
 *       |-- Header (device preset, FPS, live/paused toggle)
 *       |-- SummaryPanel (key metrics grid)
 *       |-- <GaussianBudgetUtilization />
 *       |-- <FrameTimeWaterfall />
 *       |-- AlertsPanel (performance alerts)
 * ```
 *
 * Display Modes:
 *   - dashboard: Full dashboard with all panels
 *   - compact: Minimal HUD bar suitable for VR overlay
 *   - budget-only: Only Gaussian budget panel
 *   - waterfall-only: Only frame time waterfall
 *   - overlay: Semi-transparent overlay for VR HUD
 *
 * VR Safety:
 *   This component does NOT render at 90Hz. The useVRPerformance hook
 *   batches updates and the caller should throttle data pushes to
 *   at most 10-30Hz for budget metrics and buffer frame samples.
 *
 * Accessibility (WCAG 2.1 AA):
 *   - role="region" with aria-label on top-level container
 *   - role="status" for live metrics updates
 *   - role="log" for alerts list
 *   - All interactive elements keyboard accessible
 *   - Minimum 4.5:1 contrast ratios throughout
 *   - Focus management for dismiss actions
 *
 * @module vr-performance-dashboard/VRPerformanceDashboard
 */

import React, { useMemo } from 'react';
import { useVRPerformance, type UseVRPerformanceConfig } from './useVRPerformance';
import { GaussianBudgetUtilization } from './GaussianBudgetUtilization';
import { FrameTimeWaterfall } from './FrameTimeWaterfall';
import type {
  VRPerfTheme,
  VRPerfDisplayMode,
  VRPerfPanel,
  VRPerformanceState,
  VRPerformanceActions,
  PerformanceAlert,
} from './types';
import {
  DEFAULT_VR_PERF_THEME,
  getPerformanceStateColor,
  formatMs,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface VRPerformanceDashboardProps {
  /** Display mode (default: 'dashboard') */
  mode?: VRPerfDisplayMode;
  /** Which panels to show (default: all) */
  panels?: VRPerfPanel[];
  /** Hook configuration (used when no external state is provided) */
  config?: UseVRPerformanceConfig;
  /** Externally managed state (bypasses internal hook) */
  externalState?: VRPerformanceState;
  /** Externally managed actions (bypasses internal hook) */
  externalActions?: VRPerformanceActions;
  /** Theme overrides */
  theme?: Partial<VRPerfTheme>;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Accessible label override */
  ariaLabel?: string;
}

const ALL_PANELS: VRPerfPanel[] = [
  'summary', 'budget', 'waterfall', 'memory', 'history', 'alerts',
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const VRPerformanceDashboard: React.FC<VRPerformanceDashboardProps> = ({
  mode = 'dashboard',
  panels = ALL_PANELS,
  config,
  externalState,
  externalActions,
  theme: themeOverride,
  className,
  style,
  ariaLabel = 'VR Performance Dashboard',
}) => {
  // Use external state/actions if provided, otherwise use internal hook
  const [internalState, internalActions] = useVRPerformance(config);
  const state = externalState ?? internalState;
  const actions = externalActions ?? internalActions;

  const theme = useMemo(
    () => ({ ...DEFAULT_VR_PERF_THEME, ...themeOverride }),
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
          backgroundColor: 'rgba(10, 10, 26, 0.88)',
          backdropFilter: 'blur(8px)',
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 1000,
        };
      case 'compact':
        return {
          ...base,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem 1rem',
        };
      case 'budget-only':
      case 'waterfall-only':
        return {
          ...base,
          padding: '0',
        };
      case 'dashboard':
      default:
        return {
          ...base,
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
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

  // Budget-only mode
  if (mode === 'budget-only' && state.budgetMetrics) {
    return (
      <div className={className} style={{ ...style }} role="region" aria-label={ariaLabel}>
        <GaussianBudgetUtilization metrics={state.budgetMetrics} theme={themeOverride} />
      </div>
    );
  }

  // Waterfall-only mode
  if (mode === 'waterfall-only') {
    return (
      <div className={className} style={{ ...style }} role="region" aria-label={ariaLabel}>
        <FrameTimeWaterfall
          samples={state.frameSamples}
          targetFrameTimeMs={state.targetFrameTimeMs}
          theme={themeOverride}
        />
      </div>
    );
  }

  // Full dashboard mode
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {/* Summary panel */}
        {panels.includes('summary') && (
          <SummaryPanel state={state} theme={theme} />
        )}

        {/* Budget panel */}
        {panels.includes('budget') && state.budgetMetrics && (
          <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${theme.borderColor}` }}>
            <GaussianBudgetUtilization
              metrics={state.budgetMetrics}
              width={undefined}
              theme={themeOverride}
              style={{
                border: 'none',
                padding: 0,
                backgroundColor: 'transparent',
                width: '100%',
              }}
            />
          </div>
        )}

        {/* Waterfall panel */}
        {panels.includes('waterfall') && state.frameSamples.length > 0 && (
          <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${theme.borderColor}` }}>
            <FrameTimeWaterfall
              samples={state.frameSamples}
              targetFrameTimeMs={state.targetFrameTimeMs}
              theme={themeOverride}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
              }}
            />
          </div>
        )}

        {/* Render stats panel */}
        {panels.includes('history') && state.renderStats && (
          <RenderStatsPanel stats={state.renderStats} theme={theme} />
        )}

        {/* Alerts panel */}
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
  state: VRPerformanceState;
  actions: VRPerformanceActions;
  theme: VRPerfTheme;
}

interface ReadOnlySubProps {
  state: VRPerformanceState;
  theme: VRPerfTheme;
}

// -- Dashboard Header --

const DashboardHeader: React.FC<SubProps> = ({ state, actions, theme }) => {
  const perfColor = state.budgetMetrics
    ? getPerformanceStateColor(state.budgetMetrics.performanceState, theme)
    : theme.textMuted;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        background: theme.cardBackground,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Performance indicator dot */}
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: perfColor,
            display: 'inline-block',
            boxShadow: state.isLive ? `0 0 6px ${perfColor}` : 'none',
          }}
          aria-hidden="true"
        />
        <span style={{ fontWeight: 600, fontSize: `calc(0.9rem * ${theme.fontScale})` }}>
          VR Performance
        </span>
        <span
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            color: theme.textMuted,
            border: `1px solid ${theme.borderColor}`,
            borderRadius: '3px',
            padding: '0.1rem 0.35rem',
          }}
        >
          {state.devicePreset}
        </span>
        {state.currentFps > 0 && (
          <span
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              color: state.currentFps >= 85 ? theme.nominalColor : theme.pressureColor,
              fontWeight: 600,
            }}
            role="status"
            aria-label={`Current frame rate: ${state.currentFps} FPS`}
          >
            {state.currentFps} FPS
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        {state.budgetMetrics && (
          <span
            style={{
              fontSize: `calc(0.65rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: perfColor,
              border: `1px solid ${perfColor}`,
              borderRadius: '4px',
              padding: '0.1rem 0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            role="status"
            aria-label={`Performance state: ${state.budgetMetrics.performanceState}`}
          >
            {state.budgetMetrics.performanceState}
          </span>
        )}
        <button
          type="button"
          onClick={() => actions.toggleLive()}
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontWeight: 500,
            fontFamily: theme.fontFamily,
            color: state.isLive ? theme.nominalColor : theme.pressureColor,
            backgroundColor: 'transparent',
            border: `1px solid ${state.isLive ? theme.nominalColor : theme.pressureColor}`,
            borderRadius: '4px',
            padding: '0.15rem 0.5rem',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          aria-label={state.isLive ? 'Pause live data feed' : 'Resume live data feed'}
          onMouseEnter={(e) => {
            const c = state.isLive ? theme.nominalColor : theme.pressureColor;
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
  const perfColor = state.budgetMetrics
    ? getPerformanceStateColor(state.budgetMetrics.performanceState, theme)
    : theme.textMuted;

  return (
    <>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: perfColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <span style={{ fontWeight: 600, fontSize: `calc(0.8rem * ${theme.fontScale})` }}>
        VR Perf
      </span>
      {state.currentFps > 0 && (
        <span
          style={{
            color: state.currentFps >= 85 ? theme.nominalColor : theme.pressureColor,
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
            fontWeight: 600,
          }}
        >
          {state.currentFps}fps
        </span>
      )}
      {state.budgetMetrics && (
        <>
          <span style={{ color: theme.textMuted }}>|</span>
          <span style={{ color: theme.textSecondary, fontSize: `calc(0.75rem * ${theme.fontScale})` }}>
            {(state.budgetMetrics.overallUtilization * 100).toFixed(0)}% budget
          </span>
          <span style={{ color: theme.textMuted }}>|</span>
          <span style={{ color: perfColor, fontSize: `calc(0.75rem * ${theme.fontScale})` }}>
            {state.budgetMetrics.avgFrameTimeMs.toFixed(1)}ms
          </span>
        </>
      )}
      <button
        type="button"
        onClick={() => actions.toggleLive()}
        style={{
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
          fontFamily: theme.fontFamily,
          color: state.isLive ? theme.nominalColor : theme.pressureColor,
          backgroundColor: 'transparent',
          border: `1px solid ${state.isLive ? theme.nominalColor : theme.pressureColor}`,
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

// -- Summary Panel --

const SummaryPanel: React.FC<ReadOnlySubProps> = ({ state, theme }) => {
  const m = state.budgetMetrics;
  if (!m) return null;

  const perfColor = getPerformanceStateColor(m.performanceState, theme);

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
      }}
    >
      <div
        style={{
          fontSize: `calc(0.75rem * ${theme.fontScale})`,
          fontWeight: 600,
          color: theme.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.5rem',
        }}
      >
        Summary
      </div>
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}
        role="status"
        aria-label="Performance summary metrics"
      >
        <MetricCell
          label="Budget"
          value={`${(m.overallUtilization * 100).toFixed(0)}%`}
          valueColor={
            m.overallUtilization > 0.9 ? theme.emergencyColor
              : m.overallUtilization > 0.75 ? theme.pressureColor
                : theme.nominalColor
          }
          theme={theme}
        />
        <MetricCell
          label="Avg Frame"
          value={formatMs(m.avgFrameTimeMs)}
          valueColor={perfColor}
          theme={theme}
        />
        <MetricCell
          label="Target"
          value={`${state.targetFrameTimeMs.toFixed(1)}ms`}
          theme={theme}
        />
        <MetricCell
          label="FPS"
          value={state.currentFps > 0 ? `${state.currentFps}` : '--'}
          valueColor={
            state.currentFps >= 85 ? theme.nominalColor
              : state.currentFps >= 72 ? theme.pressureColor
                : state.currentFps > 0 ? theme.emergencyColor
                  : undefined
          }
          theme={theme}
        />
      </div>
    </div>
  );
};

// -- Render Stats Panel --

interface RenderStatsPanelProps {
  stats: import('../../FoveatedGaussianTypes').GaussianRenderStats;
  theme: VRPerfTheme;
}

const RenderStatsPanel: React.FC<RenderStatsPanelProps> = ({ stats, theme }) => {
  const stateColor = (() => {
    switch (stats.state) {
      case 'excellent': return theme.nominalColor;
      case 'good': return theme.nominalColor;
      case 'marginal': return theme.pressureColor;
      case 'degraded': return theme.criticalColor;
      case 'critical': return theme.emergencyColor;
      default: return theme.textMuted;
    }
  })();

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
          Render Stats
        </span>
        <span
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: stateColor,
            textTransform: 'uppercase',
          }}
        >
          {stats.state}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        <MetricCell label="Avg" value={formatMs(stats.avgFrameMs)} theme={theme} />
        <MetricCell label="P95" value={formatMs(stats.p95FrameMs)} theme={theme} />
        <MetricCell label="P99" value={formatMs(stats.p99FrameMs)} theme={theme} />
        <MetricCell
          label="Within Budget"
          value={`${stats.withinBudgetPct.toFixed(0)}%`}
          valueColor={
            stats.withinBudgetPct >= 95 ? theme.nominalColor
              : stats.withinBudgetPct >= 80 ? theme.pressureColor
                : theme.emergencyColor
          }
          theme={theme}
        />
        <MetricCell
          label="Avg Gaussians"
          value={stats.avgGaussiansRendered.toLocaleString()}
          theme={theme}
        />
        <MetricCell
          label="Cull Efficiency"
          value={`${(stats.avgCullEfficiency * 100).toFixed(0)}%`}
          theme={theme}
        />
      </div>

      {/* Frame time budget usage bar */}
      <div style={{ marginTop: '0.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            color: theme.textMuted,
            marginBottom: '0.2rem',
          }}
        >
          <span>P95 Budget Usage</span>
          <span>{formatMs(stats.p95FrameMs)}</span>
        </div>
        <div
          role="meter"
          aria-label="P95 frame time budget usage"
          aria-valuenow={Math.round(stats.p95FrameMs)}
          aria-valuemin={0}
          aria-valuemax={Math.round(11.1 * 1.5)}
          style={{
            height: '4px',
            borderRadius: '2px',
            backgroundColor: theme.borderColor,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min((stats.p95FrameMs / (11.1 * 1.5)) * 100, 100)}%`,
              borderRadius: '2px',
              backgroundColor:
                stats.p95FrameMs > 11.1 ? theme.emergencyColor
                  : stats.p95FrameMs > 8 ? theme.pressureColor
                    : theme.nominalColor,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
};

// -- Alerts Panel --

interface AlertsPanelProps {
  alerts: PerformanceAlert[];
  actions: VRPerformanceActions;
  theme: VRPerfTheme;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, actions, theme }) => {
  const severityColor = (severity: PerformanceAlert['severity']): string => {
    switch (severity) {
      case 'critical': return theme.emergencyColor;
      case 'warning': return theme.pressureColor;
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
            aria-label="Clear all performance alerts"
          >
            Clear All
          </button>
        )}
      </div>
      <div
        role="log"
        aria-label="Performance alerts"
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
              {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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

// =============================================================================
// SHARED UI PRIMITIVES
// =============================================================================

interface MetricCellProps {
  label: string;
  value: string;
  valueColor?: string;
  theme: VRPerfTheme;
}

const MetricCell: React.FC<MetricCellProps> = ({ label, value, valueColor, theme }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
    <span
      style={{
        fontSize: `calc(0.6rem * ${theme.fontScale})`,
        color: theme.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontSize: `calc(0.8rem * ${theme.fontScale})`,
        fontWeight: 600,
        color: valueColor ?? theme.textPrimary,
      }}
    >
      {value}
    </span>
  </div>
);

export default VRPerformanceDashboard;
