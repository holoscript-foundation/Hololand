/**
 * ReputationHistoryChart Component
 *
 * Renders a line/area chart of an agent's trust score over time.
 * Uses pure SVG rendering (no external charting library) for a
 * lightweight, dependency-free visualization.
 *
 * Features:
 * - Time-series line chart of composite trust score (0-1)
 * - Colored tier threshold bands (T0-T3 regions)
 * - Event markers for trust transitions (degrade, revoke, recover)
 * - Optional per-dimension score overlay lines
 * - Responsive width via container query
 * - Tooltip on hover showing score details
 * - Accessible via aria-label and role="img"
 *
 * Integration:
 * - Consumes ReputationHistory from the types module
 * - Data points from BehavioralTrustScoring event history
 * - Works with the TierBadge component for current tier display
 *
 * @module trust-ui/ReputationHistoryChart
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import type {
  TrustTier,
  TrustUITheme,
  ReputationHistory,
  ReputationDataPoint,
} from './types';
import {
  TRUST_TIER_CONFIG,
  DEFAULT_TRUST_UI_THEME,
  scoreToTier,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface ReputationHistoryChartProps {
  /** Reputation history data to render */
  history: ReputationHistory;
  /** Chart width in pixels */
  width?: number;
  /** Chart height in pixels */
  height?: number;
  /** Whether to show tier threshold bands */
  showTierBands?: boolean;
  /** Whether to show event markers on the timeline */
  showEvents?: boolean;
  /** Whether to show per-dimension score lines */
  showDimensions?: boolean;
  /** Time range to display in ms (from now). 0 = all history. */
  timeRangeMs?: number;
  /** Whether to show the tooltip on hover */
  showTooltip?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Theme overrides */
  theme?: Partial<TrustUITheme>;
  /** Callback when a data point is clicked */
  onDataPointClick?: (point: ReputationDataPoint) => void;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  point: ReputationDataPoint | null;
}

// =============================================================================
// CHART CONSTANTS
// =============================================================================

const CHART_PADDING = { top: 20, right: 20, bottom: 40, left: 50 };
const DIMENSION_COLORS: Record<string, string> = {
  spatial_compliance: '#8B5CF6',
  physics_adherence: '#06B6D4',
  interaction_appropriateness: '#F59E0B',
  temporal_consistency: '#EC4899',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const ReputationHistoryChart: React.FC<ReputationHistoryChartProps> = ({
  history,
  width = 600,
  height = 300,
  showTierBands = true,
  showEvents = true,
  showDimensions = false,
  timeRangeMs = 0,
  showTooltip = true,
  className,
  theme: themeOverride,
  onDataPointClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    point: null,
  });

  const theme = useMemo(
    () => ({ ...DEFAULT_TRUST_UI_THEME, ...themeOverride }),
    [themeOverride],
  );

  // Filter data points by time range
  const filteredPoints = useMemo(() => {
    if (timeRangeMs <= 0) return history.dataPoints;
    const cutoff = Date.now() - timeRangeMs;
    return history.dataPoints.filter((p) => p.timestamp >= cutoff);
  }, [history.dataPoints, timeRangeMs]);

  // Compute chart dimensions
  const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

  // Compute time and score scales
  const { xScale, yScale, timeExtent } = useMemo(() => {
    if (filteredPoints.length === 0) {
      const now = Date.now();
      return {
        xScale: (_t: number) => 0,
        yScale: (_s: number) => chartHeight,
        timeExtent: { min: now - 60000, max: now },
      };
    }

    const timestamps = filteredPoints.map((p) => p.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeRange = maxTime - minTime || 1; // Prevent division by zero

    return {
      xScale: (t: number) => ((t - minTime) / timeRange) * chartWidth,
      yScale: (s: number) => chartHeight - s * chartHeight,
      timeExtent: { min: minTime, max: maxTime },
    };
  }, [filteredPoints, chartWidth, chartHeight]);

  // Generate the main score line path
  const mainLinePath = useMemo(() => {
    if (filteredPoints.length === 0) return '';
    return filteredPoints
      .map((p, i) => {
        const x = xScale(p.timestamp);
        const y = yScale(p.score);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [filteredPoints, xScale, yScale]);

  // Generate the area fill path (line + bottom edge)
  const areaPath = useMemo(() => {
    if (filteredPoints.length === 0) return '';
    const lineParts = filteredPoints
      .map((p, i) => {
        const x = xScale(p.timestamp);
        const y = yScale(p.score);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    const lastX = xScale(filteredPoints[filteredPoints.length - 1].timestamp);
    const firstX = xScale(filteredPoints[0].timestamp);

    return `${lineParts} L ${lastX} ${chartHeight} L ${firstX} ${chartHeight} Z`;
  }, [filteredPoints, xScale, yScale, chartHeight]);

  // Generate dimension line paths
  const dimensionPaths = useMemo(() => {
    if (!showDimensions) return {};

    const paths: Record<string, string> = {};
    const dimensionKeys = Object.keys(DIMENSION_COLORS);

    for (const dimKey of dimensionKeys) {
      const points = filteredPoints.filter(
        (p) => p.dimensions && p.dimensions[dimKey as keyof typeof p.dimensions] !== undefined,
      );

      if (points.length > 0) {
        paths[dimKey] = points
          .map((p, i) => {
            const x = xScale(p.timestamp);
            const dimScore = p.dimensions![dimKey as keyof typeof p.dimensions] ?? 0;
            const y = yScale(dimScore);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
          })
          .join(' ');
      }
    }

    return paths;
  }, [filteredPoints, showDimensions, xScale, yScale]);

  // Event markers
  const eventMarkers = useMemo(() => {
    if (!showEvents) return [];
    return filteredPoints.filter((p) => p.event);
  }, [filteredPoints, showEvents]);

  // Time axis labels
  const timeLabels = useMemo(() => {
    const labelCount = Math.min(6, Math.max(2, Math.floor(chartWidth / 100)));
    const labels: Array<{ x: number; text: string }> = [];

    for (let i = 0; i < labelCount; i++) {
      const t = timeExtent.min + ((timeExtent.max - timeExtent.min) * i) / (labelCount - 1);
      const date = new Date(t);
      labels.push({
        x: xScale(t),
        text: formatTimeLabel(date, timeExtent.max - timeExtent.min),
      });
    }

    return labels;
  }, [chartWidth, timeExtent, xScale]);

  // Score axis labels
  const scoreLabels = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1.0].map((s) => ({
      y: yScale(s),
      text: `${(s * 100).toFixed(0)}%`,
    }));
  }, [yScale]);

  // Tooltip handling
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!showTooltip || filteredPoints.length === 0 || !svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = event.clientX - rect.left - CHART_PADDING.left;

      // Find closest data point
      let closestPoint: ReputationDataPoint | null = null;
      let closestDist = Infinity;

      for (const point of filteredPoints) {
        const px = xScale(point.timestamp);
        const dist = Math.abs(px - mouseX);
        if (dist < closestDist) {
          closestDist = dist;
          closestPoint = point;
        }
      }

      if (closestPoint && closestDist < 30) {
        setTooltip({
          visible: true,
          x: xScale(closestPoint.timestamp) + CHART_PADDING.left,
          y: yScale(closestPoint.score) + CHART_PADDING.top,
          point: closestPoint,
        });
      } else {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }
    },
    [showTooltip, filteredPoints, xScale, yScale],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  const handlePointClick = useCallback(
    (point: ReputationDataPoint) => {
      onDataPointClick?.(point);
    },
    [onDataPointClick],
  );

  // Empty state
  if (filteredPoints.length === 0) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.containerBackground,
          border: `1px solid ${theme.borderColor}`,
          borderRadius: theme.borderRadius,
          fontFamily: theme.fontFamily,
          color: theme.textMuted,
          fontSize: '0.9rem',
        }}
        role="img"
        aria-label="No reputation history data available"
      >
        No reputation history available
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        backgroundColor: theme.containerBackground,
        border: `1px solid ${theme.borderColor}`,
        borderRadius: theme.borderRadius,
        overflow: 'hidden',
      }}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Reputation history chart for ${history.agentName ?? history.agentId}. Current score: ${(history.currentScore * 100).toFixed(0)}%, tier ${history.currentTier}.`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ fontFamily: theme.fontFamily }}
      >
        {/* Chart area group */}
        <g transform={`translate(${CHART_PADDING.left}, ${CHART_PADDING.top})`}>
          {/* Tier threshold bands */}
          {showTierBands && (
            <g aria-hidden="true">
              {(['T0', 'T1', 'T2', 'T3'] as TrustTier[]).map((tier) => {
                const config = TRUST_TIER_CONFIG[tier];
                const y1 = yScale(config.maxScore);
                const y2 = yScale(config.minScore);
                return (
                  <rect
                    key={tier}
                    x={0}
                    y={y1}
                    width={chartWidth}
                    height={y2 - y1}
                    fill={config.backgroundColor}
                    opacity={0.5}
                  />
                );
              })}

              {/* Threshold lines */}
              {[0.25, 0.5, 0.8].map((threshold) => (
                <line
                  key={threshold}
                  x1={0}
                  y1={yScale(threshold)}
                  x2={chartWidth}
                  y2={yScale(threshold)}
                  stroke={theme.borderColor}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  opacity={0.5}
                />
              ))}
            </g>
          )}

          {/* Grid lines */}
          <g aria-hidden="true">
            {scoreLabels.map(({ y, text }) => (
              <line
                key={text}
                x1={0}
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke={theme.borderColor}
                strokeWidth={0.5}
                opacity={0.3}
              />
            ))}
          </g>

          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#score-gradient)"
            opacity={0.3}
          />

          {/* Score gradient definition */}
          <defs>
            <linearGradient id="score-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TRUST_TIER_CONFIG.T3.color} stopOpacity={0.6} />
              <stop offset="50%" stopColor={TRUST_TIER_CONFIG.T2.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={TRUST_TIER_CONFIG.T0.color} stopOpacity={0.1} />
            </linearGradient>
          </defs>

          {/* Dimension lines (if enabled) */}
          {showDimensions &&
            Object.entries(dimensionPaths).map(([dimKey, path]) => (
              <path
                key={dimKey}
                d={path}
                fill="none"
                stroke={DIMENSION_COLORS[dimKey]}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.6}
              />
            ))}

          {/* Main score line */}
          <path
            d={mainLinePath}
            fill="none"
            stroke={TRUST_TIER_CONFIG[history.currentTier].color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Event markers */}
          {eventMarkers.map((point, idx) => {
            const x = xScale(point.timestamp);
            const y = yScale(point.score);
            const tierMeta = TRUST_TIER_CONFIG[point.tier];
            return (
              <g
                key={`event-${idx}`}
                transform={`translate(${x}, ${y})`}
                style={{ cursor: onDataPointClick ? 'pointer' : 'default' }}
                onClick={() => handlePointClick(point)}
              >
                <circle
                  r={5}
                  fill={tierMeta.color}
                  stroke="#fff"
                  strokeWidth={2}
                />
                <title>{`${point.event}: ${(point.score * 100).toFixed(0)}%`}</title>
              </g>
            );
          })}

          {/* Data point dots (every Nth point for readability) */}
          {filteredPoints
            .filter((_, i) => i % Math.max(1, Math.floor(filteredPoints.length / 20)) === 0)
            .map((point, idx) => {
              const x = xScale(point.timestamp);
              const y = yScale(point.score);
              return (
                <circle
                  key={`dot-${idx}`}
                  cx={x}
                  cy={y}
                  r={2.5}
                  fill={TRUST_TIER_CONFIG[point.tier].color}
                  opacity={0.7}
                  style={{ cursor: onDataPointClick ? 'pointer' : 'default' }}
                  onClick={() => handlePointClick(point)}
                />
              );
            })}

          {/* Score axis labels */}
          <g aria-hidden="true">
            {scoreLabels.map(({ y, text }) => (
              <text
                key={text}
                x={-8}
                y={y + 4}
                textAnchor="end"
                fontSize="0.65rem"
                fill={theme.textMuted}
              >
                {text}
              </text>
            ))}
          </g>

          {/* Time axis labels */}
          <g aria-hidden="true">
            {timeLabels.map(({ x, text }, idx) => (
              <text
                key={idx}
                x={x}
                y={chartHeight + 20}
                textAnchor="middle"
                fontSize="0.65rem"
                fill={theme.textMuted}
              >
                {text}
              </text>
            ))}
          </g>

          {/* Axis lines */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={chartHeight}
            stroke={theme.borderColor}
            strokeWidth={1}
          />
          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke={theme.borderColor}
            strokeWidth={1}
          />
        </g>

        {/* Tooltip crosshair */}
        {tooltip.visible && tooltip.point && (
          <g>
            <line
              x1={tooltip.x}
              y1={CHART_PADDING.top}
              x2={tooltip.x}
              y2={height - CHART_PADDING.bottom}
              stroke={theme.textMuted}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
            />
            <circle
              cx={tooltip.x}
              cy={tooltip.y}
              r={6}
              fill={TRUST_TIER_CONFIG[tooltip.point.tier].color}
              stroke="#fff"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>

      {/* HTML Tooltip overlay */}
      {tooltip.visible && tooltip.point && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(tooltip.x + 12, width - 180),
            top: Math.max(tooltip.y - 60, 4),
            backgroundColor: 'rgba(26, 26, 46, 0.95)',
            color: '#fff',
            padding: '0.5rem 0.75rem',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontFamily: theme.fontFamily,
            pointerEvents: 'none',
            zIndex: 10,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
          role="tooltip"
        >
          <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>
            {tooltip.point.tier} - {TRUST_TIER_CONFIG[tooltip.point.tier].label}
          </div>
          <div>Score: {(tooltip.point.score * 100).toFixed(1)}%</div>
          <div style={{ opacity: 0.7, marginTop: '0.15rem' }}>
            {new Date(tooltip.point.timestamp).toLocaleString()}
          </div>
          {tooltip.point.event && (
            <div style={{ color: TRUST_TIER_CONFIG[tooltip.point.tier].color, marginTop: '0.15rem' }}>
              {tooltip.point.event}
            </div>
          )}
        </div>
      )}

      {/* Legend (if dimensions are shown) */}
      {showDimensions && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 8,
            display: 'flex',
            gap: '0.5rem',
            fontSize: '0.6rem',
            fontFamily: theme.fontFamily,
            color: theme.textMuted,
          }}
        >
          {Object.entries(DIMENSION_COLORS).map(([key, color]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span
                style={{
                  width: 8,
                  height: 2,
                  backgroundColor: color,
                  display: 'inline-block',
                  borderRadius: 1,
                }}
              />
              {key.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// UTILITY
// =============================================================================

/**
 * Format a time label based on the total time range being displayed.
 */
function formatTimeLabel(date: Date, totalRangeMs: number): string {
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  if (totalRangeMs < oneHour) {
    // Under 1 hour: show HH:MM:SS
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } else if (totalRangeMs < oneDay) {
    // Under 1 day: show HH:MM
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    // Over 1 day: show MM/DD HH:MM
    return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}

export default ReputationHistoryChart;
