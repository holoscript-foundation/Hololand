/**
 * Trust UI Component Library
 *
 * React components for visualizing agent trust in the Hololand platform.
 * Integrates with VRTrustHandshake and BehavioralTrustScoring systems.
 *
 * Components:
 * - TierBadge:              T0-T3 trust tier badges with size/variant options
 * - TierBadgeRow:           Horizontal progression display of all tiers
 * - ReputationHistoryChart: SVG time-series chart of trust score history
 * - CapabilityListViewer:   Grouped capability list with grant/deny/lock states
 * - RevocationAlertToast:   Stacked toast notifications for trust events
 *
 * @module trust-ui
 */

// Types and utilities
export type {
  TrustTier,
  TrustTierMeta,
  TrustUITheme,
  ReputationDataPoint,
  ReputationHistory,
  CapabilityEntry,
  RevocationAlert,
  RevocationSeverity,
} from './types';

export {
  TRUST_TIER_CONFIG,
  CAPABILITY_DISPLAY_CONFIG,
  DEFAULT_TRUST_UI_THEME,
  scoreToTier,
  trustLevelToTier,
  getTierMeta,
} from './types';

// TierBadge
export { TierBadge, TierBadgeRow } from './TierBadge';
export type {
  TierBadgeProps,
  TierBadgeSize,
  TierBadgeVariant,
  TierBadgeRowProps,
} from './TierBadge';

// ReputationHistoryChart
export { ReputationHistoryChart } from './ReputationHistoryChart';
export type { ReputationHistoryChartProps } from './ReputationHistoryChart';

// CapabilityListViewer
export { CapabilityListViewer } from './CapabilityListViewer';
export type { CapabilityListViewerProps } from './CapabilityListViewer';

// RevocationAlertToast
export { RevocationAlertToast } from './RevocationAlertToast';
export type { RevocationAlertToastProps } from './RevocationAlertToast';
