/**
 * PlatformCapabilityBadge Component
 *
 * Displays detected WebXR platform capabilities as a visual badge.
 * Supports three display modes:
 * - 'platform': Shows only the platform identification badge
 * - 'features': Shows individual feature capability indicators
 * - 'full': Shows both platform badge and feature capabilities
 *
 * Follows the TierBadge component pattern for consistency with
 * the existing HoloLand renderer UI component library.
 *
 * @module webxr-platform/PlatformCapabilityBadge
 */

import React, { useMemo } from 'react';
import type {
  XRPlatformCapabilities,
  XRPlatformType,
  XRFeatureCapability,
  XRFeatureStatus,
  XRSessionModeStatus,
  XRSessionMode,
  CapabilityBadgeSize,
  CapabilityBadgeVariant,
  CapabilityBadgeDisplayMode,
  XRPlatformTheme,
  PlatformColorSet,
} from './types';
import {
  PLATFORM_LABELS,
  PLATFORM_ICONS,
  FEATURE_STATUS_ICONS,
  DEFAULT_XR_PLATFORM_THEME,
} from './types';

// =============================================================================
// PROPS
// =============================================================================

export interface PlatformCapabilityBadgeProps {
  /** Platform capabilities (from useWebXRPlatform hook) */
  capabilities: XRPlatformCapabilities;
  /** Badge size */
  size?: CapabilityBadgeSize;
  /** Visual variant */
  variant?: CapabilityBadgeVariant;
  /** What to display */
  displayMode?: CapabilityBadgeDisplayMode;
  /** Whether to show session mode support indicators */
  showSessionModes?: boolean;
  /** Filter which features to display (null = all) */
  featureFilter?: ((feature: XRFeatureCapability) => boolean) | null;
  /** Whether to animate transitions */
  animated?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Theme overrides */
  theme?: Partial<XRPlatformTheme>;
  /** Click handler for the platform badge */
  onPlatformClick?: (platform: XRPlatformType) => void;
  /** Click handler for individual features */
  onFeatureClick?: (feature: XRFeatureCapability) => void;
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
  labelSize: string;
}

const SIZE_CONFIGS: Record<CapabilityBadgeSize, SizeConfig> = {
  sm: {
    fontSize: '0.7rem',
    iconSize: '0.75rem',
    paddingX: '0.4rem',
    paddingY: '0.15rem',
    gap: '0.2rem',
    borderWidth: '1px',
    labelSize: '0.65rem',
  },
  md: {
    fontSize: '0.8rem',
    iconSize: '0.9rem',
    paddingX: '0.6rem',
    paddingY: '0.25rem',
    gap: '0.3rem',
    borderWidth: '1.5px',
    labelSize: '0.75rem',
  },
  lg: {
    fontSize: '0.95rem',
    iconSize: '1.1rem',
    paddingX: '0.85rem',
    paddingY: '0.4rem',
    gap: '0.4rem',
    borderWidth: '2px',
    labelSize: '0.85rem',
  },
};

// =============================================================================
// HELPERS
// =============================================================================

function getFeatureStatusColor(status: XRFeatureStatus, theme: XRPlatformTheme): string {
  switch (status) {
    case 'available':
      return theme.featureAvailableColor;
    case 'unavailable':
      return theme.featureUnavailableColor;
    case 'requires-permission':
      return theme.featurePermissionColor;
    case 'unknown':
    default:
      return theme.featureUnknownColor;
  }
}

function getSessionModeStatusLabel(status: XRSessionModeStatus): string {
  switch (status) {
    case 'supported':
      return 'Supported';
    case 'unsupported':
      return 'Unsupported';
    case 'unknown':
    default:
      return 'Unknown';
  }
}

function getSessionModeDisplayName(mode: XRSessionMode): string {
  switch (mode) {
    case 'inline':
      return 'Inline';
    case 'immersive-vr':
      return 'Immersive VR';
    case 'immersive-ar':
      return 'Immersive AR';
    default:
      return mode;
  }
}

function getPlatformColors(platform: XRPlatformType, theme: XRPlatformTheme): PlatformColorSet {
  return theme.platformColors[platform] ?? {
    color: theme.textPrimary,
    backgroundColor: theme.backgroundPrimary,
    borderColor: theme.textSecondary,
    icon: PLATFORM_ICONS[platform],
  };
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Platform identification badge showing the detected platform.
 */
const PlatformBadge: React.FC<{
  platform: XRPlatformType;
  xrSupported: boolean;
  sizeConfig: SizeConfig;
  theme: XRPlatformTheme;
  variant: CapabilityBadgeVariant;
  animated: boolean;
  onClick?: (platform: XRPlatformType) => void;
}> = ({ platform, xrSupported, sizeConfig, theme, variant, animated, onClick }) => {
  const colors = getPlatformColors(platform, theme);

  const badgeStyle = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: sizeConfig.gap,
      fontFamily: theme.fontFamily,
      fontSize: `calc(${sizeConfig.fontSize} * ${theme.fontScale})`,
      fontWeight: 600,
      color: colors.color,
      backgroundColor: colors.backgroundColor,
      border: `${sizeConfig.borderWidth} solid ${colors.borderColor}`,
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
          minWidth: '120px',
        };
      default:
        return base;
    }
  }, [sizeConfig, theme, colors, variant, animated, onClick]);

  const label = PLATFORM_LABELS[platform];
  const icon = PLATFORM_ICONS[platform];

  const handleClick = () => {
    onClick?.(platform);
  };

  return (
    <div
      style={badgeStyle}
      role={onClick ? 'button' : 'status'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Platform: ${label}${xrSupported ? '' : ' (XR not supported)'}`}
      title={`${label}${xrSupported ? ' - WebXR supported' : ' - WebXR not available'}`}
      onClick={handleClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      } : undefined}
    >
      <span
        style={{
          fontSize: sizeConfig.iconSize,
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
      {!xrSupported && (
        <span
          style={{
            fontSize: sizeConfig.labelSize,
            opacity: 0.6,
            fontWeight: 400,
          }}
        >
          (Fallback)
        </span>
      )}
    </div>
  );
};

/**
 * Feature capability indicator for a single feature.
 */
const FeatureIndicator: React.FC<{
  feature: XRFeatureCapability;
  sizeConfig: SizeConfig;
  theme: XRPlatformTheme;
  animated: boolean;
  onClick?: (feature: XRFeatureCapability) => void;
}> = ({ feature, sizeConfig, theme, animated, onClick }) => {
  const statusColor = getFeatureStatusColor(feature.status, theme);
  const statusIcon = FEATURE_STATUS_ICONS[feature.status];

  const handleClick = () => {
    onClick?.(feature);
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeConfig.gap,
        padding: `${sizeConfig.paddingY} ${sizeConfig.paddingX}`,
        borderRadius: theme.borderRadius,
        border: `1px solid ${statusColor}30`,
        backgroundColor: `${statusColor}10`,
        fontFamily: theme.fontFamily,
        fontSize: `calc(${sizeConfig.labelSize} * ${theme.fontScale})`,
        color: theme.textPrimary,
        cursor: onClick ? 'pointer' : 'default',
        transition: animated ? 'all 0.2s ease' : 'none',
        lineHeight: 1.2,
      }}
      role={onClick ? 'button' : 'listitem'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${feature.name}: ${feature.status} - ${feature.description}`}
      title={feature.description}
      onClick={handleClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      } : undefined}
    >
      <span aria-hidden="true" style={{ fontSize: sizeConfig.iconSize, lineHeight: 1 }}>
        {statusIcon}
      </span>
      <span style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
        {feature.name}
      </span>
    </div>
  );
};

/**
 * Session mode support row.
 */
const SessionModeRow: React.FC<{
  sessionModes: Record<XRSessionMode, XRSessionModeStatus>;
  sizeConfig: SizeConfig;
  theme: XRPlatformTheme;
}> = ({ sessionModes, sizeConfig, theme }) => {
  const modes: XRSessionMode[] = ['inline', 'immersive-vr', 'immersive-ar'];

  return (
    <div
      style={{
        display: 'flex',
        gap: sizeConfig.gap,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
      role="group"
      aria-label="XR session mode support"
    >
      {modes.map((mode) => {
        const status = sessionModes[mode];
        const isSupported = status === 'supported';
        return (
          <div
            key={mode}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: `${sizeConfig.paddingY} ${sizeConfig.paddingX}`,
              borderRadius: theme.borderRadius,
              border: `1px solid ${isSupported ? theme.featureAvailableColor : theme.featureUnavailableColor}40`,
              backgroundColor: `${isSupported ? theme.featureAvailableColor : theme.featureUnavailableColor}10`,
              fontFamily: theme.fontFamily,
              fontSize: `calc(${sizeConfig.labelSize} * ${theme.fontScale})`,
              color: theme.textPrimary,
              opacity: isSupported ? 1 : 0.5,
              lineHeight: 1.2,
            }}
            aria-label={`${getSessionModeDisplayName(mode)}: ${getSessionModeStatusLabel(status)}`}
          >
            <span aria-hidden="true" style={{ fontSize: sizeConfig.iconSize, lineHeight: 1 }}>
              {isSupported ? '\u2705' : '\u274C'}
            </span>
            <span style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
              {getSessionModeDisplayName(mode)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PlatformCapabilityBadge: React.FC<PlatformCapabilityBadgeProps> = ({
  capabilities,
  size = 'md',
  variant = 'badge',
  displayMode = 'full',
  showSessionModes = true,
  featureFilter = null,
  animated = true,
  className,
  style,
  theme: themeOverride,
  onPlatformClick,
  onFeatureClick,
  ariaLabel,
}) => {
  const sizeConfig = SIZE_CONFIGS[size];
  const theme = useMemo(
    () => ({ ...DEFAULT_XR_PLATFORM_THEME, ...themeOverride }),
    [themeOverride],
  );

  // Filter features
  const visibleFeatures = useMemo(() => {
    if (!featureFilter) return capabilities.features;
    return capabilities.features.filter(featureFilter);
  }, [capabilities.features, featureFilter]);

  const showPlatform = displayMode === 'platform' || displayMode === 'full';
  const showFeatures = displayMode === 'features' || displayMode === 'full';

  const containerLabel = ariaLabel ?? `WebXR Platform: ${capabilities.platformLabel}, ${capabilities.xrSupported ? 'XR supported' : 'XR not supported'}`;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        ...style,
      }}
      role="region"
      aria-label={containerLabel}
    >
      {/* Platform badge */}
      {showPlatform && (
        <PlatformBadge
          platform={capabilities.platform}
          xrSupported={capabilities.xrSupported}
          sizeConfig={sizeConfig}
          theme={theme}
          variant={variant}
          animated={animated}
          onClick={onPlatformClick}
        />
      )}

      {/* Session mode support */}
      {showPlatform && showSessionModes && (
        <SessionModeRow
          sessionModes={capabilities.sessionModes}
          sizeConfig={sizeConfig}
          theme={theme}
        />
      )}

      {/* Feature capabilities */}
      {showFeatures && visibleFeatures.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: sizeConfig.gap,
          }}
          role="list"
          aria-label="Feature capabilities"
        >
          {visibleFeatures.map((feature) => (
            <FeatureIndicator
              key={feature.name}
              feature={feature}
              sizeConfig={sizeConfig}
              theme={theme}
              animated={animated}
              onClick={onFeatureClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlatformCapabilityBadge;
