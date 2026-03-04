/**
 * TierBadge Component
 *
 * Displays a visual badge representing an agent's trust tier (T0-T3).
 * Supports multiple sizes, variants, and optional score display.
 *
 * The badge adapts its color, icon, and label based on the trust tier:
 *   T0 (Untrusted) - Red, warning icon
 *   T1 (Basic)     - Amber, check icon
 *   T2 (Verified)  - Blue, verified icon
 *   T3 (Trusted)   - Green, star icon
 *
 * Integration:
 * - Reads composite score from BehavioralTrustScoring.getAgentScore()
 * - Maps VRTrustHandshake.TrustLevel to TrustTier via trustLevelToTier()
 * - Can be used inline (badge) or standalone (card)
 *
 * @module trust-ui/TierBadge
 */

import React, { useMemo } from 'react';
import type {
  TrustTier,
  TrustUITheme,
} from './types';
import {
  TRUST_TIER_CONFIG,
  scoreToTier,
  getTierMeta,
  DEFAULT_TRUST_UI_THEME,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

/** Display size for the badge */
export type TierBadgeSize = 'sm' | 'md' | 'lg';

/** Visual variant of the badge */
export type TierBadgeVariant = 'badge' | 'pill' | 'card';

export interface TierBadgeProps {
  /** Trust tier to display (takes priority over score) */
  tier?: TrustTier;
  /** Composite score (0-1). Used to derive tier if tier prop is not set. */
  score?: number;
  /** Badge size */
  size?: TierBadgeSize;
  /** Visual variant */
  variant?: TierBadgeVariant;
  /** Whether to show the numeric score alongside the tier */
  showScore?: boolean;
  /** Whether to show the tier icon */
  showIcon?: boolean;
  /** Whether to show the tier label text */
  showLabel?: boolean;
  /** Whether to animate tier transitions */
  animated?: boolean;
  /** Optional tooltip text (overrides default description) */
  tooltip?: string;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Theme overrides */
  theme?: Partial<TrustUITheme>;
  /** Click handler */
  onClick?: (tier: TrustTier) => void;
  /** Accessible label override */
  ariaLabel?: string;
}

// =============================================================================
// SIZE CONFIGURATION
// =============================================================================

interface SizeConfig {
  fontSize: string;
  iconSize: string;
  paddingX: string;
  paddingY: string;
  gap: string;
  borderWidth: string;
  scoreSize: string;
}

const SIZE_CONFIGS: Record<TierBadgeSize, SizeConfig> = {
  sm: {
    fontSize: '0.7rem',
    iconSize: '0.75rem',
    paddingX: '0.4rem',
    paddingY: '0.15rem',
    gap: '0.2rem',
    borderWidth: '1px',
    scoreSize: '0.65rem',
  },
  md: {
    fontSize: '0.8rem',
    iconSize: '0.9rem',
    paddingX: '0.6rem',
    paddingY: '0.25rem',
    gap: '0.3rem',
    borderWidth: '1.5px',
    scoreSize: '0.75rem',
  },
  lg: {
    fontSize: '0.95rem',
    iconSize: '1.1rem',
    paddingX: '0.85rem',
    paddingY: '0.4rem',
    gap: '0.4rem',
    borderWidth: '2px',
    scoreSize: '0.85rem',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const TierBadge: React.FC<TierBadgeProps> = ({
  tier: tierProp,
  score,
  size = 'md',
  variant = 'badge',
  showScore = false,
  showIcon = true,
  showLabel = true,
  animated = true,
  tooltip,
  className,
  style,
  theme: themeOverride,
  onClick,
  ariaLabel,
}) => {
  // Resolve the tier
  const tier = useMemo((): TrustTier => {
    if (tierProp) return tierProp;
    if (score !== undefined) return scoreToTier(score);
    return 'T0';
  }, [tierProp, score]);

  const meta = getTierMeta(tier);
  const sizeConfig = SIZE_CONFIGS[size];
  const theme = useMemo(
    () => ({ ...DEFAULT_TRUST_UI_THEME, ...themeOverride }),
    [themeOverride],
  );

  // Resolve tier colors (support theme overrides)
  const tierColors = useMemo(() => {
    const override = theme.tierColors?.[tier];
    return {
      color: override?.color ?? meta.color,
      backgroundColor: override?.backgroundColor ?? meta.backgroundColor,
      borderColor: override?.borderColor ?? meta.borderColor,
    };
  }, [theme.tierColors, tier, meta]);

  const resolvedScore = score !== undefined ? score : meta.minScore;

  const handleClick = () => {
    onClick?.(tier);
  };

  // Compute variant-specific styles
  const variantStyles = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: sizeConfig.gap,
      fontFamily: theme.fontFamily,
      fontSize: `calc(${sizeConfig.fontSize} * ${theme.fontScale})`,
      fontWeight: 600,
      color: tierColors.color,
      backgroundColor: tierColors.backgroundColor,
      border: `${sizeConfig.borderWidth} solid ${tierColors.borderColor}`,
      cursor: onClick ? 'pointer' : 'default',
      userSelect: 'none',
      transition: animated ? 'all 0.3s ease' : 'none',
      lineHeight: 1.2,
    };

    switch (variant) {
      case 'badge':
        return {
          ...base,
          padding: `${sizeConfig.paddingY} ${sizeConfig.paddingX}`,
          borderRadius: theme.borderRadius,
        };

      case 'pill':
        return {
          ...base,
          padding: `${sizeConfig.paddingY} ${sizeConfig.paddingX}`,
          borderRadius: '999px',
        };

      case 'card':
        return {
          ...base,
          padding: `calc(${sizeConfig.paddingY} * 2) calc(${sizeConfig.paddingX} * 1.5)`,
          borderRadius: theme.borderRadius,
          flexDirection: 'column',
          textAlign: 'center',
          minWidth: '80px',
        };

      default:
        return base;
    }
  }, [variant, sizeConfig, theme, tierColors, animated, onClick]);

  const accessibleLabel = ariaLabel ?? `Trust tier ${tier}: ${meta.label}${showScore && score !== undefined ? `, score ${(score * 100).toFixed(0)}%` : ''}`;

  return (
    <div
      className={className}
      style={{ ...variantStyles, ...style }}
      role={onClick ? 'button' : 'status'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={accessibleLabel}
      title={tooltip ?? meta.description}
      onClick={handleClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      } : undefined}
    >
      {/* Tier icon */}
      {showIcon && (
        <span
          style={{
            fontSize: sizeConfig.iconSize,
            lineHeight: 1,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {meta.icon}
        </span>
      )}

      {/* Content container */}
      <span style={{ display: 'flex', alignItems: 'center', gap: sizeConfig.gap }}>
        {/* Tier label */}
        {showLabel && (
          <span style={{ whiteSpace: 'nowrap' }}>
            {variant === 'card' ? `${tier} - ${meta.label}` : tier}
          </span>
        )}

        {/* Score indicator */}
        {showScore && score !== undefined && (
          <span
            style={{
              fontSize: sizeConfig.scoreSize,
              opacity: 0.8,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {(score * 100).toFixed(0)}%
          </span>
        )}
      </span>

      {/* Card variant: show description */}
      {variant === 'card' && (
        <span
          style={{
            fontSize: `calc(${sizeConfig.scoreSize} * 0.9)`,
            color: theme.textSecondary,
            fontWeight: 400,
            marginTop: '0.25rem',
            lineHeight: 1.3,
          }}
        >
          {meta.description}
        </span>
      )}
    </div>
  );
};

// =============================================================================
// TIER BADGE ROW (displays all four tiers with the active one highlighted)
// =============================================================================

export interface TierBadgeRowProps {
  /** The currently active tier */
  activeTier: TrustTier;
  /** Current composite score */
  score?: number;
  /** Size for all badges */
  size?: TierBadgeSize;
  /** Whether to show scores */
  showScore?: boolean;
  /** Callback when a tier badge is clicked */
  onTierClick?: (tier: TrustTier) => void;
  /** Custom CSS class name */
  className?: string;
  /** Theme overrides */
  theme?: Partial<TrustUITheme>;
}

const ALL_TIERS: TrustTier[] = ['T0', 'T1', 'T2', 'T3'];

export const TierBadgeRow: React.FC<TierBadgeRowProps> = ({
  activeTier,
  score,
  size = 'md',
  showScore = false,
  onTierClick,
  className,
  theme,
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
      role="group"
      aria-label="Trust tier progression"
    >
      {ALL_TIERS.map((tier) => {
        const isActive = tier === activeTier;
        return (
          <TierBadge
            key={tier}
            tier={tier}
            score={isActive ? score : undefined}
            size={size}
            variant="pill"
            showScore={isActive && showScore}
            showIcon={true}
            showLabel={true}
            onClick={onTierClick}
            theme={theme}
            style={{
              opacity: isActive ? 1 : 0.4,
              transform: isActive ? 'scale(1.05)' : 'scale(1)',
            }}
          />
        );
      })}
    </div>
  );
};

export default TierBadge;
