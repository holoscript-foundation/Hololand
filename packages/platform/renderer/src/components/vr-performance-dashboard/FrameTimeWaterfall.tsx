/**
 * FrameTimeWaterfall Component
 *
 * Renders a stacked horizontal waterfall chart showing per-frame timing
 * breakdown across the Gaussian splatting render pipeline phases:
 *
 *   1. Frustum Cull  -> CPU-side visibility determination
 *   2. Tile Assign   -> Foveated zone classification per tile
 *   3. Depth Sort    -> Radix sort (GPU or CPU)
 *   4. StopThePop    -> Hierarchical per-pixel re-sorting
 *   5. Rasterize     -> Alpha blending / splatting
 *   6. Blend Zone    -> Foveated blend interpolation
 *   7. GPU Sync      -> Readback / synchronization
 *
 * The chart shows a rolling window of recent frames as horizontal
 * stacked bars, with a vertical budget line indicating the target
 * frame time (default 11.1ms for 90Hz VR).
 *
 * Features:
 *   - Stacked horizontal bars per frame (most recent at top)
 *   - Budget line with ms labels
 *   - Hover tooltip showing per-phase timing
 *   - Color-coded phases matching the render pipeline
 *   - Over-budget frames highlighted with red border
 *   - Frame number labels on Y axis
 *   - Time (ms) labels on X axis
 *
 * Accessibility (WCAG 2.1 AA):
 *   - role="img" with descriptive aria-label on SVG
 *   - Screen-reader data table alternative
 *   - High-contrast phase colors (>= 4.5:1 against dark bg)
 *   - Keyboard accessible tooltip trigger points
 *
 * @module vr-performance-dashboard/FrameTimeWaterfall
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { GaussianRenderTimings } from '../../FoveatedGaussianTypes';
import type { VRPerfTheme, FrameTimeSample } from './types';
import {
  DEFAULT_VR_PERF_THEME,
  WATERFALL_PHASES,
  formatMs,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface FrameTimeWaterfallProps {
  /** Recent frame time samples (most recent last) */
  samples: FrameTimeSample[];
  /** Target frame time in ms (budget line) */
  targetFrameTimeMs?: number;
  /** Maximum number of frames to display */
  maxFrames?: number;
  /** Chart width in pixels */
  width?: number;
  /** Chart height in pixels */
  height?: number;
  /** Whether to show the tooltip on hover */
  showTooltip?: boolean;
  /** Whether to show frame number labels */
  showFrameLabels?: boolean;
  /** Whether to show the budget line */
  showBudgetLine?: boolean;
  /** Whether to show a screen-reader data table */
  showAccessibleTable?: boolean;
  /** Theme overrides */
  theme?: Partial<VRPerfTheme>;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Callback when a frame bar is clicked */
  onFrameClick?: (sample: FrameTimeSample) => void;
}

// =============================================================================
// CHART CONSTANTS
// =============================================================================

const CHART_PADDING = { top: 16, right: 24, bottom: 32, left: 56 };
const BAR_HEIGHT_MIN = 6;
const BAR_GAP = 2;

// =============================================================================
// COMPONENT
// =============================================================================

export const FrameTimeWaterfall: React.FC<FrameTimeWaterfallProps> = ({
  samples,
  targetFrameTimeMs = 11.1,
  maxFrames = 30,
  width = 500,
  height = 300,
  showTooltip = true,
  showFrameLabels = true,
  showBudgetLine = true,
  showAccessibleTable = true,
  theme: themeOverride,
  className,
  style,
  onFrameClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredFrame, setHoveredFrame] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const theme = useMemo(
    () => ({ ...DEFAULT_VR_PERF_THEME, ...themeOverride }),
    [themeOverride],
  );

  // Select most recent frames (reverse order: most recent at top)
  const displaySamples = useMemo(() => {
    const sliced = samples.slice(-maxFrames);
    return [...sliced].reverse();
  }, [samples, maxFrames]);

  // Compute chart dimensions
  const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

  // Compute bar height based on available space
  const barHeight = useMemo(() => {
    if (displaySamples.length === 0) return BAR_HEIGHT_MIN;
    const availableHeight = chartHeight - (displaySamples.length - 1) * BAR_GAP;
    return Math.max(BAR_HEIGHT_MIN, Math.floor(availableHeight / displaySamples.length));
  }, [displaySamples.length, chartHeight]);

  // Compute max time for X axis scale (at least 1.5x target, or max sample)
  const maxTimeMs = useMemo(() => {
    const maxSample = displaySamples.reduce(
      (max, s) => Math.max(max, s.timings.totalMs),
      0,
    );
    return Math.max(targetFrameTimeMs * 1.5, maxSample * 1.1);
  }, [displaySamples, targetFrameTimeMs]);

  // X scale: ms -> pixels
  const xScale = useCallback(
    (ms: number) => (ms / maxTimeMs) * chartWidth,
    [maxTimeMs, chartWidth],
  );

  // X axis time labels
  const xLabels = useMemo(() => {
    const count = Math.max(2, Math.floor(chartWidth / 80));
    const step = maxTimeMs / count;
    const labels: Array<{ x: number; text: string }> = [];
    for (let i = 0; i <= count; i++) {
      const ms = step * i;
      labels.push({ x: xScale(ms), text: `${ms.toFixed(1)}ms` });
    }
    return labels;
  }, [chartWidth, maxTimeMs, xScale]);

  // Budget line X position
  const budgetX = xScale(targetFrameTimeMs);

  // Handle hover
  const handleBarHover = useCallback(
    (event: React.MouseEvent, frameIndex: number) => {
      if (!showTooltip) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setHoveredFrame(frameIndex);
      setTooltipPos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    },
    [showTooltip],
  );

  const handleBarLeave = useCallback(() => {
    setHoveredFrame(null);
  }, []);

  // Build accessible description
  const accessibleLabel = useMemo(() => {
    if (displaySamples.length === 0) return 'Frame time waterfall chart: no data.';
    const avgTotal = displaySamples.reduce((sum, s) => sum + s.timings.totalMs, 0) / displaySamples.length;
    const overBudget = displaySamples.filter((s) => s.timings.totalMs > targetFrameTimeMs).length;
    return (
      `Frame time waterfall chart showing ${displaySamples.length} frames. ` +
      `Average frame time: ${avgTotal.toFixed(2)}ms. ` +
      `Budget: ${targetFrameTimeMs}ms (${overBudget} frames over budget). ` +
      `Pipeline phases: frustum cull, tile assign, depth sort, StopThePop re-sort, rasterize, blend zone, GPU sync.`
    );
  }, [displaySamples, targetFrameTimeMs]);

  // Empty state
  if (displaySamples.length === 0) {
    return (
      <div
        className={className}
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.cardBackground,
          border: `1px solid ${theme.borderColor}`,
          borderRadius: theme.borderRadius,
          fontFamily: theme.fontFamily,
          color: theme.textMuted,
          fontSize: `calc(0.85rem * ${theme.fontScale})`,
          ...style,
        }}
        role="img"
        aria-label="Frame time waterfall: no frame data available"
      >
        No frame data available
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        backgroundColor: theme.cardBackground,
        border: `1px solid ${theme.borderColor}`,
        borderRadius: theme.borderRadius,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem 0',
          marginBottom: '0.25rem',
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
          Frame Time Waterfall
        </span>
        <span
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            color: theme.textMuted,
          }}
        >
          {displaySamples.length} frames | Budget: {targetFrameTimeMs.toFixed(1)}ms
        </span>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={accessibleLabel}
        style={{ fontFamily: theme.fontFamily, display: 'block' }}
      >
        <g transform={`translate(${CHART_PADDING.left}, ${CHART_PADDING.top})`}>
          {/* Budget line */}
          {showBudgetLine && budgetX <= chartWidth && (
            <g aria-hidden="true">
              <line
                x1={budgetX}
                y1={-4}
                x2={budgetX}
                y2={chartHeight + 4}
                stroke={theme.budgetLineColor}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                opacity={0.7}
              />
              <text
                x={budgetX + 4}
                y={-2}
                fill={theme.budgetLineColor}
                fontSize="9"
                fontWeight="600"
              >
                {targetFrameTimeMs.toFixed(1)}ms
              </text>
            </g>
          )}

          {/* Frame bars */}
          {displaySamples.map((sample, index) => {
            const y = index * (barHeight + BAR_GAP);
            const isOverBudget = sample.timings.totalMs > targetFrameTimeMs;
            const isHovered = hoveredFrame === index;

            // Build stacked bar segments
            let xOffset = 0;
            const segments = WATERFALL_PHASES.map((phase) => {
              const ms = sample.timings[phase.timingsField] as number;
              const segmentWidth = xScale(ms);
              const segment = {
                phase,
                ms,
                x: xOffset,
                width: Math.max(0, segmentWidth),
                color: theme[phase.colorKey] as string,
              };
              xOffset += segmentWidth;
              return segment;
            });

            return (
              <g
                key={sample.frameNumber}
                transform={`translate(0, ${y})`}
                style={{ cursor: onFrameClick ? 'pointer' : 'default' }}
                onMouseMove={(e) => handleBarHover(e, index)}
                onMouseLeave={handleBarLeave}
                onClick={() => onFrameClick?.(sample)}
                role="group"
                aria-label={`Frame ${sample.frameNumber}: ${sample.timings.totalMs.toFixed(2)}ms total${isOverBudget ? ' (over budget)' : ''}`}
              >
                {/* Over-budget highlight background */}
                {isOverBudget && (
                  <rect
                    x={-2}
                    y={-1}
                    width={chartWidth + 4}
                    height={barHeight + 2}
                    fill={theme.emergencyColor}
                    opacity={0.06}
                    rx={2}
                    aria-hidden="true"
                  />
                )}

                {/* Hover highlight */}
                {isHovered && (
                  <rect
                    x={-2}
                    y={-1}
                    width={chartWidth + 4}
                    height={barHeight + 2}
                    fill={theme.textPrimary}
                    opacity={0.05}
                    rx={2}
                    aria-hidden="true"
                  />
                )}

                {/* Stacked phase segments */}
                {segments.map((seg) => (
                  <rect
                    key={seg.phase.id}
                    x={seg.x}
                    y={0}
                    width={seg.width}
                    height={barHeight}
                    fill={seg.color}
                    opacity={isHovered ? 1.0 : 0.85}
                    rx={seg.x === 0 ? 2 : 0}
                  >
                    <title>{`${seg.phase.label}: ${formatMs(seg.ms)}`}</title>
                  </rect>
                ))}

                {/* Total time label */}
                <text
                  x={xOffset + 4}
                  y={barHeight / 2 + 3}
                  fill={isOverBudget ? theme.emergencyColor : theme.textSecondary}
                  fontSize="8"
                  fontWeight={isOverBudget ? '600' : '400'}
                >
                  {sample.timings.totalMs.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Frame number labels (Y axis) */}
          {showFrameLabels &&
            displaySamples.map((sample, index) => {
              const y = index * (barHeight + BAR_GAP) + barHeight / 2 + 3;
              // Only label every Nth frame for readability
              const labelInterval = Math.max(1, Math.floor(displaySamples.length / 15));
              if (index % labelInterval !== 0) return null;
              return (
                <text
                  key={`label-${sample.frameNumber}`}
                  x={-6}
                  y={y}
                  textAnchor="end"
                  fill={theme.textMuted}
                  fontSize="8"
                >
                  #{sample.frameNumber}
                </text>
              );
            })}

          {/* X axis time labels */}
          <g aria-hidden="true">
            {xLabels.map(({ x, text }, idx) => (
              <text
                key={idx}
                x={x}
                y={chartHeight + 16}
                textAnchor="middle"
                fill={theme.textMuted}
                fontSize="8"
              >
                {text}
              </text>
            ))}
          </g>

          {/* X axis line */}
          <line
            x1={0}
            y1={chartHeight + 2}
            x2={chartWidth}
            y2={chartHeight + 2}
            stroke={theme.borderColor}
            strokeWidth={0.5}
            aria-hidden="true"
          />
        </g>
      </svg>

      {/* Phase legend */}
      <div
        style={{
          display: 'flex',
          gap: '0.6rem',
          padding: '0 1rem 0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
        aria-hidden="true"
      >
        {WATERFALL_PHASES.map((phase) => (
          <span
            key={phase.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              color: theme.textMuted,
            }}
          >
            <span
              style={{
                width: 8,
                height: 4,
                borderRadius: 1,
                backgroundColor: theme[phase.colorKey] as string,
                display: 'inline-block',
              }}
            />
            {phase.label}
          </span>
        ))}
      </div>

      {/* Hover tooltip */}
      {showTooltip && hoveredFrame !== null && displaySamples[hoveredFrame] && (
        <WaterfallTooltip
          sample={displaySamples[hoveredFrame]}
          targetFrameTimeMs={targetFrameTimeMs}
          x={Math.min(tooltipPos.x + 12, width - 220)}
          y={Math.max(tooltipPos.y - 80, 4)}
          theme={theme}
        />
      )}

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
          aria-label="Frame time waterfall data"
        >
          <thead>
            <tr>
              <th scope="col">Frame</th>
              <th scope="col">Total (ms)</th>
              {WATERFALL_PHASES.map((p) => (
                <th key={p.id} scope="col">{p.label} (ms)</th>
              ))}
              <th scope="col">Over Budget</th>
            </tr>
          </thead>
          <tbody>
            {displaySamples.map((sample) => (
              <tr key={sample.frameNumber}>
                <td>{sample.frameNumber}</td>
                <td>{sample.timings.totalMs.toFixed(2)}</td>
                {WATERFALL_PHASES.map((p) => (
                  <td key={p.id}>
                    {(sample.timings[p.timingsField] as number).toFixed(2)}
                  </td>
                ))}
                <td>{sample.timings.totalMs > targetFrameTimeMs ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// =============================================================================
// TOOLTIP
// =============================================================================

interface WaterfallTooltipProps {
  sample: FrameTimeSample;
  targetFrameTimeMs: number;
  x: number;
  y: number;
  theme: VRPerfTheme;
}

const WaterfallTooltip: React.FC<WaterfallTooltipProps> = ({
  sample,
  targetFrameTimeMs,
  x,
  y,
  theme,
}) => {
  const isOverBudget = sample.timings.totalMs > targetFrameTimeMs;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        backgroundColor: 'rgba(10, 10, 26, 0.95)',
        color: theme.textPrimary,
        padding: '0.6rem 0.8rem',
        borderRadius: '6px',
        fontSize: `calc(0.7rem * ${theme.fontScale})`,
        fontFamily: theme.fontFamily,
        pointerEvents: 'none',
        zIndex: 10,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        border: `1px solid ${theme.borderColor}`,
        minWidth: '180px',
      }}
      role="tooltip"
    >
      {/* Header */}
      <div
        style={{
          fontWeight: 600,
          marginBottom: '0.4rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Frame #{sample.frameNumber}</span>
        <span style={{ color: isOverBudget ? theme.emergencyColor : theme.nominalColor }}>
          {sample.timings.totalMs.toFixed(2)}ms
        </span>
      </div>

      {/* Phase breakdown */}
      {WATERFALL_PHASES.map((phase) => {
        const ms = sample.timings[phase.timingsField] as number;
        const pct = sample.timings.totalMs > 0
          ? ((ms / sample.timings.totalMs) * 100).toFixed(0)
          : '0';
        return (
          <div
            key={phase.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.1rem 0',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 1,
                  backgroundColor: theme[phase.colorKey] as string,
                  display: 'inline-block',
                }}
              />
              {phase.label}
            </span>
            <span style={{ color: theme.textSecondary }}>
              {formatMs(ms)} <span style={{ color: theme.textMuted }}>({pct}%)</span>
            </span>
          </div>
        );
      })}

      {/* Summary */}
      <div
        style={{
          borderTop: `1px solid ${theme.borderColor}`,
          marginTop: '0.3rem',
          paddingTop: '0.3rem',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: `calc(0.65rem * ${theme.fontScale})`,
          color: theme.textMuted,
        }}
      >
        <span>Gaussians: {sample.timings.gaussiansSubmitted.toLocaleString()}</span>
        <span>
          After cull: {sample.timings.gaussiansAfterCull.toLocaleString()}
          {' '}({sample.timings.gaussiansSubmitted > 0
            ? ((1 - sample.timings.gaussiansAfterCull / sample.timings.gaussiansSubmitted) * 100).toFixed(0)
            : 0}% culled)
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: `calc(0.65rem * ${theme.fontScale})`,
          color: theme.textMuted,
        }}
      >
        <span>Tiles: {sample.timings.tilesProcessed} ({sample.timings.tilesFoveal} foveal)</span>
        <span>{sample.timings.withinBudget ? 'Within budget' : 'OVER BUDGET'}</span>
      </div>
    </div>
  );
};

export default FrameTimeWaterfall;
