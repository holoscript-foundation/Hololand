/**
 * ModerationMetrics Component
 *
 * Analytics dashboard for moderation metrics with:
 *   - Items moderated per day (bar chart)
 *   - SLA compliance trend (line chart)
 *   - Actions breakdown pie chart (allow/warn/remove/ban)
 *   - Top triggered rules table
 *   - Moderator performance leaderboard
 *
 * All charts are rendered as inline SVG for zero-dependency portability,
 * following the AnalyticsDashboard pattern.
 *
 * @module moderation/ModerationMetrics
 */

import React, { useState, useMemo } from 'react';
import {
  type ModerationMetricsData,
  type DailyModerationCount,
  type SLACompliancePoint,
  type ActionsBreakdown,
  type TriggeredRuleStat,
  type ModeratorPerformance,
} from './ModerationTypes';
import { adminStyles, COLORS, FONTS, getChartColor } from '../admin/AdminStyles';

// =============================================================================
// PROPS
// =============================================================================

export interface ModerationMetricsProps {
  /** Metrics data snapshot */
  metrics: ModerationMetricsData;
  /** Available time periods for switching */
  periods?: { label: string; start: string; end: string }[];
  /** Period change callback */
  onPeriodChange?: (start: string, end: string) => void;
}

// =============================================================================
// CHART CONSTANTS
// =============================================================================

const CHART_HEIGHT = 150;
const CHART_PADDING = { top: 12, right: 12, bottom: 24, left: 40 };
const PIE_SIZE = 120;

// =============================================================================
// DAILY COUNTS BAR CHART
// =============================================================================

const DailyCountsBarChart: React.FC<{ data: DailyModerationCount[] }> = ({ data }) => {
  if (data.length === 0) return <div style={adminStyles.emptyState}>No daily data</div>;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartW = 300 - CHART_PADDING.left - CHART_PADDING.right;
  const chartH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={adminStyles.sectionTitle}>Items Moderated Per Day</div>
      <svg
        width="100%"
        height={CHART_HEIGHT}
        viewBox={`0 0 300 ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Items moderated per day bar chart"
        style={{ display: 'block' }}
      >
        {/* Y-axis grid lines */}
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

        {/* Bars */}
        {data.map((day, i) => {
          const bw = chartW / data.length;
          const bh = maxCount > 0 ? (day.count / maxCount) * chartH : 0;
          const x = CHART_PADDING.left + i * bw + bw * 0.1;
          const y = CHART_PADDING.top + chartH - bh;
          const w = bw * 0.8;

          return (
            <g key={day.date}>
              <rect
                x={x}
                y={y}
                width={w}
                height={bh}
                rx={1}
                fill={COLORS.accent}
                opacity={0.8}
              >
                <title>
                  {new Date(day.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                  : {day.count} items
                </title>
              </rect>
              {/* Date label every few bars */}
              {(i === 0 || i === data.length - 1 || i % Math.max(1, Math.floor(data.length / 5)) === 0) && (
                <text
                  x={x + w / 2}
                  y={CHART_HEIGHT - 4}
                  textAnchor="middle"
                  fontSize="5.5"
                  fill={COLORS.textDim}
                  fontFamily={FONTS.mono}
                >
                  {new Date(day.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </text>
              )}
            </g>
          );
        })}

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
            {Math.round(maxCount * tick)}
          </text>
        ))}
      </svg>
    </div>
  );
};

// =============================================================================
// SLA COMPLIANCE TREND LINE CHART
// =============================================================================

const SLAComplianceTrendChart: React.FC<{ data: SLACompliancePoint[] }> = ({ data }) => {
  if (data.length === 0) return <div style={adminStyles.emptyState}>No SLA data</div>;

  const chartW = 300 - CHART_PADDING.left - CHART_PADDING.right;
  const chartH = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  // Y range: 0-100%
  const points = data.map((point, i) => {
    const x = CHART_PADDING.left + (i / Math.max(1, data.length - 1)) * chartW;
    const y = CHART_PADDING.top + chartH - (point.compliancePercent / 100) * chartH;
    return { x, y, ...point };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${CHART_PADDING.top + chartH} L${points[0].x},${CHART_PADDING.top + chartH} Z`;

  // 90% target line
  const targetY = CHART_PADDING.top + chartH - (90 / 100) * chartH;

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={adminStyles.sectionTitle}>SLA Compliance Trend</div>
      <svg
        width="100%"
        height={CHART_HEIGHT}
        viewBox={`0 0 300 ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="SLA compliance trend line chart"
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

        {/* 90% target line */}
        <line
          x1={CHART_PADDING.left}
          x2={300 - CHART_PADDING.right}
          y1={targetY}
          y2={targetY}
          stroke={COLORS.success}
          strokeWidth="0.8"
          strokeDasharray="3,3"
          opacity={0.5}
        />
        <text
          x={300 - CHART_PADDING.right + 2}
          y={targetY + 3}
          fontSize="5"
          fill={COLORS.success}
          fontFamily={FONTS.mono}
          opacity={0.7}
        >
          90%
        </text>

        {/* Area fill */}
        <path d={areaPath} fill="rgba(52, 211, 153, 0.1)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke={COLORS.chart2} strokeWidth="1.5" />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.5" fill={COLORS.chart2}>
            <title>
              {new Date(p.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
              : {p.compliancePercent.toFixed(1)}%
            </title>
          </circle>
        ))}

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <text
            key={tick}
            x={CHART_PADDING.left - 4}
            y={CHART_PADDING.top + chartH * (1 - tick) + 3}
            textAnchor="end"
            fontSize="6"
            fill={COLORS.textDim}
            fontFamily={FONTS.mono}
          >
            {Math.round(tick * 100)}%
          </text>
        ))}

        {/* X-axis date labels */}
        {points.length > 0 && (
          <>
            <text
              x={points[0].x}
              y={CHART_HEIGHT - 2}
              textAnchor="start"
              fontSize="5.5"
              fill={COLORS.textDim}
              fontFamily={FONTS.mono}
            >
              {new Date(points[0].date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </text>
            <text
              x={points[points.length - 1].x}
              y={CHART_HEIGHT - 2}
              textAnchor="end"
              fontSize="5.5"
              fill={COLORS.textDim}
              fontFamily={FONTS.mono}
            >
              {new Date(points[points.length - 1].date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </text>
          </>
        )}
      </svg>
    </div>
  );
};

// =============================================================================
// ACTIONS BREAKDOWN PIE CHART
// =============================================================================

const ActionsBreakdownPieChart: React.FC<{ data: ActionsBreakdown[] }> = ({ data }) => {
  if (data.length === 0) return <div style={adminStyles.emptyState}>No actions data</div>;

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const center = PIE_SIZE / 2;
  const radius = PIE_SIZE / 2 - 8;

  // Color mapping for each action type
  const actionColors: Record<string, string> = {
    allow: COLORS.success,
    warn: COLORS.warning,
    remove: COLORS.error,
    ban: '#ff4444',
  };

  // Build pie slices
  let startAngle = -Math.PI / 2;
  const slices = data.map((item) => {
    const angle = total > 0 ? (item.count / total) * Math.PI * 2 : 0;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const path =
      total > 0 && item.count > 0
        ? `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
        : '';

    const midAngle = startAngle + angle / 2;
    const labelX = center + (radius * 0.65) * Math.cos(midAngle);
    const labelY = center + (radius * 0.65) * Math.sin(midAngle);

    const result = {
      path,
      color: actionColors[item.action] || COLORS.textMuted,
      action: item.action,
      count: item.count,
      percentage: item.percentage,
      labelX,
      labelY,
      showLabel: item.percentage >= 8, // Only show label if slice is large enough
    };

    startAngle = endAngle;
    return result;
  });

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={adminStyles.sectionTitle}>Actions Breakdown</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg
          width={PIE_SIZE}
          height={PIE_SIZE}
          viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`}
          role="img"
          aria-label="Actions breakdown pie chart"
        >
          {slices.map((slice) =>
            slice.path ? (
              <g key={slice.action}>
                <path
                  d={slice.path}
                  fill={slice.color}
                  opacity={0.85}
                  stroke={COLORS.bg}
                  strokeWidth="1"
                >
                  <title>
                    {slice.action}: {slice.count} ({slice.percentage.toFixed(1)}%)
                  </title>
                </path>
                {slice.showLabel && (
                  <text
                    x={slice.labelX}
                    y={slice.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="7"
                    fontWeight="700"
                    fill="#fff"
                    fontFamily={FONTS.mono}
                  >
                    {slice.percentage.toFixed(0)}%
                  </text>
                )}
              </g>
            ) : null
          )}
          {/* Center hole for donut effect */}
          <circle cx={center} cy={center} r={radius * 0.4} fill={COLORS.bgPanel} />
          <text
            x={center}
            y={center - 4}
            textAnchor="middle"
            fontSize="10"
            fontWeight="800"
            fill={COLORS.textPrimary}
            fontFamily={FONTS.mono}
          >
            {total}
          </text>
          <text
            x={center}
            y={center + 6}
            textAnchor="middle"
            fontSize="5"
            fill={COLORS.textMuted}
            fontFamily={FONTS.mono}
          >
            TOTAL
          </text>
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {slices.map((slice) => (
            <div key={slice.action} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: slice.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 9, color: COLORS.textSecondary, textTransform: 'capitalize' }}>
                {slice.action}
              </span>
              <span style={{ fontSize: 9, color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                {slice.count} ({slice.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// TOP TRIGGERED RULES TABLE
// =============================================================================

const TopTriggeredRulesTable: React.FC<{ data: TriggeredRuleStat[] }> = ({ data }) => {
  if (data.length === 0) return <div style={adminStyles.emptyState}>No triggered rules</div>;

  const maxTriggers = Math.max(...data.map((d) => d.triggerCount), 1);

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={adminStyles.sectionTitle}>Top Triggered Rules</div>
      <table style={adminStyles.table} role="table" aria-label="Top triggered rules">
        <thead>
          <tr>
            <th style={adminStyles.tableHeader}>Rule</th>
            <th style={{ ...adminStyles.tableHeader, width: 80 }}>Triggers</th>
            <th style={{ ...adminStyles.tableHeader, width: 80 }}>Bar</th>
            <th style={{ ...adminStyles.tableHeader, width: 90 }}>Last Triggered</th>
          </tr>
        </thead>
        <tbody>
          {data.map((rule, i) => {
            const percent = maxTriggers > 0 ? (rule.triggerCount / maxTriggers) * 100 : 0;
            return (
              <tr key={rule.ruleName} style={adminStyles.tableRow}>
                <td style={adminStyles.tableCell}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.textPrimary }}>
                    {rule.ruleName}
                  </span>
                </td>
                <td
                  style={{
                    ...adminStyles.tableCell,
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 700,
                  }}
                >
                  {rule.triggerCount.toLocaleString()}
                </td>
                <td style={adminStyles.tableCell}>
                  <div style={{ ...adminStyles.progressTrack, height: 6, borderRadius: 3 }}>
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
                </td>
                <td style={adminStyles.tableCell}>
                  <span
                    style={{
                      fontSize: 9,
                      color: COLORS.textMuted,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {new Date(rule.lastTriggeredAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// =============================================================================
// MODERATOR PERFORMANCE LEADERBOARD
// =============================================================================

const ModeratorLeaderboard: React.FC<{ data: ModeratorPerformance[] }> = ({ data }) => {
  if (data.length === 0)
    return <div style={adminStyles.emptyState}>No moderator performance data</div>;

  // Sort by items resolved descending
  const sorted = [...data].sort((a, b) => b.itemsResolved - a.itemsResolved);

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={adminStyles.sectionTitle}>Moderator Performance</div>
      <table style={adminStyles.table} role="table" aria-label="Moderator performance leaderboard">
        <thead>
          <tr>
            <th style={{ ...adminStyles.tableHeader, width: 30 }}>#</th>
            <th style={adminStyles.tableHeader}>Moderator</th>
            <th style={{ ...adminStyles.tableHeader, width: 80 }}>Resolved</th>
            <th style={{ ...adminStyles.tableHeader, width: 80 }}>Avg Time</th>
            <th style={{ ...adminStyles.tableHeader, width: 80 }}>SLA %</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((mod, i) => (
            <tr key={mod.moderatorId} style={adminStyles.tableRow}>
              <td style={adminStyles.tableCell}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: i === 0 ? COLORS.chart3 : i === 1 ? COLORS.textSecondary : i === 2 ? '#cd7f32' : COLORS.textMuted,
                  }}
                >
                  {i + 1}
                </span>
              </td>
              <td style={adminStyles.tableCell}>
                <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.textPrimary }}>
                  {mod.moderatorName}
                </span>
              </td>
              <td
                style={{
                  ...adminStyles.tableCell,
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 700,
                }}
              >
                {mod.itemsResolved.toLocaleString()}
              </td>
              <td
                style={{
                  ...adminStyles.tableCell,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <span
                  style={{
                    color: mod.avgResolutionTimeMinutes <= 30 ? COLORS.success : mod.avgResolutionTimeMinutes <= 60 ? COLORS.warning : COLORS.error,
                  }}
                >
                  {mod.avgResolutionTimeMinutes.toFixed(0)}m
                </span>
              </td>
              <td style={adminStyles.tableCell}>
                <span
                  style={{
                    ...adminStyles.badge,
                    backgroundColor:
                      mod.slaCompliancePercent >= 90
                        ? COLORS.successBg
                        : mod.slaCompliancePercent >= 70
                        ? COLORS.warningBg
                        : COLORS.errorBg,
                    color:
                      mod.slaCompliancePercent >= 90
                        ? COLORS.success
                        : mod.slaCompliancePercent >= 70
                        ? COLORS.warning
                        : COLORS.error,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {mod.slaCompliancePercent.toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ModerationMetrics = React.memo<ModerationMetricsProps>(
  function ModerationMetrics({ metrics, periods, onPeriodChange }) {
    const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0);

    const handlePeriodChange = (idx: number) => {
      setSelectedPeriodIdx(idx);
      if (periods && onPeriodChange) {
        onPeriodChange(periods[idx].start, periods[idx].end);
      }
    };

    // Summary stats
    const totalModerated = useMemo(
      () => metrics.dailyCounts.reduce((sum, d) => sum + d.count, 0),
      [metrics.dailyCounts]
    );

    const avgSLA = useMemo(() => {
      if (metrics.slaComplianceTrend.length === 0) return 0;
      const sum = metrics.slaComplianceTrend.reduce((s, p) => s + p.compliancePercent, 0);
      return sum / metrics.slaComplianceTrend.length;
    }, [metrics.slaComplianceTrend]);

    const totalActions = useMemo(
      () => metrics.actionsBreakdown.reduce((sum, a) => sum + a.count, 0),
      [metrics.actionsBreakdown]
    );

    return (
      <div style={adminStyles.panelRoot} role="region" aria-label="Moderation metrics">
        {/* Header */}
        <div style={adminStyles.panelHeader}>
          <span style={adminStyles.panelTitle}>Moderation Metrics</span>
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            padding: '8px 16px',
          }}
        >
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Total Moderated</span>
            <span style={adminStyles.statValue}>{totalModerated.toLocaleString()}</span>
          </div>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Avg SLA Compliance</span>
            <span
              style={{
                ...adminStyles.statValue,
                color: avgSLA >= 90 ? COLORS.success : avgSLA >= 70 ? COLORS.warning : COLORS.error,
              }}
            >
              {avgSLA.toFixed(1)}%
            </span>
          </div>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Total Actions</span>
            <span style={adminStyles.statValue}>{totalActions.toLocaleString()}</span>
          </div>
          <div style={adminStyles.statCard}>
            <span style={adminStyles.statLabel}>Active Rules</span>
            <span style={adminStyles.statValue}>{metrics.topTriggeredRules.length}</span>
          </div>
        </div>

        {/* Charts */}
        <div style={adminStyles.panelBody}>
          {/* Row 1: Daily counts bar chart + SLA trend line chart */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <DailyCountsBarChart data={metrics.dailyCounts} />
            <SLAComplianceTrendChart data={metrics.slaComplianceTrend} />
          </div>

          <div style={adminStyles.divider} />

          {/* Row 2: Actions pie chart + Top triggered rules */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 0 }}>
            <ActionsBreakdownPieChart data={metrics.actionsBreakdown} />
            <TopTriggeredRulesTable data={metrics.topTriggeredRules} />
          </div>

          <div style={adminStyles.divider} />

          {/* Row 3: Moderator performance leaderboard */}
          <ModeratorLeaderboard data={metrics.moderatorPerformance} />
        </div>
      </div>
    );
  }
);

export default ModerationMetrics;
