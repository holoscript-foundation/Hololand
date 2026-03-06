/**
 * GRPO Training Dashboard - Shared Types
 *
 * Type definitions for the Group Relative Policy Optimization training
 * dashboard that monitors reward curves, KL divergence, completion samples,
 * OPLoRA forgetting metrics, and training controls.
 *
 * This is the 2D web counterpart to the HoloLand VR training visualization.
 *
 * Integrates with:
 *   - GRPO training loop: reward signals, KL divergence, completions
 *   - OPLoRA: orthogonal projection constraint, forgetting metrics
 *   - Training infrastructure: GPU stats, parameter controls
 *
 * @module grpo-training-dashboard/types
 */

// =============================================================================
// REWARD TYPES
// =============================================================================

/**
 * Individual reward signal names used in GRPO training.
 */
export type RewardSignalName =
  | 'testPassReward'
  | 'typeCheckReward'
  | 'lintReward'
  | 'coverageReward'
  | 'circuitBreakerReward'
  | 'composite';

/**
 * Configuration for a reward signal curve.
 */
export interface RewardSignalConfig {
  /** Signal name */
  name: RewardSignalName;
  /** Display label */
  label: string;
  /** Signal weight in composite (0-1, or null for composite itself) */
  weight: number | null;
  /** SVG stroke color */
  color: string;
  /** Whether this curve is currently visible */
  visible: boolean;
}

/**
 * A single data point in a reward curve.
 */
export interface RewardDataPoint {
  /** Training step number */
  step: number;
  /** Reward values keyed by signal name */
  rewards: Record<RewardSignalName, number>;
}

// =============================================================================
// KL DIVERGENCE TYPES
// =============================================================================

/**
 * A single KL divergence measurement.
 */
export interface KLDataPoint {
  /** Training step number */
  step: number;
  /** KL divergence value */
  kl: number;
  /** Current beta value at this step */
  beta: number;
}

/**
 * KL divergence status levels.
 */
export type KLStatus = 'nominal' | 'elevated' | 'critical';

// =============================================================================
// COMPLETION TYPES
// =============================================================================

/**
 * A single completion sample from training.
 */
export interface CompletionSample {
  /** Unique completion ID */
  id: string;
  /** Training step when this was generated */
  step: number;
  /** The prompt text */
  prompt: string;
  /** The generated completion text */
  completion: string;
  /** Total reward score */
  totalScore: number;
  /** Per-reward breakdown */
  rewardBreakdown: Record<RewardSignalName, number>;
}

/**
 * A group of completions for a single prompt (best + worst).
 */
export interface CompletionGroup {
  /** Training step */
  step: number;
  /** The prompt text */
  prompt: string;
  /** Best completion in the group */
  best: CompletionSample;
  /** Worst completion in the group */
  worst: CompletionSample;
}

// =============================================================================
// OPLORA / FORGETTING TYPES
// =============================================================================

/**
 * OPLoRA orthogonal projection constraint metrics.
 */
export interface OPLoRAMetrics {
  /** Current orthogonal projection constraint value (0-1, lower = better) */
  constraintValue: number;
  /** Maximum acceptable constraint value */
  constraintThreshold: number;
}

/**
 * A single benchmark evaluation point.
 */
export interface BenchmarkDataPoint {
  /** Training step */
  step: number;
  /** HumanEval pass@1 score */
  humanEval: number;
  /** MBPP pass@1 score */
  mbpp: number;
}

/**
 * Forgetting panel state combining OPLoRA and benchmark metrics.
 */
export interface ForgettingMetrics {
  /** Current OPLoRA metrics */
  oplora: OPLoRAMetrics;
  /** Benchmark evaluation history */
  benchmarks: BenchmarkDataPoint[];
  /** Baseline HumanEval score (pre-training) */
  humanEvalBaseline: number;
  /** Baseline MBPP score (pre-training) */
  mbppBaseline: number;
  /** Whether general ability has dropped more than 2% */
  forgettingAlert: boolean;
}

// =============================================================================
// TRAINING CONTROL TYPES
// =============================================================================

/**
 * Current training status.
 */
export type TrainingStatus = 'running' | 'paused' | 'completed' | 'error';

/**
 * GPU and infrastructure statistics.
 */
export interface GPUStats {
  /** GPU utilization percentage (0-100) */
  gpuUtilization: number;
  /** GPU memory used in GB */
  memoryUsedGB: number;
  /** GPU memory total in GB */
  memoryTotalGB: number;
  /** GPU temperature in Celsius */
  temperatureCelsius: number;
}

/**
 * Training parameters that can be adjusted.
 */
export interface TrainingParams {
  /** Sampling temperature */
  temperature: number;
  /** KL penalty coefficient */
  beta: number;
}

/**
 * Training progress information.
 */
export interface TrainingProgress {
  /** Current training step */
  currentStep: number;
  /** Total training steps */
  totalSteps: number;
  /** Elapsed time in seconds */
  elapsedSeconds: number;
  /** Estimated time remaining in seconds */
  estimatedRemainingSeconds: number;
}

// =============================================================================
// DASHBOARD STATE
// =============================================================================

/**
 * Complete state for the GRPO training dashboard.
 */
export interface GRPODashboardState {
  /** Reward curve data points */
  rewardHistory: RewardDataPoint[];
  /** KL divergence data points */
  klHistory: KLDataPoint[];
  /** Completion sample groups */
  completionGroups: CompletionGroup[];
  /** Forgetting / OPLoRA metrics */
  forgettingMetrics: ForgettingMetrics | null;
  /** Training status */
  trainingStatus: TrainingStatus;
  /** Training parameters */
  trainingParams: TrainingParams;
  /** Training progress */
  progress: TrainingProgress;
  /** GPU stats */
  gpuStats: GPUStats | null;
  /** Whether dashboard is connected to data source */
  connected: boolean;
  /** Last data update timestamp */
  lastUpdateTimestamp: number;
}

/**
 * Actions available from the useGRPOData hook.
 */
export interface GRPODashboardActions {
  /** Pause training */
  pauseTraining: () => void;
  /** Resume training */
  resumeTraining: () => void;
  /** Update temperature parameter */
  setTemperature: (value: number) => void;
  /** Update beta parameter */
  setBeta: (value: number) => void;
  /** Trigger benchmark evaluation */
  triggerBenchmark: () => void;
  /** Reconnect to data source */
  reconnect: () => void;
}

// =============================================================================
// THEME
// =============================================================================

/**
 * Theme for the GRPO training dashboard.
 * Follows the same pattern as VRPerfTheme for visual consistency.
 */
export interface GRPOTheme {
  /** Base font family */
  fontFamily: string;
  /** Font size scale factor */
  fontScale: number;
  /** Border radius */
  borderRadius: string;
  /** Container background */
  containerBackground: string;
  /** Card background */
  cardBackground: string;
  /** Primary text */
  textPrimary: string;
  /** Secondary text */
  textSecondary: string;
  /** Muted text */
  textMuted: string;
  /** Border color */
  borderColor: string;
  /** Success/good color */
  successColor: string;
  /** Warning color */
  warningColor: string;
  /** Danger/error color */
  dangerColor: string;
  /** Accent color */
  accentColor: string;

  // Reward curve colors
  testPassColor: string;
  typeCheckColor: string;
  lintColor: string;
  coverageColor: string;
  circuitBreakerColor: string;
  compositeColor: string;

  // KL divergence
  klLineColor: string;
  klAreaColor: string;
  klThresholdColor: string;

  // Completion
  bestCompletionColor: string;
  worstCompletionColor: string;

  // Forgetting
  humanEvalColor: string;
  mbppColor: string;
  baselineColor: string;
}

/**
 * Default dark theme for the GRPO training dashboard.
 * All foreground colors meet WCAG 2.1 AA contrast against backgrounds.
 */
export const DEFAULT_GRPO_THEME: GRPOTheme = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontScale: 1.0,
  borderRadius: '8px',
  containerBackground: '#0a0a1a',
  cardBackground: '#12122a',
  textPrimary: '#e0e0f0',
  textSecondary: '#9898c0',
  textMuted: '#7878a0',
  borderColor: '#2a2a4a',
  successColor: '#22c55e',
  warningColor: '#eab308',
  dangerColor: '#ef4444',
  accentColor: '#6366f1',

  // Reward curve colors
  testPassColor: '#22c55e',       // green
  typeCheckColor: '#a855f7',      // purple
  lintColor: '#f97316',           // orange
  coverageColor: '#3b82f6',       // blue
  circuitBreakerColor: '#ef4444', // red
  compositeColor: '#eab308',      // gold

  // KL divergence
  klLineColor: '#6366f1',
  klAreaColor: 'rgba(99, 102, 241, 0.15)',
  klThresholdColor: '#ef4444',

  // Completion
  bestCompletionColor: 'rgba(34, 197, 94, 0.12)',
  worstCompletionColor: 'rgba(239, 68, 68, 0.12)',

  // Forgetting
  humanEvalColor: '#3b82f6',
  mbppColor: '#a855f7',
  baselineColor: '#7878a0',
};

// =============================================================================
// DEFAULT REWARD SIGNAL CONFIGS
// =============================================================================

/**
 * Default reward signal configurations with weights and colors.
 */
export const DEFAULT_REWARD_CONFIGS: RewardSignalConfig[] = [
  { name: 'testPassReward', label: 'Test Pass', weight: 0.40, color: DEFAULT_GRPO_THEME.testPassColor, visible: true },
  { name: 'typeCheckReward', label: 'Type Check', weight: 0.20, color: DEFAULT_GRPO_THEME.typeCheckColor, visible: true },
  { name: 'lintReward', label: 'Lint', weight: 0.15, color: DEFAULT_GRPO_THEME.lintColor, visible: true },
  { name: 'coverageReward', label: 'Coverage', weight: 0.15, color: DEFAULT_GRPO_THEME.coverageColor, visible: true },
  { name: 'circuitBreakerReward', label: 'Circuit Breaker', weight: 0.10, color: DEFAULT_GRPO_THEME.circuitBreakerColor, visible: true },
  { name: 'composite', label: 'Composite', weight: null, color: DEFAULT_GRPO_THEME.compositeColor, visible: true },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get KL status based on current value and threshold.
 */
export function getKLStatus(kl: number, threshold: number): KLStatus {
  if (kl >= threshold) return 'critical';
  if (kl >= threshold * 0.75) return 'elevated';
  return 'nominal';
}

/**
 * Get status color from KL status.
 */
export function getKLStatusColor(status: KLStatus, theme: GRPOTheme): string {
  switch (status) {
    case 'nominal': return theme.successColor;
    case 'elevated': return theme.warningColor;
    case 'critical': return theme.dangerColor;
    default: return theme.textMuted;
  }
}

/**
 * Format a training step number for display.
 */
export function formatStep(step: number): string {
  if (step >= 1_000_000) return `${(step / 1_000_000).toFixed(1)}M`;
  if (step >= 1_000) return `${(step / 1_000).toFixed(1)}K`;
  return step.toString();
}

/**
 * Format seconds into human-readable duration.
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Format a percentage for display.
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
