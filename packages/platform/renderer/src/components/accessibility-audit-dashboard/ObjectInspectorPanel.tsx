/**
 * ObjectInspectorPanel
 *
 * Displays a per-object view of accessibility audit results. Each object
 * from the .holo file is shown with its traits, check results, and
 * suggested fixes. Objects can be expanded/collapsed for detailed view.
 *
 * Accessibility:
 *   - role="list" for the object list
 *   - role="button" for expandable object headers
 *   - aria-expanded for disclosure state
 *   - Keyboard navigable (Enter/Space to toggle)
 *
 * @module accessibility-audit-dashboard/ObjectInspectorPanel
 */

import React, { useMemo } from 'react';
import type {
  AccessibilityAuditReport,
  AuditCheckResult,
  AuditSeverity,
  AuditCheckStatus,
  HoloObject,
  A11yTheme,
  HoloAccessibilityTrait,
} from './types';
import {
  getStatusColor,
  getSeverityColor,
  TRAIT_REGISTRY,
} from './types';

// =============================================================================
// PROPS
// =============================================================================

export interface ObjectInspectorPanelProps {
  /** The audit report to display */
  report: AccessibilityAuditReport;
  /** Severity filter */
  severityFilter: Set<AuditSeverity>;
  /** Status filter */
  statusFilter: Set<AuditCheckStatus>;
  /** Expanded object names */
  expandedObjects: Set<string>;
  /** Callback to toggle object expansion */
  onToggleExpanded: (objectName: string) => void;
  /** Selected file filter (null = all files) */
  selectedFile: string | null;
  /** Theme configuration */
  theme: A11yTheme;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const ObjectInspectorPanel: React.FC<ObjectInspectorPanelProps> = ({
  report,
  severityFilter,
  statusFilter,
  expandedObjects,
  onToggleExpanded,
  selectedFile,
  theme,
}) => {
  // Collect objects with their checks
  const objectEntries = useMemo(() => {
    const entries: Array<{
      object: HoloObject;
      fileName: string;
      checks: AuditCheckResult[];
      failCount: number;
      warnCount: number;
      passCount: number;
    }> = [];

    for (const file of report.files) {
      if (selectedFile && file.fileName !== selectedFile) continue;

      for (const obj of file.objects) {
        if (obj.type === 'template') continue;

        const objChecks = report.allChecks.filter(
          (c) =>
            c.objectName === obj.name
            && severityFilter.has(c.severity)
            && statusFilter.has(c.status),
        );

        // Only show objects with matching checks or expand all
        if (objChecks.length === 0 && !expandedObjects.has(obj.name)) continue;

        entries.push({
          object: obj,
          fileName: file.fileName,
          checks: objChecks,
          failCount: objChecks.filter((c) => c.status === 'fail').length,
          warnCount: objChecks.filter((c) => c.status === 'warning').length,
          passCount: objChecks.filter((c) => c.status === 'pass').length,
        });
      }
    }

    // Sort: objects with failures first
    entries.sort((a, b) => {
      if (a.failCount !== b.failCount) return b.failCount - a.failCount;
      if (a.warnCount !== b.warnCount) return b.warnCount - a.warnCount;
      return a.object.name.localeCompare(b.object.name);
    });

    return entries;
  }, [report, severityFilter, statusFilter, selectedFile, expandedObjects]);

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
      }}
      role="region"
      aria-label="Object Inspector"
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
          Objects ({objectEntries.length})
        </span>
      </div>

      {/* Object List */}
      {objectEntries.length === 0 ? (
        <div
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            color: theme.textMuted,
            padding: '0.5rem',
            textAlign: 'center',
          }}
        >
          No objects match current filters
        </div>
      ) : (
        <div
          role="list"
          aria-label="Audited objects"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          {objectEntries.map((entry) => (
            <ObjectRow
              key={`${entry.fileName}:${entry.object.name}`}
              entry={entry}
              isExpanded={expandedObjects.has(entry.object.name)}
              onToggle={() => onToggleExpanded(entry.object.name)}
              theme={theme}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface ObjectRowEntry {
  object: HoloObject;
  fileName: string;
  checks: AuditCheckResult[];
  failCount: number;
  warnCount: number;
  passCount: number;
}

interface ObjectRowProps {
  entry: ObjectRowEntry;
  isExpanded: boolean;
  onToggle: () => void;
  theme: A11yTheme;
}

const ObjectRow: React.FC<ObjectRowProps> = ({
  entry,
  isExpanded,
  onToggle,
  theme,
}) => {
  const { object, fileName, checks, failCount, warnCount, passCount } = entry;

  const overallStatus: AuditCheckStatus = failCount > 0
    ? 'fail'
    : warnCount > 0
    ? 'warning'
    : 'pass';

  const statusColor = getStatusColor(overallStatus, theme);

  return (
    <div role="listitem">
      {/* Object Header */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-label={`${object.name}: ${failCount} failures, ${warnCount} warnings, ${passCount} passes`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          width: '100%',
          padding: '0.3rem 0.5rem',
          borderRadius: '4px',
          backgroundColor: isExpanded ? `${statusColor}10` : 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: theme.fontFamily,
          textAlign: 'left',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.03)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) {
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

        {/* Object Name */}
        <span
          style={{
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: theme.textPrimary,
            flex: 1,
          }}
        >
          {object.name}
        </span>

        {/* Type/Attributes */}
        <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
          {object.isInteractive && (
            <TypeBadge label="interactive" color={theme.accentColor} theme={theme} />
          )}
          {object.hasAnimation && (
            <TypeBadge label="animated" color={theme.warningColor} theme={theme} />
          )}
          {object.hasAudioContent && (
            <TypeBadge label="audio" color={theme.infoColor} theme={theme} />
          )}
        </div>

        {/* Trait Count */}
        <span
          style={{
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            color: theme.textMuted,
          }}
        >
          {object.traits.length} traits
        </span>

        {/* Issue Counts */}
        {failCount > 0 && (
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.failColor,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {failCount}F
          </span>
        )}
        {warnCount > 0 && (
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              fontWeight: 600,
              color: theme.warningColor,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {warnCount}W
          </span>
        )}

        {/* Line Number */}
        <span
          style={{
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            color: theme.textMuted,
          }}
        >
          L{object.lineNumber}
        </span>

        {/* Expand Arrow */}
        <span
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            color: theme.textMuted,
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
          aria-hidden="true"
        >
          &gt;
        </span>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div
          style={{
            padding: '0.25rem 0.5rem 0.5rem 1.8rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          {/* Traits Present */}
          <div>
            <div
              style={{
                fontSize: `calc(0.55rem * ${theme.fontScale})`,
                color: theme.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.2rem',
              }}
            >
              Traits
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
              {object.traits.length > 0 ? (
                object.traits.map((trait) => {
                  const meta = TRAIT_REGISTRY[trait as HoloAccessibilityTrait];
                  return (
                    <span
                      key={trait}
                      style={{
                        fontSize: `calc(0.55rem * ${theme.fontScale})`,
                        fontWeight: 500,
                        color: meta?.color ?? theme.accentColor,
                        backgroundColor: `${meta?.color ?? theme.accentColor}15`,
                        border: `1px solid ${meta?.color ?? theme.accentColor}30`,
                        borderRadius: '3px',
                        padding: '0.05rem 0.3rem',
                      }}
                    >
                      {trait}
                    </span>
                  );
                })
              ) : (
                <span
                  style={{
                    fontSize: `calc(0.55rem * ${theme.fontScale})`,
                    color: theme.failColor,
                    fontStyle: 'italic',
                  }}
                >
                  No accessibility traits
                </span>
              )}
            </div>
          </div>

          {/* Accessible Properties (if present) */}
          {object.traits.includes('@accessible') && (
            <div>
              <div
                style={{
                  fontSize: `calc(0.55rem * ${theme.fontScale})`,
                  color: theme.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.2rem',
                }}
              >
                @accessible Properties
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '0.1rem 0.5rem',
                  fontSize: `calc(0.55rem * ${theme.fontScale})`,
                }}
              >
                {object.accessibleProps.role && (
                  <>
                    <span style={{ color: theme.textMuted }}>role:</span>
                    <span style={{ color: theme.textSecondary }}>{object.accessibleProps.role}</span>
                  </>
                )}
                {object.accessibleProps.label && (
                  <>
                    <span style={{ color: theme.textMuted }}>label:</span>
                    <span style={{ color: theme.textSecondary }}>{object.accessibleProps.label}</span>
                  </>
                )}
                {object.accessibleProps.tabIndex !== undefined && (
                  <>
                    <span style={{ color: theme.textMuted }}>tab_index:</span>
                    <span style={{ color: theme.textSecondary }}>{object.accessibleProps.tabIndex}</span>
                  </>
                )}
                {object.accessibleProps.focusVisible !== undefined && (
                  <>
                    <span style={{ color: theme.textMuted }}>focus_visible:</span>
                    <span style={{ color: object.accessibleProps.focusVisible ? theme.passColor : theme.failColor }}>
                      {String(object.accessibleProps.focusVisible)}
                    </span>
                  </>
                )}
                {object.accessibleProps.keyboardShortcut && (
                  <>
                    <span style={{ color: theme.textMuted }}>keyboard_shortcut:</span>
                    <span style={{ color: theme.textSecondary }}>{object.accessibleProps.keyboardShortcut}</span>
                  </>
                )}
                {object.accessibleProps.liveRegion && (
                  <>
                    <span style={{ color: theme.textMuted }}>live_region:</span>
                    <span style={{ color: theme.textSecondary }}>{object.accessibleProps.liveRegion}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Check Results */}
          {checks.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: `calc(0.55rem * ${theme.fontScale})`,
                  color: theme.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.2rem',
                }}
              >
                Checks ({checks.length})
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                }}
              >
                {checks.map((check) => (
                  <InlineCheckResult key={check.id} check={check} theme={theme} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface TypeBadgeProps {
  label: string;
  color: string;
  theme: A11yTheme;
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ label, color, theme }) => (
  <span
    style={{
      fontSize: `calc(0.45rem * ${theme.fontScale})`,
      color,
      border: `1px solid ${color}30`,
      borderRadius: '2px',
      padding: '0 0.2rem',
      textTransform: 'uppercase',
    }}
  >
    {label}
  </span>
);

interface InlineCheckResultProps {
  check: AuditCheckResult;
  theme: A11yTheme;
}

const InlineCheckResult: React.FC<InlineCheckResultProps> = ({ check, theme }) => {
  const statusColor = getStatusColor(check.status, theme);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.3rem',
        fontSize: `calc(0.55rem * ${theme.fontScale})`,
      }}
    >
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          marginTop: '0.35em',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <span style={{ color: theme.textMuted, minWidth: '28px', flexShrink: 0 }}>
        {check.criterionId}
      </span>
      <span style={{ color: theme.textSecondary, flex: 1 }}>
        {check.message}
      </span>
    </div>
  );
};

export default ObjectInspectorPanel;
