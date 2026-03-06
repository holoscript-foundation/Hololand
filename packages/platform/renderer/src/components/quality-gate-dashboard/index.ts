/**
 * Quality Gate Dashboard Component Library
 *
 * Provides a progressive quality gate visualization for autonomous
 * agent workflows with three-tier confidence levels, failure detection,
 * human escalation interface, and trust calibration display.
 *
 * @example
 * ```tsx
 * import {
 *   QualityGateDashboard,
 *   useQualityGateDashboard,
 * } from '@hololand/renderer/components/quality-gate-dashboard';
 *
 * function MyApp() {
 *   const [state, actions] = useQualityGateDashboard({
 *     enableAlerts: true,
 *   });
 *
 *   // Push workflow updates from the autonomize pipeline
 *   useEffect(() => {
 *     pipeline.on('workflow:update', (workflow) => {
 *       actions.updateWorkflow(workflow);
 *     });
 *     pipeline.on('escalation:new', (escalation) => {
 *       actions.addEscalation(escalation);
 *     });
 *   }, []);
 *
 *   return (
 *     <QualityGateDashboard
 *       externalState={state}
 *       externalActions={actions}
 *       mode="dashboard"
 *     />
 *   );
 * }
 * ```
 *
 * @module quality-gate-dashboard
 */

// Main component
export {
  QualityGateDashboard,
  type QualityGateDashboardProps,
} from './QualityGateDashboard';

// Sub-components
export {
  TierOverviewPanel,
  type TierOverviewPanelProps,
} from './TierOverviewPanel';

export {
  FailureDetectionPanel,
  type FailureDetectionPanelProps,
} from './FailureDetectionPanel';

export {
  EscalationPanel,
  type EscalationPanelProps,
} from './EscalationPanel';

export {
  CalibrationDisplay,
  type CalibrationDisplayProps,
} from './CalibrationDisplay';

// Hook
export {
  useQualityGateDashboard,
  type UseQualityGateDashboardConfig,
} from './useQualityGateDashboard';

// Types
export type {
  ConfidenceTier,
  ConfidenceTierMeta,
  WorkflowStatus,
  FailureCategory,
  AgentWorkflow,
  WorkflowFailure,
  EscalationRequest,
  TrustCalibration,
  QualityGateDisplayMode,
  QualityGatePanel,
  QualityGateDashboardState,
  QualityGateDashboardActions,
  QualityGateAlert,
  QualityGateTheme,
} from './types';

export {
  CONFIDENCE_TIER_CONFIG,
  DEFAULT_QG_THEME,
  QG_FRAME_BUDGET,
  scoreToConfidenceTier,
  getConfidenceTierMeta,
  getConfidenceColor,
  getTierColor,
  getStatusColor,
  createQGAlertId,
} from './types';
