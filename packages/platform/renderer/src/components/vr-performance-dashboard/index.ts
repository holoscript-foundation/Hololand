/**
 * VR Performance Dashboard Component Library
 *
 * Provides Gaussian splat budget utilization visualization and
 * frame time waterfall charts for VR performance monitoring.
 *
 * @example
 * ```tsx
 * import {
 *   VRPerformanceDashboard,
 *   useVRPerformance,
 * } from '@hololand/renderer/components/vr-performance-dashboard';
 *
 * function MyApp() {
 *   const [state, actions] = useVRPerformance({
 *     targetFrameTimeMs: 11.1,
 *     devicePreset: 'Quest 3',
 *   });
 *
 *   // Connect to GaussianBudgetManager
 *   useEffect(() => {
 *     budgetManager.on('budget:rebalanced', ({ metrics }) => {
 *       actions.updateBudgetMetrics(metrics);
 *     });
 *   }, []);
 *
 *   return (
 *     <VRPerformanceDashboard
 *       externalState={state}
 *       externalActions={actions}
 *       mode="dashboard"
 *     />
 *   );
 * }
 * ```
 *
 * @module vr-performance-dashboard
 */

// Main component
export {
  VRPerformanceDashboard,
  type VRPerformanceDashboardProps,
} from './VRPerformanceDashboard';

// Sub-components
export {
  GaussianBudgetUtilization,
  type GaussianBudgetUtilizationProps,
} from './GaussianBudgetUtilization';

export {
  FrameTimeWaterfall,
  type FrameTimeWaterfallProps,
} from './FrameTimeWaterfall';

// Hook
export {
  useVRPerformance,
  type UseVRPerformanceConfig,
} from './useVRPerformance';

// Types
export type {
  VRPerfDisplayMode,
  VRPerfPanel,
  VRPerfTheme,
  VRPerformanceState,
  VRPerformanceActions,
  FrameTimeSample,
  PerformanceAlert,
  LayerDisplayMeta,
  WaterfallPhase,
} from './types';

export {
  DEFAULT_VR_PERF_THEME,
  LAYER_DISPLAY_CONFIG,
  WATERFALL_PHASES,
  getPerformanceStateColor,
  getLayerColor,
  formatSplatCount,
  formatMs,
  formatBytes,
  createAlertId,
} from './types';
