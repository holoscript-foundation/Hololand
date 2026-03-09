/**
 * Particle System Controls Component
 * Real-time parameter controls for WebGPU particle simulation
 */

import React from 'react';
import type { ParticleSystemParams } from './types';
import { PARTICLE_PRESETS } from './defaults';

interface ParticleControlsProps {
  params: ParticleSystemParams;
  onParamsChange: (params: ParticleSystemParams) => void;
  disabled?: boolean;
}

export const ParticleControls: React.FC<ParticleControlsProps> = ({
  params,
  onParamsChange,
  disabled = false,
}) => {
  const handleChange = (field: keyof ParticleSystemParams, value: number | string | [number, number, number]) => {
    onParamsChange({ ...params, [field]: value });
  };

  const loadPreset = (presetName: string) => {
    const preset = PARTICLE_PRESETS.find(p => p.name === presetName);
    if (preset) {
      onParamsChange(preset.params as ParticleSystemParams);
    }
  };

  return (
    <div className="particle-controls">
      <h3 className="text-lg font-semibold mb-4">Particle System Parameters</h3>

      {/* Presets */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Presets</label>
        <div className="flex flex-wrap gap-2">
          {PARTICLE_PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => loadPreset(preset.name)}
              disabled={disabled}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm disabled:opacity-50"
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Particle Count */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Particle Count: {params.count.toLocaleString()}
        </label>
        <input
          type="range"
          min="1000"
          max="1000000"
          step="1000"
          value={params.count}
          onChange={e => handleChange('count', parseInt(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Total number of particles (higher = more GPU load)
        </p>
      </div>

      {/* Particle Size */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Particle Size: {params.size.toFixed(2)}
        </label>
        <input
          type="range"
          min="0.1"
          max="10"
          step="0.1"
          value={params.size}
          onChange={e => handleChange('size', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Base particle size in pixels
        </p>
      </div>

      {/* Lifetime */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Lifetime: {params.lifetime.toFixed(2)}s
        </label>
        <input
          type="range"
          min="0.5"
          max="10"
          step="0.1"
          value={params.lifetime}
          onChange={e => handleChange('lifetime', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          How long each particle lives (seconds)
        </p>
      </div>

      {/* Spawn Rate */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Spawn Rate: {params.spawnRate.toLocaleString()}/s
        </label>
        <input
          type="range"
          min="10"
          max="10000"
          step="10"
          value={params.spawnRate}
          onChange={e => handleChange('spawnRate', parseInt(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Particles spawned per second
        </p>
      </div>

      {/* Gravity */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Gravity</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-400">X</label>
            <input
              type="number"
              value={params.gravity[0]}
              onChange={e => handleChange('gravity', [parseFloat(e.target.value), params.gravity[1], params.gravity[2]])}
              disabled={disabled}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
              step="0.1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Y</label>
            <input
              type="number"
              value={params.gravity[1]}
              onChange={e => handleChange('gravity', [params.gravity[0], parseFloat(e.target.value), params.gravity[2]])}
              disabled={disabled}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
              step="0.1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Z</label>
            <input
              type="number"
              value={params.gravity[2]}
              onChange={e => handleChange('gravity', [params.gravity[0], params.gravity[1], parseFloat(e.target.value)])}
              disabled={disabled}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
              step="0.1"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Gravity force vector (m/s²)
        </p>
      </div>

      {/* Wind */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Wind</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-400">X</label>
            <input
              type="number"
              value={params.wind[0]}
              onChange={e => handleChange('wind', [parseFloat(e.target.value), params.wind[1], params.wind[2]])}
              disabled={disabled}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
              step="0.1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Y</label>
            <input
              type="number"
              value={params.wind[1]}
              onChange={e => handleChange('wind', [params.wind[0], parseFloat(e.target.value), params.wind[2]])}
              disabled={disabled}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
              step="0.1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Z</label>
            <input
              type="number"
              value={params.wind[2]}
              onChange={e => handleChange('wind', [params.wind[0], params.wind[1], parseFloat(e.target.value)])}
              disabled={disabled}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
              step="0.1"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Constant wind force vector
        </p>
      </div>

      {/* Turbulence */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Turbulence: {params.turbulence.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={params.turbulence}
          onChange={e => handleChange('turbulence', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Random motion strength
        </p>
      </div>

      {/* Attraction */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Attraction: {params.attraction.toFixed(2)}
        </label>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={params.attraction}
          onChange={e => handleChange('attraction', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Force toward/away from center (- = repulsion, + = attraction)
        </p>
      </div>

      {/* Color Gradient */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Color Gradient</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400">Start</label>
            <input
              type="color"
              value={params.colorStart}
              onChange={e => handleChange('colorStart', e.target.value)}
              disabled={disabled}
              className="w-full h-10 rounded cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">End</label>
            <input
              type="color"
              value={params.colorEnd}
              onChange={e => handleChange('colorEnd', e.target.value)}
              disabled={disabled}
              className="w-full h-10 rounded cursor-pointer"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Color interpolation over particle lifetime
        </p>
      </div>

      {/* Size Decay */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Size Decay: {params.sizeDecay.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={params.sizeDecay}
          onChange={e => handleChange('sizeDecay', parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full"
        />
        <p className="text-xs text-gray-400 mt-1">
          Size multiplier per frame (1 = no decay, 0 = instant shrink)
        </p>
      </div>
    </div>
  );
};
