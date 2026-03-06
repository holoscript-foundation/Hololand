/**
 * Bundle Size Monitor Dashboard Component Library
 *
 * Automated bundle budget monitoring for HoloScript Studio.
 * Tracks chunk sizes, load times, budget thresholds,
 * and historical trends with CI/CD integration.
 *
 * @example
 * ```tsx
 * import {
 *   BundleMonitorDashboard,
 *   useBundleMonitor,
 * } from '@hololand/renderer/components/bundle-monitor';
 *
 * function DevTools() {
 *   const [state, actions] = useBundleMonitor({
 *     initialNetworkPreset: '4g',
 *   });
 *
 *   // Connect to build pipeline
 *   useEffect(() => {
 *     buildPipeline.on('build:complete', (snapshot) => {
 *       actions.pushBuild(snapshot);
 *     });
 *   }, []);
 *
 *   return (
 *     <BundleMonitorDashboard
 *       externalState={state}
 *       externalActions={actions}
 *       mode="dashboard"
 *     />
 *   );
 * }
 * ```
 *
 * @module bundle-monitor
 */

// Main component
export {
  BundleMonitorDashboard,
  type BundleMonitorDashboardProps,
} from './BundleMonitorDashboard';

// Sub-components
export {
  ChunkBreakdown,
  type ChunkBreakdownProps,
} from './ChunkBreakdown';

export {
  TrendChart,
  type TrendChartProps,
} from './TrendChart';

// Hook
export {
  useBundleMonitor,
  type UseBundleMonitorConfig,
} from './useBundleMonitor';

// Types
export type {
  BudgetStatus,
  NetworkPreset,
  NetworkPresetConfig,
  BundleChunk,
  ChunkModule,
  ChunkCategory,
  BuildSnapshot,
  CIStatus,
  TrendDataPoint,
  BundleMonitorDisplayMode,
  BundleMonitorPanel,
  BundleAlert,
  BundleMonitorState,
  BundleMonitorActions,
  BundleMonitorTheme,
} from './types';

export {
  NETWORK_PRESETS,
  CHUNK_CATEGORY_CONFIG,
  DEFAULT_BM_THEME,
  BM_FRAME_BUDGET,
  getBudgetStatusColor,
  getCIStatusColor,
  formatSize,
  formatLoadTime,
  estimateLoadTime,
  computeBudgetStatus,
  createBundleAlertId,
} from './types';
