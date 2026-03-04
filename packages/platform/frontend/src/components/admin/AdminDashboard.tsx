/**
 * AdminDashboard Component
 *
 * Top-level layout component that integrates all admin panels into a
 * tabbed dashboard with:
 *   - Sidebar navigation with tab icons
 *   - Active tab content area
 *   - Global header with platform status
 *   - Responsive layout
 *
 * Follows the PostProcessingControls inline-style + ARIA pattern.
 *
 * @module admin/AdminDashboard
 */

import React, { useState, useMemo, useCallback, useEffect, type CSSProperties } from 'react';
import {
  type AdminTab,
  type Organization,
  type QuotaUsage,
  type TenantAnalytics,
  type Experiment,
  type ScenePerformanceSnapshot,
  type PerformanceAlert,
  type PerformanceThreshold,
  type AuditLogEntry,
  type AuditLogFilters,
  type OrgRole,
  type OrgMember,
  type SubscriptionTier,
  ADMIN_TABS,
} from './AdminTypes';
import { adminStyles, COLORS, FONTS } from './AdminStyles';
import { TenantManagement, type TenantManagementProps } from './TenantManagement';
import { UsageQuotaDashboard, type UsageQuotaDashboardProps } from './UsageQuotaDashboard';
import { AnalyticsDashboard, type AnalyticsDashboardProps } from './AnalyticsDashboard';
import { ABTestManagement, type ABTestManagementProps } from './ABTestManagement';
import { RealTimePerformanceMonitor, type RealTimePerformanceMonitorProps } from './RealTimePerformanceMonitor';
import { AuditLogViewer, type AuditLogViewerProps } from './AuditLogViewer';
import { FoundersProgramPage } from '../../pages/FoundersProgramPage';
import { MarketplacePages } from '../../pages/MarketplacePages';
import { useVRDashboardAgent } from '../../ag-ui/hooks';
import {
  AgentOverlay,
  AgentThinkingIndicator,
  AgentNotificationBar,
} from '../../ag-ui/components';

// =============================================================================
// PROPS
// =============================================================================

export interface AdminDashboardProps {
  /** Current admin user info */
  adminUser: {
    name: string;
    email: string;
    role: string;
  };

  // -- Tenant Management --
  organizations: Organization[];
  onCreateOrg: TenantManagementProps['onCreateOrg'];
  onUpdateOrg: TenantManagementProps['onUpdateOrg'];
  onDeleteOrg: TenantManagementProps['onDeleteOrg'];
  onSuspendOrg: TenantManagementProps['onSuspendOrg'];
  onReactivateOrg: TenantManagementProps['onReactivateOrg'];
  onFetchMembers: TenantManagementProps['onFetchMembers'];
  onInviteMember: TenantManagementProps['onInviteMember'];
  onRemoveMember: TenantManagementProps['onRemoveMember'];
  onChangeMemberRole: TenantManagementProps['onChangeMemberRole'];

  // -- Usage Quotas --
  quotas: QuotaUsage[];
  onOverrideQuota?: UsageQuotaDashboardProps['onOverrideQuota'];

  // -- Analytics --
  analytics: TenantAnalytics;
  analyticsPeriods?: AnalyticsDashboardProps['periods'];
  onAnalyticsPeriodChange?: AnalyticsDashboardProps['onPeriodChange'];

  // -- A/B Tests --
  experiments: Experiment[];
  onCreateExperiment: ABTestManagementProps['onCreateExperiment'];
  onStartExperiment: ABTestManagementProps['onStartExperiment'];
  onPauseExperiment: ABTestManagementProps['onPauseExperiment'];
  onCompleteExperiment: ABTestManagementProps['onCompleteExperiment'];
  onArchiveExperiment: ABTestManagementProps['onArchiveExperiment'];

  // -- Performance Monitor --
  performanceSnapshots: Map<string, ScenePerformanceSnapshot>;
  performanceHistory: Map<string, ScenePerformanceSnapshot[]>;
  performanceAlerts: PerformanceAlert[];
  performanceThresholds: PerformanceThreshold[];
  isPerformanceLive: boolean;
  performancePollingInterval: number;
  onTogglePerformanceLive: () => void;
  onAcknowledgePerformanceAlert: (alertId: string) => void;
  onUpdatePerformanceThreshold: (threshold: PerformanceThreshold) => void;

  // -- Audit Log --
  auditEntries: AuditLogEntry[];
  auditTotalCount: number;
  auditHasMore: boolean;
  auditFilters: AuditLogFilters;
  onAuditFiltersChange: (filters: AuditLogFilters) => void;
  onAuditLoadMore: () => void;
  auditLoading: boolean;

  // -- Founders Program --
  /** User ID for the Founders Program page */
  foundersUserId?: string;

  // -- Marketplace --
  /** User ID for the Marketplace page */
  marketplaceUserId?: string | null;
  /** Seller ID override for the Marketplace seller dashboard */
  marketplaceSellerId?: string;
  /** Stripe publishable key */
  stripePublishableKey?: string;

  /** Default active tab */
  defaultTab?: AdminTab;
}

// =============================================================================
// NAV ICON COMPONENT
// =============================================================================

const NavIcon: React.FC<{ icon: string }> = ({ icon }) => (
  <span
    style={{
      fontSize: 8,
      fontWeight: 800,
      letterSpacing: '0.04em',
      opacity: 0.7,
    }}
  >
    {icon}
  </span>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AdminDashboard = React.memo<AdminDashboardProps>(
  function AdminDashboard(props) {
    const {
      adminUser,
      defaultTab = 'tenants',
      // Tenant
      organizations,
      onCreateOrg,
      onUpdateOrg,
      onDeleteOrg,
      onSuspendOrg,
      onReactivateOrg,
      onFetchMembers,
      onInviteMember,
      onRemoveMember,
      onChangeMemberRole,
      // Quotas
      quotas,
      onOverrideQuota,
      // Analytics
      analytics,
      analyticsPeriods,
      onAnalyticsPeriodChange,
      // A/B Tests
      experiments,
      onCreateExperiment,
      onStartExperiment,
      onPauseExperiment,
      onCompleteExperiment,
      onArchiveExperiment,
      // Performance
      performanceSnapshots,
      performanceHistory,
      performanceAlerts,
      performanceThresholds,
      isPerformanceLive,
      performancePollingInterval,
      onTogglePerformanceLive,
      onAcknowledgePerformanceAlert,
      onUpdatePerformanceThreshold,
      // Audit
      auditEntries,
      auditTotalCount,
      auditHasMore,
      auditFilters,
      onAuditFiltersChange,
      onAuditLoadMore,
      auditLoading,
      // Founders
      foundersUserId,
      // Marketplace
      marketplaceUserId,
      marketplaceSellerId,
      stripePublishableKey,
    } = props;

    const [activeTab, setActiveTab] = useState<AdminTab>(defaultTab);

    // AG-UI: Agent interaction for the admin dashboard
    const {
      isThinking: agentIsThinking,
      notifications: agentNotifications,
      suggestions: agentSuggestions,
      reportActivity,
      agentState,
    } = useVRDashboardAgent();

    // AG-UI: Report tab navigation to agent
    useEffect(() => {
      reportActivity('dashboard_navigation', {
        panel: activeTab,
        dashboardType: 'admin',
        adminUser: adminUser.email,
      });
    }, [activeTab, reportActivity, adminUser.email]);

    // AG-UI: Respond to agent-driven navigation
    useEffect(() => {
      if (agentState.activePanel && agentState.activePanel !== activeTab) {
        const validTab = ADMIN_TABS.find((t) => t.id === agentState.activePanel);
        if (validTab) {
          setActiveTab(validTab.id);
        }
      }
    }, [agentState.activePanel]); // eslint-disable-line react-hooks/exhaustive-deps

    // -----------------------------------------------------------------------
    // Platform status summary
    // -----------------------------------------------------------------------
    const platformStatus = useMemo(() => {
      const activeOrgs = organizations.filter((o) => o.status === 'active').length;
      const runningExperiments = experiments.filter((e) => e.status === 'running').length;
      const criticalAlerts = performanceAlerts.filter(
        (a) => a.severity === 'critical' && !a.acknowledged,
      ).length;
      return { activeOrgs, runningExperiments, criticalAlerts };
    }, [organizations, experiments, performanceAlerts]);

    // -----------------------------------------------------------------------
    // Render active panel
    // -----------------------------------------------------------------------
    const renderPanel = useCallback(() => {
      switch (activeTab) {
        case 'tenants':
          return (
            <TenantManagement
              organizations={organizations}
              onCreateOrg={onCreateOrg}
              onUpdateOrg={onUpdateOrg}
              onDeleteOrg={onDeleteOrg}
              onSuspendOrg={onSuspendOrg}
              onReactivateOrg={onReactivateOrg}
              onFetchMembers={onFetchMembers}
              onInviteMember={onInviteMember}
              onRemoveMember={onRemoveMember}
              onChangeMemberRole={onChangeMemberRole}
            />
          );
        case 'quotas':
          return (
            <UsageQuotaDashboard
              quotas={quotas}
              onOverrideQuota={onOverrideQuota}
            />
          );
        case 'analytics':
          return (
            <AnalyticsDashboard
              analytics={analytics}
              periods={analyticsPeriods}
              onPeriodChange={onAnalyticsPeriodChange}
            />
          );
        case 'experiments':
          return (
            <ABTestManagement
              experiments={experiments}
              onCreateExperiment={onCreateExperiment}
              onStartExperiment={onStartExperiment}
              onPauseExperiment={onPauseExperiment}
              onCompleteExperiment={onCompleteExperiment}
              onArchiveExperiment={onArchiveExperiment}
            />
          );
        case 'performance':
          return (
            <RealTimePerformanceMonitor
              snapshots={performanceSnapshots}
              history={performanceHistory}
              alerts={performanceAlerts}
              thresholds={performanceThresholds}
              isLive={isPerformanceLive}
              pollingInterval={performancePollingInterval}
              onToggleLive={onTogglePerformanceLive}
              onAcknowledgeAlert={onAcknowledgePerformanceAlert}
              onUpdateThreshold={onUpdatePerformanceThreshold}
            />
          );
        case 'audit':
          return (
            <AuditLogViewer
              entries={auditEntries}
              totalCount={auditTotalCount}
              hasMore={auditHasMore}
              filters={auditFilters}
              onFiltersChange={onAuditFiltersChange}
              onLoadMore={onAuditLoadMore}
              loading={auditLoading}
            />
          );
        case 'founders':
          return foundersUserId ? (
            <FoundersProgramPage userId={foundersUserId} />
          ) : (
            <div
              style={{
                ...adminStyles.emptyState,
                height: '100%',
              }}
            >
              <span>No user ID configured for Founders Program.</span>
            </div>
          );
        case 'marketplace':
          return (
            <MarketplacePages
              currentUserId={marketplaceUserId ?? null}
              sellerId={marketplaceSellerId}
              stripePublishableKey={stripePublishableKey}
            />
          );
        default:
          return null;
      }
    }, [activeTab, props]);

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          fontFamily: FONTS.mono,
          fontSize: 11,
          color: COLORS.textPrimary,
          backgroundColor: COLORS.bg,
          overflow: 'hidden',
          position: 'relative',
        }}
        role="application"
        aria-label="Admin Dashboard"
      >
        {/* AG-UI: Notification bar at top */}
        <AgentNotificationBar
          style={{ position: 'absolute', top: 0, left: 180, right: 0, zIndex: 50 }}
        />
        {/* ================================================================= */}
        {/* SIDEBAR                                                           */}
        {/* ================================================================= */}
        <nav
          style={{
            width: 180,
            flexShrink: 0,
            backgroundColor: 'rgba(15, 15, 25, 0.98)',
            borderRight: `1px solid ${COLORS.border}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          role="navigation"
          aria-label="Admin navigation"
        >
          {/* Sidebar header */}
          <div
            style={{
              padding: '12px 14px',
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: COLORS.accent,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              HoloLand Admin
            </div>
            <div style={{ fontSize: 8, color: COLORS.textDim, marginTop: 2 }}>
              Platform Management
            </div>
          </div>

          {/* Nav items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {ADMIN_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 14px',
                    border: 'none',
                    background: isActive ? COLORS.accentBg : 'transparent',
                    color: isActive ? COLORS.accent : COLORS.textMuted,
                    cursor: 'pointer',
                    fontFamily: FONTS.mono,
                    fontSize: 10,
                    fontWeight: isActive ? 700 : 500,
                    textAlign: 'left',
                    borderLeft: isActive
                      ? `2px solid ${COLORS.accent}`
                      : '2px solid transparent',
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                  }}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={tab.description}
                >
                  <NavIcon icon={tab.icon} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sidebar footer: platform status */}
          <div
            style={{
              padding: '10px 14px',
              borderTop: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8 }}>
              <span style={{ color: COLORS.textMuted }}>Active Orgs</span>
              <span style={{ color: COLORS.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                {platformStatus.activeOrgs}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8 }}>
              <span style={{ color: COLORS.textMuted }}>Running Tests</span>
              <span style={{ color: COLORS.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                {platformStatus.runningExperiments}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8 }}>
              <span style={{ color: COLORS.textMuted }}>Critical Alerts</span>
              <span
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  color: platformStatus.criticalAlerts > 0 ? COLORS.error : COLORS.success,
                }}
              >
                {platformStatus.criticalAlerts}
              </span>
            </div>

            {/* Admin user info */}
            <div
              style={{
                marginTop: 6,
                paddingTop: 6,
                borderTop: `1px solid ${COLORS.borderLight}`,
              }}
            >
              <div style={{ fontSize: 9, fontWeight: 600, color: COLORS.textSecondary }}>
                {adminUser.name}
              </div>
              <div style={{ fontSize: 7, color: COLORS.textDim }}>{adminUser.email}</div>
            </div>
          </div>
        </nav>

        {/* ================================================================= */}
        {/* MAIN CONTENT                                                       */}
        {/* ================================================================= */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: 12,
            gap: 0,
            position: 'relative',
          }}
          role="main"
          aria-label={`${ADMIN_TABS.find((t) => t.id === activeTab)?.label || 'Admin'} panel`}
        >
          {/* AG-UI: Agent thinking indicator */}
          {agentIsThinking && (
            <AgentThinkingIndicator style={{ marginBottom: 8 }} />
          )}
          {renderPanel()}
          {/* AG-UI: Agent overlay with chat and suggestions */}
          <AgentOverlay position="bottom-right" showChat={true} showSuggestions={true} />
        </main>
      </div>
    );
  },
);

export default AdminDashboard;
