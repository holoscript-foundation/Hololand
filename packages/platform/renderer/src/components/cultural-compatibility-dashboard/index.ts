/**
 * Cultural Compatibility Dashboard Component Library
 *
 * Provides pairwise agent cooperation analysis, cultural profile cards,
 * norm convergence timelines, drift detection alerts, and cross-model
 * population health indicators -- all with real-time WebSocket updates.
 *
 * @example
 * ```tsx
 * import {
 *   CulturalCompatibilityDashboard,
 *   useCulturalCompatibility,
 * } from '@hololand/renderer/components/cultural-compatibility-dashboard';
 *
 * function MyApp() {
 *   // Option 1: Internal hook with WebSocket
 *   return (
 *     <CulturalCompatibilityDashboard
 *       config={{ wsUrl: 'ws://localhost:8080/cultural-health' }}
 *       mode="full"
 *     />
 *   );
 *
 *   // Option 2: External state management
 *   const [state, actions] = useCulturalCompatibility({
 *     wsUrl: 'ws://localhost:8080/cultural-health',
 *   });
 *
 *   // Push data manually
 *   useEffect(() => {
 *     monitor.onCycleComplete((snapshot) => {
 *       actions.processSnapshot(snapshot);
 *     });
 *   }, []);
 *
 *   return (
 *     <CulturalCompatibilityDashboard
 *       externalState={state}
 *       externalActions={actions}
 *       mode="overlay"
 *     />
 *   );
 * }
 * ```
 *
 * @module cultural-compatibility-dashboard
 */

// Main component
export {
  CulturalCompatibilityDashboard,
  type CulturalCompatibilityDashboardProps,
} from './CulturalCompatibilityDashboard';

// Sub-components
export {
  CooperationMatrixHeatmap,
  type CooperationMatrixHeatmapProps,
} from './CooperationMatrixHeatmap';

export {
  CulturalProfileCards,
  type CulturalProfileCardsProps,
} from './CulturalProfileCards';

export {
  NormConvergenceTimeline,
  type NormConvergenceTimelineProps,
} from './NormConvergenceTimeline';

export {
  DriftDetectionAlerts,
  type DriftDetectionAlertsProps,
} from './DriftDetectionAlerts';

export {
  PopulationHealthIndicators,
  type PopulationHealthIndicatorsProps,
} from './PopulationHealthIndicators';

// Hook
export {
  useCulturalCompatibility,
  type UseCulturalCompatibilityConfig,
} from './useCulturalCompatibility';

// Types
export type {
  CooperationMatrix,
  CooperationMatrixCell,
  CompatibilityProfile,
  NormConvergenceState,
  NormConvergencePoint,
  DriftAlert,
  PopulationHealthState,
  ModelPopulationHealth,
  PopulationHealthLevel,
  CulturalCompatibilityState,
  CulturalCompatibilityActions,
  CompatibilityDisplayMode,
  CompatibilityPanel,
  CompatibilityDashboardTheme,
} from './types';

export {
  DEFAULT_COMPATIBILITY_THEME,
  COMPATIBILITY_FRAME_BUDGET,
  DIMENSION_LABELS,
  NORM_CHART_COLORS,
  classifyHealthLevel,
  getHealthColor,
  getSeverityColor,
  getHeatmapColor,
  getHeatmapOpacity,
  formatScore,
  formatScoreDelta,
  createCompatibilityAlertId,
} from './types';
