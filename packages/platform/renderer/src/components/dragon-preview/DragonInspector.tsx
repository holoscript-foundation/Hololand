/**
 * DragonInspector
 *
 * Studio inspector panel for the dragon preview component.
 * Provides interactive controls for:
 *   - LOD level selection (0-3) with quality slider
 *   - Fire effect controls (on/off, quality, wind, turbulence)
 *   - Triangle count and draw call counters
 *   - Performance health indicator (healthy/warning/critical)
 *
 * Dark theme consistent with VR studio aesthetic, matching
 * the SceneProfilerDashboard visual language.
 *
 * @module dragon-preview/DragonInspector
 */

import React, { useMemo } from 'react';
import type {
  DragonInspectorProps,
  DragonLODLevel,
  FireQualityLevel,
  WindDirectionPreset,
  DragonPreviewTheme,
  DragonPerformanceMetrics,
} from './types';
import {
  DEFAULT_DRAGON_PREVIEW_THEME,
  LOD_LEVEL_INFO,
  FIRE_QUALITY_LABELS,
  DRAGON_PERF_THRESHOLDS,
} from './types';
import type { BudgetHealthStatus } from '../scene-profiler/types';

// =============================================================================
// HELPERS
// =============================================================================

/** Format large numbers with K/M suffixes */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

/** Get color for health status */
function healthColor(health: BudgetHealthStatus, theme: DragonPreviewTheme): string {
  return {
    healthy: theme.healthy,
    warning: theme.warning,
    critical: theme.critical,
    exceeded: theme.exceeded,
  }[health];
}

/** Get label for health status */
function healthLabel(health: BudgetHealthStatus): string {
  return {
    healthy: 'HEALTHY',
    warning: 'WARNING',
    critical: 'CRITICAL',
    exceeded: 'EXCEEDED',
  }[health];
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// --- Section Header ---

interface SectionHeaderProps {
  title: string;
  theme: DragonPreviewTheme;
  rightContent?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, theme, rightContent }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: `1px solid ${theme.border}`,
      marginBottom: 8,
    }}
  >
    <span
      style={{
        fontSize: theme.fontSize + 1,
        fontWeight: 'bold',
        color: theme.accent,
        fontFamily: theme.fontFamily,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {title}
    </span>
    {rightContent}
  </div>
);

// --- Stat Row ---

interface StatRowProps {
  label: string;
  value: string;
  color?: string;
  theme: DragonPreviewTheme;
}

const StatRow: React.FC<StatRowProps> = ({ label, value, color, theme }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '3px 0',
    }}
  >
    <span style={{ color: theme.text, fontSize: theme.fontSize, fontFamily: theme.fontFamily }}>
      {label}
    </span>
    <span
      style={{
        color: color || theme.text,
        fontSize: theme.fontSize,
        fontWeight: 'bold',
        fontFamily: theme.fontFamily,
      }}
    >
      {value}
    </span>
  </div>
);

// --- Slider Control ---

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  displayValue?: string;
  theme: DragonPreviewTheme;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  displayValue,
  theme,
}) => (
  <div style={{ padding: '4px 0' }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 4,
        fontSize: theme.fontSize,
        fontFamily: theme.fontFamily,
      }}
    >
      <span style={{ color: theme.text }}>{label}</span>
      <span style={{ color: theme.accent, fontWeight: 'bold' }}>
        {displayValue ?? value.toFixed(2)}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{
        width: '100%',
        height: 4,
        appearance: 'none',
        WebkitAppearance: 'none',
        background: `linear-gradient(to right, ${theme.accent} ${((value - min) / (max - min)) * 100}%, ${theme.grid} ${((value - min) / (max - min)) * 100}%)`,
        borderRadius: 2,
        outline: 'none',
        cursor: 'pointer',
      }}
    />
  </div>
);

// --- Toggle Button ---

interface ToggleButtonProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  theme: DragonPreviewTheme;
  activeColor?: string;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({
  label,
  active,
  onToggle,
  theme,
  activeColor,
}) => (
  <button
    onClick={onToggle}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      background: active ? (activeColor || theme.healthy) : theme.grid,
      color: active ? '#fff' : theme.text,
      border: `1px solid ${active ? (activeColor || theme.healthy) : theme.border}`,
      borderRadius: 4,
      padding: '4px 10px',
      fontSize: theme.fontSize,
      fontFamily: theme.fontFamily,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }}
  >
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: active ? '#fff' : theme.text,
        opacity: active ? 1 : 0.4,
      }}
    />
    {label}
  </button>
);

// --- Button Group ---

interface ButtonGroupProps<T extends string | number> {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  theme: DragonPreviewTheme;
  accentColor?: string;
}

function ButtonGroup<T extends string | number>({
  options,
  selected,
  onSelect,
  theme,
  accentColor,
}: ButtonGroupProps<T>) {
  return (
    <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onSelect(opt.value)}
          style={{
            flex: 1,
            background: selected === opt.value ? (accentColor || theme.accent) : theme.panelBg,
            color: selected === opt.value ? '#fff' : theme.text,
            border: `1px solid ${selected === opt.value ? (accentColor || theme.accent) : theme.border}`,
            borderRadius: 4,
            padding: '4px 2px',
            fontSize: theme.fontSize - 1,
            fontFamily: theme.fontFamily,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// --- Performance Health Indicator ---

interface HealthIndicatorProps {
  health: BudgetHealthStatus;
  theme: DragonPreviewTheme;
}

const HealthIndicator: React.FC<HealthIndicatorProps> = ({ health, theme }) => {
  const color = healthColor(health, theme);
  const label = healthLabel(health);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: `${color}15`,
        border: `1px solid ${color}40`,
        borderRadius: 6,
        marginBottom: 8,
      }}
    >
      {/* Pulsing indicator dot */}
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}80`,
          animation: health === 'critical' || health === 'exceeded'
            ? 'pulse 1s infinite'
            : undefined,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: theme.fontSize + 1,
            fontWeight: 'bold',
            color,
            fontFamily: theme.fontFamily,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: theme.fontSize - 1,
            color: theme.text,
            opacity: 0.7,
            fontFamily: theme.fontFamily,
          }}
        >
          Performance Status
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Dragon Inspector panel for the studio.
 *
 * Provides interactive controls and real-time performance counters
 * for the dragon preview component. Designed with a dark theme
 * consistent with the VR studio aesthetic.
 *
 * Sections:
 * 1. Performance Health Indicator (top-level status)
 * 2. Performance Counters (triangles, draw calls, FPS, memory)
 * 3. LOD Controls (quality slider, level selector)
 * 4. Fire Effect Controls (toggle, quality, wind, turbulence)
 *
 * @example
 * ```tsx
 * <DragonInspector
 *   lodLevel={lodLevel}
 *   onLODChange={setLODLevel}
 *   fireControls={fireControls}
 *   onFireControlsChange={setFireControls}
 *   performance={metrics}
 * />
 * ```
 */
export const DragonInspector: React.FC<DragonInspectorProps> = ({
  lodLevel,
  onLODChange,
  fireControls,
  onFireControlsChange,
  performance,
  showProfiler = false,
  className,
  theme: themeOverride,
}) => {
  const theme: DragonPreviewTheme = useMemo(
    () => ({ ...DEFAULT_DRAGON_PREVIEW_THEME, ...themeOverride }),
    [themeOverride],
  );

  const lodInfo = LOD_LEVEL_INFO[lodLevel];

  // Determine threshold colors for counters
  const triColor =
    performance.triangleCount > DRAGON_PERF_THRESHOLDS.triangles.critical
      ? theme.critical
      : performance.triangleCount > DRAGON_PERF_THRESHOLDS.triangles.warning
        ? theme.warning
        : theme.healthy;

  const dcColor =
    performance.drawCallCount > DRAGON_PERF_THRESHOLDS.drawCalls.critical
      ? theme.critical
      : performance.drawCallCount > DRAGON_PERF_THRESHOLDS.drawCalls.warning
        ? theme.warning
        : theme.healthy;

  const fpsColor =
    performance.fps < DRAGON_PERF_THRESHOLDS.fps.critical
      ? theme.critical
      : performance.fps < DRAGON_PERF_THRESHOLDS.fps.warning
        ? theme.warning
        : theme.healthy;

  return (
    <div
      className={className}
      style={{
        width: theme.inspectorWidth,
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        fontFamily: theme.fontFamily,
        fontSize: theme.fontSize,
        color: theme.text,
        overflow: 'auto',
        maxHeight: '100vh',
      }}
    >
      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: `1px solid ${theme.border}`,
          background: theme.panelBg,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: theme.fontSize + 2, color: theme.accent }}>
          Dragon Inspector
        </div>
        <div style={{ fontSize: theme.fontSize - 1, opacity: 0.6, marginTop: 2 }}>
          Inferno Wyrm Preview Controls
        </div>
      </div>

      <div style={{ padding: '8px 14px' }}>
        {/* ==================== PERFORMANCE HEALTH ==================== */}
        <HealthIndicator health={performance.health} theme={theme} />

        {/* ==================== PERFORMANCE COUNTERS ==================== */}
        <SectionHeader title="Performance" theme={theme} />

        <StatRow
          label="Triangles"
          value={formatCount(performance.triangleCount)}
          color={triColor}
          theme={theme}
        />
        <StatRow
          label="Draw Calls"
          value={String(performance.drawCallCount)}
          color={dcColor}
          theme={theme}
        />
        <StatRow
          label="FPS"
          value={`${performance.fps}`}
          color={fpsColor}
          theme={theme}
        />
        <StatRow
          label="Frame Time"
          value={`${performance.frameTimeMs.toFixed(1)}ms`}
          theme={theme}
        />
        <StatRow
          label="Fire GPU"
          value={`${performance.fireGpuTimeMs.toFixed(1)}ms`}
          color={performance.fireGpuTimeMs > 2.0 ? theme.warning : theme.text}
          theme={theme}
        />
        <StatRow
          label="Memory Est."
          value={`${performance.memoryEstimateMB.toFixed(0)} MB`}
          theme={theme}
        />

        {/* ==================== LOD CONTROLS ==================== */}
        <div style={{ marginTop: 12 }}>
          <SectionHeader
            title="LOD Level"
            theme={theme}
            rightContent={
              <span
                style={{
                  color: theme.lodColors[lodLevel],
                  fontWeight: 'bold',
                  fontSize: theme.fontSize,
                  fontFamily: theme.fontFamily,
                }}
              >
                LOD {lodLevel} - {lodInfo.label}
              </span>
            }
          />

          <SliderControl
            label="Quality"
            value={lodLevel}
            min={0}
            max={3}
            step={1}
            onChange={(v) => onLODChange(v as DragonLODLevel)}
            displayValue={`LOD ${lodLevel} (${lodInfo.trianglePercent}%)`}
            theme={theme}
          />

          {/* LOD level button group */}
          <ButtonGroup<DragonLODLevel>
            options={[
              { value: 0, label: 'Ultra' },
              { value: 1, label: 'High' },
              { value: 2, label: 'Medium' },
              { value: 3, label: 'Low' },
            ]}
            selected={lodLevel}
            onSelect={onLODChange}
            theme={theme}
          />

          <div
            style={{
              fontSize: theme.fontSize - 1,
              color: theme.text,
              opacity: 0.6,
              marginTop: 6,
              lineHeight: 1.4,
            }}
          >
            {lodInfo.description}
          </div>
        </div>

        {/* ==================== FIRE EFFECT CONTROLS ==================== */}
        <div style={{ marginTop: 12 }}>
          <SectionHeader
            title="Fire Effects"
            theme={theme}
            rightContent={
              <ToggleButton
                label={fireControls.enabled ? 'ON' : 'OFF'}
                active={fireControls.enabled}
                onToggle={() =>
                  onFireControlsChange({
                    ...fireControls,
                    enabled: !fireControls.enabled,
                  })
                }
                theme={theme}
                activeColor={theme.fireAccent}
              />
            }
          />

          {fireControls.enabled && (
            <>
              {/* Fire Quality */}
              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: theme.fontSize,
                    color: theme.text,
                    marginBottom: 4,
                    fontFamily: theme.fontFamily,
                  }}
                >
                  Quality
                </div>
                <ButtonGroup<FireQualityLevel>
                  options={[
                    { value: 0, label: 'Q0' },
                    { value: 1, label: 'Q1' },
                    { value: 2, label: 'Q2' },
                    { value: 3, label: 'Q3' },
                  ]}
                  selected={fireControls.quality}
                  onSelect={(q) =>
                    onFireControlsChange({ ...fireControls, quality: q })
                  }
                  theme={theme}
                  accentColor={theme.fireAccent}
                />
                <div
                  style={{
                    fontSize: theme.fontSize - 1,
                    color: theme.text,
                    opacity: 0.5,
                    marginTop: 2,
                  }}
                >
                  {FIRE_QUALITY_LABELS[fireControls.quality]}
                </div>
              </div>

              {/* Wind Direction */}
              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: theme.fontSize,
                    color: theme.text,
                    marginBottom: 4,
                    fontFamily: theme.fontFamily,
                  }}
                >
                  Wind Direction
                </div>
                <ButtonGroup<WindDirectionPreset>
                  options={[
                    { value: 'none', label: 'None' },
                    { value: 'up', label: 'Up' },
                    { value: 'north', label: 'N' },
                    { value: 'south', label: 'S' },
                    { value: 'east', label: 'E' },
                    { value: 'west', label: 'W' },
                  ]}
                  selected={fireControls.windDirection}
                  onSelect={(d) =>
                    onFireControlsChange({ ...fireControls, windDirection: d })
                  }
                  theme={theme}
                />
              </div>

              {/* Wind Strength */}
              <SliderControl
                label="Wind Strength"
                value={fireControls.windStrength}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) =>
                  onFireControlsChange({ ...fireControls, windStrength: v })
                }
                theme={theme}
              />

              {/* Turbulence */}
              <SliderControl
                label="Turbulence"
                value={fireControls.turbulence}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) =>
                  onFireControlsChange({ ...fireControls, turbulence: v })
                }
                theme={theme}
              />

              {/* Intensity */}
              <SliderControl
                label="Intensity"
                value={fireControls.intensity}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) =>
                  onFireControlsChange({ ...fireControls, intensity: v })
                }
                theme={theme}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
