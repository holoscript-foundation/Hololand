'use client';

/**
 * RemixMetrics Component
 *
 * Viral coefficient dashboard showing the health and growth of the remix economy.
 *
 * Features:
 *   - K-factor display: large number with trend arrow (up/down)
 *   - Remix count over time sparkline chart
 *   - Top remixes table: title, creator, views, revenue
 *   - Downstream revenue cascade visualization
 *   - Attribution chain depth statistics
 *   - All charts rendered as inline SVG (zero dependencies)
 *
 * Wires to RemixService backend via remixApi.
 *
 * @module remix/RemixMetrics
 */

import { useState, useEffect, useMemo } from 'react';
import {
  remixAPI,
  type ViralMetrics,
  type RemixTimeSeriesPoint,
  type RevenueDistribution,
} from './remixApi';

// ============================================================================
// Props
// ============================================================================

export interface RemixMetricsProps {
  /** If provided, show revenue cascade for this specific world */
  focusWorldId?: string;
  /** Called when user clicks a world in the top remixes table */
  onWorldClick?: (worldId: string) => void;
  /** Called when user clicks a creator name */
  onCreatorClick?: (creatorId: string) => void;
  /** Custom className */
  className?: string;
}

// ============================================================================
// Chart Constants
// ============================================================================

const SPARKLINE_WIDTH = 400;
const SPARKLINE_HEIGHT = 80;
const SPARKLINE_PADDING = { top: 8, right: 8, bottom: 20, left: 8 };

const CASCADE_BAR_HEIGHT = 28;
const CASCADE_GAP = 4;

// ============================================================================
// Format Helpers
// ============================================================================

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatRevenue(n: number): string {
  if (n >= 100_000) return `$${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Large KPI card with trend indicator */
function KPICard({
  label,
  value,
  subtitle,
  trend,
  accent,
}: {
  label: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  accent?: 'indigo' | 'emerald' | 'amber' | 'red';
}) {
  const accentColors = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  };

  const trendIcon = trend === 'up' ? (
    <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  ) : trend === 'down' ? (
    <svg className="w-4 h-4 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ) : null;

  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 p-4">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-2xl font-bold ${accent ? accentColors[accent] : 'text-zinc-200'}`}>
          {value}
        </span>
        {trendIcon}
      </div>
      {subtitle && (
        <div className="mt-1 text-[11px] text-zinc-500">{subtitle}</div>
      )}
    </div>
  );
}

/** Sparkline chart for remix count over time */
function SparklineChart({
  data,
}: {
  data: RemixTimeSeriesPoint[];
}) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-zinc-600">
        Not enough data for chart
      </div>
    );
  }

  const chartW = SPARKLINE_WIDTH - SPARKLINE_PADDING.left - SPARKLINE_PADDING.right;
  const chartH = SPARKLINE_HEIGHT - SPARKLINE_PADDING.top - SPARKLINE_PADDING.bottom;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const minCount = 0;
  const range = maxCount - minCount || 1;

  // Build SVG path
  const points = data.map((d, i) => {
    const x = SPARKLINE_PADDING.left + (i / (data.length - 1)) * chartW;
    const y = SPARKLINE_PADDING.top + chartH - ((d.count - minCount) / range) * chartH;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Area fill path
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${SPARKLINE_PADDING.top + chartH} L ${points[0].x} ${SPARKLINE_PADDING.top + chartH} Z`;

  return (
    <svg
      width="100%"
      height={SPARKLINE_HEIGHT}
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Remix count over time sparkline"
      className="block"
    >
      {/* Gradient fill */}
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(99, 102, 241, 0.3)" />
          <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path d={areaPath} fill="url(#sparkline-gradient)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2} fill="#818cf8" opacity={i === points.length - 1 ? 1 : 0.5} />
      ))}

      {/* X-axis labels (first and last date) */}
      <text
        x={SPARKLINE_PADDING.left}
        y={SPARKLINE_HEIGHT - 4}
        fill="rgba(113, 113, 122, 0.6)"
        fontSize={9}
        textAnchor="start"
      >
        {data[0].date}
      </text>
      <text
        x={SPARKLINE_WIDTH - SPARKLINE_PADDING.right}
        y={SPARKLINE_HEIGHT - 4}
        fill="rgba(113, 113, 122, 0.6)"
        fontSize={9}
        textAnchor="end"
      >
        {data[data.length - 1].date}
      </text>
    </svg>
  );
}

/** Revenue cascade visualization */
function RevenueCascade({
  distribution,
  onCreatorClick,
}: {
  distribution: RevenueDistribution;
  onCreatorClick?: (creatorId: string) => void;
}) {
  if (distribution.distributions.length === 0) {
    return (
      <div className="text-xs text-zinc-600 text-center py-4">
        No revenue distribution data
      </div>
    );
  }

  const maxAmount = Math.max(...distribution.distributions.map((d) => d.amount), 0.01);

  return (
    <div className="space-y-1">
      {/* Total revenue header */}
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="text-zinc-500">Total Revenue</span>
        <span className="text-zinc-300 font-semibold">{formatRevenue(distribution.totalRevenue)}</span>
      </div>

      {/* Distribution bars */}
      {distribution.distributions.map((dist, i) => {
        const widthPercent = (dist.amount / maxAmount) * 100;

        return (
          <div key={i} className="group">
            {/* Label row */}
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-600">Gen {dist.generation}</span>
                <button
                  onClick={() => onCreatorClick?.(dist.creatorId)}
                  className="text-zinc-400 hover:text-zinc-200 transition-colors truncate max-w-[120px]"
                >
                  {dist.creatorName || dist.creatorId}
                </button>
                <span className="text-zinc-600">({dist.worldTitle || dist.worldId})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">{dist.sharePercent}%</span>
                <span className="text-emerald-400 font-medium">{formatRevenue(dist.amount)}</span>
              </div>
            </div>

            {/* Bar */}
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500/60 to-emerald-400/40 transition-all duration-500"
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </div>
        );
      })}

      {/* Remainder to creator */}
      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
        <span className="text-zinc-500">Retained by remix creator</span>
        <span className="text-zinc-300 font-medium">
          {formatRevenue(
            distribution.totalRevenue -
            distribution.distributions.reduce((sum, d) => sum + d.amount, 0)
          )}
        </span>
      </div>
    </div>
  );
}

/** Top remixes table */
function TopRemixesTable({
  worlds,
  onWorldClick,
  onCreatorClick,
}: {
  worlds: ViralMetrics['topRemixedWorlds'];
  onWorldClick?: (worldId: string) => void;
  onCreatorClick?: (creatorId: string) => void;
}) {
  if (worlds.length === 0) {
    return (
      <div className="text-xs text-zinc-600 text-center py-4">
        No remixed worlds yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" role="table">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-600 border-b border-white/5">
            <th className="py-2 pr-4 font-medium">Title</th>
            <th className="py-2 pr-4 font-medium">Creator</th>
            <th className="py-2 pr-4 font-medium text-right">Remixes</th>
            <th className="py-2 pr-4 font-medium text-right">Views</th>
            <th className="py-2 font-medium text-right">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {worlds.map((world) => (
            <tr
              key={world.worldId}
              className="hover:bg-white/[0.02] transition-colors"
            >
              <td className="py-2 pr-4">
                <button
                  onClick={() => onWorldClick?.(world.worldId)}
                  className="text-zinc-300 hover:text-indigo-400 transition-colors truncate block max-w-[200px] text-left"
                >
                  {world.title || world.worldId}
                </button>
              </td>
              <td className="py-2 pr-4">
                <button
                  onClick={() => onCreatorClick?.(world.creatorId)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors truncate block max-w-[120px] text-left"
                >
                  {world.creatorName || world.creatorId}
                </button>
              </td>
              <td className="py-2 pr-4 text-right text-indigo-400 font-medium">
                {formatNumber(world.directRemixes)}
                {world.totalDescendants > world.directRemixes && (
                  <span className="text-zinc-600 ml-1">({formatNumber(world.totalDescendants)} total)</span>
                )}
              </td>
              <td className="py-2 pr-4 text-right text-zinc-400">
                {formatNumber(world.totalViews)}
              </td>
              <td className="py-2 text-right text-emerald-400 font-medium">
                {formatRevenue(world.revenueGenerated)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function RemixMetrics({
  focusWorldId,
  onWorldClick,
  onCreatorClick,
  className = '',
}: RemixMetricsProps) {
  // State
  const [metrics, setMetrics] = useState<ViralMetrics | null>(null);
  const [timeSeries, setTimeSeries] = useState<RemixTimeSeriesPoint[]>([]);
  const [revenueDist, setRevenueDist] = useState<RevenueDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const promises: Promise<unknown>[] = [
          remixAPI.getViralMetrics(),
          remixAPI.getRemixTimeSeries(30),
        ];

        if (focusWorldId) {
          promises.push(remixAPI.getRevenueDistribution(focusWorldId));
        }

        const results = await Promise.all(promises);
        if (cancelled) return;

        setMetrics(results[0] as ViralMetrics);
        setTimeSeries(results[1] as RemixTimeSeriesPoint[]);
        if (focusWorldId) {
          setRevenueDist(results[2] as RevenueDistribution);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [focusWorldId]);

  // Derived
  const kTrend = useMemo<'up' | 'down' | 'neutral'>(() => {
    if (!metrics) return 'neutral';
    if (metrics.viralCoefficient >= 1.3) return 'up';
    if (metrics.viralCoefficient < 1.0) return 'down';
    return 'neutral';
  }, [metrics]);

  // Loading
  if (loading) {
    return (
      <div className={`rounded-xl bg-white/[0.02] border border-white/5 p-8 ${className}`}>
        <div className="flex items-center justify-center gap-3">
          <svg className="w-5 h-5 text-indigo-400 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={3} strokeDasharray="31.4 31.4" strokeLinecap="round" opacity={0.3} />
            <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={3} strokeDasharray="31.4 31.4" strokeDashoffset="23.55" strokeLinecap="round" />
          </svg>
          <span className="text-sm text-zinc-500">Loading metrics...</span>
        </div>
      </div>
    );
  }

  // Error
  if (error || !metrics) {
    return (
      <div className={`rounded-xl bg-red-500/5 border border-red-500/20 p-4 ${className}`}>
        <p className="text-sm text-red-400">{error ?? 'No metrics available'}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden ${className}`}>
      {/* ================================================================
          Header
          ================================================================ */}
      <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4.5 h-4.5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
          <span className="text-sm font-medium text-zinc-300">Remix Economy</span>
        </div>
        <div className="text-[10px] text-zinc-600">
          Updated {new Date(metrics.calculatedAt).toLocaleTimeString()}
        </div>
      </div>

      {/* ================================================================
          KPI Cards Row
          ================================================================ */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Viral Coefficient (K)"
          value={metrics.viralCoefficient.toFixed(3)}
          subtitle={`Target: 1.300 | ${metrics.viralCoefficient >= 1.3 ? 'Self-sustaining growth' : 'Below viral threshold'}`}
          trend={kTrend}
          accent={metrics.viralCoefficient >= 1.3 ? 'emerald' : metrics.viralCoefficient >= 1.0 ? 'amber' : 'red'}
        />
        <KPICard
          label="Total Remixes"
          value={formatNumber(metrics.totalRemixes)}
          subtitle={`${metrics.dailyRemixRate.toFixed(1)}/day (7d avg)`}
          trend={metrics.dailyRemixRate > 0 ? 'up' : 'neutral'}
          accent="indigo"
        />
        <KPICard
          label="Remix Revenue"
          value={formatRevenue(metrics.totalRemixRevenue)}
          subtitle={`Across ${formatNumber(metrics.totalRemixWorlds)} published remixes`}
          accent="emerald"
        />
        <KPICard
          label="Conversion Rate"
          value={formatPercent(metrics.conversionRate)}
          subtitle={`Visitors to remixers`}
          accent="amber"
        />
      </div>

      {/* ================================================================
          Sparkline: Remixes Over Time
          ================================================================ */}
      <div className="px-4 pb-4">
        <div className="rounded-lg bg-black/20 border border-white/5 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/5">
            <span className="text-xs font-medium text-zinc-400">Remixes Over Time (30 days)</span>
          </div>
          <div className="px-2 py-2">
            <SparklineChart data={timeSeries} />
          </div>
        </div>
      </div>

      {/* ================================================================
          Chain Depth Stats
          ================================================================ */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3 text-center">
            <div className="text-lg font-bold text-zinc-200">{metrics.maxChainDepth}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Max Chain Depth</div>
          </div>
          <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3 text-center">
            <div className="text-lg font-bold text-zinc-200">{metrics.avgChainDepth.toFixed(1)}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Avg Chain Depth</div>
          </div>
          <div className="rounded-lg bg-white/[0.02] border border-white/5 p-3 text-center">
            <div className="text-lg font-bold text-zinc-200">{formatNumber(metrics.totalRemixedWorlds)}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Worlds Remixed</div>
          </div>
        </div>
      </div>

      {/* ================================================================
          Revenue Cascade (if focusWorldId provided)
          ================================================================ */}
      {revenueDist && (
        <div className="px-4 pb-4">
          <div className="rounded-lg bg-black/20 border border-white/5 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/5">
              <span className="text-xs font-medium text-zinc-400">Revenue Cascade</span>
            </div>
            <div className="p-4">
              <RevenueCascade
                distribution={revenueDist}
                onCreatorClick={onCreatorClick}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          Top Remixes Table
          ================================================================ */}
      <div className="px-4 pb-4">
        <div className="rounded-lg bg-black/20 border border-white/5 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/5">
            <span className="text-xs font-medium text-zinc-400">Top Remixed Worlds</span>
          </div>
          <div className="p-4">
            <TopRemixesTable
              worlds={metrics.topRemixedWorlds}
              onWorldClick={onWorldClick}
              onCreatorClick={onCreatorClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
