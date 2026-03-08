/**
 * useAccessibilityAudit Hook
 *
 * React hook that manages the accessibility audit dashboard state,
 * including scanning .holo files, filtering results, and selecting
 * criteria/objects for detailed inspection.
 *
 * Usage:
 * ```tsx
 * const [state, actions] = useAccessibilityAudit();
 *
 * // Run a scan
 * actions.runScan([
 *   { fileName: 'scene.holo', filePath: '/path/scene.holo', source: holoSource },
 * ]);
 *
 * // Filter results
 * actions.selectCriterion('1.1.1');
 * actions.toggleSeverityFilter('critical');
 * ```
 *
 * @module accessibility-audit-dashboard/useAccessibilityAudit
 */

import { useCallback, useMemo, useReducer } from 'react';
import type {
  A11yDashboardState,
  A11yDashboardActions,
  A11yDisplayMode,
  A11yPanel,
  AuditSeverity,
  AuditCheckStatus,
} from './types';
import { runAccessibilityAudit } from './holoAccessibilityScanner';

// =============================================================================
// STATE DEFAULTS
// =============================================================================

const ALL_PANELS: A11yPanel[] = [
  'score-overview',
  'criterion-list',
  'trait-coverage',
  'object-inspector',
  'file-list',
];

const ALL_SEVERITIES: AuditSeverity[] = ['critical', 'major', 'minor', 'info'];
const ALL_STATUSES: AuditCheckStatus[] = ['pass', 'fail', 'warning', 'not_applicable'];

function createInitialState(): A11yDashboardState {
  return {
    report: null,
    isScanning: false,
    scanError: null,
    selectedFile: null,
    selectedCriterion: null,
    severityFilter: new Set(ALL_SEVERITIES),
    statusFilter: new Set<AuditCheckStatus>(['fail', 'warning']),
    displayMode: 'dashboard',
    visiblePanels: new Set(ALL_PANELS),
    expandedObjects: new Set<string>(),
  };
}

// =============================================================================
// REDUCER
// =============================================================================

type A11yAction =
  | { type: 'SCAN_START' }
  | { type: 'SCAN_SUCCESS'; report: A11yDashboardState['report'] }
  | { type: 'SCAN_ERROR'; error: string }
  | { type: 'CLEAR_REPORT' }
  | { type: 'SELECT_FILE'; fileName: string | null }
  | { type: 'SELECT_CRITERION'; criterionId: string | null }
  | { type: 'TOGGLE_SEVERITY'; severity: AuditSeverity }
  | { type: 'TOGGLE_STATUS'; status: AuditCheckStatus }
  | { type: 'SET_DISPLAY_MODE'; mode: A11yDisplayMode }
  | { type: 'TOGGLE_PANEL'; panel: A11yPanel }
  | { type: 'TOGGLE_OBJECT_EXPANDED'; objectName: string };

function reducer(state: A11yDashboardState, action: A11yAction): A11yDashboardState {
  switch (action.type) {
    case 'SCAN_START':
      return {
        ...state,
        isScanning: true,
        scanError: null,
      };

    case 'SCAN_SUCCESS':
      return {
        ...state,
        isScanning: false,
        report: action.report,
        scanError: null,
        selectedFile: null,
        selectedCriterion: null,
      };

    case 'SCAN_ERROR':
      return {
        ...state,
        isScanning: false,
        scanError: action.error,
      };

    case 'CLEAR_REPORT':
      return createInitialState();

    case 'SELECT_FILE':
      return {
        ...state,
        selectedFile: action.fileName,
      };

    case 'SELECT_CRITERION':
      return {
        ...state,
        selectedCriterion: action.criterionId,
      };

    case 'TOGGLE_SEVERITY': {
      const next = new Set(state.severityFilter);
      if (next.has(action.severity)) {
        next.delete(action.severity);
      } else {
        next.add(action.severity);
      }
      return { ...state, severityFilter: next };
    }

    case 'TOGGLE_STATUS': {
      const next = new Set(state.statusFilter);
      if (next.has(action.status)) {
        next.delete(action.status);
      } else {
        next.add(action.status);
      }
      return { ...state, statusFilter: next };
    }

    case 'SET_DISPLAY_MODE':
      return { ...state, displayMode: action.mode };

    case 'TOGGLE_PANEL': {
      const next = new Set(state.visiblePanels);
      if (next.has(action.panel)) {
        next.delete(action.panel);
      } else {
        next.add(action.panel);
      }
      return { ...state, visiblePanels: next };
    }

    case 'TOGGLE_OBJECT_EXPANDED': {
      const next = new Set(state.expandedObjects);
      if (next.has(action.objectName)) {
        next.delete(action.objectName);
      } else {
        next.add(action.objectName);
      }
      return { ...state, expandedObjects: next };
    }

    default:
      return state;
  }
}

// =============================================================================
// HOOK
// =============================================================================

export interface UseAccessibilityAuditConfig {
  /** Initial display mode (default: 'dashboard') */
  initialMode?: A11yDisplayMode;
  /** Initial visible panels (default: all) */
  initialPanels?: A11yPanel[];
}

/**
 * React hook for managing accessibility audit dashboard state.
 *
 * @returns Tuple of [state, actions]
 */
export function useAccessibilityAudit(
  config?: UseAccessibilityAuditConfig,
): [A11yDashboardState, A11yDashboardActions] {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const initial = createInitialState();
    if (config?.initialMode) {
      initial.displayMode = config.initialMode;
    }
    if (config?.initialPanels) {
      initial.visiblePanels = new Set(config.initialPanels);
    }
    return initial;
  });

  const runScan = useCallback(
    (files: Array<{ fileName: string; filePath: string; source: string }>) => {
      dispatch({ type: 'SCAN_START' });
      try {
        const report = runAccessibilityAudit(files);
        dispatch({ type: 'SCAN_SUCCESS', report });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown scan error';
        dispatch({ type: 'SCAN_ERROR', error: message });
      }
    },
    [],
  );

  const actions: A11yDashboardActions = useMemo(
    () => ({
      runScan,
      clearReport: () => dispatch({ type: 'CLEAR_REPORT' }),
      selectFile: (fileName) => dispatch({ type: 'SELECT_FILE', fileName }),
      selectCriterion: (criterionId) => dispatch({ type: 'SELECT_CRITERION', criterionId }),
      toggleSeverityFilter: (severity) => dispatch({ type: 'TOGGLE_SEVERITY', severity }),
      toggleStatusFilter: (status) => dispatch({ type: 'TOGGLE_STATUS', status }),
      setDisplayMode: (mode) => dispatch({ type: 'SET_DISPLAY_MODE', mode }),
      togglePanel: (panel) => dispatch({ type: 'TOGGLE_PANEL', panel }),
      toggleObjectExpanded: (objectName) =>
        dispatch({ type: 'TOGGLE_OBJECT_EXPANDED', objectName }),
    }),
    [runScan],
  );

  return [state, actions];
}
