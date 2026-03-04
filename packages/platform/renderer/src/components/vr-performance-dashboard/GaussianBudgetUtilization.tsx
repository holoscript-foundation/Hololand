/**
 * GaussianBudgetUtilization Component
 *
 * Visualizes Gaussian splat budget allocation across three rendering layers:
 *   - Baked (120K): Pre-lit SH-baked, cheapest per-splat
 *   - Relightable (30K): Deferred PBR with dynamic lights
 *   - Interactive (10K): Physics-coupled via XPBD
 *
 * Features:
 *   - Per-layer horizontal utilization bars with allocated/budget
 *   - Cross-layer borrowing/lending indicators
 *   - Aggregate budget ring chart with performance state color
 *   - VRAM estimation per layer
 *   - Foveated rendering indicator
 *   - Performance state badge (nominal/pressure/critical/emergency)
 *
 * Accessibility (WCAG 2.1 AA):
 *   - role="img" with descriptive aria-label on SVG charts
 *   - role="meter" with aria-valuenow/min/max on utilization bars
 *   - High-contrast colors (>= 4.5:1 against backgrounds)
 *   - Screen reader accessible data table alternative
 *   - Visible focus indicators on interactive elements
 *
 * @module vr-performance-dashboard/GaussianBudgetUtilization
 */

import React, { useMemo } from 'react';
import type { GaussianBudgetMetrics, GaussianLayerType } from '../../GaussianBudgetManager';
import { SPLAT_MEMORY_BYTES, SPLAT_RENDER_COST } from '../../GaussianBudgetManager';
import type { VRPerfTheme } from './types';
import {
  DEFAULT_VR_PERF_THEME,
  LAYER_DISPLAY_CONFIG,
  getPerformanceStateColor,
  getLayerColor,
  formatSplatCount,
  formatBytes,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface GaussianBudgetUtilizationProps {
  /** Current budget metrics from GaussianBudgetManager.getMetrics() */
  metrics: GaussianBudgetMetrics;
  /** Chart width in pixels */
  width?: number;
  /** Whether to show the aggregate ring chart */
  showRingChart?: boolean;
  /** Whether to show VRAM estimation */
  showVRAM?: boolean;
  /** Whether to show lending/borrowing indicators */
  showLending?: boolean;
  /** Whether to show a screen-reader data table */
  showAccessibleTable?: boolean;
  /** Theme overrides */
  theme?: Partial<VRPerfTheme>;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LAYER_ORDER: GaussianLayerType[] = ['baked', 'relightable', 'interactive'];
const RING_SIZE = 100;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// =============================================================================
// COMPONENT
// =============================================================================

export const GaussianBudgetUtilization: React.FC<GaussianBudgetUtilizationProps> = ({
  metrics,
  width = 400,
  showRingChart = true,
  showVRAM = true,
  showLending = true,
  showAccessibleTable = true,
  theme: themeOverride,
  className,
  style,
}) => {
  const theme = useMemo(
    () => ({ ...DEFAULT_VR_PERF_THEME, ...themeOverride }),
    [themeOverride],
  );

  const performanceColor = getPerformanceStateColor(metrics.performanceState, theme);

  // Compute ring chart segment data
  const ringSegments = useMemo(() => {
    if (metrics.totalBudget === 0) return [];

    let offset = 0;
    return LAYER_ORDER.map((layer) => {
      const state = metrics.layers[layer];
      const fraction = state.effectiveBudget / metrics.totalBudget;
      const utilFraction = state.allocatedSplats / metrics.totalBudget;
      const segmentLength = fraction * RING_CIRCUMFERENCE;
      const utilLength = utilFraction * RING_CIRCUMFERENCE;
      const currentOffset = offset;
      offset += segmentLength;

      return {
        layer,
        fraction,
        utilFraction,
        segmentLength,
        utilLength,
        offset: currentOffset,
        color: getLayerColor(layer, theme),
      };
    });
  }, [metrics, theme]);

  // Build accessible description
  const accessibleDescription = useMemo(() => {
    const parts = [
      `VR Gaussian Budget Utilization: ${(metrics.overallUtilization * 100).toFixed(1)}% overall.`,
      `Performance state: ${metrics.performanceState}.`,
      `Total splats: ${formatSplatCount(metrics.totalEffectiveSplats)} of ${formatSplatCount(metrics.totalBudget)} budget.`,
      `Average frame time: ${metrics.avgFrameTimeMs.toFixed(2)}ms.`,
    ];
    for (const layer of LAYER_ORDER) {
      const s = metrics.layers[layer];
      parts.push(
        `${LAYER_DISPLAY_CONFIG[layer].label}: ${formatSplatCount(s.allocatedSplats)} of ${formatSplatCount(s.effectiveBudget)} (${(s.utilization * 100).toFixed(0)}%).`,
      );
    }
    return parts.join(' ');
  }, [metrics]);

  return (
    <div
      className={className}
      style={{
        backgroundColor: theme.cardBackground,
        borderRadius: theme.borderRadius,
        border: `1px solid ${theme.borderColor}`,
        padding: '1rem',
        width,
        fontFamily: theme.fontFamily,
        color: theme.textPrimary,
        ...style,
      }}
      role="region"
      aria-label="Gaussian Budget Utilization"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
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
          Gaussian Budget
        </span>
        <PerformanceBadge state={metrics.performanceState} color={performanceColor} theme={theme} />
      </div>

      {/* Top section: Ring chart + summary metrics */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        {/* Ring Chart */}
        {showRingChart && (
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            role="img"
            aria-label={`Overall budget utilization: ${(metrics.overallUtilization * 100).toFixed(0)}%`}
            style={{ flexShrink: 0 }}
          >
            {/* Background ring */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={theme.borderColor}
              strokeWidth={RING_STROKE}
            />

            {/* Layer utilization segments */}
            {ringSegments.map((seg) => (
              <circle
                key={`util-${seg.layer}`}
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={RING_STROKE}
                strokeDasharray={`${seg.utilLength} ${RING_CIRCUMFERENCE - seg.utilLength}`}
                strokeDashoffset={-seg.offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                opacity={0.9}
              />
            ))}

            {/* Center text */}
            <text
              x={RING_SIZE / 2}
              y={RING_SIZE / 2 - 4}
              textAnchor="middle"
              fill={performanceColor}
              fontSize="18"
              fontWeight="700"
              fontFamily={theme.fontFamily}
            >
              {(metrics.overallUtilization * 100).toFixed(0)}%
            </text>
            <text
              x={RING_SIZE / 2}
              y={RING_SIZE / 2 + 12}
              textAnchor="middle"
              fill={theme.textMuted}
              fontSize="9"
              fontFamily={theme.fontFamily}
            >
              utilized
            </text>
          </svg>
        )}

        {/* Summary metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem 1rem',
            flex: 1,
          }}
        >
          <SummaryMetric
            label="Total Splats"
            value={formatSplatCount(metrics.totalEffectiveSplats)}
            subValue={`of ${formatSplatCount(metrics.totalBudget)}`}
            theme={theme}
          />
          <SummaryMetric
            label="Frame Time"
            value={`${metrics.avgFrameTimeMs.toFixed(2)}ms`}
            valueColor={performanceColor}
            theme={theme}
          />
          <SummaryMetric
            label="Rebalances"
            value={String(metrics.rebalanceCount)}
            theme={theme}
          />
          <SummaryMetric
            label="Emerg. Sheds"
            value={String(metrics.emergencyShedCount)}
            valueColor={metrics.emergencyShedCount > 0 ? theme.emergencyColor : undefined}
            theme={theme}
          />
          {showVRAM && (
            <SummaryMetric
              label="VRAM"
              value={formatBytes(metrics.totalVRAMBytes)}
              theme={theme}
            />
          )}
          <SummaryMetric
            label="Foveated"
            value={metrics.foveatedActive ? 'Active' : 'Off'}
            valueColor={metrics.foveatedActive ? theme.nominalColor : theme.textMuted}
            theme={theme}
          />
        </div>
      </div>

      {/* Per-layer utilization bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {LAYER_ORDER.map((layer) => {
          const state = metrics.layers[layer];
          const layerMeta = LAYER_DISPLAY_CONFIG[layer];
          const layerColor = getLayerColor(layer, theme);

          return (
            <LayerBar
              key={layer}
              state={state}
              label={layerMeta.label}
              description={layerMeta.description}
              color={layerColor}
              showLending={showLending}
              showVRAM={showVRAM}
              theme={theme}
            />
          );
        })}
      </div>

      {/* Layer legend */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
        aria-hidden="true"
      >
        {LAYER_ORDER.map((layer) => (
          <span
            key={layer}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: `calc(0.65rem * ${theme.fontScale})`,
              color: theme.textMuted,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: getLayerColor(layer, theme),
                display: 'inline-block',
              }}
            />
            {LAYER_DISPLAY_CONFIG[layer].label}
            <span style={{ opacity: 0.6 }}>
              ({SPLAT_MEMORY_BYTES[layer]}B, {SPLAT_RENDER_COST[layer]}x)
            </span>
          </span>
        ))}
      </div>

      {/* Screen-reader accessible data table */}
      {showAccessibleTable && (
        <table
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            borderWidth: 0,
          }}
          role="table"
          aria-label="Gaussian budget data"
        >
          <caption>{accessibleDescription}</caption>
          <thead>
            <tr>
              <th scope="col">Layer</th>
              <th scope="col">Allocated</th>
              <th scope="col">Budget</th>
              <th scope="col">Utilization</th>
              <th scope="col">Objects</th>
              <th scope="col">VRAM</th>
            </tr>
          </thead>
          <tbody>
            {LAYER_ORDER.map((layer) => {
              const s = metrics.layers[layer];
              return (
                <tr key={layer}>
                  <td>{LAYER_DISPLAY_CONFIG[layer].label}</td>
                  <td>{formatSplatCount(s.allocatedSplats)}</td>
                  <td>{formatSplatCount(s.effectiveBudget)}</td>
                  <td>{(s.utilization * 100).toFixed(1)}%</td>
                  <td>{s.visibleObjectCount} of {s.objectCount}</td>
                  <td>{formatBytes(s.estimatedVRAMBytes)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// -- Performance State Badge --

interface PerformanceBadgeProps {
  state: 'nominal' | 'pressure' | 'critical' | 'emergency';
  color: string;
  theme: VRPerfTheme;
}

const PerformanceBadge: React.FC<PerformanceBadgeProps> = ({ state, color, theme }) => (
  <span
    style={{
      fontSize: `calc(0.65rem * ${theme.fontScale})`,
      fontWeight: 600,
      color,
      border: `1px solid ${color}`,
      borderRadius: '4px',
      padding: '0.1rem 0.4rem',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}
    role="status"
    aria-label={`Performance state: ${state}`}
  >
    {state}
  </span>
);

// -- Summary Metric --

interface SummaryMetricProps {
  label: string;
  value: string;
  subValue?: string;
  valueColor?: string;
  theme: VRPerfTheme;
}

const SummaryMetric: React.FC<SummaryMetricProps> = ({
  label,
  value,
  subValue,
  valueColor,
  theme,
}) => (
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
      {subValue && (
        <span
          style={{
            fontWeight: 400,
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            color: theme.textMuted,
            marginLeft: '0.3em',
          }}
        >
          {subValue}
        </span>
      )}
    </span>
  </div>
);

// -- Layer Utilization Bar --

interface LayerBarProps {
  state: import('../../GaussianBudgetManager').LayerBudgetState;
  label: string;
  description: string;
  color: string;
  showLending: boolean;
  showVRAM: boolean;
  theme: VRPerfTheme;
}

const LayerBar: React.FC<LayerBarProps> = ({
  state,
  label,
  description,
  color,
  showLending,
  showVRAM,
  theme,
}) => {
  const utilizationPct = Math.min(state.utilization * 100, 100);
  const maxSplatsPct = state.effectiveBudget > 0
    ? Math.min((state.maxSplats / state.effectiveBudget) * 100, 100)
    : 100;

  return (
    <div>
      {/* Layer header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '0.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 2,
              backgroundColor: color,
              display: 'inline-block',
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontSize: `calc(0.75rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.textPrimary,
            }}
          >
            {label}
          </span>
          {showLending && state.borrowedSplats > 0 && (
            <span
              style={{
                fontSize: `calc(0.6rem * ${theme.fontScale})`,
                color: theme.pressureColor,
                fontWeight: 500,
              }}
              title={`Borrowed ${formatSplatCount(state.borrowedSplats)} splats from other layers`}
            >
              +{formatSplatCount(state.borrowedSplats)} borrowed
            </span>
          )}
          {showLending && state.lentSplats > 0 && (
            <span
              style={{
                fontSize: `calc(0.6rem * ${theme.fontScale})`,
                color: theme.nominalColor,
                fontWeight: 500,
              }}
              title={`Lending ${formatSplatCount(state.lentSplats)} splats to other layers`}
            >
              -{formatSplatCount(state.lentSplats)} lending
            </span>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              color: theme.textSecondary,
            }}
          >
            {formatSplatCount(state.allocatedSplats)}
            <span style={{ color: theme.textMuted }}> / {formatSplatCount(state.effectiveBudget)}</span>
          </span>
          <span
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              fontWeight: 600,
              color,
            }}
          >
            {utilizationPct.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Utilization bar */}
      <div
        role="meter"
        aria-label={`${label} layer utilization`}
        aria-valuenow={Math.round(state.utilization * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${utilizationPct.toFixed(0)}% utilized: ${formatSplatCount(state.allocatedSplats)} of ${formatSplatCount(state.effectiveBudget)} splats`}
        style={{
          height: '8px',
          borderRadius: '4px',
          backgroundColor: theme.borderColor,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Utilized portion */}
        <div
          style={{
            height: '100%',
            width: `${utilizationPct}%`,
            borderRadius: '4px',
            backgroundColor: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Sub-metrics row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '0.2rem',
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
          color: theme.textMuted,
        }}
      >
        <span>{state.visibleObjectCount} of {state.objectCount} objects visible</span>
        {showVRAM && <span>{formatBytes(state.estimatedVRAMBytes)}</span>}
      </div>
    </div>
  );
};

export default GaussianBudgetUtilization;
