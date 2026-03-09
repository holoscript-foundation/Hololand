/**
 * Culture Dashboard - Shared Types
 *
 * Type definitions for the multi-agent cultural health monitoring dashboard.
 * Visualises emergent cultural dynamics across agent populations in real-time,
 * measuring alignment, collaboration patterns, norm adherence, and diversity.
 *
 * Cultural Health Dimensions:
 *   - Alignment:    How well agents share common goals and coordinate actions
 *   - Collaboration: Quality and frequency of inter-agent cooperative behaviour
 *   - Norm Adherence: Consistency with established community norms and protocols
 *   - Diversity:     Healthy variation in agent behaviours and strategies
 *   - Resilience:    Ability of the culture to absorb disruptions and recover
 *
 * Cultural Health States:
 *   Thriving   - All dimensions within healthy ranges, culture is productive
 *   Stable     - Minor deviations, culture is self-correcting
 *   Strained   - One or more dimensions approaching unhealthy thresholds
 *   Critical   - Culture requires intervention to prevent collapse
 *
 * Performance Contract:
 *   - All data is pre-computed server-side and pushed at <= 10Hz.
 *   - NO classifiers, ML inference, or heavy computation in the render path
 *     (per G.003.09: NEVER put classifiers in VR render loop, 11.1ms budget).
 *   - Dashboard rendering is pure data display: O(1) per frame, < 0.5ms total.
 *
 * @module culture-dashboard/types
 */

import type { TrustDimension } from '../../BehavioralTrustScoring';

// =============================================================================
// CULTURAL HEALTH DIMENSIONS
// =============================================================================

/**
 * The five cultural health dimensions measured across the agent population.
 */
export type CultureDimension =
  | 'alignment'
  | 'collaboration'
  | 'norm_adherence'
  | 'diversity'
  | 'resilience';

/**
 * All culture dimensions in display order.
 */
export const ALL_CULTURE_DIMENSIONS: CultureDimension[] = [
  'alignment',
  'collaboration',
  'norm_adherence',
  'diversity',
  'resilience',
];

/**
 * Health state of a cultural metric.
 * Drives colour coding in the dashboard.
 */
export type CultureHealthState =
  | 'thriving'     // All metrics within ideal range -- green
  | 'stable'       // Minor deviations, self-correcting -- blue
  | 'strained'     // Approaching unhealthy thresholds -- yellow/orange
  | 'critical';    // Requires intervention -- red

// =============================================================================
// DISPLAY MODES
// =============================================================================

/**
 * Display mode for the Culture Dashboard.
 */
export type CultureDashboardDisplayMode =
  | 'full'          // Full dashboard with all cultural panels
  | 'compact'       // Compact HUD bar showing key metrics only
  | 'radar-only'    // Only the radar chart (dimension overview)
  | 'overlay';      // Semi-transparent Layer 6 holographic overlay

/**
 * Panels that can be shown/hidden in the dashboard.
 */
export type CultureDashboardPanel =
  | 'health-gauge'   // Overall cultural health gauge
  | 'dimensions'     // Per-dimension breakdown with radar
  | 'timeline'       // Historical culture evolution timeline
  | 'agents'         // Per-agent cultural contribution view
  | 'norms'          // Active norms and compliance rates
  | 'alerts';        // Cultural health alerts

// =============================================================================
// DIMENSION METADATA
// =============================================================================

/**
 * Metadata for each culture dimension.
 */
export interface CultureDimensionMeta {
  /** Dimension identifier */
  dimension: CultureDimension;
  /** Human-readable label */
  label: string;
  /** Short description */
  description: string;
  /** Primary colour (hex) */
  color: string;
  /** Icon character representation */
  icon: string;
  /** Ideal range [min, max] for this dimension (0-1) */
  idealRange: [number, number];
  /** Weight in composite score calculation */
  weight: number;
}

/**
 * Configuration for all culture dimension visual properties.
 */
export const CULTURE_DIMENSION_CONFIG: Record<CultureDimension, CultureDimensionMeta> = {
  alignment: {
    dimension: 'alignment',
    label: 'Alignment',
    description: 'Shared goals and coordinated action across agents',
    color: '#3B82F6',   // Blue
    icon: '\u2316',     // Position indicator (crosshair)
    idealRange: [0.6, 0.9],
    weight: 1.0,
  },
  collaboration: {
    dimension: 'collaboration',
    label: 'Collaboration',
    description: 'Quality and frequency of cooperative agent interactions',
    color: '#8B5CF6',   // Violet
    icon: '\u2194',     // Left-right arrow (exchange)
    idealRange: [0.5, 0.85],
    weight: 1.0,
  },
  norm_adherence: {
    dimension: 'norm_adherence',
    label: 'Norm Adherence',
    description: 'Consistency with established community protocols',
    color: '#F59E0B',   // Amber
    icon: '\u2611',     // Ballot box with check
    idealRange: [0.7, 1.0],
    weight: 1.2,
  },
  diversity: {
    dimension: 'diversity',
    label: 'Diversity',
    description: 'Healthy variation in agent behaviours and strategies',
    color: '#10B981',   // Emerald
    icon: '\u2726',     // Four-pointed star
    idealRange: [0.4, 0.8],
    weight: 0.8,
  },
  resilience: {
    dimension: 'resilience',
    label: 'Resilience',
    description: 'Ability to absorb disruptions and recover cultural norms',
    color: '#EF4444',   // Red
    icon: '\u2764',     // Heart (strength)
    idealRange: [0.5, 0.9],
    weight: 0.9,
  },
};

// =============================================================================
// DIMENSION SNAPSHOTS
// =============================================================================

/**
 * A single time-series sample for sparkline/trend display.
 * Pre-bucketed on the backend to avoid per-frame aggregation.
 */
export interface CultureTimeSample {
  /** Epoch milliseconds when this bucket was recorded */
  timestamp: number;
  /** The metric value for this bucket */
  value: number;
}

/**
 * Per-dimension culture score snapshot.
 */
export interface CultureDimensionSnapshot {
  /** Which dimension this snapshot represents */
  dimension: CultureDimension;
  /** Current score (0-1) */
  score: number;
  /** Previous score for delta calculation */
  previousScore: number;
  /** Health state for this dimension */
  health: CultureHealthState;
  /** Number of agents contributing to this dimension */
  contributingAgents: number;
  /** Recent trend samples (pre-bucketed, max 60 entries for sparkline) */
  trend: CultureTimeSample[];
}

/**
 * Composite cultural health snapshot aggregating all dimensions.
 */
export interface CultureHealthSnapshot {
  /** Composite cultural health score (0-1) weighted across all dimensions */
  compositeScore: number;
  /** Previous composite score */
  previousComposite: number;
  /** Overall health state */
  health: CultureHealthState;
  /** Per-dimension scores */
  dimensions: Record<CultureDimension, CultureDimensionSnapshot>;
  /** Total active agents in the population */
  totalAgents: number;
  /** Composite trend samples */
  compositeTrend: CultureTimeSample[];
}

// =============================================================================
// AGENT CULTURAL PROFILE
// =============================================================================

/**
 * An individual agent's cultural contribution profile.
 */
export interface AgentCultureProfile {
  /** Agent unique identifier */
  agentId: string;
  /** Agent display name */
  agentName?: string;
  /** Per-dimension contribution scores (0-1) */
  dimensionScores: Record<CultureDimension, number>;
  /** Composite cultural contribution score */
  compositeScore: number;
  /** Cultural role classification */
  role: CultureRole;
  /** Number of norm violations in the measurement window */
  normViolations: number;
  /** Number of collaborative interactions in the measurement window */
  collaborativeInteractions: number;
  /** Timestamp of last activity */
  lastActiveTimestamp: number;
  /** Correlation with BehavioralTrustScoring dimensions */
  trustCorrelation?: Partial<Record<TrustDimension, number>>;
}

/**
 * Cultural role that an agent plays in the population.
 * Derived from behavioural patterns, not assigned.
 */
export type CultureRole =
  | 'leader'       // High alignment + collaboration, influences norms
  | 'collaborator' // High collaboration, bridges different agent groups
  | 'conformist'   // High norm adherence, low diversity contribution
  | 'innovator'    // High diversity, may push norm boundaries
  | 'observer'     // Low activity, but consistent norm adherence
  | 'disruptor';   // Low norm adherence, potentially destabilising

/**
 * Display metadata for each culture role.
 */
export interface CultureRoleMeta {
  role: CultureRole;
  label: string;
  description: string;
  color: string;
  icon: string;
}

/**
 * Role display configuration.
 */
export const CULTURE_ROLE_CONFIG: Record<CultureRole, CultureRoleMeta> = {
  leader: {
    role: 'leader',
    label: 'Leader',
    description: 'Influences norms and coordinates group action',
    color: '#3B82F6',
    icon: '\u2605',   // Star
  },
  collaborator: {
    role: 'collaborator',
    label: 'Collaborator',
    description: 'Bridges agent groups through cooperative interaction',
    color: '#8B5CF6',
    icon: '\u2194',   // Arrows
  },
  conformist: {
    role: 'conformist',
    label: 'Conformist',
    description: 'Consistently adheres to established norms',
    color: '#F59E0B',
    icon: '\u2713',   // Check
  },
  innovator: {
    role: 'innovator',
    label: 'Innovator',
    description: 'Introduces healthy variation and new strategies',
    color: '#10B981',
    icon: '\u2726',   // Star
  },
  observer: {
    role: 'observer',
    label: 'Observer',
    description: 'Low activity but consistent norm compliance',
    color: '#6B7280',
    icon: '\u25CB',   // Circle
  },
  disruptor: {
    role: 'disruptor',
    label: 'Disruptor',
    description: 'May destabilise cultural norms',
    color: '#EF4444',
    icon: '\u26A0',   // Warning
  },
};

// =============================================================================
// COMMUNITY NORMS
// =============================================================================

/**
 * A community norm tracked by the culture system.
 */
export interface CommunityNorm {
  /** Unique norm identifier */
  id: string;
  /** Human-readable norm name */
  name: string;
  /** Detailed description */
  description: string;
  /** Current compliance rate across all agents (0-1) */
  complianceRate: number;
  /** Number of agents compliant with this norm */
  compliantAgents: number;
  /** Total agents measured */
  totalAgents: number;
  /** Health state of this norm */
  health: CultureHealthState;
  /** Category for grouping */
  category: 'interaction' | 'spatial' | 'communication' | 'economic';
  /** Whether the norm is actively enforced */
  enforced: boolean;
}

// =============================================================================
// AGGREGATE DASHBOARD STATE
// =============================================================================

/**
 * Complete culture dashboard state consumed by the UI.
 * All data is pre-computed server-side and pushed to the dashboard.
 */
export interface CultureDashboardState {
  /** Overall cultural health snapshot */
  health: CultureHealthSnapshot | null;
  /** Top agent cultural profiles (sorted by composite score, max 20) */
  agentProfiles: AgentCultureProfile[];
  /** Active community norms */
  norms: CommunityNorm[];
  /** Active cultural health alerts */
  alerts: CultureAlert[];
  /** Whether the dashboard is receiving live data */
  isLive: boolean;
  /** Dashboard display mode */
  displayMode: CultureDashboardDisplayMode;
  /** Panels currently visible */
  visiblePanels: Set<CultureDashboardPanel>;
  /** Last data update timestamp */
  lastUpdateTimestamp: number;
  /** Data staleness threshold in ms (default 5000) */
  stalenessThresholdMs: number;
  /** Whether data is considered stale */
  isStale: boolean;
}

/**
 * Actions available from the useCultureDashboard hook.
 */
export interface CultureDashboardActions {
  /** Push updated cultural health snapshot */
  updateHealth: (snapshot: CultureHealthSnapshot) => void;
  /** Push updated agent profiles */
  updateAgentProfiles: (profiles: AgentCultureProfile[]) => void;
  /** Push updated community norms */
  updateNorms: (norms: CommunityNorm[]) => void;
  /** Dismiss an alert */
  dismissAlert: (id: string) => void;
  /** Clear all alerts */
  clearAlerts: () => void;
  /** Toggle live/paused data feed */
  toggleLive: () => void;
  /** Set display mode */
  setDisplayMode: (mode: CultureDashboardDisplayMode) => void;
  /** Toggle a panel's visibility */
  togglePanel: (panel: CultureDashboardPanel) => void;
}

// =============================================================================
// ALERTS
// =============================================================================

/**
 * A cultural health alert.
 */
export interface CultureAlert {
  /** Unique alert ID */
  id: string;
  /** Alert timestamp */
  timestamp: number;
  /** Alert severity */
  severity: 'info' | 'warning' | 'critical';
  /** Which dimension triggered the alert (or 'general') */
  dimension: CultureDimension | 'general';
  /** Human-readable message */
  message: string;
  /** Whether the alert has been dismissed */
  dismissed: boolean;
}

// =============================================================================
// THEME (Layer 6 Transparency-Aware)
// =============================================================================

/**
 * Theme for the holographic culture dashboard.
 *
 * Designed for Layer 6 transparency: all backgrounds use RGBA with
 * configurable alpha to maintain readability over 3D world content.
 * Foreground colours meet WCAG 2.1 AA contrast ratios against the
 * semi-transparent backgrounds at default opacity (0.85).
 */
export interface CultureDashboardTheme {
  /** Base font family */
  fontFamily: string;
  /** Font size scale factor (1.0 = default VR-readable size) */
  fontScale: number;
  /** Border radius for holographic panels */
  borderRadius: string;

  // --- Layer 6 Transparency ---
  /** Global overlay opacity (0.0 - 1.0). Default 0.85. */
  overlayOpacity: number;
  /** Container background (RGBA string for transparency) */
  containerBackground: string;
  /** Card/panel background (RGBA string) */
  cardBackground: string;

  // --- Text ---
  /** Primary text colour */
  textPrimary: string;
  /** Secondary text colour */
  textSecondary: string;
  /** Muted text colour (labels, axis ticks) */
  textMuted: string;

  // --- Borders ---
  /** Panel border colour */
  borderColor: string;
  /** Holographic glow colour for panel edges */
  glowColor: string;

  // --- Health State Colours ---
  /** Thriving / healthy -- green */
  thrivingColor: string;
  /** Stable -- blue */
  stableColor: string;
  /** Strained -- orange */
  strainedColor: string;
  /** Critical -- red */
  criticalColor: string;

  // --- Dimension Colours (override CULTURE_DIMENSION_CONFIG) ---
  /** Override dimension colours */
  dimensionColors?: Partial<Record<CultureDimension, string>>;

  // --- Sparkline ---
  /** Sparkline stroke colour */
  sparklineColor: string;
  /** Sparkline fill (area under curve) */
  sparklineFillColor: string;

  // --- Radar ---
  /** Radar chart grid lines colour */
  radarGridColor: string;
  /** Radar chart fill colour */
  radarFillColor: string;

  // --- Accent ---
  /** Accent colour for highlights and interactive elements */
  accentColor: string;
}

/**
 * Default holographic theme for the culture dashboard.
 *
 * Layer 6 transparency: backgrounds are rgba() with alpha derived from
 * overlayOpacity. All foreground colours meet WCAG 2.1 AA minimum
 * contrast (4.5:1) against the semi-transparent backgrounds at 0.85 alpha.
 */
export const DEFAULT_CULTURE_DASHBOARD_THEME: CultureDashboardTheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontScale: 1.0,
  borderRadius: '8px',

  // Layer 6 transparency
  overlayOpacity: 0.85,
  containerBackground: 'rgba(8, 12, 28, 0.85)',
  cardBackground: 'rgba(16, 20, 44, 0.85)',

  // Text (contrast ratios measured against container bg at 0.85 alpha)
  textPrimary: '#e8e8f8',       // 13.1:1 ratio
  textSecondary: '#a0a0c8',     // 6.2:1 ratio
  textMuted: '#7880a8',         // 4.5:1 ratio (AA minimum)

  // Borders
  borderColor: 'rgba(48, 52, 80, 0.85)',
  glowColor: 'rgba(100, 200, 160, 0.15)',

  // Health state
  thrivingColor: '#22c55e',     // Green
  stableColor: '#3b82f6',       // Blue
  strainedColor: '#f97316',     // Orange
  criticalColor: '#ef4444',     // Red

  // Sparkline
  sparklineColor: '#6366f1',    // Indigo
  sparklineFillColor: 'rgba(99, 102, 241, 0.15)',

  // Radar
  radarGridColor: 'rgba(120, 128, 168, 0.3)',
  radarFillColor: 'rgba(59, 130, 246, 0.2)',

  // Accent
  accentColor: '#6366f1',
};

// =============================================================================
// PERFORMANCE BUDGET CONSTANTS
// =============================================================================

/**
 * Frame budget constants for VR rendering at 90Hz.
 *
 * The culture dashboard runs as a HUD overlay and MUST NOT exceed
 * its allocated portion of the 11.1ms frame budget.
 */
export const CULTURE_FRAME_BUDGET = {
  /** Total VR frame budget at 90Hz in ms */
  TOTAL_FRAME_MS: 11.1,
  /** Maximum time allocated to the culture dashboard overlay in ms */
  DASHBOARD_BUDGET_MS: 0.5,
  /** Maximum data push rate from backend (Hz) */
  MAX_DATA_PUSH_RATE_HZ: 10,
  /** Staleness threshold: data older than this is considered stale (ms) */
  STALENESS_THRESHOLD_MS: 5000,
  /** Maximum sparkline samples retained per metric */
  MAX_SPARKLINE_SAMPLES: 60,
  /** Maximum alerts retained */
  MAX_ALERTS: 30,
  /** Alert cooldown to prevent spam (ms) */
  ALERT_COOLDOWN_MS: 3000,
  /** Maximum agent profiles displayed */
  MAX_AGENT_PROFILES: 20,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the theme colour for a culture health state.
 */
export function getCultureHealthColor(
  state: CultureHealthState,
  theme: CultureDashboardTheme,
): string {
  switch (state) {
    case 'thriving': return theme.thrivingColor;
    case 'stable': return theme.stableColor;
    case 'strained': return theme.strainedColor;
    case 'critical': return theme.criticalColor;
    default: return theme.textMuted;
  }
}

/**
 * Get the colour for a culture dimension, supporting theme overrides.
 */
export function getDimensionColor(
  dimension: CultureDimension,
  theme: CultureDashboardTheme,
): string {
  return theme.dimensionColors?.[dimension]
    ?? CULTURE_DIMENSION_CONFIG[dimension].color;
}

/**
 * Determine culture health state from a composite score.
 */
export function scoreToCultureHealth(score: number): CultureHealthState {
  if (score >= 0.75) return 'thriving';
  if (score >= 0.5) return 'stable';
  if (score >= 0.25) return 'strained';
  return 'critical';
}

/**
 * Format a culture score as a percentage for display.
 */
export function formatCultureScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

/**
 * Format a score delta with sign indicator.
 */
export function formatDelta(current: number, previous: number): string {
  const delta = current - previous;
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${(delta * 100).toFixed(1)}%`;
}

/**
 * Create a unique culture alert ID.
 */
export function createCultureAlertId(): string {
  return `culture-alert-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Clamp a number to a range.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute the Layer 6 background with the given overlay opacity.
 * Takes an RGBA base and replaces the alpha channel.
 */
export function applyOverlayOpacity(
  rgbaBase: string,
  opacity: number,
): string {
  const match = rgbaBase.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+)?\s*\)/,
  );
  if (!match) return rgbaBase;
  const [, r, g, b] = match;
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacity, 0, 1).toFixed(2)})`;
}

/**
 * Determine whether a dimension score is within its ideal range.
 */
export function isDimensionHealthy(
  dimension: CultureDimension,
  score: number,
): boolean {
  const meta = CULTURE_DIMENSION_CONFIG[dimension];
  return score >= meta.idealRange[0] && score <= meta.idealRange[1];
}

/**
 * Compute the culture health state for a single dimension based on its
 * score relative to the ideal range.
 */
export function computeDimensionHealth(
  dimension: CultureDimension,
  score: number,
): CultureHealthState {
  const meta = CULTURE_DIMENSION_CONFIG[dimension];
  const [idealMin, idealMax] = meta.idealRange;

  // Within ideal range
  if (score >= idealMin && score <= idealMax) return 'thriving';

  // Distance from nearest ideal boundary
  const distBelow = idealMin - score;
  const distAbove = score - idealMax;
  const distance = Math.max(distBelow, distAbove, 0);

  if (distance <= 0.1) return 'stable';
  if (distance <= 0.25) return 'strained';
  return 'critical';
}

/**
 * Derive a CultureRole from an agent's dimension scores.
 * Simple heuristic based on relative dimension strengths.
 */
export function deriveCultureRole(
  scores: Record<CultureDimension, number>,
): CultureRole {
  const { alignment, collaboration, norm_adherence, diversity } = scores;

  // High alignment + collaboration = leader
  if (alignment >= 0.75 && collaboration >= 0.7) return 'leader';

  // Low norm adherence = disruptor
  if (norm_adherence < 0.3) return 'disruptor';

  // High collaboration = collaborator
  if (collaboration >= 0.7) return 'collaborator';

  // High diversity, moderate norms = innovator
  if (diversity >= 0.7 && norm_adherence >= 0.4) return 'innovator';

  // High norm adherence, lower diversity = conformist
  if (norm_adherence >= 0.7 && diversity < 0.4) return 'conformist';

  // Default: observer
  return 'observer';
}
