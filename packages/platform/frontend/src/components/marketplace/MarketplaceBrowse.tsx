'use client';

/**
 * MarketplaceBrowse Component
 *
 * Responsive grid/list toggle view for browsing marketplace assets.
 *
 * Features:
 *   - Featured carousel at top for boosted listings
 *   - Filter sidebar: category, price range, rating, pricing tier pills
 *   - Search bar with debounced input
 *   - Sort dropdown (Popular/Newest/Price Low-High/Price High-Low/Top Rated)
 *   - Grid/list view toggle
 *   - Asset cards: thumbnail, title, creator, price, rating stars, downloads
 *   - Pagination with page numbers
 *
 * Wires to AssetListingService browse endpoints via marketplaceApi.
 *
 * @module marketplace/MarketplaceBrowse
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  marketplaceAPI,
  type MarketplaceAsset,
  type FeaturedListing,
  type BrowseFilters,
  type AssetCategory,
  type PricingTier,
  type SortOption,
} from './marketplaceApi';

// ============================================================================
// Props
// ============================================================================

export interface MarketplaceBrowseProps {
  /** Called when user clicks an asset card */
  onAssetClick: (assetId: string) => void;
  /** Initial filters to apply */
  initialFilters?: Partial<BrowseFilters>;
  /** Number of items per page */
  pageSize?: number;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: '3d-models', label: '3D Models' },
  { value: 'scripts', label: 'Scripts' },
  { value: 'materials', label: 'Materials' },
  { value: 'sounds', label: 'Sounds' },
  { value: 'templates', label: 'Templates' },
  { value: 'worlds', label: 'Worlds' },
];

const PRICING_TIERS: { value: PricingTier; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'premium', label: 'Premium' },
  { value: 'enterprise', label: 'Enterprise' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-low-high', label: 'Price: Low to High' },
  { value: 'price-high-low', label: 'Price: High to Low' },
  { value: 'top-rated', label: 'Top Rated' },
];

const DEBOUNCE_MS = 300;
const MAX_PRICE = 5000; // $50.00 in cents, slider goes 0-5000

// ============================================================================
// Hooks
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Star rating display */
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  const starSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <svg key={`full-${i}`} className={`${starSize} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {hasHalf && (
        <svg className={`${starSize} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="halfStar">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#D1D5DB" />
            </linearGradient>
          </defs>
          <path fill="url(#halfStar)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <svg key={`empty-${i}`} className={`${starSize} text-gray-300`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/** Featured carousel */
function FeaturedCarousel({
  items,
  onAssetClick,
}: {
  items: FeaturedListing[];
  onAssetClick: (assetId: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (items.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [items.length]);

  if (items.length === 0) return null;

  const current = items[activeIndex];
  if (!current) return null;

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 mb-8">
      <div
        className="flex cursor-pointer p-6 md:p-8 gap-6 items-center min-h-[200px]"
        onClick={() => onAssetClick(current.asset.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onAssetClick(current.asset.id);
          }
        }}
        aria-label={`Featured: ${current.asset.title}`}
      >
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-lg bg-white/10 overflow-hidden">
          {current.asset.thumbnailUrl ? (
            <img
              src={current.asset.thumbnailUrl}
              alt={current.asset.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
              No Preview
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-white">
          <span className="inline-block px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded mb-2">
            FEATURED
          </span>
          <h2 className="text-xl md:text-2xl font-bold mb-1">{current.asset.title}</h2>
          <p className="text-white/80 text-sm mb-2 line-clamp-2">{current.headline}</p>
          <div className="flex items-center gap-4 text-sm text-white/70">
            <span>by {current.asset.creatorName}</span>
            <span className="font-semibold text-white">
              {current.asset.priceCents === 0
                ? 'Free'
                : `$${(current.asset.priceCents / 100).toFixed(2)}`}
            </span>
            <StarRating rating={current.asset.rating} />
          </div>
        </div>
      </div>

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === activeIndex ? 'bg-white' : 'bg-white/40'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(i);
              }}
              aria-label={`Go to featured item ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Asset card - Grid view */
function AssetCardGrid({
  asset,
  onClick,
}: {
  asset: MarketplaceAsset;
  onClick: () => void;
}) {
  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${asset.title} by ${asset.creatorName}, ${
        asset.priceCents === 0 ? 'Free' : `$${(asset.priceCents / 100).toFixed(2)}`
      }`}
    >
      {/* Thumbnail */}
      <div className="relative bg-gray-100 h-44 overflow-hidden">
        {asset.thumbnailUrl ? (
          <img
            src={asset.thumbnailUrl}
            alt={asset.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No Preview
          </div>
        )}
        {asset.featured && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded">
            FEATURED
          </span>
        )}
        {asset.priceCents === 0 && (
          <span className="absolute top-2 right-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded">
            FREE
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate group-hover:text-indigo-600 transition-colors">
          {asset.title}
        </h3>
        <p className="text-xs text-gray-500 mb-2">by {asset.creatorName}</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold text-gray-900">
            {asset.priceCents === 0 ? 'Free' : `$${(asset.priceCents / 100).toFixed(2)}`}
          </span>
          <StarRating rating={asset.rating} />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{asset.downloadCount.toLocaleString()} downloads</span>
          <span className="capitalize">{asset.category.replace('-', ' ')}</span>
        </div>
      </div>
    </div>
  );
}

/** Asset card - List view */
function AssetCardList({
  asset,
  onClick,
}: {
  asset: MarketplaceAsset;
  onClick: () => void;
}) {
  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${asset.title} by ${asset.creatorName}`}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-32 h-28 bg-gray-100 overflow-hidden">
        {asset.thumbnailUrl ? (
          <img
            src={asset.thumbnailUrl}
            alt={asset.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No Preview
          </div>
        )}
        {asset.featured && (
          <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded">
            FEATURED
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 flex items-center">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-indigo-600 transition-colors">
            {asset.title}
          </h3>
          <p className="text-xs text-gray-500">by {asset.creatorName}</p>
          <div className="flex items-center gap-3 mt-1">
            <StarRating rating={asset.rating} />
            <span className="text-xs text-gray-400">
              {asset.downloadCount.toLocaleString()} downloads
            </span>
          </div>
        </div>
        <div className="text-right pl-4">
          <span className="text-lg font-bold text-gray-900">
            {asset.priceCents === 0 ? 'Free' : `$${(asset.priceCents / 100).toFixed(2)}`}
          </span>
          <div className="text-xs text-gray-400 capitalize mt-0.5">
            {asset.category.replace('-', ' ')}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Pagination */
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = useMemo(() => {
    const result: (number | 'ellipsis')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) result.push(i);
    } else {
      result.push(1);
      if (currentPage > 3) result.push('ellipsis');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) result.push(i);

      if (currentPage < totalPages - 2) result.push('ellipsis');
      result.push(totalPages);
    }

    return result;
  }, [currentPage, totalPages]);

  return (
    <nav className="flex items-center justify-center gap-1 mt-8" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-2 text-sm rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        Previous
      </button>

      {pages.map((page, i) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="px-2 py-2 text-gray-400 text-sm">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-2 text-sm rounded-md font-medium transition-colors ${
              page === currentPage
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-current={page === currentPage ? 'page' : undefined}
            aria-label={`Page ${page}`}
          >
            {page}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-2 text-sm rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MarketplaceBrowse({
  onAssetClick,
  initialFilters = {},
  pageSize = 24,
}: MarketplaceBrowseProps) {
  // ---- State ----
  const [assets, setAssets] = useState<MarketplaceAsset[]>([]);
  const [featured, setFeatured] = useState<FeaturedListing[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [searchInput, setSearchInput] = useState(initialFilters.search || '');
  const debouncedSearch = useDebounce(searchInput, DEBOUNCE_MS);
  const [category, setCategory] = useState<AssetCategory | ''>(initialFilters.category || '');
  const [pricingTier, setPricingTier] = useState<PricingTier | ''>(initialFilters.pricingTier || '');
  const [priceRange, setPriceRange] = useState<[number, number]>([
    initialFilters.minPrice ?? 0,
    initialFilters.maxPrice ?? MAX_PRICE,
  ]);
  const [minRating, setMinRating] = useState<number>(initialFilters.minRating ?? 0);
  const [sort, setSort] = useState<SortOption>(initialFilters.sort || 'popular');
  const [page, setPage] = useState(initialFilters.page ?? 1);

  // Sidebar open on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- Data Fetching ----
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filters: BrowseFilters = {
      search: debouncedSearch || undefined,
      category: category || undefined,
      pricingTier: pricingTier || undefined,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < MAX_PRICE ? priceRange[1] : undefined,
      minRating: minRating > 0 ? minRating : undefined,
      sort,
      page,
      limit: pageSize,
    };

    const { data, error: apiError } = await marketplaceAPI.browse(filters);

    if (apiError) {
      setError(apiError.message);
      setLoading(false);
      return;
    }

    if (data) {
      setAssets(data.assets);
      setTotalAssets(data.total);
      setTotalPages(data.totalPages);
      if (data.featured.length > 0 && page === 1) {
        setFeatured(data.featured);
      }
    }

    setLoading(false);
  }, [debouncedSearch, category, pricingTier, priceRange, minRating, sort, page, pageSize]);

  // Fetch featured separately on mount
  useEffect(() => {
    marketplaceAPI.getFeatured(6).then(({ data }) => {
      if (data) setFeatured(data);
    });
  }, []);

  // Fetch assets when filters change
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, pricingTier, priceRange, minRating, sort]);

  // ---- Handlers ----
  const clearFilters = useCallback(() => {
    setSearchInput('');
    setCategory('');
    setPricingTier('');
    setPriceRange([0, MAX_PRICE]);
    setMinRating(0);
    setSort('popular');
    setPage(1);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      !!debouncedSearch ||
      !!category ||
      !!pricingTier ||
      priceRange[0] > 0 ||
      priceRange[1] < MAX_PRICE ||
      minRating > 0
    );
  }, [debouncedSearch, category, pricingTier, priceRange, minRating]);

  // ---- Render ----
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-gray-600 mt-1">
            Discover assets, scripts, materials, and more for your worlds
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Featured Carousel */}
        {page === 1 && featured.length > 0 && (
          <FeaturedCarousel items={featured} onAssetClick={onAssetClick} />
        )}

        <div className="flex gap-6">
          {/* ============================================================ */}
          {/* FILTER SIDEBAR                                                */}
          {/* ============================================================ */}
          <aside
            className={`
              ${sidebarOpen ? 'fixed inset-0 z-40 bg-black/30 lg:relative lg:inset-auto lg:bg-transparent' : ''}
              lg:block
            `}
          >
            {/* Mobile overlay close */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />
            )}

            <div
              className={`
                ${sidebarOpen ? 'fixed left-0 top-0 bottom-0 z-50 w-72' : 'hidden lg:block w-64'}
                bg-white rounded-lg shadow-md p-5 flex-shrink-0 overflow-y-auto max-h-[calc(100vh-200px)]
              `}
              role="complementary"
              aria-label="Filters"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Filters</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Clear all
                  </button>
                )}
                {/* Mobile close */}
                <button
                  className="lg:hidden text-gray-400 hover:text-gray-600"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close filters"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Category dropdown */}
              <div className="mb-5">
                <label htmlFor="category-filter" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Category
                </label>
                <select
                  id="category-filter"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AssetCategory | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price range slider */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Price Range
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-600">
                    ${(priceRange[0] / 100).toFixed(0)}
                  </span>
                  <span className="text-gray-400">-</span>
                  <span className="text-sm text-gray-600">
                    {priceRange[1] >= MAX_PRICE ? '$50+' : `$${(priceRange[1] / 100).toFixed(0)}`}
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    type="range"
                    min={0}
                    max={MAX_PRICE}
                    step={100}
                    value={priceRange[0]}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPriceRange([Math.min(val, priceRange[1]), priceRange[1]]);
                    }}
                    className="w-full accent-indigo-600"
                    aria-label="Minimum price"
                  />
                  <input
                    type="range"
                    min={0}
                    max={MAX_PRICE}
                    step={100}
                    value={priceRange[1]}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPriceRange([priceRange[0], Math.max(val, priceRange[0])]);
                    }}
                    className="w-full accent-indigo-600"
                    aria-label="Maximum price"
                  />
                </div>
              </div>

              {/* Rating filter */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Minimum Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setMinRating(minRating === star ? 0 : star)}
                      className={`p-1.5 rounded transition-colors ${
                        star <= minRating
                          ? 'text-yellow-400'
                          : 'text-gray-300 hover:text-yellow-300'
                      }`}
                      aria-label={`${star} star${star > 1 ? 's' : ''} and up`}
                      aria-pressed={star <= minRating}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                  {minRating > 0 && (
                    <span className="text-xs text-gray-500 self-center ml-1">& up</span>
                  )}
                </div>
              </div>

              {/* Pricing tier pills */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Pricing Tier
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRICING_TIERS.map((tier) => (
                    <button
                      key={tier.value}
                      onClick={() =>
                        setPricingTier(pricingTier === tier.value ? '' : tier.value)
                      }
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        pricingTier === tier.value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                      }`}
                      aria-pressed={pricingTier === tier.value}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* ============================================================ */}
          {/* MAIN CONTENT                                                  */}
          {/* ============================================================ */}
          <div className="flex-1 min-w-0">
            {/* Toolbar: search, sort, view toggle */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {/* Mobile filter toggle */}
              <button
                className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open filters"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                )}
              </button>

              {/* Search */}
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  aria-label="Search marketplace"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                aria-label="Sort by"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* View toggle */}
              <div className="flex border border-gray-300 rounded-md overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 ${
                    viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zM9 2.5A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zM1 10.5A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zM9 10.5A1.5 1.5 0 0110.5 9h3a1.5 1.5 0 011.5 1.5v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 019 13.5v-3z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 ${
                    viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M2.5 12a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {loading
                  ? 'Loading...'
                  : `${totalAssets.toLocaleString()} asset${totalAssets !== 1 ? 's' : ''} found`}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium lg:hidden"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Error state */}
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">
                {error}
                <button
                  onClick={fetchAssets}
                  className="ml-2 font-medium underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                    : 'space-y-4'
                }
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`bg-white rounded-lg shadow-md animate-pulse ${
                      viewMode === 'grid' ? 'h-72' : 'h-28 flex'
                    }`}
                  >
                    <div
                      className={`bg-gray-200 ${
                        viewMode === 'grid' ? 'h-44 rounded-t-lg' : 'w-32 h-28 rounded-l-lg'
                      }`}
                    />
                    <div className="p-4 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Asset grid / list */}
            {!loading && assets.length > 0 && (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                    : 'space-y-4'
                }
              >
                {assets.map((asset) =>
                  viewMode === 'grid' ? (
                    <AssetCardGrid
                      key={asset.id}
                      asset={asset}
                      onClick={() => onAssetClick(asset.id)}
                    />
                  ) : (
                    <AssetCardList
                      key={asset.id}
                      asset={asset}
                      onClick={() => onAssetClick(asset.id)}
                    />
                  ),
                )}
              </div>
            )}

            {/* Empty state */}
            {!loading && assets.length === 0 && !error && (
              <div className="text-center py-16">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">No assets found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Try adjusting your filters or search terms
                </p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketplaceBrowse;
