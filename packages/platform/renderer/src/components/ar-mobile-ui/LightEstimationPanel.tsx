/**
 * LightEstimationPanel Component
 *
 * Displays AR light estimation data including ambient light intensity,
 * color temperature, and directional light information. Helps developers
 * and artists match virtual lighting to the real environment.
 *
 * Touch-friendly with minimum 44px tap targets per Apple HIG / WCAG.
 *
 * @module ar-mobile-ui/LightEstimationPanel
 */

import React, { useMemo } from 'react';
import type { LightEstimationInfo } from './types';
import { AR_COLORS, MIN_TAP_TARGET } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface LightEstimationPanelProps {
  /** Light estimation data */
  lightInfo: LightEstimationInfo;
  /** Whether the panel is collapsed */
  collapsed?: boolean;
  /** Called when user toggles collapse */
  onToggleCollapse?: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function getIntensityLabel(lux: number): string {
  if (lux < 50) return 'Very Dark';
  if (lux < 200) return 'Dim';
  if (lux < 500) return 'Indoor';
  if (lux < 1000) return 'Bright Indoor';
  if (lux < 10000) return 'Overcast';
  if (lux < 25000) return 'Daylight';
  return 'Direct Sun';
}

function getIntensityColor(lux: number): string {
  if (lux < 50) return '#616161';
  if (lux < 200) return '#9e9e9e';
  if (lux < 500) return '#bdbdbd';
  if (lux < 1000) return '#e0e0e0';
  if (lux < 10000) return '#fff59d';
  if (lux < 25000) return '#ffee58';
  return '#fdd835';
}

function getTemperatureLabel(kelvin: number): string {
  if (kelvin < 2700) return 'Warm (Candle)';
  if (kelvin < 3500) return 'Warm White';
  if (kelvin < 4500) return 'Neutral White';
  if (kelvin < 5500) return 'Daylight';
  if (kelvin < 6500) return 'Cool Daylight';
  return 'Cool Blue';
}

function kelvinToColor(kelvin: number): string {
  // Approximate color temperature to RGB (simplified Planckian locus)
  const temp = kelvin / 100;
  let r: number, g: number, b: number;

  if (temp <= 66) {
    r = 255;
    g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
    b = temp <= 19
      ? 0
      : Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
  } else {
    r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
    g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
    b = 255;
  }

  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function formatDirection(dir: [number, number, number]): string {
  return `(${dir[0].toFixed(2)}, ${dir[1].toFixed(2)}, ${dir[2].toFixed(2)})`;
}

function normalizeIntensityForBar(lux: number): number {
  // Logarithmic scale: 0-100000 lux mapped to 0-1
  if (lux <= 0) return 0;
  return Math.min(1, Math.log10(lux) / 5); // log10(100000) = 5
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
  gap: '12px',
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: '10px',
  backgroundColor: AR_COLORS.cardBg,
  borderRadius: '8px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 600,
  color: AR_COLORS.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: AR_COLORS.textSecondary,
};

const valueStyle = (color?: string): React.CSSProperties => ({
  fontSize: '0.85rem',
  fontWeight: 600,
  color: color ?? AR_COLORS.textPrimary,
});

const barContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  backgroundColor: AR_COLORS.border,
  borderRadius: '3px',
  overflow: 'hidden',
};

const barFillStyle = (percent: number, color: string): React.CSSProperties => ({
  width: `${Math.round(percent * 100)}%`,
  height: '100%',
  backgroundColor: color,
  borderRadius: '3px',
  transition: 'width 0.3s ease',
});

const colorSwatchStyle = (color: string): React.CSSProperties => ({
  width: '20px',
  height: '20px',
  borderRadius: '4px',
  backgroundColor: color,
  border: `1px solid rgba(255, 255, 255, 0.2)`,
  flexShrink: 0,
});

const temperatureGradientStyle: React.CSSProperties = {
  width: '100%',
  height: '8px',
  borderRadius: '4px',
  background: 'linear-gradient(to right, #ff8a50, #ffb74d, #fff9c4, #e3f2fd, #90caf9)',
  position: 'relative',
};

const temperatureMarkerStyle = (kelvin: number): React.CSSProperties => {
  // Map 1000K-10000K to 0-100%
  const percent = Math.min(100, Math.max(0, ((kelvin - 1000) / 9000) * 100));
  return {
    position: 'absolute',
    top: '-3px',
    left: `${percent}%`,
    width: '4px',
    height: '14px',
    backgroundColor: '#fff',
    borderRadius: '2px',
    border: '1px solid rgba(0,0,0,0.3)',
    transform: 'translateX(-50%)',
    transition: 'left 0.3s ease',
  };
};

const directionalLightContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const lightDirectionVisualStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  border: `1.5px solid ${AR_COLORS.border}`,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  backgroundColor: 'rgba(0,0,0,0.2)',
};

const inactiveBadgeStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  padding: '4px 10px',
  borderRadius: '6px',
  backgroundColor: 'rgba(136, 136, 136, 0.15)',
  color: AR_COLORS.textMuted,
  fontWeight: 500,
  textAlign: 'center',
};

const collapseIconStyle: React.CSSProperties = {
  fontSize: '1rem',
  color: AR_COLORS.textSecondary,
  transition: 'transform 0.2s ease',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const LightEstimationPanel: React.FC<LightEstimationPanelProps> = ({
  lightInfo,
  collapsed = false,
  onToggleCollapse,
}) => {
  const intensityColor = useMemo(
    () => getIntensityColor(lightInfo.ambientIntensity),
    [lightInfo.ambientIntensity],
  );
  const tempColor = useMemo(
    () => kelvinToColor(lightInfo.colorTemperature),
    [lightInfo.colorTemperature],
  );
  const intensityNormalized = useMemo(
    () => normalizeIntensityForBar(lightInfo.ambientIntensity),
    [lightInfo.ambientIntensity],
  );

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
      aria-label="Light Estimation"
      data-testid="light-estimation-panel"
    >
      {/* Header */}
      <div
        style={headerStyle}
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-label={`Light Estimation${!lightInfo.isActive ? ' - Inactive' : ''}. ${collapsed ? 'Expand' : 'Collapse'}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={titleStyle}>Light Estimation</h3>
          {!lightInfo.isActive && (
            <span style={inactiveBadgeStyle}>Inactive</span>
          )}
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
      {!collapsed && lightInfo.isActive && (
        <div style={bodyStyle}>
          {/* Ambient Intensity */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Ambient Intensity</div>
            <div style={rowStyle}>
              <span style={labelStyle}>
                {getIntensityLabel(lightInfo.ambientIntensity)}
              </span>
              <span style={valueStyle(intensityColor)}>
                {Math.round(lightInfo.ambientIntensity)} lux
              </span>
            </div>
            <div style={barContainerStyle}>
              <div
                style={barFillStyle(intensityNormalized, intensityColor)}
                role="progressbar"
                aria-valuenow={Math.round(lightInfo.ambientIntensity)}
                aria-valuemin={0}
                aria-valuemax={100000}
                aria-label="Ambient light intensity"
              />
            </div>
          </div>

          {/* Color Temperature */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Color Temperature</div>
            <div style={rowStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={colorSwatchStyle(tempColor)} aria-hidden="true" />
                <span style={labelStyle}>
                  {getTemperatureLabel(lightInfo.colorTemperature)}
                </span>
              </div>
              <span style={valueStyle()}>
                {Math.round(lightInfo.colorTemperature)}K
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={temperatureGradientStyle} aria-hidden="true">
                <div style={temperatureMarkerStyle(lightInfo.colorTemperature)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '0.6rem', color: AR_COLORS.textMuted }}>1000K</span>
                <span style={{ fontSize: '0.6rem', color: AR_COLORS.textMuted }}>5500K</span>
                <span style={{ fontSize: '0.6rem', color: AR_COLORS.textMuted }}>10000K</span>
              </div>
            </div>
          </div>

          {/* Directional Light */}
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Directional Light</div>
            {lightInfo.primaryLight ? (
              <div style={directionalLightContainerStyle}>
                <div style={lightDirectionVisualStyle}>
                  {/* Simple directional indicator */}
                  <div
                    style={{
                      width: '2px',
                      height: '16px',
                      backgroundColor: lightInfo.primaryLight.color,
                      transformOrigin: 'center bottom',
                      transform: `rotate(${Math.atan2(lightInfo.primaryLight.direction[0], -lightInfo.primaryLight.direction[2]) * (180 / Math.PI)}deg)`,
                      borderRadius: '1px',
                      boxShadow: `0 0 4px ${lightInfo.primaryLight.color}`,
                    }}
                    aria-hidden="true"
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={rowStyle}>
                    <span style={labelStyle}>Intensity</span>
                    <span style={valueStyle()}>
                      {(lightInfo.primaryLight.intensity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={rowStyle}>
                    <span style={labelStyle}>Direction</span>
                    <span style={{ ...valueStyle(), fontSize: '0.72rem', fontFamily: 'ui-monospace, monospace' }}>
                      {formatDirection(lightInfo.primaryLight.direction)}
                    </span>
                  </div>
                  <div style={rowStyle}>
                    <span style={labelStyle}>Color</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={colorSwatchStyle(lightInfo.primaryLight.color)} aria-hidden="true" />
                      <span style={{ ...valueStyle(), fontSize: '0.72rem' }}>
                        {lightInfo.primaryLight.color}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: AR_COLORS.textMuted, fontSize: '0.8rem', textAlign: 'center', padding: '8px' }}>
                No directional light detected
              </div>
            )}
          </div>

          {/* Spherical Harmonics indicator */}
          {lightInfo.sphericalHarmonics && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  backgroundColor: `${AR_COLORS.success}20`,
                  border: `1px solid ${AR_COLORS.success}50`,
                  color: AR_COLORS.success,
                  fontWeight: 500,
                }}
              >
                SH L{Math.floor(Math.sqrt(lightInfo.sphericalHarmonics.length / 3)) - 1}
              </span>
              <span style={{ fontSize: '0.7rem', color: AR_COLORS.textMuted }}>
                {lightInfo.sphericalHarmonics.length} coefficients
              </span>
            </div>
          )}
        </div>
      )}

      {/* Inactive state */}
      {!collapsed && !lightInfo.isActive && (
        <div
          style={{
            marginTop: '12px',
            padding: '16px',
            textAlign: 'center',
            color: AR_COLORS.textMuted,
            fontSize: '0.82rem',
            backgroundColor: AR_COLORS.cardBg,
            borderRadius: '8px',
          }}
        >
          Light estimation is not active.
          <br />
          Start an AR session to begin.
        </div>
      )}
    </div>
  );
};

export default LightEstimationPanel;
