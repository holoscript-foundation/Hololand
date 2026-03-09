/**
 * Multi-Agent Cultural Health Dashboard Component Library
 *
 * In-world VR HUD overlay displaying real-time cultural health metrics
 * across agent populations: alignment, collaboration, norm adherence,
 * diversity, and resilience.
 *
 * Designed for Layer 6 transparency with holographic glow effects.
 * All rendering completes within the 11.1ms VR frame budget at 90Hz.
 *
 * @example
 * ```tsx
 * import {
 *   CultureDashboard,
 *   useCultureDashboard,
 * } from '@hololand/renderer/components/culture-dashboard';
 *
 * function MyCultureOverlay() {
 *   const [state, actions] = useCultureDashboard({
 *     initialDisplayMode: 'overlay',
 *   });
 *
 *   // Connect to backend cultural health data stream
 *   useEffect(() => {
 *     cultureStream.on('health', (snapshot) => actions.updateHealth(snapshot));
 *     cultureStream.on('agents', (profiles) => actions.updateAgentProfiles(profiles));
 *     cultureStream.on('norms', (norms) => actions.updateNorms(norms));
 *   }, []);
 *
 *   return (
 *     <CultureDashboard
 *       externalState={state}
 *       externalActions={actions}
 *       mode="overlay"
 *       overlayOpacity={0.85}
 *     />
 *   );
 * }
 * ```
 *
 * @module culture-dashboard
 */

// Main component
export {
  CultureDashboard,
  type CultureDashboardProps,
} from './CultureDashboard';

// Hook
export {
  useCultureDashboard,
  type UseCultureDashboardConfig,
} from './useCultureDashboard';

// Types
export type {
  CultureDimension,
  CultureHealthState,
  CultureDashboardDisplayMode,
  CultureDashboardPanel,
  CultureDimensionMeta,
  CultureTimeSample,
  CultureDimensionSnapshot,
  CultureHealthSnapshot,
  AgentCultureProfile,
  CultureRole,
  CultureRoleMeta,
  CommunityNorm,
  CultureDashboardState,
  CultureDashboardActions,
  CultureAlert,
  CultureDashboardTheme,
} from './types';

export {
  ALL_CULTURE_DIMENSIONS,
  CULTURE_DIMENSION_CONFIG,
  CULTURE_ROLE_CONFIG,
  DEFAULT_CULTURE_DASHBOARD_THEME,
  CULTURE_FRAME_BUDGET,
  getCultureHealthColor,
  getDimensionColor,
  scoreToCultureHealth,
  formatCultureScore,
  formatDelta,
  createCultureAlertId,
  clamp,
  applyOverlayOpacity,
  isDimensionHealthy,
  computeDimensionHealth,
  deriveCultureRole,
} from './types';
