/**
 * QualityTierSelector — Volumetric Video Quality Tier Control
 *
 * A segmented button control for selecting volumetric video quality tiers
 * (Low/Mid/High) with bandwidth usage and adaptive quality toggle.
 *
 * Interfaces with the 4DGCPro progressive quality system:
 * - Low:  2 layers, ~330 KB/frame, 50K Gaussians
 * - Mid:  4 layers, ~660 KB/frame, 150K Gaussians
 * - High: 6 layers, ~1.3 MB/frame, 500K Gaussians
 *
 * Research references:
 *   W.039 - 4DGCPro progressive quality tiers
 *   P.030.04 - Adaptive quality management
 *
 * @module volumetric-bridge/ui
 */

import { type KeyboardEvent, useCallback, useMemo } from 'react';
import type { QualityTierSelectorProps } from './types';
import type { VolumetricQualityTier } from '../volumetric-video/types';
import { QUALITY_TIER_CONFIGS } from '../volumetric-video/types';

// =============================================================================
// CONSTANTS
// =============================================================================

const TIERS: VolumetricQualityTier[] = ['low', 'mid', 'high'];

const TIER_DISPLAY: Record<
  VolumetricQualityTier,
  { label: string; shortLabel: string; description: string }
> = {
  low: {
    label: 'Low',
    shortLabel: 'LO',
    description: '2 layers, ~330 KB/frame, 50K Gaussians. Best for mobile.',
  },
  mid: {
    label: 'Mid',
    shortLabel: 'MID',
    description: '4 layers, ~660 KB/frame, 150K Gaussians. Recommended for VR.',
  },
  high: {
    label: 'High',
    shortLabel: 'HI',
    description: '6 layers, ~1.3 MB/frame, 500K Gaussians. Desktop quality.',
  },
};

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '12px',
    color: '#e0e0e0',
    userSelect: 'none' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '11px',
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#999',
  },
  segmentGroup: {
    display: 'flex',
    background: '#1a1a1a',
    borderRadius: '6px',
    border: '1px solid #333',
    overflow: 'hidden' as const,
  },
  segment: (active: boolean, disabled: boolean) => ({
    flex: 1,
    padding: '8px 12px',
    textAlign: 'center' as const,
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: active ? '#2a4a6a' : 'transparent',
    color: active ? '#00d4ff' : '#888',
    fontWeight: active ? (700 as const) : (400 as const),
    fontSize: '12px',
    border: 'none',
    borderRight: '1px solid #333',
    transition: 'background 0.15s, color 0.15s',
    opacity: disabled ? 0.5 : 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2px',
  }),
  segmentLastChild: {
    borderRight: 'none',
  },
  segmentSub: {
    fontSize: '9px',
    color: '#666',
    fontWeight: 400 as const,
  },
  segmentSubActive: {
    color: '#5ac8fa',
  },
  adaptiveRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    color: '#888',
  },
  toggle: (enabled: boolean) => ({
    width: '32px',
    height: '18px',
    borderRadius: '9px',
    background: enabled ? '#2a6a2a' : '#333',
    border: '1px solid #555',
    position: 'relative' as const,
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
  }),
  toggleKnob: (enabled: boolean) => ({
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background: enabled ? '#6aef6a' : '#888',
    position: 'absolute' as const,
    top: '1px',
    left: enabled ? '15px' : '1px',
    transition: 'left 0.2s, background 0.2s',
  }),
  metricsRow: {
    display: 'flex',
    gap: '12px',
    fontSize: '10px',
    color: '#666',
  },
  metricItem: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '3px',
  },
  metricValue: {
    fontWeight: 600 as const,
    fontVariantNumeric: 'tabular-nums' as const,
    color: '#aaa',
  },
  bandwidthBar: {
    height: '3px',
    background: '#222',
    borderRadius: '1.5px',
    overflow: 'hidden' as const,
  },
  bandwidthFill: (pct: number, high: boolean) => ({
    height: '100%',
    width: `${Math.min(pct, 100)}%`,
    background: high
      ? 'linear-gradient(90deg, #ff6b6b, #ff4444)'
      : 'linear-gradient(90deg, #4a9eff, #00d4ff)',
    borderRadius: '1.5px',
    transition: 'width 0.3s ease-out',
  }),
  disabled: {
    opacity: 0.5,
    pointerEvents: 'none' as const,
  },
};

// =============================================================================
// HELPERS
// =============================================================================

function formatBandwidth(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${kbps} Kbps`;
}

function formatFrameSize(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Quality Tier Selector for volumetric video.
 *
 * Renders a segmented button group for Low/Mid/High quality tiers
 * with per-tier frame size info, bandwidth bar, and adaptive quality toggle.
 *
 * Usage:
 * ```tsx
 * <QualityTierSelector
 *   value="mid"
 *   onChange={(tier) => player.setQualityTier(tier)}
 *   adaptiveEnabled={true}
 *   onAdaptiveToggle={(enabled) => player.setAdaptiveQuality(enabled)}
 *   metrics={perfMetrics}
 *   bandwidthKbps={1200}
 * />
 * ```
 */
export const QualityTierSelector = ({
  value,
  onChange,
  adaptiveEnabled = true,
  onAdaptiveToggle,
  metrics,
  bandwidthKbps = 0,
  disabled = false,
  className,
}: QualityTierSelectorProps) => {
  const currentConfig = QUALITY_TIER_CONFIGS[value];

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleTierClick = useCallback(
    (tier: VolumetricQualityTier) => {
      if (!disabled) onChange(tier);
    },
    [disabled, onChange]
  );

  const handleAdaptiveToggle = useCallback(() => {
    onAdaptiveToggle?.(!adaptiveEnabled);
  }, [adaptiveEnabled, onAdaptiveToggle]);

  // -------------------------------------------------------------------------
  // Bandwidth bar
  // -------------------------------------------------------------------------

  const bandwidthPct = useMemo(() => {
    // Estimate max bandwidth as High tier at 30fps
    const maxBandwidthKbps = QUALITY_TIER_CONFIGS.high.approxFrameSizeKB * 30 * 8;
    return bandwidthKbps > 0 ? (bandwidthKbps / maxBandwidthKbps) * 100 : 0;
  }, [bandwidthKbps]);

  const isBandwidthHigh = bandwidthKbps > 5000;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className={className}
      style={{
        ...styles.container,
        ...(disabled ? styles.disabled : {}),
      }}
      role="group"
      aria-label="Volumetric video quality tier selector"
    >
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Quality Tier</span>
        {adaptiveEnabled && (
          <span
            style={{
              fontSize: '9px',
              padding: '2px 6px',
              borderRadius: '3px',
              background: '#2a5a2a',
              color: '#6aef6a',
              fontWeight: 700,
              letterSpacing: '0.06em',
            }}
          >
            ADAPTIVE
          </span>
        )}
      </div>

      {/* Segmented buttons */}
      <div style={styles.segmentGroup} role="radiogroup" aria-label="Quality tier selection">
        {TIERS.map((tier, i) => {
          const isActive = tier === value;
          const config = QUALITY_TIER_CONFIGS[tier];
          const display = TIER_DISPLAY[tier];
          const isLast = i === TIERS.length - 1;

          return (
            <button
              key={tier}
              style={{
                ...styles.segment(isActive, disabled),
                ...(isLast ? styles.segmentLastChild : {}),
              }}
              onClick={() => handleTierClick(tier)}
              disabled={disabled}
              role="radio"
              aria-checked={isActive}
              aria-label={`${display.label} quality: ${display.description}`}
              title={display.description}
            >
              <span>{display.label}</span>
              <span style={isActive ? styles.segmentSubActive : styles.segmentSub}>
                {formatFrameSize(config.approxFrameSizeKB)}/f
              </span>
            </button>
          );
        })}
      </div>

      {/* Metrics row */}
      <div style={styles.metricsRow}>
        <div style={styles.metricItem}>
          <span style={styles.metricValue}>{currentConfig.layerCount}</span>
          <span>layers</span>
        </div>
        <div style={styles.metricItem}>
          <span style={styles.metricValue}>{formatFrameSize(currentConfig.approxFrameSizeKB)}</span>
          <span>/frame</span>
        </div>
        <div style={styles.metricItem}>
          <span style={styles.metricValue}>
            {currentConfig.maxGaussians >= 1_000_000
              ? `${(currentConfig.maxGaussians / 1_000_000).toFixed(0)}M`
              : `${(currentConfig.maxGaussians / 1_000).toFixed(0)}K`}
          </span>
          <span>max splats</span>
        </div>
        {metrics && (
          <div style={styles.metricItem}>
            <span style={styles.metricValue}>{metrics.effectiveFPS.toFixed(0)}</span>
            <span>FPS</span>
          </div>
        )}
      </div>

      {/* Bandwidth usage bar */}
      {bandwidthKbps > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '9px',
              color: '#555',
              marginBottom: '2px',
            }}
          >
            <span>Bandwidth</span>
            <span style={{ color: isBandwidthHigh ? '#ff6b6b' : '#888' }}>
              {formatBandwidth(bandwidthKbps)}
            </span>
          </div>
          <div style={styles.bandwidthBar}>
            <div
              style={styles.bandwidthFill(bandwidthPct, isBandwidthHigh)}
              role="progressbar"
              aria-valuenow={Math.round(bandwidthPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Bandwidth usage: ${formatBandwidth(bandwidthKbps)}`}
            />
          </div>
        </div>
      )}

      {/* Adaptive quality toggle */}
      {onAdaptiveToggle && (
        <div style={styles.adaptiveRow}>
          <div
            style={styles.toggle(adaptiveEnabled)}
            onClick={handleAdaptiveToggle}
            role="switch"
            aria-checked={adaptiveEnabled}
            aria-label="Toggle adaptive quality"
            tabIndex={0}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAdaptiveToggle();
              }
            }}
          >
            <div style={styles.toggleKnob(adaptiveEnabled)} />
          </div>
          <span>Adaptive Quality</span>
          {metrics && (
            <span style={{ color: '#555', marginLeft: 'auto', fontSize: '10px' }}>
              P95: {metrics.p95TotalTimeMs.toFixed(1)}ms
            </span>
          )}
        </div>
      )}
    </div>
  );
};

QualityTierSelector.displayName = 'QualityTierSelector';
