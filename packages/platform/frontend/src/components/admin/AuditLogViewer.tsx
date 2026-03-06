/**
 * AuditLogViewer Component
 *
 * Comprehensive audit log viewer with:
 *   - Filterable by action type, severity, date range, actor, organization
 *   - Full-text search across log entries
 *   - Expandable detail view with before/after diffs
 *   - Export to CSV and JSON
 *   - Infinite scroll / pagination
 *
 * Follows the PostProcessingControls inline-style + ARIA pattern.
 *
 * @module admin/AuditLogViewer
 */

import React, { useState, useMemo, useCallback, type CSSProperties } from 'react';
import {
  type AuditLogEntry,
  type AuditLogFilters,
  type AuditAction,
} from './AdminTypes';
import { adminStyles, COLORS, FONTS } from './AdminStyles';

// =============================================================================
// PROPS
// =============================================================================

export interface AuditLogViewerProps {
  entries: AuditLogEntry[];
  /** Total number of entries (for pagination info) */
  totalCount: number;
  /** Whether more entries can be loaded */
  hasMore: boolean;
  /** Currently applied filters */
  filters: AuditLogFilters;
  onFiltersChange: (filters: AuditLogFilters) => void;
  onLoadMore: () => void;
  /** Loading state */
  loading: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ACTION_CATEGORIES: Record<string, AuditAction[]> = {
  Tenant: ['tenant.create', 'tenant.update', 'tenant.delete', 'tenant.suspend'],
  Members: ['member.invite', 'member.remove', 'member.role_change'],
  Scenes: ['scene.create', 'scene.publish', 'scene.delete'],
  Experiments: ['experiment.create', 'experiment.start', 'experiment.stop'],
  Settings: ['quota.override', 'settings.update'],
  Auth: ['auth.login', 'auth.logout', 'auth.failed_login'],
  Billing: ['billing.subscription_change', 'billing.payment'],
};

const ACTION_LABELS: Record<AuditAction, string> = {
  'tenant.create': 'Created Tenant',
  'tenant.update': 'Updated Tenant',
  'tenant.delete': 'Deleted Tenant',
  'tenant.suspend': 'Suspended Tenant',
  'member.invite': 'Invited Member',
  'member.remove': 'Removed Member',
  'member.role_change': 'Changed Role',
  'scene.create': 'Created Scene',
  'scene.publish': 'Published Scene',
  'scene.delete': 'Deleted Scene',
  'experiment.create': 'Created Experiment',
  'experiment.start': 'Started Experiment',
  'experiment.stop': 'Stopped Experiment',
  'quota.override': 'Overrode Quota',
  'settings.update': 'Updated Settings',
  'auth.login': 'Logged In',
  'auth.logout': 'Logged Out',
  'auth.failed_login': 'Failed Login',
  'billing.subscription_change': 'Changed Subscription',
  'billing.payment': 'Made Payment',
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Severity indicator dot */
const SeverityDot: React.FC<{ severity: AuditLogEntry['severity'] }> = ({ severity }) => {
  const colors: Record<string, string> = {
    info: COLORS.info,
    warning: COLORS.warning,
    critical: COLORS.error,
  };
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors[severity] || COLORS.textDim,
        flexShrink: 0,
      }}
      aria-label={`Severity: ${severity}`}
    />
  );
};

/** Action label badge */
const ActionBadge: React.FC<{ action: AuditAction }> = ({ action }) => {
  const label = ACTION_LABELS[action] || action;
  const category = action.split('.')[0];

  const categoryColors: Record<string, CSSProperties> = {
    tenant: { backgroundColor: COLORS.accentBg, color: COLORS.accent },
    member: { backgroundColor: COLORS.successBg, color: COLORS.success },
    scene: { backgroundColor: COLORS.infoBg, color: COLORS.info },
    experiment: { backgroundColor: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa' },
    quota: { backgroundColor: COLORS.warningBg, color: COLORS.warning },
    settings: { backgroundColor: 'rgba(34, 211, 238, 0.15)', color: '#22d3ee' },
    auth: { backgroundColor: 'rgba(255, 255, 255, 0.06)', color: COLORS.textMuted },
    billing: { backgroundColor: 'rgba(251, 191, 36, 0.15)', color: COLORS.warning },
  };

  return (
    <span
      style={{
        ...adminStyles.tag,
        ...(categoryColors[category] || { backgroundColor: 'rgba(255,255,255,0.06)', color: COLORS.textMuted }),
      }}
    >
      {label}
    </span>
  );
};

/** Change diff display */
const ChangeDiff: React.FC<{ changes: NonNullable<AuditLogEntry['changes']> }> = ({ changes }) => {
  const entries = Object.entries(changes);
  if (entries.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 6,
        padding: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 4,
        fontSize: 8,
        fontFamily: FONTS.mono,
      }}
    >
      {entries.map(([field, { before, after }]) => (
        <div key={field} style={{ marginBottom: 3 }}>
          <span style={{ color: COLORS.textMuted }}>{field}: </span>
          <span style={{ color: COLORS.error, textDecoration: 'line-through' }}>
            {JSON.stringify(before)}
          </span>
          <span style={{ color: COLORS.textDim }}> {'->'} </span>
          <span style={{ color: COLORS.success }}>{JSON.stringify(after)}</span>
        </div>
      ))}
    </div>
  );
};

/** Filter panel */
const FilterPanel: React.FC<{
  filters: AuditLogFilters;
  onChange: (filters: AuditLogFilters) => void;
}> = ({ filters, onChange }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Primary filters row */}
      <div style={adminStyles.toolbar}>
        <input
          style={{ ...adminStyles.input, maxWidth: 200 }}
          type="text"
          placeholder="Search logs..."
          value={filters.searchQuery || ''}
          onChange={(e) => onChange({ ...filters, searchQuery: e.target.value || undefined })}
          aria-label="Search audit logs"
        />
        <select
          style={adminStyles.select}
          value={filters.severity?.join(',') || 'all'}
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              ...filters,
              severity: val === 'all' ? undefined : [val as 'info' | 'warning' | 'critical'],
            });
          }}
          aria-label="Filter by severity"
        >
          <option value="all">All Severity</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <button
          style={{
            ...adminStyles.button,
            ...(showAdvanced ? adminStyles.buttonPrimary : {}),
          }}
          onClick={() => setShowAdvanced((s) => !s)}
          aria-label="Toggle advanced filters"
        >
          Filters {showAdvanced ? '-' : '+'}
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div style={{ ...adminStyles.toolbar, flexWrap: 'wrap', borderTop: `1px solid ${COLORS.borderLight}`, paddingTop: 6 }}>
          {/* Action type filter by category */}
          {Object.entries(ACTION_CATEGORIES).map(([category, actions]) => (
            <button
              key={category}
              style={{
                ...adminStyles.button,
                ...(filters.actions?.some((a) => actions.includes(a))
                  ? adminStyles.buttonPrimary
                  : {}),
                fontSize: 8,
                padding: '2px 6px',
              }}
              onClick={() => {
                const currentActions = filters.actions || [];
                const hasCategory = actions.some((a) => currentActions.includes(a));
                onChange({
                  ...filters,
                  actions: hasCategory
                    ? currentActions.filter((a) => !actions.includes(a))
                    : [...currentActions, ...actions],
                });
              }}
              aria-label={`Filter by ${category} actions`}
            >
              {category}
            </button>
          ))}

          {/* Date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 8, color: COLORS.textMuted }}>From:</span>
            <input
              style={{ ...adminStyles.input, width: 100, fontSize: 8 }}
              type="date"
              value={filters.dateRange?.start?.split('T')[0] || ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  dateRange: {
                    start: e.target.value ? `${e.target.value}T00:00:00Z` : '',
                    end: filters.dateRange?.end || '',
                  },
                })
              }
              aria-label="Start date"
            />
            <span style={{ fontSize: 8, color: COLORS.textMuted }}>To:</span>
            <input
              style={{ ...adminStyles.input, width: 100, fontSize: 8 }}
              type="date"
              value={filters.dateRange?.end?.split('T')[0] || ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  dateRange: {
                    start: filters.dateRange?.start || '',
                    end: e.target.value ? `${e.target.value}T23:59:59Z` : '',
                  },
                })
              }
              aria-label="End date"
            />
          </div>

          {/* Clear filters */}
          <button
            style={{ ...adminStyles.button, ...adminStyles.buttonDanger, fontSize: 8, padding: '2px 6px', marginLeft: 'auto' }}
            onClick={() => onChange({})}
            aria-label="Clear all filters"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// EXPORT HELPERS
// =============================================================================

function exportToCSV(entries: AuditLogEntry[]): void {
  const headers = ['Timestamp', 'Action', 'Severity', 'Actor', 'Email', 'Organization', 'Target', 'IP Address'];
  const rows = entries.map((e) => [
    e.timestamp,
    e.action,
    e.severity,
    e.actorName,
    e.actorEmail,
    e.orgName,
    `${e.targetType}:${e.targetId}`,
    e.ipAddress,
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportToJSON(entries: AuditLogEntry[]): void {
  const json = JSON.stringify(entries, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AuditLogViewer = React.memo<AuditLogViewerProps>(
  function AuditLogViewer({
    entries,
    totalCount,
    hasMore,
    filters,
    onFiltersChange,
    onLoadMore,
    loading,
  }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    return (
      <div style={adminStyles.panelRoot} role="region" aria-label="Audit log viewer">
        {/* Header */}
        <div style={adminStyles.panelHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={adminStyles.panelTitle}>Audit Log</span>
            <span style={{ ...adminStyles.badge, ...adminStyles.badgeAccent }}>
              {totalCount.toLocaleString()} entries
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              style={adminStyles.button}
              onClick={() => exportToCSV(entries)}
              disabled={entries.length === 0}
              aria-label="Export as CSV"
            >
              CSV
            </button>
            <button
              style={adminStyles.button}
              onClick={() => exportToJSON(entries)}
              disabled={entries.length === 0}
              aria-label="Export as JSON"
            >
              JSON
            </button>
          </div>
        </div>

        {/* Filters */}
        <FilterPanel filters={filters} onChange={onFiltersChange} />

        {/* Log entries */}
        <div style={adminStyles.panelBody}>
          {loading && entries.length === 0 ? (
            <div style={adminStyles.emptyState}>Loading audit log...</div>
          ) : entries.length === 0 ? (
            <div style={adminStyles.emptyState}>No entries match the current filters.</div>
          ) : (
            <>
              <table style={adminStyles.table} role="grid" aria-label="Audit log entries">
                <thead>
                  <tr>
                    <th style={{ ...adminStyles.tableHeader, width: 10 }}></th>
                    <th style={adminStyles.tableHeader}>Time</th>
                    <th style={adminStyles.tableHeader}>Action</th>
                    <th style={adminStyles.tableHeader}>Actor</th>
                    <th style={adminStyles.tableHeader}>Org</th>
                    <th style={adminStyles.tableHeader}>Target</th>
                    <th style={adminStyles.tableHeader}>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <React.Fragment key={entry.id}>
                      <tr
                        style={{
                          ...adminStyles.tableRow,
                          ...(expandedId === entry.id ? { backgroundColor: COLORS.bgCardHover } : {}),
                        }}
                        onClick={() => setExpandedId((prev) => (prev === entry.id ? null : entry.id))}
                        aria-expanded={expandedId === entry.id}
                        aria-label={`${ACTION_LABELS[entry.action]} by ${entry.actorName}`}
                      >
                        <td style={{ ...adminStyles.tableCell, width: 10 }}>
                          <SeverityDot severity={entry.severity} />
                        </td>
                        <td style={{ ...adminStyles.tableCell, color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                          <div>{new Date(entry.timestamp).toLocaleDateString()}</div>
                          <div style={{ fontSize: 7, color: COLORS.textDim }}>
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </div>
                        </td>
                        <td style={adminStyles.tableCell}>
                          <ActionBadge action={entry.action} />
                        </td>
                        <td style={adminStyles.tableCell}>
                          <div style={{ fontWeight: 600 }}>{entry.actorName}</div>
                          <div style={{ fontSize: 7, color: COLORS.textDim }}>{entry.actorEmail}</div>
                        </td>
                        <td style={{ ...adminStyles.tableCell, color: COLORS.textSecondary }}>
                          {entry.orgName}
                        </td>
                        <td style={adminStyles.tableCell}>
                          <div style={{ fontSize: 9, color: COLORS.textSecondary }}>
                            {entry.targetName || entry.targetId}
                          </div>
                          <div style={{ fontSize: 7, color: COLORS.textDim }}>{entry.targetType}</div>
                        </td>
                        <td style={{ ...adminStyles.tableCell, fontVariantNumeric: 'tabular-nums', color: COLORS.textDim }}>
                          {entry.ipAddress}
                        </td>
                      </tr>

                      {/* Expanded details */}
                      {expandedId === entry.id && (
                        <tr>
                          <td colSpan={7} style={{ padding: '0 16px 8px 28px' }}>
                            <div
                              style={{
                                padding: 8,
                                backgroundColor: 'rgba(0, 0, 0, 0.15)',
                                borderRadius: 4,
                                border: `1px solid ${COLORS.borderLight}`,
                              }}
                            >
                              {/* User agent */}
                              <div style={{ fontSize: 8, color: COLORS.textDim, marginBottom: 4 }}>
                                <span style={{ color: COLORS.textMuted }}>User Agent: </span>
                                {entry.userAgent}
                              </div>

                              {/* Changes diff */}
                              {entry.changes && Object.keys(entry.changes).length > 0 && (
                                <>
                                  <div style={{ fontSize: 9, fontWeight: 600, color: COLORS.textMuted, marginTop: 6 }}>
                                    Changes
                                  </div>
                                  <ChangeDiff changes={entry.changes} />
                                </>
                              )}

                              {/* Metadata */}
                              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                                <>
                                  <div style={{ fontSize: 9, fontWeight: 600, color: COLORS.textMuted, marginTop: 6 }}>
                                    Metadata
                                  </div>
                                  <pre
                                    style={{
                                      marginTop: 4,
                                      padding: 6,
                                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                      borderRadius: 4,
                                      fontSize: 8,
                                      fontFamily: FONTS.mono,
                                      color: COLORS.textDim,
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-all',
                                      margin: 0,
                                    }}
                                  >
                                    {JSON.stringify(entry.metadata, null, 2)}
                                  </pre>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {/* Load more */}
              {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 16px' }}>
                  <button
                    style={{ ...adminStyles.button, ...adminStyles.buttonPrimary }}
                    onClick={onLoadMore}
                    disabled={loading}
                    aria-label="Load more entries"
                  >
                    {loading ? 'Loading...' : `Load More (${entries.length} / ${totalCount.toLocaleString()})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  },
);

export default AuditLogViewer;
