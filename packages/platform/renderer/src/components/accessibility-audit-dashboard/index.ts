/**
 * Accessibility Audit Dashboard Component Library
 *
 * Scans .holo files for WCAG 2.1 Level AA compliance gaps by checking
 * the 10 HoloScript accessibility traits against 18 WCAG success criteria.
 * Provides a comprehensive dashboard with score overview, criterion results,
 * trait coverage heatmap, and per-object inspector.
 *
 * @example
 * ```tsx
 * import {
 *   AccessibilityAuditDashboard,
 *   useAccessibilityAudit,
 * } from '@hololand/renderer/components/accessibility-audit-dashboard';
 *
 * function MyApp() {
 *   return (
 *     <AccessibilityAuditDashboard
 *       holoFiles={[
 *         { fileName: 'scene.holo', filePath: '/path/scene.holo', source: holoSource },
 *       ]}
 *       mode="dashboard"
 *     />
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With external state management
 * import {
 *   AccessibilityAuditDashboard,
 *   useAccessibilityAudit,
 * } from '@hololand/renderer/components/accessibility-audit-dashboard';
 *
 * function MyApp() {
 *   const [state, actions] = useAccessibilityAudit();
 *
 *   return (
 *     <>
 *       <button onClick={() => actions.runScan(files)}>Run Scan</button>
 *       <AccessibilityAuditDashboard
 *         externalState={state}
 *         externalActions={actions}
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * @module accessibility-audit-dashboard
 */

// Main component
export {
  AccessibilityAuditDashboard,
  type AccessibilityAuditDashboardProps,
} from './AccessibilityAuditDashboard';

// Sub-components
export {
  ScoreOverviewPanel,
  type ScoreOverviewPanelProps,
} from './ScoreOverviewPanel';

export {
  CriterionListPanel,
  type CriterionListPanelProps,
} from './CriterionListPanel';

export {
  TraitCoveragePanel,
  type TraitCoveragePanelProps,
} from './TraitCoveragePanel';

export {
  ObjectInspectorPanel,
  type ObjectInspectorPanelProps,
} from './ObjectInspectorPanel';

// Hook
export {
  useAccessibilityAudit,
  type UseAccessibilityAuditConfig,
} from './useAccessibilityAudit';

// Scanner
export {
  parseHoloFile,
  resolveTemplates,
  runAccessibilityAudit,
} from './holoAccessibilityScanner';

// Types
export type {
  WCAGPrinciple,
  WCAGLevel,
  AuditSeverity,
  AuditCheckStatus,
  WCAGCriterion,
  HoloAccessibilityTrait,
  TraitMeta,
  AuditCheckResult,
  CriterionAuditResult,
  HoloObject,
  AccessibleProperties,
  AltTextProperties,
  ScreenReaderProperties,
  ParsedHoloFile,
  AccessibilityAuditReport,
  AuditSummary,
  A11yDisplayMode,
  A11yPanel,
  A11yDashboardState,
  A11yDashboardActions,
  A11yTheme,
} from './types';

export {
  WCAG_CRITERIA,
  TRAIT_REGISTRY,
  DEFAULT_A11Y_THEME,
  A11Y_FRAME_BUDGET,
  getPrincipleColor,
  getStatusColor,
  getSeverityColor,
  getPrincipleLabel,
  createAuditCheckId,
  createReportId,
} from './types';
