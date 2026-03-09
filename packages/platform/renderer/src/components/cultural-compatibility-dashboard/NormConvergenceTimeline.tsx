/**
 * NormConvergenceTimeline Component
 *
 * SVG-based multi-line timeline chart showing norm adoption rates converging
 * (or diverging) over time. Each tracked norm is a separate line with its
 * own colour, and the chart includes a population average overlay.
 *
 * Features:
 *   - Multi-line SVG polyline chart (max 20 norms, 60 samples each)
 *   - Lifecycle state badges per norm (proposed, emerging, established, etc.)
 *   - Population average convergence line (dashed)
 *   - Convergence/divergence indicator in header
 *   - Horizontal threshold lines at key adoption thresholds
 *
 * Performance:
 *   - Max 20 norms x 60 samples = 1,200 SVG points total
 *   - Memoized SVG path computation
 *   - No computation in render loop; pure data display
 *
 * Accessibility (WCAG 2.1 AA):
 *   - role="img" with descriptive aria-label on SVG
 *   - Legend with norm names and current values (accessible text)
 *   - Colour is NOT the sole channel (legend text + lifecycle badges)
 *   - Screen reader accessible via aria-label description
 *
 * @module cultural-compatibility-dashboard/NormConvergenceTimeline
 */

import React, { useMemo } from 'react';
import type { NormConvergenceState, CompatibilityDashboardTheme } from './types';
import {
  DEFAULT_COMPATIBILITY_THEME,
  formatScore,
} from './types';
import type { TimeSample } from '../../CulturalHealthTypes';

// =============================================================================
// PROPS
// =============================================================================

export interface NormConvergenceTimelineProps {
  /** Norm convergence state data */
  convergence: NormConvergenceState;
  /** Theme overrides */
  theme?: Partial<CompatibilityDashboardTheme>;
  /** Custom CSS styles */
  style?: React.CSSProperties;
  /** Chart height in pixels (default: 140) */
  chartHeight?: number;
  /** Accessible label override */
  ariaLabel?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CHART_PADDING_LEFT = 36;
const CHART_PADDING_RIGHT = 8;
const CHART_PADDING_TOP = 8;
const CHART_PADDING_BOTTOM = 16;
const CHART_WIDTH = 400;

/** Key adoption thresholds for horizontal markers */
const THRESHOLD_LINES = [
  { value: 0.1, label: '10%', dash: '2,3' },
  { value: 0.4, label: '40%', dash: '2,3' },
  { value: 0.7, label: '70%', dash: '2,3' },
  { value: 0.9, label: '90%', dash: '2,3' },
];

/** Lifecycle badge colours */
const LIFECYCLE_COLORS: Record<string, string> = {
  proposed: '#6b7280',
  emerging: '#3b82f6',
  establishing: '#8b5cf6',
  established: '#22c55e',
  entrenched: '#14b8a6',
  declining: '#f97316',
  abandoned: '#ef4444',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const NormConvergenceTimeline: React.FC<NormConvergenceTimelineProps> = ({
  convergence,
  theme: themeOverride,
  style,
  chartHeight = 140,
  ariaLabel = 'Norm adoption convergence timeline',
}) => {
  const theme = useMemo(
    () => ({ ...DEFAULT_COMPATIBILITY_THEME, ...themeOverride }),
    [themeOverride],
  );

  const plotWidth = CHART_WIDTH - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;
  const plotHeight = chartHeight - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

  // Build SVG polyline paths for each norm
  const normPaths = useMemo(() => {
    return convergence.norms.map((norm) => {
      if (norm.trend.length < 2) return { ...norm, pathData: '' };

      const points = norm.trend.map((sample, i) => {
        const x =
          CHART_PADDING_LEFT +
          (i / (norm.trend.length - 1)) * plotWidth;
        const y =
          CHART_PADDING_TOP +
          plotHeight -
          sample.value * plotHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      return {
        ...norm,
        pathData: points.join(' '),
      };
    });
  }, [convergence.norms, plotWidth, plotHeight]);

  // Compute average trend line from all norms (simple average per time slot)
  const averagePath = useMemo(() => {
    const maxSamples = Math.max(
      ...convergence.norms.map((n) => n.trend.length),
      0,
    );
    if (maxSamples < 2) return '';

    const points: string[] = [];
    for (let i = 0; i < maxSamples; i++) {
      let sum = 0;
      let count = 0;
      for (const norm of convergence.norms) {
        if (i < norm.trend.length) {
          sum += norm.trend[i].value;
          count++;
        }
      }
      const avg = count > 0 ? sum / count : 0;
      const x = CHART_PADDING_LEFT + (i / (maxSamples - 1)) * plotWidth;
      const y = CHART_PADDING_TOP + plotHeight - avg * plotHeight;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return points.join(' ');
  }, [convergence.norms, plotWidth, plotHeight]);

  // Accessible description
  const accessibleDesc = convergence.norms
    .map(
      (n) =>
        `${n.normName}: ${formatScore(n.currentAdoptionRate)} (${n.lifecycleState})`,
    )
    .join('; ');

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
        <span
          style={{
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: theme.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Norm Convergence
        </span>
        <span
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: convergence.isPopulationConverging
              ? theme.excellentColor
              : theme.moderateColor,
          }}
          role="status"
          aria-label={`Population ${convergence.isPopulationConverging ? 'converging' : 'diverging'}`}
        >
          {convergence.isPopulationConverging ? 'Converging' : 'Diverging'}
          {' \u00B7 '}
          Avg: {formatScore(convergence.averageConvergence)}
        </span>
      </div>

      {/* SVG Chart */}
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${CHART_WIDTH} ${chartHeight}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
        role="img"
        aria-label={`${ariaLabel}. ${accessibleDesc}`}
      >
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((val) => {
          const y = CHART_PADDING_TOP + plotHeight - val * plotHeight;
          return (
            <text
              key={`y-${val}`}
              x={CHART_PADDING_LEFT - 4}
              y={y}
              textAnchor="end"
              dominantBaseline="middle"
              fill={theme.textMuted}
              fontSize={`calc(0.45rem * ${theme.fontScale})`}
              fontFamily={theme.fontFamily}
            >
              {(val * 100).toFixed(0)}%
            </text>
          );
        })}

        {/* Threshold lines */}
        {THRESHOLD_LINES.map((t) => {
          const y = CHART_PADDING_TOP + plotHeight - t.value * plotHeight;
          return (
            <line
              key={`thresh-${t.value}`}
              x1={CHART_PADDING_LEFT}
              y1={y}
              x2={CHART_PADDING_LEFT + plotWidth}
              y2={y}
              stroke={theme.borderColor}
              strokeWidth="0.5"
              strokeDasharray={t.dash}
            />
          );
        })}

        {/* X-axis baseline */}
        <line
          x1={CHART_PADDING_LEFT}
          y1={CHART_PADDING_TOP + plotHeight}
          x2={CHART_PADDING_LEFT + plotWidth}
          y2={CHART_PADDING_TOP + plotHeight}
          stroke={theme.borderColor}
          strokeWidth="0.5"
        />

        {/* Y-axis line */}
        <line
          x1={CHART_PADDING_LEFT}
          y1={CHART_PADDING_TOP}
          x2={CHART_PADDING_LEFT}
          y2={CHART_PADDING_TOP + plotHeight}
          stroke={theme.borderColor}
          strokeWidth="0.5"
        />

        {/* Average trend line (dashed) */}
        {averagePath && (
          <polyline
            points={averagePath}
            fill="none"
            stroke={theme.textMuted}
            strokeWidth="1.5"
            strokeDasharray="4,3"
            strokeLinecap="round"
            opacity={0.6}
          />
        )}

        {/* Per-norm trend lines */}
        {normPaths.map((norm) => {
          if (!norm.pathData) return null;
          return (
            <polyline
              key={norm.normId}
              points={norm.pathData}
              fill="none"
              stroke={norm.color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Current value dots at the end of each line */}
        {normPaths.map((norm) => {
          if (norm.trend.length === 0) return null;
          const lastSample = norm.trend[norm.trend.length - 1];
          const x = CHART_PADDING_LEFT + plotWidth;
          const y =
            CHART_PADDING_TOP + plotHeight - lastSample.value * plotHeight;
          return (
            <circle
              key={`dot-${norm.normId}`}
              cx={x}
              cy={y}
              r="3"
              fill={norm.color}
              stroke={theme.containerBackground}
              strokeWidth="1"
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem 0.75rem',
          marginTop: '0.4rem',
        }}
      >
        {convergence.norms.map((norm) => {
          const lifecycleColor =
            LIFECYCLE_COLORS[norm.lifecycleState] ?? theme.textMuted;
          return (
            <div
              key={norm.normId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: `calc(0.6rem * ${theme.fontScale})`,
              }}
            >
              {/* Colour swatch */}
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  backgroundColor: norm.color,
                  display: 'inline-block',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              />
              {/* Norm name */}
              <span
                style={{
                  color: theme.textSecondary,
                  maxWidth: '100px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={norm.normName}
              >
                {norm.normName}
              </span>
              {/* Current rate */}
              <span style={{ color: theme.textPrimary, fontWeight: 600 }}>
                {formatScore(norm.currentAdoptionRate)}
              </span>
              {/* Lifecycle badge */}
              <span
                style={{
                  fontSize: `calc(0.5rem * ${theme.fontScale})`,
                  color: lifecycleColor,
                  border: `1px solid ${lifecycleColor}`,
                  borderRadius: '2px',
                  padding: '0 0.2rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                {norm.lifecycleState}
              </span>
            </div>
          );
        })}
        {/* Average legend entry */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
          }}
        >
          <span
            style={{
              width: '12px',
              height: '0',
              borderTop: `2px dashed ${theme.textMuted}`,
              display: 'inline-block',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <span style={{ color: theme.textMuted }}>Average</span>
        </div>
      </div>
    </div>
  );
};

export default NormConvergenceTimeline;
