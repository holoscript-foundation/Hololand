/**
 * Desktop UI Overlay
 *
 * The 2D UI that appears when in desktop mode.
 * Hidden when user enters VR.
 */

import type { SceneState, EnvironmentPreset } from '../types';

interface DesktopUIProps {
  sceneState: SceneState;
  onSceneStateChange: (updates: Partial<SceneState>) => void;
  isVRSupported: boolean;
  onEnterVR: () => void;
}

const ENVIRONMENT_PRESETS: { value: EnvironmentPreset; label: string }[] = [
  { value: 'sunset', label: 'Sunset' },
  { value: 'night', label: 'Night' },
  { value: 'studio', label: 'Studio' },
  { value: 'forest', label: 'Forest' },
  { value: 'space', label: 'Space' },
];

export function DesktopUI({
  sceneState,
  onSceneStateChange,
  isVRSupported,
  onEnterVR,
}: DesktopUIProps) {
  return (
    <div className="desktop-ui">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">P</div>
          <h1>Progressive VR</h1>
        </div>

        <div className={`vr-badge ${isVRSupported ? 'available' : 'unavailable'}`}>
          <span className="vr-badge-dot" />
          {isVRSupported ? 'VR Ready' : 'VR Not Available'}
        </div>
      </header>

      {/* Side Panel - Scene Controls */}
      <aside className="side-panel">
        <h2 className="panel-title">Scene Controls</h2>

        <div className="scene-controls">
          {/* Light Intensity */}
          <div className="control-group">
            <label className="control-label">Light Intensity</label>
            <input
              type="range"
              className="control-slider"
              min="0"
              max="2"
              step="0.1"
              value={sceneState.lightIntensity}
              onChange={(e) => onSceneStateChange({ lightIntensity: parseFloat(e.target.value) })}
            />
            <span className="control-value">{sceneState.lightIntensity.toFixed(1)}</span>
          </div>

          {/* Object Scale */}
          <div className="control-group">
            <label className="control-label">Object Scale</label>
            <input
              type="range"
              className="control-slider"
              min="0.5"
              max="2"
              step="0.1"
              value={sceneState.objectScale}
              onChange={(e) => onSceneStateChange({ objectScale: parseFloat(e.target.value) })}
            />
            <span className="control-value">{sceneState.objectScale.toFixed(1)}x</span>
          </div>

          {/* Rotation Speed */}
          <div className="control-group">
            <label className="control-label">Rotation Speed</label>
            <input
              type="range"
              className="control-slider"
              min="0"
              max="2"
              step="0.1"
              value={sceneState.rotationSpeed}
              onChange={(e) => onSceneStateChange({ rotationSpeed: parseFloat(e.target.value) })}
            />
            <span className="control-value">{sceneState.rotationSpeed.toFixed(1)}</span>
          </div>

          {/* Environment Preset */}
          <div className="control-group">
            <label className="control-label">Environment</label>
            <select
              className="control-slider"
              style={{ height: 'auto', padding: '0.5rem' }}
              value={sceneState.environmentPreset}
              onChange={(e) => onSceneStateChange({ environmentPreset: e.target.value as EnvironmentPreset })}
            >
              {ENVIRONMENT_PRESETS.map(preset => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {/* Audio Toggle */}
          <div className="control-group">
            <label className="control-label">Spatial Audio</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sceneState.audioEnabled}
                onChange={(e) => onSceneStateChange({ audioEnabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#7c3aed' }}
              />
              <span style={{ fontSize: '0.875rem' }}>
                {sceneState.audioEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>
      </aside>

      {/* Info Panel */}
      <div className="info-panel">
        <h3>Progressive Enhancement</h3>
        <p>
          This demo starts in desktop mode with full 2D controls.
          {isVRSupported
            ? ' Click the VR button or press Ctrl+V to enter immersive VR mode.'
            : ' Connect a VR headset to enable immersive mode.'}
        </p>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-item">
          <span className={`status-icon ${sceneState.audioEnabled ? 'active' : 'inactive'}`} />
          <span>Audio</span>
        </div>
        <div className="status-item">
          <span className="status-icon active" />
          <span>Desktop Mode</span>
        </div>
        <div className="status-item">
          <span className={`status-icon ${isVRSupported ? 'active' : 'inactive'}`} />
          <span>VR</span>
        </div>
      </div>

      {/* VR Enter Button */}
      <button
        className="vr-button"
        onClick={onEnterVR}
        disabled={!isVRSupported}
        title={isVRSupported ? 'Enter VR Mode (Ctrl+V)' : 'VR headset not detected'}
      >
        <span className="vr-button-icon">🥽</span>
        <span>{isVRSupported ? 'Enter VR' : 'VR Unavailable'}</span>
      </button>
    </div>
  );
}
