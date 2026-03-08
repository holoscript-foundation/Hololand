/**
 * AccessibilityAuditDashboard Component
 *
 * Top-level dashboard that scans .holo files for WCAG 2.1 Level AA compliance
 * gaps and displays structured audit results with per-criterion, per-object,
 * and per-trait breakdowns.
 *
 * Architecture:
 * ```
 *   <AccessibilityAuditDashboard>
 *       |
 *       |-- useAccessibilityAudit() hook (or external state)
 *       |
 *       |-- Header (scan controls, file count, live status)
 *       |-- <ScoreOverviewPanel />    - Compliance score gauge + principle bars
 *       |-- <CriterionListPanel />    - WCAG criterion results list
 *       |-- <TraitCoveragePanel />    - Trait usage heatmap
 *       |-- <ObjectInspectorPanel />  - Per-object audit details
 *       |-- FileListPanel             - Scanned files list
 * ```
 *
 * Display Modes:
 *   - dashboard: Full dashboard with all panels
 *   - compact:   Minimal score bar
 *   - overlay:   Semi-transparent overlay
 *
 * Accessibility (WCAG 2.1 AA self-compliance):
 *   - role="region" with aria-label on top-level container
 *   - role="status" for score display
 *   - All interactive elements keyboard accessible
 *   - Minimum 4.5:1 contrast ratios throughout
 *   - No color-only information (always paired with text labels)
 *
 * Performance:
 *   - Scanning runs synchronously but outside the render loop
 *   - Dashboard rendering stays within 0.5ms budget
 *   - Long object lists virtualized to MAX_VISIBLE_OBJECTS
 *
 * @module accessibility-audit-dashboard/AccessibilityAuditDashboard
 */

import React, { useMemo } from 'react';
import {
  useAccessibilityAudit,
  type UseAccessibilityAuditConfig,
} from './useAccessibilityAudit';
import { ScoreOverviewPanel } from './ScoreOverviewPanel';
import { CriterionListPanel } from './CriterionListPanel';
import { TraitCoveragePanel } from './TraitCoveragePanel';
import { ObjectInspectorPanel } from './ObjectInspectorPanel';
import type {
  A11yTheme,
  A11yDisplayMode,
  A11yPanel,
  A11yDashboardState,
  A11yDashboardActions,
} from './types';
import {
  DEFAULT_A11Y_THEME,
  getStatusColor,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface AccessibilityAuditDashboardProps {
  /** Display mode (default: 'dashboard') */
  mode?: A11yDisplayMode;
  /** Which panels to show (default: all) */
  panels?: A11yPanel[];
  /** Hook configuration (used when no external state is provided) */
  config?: UseAccessibilityAuditConfig;
  /** Externally managed state (bypasses internal hook) */
  externalState?: A11yDashboardState;
  /** Externally managed actions (bypasses internal hook) */
  externalActions?: A11yDashboardActions;
  /** Theme overrides */
  theme?: Partial<A11yTheme>;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Accessible label override */
  ariaLabel?: string;
  /**
   * .holo files to scan on mount or when changed.
   * If provided, the dashboard automatically runs a scan.
   */
  holoFiles?: Array<{ fileName: string; filePath: string; source: string }>;
}

const ALL_PANELS: A11yPanel[] = [
  'score-overview',
  'criterion-list',
  'trait-coverage',
  'object-inspector',
  'file-list',
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AccessibilityAuditDashboard: React.FC<AccessibilityAuditDashboardProps> = ({
  mode = 'dashboard',
  panels = ALL_PANELS,
  config,
  externalState,
  externalActions,
  theme: themeOverride,
  className,
  style,
  ariaLabel = 'Accessibility Audit Dashboard',
  holoFiles,
}) => {
  // Use external state/actions if provided, otherwise use internal hook
  const [internalState, internalActions] = useAccessibilityAudit(config);
  const state = externalState ?? internalState;
  const actions = externalActions ?? internalActions;

  const theme = useMemo(
    () => ({ ...DEFAULT_A11Y_THEME, ...themeOverride }),
    [themeOverride],
  );

  // Auto-scan when holoFiles are provided
  React.useEffect(() => {
    if (holoFiles && holoFiles.length > 0 && !state.report && !state.isScanning) {
      actions.runScan(holoFiles);
    }
  }, [holoFiles, state.report, state.isScanning, actions]);

  const containerStyles = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontFamily: theme.fontFamily,
      fontSize: `calc(0.85rem * ${theme.fontScale})`,
      color: theme.textPrimary,
      backgroundColor: theme.containerBackground,
      borderRadius: theme.borderRadius,
      border: `1px solid ${theme.borderColor}`,
      overflow: 'hidden',
    };

    switch (mode) {
      case 'overlay':
        return {
          ...base,
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
        };
      case 'compact':
        return {
          ...base,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem 1rem',
        };
      case 'dashboard':
      default:
        return {
          ...base,
          display: 'flex',
          flexDirection: 'column',
        };
    }
  }, [mode, theme]);

  // Compact mode: single-line score bar
  if (mode === 'compact') {
    return (
      <div
        className={className}
        style={{ ...containerStyles, ...style }}
        role="status"
        aria-label={ariaLabel}
      >
        <CompactBar state={state} actions={actions} theme={theme} />
      </div>
    );
  }

  // Full dashboard
  return (
    <div
      className={className}
      style={{ ...containerStyles, ...style }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header */}
      <DashboardHeader state={state} actions={actions} theme={theme} />

      {/* Panels */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Scanning State */}
        {state.isScanning && (
          <div
            style={{
              padding: '1rem',
              textAlign: 'center',
              color: theme.accentColor,
              fontSize: `calc(0.8rem * ${theme.fontScale})`,
            }}
            role="status"
            aria-label="Scanning in progress"
          >
            Scanning .holo files for WCAG 2.1 compliance...
          </div>
        )}

        {/* Error State */}
        {state.scanError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              color: theme.failColor,
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              borderBottom: `1px solid ${theme.borderColor}`,
            }}
            role="alert"
          >
            Scan error: {state.scanError}
          </div>
        )}

        {/* No Report State */}
        {!state.report && !state.isScanning && !state.scanError && (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              color: theme.textMuted,
              fontSize: `calc(0.8rem * ${theme.fontScale})`,
            }}
          >
            <div style={{ marginBottom: '0.5rem' }}>
              No .holo files scanned yet
            </div>
            <div
              style={{
                fontSize: `calc(0.65rem * ${theme.fontScale})`,
                color: theme.textMuted,
              }}
            >
              Provide .holo file sources via the holoFiles prop or actions.runScan()
            </div>
          </div>
        )}

        {/* Report Panels */}
        {state.report && (
          <>
            {/* Score Overview */}
            {panels.includes('score-overview') && (
              <ScoreOverviewPanel
                report={state.report}
                theme={theme}
              />
            )}

            {/* Criterion List */}
            {panels.includes('criterion-list') && (
              <CriterionListPanel
                criterionResults={state.report.criterionResults}
                severityFilter={state.severityFilter}
                statusFilter={state.statusFilter}
                selectedCriterion={state.selectedCriterion}
                onSelectCriterion={actions.selectCriterion}
                theme={theme}
              />
            )}

            {/* Trait Coverage */}
            {panels.includes('trait-coverage') && (
              <TraitCoveragePanel
                report={state.report}
                theme={theme}
              />
            )}

            {/* Object Inspector */}
            {panels.includes('object-inspector') && (
              <ObjectInspectorPanel
                report={state.report}
                severityFilter={state.severityFilter}
                statusFilter={state.statusFilter}
                expandedObjects={state.expandedObjects}
                onToggleExpanded={actions.toggleObjectExpanded}
                selectedFile={state.selectedFile}
                theme={theme}
              />
            )}

            {/* File List */}
            {panels.includes('file-list') && (
              <FileListPanel
                report={state.report}
                selectedFile={state.selectedFile}
                onSelectFile={actions.selectFile}
                theme={theme}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SubProps {
  state: A11yDashboardState;
  actions: A11yDashboardActions;
  theme: A11yTheme;
}

// -- Dashboard Header --

const DashboardHeader: React.FC<SubProps> = ({ state, actions, theme }) => {
  const report = state.report;
  const scoreColor = report
    ? report.complianceScore >= 80
      ? theme.passColor
      : report.complianceScore >= 50
        ? theme.warningColor
        : theme.failColor
    : theme.textMuted;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        backgroundColor: theme.cardBackground,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Status indicator */}
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: report
              ? report.passesLevelAA
                ? theme.passColor
                : theme.failColor
              : theme.textMuted,
            display: 'inline-block',
          }}
          aria-hidden="true"
        />
        <span
          style={{
            fontWeight: 600,
            fontSize: `calc(0.9rem * ${theme.fontScale})`,
          }}
        >
          A11y Audit
        </span>

        {/* Score Badge */}
        {report && (
          <span
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              fontWeight: 700,
              color: scoreColor,
              fontVariantNumeric: 'tabular-nums',
            }}
            role="status"
            aria-label={`Compliance score: ${report.complianceScore}%`}
          >
            {report.complianceScore}%
          </span>
        )}

        {/* Scanning indicator */}
        {state.isScanning && (
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              color: theme.accentColor,
              border: `1px solid ${theme.accentColor}`,
              borderRadius: '3px',
              padding: '0.05rem 0.3rem',
            }}
            role="status"
          >
            SCANNING
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
        {/* Scan summary badges */}
        {report && (
          <>
            <span
              style={{
                fontSize: `calc(0.6rem * ${theme.fontScale})`,
                fontWeight: 600,
                color: theme.passColor,
                border: `1px solid ${theme.passColor}30`,
                borderRadius: '4px',
                padding: '0.05rem 0.3rem',
              }}
              aria-label={`${report.summary.passedChecks} checks passed`}
            >
              {report.summary.passedChecks}P
            </span>
            <span
              style={{
                fontSize: `calc(0.6rem * ${theme.fontScale})`,
                fontWeight: 600,
                color: theme.failColor,
                border: `1px solid ${theme.failColor}30`,
                borderRadius: '4px',
                padding: '0.05rem 0.3rem',
              }}
              aria-label={`${report.summary.failedChecks} checks failed`}
            >
              {report.summary.failedChecks}F
            </span>
            <span
              style={{
                fontSize: `calc(0.6rem * ${theme.fontScale})`,
                fontWeight: 600,
                color: theme.warningColor,
                border: `1px solid ${theme.warningColor}30`,
                borderRadius: '4px',
                padding: '0.05rem 0.3rem',
              }}
              aria-label={`${report.summary.warningChecks} warnings`}
            >
              {report.summary.warningChecks}W
            </span>
          </>
        )}

        {/* Clear Report */}
        {report && (
          <button
            type="button"
            onClick={() => actions.clearReport()}
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontFamily: theme.fontFamily,
              color: theme.textMuted,
              backgroundColor: 'transparent',
              border: `1px solid ${theme.borderColor}`,
              borderRadius: '4px',
              padding: '0.1rem 0.4rem',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            aria-label="Clear audit report"
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

// -- Compact Bar --

const CompactBar: React.FC<SubProps> = ({ state, actions, theme }) => {
  const report = state.report;

  if (!report) {
    return (
      <span
        style={{
          fontSize: `calc(0.7rem * ${theme.fontScale})`,
          color: theme.textMuted,
        }}
      >
        A11y: No scan
      </span>
    );
  }

  const scoreColor = report.complianceScore >= 80
    ? theme.passColor
    : report.complianceScore >= 50
      ? theme.warningColor
      : theme.failColor;

  return (
    <>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: report.passesLevelAA ? theme.passColor : theme.failColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <span
        style={{
          fontWeight: 600,
          fontSize: `calc(0.8rem * ${theme.fontScale})`,
        }}
      >
        A11y
      </span>
      <span
        style={{
          fontSize: `calc(0.75rem * ${theme.fontScale})`,
          fontWeight: 700,
          color: scoreColor,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {report.complianceScore}%
      </span>
      <span
        style={{
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
          fontWeight: 600,
          color: report.passesLevelAA ? theme.passColor : theme.failColor,
        }}
      >
        {report.passesLevelAA ? 'AA' : 'FAIL'}
      </span>
      <span style={{ color: theme.textMuted }}>|</span>
      <span
        style={{
          fontSize: `calc(0.65rem * ${theme.fontScale})`,
          color: theme.textSecondary,
        }}
      >
        {report.summary.criteriaPassed}/{report.summary.totalCriteria} criteria
      </span>
      {report.summary.failedChecks > 0 && (
        <>
          <span style={{ color: theme.textMuted }}>|</span>
          <span
            style={{
              fontSize: `calc(0.65rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.failColor,
            }}
          >
            {report.summary.failedChecks} issues
          </span>
        </>
      )}
    </>
  );
};

// -- File List Panel --

interface FileListPanelProps {
  report: NonNullable<A11yDashboardState['report']>;
  selectedFile: string | null;
  onSelectFile: (fileName: string | null) => void;
  theme: A11yTheme;
}

const FileListPanel: React.FC<FileListPanelProps> = ({
  report,
  selectedFile,
  onSelectFile,
  theme,
}) => {
  if (report.files.length <= 1) return null;

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
      }}
      role="region"
      aria-label="Scanned Files"
    >
      <div
        style={{
          fontSize: `calc(0.75rem * ${theme.fontScale})`,
          fontWeight: 600,
          color: theme.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.5rem',
        }}
      >
        Files ({report.files.length})
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.25rem',
        }}
      >
        {/* All Files Button */}
        <button
          type="button"
          onClick={() => onSelectFile(null)}
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            fontFamily: theme.fontFamily,
            fontWeight: selectedFile === null ? 600 : 400,
            color: selectedFile === null ? theme.accentColor : theme.textSecondary,
            backgroundColor: selectedFile === null ? `${theme.accentColor}15` : 'transparent',
            border: `1px solid ${selectedFile === null ? theme.accentColor : theme.borderColor}`,
            borderRadius: '4px',
            padding: '0.15rem 0.4rem',
            cursor: 'pointer',
          }}
          aria-pressed={selectedFile === null}
          aria-label="Show all files"
        >
          All
        </button>

        {/* Individual File Buttons */}
        {report.files.map((file) => {
          const isSelected = selectedFile === file.fileName;
          return (
            <button
              key={file.fileName}
              type="button"
              onClick={() => onSelectFile(isSelected ? null : file.fileName)}
              style={{
                fontSize: `calc(0.6rem * ${theme.fontScale})`,
                fontFamily: theme.fontFamily,
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? theme.accentColor : theme.textSecondary,
                backgroundColor: isSelected ? `${theme.accentColor}15` : 'transparent',
                border: `1px solid ${isSelected ? theme.accentColor : theme.borderColor}`,
                borderRadius: '4px',
                padding: '0.15rem 0.4rem',
                cursor: 'pointer',
              }}
              aria-pressed={isSelected}
              aria-label={`Filter to ${file.fileName}`}
            >
              {file.fileName}
              <span
                style={{
                  marginLeft: '0.25rem',
                  fontSize: `calc(0.5rem * ${theme.fontScale})`,
                  color: theme.textMuted,
                }}
              >
                ({file.objects.filter((o) => o.type !== 'template').length})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AccessibilityAuditDashboard;
