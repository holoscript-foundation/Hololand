'use client';

/**
 * SearchResults Component
 *
 * Search results page for the HoloLand discovery system with:
 *   - Search query display with result count
 *   - Filtered results grid (Worlds, Assets, Creators tabs)
 *   - Faceted filtering (category, rating range, player count, date range)
 *   - Sort options (Relevance, Popular, Newest, Rating)
 *   - Autocomplete suggestions from CurationService
 *   - "No results" state with related suggestions
 *
 * Wires to CurationService search/autocomplete via discoveryApi.
 *
 * @module discovery/SearchResults
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  discoveryAPI,
  type SearchQuery,
  type SearchResult,
  type SearchResponse,
  type CreatorProfile,
} from './discoveryApi';

// ============================================================================
// Props
// ============================================================================

export interface SearchResultsProps {
  /** The initial search query */
  initialQuery: string;
  /** Called when user clicks a world card */
  onWorldClick: (worldId: string) => void;
  /** Called when user clicks a creator */
  onCreatorClick: (creatorId: string) => void;
  /** Called when user navigates back */
  onBack: () => void;
  /** Number of items per page */
  pageSize?: number;
}

// ============================================================================
// Types
// ============================================================================

type ResultTab = 'worlds' | 'assets' | 'creators';
type SortOption = 'relevance' | 'popular' | 'newest' | 'rating';

interface SearchFilters {
  category: string;
  minRating: number;
  minPlayerCount: number;
  dateRange: 'any' | 'day' | 'week' | 'month' | 'year';
}

// ============================================================================
// Constants
// ============================================================================

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Rating' },
];

const DATE_RANGE_OPTIONS: { value: SearchFilters['dateRange']; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'day', label: 'Past 24 hours' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
  { value: 'year', label: 'Past year' },
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

// ============================================================================
// Sub-Components
// ============================================================================

/** Star rating display */
function StarRating({ rating, count }: { rating: number; count?: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${
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

/** Format large numbers */
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

/** Search result world card */
function WorldResultCard({
  result,
  onClick,
  onCreatorClick,
}: {
  result: SearchResult;
  onClick: () => void;
  onCreatorClick: (creatorId: string) => void;
}) {
  return (
    <div
      className="group bg-gray-800 rounded-xl overflow-hidden border border-gray-700/50 hover:border-indigo-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-video overflow-hidden">
        {result.thumbnailUrl ? (
          <img
            src={result.thumbnailUrl}
            alt={result.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
            <svg className="w-12 h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 rounded text-xs font-medium capitalize bg-gray-900/70 text-gray-200">
            {result.categoryId}
          </span>
        </div>

        {/* Live players */}
        {(result.livePlayerCount ?? 0) > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {result.livePlayerCount} playing
          </div>
        )}

        {/* Relevance badge */}
        {result.relevanceScore > 0.8 && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-indigo-500/80 text-white text-xs rounded font-medium">
            Top Match
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-white font-semibold text-sm line-clamp-1 mb-1 group-hover:text-indigo-300 transition-colors">
          {result.title}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{result.description}</p>

        {/* Creator */}
        <div className="flex items-center gap-2 mb-2">
          {result.creatorAvatarUrl ? (
            <img src={result.creatorAvatarUrl} alt={result.creatorName} className="w-4 h-4 rounded-full" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-indigo-500/50 flex items-center justify-center text-[10px] text-white font-bold">
              {result.creatorName.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onCreatorClick(result.creatorId); }}
            className="text-xs text-gray-400 truncate hover:text-indigo-300 transition-colors"
          >
            {result.creatorName}
          </button>
        </div>

        {/* Tags */}
        {result.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {result.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-gray-700/50 text-gray-400 text-[10px] rounded">
                {tag}
              </span>
            ))}
            {result.tags.length > 3 && (
              <span className="text-[10px] text-gray-600">+{result.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Metrics */}
        <div className="flex items-center justify-between">
          <StarRating rating={result.avgRating ?? 0} count={result.ratingCount} />
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {(result.totalVisits ?? 0) > 0 && (
              <span>{formatCount(result.totalVisits!)} visits</span>
            )}
            {(result.totalRemixes ?? 0) > 0 && (
              <span>{formatCount(result.totalRemixes!)} remixes</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Creator result card */
function CreatorResultCard({
  creator,
  onClick,
}: {
  creator: CreatorProfile;
  onClick: () => void;
}) {
  return (
    <div
      className="group bg-gray-800 rounded-xl overflow-hidden border border-gray-700/50 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer p-4"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {creator.avatarUrl ? (
          <img src={creator.avatarUrl} alt={creator.displayName} className="w-14 h-14 rounded-full flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-indigo-500/30 flex items-center justify-center text-xl text-white font-bold flex-shrink-0">
            {creator.displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold text-sm truncate group-hover:text-indigo-300 transition-colors">
              {creator.displayName}
            </h3>
            {creator.verified && (
              <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">{creator.bio}</p>

          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{creator.worldIds.length} worlds</span>
            <span>{formatCount(creator.followerCount)} followers</span>
            <span>{formatCount(creator.totalViews)} views</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Faceted filter sidebar */
function FilterSidebar({
  filters,
  facets,
  onFilterChange,
  onReset,
}: {
  filters: SearchFilters;
  facets: SearchResponse['facets'] | null;
  onFilterChange: (updates: Partial<SearchFilters>) => void;
  onReset: () => void;
}) {
  const hasActiveFilters = filters.category || filters.minRating > 0 || filters.minPlayerCount > 0 || filters.dateRange !== 'any';

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Filters</h3>
        {hasActiveFilters && (
          <button onClick={onReset} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Reset all
          </button>
        )}
      </div>

      {/* Category facets */}
      {facets && facets.categories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
          <div className="space-y-1">
            <button
              onClick={() => onFilterChange({ category: '' })}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                !filters.category
                  ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              All Categories
            </button>
            {facets.categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onFilterChange({ category: cat.id })}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                  filters.category === cat.id
                    ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                }`}
              >
                <span className="capitalize">{cat.name}</span>
                <span className="text-xs text-gray-600">{cat.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Minimum Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Minimum Rating</label>
        <div className="space-y-1">
          {RATING_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFilterChange({ minRating: value })}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                filters.minRating === value
                  ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Player Count */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Min Players Online</label>
        <input
          type="range"
          min="0"
          max="50"
          step="1"
          value={filters.minPlayerCount}
          onChange={(e) => onFilterChange({ minPlayerCount: Number(e.target.value) })}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Any</span>
          <span>{filters.minPlayerCount > 0 ? `${filters.minPlayerCount}+ players` : 'Any'}</span>
        </div>
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Published</label>
        <div className="space-y-1">
          {DATE_RANGE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFilterChange({ dateRange: value })}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                filters.dateRange === value
                  ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tag facets */}
      {facets && facets.tags.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Popular Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {facets.tags.slice(0, 12).map(({ tag, count }) => (
              <button
                key={tag}
                className="px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded hover:bg-indigo-600/20 hover:text-indigo-300 transition-colors"
                title={`${count} results`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

/** Skeleton card */
function SkeletonCard() {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700/50 animate-pulse">
      <div className="aspect-video bg-gray-700" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-700 rounded w-1/2" />
        <div className="h-3 bg-gray-700 rounded w-2/3" />
      </div>
    </div>
  );
}

/** No results state */
function NoResults({
  query,
  suggestions,
  onSuggestionClick,
}: {
  query: string;
  suggestions: string[];
  onSuggestionClick: (s: string) => void;
}) {
  return (
    <div className="text-center py-20">
      <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <h3 className="text-white font-semibold text-lg mb-2">
        No results for "{query}"
      </h3>
      <p className="text-gray-500 text-sm mb-6">
        Try different keywords or browse our categories.
      </p>

      {suggestions.length > 0 && (
        <div>
          <p className="text-sm text-gray-400 mb-3">Did you mean:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestionClick(s)}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-indigo-400 hover:bg-indigo-600/20 hover:border-indigo-500/50 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SearchResults({
  initialQuery,
  onWorldClick,
  onCreatorClick,
  onBack,
  pageSize = 20,
}: SearchResultsProps) {
  // -- State --
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<ResultTab>('worlds');
  const [sort, setSort] = useState<SortOption>('relevance');
  const [filters, setFilters] = useState<SearchFilters>({
    category: '',
    minRating: 0,
    minPlayerCount: 0,
    dateRange: 'any',
  });

  const [worldResults, setWorldResults] = useState<SearchResult[]>([]);
  const [creatorResults, setCreatorResults] = useState<CreatorProfile[]>([]);
  const [facets, setFacets] = useState<SearchResponse['facets'] | null>(null);
  const [total, setTotal] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [autocomplete, setAutocomplete] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  // -- Fetch search results --
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setWorldResults([]);
      setCreatorResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setOffset(0);

    const fetchResults = async () => {
      try {
        if (activeTab === 'creators') {
          const creators = await discoveryAPI.searchCreators(debouncedQuery.trim(), pageSize);
          if (!cancelled) {
            setCreatorResults(creators);
            setTotal(creators.length);
          }
        } else {
          const searchQuery: SearchQuery = {
            query: debouncedQuery.trim(),
            category: filters.category || undefined,
            minRating: filters.minRating > 0 ? filters.minRating : undefined,
            sort: sort,
            limit: pageSize,
            offset: 0,
          };

          const response = await discoveryAPI.search(searchQuery);
          if (!cancelled) {
            setWorldResults(response.results);
            setTotal(response.total);
            setFacets(response.facets);
            setSearchTime(response.searchTimeMs);

            // If no results, fetch suggestions
            if (response.total === 0) {
              const sug = await discoveryAPI.autocomplete(debouncedQuery.trim(), 5).catch(() => []);
              setSuggestions(sug);
            } else {
              setSuggestions([]);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Search failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchResults();
    return () => { cancelled = true; };
  }, [debouncedQuery, activeTab, sort, filters, pageSize]);

  // -- Fetch autocomplete --
  useEffect(() => {
    if (!query || query.length < 2) {
      setAutocomplete([]);
      return;
    }
    let cancelled = false;
    discoveryAPI.autocomplete(query, 8)
      .then((results) => { if (!cancelled) setAutocomplete(results); })
      .catch(() => { if (!cancelled) setAutocomplete([]); });
    return () => { cancelled = true; };
  }, [query]);

  // -- Load more --
  const loadMore = useCallback(async () => {
    if (loading || offset + pageSize >= total) return;
    const nextOffset = offset + pageSize;

    try {
      const searchQuery: SearchQuery = {
        query: debouncedQuery.trim(),
        category: filters.category || undefined,
        minRating: filters.minRating > 0 ? filters.minRating : undefined,
        sort: sort,
        limit: pageSize,
        offset: nextOffset,
      };

      const response = await discoveryAPI.search(searchQuery);
      setWorldResults((prev) => [...prev, ...response.results]);
      setOffset(nextOffset);
    } catch {
      // Silently fail
    }
  }, [loading, offset, total, debouncedQuery, filters, sort, pageSize]);

  // -- Handlers --
  const handleFilterChange = useCallback((updates: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleFilterReset = useCallback(() => {
    setFilters({
      category: '',
      minRating: 0,
      minPlayerCount: 0,
      dateRange: 'any',
    });
  }, []);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowAutocomplete(false);
  }, []);

  const hasMore = offset + pageSize < total;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-900">
      {/* ================================================================== */}
      {/* Search Header */}
      {/* ================================================================== */}
      <header className="px-4 md:px-8 py-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          {/* Back button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Discover
          </button>

          {/* Search input with autocomplete */}
          <div className="relative max-w-2xl">
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
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowAutocomplete(true); }}
                onFocus={() => setShowAutocomplete(true)}
                placeholder="Search worlds, creators, tags..."
                className="w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                aria-label="Search"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); searchInputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  aria-label="Clear search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Autocomplete dropdown */}
            {showAutocomplete && autocomplete.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                {autocomplete.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
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

          {/* Result summary */}
          {debouncedQuery && !loading && (
            <p className="text-sm text-gray-500 mt-3">
              {total.toLocaleString()} result{total !== 1 ? 's' : ''} for "{debouncedQuery}"
              {searchTime > 0 && <span className="text-gray-600"> ({searchTime}ms)</span>}
            </p>
          )}
        </div>
      </header>

      {/* ================================================================== */}
      {/* Tabs + Sort */}
      {/* ================================================================== */}
      <section className="px-4 md:px-8 py-3 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {(['worlds', 'assets', 'creators'] as ResultTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Sort + mobile filter */}
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              aria-label="Sort by"
            >
              {SORT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="lg:hidden px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm hover:bg-gray-700"
              aria-label="Toggle filters"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Main Content */}
      {/* ================================================================== */}
      <section className="px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto flex gap-8">
          {/* Desktop filter sidebar */}
          {activeTab === 'worlds' && (
            <div className="hidden lg:block">
              <FilterSidebar
                filters={filters}
                facets={facets}
                onFilterChange={handleFilterChange}
                onReset={handleFilterReset}
              />
            </div>
          )}

          {/* Mobile filter overlay */}
          {mobileFiltersOpen && activeTab === 'worlds' && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/60" onClick={() => setMobileFiltersOpen(false)} />
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-semibold text-lg">Filters</h3>
                  <button onClick={() => setMobileFiltersOpen(false)} className="text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <FilterSidebar
                  filters={filters}
                  facets={facets}
                  onFilterChange={handleFilterChange}
                  onReset={handleFilterReset}
                />
              </div>
            </div>
          )}

          {/* Results grid */}
          <div className="flex-1">
            {error ? (
              <div className="text-center py-20">
                <div className="text-red-400 mb-2">Search failed</div>
                <p className="text-gray-500 text-sm">{error}</p>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : activeTab === 'worlds' && worldResults.length === 0 ? (
              <NoResults
                query={debouncedQuery}
                suggestions={suggestions}
                onSuggestionClick={handleSuggestionClick}
              />
            ) : activeTab === 'creators' && creatorResults.length === 0 ? (
              <NoResults
                query={debouncedQuery}
                suggestions={suggestions}
                onSuggestionClick={handleSuggestionClick}
              />
            ) : activeTab === 'assets' ? (
              <div className="text-center py-20">
                <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="text-white font-semibold mb-1">Asset search coming soon</h3>
                <p className="text-gray-500 text-sm">Browse the marketplace for assets.</p>
              </div>
            ) : activeTab === 'creators' ? (
              <div className="space-y-3">
                {creatorResults.map((creator) => (
                  <CreatorResultCard
                    key={creator.userId}
                    creator={creator}
                    onClick={() => onCreatorClick(creator.userId)}
                  />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {worldResults.map((result) => (
                    <WorldResultCard
                      key={result.worldId}
                      result={result}
                      onClick={() => onWorldClick(result.worldId)}
                      onCreatorClick={onCreatorClick}
                    />
                  ))}
                </div>

                {/* Load more button */}
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={loadMore}
                      className="px-8 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm hover:bg-gray-700 transition-colors"
                    >
                      Load more results
                    </button>
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

export default SearchResults;
