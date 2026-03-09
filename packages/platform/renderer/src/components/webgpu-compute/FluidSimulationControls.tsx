/**
 * FluidSimulationControls
 *
 * Controls for WebGPU fluid simulation parameters including viscosity,
 * timestep, grid resolution, solver type, and velocity field visualization.
 *
 * Provides sliders, dropdowns, and toggle controls for real-time
 * parameter adjustment of GPU compute-based fluid dynamics.
 *
 * @module webgpu-compute/FluidSimulationControls
 */

import React, { useCallback } from 'react';
import type {
  FluidSimulationControlsProps,
  FluidSimulationParams,
  VelocityFieldDisplay,
  FluidSolverType,
  BoundaryCondition,
  WebGPUComputeTheme,
} from './types';
import {
  DEFAULT_WEBGPU_COMPUTE_THEME,
  DEFAULT_FLUID_PARAMS,
  VELOCITY_FIELD_LABELS,
} from './types';
import { useFluidSimulation } from './useWebGPUCompute';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface SliderControlProps {
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

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  theme,
  unit = '',
  formatValue,
}) => (
  <div style={{ marginBottom: 8 }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 3,
        fontSize: theme.fontSize - 1,
      }}
    >
      <span style={{ color: theme.textSecondary }}>{label}</span>
      <span style={{ color: theme.text, fontFamily: theme.monoFontFamily }}>
        {formatValue ? formatValue(value) : value.toFixed(step < 1 ? Math.max(0, -Math.floor(Math.log10(step))) : 0)}
        {unit && <span style={{ color: theme.textSecondary, marginLeft: 2 }}>{unit}</span>}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={label}
      style={{
        width: '100%',
        accentColor: theme.accent,
        cursor: 'pointer',
      }}
    />
  </div>
);

interface SelectControlProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  theme: WebGPUComputeTheme;
}

function SelectControl<T extends string>({
  label,
  value,
  options,
  onChange,
  theme,
}: SelectControlProps<T>) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label
        style={{
          display: 'block',
          fontSize: theme.fontSize - 1,
          color: theme.textSecondary,
          marginBottom: 3,
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={label}
        style={{
          width: '100%',
          padding: '4px 8px',
          background: theme.inputBg,
          border: `1px solid ${theme.border}`,
          borderRadius: 4,
          color: theme.text,
          fontSize: theme.fontSize,
          fontFamily: theme.monoFontFamily,
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface StatDisplayProps {
  label: string;
  value: string;
  color?: string;
  theme: WebGPUComputeTheme;
}

const StatDisplay: React.FC<StatDisplayProps> = ({ label, value, color, theme }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '3px 0',
      fontSize: theme.fontSize - 1,
    }}
  >
    <span style={{ color: theme.textSecondary }}>{label}</span>
    <span style={{ color: color ?? theme.text, fontFamily: theme.monoFontFamily, fontWeight: 600 }}>
      {value}
    </span>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * FluidSimulationControls
 *
 * Provides interactive controls for WebGPU fluid simulation parameters.
 * Includes sliders for viscosity, timestep, and grid resolution; dropdowns
 * for solver type, boundary conditions, and velocity field visualization;
 * and transport controls for play/pause/step/reset.
 *
 * @example
 * ```tsx
 * <FluidSimulationControls
 *   onParamsChange={(params) => gpuFluidSim.setParams(params)}
 *   onStart={() => gpuFluidSim.start()}
 *   onPause={() => gpuFluidSim.pause()}
 *   visible={true}
 * />
 * ```
 */
export const FluidSimulationControls: React.FC<FluidSimulationControlsProps> = ({
  simulationState: externalState,
  onParamsChange,
  onStart,
  onPause,
  onReset,
  onVelocityFieldDisplayChange,
  className,
  visible = true,
}) => {
  const theme = DEFAULT_WEBGPU_COMPUTE_THEME;

  const { state, actions } = useFluidSimulation({
    initialParams: externalState?.params,
  });

  const displayState = {
    ...state,
    ...externalState,
    params: { ...state.params, ...externalState?.params },
  };

  const handleParamChange = useCallback(
    (updates: Partial<FluidSimulationParams>) => {
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
      aria-label="Fluid Simulation Controls"
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        padding: 12,
        fontFamily: theme.fontFamily,
        color: theme.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          paddingBottom: 8,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: theme.fontSize + 2,
            fontWeight: 700,
            color: theme.info,
            fontFamily: theme.monoFontFamily,
          }}
        >
          Fluid Simulation
        </h3>
        <span
          style={{
            fontSize: theme.fontSize - 1,
            color: displayState.running ? theme.success : theme.textSecondary,
            fontFamily: theme.monoFontFamily,
          }}
        >
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
            flex: 1,
            padding: '6px 12px',
            background: displayState.running ? theme.warning : theme.success,
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: theme.monoFontFamily,
            fontSize: theme.fontSize,
            fontWeight: 600,
          }}
        >
          {displayState.running ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => {
            actions.stepForward();
          }}
          disabled={displayState.running}
          aria-label="Step forward one frame"
          style={{
            padding: '6px 12px',
            background: theme.inputBg,
            color: displayState.running ? theme.textSecondary : theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: 4,
            cursor: displayState.running ? 'not-allowed' : 'pointer',
            fontFamily: theme.monoFontFamily,
            fontSize: theme.fontSize,
          }}
        >
          Step
        </button>
        <button
          onClick={() => {
            actions.reset();
            onReset?.();
          }}
          aria-label="Reset simulation"
          style={{
            padding: '6px 12px',
            background: theme.inputBg,
            color: theme.text,
            border: `1px solid ${theme.border}`,
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: theme.monoFontFamily,
            fontSize: theme.fontSize,
          }}
        >
          Reset
        </button>
      </div>

      {/* Statistics */}
      <div
        style={{
          marginBottom: 12,
          padding: 8,
          background: theme.panelBg,
          borderRadius: 6,
          border: `1px solid ${theme.border}`,
        }}
      >
        <StatDisplay label="Step" value={displayState.step.toLocaleString()} theme={theme} />
        <StatDisplay label="Time" value={`${displayState.elapsedTime.toFixed(3)}s`} theme={theme} />
        <StatDisplay
          label="Steps/sec"
          value={displayState.stepsPerSecond.toFixed(1)}
          color={displayState.stepsPerSecond > 60 ? theme.success : theme.warning}
          theme={theme}
        />
        <StatDisplay label="Max Velocity" value={displayState.maxVelocity.toFixed(3)} theme={theme} />
        <StatDisplay label="Avg Pressure" value={displayState.avgPressure.toFixed(3)} theme={theme} />
        <StatDisplay label="Kinetic Energy" value={displayState.kineticEnergy.toFixed(4)} theme={theme} />
        <StatDisplay label="GPU Buffers" value={formatBytes(displayState.gpuBufferUsage)} theme={theme} />
      </div>

      {/* Simulation Parameters */}
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: theme.fontSize,
            fontWeight: 600,
            color: theme.text,
            marginBottom: 8,
          }}
        >
          Parameters
        </div>

        <SliderControl
          label="Viscosity"
          value={displayState.params.viscosity}
          min={0.0001}
          max={0.1}
          step={0.0001}
          onChange={(v) => handleParamChange({ viscosity: v })}
          theme={theme}
        />

        <SliderControl
          label="Timestep"
          value={displayState.params.timestep}
          min={0.001}
          max={0.1}
          step={0.001}
          onChange={(v) => handleParamChange({ timestep: v })}
          theme={theme}
          unit="s"
        />

        <SliderControl
          label="Grid Resolution"
          value={displayState.params.gridResolution}
          min={16}
          max={512}
          step={16}
          onChange={(v) => handleParamChange({ gridResolution: v })}
          theme={theme}
          formatValue={(v) => `${v}x${v}`}
        />

        <SliderControl
          label="Density"
          value={displayState.params.density}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => handleParamChange({ density: v })}
          theme={theme}
        />

        <SliderControl
          label="Diffusion"
          value={displayState.params.diffusion}
          min={0}
          max={0.01}
          step={0.0001}
          onChange={(v) => handleParamChange({ diffusion: v })}
          theme={theme}
        />

        <SliderControl
          label="Pressure Iterations"
          value={displayState.params.pressureIterations}
          min={1}
          max={100}
          step={1}
          onChange={(v) => handleParamChange({ pressureIterations: v })}
          theme={theme}
        />

        <SliderControl
          label="Vorticity Confinement"
          value={displayState.params.vorticityConfinement}
          min={0}
          max={2}
          step={0.05}
          onChange={(v) => handleParamChange({ vorticityConfinement: v })}
          theme={theme}
        />
      </div>

      {/* Solver & Boundary */}
      <SelectControl
        label="Solver Type"
        value={displayState.params.solverType}
        options={[
          { value: 'euler' as FluidSolverType, label: 'Euler' },
          { value: 'navier-stokes' as FluidSolverType, label: 'Navier-Stokes' },
          { value: 'lattice-boltzmann' as FluidSolverType, label: 'Lattice Boltzmann' },
          { value: 'sph' as FluidSolverType, label: 'SPH' },
        ]}
        onChange={(v) => handleParamChange({ solverType: v })}
        theme={theme}
      />

      <SelectControl
        label="Boundary Condition"
        value={displayState.params.boundaryCondition}
        options={[
          { value: 'no-slip' as BoundaryCondition, label: 'No-Slip' },
          { value: 'free-slip' as BoundaryCondition, label: 'Free-Slip' },
          { value: 'periodic' as BoundaryCondition, label: 'Periodic' },
          { value: 'open' as BoundaryCondition, label: 'Open' },
        ]}
        onChange={(v) => handleParamChange({ boundaryCondition: v })}
        theme={theme}
      />

      <SelectControl
        label="Dimensions"
        value={String(displayState.params.dimensions) as '2' | '3'}
        options={[
          { value: '2', label: '2D' },
          { value: '3', label: '3D' },
        ]}
        onChange={(v) => handleParamChange({ dimensions: Number(v) as 2 | 3 })}
        theme={theme}
      />

      {/* Velocity Field Visualization */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 8,
          borderTop: `1px solid ${theme.border}`,
        }}
      >
        <div
          style={{
            fontSize: theme.fontSize,
            fontWeight: 600,
            color: theme.text,
            marginBottom: 8,
          }}
        >
          Velocity Field Display
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {(Object.entries(VELOCITY_FIELD_LABELS) as [VelocityFieldDisplay, string][]).map(
            ([mode, label]) => (
              <button
                key={mode}
                onClick={() => {
                  actions.setVelocityFieldDisplay(mode);
                  onVelocityFieldDisplayChange?.(mode);
                }}
                aria-label={`Set velocity display to ${label}`}
                aria-pressed={displayState.velocityFieldDisplay === mode}
                style={{
                  padding: '4px 8px',
                  background:
                    displayState.velocityFieldDisplay === mode
                      ? theme.accent + '30'
                      : theme.inputBg,
                  color:
                    displayState.velocityFieldDisplay === mode
                      ? theme.accent
                      : theme.textSecondary,
                  border: `1px solid ${
                    displayState.velocityFieldDisplay === mode
                      ? theme.accent
                      : theme.border
                  }`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: theme.fontSize - 1,
                  fontFamily: theme.monoFontFamily,
                  textAlign: 'left',
                }}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Gravity */}
      <div style={{ marginTop: 12, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
        <div
          style={{
            fontSize: theme.fontSize,
            fontWeight: 600,
            color: theme.text,
            marginBottom: 8,
          }}
        >
          Gravity
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['X', 'Y', 'Z'] as const).map((axis, i) => (
            <SliderControl
              key={axis}
              label={axis}
              value={displayState.params.gravity[i]}
              min={-20}
              max={20}
              step={0.1}
              onChange={(v) => {
                const newGravity: [number, number, number] = [...displayState.params.gravity] as [
                  number,
                  number,
                  number,
                ];
                newGravity[i] = v;
                handleParamChange({ gravity: newGravity });
              }}
              theme={theme}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
