'use client';

/**
 * MarketplacePages
 *
 * Smart routing page for the marketplace section. Manages client-side
 * navigation between marketplace views:
 *
 *   /marketplace          -> MarketplaceBrowse
 *   /marketplace/:id      -> AssetDetailPage
 *   /marketplace/sell     -> SellerDashboard
 *
 * Features:
 *   - Client-side route resolution from window.location.pathname
 *   - Deep linking support (direct URL access to any sub-route)
 *   - Browser back/forward support via popstate listener
 *   - Programmatic navigation via pushState
 *   - URL parameter extraction for asset detail pages
 *
 * @module pages/MarketplacePages
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MarketplaceBrowse } from '../components/marketplace/MarketplaceBrowse';
import { AssetDetailPage } from '../components/marketplace/AssetDetailPage';
import { SellerDashboard } from '../components/marketplace/SellerDashboard';

// ============================================================================
// Types
// ============================================================================

type MarketplaceView =
  | { type: 'browse' }
  | { type: 'asset_detail'; assetId: string }
  | { type: 'sell' };

// ============================================================================
// Props
// ============================================================================

export interface MarketplacePagesProps {
  /** Currently authenticated user ID (null if not logged in) */
  currentUserId: string | null;
  /** Seller ID for the SellerDashboard (defaults to currentUserId) */
  sellerId?: string;
  /** Stripe publishable key for payment processing */
  stripePublishableKey?: string;
  /** Base path for marketplace routes (default: '/marketplace') */
  basePath?: string;
}

// ============================================================================
// Route Resolution
// ============================================================================

/**
 * Parses the current pathname to determine which marketplace view to show.
 * Supports:
 *   /marketplace         -> browse
 *   /marketplace/        -> browse
 *   /marketplace/sell    -> sell
 *   /marketplace/:id     -> asset_detail (where :id is not 'sell')
 */
function resolveRoute(pathname: string, basePath: string): MarketplaceView {
  // Normalize: remove trailing slash, ensure lowercase comparison
  const normalizedPath = pathname.replace(/\/+$/, '');
  const normalizedBase = basePath.replace(/\/+$/, '');

  // Strip the base path prefix
  let segment = normalizedPath;
  if (normalizedPath.startsWith(normalizedBase)) {
    segment = normalizedPath.slice(normalizedBase.length);
  }

  // Remove leading slash
  segment = segment.replace(/^\//, '');

  if (!segment) {
    return { type: 'browse' };
  }

  if (segment === 'sell') {
    return { type: 'sell' };
  }

  // Everything else is treated as an asset ID
  return { type: 'asset_detail', assetId: segment };
}

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Pushes a new route to the browser history and returns the new view state.
 */
function navigateTo(path: string, basePath: string): MarketplaceView {
  const fullPath = `${basePath}${path}`;
  if (typeof window !== 'undefined') {
    window.history.pushState({ marketplacePath: fullPath }, '', fullPath);
  }
  return resolveRoute(fullPath, basePath);
}

// ============================================================================
// Main Component
// ============================================================================

export function MarketplacePages({
  currentUserId,
  sellerId,
  stripePublishableKey,
  basePath = '/marketplace',
}: MarketplacePagesProps) {
  // ---- Route State ----
  const [currentView, setCurrentView] = useState<MarketplaceView>(() => {
    if (typeof window !== 'undefined') {
      return resolveRoute(window.location.pathname, basePath);
    }
    return { type: 'browse' };
  });

  const effectiveSellerId = sellerId || currentUserId;

  // ---- Popstate Listener (back/forward) ----
  useEffect(() => {
    function handlePopState() {
      const newView = resolveRoute(window.location.pathname, basePath);
      setCurrentView(newView);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [basePath]);

  // ---- Navigation Callbacks ----

  /** Navigate to an asset detail page */
  const handleAssetClick = useCallback(
    (assetId: string) => {
      const view = navigateTo(`/${assetId}`, basePath);
      setCurrentView(view);
    },
    [basePath],
  );

  /** Navigate back to the browse page */
  const handleBack = useCallback(() => {
    const view = navigateTo('', basePath);
    setCurrentView(view);
  }, [basePath]);

  /** Navigate to the seller dashboard */
  const handleNavigateToSell = useCallback(() => {
    const view = navigateTo('/sell', basePath);
    setCurrentView(view);
  }, [basePath]);

  /** Navigate to a creator profile (stubbed - could open profile page) */
  const handleCreatorClick = useCallback(
    (creatorId: string) => {
      // In production, this would navigate to /profiles/:creatorId
      // For now, navigate to marketplace filtered by creator
      console.log('Navigate to creator profile:', creatorId);
    },
    [],
  );

  /** Called after a successful remix */
  const handleRemixSuccess = useCallback(
    (remixWorldId: string) => {
      // In production, navigate to the world builder with the new remix
      console.log('Remix created, world ID:', remixWorldId);
    },
    [],
  );

  /** Called when clicking a listing in the seller dashboard */
  const handleListingClick = useCallback(
    (listingId: string) => {
      // Navigate to the asset detail for this listing
      handleAssetClick(listingId);
    },
    [handleAssetClick],
  );

  // ---- Render ----

  switch (currentView.type) {
    case 'browse':
      return (
        <MarketplaceBrowse
          onAssetClick={handleAssetClick}
        />
      );

    case 'asset_detail':
      return (
        <AssetDetailPage
          assetId={currentView.assetId}
          currentUserId={currentUserId}
          stripePublishableKey={stripePublishableKey}
          onAssetClick={handleAssetClick}
          onCreatorClick={handleCreatorClick}
          onRemixSuccess={handleRemixSuccess}
          onBack={handleBack}
        />
      );

    case 'sell':
      if (!effectiveSellerId) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Sign in Required</h2>
              <p className="text-gray-600 mb-6">
                You need to be signed in to access the seller dashboard.
              </p>
              <button
                onClick={handleBack}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors"
              >
                Back to Marketplace
              </button>
            </div>
          </div>
        );
      }

      return (
        <SellerDashboard
          sellerId={effectiveSellerId}
          onListingClick={handleListingClick}
        />
      );

    default:
      return null;
  }
}

export default MarketplacePages;
