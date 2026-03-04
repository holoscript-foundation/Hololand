/**
 * Trust UI Component Library - Shared Types
 *
 * Type definitions for the agent trust visualization components.
 * Maps the uAA2++ trust tier model (T0-T3) to visual representations
 * and integrates with the existing VRTrustHandshake and
 * BehavioralTrustScoring systems.
 *
 * Trust Tier Model:
 *   T0 - Untrusted: New or revoked agents with no established reputation
 *   T1 - Basic:     Agents that have passed initial challenge-response
 *   T2 - Verified:  Agents with sustained good behavioral scores
 *   T3 - Trusted:   Agents with long-standing high reputation
 *
 * @module trust-ui/types
 */

import type { TrustLevel, AgentCapability } from '../../VRTrustHandshake';
import type { TrustAction, TrustDimension } from '../../BehavioralTrustScoring';

// =============================================================================
// TRUST TIER MODEL
// =============================================================================

/**
 * Trust tier levels (T0 through T3).
 * Maps to composite behavioral trust scores and VRTrustHandshake trust levels.
 */
export type TrustTier = 'T0' | 'T1' | 'T2' | 'T3';

/**
 * Metadata for each trust tier.
 */
export interface TrustTierMeta {
  /** Tier identifier */
  tier: TrustTier;
  /** Human-readable label */
  label: string;
  /** Short description of this tier */
  description: string;
  /** Primary color (hex) */
  color: string;
  /** Background color for badges/cards (hex with alpha) */
  backgroundColor: string;
  /** Border color (hex) */
  borderColor: string;
  /** Icon character or emoji representation */
  icon: string;
  /** Minimum composite score to achieve this tier */
  minScore: number;
  /** Maximum composite score for this tier (exclusive) */
  maxScore: number;
}

/**
 * Configuration for all trust tier visual properties.
 */
export const TRUST_TIER_CONFIG: Record<TrustTier, TrustTierMeta> = {
  T0: {
    tier: 'T0',
    label: 'Untrusted',
    description: 'New or revoked agent with no established reputation',
    color: '#DC2626',
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderColor: '#FCA5A5',
    icon: '\u26A0', // Warning sign
    minScore: 0,
    maxScore: 0.25,
  },
  T1: {
    tier: 'T1',
    label: 'Basic',
    description: 'Passed initial challenge-response verification',
    color: '#D97706',
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderColor: '#FCD34D',
    icon: '\u2713', // Check mark
    minScore: 0.25,
    maxScore: 0.5,
  },
  T2: {
    tier: 'T2',
    label: 'Verified',
    description: 'Sustained good behavioral trust scores',
    color: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderColor: '#93C5FD',
    icon: '\u2714', // Heavy check mark
    minScore: 0.5,
    maxScore: 0.8,
  },
  T3: {
    tier: 'T3',
    label: 'Trusted',
    description: 'Long-standing high reputation and full capabilities',
    color: '#059669',
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: '#6EE7B7',
    icon: '\u2605', // Star
    minScore: 0.8,
    maxScore: 1.0,
  },
};

// =============================================================================
// MAPPING UTILITIES
// =============================================================================

/**
 * Derive a TrustTier from a composite score (0-1).
 *
 * @param score - Composite behavioral trust score
 * @returns The corresponding trust tier
 */
export function scoreToTier(score: number): TrustTier {
  if (score >= 0.8) return 'T3';
  if (score >= 0.5) return 'T2';
  if (score >= 0.25) return 'T1';
  return 'T0';
}

/**
 * Derive a TrustTier from a VRTrustHandshake TrustLevel.
 *
 * @param level - The trust level from VRTrustHandshake
 * @returns The corresponding trust tier
 */
export function trustLevelToTier(level: TrustLevel): TrustTier {
  switch (level) {
    case 'trusted':
      return 'T3';
    case 'verified':
      return 'T2';
    case 'pending':
      return 'T1';
    case 'degraded':
      return 'T1';
    case 'none':
    case 'revoked':
    default:
      return 'T0';
  }
}

/**
 * Get the tier metadata for a given tier.
 *
 * @param tier - The trust tier
 * @returns Tier metadata including colors, labels, and thresholds
 */
export function getTierMeta(tier: TrustTier): TrustTierMeta {
  return TRUST_TIER_CONFIG[tier];
}

// =============================================================================
// REPUTATION HISTORY
// =============================================================================

/**
 * A single data point in the reputation history.
 */
export interface ReputationDataPoint {
  /** Timestamp (ms since epoch) */
  timestamp: number;
  /** Composite trust score at this time (0-1) */
  score: number;
  /** Trust tier at this time */
  tier: TrustTier;
  /** Optional event label (e.g., "Refresh", "Violation") */
  event?: string;
  /** Per-dimension scores at this time */
  dimensions?: Partial<Record<TrustDimension, number>>;
}

/**
 * Complete reputation history for an agent.
 */
export interface ReputationHistory {
  /** Agent ID */
  agentId: string;
  /** Agent display name */
  agentName?: string;
  /** History data points, ordered by timestamp ascending */
  dataPoints: ReputationDataPoint[];
  /** Current composite score */
  currentScore: number;
  /** Current tier */
  currentTier: TrustTier;
  /** Timestamp when the agent first joined */
  firstJoinedAt: number;
  /** Total number of trust transitions */
  totalTransitions: number;
}

// =============================================================================
// CAPABILITY DISPLAY
// =============================================================================

/**
 * A capability entry for display in the CapabilityListViewer.
 */
export interface CapabilityEntry {
  /** The capability identifier */
  capability: AgentCapability;
  /** Human-readable label */
  label: string;
  /** Description of what this capability grants */
  description: string;
  /** Whether the capability is currently granted */
  granted: boolean;
  /** Whether the capability was requested but denied */
  denied: boolean;
  /** Minimum trust tier required for this capability */
  requiredTier: TrustTier;
  /** Category for grouping in the UI */
  category: 'read' | 'write' | 'admin';
}

/**
 * Default capability display metadata.
 */
export const CAPABILITY_DISPLAY_CONFIG: Record<AgentCapability, Omit<CapabilityEntry, 'granted' | 'denied'>> = {
  read_state: {
    capability: 'read_state',
    label: 'Read State',
    description: 'Can read world state (positions, objects)',
    requiredTier: 'T0',
    category: 'read',
  },
  write_position: {
    capability: 'write_position',
    label: 'Write Position',
    description: 'Can update own avatar position',
    requiredTier: 'T1',
    category: 'write',
  },
  write_emotion: {
    capability: 'write_emotion',
    label: 'Write Emotion',
    description: 'Can update own avatar emotion and animation',
    requiredTier: 'T1',
    category: 'write',
  },
  send_commands: {
    capability: 'send_commands',
    label: 'Send Commands',
    description: 'Can issue commands (spawn objects, etc.)',
    requiredTier: 'T2',
    category: 'write',
  },
  invite_agents: {
    capability: 'invite_agents',
    label: 'Invite Agents',
    description: 'Can invite other agents to the world',
    requiredTier: 'T2',
    category: 'admin',
  },
  modify_world: {
    capability: 'modify_world',
    label: 'Modify World',
    description: 'Can modify world configuration',
    requiredTier: 'T3',
    category: 'admin',
  },
  admin: {
    capability: 'admin',
    label: 'Administrator',
    description: 'Full administrative access',
    requiredTier: 'T3',
    category: 'admin',
  },
};

// =============================================================================
// REVOCATION ALERT
// =============================================================================

/**
 * Severity of a revocation alert.
 */
export type RevocationSeverity = 'warning' | 'critical' | 'info';

/**
 * A revocation alert event for display in the toast component.
 */
export interface RevocationAlert {
  /** Unique alert ID */
  id: string;
  /** Agent that was affected */
  agentId: string;
  /** Agent display name */
  agentName?: string;
  /** The trust action that triggered this alert */
  action: TrustAction;
  /** Alert severity */
  severity: RevocationSeverity;
  /** Human-readable summary */
  message: string;
  /** Detailed reason for the action */
  reason?: string;
  /** Primary behavioral dimension that caused the action */
  primaryCause?: TrustDimension;
  /** Composite score at time of action */
  compositeScore: number;
  /** Timestamp of the alert */
  timestamp: number;
  /** Whether the alert has been dismissed */
  dismissed: boolean;
  /** Auto-dismiss timeout in ms (0 = manual dismiss only) */
  autoDismissMs: number;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Theme configuration for trust UI components.
 * Allows customization of colors, fonts, and spacing.
 */
export interface TrustUITheme {
  /** Base font family */
  fontFamily: string;
  /** Font size scale factor (1.0 = default) */
  fontScale: number;
  /** Border radius for cards and badges */
  borderRadius: string;
  /** Background color for component containers */
  containerBackground: string;
  /** Primary text color */
  textPrimary: string;
  /** Secondary text color */
  textSecondary: string;
  /** Muted text color */
  textMuted: string;
  /** Border color for separators */
  borderColor: string;
  /** Override tier colors (partial, falls back to defaults) */
  tierColors?: Partial<Record<TrustTier, { color: string; backgroundColor: string; borderColor: string }>>;
}

/**
 * Default theme for trust UI components.
 */
export const DEFAULT_TRUST_UI_THEME: TrustUITheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontScale: 1.0,
  borderRadius: '6px',
  containerBackground: '#ffffff',
  textPrimary: '#1a1a2e',
  textSecondary: '#555555',
  textMuted: '#999999',
  borderColor: '#e0e0e0',
};
