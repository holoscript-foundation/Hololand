/**
 * CriterionListPanel
 *
 * Displays the list of WCAG 2.1 criteria results, organized by principle.
 * Each criterion row shows pass/fail/warning status with expandable details
 * listing per-object check results and suggested fixes.
 *
 * Accessibility:
 *   - role="list" for criterion groups
 *   - role="button" for expandable rows
 *   - aria-expanded for disclosure state
 *   - Color-coded status indicators with text labels (not color-only)
 *
 * @module accessibility-audit-dashboard/CriterionListPanel
 */

import React, { useMemo, useState } from 'react';
import type {
  CriterionAuditResult,
  AuditCheckResult,
  AuditSeverity,
  AuditCheckStatus,
  A11yTheme,
  WCAGPrinciple,
} from './types';
import {
  getPrincipleColor,
  getPrincipleLabel,
  getStatusColor,
  getSeverityColor,
  TRAIT_REGISTRY,
} from './types';
import type { HoloAccessibilityTrait } from './types';

// =============================================================================
// PROPS
// =============================================================================

export interface CriterionListPanelProps {
  /** Criterion audit results */
  criterionResults: CriterionAuditResult[];
  /** Severity filter */
  severityFilter: Set<AuditSeverity>;
  /** Status filter */
  statusFilter: Set<AuditCheckStatus>;
  /** Currently selected criterion ID (if any) */
  selectedCriterion: string | null;
  /** Callback when a criterion is selected */
  onSelectCriterion: (criterionId: string | null) => void;
  /** Theme configuration */
  theme: A11yTheme;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CriterionListPanel: React.FC<CriterionListPanelProps> = ({
  criterionResults,
  severityFilter,
  statusFilter,
  selectedCriterion,
  onSelectCriterion,
  theme,
}) => {
  // Group results by principle
  const grouped = useMemo(() => {
    const groups: Record<WCAGPrinciple, CriterionAuditResult[]> = {
      perceivable: [],
      operable: [],
      understandable: [],
      robust: [],
    };

    for (const result of criterionResults) {
      // Filter by status
      if (!statusFilter.has(result.status) && result.status !== 'not_applicable') {
        // If the criterion's overall status isn't in filter, check if any checks match
        const hasMatchingChecks = result.checks.some(
          (c) => statusFilter.has(c.status) && severityFilter.has(c.severity),
        );
        if (!hasMatchingChecks && result.checks.length > 0) continue;
      }
      groups[result.criterion.principle].push(result);
    }

    return groups;
  }, [criterionResults, severityFilter, statusFilter]);

  const principles: WCAGPrinciple[] = ['perceivable', 'operable', 'understandable', 'robust'];

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
      }}
      role="region"
      aria-label="WCAG Criterion Results"
    >
      {/* Section Header */}
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
        Criteria ({criterionResults.length})
      </div>

      {/* Principle Groups */}
      {principles.map((principle) => {
        const results = grouped[principle];
        if (results.length === 0) return null;

        return (
          <PrincipleGroup
            key={principle}
            principle={principle}
            results={results}
            selectedCriterion={selectedCriterion}
            onSelectCriterion={onSelectCriterion}
            severityFilter={severityFilter}
            theme={theme}
          />
        );
      })}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface PrincipleGroupProps {
  principle: WCAGPrinciple;
  results: CriterionAuditResult[];
  selectedCriterion: string | null;
  onSelectCriterion: (criterionId: string | null) => void;
  severityFilter: Set<AuditSeverity>;
  theme: A11yTheme;
}

const PrincipleGroup: React.FC<PrincipleGroupProps> = ({
  principle,
  results,
  selectedCriterion,
  onSelectCriterion,
  severityFilter,
  theme,
}) => {
  const principleColor = getPrincipleColor(principle, theme);

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      {/* Principle Header */}
      <div
        style={{
          fontSize: `calc(0.65rem * ${theme.fontScale})`,
          fontWeight: 600,
          color: principleColor,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.25rem',
          borderLeft: `3px solid ${principleColor}`,
          paddingLeft: '0.5rem',
        }}
      >
        {getPrincipleLabel(principle)}
      </div>

      {/* Criterion Rows */}
      <div
        role="list"
        aria-label={`${getPrincipleLabel(principle)} criteria`}
        style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
      >
        {results.map((result) => (
          <CriterionRow
            key={result.criterion.id}
            result={result}
            isSelected={selectedCriterion === result.criterion.id}
            onToggle={() => {
              onSelectCriterion(
                selectedCriterion === result.criterion.id ? null : result.criterion.id,
              );
            }}
            severityFilter={severityFilter}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
};

interface CriterionRowProps {
  result: CriterionAuditResult;
  isSelected: boolean;
  onToggle: () => void;
  severityFilter: Set<AuditSeverity>;
  theme: A11yTheme;
}

const CriterionRow: React.FC<CriterionRowProps> = ({
  result,
  isSelected,
  onToggle,
  severityFilter,
  theme,
}) => {
  const statusColor = getStatusColor(result.status, theme);
  const statusLabel = result.status === 'not_applicable' ? 'N/A'
    : result.status === 'pass' ? 'PASS'
    : result.status === 'fail' ? 'FAIL'
    : 'WARN';

  const filteredChecks = result.checks.filter((c) => severityFilter.has(c.severity));

  return (
    <div role="listitem">
      {/* Criterion Header Row */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isSelected}
        aria-label={`${result.criterion.id} ${result.criterion.name}: ${statusLabel}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          width: '100%',
          padding: '0.3rem 0.5rem',
          borderRadius: '4px',
          backgroundColor: isSelected
            ? `${statusColor}10`
            : 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: theme.fontFamily,
          textAlign: 'left',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.03)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }
        }}
      >
        {/* Status Dot */}
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            flexShrink: 0,
          }}
          aria-hidden="true"
        />

        {/* Criterion ID */}
        <span
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: theme.textMuted,
            minWidth: '36px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {result.criterion.id}
        </span>

        {/* Criterion Name */}
        <span
          style={{
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            color: theme.textPrimary,
            flex: 1,
          }}
        >
          {result.criterion.name}
        </span>

        {/* Level Badge */}
        <span
          style={{
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            color: theme.textMuted,
            border: `1px solid ${theme.borderColor}`,
            borderRadius: '3px',
            padding: '0.05rem 0.2rem',
          }}
        >
          {result.criterion.level}
        </span>

        {/* Counts */}
        {result.failCount > 0 && (
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.failColor,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {result.failCount}F
          </span>
        )}
        {result.warningCount > 0 && (
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.warningColor,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {result.warningCount}W
          </span>
        )}

        {/* Status Label */}
        <span
          style={{
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: statusColor,
            border: `1px solid ${statusColor}`,
            borderRadius: '3px',
            padding: '0.05rem 0.3rem',
            minWidth: '32px',
            textAlign: 'center',
          }}
        >
          {statusLabel}
        </span>

        {/* Expand Arrow */}
        <span
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            color: theme.textMuted,
            transform: isSelected ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
          aria-hidden="true"
        >
          &gt;
        </span>
      </button>

      {/* Expanded Details */}
      {isSelected && filteredChecks.length > 0 && (
        <div
          style={{
            padding: '0.25rem 0.5rem 0.5rem 1.8rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          {/* Criterion Description */}
          <div
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              color: theme.textMuted,
              marginBottom: '0.25rem',
              fontStyle: 'italic',
            }}
          >
            {result.criterion.description}
          </div>

          {/* Individual Checks */}
          {filteredChecks.map((check) => (
            <CheckResultRow key={check.id} check={check} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
};

interface CheckResultRowProps {
  check: AuditCheckResult;
  theme: A11yTheme;
}

const CheckResultRow: React.FC<CheckResultRowProps> = ({ check, theme }) => {
  const statusColor = getStatusColor(check.status, theme);
  const severityColor = getSeverityColor(check.severity, theme);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.15rem',
        padding: '0.25rem 0.4rem',
        borderRadius: '4px',
        backgroundColor: `${statusColor}08`,
        borderLeft: `2px solid ${statusColor}`,
      }}
    >
      {/* Check Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
        }}
      >
        {/* Severity Badge */}
        <span
          style={{
            fontSize: `calc(0.5rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: severityColor,
            textTransform: 'uppercase',
          }}
        >
          {check.severity}
        </span>

        {/* Object Name */}
        <span
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: theme.textPrimary,
          }}
        >
          {check.objectName}
        </span>

        {/* Line Number */}
        <span
          style={{
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            color: theme.textMuted,
          }}
        >
          L{check.lineNumber}
        </span>
      </div>

      {/* Message */}
      <div
        style={{
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
          color: theme.textSecondary,
        }}
      >
        {check.message}
      </div>

      {/* Suggested Fix */}
      {check.suggestedFix && (
        <div
          style={{
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            color: theme.passColor,
            paddingLeft: '0.5rem',
            borderLeft: `1px solid ${theme.passColor}40`,
          }}
        >
          Fix: {check.suggestedFix}
        </div>
      )}

      {/* Missing Trait */}
      {check.missingTrait && (
        <div
          style={{
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            color: TRAIT_REGISTRY[check.missingTrait as HoloAccessibilityTrait]?.color ?? theme.accentColor,
          }}
        >
          Missing trait: {check.missingTrait}
        </div>
      )}
    </div>
  );
};

export default CriterionListPanel;
