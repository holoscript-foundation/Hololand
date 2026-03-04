/**
 * ReputationTrendGraph Component
 *
 * Lightweight SVG sparkline/chart displaying an agent's trust score
 * over time. Designed for use in agent cards and detail panels.
 *
 * Features:
 * - SVG sparkline showing 30-day score trend
 * - Color-coded by current trust tier
 * - Trend direction indicator (rising/stable/declining)
 * - 24h change percentage display
 * - Hover tooltip with point details
 * - Tier threshold bands (optional)
 * - Responsive sizing
 * - Accessible via role="img" and aria-label
 *
 * This is a simplified version of the renderer's ReputationHistoryChart,
 * optimized for the discovery dashboard card layout.
 *
 * @module agent-discovery/ReputationTrendGraph
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import type {
  ReputationTrend,
  ReputationDataPoint,
  TrustTier,
} from './ansTypes';
import { TRUST_TIER_CONFIG, scoreToTier } from './ansTypes';

// =============================================================================
// TYPES
// =============================================================================

export interface ReputationTrendGraphProps {
  /** Reputation trend data */
  trend: ReputationTrend;
  /** Chart width in pixels */
  width?: number;
  /** Chart height in pixels */
  height?: number;
  /** Whether to show tier threshold bands */
  showBands?: boolean;
  /** Whether to show the trend summary line (direction + percentage) */
  showSummary?: boolean;
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
  /** Display mode: 'sparkline' (minimal) or 'chart' (with axes) */
  mode?: 'sparkline' | 'chart';
  /** Custom CSS class name */
  className?: string;
  /** Click handler for the chart */
  onClick?: () => void;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  point: ReputationDataPoint | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SPARKLINE_PADDING = { top: 2, right: 2, bottom: 2, left: 2 };
const CHART_PADDING = { top: 8, right: 8, bottom: 24, left: 32 };

const TREND_ICONS: Record<ReputationTrend['trend'], { icon: string; color: string }> = {
  rising: { icon: '\u2191', color: '#059669' },
  stable: { icon: '\u2192', color: '#6B7280' },
  declining: { icon: '\u2193', color: '#DC2626' },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const ReputationTrendGraph: React.FC<ReputationTrendGraphProps> = ({
  trend,
  width = 200,
  height = 60,
  showBands = false,
  showSummary = true,
  showTooltip = true,
  mode = 'sparkline',
  className,
  onClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    point: null,
  });

  const padding = mode === 'sparkline' ? SPARKLINE_PADDING : CHART_PADDING;

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const tierConfig = TRUST_TIER_CONFIG[trend.currentTier];
  const trendIndicator = TREND_ICONS[trend.trend];

  // Scale computations
  const { xScale, yScale } = useMemo(() => {
    const points = trend.dataPoints;
    if (points.length === 0) {
      return {
        xScale: () => 0,
        yScale: () => chartHeight,
      };
    }

    const timestamps = points.map((p) => p.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeRange = maxTime - minTime || 1;

    return {
      xScale: (t: number) => ((t - minTime) / timeRange) * chartWidth,
      yScale: (s: number) => chartHeight - s * chartHeight,
    };
  }, [trend.dataPoints, chartWidth, chartHeight]);

  // Line path
  const linePath = useMemo(() => {
    if (trend.dataPoints.length === 0) return '';
    return trend.dataPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.timestamp)} ${yScale(p.score)}`)
      .join(' ');
  }, [trend.dataPoints, xScale, yScale]);

  // Area path for gradient fill
  const areaPath = useMemo(() => {
    const points = trend.dataPoints;
    if (points.length === 0) return '';

    const line = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.timestamp)} ${yScale(p.score)}`)
      .join(' ');

    const lastX = xScale(points[points.length - 1].timestamp);
    const firstX = xScale(points[0].timestamp);

    return `${line} L ${lastX} ${chartHeight} L ${firstX} ${chartHeight} Z`;
  }, [trend.dataPoints, xScale, yScale, chartHeight]);

  // Tooltip handling
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!showTooltip || trend.dataPoints.length === 0 || !svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = event.clientX - rect.left - padding.left;

      let closestPoint: ReputationDataPoint | null = null;
      let closestDist = Infinity;

      for (const point of trend.dataPoints) {
        const px = xScale(point.timestamp);
        const dist = Math.abs(px - mouseX);
        if (dist < closestDist) {
          closestDist = dist;
          closestPoint = point;
        }
      }

      if (closestPoint && closestDist < 20) {
        setTooltip({
          visible: true,
          x: xScale(closestPoint.timestamp) + padding.left,
          y: yScale(closestPoint.score) + padding.top,
          point: closestPoint,
        });
      } else {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }
    },
    [showTooltip, trend.dataPoints, xScale, yScale, padding],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  }, []);

  const gradientId = `trend-gradient-${trend.agentId.replace(/[^a-zA-Z0-9]/g, '')}`;

  // Empty state
  if (trend.dataPoints.length === 0) {
    return (
      <div
        className={className}
        style={{
          width,
          height: showSummary ? height + 20 : height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: '0.7rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        role="img"
        aria-label="No reputation data available"
      >
        No data
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      {/* SVG Chart */}
      <div style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Reputation trend for agent: score ${(trend.currentScore * 100).toFixed(0)}%, ${trend.trend}, ${trend.change24h > 0 ? '+' : ''}${trend.change24h.toFixed(1)}% change`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tierConfig.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={tierConfig.color} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* Tier threshold bands */}
            {showBands && (
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
              </g>
            )}

            {/* Chart mode: axes */}
            {mode === 'chart' && (
              <g aria-hidden="true">
                {/* Y-axis labels */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((s) => (
                  <text
                    key={s}
                    x={-6}
                    y={yScale(s) + 3}
                    textAnchor="end"
                    fontSize="0.5rem"
                    fill="#9ca3af"
                  >
                    {(s * 100).toFixed(0)}
                  </text>
                ))}

                {/* Y-axis gridlines */}
                {[0.25, 0.5, 0.75].map((s) => (
                  <line
                    key={s}
                    x1={0}
                    y1={yScale(s)}
                    x2={chartWidth}
                    y2={yScale(s)}
                    stroke="#e5e7eb"
                    strokeWidth={0.5}
                    strokeDasharray="2 2"
                  />
                ))}
              </g>
            )}

            {/* Area fill */}
            <path d={areaPath} fill={`url(#${gradientId})`} />

            {/* Score line */}
            <path
              d={linePath}
              fill="none"
              stroke={tierConfig.color}
              strokeWidth={mode === 'sparkline' ? 1.5 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Current score dot */}
            {trend.dataPoints.length > 0 && (() => {
              const lastPoint = trend.dataPoints[trend.dataPoints.length - 1];
              return (
                <circle
                  cx={xScale(lastPoint.timestamp)}
                  cy={yScale(lastPoint.score)}
                  r={mode === 'sparkline' ? 2.5 : 3.5}
                  fill={tierConfig.color}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              );
            })()}

            {/* Tooltip crosshair */}
            {tooltip.visible && tooltip.point && (
              <g>
                <line
                  x1={xScale(tooltip.point.timestamp)}
                  y1={0}
                  x2={xScale(tooltip.point.timestamp)}
                  y2={chartHeight}
                  stroke="#d1d5db"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                <circle
                  cx={xScale(tooltip.point.timestamp)}
                  cy={yScale(tooltip.point.score)}
                  r={4}
                  fill={TRUST_TIER_CONFIG[tooltip.point.tier].color}
                  stroke="#fff"
                  strokeWidth={2}
                />
              </g>
            )}
          </g>
        </svg>

        {/* Tooltip overlay */}
        {tooltip.visible && tooltip.point && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(tooltip.x + 8, width - 120),
              top: Math.max(tooltip.y - 40, 0),
              backgroundColor: 'rgba(26, 26, 46, 0.92)',
              color: '#fff',
              padding: '0.3rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.65rem',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              pointerEvents: 'none',
              zIndex: 10,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
            role="tooltip"
          >
            <div style={{ fontWeight: 600 }}>
              {TRUST_TIER_CONFIG[tooltip.point.tier].label} - {(tooltip.point.score * 100).toFixed(1)}%
            </div>
            <div style={{ opacity: 0.7, fontSize: '0.58rem' }}>
              {new Date(tooltip.point.timestamp).toLocaleDateString()}
            </div>
            {tooltip.point.event && (
              <div style={{ color: TRUST_TIER_CONFIG[tooltip.point.tier].color, fontSize: '0.58rem' }}>
                {tooltip.point.event}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary line */}
      {showSummary && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.2rem 0',
            fontSize: '0.68rem',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <span style={{ color: trendIndicator.color, fontWeight: 700, fontSize: '0.8rem' }}>
              {trendIndicator.icon}
            </span>
            <span style={{ color: '#6b7280', fontWeight: 500 }}>
              {trend.trend.charAt(0).toUpperCase() + trend.trend.slice(1)}
            </span>
          </span>
          <span
            style={{
              color: trend.change24h > 0 ? '#059669' : trend.change24h < 0 ? '#DC2626' : '#6B7280',
              fontWeight: 600,
            }}
          >
            {trend.change24h > 0 ? '+' : ''}{trend.change24h.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default ReputationTrendGraph;
