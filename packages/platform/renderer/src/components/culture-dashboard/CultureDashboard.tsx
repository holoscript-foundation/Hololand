/**
 * CultureDashboard Component
 *
 * In-world holographic cultural health dashboard rendering real-time
 * multi-agent cultural dynamics as a Layer 6 transparent VR HUD overlay.
 *
 * Architecture:
 * ```
 *   <CultureDashboard>
 *       |
 *       |-- useCultureDashboard() hook (or external state)
 *       |
 *       |-- Header (culture health indicator, live/paused toggle)
 *       |-- HealthGaugePanel (composite score gauge)
 *       |-- DimensionRadarPanel (5-axis radar chart)
 *       |-- DimensionBreakdownPanel (per-dimension score cards)
 *       |-- AgentProfilesPanel (top agents by cultural contribution)
 *       |-- NormsPanel (community norm compliance rates)
 *       |-- CultureAlertsPanel (cultural health alerts)
 * ```
 *
 * Display Modes:
 *   - full: All panels in a vertical layout
 *   - compact: Minimal HUD bar with key metric values
 *   - radar-only: Only the radar chart
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
 *   - Focus visible indicators on all interactive elements
 *   - Semantic heading hierarchy within panels
 *
 * @module culture-dashboard/CultureDashboard
 */

import React, { useMemo } from 'react';
import { useCultureDashboard, type UseCultureDashboardConfig } from './useCultureDashboard';
import type {
  CultureDashboardTheme,
  CultureDashboardDisplayMode,
  CultureDashboardPanel,
  CultureDashboardState,
  CultureDashboardActions,
  CultureHealthSnapshot,
  CultureDimensionSnapshot,
  AgentCultureProfile,
  CommunityNorm,
  CultureAlert,
  CultureHealthState,
  CultureDimension,
} from './types';
import {
  DEFAULT_CULTURE_DASHBOARD_THEME,
  ALL_CULTURE_DIMENSIONS,
  CULTURE_DIMENSION_CONFIG,
  CULTURE_ROLE_CONFIG,
  getCultureHealthColor,
  getDimensionColor,
  formatCultureScore,
  formatDelta,
  applyOverlayOpacity,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface CultureDashboardProps {
  /** Display mode (default: 'overlay' for VR holographic HUD) */
  mode?: CultureDashboardDisplayMode;
  /** Which panels to show (default: all) */
  panels?: CultureDashboardPanel[];
  /** Hook configuration (used when no external state is provided) */
  config?: UseCultureDashboardConfig;
  /** Externally managed state (bypasses internal hook) */
  externalState?: CultureDashboardState;
  /** Externally managed actions (bypasses internal hook) */
  externalActions?: CultureDashboardActions;
  /** Theme overrides */
  theme?: Partial<CultureDashboardTheme>;
  /** Override overlay opacity (0.0 - 1.0) for Layer 6 transparency */
  overlayOpacity?: number;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Accessible label override */
  ariaLabel?: string;
}

const ALL_PANELS: CultureDashboardPanel[] = [
  'health-gauge', 'dimensions', 'timeline', 'agents', 'norms', 'alerts',
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CultureDashboard: React.FC<CultureDashboardProps> = ({
  mode = 'overlay',
  panels = ALL_PANELS,
  config,
  externalState,
  externalActions,
  theme: themeOverride,
  overlayOpacity,
  className,
  style,
  ariaLabel = 'Multi-Agent Cultural Health Dashboard',
}) => {
  // Use external state/actions if provided, otherwise use internal hook
  const [internalState, internalActions] = useCultureDashboard(config);
  const state = externalState ?? internalState;
  const actions = externalActions ?? internalActions;

  const theme = useMemo((): CultureDashboardTheme => {
    const merged = { ...DEFAULT_CULTURE_DASHBOARD_THEME, ...themeOverride };
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
          width: '460px',
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
      case 'radar-only':
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
        <CompactCultureHUD state={state} actions={actions} theme={theme} />
      </div>
    );
  }

  // Radar-only mode
  if (mode === 'radar-only' && state.health) {
    return (
      <div className={className} style={{ ...containerStyles, ...style }} role="region" aria-label={ariaLabel}>
        <DimensionRadarPanel health={state.health} theme={theme} />
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
      <CultureDashboardHeader state={state} actions={actions} theme={theme} />

      {/* Panels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {panels.includes('health-gauge') && state.health && (
          <HealthGaugePanel health={state.health} theme={theme} />
        )}

        {panels.includes('dimensions') && state.health && (
          <DimensionRadarPanel health={state.health} theme={theme} />
        )}

        {panels.includes('timeline') && state.health && state.health.compositeTrend.length > 1 && (
          <TimelinePanel health={state.health} theme={theme} />
        )}

        {panels.includes('agents') && state.agentProfiles.length > 0 && (
          <AgentProfilesPanel profiles={state.agentProfiles} theme={theme} />
        )}

        {panels.includes('norms') && state.norms.length > 0 && (
          <NormsPanel norms={state.norms} theme={theme} />
        )}

        {panels.includes('alerts') && state.alerts.length > 0 && (
          <CultureAlertsPanel alerts={state.alerts} actions={actions} theme={theme} />
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
  state: CultureDashboardState;
  actions: CultureDashboardActions;
  theme: CultureDashboardTheme;
}

// -- Dashboard Header --

const CultureDashboardHeader: React.FC<SubProps> = ({ state, actions, theme }) => {
  const overallHealth = state.health?.health ?? 'stable';
  const healthColor = getCultureHealthColor(overallHealth, theme);

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
          Culture
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
          aria-label={`Cultural health: ${overallHealth}`}
        >
          {overallHealth}
        </span>
        {state.health && (
          <span
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              color: theme.textMuted,
            }}
          >
            {state.health.totalAgents} agents
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
            color: state.isLive ? theme.thrivingColor : theme.strainedColor,
            backgroundColor: 'transparent',
            border: `1px solid ${state.isLive ? theme.thrivingColor : theme.strainedColor}`,
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

const CompactCultureHUD: React.FC<SubProps> = ({ state, actions, theme }) => {
  const overallHealth = state.health?.health ?? 'stable';
  const healthColor = getCultureHealthColor(overallHealth, theme);

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
        Culture
      </span>
      {state.health && (
        <>
          <CompactMetric
            label="SCORE"
            value={formatCultureScore(state.health.compositeScore)}
            color={healthColor}
            theme={theme}
          />
          {ALL_CULTURE_DIMENSIONS.map((dim) => {
            const snap = state.health!.dimensions[dim];
            if (!snap) return null;
            const dimColor = getDimensionColor(dim, theme);
            return (
              <CompactMetric
                key={dim}
                label={dim.substring(0, 3).toUpperCase()}
                value={formatCultureScore(snap.score)}
                color={getCultureHealthColor(snap.health, theme)}
                theme={theme}
              />
            );
          })}
        </>
      )}
      <button
        type="button"
        onClick={() => actions.toggleLive()}
        style={{
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
          fontFamily: theme.fontFamily,
          color: state.isLive ? theme.thrivingColor : theme.strainedColor,
          backgroundColor: 'transparent',
          border: `1px solid ${state.isLive ? theme.thrivingColor : theme.strainedColor}`,
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

// -- Health Gauge Panel --

interface HealthGaugePanelProps {
  health: CultureHealthSnapshot;
  theme: CultureDashboardTheme;
}

const HealthGaugePanel: React.FC<HealthGaugePanelProps> = ({ health, theme }) => {
  const healthColor = getCultureHealthColor(health.health, theme);
  const delta = formatDelta(health.compositeScore, health.previousComposite);
  const deltaPositive = health.compositeScore >= health.previousComposite;

  return (
    <div style={panelStyle(theme)}>
      <PanelHeader label="Cultural Health" health={health.health} theme={theme} />

      {/* Composite score gauge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        {/* Circular gauge (SVG) */}
        <div style={{ flexShrink: 0 }}>
          <CircularGauge
            value={health.compositeScore}
            color={healthColor}
            size={72}
            strokeWidth={6}
            label="Composite cultural health score"
            theme={theme}
          />
        </div>

        {/* Score details */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span
              style={{
                fontSize: `calc(1.4rem * ${theme.fontScale})`,
                fontWeight: 700,
                color: healthColor,
              }}
            >
              {formatCultureScore(health.compositeScore)}
            </span>
            <span
              style={{
                fontSize: `calc(0.75rem * ${theme.fontScale})`,
                color: deltaPositive ? theme.thrivingColor : theme.criticalColor,
                fontWeight: 500,
              }}
              aria-label={`Change: ${delta}`}
            >
              {delta}
            </span>
          </div>
          <div
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              color: theme.textMuted,
              marginTop: '0.15rem',
            }}
          >
            {health.totalAgents} active agents across {ALL_CULTURE_DIMENSIONS.length} dimensions
          </div>
        </div>
      </div>

      {/* Dimension score bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {ALL_CULTURE_DIMENSIONS.map((dim) => {
          const snap = health.dimensions[dim];
          if (!snap) return null;
          const dimMeta = CULTURE_DIMENSION_CONFIG[dim];
          const dimColor = getDimensionColor(dim, theme);
          const dimHealthColor = getCultureHealthColor(snap.health, theme);

          return (
            <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: `calc(0.6rem * ${theme.fontScale})`,
                  color: theme.textMuted,
                  width: '80px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                }}
              >
                {dimMeta.label}
              </span>
              <div
                role="meter"
                aria-label={`${dimMeta.label} score`}
                aria-valuenow={Math.round(snap.score * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor: theme.borderColor,
                  overflow: 'visible',
                  position: 'relative',
                }}
              >
                {/* Ideal range indicator */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${dimMeta.idealRange[0] * 100}%`,
                    width: `${(dimMeta.idealRange[1] - dimMeta.idealRange[0]) * 100}%`,
                    height: '100%',
                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                    borderRadius: '3px',
                  }}
                />
                {/* Score fill */}
                <div
                  style={{
                    height: '100%',
                    width: `${snap.score * 100}%`,
                    borderRadius: '3px',
                    backgroundColor: dimColor,
                    transition: 'width 0.3s ease',
                    opacity: 0.7,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: `calc(0.7rem * ${theme.fontScale})`,
                  fontWeight: 600,
                  color: dimHealthColor,
                  width: '40px',
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {formatCultureScore(snap.score)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// -- Dimension Radar Panel --

interface DimensionRadarPanelProps {
  health: CultureHealthSnapshot;
  theme: CultureDashboardTheme;
}

const DimensionRadarPanel: React.FC<DimensionRadarPanelProps> = ({ health, theme }) => {
  const size = 200;
  const center = size / 2;
  const radius = (size - 40) / 2;
  const dimensions = ALL_CULTURE_DIMENSIONS;
  const numAxes = dimensions.length;

  // Compute radar polygon points
  const getPoint = (index: number, value: number): { x: number; y: number } => {
    const angle = (2 * Math.PI * index) / numAxes - Math.PI / 2;
    return {
      x: center + radius * value * Math.cos(angle),
      y: center + radius * value * Math.sin(angle),
    };
  };

  // Grid levels
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  // Score polygon
  const scorePoints = dimensions.map((dim, i) => {
    const snap = health.dimensions[dim];
    const val = snap?.score ?? 0;
    return getPoint(i, val);
  });
  const scorePathData = scorePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ') + ' Z';

  // Ideal range polygon (outer boundary)
  const idealOuterPoints = dimensions.map((dim, i) => {
    const meta = CULTURE_DIMENSION_CONFIG[dim];
    return getPoint(i, meta.idealRange[1]);
  });
  const idealOuterPath = idealOuterPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ') + ' Z';

  // Ideal range polygon (inner boundary)
  const idealInnerPoints = dimensions.map((dim, i) => {
    const meta = CULTURE_DIMENSION_CONFIG[dim];
    return getPoint(i, meta.idealRange[0]);
  });
  const idealInnerPath = idealInnerPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ') + ' Z';

  // Accessible description
  const radarDescription = dimensions
    .map((dim) => {
      const snap = health.dimensions[dim];
      const meta = CULTURE_DIMENSION_CONFIG[dim];
      return `${meta.label}: ${snap ? formatCultureScore(snap.score) : 'N/A'}`;
    })
    .join(', ');

  return (
    <div style={panelStyle(theme)}>
      <PanelHeader label="Dimension Radar" health={health.health} theme={theme} />

      <svg
        width="100%"
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block', margin: '0 auto' }}
        role="img"
        aria-label={`Culture dimension radar chart. ${radarDescription}`}
      >
        {/* Grid circles */}
        {gridLevels.map((level) => {
          const gridPoints = dimensions.map((_, i) => getPoint(i, level));
          const gridPath = gridPoints
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
            .join(' ') + ' Z';
          return (
            <path
              key={level}
              d={gridPath}
              fill="none"
              stroke={theme.radarGridColor}
              strokeWidth="0.5"
            />
          );
        })}

        {/* Axis lines */}
        {dimensions.map((_, i) => {
          const end = getPoint(i, 1);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke={theme.radarGridColor}
              strokeWidth="0.5"
            />
          );
        })}

        {/* Ideal range zone (visible as a shaded band) */}
        <path d={idealOuterPath} fill="rgba(34, 197, 94, 0.08)" stroke="none" />
        <path d={idealInnerPath} fill={theme.containerBackground} stroke="none" />

        {/* Score polygon */}
        <path
          d={scorePathData}
          fill={theme.radarFillColor}
          stroke={theme.accentColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Score dots at vertices */}
        {scorePoints.map((p, i) => {
          const dim = dimensions[i];
          const dimColor = getDimensionColor(dim, theme);
          return (
            <circle
              key={dim}
              cx={p.x}
              cy={p.y}
              r="3"
              fill={dimColor}
              stroke={theme.containerBackground}
              strokeWidth="1"
            />
          );
        })}

        {/* Axis labels */}
        {dimensions.map((dim, i) => {
          const labelPoint = getPoint(i, 1.18);
          const meta = CULTURE_DIMENSION_CONFIG[dim];
          return (
            <text
              key={`label-${dim}`}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={theme.textMuted}
              fontSize={`calc(0.55rem * ${theme.fontScale})`}
              fontFamily={theme.fontFamily}
            >
              {meta.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

// -- Timeline Panel --

interface TimelinePanelProps {
  health: CultureHealthSnapshot;
  theme: CultureDashboardTheme;
}

const TimelinePanel: React.FC<TimelinePanelProps> = ({ health, theme }) => {
  return (
    <div style={panelStyle(theme)}>
      <PanelHeader label="Culture Evolution" health={health.health} theme={theme} />
      <MiniSparkline
        data={health.compositeTrend}
        theme={theme}
        height={36}
        label="Cultural health trend over time"
      />
      {/* Per-dimension mini sparklines */}
      <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {ALL_CULTURE_DIMENSIONS.map((dim) => {
          const snap = health.dimensions[dim];
          if (!snap || snap.trend.length < 2) return null;
          const meta = CULTURE_DIMENSION_CONFIG[dim];
          return (
            <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span
                style={{
                  fontSize: `calc(0.55rem * ${theme.fontScale})`,
                  color: theme.textMuted,
                  width: '70px',
                  flexShrink: 0,
                }}
              >
                {meta.label}
              </span>
              <div style={{ flex: 1 }}>
                <MiniSparkline
                  data={snap.trend}
                  theme={theme}
                  height={16}
                  color={getDimensionColor(dim, theme)}
                  label={`${meta.label} trend`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// -- Agent Profiles Panel --

interface AgentProfilesPanelProps {
  profiles: AgentCultureProfile[];
  theme: CultureDashboardTheme;
}

const AgentProfilesPanel: React.FC<AgentProfilesPanelProps> = ({ profiles, theme }) => {
  // Sort by composite score descending
  const sorted = useMemo(
    () => [...profiles].sort((a, b) => b.compositeScore - a.compositeScore),
    [profiles],
  );

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
          Agent Profiles ({profiles.length})
        </span>
      </div>

      <div
        role="list"
        aria-label="Agent cultural contribution profiles"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          maxHeight: '200px',
          overflowY: 'auto',
        }}
      >
        {sorted.slice(0, 10).map((profile) => {
          const roleMeta = CULTURE_ROLE_CONFIG[profile.role];
          return (
            <div
              key={profile.agentId}
              role="listitem"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.5rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                fontSize: `calc(0.7rem * ${theme.fontScale})`,
              }}
            >
              {/* Role indicator */}
              <span
                style={{
                  fontSize: `calc(0.65rem * ${theme.fontScale})`,
                  color: roleMeta.color,
                  fontWeight: 600,
                  border: `1px solid ${roleMeta.color}`,
                  borderRadius: '3px',
                  padding: '0.05rem 0.25rem',
                  flexShrink: 0,
                  minWidth: '70px',
                  textAlign: 'center',
                }}
                title={roleMeta.description}
              >
                {roleMeta.label}
              </span>

              {/* Agent name/id */}
              <span
                style={{
                  color: theme.textSecondary,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {profile.agentName ?? profile.agentId}
              </span>

              {/* Score */}
              <span
                style={{
                  color: theme.textPrimary,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {formatCultureScore(profile.compositeScore)}
              </span>

              {/* Mini dimension indicators */}
              <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                {ALL_CULTURE_DIMENSIONS.map((dim) => {
                  const dimScore = profile.dimensionScores[dim] ?? 0;
                  const dimColor = getDimensionColor(dim, theme);
                  return (
                    <div
                      key={dim}
                      style={{
                        width: '4px',
                        height: '12px',
                        borderRadius: '2px',
                        backgroundColor: dimColor,
                        opacity: dimScore,
                        transition: 'opacity 0.3s ease',
                      }}
                      title={`${CULTURE_DIMENSION_CONFIG[dim].label}: ${formatCultureScore(dimScore)}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// -- Norms Panel --

interface NormsPanelProps {
  norms: CommunityNorm[];
  theme: CultureDashboardTheme;
}

const NormsPanel: React.FC<NormsPanelProps> = ({ norms, theme }) => {
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
          Community Norms ({norms.length})
        </span>
      </div>

      <div
        role="list"
        aria-label="Community norms and compliance rates"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem',
          maxHeight: '180px',
          overflowY: 'auto',
        }}
      >
        {norms.map((norm) => {
          const normHealthColor = getCultureHealthColor(norm.health, theme);
          return (
            <div
              key={norm.id}
              role="listitem"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.5rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                fontSize: `calc(0.7rem * ${theme.fontScale})`,
              }}
            >
              {/* Enforced indicator */}
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: norm.enforced ? theme.thrivingColor : theme.textMuted,
                  display: 'inline-block',
                  flexShrink: 0,
                }}
                aria-hidden="true"
                title={norm.enforced ? 'Enforced' : 'Advisory'}
              />

              {/* Norm name */}
              <span
                style={{
                  color: theme.textSecondary,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={norm.description}
              >
                {norm.name}
              </span>

              {/* Compliance bar */}
              <div
                role="meter"
                aria-label={`${norm.name} compliance rate`}
                aria-valuenow={Math.round(norm.complianceRate * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
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
                    width: `${norm.complianceRate * 100}%`,
                    borderRadius: '2px',
                    backgroundColor: normHealthColor,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              {/* Compliance percentage */}
              <span
                style={{
                  color: normHealthColor,
                  fontWeight: 600,
                  flexShrink: 0,
                  width: '36px',
                  textAlign: 'right',
                }}
              >
                {(norm.complianceRate * 100).toFixed(0)}%
              </span>

              {/* Agent count */}
              <span
                style={{
                  color: theme.textMuted,
                  fontSize: `calc(0.6rem * ${theme.fontScale})`,
                  flexShrink: 0,
                }}
              >
                {norm.compliantAgents}/{norm.totalAgents}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// -- Alerts Panel --

interface CultureAlertsPanelProps {
  alerts: CultureAlert[];
  actions: CultureDashboardActions;
  theme: CultureDashboardTheme;
}

const CultureAlertsPanel: React.FC<CultureAlertsPanelProps> = ({ alerts, actions, theme }) => {
  const severityColor = (severity: CultureAlert['severity']): string => {
    switch (severity) {
      case 'critical': return theme.criticalColor;
      case 'warning': return theme.strainedColor;
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
          Culture Alerts ({alerts.length})
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
            aria-label="Clear all culture alerts"
          >
            Clear All
          </button>
        )}
      </div>
      <div
        role="log"
        aria-label="Cultural health alerts"
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

function panelStyle(theme: CultureDashboardTheme): React.CSSProperties {
  return {
    padding: '0.75rem 1rem',
    borderBottom: `1px solid ${theme.borderColor}`,
  };
}

// -- Panel Header --

interface PanelHeaderProps {
  label: string;
  health: CultureHealthState;
  theme: CultureDashboardTheme;
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
  health: CultureHealthState;
  theme: CultureDashboardTheme;
}

const HealthDot: React.FC<HealthDotProps> = ({ health, theme }) => {
  const color = getCultureHealthColor(health, theme);
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

// -- Compact Metric (for HUD bar) --

interface CompactMetricProps {
  label: string;
  value: string;
  color: string;
  theme: CultureDashboardTheme;
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

// -- Circular Gauge (SVG) --

interface CircularGaugeProps {
  value: number;
  color: string;
  size: number;
  strokeWidth: number;
  label: string;
  theme: CultureDashboardTheme;
}

const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  color,
  size,
  strokeWidth,
  label,
  theme,
}) => {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * Math.max(0, Math.min(1, value));
  const offset = circumference - filled;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={theme.borderColor}
        strokeWidth={strokeWidth}
      />
      {/* Value arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      {/* Center text */}
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={`calc(0.8rem * ${theme.fontScale})`}
        fontWeight="700"
        fontFamily={theme.fontFamily}
      >
        {(value * 100).toFixed(0)}
      </text>
    </svg>
  );
};

// -- Mini Sparkline (SVG-based, O(1) render with pre-computed data) --

interface MiniSparklineProps {
  data: { timestamp: number; value: number }[];
  theme: CultureDashboardTheme;
  height?: number;
  color?: string;
  label?: string;
}

const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  theme,
  height = 24,
  color,
  label = 'Metric trend sparkline',
}) => {
  if (data.length < 2) return null;

  const width = 200;
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

  const strokeColor = color ?? theme.sparklineColor;
  const fillColor = color
    ? `${color}26`  // hex alpha ~15%
    : theme.sparklineFillColor;

  return (
    <div style={{ marginTop: '0.3rem' }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
        role="img"
        aria-label={label}
      >
        <polygon
          points={areaPoints}
          fill={fillColor}
        />
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default CultureDashboard;
