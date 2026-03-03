/**
 * EnterpriseAdmin Component
 *
 * Enterprise management dashboard with tabbed layout containing:
 *   - SSO Configuration
 *   - Domain Management
 *   - Billing & Plans
 *
 * Top bar displays current plan badge, tenant name, and plan usage summary.
 * Uses Tailwind CSS for styling with full ARIA accessibility.
 *
 * @module enterprise/EnterpriseAdmin
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  type EnterpriseTab,
  type PlanTier,
  type UsageMetric,
  type SSOConfiguration,
  type SSOTestResult,
  type SAMLConfig,
  type OIDCConfig,
  type CustomDomain,
  type Invoice,
  type PaymentMethod,
  type UpcomingInvoice,
  ENTERPRISE_TABS,
} from './EnterpriseTypes';
import { SSOConfigWizard, type SSOConfigWizardProps } from './SSOConfigWizard';
import { DomainManagement, type DomainManagementProps } from './DomainManagement';
import { BillingPage, type BillingPageProps } from './BillingPage';

// =============================================================================
// PROPS
// =============================================================================

export interface EnterpriseAdminProps {
  /** Tenant / organization name */
  tenantName: string;
  /** Current subscription plan */
  currentPlan: PlanTier;
  /** Usage metrics for the top bar summary */
  usage: UsageMetric[];

  // -- SSO --
  ssoConfig?: SSOConfiguration;
  onSaveSSO: SSOConfigWizardProps['onSave'];
  onTestSSO: SSOConfigWizardProps['onTestConnection'];
  onDownloadSPMetadata?: SSOConfigWizardProps['onDownloadSPMetadata'];
  acsUrl?: string;
  redirectUri?: string;

  // -- Domains --
  domains: CustomDomain[];
  onAddDomain: DomainManagementProps['onAddDomain'];
  onVerifyDomain: DomainManagementProps['onVerifyDomain'];
  onRemoveDomain: DomainManagementProps['onRemoveDomain'];

  // -- Billing --
  invoices: Invoice[];
  paymentMethod?: PaymentMethod;
  upcomingInvoice?: UpcomingInvoice;
  onChangePlan: BillingPageProps['onChangePlan'];
  onUpdatePaymentMethod: BillingPageProps['onUpdatePaymentMethod'];
  onDownloadInvoice: BillingPageProps['onDownloadInvoice'];

  /** Default active tab */
  defaultTab?: EnterpriseTab;
}

// =============================================================================
// PLAN BADGE SUB-COMPONENT
// =============================================================================

const PlanBadge: React.FC<{ plan: PlanTier }> = ({ plan }) => {
  const config: Record<PlanTier, { label: string; classes: string }> = {
    free: {
      label: 'Free',
      classes: 'bg-zinc-700/50 text-zinc-300 border-zinc-600',
    },
    pro: {
      label: 'Pro',
      classes: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    },
    enterprise: {
      label: 'Enterprise',
      classes: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
  };

  const { label, classes } = config[plan];

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${classes}`}
      aria-label={`Current plan: ${label}`}
    >
      {label}
    </span>
  );
};

// =============================================================================
// USAGE SUMMARY SUB-COMPONENT
// =============================================================================

const UsageSummary: React.FC<{ metrics: UsageMetric[] }> = ({ metrics }) => (
  <div className="flex items-center gap-4" aria-label="Plan usage summary">
    {metrics.slice(0, 4).map((metric) => {
      const isUnlimited = metric.limit < 0;
      const percent = isUnlimited ? 0 : metric.limit === 0 ? 100 : Math.min((metric.used / metric.limit) * 100, 100);
      const colorClass = isUnlimited
        ? 'text-zinc-400'
        : percent >= 90
          ? 'text-red-400'
          : percent >= 70
            ? 'text-amber-400'
            : 'text-zinc-400';

      return (
        <div key={metric.label} className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500 font-medium">{metric.label}:</span>
          <span className={`text-[10px] font-mono font-semibold tabular-nums ${colorClass}`}>
            {metric.used.toLocaleString()}
            <span className="text-zinc-600">
              /{isUnlimited ? '\u221E' : metric.limit.toLocaleString()}
            </span>
          </span>
        </div>
      );
    })}
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const EnterpriseAdmin = React.memo<EnterpriseAdminProps>(
  function EnterpriseAdmin(props) {
    const {
      tenantName,
      currentPlan,
      usage,
      // SSO
      ssoConfig,
      onSaveSSO,
      onTestSSO,
      onDownloadSPMetadata,
      acsUrl,
      redirectUri,
      // Domains
      domains,
      onAddDomain,
      onVerifyDomain,
      onRemoveDomain,
      // Billing
      invoices,
      paymentMethod,
      upcomingInvoice,
      onChangePlan,
      onUpdatePaymentMethod,
      onDownloadInvoice,
      // Tab
      defaultTab = 'sso',
    } = props;

    const [activeTab, setActiveTab] = useState<EnterpriseTab>(defaultTab);

    // -----------------------------------------------------------------------
    // Render active panel
    // -----------------------------------------------------------------------
    const renderPanel = useCallback(() => {
      switch (activeTab) {
        case 'sso':
          return (
            <SSOConfigWizard
              existingConfig={ssoConfig}
              onSave={onSaveSSO}
              onTestConnection={onTestSSO}
              onDownloadSPMetadata={onDownloadSPMetadata}
              acsUrl={acsUrl}
              redirectUri={redirectUri}
            />
          );
        case 'domains':
          return (
            <DomainManagement
              domains={domains}
              onAddDomain={onAddDomain}
              onVerifyDomain={onVerifyDomain}
              onRemoveDomain={onRemoveDomain}
            />
          );
        case 'billing':
          return (
            <BillingPage
              currentPlan={currentPlan}
              usage={usage}
              invoices={invoices}
              paymentMethod={paymentMethod}
              upcomingInvoice={upcomingInvoice}
              onChangePlan={onChangePlan}
              onUpdatePaymentMethod={onUpdatePaymentMethod}
              onDownloadInvoice={onDownloadInvoice}
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
        className="flex flex-col h-full bg-[#0f0f19] text-zinc-300 font-mono text-sm overflow-hidden rounded-xl border border-white/[0.08] shadow-2xl"
        role="region"
        aria-label="Enterprise administration"
      >
        {/* ================================================================= */}
        {/* TOP BAR                                                           */}
        {/* ================================================================= */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b border-white/[0.08] bg-[rgba(15,15,25,0.98)] flex-shrink-0"
          role="banner"
        >
          {/* Left: Tenant name + plan badge */}
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-zinc-200 tracking-wide">
              {tenantName}
            </h1>
            <PlanBadge plan={currentPlan} />
          </div>

          {/* Right: Usage summary */}
          <UsageSummary metrics={usage} />
        </header>

        {/* ================================================================= */}
        {/* TAB NAVIGATION                                                    */}
        {/* ================================================================= */}
        <nav
          className="flex items-center gap-0 px-6 border-b border-white/[0.04] bg-black/20 flex-shrink-0"
          role="tablist"
          aria-label="Enterprise admin sections"
        >
          {ENTERPRISE_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                className={`
                  relative px-4 py-3 text-[11px] font-semibold tracking-wide transition-colors duration-150
                  ${isActive
                    ? 'text-indigo-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                  }
                `}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="flex items-center gap-2">
                  <span className="text-[9px] font-extrabold opacity-60">{tab.icon}</span>
                  {tab.label}
                </span>
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-indigo-500 rounded-t" />
                )}
              </button>
            );
          })}
        </nav>

        {/* ================================================================= */}
        {/* CONTENT PANEL                                                     */}
        {/* ================================================================= */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {renderPanel()}
        </main>
      </div>
    );
  },
);

export default EnterpriseAdmin;
