/**
 * Bundle Size Monitor Dashboard - Shared Types
 *
 * Type definitions for the automated bundle budget monitoring dashboard
 * for HoloScript Studio. Tracks chunk sizes, load times, budget
 * thresholds, and historical trends.
 *
 * Metrics:
 *   - Per-chunk size (raw and gzipped)
 *   - Total bundle size with budget comparison
 *   - Load time estimates for various network conditions
 *   - Historical size trends per build
 *   - Budget threshold alerts with CI/CD integration
 *
 * Performance contract:
 *   - All rendering within 11.1ms VR frame budget (90Hz)
 *   - Build data pushed at max 10Hz, NEVER polled in render loop
 *   - Pre-computed size metrics, no parsing in the render path
 *
 * @module bundle-monitor/types
 */

// =============================================================================
// BUDGET MODEL
// =============================================================================

/**
 * Budget status for a chunk or total bundle.
 */
export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

/**
 * Network condition preset for load time estimation.
 */
export type NetworkPreset = 'fast-3g' | 'slow-3g' | '4g' | 'broadband';

/**
 * Network preset configuration.
 */
export interface NetworkPresetConfig {
  /** Preset identifier */
  preset: NetworkPreset;
  /** Human-readable label */
  label: string;
  /** Download bandwidth in Mbps */
  bandwidthMbps: number;
  /** Round-trip latency in ms */
  latencyMs: number;
}

/**
 * Predefined network presets.
 */
export const NETWORK_PRESETS: Record<NetworkPreset, NetworkPresetConfig> = {
  'slow-3g': {
    preset: 'slow-3g',
    label: 'Slow 3G',
    bandwidthMbps: 0.4,
    latencyMs: 400,
  },
  'fast-3g': {
    preset: 'fast-3g',
    label: 'Fast 3G',
    bandwidthMbps: 1.5,
    latencyMs: 150,
  },
  '4g': {
    preset: '4g',
    label: '4G LTE',
    bandwidthMbps: 10,
    latencyMs: 50,
  },
  broadband: {
    preset: 'broadband',
    label: 'Broadband',
    bandwidthMbps: 50,
    latencyMs: 20,
  },
};

// =============================================================================
// CHUNK DATA
// =============================================================================

/**
 * Information about a single bundle chunk.
 */
export interface BundleChunk {
  /** Chunk name/identifier */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Raw size in bytes (uncompressed) */
  rawSize: number;
  /** Gzipped size in bytes */
  gzipSize: number;
  /** Brotli size in bytes (optional) */
  brotliSize?: number;
  /** Size budget in bytes (gzipped) */
  budgetBytes: number;
  /** Budget status */
  budgetStatus: BudgetStatus;
  /** Whether this is a lazy-loaded chunk */
  isLazy: boolean;
  /** Whether this is the initial/entry chunk */
  isEntry: boolean;
  /** Module category */
  category: ChunkCategory;
  /** Top modules by size [{name, size}] -- max 5 */
  topModules: ChunkModule[];
  /** Change from previous build in bytes (gzipped) */
  deltaBytes: number;
  /** Change percentage */
  deltaPercent: number;
}

/**
 * Module within a chunk.
 */
export interface ChunkModule {
  /** Module path/name */
  name: string;
  /** Size in bytes (gzipped) */
  size: number;
  /** Percentage of chunk */
  percentage: number;
}

/**
 * Chunk categories for grouping.
 */
export type ChunkCategory =
  | 'entry'         // Main entry point
  | 'vendor'        // Third-party libraries
  | 'framework'     // React/framework code
  | 'feature'       // Feature-specific code
  | 'lazy'          // Lazy-loaded routes/components
  | 'styles'        // CSS/style chunks
  | 'assets'        // Images, fonts, etc.
  | 'other';

/**
 * Category display config.
 */
export const CHUNK_CATEGORY_CONFIG: Record<ChunkCategory, { label: string; color: string }> = {
  entry: { label: 'Entry', color: '#3b82f6' },
  vendor: { label: 'Vendor', color: '#8b5cf6' },
  framework: { label: 'Framework', color: '#06b6d4' },
  feature: { label: 'Feature', color: '#22c55e' },
  lazy: { label: 'Lazy', color: '#eab308' },
  styles: { label: 'Styles', color: '#ec4899' },
  assets: { label: 'Assets', color: '#f97316' },
  other: { label: 'Other', color: '#6b7280' },
};

// =============================================================================
// BUILD SNAPSHOT
// =============================================================================

/**
 * A complete build snapshot for the bundle monitor.
 */
export interface BuildSnapshot {
  /** Unique build ID */
  buildId: string;
  /** Build timestamp (epoch ms) */
  timestamp: number;
  /** Git commit hash (short) */
  commitHash: string;
  /** Git branch name */
  branch: string;
  /** Bundle chunks */
  chunks: BundleChunk[];
  /** Total raw size (all chunks, bytes) */
  totalRawSize: number;
  /** Total gzipped size (all chunks, bytes) */
  totalGzipSize: number;
  /** Total budget (gzipped, bytes) */
  totalBudget: number;
  /** Overall budget status */
  budgetStatus: BudgetStatus;
  /** Budget utilization (0-1+) */
  budgetUtilization: number;
  /** Number of chunks */
  chunkCount: number;
  /** Number of chunks exceeding budget */
  exceededChunkCount: number;
  /** Build duration in ms */
  buildDurationMs: number;
  /** Estimated load times per network preset */
  loadTimes: Record<NetworkPreset, number>;
  /** CI/CD pipeline status */
  ciStatus: CIStatus;
}

/**
 * CI/CD pipeline status.
 */
export type CIStatus =
  | 'passing'      // Budget check passed
  | 'warning'      // Within warning threshold
  | 'failing'      // Budget exceeded, blocking merge
  | 'unknown';     // No CI data available

// =============================================================================
// HISTORICAL TRENDS
// =============================================================================

/**
 * A single trend data point (one per build).
 */
export interface TrendDataPoint {
  /** Build timestamp */
  timestamp: number;
  /** Build ID */
  buildId: string;
  /** Commit hash */
  commitHash: string;
  /** Total gzipped size */
  totalGzipSize: number;
  /** Budget utilization */
  budgetUtilization: number;
  /** Number of chunks */
  chunkCount: number;
  /** CI status */
  ciStatus: CIStatus;
}

// =============================================================================
// DASHBOARD STATE
// =============================================================================

/**
 * Display mode for the Bundle Monitor Dashboard.
 */
export type BundleMonitorDisplayMode =
  | 'dashboard'     // Full dashboard with all panels
  | 'compact'       // Compact summary bar
  | 'chunks'        // Chunk list only
  | 'trends';       // Historical trends only

/**
 * Panels available in the dashboard.
 */
export type BundleMonitorPanel =
  | 'summary'        // Overall budget summary
  | 'chunks'         // Chunk breakdown list
  | 'load-times'     // Load time estimates
  | 'trends'         // Historical trend chart
  | 'ci-status'      // CI/CD integration status
  | 'alerts';        // Budget alerts

/**
 * Bundle monitor alert.
 */
export interface BundleAlert {
  /** Unique alert ID */
  id: string;
  /** Alert timestamp */
  timestamp: number;
  /** Alert severity */
  severity: 'info' | 'warning' | 'critical';
  /** Alert category */
  category: 'budget' | 'regression' | 'ci' | 'general';
  /** Human-readable message */
  message: string;
  /** Whether dismissed */
  dismissed: boolean;
}

/**
 * Complete Bundle Monitor state.
 */
export interface BundleMonitorState {
  /** Current build snapshot */
  currentBuild: BuildSnapshot | null;
  /** Historical trend data */
  trendData: TrendDataPoint[];
  /** Alerts */
  alerts: BundleAlert[];
  /** Selected network preset for load time display */
  networkPreset: NetworkPreset;
  /** Whether receiving live data */
  isLive: boolean;
  /** Display mode */
  displayMode: BundleMonitorDisplayMode;
  /** Visible panels */
  visiblePanels: Set<BundleMonitorPanel>;
  /** Last update timestamp */
  lastUpdateTimestamp: number;
  /** Whether data is stale */
  isStale: boolean;
}

/**
 * Actions available from the useBundleMonitor hook.
 */
export interface BundleMonitorActions {
  /** Push a new build snapshot */
  pushBuild: (build: BuildSnapshot) => void;
  /** Set network preset for load time display */
  setNetworkPreset: (preset: NetworkPreset) => void;
  /** Dismiss an alert */
  dismissAlert: (id: string) => void;
  /** Clear all alerts */
  clearAlerts: () => void;
  /** Toggle live/paused */
  toggleLive: () => void;
  /** Set display mode */
  setDisplayMode: (mode: BundleMonitorDisplayMode) => void;
  /** Toggle a panel */
  togglePanel: (panel: BundleMonitorPanel) => void;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Theme for the Bundle Monitor Dashboard.
 */
export interface BundleMonitorTheme {
  /** Base font family */
  fontFamily: string;
  /** Monospace font family */
  monoFontFamily: string;
  /** Font size scale factor */
  fontScale: number;
  /** Border radius */
  borderRadius: string;
  /** Container background */
  containerBackground: string;
  /** Card background */
  cardBackground: string;
  /** Primary text color */
  textPrimary: string;
  /** Secondary text color */
  textSecondary: string;
  /** Muted text color */
  textMuted: string;
  /** Border color */
  borderColor: string;
  /** Budget OK color */
  okColor: string;
  /** Budget warning color */
  warningColor: string;
  /** Budget exceeded color */
  exceededColor: string;
  /** Accent color */
  accentColor: string;
  /** Trend line color */
  trendColor: string;
  /** Budget line color */
  budgetLineColor: string;
}

/**
 * Default theme for the Bundle Monitor Dashboard.
 */
export const DEFAULT_BM_THEME: BundleMonitorTheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  monoFontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  fontScale: 1.0,
  borderRadius: '8px',
  containerBackground: 'rgba(8, 12, 28, 0.92)',
  cardBackground: 'rgba(16, 20, 44, 0.88)',
  textPrimary: '#e8e8f8',
  textSecondary: '#a0a0c8',
  textMuted: '#7880a8',
  borderColor: 'rgba(48, 52, 80, 0.85)',
  okColor: '#22c55e',
  warningColor: '#eab308',
  exceededColor: '#ef4444',
  accentColor: '#6366f1',
  trendColor: '#3b82f6',
  budgetLineColor: '#ef4444',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get theme color for a budget status.
 */
export function getBudgetStatusColor(status: BudgetStatus, theme: BundleMonitorTheme): string {
  switch (status) {
    case 'ok': return theme.okColor;
    case 'warning': return theme.warningColor;
    case 'exceeded': return theme.exceededColor;
    default: return theme.textMuted;
  }
}

/**
 * Get theme color for a CI status.
 */
export function getCIStatusColor(status: CIStatus, theme: BundleMonitorTheme): string {
  switch (status) {
    case 'passing': return theme.okColor;
    case 'warning': return theme.warningColor;
    case 'failing': return theme.exceededColor;
    case 'unknown': return theme.textMuted;
    default: return theme.textMuted;
  }
}

/**
 * Format bytes for display.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * Format milliseconds for display.
 */
export function formatLoadTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Estimate load time for a given size and network preset.
 */
export function estimateLoadTime(gzipBytes: number, preset: NetworkPreset): number {
  const config = NETWORK_PRESETS[preset];
  const downloadMs = (gzipBytes * 8) / (config.bandwidthMbps * 1_000_000) * 1000;
  return config.latencyMs + downloadMs;
}

/**
 * Determine budget status from utilization.
 */
export function computeBudgetStatus(utilization: number): BudgetStatus {
  if (utilization > 1.0) return 'exceeded';
  if (utilization > 0.85) return 'warning';
  return 'ok';
}

/**
 * Create a unique bundle alert ID.
 */
export function createBundleAlertId(): string {
  return `bm-alert-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// =============================================================================
// PERFORMANCE BUDGET
// =============================================================================

export const BM_FRAME_BUDGET = {
  /** Maximum dashboard render time in ms */
  DASHBOARD_BUDGET_MS: 0.5,
  /** Maximum trend data points retained */
  MAX_TREND_POINTS: 100,
  /** Maximum alerts retained */
  MAX_ALERTS: 30,
  /** Alert cooldown (ms) */
  ALERT_COOLDOWN_MS: 5000,
  /** Staleness threshold (ms) */
  STALENESS_THRESHOLD_MS: 30000,
} as const;
