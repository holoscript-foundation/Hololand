/**
 * Fluid Simulation Controls Component
 * Real-time parameter controls for WebGPU fluid simulation
 */

import React from 'react';
import type { FluidSimulationParams } from './types';
import { FLUID_PRESETS } from './defaults';

interface FluidControlsProps {
  params: FluidSimulationParams;
  onParamsChange: (params: FluidSimulationParams) => void;
  disabled?: boolean;
}

export const FluidControls: React.FC<FluidControlsProps> = ({
  params,
  onParamsChange,
  disabled = false,
}) => {
  const handleChange = (field: keyof FluidSimulationParams, value: number) => {
    onParamsChange({ ...params, [field]: value });
  };

  const loadPreset = (presetName: string) => {
    const preset = FLUID_PRESETS.find(p => p.name === presetName);
    if (preset) {
      onParamsChange(preset.params as FluidSimulationParams);
    }
  };

  return (
    <div className="fluid-controls">
      <h3 className="text-lg font-semibold mb-4">Fluid Simulation Parameters</h3>

      {/* Presets */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Presets</label>
        <div className="flex flex-wrap gap-2">
          {FLUID_PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset.name)}
              disabled={disabled}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50"
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Viscosity */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Viscosity: {params.viscosity.toFixed(3)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={params.viscosity}
          onChange={e => handleChange('viscosity', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Fluid resistance to flow (0 = water, 1 = honey)
        </p>
      </div>

      {/* Pressure */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Pressure: {params.pressure.toFixed(3)}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.01"
          value={params.pressure}
          onChange={e => handleChange('pressure', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Internal fluid pressure (affects expansion)
        </p>
      </div>

      {/* Velocity Damping */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Velocity Damping: {params.velocityDamping.toFixed(3)}
        </label>
        <input
          type="range"
          min="0.9"
          max="1"
          step="0.001"
          value={params.velocityDamping}
          onChange={e => handleChange('velocityDamping', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Velocity decay per frame (1 = no decay)
        </p>
      </div>

      {/* Grid Size */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Grid Size: {params.gridSize}
        </label>
        <input
          type="range"
          min="32"
          max="512"
          step="32"
          value={params.gridSize}
          onChange={e => handleChange('gridSize', parseInt(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Simulation resolution (higher = more detail, slower)
        </p>
      </div>

      {/* Timestep */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Timestep: {params.timestep.toFixed(4)}
        </label>
        <input
          type="range"
          min="0.001"
          max="0.1"
          step="0.001"
          value={params.timestep}
          onChange={e => handleChange('timestep', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Time advancement per frame (lower = more stable)
        </p>
      </div>

      {/* Diffusion */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Diffusion: {params.diffusion.toFixed(3)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={params.diffusion}
          onChange={e => handleChange('diffusion', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Rate of color/density spreading (0 = none)
        </p>
      </div>

      {/* Curl Strength */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Curl Strength: {params.curlStrength.toFixed(3)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={params.curlStrength}
          onChange={e => handleChange('curlStrength', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Vorticity confinement (creates swirls)
        </p>
      </div>

      {/* Splat Radius */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Splat Radius: {params.splatRadius.toFixed(4)}
        </label>
        <input
          type="range"
          min="0.001"
          max="0.1"
          step="0.001"
          value={params.splatRadius}
          onChange={e => handleChange('splatRadius', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Size of user interaction splats
        </p>
      </div>
    </div>
  );
};
