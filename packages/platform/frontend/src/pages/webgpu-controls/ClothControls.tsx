/**
 * Cloth Physics Controls Component
 * Real-time parameter controls for WebGPU cloth simulation
 */

import React from 'react';
import type { ClothPhysicsParams } from './types';
import { CLOTH_PRESETS } from './defaults';

interface ClothControlsProps {
  params: ClothPhysicsParams;
  onParamsChange: (params: ClothPhysicsParams) => void;
  disabled?: boolean;
}

export const ClothControls: React.FC<ClothControlsProps> = ({
  params,
  onParamsChange,
  disabled = false,
}) => {
  const handleChange = (field: keyof ClothPhysicsParams, value: number | [number, number, number]) => {
    onParamsChange({ ...params, [field]: value });
  };

  const loadPreset = (presetName: string) => {
    const preset = CLOTH_PRESETS.find(p => p.name === presetName);
    if (preset) {
      onParamsChange(preset.params as ClothPhysicsParams);
    }
  };

  return (
    <div className="cloth-controls">
      <h3 className="text-lg font-semibold mb-4">Cloth Physics Parameters</h3>

      {/* Presets */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Presets</label>
        <div className="flex flex-wrap gap-2">
          {CLOTH_PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset.name)}
              disabled={disabled}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stiffness */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Stiffness: {params.stiffness.toFixed(2)}
        </label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.01"
          value={params.stiffness}
          onChange={e => handleChange('stiffness', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Material stiffness (0.1 = silk, 1.0 = canvas)
        </p>
      </div>

      {/* Damping */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Damping: {params.damping.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={params.damping}
          onChange={e => handleChange('damping', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Velocity damping (0 = bouncy, 1 = heavy damping)
        </p>
      </div>

      {/* Mass */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Mass: {params.mass.toFixed(2)}
        </label>
        <input
          type="range"
          min="0.1"
          max="10"
          step="0.1"
          value={params.mass}
          onChange={e => handleChange('mass', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Cloth mass per particle (affects inertia)
        </p>
      </div>

      {/* Wind Strength */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Wind Strength: {params.windStrength.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="10"
          step="0.1"
          value={params.windStrength}
          onChange={e => handleChange('windStrength', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Wind force magnitude
        </p>
      </div>

      {/* Wind Direction */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Wind Direction</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-400">X</label>
            <input
              type="number"
              value={params.windDirection[0]}
              onChange={e => handleChange('windDirection', [parseFloat(e.target.value), params.windDirection[1], params.windDirection[2]])}
              disabled={disabled}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
              step="0.1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Y</label>
            <input
              type="number"
              value={params.windDirection[1]}
              onChange={e => handleChange('windDirection', [params.windDirection[0], parseFloat(e.target.value), params.windDirection[2]])}
              disabled={disabled}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
              step="0.1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Z</label>
            <input
              type="number"
              value={params.windDirection[2]}
              onChange={e => handleChange('windDirection', [params.windDirection[0], params.windDirection[1], parseFloat(e.target.value)])}
              disabled={disabled}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
              step="0.1"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Normalized wind direction vector
        </p>
      </div>

      {/* Grid Resolution */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Grid Resolution: {params.gridResolution}x{params.gridResolution}
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={params.gridResolution}
          onChange={e => handleChange('gridResolution', parseInt(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Cloth mesh detail (higher = more accurate, slower)
        </p>
      </div>

      {/* Solver Iterations */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Solver Iterations: {params.iterations}
        </label>
        <input
          type="range"
          min="1"
          max="20"
          step="1"
          value={params.iterations}
          onChange={e => handleChange('iterations', parseInt(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Constraint solver iterations (higher = more stable)
        </p>
      </div>

      {/* Gravity */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Gravity: {params.gravity.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="20"
          step="0.1"
          value={params.gravity}
          onChange={e => handleChange('gravity', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Gravity acceleration (m/s²)
        </p>
      </div>

      {/* Tear Threshold */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Tear Threshold: {params.tearThreshold.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="10"
          step="0.1"
          value={params.tearThreshold}
          onChange={e => handleChange('tearThreshold', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Maximum stretch before tearing (0 = no tearing)
        </p>
      </div>
    </div>
  );
};
