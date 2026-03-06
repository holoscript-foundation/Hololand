/**
 * AnalyticsDashboard Component
 *
 * Platform analytics dashboard with Chart.js-style visualizations:
 *   - FPS distribution (bar chart)
 *   - Session duration distribution (horizontal bar chart)
 *   - Engagement heatmap (7x24 grid)
 *   - Scene completion funnels (funnel chart)
 *   - Daily active users time-series (line chart via SVG)
 *
 * All charts are rendered as inline SVG for zero-dependency portability.
 * Follows the PostProcessingControls inline-style + ARIA pattern.
 *
 * @module admin/AnalyticsDashboard
 */

import React, { useState, useMemo, useEffect, type CSSProperties } from 'react';
import {
  type TenantAnalytics,
  type FPSBucket,
  type SessionDurationBucket,
  type HeatmapCell,
  type FunnelStep,
  type TimeSeriesPoint,
} from './AdminTypes';
import { adminStyles, COLORS, getChartColor, getFPSColor, FONTS } from './AdminStyles';
import { useVRDashboardAgent } from '../../ag-ui/hooks';
import { AgentThinkingIndicator, AgentSuggestionCards } from '../../ag-ui/components';

// =============================================================================
// PROPS
// =============================================================================

export interface AnalyticsDashboardProps {
  analytics: TenantAnalytics;
  /** Available time periods for switching */
  periods?: { label: string; start: string; end: string }[];
  onPeriodChange?: (start: string, end: string) => void;
}

// =============================================================================
// CHART CONSTANTS
// =============================================================================

const CHART_HEIGHT = 140;
const CHART_PADDING = { top: 12, right: 12, bottom: 20, left: 36 };
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// =============================================================================
// CHART SUB-COMPONENTS
// =============================================================================

/** Vertical bar chart for FPS distribution */
const FPSDistributionChart: React.FC<{ data: FPSBucket[] }> = ({ data }) => {
  if (data.length === 0) return <div style={adminStyles.emptyState}>No FPS data</div>;

  const maxCount = Math.max(...data.map((d) => d.count));
  const barWidth = 100 / data.length;

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={adminStyles.sectionTitle}>FPS Distribution</div>
      <svg
        width="100%"
        height={CHART_HEIGHT}
        viewBox={`0 0 300 ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="FPS distribution bar chart"
        style={{ display: 'block' }}
      >
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <line
            key={tick}
            x1={CHART_PADDING.left}
            x2={300 - CHART_PADDING.right}
            y1={CHART_PADDING.top + (CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom) * (1 - tick)}
            y2={CHART_PADDING.top + (CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom) * (1 - tick)}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.5"
          />
        ))}

        {/* Bars */}
        {data.map((bucket, i) => {
          const chartW = 300 - CHART_PADDING.left - CHART_PADDING.right;
          const chartH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
          const bw = chartW / data.length;
          const bh = maxCount > 0 ? (bucket.count / maxCount) * chartH : 0;
          const x = CHART_PADDING.left + i * bw + bw * 0.1;
          const y = CHART_PADDING.top + chartH - bh;
          const w = bw * 0.8;

          // Color based on FPS range (extract midpoint)
          const fpsMatch = bucket.range.match(/(\d+)/);
          const fps = fpsMatch ? parseInt(fpsMatch[1], 10) : 30;

          return (
            <g key={bucket.range}>
              <rect
                x={x}
                y={y}
                width={w}
                height={bh}
                rx={1}
                fill={getFPSColor(fps)}
                opacity={0.8}
              >
                <title>
                  {bucket.range}: {bucket.count} ({bucket.percentage.toFixed(1)}%)
                </title>
              </rect>
              <text
                x={x + w / 2}
                y={CHART_HEIGHT - 4}
                textAnchor="middle"
                fontSize="6"
                fill={COLORS.textDim}
                fontFamily={FONTS.mono}
              >
                {bucket.range}
              </text>
            </g>
          );
        })}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((tick) => (
          <text
            key={tick}
            x={CHART_PADDING.left - 4}
            y={CHART_PADDING.top + (CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom) * (1 - tick) + 3}
            textAnchor="end"
            fontSize="6"
            fill={COLORS.textDim}
            fontFamily={FONTS.mono}
          >
            {Math.round(maxCount * tick)}
          </text>
        ))}
      </svg>
    </div>
  );
};

/** Horizontal bar chart for session durations */
const SessionDurationChart: React.FC<{ data: SessionDurationBucket[] }> = ({ data }) => {
  if (data.length === 0) return <div style={adminStyles.emptyState}>No session data</div>;

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={adminStyles.sectionTitle}>Session Duration</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.map((bucket, i) => {
          const percent = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
          return (
            <div key={bucket.range} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 8,
                  color: COLORS.textMuted,
                  minWidth: 56,
                  textAlign: 'right',
                  flexShrink: 0,
                }}
              >
                {bucket.range}
              </span>
              <div style={{ flex: 1, height: 10, position: 'relative' }}>
                <div
                  style={{
                    ...adminStyles.progressTrack,
                    height: 10,
                    borderRadius: 3,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${percent}%`,
                      backgroundColor: getChartColor(i),
                      borderRadius: 3,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
              <span
                style={{
                  fontSize: 8,
                  color: COLORS.textSecondary,
                  minWidth: 40,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {bucket.count} ({bucket.avgMinutes.toFixed(0)}m avg)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** 7x24 engagement heatmap */
const EngagementHeatmap: React.FC<{ data: HeatmapCell[] }> = ({ data }) => {
  if (data.length === 0) return <div style={adminStyles.emptyState}>No engagement data</div>;

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  // Build a 7x24 grid
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  data.forEach((cell) => {
    if (cell.dayOfWeek >= 0 && cell.dayOfWeek < 7 && cell.hourOfDay >= 0 && cell.hourOfDay < 24) {
      grid[cell.dayOfWeek][cell.hourOfDay] = cell.value;
    }
  });

  const cellSize = 10;
  const gap = 1;
  const labelWidth = 28;

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={adminStyles.sectionTitle}>Engagement Heatmap</div>
      <div style={{ overflowX: 'auto' }}>
        <svg
          width={labelWidth + 24 * (cellSize + gap)}
          height={7 * (cellSize + gap) + 16}
          role="img"
          aria-label="Engagement heatmap showing activity by day and hour"
        >
          {/* Hour labels */}
          {[0, 6, 12, 18, 23].map((h) => (
            <text
              key={h}
              x={labelWidth + h * (cellSize + gap) + cellSize / 2}
              y={8}
              textAnchor="middle"
              fontSize="6"
              fill={COLORS.textDim}
              fontFamily={FONTS.mono}
            >
              {h.toString().padStart(2, '0')}
            </text>
          ))}

          {/* Grid */}
          {grid.map((row, dayIdx) => (
            <g key={dayIdx}>
              <text
                x={labelWidth - 4}
                y={14 + dayIdx * (cellSize + gap) + cellSize / 2 + 2}
                textAnchor="end"
                fontSize="6"
                fill={COLORS.textDim}
                fontFamily={FONTS.mono}
              >
                {DAY_NAMES[dayIdx]}
              </text>
              {row.map((value, hourIdx) => {
                const intensity = maxValue > 0 ? value / maxValue : 0;
                return (
                  <rect
                    key={hourIdx}
                    x={labelWidth + hourIdx * (cellSize + gap)}
                    y={14 + dayIdx * (cellSize + gap)}
                    width={cellSize}
                    height={cellSize}
                    rx={2}
                    fill={
                      intensity === 0
                        ? 'rgba(255,255,255,0.03)'
                        : `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`
                    }
                  >
                    <title>
                      {DAY_NAMES[dayIdx]} {hourIdx}:00 - {value} sessions
                    </title>
                  </rect>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

/** Scene completion funnel */
const CompletionFunnel: React.FC<{ data: FunnelStep[] }> = ({ data }) => {
  if (data.length === 0) return <div style={adminStyles.emptyState}>No funnel data</div>;

  const maxCount = data[0]?.count || 1;

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={adminStyles.sectionTitle}>Scene Completion Funnel</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {data.map((step, i) => {
          const widthPercent = maxCount > 0 ? (step.count / maxCount) * 100 : 0;
          return (
            <div key={step.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 9, color: COLORS.textSecondary, fontWeight: 600 }}>
                  {step.name}
                </span>
                <span style={{ fontSize: 8, color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {step.count.toLocaleString()} ({step.percentage.toFixed(1)}%)
                </span>
              </div>
              <div
                style={{
                  height: 14,
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${widthPercent}%`,
                    backgroundColor: getChartColor(i),
                    borderRadius: 3,
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 4,
                  }}
                />
              </div>
              {i < data.length - 1 && step.dropoffRate > 0 && (
                <div style={{ fontSize: 7, color: COLORS.error, textAlign: 'right', marginTop: 1 }}>
                  -{step.dropoffRate.toFixed(1)}% dropoff
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** DAU time-series line chart */
const DAULineChart: React.FC<{ data: TimeSeriesPoint[] }> = ({ data }) => {
  if (data.length === 0) return <div style={adminStyles.emptyState}>No DAU data</div>;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value));
  const chartW = 300 - CHART_PADDING.left - CHART_PADDING.right;
  const chartH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  // Build SVG path
  const points = data.map((point, i) => {
    const x = CHART_PADDING.left + (i / Math.max(1, data.length - 1)) * chartW;
    const y =
      CHART_PADDING.top +
      chartH -
      ((point.value - minValue) / Math.max(1, maxValue - minValue)) * chartH;
    return { x, y, ...point };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${CHART_PADDING.top + chartH} L${points[0].x},${CHART_PADDING.top + chartH} Z`;

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={adminStyles.sectionTitle}>Daily Active Users</div>
      <svg
        width="100%"
        height={CHART_HEIGHT}
        viewBox={`0 0 300 ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Daily active users trend line"
        style={{ display: 'block' }}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <line
            key={tick}
            x1={CHART_PADDING.left}
            x2={300 - CHART_PADDING.right}
            y1={CHART_PADDING.top + chartH * (1 - tick)}
            y2={CHART_PADDING.top + chartH * (1 - tick)}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.5"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="rgba(99, 102, 241, 0.1)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke={COLORS.accent} strokeWidth="1.5" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={COLORS.accent}>
            <title>
              {new Date(p.timestamp).toLocaleDateString()}: {p.value} users
            </title>
          </circle>
        ))}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((tick) => (
          <text
            key={tick}
            x={CHART_PADDING.left - 4}
            y={CHART_PADDING.top + chartH * (1 - tick) + 3}
            textAnchor="end"
            fontSize="6"
            fill={COLORS.textDim}
            fontFamily={FONTS.mono}
          >
            {Math.round(minValue + (maxValue - minValue) * tick)}
          </text>
        ))}

        {/* X-axis labels (first and last dates) */}
        {points.length > 0 && (
          <>
            <text
              x={points[0].x}
              y={CHART_HEIGHT - 2}
              textAnchor="start"
              fontSize="6"
              fill={COLORS.textDim}
              fontFamily={FONTS.mono}
            >
              {new Date(points[0].timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </text>
            <text
              x={points[points.length - 1].x}
              y={CHART_HEIGHT - 2}
              textAnchor="end"
              fontSize="6"
              fill={COLORS.textDim}
              fontFamily={FONTS.mono}
            >
              {new Date(points[points.length - 1].timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </text>
          </>
        )}
      </svg>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AnalyticsDashboard = React.memo<AnalyticsDashboardProps>(
  function AnalyticsDashboard({ analytics, periods, onPeriodChange }) {
    const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0);

    // AG-UI: Agent interaction for analytics
    const { reportActivity, highlights, isThinking } = useVRDashboardAgent();

    // AG-UI: Report analytics view to agent with current metrics
    useEffect(() => {
      reportActivity('dashboard_navigation', {
        panel: 'analytics',
        metrics: {
          totalSessions: analytics.totalSessions,
          avgFPS: analytics.avgFPS,
          avgSessionMinutes: analytics.avgSessionMinutes,
        },
      });
    }, [analytics, reportActivity]);

    const handlePeriodChange = (idx: number) => {
      setSelectedPeriodIdx(idx);
      if (periods && onPeriodChange) {
        onPeriodChange(periods[idx].start, periods[idx].end);
      }
      // AG-UI: Report period change to agent
      reportActivity('filter_change', {
        filterType: 'period',
        periodIndex: idx,
        periodLabel: periods?.[idx]?.label,
      });
    };

    return (
      <div style={adminStyles.panelRoot} role="region" aria-label="Analytics dashboard">
        {/* Header */}
        <div style={adminStyles.panelHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={adminStyles.panelTitle}>Analytics</span>
            {/* AG-UI: Show thinking indicator inline */}
            {isThinking && <AgentThinkingIndicator style={{ padding: '2px 8px', fontSize: 9 }} />}
          </div>
          {periods && periods.length > 0 && (
            <select
              style={adminStyles.select}
              value={selectedPeriodIdx}
              onChange={(e) => handlePeriodChange(parseInt(e.target.value, 10))}
              aria-label="Select time period"
            >
              {periods.map((p, i) => (
                <option key={i} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '8px 16px' }}>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Total Sessions</span>
            <span style={adminStyles.statValue}>{analytics.totalSessions.toLocaleString()}</span>
          </div>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Avg Session</span>
            <span style={adminStyles.statValue}>{analytics.avgSessionMinutes.toFixed(1)}m</span>
          </div>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Avg FPS</span>
            <span style={{ ...adminStyles.statValue, color: getFPSColor(analytics.avgFPS) }}>
              {analytics.avgFPS.toFixed(1)}
            </span>
          </div>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>P95 FPS</span>
            <span style={{ ...adminStyles.statValue, color: getFPSColor(analytics.p95FPS) }}>
              {analytics.p95FPS.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Charts */}
        <div style={adminStyles.panelBody}>
          {/* Row 1: FPS Distribution + Session Duration */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <FPSDistributionChart data={analytics.fpsDistribution} />
            <SessionDurationChart data={analytics.sessionDurations} />
          </div>

          <div style={adminStyles.divider} />

          {/* Row 2: DAU Line Chart */}
          <DAULineChart data={analytics.dailyActiveUsers} />

          <div style={adminStyles.divider} />

          {/* Row 3: Heatmap + Funnel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 0 }}>
            <EngagementHeatmap data={analytics.engagementHeatmap} />
            <CompletionFunnel data={analytics.sceneCompletionFunnel} />
          </div>

          {/* AG-UI: Agent suggestions for analytics insights */}
          <div style={{ padding: '8px 16px' }}>
            <AgentSuggestionCards />
          </div>
        </div>
      </div>
    );
  },
);

export default AnalyticsDashboard;
