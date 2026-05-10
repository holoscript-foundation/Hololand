/**
 * LODQualitySlider — Real-time LOD Quality Tier Selector
 *
 * A slider component that maps user-facing quality tiers (Low/Med/High/Ultra)
 * to Gaussian splatting engine parameters:
 * - Octree depth (3-8 levels)
 * - Gaussian budget (50K-unlimited)
 * - Power-law threshold spacing
 * - Max render distance
 *
 * Features:
 * - Stepped slider with snap-to-tier behavior
 * - VR auto-select indicator
 * - Inline metrics display (Gaussian count, memory, FPS)
 * - Keyboard accessible (arrow keys, Home/End)
 * - Budget warning indicators
 * - Horizontal and vertical orientations
 *
 * Research references:
 *   W.034 - VR Gaussian budget
 *   P.030.05 - VR Gaussian Budget Management
 *   P.030.01 - Hierarchical LOD Gaussian Architecture
 *
 * @module volumetric-bridge/ui
 */

import { type KeyboardEvent, useCallback, useMemo, useRef } from 'react';
import type { LODQualitySliderProps, LODQualityTier } from './types';
import { LOD_TIER_MAPPINGS } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

const TIERS: LODQualityTier[] = ['low', 'medium', 'high', 'ultra'];
const TIER_INDICES: Record<LODQualityTier, number> = {
  low: 0,
  medium: 1,
  high: 2,
  ultra: 3,
};

// =============================================================================
// STYLES (CSS-in-JS for zero-dependency usage)
// =============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    color: '#e0e0e0',
    userSelect: 'none' as const,
  },
  containerVertical: {
    flexDirection: 'row' as const,
    alignItems: 'stretch' as const,
    gap: '12px',
  },
  label: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#999',
  },
  vrBadge: {
    fontSize: '9px',
    padding: '2px 6px',
    borderRadius: '3px',
    background: '#2a5a2a',
    color: '#6aef6a',
    fontWeight: 700 as const,
    letterSpacing: '0.08em',
  },
  sliderTrack: {
    position: 'relative' as const,
    height: '32px',
    display: 'flex',
    alignItems: 'center',
  },
  sliderTrackVertical: {
    width: '32px',
    height: '160px',
    flexDirection: 'column' as const,
  },
  trackBar: {
    position: 'absolute' as const,
    left: '12px',
    right: '12px',
    height: '4px',
    background: '#333',
    borderRadius: '2px',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  trackBarVertical: {
    top: '12px',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '4px',
    height: 'auto',
  },
  trackFill: (pct: number) => ({
    position: 'absolute' as const,
    left: '12px',
    width: `calc(${pct}% * (100% - 24px) / 100)`,
    height: '4px',
    borderRadius: '2px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'linear-gradient(90deg, #4a9eff, #00d4ff)',
    transition: 'width 0.15s ease-out',
  }),
  trackFillVertical: (pct: number) => ({
    position: 'absolute' as const,
    bottom: '12px',
    height: `calc(${pct}% * (100% - 24px) / 100)`,
    width: '4px',
    borderRadius: '2px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(0deg, #4a9eff, #00d4ff)',
    transition: 'height 0.15s ease-out',
  }),
  tierStop: (pct: number, active: boolean) => ({
    position: 'absolute' as const,
    left: `calc(12px + ${pct}% * (100% - 24px) / 100)`,
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: active ? '16px' : '8px',
    height: active ? '16px' : '8px',
    borderRadius: '50%',
    background: active ? '#00d4ff' : '#555',
    border: active ? '2px solid #fff' : '1px solid #444',
    cursor: 'pointer',
    transition: 'all 0.15s ease-out',
    zIndex: active ? 2 : 1,
    boxShadow: active ? '0 0 8px rgba(0, 212, 255, 0.5)' : 'none',
  }),
  tierStopVertical: (pct: number, active: boolean) => ({
    position: 'absolute' as const,
    bottom: `calc(12px + ${pct}% * (100% - 24px) / 100)`,
    left: '50%',
    transform: 'translate(-50%, 50%)',
    width: active ? '16px' : '8px',
    height: active ? '16px' : '8px',
    borderRadius: '50%',
    background: active ? '#00d4ff' : '#555',
    border: active ? '2px solid #fff' : '1px solid #444',
    cursor: 'pointer',
    transition: 'all 0.15s ease-out',
    zIndex: active ? 2 : 1,
    boxShadow: active ? '0 0 8px rgba(0, 212, 255, 0.5)' : 'none',
  }),
  tierLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 8px',
  },
  tierLabelsVertical: {
    flexDirection: 'column-reverse' as const,
    padding: '8px 0',
    justifyContent: 'space-between',
    height: '160px',
  },
  tierLabel: (active: boolean) => ({
    fontSize: '10px',
    fontWeight: active ? (700 as const) : (400 as const),
    color: active ? '#00d4ff' : '#666',
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: 'color 0.15s',
    minWidth: '36px',
  }),
  metricsRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    fontSize: '11px',
    color: '#888',
  },
  metricItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  metricValue: (warning: boolean) => ({
    fontWeight: 600 as const,
    fontVariantNumeric: 'tabular-nums' as const,
    color: warning ? '#ff6b6b' : '#ccc',
  }),
  metricLabel: {
    color: '#666',
    fontSize: '10px',
  },
  budgetBar: {
    height: '3px',
    background: '#222',
    borderRadius: '1.5px',
    overflow: 'hidden' as const,
    marginTop: '2px',
  },
  budgetFill: (pct: number, capped: boolean) => ({
    height: '100%',
    width: `${Math.min(pct, 100)}%`,
    background: capped
      ? 'linear-gradient(90deg, #ff6b6b, #ff4444)'
      : 'linear-gradient(90deg, #4a9eff, #00d4ff)',
    borderRadius: '1.5px',
    transition: 'width 0.2s ease-out',
  }),
  disabled: {
    opacity: 0.5,
    pointerEvents: 'none' as const,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatGaussianCount(count: number): string {
  if (count === 0) return '--';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return String(count);
}

function formatMemory(mb: number): string {
  if (mb === 0) return '--';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * LOD Quality Slider component.
 *
 * Renders a stepped slider with four quality tiers (Low/Med/High/Ultra).
 * Each tier maps to specific octree depth and Gaussian budget settings
 * for the GaussianSplatLODManager.
 *
 * When VR mode is active, an auto-select badge is shown and the tier
 * is automatically chosen based on detected headset capabilities.
 *
 * Usage:
 * ```tsx
 * <LODQualitySlider
 *   value="medium"
 *   onChange={(tier) => lodController.setTier(tier)}
 *   vrMode={isVR}
 *   showMetrics
 *   lodResult={lastLODResult}
 *   budgetResult={lastBudgetResult}
 * />
 * ```
 */
export const LODQualitySlider = ({
  value,
  onChange,
  disabled = false,
  vrMode = false,
  lodResult,
  budgetResult,
  showMetrics = true,
  className,
  orientation = 'horizontal',
  size = 'default',
  'aria-label': ariaLabel,
}: LODQualitySliderProps) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isVertical = orientation === 'vertical';
  const currentIndex = TIER_INDICES[value];
  const fillPct = (currentIndex / (TIERS.length - 1)) * 100;
  const mapping = LOD_TIER_MAPPINGS[value];

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  const handleTierClick = useCallback(
    (tier: LODQualityTier) => {
      if (!disabled) onChange(tier);
    },
    [disabled, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      let newIndex = currentIndex;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault();
          newIndex = Math.min(currentIndex + 1, TIERS.length - 1);
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault();
          newIndex = Math.max(currentIndex - 1, 0);
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = TIERS.length - 1;
          break;
        default:
          return;
      }

      if (newIndex !== currentIndex) {
        onChange(TIERS[newIndex]);
      }
    },
    [disabled, currentIndex, onChange]
  );

  // -------------------------------------------------------------------------
  // Metrics extraction
  // -------------------------------------------------------------------------

  const metricsData = useMemo(() => {
    const gaussianCount = lodResult?.visibleCount ?? budgetResult?.totalAllocated ?? 0;
    const budget = mapping.gaussianBudget;
    const budgetPct = budget > 0 ? (gaussianCount / budget) * 100 : 0;
    const isCapped = lodResult?.budgetCapped ?? budgetResult?.budgetCapped ?? false;
    const memoryMB = budgetResult
      ? budgetResult.memoryState.totalBytes / (1024 * 1024)
      : (gaussianCount * 60) / (1024 * 1024);

    return {
      gaussianCount,
      budget,
      budgetPct,
      isCapped,
      memoryMB,
      activeLOD: lodResult?.activeLODLevel ?? 0,
      totalLOD: lodResult?.totalLODLevels ?? mapping.octreeDepth,
      levelsDropped: lodResult?.levelsDropped ?? 0,
    };
  }, [lodResult, budgetResult, mapping]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const containerStyle = {
    ...styles.container,
    ...(isVertical ? styles.containerVertical : {}),
    ...(disabled ? styles.disabled : {}),
  };

  return (
    <div
      className={className}
      style={containerStyle}
      role="group"
      aria-label={ariaLabel ?? 'LOD Quality Control'}
    >
      {/* Header with VR badge */}
      <div style={styles.label}>
        <span>LOD Quality</span>
        {vrMode && <span style={styles.vrBadge}>VR AUTO</span>}
      </div>

      {/* Slider track */}
      <div
        ref={sliderRef}
        style={{
          ...styles.sliderTrack,
          ...(isVertical ? styles.sliderTrackVertical : {}),
        }}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={TIERS.length - 1}
        aria-valuenow={currentIndex}
        aria-valuetext={`${mapping.label} quality: ${mapping.description}`}
        aria-orientation={orientation}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        {/* Track background */}
        <div
          style={{
            ...styles.trackBar,
            ...(isVertical ? styles.trackBarVertical : {}),
          }}
        />

        {/* Track fill */}
        <div style={isVertical ? styles.trackFillVertical(fillPct) : styles.trackFill(fillPct)} />

        {/* Tier stops */}
        {TIERS.map((tier, i) => {
          const pct = (i / (TIERS.length - 1)) * 100;
          const isActive = i === currentIndex;
          const stopStyle = isVertical
            ? styles.tierStopVertical(pct, isActive)
            : styles.tierStop(pct, isActive);

          return (
            <div
              key={tier}
              style={stopStyle}
              onClick={() => handleTierClick(tier)}
              title={LOD_TIER_MAPPINGS[tier].description}
              role="button"
              aria-label={`Select ${LOD_TIER_MAPPINGS[tier].label} quality`}
              aria-pressed={isActive}
            />
          );
        })}
      </div>

      {/* Tier labels */}
      <div
        style={{
          ...styles.tierLabels,
          ...(isVertical ? styles.tierLabelsVertical : {}),
        }}
      >
        {TIERS.map((tier, i) => (
          <span
            key={tier}
            style={styles.tierLabel(i === currentIndex)}
            onClick={() => handleTierClick(tier)}
            role="button"
            tabIndex={-1}
          >
            {LOD_TIER_MAPPINGS[tier].label}
          </span>
        ))}
      </div>

      {/* Inline metrics */}
      {showMetrics && (
        <div>
          <div style={styles.metricsRow}>
            <div style={styles.metricItem}>
              <span style={styles.metricValue(metricsData.isCapped)}>
                {formatGaussianCount(metricsData.gaussianCount)}
              </span>
              <span style={styles.metricLabel}>splats</span>
            </div>
            <div style={styles.metricItem}>
              <span
                style={styles.metricValue(metricsData.memoryMB > mapping.estimatedMemoryMB * 1.2)}
              >
                {formatMemory(metricsData.memoryMB)}
              </span>
              <span style={styles.metricLabel}>VRAM</span>
            </div>
            <div style={styles.metricItem}>
              <span style={styles.metricValue(false)}>
                {metricsData.activeLOD}/{metricsData.totalLOD}
              </span>
              <span style={styles.metricLabel}>LOD</span>
            </div>
            {metricsData.levelsDropped > 0 && (
              <div style={styles.metricItem}>
                <span style={styles.metricValue(true)}>-{metricsData.levelsDropped}</span>
                <span style={styles.metricLabel}>dropped</span>
              </div>
            )}
          </div>

          {/* Budget usage bar */}
          {metricsData.budget > 0 && (
            <div style={styles.budgetBar}>
              <div
                style={styles.budgetFill(metricsData.budgetPct, metricsData.isCapped)}
                role="progressbar"
                aria-valuenow={Math.round(metricsData.budgetPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Gaussian budget usage: ${Math.round(metricsData.budgetPct)}%`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

LODQualitySlider.displayName = 'LODQualitySlider';
