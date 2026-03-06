/**
 * RewardCurveChart Component
 *
 * Zero-dependency SVG line chart showing 6 reward signal curves over
 * training steps: testPassReward, typeCheckReward, lintReward,
 * coverageReward, circuitBreakerReward, and composite.
 *
 * Features:
 *   - Toggle individual curves on/off via legend
 *   - Hover tooltips with exact values for all visible curves
 *   - Responsive SVG viewBox
 *   - WCAG 2.1 AA accessible (keyboard navigation, screen reader labels)
 *
 * @module grpo-training-dashboard/RewardCurveChart
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import type {
  RewardDataPoint,
  RewardSignalConfig,
  RewardSignalName,
  GRPOTheme,
} from './types';
import {
  DEFAULT_GRPO_THEME,
  DEFAULT_REWARD_CONFIGS,
  formatStep,
} from './types';

// =============================================================================
// PROPS
// =============================================================================

export interface RewardCurveChartProps {
  /** Reward data points over training steps */
  data: RewardDataPoint[];
  /** Reward signal configurations (default: DEFAULT_REWARD_CONFIGS) */
  signalConfigs?: RewardSignalConfig[];
  /** Chart width (default: 700) */
  width?: number;
  /** Chart height (default: 340) */
  height?: number;
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
// CONSTANTS
// =============================================================================

const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

// =============================================================================
// COMPONENT
// =============================================================================

export const RewardCurveChart: React.FC<RewardCurveChartProps> = ({
  data,
  signalConfigs: signalConfigsProp,
  width = 700,
  height = 340,
  theme: themeOverride,
  className,
  style,
  ariaLabel = 'GRPO Reward Curves',
}) => {
  const theme = useMemo(
    () => ({ ...DEFAULT_GRPO_THEME, ...themeOverride }),
    [themeOverride],
  );

  const [configs, setConfigs] = useState<RewardSignalConfig[]>(
    () => signalConfigsProp ?? [...DEFAULT_REWARD_CONFIGS],
  );

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  // Scales
  const { xScale, yScale, xTicks, yTicks } = useMemo(() => {
    if (data.length === 0) {
      return {
        xScale: (_: number) => 0,
        yScale: (_: number) => chartH,
        xTicks: [] as number[],
        yTicks: [] as number[],
      };
    }

    const steps = data.map((d) => d.step);
    const minStep = Math.min(...steps);
    const maxStep = Math.max(...steps);
    const stepRange = maxStep - minStep || 1;

    const xs = (step: number) =>
      ((step - minStep) / stepRange) * chartW;

    // Y range: 0-1 for reward scores
    const ys = (val: number) => chartH - val * chartH;

    // X axis ticks
    const xTickCount = Math.min(6, data.length);
    const xTickStep = Math.floor(data.length / Math.max(xTickCount - 1, 1));
    const xt: number[] = [];
    for (let i = 0; i < data.length; i += xTickStep) {
      xt.push(data[i].step);
    }
    if (xt[xt.length - 1] !== data[data.length - 1].step) {
      xt.push(data[data.length - 1].step);
    }

    // Y axis ticks: 0.0, 0.2, 0.4, 0.6, 0.8, 1.0
    const yt = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

    return { xScale: xs, yScale: ys, xTicks: xt, yTicks: yt };
  }, [data, chartW, chartH]);

  // Build SVG path for a signal
  const buildPath = useCallback(
    (signalName: RewardSignalName): string => {
      if (data.length === 0) return '';
      return data
        .map((d, i) => {
          const x = xScale(d.step);
          const y = yScale(d.rewards[signalName] ?? 0);
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
    },
    [data, xScale, yScale],
  );

  // Toggle curve visibility
  const toggleSignal = useCallback((name: RewardSignalName) => {
    setConfigs((prev) =>
      prev.map((c) =>
        c.name === name ? { ...c, visible: !c.visible } : c,
      ),
    );
  }, []);

  // Mouse hover handler
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      if (data.length === 0 || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - PADDING.left;
      const fraction = mouseX / chartW;
      const idx = Math.round(fraction * (data.length - 1));
      const clampedIdx = Math.max(0, Math.min(data.length - 1, idx));
      setHoveredIndex(clampedIdx);
      setTooltipPos({
        x: PADDING.left + xScale(data[clampedIdx].step),
        y: PADDING.top,
      });
    },
    [data, chartW, xScale],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  // Hovered data
  const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div
      className={className}
      style={{
        backgroundColor: theme.cardBackground,
        border: `1px solid ${theme.borderColor}`,
        borderRadius: theme.borderRadius,
        padding: '0.75rem',
        ...style,
      }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header with legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
          flexWrap: 'wrap',
          gap: '0.25rem',
        }}
      >
        <span
          style={{
            fontSize: `calc(0.8rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: theme.textPrimary,
            fontFamily: theme.fontFamily,
          }}
        >
          Reward Curves
        </span>
        <div
          style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
          role="group"
          aria-label="Toggle reward curves"
        >
          {configs.map((cfg) => (
            <button
              key={cfg.name}
              type="button"
              onClick={() => toggleSignal(cfg.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: `calc(0.65rem * ${theme.fontScale})`,
                fontFamily: theme.fontFamily,
                color: cfg.visible ? cfg.color : theme.textMuted,
                backgroundColor: 'transparent',
                border: `1px solid ${cfg.visible ? cfg.color : theme.borderColor}`,
                borderRadius: '4px',
                padding: '0.1rem 0.4rem',
                cursor: 'pointer',
                opacity: cfg.visible ? 1 : 0.5,
                transition: 'opacity 0.15s ease',
              }}
              aria-pressed={cfg.visible}
              aria-label={`${cfg.visible ? 'Hide' : 'Show'} ${cfg.label} curve${cfg.weight !== null ? ` (weight: ${cfg.weight})` : ''}`}
            >
              <span
                style={{
                  width: '8px',
                  height: '3px',
                  backgroundColor: cfg.color,
                  display: 'inline-block',
                  borderRadius: '1px',
                }}
                aria-hidden="true"
              />
              {cfg.label}
              {cfg.weight !== null && (
                <span style={{ color: theme.textMuted, fontSize: '0.55rem' }}>
                  {cfg.weight}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ display: 'block', maxWidth: `${width}px` }}
        role="img"
        aria-label={`Line chart showing ${configs.filter((c) => c.visible).length} reward curves over ${data.length} training steps`}
      >
        <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
          {/* Grid lines */}
          {yTicks.map((tick) => (
            <line
              key={`grid-y-${tick}`}
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
              key={`label-y-${tick}`}
              x={-8}
              y={yScale(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fill={theme.textMuted}
              fontSize={`calc(0.6rem * ${theme.fontScale})`}
              fontFamily={theme.fontFamily}
            >
              {tick.toFixed(1)}
            </text>
          ))}

          {/* X axis labels */}
          {xTicks.map((step) => (
            <text
              key={`label-x-${step}`}
              x={xScale(step)}
              y={chartH + 20}
              textAnchor="middle"
              fill={theme.textMuted}
              fontSize={`calc(0.6rem * ${theme.fontScale})`}
              fontFamily={theme.fontFamily}
            >
              {formatStep(step)}
            </text>
          ))}

          {/* X axis label */}
          <text
            x={chartW / 2}
            y={chartH + 35}
            textAnchor="middle"
            fill={theme.textMuted}
            fontSize={`calc(0.6rem * ${theme.fontScale})`}
            fontFamily={theme.fontFamily}
          >
            Training Step
          </text>

          {/* Y axis label */}
          <text
            x={-chartH / 2}
            y={-38}
            transform="rotate(-90)"
            textAnchor="middle"
            fill={theme.textMuted}
            fontSize={`calc(0.6rem * ${theme.fontScale})`}
            fontFamily={theme.fontFamily}
          >
            Reward
          </text>

          {/* Reward curves */}
          {configs
            .filter((cfg) => cfg.visible)
            .map((cfg) => (
              <path
                key={cfg.name}
                d={buildPath(cfg.name)}
                fill="none"
                stroke={cfg.color}
                strokeWidth={cfg.name === 'composite' ? 2.5 : 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={cfg.name === 'composite' ? 1 : 0.85}
              />
            ))}

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
                opacity={0.6}
              />
              {configs
                .filter((c) => c.visible)
                .map((cfg) => (
                  <circle
                    key={`dot-${cfg.name}`}
                    cx={xScale(hoveredData.step)}
                    cy={yScale(hoveredData.rewards[cfg.name] ?? 0)}
                    r={3.5}
                    fill={cfg.color}
                    stroke={theme.cardBackground}
                    strokeWidth={1.5}
                  />
                ))}
            </>
          )}

          {/* Invisible interaction rectangle */}
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
            position: 'relative',
            backgroundColor: theme.containerBackground,
            border: `1px solid ${theme.borderColor}`,
            borderRadius: '6px',
            padding: '0.5rem 0.75rem',
            marginTop: '0.5rem',
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontFamily: theme.fontFamily,
          }}
        >
          <div style={{ fontWeight: 600, color: theme.textSecondary, marginBottom: '0.25rem' }}>
            Step {formatStep(hoveredData.step)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.25rem 0.75rem' }}>
            {configs
              .filter((c) => c.visible)
              .map((cfg) => (
                <div key={cfg.name} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: cfg.color,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  <span style={{ color: theme.textMuted }}>{cfg.label}:</span>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>
                    {(hoveredData.rewards[cfg.name] ?? 0).toFixed(4)}
                  </span>
                </div>
              ))}
          </div>
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
        aria-label="Reward curve data"
      >
        <thead>
          <tr>
            <th scope="col">Step</th>
            {configs.map((c) => (
              <th key={c.name} scope="col">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(-10).map((d) => (
            <tr key={d.step}>
              <td>{d.step}</td>
              {configs.map((c) => (
                <td key={c.name}>{(d.rewards[c.name] ?? 0).toFixed(4)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RewardCurveChart;
