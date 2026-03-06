/**
 * BundleMonitorDashboard Component
 *
 * Top-level dashboard for automated bundle budget monitoring.
 * Displays real-time chunk sizes, budget utilization, load time
 * estimates, historical trends, and CI/CD integration status.
 *
 * Architecture:
 * ```
 *   <BundleMonitorDashboard>
 *       |
 *       |-- useBundleMonitor() hook (or external state)
 *       |
 *       |-- Header (status, live toggle)
 *       |-- SummaryPanel (key metrics grid)
 *       |-- <ChunkBreakdown />
 *       |-- LoadTimesPanel
 *       |-- <TrendChart />
 *       |-- CIStatusPanel
 *       |-- AlertsPanel
 * ```
 *
 * @module bundle-monitor/BundleMonitorDashboard
 */

import React, { useMemo } from 'react';
import {
  useBundleMonitor,
  type UseBundleMonitorConfig,
} from './useBundleMonitor';
import { ChunkBreakdown } from './ChunkBreakdown';
import { TrendChart } from './TrendChart';
import type {
  BundleMonitorTheme,
  BundleMonitorDisplayMode,
  BundleMonitorPanel,
  BundleMonitorState,
  BundleMonitorActions,
  BundleAlert,
  NetworkPreset,
} from './types';
import {
  DEFAULT_BM_THEME,
  NETWORK_PRESETS,
  getBudgetStatusColor,
  getCIStatusColor,
  formatSize,
  formatLoadTime,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface BundleMonitorDashboardProps {
  /** Display mode (default: 'dashboard') */
  mode?: BundleMonitorDisplayMode;
  /** Which panels to show (default: all) */
  panels?: BundleMonitorPanel[];
  /** Hook configuration */
  config?: UseBundleMonitorConfig;
  /** Externally managed state */
  externalState?: BundleMonitorState;
  /** Externally managed actions */
  externalActions?: BundleMonitorActions;
  /** Theme overrides */
  theme?: Partial<BundleMonitorTheme>;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Accessible label override */
  ariaLabel?: string;
}

const ALL_PANELS: BundleMonitorPanel[] = [
  'summary', 'chunks', 'load-times', 'trends', 'ci-status', 'alerts',
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const BundleMonitorDashboard: React.FC<BundleMonitorDashboardProps> = ({
  mode = 'dashboard',
  panels = ALL_PANELS,
  config,
  externalState,
  externalActions,
  theme: themeOverride,
  className,
  style,
  ariaLabel = 'Bundle Size Monitor',
}) => {
  const [internalState, internalActions] = useBundleMonitor(config);
  const state = externalState ?? internalState;
  const actions = externalActions ?? internalActions;

  const theme = useMemo(
    () => ({ ...DEFAULT_BM_THEME, ...themeOverride }),
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
      case 'compact':
        return {
          ...base,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem 1rem',
        };
      case 'chunks':
      case 'trends':
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

  const build = state.currentBuild;

  // Compact mode
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

  // Chunks-only mode
  if (mode === 'chunks' && build) {
    return (
      <div className={className} style={{ ...containerStyles, ...style }} role="region" aria-label={ariaLabel}>
        <DashboardHeader state={state} actions={actions} theme={theme} />
        <ChunkBreakdown chunks={build.chunks} theme={theme} />
      </div>
    );
  }

  // Trends-only mode
  if (mode === 'trends') {
    return (
      <div className={className} style={{ ...containerStyles, ...style }} role="region" aria-label={ariaLabel}>
        <DashboardHeader state={state} actions={actions} theme={theme} />
        <TrendChart
          trendData={state.trendData}
          totalBudget={build?.totalBudget ?? 500 * 1024}
          theme={theme}
        />
      </div>
    );
  }

  // Full dashboard
  return (
    <div
      className={className}
      style={{ ...containerStyles, ...style }}
      role="region"
      aria-label={ariaLabel}
    >
      <DashboardHeader state={state} actions={actions} theme={theme} />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Summary panel */}
        {panels.includes('summary') && build && (
          <SummaryPanel build={build} theme={theme} />
        )}

        {/* Chunks */}
        {panels.includes('chunks') && build && (
          <ChunkBreakdown chunks={build.chunks} theme={theme} />
        )}

        {/* Load times */}
        {panels.includes('load-times') && build && (
          <LoadTimesPanel
            build={build}
            selectedPreset={state.networkPreset}
            onSelectPreset={actions.setNetworkPreset}
            theme={theme}
          />
        )}

        {/* Trends */}
        {panels.includes('trends') && (
          <TrendChart
            trendData={state.trendData}
            totalBudget={build?.totalBudget ?? 500 * 1024}
            theme={theme}
          />
        )}

        {/* CI Status */}
        {panels.includes('ci-status') && build && (
          <CIStatusPanel build={build} theme={theme} />
        )}

        {/* Alerts */}
        {panels.includes('alerts') && state.alerts.length > 0 && (
          <AlertsPanel alerts={state.alerts} actions={actions} theme={theme} />
        )}

        {/* No build data */}
        {!build && (
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              color: theme.textMuted,
              fontSize: `calc(0.8rem * ${theme.fontScale})`,
            }}
          >
            No build data available. Waiting for first build snapshot...
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SubProps {
  state: BundleMonitorState;
  actions: BundleMonitorActions;
  theme: BundleMonitorTheme;
}

// -- Dashboard Header --

const DashboardHeader: React.FC<SubProps> = ({ state, actions, theme }) => {
  const build = state.currentBuild;
  const statusColor = build
    ? getBudgetStatusColor(build.budgetStatus, theme)
    : theme.textMuted;

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
        <span style={{ fontWeight: 600, fontSize: `calc(0.9rem * ${theme.fontScale})` }}>
          Bundle Monitor
        </span>
        {build && (
          <>
            <span
              style={{
                fontSize: `calc(0.6rem * ${theme.fontScale})`,
                color: statusColor,
                fontWeight: 600,
                border: `1px solid ${statusColor}`,
                borderRadius: '4px',
                padding: '0.05rem 0.3rem',
                textTransform: 'uppercase',
              }}
            >
              {build.budgetStatus}
            </span>
            <span
              style={{
                fontSize: `calc(0.6rem * ${theme.fontScale})`,
                color: theme.textMuted,
                fontFamily: theme.monoFontFamily,
              }}
            >
              {build.commitHash.substring(0, 7)}
            </span>
          </>
        )}
        {state.isStale && (
          <span
            style={{
              fontSize: `calc(0.55rem * ${theme.fontScale})`,
              color: theme.warningColor,
              border: `1px solid ${theme.warningColor}`,
              borderRadius: '3px',
              padding: '0.05rem 0.25rem',
            }}
            role="alert"
          >
            STALE
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => actions.toggleLive()}
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontWeight: 500,
            fontFamily: theme.fontFamily,
            color: state.isLive ? theme.okColor : theme.warningColor,
            backgroundColor: 'transparent',
            border: `1px solid ${state.isLive ? theme.okColor : theme.warningColor}`,
            borderRadius: '4px',
            padding: '0.15rem 0.5rem',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          aria-label={state.isLive ? 'Pause live updates' : 'Resume live updates'}
          onMouseEnter={(e) => {
            const c = state.isLive ? theme.okColor : theme.warningColor;
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
  const build = state.currentBuild;
  const statusColor = build
    ? getBudgetStatusColor(build.budgetStatus, theme)
    : theme.textMuted;

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
        Bundle
      </span>
      {build && (
        <>
          <span
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: statusColor,
            }}
          >
            {formatSize(build.totalGzipSize)}
          </span>
          <span style={{ color: theme.textMuted }}>|</span>
          <span
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              color: theme.textSecondary,
            }}
          >
            {(build.budgetUtilization * 100).toFixed(0)}% budget
          </span>
          <span style={{ color: theme.textMuted }}>|</span>
          <span
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              color: theme.textSecondary,
            }}
          >
            {build.chunkCount} chunks
          </span>
        </>
      )}
      <button
        type="button"
        onClick={() => actions.toggleLive()}
        style={{
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
          fontFamily: theme.fontFamily,
          color: state.isLive ? theme.okColor : theme.warningColor,
          backgroundColor: 'transparent',
          border: `1px solid ${state.isLive ? theme.okColor : theme.warningColor}`,
          borderRadius: '3px',
          padding: '0.1rem 0.3rem',
          cursor: 'pointer',
          marginLeft: 'auto',
        }}
        aria-label={state.isLive ? 'Pause' : 'Resume'}
      >
        {state.isLive ? 'Live' : 'Paused'}
      </button>
    </>
  );
};

// -- Summary Panel --

interface SummaryPanelProps {
  build: import('./types').BuildSnapshot;
  theme: BundleMonitorTheme;
}

const SummaryPanel: React.FC<SummaryPanelProps> = ({ build, theme }) => {
  const statusColor = getBudgetStatusColor(build.budgetStatus, theme);

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

      {/* Budget utilization bar */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            marginBottom: '0.2rem',
          }}
        >
          <span style={{ color: theme.textSecondary }}>
            {formatSize(build.totalGzipSize)} / {formatSize(build.totalBudget)}
          </span>
          <span style={{ color: statusColor, fontWeight: 600 }}>
            {(build.budgetUtilization * 100).toFixed(0)}%
          </span>
        </div>
        <div
          role="meter"
          aria-label={`Budget utilization: ${(build.budgetUtilization * 100).toFixed(0)}%`}
          aria-valuenow={Math.round(build.budgetUtilization * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            height: '6px',
            borderRadius: '3px',
            backgroundColor: theme.borderColor,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(build.budgetUtilization * 100, 100)}%`,
              backgroundColor: statusColor,
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Metrics grid */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}
        role="status"
        aria-label="Bundle summary metrics"
      >
        <MetricCell
          label="Total (gzip)"
          value={formatSize(build.totalGzipSize)}
          valueColor={statusColor}
          theme={theme}
        />
        <MetricCell
          label="Total (raw)"
          value={formatSize(build.totalRawSize)}
          theme={theme}
        />
        <MetricCell
          label="Chunks"
          value={build.chunkCount.toString()}
          theme={theme}
        />
        <MetricCell
          label="Over Budget"
          value={build.exceededChunkCount.toString()}
          valueColor={build.exceededChunkCount > 0 ? theme.exceededColor : theme.okColor}
          theme={theme}
        />
      </div>
    </div>
  );
};

// -- Load Times Panel --

interface LoadTimesPanelProps {
  build: import('./types').BuildSnapshot;
  selectedPreset: NetworkPreset;
  onSelectPreset: (preset: NetworkPreset) => void;
  theme: BundleMonitorTheme;
}

const LoadTimesPanel: React.FC<LoadTimesPanelProps> = ({
  build,
  selectedPreset,
  onSelectPreset,
  theme,
}) => {
  const presets: NetworkPreset[] = ['slow-3g', 'fast-3g', '4g', 'broadband'];

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
      }}
      role="region"
      aria-label="Estimated load times"
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
        Estimated Load Times
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
        {presets.map((preset) => {
          const config = NETWORK_PRESETS[preset];
          const loadTime = build.loadTimes[preset] ?? 0;
          const isSelected = preset === selectedPreset;
          const loadColor = loadTime > 5000
            ? theme.exceededColor
            : loadTime > 2000
              ? theme.warningColor
              : theme.okColor;

          return (
            <button
              key={preset}
              type="button"
              onClick={() => onSelectPreset(preset)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.1rem',
                padding: '0.4rem',
                borderRadius: theme.borderRadius,
                backgroundColor: isSelected ? `${theme.accentColor}10` : 'transparent',
                border: `1px solid ${isSelected ? theme.accentColor : theme.borderColor}`,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: theme.fontFamily,
                transition: 'all 0.15s ease',
              }}
              aria-pressed={isSelected}
              aria-label={`${config.label}: ${formatLoadTime(loadTime)}`}
            >
              <span
                style={{
                  fontSize: `calc(0.55rem * ${theme.fontScale})`,
                  color: theme.textMuted,
                  fontWeight: 500,
                }}
              >
                {config.label}
              </span>
              <span
                style={{
                  fontSize: `calc(0.8rem * ${theme.fontScale})`,
                  fontWeight: 600,
                  color: loadColor,
                }}
              >
                {formatLoadTime(loadTime)}
              </span>
              <span
                style={{
                  fontSize: `calc(0.45rem * ${theme.fontScale})`,
                  color: theme.textMuted,
                }}
              >
                {config.bandwidthMbps}Mbps / {config.latencyMs}ms
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// -- CI Status Panel --

interface CIStatusPanelProps {
  build: import('./types').BuildSnapshot;
  theme: BundleMonitorTheme;
}

const CIStatusPanel: React.FC<CIStatusPanelProps> = ({ build, theme }) => {
  const ciColor = getCIStatusColor(build.ciStatus, theme);

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
      }}
      role="status"
      aria-label={`CI/CD status: ${build.ciStatus}`}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
            CI/CD Budget Check
          </span>
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontWeight: 700,
              color: ciColor,
              border: `1px solid ${ciColor}`,
              borderRadius: '4px',
              padding: '0.05rem 0.3rem',
              textTransform: 'uppercase',
            }}
          >
            {build.ciStatus}
          </span>
        </div>
        <div
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            color: theme.textMuted,
          }}
        >
          <span style={{ fontFamily: theme.monoFontFamily }}>
            {build.commitHash.substring(0, 7)}
          </span>
          {' on '}
          <span style={{ color: theme.textSecondary }}>{build.branch}</span>
          {' | Build: '}
          <span style={{ color: theme.textSecondary }}>{formatLoadTime(build.buildDurationMs)}</span>
        </div>
      </div>
    </div>
  );
};

// -- Alerts Panel --

interface AlertsPanelProps {
  alerts: BundleAlert[];
  actions: BundleMonitorActions;
  theme: BundleMonitorTheme;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, actions, theme }) => {
  const severityColor = (severity: BundleAlert['severity']): string => {
    switch (severity) {
      case 'critical': return theme.exceededColor;
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
          aria-label="Clear all bundle alerts"
        >
          Clear All
        </button>
      </div>
      <div
        role="log"
        aria-label="Bundle budget alerts"
        aria-live="polite"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          maxHeight: '150px',
          overflowY: 'auto',
        }}
      >
        {alerts.slice(0, 10).map((alert) => (
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

// -- Shared MetricCell --

interface MetricCellProps {
  label: string;
  value: string;
  valueColor?: string;
  theme: BundleMonitorTheme;
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

export default BundleMonitorDashboard;
