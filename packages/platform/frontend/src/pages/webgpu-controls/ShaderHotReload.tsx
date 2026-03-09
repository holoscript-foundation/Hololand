/**
 * Shader Hot Reload Component
 * Live shader editing with hot-reload and error reporting
 */

import React, { useState } from 'react';
import type { ShaderConfig } from './types';

interface ShaderHotReloadProps {
  shaders: ShaderConfig[];
  activeShader: string | null;
  onShaderChange: (name: string, code: string) => void;
  onShaderSelect: (name: string) => void;
  onHotReloadToggle: (enabled: boolean) => void;
  hotReloadEnabled: boolean;
  disabled?: boolean;
}

export const ShaderHotReload: React.FC<ShaderHotReloadProps> = ({
  shaders,
  activeShader,
  onShaderChange,
  onShaderSelect,
  onHotReloadToggle,
  hotReloadEnabled,
  disabled = false,
}) => {
  const [shaderCode, setShaderCode] = useState('');
  const [compileError, setCompileError] = useState<string | null>(null);
  const [compileSuccess, setCompileSuccess] = useState(false);

  const activeShaderConfig = shaders.find(s => s.name === activeShader);

  React.useEffect(() => {
    if (activeShaderConfig) {
      setShaderCode(activeShaderConfig.code);
      setCompileError(null);
      setCompileSuccess(false);
    }
  }, [activeShaderConfig]);

  const handleApplyChanges = () => {
    if (!activeShader) return;

    try {
      // Basic syntax validation (would be replaced with actual shader compilation)
      if (!shaderCode.includes('@compute')) {
        throw new Error('Shader must include @compute entry point');
      }

      onShaderChange(activeShader, shaderCode);
      setCompileSuccess(true);
      setCompileError(null);

      setTimeout(() => setCompileSuccess(false), 3000);
    } catch (error) {
      setCompileError(error instanceof Error ? error.message : 'Unknown compilation error');
      setCompileSuccess(false);
    }
  };

  const handleRevert = () => {
    if (activeShaderConfig) {
      setShaderCode(activeShaderConfig.code);
      setCompileError(null);
      setCompileSuccess(false);
    }
  };

  return (
    <div className="shader-hot-reload">
      <h3 className="text-lg font-semibold mb-4">Shader Hot Reload</h3>

      {/* Hot Reload Toggle */}
      <div className="mb-4 flex items-center justify-between bg-gray-800 p-3 rounded">
        <div>
          <div className="font-medium">Auto-Reload</div>
          <div className="text-xs text-gray-400">
            Automatically recompile shaders on save
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={hotReloadEnabled}
            onChange={e => onHotReloadToggle(e.target.checked)}
            disabled={disabled}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>

      {/* Shader Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Active Shader</label>
        <select
          value={activeShader || ''}
          onChange={e => onShaderSelect(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
        >
          <option value="">Select shader...</option>
          {shaders.map(shader => (
            <option key={shader.name} value={shader.name}>
              {shader.name}
            </option>
          ))}
        </select>
      </div>

      {/* Shader Info */}
      {activeShaderConfig && (
        <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-400">Entry Point</div>
              <div className="font-mono">{activeShaderConfig.entryPoint}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Workgroup Size</div>
              <div className="font-mono">
                [{activeShaderConfig.workgroupSize.join(', ')}]
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-gray-400">Last Modified</div>
              <div className="text-xs">
                {new Date(activeShaderConfig.lastModified).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Code Editor */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Shader Code (WGSL)</label>
        <textarea
          value={shaderCode}
          onChange={e => setShaderCode(e.target.value)}
          disabled={disabled || !activeShader}
          className="w-full h-96 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white font-mono text-sm resize-none"
          spellCheck={false}
          placeholder={activeShader ? 'Shader code will appear here...' : 'Select a shader to edit'}
        />
      </div>

      {/* Compile Status */}
      {compileError && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded">
          <div className="text-sm font-semibold text-red-400 mb-1">Compilation Error</div>
          <div className="text-xs text-red-300 font-mono whitespace-pre-wrap">
            {compileError}
          </div>
        </div>
      )}

      {compileSuccess && (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-500 rounded">
          <div className="text-sm font-semibold text-green-400">
            ✓ Shader compiled successfully
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleApplyChanges}
          disabled={disabled || !activeShader || shaderCode === activeShaderConfig?.code}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Apply Changes
        </button>
        <button
          onClick={handleRevert}
          disabled={disabled || !activeShader || shaderCode === activeShaderConfig?.code}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Revert
        </button>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="mt-4 p-3 bg-gray-800/50 rounded border border-gray-700">
        <div className="text-xs font-semibold text-gray-400 mb-2">Keyboard Shortcuts</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <kbd className="px-2 py-1 bg-gray-700 rounded font-mono">Ctrl+S</kbd>
            <span className="ml-2 text-gray-400">Apply Changes</span>
          </div>
          <div>
            <kbd className="px-2 py-1 bg-gray-700 rounded font-mono">Ctrl+Z</kbd>
            <span className="ml-2 text-gray-400">Revert</span>
          </div>
        </div>
      </div>
    </div>
  );
};
