/**
 * ClothSimulationControls
 *
 * Controls for WebGPU cloth simulation parameters including constraint
 * iterations, wind force, gravity, pin points, stiffness coefficients,
 * and integration method selection.
 *
 * @module webgpu-compute/ClothSimulationControls
 */

import React, { useCallback } from 'react';
import type {
  ClothSimulationControlsProps,
  ClothSimulationParams,
  ClothIntegrationMethod,
  PinPoint,
  WebGPUComputeTheme,
} from './types';
import { DEFAULT_WEBGPU_COMPUTE_THEME } from './types';
import { useClothSimulation } from './useWebGPUCompute';

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

interface Vec3SliderProps {
  label: string;
  value: [number, number, number];
  onChange: (value: [number, number, number]) => void;
  min: number;
  max: number;
  step: number;
  theme: WebGPUComputeTheme;
}

const Vec3Slider: React.FC<Vec3SliderProps> = ({
  label, value, onChange, min, max, step, theme,
}) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ fontSize: theme.fontSize - 1, color: theme.textSecondary, marginBottom: 4 }}>{label}</div>
    {(['X', 'Y', 'Z'] as const).map((axis, i) => (
      <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <span style={{ fontSize: theme.fontSize - 1, color: theme.textSecondary, minWidth: 12, fontFamily: theme.monoFontFamily }}>
          {axis}
        </span>
        <input
          type="range" min={min} max={max} step={step} value={value[i]}
          onChange={(e) => {
            const newVal = [...value] as [number, number, number];
            newVal[i] = Number(e.target.value);
            onChange(newVal);
          }}
          aria-label={`${label} ${axis}`}
          style={{ flex: 1, accentColor: theme.accent, cursor: 'pointer' }}
        />
        <span style={{
          fontSize: theme.fontSize - 1, color: theme.text, fontFamily: theme.monoFontFamily,
          minWidth: 40, textAlign: 'right',
        }}>
          {value[i].toFixed(1)}
        </span>
      </div>
    ))}
  </div>
);

interface PinPointEditorProps {
  pin: PinPoint;
  index: number;
  onToggle: (index: number) => void;
  onRemove: (index: number) => void;
  theme: WebGPUComputeTheme;
}

const PinPointEditor: React.FC<PinPointEditorProps> = ({
  pin, index, onToggle, onRemove, theme,
}) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '4px 8px', marginBottom: 4,
    background: pin.enabled ? theme.panelBg : theme.bg,
    border: `1px solid ${pin.enabled ? theme.accent + '40' : theme.border}`,
    borderRadius: 4, opacity: pin.enabled ? 1 : 0.6,
  }}>
    <input
      type="checkbox"
      checked={pin.enabled}
      onChange={() => onToggle(index)}
      aria-label={`Toggle pin ${pin.label}`}
    />
    <span style={{
      flex: 1, fontSize: theme.fontSize - 1, color: theme.text,
      fontFamily: theme.monoFontFamily,
    }}>
      {pin.label}
    </span>
    <span style={{
      fontSize: theme.fontSize - 2, color: theme.textSecondary,
      fontFamily: theme.monoFontFamily,
    }}>
      v{pin.vertexIndex} ({pin.position.map((p) => p.toFixed(1)).join(', ')})
    </span>
    <button
      onClick={() => onRemove(index)}
      aria-label={`Remove pin ${pin.label}`}
      style={{
        padding: '1px 4px', background: 'none', color: theme.error,
        border: `1px solid ${theme.error}40`, borderRadius: 2,
        cursor: 'pointer', fontSize: theme.fontSize - 2,
      }}
    >
      X
    </button>
  </div>
);

interface StatRowProps {
  label: string;
  value: string;
  color?: string;
  theme: WebGPUComputeTheme;
}

const StatRow: React.FC<StatRowProps> = ({ label, value, color, theme }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: theme.fontSize - 1 }}>
    <span style={{ color: theme.textSecondary }}>{label}</span>
    <span style={{ color: color ?? theme.text, fontFamily: theme.monoFontFamily, fontWeight: 600 }}>{value}</span>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ClothSimulationControls
 *
 * Interactive controls for WebGPU cloth simulation. Provides parameter
 * tuning for constraint iterations, wind force, gravity, stiffness
 * coefficients, and pin point management.
 *
 * @example
 * ```tsx
 * <ClothSimulationControls
 *   onParamsChange={(params) => gpuCloth.setParams(params)}
 *   onStart={() => gpuCloth.start()}
 *   onPause={() => gpuCloth.pause()}
 *   onPinChange={(pins) => gpuCloth.updatePins(pins)}
 *   visible={true}
 * />
 * ```
 */
export const ClothSimulationControls: React.FC<ClothSimulationControlsProps> = ({
  simulationState: externalState,
  onParamsChange,
  onStart,
  onPause,
  onReset,
  onPinChange,
  className,
  visible = true,
}) => {
  const theme = DEFAULT_WEBGPU_COMPUTE_THEME;

  const { state, actions } = useClothSimulation({
    initialParams: externalState?.params,
  });

  const displayState = {
    ...state,
    ...externalState,
    params: { ...state.params, ...externalState?.params },
  };

  const handleParamChange = useCallback(
    (updates: Partial<ClothSimulationParams>) => {
      actions.setParams(updates);
      onParamsChange?.(updates);
    },
    [actions, onParamsChange]
  );

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
      aria-label="Cloth Simulation Controls"
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
          color: theme.warning, fontFamily: theme.monoFontFamily,
        }}>
          Cloth Simulation
        </h3>
        <span style={{
          fontSize: theme.fontSize - 1,
          color: displayState.running ? theme.success : theme.textSecondary,
          fontFamily: theme.monoFontFamily,
        }}>
          {displayState.running ? 'RUNNING' : 'PAUSED'}
        </span>
      </div>

      {/* Transport controls */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button
          onClick={() => {
            if (displayState.running) {
              actions.pause();
              onPause?.();
            } else {
              actions.start();
              onStart?.();
            }
          }}
          aria-label={displayState.running ? 'Pause simulation' : 'Start simulation'}
          style={{
            flex: 1, padding: '6px 12px',
            background: displayState.running ? theme.warning : theme.success,
            color: '#fff', border: 'none', borderRadius: 4,
            cursor: 'pointer', fontFamily: theme.monoFontFamily,
            fontSize: theme.fontSize, fontWeight: 600,
          }}
        >
          {displayState.running ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => actions.stepForward()}
          disabled={displayState.running}
          aria-label="Step forward"
          style={{
            padding: '6px 12px', background: theme.inputBg,
            color: displayState.running ? theme.textSecondary : theme.text,
            border: `1px solid ${theme.border}`, borderRadius: 4,
            cursor: displayState.running ? 'not-allowed' : 'pointer',
            fontFamily: theme.monoFontFamily, fontSize: theme.fontSize,
          }}
        >
          Step
        </button>
        <button
          onClick={() => { actions.reset(); onReset?.(); }}
          aria-label="Reset simulation"
          style={{
            padding: '6px 12px', background: theme.inputBg,
            color: theme.text, border: `1px solid ${theme.border}`,
            borderRadius: 4, cursor: 'pointer',
            fontFamily: theme.monoFontFamily, fontSize: theme.fontSize,
          }}
        >
          Reset
        </button>
      </div>

      {/* Statistics */}
      <div style={{
        marginBottom: 12, padding: 8,
        background: theme.panelBg, borderRadius: 6,
        border: `1px solid ${theme.border}`,
      }}>
        <StatRow label="Step" value={displayState.step.toLocaleString()} theme={theme} />
        <StatRow label="Vertices" value={displayState.params.vertexCount.toLocaleString()} theme={theme} />
        <StatRow label="Constraints" value={displayState.params.constraintCount.toLocaleString()} theme={theme} />
        <StatRow
          label="Compute Time"
          value={`${displayState.computeTimeMs.toFixed(2)}ms`}
          color={displayState.computeTimeMs < 2 ? theme.success : displayState.computeTimeMs < 5 ? theme.warning : theme.error}
          theme={theme}
        />
        <StatRow
          label="Constraint Solve"
          value={`${displayState.constraintSolveMs.toFixed(2)}ms`}
          theme={theme}
        />
        <StatRow
          label="Max Error"
          value={displayState.maxConstraintError.toFixed(4)}
          color={displayState.maxConstraintError < 0.01 ? theme.success : theme.warning}
          theme={theme}
        />
        <StatRow label="GPU Buffers" value={formatBytes(displayState.gpuBufferUsage)} theme={theme} />
      </div>

      {/* Constraint Parameters */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: theme.fontSize, fontWeight: 600, color: theme.text, marginBottom: 8 }}>
          Constraint Solver
        </div>

        <Slider
          label="Constraint Iterations"
          value={displayState.params.constraintIterations}
          min={1} max={50} step={1}
          onChange={(v) => handleParamChange({ constraintIterations: v })}
          theme={theme}
        />

        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: theme.fontSize - 1, color: theme.textSecondary, display: 'block', marginBottom: 3 }}>
            Integration Method
          </label>
          <select
            value={displayState.params.integrationMethod}
            onChange={(e) => handleParamChange({ integrationMethod: e.target.value as ClothIntegrationMethod })}
            aria-label="Integration method"
            style={{
              width: '100%', padding: '4px 8px',
              background: theme.inputBg, border: `1px solid ${theme.border}`,
              borderRadius: 4, color: theme.text,
              fontSize: theme.fontSize, fontFamily: theme.monoFontFamily, outline: 'none',
            }}
          >
            <option value="verlet">Verlet Integration</option>
            <option value="pbd">Position Based Dynamics (PBD)</option>
            <option value="xpbd">Extended PBD (XPBD)</option>
          </select>
        </div>

        <Slider
          label="Timestep"
          value={displayState.params.timestep}
          min={0.001} max={0.05} step={0.001}
          onChange={(v) => handleParamChange({ timestep: v })}
          theme={theme} unit="s"
        />

        <Slider
          label="Damping"
          value={displayState.params.damping}
          min={0.9} max={1} step={0.001}
          onChange={(v) => handleParamChange({ damping: v })}
          theme={theme}
        />

        <Slider
          label="Mass"
          value={displayState.params.mass}
          min={0.01} max={10} step={0.01}
          onChange={(v) => handleParamChange({ mass: v })}
          theme={theme} unit="kg"
        />
      </div>

      {/* Stiffness */}
      <div style={{ marginBottom: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: theme.fontSize, fontWeight: 600, color: theme.text, marginBottom: 8 }}>
          Stiffness
        </div>

        <Slider
          label="Structural"
          value={displayState.params.structuralStiffness}
          min={0} max={1} step={0.01}
          onChange={(v) => handleParamChange({ structuralStiffness: v })}
          theme={theme}
        />

        <Slider
          label="Shear"
          value={displayState.params.shearStiffness}
          min={0} max={1} step={0.01}
          onChange={(v) => handleParamChange({ shearStiffness: v })}
          theme={theme}
        />

        <Slider
          label="Bend"
          value={displayState.params.bendStiffness}
          min={0} max={1} step={0.01}
          onChange={(v) => handleParamChange({ bendStiffness: v })}
          theme={theme}
        />
      </div>

      {/* Grid */}
      <div style={{ marginBottom: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: theme.fontSize, fontWeight: 600, color: theme.text, marginBottom: 8 }}>
          Grid
        </div>

        <Slider
          label="Width"
          value={displayState.params.gridWidth}
          min={4} max={128} step={1}
          onChange={(v) => handleParamChange({ gridWidth: v })}
          theme={theme}
          formatValue={(v) => `${v} vertices`}
        />

        <Slider
          label="Height"
          value={displayState.params.gridHeight}
          min={4} max={128} step={1}
          onChange={(v) => handleParamChange({ gridHeight: v })}
          theme={theme}
          formatValue={(v) => `${v} vertices`}
        />

        <label style={{
          display: 'flex', alignItems: 'center', gap: 6,
          cursor: 'pointer', fontSize: theme.fontSize - 1, color: theme.text,
        }}>
          <input
            type="checkbox"
            checked={displayState.params.selfCollision}
            onChange={() => handleParamChange({ selfCollision: !displayState.params.selfCollision })}
          />
          Self-Collision Detection
        </label>
      </div>

      {/* Wind */}
      <div style={{ marginBottom: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
        <div style={{ fontSize: theme.fontSize, fontWeight: 600, color: theme.text, marginBottom: 8 }}>
          Wind
        </div>

        <Vec3Slider
          label="Wind Force"
          value={displayState.params.windForce}
          onChange={(v) => { actions.setWindForce(v); onParamsChange?.({ windForce: v }); }}
          min={-10} max={10} step={0.1} theme={theme}
        />

        <Slider
          label="Turbulence Frequency"
          value={displayState.params.windTurbulence}
          min={0} max={10} step={0.1}
          onChange={(v) => handleParamChange({ windTurbulence: v })}
          theme={theme} unit="Hz"
        />

        <Slider
          label="Turbulence Amplitude"
          value={displayState.params.windTurbulenceAmplitude}
          min={0} max={2} step={0.01}
          onChange={(v) => handleParamChange({ windTurbulenceAmplitude: v })}
          theme={theme}
        />
      </div>

      {/* Gravity */}
      <div style={{ marginBottom: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
        <Vec3Slider
          label="Gravity"
          value={displayState.params.gravity}
          onChange={(v) => { actions.setGravity(v); onParamsChange?.({ gravity: v }); }}
          min={-20} max={20} step={0.1} theme={theme}
        />
      </div>

      {/* Pin Points */}
      <div style={{ paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 8,
        }}>
          <div style={{ fontSize: theme.fontSize, fontWeight: 600, color: theme.text }}>
            Pin Points ({displayState.params.pinPoints.filter((p) => p.enabled).length}/{displayState.params.pinPoints.length})
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => {
                const pin: PinPoint = {
                  vertexIndex: 0,
                  position: [0, 1, 0],
                  enabled: true,
                  label: `Pin ${displayState.params.pinPoints.length + 1}`,
                };
                actions.addPin(pin);
                onPinChange?.([...displayState.params.pinPoints, pin]);
              }}
              aria-label="Add pin point"
              style={{
                padding: '3px 8px', background: theme.inputBg,
                color: theme.accent, border: `1px solid ${theme.accent}40`,
                borderRadius: 3, cursor: 'pointer', fontSize: theme.fontSize - 1,
              }}
            >
              + Add
            </button>
            <button
              onClick={() => {
                actions.releaseAllPins();
                onPinChange?.(displayState.params.pinPoints.map((p) => ({ ...p, enabled: false })));
              }}
              aria-label="Release all pins"
              style={{
                padding: '3px 8px', background: theme.inputBg,
                color: theme.warning, border: `1px solid ${theme.warning}40`,
                borderRadius: 3, cursor: 'pointer', fontSize: theme.fontSize - 1,
              }}
            >
              Release All
            </button>
          </div>
        </div>

        {displayState.params.pinPoints.map((pin, i) => (
          <PinPointEditor
            key={i}
            pin={pin}
            index={i}
            onToggle={(idx) => {
              actions.togglePin(idx);
              const updated = displayState.params.pinPoints.map((p, j) =>
                j === idx ? { ...p, enabled: !p.enabled } : p
              );
              onPinChange?.(updated);
            }}
            onRemove={(idx) => {
              actions.removePin(idx);
              onPinChange?.(displayState.params.pinPoints.filter((_, j) => j !== idx));
            }}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
};
