/**
 * Cultural Compatibility Dashboard - Shared Types
 *
 * Type definitions for the pairwise agent cultural compatibility dashboard.
 * Extends the existing CulturalHealthMonitor/CultureDashboard ecosystem with
 * focused compatibility analysis: cooperation matrix heatmaps, cultural profiles,
 * norm convergence timelines, drift detection alerts, and population health.
 *
 * Data Sources:
 *   - CulturalHealthWebSocket: Receives CulturalHealthSnapshot via WS
 *   - CulturalHealthMonitor: Cooperation indices, norm adoption, drift vectors
 *   - BehavioralTrustScoring: Per-agent trust dimensions
 *   - CultureDashboard types: Agent roles, dimension configs
 *
 * Performance Contract:
 *   - All data is pre-computed server-side and pushed at <= 10Hz.
 *   - NO classifiers, ML inference, or heavy computation in the render path
 *     (per G.003.09: NEVER put classifiers in VR render loop, 11.1ms budget).
 *   - Dashboard rendering: O(n) for heatmap cells, < 100ms total render target.
 *   - SVG heatmap renders at most 50x50 = 2,500 cells.
 *
 * @module cultural-compatibility-dashboard/types
 */

import type {
  CulturalHealthSnapshot,
  CulturalHealthAlert,
  CulturalAlertSeverity,
  CooperationIndex,
  CulturalDimension,
  CulturalDriftVector,
  CulturalDriftState,
  TrackedNorm,
  TimeSample,
} from '../../CulturalHealthTypes';

import type { CultureRole } from '../culture-dashboard/types';

// =============================================================================
// COOPERATION MATRIX
// =============================================================================

/**
 * A single cell in the cooperation matrix heatmap.
 * Represents pairwise compatibility between two agents.
 */
export interface CooperationMatrixCell {
  /** Row agent ID */
  agentA: string;
  /** Column agent ID */
  agentB: string;
  /** Pairwise cooperation score (0-1). 0 = adversarial, 1 = perfect cooperation */
  cooperationScore: number;
  /** Number of interactions between this pair */
  interactionCount: number;
  /** Whether reciprocity has been observed */
  isReciprocal: boolean;
  /** Defection count for this pair */
  defectionCount: number;
}

/**
 * Full cooperation matrix for the agent population.
 * Matrix is symmetric: cell[i][j] === cell[j][i].
 */
export interface CooperationMatrix {
  /** Ordered list of agent IDs (row/column labels) */
  agentIds: string[];
  /** Agent display names (parallel to agentIds) */
  agentNames: string[];
  /** Flat array of matrix cells, length = agentIds.length^2 */
  cells: CooperationMatrixCell[];
  /** Population-wide average cooperation score */
  averageCooperation: number;
  /** Number of pairs with > 0 interactions */
  activePairs: number;
  /** Timestamp of last matrix computation */
  computedAt: number;
}

// =============================================================================
// CULTURAL PROFILE
// =============================================================================

/**
 * Extended cultural profile for compatibility analysis.
 * Extends beyond CultureDashboard's AgentCultureProfile with
 * compatibility-specific fields.
 */
export interface CompatibilityProfile {
  /** Agent identifier */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** Derived cultural role */
  role: CultureRole;
  /** Model family (e.g., 'GPT-4', 'Claude', 'Llama', 'Mistral') */
  modelFamily: string;
  /** Cooperation tendency (from CulturalGradientTypes, 0-1) */
  cooperationTendency: number;
  /** Norm adherence rate (0-1) */
  normAdherenceRate: number;
  /** Number of norms this agent has adopted */
  adoptedNormCount: number;
  /** Number of norms this agent has violated */
  violationCount: number;
  /** Cultural dimension positions (from CulturalHealthTypes) */
  dimensionPositions: Record<CulturalDimension, number>;
  /** Overall compatibility score with the population (0-1) */
  populationCompatibility: number;
  /** Top 3 most compatible agents */
  topCompatible: Array<{ agentId: string; score: number }>;
  /** Top 3 least compatible agents */
  leastCompatible: Array<{ agentId: string; score: number }>;
  /** Whether this agent is currently active */
  isActive: boolean;
  /** Last activity timestamp */
  lastActiveTimestamp: number;
}

// =============================================================================
// NORM CONVERGENCE
// =============================================================================

/**
 * Norm convergence timeline data point.
 * Tracks how norm adoption rates converge over time across the population.
 */
export interface NormConvergencePoint {
  /** Timestamp (epoch ms) */
  timestamp: number;
  /** Norm identifier */
  normId: string;
  /** Norm display name */
  normName: string;
  /** Current adoption rate (0-1) */
  adoptionRate: number;
  /** Smoothed adoption rate (EWMA) */
  smoothedAdoptionRate: number;
  /** Whether this norm is converging (adoption velocity > 0) */
  isConverging: boolean;
  /** Adoption velocity (rate of change per second) */
  adoptionVelocity: number;
}

/**
 * Aggregated norm convergence state for the timeline chart.
 */
export interface NormConvergenceState {
  /** Active norms being tracked */
  norms: Array<{
    normId: string;
    normName: string;
    currentAdoptionRate: number;
    lifecycleState: string;
    trend: TimeSample[];
    color: string;
  }>;
  /** Population-wide average convergence rate */
  averageConvergence: number;
  /** Whether the population is overall converging */
  isPopulationConverging: boolean;
  /** Timestamp of last update */
  lastUpdateTimestamp: number;
}

// =============================================================================
// DRIFT DETECTION
// =============================================================================

/**
 * Drift detection alert extending CulturalHealthAlert with
 * compatibility-specific metadata.
 */
export interface DriftAlert {
  /** Unique alert ID */
  id: string;
  /** Alert severity */
  severity: CulturalAlertSeverity;
  /** Which cultural dimension is drifting */
  dimension: CulturalDimension;
  /** Human-readable alert message */
  message: string;
  /** Alert timestamp (epoch ms) */
  timestamp: number;
  /** Drift magnitude (0-1 normalized) */
  driftMagnitude: number;
  /** Drift direction (-1 or +1) */
  driftDirection: number;
  /** Current position on the dimension spectrum (-1 to +1) */
  currentPosition: number;
  /** Previous position */
  previousPosition: number;
  /** Whether the alert has been acknowledged */
  acknowledged: boolean;
  /** Affected agent count (agents exhibiting this drift) */
  affectedAgentCount: number;
}

/**
 * Dimension label mapping for display.
 */
export const DIMENSION_LABELS: Record<CulturalDimension, { label: string; poleA: string; poleB: string }> = {
  individualism_collectivism: {
    label: 'Individualism / Collectivism',
    poleA: 'Individualist',
    poleB: 'Collectivist',
  },
  risk_tolerance: {
    label: 'Risk Tolerance',
    poleA: 'Risk-Averse',
    poleB: 'Risk-Seeking',
  },
  hierarchy_egalitarianism: {
    label: 'Hierarchy / Egalitarianism',
    poleA: 'Egalitarian',
    poleB: 'Hierarchical',
  },
  competition_cooperation: {
    label: 'Competition / Cooperation',
    poleA: 'Competitive',
    poleB: 'Cooperative',
  },
  innovation_tradition: {
    label: 'Innovation / Tradition',
    poleA: 'Innovative',
    poleB: 'Traditional',
  },
};

// =============================================================================
// POPULATION HEALTH INDICATORS
// =============================================================================

/**
 * Cross-model population health breakdown.
 * Groups agents by model family and reports cultural health per group.
 */
export interface ModelPopulationHealth {
  /** Model family identifier */
  modelFamily: string;
  /** Number of agents using this model */
  agentCount: number;
  /** Average cooperation score for this model family */
  averageCooperation: number;
  /** Average norm adherence for this model family */
  averageNormAdherence: number;
  /** Overall compatibility with other model families (0-1) */
  crossModelCompatibility: number;
  /** Health classification */
  health: PopulationHealthLevel;
  /** Trend data for this model family's cooperation over time */
  cooperationTrend: TimeSample[];
}

/**
 * Population health level classification.
 */
export type PopulationHealthLevel =
  | 'excellent'    // >= 0.8
  | 'good'         // >= 0.6
  | 'moderate'     // >= 0.4
  | 'poor'         // >= 0.2
  | 'critical';    // < 0.2

/**
 * Overall population health state.
 */
export interface PopulationHealthState {
  /** Total agent count */
  totalAgents: number;
  /** Number of active agents (recent activity) */
  activeAgents: number;
  /** Per-model-family health breakdown */
  modelBreakdown: ModelPopulationHealth[];
  /** Overall population cooperation score */
  overallCooperation: number;
  /** Overall population health level */
  overallHealth: PopulationHealthLevel;
  /** Cultural diversity index (0-1, higher = more diverse) */
  diversityIndex: number;
  /** Population stability score (inverse of aggregate drift, 0-1) */
  stabilityScore: number;
  /** Timestamp of last computation */
  lastUpdateTimestamp: number;
}

// =============================================================================
// AGGREGATE DASHBOARD STATE
// =============================================================================

/**
 * Complete Cultural Compatibility Dashboard state.
 */
export interface CulturalCompatibilityState {
  /** Cooperation matrix data */
  cooperationMatrix: CooperationMatrix | null;
  /** Agent cultural profiles */
  profiles: CompatibilityProfile[];
  /** Norm convergence timeline state */
  normConvergence: NormConvergenceState | null;
  /** Drift detection alerts */
  driftAlerts: DriftAlert[];
  /** Population health indicators */
  populationHealth: PopulationHealthState | null;
  /** Whether the dashboard is receiving live data */
  isLive: boolean;
  /** WebSocket connection status */
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** Last data update timestamp */
  lastUpdateTimestamp: number;
  /** Whether data is stale */
  isStale: boolean;
  /** Selected agent ID for detail view (null = none) */
  selectedAgentId: string | null;
  /** Display mode */
  displayMode: CompatibilityDisplayMode;
}

/**
 * Dashboard display modes.
 */
export type CompatibilityDisplayMode =
  | 'full'          // All panels
  | 'compact'       // Minimal HUD
  | 'heatmap-only'  // Only cooperation matrix
  | 'overlay';      // Semi-transparent overlay

/**
 * Dashboard panels.
 */
export type CompatibilityPanel =
  | 'matrix'         // Cooperation matrix heatmap
  | 'profiles'       // Cultural profile cards
  | 'convergence'    // Norm convergence timeline
  | 'drift-alerts'   // Drift detection alerts
  | 'population'     // Population health indicators
  | 'header';        // Dashboard header

/**
 * Actions exposed by the useCulturalCompatibility hook.
 */
export interface CulturalCompatibilityActions {
  /** Push updated cooperation matrix */
  updateCooperationMatrix: (matrix: CooperationMatrix) => void;
  /** Push updated agent profiles */
  updateProfiles: (profiles: CompatibilityProfile[]) => void;
  /** Push updated norm convergence state */
  updateNormConvergence: (convergence: NormConvergenceState) => void;
  /** Push a drift alert */
  pushDriftAlert: (alert: DriftAlert) => void;
  /** Acknowledge a drift alert */
  acknowledgeDriftAlert: (id: string) => void;
  /** Clear all drift alerts */
  clearDriftAlerts: () => void;
  /** Push updated population health */
  updatePopulationHealth: (health: PopulationHealthState) => void;
  /** Select an agent for detail view */
  selectAgent: (agentId: string | null) => void;
  /** Toggle live data feed */
  toggleLive: () => void;
  /** Set display mode */
  setDisplayMode: (mode: CompatibilityDisplayMode) => void;
  /** Process a full CulturalHealthSnapshot from WebSocket */
  processSnapshot: (snapshot: CulturalHealthSnapshot) => void;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Theme for the Cultural Compatibility Dashboard.
 * Extends the Layer 6 holographic theme pattern.
 */
export interface CompatibilityDashboardTheme {
  /** Base font family */
  fontFamily: string;
  /** Font size scale factor */
  fontScale: number;
  /** Border radius */
  borderRadius: string;

  // Backgrounds
  containerBackground: string;
  cardBackground: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Borders
  borderColor: string;
  glowColor: string;

  // Health/severity colours
  excellentColor: string;
  goodColor: string;
  moderateColor: string;
  poorColor: string;
  criticalColor: string;

  // Heatmap colours (cold to hot gradient)
  heatmapCold: string;
  heatmapNeutral: string;
  heatmapWarm: string;
  heatmapHot: string;

  // Sparkline
  sparklineColor: string;
  sparklineFillColor: string;

  // Accent
  accentColor: string;
}

/**
 * Default theme matching the existing CultureDashboard holographic style.
 */
export const DEFAULT_COMPATIBILITY_THEME: CompatibilityDashboardTheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontScale: 1.0,
  borderRadius: '8px',

  containerBackground: 'rgba(8, 12, 28, 0.88)',
  cardBackground: 'rgba(16, 20, 44, 0.88)',

  textPrimary: '#e8e8f8',
  textSecondary: '#a0a0c8',
  textMuted: '#7880a8',

  borderColor: 'rgba(48, 52, 80, 0.85)',
  glowColor: 'rgba(100, 200, 160, 0.15)',

  excellentColor: '#22c55e',
  goodColor: '#3b82f6',
  moderateColor: '#f59e0b',
  poorColor: '#f97316',
  criticalColor: '#ef4444',

  heatmapCold: '#1e3a5f',
  heatmapNeutral: '#3b6b8a',
  heatmapWarm: '#e0a030',
  heatmapHot: '#22c55e',

  sparklineColor: '#6366f1',
  sparklineFillColor: 'rgba(99, 102, 241, 0.15)',

  accentColor: '#6366f1',
};

// =============================================================================
// PERFORMANCE BUDGET
// =============================================================================

/**
 * Frame budget constants for the compatibility dashboard.
 */
export const COMPATIBILITY_FRAME_BUDGET = {
  /** Maximum render time target (ms) */
  MAX_RENDER_MS: 100,
  /** Maximum agents in heatmap (50x50 = 2,500 cells max) */
  MAX_HEATMAP_AGENTS: 50,
  /** Maximum profiles displayed */
  MAX_PROFILES: 20,
  /** Maximum drift alerts retained */
  MAX_DRIFT_ALERTS: 30,
  /** Maximum norm convergence trend samples */
  MAX_TREND_SAMPLES: 60,
  /** Data staleness threshold (ms) */
  STALENESS_THRESHOLD_MS: 5000,
  /** Alert cooldown (ms) */
  ALERT_COOLDOWN_MS: 3000,
  /** Maximum WebSocket reconnect attempts */
  MAX_RECONNECT_ATTEMPTS: 5,
  /** WebSocket reconnect interval (ms) */
  RECONNECT_INTERVAL_MS: 2000,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Classify a numeric score into a PopulationHealthLevel.
 */
export function classifyHealthLevel(score: number): PopulationHealthLevel {
  if (score >= 0.8) return 'excellent';
  if (score >= 0.6) return 'good';
  if (score >= 0.4) return 'moderate';
  if (score >= 0.2) return 'poor';
  return 'critical';
}

/**
 * Get the theme colour for a population health level.
 */
export function getHealthColor(
  level: PopulationHealthLevel,
  theme: CompatibilityDashboardTheme,
): string {
  switch (level) {
    case 'excellent': return theme.excellentColor;
    case 'good': return theme.goodColor;
    case 'moderate': return theme.moderateColor;
    case 'poor': return theme.poorColor;
    case 'critical': return theme.criticalColor;
    default: return theme.textMuted;
  }
}

/**
 * Get the theme colour for a CulturalAlertSeverity.
 */
export function getSeverityColor(
  severity: CulturalAlertSeverity,
  theme: CompatibilityDashboardTheme,
): string {
  switch (severity) {
    case 'critical': return theme.criticalColor;
    case 'warning': return theme.moderateColor;
    case 'info': return theme.textSecondary;
    default: return theme.textMuted;
  }
}

/**
 * Interpolate a heatmap colour from cold (0) to hot (1).
 */
export function getHeatmapColor(
  value: number,
  theme: CompatibilityDashboardTheme,
): string {
  const clamped = Math.max(0, Math.min(1, value));
  if (clamped < 0.33) return theme.heatmapCold;
  if (clamped < 0.5) return theme.heatmapNeutral;
  if (clamped < 0.75) return theme.heatmapWarm;
  return theme.heatmapHot;
}

/**
 * Compute heatmap cell opacity from cooperation score.
 */
export function getHeatmapOpacity(value: number): number {
  return 0.3 + Math.max(0, Math.min(1, value)) * 0.7;
}

/**
 * Format a score as a percentage string.
 */
export function formatScore(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

/**
 * Format a delta with sign.
 */
export function formatScoreDelta(current: number, previous: number): string {
  const delta = current - previous;
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${(delta * 100).toFixed(1)}%`;
}

/**
 * Create a unique alert ID.
 */
export function createCompatibilityAlertId(): string {
  return `compat-alert-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Norm convergence chart colour palette (distinct, WCAG-friendly against dark bg).
 */
export const NORM_CHART_COLORS: string[] = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#a855f7', // purple
];
