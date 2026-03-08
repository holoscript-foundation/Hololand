/**
 * TraitCoveragePanel
 *
 * Displays a heatmap/grid of HoloScript accessibility trait usage across
 * all objects in the scanned .holo files. Shows how many objects use each
 * of the 10 accessibility traits and highlights gaps.
 *
 * Accessibility:
 *   - role="region" with aria-label
 *   - Each trait cell has aria-label with full description
 *   - Color intensity conveys coverage (0% = dark, 100% = bright)
 *   - Text labels always visible alongside color
 *
 * @module accessibility-audit-dashboard/TraitCoveragePanel
 */

import React, { useMemo } from 'react';
import type {
  AccessibilityAuditReport,
  A11yTheme,
  HoloAccessibilityTrait,
} from './types';
import { TRAIT_REGISTRY } from './types';

// =============================================================================
// PROPS
// =============================================================================

export interface TraitCoveragePanelProps {
  /** The audit report to display */
  report: AccessibilityAuditReport;
  /** Theme configuration */
  theme: A11yTheme;
}

// =============================================================================
// COMPONENT
// =============================================================================

const ALL_TRAITS: HoloAccessibilityTrait[] = [
  '@accessible', '@alt_text', '@screen_reader', '@subtitle',
  '@high_contrast', '@motion_reduced', '@haptic_cue', '@haptic',
  '@voice_input', '@voice_output',
];

export const TraitCoveragePanel: React.FC<TraitCoveragePanelProps> = ({
  report,
  theme,
}) => {
  const { summary } = report;
  const totalNonTemplateObjects = summary.totalObjects;

  const traitData = useMemo(() => {
    return ALL_TRAITS.map((trait) => {
      const count = summary.traitCoverage[trait] || 0;
      const percentage = totalNonTemplateObjects > 0
        ? Math.round((count / totalNonTemplateObjects) * 100)
        : 0;
      const meta = TRAIT_REGISTRY[trait];
      return {
        trait,
        count,
        percentage,
        meta,
      };
    });
  }, [summary, totalNonTemplateObjects]);

  // Overall trait adoption
  const traitsUsed = traitData.filter((t) => t.count > 0).length;
  const overallAdoption = Math.round((traitsUsed / ALL_TRAITS.length) * 100);

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
      }}
      role="region"
      aria-label="Accessibility Trait Coverage"
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: theme.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Trait Coverage
        </span>
        <span
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: overallAdoption >= 80 ? theme.passColor : overallAdoption >= 50 ? theme.warningColor : theme.failColor,
          }}
        >
          {traitsUsed}/{ALL_TRAITS.length} traits used ({overallAdoption}%)
        </span>
      </div>

      {/* Trait Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '0.3rem',
        }}
      >
        {traitData.map(({ trait, count, percentage, meta }) => (
          <TraitCell
            key={trait}
            trait={trait}
            label={meta.label}
            description={meta.description}
            count={count}
            total={totalNonTemplateObjects}
            percentage={percentage}
            color={meta.color}
            theme={theme}
          />
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginTop: '0.5rem',
          fontSize: `calc(0.55rem * ${theme.fontScale})`,
          color: theme.textMuted,
        }}
      >
        <span>Coverage: % of objects with this trait</span>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface TraitCellProps {
  trait: HoloAccessibilityTrait;
  label: string;
  description: string;
  count: number;
  total: number;
  percentage: number;
  color: string;
  theme: A11yTheme;
}

const TraitCell: React.FC<TraitCellProps> = ({
  trait,
  label,
  description,
  count,
  total,
  percentage,
  color,
  theme,
}) => {
  const opacity = percentage > 0 ? Math.max(0.15, percentage / 100) : 0.05;
  const isUnused = count === 0;

  return (
    <div
      style={{
        padding: '0.4rem 0.5rem',
        borderRadius: '4px',
        backgroundColor: isUnused ? `${theme.failColor}08` : `${color}${Math.round(opacity * 30).toString(16).padStart(2, '0')}`,
        border: `1px solid ${isUnused ? `${theme.failColor}30` : `${color}30`}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.15rem',
      }}
      aria-label={`${label}: ${count} of ${total} objects (${percentage}%). ${description}`}
    >
      {/* Trait Name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: isUnused ? theme.failColor : color,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: isUnused ? theme.failColor : theme.textSecondary,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {percentage}%
        </span>
      </div>

      {/* Coverage Bar */}
      <div
        style={{
          height: '3px',
          backgroundColor: `${isUnused ? theme.failColor : color}15`,
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.max(percentage, 2)}%`,
            height: '100%',
            backgroundColor: isUnused ? theme.failColor : color,
            borderRadius: '2px',
          }}
        />
      </div>

      {/* Count */}
      <span
        style={{
          fontSize: `calc(0.5rem * ${theme.fontScale})`,
          color: theme.textMuted,
        }}
      >
        {count}/{total} objects
      </span>
    </div>
  );
};

export default TraitCoveragePanel;
