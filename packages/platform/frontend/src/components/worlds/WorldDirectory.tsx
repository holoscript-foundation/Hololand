'use client';

/**
 * WorldDirectory Component
 *
 * Public-facing world browser for HoloLand with:
 *   - Hero section with 3 featured worlds carousel
 *   - Responsive card grid (thumbnail, title, creator, player count, rating, category)
 *   - Filter sidebar (category, player count range, rating, age rating)
 *   - Search bar with autocomplete suggestions
 *   - Sort options (Popular/Trending/Newest/Top Rated/Most Players)
 *   - Infinite scroll pagination
 *
 * Wires to WorldPublishingService via worldsApi.
 *
 * @module worlds/WorldDirectory
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  worldsAPI,
  type WorldSummary,
  type WorldFilters,
  type WorldSortOption,
  type TopCategory,
  type AgeRating,
} from './worldsApi';

// ============================================================================
// Props
// ============================================================================

export interface WorldDirectoryProps {
  /** Called when user clicks a world card */
  onWorldClick: (worldId: string) => void;
  /** Called when user clicks "Join" on a world */
  onJoinWorld?: (worldId: string) => void;
  /** Initial filters to apply */
  initialFilters?: Partial<WorldFilters>;
  /** Number of items per page for infinite scroll */
  pageSize?: number;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES: { value: TopCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'games', label: 'Games' },
  { value: 'art', label: 'Art' },
  { value: 'education', label: 'Education' },
  { value: 'social', label: 'Social' },
  { value: 'enterprise', label: 'Enterprise' },
];

const AGE_RATINGS: { value: AgeRating | ''; label: string }[] = [
  { value: '', label: 'All Ages' },
  { value: 'everyone', label: 'Everyone' },
  { value: 'teen', label: 'Teen' },
  { value: 'mature', label: 'Mature' },
];

const SORT_OPTIONS: { value: WorldSortOption; label: string }[] = [
  { value: 'popular', label: 'Popular' },
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'top_rated', label: 'Top Rated' },
  { value: 'most_players', label: 'Most Players' },
];

const RATING_OPTIONS = [
  { value: 0, label: 'Any Rating' },
  { value: 3, label: '3+ Stars' },
  { value: 4, label: '4+ Stars' },
  { value: 4.5, label: '4.5+ Stars' },
];

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
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
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
          {i === fullStars && hasHalf ? (
            <defs>
              <linearGradient id={`half-${i}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#4B5563" />
              </linearGradient>
            </defs>
          ) : null}
          <path
            fill={i === fullStars && hasHalf ? `url(#half-${i})` : 'currentColor'}
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      ))}
    </div>
  );
}

/** Live player count badge */
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

/** Featured world carousel hero card */
function FeaturedCard({
  world,
  isActive,
  onClick,
  onJoin,
}: {
  world: WorldSummary;
  isActive: boolean;
  onClick: () => void;
  onJoin?: () => void;
}) {
  return (
    <div
      className={`relative flex-shrink-0 w-full transition-all duration-500 ${
        isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute inset-0 pointer-events-none'
      }`}
    >
      <div
        className="relative h-80 md:h-96 rounded-2xl overflow-hidden cursor-pointer group"
        onClick={onClick}
      >
        {/* Background */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{
            backgroundImage: world.thumbnailUrl
              ? `url(${world.thumbnailUrl})`
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-2">
            <CategoryTag category={world.category} />
            <PlayerCountBadge count={world.livePlayerCount} />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{world.title}</h2>
          <p className="text-gray-300 text-sm md:text-base line-clamp-2 mb-4 max-w-2xl">
            {world.description}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {world.creatorAvatarUrl ? (
                <img
                  src={world.creatorAvatarUrl}
                  alt={world.creatorName}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs text-white font-bold">
                  {world.creatorName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-gray-300">{world.creatorName}</span>
            </div>
            <div className="flex items-center gap-1">
              <StarRating rating={world.avgRating} />
              <span className="text-xs text-gray-400 ml-1">({world.ratingCount})</span>
            </div>
            {onJoin && (
              <button
                onClick={(e) => { e.stopPropagation(); onJoin(); }}
                className="ml-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
              >
                Join World
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** World card in the grid */
function WorldCard({
  world,
  onClick,
}: {
  world: WorldSummary;
  onClick: () => void;
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
            alt={world.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
            <svg className="w-12 h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </div>
        )}

        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <CategoryTag category={world.category} />
        </div>
        <div className="absolute top-2 right-2">
          <PlayerCountBadge count={world.livePlayerCount} />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm line-clamp-1 mb-1 group-hover:text-indigo-300 transition-colors">
          {world.title}
        </h3>

        {/* Creator row */}
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
          <span className="text-xs text-gray-400 truncate">{world.creatorName}</span>
        </div>

        {/* Rating + visits row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <StarRating rating={world.avgRating} />
            {world.ratingCount > 0 && (
              <span className="text-xs text-gray-500">({world.ratingCount})</span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {world.totalVisits >= 1000
              ? `${(world.totalVisits / 1000).toFixed(1)}k`
              : world.totalVisits}{' '}
            visits
          </span>
        </div>
      </div>
    </div>
  );
}

/** Search bar with autocomplete */
function SearchBar({
  value,
  onChange,
  suggestions,
  onSuggestionClick,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  onSuggestionClick: (s: string) => void;
  onClear: () => void;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
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
          placeholder="Search worlds..."
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
        {value && (
          <button
            onClick={() => { onClear(); setShowSuggestions(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                onSuggestionClick(s);
                setShowSuggestions(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="truncate">{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Filter sidebar */
function FilterSidebar({
  filters,
  onFilterChange,
  onReset,
}: {
  filters: WorldFilters;
  onFilterChange: (f: Partial<WorldFilters>) => void;
  onReset: () => void;
}) {
  const hasActiveFilters = !!(
    filters.category ||
    filters.ageRating ||
    filters.minRating ||
    filters.minPlayers !== undefined
  );

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Reset all
          </button>
        )}
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
        <div className="space-y-1">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFilterChange({ category: (value || undefined) as TopCategory | undefined })}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                (filters.category ?? '') === value
                  ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Player Count Range */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Min Players Online</label>
        <input
          type="range"
          min="0"
          max="50"
          step="1"
          value={filters.minPlayers ?? 0}
          onChange={(e) => onFilterChange({
            minPlayers: Number(e.target.value) > 0 ? Number(e.target.value) : undefined,
          })}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Any</span>
          <span>{filters.minPlayers ?? 0}+ players</span>
        </div>
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Minimum Rating</label>
        <div className="space-y-1">
          {RATING_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFilterChange({ minRating: value > 0 ? value : undefined })}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                (filters.minRating ?? 0) === value
                  ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Age Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Age Rating</label>
        <div className="space-y-1">
          {AGE_RATINGS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFilterChange({ ageRating: (value || undefined) as AgeRating | undefined })}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                (filters.ageRating ?? '') === value
                  ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WorldDirectory({
  onWorldClick,
  onJoinWorld,
  initialFilters = {},
  pageSize = 24,
}: WorldDirectoryProps) {
  // -- State --
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [featuredWorlds, setFeaturedWorlds] = useState<WorldSummary[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filters, setFilters] = useState<WorldFilters>(initialFilters);
  const [sort, setSort] = useState<WorldSortOption>('popular');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, DEBOUNCE_MS);

  // -- Featured carousel auto-rotation --
  useEffect(() => {
    if (featuredWorlds.length <= 1) return;
    const timer = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredWorlds.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [featuredWorlds.length]);

  // -- Fetch featured worlds --
  useEffect(() => {
    worldsAPI.getFeaturedWorlds(3)
      .then(setFeaturedWorlds)
      .catch(() => setFeaturedWorlds([]));
  }, []);

  // -- Fetch worlds on filter/sort/search change --
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPage(1);

    const fetchWorlds = async () => {
      try {
        if (debouncedSearch) {
          const searchRes = await worldsAPI.searchWorlds(debouncedSearch, filters, pageSize, 0);
          if (!cancelled) {
            // Map search results to world summaries by fetching each
            // In production, the backend would return WorldSummary directly
            const summaries: WorldSummary[] = searchRes.results.map(r => ({
              id: r.worldId,
              title: r.title,
              description: r.description,
              creatorId: r.creatorId,
              creatorName: r.creatorName,
              category: r.categoryId as TopCategory,
              tags: r.tags,
              status: 'published' as const,
              visibility: 'public' as const,
              ageRating: 'everyone' as const,
              maxCapacity: 100,
              avgRating: 0,
              ratingCount: 0,
              livePlayerCount: 0,
              totalVisits: 0,
              publishedAt: r.publishedAt,
              currentVersion: 1,
            }));
            setWorlds(summaries);
            setTotalResults(searchRes.total);
            setTotalPages(Math.ceil(searchRes.total / pageSize));
          }
        } else {
          const result = await worldsAPI.listPublishedWorlds(filters, sort, 1, pageSize);
          if (!cancelled) {
            setWorlds(result.items);
            setTotalResults(result.total);
            setTotalPages(result.totalPages);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load worlds');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWorlds();
    return () => { cancelled = true; };
  }, [debouncedSearch, filters, sort, pageSize]);

  // -- Fetch search suggestions --
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    worldsAPI.getSearchSuggestions(searchQuery, 8)
      .then(s => { if (!cancelled) setSuggestions(s); })
      .catch(() => { if (!cancelled) setSuggestions([]); });
    return () => { cancelled = true; };
  }, [searchQuery]);

  // -- Infinite scroll: load more --
  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);

    try {
      const nextPage = page + 1;
      if (debouncedSearch) {
        const searchRes = await worldsAPI.searchWorlds(
          debouncedSearch, filters, pageSize, (nextPage - 1) * pageSize
        );
        const summaries: WorldSummary[] = searchRes.results.map(r => ({
          id: r.worldId,
          title: r.title,
          description: r.description,
          creatorId: r.creatorId,
          creatorName: r.creatorName,
          category: r.categoryId as TopCategory,
          tags: r.tags,
          status: 'published' as const,
          visibility: 'public' as const,
          ageRating: 'everyone' as const,
          maxCapacity: 100,
          avgRating: 0,
          ratingCount: 0,
          livePlayerCount: 0,
          totalVisits: 0,
          publishedAt: r.publishedAt,
          currentVersion: 1,
        }));
        setWorlds(prev => [...prev, ...summaries]);
      } else {
        const result = await worldsAPI.listPublishedWorlds(filters, sort, nextPage, pageSize);
        setWorlds(prev => [...prev, ...result.items]);
      }
      setPage(nextPage);
    } catch {
      // Silently fail on infinite scroll
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, page, totalPages, debouncedSearch, filters, sort, pageSize]);

  const sentinelRef = useInfiniteScroll(loadMore, page < totalPages && !loading);

  // -- Filter handlers --
  const handleFilterChange = useCallback((updates: Partial<WorldFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
  }, []);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setSearchQuery(suggestion);
  }, []);

  // -- Active filter count for mobile badge --
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category) count++;
    if (filters.ageRating) count++;
    if (filters.minRating) count++;
    if (filters.minPlayers) count++;
    return count;
  }, [filters]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-900">
      {/* ================================================================== */}
      {/* Hero Section -- Featured Worlds Carousel */}
      {/* ================================================================== */}
      {featuredWorlds.length > 0 && (
        <section className="relative px-4 md:px-8 pt-6 pb-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-400 mb-4 uppercase tracking-wider">Featured Worlds</h2>
            <div className="relative">
              {featuredWorlds.map((world, idx) => (
                <FeaturedCard
                  key={world.id}
                  world={world}
                  isActive={idx === featuredIndex}
                  onClick={() => onWorldClick(world.id)}
                  onJoin={onJoinWorld ? () => onJoinWorld(world.id) : undefined}
                />
              ))}

              {/* Carousel dots */}
              {featuredWorlds.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  {featuredWorlds.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setFeaturedIndex(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        idx === featuredIndex
                          ? 'bg-indigo-500 w-6'
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* Search + Sort Bar */}
      {/* ================================================================== */}
      <section className="px-4 md:px-8 py-4 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              suggestions={suggestions}
              onSuggestionClick={handleSuggestionClick}
              onClear={() => setSearchQuery('')}
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Sort dropdown */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as WorldSortOption)}
              className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {SORT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="lg:hidden relative px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full text-xs flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Result count */}
        <div className="max-w-7xl mx-auto mt-2">
          <p className="text-sm text-gray-500">
            {loading ? 'Searching...' : `${totalResults.toLocaleString()} world${totalResults !== 1 ? 's' : ''} found`}
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Main Content: Filter Sidebar + World Grid */}
      {/* ================================================================== */}
      <section className="px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto flex gap-8">
          {/* Desktop filter sidebar */}
          <div className="hidden lg:block">
            <FilterSidebar
              filters={filters}
              onFilterChange={handleFilterChange}
              onReset={handleResetFilters}
            />
          </div>

          {/* Mobile filter overlay */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setMobileFiltersOpen(false)}
              />
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-semibold text-lg">Filters</h3>
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <FilterSidebar
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onReset={handleResetFilters}
                />
              </div>
            </div>
          )}

          {/* World grid */}
          <div className="flex-1">
            {error ? (
              <div className="text-center py-20">
                <div className="text-red-400 mb-2">Failed to load worlds</div>
                <p className="text-gray-500 text-sm">{error}</p>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700/50 animate-pulse">
                    <div className="aspect-video bg-gray-700" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-700 rounded w-1/2" />
                      <div className="h-3 bg-gray-700 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : worlds.length === 0 ? (
              <div className="text-center py-20">
                <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 10h.01M15 10h.01M12 14a2 2 0 01-2-2" />
                </svg>
                <h3 className="text-white font-semibold mb-1">No worlds found</h3>
                <p className="text-gray-500 text-sm">Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {worlds.map((world) => (
                    <WorldCard
                      key={world.id}
                      world={world}
                      onClick={() => onWorldClick(world.id)}
                    />
                  ))}
                </div>

                {/* Infinite scroll sentinel */}
                {page < totalPages && (
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
    </div>
  );
}

export default WorldDirectory;
