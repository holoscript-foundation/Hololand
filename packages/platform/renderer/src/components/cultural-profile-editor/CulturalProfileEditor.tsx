/**
 * CulturalProfileEditor Component
 *
 * A comprehensive UI for editing an agent's cultural identity profile based on
 * Schwartz's Theory of Basic Values. Provides 10 value dimension sliders,
 * cultural family selection, cooperation index configuration, and real-time
 * compatibility preview against other agent profiles.
 *
 * Architecture:
 * ```
 *   <CulturalProfileEditor>
 *       |
 *       |-- useCulturalProfileEditor() hook (or external state)
 *       |
 *       |-- EditorHeader (profile name, family badge, save button)
 *       |-- CulturalFamilySelector (preset family selection grid)
 *       |-- SchwartzValuePanel (10 value dimension sliders + radar)
 *       |-- CooperationIndexPanel (cooperation slider with context)
 *       |-- CompatibilityPreviewPanel (comparison profile selection + results)
 * ```
 *
 * Schwartz Value Circle Layout:
 *   The radar chart arranges the 10 values in their theoretical circular
 *   order. Adjacent values are motivationally compatible; opposing values
 *   (across the circle) represent tensions. The radar provides instant
 *   visual feedback on profile shape.
 *
 * WCAG 2.1 AA Compliance:
 *   - All sliders use native <input type="range"> with aria-label, aria-valuenow,
 *     aria-valuemin, aria-valuemax, and visible value text
 *   - role="group" containers with aria-label for logical grouping
 *   - role="radiogroup" for cultural family selector with keyboard navigation
 *   - Minimum 4.5:1 contrast ratios throughout
 *   - Focus visible indicators (2px solid outline) on all interactive elements
 *   - Tab order follows logical reading flow
 *   - Skip navigation within the editor via heading hierarchy
 *   - All colour-coded information has text alternatives
 *
 * Performance Contract:
 *   - All rendering is pure data display: O(1) per frame
 *   - Radar polygon recomputation: O(10) = O(1)
 *   - Compatibility recomputation: O(10) cosine similarity = O(1)
 *   - Slider debouncing via native <input> event batching
 *
 * @module cultural-profile-editor/CulturalProfileEditor
 */

import React, { useMemo } from 'react';
import {
  useCulturalProfileEditor,
  type UseCulturalProfileEditorConfig,
} from './useCulturalProfileEditor';
import type {
  CulturalProfileEditorState,
  CulturalProfileEditorActions,
  CulturalProfileEditorTheme,
  SchwartzValue,
  SchwartzCategory,
  CulturalFamily,
  CompatibilityResult as CompatibilityResultData,
  CulturalProfile,
} from './types';
import {
  ALL_SCHWARTZ_VALUES,
  SCHWARTZ_VALUE_CONFIG,
  SCHWARTZ_CATEGORY_CONFIG,
  ALL_CULTURAL_FAMILIES,
  CULTURAL_FAMILY_PRESETS,
  DEFAULT_CULTURAL_PROFILE_EDITOR_THEME,
  getCompatibilityColor,
  getCompatibilityLabel,
  formatPercent,
  applyOverlayOpacity,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface CulturalProfileEditorProps {
  /** Hook configuration (used when no external state provided) */
  config?: UseCulturalProfileEditorConfig;
  /** Externally managed state (bypasses internal hook) */
  externalState?: CulturalProfileEditorState;
  /** Externally managed actions (bypasses internal hook) */
  externalActions?: CulturalProfileEditorActions;
  /** Theme overrides */
  theme?: Partial<CulturalProfileEditorTheme>;
  /** Override overlay opacity (0.0 - 1.0) */
  overlayOpacity?: number;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Accessible label override */
  ariaLabel?: string;
  /** Whether to show the cultural family selector */
  showFamilySelector?: boolean;
  /** Whether to show the compatibility preview panel */
  showCompatibilityPreview?: boolean;
  /** Whether to show the radar chart */
  showRadar?: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CulturalProfileEditor: React.FC<CulturalProfileEditorProps> = ({
  config,
  externalState,
  externalActions,
  theme: themeOverride,
  overlayOpacity,
  className,
  style,
  ariaLabel = 'Cultural Profile Editor',
  showFamilySelector = true,
  showCompatibilityPreview = true,
  showRadar = true,
}) => {
  const [internalState, internalActions] = useCulturalProfileEditor(config);
  const state = externalState ?? internalState;
  const actions = externalActions ?? internalActions;

  const theme = useMemo((): CulturalProfileEditorTheme => {
    const merged = { ...DEFAULT_CULTURAL_PROFILE_EDITOR_THEME, ...themeOverride };
    if (overlayOpacity !== undefined) {
      merged.overlayOpacity = overlayOpacity;
      merged.containerBackground = applyOverlayOpacity(
        merged.containerBackground,
        overlayOpacity,
      );
      merged.cardBackground = applyOverlayOpacity(
        merged.cardBackground,
        overlayOpacity,
      );
    }
    return merged;
  }, [themeOverride, overlayOpacity]);

  const containerStyles = useMemo((): React.CSSProperties => ({
    fontFamily: theme.fontFamily,
    fontSize: `calc(0.85rem * ${theme.fontScale})`,
    color: theme.textPrimary,
    backgroundColor: theme.containerBackground,
    borderRadius: theme.borderRadius,
    border: `1px solid ${theme.borderColor}`,
    boxShadow: `0 0 12px ${theme.glowColor}, inset 0 0 4px ${theme.glowColor}`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '560px',
    width: '100%',
  }), [theme]);

  return (
    <div
      className={className}
      style={{ ...containerStyles, ...style }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header */}
      <EditorHeader state={state} actions={actions} theme={theme} />

      {/* Cultural Family Selector */}
      {showFamilySelector && (
        <CulturalFamilySelector
          selectedFamily={state.profile.culturalFamily}
          onSelectFamily={actions.selectCulturalFamily}
          theme={theme}
        />
      )}

      {/* Schwartz Value Sliders */}
      <SchwartzValuePanel
        values={state.profile.values}
        onValueChange={actions.setSchwartzValue}
        showRadar={showRadar}
        theme={theme}
      />

      {/* Cooperation Index */}
      <CooperationIndexPanel
        cooperationIndex={state.profile.cooperationIndex}
        onCooperationChange={actions.setCooperationIndex}
        theme={theme}
      />

      {/* Compatibility Preview */}
      {showCompatibilityPreview && state.comparisonProfiles.length > 0 && (
        <CompatibilityPreviewPanel
          state={state}
          actions={actions}
          theme={theme}
        />
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// -- Editor Header --

interface EditorHeaderProps {
  state: CulturalProfileEditorState;
  actions: CulturalProfileEditorActions;
  theme: CulturalProfileEditorTheme;
}

const EditorHeader: React.FC<EditorHeaderProps> = ({ state, actions, theme }) => {
  const familyMeta = CULTURAL_FAMILY_PRESETS[state.profile.culturalFamily];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        background: theme.cardBackground,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <h2
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: `calc(0.95rem * ${theme.fontScale})`,
            color: theme.textPrimary,
          }}
        >
          Cultural Profile
        </h2>
        <span
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            fontWeight: 500,
            color: theme.accentColor,
            border: `1px solid ${theme.accentColor}`,
            borderRadius: '4px',
            padding: '0.1rem 0.4rem',
          }}
          role="status"
          aria-label={`Cultural family: ${familyMeta.label}`}
        >
          {familyMeta.label}
        </span>
        {state.isDirty && (
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              color: theme.tensionColor,
            }}
            role="status"
            aria-label="Profile has unsaved changes"
          >
            (unsaved)
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => actions.resetToFamilyDefaults()}
          style={{
            ...buttonStyle(theme),
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
          }}
          aria-label="Reset values to cultural family defaults"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => actions.saveProfile()}
          disabled={!state.isDirty || state.isSaving}
          style={{
            ...buttonStyle(theme),
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            backgroundColor: state.isDirty
              ? theme.accentColor
              : theme.buttonBackground,
            color: state.isDirty ? '#ffffff' : theme.textMuted,
            opacity: state.isSaving ? 0.6 : 1,
          }}
          aria-label={state.isSaving ? 'Saving profile...' : 'Save cultural profile'}
          aria-busy={state.isSaving}
        >
          {state.isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

// -- Cultural Family Selector --

interface CulturalFamilySelectorProps {
  selectedFamily: CulturalFamily;
  onSelectFamily: (family: CulturalFamily) => void;
  theme: CulturalProfileEditorTheme;
}

const CulturalFamilySelector: React.FC<CulturalFamilySelectorProps> = ({
  selectedFamily,
  onSelectFamily,
  theme,
}) => {
  return (
    <div style={panelStyle(theme)}>
      <h3
        style={{
          margin: '0 0 0.5rem',
          fontSize: `calc(0.75rem * ${theme.fontScale})`,
          fontWeight: 600,
          color: theme.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Cultural Family
      </h3>
      <div
        role="radiogroup"
        aria-label="Select cultural family archetype"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '0.4rem',
        }}
      >
        {ALL_CULTURAL_FAMILIES.map((family) => {
          const meta = CULTURAL_FAMILY_PRESETS[family];
          const isSelected = family === selectedFamily;

          return (
            <button
              key={family}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${meta.label}: ${meta.description}`}
              onClick={() => onSelectFamily(family)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectFamily(family);
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '0.5rem',
                borderRadius: '6px',
                border: `1.5px solid ${isSelected ? theme.accentColor : theme.borderColor}`,
                backgroundColor: isSelected
                  ? `${theme.accentColor}18`
                  : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: theme.fontFamily,
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = `2px solid ${theme.focusOutlineColor}`;
                e.currentTarget.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
            >
              <span
                style={{
                  fontSize: `calc(0.7rem * ${theme.fontScale})`,
                  fontWeight: 600,
                  color: isSelected ? theme.accentColor : theme.textPrimary,
                  marginBottom: '0.15rem',
                }}
              >
                {meta.label}
              </span>
              <span
                style={{
                  fontSize: `calc(0.55rem * ${theme.fontScale})`,
                  color: theme.textMuted,
                  lineHeight: 1.3,
                }}
              >
                {meta.origin}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// -- Schwartz Value Panel --

interface SchwartzValuePanelProps {
  values: Record<SchwartzValue, number>;
  onValueChange: (value: SchwartzValue, score: number) => void;
  showRadar: boolean;
  theme: CulturalProfileEditorTheme;
}

const SchwartzValuePanel: React.FC<SchwartzValuePanelProps> = ({
  values,
  onValueChange,
  showRadar,
  theme,
}) => {
  // Group values by category for display
  const categories: SchwartzCategory[] = [
    'openness-to-change',
    'self-enhancement',
    'conservation',
    'self-transcendence',
  ];

  return (
    <div style={panelStyle(theme)}>
      <h3
        style={{
          margin: '0 0 0.5rem',
          fontSize: `calc(0.75rem * ${theme.fontScale})`,
          fontWeight: 600,
          color: theme.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Value Dimensions
      </h3>

      {/* Radar chart */}
      {showRadar && <SchwartzRadar values={values} theme={theme} />}

      {/* Value sliders grouped by category */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginTop: showRadar ? '0.75rem' : 0,
        }}
      >
        {categories.map((cat) => {
          const catMeta = SCHWARTZ_CATEGORY_CONFIG[cat];
          return (
            <div
              key={cat}
              role="group"
              aria-label={`${catMeta.label} values`}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginBottom: '0.35rem',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    backgroundColor: catMeta.color,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <span
                  style={{
                    fontSize: `calc(0.65rem * ${theme.fontScale})`,
                    fontWeight: 600,
                    color: catMeta.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {catMeta.label}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {catMeta.values.map((val) => (
                  <ValueSlider
                    key={val}
                    schwartzValue={val}
                    score={values[val] ?? 0.5}
                    onChange={(score) => onValueChange(val, score)}
                    theme={theme}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// -- Individual Value Slider --

interface ValueSliderProps {
  schwartzValue: SchwartzValue;
  score: number;
  onChange: (score: number) => void;
  theme: CulturalProfileEditorTheme;
}

const ValueSlider: React.FC<ValueSliderProps> = ({
  schwartzValue,
  score,
  onChange,
  theme,
}) => {
  const meta = SCHWARTZ_VALUE_CONFIG[schwartzValue];
  const percentValue = Math.round(score * 100);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      {/* Label */}
      <span
        style={{
          fontSize: `calc(0.7rem * ${theme.fontScale})`,
          color: theme.textSecondary,
          width: '95px',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={meta.description}
        id={`label-${schwartzValue}`}
      >
        {meta.label}
      </span>

      {/* Slider track container for visual track */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Visual track background */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '6px',
            borderRadius: '3px',
            backgroundColor: theme.sliderTrackColor,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
        {/* Visual track fill */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: `${percentValue}%`,
            height: '6px',
            borderRadius: '3px',
            backgroundColor: meta.color,
            opacity: 0.7,
            pointerEvents: 'none',
            transition: 'width 0.1s ease',
          }}
          aria-hidden="true"
        />
        {/* Native range input (accessible, on top) */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={percentValue}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          aria-label={`${meta.label}: ${meta.description}`}
          aria-labelledby={`label-${schwartzValue}`}
          aria-valuenow={percentValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${percentValue}%`}
          style={{
            width: '100%',
            height: '20px',
            margin: 0,
            padding: 0,
            position: 'relative',
            zIndex: 1,
            cursor: 'pointer',
            opacity: 0,
            // Opacity 0 hides the native slider visually but keeps it
            // accessible. The custom visual track is rendered behind it.
            // We use a transparent native slider so it's tabbable and
            // screen-reader accessible.
          }}
          onFocus={(e) => {
            // Show focus ring on parent container
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.style.outline = `2px solid ${theme.focusOutlineColor}`;
              parent.style.outlineOffset = '2px';
              parent.style.borderRadius = '4px';
            }
          }}
          onBlur={(e) => {
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.style.outline = 'none';
            }
          }}
        />
      </div>

      {/* Value display */}
      <span
        style={{
          fontSize: `calc(0.7rem * ${theme.fontScale})`,
          fontWeight: 600,
          color: meta.color,
          width: '36px',
          textAlign: 'right',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {percentValue}%
      </span>
    </div>
  );
};

// -- Schwartz Radar Chart --

interface SchwartzRadarProps {
  values: Record<SchwartzValue, number>;
  theme: CulturalProfileEditorTheme;
}

const SchwartzRadar: React.FC<SchwartzRadarProps> = ({ values, theme }) => {
  const size = 220;
  const center = size / 2;
  const radius = (size - 50) / 2;
  const numAxes = ALL_SCHWARTZ_VALUES.length;

  const getPoint = (index: number, value: number): { x: number; y: number } => {
    const angle = (2 * Math.PI * index) / numAxes - Math.PI / 2;
    return {
      x: center + radius * value * Math.cos(angle),
      y: center + radius * value * Math.sin(angle),
    };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  // Score polygon
  const scorePoints = ALL_SCHWARTZ_VALUES.map((val, i) => {
    const score = values[val] ?? 0.5;
    return getPoint(i, score);
  });
  const scorePathData = scorePoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ') + ' Z';

  // Accessible description
  const radarDescription = ALL_SCHWARTZ_VALUES
    .map((val) => {
      const meta = SCHWARTZ_VALUE_CONFIG[val];
      const score = values[val] ?? 0.5;
      return `${meta.label}: ${Math.round(score * 100)}%`;
    })
    .join(', ');

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg
        width="100%"
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block', maxWidth: `${size}px` }}
        role="img"
        aria-label={`Schwartz value radar chart. ${radarDescription}`}
      >
        {/* Grid polygons */}
        {gridLevels.map((level) => {
          const gridPoints = ALL_SCHWARTZ_VALUES.map((_, i) => getPoint(i, level));
          const gridPath = gridPoints
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
            .join(' ') + ' Z';
          return (
            <path
              key={level}
              d={gridPath}
              fill="none"
              stroke="rgba(120, 128, 168, 0.25)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Axis lines */}
        {ALL_SCHWARTZ_VALUES.map((_, i) => {
          const end = getPoint(i, 1);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="rgba(120, 128, 168, 0.2)"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Score polygon with gradient fill */}
        <path
          d={scorePathData}
          fill="rgba(99, 102, 241, 0.2)"
          stroke={theme.accentColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Score dots */}
        {scorePoints.map((p, i) => {
          const val = ALL_SCHWARTZ_VALUES[i];
          const meta = SCHWARTZ_VALUE_CONFIG[val];
          return (
            <circle
              key={val}
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill={meta.color}
              stroke={theme.containerBackground}
              strokeWidth="1"
            />
          );
        })}

        {/* Axis labels */}
        {ALL_SCHWARTZ_VALUES.map((val, i) => {
          const labelPoint = getPoint(i, 1.22);
          const meta = SCHWARTZ_VALUE_CONFIG[val];
          // Abbreviate label to fit
          const shortLabel = meta.label.length > 8
            ? meta.label.substring(0, 7) + '.'
            : meta.label;
          return (
            <text
              key={`label-${val}`}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={meta.color}
              fontSize={`calc(0.5rem * ${theme.fontScale})`}
              fontFamily={theme.fontFamily}
              fontWeight="500"
            >
              {shortLabel}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

// -- Cooperation Index Panel --

interface CooperationIndexPanelProps {
  cooperationIndex: number;
  onCooperationChange: (index: number) => void;
  theme: CulturalProfileEditorTheme;
}

const CooperationIndexPanel: React.FC<CooperationIndexPanelProps> = ({
  cooperationIndex,
  onCooperationChange,
  theme,
}) => {
  const percentValue = Math.round(cooperationIndex * 100);

  // Contextual label based on cooperation level
  const cooperationLabel = useMemo(() => {
    if (cooperationIndex >= 0.8) return 'Highly Cooperative';
    if (cooperationIndex >= 0.6) return 'Cooperative';
    if (cooperationIndex >= 0.4) return 'Balanced';
    if (cooperationIndex >= 0.2) return 'Competitive';
    return 'Highly Competitive';
  }, [cooperationIndex]);

  const cooperationColor = useMemo(() => {
    if (cooperationIndex >= 0.7) return theme.highlyCompatibleColor;
    if (cooperationIndex >= 0.4) return theme.compatibleColor;
    return theme.tensionColor;
  }, [cooperationIndex, theme]);

  return (
    <div style={panelStyle(theme)}>
      <h3
        style={{
          margin: '0 0 0.5rem',
          fontSize: `calc(0.75rem * ${theme.fontScale})`,
          fontWeight: 600,
          color: theme.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Cooperation Index
      </h3>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        {/* Cooperation gauge (circular) */}
        <div style={{ flexShrink: 0 }}>
          <CooperationGauge
            value={cooperationIndex}
            color={cooperationColor}
            size={56}
            theme={theme}
          />
        </div>

        {/* Slider and labels */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '0.3rem',
            }}
          >
            <span
              style={{
                fontSize: `calc(0.7rem * ${theme.fontScale})`,
                color: cooperationColor,
                fontWeight: 600,
              }}
              role="status"
              aria-label={`Cooperation level: ${cooperationLabel}`}
            >
              {cooperationLabel}
            </span>
            <span
              style={{
                fontSize: `calc(0.7rem * ${theme.fontScale})`,
                fontWeight: 600,
                color: cooperationColor,
              }}
              aria-hidden="true"
            >
              {percentValue}%
            </span>
          </div>

          {/* Slider track container */}
          <div
            style={{
              position: 'relative',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '6px',
                borderRadius: '3px',
                backgroundColor: theme.sliderTrackColor,
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                width: `${percentValue}%`,
                height: '6px',
                borderRadius: '3px',
                backgroundColor: cooperationColor,
                opacity: 0.7,
                pointerEvents: 'none',
                transition: 'width 0.1s ease',
              }}
              aria-hidden="true"
            />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={percentValue}
              onChange={(e) => onCooperationChange(Number(e.target.value) / 100)}
              aria-label={`Cooperation index: willingness to cooperate with other agents. Currently ${percentValue}%`}
              aria-valuenow={percentValue}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${percentValue}%, ${cooperationLabel}`}
              style={{
                width: '100%',
                height: '20px',
                margin: 0,
                padding: 0,
                position: 'relative',
                zIndex: 1,
                cursor: 'pointer',
                opacity: 0,
              }}
              onFocus={(e) => {
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.style.outline = `2px solid ${theme.focusOutlineColor}`;
                  parent.style.outlineOffset = '2px';
                  parent.style.borderRadius = '4px';
                }
              }}
              onBlur={(e) => {
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.style.outline = 'none';
                }
              }}
            />
          </div>

          {/* Scale labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '0.15rem',
            }}
          >
            <span
              style={{
                fontSize: `calc(0.55rem * ${theme.fontScale})`,
                color: theme.textMuted,
              }}
            >
              Competitive
            </span>
            <span
              style={{
                fontSize: `calc(0.55rem * ${theme.fontScale})`,
                color: theme.textMuted,
              }}
            >
              Cooperative
            </span>
          </div>
        </div>
      </div>

      <p
        style={{
          margin: '0.4rem 0 0',
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
          color: theme.textMuted,
          lineHeight: 1.4,
        }}
      >
        Controls how readily this agent cooperates with others. Affects zone
        entry permissions, stigmergic trace reinforcement, and collaboration bonuses.
      </p>
    </div>
  );
};

// -- Cooperation Gauge --

interface CooperationGaugeProps {
  value: number;
  color: string;
  size: number;
  theme: CulturalProfileEditorTheme;
}

const CooperationGauge: React.FC<CooperationGaugeProps> = ({
  value,
  color,
  size,
  theme,
}) => {
  const strokeWidth = 5;
  const gaugeCenter = size / 2;
  const gaugeRadius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * gaugeRadius;
  const filled = circumference * Math.max(0, Math.min(1, value));
  const offset = circumference - filled;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="meter"
      aria-label="Cooperation index gauge"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <circle
        cx={gaugeCenter}
        cy={gaugeCenter}
        r={gaugeRadius}
        fill="none"
        stroke={theme.borderColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={gaugeCenter}
        cy={gaugeCenter}
        r={gaugeRadius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${gaugeCenter} ${gaugeCenter})`}
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
      <text
        x={gaugeCenter}
        y={gaugeCenter}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={`calc(0.75rem * ${theme.fontScale})`}
        fontWeight="700"
        fontFamily={theme.fontFamily}
      >
        {Math.round(value * 100)}
      </text>
    </svg>
  );
};

// -- Compatibility Preview Panel --

interface CompatibilityPreviewPanelProps {
  state: CulturalProfileEditorState;
  actions: CulturalProfileEditorActions;
  theme: CulturalProfileEditorTheme;
}

const CompatibilityPreviewPanel: React.FC<CompatibilityPreviewPanelProps> = ({
  state,
  actions,
  theme,
}) => {
  return (
    <div style={panelStyle(theme)}>
      <h3
        style={{
          margin: '0 0 0.5rem',
          fontSize: `calc(0.75rem * ${theme.fontScale})`,
          fontWeight: 600,
          color: theme.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Compatibility Preview
      </h3>

      {/* Comparison profile selector */}
      <div style={{ marginBottom: '0.5rem' }}>
        <label
          htmlFor="comparison-select"
          style={{
            display: 'block',
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            color: theme.textMuted,
            marginBottom: '0.25rem',
          }}
        >
          Compare with agent:
        </label>
        <select
          id="comparison-select"
          value={state.selectedComparisonId ?? ''}
          onChange={(e) => actions.selectComparison(e.target.value || null)}
          style={{
            width: '100%',
            padding: '0.35rem 0.5rem',
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            fontFamily: theme.fontFamily,
            color: theme.textPrimary,
            backgroundColor: theme.cardBackground,
            border: `1px solid ${theme.borderColor}`,
            borderRadius: '4px',
            outline: 'none',
            cursor: 'pointer',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = `2px solid ${theme.focusOutlineColor}`;
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-label="Select an agent profile to compare compatibility"
        >
          <option value="">-- Select agent --</option>
          {state.comparisonProfiles.map((p) => (
            <option key={p.agentId} value={p.agentId}>
              {p.agentName ?? p.agentId}
              {' '}({CULTURAL_FAMILY_PRESETS[p.culturalFamily].label})
            </option>
          ))}
        </select>
      </div>

      {/* Compatibility result */}
      {state.compatibility && (
        <CompatibilityResult
          result={state.compatibility}
          comparisonProfile={
            state.comparisonProfiles.find(
              (p) => p.agentId === state.selectedComparisonId,
            ) ?? null
          }
          theme={theme}
        />
      )}

      {!state.selectedComparisonId && (
        <p
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            color: theme.textMuted,
            margin: '0.5rem 0 0',
            textAlign: 'center',
          }}
        >
          Select an agent above to preview cultural compatibility.
        </p>
      )}
    </div>
  );
};

// -- Compatibility Result Display --

interface CompatibilityResultProps {
  result: CompatibilityResultData;
  comparisonProfile: CulturalProfile | null;
  theme: CulturalProfileEditorTheme;
}

const CompatibilityResultComponent: React.FC<CompatibilityResultProps> = ({
  result,
  comparisonProfile,
  theme,
}) => {
  const levelColor = getCompatibilityColor(result.level, theme);
  const levelLabel = getCompatibilityLabel(result.level);

  return (
    <div
      role="region"
      aria-label={`Compatibility result: ${levelLabel}, ${Math.round(result.overallScore * 100)}%`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      {/* Overall score header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem',
          borderRadius: '6px',
          backgroundColor: `${levelColor}12`,
          border: `1px solid ${levelColor}33`,
        }}
      >
        {/* Score gauge */}
        <CooperationGauge
          value={result.overallScore}
          color={levelColor}
          size={48}
          theme={theme}
        />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
            <span
              style={{
                fontSize: `calc(1rem * ${theme.fontScale})`,
                fontWeight: 700,
                color: levelColor,
              }}
            >
              {formatPercent(result.overallScore)}
            </span>
            <span
              style={{
                fontSize: `calc(0.7rem * ${theme.fontScale})`,
                fontWeight: 600,
                color: levelColor,
              }}
            >
              {levelLabel}
            </span>
          </div>
          {comparisonProfile && (
            <span
              style={{
                fontSize: `calc(0.6rem * ${theme.fontScale})`,
                color: theme.textMuted,
              }}
            >
              vs. {comparisonProfile.agentName ?? comparisonProfile.agentId}
            </span>
          )}
        </div>
      </div>

      {/* Cooperation compatibility */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: `calc(0.65rem * ${theme.fontScale})`,
        }}
      >
        <span style={{ color: theme.textMuted, width: '120px', flexShrink: 0 }}>
          Cooperation Match:
        </span>
        <div
          role="meter"
          aria-label="Cooperation compatibility"
          aria-valuenow={Math.round(result.cooperationCompatibility * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            flex: 1,
            height: '5px',
            borderRadius: '2.5px',
            backgroundColor: theme.sliderTrackColor,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${result.cooperationCompatibility * 100}%`,
              borderRadius: '2.5px',
              backgroundColor: levelColor,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span
          style={{
            color: levelColor,
            fontWeight: 600,
            width: '36px',
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          {formatPercent(result.cooperationCompatibility)}
        </span>
      </div>

      {/* Category breakdown */}
      <div
        role="list"
        aria-label="Compatibility by value category"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        {(Object.entries(result.categoryScores) as [SchwartzCategory, number][]).map(
          ([cat, score]) => {
            const catMeta = SCHWARTZ_CATEGORY_CONFIG[cat];
            return (
              <div
                key={cat}
                role="listitem"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: `calc(0.65rem * ${theme.fontScale})`,
                }}
              >
                <span
                  style={{
                    color: theme.textMuted,
                    width: '120px',
                    flexShrink: 0,
                  }}
                >
                  {catMeta.label}:
                </span>
                <div
                  role="meter"
                  aria-label={`${catMeta.label} compatibility`}
                  aria-valuenow={Math.round(score * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  style={{
                    flex: 1,
                    height: '5px',
                    borderRadius: '2.5px',
                    backgroundColor: theme.sliderTrackColor,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${score * 100}%`,
                      borderRadius: '2.5px',
                      backgroundColor: catMeta.color,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    color: catMeta.color,
                    fontWeight: 600,
                    width: '36px',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {formatPercent(score)}
                </span>
              </div>
            );
          },
        )}
      </div>

      {/* Shared strengths */}
      {result.sharedStrengths.length > 0 && (
        <div>
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              color: theme.highlyCompatibleColor,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Shared Strengths:
          </span>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.25rem',
              marginTop: '0.2rem',
            }}
            role="list"
            aria-label="Shared value strengths"
          >
            {result.sharedStrengths.map((val) => {
              const meta = SCHWARTZ_VALUE_CONFIG[val];
              return (
                <span
                  key={val}
                  role="listitem"
                  style={{
                    fontSize: `calc(0.6rem * ${theme.fontScale})`,
                    color: meta.color,
                    border: `1px solid ${meta.color}`,
                    borderRadius: '3px',
                    padding: '0.1rem 0.3rem',
                    fontWeight: 500,
                  }}
                >
                  {meta.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Tensions */}
      {result.tensions.length > 0 && (
        <div>
          <span
            style={{
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              color: theme.tensionColor,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Potential Tensions:
          </span>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.25rem',
              marginTop: '0.2rem',
            }}
            role="list"
            aria-label="Potential value tensions"
          >
            {result.tensions.map((val) => {
              const meta = SCHWARTZ_VALUE_CONFIG[val];
              const delta = result.dimensionDeltas[val];
              const sign = delta >= 0 ? '+' : '';
              return (
                <span
                  key={val}
                  role="listitem"
                  style={{
                    fontSize: `calc(0.6rem * ${theme.fontScale})`,
                    color: theme.tensionColor,
                    border: `1px solid ${theme.tensionColor}`,
                    borderRadius: '3px',
                    padding: '0.1rem 0.3rem',
                    fontWeight: 500,
                  }}
                  title={`${meta.label}: ${sign}${Math.round(delta * 100)}% difference`}
                >
                  {meta.label} ({sign}{Math.round(delta * 100)}%)
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Dimension-level detail bars */}
      <details
        style={{
          marginTop: '0.25rem',
        }}
      >
        <summary
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            color: theme.textMuted,
            cursor: 'pointer',
            padding: '0.2rem 0',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = `2px solid ${theme.focusOutlineColor}`;
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          Show all dimension differences
        </summary>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
            marginTop: '0.3rem',
          }}
          role="list"
          aria-label="Per-dimension compatibility differences"
        >
          {ALL_SCHWARTZ_VALUES.map((val) => {
            const meta = SCHWARTZ_VALUE_CONFIG[val];
            const delta = result.dimensionDeltas[val];
            const absDelta = Math.abs(delta);
            const barColor = absDelta > 0.3
              ? theme.tensionColor
              : absDelta > 0.15
                ? theme.neutralColor
                : theme.highlyCompatibleColor;

            return (
              <div
                key={val}
                role="listitem"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: `calc(0.6rem * ${theme.fontScale})`,
                }}
              >
                <span
                  style={{
                    color: meta.color,
                    width: '85px',
                    flexShrink: 0,
                  }}
                >
                  {meta.label}
                </span>
                {/* Bidirectional delta bar centered at 50% */}
                <div
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    backgroundColor: theme.sliderTrackColor,
                    position: 'relative',
                    overflow: 'visible',
                  }}
                  aria-hidden="true"
                >
                  {/* Center line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '-1px',
                      width: '1px',
                      height: '6px',
                      backgroundColor: theme.textMuted,
                    }}
                  />
                  {/* Delta bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      height: '100%',
                      borderRadius: '2px',
                      backgroundColor: barColor,
                      transition: 'all 0.2s ease',
                      ...(delta >= 0
                        ? {
                            left: '50%',
                            width: `${Math.min(absDelta * 100, 50)}%`,
                          }
                        : {
                            right: '50%',
                            width: `${Math.min(absDelta * 100, 50)}%`,
                          }),
                    }}
                  />
                </div>
                <span
                  style={{
                    color: barColor,
                    fontWeight: 500,
                    width: '40px',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {delta >= 0 ? '+' : ''}{Math.round(delta * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
};

// Rename to avoid conflict with the type
const CompatibilityResult = CompatibilityResultComponent;

// =============================================================================
// SHARED UTILITIES
// =============================================================================

function panelStyle(theme: CulturalProfileEditorTheme): React.CSSProperties {
  return {
    padding: '0.75rem 1rem',
    borderBottom: `1px solid ${theme.borderColor}`,
  };
}

function buttonStyle(theme: CulturalProfileEditorTheme): React.CSSProperties {
  return {
    fontFamily: theme.fontFamily,
    fontWeight: 500,
    color: theme.textSecondary,
    backgroundColor: theme.buttonBackground,
    border: `1px solid ${theme.borderColor}`,
    borderRadius: '4px',
    padding: '0.2rem 0.5rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    outline: 'none',
  };
}

export default CulturalProfileEditor;
