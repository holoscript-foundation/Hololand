/**
 * CapabilitySearch Component
 *
 * Search and filter agents by their declared capabilities.
 * Provides a text search input, category chip filters, and
 * an expandable capability list with usage metrics.
 *
 * Features:
 * - Text search across capability names and descriptions
 * - Category chip toggles (spatial, communication, creation, etc.)
 * - Active/inactive capability counts per category
 * - Expandable detail rows showing version, usage, success rate
 * - Accessible keyboard navigation and ARIA labels
 *
 * @module agent-discovery/CapabilitySearch
 */

import React, { useState, useMemo, useCallback } from 'react';
import type {
  CapabilityCategory,
  AgentCapabilityDeclaration,
} from './ansTypes';
import { CAPABILITY_CATEGORY_CONFIG } from './ansTypes';

// =============================================================================
// TYPES
// =============================================================================

export interface CapabilitySearchProps {
  /** All available capabilities for filtering */
  capabilities: AgentCapabilityDeclaration[];
  /** Currently selected capability categories */
  selectedCategories: CapabilityCategory[];
  /** Currently selected specific capability IDs */
  selectedCapabilityIds: string[];
  /** Callback when categories change */
  onCategoriesChange: (categories: CapabilityCategory[]) => void;
  /** Callback when specific capabilities change */
  onCapabilityIdsChange: (ids: string[]) => void;
  /** Custom CSS class name */
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ALL_CATEGORIES: CapabilityCategory[] = [
  'spatial', 'communication', 'creation', 'moderation', 'analytics', 'integration',
];

// =============================================================================
// COMPONENT
// =============================================================================

export const CapabilitySearch: React.FC<CapabilitySearchProps> = ({
  capabilities,
  selectedCategories,
  selectedCapabilityIds,
  onCategoriesChange,
  onCapabilityIdsChange,
  className,
}) => {
  const [searchText, setSearchText] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<CapabilityCategory | null>(null);

  // Group capabilities by category
  const groupedCapabilities = useMemo(() => {
    const groups = new Map<CapabilityCategory, AgentCapabilityDeclaration[]>();
    for (const cat of ALL_CATEGORIES) {
      groups.set(cat, []);
    }
    for (const cap of capabilities) {
      const group = groups.get(cap.category);
      if (group) group.push(cap);
    }
    return groups;
  }, [capabilities]);

  // Filter capabilities by search text
  const filteredCapabilities = useMemo(() => {
    if (!searchText.trim()) return groupedCapabilities;

    const q = searchText.toLowerCase();
    const filtered = new Map<CapabilityCategory, AgentCapabilityDeclaration[]>();

    for (const [cat, caps] of groupedCapabilities) {
      const matching = caps.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q),
      );
      if (matching.length > 0) {
        filtered.set(cat, matching);
      }
    }

    return filtered;
  }, [groupedCapabilities, searchText]);

  const toggleCategory = useCallback(
    (category: CapabilityCategory) => {
      const isSelected = selectedCategories.includes(category);
      if (isSelected) {
        onCategoriesChange(selectedCategories.filter((c) => c !== category));
      } else {
        onCategoriesChange([...selectedCategories, category]);
      }
    },
    [selectedCategories, onCategoriesChange],
  );

  const toggleCapability = useCallback(
    (capId: string) => {
      const isSelected = selectedCapabilityIds.includes(capId);
      if (isSelected) {
        onCapabilityIdsChange(selectedCapabilityIds.filter((id) => id !== capId));
      } else {
        onCapabilityIdsChange([...selectedCapabilityIds, capId]);
      }
    },
    [selectedCapabilityIds, onCapabilityIdsChange],
  );

  const toggleExpandCategory = useCallback((cat: CapabilityCategory) => {
    setExpandedCategory((prev) => (prev === cat ? null : cat));
  }, []);

  const selectedCatSet = useMemo(() => new Set(selectedCategories), [selectedCategories]);
  const selectedCapSet = useMemo(() => new Set(selectedCapabilityIds), [selectedCapabilityIds]);

  return (
    <div
      className={className}
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
      }}
      role="search"
      aria-label="Search agent capabilities"
    >
      {/* Header */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#fafafa',
        }}
      >
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 600, color: '#1a1a2e' }}>
          Capability Search
        </h3>

        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search capabilities..."
            aria-label="Search capabilities by name or description"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.8rem',
              outline: 'none',
              backgroundColor: '#fff',
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '0.6rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.85rem',
              color: '#9ca3af',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            {'\u{1F50D}'}
          </span>
        </div>
      </div>

      {/* Category Chips */}
      <div
        style={{
          padding: '0.5rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem',
          borderBottom: '1px solid #f0f0f0',
        }}
        role="group"
        aria-label="Filter by capability category"
      >
        {ALL_CATEGORIES.map((cat) => {
          const meta = CAPABILITY_CATEGORY_CONFIG[cat];
          const isSelected = selectedCatSet.has(cat);
          const capCount = filteredCapabilities.get(cat)?.length ?? 0;

          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              aria-pressed={isSelected}
              aria-label={`${meta.label}: ${capCount} capabilities`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '999px',
                border: `1.5px solid ${isSelected ? meta.color : '#d1d5db'}`,
                backgroundColor: isSelected ? `${meta.color}15` : 'transparent',
                color: isSelected ? meta.color : '#6b7280',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit',
              }}
            >
              <span aria-hidden="true">{meta.icon}</span>
              {meta.label}
              {capCount > 0 && (
                <span
                  style={{
                    backgroundColor: isSelected ? meta.color : '#e5e7eb',
                    color: isSelected ? '#fff' : '#6b7280',
                    borderRadius: '999px',
                    padding: '0 0.35rem',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    minWidth: '1.1rem',
                    textAlign: 'center',
                  }}
                >
                  {capCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Capability List */}
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {ALL_CATEGORIES.map((cat) => {
          const caps = filteredCapabilities.get(cat);
          if (!caps || caps.length === 0) return null;

          const meta = CAPABILITY_CATEGORY_CONFIG[cat];
          const isExpanded = expandedCategory === cat;

          return (
            <div key={cat}>
              {/* Category Header */}
              <button
                onClick={() => toggleExpandCategory(cat)}
                aria-expanded={isExpanded}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.4rem 1rem',
                  backgroundColor: '#f9fafb',
                  border: 'none',
                  borderBottom: '1px solid #f0f0f0',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.75rem',
                  color: '#374151',
                  fontWeight: 600,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span aria-hidden="true">{meta.icon}</span>
                  {meta.label}
                  <span style={{ fontWeight: 400, color: '#9ca3af' }}>({caps.length})</span>
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                    color: '#9ca3af',
                  }}
                  aria-hidden="true"
                >
                  {'\u25B6'}
                </span>
              </button>

              {/* Capability Rows */}
              {isExpanded && (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} role="list">
                  {caps.map((cap) => {
                    const isCapSelected = selectedCapSet.has(cap.id);
                    return (
                      <li
                        key={cap.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.4rem 1rem 0.4rem 2rem',
                          borderBottom: '1px solid #f5f5f5',
                          cursor: 'pointer',
                          backgroundColor: isCapSelected ? `${meta.color}08` : 'transparent',
                          transition: 'background-color 0.1s',
                        }}
                        role="option"
                        aria-selected={isCapSelected}
                        onClick={() => toggleCapability(cap.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleCapability(cap.id);
                          }
                        }}
                        tabIndex={0}
                      >
                        {/* Selection indicator */}
                        <span
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '3px',
                            border: `1.5px solid ${isCapSelected ? meta.color : '#d1d5db'}`,
                            backgroundColor: isCapSelected ? meta.color : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: '0.6rem',
                            color: '#fff',
                          }}
                          aria-hidden="true"
                        >
                          {isCapSelected ? '\u2713' : ''}
                        </span>

                        {/* Capability details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#1a1a2e' }}>
                              {cap.name}
                            </span>
                            <span
                              style={{
                                fontSize: '0.6rem',
                                color: '#9ca3af',
                                backgroundColor: '#f3f4f6',
                                padding: '0 0.3rem',
                                borderRadius: '3px',
                              }}
                            >
                              v{cap.version}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '0.1rem' }}>
                            {cap.description}
                          </div>
                        </div>

                        {/* Required tier indicator */}
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: CAPABILITY_CATEGORY_CONFIG[cap.category]?.color ?? '#6b7280',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cap.requiredTier}+
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        {filteredCapabilities.size === 0 && (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: '0.8rem',
            }}
          >
            No capabilities match your search.
          </div>
        )}
      </div>

      {/* Active filter summary */}
      {(selectedCategories.length > 0 || selectedCapabilityIds.length > 0) && (
        <div
          style={{
            padding: '0.5rem 1rem',
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#fafafa',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.72rem',
            color: '#6b7280',
          }}
        >
          <span>
            {selectedCategories.length > 0 && `${selectedCategories.length} categories`}
            {selectedCategories.length > 0 && selectedCapabilityIds.length > 0 && ', '}
            {selectedCapabilityIds.length > 0 && `${selectedCapabilityIds.length} capabilities`}
            {' '}selected
          </span>
          <button
            onClick={() => {
              onCategoriesChange([]);
              onCapabilityIdsChange([]);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563EB',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontFamily: 'inherit',
              fontWeight: 600,
              padding: 0,
            }}
            aria-label="Clear all capability filters"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default CapabilitySearch;
