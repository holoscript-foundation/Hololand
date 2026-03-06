/**
 * UsageQuotaDashboard Component
 *
 * Displays per-tenant usage quotas with horizontal bar charts for:
 *   - Scene count
 *   - Storage (MB)
 *   - Render credits
 *   - Gaussian splat budget
 *
 * Bar colors shift from accent -> warning -> error based on percentage.
 * Follows the PostProcessingControls inline-style + ARIA pattern.
 *
 * @module admin/UsageQuotaDashboard
 */

import React, { useState, useMemo, useEffect, type CSSProperties } from 'react';
import { type QuotaUsage, type SubscriptionTier } from './AdminTypes';
import { adminStyles, COLORS, getUsageColor } from './AdminStyles';
import { useVRDashboardAgent } from '../../ag-ui/hooks';
import { AgentSuggestionCards } from '../../ag-ui/components';

// =============================================================================
// PROPS
// =============================================================================

export interface UsageQuotaDashboardProps {
  quotas: QuotaUsage[];
  onOverrideQuota?: (orgId: string, field: string, newLimit: number) => void;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Single quota bar row */
const QuotaBar: React.FC<{
  label: string;
  used: number;
  limit: number;
  unit: string;
  formatValue?: (v: number) => string;
}> = ({ label, used, limit, unit, formatValue }) => {
  const isUnlimited = limit < 0;
  const percent = isUnlimited ? 0 : limit === 0 ? 100 : Math.min((used / limit) * 100, 100);
  const barColor = isUnlimited ? COLORS.accent : getUsageColor(percent);
  const format = formatValue || ((v: number) => v.toLocaleString());

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 3,
        }}
      >
        <span style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 9, fontVariantNumeric: 'tabular-nums', color: COLORS.textSecondary }}>
          {format(used)}
          {isUnlimited ? (
            <span style={{ color: COLORS.textDim }}> / unlimited</span>
          ) : (
            <span style={{ color: COLORS.textDim }}>
              {' '}
              / {format(limit)} {unit}
            </span>
          )}
        </span>
      </div>
      <div style={adminStyles.progressTrack} role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={isUnlimited ? undefined : limit} aria-label={`${label} usage`}>
        <div
          style={{
            ...adminStyles.progressFill,
            width: isUnlimited ? '10%' : `${percent}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      {!isUnlimited && percent >= 80 && (
        <div
          style={{
            fontSize: 8,
            color: percent >= 90 ? COLORS.error : COLORS.warning,
            marginTop: 2,
          }}
        >
          {percent >= 90 ? 'CRITICAL: ' : 'WARNING: '}
          {percent.toFixed(0)}% used
        </div>
      )}
    </div>
  );
};

/** Per-tenant quota card */
const TenantQuotaCard: React.FC<{
  quota: QuotaUsage;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ quota, isSelected, onSelect }) => {
  const tierColors: Record<SubscriptionTier, string> = {
    free: COLORS.textMuted,
    starter: COLORS.info,
    professional: COLORS.success,
    enterprise: COLORS.accent,
  };

  return (
    <div
      style={{
        ...adminStyles.card,
        ...(isSelected ? adminStyles.cardSelected : {}),
        cursor: 'pointer',
        marginBottom: 6,
        marginLeft: 16,
        marginRight: 16,
      }}
      onClick={onSelect}
      role="button"
      aria-expanded={isSelected}
      aria-label={`Usage quotas for ${quota.orgName}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isSelected ? 10 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 11, color: COLORS.textPrimary }}>
            {quota.orgName}
          </span>
          <span
            style={{
              ...adminStyles.badge,
              backgroundColor: `${tierColors[quota.tier]}22`,
              color: tierColors[quota.tier],
            }}
          >
            {quota.tier.toUpperCase()}
          </span>
        </div>
        <svg
          style={{
            width: 10,
            height: 10,
            color: COLORS.textDim,
            transition: 'transform 0.15s ease',
            transform: isSelected ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <polyline points="3 2 7 5 3 8" />
        </svg>
      </div>

      {/* Expanded quota bars */}
      {isSelected && (
        <div>
          <QuotaBar
            label="Scenes"
            used={quota.sceneCount}
            limit={quota.limits.maxScenes}
            unit="scenes"
          />
          <QuotaBar
            label="Storage"
            used={quota.storageMB}
            limit={quota.limits.maxStorageMB}
            unit="MB"
            formatValue={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)} GB` : `${v.toLocaleString()} MB`
            }
          />
          <QuotaBar
            label="Render Credits"
            used={quota.renderCreditsUsed}
            limit={quota.limits.maxRenderCredits}
            unit="credits"
          />
          <QuotaBar
            label="Gaussian Budget"
            used={quota.gaussianBudgetUsed}
            limit={quota.limits.maxGaussianBudget}
            unit="splats"
            formatValue={(v) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
              return v.toLocaleString();
            }}
          />
        </div>
      )}
    </div>
  );
};

/** Summary stats row */
const SummaryStats: React.FC<{ quotas: QuotaUsage[] }> = ({ quotas }) => {
  const stats = useMemo(() => {
    const totalScenes = quotas.reduce((s, q) => s + q.sceneCount, 0);
    const totalStorage = quotas.reduce((s, q) => s + q.storageMB, 0);
    const totalCredits = quotas.reduce((s, q) => s + q.renderCreditsUsed, 0);
    const totalGaussian = quotas.reduce((s, q) => s + q.gaussianBudgetUsed, 0);
    const atLimit = quotas.filter((q) => {
      const l = q.limits;
      return (
        (l.maxScenes > 0 && q.sceneCount / l.maxScenes >= 0.9) ||
        (l.maxStorageMB > 0 && q.storageMB / l.maxStorageMB >= 0.9) ||
        (l.maxRenderCredits > 0 && q.renderCreditsUsed / l.maxRenderCredits >= 0.9)
      );
    }).length;

    return { totalScenes, totalStorage, totalCredits, totalGaussian, atLimit };
  }, [quotas]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, padding: '0 16px', marginBottom: 8 }}>
      <div style={adminStyles.statCard}>
        <span style={adminStyles.statLabel}>Total Scenes</span>
        <span style={adminStyles.statValue}>{stats.totalScenes.toLocaleString()}</span>
      </div>
      <div style={adminStyles.statCard}>
        <span style={adminStyles.statLabel}>Storage Used</span>
        <span style={adminStyles.statValue}>
          {stats.totalStorage >= 1000
            ? `${(stats.totalStorage / 1000).toFixed(1)} GB`
            : `${stats.totalStorage} MB`}
        </span>
      </div>
      <div style={adminStyles.statCard}>
        <span style={adminStyles.statLabel}>Credits Used</span>
        <span style={adminStyles.statValue}>{stats.totalCredits.toLocaleString()}</span>
      </div>
      <div style={adminStyles.statCard}>
        <span style={adminStyles.statLabel}>Gaussians</span>
        <span style={adminStyles.statValue}>
          {stats.totalGaussian >= 1_000_000
            ? `${(stats.totalGaussian / 1_000_000).toFixed(1)}M`
            : `${(stats.totalGaussian / 1_000).toFixed(0)}K`}
        </span>
      </div>
      <div style={adminStyles.statCard}>
        <span style={adminStyles.statLabel}>Near Limit</span>
        <span style={{ ...adminStyles.statValue, color: stats.atLimit > 0 ? COLORS.warning : COLORS.success }}>
          {stats.atLimit}
        </span>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const UsageQuotaDashboard = React.memo<UsageQuotaDashboardProps>(
  function UsageQuotaDashboard({ quotas }) {
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'scenes' | 'storage' | 'credits'>('name');

    // AG-UI: Agent interaction for quota monitoring
    const { reportActivity } = useVRDashboardAgent();

    // AG-UI: Report quota stats to agent for insights
    useEffect(() => {
      const nearLimit = quotas.filter((q) => {
        const l = q.limits;
        return (
          (l.maxScenes > 0 && q.sceneCount / l.maxScenes >= 0.9) ||
          (l.maxStorageMB > 0 && q.storageMB / l.maxStorageMB >= 0.9)
        );
      });
      reportActivity('data_refresh', {
        dataType: 'quotas',
        totalTenants: quotas.length,
        tenantsNearLimit: nearLimit.length,
        totalStorage: quotas.reduce((s, q) => s + q.storageMB, 0),
      });
    }, [quotas, reportActivity]);

    const filtered = useMemo(() => {
      let result = quotas.filter(
        (q) =>
          !searchQuery ||
          q.orgName.toLowerCase().includes(searchQuery.toLowerCase()),
      );

      result.sort((a, b) => {
        switch (sortBy) {
          case 'scenes':
            return b.sceneCount - a.sceneCount;
          case 'storage':
            return b.storageMB - a.storageMB;
          case 'credits':
            return b.renderCreditsUsed - a.renderCreditsUsed;
          default:
            return a.orgName.localeCompare(b.orgName);
        }
      });

      return result;
    }, [quotas, searchQuery, sortBy]);

    return (
      <div style={adminStyles.panelRoot} role="region" aria-label="Usage quota dashboard">
        {/* Header */}
        <div style={adminStyles.panelHeader}>
          <span style={adminStyles.panelTitle}>Usage Quotas</span>
          <span style={{ ...adminStyles.badge, ...adminStyles.badgeAccent }}>
            {quotas.length} tenants
          </span>
        </div>

        {/* Summary */}
        <div style={{ padding: '8px 0' }}>
          <SummaryStats quotas={quotas} />
        </div>

        {/* Toolbar */}
        <div style={adminStyles.toolbar}>
          <input
            style={{ ...adminStyles.input, maxWidth: 220 }}
            type="text"
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search tenants"
          />
          <select
            style={adminStyles.select}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            aria-label="Sort by"
          >
            <option value="name">Sort: Name</option>
            <option value="scenes">Sort: Scenes</option>
            <option value="storage">Sort: Storage</option>
            <option value="credits">Sort: Credits</option>
          </select>
        </div>

        {/* AG-UI: Agent suggestions for quota optimization */}
        <div style={{ padding: '0 16px 4px 16px' }}>
          <AgentSuggestionCards />
        </div>

        {/* Quota cards */}
        <div style={{ ...adminStyles.panelBody, padding: '8px 0' }}>
          {filtered.length === 0 ? (
            <div style={adminStyles.emptyState}>
              <span>No tenants match the filter.</span>
            </div>
          ) : (
            filtered.map((quota) => (
              <TenantQuotaCard
                key={quota.orgId}
                quota={quota}
                isSelected={selectedOrgId === quota.orgId}
                onSelect={() =>
                  setSelectedOrgId((prev) =>
                    prev === quota.orgId ? null : quota.orgId,
                  )
                }
              />
            ))
          )}
        </div>
      </div>
    );
  },
);

export default UsageQuotaDashboard;
