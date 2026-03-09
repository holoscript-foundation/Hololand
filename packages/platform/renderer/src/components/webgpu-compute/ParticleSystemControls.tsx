/**
 * ParticleSystemControls
 *
 * Controls for WebGPU particle system parameters including particle count
 * (up to 1M), emitter position and shape, force fields, and color gradient
 * editor. Provides interactive UI for real-time GPU particle simulation tuning.
 *
 * @module webgpu-compute/ParticleSystemControls
 */

import React, { useCallback } from 'react';
import type {
  ParticleSystemControlsProps,
  ParticleSystemParams,
  ForceField,
  ForceFieldType,
  GradientStop,
  EmitterShape,
  WebGPUComputeTheme,
} from './types';
import {
  DEFAULT_WEBGPU_COMPUTE_THEME,
  MAX_PARTICLE_COUNT,
  FORCE_FIELD_LABELS,
  EMITTER_SHAPE_LABELS,
} from './types';
import { useParticleSystem } from './useWebGPUCompute';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  theme: WebGPUComputeTheme;
  unit?: string;
  formatValue?: (v: number) => string;
}

const Slider: React.FC<SliderProps> = ({
  label, value, min, max, step, onChange, theme, unit, formatValue,
}) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.fontSize - 1, marginBottom: 2 }}>
      <span style={{ color: theme.textSecondary }}>{label}</span>
      <span style={{ color: theme.text, fontFamily: theme.monoFontFamily }}>
        {formatValue ? formatValue(value) : value.toFixed(step < 1 ? Math.max(0, -Math.floor(Math.log10(step))) : 0)}
        {unit && <span style={{ color: theme.textSecondary, marginLeft: 2 }}>{unit}</span>}
      </span>
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
      style={{ width: '100%', accentColor: theme.accent, cursor: 'pointer' }}
    />
  </div>
);

interface RangeSliderProps {
  label: string;
  range: [number, number];
  min: number;
  max: number;
  step: number;
  onChange: (range: [number, number]) => void;
  theme: WebGPUComputeTheme;
  unit?: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  label, range, min, max, step, onChange, theme, unit,
}) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.fontSize - 1, marginBottom: 2 }}>
      <span style={{ color: theme.textSecondary }}>{label}</span>
      <span style={{ color: theme.text, fontFamily: theme.monoFontFamily }}>
        {range[0].toFixed(2)} - {range[1].toFixed(2)}{unit ? ` ${unit}` : ''}
      </span>
    </div>
    <div style={{ display: 'flex', gap: 4 }}>
      <input
        type="range" min={min} max={max} step={step} value={range[0]}
        onChange={(e) => onChange([Number(e.target.value), range[1]])}
        aria-label={`${label} minimum`}
        style={{ flex: 1, accentColor: theme.accent, cursor: 'pointer' }}
      />
      <input
        type="range" min={min} max={max} step={step} value={range[1]}
        onChange={(e) => onChange([range[0], Number(e.target.value)])}
        aria-label={`${label} maximum`}
        style={{ flex: 1, accentColor: theme.compute, cursor: 'pointer' }}
      />
    </div>
  </div>
);

interface Vec3EditorProps {
  label: string;
  value: [number, number, number];
  onChange: (value: [number, number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  theme: WebGPUComputeTheme;
}

const Vec3Editor: React.FC<Vec3EditorProps> = ({
  label, value, onChange, min = -10, max = 10, step = 0.1, theme,
}) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ fontSize: theme.fontSize - 1, color: theme.textSecondary, marginBottom: 2 }}>{label}</div>
    <div style={{ display: 'flex', gap: 4 }}>
      {(['X', 'Y', 'Z'] as const).map((axis, i) => (
        <div key={axis} style={{ flex: 1 }}>
          <label style={{ fontSize: theme.fontSize - 2, color: theme.textSecondary }}>{axis}</label>
          <input
            type="number" value={value[i]} min={min} max={max} step={step}
            onChange={(e) => {
              const newVal = [...value] as [number, number, number];
              newVal[i] = Number(e.target.value);
              onChange(newVal);
            }}
            aria-label={`${label} ${axis}`}
            style={{
              width: '100%', padding: '2px 4px',
              background: theme.inputBg, border: `1px solid ${theme.border}`,
              borderRadius: 3, color: theme.text,
              fontSize: theme.fontSize, fontFamily: theme.monoFontFamily, outline: 'none',
            }}
          />
        </div>
      ))}
    </div>
  </div>
);

interface ForceFieldEditorProps {
  field: ForceField;
  index: number;
  onUpdate: (index: number, updates: Partial<ForceField>) => void;
  onRemove: (index: number) => void;
  theme: WebGPUComputeTheme;
}

const ForceFieldEditor: React.FC<ForceFieldEditorProps> = ({
  field, index, onUpdate, onRemove, theme,
}) => (
  <div style={{
    padding: 8, marginBottom: 6,
    background: theme.panelBg, border: `1px solid ${theme.border}`,
    borderRadius: 6, opacity: field.enabled ? 1 : 0.5,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="checkbox" checked={field.enabled}
          onChange={() => onUpdate(index, { enabled: !field.enabled })}
          aria-label={`Toggle force field ${FORCE_FIELD_LABELS[field.type]}`}
        />
        <span style={{ color: theme.text, fontSize: theme.fontSize, fontWeight: 600 }}>
          {FORCE_FIELD_LABELS[field.type]}
        </span>
      </div>
      <button
        onClick={() => onRemove(index)}
        aria-label={`Remove force field ${index}`}
        style={{
          padding: '2px 6px', background: theme.error + '20', color: theme.error,
          border: `1px solid ${theme.error}40`, borderRadius: 3,
          cursor: 'pointer', fontSize: theme.fontSize - 1,
        }}
      >
        Remove
      </button>
    </div>
    <Slider
      label="Strength" value={field.strength} min={0} max={50} step={0.1}
      onChange={(v) => onUpdate(index, { strength: v })} theme={theme}
    />
    <Slider
      label="Radius" value={field.radius} min={0.1} max={100} step={0.1}
      onChange={(v) => onUpdate(index, { radius: v })} theme={theme}
    />
    <Slider
      label="Falloff" value={field.falloff} min={0} max={5} step={0.1}
      onChange={(v) => onUpdate(index, { falloff: v })} theme={theme}
    />
    <Vec3Editor
      label="Position" value={field.position}
      onChange={(v) => onUpdate(index, { position: v })} theme={theme}
    />
  </div>
);

interface GradientEditorProps {
  stops: GradientStop[];
  onUpdate: (stops: GradientStop[]) => void;
  onAdd: (stop: GradientStop) => void;
  onRemove: (index: number) => void;
  theme: WebGPUComputeTheme;
}

const GradientEditor: React.FC<GradientEditorProps> = ({
  stops, onUpdate, onAdd, onRemove, theme,
}) => {
  const gradientCSS = stops
    .map((s) => `rgba(${s.color.map((c, i) => (i < 3 ? Math.round(c * 255) : c)).join(',')}) ${s.position * 100}%`)
    .join(', ');

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        fontSize: theme.fontSize, fontWeight: 600, color: theme.text, marginBottom: 6,
      }}>
        Color Gradient (over lifetime)
      </div>
      {/* Gradient preview */}
      <div style={{
        height: 24, borderRadius: 4,
        background: `linear-gradient(to right, ${gradientCSS})`,
        border: `1px solid ${theme.border}`, marginBottom: 6,
      }} />
      {/* Stops */}
      {stops.map((stop, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 4, fontSize: theme.fontSize - 1,
        }}>
          <input
            type="color"
            value={`#${stop.color.slice(0, 3).map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`}
            onChange={(e) => {
              const hex = e.target.value;
              const r = parseInt(hex.slice(1, 3), 16) / 255;
              const g = parseInt(hex.slice(3, 5), 16) / 255;
              const b = parseInt(hex.slice(5, 7), 16) / 255;
              const newStops = [...stops];
              newStops[i] = { ...stop, color: [r, g, b, stop.color[3]] };
              onUpdate(newStops);
            }}
            aria-label={`Gradient stop ${i} color`}
            style={{ width: 28, height: 20, border: 'none', cursor: 'pointer' }}
          />
          <input
            type="range" min={0} max={1} step={0.01} value={stop.position}
            onChange={(e) => {
              const newStops = [...stops];
              newStops[i] = { ...stop, position: Number(e.target.value) };
              onUpdate(newStops.sort((a, b) => a.position - b.position));
            }}
            aria-label={`Gradient stop ${i} position`}
            style={{ flex: 1, accentColor: theme.accent, cursor: 'pointer' }}
          />
          <input
            type="range" min={0} max={1} step={0.01} value={stop.color[3]}
            onChange={(e) => {
              const newStops = [...stops];
              newStops[i] = { ...stop, color: [stop.color[0], stop.color[1], stop.color[2], Number(e.target.value)] };
              onUpdate(newStops);
            }}
            aria-label={`Gradient stop ${i} alpha`}
            style={{ width: 50, accentColor: theme.textSecondary, cursor: 'pointer' }}
          />
          <span style={{ color: theme.textSecondary, minWidth: 28 }}>
            {(stop.color[3] * 100).toFixed(0)}%
          </span>
          {stops.length > 2 && (
            <button
              onClick={() => onRemove(i)}
              aria-label={`Remove gradient stop ${i}`}
              style={{
                padding: '1px 4px', background: 'none', color: theme.error,
                border: `1px solid ${theme.error}40`, borderRadius: 2,
                cursor: 'pointer', fontSize: theme.fontSize - 2,
              }}
            >
              X
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => onAdd({ position: 0.5, color: [1, 1, 1, 1] })}
        aria-label="Add gradient stop"
        style={{
          marginTop: 4, padding: '3px 8px',
          background: theme.inputBg, color: theme.textSecondary,
          border: `1px solid ${theme.border}`, borderRadius: 3,
          cursor: 'pointer', fontSize: theme.fontSize - 1,
        }}
      >
        + Add Stop
      </button>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ParticleSystemControls
 *
 * Interactive controls for WebGPU particle system parameters.
 * Supports up to 1 million particles with GPU compute dispatch,
 * multiple emitter shapes, configurable force fields, and a
 * color gradient editor for particle lifetime coloring.
 *
 * @example
 * ```tsx
 * <ParticleSystemControls
 *   onParamsChange={(params) => gpuParticles.setParams(params)}
 *   onEmitToggle={(emitting) => emitting ? gpuParticles.start() : gpuParticles.stop()}
 *   onBurst={(count) => gpuParticles.burst(count)}
 *   visible={true}
 * />
 * ```
 */
export const ParticleSystemControls: React.FC<ParticleSystemControlsProps> = ({
  systemState: externalState,
  onParamsChange,
  onEmitToggle,
  onBurst,
  onForceFieldChange,
  onGradientChange,
  className,
  visible = true,
}) => {
  const theme = DEFAULT_WEBGPU_COMPUTE_THEME;

  const { state, actions } = useParticleSystem({
    initialParams: externalState?.params,
  });

  const displayState = {
    ...state,
    ...externalState,
    params: { ...state.params, ...externalState?.params },
  };

  const handleParamChange = useCallback(
    (updates: Partial<ParticleSystemParams>) => {
      actions.setParams(updates);
      onParamsChange?.(updates);
    },
    [actions, onParamsChange]
  );

  const formatCount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!visible) return null;

  return (
    <div
      className={className}
      role="region"
      aria-label="Particle System Controls"
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        padding: 12,
        fontFamily: theme.fontFamily,
        color: theme.text,
        maxHeight: '85vh',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${theme.border}`,
      }}>
        <h3 style={{
          margin: 0, fontSize: theme.fontSize + 2, fontWeight: 700,
          color: theme.compute, fontFamily: theme.monoFontFamily,
        }}>
          Particle System
        </h3>
        <span style={{
          fontSize: theme.fontSize - 1,
          color: displayState.emitting ? theme.success : theme.textSecondary,
          fontFamily: theme.monoFontFamily,
        }}>
          {displayState.emitting ? 'EMITTING' : 'STOPPED'}
        </span>
      </div>

      {/* Emit controls */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button
          onClick={() => {
            if (displayState.emitting) {
              actions.stopEmitting();
              onEmitToggle?.(false);
            } else {
              actions.startEmitting();
              onEmitToggle?.(true);
            }
          }}
          aria-label={displayState.emitting ? 'Stop emitting' : 'Start emitting'}
          style={{
            flex: 1, padding: '6px 12px',
            background: displayState.emitting ? theme.warning : theme.success,
            color: '#fff', border: 'none', borderRadius: 4,
            cursor: 'pointer', fontFamily: theme.monoFontFamily,
            fontSize: theme.fontSize, fontWeight: 600,
          }}
        >
          {displayState.emitting ? 'Stop' : 'Emit'}
        </button>
        <button
          onClick={() => {
            actions.burst(1000);
            onBurst?.(1000);
          }}
          aria-label="Burst 1000 particles"
          style={{
            padding: '6px 12px', background: theme.compute,
            color: '#fff', border: 'none', borderRadius: 4,
            cursor: 'pointer', fontFamily: theme.monoFontFamily,
            fontSize: theme.fontSize, fontWeight: 600,
          }}
        >
          Burst 1K
        </button>
        <button
          onClick={() => actions.killAll()}
          aria-label="Kill all particles"
          style={{
            padding: '6px 12px', background: theme.inputBg,
            color: theme.error, border: `1px solid ${theme.error}40`,
            borderRadius: 4, cursor: 'pointer',
            fontFamily: theme.monoFontFamily, fontSize: theme.fontSize,
          }}
        >
          Kill All
        </button>
      </div>

      {/* Statistics */}
      <div style={{
        marginBottom: 12, padding: 8,
        background: theme.panelBg, borderRadius: 6,
        border: `1px solid ${theme.border}`,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: theme.fontSize - 1 }}>
          <div style={{ color: theme.textSecondary }}>
            Active: <span style={{ color: theme.text, fontWeight: 600 }}>{formatCount(displayState.params.activeParticles)}</span>
          </div>
          <div style={{ color: theme.textSecondary }}>
            Max: <span style={{ color: theme.text }}>{formatCount(displayState.params.maxParticles)}</span>
          </div>
          <div style={{ color: theme.textSecondary }}>
            Spawned: <span style={{ color: theme.text }}>{formatCount(displayState.totalSpawned)}</span>
          </div>
          <div style={{ color: theme.textSecondary }}>
            Compute: <span style={{ color: theme.text }}>{displayState.computeTimeMs.toFixed(2)}ms</span>
          </div>
          <div style={{ color: theme.textSecondary }}>
            GPU Mem: <span style={{ color: theme.text }}>{formatBytes(displayState.gpuMemoryUsage)}</span>
          </div>
          <div style={{ color: theme.textSecondary }}>
            FPS Impact: <span style={{
              color: displayState.fpsImpact === 0 ? theme.success : displayState.fpsImpact === 1 ? theme.warning : theme.error,
              fontWeight: 600,
            }}>
              {['None', 'Low', 'High'][displayState.fpsImpact]}
            </span>
          </div>
        </div>
        {/* Utilization bar */}
        <div style={{
          marginTop: 6, height: 6, background: theme.grid, borderRadius: 3, overflow: 'hidden',
        }}>
          <div style={{
            width: `${(displayState.params.activeParticles / displayState.params.maxParticles) * 100}%`,
            height: '100%', background: theme.compute, borderRadius: 3,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Particle Parameters */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: theme.fontSize, fontWeight: 600, color: theme.text, marginBottom: 8 }}>
          Particle Parameters
        </div>

        <Slider
          label="Max Particles"
          value={displayState.params.maxParticles}
          min={100} max={MAX_PARTICLE_COUNT} step={100}
          onChange={(v) => handleParamChange({ maxParticles: v })}
          theme={theme}
          formatValue={formatCount}
        />

        <Slider
          label="Emission Rate"
          value={displayState.params.emissionRate}
          min={1} max={100000} step={100}
          onChange={(v) => handleParamChange({ emissionRate: v })}
          theme={theme}
          unit="/s"
          formatValue={formatCount}
        />

        <RangeSlider
          label="Lifetime" range={displayState.params.lifetimeRange}
          min={0.1} max={30} step={0.1}
          onChange={(r) => handleParamChange({ lifetimeRange: r })}
          theme={theme} unit="s"
        />

        <RangeSlider
          label="Speed" range={displayState.params.speedRange}
          min={0} max={20} step={0.1}
          onChange={(r) => handleParamChange({ speedRange: r })}
          theme={theme}
        />

        <RangeSlider
          label="Size" range={displayState.params.sizeRange}
          min={0.001} max={1} step={0.001}
          onChange={(r) => handleParamChange({ sizeRange: r })}
          theme={theme}
        />
      </div>

      {/* Emitter */}
      <div style={{ marginBottom: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: theme.fontSize, fontWeight: 600, color: theme.text, marginBottom: 8 }}>
          Emitter
        </div>

        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: theme.fontSize - 1, color: theme.textSecondary, display: 'block', marginBottom: 3 }}>
            Shape
          </label>
          <select
            value={displayState.params.emitterShape}
            onChange={(e) => handleParamChange({ emitterShape: e.target.value as EmitterShape })}
            aria-label="Emitter shape"
            style={{
              width: '100%', padding: '4px 8px',
              background: theme.inputBg, border: `1px solid ${theme.border}`,
              borderRadius: 4, color: theme.text,
              fontSize: theme.fontSize, fontFamily: theme.monoFontFamily, outline: 'none',
            }}
          >
            {(Object.entries(EMITTER_SHAPE_LABELS) as [EmitterShape, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <Vec3Editor
          label="Position"
          value={displayState.params.emitterPosition}
          onChange={(v) => {
            actions.setEmitterPosition(v);
            onParamsChange?.({ emitterPosition: v });
          }}
          theme={theme}
        />

        <Slider
          label="Radius"
          value={displayState.params.emitterRadius}
          min={0.01} max={10} step={0.01}
          onChange={(v) => handleParamChange({ emitterRadius: v })}
          theme={theme}
        />

        {/* Options */}
        <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: theme.fontSize - 1 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: theme.text }}>
            <input
              type="checkbox"
              checked={displayState.params.billboard}
              onChange={() => handleParamChange({ billboard: !displayState.params.billboard })}
            />
            Billboard
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: theme.text }}>
            <input
              type="checkbox"
              checked={displayState.params.depthSort}
              onChange={() => handleParamChange({ depthSort: !displayState.params.depthSort })}
            />
            Depth Sort
          </label>
        </div>
      </div>

      {/* Force Fields */}
      <div style={{ marginBottom: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 8,
        }}>
          <div style={{ fontSize: theme.fontSize, fontWeight: 600, color: theme.text }}>
            Force Fields ({displayState.params.forceFields.length})
          </div>
          <select
            onChange={(e) => {
              const type = e.target.value as ForceFieldType;
              if (type) {
                const newField: ForceField = {
                  type,
                  position: [0, 0, 0],
                  strength: 5,
                  radius: 5,
                  enabled: true,
                  direction: [0, -1, 0],
                  falloff: 1,
                };
                actions.addForceField(newField);
                onForceFieldChange?.([...displayState.params.forceFields, newField]);
                e.target.value = '';
              }
            }}
            aria-label="Add force field"
            style={{
              padding: '3px 6px', background: theme.inputBg,
              border: `1px solid ${theme.border}`, borderRadius: 3,
              color: theme.textSecondary, fontSize: theme.fontSize - 1,
              fontFamily: theme.monoFontFamily, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">+ Add Field</option>
            {(Object.entries(FORCE_FIELD_LABELS) as [ForceFieldType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {displayState.params.forceFields.map((field, i) => (
          <ForceFieldEditor
            key={i}
            field={field}
            index={i}
            onUpdate={(index, updates) => {
              actions.updateForceField(index, updates);
              const updated = [...displayState.params.forceFields];
              updated[index] = { ...updated[index], ...updates };
              onForceFieldChange?.(updated);
            }}
            onRemove={(index) => {
              actions.removeForceField(index);
              onForceFieldChange?.(displayState.params.forceFields.filter((_, j) => j !== index));
            }}
            theme={theme}
          />
        ))}
      </div>

      {/* Color Gradient */}
      <div style={{ paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
        <GradientEditor
          stops={displayState.params.colorGradient}
          onUpdate={(stops) => {
            actions.setColorGradient(stops);
            onGradientChange?.(stops);
          }}
          onAdd={(stop) => {
            actions.addGradientStop(stop);
            onGradientChange?.([...displayState.params.colorGradient, stop]);
          }}
          onRemove={(index) => {
            actions.removeGradientStop(index);
            onGradientChange?.(displayState.params.colorGradient.filter((_, i) => i !== index));
          }}
          theme={theme}
        />
      </div>
    </div>
  );
};
