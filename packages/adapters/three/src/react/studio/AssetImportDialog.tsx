/**
 * AssetImportDialog Component
 *
 * The top-level orchestrator that combines AssetDropZone, useAssetImport,
 * and ImportQueuePanel into a complete asset import experience.
 *
 * Can be used as:
 *   - A standalone panel (embedded in the Studio IDE sidebar)
 *   - A modal dialog (triggered by a menu action or keyboard shortcut)
 *
 * @module studio/AssetImportDialog
 */

import React, { useCallback, type CSSProperties } from 'react';
import { DropZoneState, type ImportQueueConfig, type ImportEntry } from './types';
import { useAssetImport, type UseAssetImportOptions } from './useAssetImport';
import { AssetDropZone } from './AssetDropZone';
import { ImportQueuePanel } from './ImportQueuePanel';

// =============================================================================
// TYPES
// =============================================================================

export interface AssetImportDialogProps {
  /** Called when files are successfully imported to the project */
  onImport?: (entries: ImportEntry[]) => Promise<void>;
  /** Called when the dialog/panel is closed */
  onClose?: () => void;
  /** Import queue configuration overrides */
  config?: Partial<ImportQueueConfig>;
  /** Whether to render as a modal dialog */
  modal?: boolean;
  /** Whether the dialog is visible (for modal mode) */
  open?: boolean;
  /** Title shown in the header */
  title?: string;
  /** Layout mode for the queue panel */
  layout?: 'grid' | 'list';
  /** Use compact preview cards */
  compactCards?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Override styles */
  style?: CSSProperties;
  /** Additional useAssetImport options */
  importOptions?: Omit<UseAssetImportOptions, 'config' | 'onImport'>;
}

// =============================================================================
// STYLES
// =============================================================================

const dialogStyles: Record<string, CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#1a1a2e',
    color: '#ccc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '40px',
  },
  modalContent: {
    width: '100%',
    maxWidth: '900px',
    maxHeight: '80vh',
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    flexShrink: 0,
  },
  titleText: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#eee',
  },
  closeButton: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: '#888',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    lineHeight: 1,
    transition: 'background-color 0.15s ease',
  },
  dropZoneWrapper: {
    padding: '16px 20px',
    flexShrink: 0,
  },
  queueWrapper: {
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Complete asset import experience combining drop zone and queue panel.
 *
 * @example Standalone panel (sidebar integration)
 * ```tsx
 * function StudioSidebar() {
 *   return (
 *     <AssetImportDialog
 *       onImport={async (entries) => {
 *         for (const entry of entries) {
 *           await projectAssetStore.addAsset(entry.file, entry.alias, entry.targetPath);
 *         }
 *       }}
 *       layout="list"
 *       compactCards
 *     />
 *   );
 * }
 * ```
 *
 * @example Modal dialog
 * ```tsx
 * function App() {
 *   const [showImport, setShowImport] = useState(false);
 *
 *   return (
 *     <>
 *       <button onClick={() => setShowImport(true)}>Import Assets</button>
 *       <AssetImportDialog
 *         modal
 *         open={showImport}
 *         onClose={() => setShowImport(false)}
 *         onImport={handleImport}
 *         title="Import Assets to Project"
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * @example With custom config
 * ```tsx
 * <AssetImportDialog
 *   onImport={handleImport}
 *   config={{
 *     maxFiles: 20,
 *     acceptedExtensions: ['.glb', '.gltf', '.png', '.jpg'],
 *     autoImport: true,
 *     defaultTargetPath: '/project/assets/models/',
 *   }}
 * />
 * ```
 */
export const AssetImportDialog = React.memo<AssetImportDialogProps>(
  function AssetImportDialog({
    onImport,
    onClose,
    config,
    modal = false,
    open = true,
    title = 'Import Assets',
    layout = 'grid',
    compactCards = false,
    className,
    style,
    importOptions,
  }) {
    // -----------------------------------------------------------------------
    // Import state management
    // -----------------------------------------------------------------------

    const importState = useAssetImport({
      config,
      onImport,
      ...importOptions,
    });

    // -----------------------------------------------------------------------
    // Drop zone state derived from import state
    // -----------------------------------------------------------------------

    const dropZoneState = importState.isImporting
      ? DropZoneState.PROCESSING
      : undefined;

    // -----------------------------------------------------------------------
    // Modal close handler
    // -----------------------------------------------------------------------

    const handleOverlayClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      },
      [onClose],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose?.();
        }
      },
      [onClose],
    );

    // -----------------------------------------------------------------------
    // Don't render if modal is closed
    // -----------------------------------------------------------------------

    if (modal && !open) return null;

    // -----------------------------------------------------------------------
    // Panel content (shared between modal and embedded modes)
    // -----------------------------------------------------------------------

    const panelContent = (
      <div
        style={{
          ...dialogStyles.panel,
          ...(modal ? {} : style),
        }}
        className={modal ? undefined : className}
      >
        {/* Title bar */}
        <div style={dialogStyles.titleBar}>
          <div style={dialogStyles.titleText}>{title}</div>
          {onClose && (
            <button
              style={dialogStyles.closeButton}
              onClick={onClose}
              aria-label="Close import dialog"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="1" y1="1" x2="13" y2="13" />
                <line x1="13" y1="1" x2="1" y2="13" />
              </svg>
            </button>
          )}
        </div>

        {/* Drop zone */}
        <div style={dialogStyles.dropZoneWrapper}>
          <AssetDropZone
            onFilesSelected={importState.addFiles}
            state={dropZoneState}
            config={config}
            compact={importState.entries.length > 0}
            disabled={importState.isImporting}
          />
        </div>

        {/* Queue panel */}
        <div style={dialogStyles.queueWrapper}>
          <ImportQueuePanel
            entries={importState.entries}
            isImporting={importState.isImporting}
            overallProgress={importState.overallProgress}
            stateCounts={importState.stateCounts}
            totalSize={importState.totalSize}
            config={importState.config}
            onImportAll={importState.importAll}
            onRemove={importState.removeEntry}
            onClearAll={importState.clearAll}
            onRetry={importState.retryEntry}
            onCancel={importState.cancelEntry}
            onAliasChange={importState.updateAlias}
            onSelect={importState.toggleSelection}
            onSelectAll={importState.selectAll}
            onDeselectAll={importState.deselectAll}
            layout={layout}
            compactCards={compactCards}
          />
        </div>
      </div>
    );

    // -----------------------------------------------------------------------
    // Modal wrapper
    // -----------------------------------------------------------------------

    if (modal) {
      return (
        <div
          style={dialogStyles.modalOverlay}
          onClick={handleOverlayClick}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={className}
        >
          <div style={{ ...dialogStyles.modalContent, ...style }}>
            {panelContent}
          </div>
        </div>
      );
    }

    return panelContent;
  },
);

export default AssetImportDialog;
