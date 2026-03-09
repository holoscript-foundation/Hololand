/**
 * ARPerformanceMonitor Component
 *
 * Displays AR performance metrics including tracking quality,
 * point cloud density, FPS, battery usage, and thermal state.
 * Critical for monitoring AR session health on mobile devices.
 *
 * Touch-friendly with minimum 44px tap targets per Apple HIG / WCAG.
 *
 * @module ar-mobile-ui/ARPerformanceMonitor
 */

import React, { useMemo } from 'react';
import type { ARPerformanceInfo, TrackingQuality, ThermalState } from './types';
import { AR_COLORS, MIN_TAP_TARGET } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface ARPerformanceMonitorProps {
  /** Performance metrics */
  performance: ARPerformanceInfo;
  /** Whether the panel is collapsed */
  collapsed?: boolean;
  /** Called when user toggles collapse */
  onToggleCollapse?: () => void;
  /** Target FPS for performance comparison */
  targetFps?: number;
}

// =============================================================================
// HELPERS
// =============================================================================

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

function getThermalLabel(state: ThermalState): string {
  const labels: Record<ThermalState, string> = {
    nominal: 'Normal',
    fair: 'Warm',
    serious: 'Hot',
    critical: 'Critical',
  };
  return labels[state];
}

function getThermalColor(state: ThermalState): string {
  const colors: Record<ThermalState, string> = {
    nominal: AR_COLORS.success,
    fair: AR_COLORS.warning,
    serious: '#ff5722',
    critical: AR_COLORS.error,
  };
  return colors[state];
}

function getFpsColor(fps: number, target: number): string {
  const ratio = fps / target;
  if (ratio >= 0.9) return AR_COLORS.success;
  if (ratio >= 0.6) return AR_COLORS.warning;
  return AR_COLORS.error;
}

function getBatteryColor(level: number): string {
  if (level >= 0.5) return AR_COLORS.success;
  if (level >= 0.2) return AR_COLORS.warning;
  return AR_COLORS.error;
}

function formatMemory(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
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

const bodyStyle: React.CSSProperties = {
  marginTop: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const metricsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
};

const metricCardStyle: React.CSSProperties = {
  padding: '10px',
  backgroundColor: AR_COLORS.cardBg,
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 500,
  color: AR_COLORS.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const metricValueStyle = (color?: string): React.CSSProperties => ({
  fontSize: '1.1rem',
  fontWeight: 700,
  color: color ?? AR_COLORS.textPrimary,
  fontVariantNumeric: 'tabular-nums',
});

const metricSubStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  color: AR_COLORS.textMuted,
};

const barContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  backgroundColor: AR_COLORS.border,
  borderRadius: '2px',
  overflow: 'hidden',
  marginTop: '2px',
};

const barFillStyle = (percent: number, color: string): React.CSSProperties => ({
  width: `${Math.min(100, Math.max(0, percent))}%`,
  height: '100%',
  backgroundColor: color,
  borderRadius: '2px',
  transition: 'width 0.3s ease, background-color 0.3s ease',
});

const wideMetricStyle: React.CSSProperties = {
  ...metricCardStyle,
  gridColumn: '1 / -1',
};

const statusRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
  gridColumn: '1 / -1',
};

const statusBadgeStyle = (color: string): React.CSSProperties => ({
  fontSize: '0.68rem',
  padding: '3px 8px',
  borderRadius: '4px',
  backgroundColor: `${color}20`,
  border: `1px solid ${color}50`,
  color,
  fontWeight: 600,
});

const thermalBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '3px',
  marginTop: '4px',
};

const thermalSegmentStyle = (
  index: number,
  activeLevel: number,
  colors: string[],
): React.CSSProperties => ({
  flex: 1,
  height: '6px',
  borderRadius: '3px',
  backgroundColor: index <= activeLevel ? colors[index] : AR_COLORS.border,
  transition: 'background-color 0.3s ease',
});

const batteryContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const batteryOutlineStyle: React.CSSProperties = {
  width: '32px',
  height: '14px',
  border: `1.5px solid ${AR_COLORS.textSecondary}`,
  borderRadius: '3px',
  position: 'relative',
  flexShrink: 0,
};

const batteryCapStyle: React.CSSProperties = {
  width: '3px',
  height: '6px',
  backgroundColor: AR_COLORS.textSecondary,
  borderRadius: '0 1px 1px 0',
  position: 'absolute',
  right: '-5px',
  top: '50%',
  transform: 'translateY(-50%)',
};

const batteryFillStyle = (level: number, color: string): React.CSSProperties => ({
  width: `${Math.round(level * 100)}%`,
  height: '100%',
  backgroundColor: color,
  borderRadius: '2px',
  transition: 'width 0.3s ease, background-color 0.3s ease',
});

const collapseIconStyle: React.CSSProperties = {
  fontSize: '1rem',
  color: AR_COLORS.textSecondary,
  transition: 'transform 0.2s ease',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const ARPerformanceMonitor: React.FC<ARPerformanceMonitorProps> = ({
  performance: perf,
  collapsed = false,
  onToggleCollapse,
  targetFps = 60,
}) => {
  const fpsColor = useMemo(() => getFpsColor(perf.fps, targetFps), [perf.fps, targetFps]);
  const trackingColor = useMemo(() => getTrackingColor(perf.trackingQuality), [perf.trackingQuality]);
  const thermalColor = useMemo(() => getThermalColor(perf.thermalState), [perf.thermalState]);
  const batteryColor = useMemo(() => getBatteryColor(perf.battery.level), [perf.battery.level]);

  const thermalLevel = useMemo(() => {
    const levels: Record<ThermalState, number> = {
      nominal: 0,
      fair: 1,
      serious: 2,
      critical: 3,
    };
    return levels[perf.thermalState];
  }, [perf.thermalState]);

  const thermalColors = [AR_COLORS.success, AR_COLORS.warning, '#ff5722', AR_COLORS.error];

  const handleHeaderClick = () => onToggleCollapse?.();
  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleCollapse?.();
    }
  };

  return (
    <div
      style={panelStyle}
      role="region"
      aria-label="AR Performance Monitor"
      data-testid="ar-performance-monitor"
    >
      {/* Header */}
      <div
        style={headerStyle}
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-label={`AR Performance - ${perf.fps} FPS. ${collapsed ? 'Expand' : 'Collapse'}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={titleStyle}>Performance</h3>
          {/* Compact FPS in header */}
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: fpsColor,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.round(perf.fps)} FPS
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
          <div style={metricsGridStyle}>
            {/* FPS */}
            <div style={metricCardStyle}>
              <span style={metricLabelStyle}>Frame Rate</span>
              <span style={metricValueStyle(fpsColor)}>
                {Math.round(perf.fps)}
              </span>
              <span style={metricSubStyle}>
                avg {Math.round(perf.averageFps)} / target {targetFps}
              </span>
              <div style={barContainerStyle}>
                <div
                  style={barFillStyle((perf.fps / targetFps) * 100, fpsColor)}
                  role="progressbar"
                  aria-valuenow={Math.round(perf.fps)}
                  aria-valuemin={0}
                  aria-valuemax={targetFps}
                  aria-label="Frame rate"
                />
              </div>
            </div>

            {/* Tracking Quality */}
            <div style={metricCardStyle}>
              <span style={metricLabelStyle}>Tracking</span>
              <span style={metricValueStyle(trackingColor)}>
                {getTrackingLabel(perf.trackingQuality)}
              </span>
              <span style={metricSubStyle}>
                {perf.featurePointCount.toLocaleString()} features
              </span>
            </div>

            {/* Point Cloud */}
            <div style={metricCardStyle}>
              <span style={metricLabelStyle}>Point Cloud</span>
              <span style={metricValueStyle()}>
                {perf.pointCloudDensity.toFixed(1)}
              </span>
              <span style={metricSubStyle}>pts/m{'\u00B3'}</span>
            </div>

            {/* Memory */}
            <div style={metricCardStyle}>
              <span style={metricLabelStyle}>Memory</span>
              <span style={metricValueStyle()}>
                {formatMemory(perf.memoryUsageMB)}
              </span>
              <span style={metricSubStyle}>in use</span>
            </div>

            {/* CPU */}
            <div style={metricCardStyle}>
              <span style={metricLabelStyle}>CPU</span>
              <span style={metricValueStyle(
                perf.cpuUsage > 80 ? AR_COLORS.error :
                perf.cpuUsage > 50 ? AR_COLORS.warning :
                AR_COLORS.textPrimary
              )}>
                {Math.round(perf.cpuUsage)}%
              </span>
              <div style={barContainerStyle}>
                <div
                  style={barFillStyle(
                    perf.cpuUsage,
                    perf.cpuUsage > 80 ? AR_COLORS.error :
                    perf.cpuUsage > 50 ? AR_COLORS.warning :
                    AR_COLORS.success,
                  )}
                  role="progressbar"
                  aria-valuenow={Math.round(perf.cpuUsage)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="CPU usage"
                />
              </div>
            </div>

            {/* GPU (if available) */}
            <div style={metricCardStyle}>
              <span style={metricLabelStyle}>GPU</span>
              {perf.gpuUsage !== null ? (
                <>
                  <span style={metricValueStyle(
                    perf.gpuUsage > 80 ? AR_COLORS.error :
                    perf.gpuUsage > 50 ? AR_COLORS.warning :
                    AR_COLORS.textPrimary
                  )}>
                    {Math.round(perf.gpuUsage)}%
                  </span>
                  <div style={barContainerStyle}>
                    <div
                      style={barFillStyle(
                        perf.gpuUsage,
                        perf.gpuUsage > 80 ? AR_COLORS.error :
                        perf.gpuUsage > 50 ? AR_COLORS.warning :
                        AR_COLORS.success,
                      )}
                      role="progressbar"
                      aria-valuenow={Math.round(perf.gpuUsage)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="GPU usage"
                    />
                  </div>
                </>
              ) : (
                <span style={metricValueStyle(AR_COLORS.textMuted)}>N/A</span>
              )}
            </div>

            {/* Thermal State */}
            <div style={wideMetricStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={metricLabelStyle}>Thermal State</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: thermalColor }}>
                  {getThermalLabel(perf.thermalState)}
                </span>
              </div>
              <div style={thermalBarStyle}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={`thermal-${i}`}
                    style={thermalSegmentStyle(i, thermalLevel, thermalColors)}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>

            {/* Battery */}
            <div style={wideMetricStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={metricLabelStyle}>Battery</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: batteryColor }}>
                  {Math.round(perf.battery.level * 100)}%
                  {perf.battery.isCharging ? ' (Charging)' : ''}
                </span>
              </div>
              <div style={batteryContainerStyle}>
                <div style={batteryOutlineStyle}>
                  <div style={batteryFillStyle(perf.battery.level, batteryColor)} />
                  <div style={batteryCapStyle} aria-hidden="true" />
                </div>
                <div style={{ ...barContainerStyle, flex: 1 }}>
                  <div
                    style={barFillStyle(perf.battery.level * 100, batteryColor)}
                    role="progressbar"
                    aria-valuenow={Math.round(perf.battery.level * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Battery level"
                  />
                </div>
              </div>
            </div>

            {/* Active Resources */}
            <div style={statusRowStyle}>
              <span style={statusBadgeStyle(AR_COLORS.accent)}>
                {perf.activeAnchors} Anchors
              </span>
              <span style={statusBadgeStyle(AR_COLORS.info)}>
                {perf.detectedPlanes} Planes
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARPerformanceMonitor;
