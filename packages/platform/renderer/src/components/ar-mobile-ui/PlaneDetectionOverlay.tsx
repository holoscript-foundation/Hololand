/**
 * PlaneDetectionOverlay Component
 *
 * Displays detected AR planes as visual indicators with classification-based
 * color coding: horizontal planes in green, vertical planes in blue.
 * Supports tap-to-place interaction for anchoring content to detected surfaces.
 *
 * Touch-friendly with minimum 44px tap targets per Apple HIG / WCAG.
 *
 * @module ar-mobile-ui/PlaneDetectionOverlay
 */

import React, { useCallback, useMemo } from 'react';
import type { DetectedPlane, PlaneClassification } from './types';
import { AR_COLORS, MIN_TAP_TARGET } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface PlaneDetectionOverlayProps {
  /** List of detected planes */
  planes: DetectedPlane[];
  /** Called when a plane is tapped for placement */
  onPlaceTap: (planeId: string, position: [number, number, number]) => void;
  /** Whether tap-to-place mode is active */
  tapToPlaceActive: boolean;
  /** Called to toggle tap-to-place mode */
  onToggleTapToPlace: () => void;
  /** Currently selected plane ID (if any) */
  selectedPlaneId?: string;
  /** Whether to show plane extent dimensions */
  showDimensions?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function getPlaneColor(classification: PlaneClassification): string {
  switch (classification) {
    case 'horizontal-up':
    case 'horizontal-down':
      return AR_COLORS.planeHorizontal;
    case 'vertical':
      return AR_COLORS.planeVertical;
    case 'unknown':
    default:
      return AR_COLORS.textSecondary;
  }
}

function getPlaneLabel(classification: PlaneClassification): string {
  const labels: Record<PlaneClassification, string> = {
    'horizontal-up': 'Floor / Table',
    'horizontal-down': 'Ceiling',
    vertical: 'Wall',
    unknown: 'Unknown',
  };
  return labels[classification];
}

function getPlaneIcon(classification: PlaneClassification): string {
  switch (classification) {
    case 'horizontal-up':
      return '\u2B1C'; // white large square
    case 'horizontal-down':
      return '\u2B1B'; // black large square
    case 'vertical':
      return '\u25AE'; // black vertical rectangle
    case 'unknown':
    default:
      return '\u25A1'; // white square
  }
}

function formatMeters(value: number): string {
  if (value < 1) return `${Math.round(value * 100)}cm`;
  return `${value.toFixed(1)}m`;
}

// =============================================================================
// STYLES
// =============================================================================

const overlayStyle: React.CSSProperties = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: AR_COLORS.textPrimary,
  maxWidth: '380px',
  width: '100%',
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '12px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
  margin: 0,
  letterSpacing: '0.02em',
};

const tapToPlaceButtonStyle = (active: boolean): React.CSSProperties => ({
  minWidth: `${MIN_TAP_TARGET}px`,
  minHeight: `${MIN_TAP_TARGET}px`,
  padding: '8px 16px',
  fontSize: '0.8rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  color: active ? '#fff' : AR_COLORS.textSecondary,
  backgroundColor: active ? AR_COLORS.accent : 'transparent',
  border: `1.5px solid ${active ? AR_COLORS.accent : AR_COLORS.textMuted}`,
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  userSelect: 'none',
});

const summaryRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginBottom: '12px',
  flexWrap: 'wrap',
};

const summaryBadgeStyle = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 10px',
  borderRadius: '6px',
  backgroundColor: `${color}20`,
  border: `1px solid ${color}50`,
  fontSize: '0.75rem',
  fontWeight: 600,
  color,
});

const planeListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  maxHeight: '260px',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
};

const planeItemStyle = (
  color: string,
  isSelected: boolean,
  isTapMode: boolean,
): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 12px',
  backgroundColor: isSelected ? `${color}15` : AR_COLORS.cardBg,
  border: `1.5px solid ${isSelected ? color : AR_COLORS.border}`,
  borderRadius: '8px',
  cursor: isTapMode ? 'pointer' : 'default',
  minHeight: `${MIN_TAP_TARGET}px`,
  transition: 'border-color 0.15s ease, background-color 0.15s ease',
  userSelect: 'none',
});

const planeColorDotStyle = (color: string): React.CSSProperties => ({
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  backgroundColor: color,
  flexShrink: 0,
  boxShadow: `0 0 6px ${color}80`,
});

const planeInfoStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  minWidth: 0,
};

const planeClassStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 600,
  color: AR_COLORS.textPrimary,
};

const planeDetailStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: AR_COLORS.textSecondary,
};

const trackingBadgeStyle = (tracked: boolean): React.CSSProperties => ({
  fontSize: '0.65rem',
  padding: '2px 6px',
  borderRadius: '4px',
  backgroundColor: tracked
    ? 'rgba(76, 175, 80, 0.15)'
    : 'rgba(136, 136, 136, 0.15)',
  color: tracked ? AR_COLORS.success : AR_COLORS.textMuted,
  fontWeight: 500,
  flexShrink: 0,
});

const emptyStateStyle: React.CSSProperties = {
  padding: '24px',
  textAlign: 'center',
  color: AR_COLORS.textSecondary,
  fontSize: '0.85rem',
  backgroundColor: AR_COLORS.cardBg,
  borderRadius: '8px',
};

const tapHintStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: AR_COLORS.accent,
  textAlign: 'center',
  padding: '8px',
  backgroundColor: `${AR_COLORS.accent}10`,
  borderRadius: '6px',
  fontWeight: 500,
};

// =============================================================================
// COMPONENT
// =============================================================================

export const PlaneDetectionOverlay: React.FC<PlaneDetectionOverlayProps> = ({
  planes,
  onPlaceTap,
  tapToPlaceActive,
  onToggleTapToPlace,
  selectedPlaneId,
  showDimensions = true,
}) => {
  const horizontalCount = useMemo(
    () => planes.filter((p) => p.classification === 'horizontal-up' || p.classification === 'horizontal-down').length,
    [planes],
  );
  const verticalCount = useMemo(
    () => planes.filter((p) => p.classification === 'vertical').length,
    [planes],
  );

  const handlePlaneClick = useCallback(
    (plane: DetectedPlane) => {
      if (tapToPlaceActive && plane.isTracked) {
        onPlaceTap(plane.planeId, plane.center);
      }
    },
    [tapToPlaceActive, onPlaceTap],
  );

  const handlePlaneKeyDown = useCallback(
    (e: React.KeyboardEvent, plane: DetectedPlane) => {
      if ((e.key === 'Enter' || e.key === ' ') && tapToPlaceActive && plane.isTracked) {
        e.preventDefault();
        onPlaceTap(plane.planeId, plane.center);
      }
    },
    [tapToPlaceActive, onPlaceTap],
  );

  return (
    <div
      style={overlayStyle}
      role="region"
      aria-label="Plane Detection"
      data-testid="plane-detection-overlay"
    >
      {/* Header */}
      <div style={headerRowStyle}>
        <h3 style={titleStyle}>Detected Planes</h3>
        <button
          style={tapToPlaceButtonStyle(tapToPlaceActive)}
          onClick={onToggleTapToPlace}
          aria-label={tapToPlaceActive ? 'Disable tap-to-place' : 'Enable tap-to-place'}
          aria-pressed={tapToPlaceActive}
          data-testid="tap-to-place-toggle"
        >
          {tapToPlaceActive ? 'Placing...' : 'Tap to Place'}
        </button>
      </div>

      {/* Summary */}
      {planes.length > 0 && (
        <div style={summaryRowStyle}>
          <span style={summaryBadgeStyle(AR_COLORS.planeHorizontal)}>
            {getPlaneIcon('horizontal-up')} {horizontalCount} Horizontal
          </span>
          <span style={summaryBadgeStyle(AR_COLORS.planeVertical)}>
            {getPlaneIcon('vertical')} {verticalCount} Vertical
          </span>
        </div>
      )}

      {/* Tap hint */}
      {tapToPlaceActive && planes.length > 0 && (
        <div style={tapHintStyle} role="status" aria-live="polite">
          Tap a tracked plane to place content
        </div>
      )}

      {/* Plane list */}
      {planes.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
            {'\u25A2'}
          </div>
          <div>Scanning for surfaces...</div>
          <div style={{ fontSize: '0.75rem', marginTop: '4px', color: AR_COLORS.textMuted }}>
            Move your device slowly to detect planes
          </div>
        </div>
      ) : (
        <div
          style={planeListStyle}
          role="listbox"
          aria-label="Detected planes list"
          aria-activedescendant={selectedPlaneId ? `plane-${selectedPlaneId}` : undefined}
        >
          {planes.map((plane) => {
            const color = getPlaneColor(plane.classification);
            const isSelected = plane.planeId === selectedPlaneId;
            return (
              <div
                key={plane.planeId}
                id={`plane-${plane.planeId}`}
                style={planeItemStyle(color, isSelected, tapToPlaceActive)}
                onClick={() => handlePlaneClick(plane)}
                onKeyDown={(e) => handlePlaneKeyDown(e, plane)}
                role="option"
                tabIndex={tapToPlaceActive ? 0 : -1}
                aria-selected={isSelected}
                aria-label={`${getPlaneLabel(plane.classification)} plane${showDimensions ? `, ${formatMeters(plane.extent[0])} x ${formatMeters(plane.extent[1])}` : ''}${plane.isTracked ? '' : ', not tracked'}`}
                data-testid={`plane-item-${plane.planeId}`}
              >
                <span style={planeColorDotStyle(color)} aria-hidden="true" />
                <div style={planeInfoStyle}>
                  <span style={planeClassStyle}>
                    {getPlaneLabel(plane.classification)}
                  </span>
                  {showDimensions && (
                    <span style={planeDetailStyle}>
                      {formatMeters(plane.extent[0])} x {formatMeters(plane.extent[1])}
                    </span>
                  )}
                </div>
                <span style={trackingBadgeStyle(plane.isTracked)}>
                  {plane.isTracked ? 'Tracked' : 'Lost'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlaneDetectionOverlay;
