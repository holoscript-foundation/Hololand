/**
 * ForgettingPanel Component
 *
 * OPLoRA health indicators showing orthogonal projection constraint
 * and general ability benchmark trends.
 *
 * Features:
 *   - Orthogonal projection constraint gauge (0-1 scale)
 *   - HumanEval/MBPP trend lines with baseline reference
 *   - Alert when general ability drops more than 2%
 *   - WCAG 2.1 AA accessible
 *
 * @module grpo-training-dashboard/ForgettingPanel
 */

import React, { useMemo } from 'react';
import type { ForgettingMetrics, GRPOTheme } from './types';
import {
  DEFAULT_GRPO_THEME,
  formatStep,
  formatPercent,
} from './types';

// =============================================================================
// PROPS
// =============================================================================

export interface ForgettingPanelProps {
  /** Forgetting metrics (null if unavailable) */
  metrics: ForgettingMetrics | null;
  /** Chart width (default: 350) */
  width?: number;
  /** Trend chart height (default: 160) */
  trendHeight?: number;
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

const GAUGE_RADIUS = 50;
const GAUGE_STROKE = 10;
const TREND_PAD = { top: 10, right: 10, bottom: 25, left: 40 };

// =============================================================================
// COMPONENT
// =============================================================================

export const ForgettingPanel: React.FC<ForgettingPanelProps> = ({
  metrics,
  width = 350,
  trendHeight = 160,
  theme: themeOverride,
  className,
  style,
  ariaLabel = 'OPLoRA Forgetting Monitor',
}) => {
  const theme = useMemo(
    () => ({ ...DEFAULT_GRPO_THEME, ...themeOverride }),
    [themeOverride],
  );

  if (!metrics) {
    return (
      <div
        className={className}
        style={{
          backgroundColor: theme.cardBackground,
          border: `1px solid ${theme.borderColor}`,
          borderRadius: theme.borderRadius,
          padding: '1.5rem',
          textAlign: 'center',
          color: theme.textMuted,
          fontFamily: theme.fontFamily,
          fontSize: `calc(0.75rem * ${theme.fontScale})`,
          ...style,
        }}
        role="region"
        aria-label={ariaLabel}
      >
        No forgetting metrics available yet.
      </div>
    );
  }

  const { oplora, benchmarks, humanEvalBaseline, mbppBaseline, forgettingAlert } = metrics;

  // Gauge calculations
  const constraintFraction = Math.min(1, oplora.constraintValue / (oplora.constraintThreshold * 2));
  const gaugeCircumference = 2 * Math.PI * GAUGE_RADIUS;
  const halfCircumference = gaugeCircumference / 2; // semicircle
  const gaugeOffset = halfCircumference * (1 - constraintFraction);
  const gaugeColor = oplora.constraintValue > oplora.constraintThreshold
    ? theme.dangerColor
    : oplora.constraintValue > oplora.constraintThreshold * 0.75
      ? theme.warningColor
      : theme.successColor;

  // Trend chart dimensions
  const trendW = width - TREND_PAD.left - TREND_PAD.right;
  const trendH = trendHeight - TREND_PAD.top - TREND_PAD.bottom;

  // Trend scales
  const trendScales = useMemo(() => {
    if (benchmarks.length === 0) {
      return {
        xScale: (_: number) => 0,
        yScale: (_: number) => trendH,
        yTicks: [] as number[],
      };
    }

    const steps = benchmarks.map((b) => b.step);
    const minStep = Math.min(...steps);
    const maxStep = Math.max(...steps);
    const stepRange = maxStep - minStep || 1;

    const allVals = [
      ...benchmarks.map((b) => b.humanEval),
      ...benchmarks.map((b) => b.mbpp),
      humanEvalBaseline,
      mbppBaseline,
    ];
    const minVal = Math.min(...allVals) * 0.95;
    const maxVal = Math.max(...allVals) * 1.05;
    const valRange = maxVal - minVal || 1;

    const xs = (step: number) => ((step - minStep) / stepRange) * trendW;
    const ys = (val: number) => trendH - ((val - minVal) / valRange) * trendH;

    // Y ticks
    const tickCount = 4;
    const tickStep = valRange / tickCount;
    const yt: number[] = [];
    for (let i = 0; i <= tickCount; i++) {
      yt.push(minVal + i * tickStep);
    }

    return { xScale: xs, yScale: ys, yTicks: yt };
  }, [benchmarks, humanEvalBaseline, mbppBaseline, trendW, trendH]);

  // Build trend line paths
  const humanEvalPath = useMemo(() => {
    if (benchmarks.length === 0) return '';
    return benchmarks
      .map((b, i) => `${i === 0 ? 'M' : 'L'} ${trendScales.xScale(b.step)} ${trendScales.yScale(b.humanEval)}`)
      .join(' ');
  }, [benchmarks, trendScales]);

  const mbppPath = useMemo(() => {
    if (benchmarks.length === 0) return '';
    return benchmarks
      .map((b, i) => `${i === 0 ? 'M' : 'L'} ${trendScales.xScale(b.step)} ${trendScales.yScale(b.mbpp)}`)
      .join(' ');
  }, [benchmarks, trendScales]);

  return (
    <div
      className={className}
      style={{
        backgroundColor: theme.cardBackground,
        border: `1px solid ${forgettingAlert ? theme.dangerColor : theme.borderColor}`,
        borderRadius: theme.borderRadius,
        padding: '0.75rem',
        fontFamily: theme.fontFamily,
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
          {forgettingAlert && (
            <span
              style={{ color: theme.dangerColor, fontSize: `calc(1rem * ${theme.fontScale})`, lineHeight: 1 }}
              role="img"
              aria-label="Warning: general ability has dropped more than 2%"
            >
              &#9888;
            </span>
          )}
          <span
            style={{
              fontSize: `calc(0.8rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.textPrimary,
            }}
          >
            OPLoRA Forgetting
          </span>
        </div>
        {forgettingAlert && (
          <span
            role="alert"
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.dangerColor,
              border: `1px solid ${theme.dangerColor}`,
              borderRadius: '4px',
              padding: '0.1rem 0.35rem',
              textTransform: 'uppercase',
            }}
          >
            Ability Drop &gt;2%
          </span>
        )}
      </div>

      {/* Orthogonal Projection Constraint Gauge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '0.75rem',
        }}
      >
        <svg
          width={GAUGE_RADIUS * 2 + GAUGE_STROKE + 10}
          height={GAUGE_RADIUS + GAUGE_STROKE + 20}
          role="meter"
          aria-label={`Orthogonal projection constraint: ${(oplora.constraintValue).toFixed(4)} (threshold: ${oplora.constraintThreshold})`}
          aria-valuenow={oplora.constraintValue}
          aria-valuemin={0}
          aria-valuemax={oplora.constraintThreshold * 2}
        >
          <g transform={`translate(${GAUGE_RADIUS + GAUGE_STROKE / 2 + 5}, ${GAUGE_RADIUS + GAUGE_STROKE / 2 + 5})`}>
            {/* Background arc (semicircle) */}
            <path
              d={`M ${-GAUGE_RADIUS} 0 A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${GAUGE_RADIUS} 0`}
              fill="none"
              stroke={theme.borderColor}
              strokeWidth={GAUGE_STROKE}
              strokeLinecap="round"
            />
            {/* Value arc */}
            <path
              d={`M ${-GAUGE_RADIUS} 0 A ${GAUGE_RADIUS} ${GAUGE_RADIUS} 0 0 1 ${GAUGE_RADIUS} 0`}
              fill="none"
              stroke={gaugeColor}
              strokeWidth={GAUGE_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${halfCircumference}`}
              strokeDashoffset={gaugeOffset}
            />
            {/* Threshold marker */}
            {(() => {
              const threshFraction = oplora.constraintThreshold / (oplora.constraintThreshold * 2);
              const angle = Math.PI * (1 - threshFraction);
              const markerX = GAUGE_RADIUS * Math.cos(angle) * -1;
              const markerY = -GAUGE_RADIUS * Math.sin(angle);
              return (
                <line
                  x1={markerX * 0.85}
                  y1={markerY * 0.85}
                  x2={markerX * 1.15}
                  y2={markerY * 1.15}
                  stroke={theme.dangerColor}
                  strokeWidth={2}
                />
              );
            })()}
            {/* Center value */}
            <text
              x={0}
              y={-10}
              textAnchor="middle"
              fill={gaugeColor}
              fontSize={`calc(0.9rem * ${theme.fontScale})`}
              fontWeight={700}
              fontFamily={theme.fontFamily}
            >
              {oplora.constraintValue.toFixed(4)}
            </text>
            <text
              x={0}
              y={8}
              textAnchor="middle"
              fill={theme.textMuted}
              fontSize={`calc(0.55rem * ${theme.fontScale})`}
              fontFamily={theme.fontFamily}
            >
              threshold: {oplora.constraintThreshold}
            </text>
          </g>
        </svg>
      </div>

      {/* Benchmark Trend Lines */}
      {benchmarks.length > 0 && (
        <>
          <div
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.textSecondary,
              marginBottom: '0.25rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            General Ability Trends
          </div>

          {/* Legend */}
          <div
            style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.25rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: `calc(0.6rem * ${theme.fontScale})` }}>
              <span style={{ width: '12px', height: '2px', backgroundColor: theme.humanEvalColor, display: 'inline-block' }} aria-hidden="true" />
              <span style={{ color: theme.textSecondary }}>HumanEval</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: `calc(0.6rem * ${theme.fontScale})` }}>
              <span style={{ width: '12px', height: '2px', backgroundColor: theme.mbppColor, display: 'inline-block' }} aria-hidden="true" />
              <span style={{ color: theme.textSecondary }}>MBPP</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: `calc(0.6rem * ${theme.fontScale})` }}>
              <span style={{ width: '12px', height: '2px', backgroundColor: theme.baselineColor, display: 'inline-block', borderTop: '1px dashed', borderBottom: 'none', background: 'none' }} aria-hidden="true" />
              <span style={{ color: theme.textMuted }}>Baselines</span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${width} ${trendHeight}`}
            width="100%"
            style={{ display: 'block' }}
            role="img"
            aria-label={`Trend lines showing HumanEval and MBPP scores over ${benchmarks.length} evaluation checkpoints`}
          >
            <g transform={`translate(${TREND_PAD.left}, ${TREND_PAD.top})`}>
              {/* Grid */}
              {trendScales.yTicks.map((tick, i) => (
                <line
                  key={`tgrid-${i}`}
                  x1={0}
                  y1={trendScales.yScale(tick)}
                  x2={trendW}
                  y2={trendScales.yScale(tick)}
                  stroke={theme.borderColor}
                  strokeWidth={0.5}
                  strokeDasharray="3 3"
                />
              ))}

              {/* Y labels */}
              {trendScales.yTicks.map((tick, i) => (
                <text
                  key={`tylabel-${i}`}
                  x={-6}
                  y={trendScales.yScale(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill={theme.textMuted}
                  fontSize={`calc(0.5rem * ${theme.fontScale})`}
                  fontFamily={theme.fontFamily}
                >
                  {formatPercent(tick)}
                </text>
              ))}

              {/* X labels */}
              {benchmarks.length > 1 && [benchmarks[0], benchmarks[benchmarks.length - 1]].map((b) => (
                <text
                  key={`txlabel-${b.step}`}
                  x={trendScales.xScale(b.step)}
                  y={trendH + 16}
                  textAnchor="middle"
                  fill={theme.textMuted}
                  fontSize={`calc(0.5rem * ${theme.fontScale})`}
                  fontFamily={theme.fontFamily}
                >
                  {formatStep(b.step)}
                </text>
              ))}

              {/* Baseline lines (dashed) */}
              <line
                x1={0}
                y1={trendScales.yScale(humanEvalBaseline)}
                x2={trendW}
                y2={trendScales.yScale(humanEvalBaseline)}
                stroke={theme.baselineColor}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.6}
              />
              <line
                x1={0}
                y1={trendScales.yScale(mbppBaseline)}
                x2={trendW}
                y2={trendScales.yScale(mbppBaseline)}
                stroke={theme.baselineColor}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.6}
              />

              {/* HumanEval trend line */}
              <path
                d={humanEvalPath}
                fill="none"
                stroke={theme.humanEvalColor}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* MBPP trend line */}
              <path
                d={mbppPath}
                fill="none"
                stroke={theme.mbppColor}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data point markers */}
              {benchmarks.map((b) => (
                <React.Fragment key={b.step}>
                  <circle
                    cx={trendScales.xScale(b.step)}
                    cy={trendScales.yScale(b.humanEval)}
                    r={3}
                    fill={theme.humanEvalColor}
                  />
                  <circle
                    cx={trendScales.xScale(b.step)}
                    cy={trendScales.yScale(b.mbpp)}
                    r={3}
                    fill={theme.mbppColor}
                  />
                </React.Fragment>
              ))}
            </g>
          </svg>

          {/* Current values */}
          {benchmarks.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                marginTop: '0.25rem',
              }}
              role="status"
              aria-label="Current benchmark scores"
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: `calc(0.55rem * ${theme.fontScale})`, color: theme.textMuted, textTransform: 'uppercase' }}>
                  HumanEval
                </div>
                <div style={{ fontSize: `calc(0.8rem * ${theme.fontScale})`, fontWeight: 700, color: theme.humanEvalColor }}>
                  {formatPercent(benchmarks[benchmarks.length - 1].humanEval)}
                </div>
                <div style={{ fontSize: `calc(0.5rem * ${theme.fontScale})`, color: theme.textMuted }}>
                  baseline: {formatPercent(humanEvalBaseline)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: `calc(0.55rem * ${theme.fontScale})`, color: theme.textMuted, textTransform: 'uppercase' }}>
                  MBPP
                </div>
                <div style={{ fontSize: `calc(0.8rem * ${theme.fontScale})`, fontWeight: 700, color: theme.mbppColor }}>
                  {formatPercent(benchmarks[benchmarks.length - 1].mbpp)}
                </div>
                <div style={{ fontSize: `calc(0.5rem * ${theme.fontScale})`, color: theme.textMuted }}>
                  baseline: {formatPercent(mbppBaseline)}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ForgettingPanel;
