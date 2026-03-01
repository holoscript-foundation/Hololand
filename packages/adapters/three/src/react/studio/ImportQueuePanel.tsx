/**
 * ImportQueuePanel Component
 *
 * Displays the full import queue with summary stats, filtering,
 * batch actions, and a scrollable list of AssetPreviewCards.
 *
 * Features:
 *   - Summary bar with counts by state, total size, overall progress
 *   - Filter tabs (All, Models, Textures, Audio, etc.)
 *   - Batch actions (Import All, Clear, Select All)
 *   - Scrollable card grid/list with progressive preview cards
 *   - Empty state with drop zone prompt
 *
 * @module studio/ImportQueuePanel
 */

import React, { useState, useMemo, useCallback, type CSSProperties } from 'react';
import {
  AssetCategory,
  ImportState,
  type ImportEntry,
  type ImportQueueConfig,
} from './types';
import { formatFileSize, getCategoryLabel } from './assetUtils';
import { AssetPreviewCard } from './AssetPreviewCard';

// =============================================================================
// TYPES
// =============================================================================

export interface ImportQueuePanelProps {
  /** Import entries to display */
  entries: ImportEntry[];
  /** Whether any imports are in progress */
  isImporting: boolean;
  /** Overall progress (0-1) */
  overallProgress: number;
  /** State counts */
  stateCounts: Record<ImportState, number>;
  /** Total file size */
  totalSize: number;
  /** Config */
  config: ImportQueueConfig;
  /** Import all queued entries */
  onImportAll: () => void;
  /** Remove an entry */
  onRemove: (id: string) => void;
  /** Clear all entries */
  onClearAll: () => void;
  /** Retry a failed entry */
  onRetry: (id: string) => void;
  /** Cancel an entry */
  onCancel: (id: string) => void;
  /** Update alias */
  onAliasChange: (id: string, alias: string) => void;
  /** Toggle selection */
  onSelect: (id: string) => void;
  /** Select all */
  onSelectAll: () => void;
  /** Deselect all */
  onDeselectAll: () => void;
  /** Layout mode */
  layout?: 'grid' | 'list';
  /** Compact cards */
  compactCards?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Override styles */
  style?: CSSProperties;
}

// =============================================================================
// FILTER CATEGORIES
// =============================================================================

type FilterKey = 'all' | AssetCategory;

const filterOrder: FilterKey[] = [
  'all',
  AssetCategory.MODEL_3D,
  AssetCategory.TEXTURE,
  AssetCategory.AUDIO,
  AssetCategory.VIDEO,
  AssetCategory.HOLOSCRIPT,
  AssetCategory.CONFIG,
];

function getFilterLabel(key: FilterKey): string {
  if (key === 'all') return 'All';
  return getCategoryLabel(key);
}

// =============================================================================
// STYLES
// =============================================================================

const panelStyles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    color: '#ccc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#eee',
  },
  headerStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#888',
  },
  headerStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  statDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  filterBar: {
    display: 'flex',
    gap: '4px',
    padding: '8px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    overflowX: 'auto' as const,
    flexShrink: 0,
  },
  filterTab: {
    padding: '4px 10px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'background-color 0.15s ease',
    fontWeight: 500,
  },
  filterTabActive: {
    backgroundColor: 'rgba(0, 204, 255, 0.15)',
    color: '#00ccff',
  },
  filterTabInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    color: '#888',
  },
  actionBar: {
    display: 'flex',
    gap: '8px',
    padding: '8px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    flexShrink: 0,
  },
  actionButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease, opacity 0.15s ease',
  },
  progressBarOuter: {
    height: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    flexShrink: 0,
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: '#00ccff',
    transition: 'width 0.3s ease',
  },
  cardContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '12px 16px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '12px',
  },
  cardList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#666',
    fontSize: '14px',
    gap: '8px',
    padding: '40px',
    textAlign: 'center' as const,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    fontSize: '11px',
    color: '#666',
    flexShrink: 0,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Full import queue panel with filtering, batch actions, and preview cards.
 *
 * @example
 * ```tsx
 * function StudioAssetPanel() {
 *   const importState = useAssetImport({
 *     onImport: async (entries) => {
 *       // Handle importing to project asset store
 *     },
 *   });
 *
 *   return (
 *     <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
 *       <AssetDropZone onFilesSelected={importState.addFiles} />
 *       <ImportQueuePanel
 *         entries={importState.entries}
 *         isImporting={importState.isImporting}
 *         overallProgress={importState.overallProgress}
 *         stateCounts={importState.stateCounts}
 *         totalSize={importState.totalSize}
 *         config={importState.config}
 *         onImportAll={importState.importAll}
 *         onRemove={importState.removeEntry}
 *         onClearAll={importState.clearAll}
 *         onRetry={importState.retryEntry}
 *         onCancel={importState.cancelEntry}
 *         onAliasChange={importState.updateAlias}
 *         onSelect={importState.toggleSelection}
 *         onSelectAll={importState.selectAll}
 *         onDeselectAll={importState.deselectAll}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export const ImportQueuePanel = React.memo<ImportQueuePanelProps>(
  function ImportQueuePanel({
    entries,
    isImporting,
    overallProgress,
    stateCounts,
    totalSize,
    config,
    onImportAll,
    onRemove,
    onClearAll,
    onRetry,
    onCancel,
    onAliasChange,
    onSelect,
    onSelectAll,
    onDeselectAll,
    layout = 'grid',
    compactCards = false,
    className,
    style,
  }) {
    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

    // -----------------------------------------------------------------------
    // Filter entries
    // -----------------------------------------------------------------------

    const filteredEntries = useMemo(() => {
      if (activeFilter === 'all') return entries;
      return entries.filter((e) => e.category === activeFilter);
    }, [entries, activeFilter]);

    // Category counts for filter badges
    const categoryCounts = useMemo(() => {
      const counts: Record<string, number> = { all: entries.length };
      for (const entry of entries) {
        counts[entry.category] = (counts[entry.category] ?? 0) + 1;
      }
      return counts;
    }, [entries]);

    // Only show filter tabs for categories that have entries
    const visibleFilters = useMemo(
      () => filterOrder.filter((key) => (categoryCounts[key] ?? 0) > 0),
      [categoryCounts],
    );

    // -----------------------------------------------------------------------
    // Batch action helpers
    // -----------------------------------------------------------------------

    const hasQueued = stateCounts[ImportState.QUEUED] > 0;
    const hasErrors = stateCounts[ImportState.ERROR] > 0;
    const selectedCount = entries.filter((e) => e.selected).length;
    const allSelected = entries.length > 0 && selectedCount === entries.length;

    const handleToggleSelectAll = useCallback(() => {
      if (allSelected) {
        onDeselectAll();
      } else {
        onSelectAll();
      }
    }, [allSelected, onSelectAll, onDeselectAll]);

    // -----------------------------------------------------------------------
    // Empty state
    // -----------------------------------------------------------------------

    if (entries.length === 0) {
      return (
        <div style={{ ...panelStyles.container, ...style }} className={className}>
          <div style={panelStyles.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>No assets in queue</span>
            <span style={{ fontSize: '12px', color: '#555' }}>
              Drop files above or click to browse
            </span>
          </div>
        </div>
      );
    }

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
      <div style={{ ...panelStyles.container, ...style }} className={className} role="region" aria-label="Import queue">
        {/* Header with stats */}
        <div style={panelStyles.header}>
          <div style={panelStyles.headerTitle}>
            Import Queue ({entries.length})
          </div>
          <div style={panelStyles.headerStats}>
            <div style={panelStyles.headerStat}>
              <div style={{ ...panelStyles.statDot, backgroundColor: '#888' }} />
              <span>{stateCounts[ImportState.QUEUED]} queued</span>
            </div>
            {isImporting && (
              <div style={panelStyles.headerStat}>
                <div style={{ ...panelStyles.statDot, backgroundColor: '#00ccff' }} />
                <span>Processing</span>
              </div>
            )}
            {stateCounts[ImportState.COMPLETE] > 0 && (
              <div style={panelStyles.headerStat}>
                <div style={{ ...panelStyles.statDot, backgroundColor: '#44cc44' }} />
                <span>{stateCounts[ImportState.COMPLETE]} done</span>
              </div>
            )}
            {hasErrors && (
              <div style={panelStyles.headerStat}>
                <div style={{ ...panelStyles.statDot, backgroundColor: '#ff4444' }} />
                <span>{stateCounts[ImportState.ERROR]} errors</span>
              </div>
            )}
            <span>{formatFileSize(totalSize)}</span>
          </div>
        </div>

        {/* Overall progress bar */}
        {isImporting && (
          <div style={panelStyles.progressBarOuter} role="progressbar" aria-valuenow={Math.round(overallProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div
              style={{
                ...panelStyles.progressBarInner,
                width: `${overallProgress * 100}%`,
              }}
            />
          </div>
        )}

        {/* Filter tabs */}
        {visibleFilters.length > 2 && (
          <div style={panelStyles.filterBar} role="tablist" aria-label="Filter by asset type">
            {visibleFilters.map((key) => (
              <button
                key={key}
                style={{
                  ...panelStyles.filterTab,
                  ...(activeFilter === key
                    ? panelStyles.filterTabActive
                    : panelStyles.filterTabInactive),
                }}
                onClick={() => setActiveFilter(key)}
                role="tab"
                aria-selected={activeFilter === key}
              >
                {getFilterLabel(key)} ({categoryCounts[key] ?? 0})
              </button>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div style={panelStyles.actionBar}>
          <button
            style={{
              ...panelStyles.actionButton,
              backgroundColor: hasQueued ? 'rgba(0, 204, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: hasQueued ? '#00ccff' : '#666',
              cursor: hasQueued && !isImporting ? 'pointer' : 'not-allowed',
              opacity: hasQueued && !isImporting ? 1 : 0.5,
            }}
            disabled={!hasQueued || isImporting}
            onClick={onImportAll}
          >
            Import All ({stateCounts[ImportState.QUEUED]})
          </button>

          <button
            style={{
              ...panelStyles.actionButton,
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              color: '#888',
            }}
            onClick={handleToggleSelectAll}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>

          <button
            style={{
              ...panelStyles.actionButton,
              backgroundColor: 'rgba(255, 68, 68, 0.1)',
              color: '#ff6666',
              marginLeft: 'auto',
            }}
            onClick={onClearAll}
          >
            Clear All
          </button>
        </div>

        {/* Card container */}
        <div style={panelStyles.cardContainer}>
          <div
            style={layout === 'grid' && !compactCards ? panelStyles.cardGrid : panelStyles.cardList}
            role="list"
            aria-label="Import queue items"
          >
            {filteredEntries.map((entry) => (
              <AssetPreviewCard
                key={entry.id}
                entry={entry}
                onAliasChange={onAliasChange}
                onRemove={onRemove}
                onRetry={onRetry}
                onCancel={onCancel}
                onSelect={onSelect}
                compact={compactCards || layout === 'list'}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={panelStyles.footer}>
          <span>
            {filteredEntries.length} of {entries.length} items shown
            {selectedCount > 0 && ` | ${selectedCount} selected`}
          </span>
          <span>
            Max: {config.maxFiles} files, {formatFileSize(config.maxTotalSize)}
          </span>
        </div>
      </div>
    );
  },
);

export default ImportQueuePanel;
