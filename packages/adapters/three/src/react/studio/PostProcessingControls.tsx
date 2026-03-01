/**
 * PostProcessingControls Component
 *
 * A floating Studio IDE panel that provides real-time sliders for:
 *   - Bloom (intensity, threshold, smoothing, radius)
 *   - Depth of Field (focus distance, focal length, aperture, bokeh blades)
 *   - Motion Blur (intensity, samples)
 *   - Color Grading (exposure, contrast, saturation, temperature, tint, vignette, lift/gamma/gain)
 *
 * Each effect section has a collapsible header with enable/disable toggle.
 * Includes preset selector dropdown and "Export to HoloScript" button.
 *
 * Visual style matches the existing RendererStatsOverlay for cohesive IDE appearance.
 *
 * @module studio/PostProcessingControls
 */

import React, { useMemo, useCallback, type CSSProperties } from 'react';
import {
  usePostProcessing,
  type UsePostProcessingOptions,
  type UsePostProcessingReturn,
} from './usePostProcessing';
import {
  SLIDER_RANGES,
  type SliderRange,
  type PostProcessingSettings,
  type PostProcessingPreset,
} from './PostProcessingTypes';

// =============================================================================
// TYPES
// =============================================================================

export interface PostProcessingControlsProps {
  /** Position of the panel on screen (default: 'bottom-right') */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Whether the entire panel starts collapsed (default: false) */
  defaultCollapsed?: boolean;
  /** Panel opacity (0-1, default: 0.92) */
  opacity?: number;
  /** Additional CSS class */
  className?: string;
  /** Override root styles */
  style?: CSSProperties;
  /** Hook options forwarded to usePostProcessing */
  hookOptions?: UsePostProcessingOptions;
  /** External hook return to use instead of internal hook (for shared state) */
  controller?: UsePostProcessingReturn;
  /** Called when user clicks Export to HoloScript */
  onExport?: (source: string) => void;
}

// =============================================================================
// STYLE FACTORY
// =============================================================================

const POSITIONS: Record<string, CSSProperties> = {
  'top-left': { top: 12, left: 12 },
  'top-right': { top: 12, right: 12 },
  'bottom-left': { bottom: 12, left: 12 },
  'bottom-right': { bottom: 12, right: 12 },
};

function createStyles(
  position: string,
  opacity: number,
  collapsed: boolean,
): Record<string, CSSProperties> {
  return {
    root: {
      position: 'fixed',
      zIndex: 9999,
      ...(POSITIONS[position] || POSITIONS['bottom-right']),
      width: collapsed ? 48 : 280,
      maxHeight: collapsed ? 40 : '80vh',
      fontFamily:
        '"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", monospace',
      fontSize: 11,
      lineHeight: 1.5,
      color: '#d4d4d8',
      backgroundColor: `rgba(15, 15, 25, ${opacity})`,
      backdropFilter: 'blur(12px)',
      borderRadius: 10,
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      overflow: 'hidden',
      userSelect: 'none',
      transition: 'width 0.2s ease, max-height 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      borderBottom: collapsed
        ? 'none'
        : '1px solid rgba(255, 255, 255, 0.06)',
      cursor: 'pointer',
      flexShrink: 0,
    },
    headerTitle: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      color: '#a1a1aa',
    },
    headerBadge: {
      fontSize: 9,
      fontWeight: 700,
      padding: '1px 6px',
      borderRadius: 8,
      backgroundColor: 'rgba(99, 102, 241, 0.3)',
      color: '#818cf8',
      marginLeft: 6,
    },
    collapseIcon: {
      width: 14,
      height: 14,
      color: '#71717a',
      transition: 'transform 0.2s ease',
      transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
      flexShrink: 0,
    },
    body: {
      overflowY: 'auto' as const,
      overflowX: 'hidden' as const,
      padding: collapsed ? 0 : '4px 0',
      maxHeight: collapsed ? 0 : 'calc(80vh - 40px)',
      transition: 'max-height 0.25s ease, padding 0.25s ease',
    },
    // Section (per-effect group)
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 12px',
      cursor: 'pointer',
      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: 600,
      color: '#a1a1aa',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
    sectionChevron: {
      width: 10,
      height: 10,
      color: '#52525b',
      transition: 'transform 0.15s ease',
    },
    sectionBody: {
      padding: '4px 12px 8px',
      overflow: 'hidden',
      transition: 'max-height 0.2s ease, opacity 0.2s ease',
    },
    // Toggle switch (small, for section enable/disable)
    toggleTrack: {
      position: 'relative' as const,
      width: 28,
      height: 14,
      borderRadius: 7,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      cursor: 'pointer',
      flexShrink: 0,
    },
    toggleThumb: {
      position: 'absolute' as const,
      top: 1,
      width: 10,
      height: 10,
      borderRadius: 5,
      transition: 'left 0.15s ease, background-color 0.15s ease',
    },
    // Slider row
    sliderRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '3px 0',
      gap: 8,
    },
    sliderLabel: {
      fontSize: 9,
      color: '#71717a',
      minWidth: 54,
      flexShrink: 0,
    },
    sliderInput: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      appearance: 'none' as const,
      WebkitAppearance: 'none' as const,
      background: 'rgba(255, 255, 255, 0.08)',
      outline: 'none',
      cursor: 'pointer',
    },
    sliderValue: {
      fontSize: 9,
      fontWeight: 600,
      color: '#a1a1aa',
      minWidth: 36,
      textAlign: 'right' as const,
      fontVariantNumeric: 'tabular-nums',
    },
    // Toolbar (presets, export, reset)
    toolbar: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '6px 12px',
      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      flexShrink: 0,
    },
    toolbarButton: {
      fontSize: 9,
      fontWeight: 600,
      padding: '3px 8px',
      borderRadius: 4,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      color: '#a1a1aa',
      cursor: 'pointer',
      transition: 'background-color 0.15s ease, color 0.15s ease',
    },
    toolbarButtonActive: {
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      color: '#818cf8',
      borderColor: 'rgba(99, 102, 241, 0.3)',
    },
    presetSelect: {
      fontSize: 9,
      fontWeight: 600,
      padding: '3px 6px',
      borderRadius: 4,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      color: '#a1a1aa',
      cursor: 'pointer',
      outline: 'none',
      flex: 1,
    },
    divider: {
      height: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      margin: '2px 12px',
    },
  };
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Small on/off toggle switch */
const EffectToggle: React.FC<{
  enabled: boolean;
  onToggle: () => void;
  ariaLabel: string;
}> = ({ enabled, onToggle, ariaLabel }) => {
  const trackStyle: CSSProperties = {
    position: 'relative',
    width: 28,
    height: 14,
    borderRadius: 7,
    backgroundColor: enabled ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)',
    border: `1px solid ${enabled ? 'rgba(99, 102, 241, 0.6)' : 'rgba(255, 255, 255, 0.1)'}`,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
  };

  const thumbStyle: CSSProperties = {
    position: 'absolute',
    top: 1,
    left: enabled ? 14 : 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: enabled ? '#818cf8' : '#52525b',
    transition: 'left 0.15s ease, background-color 0.15s ease',
  };

  return (
    <div
      style={trackStyle}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }
      }}
    >
      <div style={thumbStyle} />
    </div>
  );
};

/** Single slider row: label | range input | value display */
const SliderRow: React.FC<{
  range: SliderRange;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}> = ({ range, value, onChange, disabled }) => {
  const styles = createStyles('bottom-right', 1, false);

  const displayValue = range.unit
    ? `${range.unit === 'f/' ? 'f/' : ''}${value.toFixed(range.step >= 1 ? 0 : range.step >= 0.1 ? 1 : 2)}${range.unit && range.unit !== 'f/' ? ` ${range.unit}` : ''}`
    : value.toFixed(range.step >= 1 ? 0 : range.step >= 0.1 ? 1 : 2);

  return (
    <div style={styles.sliderRow}>
      <span style={{ ...styles.sliderLabel, opacity: disabled ? 0.4 : 1 }}>
        {range.label}
      </span>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        style={{ ...styles.sliderInput, opacity: disabled ? 0.3 : 1 }}
        aria-label={range.label}
        aria-valuemin={range.min}
        aria-valuemax={range.max}
        aria-valuenow={value}
      />
      <span style={{ ...styles.sliderValue, opacity: disabled ? 0.4 : 1 }}>
        {displayValue}
      </span>
    </div>
  );
};

/** Collapsible section for a single effect group */
const EffectSection: React.FC<{
  title: string;
  icon: string;
  enabled: boolean;
  onToggle: () => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, enabled, onToggle, defaultOpen = false, children }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  const styles = createStyles('bottom-right', 1, false);

  return (
    <div>
      <div
        style={styles.sectionHeader}
        onClick={() => setOpen((o) => !o)}
        role="button"
        aria-expanded={open}
        aria-label={`${title} section`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
      >
        <span style={styles.sectionLabel}>
          <svg
            style={{
              ...styles.sectionChevron,
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <polyline points="3 2 7 5 3 8" />
          </svg>
          <span>{icon}</span>
          <span>{title}</span>
        </span>
        <EffectToggle
          enabled={enabled}
          onToggle={onToggle}
          ariaLabel={`Toggle ${title}`}
        />
      </div>
      {open && (
        <div
          style={{
            ...styles.sectionBody,
            maxHeight: open ? 400 : 0,
            opacity: open ? 1 : 0,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PostProcessingControls = React.memo<PostProcessingControlsProps>(
  function PostProcessingControls({
    position = 'bottom-right',
    defaultCollapsed = false,
    opacity = 0.92,
    className,
    style,
    hookOptions,
    controller: externalController,
    onExport: onExportProp,
  }) {
    // -----------------------------------------------------------------------
    // Use external controller or create internal hook
    // -----------------------------------------------------------------------
    const internalController = usePostProcessing(hookOptions);
    const ctrl = externalController || internalController;

    const {
      settings,
      updateBloom,
      updateDepthOfField,
      updateMotionBlur,
      updateColorGrading,
      toggleBloom,
      toggleDepthOfField,
      toggleMotionBlur,
      toggleColorGrading,
      presets,
      activePreset,
      applyPreset,
      resetAll,
      exportToHoloScript,
      hasActiveEffects,
      activeEffectCount,
    } = ctrl;

    // -----------------------------------------------------------------------
    // Collapse state
    // -----------------------------------------------------------------------
    const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
    const [exportedSource, setExportedSource] = React.useState<string | null>(null);

    // -----------------------------------------------------------------------
    // Styles
    // -----------------------------------------------------------------------
    const styles = useMemo(
      () => createStyles(position, opacity, collapsed),
      [position, opacity, collapsed],
    );

    // -----------------------------------------------------------------------
    // Export handler
    // -----------------------------------------------------------------------
    const handleExport = useCallback(() => {
      const source = exportToHoloScript();
      setExportedSource(source);
      onExportProp?.(source);
      // Auto-clear the exported source indicator after 3 seconds
      setTimeout(() => setExportedSource(null), 3000);
    }, [exportToHoloScript, onExportProp]);

    // -----------------------------------------------------------------------
    // Copy to clipboard
    // -----------------------------------------------------------------------
    const handleCopy = useCallback(() => {
      if (exportedSource) {
        navigator.clipboard?.writeText(exportedSource).catch(() => {
          // Clipboard API not available -- silently ignore
        });
      }
    }, [exportedSource]);

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
      <div
        style={{ ...styles.root, ...style }}
        className={className}
        role="region"
        aria-label="Post-processing controls"
      >
        {/* Header */}
        <div
          style={styles.header}
          onClick={() => setCollapsed((c) => !c)}
          role="button"
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? 'Expand post-processing controls' : 'Collapse post-processing controls'
          }
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setCollapsed((c) => !c);
            }
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={styles.headerTitle}>Post Processing</span>
            {hasActiveEffects && (
              <span style={styles.headerBadge}>{activeEffectCount}</span>
            )}
          </span>
          <svg
            style={styles.collapseIcon}
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <polyline points="4 5 7 8 10 5" />
          </svg>
        </div>

        {/* Body */}
        <div style={styles.body} aria-hidden={collapsed}>
          {/* ============================================================= */}
          {/* BLOOM SECTION                                                  */}
          {/* ============================================================= */}
          <EffectSection
            title="Bloom"
            icon="*"
            enabled={settings.bloom.enabled}
            onToggle={toggleBloom}
            defaultOpen
          >
            <SliderRow
              range={SLIDER_RANGES.bloom.intensity}
              value={settings.bloom.intensity}
              onChange={(v) => updateBloom({ intensity: v })}
              disabled={!settings.bloom.enabled}
            />
            <SliderRow
              range={SLIDER_RANGES.bloom.threshold}
              value={settings.bloom.threshold}
              onChange={(v) => updateBloom({ threshold: v })}
              disabled={!settings.bloom.enabled}
            />
            <SliderRow
              range={SLIDER_RANGES.bloom.smoothing}
              value={settings.bloom.smoothing}
              onChange={(v) => updateBloom({ smoothing: v })}
              disabled={!settings.bloom.enabled}
            />
            <SliderRow
              range={SLIDER_RANGES.bloom.radius}
              value={settings.bloom.radius}
              onChange={(v) => updateBloom({ radius: v })}
              disabled={!settings.bloom.enabled}
            />
          </EffectSection>

          {/* ============================================================= */}
          {/* DEPTH OF FIELD SECTION                                         */}
          {/* ============================================================= */}
          <EffectSection
            title="Depth of Field"
            icon="(o)"
            enabled={settings.depthOfField.enabled}
            onToggle={toggleDepthOfField}
          >
            <SliderRow
              range={SLIDER_RANGES.depthOfField.focusDistance}
              value={settings.depthOfField.focusDistance}
              onChange={(v) => updateDepthOfField({ focusDistance: v })}
              disabled={!settings.depthOfField.enabled}
            />
            <SliderRow
              range={SLIDER_RANGES.depthOfField.focalLength}
              value={settings.depthOfField.focalLength}
              onChange={(v) => updateDepthOfField({ focalLength: v })}
              disabled={!settings.depthOfField.enabled}
            />
            <SliderRow
              range={SLIDER_RANGES.depthOfField.aperture}
              value={settings.depthOfField.aperture}
              onChange={(v) => updateDepthOfField({ aperture: v })}
              disabled={!settings.depthOfField.enabled}
            />
            <SliderRow
              range={SLIDER_RANGES.depthOfField.bokehBlades}
              value={settings.depthOfField.bokehBlades}
              onChange={(v) => updateDepthOfField({ bokehBlades: v })}
              disabled={!settings.depthOfField.enabled}
            />
          </EffectSection>

          {/* ============================================================= */}
          {/* MOTION BLUR SECTION                                           */}
          {/* ============================================================= */}
          <EffectSection
            title="Motion Blur"
            icon="~"
            enabled={settings.motionBlur.enabled}
            onToggle={toggleMotionBlur}
          >
            <SliderRow
              range={SLIDER_RANGES.motionBlur.intensity}
              value={settings.motionBlur.intensity}
              onChange={(v) => updateMotionBlur({ intensity: v })}
              disabled={!settings.motionBlur.enabled}
            />
            <SliderRow
              range={SLIDER_RANGES.motionBlur.samples}
              value={settings.motionBlur.samples}
              onChange={(v) => updateMotionBlur({ samples: v })}
              disabled={!settings.motionBlur.enabled}
            />
          </EffectSection>

          {/* ============================================================= */}
          {/* COLOR GRADING SECTION                                         */}
          {/* ============================================================= */}
          <EffectSection
            title="Color Grading"
            icon="#"
            enabled={settings.colorGrading.enabled}
            onToggle={toggleColorGrading}
          >
            <SliderRow
              range={SLIDER_RANGES.colorGrading.exposure}
              value={settings.colorGrading.exposure}
              onChange={(v) => updateColorGrading({ exposure: v })}
              disabled={!settings.colorGrading.enabled}
            />
            <SliderRow
              range={SLIDER_RANGES.colorGrading.contrast}
              value={settings.colorGrading.contrast}
              onChange={(v) => updateColorGrading({ contrast: v })}
              disabled={!settings.colorGrading.enabled}
            />
            <SliderRow
              range={SLIDER_RANGES.colorGrading.saturation}
              value={settings.colorGrading.saturation}
              onChange={(v) => updateColorGrading({ saturation: v })}
              disabled={!settings.colorGrading.enabled}
            />
            <SliderRow
              range={SLIDER_RANGES.colorGrading.temperature}
              value={settings.colorGrading.temperature}
              onChange={(v) => updateColorGrading({ temperature: v })}
              disabled={!settings.colorGrading.enabled}
            />
            <SliderRow
              range={SLIDER_RANGES.colorGrading.tint}
              value={settings.colorGrading.tint}
              onChange={(v) => updateColorGrading({ tint: v })}
              disabled={!settings.colorGrading.enabled}
            />
            <div style={styles.divider} />
            <SliderRow
              range={SLIDER_RANGES.colorGrading.vignetteIntensity}
              value={settings.colorGrading.vignetteIntensity}
              onChange={(v) => updateColorGrading({ vignetteIntensity: v })}
              disabled={!settings.colorGrading.enabled}
            />
            <SliderRow
              range={SLIDER_RANGES.colorGrading.vignetteSmoothness}
              value={settings.colorGrading.vignetteSmoothness}
              onChange={(v) => updateColorGrading({ vignetteSmoothness: v })}
              disabled={!settings.colorGrading.enabled}
            />
          </EffectSection>

          {/* ============================================================= */}
          {/* TOOLBAR: Presets, Export, Reset                                */}
          {/* ============================================================= */}
          <div style={styles.toolbar}>
            <select
              style={styles.presetSelect}
              value={activePreset || ''}
              onChange={(e) => applyPreset(e.target.value)}
              aria-label="Post-processing preset"
            >
              <option value="" disabled>
                Presets
              </option>
              {presets.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              style={styles.toolbarButton}
              onClick={handleExport}
              title="Export settings as HoloScript trait"
              aria-label="Export to HoloScript"
            >
              Export
            </button>

            {exportedSource && (
              <button
                style={{ ...styles.toolbarButton, ...styles.toolbarButtonActive }}
                onClick={handleCopy}
                title="Copy HoloScript to clipboard"
                aria-label="Copy HoloScript to clipboard"
              >
                Copy
              </button>
            )}

            <button
              style={styles.toolbarButton}
              onClick={resetAll}
              title="Reset all post-processing to defaults"
              aria-label="Reset all"
            >
              Reset
            </button>
          </div>

          {/* Exported source preview */}
          {exportedSource && (
            <div
              style={{
                padding: '6px 12px 8px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <pre
                style={{
                  fontSize: 8,
                  color: '#52525b',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  maxHeight: 120,
                  overflowY: 'auto',
                  margin: 0,
                  padding: 4,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: 4,
                }}
                aria-label="Exported HoloScript source"
              >
                {exportedSource}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default PostProcessingControls;
