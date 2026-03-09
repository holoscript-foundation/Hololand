/**
 * AnchorManagerPanel Component
 *
 * Displays a list of created AR anchors with WGS84 coordinates,
 * persistence status, and sharing controls. Supports anchor
 * deletion, persistence toggling, and sharing initiation.
 *
 * Touch-friendly with minimum 44px tap targets per Apple HIG / WCAG.
 *
 * @module ar-mobile-ui/AnchorManagerPanel
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { ARAnchor, AnchorPersistenceStatus, AnchorSharingStatus } from './types';
import { AR_COLORS, MIN_TAP_TARGET } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface AnchorManagerPanelProps {
  /** List of anchors to display */
  anchors: ARAnchor[];
  /** Called when user requests to persist an anchor */
  onPersist: (anchorId: string) => void;
  /** Called when user requests to share an anchor */
  onShare: (anchorId: string) => void;
  /** Called when user requests to delete an anchor */
  onDelete: (anchorId: string) => void;
  /** Called when user taps an anchor to select/highlight it */
  onSelect?: (anchorId: string) => void;
  /** Currently selected anchor ID */
  selectedAnchorId?: string;
  /** Whether the panel is collapsed */
  collapsed?: boolean;
  /** Called when user toggles collapse */
  onToggleCollapse?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getPersistenceLabel(status: AnchorPersistenceStatus): string {
  const labels: Record<AnchorPersistenceStatus, string> = {
    'local-only': 'Local',
    persisting: 'Saving...',
    persisted: 'Saved',
    shared: 'Shared',
    error: 'Error',
  };
  return labels[status];
}

function getPersistenceColor(status: AnchorPersistenceStatus): string {
  const colors: Record<AnchorPersistenceStatus, string> = {
    'local-only': AR_COLORS.textSecondary,
    persisting: AR_COLORS.warning,
    persisted: AR_COLORS.success,
    shared: AR_COLORS.info,
    error: AR_COLORS.error,
  };
  return colors[status];
}

function getSharingLabel(status: AnchorSharingStatus): string {
  const labels: Record<AnchorSharingStatus, string> = {
    'not-shared': 'Not Shared',
    sharing: 'Sharing...',
    shared: 'Shared',
    error: 'Error',
  };
  return labels[status];
}

function getSharingColor(status: AnchorSharingStatus): string {
  const colors: Record<AnchorSharingStatus, string> = {
    'not-shared': AR_COLORS.textSecondary,
    sharing: AR_COLORS.warning,
    shared: AR_COLORS.info,
    error: AR_COLORS.error,
  };
  return colors[status];
}

function formatCoordinate(value: number, type: 'lat' | 'lng'): string {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = ((abs - deg) * 60).toFixed(4);
  const dir = type === 'lat' ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  return `${deg}\u00B0${min}' ${dir}`;
}

function formatAltitude(meters: number): string {
  return `${meters.toFixed(1)}m`;
}

function formatAccuracy(meters: number): string {
  if (meters < 1) return `${Math.round(meters * 100)}cm`;
  return `\u00B1${meters.toFixed(1)}m`;
}

function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// =============================================================================
// STYLES
// =============================================================================

const panelStyle: React.CSSProperties = {
  backgroundColor: AR_COLORS.panelBgTranslucent,
  borderRadius: '12px',
  padding: '16px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: AR_COLORS.textPrimary,
  border: `1px solid ${AR_COLORS.border}`,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  maxWidth: '380px',
  width: '100%',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: `${MIN_TAP_TARGET}px`,
  cursor: 'pointer',
  userSelect: 'none',
};

const titleStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
  margin: 0,
  letterSpacing: '0.02em',
};

const countBadgeStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  padding: '2px 8px',
  borderRadius: '10px',
  backgroundColor: AR_COLORS.accent,
  color: '#fff',
  fontWeight: 600,
  marginLeft: '8px',
};

const anchorListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginTop: '12px',
  maxHeight: '360px',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
};

const anchorCardStyle = (isSelected: boolean): React.CSSProperties => ({
  padding: '12px',
  backgroundColor: isSelected ? `${AR_COLORS.accent}15` : AR_COLORS.cardBg,
  border: `1.5px solid ${isSelected ? AR_COLORS.accent : AR_COLORS.border}`,
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  transition: 'border-color 0.15s ease, background-color 0.15s ease',
  cursor: 'pointer',
});

const anchorHeaderRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
};

const anchorLabelStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: AR_COLORS.textPrimary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
  minWidth: 0,
};

const trackedDotStyle = (isTracked: boolean): React.CSSProperties => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: isTracked ? AR_COLORS.success : AR_COLORS.error,
  flexShrink: 0,
});

const coordRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  padding: '6px 8px',
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  borderRadius: '4px',
  fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", monospace',
  fontSize: '0.72rem',
  color: AR_COLORS.textSecondary,
};

const statusRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
};

const statusBadgeStyle = (color: string): React.CSSProperties => ({
  fontSize: '0.65rem',
  padding: '2px 7px',
  borderRadius: '4px',
  backgroundColor: `${color}20`,
  border: `1px solid ${color}50`,
  color,
  fontWeight: 500,
});

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  marginTop: '4px',
};

const actionBtnStyle = (
  variant: 'persist' | 'share' | 'delete',
  disabled: boolean,
): React.CSSProperties => {
  const colorMap = {
    persist: AR_COLORS.success,
    share: AR_COLORS.info,
    delete: AR_COLORS.error,
  };
  const color = colorMap[variant];
  return {
    minWidth: `${MIN_TAP_TARGET}px`,
    minHeight: `${MIN_TAP_TARGET}px`,
    padding: '8px 12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    fontFamily: 'inherit',
    color: disabled ? AR_COLORS.textMuted : color,
    backgroundColor: disabled ? 'transparent' : `${color}15`,
    border: `1px solid ${disabled ? AR_COLORS.textMuted : `${color}50`}`,
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s ease',
    flex: '1 1 auto',
    textAlign: 'center' as const,
  };
};

const emptyStateStyle: React.CSSProperties = {
  padding: '24px',
  textAlign: 'center',
  color: AR_COLORS.textSecondary,
  fontSize: '0.85rem',
  backgroundColor: AR_COLORS.cardBg,
  borderRadius: '8px',
  marginTop: '12px',
};

const collapseIconStyle: React.CSSProperties = {
  fontSize: '1rem',
  color: AR_COLORS.textSecondary,
  transition: 'transform 0.2s ease',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const AnchorManagerPanel: React.FC<AnchorManagerPanelProps> = ({
  anchors,
  onPersist,
  onShare,
  onDelete,
  onSelect,
  selectedAnchorId,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleHeaderClick = useCallback(() => {
    onToggleCollapse?.();
  }, [onToggleCollapse]);

  const handleHeaderKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggleCollapse?.();
      }
    },
    [onToggleCollapse],
  );

  const handleAnchorClick = useCallback(
    (anchorId: string) => {
      onSelect?.(anchorId);
    },
    [onSelect],
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, anchorId: string) => {
      e.stopPropagation();
      if (confirmDeleteId === anchorId) {
        onDelete(anchorId);
        setConfirmDeleteId(null);
      } else {
        setConfirmDeleteId(anchorId);
      }
    },
    [confirmDeleteId, onDelete],
  );

  const trackedCount = useMemo(
    () => anchors.filter((a) => a.isTracked).length,
    [anchors],
  );

  return (
    <div
      style={panelStyle}
      role="region"
      aria-label="Anchor Manager"
      data-testid="anchor-manager-panel"
    >
      {/* Header */}
      <div
        style={headerStyle}
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-label={`Anchor Manager - ${anchors.length} anchors. ${collapsed ? 'Expand' : 'Collapse'}`}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h3 style={titleStyle}>Anchors</h3>
          {anchors.length > 0 && (
            <span style={countBadgeStyle}>{anchors.length}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {anchors.length > 0 && (
            <span style={{ fontSize: '0.7rem', color: AR_COLORS.textSecondary }}>
              {trackedCount}/{anchors.length} tracked
            </span>
          )}
          {onToggleCollapse && (
            <span
              style={{
                ...collapseIconStyle,
                transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              }}
              aria-hidden="true"
            >
              &#9660;
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <>
          {anchors.length === 0 ? (
            <div style={emptyStateStyle}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
                {'\u2316'}
              </div>
              <div>No anchors created</div>
              <div style={{ fontSize: '0.75rem', marginTop: '4px', color: AR_COLORS.textMuted }}>
                Use Tap to Place to create anchors on detected surfaces
              </div>
            </div>
          ) : (
            <div
              style={anchorListStyle}
              role="list"
              aria-label="Anchor list"
            >
              {anchors.map((anchor) => {
                const isSelected = anchor.anchorId === selectedAnchorId;
                const persistColor = getPersistenceColor(anchor.persistence);
                const shareColor = getSharingColor(anchor.sharing);
                const canPersist = anchor.persistence === 'local-only';
                const canShare =
                  anchor.persistence === 'persisted' && anchor.sharing === 'not-shared';
                const isDeleting = confirmDeleteId === anchor.anchorId;

                return (
                  <div
                    key={anchor.anchorId}
                    style={anchorCardStyle(isSelected)}
                    onClick={() => handleAnchorClick(anchor.anchorId)}
                    role="listitem"
                    tabIndex={0}
                    aria-label={`Anchor ${anchor.label}, ${anchor.isTracked ? 'tracked' : 'not tracked'}`}
                    data-testid={`anchor-item-${anchor.anchorId}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAnchorClick(anchor.anchorId);
                      }
                    }}
                  >
                    {/* Anchor header */}
                    <div style={anchorHeaderRowStyle}>
                      <span style={trackedDotStyle(anchor.isTracked)} aria-hidden="true" />
                      <span style={anchorLabelStyle} title={anchor.label}>
                        {anchor.label}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: AR_COLORS.textMuted }}>
                        {formatTimestamp(anchor.createdAt)}
                      </span>
                    </div>

                    {/* WGS84 Coordinates */}
                    <div style={coordRowStyle}>
                      <span>{formatCoordinate(anchor.latitude, 'lat')}, {formatCoordinate(anchor.longitude, 'lng')}</span>
                      <span>Alt: {formatAltitude(anchor.altitude)} | H: {formatAccuracy(anchor.horizontalAccuracy)}{anchor.verticalAccuracy !== null ? ` | V: ${formatAccuracy(anchor.verticalAccuracy)}` : ''}</span>
                    </div>

                    {/* Status badges */}
                    <div style={statusRowStyle}>
                      <span style={statusBadgeStyle(persistColor)}>
                        {getPersistenceLabel(anchor.persistence)}
                      </span>
                      <span style={statusBadgeStyle(shareColor)}>
                        {getSharingLabel(anchor.sharing)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={actionRowStyle}>
                      <button
                        style={actionBtnStyle('persist', !canPersist)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canPersist) onPersist(anchor.anchorId);
                        }}
                        disabled={!canPersist}
                        aria-label={`Persist anchor ${anchor.label}`}
                        data-testid={`persist-btn-${anchor.anchorId}`}
                      >
                        Save
                      </button>
                      <button
                        style={actionBtnStyle('share', !canShare)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canShare) onShare(anchor.anchorId);
                        }}
                        disabled={!canShare}
                        aria-label={`Share anchor ${anchor.label}`}
                        data-testid={`share-btn-${anchor.anchorId}`}
                      >
                        Share
                      </button>
                      <button
                        style={actionBtnStyle('delete', false)}
                        onClick={(e) => handleDeleteClick(e, anchor.anchorId)}
                        aria-label={
                          isDeleting
                            ? `Confirm delete anchor ${anchor.label}`
                            : `Delete anchor ${anchor.label}`
                        }
                        data-testid={`delete-btn-${anchor.anchorId}`}
                      >
                        {isDeleting ? 'Confirm?' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnchorManagerPanel;
