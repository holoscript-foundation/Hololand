/**
 * CulturalCompatibilityDashboard Component
 *
 * Top-level dashboard that orchestrates all cultural compatibility panels:
 *   - CooperationMatrixHeatmap: Pairwise agent cooperation scores
 *   - CulturalProfileCards: Per-agent cultural profiles with role badges
 *   - NormConvergenceTimeline: Multi-line norm adoption convergence chart
 *   - DriftDetectionAlerts: Cultural drift alerts with severity levels
 *   - PopulationHealthIndicators: Cross-model population health metrics
 *
 * Architecture:
 * ```
 *   <CulturalCompatibilityDashboard>
 *       |
 *       |-- useCulturalCompatibility() hook (or external state/actions)
 *       |     |-- WebSocket connection to CulturalHealthWebSocket
 *       |     |-- State management for all sub-panels
 *       |
 *       |-- Header (connection status, live/paused, health badge)
 *       |-- <CooperationMatrixHeatmap />
 *       |-- <CulturalProfileCards />
 *       |-- <NormConvergenceTimeline />
 *       |-- <DriftDetectionAlerts />
 *       |-- <PopulationHealthIndicators />
 *       |-- Staleness indicator
 * ```
 *
 * Display Modes:
 *   - full: All panels in vertical layout
 *   - compact: Minimal HUD bar with key metrics
 *   - heatmap-only: Only the cooperation matrix
 *   - overlay: Semi-transparent Layer 6 holographic overlay
 *
 * Performance Contract:
 *   - All data pre-computed server-side, pushed via WebSocket at <= 10Hz
 *   - Target: < 100ms total render for full dashboard
 *   - NO classifiers or ML inference in render path
 *   - React state batching prevents excessive re-renders
 *
 * Accessibility (WCAG 2.1 AA):
 *   - role="region" with aria-label on top-level container
 *   - role="status" for live metrics updates
 *   - All interactive elements keyboard accessible
 *   - Minimum 4.5:1 contrast ratios
 *   - Focus management for panel interactions
 *
 * @module cultural-compatibility-dashboard/CulturalCompatibilityDashboard
 */

import React, { useMemo } from 'react';
import {
  useCulturalCompatibility,
  type UseCulturalCompatibilityConfig,
} from './useCulturalCompatibility';
import { CooperationMatrixHeatmap } from './CooperationMatrixHeatmap';
import { CulturalProfileCards } from './CulturalProfileCards';
import { NormConvergenceTimeline } from './NormConvergenceTimeline';
import { DriftDetectionAlerts } from './DriftDetectionAlerts';
import { PopulationHealthIndicators } from './PopulationHealthIndicators';
import type {
  CompatibilityDashboardTheme,
  CompatibilityDisplayMode,
  CompatibilityPanel,
  CulturalCompatibilityState,
  CulturalCompatibilityActions,
} from './types';
import {
  DEFAULT_COMPATIBILITY_THEME,
  getHealthColor,
  formatScore,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface CulturalCompatibilityDashboardProps {
  /** Display mode (default: 'full') */
  mode?: CompatibilityDisplayMode;
  /** Which panels to show (default: all) */
  panels?: CompatibilityPanel[];
  /** Hook configuration (used when no external state is provided) */
  config?: UseCulturalCompatibilityConfig;
  /** Externally managed state (bypasses internal hook) */
  externalState?: CulturalCompatibilityState;
  /** Externally managed actions (bypasses internal hook) */
  externalActions?: CulturalCompatibilityActions;
  /** Theme overrides */
  theme?: Partial<CompatibilityDashboardTheme>;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Accessible label override */
  ariaLabel?: string;
}

const ALL_PANELS: CompatibilityPanel[] = [
  'header',
  'matrix',
  'profiles',
  'convergence',
  'drift-alerts',
  'population',
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CulturalCompatibilityDashboard: React.FC<CulturalCompatibilityDashboardProps> = ({
  mode = 'full',
  panels = ALL_PANELS,
  config,
  externalState,
  externalActions,
  theme: themeOverride,
  className,
  style,
  ariaLabel = 'Cultural Compatibility Dashboard',
}) => {
  // Use external state/actions if provided, otherwise use internal hook
  const [internalState, internalActions] = useCulturalCompatibility(config);
  const state = externalState ?? internalState;
  const actions = externalActions ?? internalActions;

  const theme = useMemo(
    () => ({ ...DEFAULT_COMPATIBILITY_THEME, ...themeOverride }),
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
      boxShadow: `0 0 12px ${theme.glowColor}, inset 0 0 4px ${theme.glowColor}`,
      overflow: 'hidden',
    };

    switch (mode) {
      case 'overlay':
        return {
          ...base,
          backdropFilter: 'blur(8px)',
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '520px',
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
      case 'heatmap-only':
        return {
          ...base,
          padding: '0',
        };
      case 'full':
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

  // Heatmap-only mode
  if (mode === 'heatmap-only' && state.cooperationMatrix) {
    return (
      <div
        className={className}
        style={{ ...containerStyles, ...style }}
        role="region"
        aria-label={ariaLabel}
      >
        <CooperationMatrixHeatmap
          matrix={state.cooperationMatrix}
          theme={themeOverride}
          onCellClick={(a, b) => actions.selectAgent(a)}
        />
      </div>
    );
  }

  // Full / Overlay dashboard mode
  return (
    <div
      className={className}
      style={{ ...containerStyles, ...style }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header */}
      {panels.includes('header') && (
        <DashboardHeader state={state} actions={actions} theme={theme} />
      )}

      {/* Panels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {/* Cooperation Matrix */}
        {panels.includes('matrix') && state.cooperationMatrix && (
          <CooperationMatrixHeatmap
            matrix={state.cooperationMatrix}
            theme={themeOverride}
            onCellClick={(a, b) => actions.selectAgent(a)}
          />
        )}

        {/* Cultural Profile Cards */}
        {panels.includes('profiles') && state.profiles.length > 0 && (
          <CulturalProfileCards
            profiles={state.profiles}
            selectedAgentId={state.selectedAgentId}
            onSelectAgent={actions.selectAgent}
            theme={themeOverride}
          />
        )}

        {/* Norm Convergence Timeline */}
        {panels.includes('convergence') && state.normConvergence && (
          <NormConvergenceTimeline
            convergence={state.normConvergence}
            theme={themeOverride}
          />
        )}

        {/* Drift Detection Alerts */}
        {panels.includes('drift-alerts') && (
          <DriftDetectionAlerts
            alerts={state.driftAlerts}
            actions={actions}
            theme={themeOverride}
          />
        )}

        {/* Population Health Indicators */}
        {panels.includes('population') && state.populationHealth && (
          <PopulationHealthIndicators
            health={state.populationHealth}
            theme={themeOverride}
          />
        )}
      </div>

      {/* Staleness indicator */}
      {state.isStale && (
        <div
          style={{
            padding: '0.4rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderTop: `1px solid ${theme.criticalColor}`,
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            color: theme.criticalColor,
            textAlign: 'center',
          }}
          role="alert"
        >
          Data stale -- no updates for{' '}
          {((Date.now() - state.lastUpdateTimestamp) / 1000).toFixed(0)}s
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SubProps {
  state: CulturalCompatibilityState;
  actions: CulturalCompatibilityActions;
  theme: CompatibilityDashboardTheme;
}

// -- Dashboard Header --

const DashboardHeader: React.FC<SubProps> = ({ state, actions, theme }) => {
  const healthLevel = state.populationHealth?.overallHealth ?? 'moderate';
  const healthColor = getHealthColor(healthLevel, theme);

  const connectionColor = (() => {
    switch (state.connectionStatus) {
      case 'connected': return theme.excellentColor;
      case 'connecting': return theme.moderateColor;
      case 'disconnected': return theme.textMuted;
      case 'error': return theme.criticalColor;
      default: return theme.textMuted;
    }
  })();

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
        {/* Health indicator dot with holographic glow */}
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: healthColor,
            display: 'inline-block',
            boxShadow: state.isLive ? `0 0 8px ${healthColor}` : 'none',
          }}
          aria-hidden="true"
        />
        <span style={{ fontWeight: 600, fontSize: `calc(0.9rem * ${theme.fontScale})` }}>
          Compatibility
        </span>
        {/* Health badge */}
        <span
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: healthColor,
            border: `1px solid ${healthColor}`,
            borderRadius: '4px',
            padding: '0.1rem 0.4rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
          role="status"
          aria-label={`Population health: ${healthLevel}`}
        >
          {healthLevel}
        </span>
        {/* Agent count */}
        {state.populationHealth && (
          <span
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              color: theme.textMuted,
            }}
          >
            {state.populationHealth.activeAgents} agents
          </span>
        )}
        {/* Connection status */}
        <span
          style={{
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            color: connectionColor,
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem',
          }}
          role="status"
          aria-label={`WebSocket: ${state.connectionStatus}`}
        >
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: connectionColor,
              display: 'inline-block',
            }}
            aria-hidden="true"
          />
          {state.connectionStatus === 'connected' ? 'WS' : state.connectionStatus}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        {/* Drift alert count badge */}
        {state.driftAlerts.length > 0 && (
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.criticalColor,
              border: `1px solid ${theme.criticalColor}`,
              borderRadius: '8px',
              padding: '0.05rem 0.35rem',
            }}
          >
            {state.driftAlerts.length} alerts
          </span>
        )}
        {/* Live/paused toggle */}
        <button
          type="button"
          onClick={() => actions.toggleLive()}
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontWeight: 500,
            fontFamily: theme.fontFamily,
            color: state.isLive ? theme.excellentColor : theme.moderateColor,
            backgroundColor: 'transparent',
            border: `1px solid ${state.isLive ? theme.excellentColor : theme.moderateColor}`,
            borderRadius: '4px',
            padding: '0.15rem 0.5rem',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          aria-label={state.isLive ? 'Pause live data feed' : 'Resume live data feed'}
          onMouseEnter={(e) => {
            const c = state.isLive ? theme.excellentColor : theme.moderateColor;
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
  const healthLevel = state.populationHealth?.overallHealth ?? 'moderate';
  const healthColor = getHealthColor(healthLevel, theme);

  return (
    <>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: healthColor,
          display: 'inline-block',
          flexShrink: 0,
          boxShadow: state.isLive ? `0 0 4px ${healthColor}` : 'none',
        }}
        aria-hidden="true"
      />
      <span style={{ fontWeight: 600, fontSize: `calc(0.8rem * ${theme.fontScale})` }}>
        Compat
      </span>
      {state.populationHealth && (
        <>
          <CompactMetric
            label="HLTH"
            value={healthLevel.toUpperCase()}
            color={healthColor}
            theme={theme}
          />
          <CompactMetric
            label="COOP"
            value={formatScore(state.populationHealth.overallCooperation)}
            color={healthColor}
            theme={theme}
          />
          <CompactMetric
            label="DIV"
            value={formatScore(state.populationHealth.diversityIndex)}
            color={theme.textSecondary}
            theme={theme}
          />
          <CompactMetric
            label="STAB"
            value={formatScore(state.populationHealth.stabilityScore)}
            color={theme.textSecondary}
            theme={theme}
          />
        </>
      )}
      {state.driftAlerts.length > 0 && (
        <span
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            color: theme.criticalColor,
            fontWeight: 600,
          }}
        >
          {state.driftAlerts.length} drift
        </span>
      )}
      <button
        type="button"
        onClick={() => actions.toggleLive()}
        style={{
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
          fontFamily: theme.fontFamily,
          color: state.isLive ? theme.excellentColor : theme.moderateColor,
          backgroundColor: 'transparent',
          border: `1px solid ${state.isLive ? theme.excellentColor : theme.moderateColor}`,
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

// -- Compact Metric --

interface CompactMetricProps {
  label: string;
  value: string;
  color: string;
  theme: CompatibilityDashboardTheme;
}

const CompactMetric: React.FC<CompactMetricProps> = ({
  label,
  value,
  color,
  theme,
}) => (
  <>
    <span style={{ color: theme.textMuted, fontSize: `calc(0.6rem * ${theme.fontScale})` }}>
      |
    </span>
    <span style={{ color: theme.textMuted, fontSize: `calc(0.55rem * ${theme.fontScale})` }}>
      {label}
    </span>
    <span style={{ color, fontSize: `calc(0.7rem * ${theme.fontScale})`, fontWeight: 600 }}>
      {value}
    </span>
  </>
);

export default CulturalCompatibilityDashboard;
