/**
 * EconomicDashboard Component
 *
 * In-world holographic economic dashboard rendering real-time virtual
 * economy health as a Layer 6 transparent VR HUD overlay.
 *
 * Architecture:
 * ```
 *   <EconomicDashboard>
 *       |
 *       |-- useEconomicDashboard() hook (or external state)
 *       |
 *       |-- Header (economy health indicator, live/paused toggle)
 *       |-- InflationPanel (gauge + sparkline)
 *       |-- GiniPanel (gauge + quintile distribution bar)
 *       |-- VelocityPanel (indicator + target band)
 *       |-- FaucetSinkPanel (balance bar + breakdown)
 *       |-- PIDControllerPanel (P/I/D terms + output trace)
 *       |-- AlertsPanel (economic health alerts)
 * ```
 *
 * Display Modes:
 *   - full: All panels in a vertical layout
 *   - compact: Minimal HUD bar with key metric values
 *   - pid-only: Only PID controller panel
 *   - overlay: Semi-transparent Layer 6 holographic overlay
 *
 * Performance Contract:
 *   - All data is pre-computed server-side and pushed at <= 10Hz.
 *   - NO classifiers, ML inference, or heavy iteration in the render path
 *     (per G.003.09: NEVER put classifiers in VR render loop, 11.1ms budget).
 *   - Dashboard rendering is pure data display: O(1) per frame, < 0.5ms total.
 *   - React state batching prevents excessive re-renders.
 *
 * Layer 6 Transparency:
 *   - Backgrounds use rgba() with configurable overlayOpacity (default 0.85).
 *   - Holographic glow effect on panel borders for spatial presence.
 *   - All text meets WCAG 2.1 AA contrast at the default opacity.
 *
 * Accessibility (WCAG 2.1 AA):
 *   - role="region" with aria-label on top-level container
 *   - role="status" for live metrics updates
 *   - role="log" for alerts list
 *   - role="meter" for gauges with aria-valuenow/min/max
 *   - All interactive elements keyboard accessible
 *   - Minimum 4.5:1 contrast ratios throughout
 *
 * @module economic-dashboard/EconomicDashboard
 */

import React, { useMemo } from 'react';
import { useEconomicDashboard, type UseEconomicDashboardConfig } from './useEconomicDashboard';
import type {
  EconDashboardTheme,
  EconDashboardDisplayMode,
  EconDashboardPanel,
  EconomicDashboardState,
  EconomicDashboardActions,
  EconomicAlert,
  InflationSnapshot,
  GiniSnapshot,
  VelocitySnapshot,
  FaucetSinkSnapshot,
  PIDControllerSnapshot,
  EconHealthState,
} from './types';
import {
  DEFAULT_ECON_DASHBOARD_THEME,
  getHealthStateColor,
  formatCurrency,
  formatPercent,
  formatRatio,
  formatGini,
  applyOverlayOpacity,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface EconomicDashboardProps {
  /** Display mode (default: 'overlay' for VR holographic HUD) */
  mode?: EconDashboardDisplayMode;
  /** Which panels to show (default: all) */
  panels?: EconDashboardPanel[];
  /** Hook configuration (used when no external state is provided) */
  config?: UseEconomicDashboardConfig;
  /** Externally managed state (bypasses internal hook) */
  externalState?: EconomicDashboardState;
  /** Externally managed actions (bypasses internal hook) */
  externalActions?: EconomicDashboardActions;
  /** Theme overrides */
  theme?: Partial<EconDashboardTheme>;
  /** Override overlay opacity (0.0 - 1.0) for Layer 6 transparency */
  overlayOpacity?: number;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Accessible label override */
  ariaLabel?: string;
}

const ALL_PANELS: EconDashboardPanel[] = [
  'inflation', 'gini', 'velocity', 'faucet-sink', 'pid', 'alerts',
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const EconomicDashboard: React.FC<EconomicDashboardProps> = ({
  mode = 'overlay',
  panels = ALL_PANELS,
  config,
  externalState,
  externalActions,
  theme: themeOverride,
  overlayOpacity,
  className,
  style,
  ariaLabel = 'Holographic Economic Dashboard',
}) => {
  // Use external state/actions if provided, otherwise use internal hook
  const [internalState, internalActions] = useEconomicDashboard(config);
  const state = externalState ?? internalState;
  const actions = externalActions ?? internalActions;

  const theme = useMemo((): EconDashboardTheme => {
    const merged = { ...DEFAULT_ECON_DASHBOARD_THEME, ...themeOverride };
    // Apply overlay opacity override if provided
    if (overlayOpacity !== undefined) {
      merged.overlayOpacity = overlayOpacity;
      merged.containerBackground = applyOverlayOpacity(
        merged.containerBackground,
        overlayOpacity,
      );
      merged.cardBackground = applyOverlayOpacity(
        merged.cardBackground,
        overlayOpacity,
      );
    }
    return merged;
  }, [themeOverride, overlayOpacity]);

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
          width: '440px',
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
      case 'pid-only':
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
        <CompactEconHUD state={state} actions={actions} theme={theme} />
      </div>
    );
  }

  // PID-only mode
  if (mode === 'pid-only' && state.pid) {
    return (
      <div className={className} style={{ ...containerStyles, ...style }} role="region" aria-label={ariaLabel}>
        <PIDControllerPanel pid={state.pid} theme={theme} />
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
      <EconDashboardHeader state={state} actions={actions} theme={theme} />

      {/* Panels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {panels.includes('inflation') && state.inflation && (
          <InflationPanel inflation={state.inflation} theme={theme} />
        )}

        {panels.includes('gini') && state.gini && (
          <GiniPanel gini={state.gini} theme={theme} />
        )}

        {panels.includes('velocity') && state.velocity && (
          <VelocityPanel velocity={state.velocity} theme={theme} />
        )}

        {panels.includes('faucet-sink') && state.faucetSink && (
          <FaucetSinkPanel faucetSink={state.faucetSink} theme={theme} />
        )}

        {panels.includes('pid') && state.pid && (
          <PIDControllerPanel pid={state.pid} theme={theme} />
        )}

        {panels.includes('alerts') && state.alerts.length > 0 && (
          <EconAlertsPanel alerts={state.alerts} actions={actions} theme={theme} />
        )}
      </div>

      {/* Staleness indicator */}
      {state.isStale && (
        <div
          style={{
            padding: '0.4rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderTop: `1px solid ${theme.warningColor}`,
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            color: theme.warningColor,
            textAlign: 'center',
          }}
          role="alert"
        >
          Data stale -- no updates for {((Date.now() - state.lastUpdateTimestamp) / 1000).toFixed(0)}s
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SubProps {
  state: EconomicDashboardState;
  actions: EconomicDashboardActions;
  theme: EconDashboardTheme;
}

// -- Dashboard Header --

const EconDashboardHeader: React.FC<SubProps> = ({ state, actions, theme }) => {
  // Overall health: worst of all metrics
  const overallHealth = computeOverallHealth(state);
  const healthColor = getHealthStateColor(overallHealth, theme);

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
          Economy
        </span>
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
          aria-label={`Economy health: ${overallHealth}`}
        >
          {overallHealth}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => actions.toggleLive()}
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontWeight: 500,
            fontFamily: theme.fontFamily,
            color: state.isLive ? theme.healthyColor : theme.warningColor,
            backgroundColor: 'transparent',
            border: `1px solid ${state.isLive ? theme.healthyColor : theme.warningColor}`,
            borderRadius: '4px',
            padding: '0.15rem 0.5rem',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          aria-label={state.isLive ? 'Pause live data feed' : 'Resume live data feed'}
        >
          {state.isLive ? 'Live' : 'Paused'}
        </button>
      </div>
    </div>
  );
};

// -- Compact HUD --

const CompactEconHUD: React.FC<SubProps> = ({ state, actions, theme }) => {
  const overallHealth = computeOverallHealth(state);
  const healthColor = getHealthStateColor(overallHealth, theme);

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
          boxShadow: `0 0 4px ${healthColor}`,
        }}
        aria-hidden="true"
      />
      <span style={{ fontWeight: 600, fontSize: `calc(0.8rem * ${theme.fontScale})` }}>
        Econ
      </span>
      {state.inflation && (
        <CompactMetric
          label="INF"
          value={formatPercent(state.inflation.currentRate)}
          color={getHealthStateColor(state.inflation.health, theme)}
          theme={theme}
        />
      )}
      {state.gini && (
        <CompactMetric
          label="GINI"
          value={formatGini(state.gini.coefficient)}
          color={getHealthStateColor(state.gini.health, theme)}
          theme={theme}
        />
      )}
      {state.velocity && (
        <CompactMetric
          label="VEL"
          value={state.velocity.currentVelocity.toFixed(2)}
          color={getHealthStateColor(state.velocity.health, theme)}
          theme={theme}
        />
      )}
      {state.faucetSink && (
        <CompactMetric
          label="F/S"
          value={formatRatio(state.faucetSink.ratio)}
          color={getHealthStateColor(state.faucetSink.health, theme)}
          theme={theme}
        />
      )}
      {state.pid && (
        <CompactMetric
          label="PID"
          value={state.pid.mode === 'automatic' ? 'AUTO' : state.pid.mode.toUpperCase()}
          color={getHealthStateColor(state.pid.health, theme)}
          theme={theme}
        />
      )}
      <button
        type="button"
        onClick={() => actions.toggleLive()}
        style={{
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
          fontFamily: theme.fontFamily,
          color: state.isLive ? theme.healthyColor : theme.warningColor,
          backgroundColor: 'transparent',
          border: `1px solid ${state.isLive ? theme.healthyColor : theme.warningColor}`,
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

// -- Inflation Panel --

interface InflationPanelProps {
  inflation: InflationSnapshot;
  theme: EconDashboardTheme;
}

const InflationPanel: React.FC<InflationPanelProps> = ({ inflation, theme }) => {
  const healthColor = getHealthStateColor(inflation.health, theme);
  const deviation = inflation.currentRate - inflation.targetRate;

  return (
    <div style={panelStyle(theme)}>
      <PanelHeader label="Inflation Rate" health={inflation.health} theme={theme} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
        <EconMetricCell
          label="Current"
          value={formatPercent(inflation.currentRate)}
          valueColor={healthColor}
          theme={theme}
        />
        <EconMetricCell
          label="Target"
          value={formatPercent(inflation.targetRate)}
          theme={theme}
        />
        <EconMetricCell
          label="Deviation"
          value={`${deviation >= 0 ? '+' : ''}${formatPercent(deviation)}`}
          valueColor={healthColor}
          theme={theme}
        />
      </div>
      {/* Gauge bar */}
      <GaugeBar
        value={inflation.currentRate}
        target={inflation.targetRate}
        min={-2}
        max={10}
        color={theme.inflationColor}
        healthColor={healthColor}
        label="Inflation rate gauge"
        theme={theme}
      />
      {/* Sparkline */}
      {inflation.trend.length > 1 && (
        <MiniSparkline data={inflation.trend} theme={theme} />
      )}
    </div>
  );
};

// -- Gini Panel --

interface GiniPanelProps {
  gini: GiniSnapshot;
  theme: EconDashboardTheme;
}

const GiniPanel: React.FC<GiniPanelProps> = ({ gini, theme }) => {
  const healthColor = getHealthStateColor(gini.health, theme);

  return (
    <div style={panelStyle(theme)}>
      <PanelHeader label="Gini Coefficient" health={gini.health} theme={theme} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
        <EconMetricCell
          label="Coefficient"
          value={formatGini(gini.coefficient)}
          valueColor={healthColor}
          theme={theme}
        />
        <EconMetricCell
          label="Ceiling"
          value={formatGini(gini.targetCeiling)}
          theme={theme}
        />
        <EconMetricCell
          label="Entities"
          value={gini.entityCount.toLocaleString()}
          theme={theme}
        />
      </div>
      {/* Gini gauge */}
      <GaugeBar
        value={gini.coefficient}
        target={gini.targetCeiling}
        min={0}
        max={1}
        color={theme.giniColor}
        healthColor={healthColor}
        label="Gini coefficient gauge"
        theme={theme}
      />
      {/* Wealth quintile distribution */}
      <div style={{ marginTop: '0.4rem' }}>
        <div
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            color: theme.textMuted,
            marginBottom: '0.2rem',
          }}
        >
          Wealth Distribution (Quintiles)
        </div>
        <div
          style={{
            display: 'flex',
            height: '6px',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
          role="img"
          aria-label={`Wealth quintiles: ${gini.quintiles.map((q, i) => `Q${i + 1}: ${q.toFixed(1)}%`).join(', ')}`}
        >
          {gini.quintiles.map((q, i) => (
            <div
              key={i}
              style={{
                width: `${q}%`,
                backgroundColor: interpolateColor(
                  theme.healthyColor,
                  theme.criticalColor,
                  i / 4,
                ),
                transition: 'width 0.3s ease',
              }}
              title={`Q${i + 1}: ${q.toFixed(1)}%`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// -- Velocity Panel --

interface VelocityPanelProps {
  velocity: VelocitySnapshot;
  theme: EconDashboardTheme;
}

const VelocityPanel: React.FC<VelocityPanelProps> = ({ velocity, theme }) => {
  const healthColor = getHealthStateColor(velocity.health, theme);

  return (
    <div style={panelStyle(theme)}>
      <PanelHeader label="Currency Velocity" health={velocity.health} theme={theme} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <EconMetricCell
          label="Velocity"
          value={velocity.currentVelocity.toFixed(3)}
          valueColor={healthColor}
          theme={theme}
        />
        <EconMetricCell
          label="Target Band"
          value={`${velocity.targetBand[0].toFixed(2)} - ${velocity.targetBand[1].toFixed(2)}`}
          theme={theme}
        />
        <EconMetricCell
          label="Tx Volume"
          value={formatCurrency(velocity.transactionVolume)}
          theme={theme}
        />
        <EconMetricCell
          label="Money Supply"
          value={formatCurrency(velocity.moneySupply)}
          theme={theme}
        />
      </div>
      {/* Velocity band gauge */}
      <BandGauge
        value={velocity.currentVelocity}
        bandMin={velocity.targetBand[0]}
        bandMax={velocity.targetBand[1]}
        gaugeMin={0}
        gaugeMax={velocity.targetBand[1] * 2}
        color={theme.velocityColor}
        healthColor={healthColor}
        label="Currency velocity gauge"
        theme={theme}
      />
      {velocity.trend.length > 1 && (
        <MiniSparkline data={velocity.trend} theme={theme} />
      )}
    </div>
  );
};

// -- Faucet/Sink Panel --

interface FaucetSinkPanelProps {
  faucetSink: FaucetSinkSnapshot;
  theme: EconDashboardTheme;
}

const FaucetSinkPanel: React.FC<FaucetSinkPanelProps> = ({ faucetSink, theme }) => {
  const healthColor = getHealthStateColor(faucetSink.health, theme);
  const total = faucetSink.faucetTotal + faucetSink.sinkTotal;
  const faucetPct = total > 0 ? (faucetSink.faucetTotal / total) * 100 : 50;

  return (
    <div style={panelStyle(theme)}>
      <PanelHeader label="Faucet / Sink Ratio" health={faucetSink.health} theme={theme} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
        <EconMetricCell
          label="Faucet"
          value={formatCurrency(faucetSink.faucetTotal)}
          valueColor={theme.faucetColor}
          theme={theme}
        />
        <EconMetricCell
          label="Sink"
          value={formatCurrency(faucetSink.sinkTotal)}
          valueColor={theme.sinkColor}
          theme={theme}
        />
        <EconMetricCell
          label="Ratio"
          value={formatRatio(faucetSink.ratio)}
          valueColor={healthColor}
          theme={theme}
        />
      </div>
      {/* Balance bar */}
      <div style={{ marginTop: '0.4rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            color: theme.textMuted,
            marginBottom: '0.15rem',
          }}
        >
          <span style={{ color: theme.faucetColor }}>Faucet</span>
          <span style={{ color: theme.sinkColor }}>Sink</span>
        </div>
        <div
          style={{
            display: 'flex',
            height: '6px',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
          role="meter"
          aria-label="Faucet to sink balance"
          aria-valuenow={Math.round(faucetSink.ratio * 100)}
          aria-valuemin={0}
          aria-valuemax={200}
        >
          <div
            style={{
              width: `${faucetPct}%`,
              backgroundColor: theme.faucetColor,
              transition: 'width 0.3s ease',
            }}
          />
          <div
            style={{
              width: `${100 - faucetPct}%`,
              backgroundColor: theme.sinkColor,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
      {faucetSink.trend.length > 1 && (
        <MiniSparkline data={faucetSink.trend} theme={theme} />
      )}
    </div>
  );
};

// -- PID Controller Panel --

interface PIDControllerPanelProps {
  pid: PIDControllerSnapshot;
  theme: EconDashboardTheme;
}

const PIDControllerPanel: React.FC<PIDControllerPanelProps> = ({ pid, theme }) => {
  const healthColor = getHealthStateColor(pid.health, theme);
  const modeColor = pid.mode === 'automatic'
    ? theme.healthyColor
    : pid.mode === 'clamped'
      ? theme.cautionColor
      : pid.mode === 'manual'
        ? theme.warningColor
        : theme.criticalColor;

  return (
    <div style={panelStyle(theme)}>
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
            PID Controller
          </span>
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              color: theme.textMuted,
            }}
          >
            ({pid.controlVariable})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: modeColor,
              border: `1px solid ${modeColor}`,
              borderRadius: '3px',
              padding: '0.05rem 0.3rem',
              textTransform: 'uppercase',
            }}
          >
            {pid.mode}
          </span>
          <HealthDot health={pid.health} theme={theme} />
        </div>
      </div>

      {/* Setpoint vs Process Variable */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
        <EconMetricCell
          label="Setpoint"
          value={pid.setpoint.toFixed(4)}
          valueColor={theme.pidSetpointColor}
          theme={theme}
        />
        <EconMetricCell
          label="Process Var"
          value={pid.processVariable.toFixed(4)}
          theme={theme}
        />
        <EconMetricCell
          label="Error"
          value={pid.error.toFixed(4)}
          valueColor={healthColor}
          theme={theme}
        />
      </div>

      {/* P/I/D Terms */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0.5rem',
          marginTop: '0.4rem',
        }}
      >
        <PIDTermCell label="P" gain={pid.kp} term={pid.pTerm} theme={theme} />
        <PIDTermCell
          label="I"
          gain={pid.ki}
          term={pid.iTerm}
          warning={pid.integralWindup}
          theme={theme}
        />
        <PIDTermCell label="D" gain={pid.kd} term={pid.dTerm} theme={theme} />
      </div>

      {/* Output */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.4rem' }}>
        <EconMetricCell
          label="Output"
          value={pid.output.toFixed(4)}
          valueColor={theme.pidOutputColor}
          theme={theme}
        />
        <EconMetricCell
          label="Clamped Output"
          value={`${pid.clampedOutput.toFixed(4)} [${pid.outputBounds[0]}, ${pid.outputBounds[1]}]`}
          valueColor={pid.output !== pid.clampedOutput ? theme.cautionColor : undefined}
          theme={theme}
        />
      </div>

      {/* Integral windup warning */}
      {pid.integralWindup && (
        <div
          style={{
            marginTop: '0.4rem',
            padding: '0.25rem 0.5rem',
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            border: `1px solid ${theme.cautionColor}`,
            borderRadius: '4px',
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            color: theme.cautionColor,
          }}
          role="alert"
        >
          Integral windup detected -- iTerm saturated at {pid.iTerm.toFixed(4)}
        </div>
      )}

      {pid.outputTrend.length > 1 && (
        <MiniSparkline data={pid.outputTrend} theme={theme} />
      )}
    </div>
  );
};

// -- Alerts Panel --

interface EconAlertsPanelProps {
  alerts: EconomicAlert[];
  actions: EconomicDashboardActions;
  theme: EconDashboardTheme;
}

const EconAlertsPanel: React.FC<EconAlertsPanelProps> = ({ alerts, actions, theme }) => {
  const severityColor = (severity: EconomicAlert['severity']): string => {
    switch (severity) {
      case 'critical': return theme.criticalColor;
      case 'warning': return theme.warningColor;
      case 'info': return theme.textSecondary;
      default: return theme.textMuted;
    }
  };

  return (
    <div style={panelStyle(theme)}>
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
          Economic Alerts ({alerts.length})
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
            aria-label="Clear all economic alerts"
          >
            Clear All
          </button>
        )}
      </div>
      <div
        role="log"
        aria-label="Economic health alerts"
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

// -- Panel Style --

function panelStyle(theme: EconDashboardTheme): React.CSSProperties {
  return {
    padding: '0.75rem 1rem',
    borderBottom: `1px solid ${theme.borderColor}`,
  };
}

// -- Panel Header --

interface PanelHeaderProps {
  label: string;
  health: EconHealthState;
  theme: EconDashboardTheme;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({ label, health, theme }) => (
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
      {label}
    </span>
    <HealthDot health={health} theme={theme} />
  </div>
);

// -- Health Dot --

interface HealthDotProps {
  health: EconHealthState;
  theme: EconDashboardTheme;
}

const HealthDot: React.FC<HealthDotProps> = ({ health, theme }) => {
  const color = getHealthStateColor(health, theme);
  return (
    <span
      style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: color,
        display: 'inline-block',
        boxShadow: `0 0 4px ${color}`,
      }}
      title={health}
      aria-label={`Health: ${health}`}
    />
  );
};

// -- Metric Cell --

interface EconMetricCellProps {
  label: string;
  value: string;
  valueColor?: string;
  theme: EconDashboardTheme;
}

const EconMetricCell: React.FC<EconMetricCellProps> = ({ label, value, valueColor, theme }) => (
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

// -- Compact Metric (for HUD bar) --

interface CompactMetricProps {
  label: string;
  value: string;
  color: string;
  theme: EconDashboardTheme;
}

const CompactMetric: React.FC<CompactMetricProps> = ({ label, value, color, theme }) => (
  <>
    <span style={{ color: theme.textMuted, fontSize: `calc(0.6rem * ${theme.fontScale})` }}>|</span>
    <span style={{ color: theme.textMuted, fontSize: `calc(0.6rem * ${theme.fontScale})` }}>{label}</span>
    <span style={{ color, fontSize: `calc(0.75rem * ${theme.fontScale})`, fontWeight: 600 }}>
      {value}
    </span>
  </>
);

// -- PID Term Cell --

interface PIDTermCellProps {
  label: string;
  gain: number;
  term: number;
  warning?: boolean;
  theme: EconDashboardTheme;
}

const PIDTermCell: React.FC<PIDTermCellProps> = ({ label, gain, term, warning, theme }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.1rem',
      padding: '0.25rem 0.4rem',
      borderRadius: '4px',
      backgroundColor: warning ? 'rgba(234, 179, 8, 0.08)' : 'rgba(255,255,255,0.02)',
      border: warning ? `1px solid ${theme.cautionColor}` : `1px solid ${theme.borderColor}`,
    }}
  >
    <span
      style={{
        fontSize: `calc(0.6rem * ${theme.fontScale})`,
        color: warning ? theme.cautionColor : theme.textMuted,
        fontWeight: 600,
      }}
    >
      {label} (K={gain.toFixed(3)})
    </span>
    <span
      style={{
        fontSize: `calc(0.75rem * ${theme.fontScale})`,
        fontWeight: 600,
        color: warning ? theme.cautionColor : theme.textPrimary,
      }}
    >
      {term.toFixed(4)}
    </span>
  </div>
);

// -- Gauge Bar --

interface GaugeBarProps {
  value: number;
  target: number;
  min: number;
  max: number;
  color: string;
  healthColor: string;
  label: string;
  theme: EconDashboardTheme;
}

const GaugeBar: React.FC<GaugeBarProps> = ({ value, target, min, max, color, healthColor, label, theme }) => {
  const range = max - min;
  const valuePct = Math.max(0, Math.min(100, ((value - min) / range) * 100));
  const targetPct = Math.max(0, Math.min(100, ((target - min) / range) * 100));

  return (
    <div style={{ marginTop: '0.4rem', position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: `calc(0.55rem * ${theme.fontScale})`,
          color: theme.textMuted,
          marginBottom: '0.15rem',
        }}
      >
        <span>{min}</span>
        <span>{max}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={Math.round(value * 100) / 100}
        aria-valuemin={min}
        aria-valuemax={max}
        style={{
          height: '6px',
          borderRadius: '3px',
          backgroundColor: theme.borderColor,
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {/* Value fill */}
        <div
          style={{
            height: '100%',
            width: `${valuePct}%`,
            borderRadius: '3px',
            backgroundColor: color,
            transition: 'width 0.3s ease',
            opacity: 0.7,
          }}
        />
        {/* Target marker */}
        <div
          style={{
            position: 'absolute',
            left: `${targetPct}%`,
            top: '-2px',
            width: '2px',
            height: '10px',
            backgroundColor: healthColor,
            borderRadius: '1px',
          }}
          title={`Target: ${target}`}
        />
      </div>
    </div>
  );
};

// -- Band Gauge (for velocity with target band) --

interface BandGaugeProps {
  value: number;
  bandMin: number;
  bandMax: number;
  gaugeMin: number;
  gaugeMax: number;
  color: string;
  healthColor: string;
  label: string;
  theme: EconDashboardTheme;
}

const BandGauge: React.FC<BandGaugeProps> = ({
  value, bandMin, bandMax, gaugeMin, gaugeMax, color, healthColor, label, theme,
}) => {
  const range = gaugeMax - gaugeMin;
  const valuePct = Math.max(0, Math.min(100, ((value - gaugeMin) / range) * 100));
  const bandMinPct = Math.max(0, Math.min(100, ((bandMin - gaugeMin) / range) * 100));
  const bandMaxPct = Math.max(0, Math.min(100, ((bandMax - gaugeMin) / range) * 100));

  return (
    <div style={{ marginTop: '0.4rem', position: 'relative' }}>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={Math.round(value * 1000) / 1000}
        aria-valuemin={gaugeMin}
        aria-valuemax={gaugeMax}
        style={{
          height: '6px',
          borderRadius: '3px',
          backgroundColor: theme.borderColor,
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {/* Target band shading */}
        <div
          style={{
            position: 'absolute',
            left: `${bandMinPct}%`,
            width: `${bandMaxPct - bandMinPct}%`,
            height: '100%',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            borderRadius: '3px',
          }}
        />
        {/* Value indicator */}
        <div
          style={{
            position: 'absolute',
            left: `${valuePct}%`,
            top: '-3px',
            width: '4px',
            height: '12px',
            backgroundColor: healthColor,
            borderRadius: '2px',
            transform: 'translateX(-2px)',
            boxShadow: `0 0 4px ${healthColor}`,
            transition: 'left 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};

// -- Mini Sparkline (SVG-based, O(1) render with pre-computed data) --

interface MiniSparklineProps {
  data: { timestamp: number; value: number }[];
  theme: EconDashboardTheme;
}

const MiniSparkline: React.FC<MiniSparklineProps> = ({ data, theme }) => {
  if (data.length < 2) return null;

  const width = 200;
  const height = 24;
  const padding = 2;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d.value - minVal) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const polylinePoints = points.join(' ');
  const areaPoints = `${padding},${height - padding} ${polylinePoints} ${width - padding},${height - padding}`;

  return (
    <div style={{ marginTop: '0.3rem' }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
        role="img"
        aria-label="Metric trend sparkline"
      >
        {/* Area fill */}
        <polygon
          points={areaPoints}
          fill={theme.sparklineFillColor}
        />
        {/* Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={theme.sparklineColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Compute overall economy health from all metric states.
 * Returns the worst health state among all populated metrics.
 */
function computeOverallHealth(state: EconomicDashboardState): EconHealthState {
  const healths: EconHealthState[] = [];
  if (state.inflation) healths.push(state.inflation.health);
  if (state.gini) healths.push(state.gini.health);
  if (state.velocity) healths.push(state.velocity.health);
  if (state.faucetSink) healths.push(state.faucetSink.health);
  if (state.pid) healths.push(state.pid.health);

  if (healths.length === 0) return 'healthy';

  const priority: Record<EconHealthState, number> = {
    critical: 3,
    warning: 2,
    caution: 1,
    healthy: 0,
  };

  let worst: EconHealthState = 'healthy';
  for (const h of healths) {
    if (priority[h] > priority[worst]) {
      worst = h;
    }
  }
  return worst;
}

/**
 * Simple linear interpolation between two hex colours.
 * Used for the quintile gradient in the Gini panel.
 * t = 0 returns colorA, t = 1 returns colorB.
 */
function interpolateColor(colorA: string, colorB: string, t: number): string {
  const parseHex = (hex: string) => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  };

  const a = parseHex(colorA);
  const b = parseHex(colorB);

  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);

  return `rgb(${r}, ${g}, ${bl})`;
}

export default EconomicDashboard;
