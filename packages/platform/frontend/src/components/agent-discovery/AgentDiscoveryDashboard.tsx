/**
 * AgentDiscoveryDashboard Component
 *
 * Main dashboard page for discovering agents registered in the
 * Agent Naming Service (ANS). Composes all sub-components into a
 * cohesive discovery experience.
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────┐
 * │  Header: Title + Global Search Bar                  │
 * ├───────────────┬─────────────────────────────────────┤
 * │               │                                     │
 * │  Sidebar:     │  Main Content:                      │
 * │  - TrustTier  │  - Agent Card Grid                  │
 * │    Filter     │  - Pagination                       │
 * │  - Capability │  - Empty State                      │
 * │    Search     │                                     │
 * │  - Stats      │                                     │
 * │               │                                     │
 * ├───────────────┴─────────────────────────────────────┤
 * │  Footer: Result count + search time                 │
 * └─────────────────────────────────────────────────────┘
 *
 * Features:
 * - Full-text search across agent names, ANS names, descriptions, tags
 * - Trust tier filtering (T0-T3) with agent counts
 * - Capability category and individual capability filtering
 * - DID verification status filtering
 * - Online-only toggle
 * - Sort by trust score, name, last active, etc.
 * - Responsive grid layout for agent cards
 * - Search result facets
 * - Loading and empty states
 *
 * @module agent-discovery/AgentDiscoveryDashboard
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  TrustTier,
  CapabilityCategory,
  DIDVerificationStatus,
  ANSAgentRecord,
  AgentSearchParams,
  AgentSearchResult,
  AgentCapabilityDeclaration,
} from './ansTypes';
import { TRUST_TIER_CONFIG } from './ansTypes';
import { searchAgents, getAllCapabilities } from './ansDiscoveryService';
import { TrustTierFilter } from './TrustTierFilter';
import { CapabilitySearch } from './CapabilitySearch';
import { AgentCard } from './AgentCard';

// =============================================================================
// TYPES
// =============================================================================

export interface AgentDiscoveryDashboardProps {
  /** Callback when an agent is selected */
  onAgentSelect?: (agentId: string) => void;
  /** Number of agents per page */
  pageSize?: number;
  /** Custom CSS class name */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 12;

// =============================================================================
// COMPONENT
// =============================================================================

export const AgentDiscoveryDashboard: React.FC<AgentDiscoveryDashboardProps> = ({
  onAgentSelect,
  pageSize = DEFAULT_PAGE_SIZE,
  className,
}) => {
  // ---- State ----
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedTiers, setSelectedTiers] = useState<TrustTier[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CapabilityCategory[]>([]);
  const [selectedCapabilityIds, setSelectedCapabilityIds] = useState<string[]>([]);
  const [selectedDIDStatuses, setSelectedDIDStatuses] = useState<DIDVerificationStatus[]>([]);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sortBy, setSortBy] = useState<AgentSearchParams['sortBy']>('trustScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(0);

  const [searchResult, setSearchResult] = useState<AgentSearchResult | null>(null);
  const [allCapabilities, setAllCapabilities] = useState<AgentCapabilityDeclaration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Debounce search query ----
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setCurrentPage(0);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  // ---- Load capabilities on mount ----
  useEffect(() => {
    getAllCapabilities().then(setAllCapabilities);
  }, []);

  // ---- Execute search ----
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const params: AgentSearchParams = {
      query: debouncedQuery || undefined,
      trustTiers: selectedTiers.length > 0 ? selectedTiers : undefined,
      capabilityCategories: selectedCategories.length > 0 ? selectedCategories : undefined,
      capabilityIds: selectedCapabilityIds.length > 0 ? selectedCapabilityIds : undefined,
      didStatus: selectedDIDStatuses.length > 0 ? selectedDIDStatuses : undefined,
      onlineOnly: onlineOnly || undefined,
      sortBy,
      sortDirection,
      offset: currentPage * pageSize,
      limit: pageSize,
    };

    searchAgents(params).then((result) => {
      if (!cancelled) {
        setSearchResult(result);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, selectedTiers, selectedCategories, selectedCapabilityIds, selectedDIDStatuses, onlineOnly, sortBy, sortDirection, currentPage, pageSize]);

  // ---- Derived data ----
  const tierCounts = useMemo(() => {
    const counts: Record<TrustTier, number> = { T0: 0, T1: 0, T2: 0, T3: 0 };
    if (searchResult?.facets.tiers) {
      for (const { tier, count } of searchResult.facets.tiers) {
        counts[tier] = count;
      }
    }
    return counts;
  }, [searchResult]);

  const didStatusCounts = useMemo(() => {
    const counts: Partial<Record<DIDVerificationStatus, number>> = {};
    if (searchResult?.facets.didStatuses) {
      for (const { status, count } of searchResult.facets.didStatuses) {
        counts[status] = count;
      }
    }
    return counts;
  }, [searchResult]);

  const totalPages = useMemo(() => {
    if (!searchResult) return 0;
    return Math.ceil(searchResult.total / pageSize);
  }, [searchResult, pageSize]);

  // ---- Handlers ----
  const handleAgentClick = useCallback(
    (agentId: string) => {
      onAgentSelect?.(agentId);
    },
    [onAgentSelect],
  );

  const handleTiersChange = useCallback((tiers: TrustTier[]) => {
    setSelectedTiers(tiers);
    setCurrentPage(0);
  }, []);

  const handleCategoriesChange = useCallback((cats: CapabilityCategory[]) => {
    setSelectedCategories(cats);
    setCurrentPage(0);
  }, []);

  const handleCapabilityIdsChange = useCallback((ids: string[]) => {
    setSelectedCapabilityIds(ids);
    setCurrentPage(0);
  }, []);

  const handleDIDStatusesChange = useCallback((statuses: DIDVerificationStatus[]) => {
    setSelectedDIDStatuses(statuses);
    setCurrentPage(0);
  }, []);

  const handleOnlineOnlyChange = useCallback((value: boolean) => {
    setOnlineOnly(value);
    setCurrentPage(0);
  }, []);

  const handleSortChange = useCallback((newSortBy: AgentSearchParams['sortBy']) => {
    setSortBy(newSortBy);
    setCurrentPage(0);
  }, []);

  const handleSortDirectionChange = useCallback((dir: 'asc' | 'desc') => {
    setSortDirection(dir);
    setCurrentPage(0);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setSelectedTiers([]);
    setSelectedCategories([]);
    setSelectedCapabilityIds([]);
    setSelectedDIDStatuses([]);
    setOnlineOnly(false);
    setSortBy('trustScore');
    setSortDirection('desc');
    setCurrentPage(0);
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      query.length > 0 ||
      selectedTiers.length > 0 ||
      selectedCategories.length > 0 ||
      selectedCapabilityIds.length > 0 ||
      selectedDIDStatuses.length > 0 ||
      onlineOnly,
    [query, selectedTiers, selectedCategories, selectedCapabilityIds, selectedDIDStatuses, onlineOnly],
  );

  // ---- Render ----
  return (
    <div
      className={className}
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '1200px',
        margin: '0 auto',
        color: '#1a1a2e',
      }}
    >
      {/* ============================================================ */}
      {/* HEADER */}
      {/* ============================================================ */}
      <header
        style={{
          padding: '1.5rem 0 1rem',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1a1a2e' }}>
              Agent Discovery
            </h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#6b7280' }}>
              Find and verify agents in the Agent Naming Service registry
            </p>
          </div>

          {/* Tier Summary */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['T3', 'T2', 'T1', 'T0'] as TrustTier[]).map((tier) => {
              const meta = TRUST_TIER_CONFIG[tier];
              return (
                <div
                  key={tier}
                  style={{
                    textAlign: 'center',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '6px',
                    backgroundColor: meta.backgroundColor,
                    border: `1px solid ${meta.borderColor}`,
                    minWidth: '50px',
                  }}
                  title={`${meta.label}: ${tierCounts[tier]} agents`}
                >
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: meta.color }}>
                    {tierCounts[tier]}
                  </div>
                  <div style={{ fontSize: '0.55rem', color: meta.color, fontWeight: 600 }}>
                    {tier}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Search Bar */}
        <div style={{ position: 'relative', maxWidth: '600px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents by name, ANS, capability, or tag..."
            aria-label="Search agents"
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.5rem',
              border: '1.5px solid #d1d5db',
              borderRadius: '10px',
              fontSize: '0.85rem',
              outline: 'none',
              backgroundColor: '#fff',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '1rem',
              color: '#9ca3af',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            {'\u{1F50D}'}
          </span>
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                fontSize: '0.85rem',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '0.2rem',
              }}
              aria-label="Clear search"
            >
              {'\u2715'}
            </button>
          )}
        </div>
      </header>

      {/* ============================================================ */}
      {/* MAIN LAYOUT: SIDEBAR + CONTENT */}
      {/* ============================================================ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* ---- SIDEBAR ---- */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Trust Tier Filter */}
          <TrustTierFilter
            selectedTiers={selectedTiers}
            onTiersChange={handleTiersChange}
            tierCounts={tierCounts}
            selectedDIDStatuses={selectedDIDStatuses}
            onDIDStatusesChange={handleDIDStatusesChange}
            didStatusCounts={didStatusCounts}
            onlineOnly={onlineOnly}
            onOnlineOnlyChange={handleOnlineOnlyChange}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            sortDirection={sortDirection}
            onSortDirectionChange={handleSortDirectionChange}
            totalCount={searchResult?.total}
          />

          {/* Capability Search */}
          <CapabilitySearch
            capabilities={allCapabilities}
            selectedCategories={selectedCategories}
            selectedCapabilityIds={selectedCapabilityIds}
            onCategoriesChange={handleCategoriesChange}
            onCapabilityIdsChange={handleCapabilityIdsChange}
          />

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: '#fff',
                color: '#DC2626',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background-color 0.15s',
              }}
            >
              Clear All Filters
            </button>
          )}

          {/* Search Stats */}
          {searchResult && (
            <div
              style={{
                padding: '0.6rem 0.75rem',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: '#fafafa',
                fontSize: '0.68rem',
                color: '#6b7280',
              }}
            >
              <div style={{ fontWeight: 600, color: '#374151', marginBottom: '0.3rem' }}>
                Search Statistics
              </div>
              <div>Results: {searchResult.total}</div>
              <div>Search time: {searchResult.searchTimeMs.toFixed(1)}ms</div>
              {searchResult.query && <div>Query: "{searchResult.query}"</div>}
              <div style={{ marginTop: '0.3rem' }}>
                <span style={{ fontWeight: 500 }}>Capability spread: </span>
                {searchResult.facets.capabilities
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 4)
                  .map((f) => `${f.category} (${f.count})`)
                  .join(', ')}
              </div>
            </div>
          )}
        </aside>

        {/* ---- MAIN CONTENT ---- */}
        <main>
          {/* Loading State */}
          {isLoading && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {Array.from({ length: pageSize }, (_, i) => (
                <div
                  key={i}
                  style={{
                    height: '180px',
                    borderRadius: '10px',
                    backgroundColor: '#f3f4f6',
                    animation: 'pulse 1.5s infinite ease-in-out',
                  }}
                  aria-hidden="true"
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && searchResult && searchResult.agents.length === 0 && (
            <div
              style={{
                padding: '3rem 1rem',
                textAlign: 'center',
                color: '#9ca3af',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
                {'\u{1F50D}'}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.3rem' }}>
                No agents found
              </div>
              <div style={{ fontSize: '0.82rem', marginBottom: '1rem' }}>
                {hasActiveFilters
                  ? 'Try adjusting your filters or search query.'
                  : 'No agents registered in the ANS yet.'}
              </div>
              {hasActiveFilters && (
                <button
                  onClick={handleClearAllFilters}
                  style={{
                    padding: '0.5rem 1.25rem',
                    border: '1.5px solid #2563EB',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: '#2563EB',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Agent Card Grid */}
          {!isLoading && searchResult && searchResult.agents.length > 0 && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {searchResult.agents.map((agent) => (
                  <AgentCard
                    key={agent.agentId}
                    agent={agent}
                    onClick={handleAgentClick}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginTop: '1.25rem',
                    padding: '0.5rem 0',
                  }}
                  role="navigation"
                  aria-label="Agent results pagination"
                >
                  {/* Previous */}
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    aria-label="Previous page"
                    style={{
                      padding: '0.4rem 0.7rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: '#fff',
                      color: currentPage === 0 ? '#d1d5db' : '#374151',
                      fontSize: '0.75rem',
                      cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Prev
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i;
                    } else if (currentPage < 3) {
                      pageNum = i;
                    } else if (currentPage > totalPages - 4) {
                      pageNum = totalPages - 7 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }

                    if (pageNum < 0 || pageNum >= totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        aria-label={`Page ${pageNum + 1}`}
                        aria-current={currentPage === pageNum ? 'page' : undefined}
                        style={{
                          padding: '0.4rem 0.6rem',
                          border: `1px solid ${currentPage === pageNum ? '#2563EB' : '#d1d5db'}`,
                          borderRadius: '6px',
                          backgroundColor: currentPage === pageNum ? '#2563EB' : '#fff',
                          color: currentPage === pageNum ? '#fff' : '#374151',
                          fontSize: '0.75rem',
                          fontWeight: currentPage === pageNum ? 600 : 400,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          minWidth: '32px',
                        }}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}

                  {/* Next */}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    aria-label="Next page"
                    style={{
                      padding: '0.4rem 0.7rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: '#fff',
                      color: currentPage >= totalPages - 1 ? '#d1d5db' : '#374151',
                      fontSize: '0.75rem',
                      cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Result Summary Footer */}
              <div
                style={{
                  textAlign: 'center',
                  padding: '0.5rem 0 1rem',
                  fontSize: '0.7rem',
                  color: '#9ca3af',
                }}
              >
                Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, searchResult.total)} of {searchResult.total} agents
                {searchResult.searchTimeMs > 0 && ` (${searchResult.searchTimeMs.toFixed(1)}ms)`}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AgentDiscoveryDashboard;
