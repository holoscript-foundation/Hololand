/**
 * Token Usage Dashboard - Real-Time Per-Agent Token Consumption
 *
 * A comprehensive dashboard for monitoring token usage across all
 * AI agents in the ecosystem. Features real-time updates (simulated
 * via polling), per-agent drill-down, sparkline charts, quota
 * monitoring, and alert management.
 *
 * Budget: 500KB max (lazy loaded)
 *
 * Features:
 * - Real-time aggregate metrics (total tokens, cost, calls, alerts)
 * - Per-agent usage table with sorting and filtering
 * - Sparkline usage history for each agent
 * - Agent detail panel with model/operation breakdown
 * - CSS-only bar charts (no charting library dependency)
 * - Quota utilization gauges with threshold alerts
 * - Category and status filtering
 * - WCAG 2.1 AA accessible
 * - Responsive layout
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type {
  AgentTokenUsage,
  AgentCategory,
  DashboardFilters,
  EcosystemMetrics,
  SortField,
  SortDirection,
  TimeRange,
  TokenUsageRecord,
  ModelUsageBreakdown,
  OperationUsageBreakdown,
  AgentAlert,
} from './types';
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  STATUS_CONFIG,
  TIME_RANGE_LABELS,
} from './types';
import { sampleAgentUsage, computeEcosystemMetrics } from './sampleData';

// ============================================================
// Constants
// ============================================================

const DEFAULT_FILTERS: DashboardFilters = {
  search: '',
  categories: [],
  statuses: [],
  timeRange: '24h',
  sortField: 'totalTokens',
  sortDirection: 'desc',
};

const SORT_LABELS: Record<SortField, string> = {
  name: 'Name',
  totalTokens: 'Total Tokens',
  cost: 'Cost',
  quotaUtilization: 'Quota Usage',
  callCount: 'API Calls',
  lastActivity: 'Last Active',
};

// ============================================================
// Formatting Utilities
// ============================================================

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  } catch {
    return 'N/A';
  }
}

function formatRate(current: number, limit: number): string {
  const pct = limit > 0 ? Math.round((current / limit) * 100) : 0;
  return `${formatTokenCount(current)} / ${formatTokenCount(limit)} (${pct}%)`;
}

// ============================================================
// Filter / Sort Logic
// ============================================================

function matchesSearch(agent: AgentTokenUsage, query: string): boolean {
  if (!query) return true;
  const lower = query.toLowerCase();
  return (
    agent.agentName.toLowerCase().includes(lower) ||
    agent.agentId.toLowerCase().includes(lower) ||
    agent.category.toLowerCase().includes(lower) ||
    CATEGORY_LABELS[agent.category].toLowerCase().includes(lower)
  );
}

function matchesCategories(agent: AgentTokenUsage, cats: AgentCategory[]): boolean {
  return cats.length === 0 || cats.includes(agent.category);
}

function matchesStatuses(agent: AgentTokenUsage, statuses: string[]): boolean {
  return statuses.length === 0 || statuses.includes(agent.status);
}

function sortAgents(agents: AgentTokenUsage[], field: SortField, dir: SortDirection): AgentTokenUsage[] {
  const sorted = [...agents].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case 'name':
        cmp = a.agentName.localeCompare(b.agentName);
        break;
      case 'totalTokens':
        cmp = a.periodTotals.totalTokens - b.periodTotals.totalTokens;
        break;
      case 'cost':
        cmp = a.periodTotals.estimatedCost - b.periodTotals.estimatedCost;
        break;
      case 'quotaUtilization':
        cmp = a.quotaUtilization - b.quotaUtilization;
        break;
      case 'callCount':
        cmp = a.periodTotals.callCount - b.periodTotals.callCount;
        break;
      case 'lastActivity':
        cmp = new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime();
        break;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

// ============================================================
// Sub-Components
// ============================================================

/** Metric card for the top summary row */
const MetricCard: React.FC<{
  label: string;
  value: string;
  subtext?: string;
  trend?: number;
  color?: string;
  alert?: boolean;
}> = ({ label, value, subtext, trend, color = '#0f172a', alert = false }) => (
  <div
    style={{
      padding: '20px 24px',
      borderRadius: '12px',
      background: alert ? '#fef2f2' : '#ffffff',
      border: `1px solid ${alert ? '#fca5a5' : '#e5e7eb'}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      flex: '1 1 200px',
      minWidth: '180px',
    }}
  >
    <p style={{ margin: '0 0 4px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </p>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
      <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1.1 }}>
        {value}
      </p>
      {trend !== undefined && (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: trend >= 0 ? '#16a34a' : '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}
          aria-label={`Trend: ${trend >= 0 ? 'up' : 'down'} ${Math.abs(trend)}%`}
        >
          {trend >= 0 ? '\u2191' : '\u2193'}{Math.abs(trend)}%
        </span>
      )}
    </div>
    {subtext && (
      <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#64748b' }}>{subtext}</p>
    )}
  </div>
);

/** Status badge for agent status */
const StatusBadge: React.FC<{ status: keyof typeof STATUS_CONFIG }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      role="status"
      aria-label={`Agent is ${cfg.label.toLowerCase()}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 10px',
        borderRadius: '12px',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: cfg.color,
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.color}33`,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: cfg.color,
          display: 'inline-block',
        }}
      />
      {cfg.label}
    </span>
  );
};

/** CSS-only sparkline chart */
const Sparkline: React.FC<{ data: TokenUsageRecord[]; width?: number; height?: number }> = ({
  data,
  width = 120,
  height = 32,
}) => {
  if (data.length < 2) return null;
  const values = data.map(d => d.totalTokens);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  const lastVal = values[values.length - 1];
  const prevVal = values[values.length - 2];
  const trendColor = lastVal >= prevVal ? '#22c55e' : '#ef4444';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Usage trend: ${formatTokenCount(values[0])} to ${formatTokenCount(lastVal)}`}
      style={{ display: 'block' }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={trendColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={(values.length - 1) / (values.length - 1) * width}
        cy={height - ((lastVal - min) / range) * (height - 4) - 2}
        r="2.5"
        fill={trendColor}
      />
    </svg>
  );
};

/** Quota utilization bar */
const QuotaBar: React.FC<{ utilization: number }> = ({ utilization }) => {
  const barColor =
    utilization >= 90 ? '#ef4444' :
    utilization >= 75 ? '#f59e0b' :
    utilization >= 50 ? '#3b82f6' :
    '#22c55e';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
      <div
        role="progressbar"
        aria-valuenow={utilization}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Quota utilization: ${utilization.toFixed(1)}%`}
        style={{
          flex: 1,
          height: '8px',
          backgroundColor: '#f1f5f9',
          borderRadius: '4px',
          overflow: 'hidden',
          minWidth: '60px',
        }}
      >
        <div
          style={{
            width: `${Math.min(utilization, 100)}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: '4px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <span style={{
        fontSize: '0.72rem',
        fontWeight: 600,
        color: barColor,
        minWidth: '42px',
        textAlign: 'right',
      }}>
        {utilization.toFixed(1)}%
      </span>
    </div>
  );
};

/** CSS-only horizontal bar chart */
const HorizontalBarChart: React.FC<{
  items: Array<{ label: string; value: number; color?: string }>;
  formatValue?: (v: number) => string;
}> = ({ items, formatValue = formatTokenCount }) => {
  const maxVal = Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item, idx) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '0.75rem',
            color: '#475569',
            minWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {item.label}
          </span>
          <div style={{ flex: 1, height: '16px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${(item.value / maxVal) * 100}%`,
                height: '100%',
                backgroundColor: item.color || CATEGORY_COLORS[Object.keys(CATEGORY_COLORS)[idx % Object.keys(CATEGORY_COLORS).length] as AgentCategory],
                borderRadius: '3px',
                transition: 'width 0.4s ease',
                minWidth: '2px',
              }}
            />
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', minWidth: '60px', textAlign: 'right' }}>
            {formatValue(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

/** Alert badge for unacknowledged alerts */
const AlertBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} unacknowledged alert${count !== 1 ? 's' : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '18px',
        height: '18px',
        borderRadius: '9px',
        backgroundColor: '#ef4444',
        color: '#ffffff',
        fontSize: '0.65rem',
        fontWeight: 700,
        padding: '0 5px',
        lineHeight: 1,
      }}
    >
      {count}
    </span>
  );
};

/** Category pill */
const CategoryPill: React.FC<{ category: AgentCategory }> = ({ category }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '0.68rem',
      fontWeight: 600,
      color: CATEGORY_COLORS[category],
      backgroundColor: `${CATEGORY_COLORS[category]}15`,
      border: `1px solid ${CATEGORY_COLORS[category]}33`,
      whiteSpace: 'nowrap',
    }}
  >
    {CATEGORY_LABELS[category]}
  </span>
);

// ============================================================
// Agent Table Row
// ============================================================

interface AgentRowProps {
  agent: AgentTokenUsage;
  isSelected: boolean;
  onSelect: (agent: AgentTokenUsage) => void;
}

const AgentRow: React.FC<AgentRowProps> = ({ agent, isSelected, onSelect }) => {
  const unackAlerts = agent.alerts.filter(a => !a.acknowledged).length;

  return (
    <tr
      role="row"
      tabIndex={0}
      aria-selected={isSelected}
      onClick={() => onSelect(agent)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(agent);
        }
      }}
      style={{
        cursor: 'pointer',
        backgroundColor: isSelected ? '#eff6ff' : 'transparent',
        borderBottom: '1px solid #f1f5f9',
        transition: 'background-color 0.1s ease',
      }}
    >
      {/* Agent Name + Category */}
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                {agent.agentName}
              </span>
              {unackAlerts > 0 && <AlertBadge count={unackAlerts} />}
            </div>
            <div style={{ marginTop: '3px' }}>
              <CategoryPill category={agent.category} />
            </div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td style={{ padding: '12px 16px' }}>
        <StatusBadge status={agent.status} />
      </td>

      {/* Total Tokens */}
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
          {formatTokenCount(agent.periodTotals.totalTokens)}
        </span>
        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
          {agent.periodTotals.callCount.toLocaleString()} calls
        </div>
      </td>

      {/* Cost */}
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
          {formatCurrency(agent.periodTotals.estimatedCost)}
        </span>
      </td>

      {/* Quota */}
      <td style={{ padding: '12px 16px', minWidth: '150px' }}>
        <QuotaBar utilization={agent.quotaUtilization} />
      </td>

      {/* Sparkline */}
      <td style={{ padding: '12px 16px' }}>
        <Sparkline data={agent.usageHistory} />
      </td>

      {/* Last Active */}
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
          {formatTimestamp(agent.lastActivity)}
        </span>
      </td>
    </tr>
  );
};

// ============================================================
// Agent Detail Panel
// ============================================================

interface DetailPanelProps {
  agent: AgentTokenUsage | null;
  onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ agent, onClose }) => {
  const panelRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!agent || !panelRef.current) return;
    const closeBtn = panelRef.current.querySelector<HTMLButtonElement>('button[aria-label="Close detail panel"]');
    if (closeBtn) closeBtn.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [agent, onClose]);

  if (!agent) return null;

  const sectionHeader: React.CSSProperties = {
    margin: '0 0 10px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  return (
    <aside
      ref={panelRef}
      role="complementary"
      aria-label={`Token usage details for ${agent.agentName}`}
      style={{
        width: '440px',
        minWidth: '440px',
        borderLeft: '1px solid #e5e7eb',
        background: '#ffffff',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Panel Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        position: 'sticky',
        top: 0,
        background: '#ffffff',
        zIndex: 1,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              {agent.agentName}
            </h2>
            <StatusBadge status={agent.status} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CategoryPill category={agent.category} />
            <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
              {agent.agentId}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close detail panel"
          style={{
            background: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '1rem',
            color: '#64748b',
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      <div style={{ padding: '20px 24px', flex: 1 }}>
        {/* Key Metrics Grid */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={sectionHeader}>Period Totals</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>Total Tokens</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                {formatTokenCount(agent.periodTotals.totalTokens)}
              </div>
            </div>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>Est. Cost</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                {formatCurrency(agent.periodTotals.estimatedCost)}
              </div>
            </div>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>API Calls</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                {agent.periodTotals.callCount.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>Avg Tokens/Call</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                {formatTokenCount(agent.periodTotals.avgTokensPerCall)}
              </div>
            </div>
          </div>
        </section>

        {/* Token Split */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={sectionHeader}>Prompt vs Completion</h3>
          <div style={{ display: 'flex', height: '24px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div
              style={{
                width: `${(agent.periodTotals.promptTokens / agent.periodTotals.totalTokens) * 100}%`,
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={`Prompt: ${formatTokenCount(agent.periodTotals.promptTokens)}`}
            >
              <span style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 600 }}>
                Prompt {((agent.periodTotals.promptTokens / agent.periodTotals.totalTokens) * 100).toFixed(0)}%
              </span>
            </div>
            <div
              style={{
                flex: 1,
                backgroundColor: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={`Completion: ${formatTokenCount(agent.periodTotals.completionTokens)}`}
            >
              <span style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 600 }}>
                Completion {((agent.periodTotals.completionTokens / agent.periodTotals.totalTokens) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </section>

        {/* Quota */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={sectionHeader}>Quota</h3>
          <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                {formatTokenCount(agent.currentPeriodUsage)} / {formatTokenCount(agent.quotaLimit)}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                {agent.quotaUtilization.toFixed(1)}%
              </span>
            </div>
            <QuotaBar utilization={agent.quotaUtilization} />
          </div>
        </section>

        {/* Rate Limits */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={sectionHeader}>Rate Limits</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500, marginBottom: '4px' }}>Requests/min</div>
              <div style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500 }}>
                {formatRate(agent.rateLimit.currentRequestRate, agent.rateLimit.requestsPerMinute)}
              </div>
            </div>
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500, marginBottom: '4px' }}>Tokens/min</div>
              <div style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500 }}>
                {formatRate(agent.rateLimit.currentTokenRate, agent.rateLimit.tokensPerMinute)}
              </div>
            </div>
          </div>
        </section>

        {/* Model Breakdown */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={sectionHeader}>Model Breakdown</h3>
          <HorizontalBarChart
            items={agent.modelBreakdown.map((m: ModelUsageBreakdown) => ({
              label: m.model,
              value: m.totalTokens,
              color: m.model.includes('opus') ? '#7c3aed' : m.model.includes('sonnet') ? '#3b82f6' : '#06b6d4',
            }))}
          />
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {agent.modelBreakdown.map((m: ModelUsageBreakdown) => (
              <div key={m.model} style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: '#64748b',
                padding: '4px 0',
                borderBottom: '1px solid #f1f5f9',
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{m.model}</span>
                <span>{m.callCount} calls &middot; {formatCurrency(m.estimatedCost)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Operation Breakdown */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={sectionHeader}>Operation Breakdown</h3>
          <HorizontalBarChart
            items={agent.operationBreakdown.map((op: OperationUsageBreakdown, idx: number) => ({
              label: op.operation,
              value: op.totalTokens,
              color: Object.values(CATEGORY_COLORS)[idx % Object.values(CATEGORY_COLORS).length],
            }))}
          />
        </section>

        {/* Usage Trend (larger sparkline) */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={sectionHeader}>Usage Trend (24h)</h3>
          <div style={{
            padding: '12px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'center',
          }}>
            <Sparkline data={agent.usageHistory} width={360} height={60} />
          </div>
        </section>

        {/* Alerts */}
        {agent.alerts.length > 0 && (
          <section style={{ marginBottom: '24px' }}>
            <h3 style={sectionHeader}>Alerts ({agent.alerts.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {agent.alerts.map((alert: AgentAlert, i: number) => {
                const alertColors = {
                  critical: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: '!!' },
                  warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '!' },
                  info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', icon: 'i' },
                };
                const ac = alertColors[alert.severity];
                return (
                  <div
                    key={i}
                    style={{
                      padding: '10px 14px',
                      background: ac.bg,
                      border: `1px solid ${ac.border}`,
                      borderRadius: '8px',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                      opacity: alert.acknowledged ? 0.6 : 1,
                    }}
                  >
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: ac.border,
                      color: ac.text,
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}>
                      {ac.icon}
                    </span>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: ac.text, fontWeight: 500 }}>
                        {alert.message}
                      </p>
                      <p style={{ margin: '3px 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                        {formatTimestamp(alert.triggeredAt)}
                        {alert.acknowledged && ' (acknowledged)'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Avg Latency */}
        <section>
          <h3 style={sectionHeader}>Performance</h3>
          <div style={{
            padding: '12px 16px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>Avg Latency</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                {agent.periodTotals.avgLatencyMs.toLocaleString()}ms
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>Last Active</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                {formatTimestamp(agent.lastActivity)}
              </div>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
};

// ============================================================
// Filters Bar
// ============================================================

interface FiltersBarProps {
  filters: DashboardFilters;
  onFilterChange: (filters: DashboardFilters) => void;
  metrics: EcosystemMetrics;
}

const FiltersBar: React.FC<FiltersBarProps> = ({ filters, onFilterChange, metrics }) => {
  const allCategories = Object.keys(CATEGORY_LABELS) as AgentCategory[];
  const allStatuses = ['active', 'idle', 'rate-limited', 'offline'] as const;

  const toggleCategory = (cat: AgentCategory) => {
    const next = filters.categories.includes(cat)
      ? filters.categories.filter(c => c !== cat)
      : [...filters.categories, cat];
    onFilterChange({ ...filters, categories: next });
  };

  const toggleStatus = (st: typeof allStatuses[number]) => {
    const next = filters.statuses.includes(st)
      ? filters.statuses.filter(s => s !== st)
      : [...filters.statuses, st];
    onFilterChange({ ...filters, statuses: next });
  };

  const hasActiveFilters = filters.categories.length > 0 || filters.statuses.length > 0 || filters.search.length > 0;

  return (
    <div
      aria-label="Dashboard filters"
      style={{
        padding: '12px 24px',
        borderBottom: '1px solid #e5e7eb',
        background: '#fafbfc',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      {/* Search */}
      <div style={{ position: 'relative', flex: '0 1 260px' }}>
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          placeholder="Search agents..."
          aria-label="Search agents"
          style={{
            width: '100%',
            padding: '7px 12px 7px 32px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.82rem',
            outline: 'none',
            background: '#ffffff',
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.85rem',
            color: '#9ca3af',
            pointerEvents: 'none',
          }}
        >
          &#x1F50D;
        </span>
      </div>

      {/* Category quick filters */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {allCategories.map(cat => {
          const isActive = filters.categories.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              aria-pressed={isActive}
              aria-label={`Filter by ${CATEGORY_LABELS[cat]}`}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                border: `1px solid ${isActive ? CATEGORY_COLORS[cat] : '#e5e7eb'}`,
                background: isActive ? `${CATEGORY_COLORS[cat]}15` : '#ffffff',
                color: isActive ? CATEGORY_COLORS[cat] : '#6b7280',
                fontSize: '0.7rem',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>

      {/* Status quick filters */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {allStatuses.map(st => {
          const isActive = filters.statuses.includes(st);
          const cfg = STATUS_CONFIG[st];
          return (
            <button
              key={st}
              onClick={() => toggleStatus(st)}
              aria-pressed={isActive}
              aria-label={`Filter by ${cfg.label}`}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                border: `1px solid ${isActive ? cfg.color : '#e5e7eb'}`,
                background: isActive ? cfg.bg : '#ffffff',
                color: isActive ? cfg.color : '#6b7280',
                fontSize: '0.7rem',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Time Range */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <label htmlFor="time-range" style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>
          Period:
        </label>
        <select
          id="time-range"
          value={filters.timeRange}
          onChange={(e) => onFilterChange({ ...filters, timeRange: e.target.value as TimeRange })}
          style={{
            padding: '5px 8px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '0.78rem',
            background: '#ffffff',
            cursor: 'pointer',
          }}
        >
          {(Object.entries(TIME_RANGE_LABELS) as [TimeRange, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
        <label htmlFor="token-usage-sort-field" style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }}>
          Sort:
        </label>
        <select
          id="token-usage-sort-field"
          value={filters.sortField}
          onChange={(e) => onFilterChange({ ...filters, sortField: e.target.value as SortField })}
          style={{
            padding: '5px 8px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '0.78rem',
            background: '#ffffff',
            cursor: 'pointer',
          }}
        >
          {(Object.entries(SORT_LABELS) as [SortField, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button
          onClick={() => onFilterChange({
            ...filters,
            sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc',
          })}
          aria-label={`Sort ${filters.sortDirection === 'asc' ? 'descending' : 'ascending'}`}
          title={filters.sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          style={{
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: '#ffffff',
            cursor: 'pointer',
            fontSize: '0.82rem',
            lineHeight: 1,
          }}
        >
          {filters.sortDirection === 'asc' ? '\u2191' : '\u2193'}
        </button>
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <button
          onClick={() => onFilterChange(DEFAULT_FILTERS)}
          aria-label="Reset all filters"
          style={{
            padding: '5px 14px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            color: '#6b7280',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Reset
        </button>
      )}
    </div>
  );
};

// ============================================================
// Main Dashboard Component
// ============================================================

const TokenUsageDashboard: React.FC = () => {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [selectedAgent, setSelectedAgent] = useState<AgentTokenUsage | null>(null);
  const [agents, setAgents] = useState<AgentTokenUsage[]>(sampleAgentUsage);
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString());
  const [isLive, setIsLive] = useState<boolean>(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setAgents(prev =>
        prev.map(agent => {
          if (agent.status === 'offline') return agent;

          // Simulate incremental token usage
          const increment = Math.round(Math.random() * 5000 + 500);
          const promptInc = Math.round(increment * 0.6);
          const completionInc = increment - promptInc;
          const costInc = parseFloat((increment * 0.000015).toFixed(4));

          const newTotal = agent.periodTotals.totalTokens + increment;
          const newCost = parseFloat((agent.periodTotals.estimatedCost + costInc).toFixed(2));
          const newUsage = agent.currentPeriodUsage + increment;
          const newUtilization = agent.quotaLimit > 0
            ? parseFloat(((newUsage / agent.quotaLimit) * 100).toFixed(1))
            : 0;

          // Add a new history point occasionally
          const history = [...agent.usageHistory];
          if (Math.random() > 0.7) {
            history.push({
              timestamp: new Date().toISOString(),
              promptTokens: promptInc * 10,
              completionTokens: completionInc * 10,
              totalTokens: increment * 10,
              estimatedCost: parseFloat((increment * 10 * 0.000015).toFixed(4)),
            });
            if (history.length > 30) history.shift();
          }

          // Simulate rate fluctuation
          const rateJitter = 0.9 + Math.random() * 0.2;

          return {
            ...agent,
            currentPeriodUsage: newUsage,
            quotaUtilization: newUtilization,
            usageHistory: history,
            periodTotals: {
              ...agent.periodTotals,
              totalTokens: newTotal,
              promptTokens: agent.periodTotals.promptTokens + promptInc,
              completionTokens: agent.periodTotals.completionTokens + completionInc,
              estimatedCost: newCost,
              callCount: agent.periodTotals.callCount + (Math.random() > 0.5 ? 1 : 0),
            },
            rateLimit: {
              ...agent.rateLimit,
              currentRequestRate: Math.min(
                agent.rateLimit.requestsPerMinute,
                Math.round(agent.rateLimit.currentRequestRate * rateJitter),
              ),
              currentTokenRate: Math.min(
                agent.rateLimit.tokensPerMinute,
                Math.round(agent.rateLimit.currentTokenRate * rateJitter),
              ),
            },
            lastActivity: agent.status === 'active' ? new Date().toISOString() : agent.lastActivity,
          };
        }),
      );
      setLastUpdate(new Date().toISOString());
    }, 3000); // Update every 3 seconds

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLive]);

  // Compute ecosystem metrics
  const metrics = useMemo(() => computeEcosystemMetrics(agents), [agents]);

  // Filter and sort
  const filteredAgents = useMemo(() => {
    let result = agents.filter(agent =>
      matchesSearch(agent, filters.search) &&
      matchesCategories(agent, filters.categories) &&
      matchesStatuses(agent, filters.statuses as any),
    );
    result = sortAgents(result, filters.sortField, filters.sortDirection);
    return result;
  }, [agents, filters]);

  const handleSelectAgent = useCallback((agent: AgentTokenUsage) => {
    setSelectedAgent(prev => prev?.agentId === agent.agentId ? null : agent);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedAgent(null);
  }, []);

  // Keep detail panel agent data fresh
  const displayedAgent = useMemo(() => {
    if (!selectedAgent) return null;
    return agents.find(a => a.agentId === selectedAgent.agentId) || null;
  }, [selectedAgent, agents]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      color: '#1e293b',
      background: '#f8fafc',
    }}>
      <a
        href="#token-usage-main"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        onFocus={(e) => { e.currentTarget.style.cssText = 'position:fixed;top:0;left:0;z-index:10000;padding:8px 16px;background:#000;color:#fff;font-size:1rem;'; }}
        onBlur={(e) => { e.currentTarget.style.cssText = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;'; }}
      >Skip to main content</a>
      {/* Top Header */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.85rem' }}>
            &larr; Home
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
              Token Usage Dashboard
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              {agents.length} agents tracked &middot; {metrics.activeAgents} active &middot; Updated {formatTimestamp(lastUpdate)}
            </p>
          </div>
        </div>

        {/* Live toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsLive(!isLive)}
            aria-pressed={isLive}
            aria-label={isLive ? 'Pause real-time updates' : 'Resume real-time updates'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: `1px solid ${isLive ? '#22c55e' : '#d1d5db'}`,
              background: isLive ? '#f0fdf4' : '#ffffff',
              color: isLive ? '#16a34a' : '#6b7280',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isLive ? '#22c55e' : '#d1d5db',
                animation: isLive ? 'pulse-live 2s ease-in-out infinite' : 'none',
              }}
            />
            {isLive ? 'Live' : 'Paused'}
          </button>
        </div>
      </header>

      {/* Metrics Summary Row */}
      <div aria-live="off" aria-label="Real-time token usage metrics" style={{
        padding: '16px 24px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        borderBottom: '1px solid #e5e7eb',
        background: '#ffffff',
      }}>
        <MetricCard
          label="Total Tokens"
          value={formatTokenCount(metrics.totalTokens)}
          subtext={`${TIME_RANGE_LABELS[filters.timeRange]}`}
          trend={metrics.usageTrend}
        />
        <MetricCard
          label="Total Cost"
          value={formatCurrency(metrics.totalCost)}
          subtext={`${TIME_RANGE_LABELS[filters.timeRange]}`}
          trend={metrics.costTrend}
          color="#0369a1"
        />
        <MetricCard
          label="API Calls"
          value={metrics.totalCalls.toLocaleString()}
          subtext={`${metrics.activeAgents} active agents`}
        />
        <MetricCard
          label="Tokens/min"
          value={formatTokenCount(metrics.tokensPerMinute)}
          subtext="Current throughput"
        />
        <MetricCard
          label="Active Alerts"
          value={metrics.activeAlerts.toString()}
          subtext={metrics.rateLimitedAgents > 0 ? `${metrics.rateLimitedAgents} rate-limited` : 'No rate limits hit'}
          alert={metrics.activeAlerts > 0}
          color={metrics.activeAlerts > 0 ? '#dc2626' : '#0f172a'}
        />
      </div>

      {/* Filters */}
      <FiltersBar filters={filters} onFilterChange={setFilters} metrics={metrics} />

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Agent Table */}
        <main
          id="token-usage-main"
          role="main"
          aria-label="Agent token usage table"
          style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}
        >
          {filteredAgents.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 20px',
              color: '#64748b',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>&#x1F50E;</div>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 600, color: '#64748b' }}>
                No agents match filters
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', textAlign: 'center', maxWidth: '400px' }}>
                Adjust your search, category, or status filters to see agent token usage.
              </p>
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                style={{
                  marginTop: '16px',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#374151',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div style={{ padding: '0 24px 24px' }}>
              <p style={{
                margin: '16px 0 12px',
                fontSize: '0.75rem',
                color: '#64748b',
              }}>
                Showing {filteredAgents.length} of {agents.length} agents
              </p>

              <table
                role="grid"
                aria-label="Agent token usage"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Agent
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Status
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Tokens
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Cost
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Quota
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Trend
                    </th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Last Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map(agent => (
                    <AgentRow
                      key={agent.agentId}
                      agent={agent}
                      isSelected={selectedAgent?.agentId === agent.agentId}
                      onSelect={handleSelectAgent}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {/* Detail Panel */}
        {displayedAgent && (
          <DetailPanel agent={displayedAgent} onClose={handleCloseDetail} />
        )}
      </div>

      {/* Footer */}
      <footer style={{
        padding: '8px 24px',
        borderTop: '1px solid #e5e7eb',
        background: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.72rem',
        color: '#64748b',
      }}>
        <span>
          Token Usage Dashboard &middot; AI Ecosystem &middot; Real-time monitoring
        </span>
        <span>Bundle budget: 500KB max | Lazy loaded</span>
      </footer>

      {/* Keyframe animation for the live indicator */}
      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* Hover styles for table rows */
        table tbody tr:hover {
          background-color: #f8fafc !important;
        }

        /* Focus styles for keyboard navigation */
        table tbody tr:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
        }

        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default TokenUsageDashboard;
