/**
 * GRPODashboard Component
 *
 * Main page composing all GRPO training monitoring components in a
 * responsive CSS grid layout.
 *
 * Layout (desktop):
 * ```
 *   +---------------------------+------------------+
 *   |   Reward Curve Chart      | Training Controls|
 *   +---------------------------+------------------+
 *   |   KL Divergence Monitor   | Forgetting Panel |
 *   +---------------------------+------------------+
 *   |   Completion Sampler      |                  |
 *   +---------------------------+------------------+
 * ```
 *
 * On narrow viewports (<768px) the grid collapses to a single column.
 *
 * Architecture:
 *   Uses useGRPOData hook for state management (or accepts external
 *   state/actions for testing and integration).
 *
 * Accessibility (WCAG 2.1 AA):
 *   - role="main" on top-level container
 *   - Each panel has role="region" with aria-label
 *   - All interactive elements keyboard accessible
 *   - Minimum 4.5:1 contrast ratios throughout
 *
 * @module grpo-training-dashboard/GRPODashboard
 */

import React, { useMemo } from 'react';
import { useGRPOData, type UseGRPODataConfig } from './useGRPOData';
import { RewardCurveChart } from './RewardCurveChart';
import { KLDivergenceMonitor } from './KLDivergenceMonitor';
import { CompletionSampler } from './CompletionSampler';
import { ForgettingPanel } from './ForgettingPanel';
import { TrainingControls } from './TrainingControls';
import type {
  GRPOTheme,
  GRPODashboardState,
  GRPODashboardActions,
} from './types';
import { DEFAULT_GRPO_THEME } from './types';

// =============================================================================
// PROPS
// =============================================================================

export interface GRPODashboardProps {
  /** Hook configuration (used when no external state is provided) */
  config?: UseGRPODataConfig;
  /** Externally managed state (bypasses internal hook) */
  externalState?: GRPODashboardState;
  /** Externally managed actions (bypasses internal hook) */
  externalActions?: GRPODashboardActions;
  /** Beta threshold for KL monitor (default: 0.04) */
  betaThreshold?: number;
  /** Theme overrides */
  theme?: Partial<GRPOTheme>;
  /** Custom CSS class */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Accessible label override */
  ariaLabel?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const GRPODashboard: React.FC<GRPODashboardProps> = ({
  config,
  externalState,
  externalActions,
  betaThreshold = 0.04,
  theme: themeOverride,
  className,
  style,
  ariaLabel = 'GRPO Training Dashboard',
}) => {
  // Use external state/actions if provided, otherwise use internal hook
  const [internalState, internalActions] = useGRPOData(config);
  const state = externalState ?? internalState;
  const actions = externalActions ?? internalActions;

  const theme = useMemo(
    () => ({ ...DEFAULT_GRPO_THEME, ...themeOverride }),
    [themeOverride],
  );

  return (
    <div
      className={className}
      style={{
        fontFamily: theme.fontFamily,
        color: theme.textPrimary,
        backgroundColor: theme.containerBackground,
        borderRadius: theme.borderRadius,
        padding: '1rem',
        minHeight: '100vh',
        ...style,
      }}
      role="main"
      aria-label={ariaLabel}
    >
      {/* Dashboard header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1
            style={{
              fontSize: `calc(1.2rem * ${theme.fontScale})`,
              fontWeight: 700,
              color: theme.textPrimary,
              margin: 0,
              fontFamily: theme.fontFamily,
            }}
          >
            GRPO Training Monitor
          </h1>
          <span
            style={{
              fontSize: `calc(0.65rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: state.connected ? theme.successColor : theme.dangerColor,
              border: `1px solid ${state.connected ? theme.successColor : theme.dangerColor}`,
              borderRadius: '4px',
              padding: '0.1rem 0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            role="status"
            aria-label={state.connected ? 'Connected to training server' : 'Disconnected from training server'}
          >
            {state.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {!state.connected && (
          <button
            type="button"
            onClick={actions.reconnect}
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              fontWeight: 600,
              fontFamily: theme.fontFamily,
              color: theme.accentColor,
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              border: `1px solid ${theme.accentColor}`,
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              cursor: 'pointer',
            }}
            aria-label="Reconnect to training server"
          >
            Reconnect
          </button>
        )}
      </div>

      {/* Responsive CSS Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
          gap: '0.75rem',
        }}
      >
        {/* Row 1: Reward Curves + Training Controls */}
        <RewardCurveChart
          data={state.rewardHistory}
          theme={themeOverride}
          style={{ minHeight: '380px' }}
        />
        <TrainingControls
          status={state.trainingStatus}
          params={state.trainingParams}
          progress={state.progress}
          gpuStats={state.gpuStats}
          connected={state.connected}
          actions={actions}
          theme={themeOverride}
        />

        {/* Row 2: KL Divergence + Forgetting Panel */}
        <KLDivergenceMonitor
          data={state.klHistory}
          betaThreshold={betaThreshold}
          theme={themeOverride}
          style={{ minHeight: '260px' }}
        />
        <ForgettingPanel
          metrics={state.forgettingMetrics}
          theme={themeOverride}
        />

        {/* Row 3: Completion Sampler (spans full width) */}
        <div style={{ gridColumn: '1 / -1' }}>
          <CompletionSampler
            groups={state.completionGroups}
            theme={themeOverride}
          />
        </div>
      </div>

      {/* Responsive collapse for narrow screens */}
      <style>{`
        @media (max-width: 768px) {
          [role="main"][aria-label="${ariaLabel}"] > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default GRPODashboard;
