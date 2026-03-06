/**
 * Economic Dashboard - Shared Types
 *
 * Type definitions for the in-world holographic economic dashboard that
 * visualizes real-time virtual economy health metrics as a VR HUD overlay.
 *
 * Metrics displayed:
 *   - Inflation rate (CPI-style index over configurable window)
 *   - Gini coefficient (wealth inequality, 0=perfect equality, 1=total inequality)
 *   - Currency velocity (M*V=P*Q derived, transactions/supply ratio)
 *   - Faucet/sink ratios (currency creation vs destruction balance)
 *   - PID controller status (the feedback controller stabilising the economy)
 *
 * Performance contract:
 *   - All rendering MUST complete within the 11.1ms VR frame budget (90Hz).
 *   - Data updates are pushed at 1-10Hz, NEVER polled in the render loop.
 *   - No classifiers, ML inference, or heavy computation in the render path
 *     (per G.003.09: NEVER put classifiers in VR render loop).
 *   - All per-frame operations are O(1) -- pre-computed data, no iteration.
 *
 * Layer 6 Transparency:
 *   The dashboard renders as a semi-transparent holographic overlay anchored
 *   in world-space. Transparency level is user-configurable and defaults to
 *   0.85 opacity to maintain readability while preserving spatial awareness.
 *
 * @module economic-dashboard/types
 */

// =============================================================================
// DISPLAY MODES
// =============================================================================

/**
 * Display mode for the Economic Dashboard.
 */
export type EconDashboardDisplayMode =
  | 'full'          // Full dashboard with all economic panels
  | 'compact'       // Compact HUD bar showing key metrics only
  | 'pid-only'      // Only PID controller status panel
  | 'overlay';      // Semi-transparent Layer 6 holographic overlay

/**
 * Panels that can be shown/hidden in the dashboard.
 */
export type EconDashboardPanel =
  | 'inflation'     // Inflation rate gauge and trend sparkline
  | 'gini'          // Gini coefficient gauge with distribution bar
  | 'velocity'      // Currency velocity indicator
  | 'faucet-sink'   // Faucet/sink ratio balance visualisation
  | 'pid'           // PID controller status and tuning
  | 'alerts'        // Economic health alerts
  | 'history';      // Historical trend overlay (optional, heavier)

// =============================================================================
// ECONOMIC METRIC TYPES
// =============================================================================

/**
 * Health state of an economic metric.
 * Drives colour coding in the dashboard.
 */
export type EconHealthState =
  | 'healthy'       // Within target band -- green
  | 'caution'       // Approaching bounds -- yellow
  | 'warning'       // Outside soft limits -- orange
  | 'critical';     // Emergency intervention needed -- red

/**
 * A single time-series sample for sparkline/trend display.
 * Pre-bucketed on the backend to avoid per-frame aggregation.
 */
export interface EconTimeSample {
  /** Epoch milliseconds when this bucket was recorded */
  timestamp: number;
  /** The metric value for this bucket */
  value: number;
}

/**
 * Inflation rate snapshot.
 *
 * Based on a CPI-style price index computed server-side over a
 * configurable basket of in-world goods and services.
 */
export interface InflationSnapshot {
  /** Current annualised inflation rate as a percentage (e.g. 2.1 = 2.1%) */
  currentRate: number;
  /** Target inflation rate set by the economic policy (e.g. 2.0%) */
  targetRate: number;
  /** Price index value (base 100 at genesis) */
  priceIndex: number;
  /** Health state derived from distance to target */
  health: EconHealthState;
  /** Recent trend samples (pre-bucketed, max 60 entries for sparkline) */
  trend: EconTimeSample[];
}

/**
 * Gini coefficient snapshot.
 *
 * Measures wealth distribution across all active agents/players.
 * 0.0 = perfect equality, 1.0 = one entity holds everything.
 */
export interface GiniSnapshot {
  /** Current Gini coefficient (0.0 - 1.0) */
  coefficient: number;
  /** Target Gini ceiling set by economic policy */
  targetCeiling: number;
  /** Total number of wealth-holding entities measured */
  entityCount: number;
  /** Health state */
  health: EconHealthState;
  /** Wealth quintile percentages [bottom 20%, ..., top 20%] -- 5 elements */
  quintiles: [number, number, number, number, number];
  /** Recent trend samples */
  trend: EconTimeSample[];
}

/**
 * Currency velocity snapshot.
 *
 * V = (Total Transaction Volume) / (Money Supply) over a time window.
 * High velocity indicates active economy; low velocity indicates hoarding.
 */
export interface VelocitySnapshot {
  /** Current velocity (dimensionless ratio) */
  currentVelocity: number;
  /** Target velocity band [min, max] */
  targetBand: [number, number];
  /** Total transaction volume in the measurement window */
  transactionVolume: number;
  /** Current money supply (M1 equivalent) */
  moneySupply: number;
  /** Health state */
  health: EconHealthState;
  /** Recent trend samples */
  trend: EconTimeSample[];
}

/**
 * Faucet/sink ratio snapshot.
 *
 * Faucets: Sources of new currency entering the economy
 *   (quest rewards, daily stipends, marketplace fees refunded, etc.)
 *
 * Sinks: Destinations destroying currency
 *   (shop purchases to NPC, crafting fees, taxes, repair costs, etc.)
 *
 * Ratio > 1.0 = net inflationary pressure (more created than destroyed).
 * Ratio < 1.0 = net deflationary pressure.
 * Ratio = 1.0 = equilibrium.
 */
export interface FaucetSinkSnapshot {
  /** Total currency created in the measurement window */
  faucetTotal: number;
  /** Total currency destroyed in the measurement window */
  sinkTotal: number;
  /** Faucet/Sink ratio (faucetTotal / sinkTotal, clamped to avoid /0) */
  ratio: number;
  /** Target equilibrium ratio (typically 1.0) */
  targetRatio: number;
  /** Health state */
  health: EconHealthState;
  /** Breakdown of top faucet sources [{name, amount}] -- max 5 */
  topFaucets: EconBreakdownEntry[];
  /** Breakdown of top sink destinations [{name, amount}] -- max 5 */
  topSinks: EconBreakdownEntry[];
  /** Recent ratio trend samples */
  trend: EconTimeSample[];
}

/**
 * A named breakdown entry for faucet/sink detail panels.
 */
export interface EconBreakdownEntry {
  /** Human-readable source/sink name */
  name: string;
  /** Amount of currency in this bucket */
  amount: number;
  /** Percentage of total (0-100) */
  percentage: number;
}

// =============================================================================
// PID CONTROLLER TYPES
// =============================================================================

/**
 * PID controller operating mode.
 */
export type PIDMode =
  | 'automatic'     // PID actively adjusting economy parameters
  | 'manual'        // Human override -- PID outputs ignored
  | 'clamped'       // PID active but output clamped to safety bounds
  | 'disabled';     // Controller turned off entirely

/**
 * PID controller state snapshot.
 *
 * The PID controller is the feedback mechanism that adjusts faucet/sink
 * rates, tax levels, and reward multipliers to maintain economic targets.
 *
 * Classic PID: output = Kp*e + Ki*integral(e) + Kd*de/dt
 *
 * The controller runs server-side at 1Hz (NOT in the render loop).
 * This snapshot is a read-only view pushed to the dashboard.
 */
export interface PIDControllerSnapshot {
  /** Current controller mode */
  mode: PIDMode;
  /** Which economic variable the PID is tracking (e.g. 'inflation', 'velocity') */
  controlVariable: string;
  /** Current setpoint (target value) */
  setpoint: number;
  /** Current process variable (measured value) */
  processVariable: number;
  /** Current error (setpoint - processVariable) */
  error: number;
  /** Proportional gain */
  kp: number;
  /** Integral gain */
  ki: number;
  /** Derivative gain */
  kd: number;
  /** Current proportional term */
  pTerm: number;
  /** Current integral term (accumulated) */
  iTerm: number;
  /** Current derivative term */
  dTerm: number;
  /** Controller output (sum of P+I+D, before clamping) */
  output: number;
  /** Clamped controller output (actual value applied) */
  clampedOutput: number;
  /** Output clamp bounds [min, max] */
  outputBounds: [number, number];
  /** Whether the integral term is currently wound up (saturated) */
  integralWindup: boolean;
  /** Timestamp of last PID tick (epoch ms) */
  lastTickTimestamp: number;
  /** Health state of the controller */
  health: EconHealthState;
  /** Recent output trend samples */
  outputTrend: EconTimeSample[];
}

// =============================================================================
// AGGREGATE ECONOMIC STATE
// =============================================================================

/**
 * Complete economic dashboard state consumed by the UI.
 * All data is pre-computed server-side and pushed to the dashboard.
 */
export interface EconomicDashboardState {
  /** Inflation rate snapshot */
  inflation: InflationSnapshot | null;
  /** Gini coefficient snapshot */
  gini: GiniSnapshot | null;
  /** Currency velocity snapshot */
  velocity: VelocitySnapshot | null;
  /** Faucet/sink ratio snapshot */
  faucetSink: FaucetSinkSnapshot | null;
  /** PID controller status snapshot */
  pid: PIDControllerSnapshot | null;
  /** Active economic health alerts */
  alerts: EconomicAlert[];
  /** Whether the dashboard is receiving live data */
  isLive: boolean;
  /** Dashboard display mode */
  displayMode: EconDashboardDisplayMode;
  /** Panels currently visible */
  visiblePanels: Set<EconDashboardPanel>;
  /** Last data update timestamp */
  lastUpdateTimestamp: number;
  /** Data staleness threshold in ms (default 5000) */
  stalenessThresholdMs: number;
  /** Whether data is considered stale */
  isStale: boolean;
}

/**
 * Actions available from the useEconomicDashboard hook.
 */
export interface EconomicDashboardActions {
  /** Push updated inflation snapshot */
  updateInflation: (snapshot: InflationSnapshot) => void;
  /** Push updated Gini snapshot */
  updateGini: (snapshot: GiniSnapshot) => void;
  /** Push updated velocity snapshot */
  updateVelocity: (snapshot: VelocitySnapshot) => void;
  /** Push updated faucet/sink snapshot */
  updateFaucetSink: (snapshot: FaucetSinkSnapshot) => void;
  /** Push updated PID controller snapshot */
  updatePID: (snapshot: PIDControllerSnapshot) => void;
  /** Dismiss an alert */
  dismissAlert: (id: string) => void;
  /** Clear all alerts */
  clearAlerts: () => void;
  /** Toggle live/paused data feed */
  toggleLive: () => void;
  /** Set display mode */
  setDisplayMode: (mode: EconDashboardDisplayMode) => void;
  /** Toggle a panel's visibility */
  togglePanel: (panel: EconDashboardPanel) => void;
}

// =============================================================================
// ALERTS
// =============================================================================

/**
 * An economic health alert.
 */
export interface EconomicAlert {
  /** Unique alert ID */
  id: string;
  /** Alert timestamp */
  timestamp: number;
  /** Alert severity */
  severity: 'info' | 'warning' | 'critical';
  /** Which metric triggered the alert */
  metric: 'inflation' | 'gini' | 'velocity' | 'faucet_sink' | 'pid' | 'general';
  /** Human-readable message */
  message: string;
  /** Whether the alert has been dismissed */
  dismissed: boolean;
}

// =============================================================================
// THEME (Layer 6 Transparency-Aware)
// =============================================================================

/**
 * Theme for the holographic economic dashboard.
 *
 * Designed for Layer 6 transparency: all backgrounds use RGBA with
 * configurable alpha to maintain readability over 3D world content.
 * Foreground colours meet WCAG 2.1 AA contrast ratios against the
 * semi-transparent backgrounds at default opacity (0.85).
 */
export interface EconDashboardTheme {
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
  /** Healthy / nominal -- green */
  healthyColor: string;
  /** Caution -- yellow */
  cautionColor: string;
  /** Warning -- orange */
  warningColor: string;
  /** Critical -- red */
  criticalColor: string;

  // --- Metric-Specific Colours ---
  /** Inflation gauge primary colour */
  inflationColor: string;
  /** Gini coefficient gauge colour */
  giniColor: string;
  /** Velocity indicator colour */
  velocityColor: string;
  /** Faucet (creation) colour */
  faucetColor: string;
  /** Sink (destruction) colour */
  sinkColor: string;
  /** PID output trace colour */
  pidOutputColor: string;
  /** PID setpoint line colour */
  pidSetpointColor: string;
  /** PID error band colour */
  pidErrorColor: string;

  // --- Sparkline ---
  /** Sparkline stroke colour */
  sparklineColor: string;
  /** Sparkline fill (area under curve) */
  sparklineFillColor: string;

  // --- Accent ---
  /** Accent colour for highlights and interactive elements */
  accentColor: string;
}

/**
 * Default holographic theme for the economic dashboard.
 *
 * Layer 6 transparency: backgrounds are rgba() with alpha derived from
 * overlayOpacity. All foreground colours meet WCAG 2.1 AA minimum
 * contrast (4.5:1) against the semi-transparent backgrounds at 0.85 alpha.
 */
export const DEFAULT_ECON_DASHBOARD_THEME: EconDashboardTheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontScale: 1.0,
  borderRadius: '8px',

  // Layer 6 transparency
  overlayOpacity: 0.85,
  containerBackground: 'rgba(8, 12, 28, 0.85)',
  cardBackground: 'rgba(16, 20, 44, 0.85)',

  // Text
  textPrimary: '#e8e8f8',       // 13.1:1 ratio against container bg at 0.85
  textSecondary: '#a0a0c8',     // 6.2:1 ratio
  textMuted: '#7880a8',         // 4.5:1 ratio (AA minimum)

  // Borders
  borderColor: 'rgba(48, 52, 80, 0.85)',
  glowColor: 'rgba(100, 130, 255, 0.15)',

  // Health state
  healthyColor: '#22c55e',      // Green
  cautionColor: '#eab308',      // Yellow
  warningColor: '#f97316',      // Orange
  criticalColor: '#ef4444',     // Red

  // Metric-specific
  inflationColor: '#f59e0b',    // Amber -- inflation warmth metaphor
  giniColor: '#8b5cf6',         // Violet -- inequality spectrum
  velocityColor: '#06b6d4',     // Cyan -- flow/movement metaphor
  faucetColor: '#22c55e',       // Green -- money entering
  sinkColor: '#ef4444',         // Red -- money leaving
  pidOutputColor: '#3b82f6',    // Blue -- controller output
  pidSetpointColor: '#a855f7',  // Purple -- target line
  pidErrorColor: 'rgba(239, 68, 68, 0.3)', // Semi-transparent red band

  // Sparkline
  sparklineColor: '#6366f1',    // Indigo
  sparklineFillColor: 'rgba(99, 102, 241, 0.15)',

  // Accent
  accentColor: '#6366f1',
};

// =============================================================================
// PERFORMANCE BUDGET CONSTANTS
// =============================================================================

/**
 * Frame budget constants for VR rendering at 90Hz.
 *
 * The economic dashboard runs as a HUD overlay and MUST NOT exceed
 * its allocated portion of the 11.1ms frame budget.
 */
export const FRAME_BUDGET = {
  /** Total VR frame budget at 90Hz in ms */
  TOTAL_FRAME_MS: 11.1,
  /** Maximum time allocated to the economic dashboard overlay in ms.
   *  This is well under 1ms to leave headroom for splat rendering (~5.5ms)
   *  and other systems. Dashboard is pure pre-computed data display. */
  DASHBOARD_BUDGET_MS: 0.5,
  /** Maximum data push rate from backend (Hz). Higher rates waste bandwidth
   *  since the dashboard visually updates at most every 100ms. */
  MAX_DATA_PUSH_RATE_HZ: 10,
  /** Staleness threshold: data older than this is considered stale (ms) */
  STALENESS_THRESHOLD_MS: 5000,
  /** Maximum sparkline samples retained per metric */
  MAX_SPARKLINE_SAMPLES: 60,
  /** Maximum alerts retained */
  MAX_ALERTS: 30,
  /** Alert cooldown to prevent spam (ms) */
  ALERT_COOLDOWN_MS: 3000,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the theme colour for an economic health state.
 */
export function getHealthStateColor(
  state: EconHealthState,
  theme: EconDashboardTheme,
): string {
  switch (state) {
    case 'healthy': return theme.healthyColor;
    case 'caution': return theme.cautionColor;
    case 'warning': return theme.warningColor;
    case 'critical': return theme.criticalColor;
    default: return theme.textMuted;
  }
}

/**
 * Format a currency amount for display.
 * Uses compact notation: 1234 -> "1.2K", 1234567 -> "1.2M"
 */
export function formatCurrency(amount: number): string {
  if (amount < 0) return `-${formatCurrency(-amount)}`;
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  if (amount >= 1) return amount.toFixed(0);
  return amount.toFixed(2);
}

/**
 * Format a percentage for display.
 * 2.135 -> "2.14%", 0.05 -> "0.05%"
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a ratio for display.
 * 1.05 -> "1.05x", 0.95 -> "0.95x"
 */
export function formatRatio(value: number): string {
  return `${value.toFixed(2)}x`;
}

/**
 * Format a Gini coefficient for display.
 * 0.42 -> "0.420"
 */
export function formatGini(value: number): string {
  return value.toFixed(3);
}

/**
 * Determine the health state of a value relative to a target and bounds.
 *
 * @param value Current value
 * @param target Target/ideal value
 * @param cautionDelta Deviation from target to enter caution (absolute)
 * @param warningDelta Deviation to enter warning
 * @param criticalDelta Deviation to enter critical
 */
export function computeHealthState(
  value: number,
  target: number,
  cautionDelta: number,
  warningDelta: number,
  criticalDelta: number,
): EconHealthState {
  const deviation = Math.abs(value - target);
  if (deviation >= criticalDelta) return 'critical';
  if (deviation >= warningDelta) return 'warning';
  if (deviation >= cautionDelta) return 'caution';
  return 'healthy';
}

/**
 * Create a unique alert ID.
 */
export function createEconAlertId(): string {
  return `econ-alert-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
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
  // Parse existing rgba string
  const match = rgbaBase.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+)?\s*\)/,
  );
  if (!match) return rgbaBase;
  const [, r, g, b] = match;
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacity, 0, 1).toFixed(2)})`;
}
