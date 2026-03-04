'use client';

/**
 * DiscoveryPage Component
 *
 * Main discovery/explore page for the HoloLand platform with:
 *   - Hero banner rotating featured collections (curated by editors)
 *   - Feed tabs matching backend feed types (Trending, Popular, New, Rising, For You)
 *   - World card grid with engagement metrics (player count, rating, remix count)
 *   - Category sidebar with 25 subcategories from CurationService taxonomy
 *   - "Staff Picks" editorial section with curator notes
 *   - Infinite scroll with skeleton loading
 *
 * Wires to SceneRankingService feeds and CurationService collections/taxonomy
 * via discoveryApi.
 *
 * @module discovery/DiscoveryPage
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  discoveryAPI,
  type FeedType,
  type RankedWorld,
  type CollectionInfo,
  type CategoryTree,
  type CategoryNode,
} from './discoveryApi';

// ============================================================================
// Props
// ============================================================================

export interface DiscoveryPageProps {
  /** Called when user clicks a world card */
  onWorldClick: (worldId: string) => void;
  /** Called when user clicks a collection */
  onCollectionClick: (collectionId: string) => void;
  /** Called when user clicks a creator name */
  onCreatorClick: (creatorId: string) => void;
  /** Called when user searches */
  onSearch: (query: string) => void;
  /** Number of items per page for infinite scroll */
  pageSize?: number;
}

// ============================================================================
// Constants
// ============================================================================

const FEED_TABS: { type: FeedType; label: string; icon: string }[] = [
  { type: 'trending', label: 'Trending', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { type: 'hot', label: 'Popular', icon: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z' },
  { type: 'new', label: 'New', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
  { type: 'rising', label: 'Rising', icon: 'M5 10l7-7m0 0l7 7m-7-7v18' },
  { type: 'for_you', label: 'For You', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
];

const HERO_ROTATION_MS = 6000;
const DEBOUNCE_MS = 300;

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

function useInfiniteScroll(callback: () => void, hasMore: boolean): React.RefObject<HTMLDivElement | null> {
  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          callback();
        }
      },
      { threshold: 0.1 }
    );

    const el = observerRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [callback, hasMore]);

  return observerRef;
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Star rating display */
function StarRating({ rating, count, size = 'sm' }: { rating: number; count?: number; size?: 'sm' | 'md' }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25;
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`${sizeClass} ${
            i < fullStars
              ? 'text-yellow-400'
              : i === fullStars && hasHalf
              ? 'text-yellow-400'
              : 'text-gray-600'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {count !== undefined && count > 0 && (
        <span className="text-xs text-gray-500 ml-1">({count})</span>
      )}
    </div>
  );
}

/** Player count badge */
function PlayerCountBadge({ count }: { count: number }) {
  const isActive = count > 0;
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-500'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
      {count > 0 ? `${count} playing` : 'Empty'}
    </div>
  );
}

/** Category tag pill */
function CategoryTag({ category }: { category: string }) {
  const colors: Record<string, string> = {
    games: 'bg-purple-500/20 text-purple-300',
    art: 'bg-pink-500/20 text-pink-300',
    education: 'bg-blue-500/20 text-blue-300',
    social: 'bg-yellow-500/20 text-yellow-300',
    enterprise: 'bg-cyan-500/20 text-cyan-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[category] ?? 'bg-gray-700 text-gray-300'}`}>
      {category}
    </span>
  );
}

/** Format large numbers with K/M suffixes */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** Format relative time */
function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/** Hero banner featuring a collection */
function HeroBanner({
  collections,
  activeIndex,
  onDotClick,
  onCollectionClick,
}: {
  collections: CollectionInfo[];
  activeIndex: number;
  onDotClick: (i: number) => void;
  onCollectionClick: (id: string) => void;
}) {
  if (collections.length === 0) return null;

  return (
    <section className="relative px-4 md:px-8 pt-6 pb-4">
      <div className="max-w-7xl mx-auto">
        <div className="relative">
          {collections.map((collection, idx) => (
            <div
              key={collection.id}
              className={`relative transition-all duration-500 ${
                idx === activeIndex
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-95 absolute inset-0 pointer-events-none'
              }`}
            >
              <div
                className="relative h-72 md:h-80 rounded-2xl overflow-hidden cursor-pointer group"
                onClick={() => onCollectionClick(collection.id)}
              >
                {/* Background */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{
                    backgroundImage: collection.coverImageUrl
                      ? `url(${collection.coverImageUrl})`
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-300 text-xs font-medium rounded capitalize">
                      {collection.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {collection.worldCount} world{collection.worldCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {collection.name}
                  </h2>
                  <p className="text-gray-300 text-sm md:text-base line-clamp-2 max-w-2xl">
                    {collection.description}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Carousel dots */}
          {collections.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {collections.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => onDotClick(idx)}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === activeIndex
                      ? 'bg-indigo-500 w-6'
                      : 'bg-gray-600 hover:bg-gray-500 w-2.5'
                  }`}
                  aria-label={`Go to collection ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Search bar */
function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (query: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative w-full max-w-xl">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder="Search worlds, creators, tags..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) {
            onSubmit(value.trim());
          }
        }}
        className="w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        aria-label="Search worlds"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          aria-label="Clear search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

/** Feed tab button */
function FeedTab({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
        isActive
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
      aria-pressed={isActive}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
      </svg>
      {label}
    </button>
  );
}

/** Category sidebar */
function CategorySidebar({
  categoryTree,
  selectedCategory,
  onCategorySelect,
  onReset,
}: {
  categoryTree: CategoryTree[];
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string) => void;
  onReset: () => void;
}) {
  return (
    <aside className="w-full lg:w-64 flex-shrink-0 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Categories</h3>
        {selectedCategory && (
          <button
            onClick={onReset}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-1">
        <button
          onClick={onReset}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            !selectedCategory
              ? 'bg-indigo-600/20 text-indigo-300 font-medium'
              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
          }`}
        >
          All Categories
        </button>

        {categoryTree.map((tree) => (
          <div key={tree.category.id}>
            {/* Parent category */}
            <button
              onClick={() => onCategorySelect(tree.category.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === tree.category.id
                  ? 'bg-indigo-600/20 text-indigo-300'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{tree.category.name}</span>
                {tree.category.worldCount > 0 && (
                  <span className="text-xs text-gray-600">{tree.category.worldCount}</span>
                )}
              </div>
            </button>

            {/* Subcategories */}
            {tree.children.length > 0 && (
              <div className="ml-3 mt-0.5 space-y-0.5">
                {tree.children.map((child) => (
                  <button
                    key={child.category.id}
                    onClick={() => onCategorySelect(child.category.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      selectedCategory === child.category.id
                        ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                        : 'text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{child.category.name}</span>
                      {child.category.worldCount > 0 && (
                        <span className="text-xs text-gray-700">{child.category.worldCount}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

/** World card for the discovery grid */
function WorldCard({
  world,
  onClick,
  onCreatorClick,
}: {
  world: RankedWorld;
  onClick: () => void;
  onCreatorClick?: (creatorId: string) => void;
}) {
  return (
    <div
      className="group bg-gray-800 rounded-xl overflow-hidden border border-gray-700/50 hover:border-indigo-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        {world.thumbnailUrl ? (
          <img
            src={world.thumbnailUrl}
            alt={world.title ?? 'World'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
            <svg className="w-12 h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          {world.category && <CategoryTag category={world.category} />}
        </div>
        <div className="absolute top-2 right-2">
          <PlayerCountBadge count={world.livePlayerCount ?? 0} />
        </div>

        {/* Rank badge */}
        {world.rank <= 10 && (
          <div className="absolute bottom-2 left-2 w-7 h-7 rounded-full bg-yellow-500/90 flex items-center justify-center text-xs font-bold text-black">
            #{world.rank}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm line-clamp-1 mb-1 group-hover:text-indigo-300 transition-colors">
          {world.title ?? world.worldId}
        </h3>

        {/* Creator row */}
        {world.creatorName && (
          <div className="flex items-center gap-2 mb-2">
            {world.creatorAvatarUrl ? (
              <img
                src={world.creatorAvatarUrl}
                alt={world.creatorName}
                className="w-4 h-4 rounded-full"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-indigo-500/50 flex items-center justify-center text-[10px] text-white font-bold">
                {world.creatorName.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (world.creatorId && onCreatorClick) {
                  onCreatorClick(world.creatorId);
                }
              }}
              className="text-xs text-gray-400 truncate hover:text-indigo-300 transition-colors"
            >
              {world.creatorName}
            </button>
          </div>
        )}

        {/* Metrics row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <StarRating rating={world.avgRating} count={world.ratingCount} />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span title="Total visits">{formatCount(world.totalVisits)} visits</span>
            {world.totalRemixes > 0 && (
              <span title="Remixes" className="flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {formatCount(world.totalRemixes)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton card for loading states */
function SkeletonCard() {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700/50 animate-pulse">
      <div className="aspect-video bg-gray-700" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-700 rounded w-1/2" />
        <div className="h-3 bg-gray-700 rounded w-2/3" />
      </div>
    </div>
  );
}

/** Staff picks editorial section */
function StaffPicksSection({
  collections,
  onCollectionClick,
}: {
  collections: CollectionInfo[];
  onCollectionClick: (id: string) => void;
}) {
  if (collections.length === 0) return null;

  return (
    <section className="px-4 md:px-8 py-8 border-t border-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Staff Picks</h2>
            <p className="text-sm text-gray-400 mt-1">Curated by our editorial team</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <div
              key={collection.id}
              className="group bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50 hover:border-indigo-500/30 transition-all cursor-pointer"
              onClick={() => onCollectionClick(collection.id)}
            >
              <div className="relative h-40 overflow-hidden">
                {collection.coverImageUrl ? (
                  <img
                    src={collection.coverImageUrl}
                    alt={collection.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-600/50 to-purple-700/50 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs font-medium rounded">
                    Staff Pick
                  </span>
                  <span className="text-xs text-gray-500">
                    {collection.worldCount} world{collection.worldCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <h3 className="text-white font-semibold text-sm mb-1 group-hover:text-indigo-300 transition-colors">
                  {collection.name}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2">{collection.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DiscoveryPage({
  onWorldClick,
  onCollectionClick,
  onCreatorClick,
  onSearch,
  pageSize = 24,
}: DiscoveryPageProps) {
  // -- State --
  const [worlds, setWorlds] = useState<RankedWorld[]>([]);
  const [featuredCollections, setFeaturedCollections] = useState<CollectionInfo[]>([]);
  const [staffPicks, setStaffPicks] = useState<CollectionInfo[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTree[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);

  const [activeFeed, setActiveFeed] = useState<FeedType>('trending');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // -- Hero banner auto-rotation --
  useEffect(() => {
    if (featuredCollections.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % featuredCollections.length);
    }, HERO_ROTATION_MS);
    return () => clearInterval(timer);
  }, [featuredCollections.length]);

  // -- Fetch initial data (featured collections, staff picks, categories) --
  useEffect(() => {
    Promise.all([
      discoveryAPI.getFeaturedCollections(5).catch(() => []),
      discoveryAPI.getStaffPicks(6).catch(() => []),
      discoveryAPI.getCategoryTree().catch(() => []),
    ]).then(([featured, picks, tree]) => {
      setFeaturedCollections(featured);
      setStaffPicks(picks);
      setCategoryTree(tree);
    });
  }, []);

  // -- Fetch feed on tab/category change --
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setOffset(0);

    const fetchFeed = async () => {
      try {
        const result = await discoveryAPI.getFeed(activeFeed, pageSize, 0);
        if (!cancelled) {
          // If a category filter is selected, filter client-side
          // In production the backend would handle this
          let filteredScenes = result.scenes;
          if (selectedCategory) {
            filteredScenes = result.scenes.filter(
              (w) => w.category === selectedCategory || w.tags?.includes(selectedCategory),
            );
          }
          setWorlds(filteredScenes);
          setTotal(selectedCategory ? filteredScenes.length : result.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load feed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFeed();
    return () => { cancelled = true; };
  }, [activeFeed, selectedCategory, pageSize]);

  // -- Infinite scroll: load more --
  const loadMore = useCallback(async () => {
    if (loadingMore || offset + pageSize >= total) return;
    setLoadingMore(true);

    try {
      const nextOffset = offset + pageSize;
      const result = await discoveryAPI.getFeed(activeFeed, pageSize, nextOffset);

      let filteredScenes = result.scenes;
      if (selectedCategory) {
        filteredScenes = result.scenes.filter(
          (w) => w.category === selectedCategory || w.tags?.includes(selectedCategory),
        );
      }

      setWorlds((prev) => [...prev, ...filteredScenes]);
      setOffset(nextOffset);
    } catch {
      // Silently fail on infinite scroll
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, offset, total, activeFeed, selectedCategory, pageSize]);

  const hasMore = offset + pageSize < total;
  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !loading);

  // -- Handlers --
  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  const handleCategoryReset = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  const handleSearchSubmit = useCallback((query: string) => {
    onSearch(query);
  }, [onSearch]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-900">
      {/* ================================================================== */}
      {/* Hero Banner -- Rotating Featured Collections */}
      {/* ================================================================== */}
      <HeroBanner
        collections={featuredCollections}
        activeIndex={heroIndex}
        onDotClick={setHeroIndex}
        onCollectionClick={onCollectionClick}
      />

      {/* ================================================================== */}
      {/* Search Bar */}
      {/* ================================================================== */}
      <section className="px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSearchSubmit}
            onClear={() => setSearchQuery('')}
          />

          {/* Mobile filter toggle */}
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="lg:hidden px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm hover:bg-gray-700 transition-colors flex items-center gap-2"
            aria-label="Toggle category filters"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Categories
            {selectedCategory && (
              <span className="w-5 h-5 bg-indigo-500 rounded-full text-xs flex items-center justify-center font-bold">
                1
              </span>
            )}
          </button>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Feed Tabs */}
      {/* ================================================================== */}
      <section className="px-4 md:px-8 pb-4 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {FEED_TABS.map((tab) => (
              <FeedTab
                key={tab.type}
                label={tab.label}
                icon={tab.icon}
                isActive={activeFeed === tab.type}
                onClick={() => setActiveFeed(tab.type)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Main Content: Category Sidebar + World Grid */}
      {/* ================================================================== */}
      <section className="px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto flex gap-8">
          {/* Desktop category sidebar */}
          <div className="hidden lg:block">
            <CategorySidebar
              categoryTree={categoryTree}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
              onReset={handleCategoryReset}
            />
          </div>

          {/* Mobile category overlay */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setMobileFiltersOpen(false)}
              />
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-semibold text-lg">Categories</h3>
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="text-gray-400 hover:text-white"
                    aria-label="Close categories"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <CategorySidebar
                  categoryTree={categoryTree}
                  selectedCategory={selectedCategory}
                  onCategorySelect={(id) => {
                    handleCategorySelect(id);
                    setMobileFiltersOpen(false);
                  }}
                  onReset={() => {
                    handleCategoryReset();
                    setMobileFiltersOpen(false);
                  }}
                />
              </div>
            </div>
          )}

          {/* World grid */}
          <div className="flex-1">
            {/* Result info */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {loading
                  ? 'Loading...'
                  : `${total.toLocaleString()} world${total !== 1 ? 's' : ''}`}
              </p>
              {selectedCategory && (
                <button
                  onClick={handleCategoryReset}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear filter
                </button>
              )}
            </div>

            {error ? (
              <div className="text-center py-20">
                <div className="text-red-400 mb-2">Failed to load worlds</div>
                <p className="text-gray-500 text-sm">{error}</p>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }, (_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : worlds.length === 0 ? (
              <div className="text-center py-20">
                <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-white font-semibold mb-1">No worlds found</h3>
                <p className="text-gray-500 text-sm">Try a different feed or category.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {worlds.map((world) => (
                    <WorldCard
                      key={world.worldId}
                      world={world}
                      onClick={() => onWorldClick(world.worldId)}
                      onCreatorClick={onCreatorClick}
                    />
                  ))}
                </div>

                {/* Infinite scroll sentinel */}
                {hasMore && (
                  <div ref={sentinelRef} className="flex items-center justify-center py-8">
                    {loadingMore && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-sm">Loading more worlds...</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Staff Picks Section */}
      {/* ================================================================== */}
      <StaffPicksSection
        collections={staffPicks}
        onCollectionClick={onCollectionClick}
      />
    </div>
  );
}

export default DiscoveryPage;
