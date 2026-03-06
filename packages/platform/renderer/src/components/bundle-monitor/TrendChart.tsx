/**
 * TrendChart Component
 *
 * Displays historical bundle size trends as a simple SVG sparkline
 * chart with budget threshold line. Shows per-build data points
 * with commit hashes and CI status indicators.
 *
 * Uses pure SVG rendering (no chart library dependency) to keep
 * the bundle size of the bundle monitor itself minimal.
 *
 * @module bundle-monitor/TrendChart
 */

import React, { useMemo } from 'react';
import type {
  TrendDataPoint,
  BundleMonitorTheme,
} from './types';
import { getCIStatusColor, formatSize } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface TrendChartProps {
  /** Historical trend data points */
  trendData: TrendDataPoint[];
  /** Total budget in bytes (for threshold line) */
  totalBudget: number;
  /** Theme */
  theme: BundleMonitorTheme;
  /** Chart width (default: auto/100%) */
  width?: number;
  /** Chart height (default: 120) */
  height?: number;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
}

// =============================================================================
// COMPONENT
// =============================================================================

const PADDING = { top: 12, right: 10, bottom: 20, left: 50 };

export const TrendChart: React.FC<TrendChartProps> = ({
  trendData,
  totalBudget,
  theme,
  width: fixedWidth,
  height = 120,
  className,
  style,
}) => {
  // Use a default width for SVG viewBox
  const svgWidth = fixedWidth ?? 400;
  const plotWidth = svgWidth - PADDING.left - PADDING.right;
  const plotHeight = height - PADDING.top - PADDING.bottom;

  const { points, budgetY, yMax, yMin } = useMemo(() => {
    if (trendData.length === 0) {
      return { points: [], budgetY: 0, yMax: totalBudget * 1.2, yMin: 0 };
    }

    const sizes = trendData.map((d) => d.totalGzipSize);
    const dataMax = Math.max(...sizes, totalBudget);
    const dataMin = Math.min(...sizes, 0);
    const yMax = dataMax * 1.15;
    const yMin = Math.max(dataMin * 0.8, 0);
    const yRange = yMax - yMin;

    const budgetY = PADDING.top + plotHeight * (1 - (totalBudget - yMin) / yRange);

    const pts = trendData.map((d, i) => {
      const x = PADDING.left + (trendData.length > 1 ? (i / (trendData.length - 1)) * plotWidth : plotWidth / 2);
      const y = PADDING.top + plotHeight * (1 - (d.totalGzipSize - yMin) / yRange);
      return { x, y, data: d };
    });

    return { points: pts, budgetY, yMax, yMin };
  }, [trendData, totalBudget, plotWidth, plotHeight]);

  // Build SVG path for trend line
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
  }, [points]);

  // Build SVG path for area fill
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const linePoints = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
    const bottomRight = `L${points[points.length - 1].x.toFixed(1)},${(PADDING.top + plotHeight).toFixed(1)}`;
    const bottomLeft = `L${points[0].x.toFixed(1)},${(PADDING.top + plotHeight).toFixed(1)}`;
    return `${linePoints} ${bottomRight} ${bottomLeft} Z`;
  }, [points, plotHeight]);

  return (
    <div
      className={className}
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        ...style,
      }}
      role="region"
      aria-label="Historical bundle size trend"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.4rem',
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
          Size Trend ({trendData.length} builds)
        </span>
      </div>

      {trendData.length === 0 ? (
        <div
          style={{
            padding: '0.75rem',
            textAlign: 'center',
            color: theme.textMuted,
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
          }}
        >
          No historical build data available yet.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          width="100%"
          height={height}
          style={{ display: 'block' }}
          role="img"
          aria-label={`Bundle size trend chart: ${trendData.length} data points`}
        >
          {/* Y-axis labels */}
          <text
            x={PADDING.left - 4}
            y={PADDING.top + 4}
            textAnchor="end"
            fill={theme.textMuted}
            fontSize="8"
            fontFamily={theme.monoFontFamily}
          >
            {formatSize(yMax)}
          </text>
          <text
            x={PADDING.left - 4}
            y={PADDING.top + plotHeight}
            textAnchor="end"
            fill={theme.textMuted}
            fontSize="8"
            fontFamily={theme.monoFontFamily}
          >
            {formatSize(yMin)}
          </text>

          {/* Budget threshold line */}
          <line
            x1={PADDING.left}
            y1={budgetY}
            x2={svgWidth - PADDING.right}
            y2={budgetY}
            stroke={theme.budgetLineColor}
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity={0.6}
          />
          <text
            x={svgWidth - PADDING.right + 2}
            y={budgetY + 3}
            fill={theme.budgetLineColor}
            fontSize="7"
            fontFamily={theme.monoFontFamily}
            opacity={0.8}
          >
            budget
          </text>

          {/* Area fill */}
          <path
            d={areaPath}
            fill={`${theme.trendColor}15`}
          />

          {/* Trend line */}
          <path
            d={linePath}
            fill="none"
            stroke={theme.trendColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((p, i) => {
            const ciColor = getCIStatusColor(p.data.ciStatus, theme);
            const isOverBudget = p.data.totalGzipSize > totalBudget;
            return (
              <g key={p.data.buildId}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={3}
                  fill={isOverBudget ? theme.exceededColor : theme.trendColor}
                  stroke={theme.containerBackground}
                  strokeWidth="1"
                />
                {/* CI status dot below */}
                <circle
                  cx={p.x}
                  cy={PADDING.top + plotHeight + 8}
                  r={2}
                  fill={ciColor}
                />
                {/* Commit hash labels (every Nth point to avoid overlap) */}
                {(trendData.length <= 10 || i % Math.ceil(trendData.length / 10) === 0) && (
                  <text
                    x={p.x}
                    y={PADDING.top + plotHeight + 16}
                    textAnchor="middle"
                    fill={theme.textMuted}
                    fontSize="6"
                    fontFamily={theme.monoFontFamily}
                  >
                    {p.data.commitHash.substring(0, 7)}
                  </text>
                )}

                {/* Tooltip rect (hover target) */}
                <title>
                  {`Build ${p.data.commitHash}: ${formatSize(p.data.totalGzipSize)} (${(p.data.budgetUtilization * 100).toFixed(0)}% budget, ${p.data.chunkCount} chunks, CI: ${p.data.ciStatus})`}
                </title>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};

export default TrendChart;
