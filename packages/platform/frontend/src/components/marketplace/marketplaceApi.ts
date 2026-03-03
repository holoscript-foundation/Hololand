/**
 * Marketplace API Client
 *
 * Provides typed fetch wrappers for the marketplace backend services:
 *   - AssetListingService (browse, search, listing CRUD)
 *   - StripePaymentService (checkout, payment intents)
 *   - MarketplaceCheckout (checkout sessions, purchase history, earnings)
 *   - RemixService (remix/fork assets)
 *
 * Follows the same pattern as founders/foundersApi.ts.
 *
 * @module marketplace/marketplaceApi
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// ============================================================================
// Shared Types
// ============================================================================

export type AssetCategory =
  | '3d-models'
  | 'scripts'
  | 'materials'
  | 'sounds'
  | 'templates'
  | 'worlds';

export type PricingTier = 'free' | 'starter' | 'premium' | 'enterprise';

export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'suspended'
  | 'taken_down';

export type SortOption =
  | 'popular'
  | 'newest'
  | 'price-low-high'
  | 'price-high-low'
  | 'top-rated';

export type CheckoutStatus =
  | 'created'
  | 'payment_pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'canceled';

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ============================================================================
// Asset / Listing Types
// ============================================================================

export interface MarketplaceAsset {
  id: string;
  listingId: string;
  title: string;
  description: string;
  category: AssetCategory;
  thumbnailUrl: string | null;
  previewUrls: string[];
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl: string | null;
  priceCents: number;
  pricingTier: PricingTier;
  rating: number;
  reviewCount: number;
  downloadCount: number;
  featured: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AssetDetail extends MarketplaceAsset {
  longDescription: string;
  fileFormat: string;
  fileSize: number;
  version: string;
  license: string;
  changelog: string | null;
  relatedAssets: MarketplaceAsset[];
  reviews: AssetReview[];
}

export interface AssetReview {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface FeaturedListing {
  id: string;
  asset: MarketplaceAsset;
  headline: string;
  featuredUntil: string;
}

// ============================================================================
// Browse / Search Types
// ============================================================================

export interface BrowseFilters {
  category?: AssetCategory;
  pricingTier?: PricingTier;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  search?: string;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

export interface BrowseResult {
  assets: MarketplaceAsset[];
  total: number;
  page: number;
  totalPages: number;
  featured: FeaturedListing[];
}

// ============================================================================
// Checkout Types
// ============================================================================

export interface CheckoutSession {
  id: string;
  assetId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amountCents: number;
  currency: string;
  platformFeeCents: number;
  processingFeeCents: number;
  sellerNetCents: number;
  paymentIntentId: string | null;
  clientSecret: string | null;
  status: CheckoutStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface PurchaseHistoryItem {
  purchaseId: string;
  assetId: string;
  listingId: string;
  title: string;
  amountCents: number;
  currency: string;
  status: CheckoutStatus;
  purchasedAt: string;
}

// ============================================================================
// Seller Types
// ============================================================================

export interface SellerEarningsSummary {
  sellerId: string;
  grossRevenue: number;
  platformFees: number;
  processingFees: number;
  netEarnings: number;
  pendingPayout: number;
  totalPaidOut: number;
}

export interface SellerListing {
  id: string;
  assetId: string;
  title: string;
  status: ListingStatus;
  priceCents: number;
  pricingTier: PricingTier;
  featured: boolean;
  views: number;
  sales: number;
  createdAt: string;
  updatedAt: string;
}

export interface SellerDailySales {
  date: string;
  salesCount: number;
  revenueCents: number;
}

export interface PayoutRecord {
  id: string;
  sellerId: string;
  amountCents: number;
  currency: string;
  transferId: string | null;
  status: PayoutStatus;
  scheduledFor: string;
  completedAt: string | null;
  createdAt: string;
}

export interface ModerationQueueItem {
  listingId: string;
  assetId: string;
  sellerId: string;
  title: string;
  description: string;
  priceCents: number;
  pricingTier: PricingTier;
  status: ListingStatus;
  submittedAt: string;
}

export interface NewListingParams {
  assetId: string;
  title: string;
  description: string;
  priceCents: number;
  category: AssetCategory;
  tags: string[];
  thumbnailUrl?: string;
  previewUrls?: string[];
}

// ============================================================================
// API Response Wrapper
// ============================================================================

interface ApiResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        data: null,
        error: { message: body.message || body.error || `Request failed (${response.status})` },
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Network error' },
    };
  }
}

// ============================================================================
// Marketplace Browse / Search API
// ============================================================================

export const marketplaceAPI = {
  /** Browse assets with filters, search, sorting, and pagination */
  browse(filters: BrowseFilters = {}): Promise<ApiResponse<BrowseResult>> {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.pricingTier) params.set('pricingTier', filters.pricingTier);
    if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
    if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating));
    if (filters.search) params.set('search', filters.search);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.page !== undefined) params.set('page', String(filters.page));
    if (filters.limit !== undefined) params.set('limit', String(filters.limit));
    const qs = params.toString();
    return apiRequest<BrowseResult>(`/marketplace/browse${qs ? `?${qs}` : ''}`);
  },

  /** Get featured listings for the carousel */
  getFeatured(limit = 6): Promise<ApiResponse<FeaturedListing[]>> {
    return apiRequest<FeaturedListing[]>(`/marketplace/featured?limit=${limit}`);
  },

  /** Get a single asset detail by ID */
  getAsset(assetId: string): Promise<ApiResponse<AssetDetail>> {
    return apiRequest<AssetDetail>(`/marketplace/assets/${assetId}`);
  },

  /** Get related assets for an asset */
  getRelatedAssets(assetId: string, limit = 6): Promise<ApiResponse<MarketplaceAsset[]>> {
    return apiRequest<MarketplaceAsset[]>(`/marketplace/assets/${assetId}/related?limit=${limit}`);
  },

  /** Submit a review for an asset */
  submitReview(assetId: string, params: {
    rating: number;
    comment: string;
  }): Promise<ApiResponse<AssetReview>> {
    return apiRequest<AssetReview>(`/marketplace/assets/${assetId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};

// ============================================================================
// Checkout API
// ============================================================================

export const checkoutAPI = {
  /** Create a checkout session for an asset purchase */
  createSession(params: {
    assetId: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    amountCents: number;
  }): Promise<ApiResponse<CheckoutSession>> {
    return apiRequest<CheckoutSession>('/marketplace/checkout', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /** Get a checkout session by ID */
  getSession(sessionId: string): Promise<ApiResponse<CheckoutSession>> {
    return apiRequest<CheckoutSession>(`/marketplace/checkout/${sessionId}`);
  },

  /** Get user purchase history */
  getPurchaseHistory(userId: string, opts?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ purchases: PurchaseHistoryItem[]; total: number }>> {
    const params = new URLSearchParams();
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.offset) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return apiRequest(`/marketplace/users/${userId}/purchases${qs ? `?${qs}` : ''}`);
  },

  /** Check if user already owns an asset */
  checkOwnership(userId: string, assetId: string): Promise<ApiResponse<{ owned: boolean }>> {
    return apiRequest<{ owned: boolean }>(`/marketplace/users/${userId}/owns/${assetId}`);
  },
};

// ============================================================================
// Seller API
// ============================================================================

export const sellerAPI = {
  /** Get seller earnings summary */
  getEarnings(sellerId: string): Promise<ApiResponse<SellerEarningsSummary>> {
    return apiRequest<SellerEarningsSummary>(`/marketplace/sellers/${sellerId}/earnings`);
  },

  /** Get seller listings */
  getListings(sellerId: string, opts?: {
    status?: ListingStatus;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ listings: SellerListing[]; total: number }>> {
    const params = new URLSearchParams();
    if (opts?.status) params.set('status', opts.status);
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.offset) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return apiRequest(`/marketplace/sellers/${sellerId}/listings${qs ? `?${qs}` : ''}`);
  },

  /** Get daily sales data for the last N days */
  getDailySales(sellerId: string, days = 30): Promise<ApiResponse<SellerDailySales[]>> {
    return apiRequest<SellerDailySales[]>(
      `/marketplace/sellers/${sellerId}/sales/daily?days=${days}`,
    );
  },

  /** Get payout history */
  getPayoutHistory(sellerId: string, opts?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ payouts: PayoutRecord[]; total: number }>> {
    const params = new URLSearchParams();
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.offset) params.set('offset', String(opts.offset));
    const qs = params.toString();
    return apiRequest(`/marketplace/sellers/${sellerId}/payouts${qs ? `?${qs}` : ''}`);
  },

  /** Get pending moderation items for a seller */
  getPendingModeration(sellerId: string): Promise<ApiResponse<ModerationQueueItem[]>> {
    return apiRequest<ModerationQueueItem[]>(
      `/marketplace/sellers/${sellerId}/moderation`,
    );
  },

  /** Create a new listing */
  createListing(sellerId: string, params: NewListingParams): Promise<ApiResponse<SellerListing>> {
    return apiRequest<SellerListing>(`/marketplace/sellers/${sellerId}/listings`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /** Update a listing */
  updateListing(listingId: string, params: Partial<NewListingParams>): Promise<ApiResponse<SellerListing>> {
    return apiRequest<SellerListing>(`/marketplace/listings/${listingId}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  },

  /** Pause a listing (unpublish) */
  pauseListing(listingId: string): Promise<ApiResponse<SellerListing>> {
    return apiRequest<SellerListing>(`/marketplace/listings/${listingId}/pause`, {
      method: 'POST',
    });
  },

  /** Remove a listing */
  removeListing(listingId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiRequest<{ success: boolean }>(`/marketplace/listings/${listingId}`, {
      method: 'DELETE',
    });
  },

  /** Submit a listing for review */
  submitForReview(listingId: string): Promise<ApiResponse<SellerListing>> {
    return apiRequest<SellerListing>(`/marketplace/listings/${listingId}/submit`, {
      method: 'POST',
    });
  },
};

// ============================================================================
// Remix API
// ============================================================================

export const remixAPI = {
  /** Instant-remix/fork an asset */
  remixAsset(params: {
    sourceAssetId: string;
    remixerId: string;
    title: string;
  }): Promise<ApiResponse<{ remixId: string; remixWorldId: string }>> {
    return apiRequest('/marketplace/remix', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};
