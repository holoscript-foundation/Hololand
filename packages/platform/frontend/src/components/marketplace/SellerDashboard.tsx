'use client';

/**
 * SellerDashboard Component
 *
 * Seller view for managing marketplace listings, viewing earnings,
 * and tracking sales performance.
 *
 * Features:
 *   - Earnings summary card (gross/net/pending/paid out)
 *   - Sales chart (last 30 days bar chart)
 *   - Active listings table (title, status, price, views, sales, actions)
 *   - Pending moderation items
 *   - Payout history table (date, amount, status)
 *   - "List New Asset" button opening listing form
 *
 * Wires to MarketplaceCheckout/AssetListingService seller endpoints.
 *
 * @module marketplace/SellerDashboard
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useVRDashboardAgent } from '../../ag-ui/hooks';
import { AgentOverlay, AgentThinkingIndicator, AgentNotificationBar } from '../../ag-ui/components';
import {
  sellerAPI,
  type SellerEarningsSummary,
  type SellerListing,
  type SellerDailySales,
  type PayoutRecord,
  type ModerationQueueItem,
  type NewListingParams,
  type AssetCategory,
  type ListingStatus,
} from './marketplaceApi';

// ============================================================================
// Props
// ============================================================================

export interface SellerDashboardProps {
  /** The seller/user ID */
  sellerId: string;
  /** Called when navigating to a listing detail */
  onListingClick?: (listingId: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_BADGE_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  published: 'bg-green-100 text-green-700',
  suspended: 'bg-orange-100 text-orange-700',
  taken_down: 'bg-red-100 text-red-700',
};

const PAYOUT_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const CATEGORY_OPTIONS: { value: AssetCategory; label: string }[] = [
  { value: '3d-models', label: '3D Models' },
  { value: 'scripts', label: 'Scripts' },
  { value: 'materials', label: 'Materials' },
  { value: 'sounds', label: 'Sounds' },
  { value: 'templates', label: 'Templates' },
  { value: 'worlds', label: 'Worlds' },
];

type DashboardTab = 'overview' | 'listings' | 'payouts';

// ============================================================================
// Sub-Components
// ============================================================================

/** Summary stat card */
function StatCard({
  label,
  value,
  subValue,
  accent,
}: {
  label: string;
  value: string;
  subValue?: string;
  accent?: 'green' | 'blue' | 'yellow' | 'purple';
}) {
  const accentColors = {
    green: 'border-green-400 bg-green-50',
    blue: 'border-blue-400 bg-blue-50',
    yellow: 'border-yellow-400 bg-yellow-50',
    purple: 'border-purple-400 bg-purple-50',
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-l-4 p-5 ${
        accent ? accentColors[accent] : 'border-gray-200'
      }`}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
    </div>
  );
}

/** Simple bar chart for daily sales */
function SalesChart({ data }: { data: SellerDailySales[] }) {
  const maxRevenue = useMemo(
    () => Math.max(...data.map((d) => d.revenueCents), 1),
    [data],
  );

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        No sales data available
      </div>
    );
  }

  return (
    <div className="h-48 flex items-end gap-1 px-2">
      {data.map((day, i) => {
        const height = Math.max((day.revenueCents / maxRevenue) * 100, 2);
        const date = new Date(day.date);
        const dayLabel = date.getDate().toString();
        const isToday = i === data.length - 1;

        return (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center group relative"
          >
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                <div className="font-medium">
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div>${(day.revenueCents / 100).toFixed(2)}</div>
                <div>{day.salesCount} sale{day.salesCount !== 1 ? 's' : ''}</div>
              </div>
            </div>

            {/* Bar */}
            <div
              className={`w-full rounded-t transition-colors ${
                isToday ? 'bg-indigo-500' : 'bg-indigo-300 hover:bg-indigo-400'
              }`}
              style={{ height: `${height}%` }}
              role="img"
              aria-label={`${date.toLocaleDateString()}: $${(day.revenueCents / 100).toFixed(2)}, ${day.salesCount} sales`}
            />

            {/* Day label (show every 5th + last) */}
            {(i % 5 === 0 || isToday) && (
              <span className="text-[9px] text-gray-400 mt-1">{dayLabel}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Status badge */
function StatusBadge({ status }: { status: string }) {
  const style = STATUS_BADGE_STYLES[status] || 'bg-gray-100 text-gray-600';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${style}`}>
      {label}
    </span>
  );
}

/** New listing form modal */
function NewListingModal({
  sellerId,
  onClose,
  onCreated,
}: {
  sellerId: string;
  onClose: () => void;
  onCreated: (listing: SellerListing) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [category, setCategory] = useState<AssetCategory>('3d-models');
  const [tags, setTags] = useState('');
  const [assetId, setAssetId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const priceCents = Math.round(parseFloat(priceStr || '0') * 100);

    const params: NewListingParams = {
      assetId: assetId || `asset_${Date.now()}`,
      title,
      description,
      priceCents,
      category,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    const { data, error: apiError } = await sellerAPI.createListing(sellerId, params);

    if (apiError) {
      setError(apiError.message);
      setSubmitting(false);
      return;
    }

    if (data) {
      onCreated(data);
    }

    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="List new asset"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">List New Asset</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="listing-asset-id" className="block text-sm font-medium text-gray-700 mb-1">
              Asset ID
            </label>
            <input
              id="listing-asset-id"
              type="text"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              placeholder="Select or paste asset ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="listing-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="listing-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Awesome Asset"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label htmlFor="listing-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="listing-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your asset..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="listing-price" className="block text-sm font-medium text-gray-700 mb-1">
                Price (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  id="listing-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceStr}
                  onChange={(e) => setPriceStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Set to 0 for free</p>
            </div>

            <div>
              <label htmlFor="listing-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="listing-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="listing-tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              id="listing-tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="fantasy, medieval, castle (comma separated)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !title || !description}
              className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Listing'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SellerDashboard({
  sellerId,
  onListingClick,
}: SellerDashboardProps) {
  // AG-UI: Agent interaction for seller dashboard
  const { reportActivity, isThinking, agentState } = useVRDashboardAgent();

  // ---- State ----
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [earnings, setEarnings] = useState<SellerEarningsSummary | null>(null);
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [dailySales, setDailySales] = useState<SellerDailySales[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [moderationItems, setModerationItems] = useState<ModerationQueueItem[]>([]);
  const [listingsTotal, setListingsTotal] = useState(0);
  const [payoutsTotal, setPayoutsTotal] = useState(0);

  // UI
  const [showNewListingModal, setShowNewListingModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ---- Data Fetching ----
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [earningsRes, listingsRes, salesRes, payoutsRes, moderationRes] = await Promise.all([
        sellerAPI.getEarnings(sellerId),
        sellerAPI.getListings(sellerId, { limit: 50 }),
        sellerAPI.getDailySales(sellerId, 30),
        sellerAPI.getPayoutHistory(sellerId, { limit: 20 }),
        sellerAPI.getPendingModeration(sellerId),
      ]);

      if (earningsRes.data) setEarnings(earningsRes.data);
      if (listingsRes.data) {
        setListings(listingsRes.data.listings);
        setListingsTotal(listingsRes.data.total);
      }
      if (salesRes.data) setDailySales(salesRes.data);
      if (payoutsRes.data) {
        setPayouts(payoutsRes.data.payouts);
        setPayoutsTotal(payoutsRes.data.total);
      }
      if (moderationRes.data) setModerationItems(moderationRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    }

    setLoading(false);
  }, [sellerId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // AG-UI: Report tab navigation to agent
  useEffect(() => {
    reportActivity('dashboard_navigation', {
      panel: activeTab,
      dashboardType: 'seller',
      sellerId,
    });
  }, [activeTab, reportActivity, sellerId]);

  // AG-UI: Report earnings data to agent when available
  useEffect(() => {
    if (earnings) {
      reportActivity('data_refresh', {
        dataType: 'earnings',
        grossRevenue: earnings.grossRevenue,
        netEarnings: earnings.netEarnings,
        activeListings: activeListings.length,
      });
    }
  }, [earnings, activeListings.length, reportActivity]);

  // ---- Handlers ----
  const handlePauseListing = useCallback(async (listingId: string) => {
    setActionLoading(listingId);
    const { error: apiError } = await sellerAPI.pauseListing(listingId);
    if (!apiError) {
      setListings((prev) =>
        prev.map((l) =>
          l.id === listingId ? { ...l, status: 'suspended' as ListingStatus } : l,
        ),
      );
    }
    setActionLoading(null);
  }, []);

  const handleRemoveListing = useCallback(async (listingId: string) => {
    if (!window.confirm('Are you sure you want to remove this listing?')) return;
    setActionLoading(listingId);
    const { error: apiError } = await sellerAPI.removeListing(listingId);
    if (!apiError) {
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      setListingsTotal((prev) => prev - 1);
    }
    setActionLoading(null);
  }, []);

  const handleListingCreated = useCallback((listing: SellerListing) => {
    setListings((prev) => [listing, ...prev]);
    setListingsTotal((prev) => prev + 1);
    setShowNewListingModal(false);
  }, []);

  // ---- Computed ----
  const activeListings = useMemo(
    () => listings.filter((l) => l.status === 'published'),
    [listings],
  );
  const totalSalesLast30 = useMemo(
    () => dailySales.reduce((sum, d) => sum + d.salesCount, 0),
    [dailySales],
  );
  const revenueLast30 = useMemo(
    () => dailySales.reduce((sum, d) => sum + d.revenueCents, 0),
    [dailySales],
  );

  // ---- Loading ----
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg" />
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className="min-h-screen bg-gray-50" style={{ position: 'relative' }}>
      {/* AG-UI: Notification bar */}
      <AgentNotificationBar style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }} />

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
                <p className="text-gray-600 mt-1">Manage your marketplace listings and earnings</p>
              </div>
              {/* AG-UI: Agent thinking indicator */}
              <AgentThinkingIndicator />
            </div>
            <button
              onClick={() => setShowNewListingModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              List New Asset
            </button>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex space-x-8">
            {([
              { id: 'overview' as DashboardTab, label: 'Overview' },
              { id: 'listings' as DashboardTab, label: `Listings (${listingsTotal})` },
              { id: 'payouts' as DashboardTab, label: 'Payouts' },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-6 text-sm">
            {error}
            <button onClick={loadDashboard} className="ml-2 font-medium underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* OVERVIEW TAB                                                    */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Earnings summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Gross Revenue"
                value={earnings ? `$${earnings.grossRevenue.toFixed(2)}` : '$0.00'}
                subValue="Total before fees"
                accent="green"
              />
              <StatCard
                label="Net Earnings"
                value={earnings ? `$${earnings.netEarnings.toFixed(2)}` : '$0.00'}
                subValue={earnings ? `Fees: $${(earnings.platformFees + earnings.processingFees).toFixed(2)}` : 'After platform + processing fees'}
                accent="blue"
              />
              <StatCard
                label="Pending Payout"
                value={earnings ? `$${earnings.pendingPayout.toFixed(2)}` : '$0.00'}
                subValue="Available for withdrawal"
                accent="yellow"
              />
              <StatCard
                label="Total Paid Out"
                value={earnings ? `$${earnings.totalPaidOut.toFixed(2)}` : '$0.00'}
                subValue="Successfully transferred"
                accent="purple"
              />
            </div>

            {/* Sales chart */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Sales (Last 30 Days)</h2>
                  <p className="text-sm text-gray-500">
                    {totalSalesLast30} sale{totalSalesLast30 !== 1 ? 's' : ''} | ${(revenueLast30 / 100).toFixed(2)} revenue
                  </p>
                </div>
              </div>
              <SalesChart data={dailySales} />
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Active Listings</p>
                <p className="text-2xl font-bold text-gray-900">{activeListings.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{moderationItems.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Listings</p>
                <p className="text-2xl font-bold text-gray-900">{listingsTotal}</p>
              </div>
            </div>

            {/* Pending moderation */}
            {moderationItems.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-yellow-800 mb-3">
                  Pending Moderation ({moderationItems.length})
                </h3>
                <div className="space-y-2">
                  {moderationItems.map((item) => (
                    <div
                      key={item.listingId}
                      className="flex items-center justify-between bg-white rounded-md px-4 py-2.5 border border-yellow-100"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900">{item.title}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          ${(item.priceCents / 100).toFixed(2)} | {item.pricingTier}
                        </span>
                      </div>
                      <span className="text-xs text-yellow-600 font-medium">
                        Submitted {new Date(item.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* LISTINGS TAB                                                    */}
        {/* ============================================================== */}
        {activeTab === 'listings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Your Listings ({listingsTotal})
              </h2>
              <button
                onClick={() => setShowNewListingModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Listing
              </button>
            </div>

            {listings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">No listings yet</h3>
                <p className="text-sm text-gray-500 mb-4">Start selling by creating your first listing</p>
                <button
                  onClick={() => setShowNewListingModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Create Your First Listing
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Views
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sales
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {listings.map((listing) => (
                        <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors text-left"
                              onClick={() => onListingClick?.(listing.id)}
                            >
                              {listing.title}
                            </button>
                            {listing.featured && (
                              <span className="ml-2 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded">
                                FEATURED
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={listing.status} />
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900 font-medium tabular-nums">
                            {listing.priceCents === 0
                              ? 'Free'
                              : `$${(listing.priceCents / 100).toFixed(2)}`}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600 tabular-nums">
                            {listing.views.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600 tabular-nums">
                            {listing.sales.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => onListingClick?.(listing.id)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                disabled={actionLoading === listing.id}
                              >
                                Edit
                              </button>
                              {listing.status === 'published' && (
                                <button
                                  onClick={() => handlePauseListing(listing.id)}
                                  className="text-xs text-yellow-600 hover:text-yellow-800 font-medium"
                                  disabled={actionLoading === listing.id}
                                >
                                  {actionLoading === listing.id ? '...' : 'Pause'}
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveListing(listing.id)}
                                className="text-xs text-red-600 hover:text-red-800 font-medium"
                                disabled={actionLoading === listing.id}
                              >
                                {actionLoading === listing.id ? '...' : 'Remove'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PAYOUTS TAB                                                     */}
        {/* ============================================================== */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            {/* Payout summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Pending Payout"
                value={earnings ? `$${earnings.pendingPayout.toFixed(2)}` : '$0.00'}
                subValue="Payouts processed weekly for balances over $25"
                accent="yellow"
              />
              <StatCard
                label="Total Paid Out"
                value={earnings ? `$${earnings.totalPaidOut.toFixed(2)}` : '$0.00'}
                accent="green"
              />
              <StatCard
                label="Platform Fees"
                value={
                  earnings
                    ? `$${(earnings.platformFees + earnings.processingFees).toFixed(2)}`
                    : '$0.00'
                }
                subValue="15% platform + 2.9% + $0.30 processing"
                accent="purple"
              />
            </div>

            {/* Payout history table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Payout History ({payoutsTotal})
                </h2>
              </div>

              {payouts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No payouts yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Payouts are processed weekly for balances over $25.00
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transfer ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(payout.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 tabular-nums">
                            ${(payout.amountCents / 100).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                PAYOUT_STATUS_STYLES[payout.status] || 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-gray-500">
                            {payout.transferId
                              ? `${payout.transferId.slice(0, 16)}...`
                              : '--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* New Listing Modal */}
      {showNewListingModal && (
        <NewListingModal
          sellerId={sellerId}
          onClose={() => setShowNewListingModal(false)}
          onCreated={handleListingCreated}
        />
      )}

      {/* AG-UI: Agent overlay */}
      <AgentOverlay position="bottom-right" showChat={true} showSuggestions={true} />
    </div>
  );
}

export default SellerDashboard;
