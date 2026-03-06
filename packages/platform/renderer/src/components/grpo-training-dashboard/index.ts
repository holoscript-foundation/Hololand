/**
 * GRPO Training Dashboard Component Library
 *
 * Provides monitoring and control components for Group Relative Policy
 * Optimization training: reward curves, KL divergence, completion samples,
 * OPLoRA forgetting detection, and training parameter controls.
 *
 * This is the 2D web counterpart to the HoloLand VR training visualization.
 *
 * @example
 * ```tsx
 * import {
 *   GRPODashboard,
 *   useGRPOData,
 * } from '@hololand/renderer/components/grpo-training-dashboard';
 *
 * function TrainingPage() {
 *   return (
 *     <GRPODashboard
 *       config={{
 *         wsUrl: 'ws://localhost:8765/training',
 *         restUrl: 'http://localhost:8765/api/training',
 *       }}
 *     />
 *   );
 * }
 * ```
 *
 * @module grpo-training-dashboard
 */

// Main component
export {
  GRPODashboard,
  type GRPODashboardProps,
} from './GRPODashboard';

// Sub-components
export {
  RewardCurveChart,
  type RewardCurveChartProps,
} from './RewardCurveChart';

export {
  KLDivergenceMonitor,
  type KLDivergenceMonitorProps,
} from './KLDivergenceMonitor';

export {
  CompletionSampler,
  type CompletionSamplerProps,
} from './CompletionSampler';

export {
  ForgettingPanel,
  type ForgettingPanelProps,
} from './ForgettingPanel';

export {
  TrainingControls,
  type TrainingControlsProps,
} from './TrainingControls';

// Hook
export {
  useGRPOData,
  type UseGRPODataConfig,
} from './useGRPOData';

// Event parser (standalone, no React dependency)
export { parseGRPOEvent } from './parseGRPOEvent';

// Event emitter (server-side)
export {
  GRPOEventEmitter,
  type GRPOEventEmitterOptions,
  type GRPOEvent,
  type GRPOEventType,
  type GRPOCommand,
  type WSClient,
  type WSServer,
} from './GRPOEventEmitter';

// Mock data generator (development/demo mode)
export {
  GRPOMockDataGenerator,
  type GRPOMockDataGeneratorConfig,
  type MockEventCallback,
} from './GRPOMockDataGenerator';

// Types
export type {
  RewardSignalName,
  RewardSignalConfig,
  RewardDataPoint,
  KLDataPoint,
  KLStatus,
  CompletionSample,
  CompletionGroup,
  OPLoRAMetrics,
  BenchmarkDataPoint,
  ForgettingMetrics,
  TrainingStatus,
  GPUStats,
  TrainingParams,
  TrainingProgress,
  GRPODashboardState,
  GRPODashboardActions,
  GRPOTheme,
} from './types';

export {
  DEFAULT_GRPO_THEME,
  DEFAULT_REWARD_CONFIGS,
  getKLStatus,
  getKLStatusColor,
  formatStep,
  formatDuration,
  formatPercent,
} from './types';

// Lazy route
export {
  GRPODashboardLazy,
  GRPODashboardRoute,
  grpoRoute,
} from './lazy-route';
