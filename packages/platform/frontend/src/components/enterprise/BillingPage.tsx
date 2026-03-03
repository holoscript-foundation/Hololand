/**
 * BillingPage Component
 *
 * Billing and plan management with:
 *   - Plan comparison cards (Free/Pro/Enterprise) with feature check/X marks
 *   - Current plan highlighted, upgrade/downgrade buttons
 *   - Usage dashboard with progress bars (worlds, assets, storage, collaborators)
 *   - Invoice history table (date, amount, status, download PDF)
 *   - Payment method section (card on file, update via Stripe Elements)
 *   - Upcoming invoice preview with proration details
 *
 * Uses Tailwind CSS with full ARIA accessibility.
 *
 * @module enterprise/BillingPage
 */

import React, { useState, useCallback } from 'react';
import {
  type PlanTier,
  type UsageMetric,
  type Invoice,
  type InvoiceStatus,
  type PaymentMethod,
  type UpcomingInvoice,
  type PlanFeature,
  PLANS,
  PLAN_FEATURES,
} from './EnterpriseTypes';

// =============================================================================
// PROPS
// =============================================================================

export interface BillingPageProps {
  currentPlan: PlanTier;
  usage: UsageMetric[];
  invoices: Invoice[];
  paymentMethod?: PaymentMethod;
  upcomingInvoice?: UpcomingInvoice;
  onChangePlan: (newPlan: PlanTier) => void;
  onUpdatePaymentMethod: () => void;
  onDownloadInvoice: (invoiceId: string) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getPlanOrder(tier: PlanTier): number {
  const order: Record<PlanTier, number> = { free: 0, pro: 1, enterprise: 2 };
  return order[tier];
}

// =============================================================================
// PLAN COMPARISON CARDS
// =============================================================================

const PlanCard: React.FC<{
  tier: PlanTier;
  name: string;
  price: number;
  description: string;
  features: string[];
  isCurrent: boolean;
  currentPlan: PlanTier;
  onChange: (tier: PlanTier) => void;
}> = ({ tier, name, price, description, features, isCurrent, currentPlan, onChange }) => {
  const isUpgrade = getPlanOrder(tier) > getPlanOrder(currentPlan);
  const isDowngrade = getPlanOrder(tier) < getPlanOrder(currentPlan);

  return (
    <div
      className={`
        flex flex-col p-5 rounded-lg border transition-all
        ${isCurrent
          ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/20'
          : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.12]'
        }
      `}
      role="article"
      aria-label={`${name} plan`}
    >
      {/* Plan header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-bold text-zinc-200">{name}</h3>
          {isCurrent && (
            <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/25 text-indigo-300 border border-indigo-500/30">
              Current
            </span>
          )}
        </div>
        <p className="text-[10px] text-zinc-500">{description}</p>
      </div>

      {/* Price */}
      <div className="mb-4">
        <span className="text-2xl font-bold text-zinc-200 tabular-nums">
          {price === 0 ? 'Free' : formatCents(price)}
        </span>
        {price > 0 && <span className="text-[10px] text-zinc-500 ml-1">/month</span>}
      </div>

      {/* Features */}
      <ul className="space-y-2 mb-6 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-[11px] text-zinc-400">
            <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      {/* Action button */}
      {isCurrent ? (
        <div className="py-2 text-center text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 rounded-md border border-indigo-500/20">
          Current Plan
        </div>
      ) : isUpgrade ? (
        <button
          className="w-full py-2 text-[11px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 rounded-md hover:bg-indigo-500/25 transition-colors"
          onClick={() => onChange(tier)}
          aria-label={`Upgrade to ${name}`}
        >
          Upgrade to {name}
        </button>
      ) : isDowngrade ? (
        <button
          className="w-full py-2 text-[11px] font-bold text-zinc-500 bg-white/[0.03] border border-white/[0.08] rounded-md hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
          onClick={() => onChange(tier)}
          aria-label={`Downgrade to ${name}`}
        >
          Downgrade to {name}
        </button>
      ) : null}
    </div>
  );
};

// =============================================================================
// PLAN FEATURE COMPARISON TABLE
// =============================================================================

const FeatureComparisonTable: React.FC<{
  features: PlanFeature[];
  currentPlan: PlanTier;
}> = ({ features, currentPlan }) => {
  const renderCell = (value: boolean | string, tier: PlanTier) => {
    const isCurrent = tier === currentPlan;
    if (typeof value === 'string') {
      return (
        <span className={`text-[10px] font-mono tabular-nums ${isCurrent ? 'text-indigo-300' : 'text-zinc-400'}`}>
          {value}
        </span>
      );
    }
    return value ? (
      <svg className={`w-3.5 h-3.5 ${isCurrent ? 'text-indigo-400' : 'text-emerald-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full" role="grid" aria-label="Plan feature comparison">
        <thead>
          <tr>
            <th className="text-left text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-4 py-2 border-b border-white/[0.06]">
              Feature
            </th>
            {(['free', 'pro', 'enterprise'] as PlanTier[]).map((tier) => (
              <th
                key={tier}
                className={`text-center text-[9px] font-bold uppercase tracking-wider px-4 py-2 border-b border-white/[0.06] ${
                  tier === currentPlan ? 'text-indigo-400' : 'text-zinc-600'
                }`}
              >
                {tier === 'free' ? 'Free' : tier === 'pro' ? 'Pro' : 'Enterprise'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature.name} className="hover:bg-white/[0.01] transition-colors">
              <td className="text-[10px] text-zinc-400 px-4 py-2 border-b border-white/[0.03]">
                {feature.name}
              </td>
              <td className={`text-center px-4 py-2 border-b border-white/[0.03] ${currentPlan === 'free' ? 'bg-indigo-500/[0.04]' : ''}`}>
                {renderCell(feature.free, 'free')}
              </td>
              <td className={`text-center px-4 py-2 border-b border-white/[0.03] ${currentPlan === 'pro' ? 'bg-indigo-500/[0.04]' : ''}`}>
                {renderCell(feature.pro, 'pro')}
              </td>
              <td className={`text-center px-4 py-2 border-b border-white/[0.03] ${currentPlan === 'enterprise' ? 'bg-indigo-500/[0.04]' : ''}`}>
                {renderCell(feature.enterprise, 'enterprise')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// =============================================================================
// USAGE DASHBOARD
// =============================================================================

const UsageDashboard: React.FC<{
  metrics: UsageMetric[];
}> = ({ metrics }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="region" aria-label="Usage dashboard">
    {metrics.map((metric) => {
      const isUnlimited = metric.limit < 0;
      const percent = isUnlimited ? 0 : metric.limit === 0 ? 100 : Math.min((metric.used / metric.limit) * 100, 100);
      const barColor = isUnlimited
        ? 'bg-indigo-500'
        : percent >= 90
          ? 'bg-red-500'
          : percent >= 70
            ? 'bg-amber-500'
            : 'bg-indigo-500';

      return (
        <div
          key={metric.label}
          className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
              {metric.label}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 tabular-nums">
              {metric.used.toLocaleString()}
              <span className="text-zinc-600">
                /{isUnlimited ? '\u221E' : `${metric.limit.toLocaleString()} ${metric.unit}`}
              </span>
            </span>
          </div>
          <div
            className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden"
            role="progressbar"
            aria-valuenow={metric.used}
            aria-valuemin={0}
            aria-valuemax={isUnlimited ? undefined : metric.limit}
            aria-label={`${metric.label} usage`}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: isUnlimited ? '5%' : `${percent}%` }}
            />
          </div>
          {!isUnlimited && percent >= 80 && (
            <p className={`text-[9px] mt-1 ${percent >= 90 ? 'text-red-400' : 'text-amber-400'}`}>
              {percent >= 90 ? 'CRITICAL' : 'WARNING'}: {percent.toFixed(0)}% used
            </p>
          )}
        </div>
      );
    })}
  </div>
);

// =============================================================================
// INVOICE STATUS BADGE
// =============================================================================

const InvoiceStatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
  const config: Record<InvoiceStatus, { label: string; classes: string }> = {
    paid: {
      label: 'Paid',
      classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    pending: {
      label: 'Pending',
      classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    failed: {
      label: 'Failed',
      classes: 'bg-red-500/15 text-red-400 border-red-500/30',
    },
    refunded: {
      label: 'Refunded',
      classes: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    },
  };

  const { label, classes } = config[status];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase rounded-full border ${classes}`}>
      {label}
    </span>
  );
};

// =============================================================================
// INVOICE HISTORY TABLE
// =============================================================================

const InvoiceHistory: React.FC<{
  invoices: Invoice[];
  onDownload: (invoiceId: string) => void;
}> = ({ invoices, onDownload }) => (
  <div className="overflow-x-auto">
    {invoices.length === 0 ? (
      <div className="py-8 text-center text-[11px] text-zinc-600">
        No invoices yet.
      </div>
    ) : (
      <table className="w-full" role="grid" aria-label="Invoice history">
        <thead>
          <tr>
            <th className="text-left text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-4 py-2 border-b border-white/[0.06]">
              Date
            </th>
            <th className="text-left text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-4 py-2 border-b border-white/[0.06]">
              Description
            </th>
            <th className="text-right text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-4 py-2 border-b border-white/[0.06]">
              Amount
            </th>
            <th className="text-center text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-4 py-2 border-b border-white/[0.06]">
              Status
            </th>
            <th className="text-right text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-4 py-2 border-b border-white/[0.06]">
              Invoice
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-2.5 text-[10px] text-zinc-400 font-mono tabular-nums border-b border-white/[0.03]">
                {new Date(invoice.date).toLocaleDateString()}
              </td>
              <td className="px-4 py-2.5 text-[11px] text-zinc-300 border-b border-white/[0.03]">
                {invoice.description}
              </td>
              <td className="px-4 py-2.5 text-[11px] text-zinc-200 font-mono tabular-nums text-right font-semibold border-b border-white/[0.03]">
                {formatCents(invoice.amount)}
              </td>
              <td className="px-4 py-2.5 text-center border-b border-white/[0.03]">
                <InvoiceStatusBadge status={invoice.status} />
              </td>
              <td className="px-4 py-2.5 text-right border-b border-white/[0.03]">
                <button
                  className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                  onClick={() => onDownload(invoice.id)}
                  aria-label={`Download PDF for invoice ${invoice.id}`}
                >
                  Download PDF
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

// =============================================================================
// PAYMENT METHOD SECTION
// =============================================================================

const PaymentMethodSection: React.FC<{
  method?: PaymentMethod;
  onUpdate: () => void;
}> = ({ method, onUpdate }) => (
  <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
    {method ? (
      <div className="flex items-center gap-3">
        {/* Card icon */}
        <div className="w-10 h-7 rounded bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
          <span className="text-[8px] font-bold text-zinc-400 uppercase">{method.brand}</span>
        </div>
        <div>
          <div className="text-[11px] text-zinc-300 font-medium">
            {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} ending in {method.last4}
          </div>
          <div className="text-[9px] text-zinc-600 tabular-nums">
            Expires {String(method.expMonth).padStart(2, '0')}/{method.expYear}
          </div>
        </div>
      </div>
    ) : (
      <div className="text-[11px] text-zinc-600">
        No payment method on file.
      </div>
    )}
    <button
      className="px-4 py-2 text-[10px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 rounded-md hover:bg-indigo-500/25 transition-colors"
      onClick={onUpdate}
      aria-label={method ? 'Update payment method' : 'Add payment method'}
    >
      {method ? 'Update Card' : 'Add Card'}
    </button>
  </div>
);

// =============================================================================
// UPCOMING INVOICE PREVIEW
// =============================================================================

const UpcomingInvoicePreview: React.FC<{
  invoice: UpcomingInvoice;
}> = ({ invoice }) => (
  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] space-y-3">
    <div className="flex items-center justify-between">
      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
        Upcoming Invoice
      </h4>
      <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
        {new Date(invoice.date).toLocaleDateString()}
      </span>
    </div>

    {/* Line items */}
    <div className="space-y-1.5">
      {invoice.lineItems.map((item, i) => (
        <div key={i} className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-400">{item.description}</span>
          <span className="text-zinc-300 font-mono tabular-nums font-medium">
            {formatCents(item.amount)}
          </span>
        </div>
      ))}
    </div>

    {/* Proration details */}
    {invoice.prorationDetails && (
      <div className="pt-2 mt-2 border-t border-white/[0.06] space-y-1.5">
        <div className="text-[9px] font-semibold text-amber-400 uppercase tracking-wide mb-1">
          Proration
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-zinc-500">
            {invoice.prorationDetails.currentPlan} &rarr; {invoice.prorationDetails.newPlan}
          </span>
          <span className="text-zinc-400 font-mono tabular-nums">
            {formatCents(invoice.prorationDetails.prorationAmount)}
          </span>
        </div>
        {invoice.prorationDetails.credit > 0 && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">Credit from current plan</span>
            <span className="text-emerald-400 font-mono tabular-nums">
              -{formatCents(invoice.prorationDetails.credit)}
            </span>
          </div>
        )}
      </div>
    )}

    {/* Total */}
    <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center justify-between">
      <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Due</span>
      <span className="text-sm font-bold text-zinc-200 font-mono tabular-nums">
        {formatCents(invoice.amount)}
      </span>
    </div>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const BillingPage = React.memo<BillingPageProps>(
  function BillingPage({
    currentPlan,
    usage,
    invoices,
    paymentMethod,
    upcomingInvoice,
    onChangePlan,
    onUpdatePaymentMethod,
    onDownloadInvoice,
  }) {
    const [showFeatureTable, setShowFeatureTable] = useState(false);

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
      <div className="flex flex-col h-full overflow-y-auto" role="region" aria-label="Billing and plan management">
        <div className="p-6 space-y-8 max-w-5xl">
          {/* ============================================================= */}
          {/* PLAN COMPARISON                                                */}
          {/* ============================================================= */}
          <section aria-label="Plan selection">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Choose Your Plan
              </h2>
              <button
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                onClick={() => setShowFeatureTable((s) => !s)}
                aria-expanded={showFeatureTable}
                aria-controls="feature-comparison-table"
              >
                {showFeatureTable ? 'Hide Comparison' : 'Compare All Features'}
              </button>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLANS.map((plan) => (
                <PlanCard
                  key={plan.tier}
                  tier={plan.tier}
                  name={plan.name}
                  price={plan.price}
                  description={plan.description}
                  features={plan.features}
                  isCurrent={plan.tier === currentPlan}
                  currentPlan={currentPlan}
                  onChange={onChangePlan}
                />
              ))}
            </div>

            {/* Feature comparison table (collapsible) */}
            {showFeatureTable && (
              <div id="feature-comparison-table" className="mt-6 rounded-lg border border-white/[0.06] overflow-hidden">
                <FeatureComparisonTable features={PLAN_FEATURES} currentPlan={currentPlan} />
              </div>
            )}
          </section>

          {/* ============================================================= */}
          {/* USAGE DASHBOARD                                                */}
          {/* ============================================================= */}
          <section aria-label="Usage dashboard">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4">
              Usage
            </h2>
            <UsageDashboard metrics={usage} />
          </section>

          {/* ============================================================= */}
          {/* PAYMENT METHOD                                                 */}
          {/* ============================================================= */}
          <section aria-label="Payment method">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4">
              Payment Method
            </h2>
            <PaymentMethodSection method={paymentMethod} onUpdate={onUpdatePaymentMethod} />
          </section>

          {/* ============================================================= */}
          {/* UPCOMING INVOICE                                               */}
          {/* ============================================================= */}
          {upcomingInvoice && (
            <section aria-label="Upcoming invoice">
              <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4">
                Next Invoice
              </h2>
              <UpcomingInvoicePreview invoice={upcomingInvoice} />
            </section>
          )}

          {/* ============================================================= */}
          {/* INVOICE HISTORY                                                */}
          {/* ============================================================= */}
          <section aria-label="Invoice history">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-4">
              Invoice History
            </h2>
            <div className="rounded-lg border border-white/[0.06] overflow-hidden">
              <InvoiceHistory invoices={invoices} onDownload={onDownloadInvoice} />
            </div>
          </section>
        </div>
      </div>
    );
  },
);

export default BillingPage;
