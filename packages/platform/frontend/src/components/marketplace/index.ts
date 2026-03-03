/**
 * Marketplace Components
 *
 * Barrel export for all marketplace frontend components.
 *
 * @module marketplace
 */

// Components
export { MarketplaceBrowse, type MarketplaceBrowseProps } from './MarketplaceBrowse';
export { AssetDetailPage, type AssetDetailPageProps } from './AssetDetailPage';
export { SellerDashboard, type SellerDashboardProps } from './SellerDashboard';

// API Client & Types
export {
  marketplaceAPI,
  checkoutAPI,
  sellerAPI,
  remixAPI,
} from './marketplaceApi';

export type {
  // Shared types
  AssetCategory,
  PricingTier,
  ListingStatus,
  SortOption,
  CheckoutStatus,
  PayoutStatus,
  // Asset types
  MarketplaceAsset,
  AssetDetail,
  AssetReview,
  FeaturedListing,
  // Browse types
  BrowseFilters,
  BrowseResult,
  // Checkout types
  CheckoutSession,
  PurchaseHistoryItem,
  // Seller types
  SellerEarningsSummary,
  SellerListing,
  SellerDailySales,
  PayoutRecord,
  ModerationQueueItem,
  NewListingParams,
} from './marketplaceApi';
