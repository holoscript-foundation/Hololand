/**
 * TrustTierFilter Component
 *
 * Provides toggle buttons for filtering agents by trust tier (T0-T3).
 * Displays the count of agents at each tier level, with visual indicators
 * matching the uAA2++ trust tier color scheme.
 *
 * Features:
 * - Toggle buttons for each trust tier (T0 through T3)
 * - Agent count per tier from search facets
 * - Color-coded to match TRUST_TIER_CONFIG
 * - Multi-select (toggle multiple tiers on/off)
 * - "All" quick button to reset filters
 * - DID verification status filter integration
 * - Online-only toggle
 * - Sort controls
 * - Accessible toggle group with ARIA
 *
 * @module agent-discovery/TrustTierFilter
 */

import React, { useCallback, useMemo } from 'react';
import type {
  TrustTier,
  DIDVerificationStatus,
  AgentSearchParams,
} from './ansTypes';
import { TRUST_TIER_CONFIG, DID_STATUS_CONFIG } from './ansTypes';

// =============================================================================
// TYPES
// =============================================================================

export interface TrustTierFilterProps {
  /** Currently selected trust tiers */
  selectedTiers: TrustTier[];
  /** Callback when tier selection changes */
  onTiersChange: (tiers: TrustTier[]) => void;
  /** Agent counts per tier (from search facets) */
  tierCounts?: Record<TrustTier, number>;
  /** Selected DID verification statuses */
  selectedDIDStatuses?: DIDVerificationStatus[];
  /** Callback when DID status filter changes */
  onDIDStatusesChange?: (statuses: DIDVerificationStatus[]) => void;
  /** DID status counts from facets */
  didStatusCounts?: Partial<Record<DIDVerificationStatus, number>>;
  /** Whether online-only filter is active */
  onlineOnly?: boolean;
  /** Callback for online-only toggle */
  onOnlineOnlyChange?: (onlineOnly: boolean) => void;
  /** Current sort field */
  sortBy?: AgentSearchParams['sortBy'];
  /** Callback when sort changes */
  onSortChange?: (sortBy: AgentSearchParams['sortBy']) => void;
  /** Current sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Callback when sort direction changes */
  onSortDirectionChange?: (dir: 'asc' | 'desc') => void;
  /** Total agent count */
  totalCount?: number;
  /** Custom CSS class name */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ALL_TIERS: TrustTier[] = ['T0', 'T1', 'T2', 'T3'];
const ALL_DID_STATUSES: DIDVerificationStatus[] = ['verified', 'pending', 'expired', 'revoked', 'unverified'];

const SORT_OPTIONS: Array<{ value: AgentSearchParams['sortBy']; label: string }> = [
  { value: 'trustScore', label: 'Trust Score' },
  { value: 'name', label: 'Name' },
  { value: 'lastActive', label: 'Last Active' },
  { value: 'registered', label: 'Registered' },
  { value: 'endorsements', label: 'Endorsements' },
  { value: 'interactions', label: 'Interactions' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export const TrustTierFilter: React.FC<TrustTierFilterProps> = ({
  selectedTiers,
  onTiersChange,
  tierCounts,
  selectedDIDStatuses,
  onDIDStatusesChange,
  didStatusCounts,
  onlineOnly,
  onOnlineOnlyChange,
  sortBy,
  onSortChange,
  sortDirection,
  onSortDirectionChange,
  totalCount,
  className,
}) => {
  const selectedTierSet = useMemo(() => new Set(selectedTiers), [selectedTiers]);
  const isAllSelected = selectedTiers.length === 0;

  const toggleTier = useCallback(
    (tier: TrustTier) => {
      if (selectedTierSet.has(tier)) {
        onTiersChange(selectedTiers.filter((t) => t !== tier));
      } else {
        onTiersChange([...selectedTiers, tier]);
      }
    },
    [selectedTiers, selectedTierSet, onTiersChange],
  );

  const selectAll = useCallback(() => {
    onTiersChange([]);
  }, [onTiersChange]);

  const selectedDidSet = useMemo(
    () => new Set(selectedDIDStatuses ?? []),
    [selectedDIDStatuses],
  );

  const toggleDIDStatus = useCallback(
    (status: DIDVerificationStatus) => {
      if (!onDIDStatusesChange || !selectedDIDStatuses) return;
      if (selectedDidSet.has(status)) {
        onDIDStatusesChange(selectedDIDStatuses.filter((s) => s !== status));
      } else {
        onDIDStatusesChange([...selectedDIDStatuses, status]);
      }
    },
    [selectedDIDStatuses, selectedDidSet, onDIDStatusesChange],
  );

  return (
    <div
      className={className}
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#fff',
        overflow: 'hidden',
      }}
      role="region"
      aria-label="Agent filters"
    >
      {/* Trust Tier Section */}
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: '#1a1a2e' }}>
            Trust Tier
          </h4>
          {totalCount !== undefined && (
            <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
              {totalCount} agents
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.35rem',
            flexWrap: 'wrap',
          }}
          role="group"
          aria-label="Filter by trust tier"
        >
          {/* All button */}
          <button
            onClick={selectAll}
            aria-pressed={isAllSelected}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              padding: '0.3rem 0.6rem',
              borderRadius: '6px',
              border: `1.5px solid ${isAllSelected ? '#374151' : '#d1d5db'}`,
              backgroundColor: isAllSelected ? '#374151' : 'transparent',
              color: isAllSelected ? '#fff' : '#6b7280',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            All
          </button>

          {/* Tier buttons */}
          {ALL_TIERS.map((tier) => {
            const meta = TRUST_TIER_CONFIG[tier];
            const isSelected = selectedTierSet.has(tier);
            const count = tierCounts?.[tier] ?? 0;

            return (
              <button
                key={tier}
                onClick={() => toggleTier(tier)}
                aria-pressed={isSelected}
                aria-label={`${meta.label} (${tier}): ${count} agents`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  border: `1.5px solid ${isSelected ? meta.color : '#d1d5db'}`,
                  backgroundColor: isSelected ? `${meta.color}12` : 'transparent',
                  color: isSelected ? meta.color : '#6b7280',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
              >
                <span aria-hidden="true">{meta.icon}</span>
                {tier}
                {count > 0 && (
                  <span
                    style={{
                      fontSize: '0.6rem',
                      backgroundColor: isSelected ? meta.color : '#e5e7eb',
                      color: isSelected ? '#fff' : '#6b7280',
                      borderRadius: '999px',
                      padding: '0 0.3rem',
                      fontWeight: 700,
                      minWidth: '1rem',
                      textAlign: 'center',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* DID Verification Status Section */}
      {onDIDStatusesChange && (
        <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #f0f0f0' }}>
          <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.75rem', fontWeight: 600, color: '#1a1a2e' }}>
            DID Status
          </h4>
          <div
            style={{
              display: 'flex',
              gap: '0.3rem',
              flexWrap: 'wrap',
            }}
            role="group"
            aria-label="Filter by DID verification status"
          >
            {ALL_DID_STATUSES.map((status) => {
              const meta = DID_STATUS_CONFIG[status];
              const isSelected = selectedDidSet.has(status);
              const count = didStatusCounts?.[status] ?? 0;

              return (
                <button
                  key={status}
                  onClick={() => toggleDIDStatus(status)}
                  aria-pressed={isSelected}
                  aria-label={`${meta.label}: ${count} agents`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '999px',
                    border: `1px solid ${isSelected ? meta.color : '#d1d5db'}`,
                    backgroundColor: isSelected ? `${meta.color}12` : 'transparent',
                    color: isSelected ? meta.color : '#6b7280',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: '0.7rem' }}>{meta.icon}</span>
                  {meta.label}
                  {count > 0 && (
                    <span style={{ fontSize: '0.55rem', opacity: 0.7 }}>
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Additional Controls */}
      <div
        style={{
          padding: '0.6rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        {/* Online Only Toggle */}
        {onOnlineOnlyChange && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.72rem',
              color: '#374151',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <div
              onClick={() => onOnlineOnlyChange(!onlineOnly)}
              role="switch"
              aria-checked={onlineOnly}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOnlineOnlyChange(!onlineOnly);
                }
              }}
              style={{
                width: '32px',
                height: '18px',
                borderRadius: '999px',
                backgroundColor: onlineOnly ? '#059669' : '#d1d5db',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  position: 'absolute',
                  top: '2px',
                  left: onlineOnly ? '16px' : '2px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                }}
              />
            </div>
            <span style={{ fontWeight: 500 }}>
              Online only
            </span>
          </label>
        )}

        {/* Sort Controls */}
        {onSortChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <label htmlFor="agent-sort" style={{ fontSize: '0.68rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
              Sort by:
            </label>
            <select
              id="agent-sort"
              value={sortBy ?? 'trustScore'}
              onChange={(e) => onSortChange(e.target.value as AgentSearchParams['sortBy'])}
              style={{
                padding: '0.2rem 0.4rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.68rem',
                backgroundColor: '#fff',
                color: '#374151',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Sort direction toggle */}
            {onSortDirectionChange && (
              <button
                onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
                aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  color: '#374151',
                  fontFamily: 'inherit',
                }}
              >
                {sortDirection === 'asc' ? '\u2191' : '\u2193'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrustTierFilter;
