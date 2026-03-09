/**
 * GeospatialDebugOverlay Component
 *
 * Debug overlay displaying GPS accuracy, VPS status, compass heading,
 * and ENU (East-North-Up) coordinate information. Designed for
 * development and QA workflows on mobile AR devices.
 *
 * Touch-friendly with minimum 44px tap targets per Apple HIG / WCAG.
 *
 * @module ar-mobile-ui/GeospatialDebugOverlay
 */

import React, { useMemo } from 'react';
import type { GeospatialDebugInfo } from './types';
import { AR_COLORS, MIN_TAP_TARGET } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface GeospatialDebugOverlayProps {
  /** Geospatial debug information */
  info: GeospatialDebugInfo;
  /** Whether the overlay is visible */
  visible: boolean;
  /** Called when user toggles visibility */
  onToggleVisibility: () => void;
  /** Whether to show compact mode (reduced info) */
  compact?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function getVpsStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    unavailable: 'Unavailable',
    initializing: 'Initializing',
    tracking: 'Tracking',
    error: 'Error',
  };
  return labels[status] ?? status;
}

function getVpsStatusColor(status: string): string {
  const colors: Record<string, string> = {
    unavailable: AR_COLORS.textMuted,
    initializing: AR_COLORS.warning,
    tracking: AR_COLORS.success,
    error: AR_COLORS.error,
  };
  return colors[status] ?? AR_COLORS.textMuted;
}

function formatGpsCoord(value: number, type: 'lat' | 'lng'): string {
  const abs = Math.abs(value);
  const dir = type === 'lat' ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
  return `${abs.toFixed(6)}\u00B0 ${dir}`;
}

function formatHeading(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return `${Math.round(degrees)}\u00B0 ${directions[index]}`;
}

function getAccuracyColor(meters: number): string {
  if (meters <= 3) return AR_COLORS.success;
  if (meters <= 10) return AR_COLORS.warning;
  return AR_COLORS.error;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return AR_COLORS.success;
  if (confidence >= 0.5) return AR_COLORS.warning;
  return AR_COLORS.error;
}

// =============================================================================
// STYLES
// =============================================================================

const overlayContainerStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", monospace',
  color: AR_COLORS.textPrimary,
  maxWidth: '380px',
  width: '100%',
};

const toggleButtonStyle: React.CSSProperties = {
  minWidth: `${MIN_TAP_TARGET}px`,
  minHeight: `${MIN_TAP_TARGET}px`,
  padding: '10px 16px',
  fontSize: '0.8rem',
  fontWeight: 600,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: AR_COLORS.textSecondary,
  backgroundColor: AR_COLORS.panelBgTranslucent,
  border: `1px solid ${AR_COLORS.border}`,
  borderRadius: '8px',
  cursor: 'pointer',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  transition: 'all 0.15s ease',
  userSelect: 'none',
};

const debugPanelStyle: React.CSSProperties = {
  backgroundColor: AR_COLORS.panelBgTranslucent,
  borderRadius: '12px',
  padding: '12px',
  border: `1px solid ${AR_COLORS.border}`,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  fontWeight: 700,
  color: AR_COLORS.accent,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  marginBottom: '2px',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '2px 0',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: AR_COLORS.textSecondary,
  fontWeight: 500,
};

const valueStyle = (color?: string): React.CSSProperties => ({
  fontSize: '0.72rem',
  fontWeight: 600,
  color: color ?? AR_COLORS.textPrimary,
  textAlign: 'right',
});

const dividerStyle: React.CSSProperties = {
  height: '1px',
  backgroundColor: AR_COLORS.border,
  margin: '4px 0',
};

const compassContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  padding: '8px',
  backgroundColor: AR_COLORS.cardBg,
  borderRadius: '8px',
};

const compassCircleStyle = (heading: number): React.CSSProperties => ({
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  border: `2px solid ${AR_COLORS.border}`,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

const compassNeedleStyle = (heading: number): React.CSSProperties => ({
  width: '2px',
  height: '18px',
  backgroundColor: AR_COLORS.error,
  position: 'absolute',
  top: '5px',
  left: '50%',
  transformOrigin: 'bottom center',
  transform: `translateX(-50%) rotate(${-heading}deg)`,
  borderRadius: '1px',
  transition: 'transform 0.3s ease',
});

const compassInfoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const confidenceBarContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  backgroundColor: AR_COLORS.border,
  borderRadius: '2px',
  overflow: 'hidden',
  marginTop: '4px',
};

const confidenceBarFillStyle = (confidence: number, color: string): React.CSSProperties => ({
  width: `${Math.round(confidence * 100)}%`,
  height: '100%',
  backgroundColor: color,
  borderRadius: '2px',
  transition: 'width 0.3s ease, background-color 0.3s ease',
});

// =============================================================================
// COMPONENT
// =============================================================================

export const GeospatialDebugOverlay: React.FC<GeospatialDebugOverlayProps> = ({
  info,
  visible,
  onToggleVisibility,
  compact = false,
}) => {
  const gpsAccuracyColor = useMemo(() => getAccuracyColor(info.gpsAccuracy), [info.gpsAccuracy]);
  const vpsColor = useMemo(() => getVpsStatusColor(info.vpsStatus), [info.vpsStatus]);
  const confidenceColor = useMemo(() => getConfidenceColor(info.confidence), [info.confidence]);

  return (
    <div
      style={overlayContainerStyle}
      role="region"
      aria-label="Geospatial Debug Overlay"
      data-testid="geospatial-debug-overlay"
    >
      {/* Toggle */}
      <button
        style={toggleButtonStyle}
        onClick={onToggleVisibility}
        aria-label={visible ? 'Hide geospatial debug info' : 'Show geospatial debug info'}
        aria-pressed={visible}
        data-testid="geo-debug-toggle"
      >
        {visible ? 'Hide Debug' : 'Geo Debug'}
      </button>

      {/* Debug Panel */}
      {visible && (
        <div style={{ ...debugPanelStyle, marginTop: '8px' }}>
          {/* GPS Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>GPS Position</div>
            <div style={rowStyle}>
              <span style={labelStyle}>Latitude</span>
              <span style={valueStyle()}>
                {formatGpsCoord(info.latitude, 'lat')}
              </span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Longitude</span>
              <span style={valueStyle()}>
                {formatGpsCoord(info.longitude, 'lng')}
              </span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Altitude</span>
              <span style={valueStyle()}>
                {info.altitude.toFixed(1)}m
              </span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Accuracy</span>
              <span style={valueStyle(gpsAccuracyColor)}>
                \u00B1{info.gpsAccuracy.toFixed(1)}m
              </span>
            </div>
          </div>

          <div style={dividerStyle} />

          {/* VPS Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>VPS Status</div>
            <div style={rowStyle}>
              <span style={labelStyle}>Status</span>
              <span style={valueStyle(vpsColor)}>
                {getVpsStatusLabel(info.vpsStatus)}
              </span>
            </div>
            {info.vpsAccuracy !== null && (
              <div style={rowStyle}>
                <span style={labelStyle}>VPS Accuracy</span>
                <span style={valueStyle(getAccuracyColor(info.vpsAccuracy))}>
                  \u00B1{info.vpsAccuracy.toFixed(2)}m
                </span>
              </div>
            )}
            <div style={rowStyle}>
              <span style={labelStyle}>Confidence</span>
              <span style={valueStyle(confidenceColor)}>
                {Math.round(info.confidence * 100)}%
              </span>
            </div>
            <div style={confidenceBarContainerStyle}>
              <div
                style={confidenceBarFillStyle(info.confidence, confidenceColor)}
                role="progressbar"
                aria-valuenow={Math.round(info.confidence * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Geospatial confidence"
              />
            </div>
          </div>

          <div style={dividerStyle} />

          {/* Compass Section */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Compass Heading</div>
            <div style={compassContainerStyle}>
              <div style={compassCircleStyle(info.compass.trueHeading)}>
                <div style={compassNeedleStyle(info.compass.trueHeading)} />
                <span
                  style={{
                    fontSize: '0.55rem',
                    color: AR_COLORS.textMuted,
                    position: 'absolute',
                    top: '-2px',
                    fontWeight: 700,
                  }}
                >
                  N
                </span>
              </div>
              <div style={compassInfoStyle}>
                <div style={rowStyle}>
                  <span style={labelStyle}>True</span>
                  <span style={valueStyle()}>
                    {formatHeading(info.compass.trueHeading)}
                  </span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>Magnetic</span>
                  <span style={valueStyle()}>
                    {formatHeading(info.compass.magnetic)}
                  </span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>Accuracy</span>
                  <span style={valueStyle()}>
                    \u00B1{info.compass.accuracy.toFixed(1)}\u00B0
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ENU Section */}
          {!compact && (
            <>
              <div style={dividerStyle} />
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>ENU Local Position</div>
                <div style={rowStyle}>
                  <span style={labelStyle}>East</span>
                  <span style={valueStyle()}>
                    {info.enuPosition.east.toFixed(3)}m
                  </span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>North</span>
                  <span style={valueStyle()}>
                    {info.enuPosition.north.toFixed(3)}m
                  </span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>Up</span>
                  <span style={valueStyle()}>
                    {info.enuPosition.up.toFixed(3)}m
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GeospatialDebugOverlay;
