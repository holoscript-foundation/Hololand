/**
 * Holographic Economic Dashboard Component Library
 *
 * In-world VR HUD overlay displaying real-time virtual economy health:
 * inflation rate, Gini coefficient, currency velocity, faucet/sink ratios,
 * and PID controller status.
 *
 * Designed for Layer 6 transparency with holographic glow effects.
 * All rendering completes within the 11.1ms VR frame budget at 90Hz.
 *
 * @example
 * ```tsx
 * import {
 *   EconomicDashboard,
 *   useEconomicDashboard,
 * } from '@hololand/renderer/components/economic-dashboard';
 *
 * function MyEconOverlay() {
 *   const [state, actions] = useEconomicDashboard({
 *     initialDisplayMode: 'overlay',
 *   });
 *
 *   // Connect to backend economic data stream
 *   useEffect(() => {
 *     econStream.on('inflation', (snapshot) => actions.updateInflation(snapshot));
 *     econStream.on('gini', (snapshot) => actions.updateGini(snapshot));
 *     econStream.on('velocity', (snapshot) => actions.updateVelocity(snapshot));
 *     econStream.on('faucetSink', (snapshot) => actions.updateFaucetSink(snapshot));
 *     econStream.on('pid', (snapshot) => actions.updatePID(snapshot));
 *   }, []);
 *
 *   return (
 *     <EconomicDashboard
 *       externalState={state}
 *       externalActions={actions}
 *       mode="overlay"
 *       overlayOpacity={0.85}
 *     />
 *   );
 * }
 * ```
 *
 * @module economic-dashboard
 */

// Main component
export {
  EconomicDashboard,
  type EconomicDashboardProps,
} from './EconomicDashboard';

// Hook
export {
  useEconomicDashboard,
  type UseEconomicDashboardConfig,
} from './useEconomicDashboard';

// Types
export type {
  EconDashboardDisplayMode,
  EconDashboardPanel,
  EconDashboardTheme,
  EconHealthState,
  EconTimeSample,
  InflationSnapshot,
  GiniSnapshot,
  VelocitySnapshot,
  FaucetSinkSnapshot,
  EconBreakdownEntry,
  PIDMode,
  PIDControllerSnapshot,
  EconomicDashboardState,
  EconomicDashboardActions,
  EconomicAlert,
} from './types';

export {
  DEFAULT_ECON_DASHBOARD_THEME,
  FRAME_BUDGET,
  getHealthStateColor,
  formatCurrency,
  formatPercent,
  formatRatio,
  formatGini,
  computeHealthState,
  createEconAlertId,
  clamp,
  applyOverlayOpacity,
} from './types';
