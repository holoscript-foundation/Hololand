/**
 * CapabilityListViewer Component
 *
 * Displays an agent's granted, denied, and available capabilities
 * organized by category (read, write, admin). Shows which capabilities
 * are active and what trust tier is required to unlock each one.
 *
 * Features:
 * - Grouped by category (Read, Write, Admin)
 * - Visual granted/denied/locked state for each capability
 * - Shows required trust tier for locked capabilities
 * - TierBadge integration for inline tier display
 * - Expandable descriptions for each capability
 * - Summary header with counts
 *
 * Integration:
 * - Consumes AgentCapability from VRTrustHandshake
 * - Uses CAPABILITY_DISPLAY_CONFIG from the types module
 * - Pairs with TierBadge for tier requirement indicators
 *
 * @module trust-ui/CapabilityListViewer
 */

import React, { useState, useMemo, useCallback } from 'react';
import type {
  TrustTier,
  TrustUITheme,
  CapabilityEntry,
} from './types';
import {
  CAPABILITY_DISPLAY_CONFIG,
  TRUST_TIER_CONFIG,
  DEFAULT_TRUST_UI_THEME,
} from './types';
import { TierBadge } from './TierBadge';
import type { AgentCapability } from '../../VRTrustHandshake';

// =============================================================================
// TYPES
// =============================================================================

export interface CapabilityListViewerProps {
  /** The agent's current trust tier */
  currentTier: TrustTier;
  /** Capabilities currently granted to the agent */
  grantedCapabilities: AgentCapability[];
  /** Capabilities that were requested but denied */
  deniedCapabilities?: AgentCapability[];
  /** Whether to show capabilities not yet requested */
  showLocked?: boolean;
  /** Whether to show capability descriptions */
  showDescriptions?: boolean;
  /** Whether to group by category */
  groupByCategory?: boolean;
  /** Whether the list is in a compact/summary mode */
  compact?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Theme overrides */
  theme?: Partial<TrustUITheme>;
  /** Callback when a capability is clicked */
  onCapabilityClick?: (capability: AgentCapability) => void;
}

type CapabilityCategory = 'read' | 'write' | 'admin';

interface CategoryGroup {
  category: CapabilityCategory;
  label: string;
  entries: CapabilityEntry[];
}

// =============================================================================
// CATEGORY METADATA
// =============================================================================

const CATEGORY_LABELS: Record<CapabilityCategory, string> = {
  read: 'Read Permissions',
  write: 'Write Permissions',
  admin: 'Administrative',
};

const CATEGORY_ORDER: CapabilityCategory[] = ['read', 'write', 'admin'];

// =============================================================================
// STATUS ICONS
// =============================================================================

const STATUS_ICONS = {
  granted: '\u2705',   // Green checkmark
  denied: '\u274C',    // Red X
  locked: '\u{1F512}', // Lock
} as const;

// =============================================================================
// COMPONENT
// =============================================================================

export const CapabilityListViewer: React.FC<CapabilityListViewerProps> = ({
  currentTier,
  grantedCapabilities,
  deniedCapabilities = [],
  showLocked = true,
  showDescriptions = true,
  groupByCategory = true,
  compact = false,
  className,
  theme: themeOverride,
  onCapabilityClick,
}) => {
  const [expandedCapabilities, setExpandedCapabilities] = useState<Set<AgentCapability>>(new Set());

  const theme = useMemo(
    () => ({ ...DEFAULT_TRUST_UI_THEME, ...themeOverride }),
    [themeOverride],
  );

  // Build the full capability list
  const allEntries = useMemo((): CapabilityEntry[] => {
    const grantedSet = new Set(grantedCapabilities);
    const deniedSet = new Set(deniedCapabilities);
    const allCapabilities = Object.keys(CAPABILITY_DISPLAY_CONFIG) as AgentCapability[];

    return allCapabilities
      .map((cap): CapabilityEntry => {
        const config = CAPABILITY_DISPLAY_CONFIG[cap];
        return {
          ...config,
          granted: grantedSet.has(cap),
          denied: deniedSet.has(cap),
        };
      })
      .filter((entry) => {
        // Always show granted and denied
        if (entry.granted || entry.denied) return true;
        // Show locked only if enabled
        return showLocked;
      });
  }, [grantedCapabilities, deniedCapabilities, showLocked]);

  // Group by category
  const categoryGroups = useMemo((): CategoryGroup[] => {
    if (!groupByCategory) {
      return [{
        category: 'read' as CapabilityCategory,
        label: 'All Capabilities',
        entries: allEntries,
      }];
    }

    return CATEGORY_ORDER
      .map((category) => ({
        category,
        label: CATEGORY_LABELS[category],
        entries: allEntries.filter((e) => e.category === category),
      }))
      .filter((group) => group.entries.length > 0);
  }, [allEntries, groupByCategory]);

  // Summary counts
  const summary = useMemo(() => ({
    granted: allEntries.filter((e) => e.granted).length,
    denied: allEntries.filter((e) => e.denied).length,
    locked: allEntries.filter((e) => !e.granted && !e.denied).length,
    total: allEntries.length,
  }), [allEntries]);

  const toggleExpand = useCallback((cap: AgentCapability) => {
    setExpandedCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(cap)) {
        next.delete(cap);
      } else {
        next.add(cap);
      }
      return next;
    });
  }, []);

  const handleCapabilityClick = useCallback((cap: AgentCapability) => {
    onCapabilityClick?.(cap);
  }, [onCapabilityClick]);

  return (
    <div
      className={className}
      style={{
        fontFamily: theme.fontFamily,
        color: theme.textPrimary,
        backgroundColor: theme.containerBackground,
        border: `1px solid ${theme.borderColor}`,
        borderRadius: theme.borderRadius,
        overflow: 'hidden',
      }}
      role="region"
      aria-label="Agent capabilities"
    >
      {/* Summary Header */}
      <div
        style={{
          padding: compact ? '0.5rem 0.75rem' : '0.75rem 1rem',
          borderBottom: `1px solid ${theme.borderColor}`,
          backgroundColor: '#fafafa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h3 style={{
            margin: 0,
            fontSize: compact ? '0.85rem' : '1rem',
            fontWeight: 600,
          }}>
            Capabilities
          </h3>
          <TierBadge tier={currentTier} size="sm" variant="pill" />
        </div>
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          fontSize: compact ? '0.7rem' : '0.8rem',
          color: theme.textMuted,
        }}>
          <span style={{ color: TRUST_TIER_CONFIG.T3.color }}>
            {summary.granted} granted
          </span>
          {summary.denied > 0 && (
            <span style={{ color: TRUST_TIER_CONFIG.T0.color }}>
              {summary.denied} denied
            </span>
          )}
          {summary.locked > 0 && (
            <span>
              {summary.locked} locked
            </span>
          )}
        </div>
      </div>

      {/* Capability Groups */}
      <div style={{ padding: compact ? '0.25rem 0' : '0.5rem 0' }}>
        {categoryGroups.map((group) => (
          <div key={group.category}>
            {/* Group header */}
            {groupByCategory && (
              <div
                style={{
                  padding: compact ? '0.3rem 0.75rem' : '0.4rem 1rem',
                  fontSize: compact ? '0.65rem' : '0.7rem',
                  fontWeight: 700,
                  color: theme.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {group.label}
              </div>
            )}

            {/* Capability entries */}
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
              }}
              role="list"
              aria-label={group.label}
            >
              {group.entries.map((entry) => (
                <CapabilityRow
                  key={entry.capability}
                  entry={entry}
                  currentTier={currentTier}
                  compact={compact}
                  showDescription={showDescriptions}
                  isExpanded={expandedCapabilities.has(entry.capability)}
                  onToggleExpand={toggleExpand}
                  onClick={handleCapabilityClick}
                  theme={theme}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// CAPABILITY ROW SUB-COMPONENT
// =============================================================================

interface CapabilityRowProps {
  entry: CapabilityEntry;
  currentTier: TrustTier;
  compact: boolean;
  showDescription: boolean;
  isExpanded: boolean;
  onToggleExpand: (cap: AgentCapability) => void;
  onClick: (cap: AgentCapability) => void;
  theme: TrustUITheme;
}

const CapabilityRow: React.FC<CapabilityRowProps> = ({
  entry,
  currentTier,
  compact,
  showDescription,
  isExpanded,
  onToggleExpand,
  onClick,
  theme,
}) => {
  const isLocked = !entry.granted && !entry.denied;
  const tierMeta = TRUST_TIER_CONFIG[entry.requiredTier];
  const currentTierIndex = ['T0', 'T1', 'T2', 'T3'].indexOf(currentTier);
  const requiredTierIndex = ['T0', 'T1', 'T2', 'T3'].indexOf(entry.requiredTier);
  const tierGap = requiredTierIndex - currentTierIndex;

  let statusIcon: string;
  let statusColor: string;
  let statusLabel: string;

  if (entry.granted) {
    statusIcon = STATUS_ICONS.granted;
    statusColor = TRUST_TIER_CONFIG.T3.color;
    statusLabel = 'Granted';
  } else if (entry.denied) {
    statusIcon = STATUS_ICONS.denied;
    statusColor = TRUST_TIER_CONFIG.T0.color;
    statusLabel = 'Denied';
  } else {
    statusIcon = STATUS_ICONS.locked;
    statusColor = theme.textMuted;
    statusLabel = `Locked (requires ${entry.requiredTier})`;
  }

  return (
    <li
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderBottom: `1px solid ${theme.borderColor}`,
      }}
    >
      {/* Main row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: compact ? '0.4rem' : '0.6rem',
          padding: compact ? '0.35rem 0.75rem' : '0.5rem 1rem',
          cursor: showDescription ? 'pointer' : 'default',
          opacity: isLocked ? 0.6 : 1,
          transition: 'background-color 0.15s',
        }}
        role="listitem"
        aria-label={`${entry.label}: ${statusLabel}`}
        onClick={() => {
          if (showDescription) {
            onToggleExpand(entry.capability);
          }
          onClick(entry.capability);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (showDescription) onToggleExpand(entry.capability);
            onClick(entry.capability);
          }
        }}
        tabIndex={0}
      >
        {/* Status icon */}
        <span
          style={{
            fontSize: compact ? '0.85rem' : '1rem',
            flexShrink: 0,
            width: compact ? '1.2rem' : '1.5rem',
            textAlign: 'center',
          }}
          aria-hidden="true"
        >
          {statusIcon}
        </span>

        {/* Capability name */}
        <span
          style={{
            flex: 1,
            fontSize: compact ? '0.78rem' : '0.85rem',
            fontWeight: entry.granted ? 600 : 400,
            color: entry.granted ? theme.textPrimary : theme.textSecondary,
          }}
        >
          {entry.label}
        </span>

        {/* Required tier badge (for locked/denied items) */}
        {!entry.granted && (
          <TierBadge
            tier={entry.requiredTier}
            size="sm"
            variant="pill"
            showIcon={false}
            showLabel={true}
            style={{ opacity: 0.7 }}
          />
        )}

        {/* Expand indicator */}
        {showDescription && (
          <span
            style={{
              fontSize: '0.7rem',
              color: theme.textMuted,
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {'\u25B6'}
          </span>
        )}
      </div>

      {/* Expanded description */}
      {showDescription && isExpanded && (
        <div
          style={{
            padding: compact ? '0.25rem 0.75rem 0.5rem 2.5rem' : '0.3rem 1rem 0.6rem 3rem',
            fontSize: compact ? '0.7rem' : '0.78rem',
            color: theme.textSecondary,
            lineHeight: 1.5,
          }}
        >
          <p style={{ margin: '0 0 0.3rem 0' }}>
            {entry.description}
          </p>
          {isLocked && tierGap > 0 && (
            <p style={{
              margin: 0,
              color: tierMeta.color,
              fontWeight: 500,
              fontSize: compact ? '0.65rem' : '0.72rem',
            }}>
              Requires {entry.requiredTier} ({tierMeta.label}) - {tierGap} tier{tierGap > 1 ? 's' : ''} above current level
            </p>
          )}
        </div>
      )}
    </li>
  );
};

export default CapabilityListViewer;
