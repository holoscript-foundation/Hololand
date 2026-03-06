/**
 * KLDivergenceMonitor Component
 *
 * Zero-dependency SVG area chart showing KL divergence over training steps
 * with a beta threshold reference line.
 *
 * Features:
 *   - KL divergence line with filled area beneath
 *   - Dashed red beta threshold reference line
 *   - Alert state when KL exceeds threshold (red border, warning icon)
 *   - Current KL value with color-coded status badge
 *   - WCAG 2.1 AA accessible
 *
 * @module grpo-training-dashboard/KLDivergenceMonitor
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import type { KLDataPoint, GRPOTheme } from './types';
import {
  DEFAULT_GRPO_THEME,
  getKLStatus,
  getKLStatusColor,
  formatStep,
} from './types';

// =============================================================================
// PROPS
// =============================================================================

export interface KLDivergenceMonitorProps {
  /** KL divergence data points */
  data: KLDataPoint[];
  /** Beta threshold for KL penalty (default: 0.04) */
  betaThreshold?: number;
  /** Chart width (default: 700) */
  width?: number;
  /** Chart height (default: 240) */
  height?: number;
  /** Theme overrides */
  theme?: Partial<GRPOTheme>;
  /** Custom CSS class */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Accessible label */
  ariaLabel?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PADDING = { top: 20, right: 20, bottom: 35, left: 50 };

// =============================================================================
// COMPONENT
// =============================================================================

export const KLDivergenceMonitor: React.FC<KLDivergenceMonitorProps> = ({
  data,
  betaThreshold = 0.04,
  width = 700,
  height = 240,
  theme: themeOverride,
  className,
  style,
  ariaLabel = 'KL Divergence Monitor',
}) => {
  const theme = useMemo(
    () => ({ ...DEFAULT_GRPO_THEME, ...themeOverride }),
    [themeOverride],
  );

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  // Current KL value and status
  const currentKL = data.length > 0 ? data[data.length - 1].kl : 0;
  const klStatus = getKLStatus(currentKL, betaThreshold);
  const statusColor = getKLStatusColor(klStatus, theme);
  const isAlert = klStatus === 'critical';

  // Scales
  const { xScale, yScale, yMax, yTicks } = useMemo(() => {
    if (data.length === 0) {
      return {
        xScale: (_: number) => 0,
        yScale: (_: number) => chartH,
        yMax: betaThreshold * 2,
        yTicks: [] as number[],
      };
    }

    const steps = data.map((d) => d.step);
    const minStep = Math.min(...steps);
    const maxStep = Math.max(...steps);
    const stepRange = maxStep - minStep || 1;

    const klValues = data.map((d) => d.kl);
    const maxKL = Math.max(...klValues, betaThreshold * 1.5);
    const yMaxVal = maxKL * 1.2;

    const xs = (step: number) => ((step - minStep) / stepRange) * chartW;
    const ys = (val: number) => chartH - (val / yMaxVal) * chartH;

    // Y ticks
    const tickCount = 5;
    const tickStep = yMaxVal / tickCount;
    const yt: number[] = [];
    for (let i = 0; i <= tickCount; i++) {
      yt.push(i * tickStep);
    }

    return { xScale: xs, yScale: ys, yMax: yMaxVal, yTicks: yt };
  }, [data, chartW, chartH, betaThreshold]);

  // Build line path
  const linePath = useMemo(() => {
    if (data.length === 0) return '';
    return data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.step)} ${yScale(d.kl)}`)
      .join(' ');
  }, [data, xScale, yScale]);

  // Build area path (filled beneath line)
  const areaPath = useMemo(() => {
    if (data.length === 0) return '';
    const start = `M ${xScale(data[0].step)} ${chartH}`;
    const lineUp = data
      .map((d) => `L ${xScale(d.step)} ${yScale(d.kl)}`)
      .join(' ');
    const close = `L ${xScale(data[data.length - 1].step)} ${chartH} Z`;
    return `${start} ${lineUp} ${close}`;
  }, [data, xScale, yScale, chartH]);

  // X ticks
  const xTicks = useMemo(() => {
    if (data.length === 0) return [];
    const count = Math.min(6, data.length);
    const step = Math.floor(data.length / Math.max(count - 1, 1));
    const ticks: number[] = [];
    for (let i = 0; i < data.length; i += step) {
      ticks.push(data[i].step);
    }
    if (ticks[ticks.length - 1] !== data[data.length - 1].step) {
      ticks.push(data[data.length - 1].step);
    }
    return ticks;
  }, [data]);

  // Mouse handler
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      if (data.length === 0 || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - PADDING.left;
      const fraction = mouseX / chartW;
      const idx = Math.round(fraction * (data.length - 1));
      setHoveredIndex(Math.max(0, Math.min(data.length - 1, idx)));
    },
    [data, chartW],
  );

  const handleMouseLeave = useCallback(() => setHoveredIndex(null), []);

  const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div
      className={className}
      style={{
        backgroundColor: theme.cardBackground,
        border: `1px solid ${isAlert ? theme.dangerColor : theme.borderColor}`,
        borderRadius: theme.borderRadius,
        padding: '0.75rem',
        transition: 'border-color 0.3s ease',
        ...style,
      }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isAlert && (
            <span
              style={{
                color: theme.dangerColor,
                fontSize: `calc(1rem * ${theme.fontScale})`,
                lineHeight: 1,
              }}
              role="img"
              aria-label="Warning: KL divergence exceeds threshold"
            >
              &#9888;
            </span>
          )}
          <span
            style={{
              fontSize: `calc(0.8rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.textPrimary,
              fontFamily: theme.fontFamily,
            }}
          >
            KL Divergence
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            role="status"
            aria-label={`Current KL divergence: ${currentKL.toFixed(4)}, status: ${klStatus}`}
            style={{
              fontSize: `calc(0.9rem * ${theme.fontScale})`,
              fontWeight: 700,
              color: statusColor,
              fontFamily: theme.fontFamily,
            }}
          >
            {currentKL.toFixed(4)}
          </span>
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: statusColor,
              border: `1px solid ${statusColor}`,
              borderRadius: '4px',
              padding: '0.1rem 0.35rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {klStatus}
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ display: 'block', maxWidth: `${width}px` }}
        role="img"
        aria-label={`Area chart showing KL divergence over ${data.length} training steps. Threshold at ${betaThreshold}.`}
      >
        <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
          {/* Grid lines */}
          {yTicks.map((tick) => (
            <line
              key={`grid-${tick}`}
              x1={0}
              y1={yScale(tick)}
              x2={chartW}
              y2={yScale(tick)}
              stroke={theme.borderColor}
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
          ))}

          {/* Y axis labels */}
          {yTicks.map((tick) => (
            <text
              key={`ylabel-${tick}`}
              x={-8}
              y={yScale(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fill={theme.textMuted}
              fontSize={`calc(0.55rem * ${theme.fontScale})`}
              fontFamily={theme.fontFamily}
            >
              {tick.toFixed(3)}
            </text>
          ))}

          {/* X axis labels */}
          {xTicks.map((step) => (
            <text
              key={`xlabel-${step}`}
              x={xScale(step)}
              y={chartH + 18}
              textAnchor="middle"
              fill={theme.textMuted}
              fontSize={`calc(0.55rem * ${theme.fontScale})`}
              fontFamily={theme.fontFamily}
            >
              {formatStep(step)}
            </text>
          ))}

          {/* Beta threshold line (dashed red) */}
          {yScale(betaThreshold) >= 0 && yScale(betaThreshold) <= chartH && (
            <>
              <line
                x1={0}
                y1={yScale(betaThreshold)}
                x2={chartW}
                y2={yScale(betaThreshold)}
                stroke={theme.klThresholdColor}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                opacity={0.8}
              />
              <text
                x={chartW + 4}
                y={yScale(betaThreshold)}
                dominantBaseline="middle"
                fill={theme.klThresholdColor}
                fontSize={`calc(0.55rem * ${theme.fontScale})`}
                fontFamily={theme.fontFamily}
              >
                {'\u03B2'}={betaThreshold}
              </text>
            </>
          )}

          {/* Area fill */}
          <path
            d={areaPath}
            fill={theme.klAreaColor}
          />

          {/* KL line */}
          <path
            d={linePath}
            fill="none"
            stroke={theme.klLineColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover crosshair */}
          {hoveredData && (
            <>
              <line
                x1={xScale(hoveredData.step)}
                y1={0}
                x2={xScale(hoveredData.step)}
                y2={chartH}
                stroke={theme.textMuted}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <circle
                cx={xScale(hoveredData.step)}
                cy={yScale(hoveredData.kl)}
                r={4}
                fill={theme.klLineColor}
                stroke={theme.cardBackground}
                strokeWidth={2}
              />
            </>
          )}

          {/* Interaction rect */}
          <rect
            x={0}
            y={0}
            width={chartW}
            height={chartH}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: data.length > 0 ? 'crosshair' : 'default' }}
          />
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredData && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '0.25rem',
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontFamily: theme.fontFamily,
            color: theme.textSecondary,
          }}
        >
          <span>Step: <strong style={{ color: theme.textPrimary }}>{formatStep(hoveredData.step)}</strong></span>
          <span>KL: <strong style={{ color: getKLStatusColor(getKLStatus(hoveredData.kl, betaThreshold), theme) }}>{hoveredData.kl.toFixed(5)}</strong></span>
          <span>Beta: <strong style={{ color: theme.textPrimary }}>{hoveredData.beta.toFixed(4)}</strong></span>
        </div>
      )}

      {/* Accessible data table (screen readers only) */}
      <table
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
        aria-label="KL divergence data"
      >
        <thead>
          <tr>
            <th scope="col">Step</th>
            <th scope="col">KL Divergence</th>
            <th scope="col">Beta</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(-10).map((d) => (
            <tr key={d.step}>
              <td>{d.step}</td>
              <td>{d.kl.toFixed(5)}</td>
              <td>{d.beta.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default KLDivergenceMonitor;
