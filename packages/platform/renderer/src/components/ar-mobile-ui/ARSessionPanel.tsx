/**
 * ARSessionPanel Component
 *
 * Mobile AR session controls for starting, stopping, and pausing
 * AR sessions. Displays tracking state, environment understanding
 * info, and permission status.
 *
 * Touch-friendly with minimum 44px tap targets per Apple HIG / WCAG.
 *
 * @module ar-mobile-ui/ARSessionPanel
 */

import React, { useCallback, useMemo } from 'react';
import type { ARSessionInfo, ARSessionStatus, TrackingQuality } from './types';
import { AR_COLORS, MIN_TAP_TARGET } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface ARSessionPanelProps {
  /** Current AR session information */
  session: ARSessionInfo;
  /** Called when user taps Start */
  onStart: () => void;
  /** Called when user taps Stop */
  onStop: () => void;
  /** Called when user taps Pause */
  onPause: () => void;
  /** Called when user taps Resume */
  onResume: () => void;
  /** Whether the panel is collapsed */
  collapsed?: boolean;
  /** Called when user toggles collapse */
  onToggleCollapse?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getStatusLabel(status: ARSessionStatus): string {
  const labels: Record<ARSessionStatus, string> = {
    inactive: 'Inactive',
    initializing: 'Initializing...',
    active: 'Active',
    paused: 'Paused',
    error: 'Error',
  };
  return labels[status];
}

function getStatusColor(status: ARSessionStatus): string {
  const colors: Record<ARSessionStatus, string> = {
    inactive: AR_COLORS.textMuted,
    initializing: AR_COLORS.warning,
    active: AR_COLORS.success,
    paused: AR_COLORS.warning,
    error: AR_COLORS.error,
  };
  return colors[status];
}

function getTrackingLabel(quality: TrackingQuality): string {
  const labels: Record<TrackingQuality, string> = {
    'not-available': 'Not Available',
    limited: 'Limited',
    normal: 'Normal',
    'excessive-motion': 'Excessive Motion',
    'insufficient-features': 'Low Features',
  };
  return labels[quality];
}

function getTrackingColor(quality: TrackingQuality): string {
  const colors: Record<TrackingQuality, string> = {
    'not-available': AR_COLORS.textMuted,
    limited: AR_COLORS.warning,
    normal: AR_COLORS.success,
    'excessive-motion': AR_COLORS.error,
    'insufficient-features': AR_COLORS.warning,
  };
  return colors[quality];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getWorldMappingLabel(status: string): string {
  const labels: Record<string, string> = {
    'not-available': 'Not Available',
    limited: 'Limited',
    extending: 'Extending',
    mapped: 'Mapped',
  };
  return labels[status] ?? status;
}

function getWorldMappingColor(status: string): string {
  const colors: Record<string, string> = {
    'not-available': AR_COLORS.textMuted,
    limited: AR_COLORS.warning,
    extending: AR_COLORS.info,
    mapped: AR_COLORS.success,
  };
  return colors[status] ?? AR_COLORS.textMuted;
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

const statusDotStyle = (color: string): React.CSSProperties => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: color,
  display: 'inline-block',
  marginRight: '8px',
  flexShrink: 0,
});

const bodyStyle: React.CSSProperties = {
  marginTop: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const controlsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
};

const buttonStyle = (
  variant: 'primary' | 'secondary' | 'danger',
  disabled: boolean,
): React.CSSProperties => {
  const bgMap = {
    primary: AR_COLORS.accent,
    secondary: 'transparent',
    danger: AR_COLORS.error,
  };
  const borderMap = {
    primary: AR_COLORS.accent,
    secondary: AR_COLORS.textMuted,
    danger: AR_COLORS.error,
  };
  return {
    minWidth: `${MIN_TAP_TARGET}px`,
    minHeight: `${MIN_TAP_TARGET}px`,
    padding: '10px 18px',
    fontSize: '0.85rem',
    fontWeight: 600,
    fontFamily: 'inherit',
    color: disabled ? AR_COLORS.textMuted : '#fff',
    backgroundColor: disabled ? 'transparent' : bgMap[variant],
    border: `1.5px solid ${disabled ? AR_COLORS.textMuted : borderMap[variant]}`,
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s ease',
    flex: '1 1 auto',
    textAlign: 'center' as const,
  };
};

const infoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
};

const infoItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  padding: '8px',
  backgroundColor: AR_COLORS.cardBg,
  borderRadius: '6px',
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 500,
  color: AR_COLORS.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const infoValueStyle = (color?: string): React.CSSProperties => ({
  fontSize: '0.85rem',
  fontWeight: 600,
  color: color ?? AR_COLORS.textPrimary,
});

const permissionBadgeStyle = (granted: boolean): React.CSSProperties => ({
  fontSize: '0.7rem',
  padding: '3px 8px',
  borderRadius: '4px',
  backgroundColor: granted
    ? 'rgba(76, 175, 80, 0.15)'
    : 'rgba(244, 67, 54, 0.15)',
  border: `1px solid ${granted ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`,
  color: granted ? AR_COLORS.success : AR_COLORS.error,
  fontWeight: 500,
});

const collapseIconStyle: React.CSSProperties = {
  fontSize: '1rem',
  color: AR_COLORS.textSecondary,
  transition: 'transform 0.2s ease',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const ARSessionPanel: React.FC<ARSessionPanelProps> = ({
  session,
  onStart,
  onStop,
  onPause,
  onResume,
  collapsed = false,
  onToggleCollapse,
}) => {
  const statusColor = useMemo(() => getStatusColor(session.status), [session.status]);
  const trackingColor = useMemo(() => getTrackingColor(session.trackingQuality), [session.trackingQuality]);
  const worldMappingColor = useMemo(
    () => getWorldMappingColor(session.environment.worldMappingStatus),
    [session.environment.worldMappingStatus],
  );

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

  const isActive = session.status === 'active';
  const isPaused = session.status === 'paused';
  const isInactive = session.status === 'inactive';
  const canStart = isInactive && session.cameraPermission;

  return (
    <div
      style={panelStyle}
      role="region"
      aria-label="AR Session Controls"
      data-testid="ar-session-panel"
    >
      {/* Header */}
      <div
        style={headerStyle}
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-label={`AR Session - ${getStatusLabel(session.status)}. ${collapsed ? 'Expand' : 'Collapse'}`}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={statusDotStyle(statusColor)} aria-hidden="true" />
          <h3 style={titleStyle}>AR Session</h3>
          <span
            style={{
              marginLeft: '8px',
              fontSize: '0.75rem',
              color: statusColor,
              fontWeight: 500,
            }}
          >
            {getStatusLabel(session.status)}
          </span>
        </div>
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

      {/* Body */}
      {!collapsed && (
        <div style={bodyStyle}>
          {/* Controls */}
          <div style={controlsRowStyle}>
            {isInactive && (
              <button
                style={buttonStyle('primary', !canStart)}
                onClick={onStart}
                disabled={!canStart}
                aria-label="Start AR session"
                data-testid="ar-start-btn"
              >
                Start
              </button>
            )}
            {isActive && (
              <>
                <button
                  style={buttonStyle('secondary', false)}
                  onClick={onPause}
                  aria-label="Pause AR session"
                  data-testid="ar-pause-btn"
                >
                  Pause
                </button>
                <button
                  style={buttonStyle('danger', false)}
                  onClick={onStop}
                  aria-label="Stop AR session"
                  data-testid="ar-stop-btn"
                >
                  Stop
                </button>
              </>
            )}
            {isPaused && (
              <>
                <button
                  style={buttonStyle('primary', false)}
                  onClick={onResume}
                  aria-label="Resume AR session"
                  data-testid="ar-resume-btn"
                >
                  Resume
                </button>
                <button
                  style={buttonStyle('danger', false)}
                  onClick={onStop}
                  aria-label="Stop AR session"
                  data-testid="ar-stop-btn"
                >
                  Stop
                </button>
              </>
            )}
          </div>

          {/* Info Grid */}
          <div style={infoGridStyle}>
            <div style={infoItemStyle}>
              <span style={infoLabelStyle}>Tracking</span>
              <span style={infoValueStyle(trackingColor)}>
                {getTrackingLabel(session.trackingQuality)}
              </span>
            </div>
            <div style={infoItemStyle}>
              <span style={infoLabelStyle}>Duration</span>
              <span style={infoValueStyle()}>
                {formatDuration(session.sessionDurationSec)}
              </span>
            </div>
            <div style={infoItemStyle}>
              <span style={infoLabelStyle}>World Map</span>
              <span style={infoValueStyle(worldMappingColor)}>
                {getWorldMappingLabel(session.environment.worldMappingStatus)}
              </span>
            </div>
            <div style={infoItemStyle}>
              <span style={infoLabelStyle}>Features</span>
              <span style={infoValueStyle()}>
                {session.environment.featurePointCount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Environment Info */}
          <div style={infoItemStyle}>
            <span style={infoLabelStyle}>Ambient Light</span>
            <span style={infoValueStyle()}>
              {Math.round(session.environment.ambientLightLux)} lux
            </span>
          </div>

          {/* Permissions */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={permissionBadgeStyle(session.cameraPermission)}>
              Camera {session.cameraPermission ? 'Granted' : 'Required'}
            </span>
            <span style={permissionBadgeStyle(session.locationPermission)}>
              Location {session.locationPermission ? 'Granted' : 'Required'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARSessionPanel;
