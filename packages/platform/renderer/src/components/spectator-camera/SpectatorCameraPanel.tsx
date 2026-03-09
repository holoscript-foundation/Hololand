/**
 * SpectatorCameraPanel
 *
 * React component providing a full UI for the spectator camera system.
 * Includes camera mode controls, capture button, resolution/format settings,
 * cinematic playback controls, capture history gallery, and performance metrics.
 *
 * LAYOUT:
 * ```
 * +---------------------------------------+
 * |  SPECTATOR CAMERA          [collapse] |
 * +---------------------------------------+
 * |  Mode: [Orbit] [Fly] [Cinematic]      |
 * +---------------------------------------+
 * |  Camera Controls                      |
 * |  Position: x, y, z                    |
 * |  Target:   x, y, z                    |
 * |  FOV:      [slider 10-120]            |
 * |  [Reset Camera]                       |
 * +---------------------------------------+
 * |  Capture Settings                     |
 * |  Format:     [PNG|JPEG|WebP]          |
 * |  Resolution: [720p|1080p|1440p|4K]    |
 * |  Quality:    [slider 0-1]             |
 * |                                       |
 * |       [ CAPTURE SCENE ]               |
 * +---------------------------------------+
 * |  Cinematic Controls (if cinematic)    |
 * |  [Play] [Pause] [Stop]               |
 * |  Speed: [slider]                      |
 * |  Progress: ====|===== 45%            |
 * |  Waypoints: 3 | Loop: ON             |
 * +---------------------------------------+
 * |  Capture History (thumbnails)         |
 * |  [img] [img] [img] [img]             |
 * |  [Clear History]                      |
 * +---------------------------------------+
 * |  Performance                          |
 * |  FPS: 30 | Frame: 33.3ms             |
 * |  Captures: 5 | Memory: 12.4MB        |
 * +---------------------------------------+
 * ```
 *
 * @module spectator-camera/SpectatorCameraPanel
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useSpectatorCamera } from './useSpectatorCamera';

import type {
  SpectatorCameraPanelProps,
  SpectatorCameraMode,
  SpectatorCameraTheme,
  CaptureFormat,
  CaptureResolutionPreset,
} from './types';

import {
  DEFAULT_SPECTATOR_THEME,
  CAMERA_MODE_LABELS,
  CAMERA_MODE_DESCRIPTIONS,
  CAPTURE_RESOLUTION_PRESETS,
} from './types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatVec3(v: [number, number, number]): string {
  return `${v[0].toFixed(1)}, ${v[1].toFixed(1)}, ${v[2].toFixed(1)}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const SpectatorCameraPanel: React.FC<SpectatorCameraPanelProps> = ({
  getCanvas,
  initialCamera,
  initialCaptureConfig,
  orbitConfig,
  flyConfig,
  cinematicConfig,
  collapsed: initialCollapsed = false,
  className,
  style,
  theme: themeOverride,
  onCapture,
  onCameraChange,
  maxHistorySize = 20,
}) => {
  const theme: SpectatorCameraTheme = useMemo(
    () => ({ ...DEFAULT_SPECTATOR_THEME, ...themeOverride }),
    [themeOverride],
  );

  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isCapturing, setIsCapturing] = useState(false);

  const { state, actions } = useSpectatorCamera({
    initialCamera,
    captureConfig: initialCaptureConfig,
    orbitConfig,
    flyConfig,
    cinematicConfig,
    maxHistory: maxHistorySize,
  });

  // Notify parent of camera changes
  React.useEffect(() => {
    if (onCameraChange) {
      onCameraChange(state.camera);
    }
  }, [state.camera, onCameraChange]);

  // Handle capture
  const handleCapture = useCallback(async () => {
    const canvas = getCanvas?.();
    if (!canvas) return;

    setIsCapturing(true);
    try {
      const result = await actions.capture(canvas);
      onCapture?.(result);
    } catch {
      // Error is already set in hook state
    } finally {
      setIsCapturing(false);
    }
  }, [getCanvas, actions, onCapture]);

  // Styles
  const containerStyle: React.CSSProperties = {
    width: theme.panelWidth,
    backgroundColor: theme.bg,
    color: theme.text,
    fontFamily: theme.fontFamily,
    fontSize: theme.fontSize,
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    overflow: 'hidden',
    userSelect: 'none',
    ...style,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: theme.panelBg,
    borderBottom: `1px solid ${theme.border}`,
    cursor: 'pointer',
  };

  const sectionStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderBottom: `1px solid ${theme.border}`,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: theme.fontSize + 1,
    fontWeight: 600,
    marginBottom: 8,
    color: theme.text,
  };

  const buttonStyle = (active: boolean = false): React.CSSProperties => ({
    padding: '4px 10px',
    border: `1px solid ${active ? theme.accent : theme.border}`,
    borderRadius: 4,
    backgroundColor: active ? theme.accent : theme.buttonBg,
    color: active ? '#ffffff' : theme.text,
    cursor: 'pointer',
    fontSize: theme.fontSize,
    fontFamily: theme.fontFamily,
    transition: 'all 0.15s ease',
  });

  const captureButtonStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '10px 0',
    border: 'none',
    borderRadius: 6,
    backgroundColor: isCapturing ? theme.warning : theme.captureAccent,
    color: '#ffffff',
    cursor: isCapturing ? 'wait' : 'pointer',
    fontSize: theme.fontSize + 2,
    fontWeight: 700,
    fontFamily: theme.fontFamily,
    marginTop: 10,
    transition: 'all 0.2s ease',
    letterSpacing: 1,
  };

  const labelStyle: React.CSSProperties = {
    color: theme.textSecondary,
    fontSize: theme.fontSize - 1,
    marginBottom: 3,
  };

  const valueStyle: React.CSSProperties = {
    color: theme.text,
    fontFamily: theme.fontFamily,
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  };

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: theme.accent,
  };

  if (isCollapsed) {
    return (
      <div style={containerStyle} className={className}>
        <div style={headerStyle} onClick={() => setIsCollapsed(false)}>
          <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>SPECTATOR CAMERA</span>
          <span style={{ color: theme.textSecondary }}>+</span>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} className={className}>
      {/* Header */}
      <div style={headerStyle} onClick={() => setIsCollapsed(true)}>
        <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>SPECTATOR CAMERA</span>
        <span style={{ color: theme.textSecondary }}>-</span>
      </div>

      {/* Camera Mode Selection */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Mode</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          {(['orbit', 'fly', 'cinematic'] as SpectatorCameraMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => actions.setMode(mode)}
              style={buttonStyle(state.camera.mode === mode)}
            >
              {CAMERA_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        <div style={{ ...labelStyle, fontStyle: 'italic' }}>
          {CAMERA_MODE_DESCRIPTIONS[state.camera.mode]}
        </div>
      </div>

      {/* Camera Controls */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Camera</div>
        <div style={rowStyle}>
          <span style={labelStyle}>Position</span>
          <span style={valueStyle}>{formatVec3(state.camera.position)}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Target</span>
          <span style={valueStyle}>{formatVec3(state.camera.target)}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>FOV</span>
          <span style={valueStyle}>{state.camera.fovY.toFixed(0)}</span>
        </div>
        <input
          type="range"
          min="10"
          max="120"
          step="1"
          value={state.camera.fovY}
          onChange={(e) => actions.setFovY(Number(e.target.value))}
          style={sliderStyle}
        />
        {state.camera.mode === 'orbit' && (
          <div style={{ marginTop: 6 }}>
            <div style={labelStyle}>Auto-Rotate Speed</div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              defaultValue="0"
              onChange={(e) => actions.setAutoRotate(Number(e.target.value))}
              style={sliderStyle}
            />
          </div>
        )}
        <button
          onClick={actions.resetCamera}
          style={{ ...buttonStyle(), marginTop: 8, width: '100%' }}
        >
          Reset Camera
        </button>
      </div>

      {/* Capture Settings */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Capture</div>
        {/* Format */}
        <div style={rowStyle}>
          <span style={labelStyle}>Format</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['png', 'jpeg', 'webp'] as CaptureFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => actions.setCaptureConfig({ format: fmt })}
                style={buttonStyle(state.captureConfig.format === fmt)}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {/* Resolution */}
        <div style={rowStyle}>
          <span style={labelStyle}>Resolution</span>
          <select
            value={state.captureConfig.resolution}
            onChange={(e) =>
              actions.setCaptureConfig({
                resolution: e.target.value as CaptureResolutionPreset,
              })
            }
            style={{
              backgroundColor: theme.buttonBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: theme.fontSize,
              fontFamily: theme.fontFamily,
            }}
          >
            {Object.entries(CAPTURE_RESOLUTION_PRESETS).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </div>
        {/* Quality slider (for JPEG/WebP) */}
        {state.captureConfig.format !== 'png' && (
          <div>
            <div style={rowStyle}>
              <span style={labelStyle}>Quality</span>
              <span style={valueStyle}>{(state.captureConfig.quality * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={state.captureConfig.quality}
              onChange={(e) =>
                actions.setCaptureConfig({ quality: Number(e.target.value) })
              }
              style={sliderStyle}
            />
          </div>
        )}
        {/* Supersampling */}
        <div style={rowStyle}>
          <span style={labelStyle}>Supersample</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 4].map((factor) => (
              <button
                key={factor}
                onClick={() => actions.setCaptureConfig({ supersampleFactor: factor })}
                style={buttonStyle(state.captureConfig.supersampleFactor === factor)}
              >
                {factor}x
              </button>
            ))}
          </div>
        </div>
        {/* Capture Button */}
        <button
          onClick={handleCapture}
          disabled={isCapturing}
          style={captureButtonStyle}
        >
          {isCapturing ? 'CAPTURING...' : 'CAPTURE SCENE'}
        </button>
      </div>

      {/* Cinematic Controls (only in cinematic mode) */}
      {state.camera.mode === 'cinematic' && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Cinematic</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button
              onClick={state.playback.isPlaying ? actions.pauseCinematic : actions.playCinematic}
              style={buttonStyle(state.playback.isPlaying)}
            >
              {state.playback.isPlaying ? 'Pause' : 'Play'}
            </button>
            <button onClick={actions.stopCinematic} style={buttonStyle()}>
              Stop
            </button>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Speed</span>
            <span style={valueStyle}>1.0x</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            defaultValue="1.0"
            onChange={(e) => actions.setPlaybackSpeed(Number(e.target.value))}
            style={sliderStyle}
          />
          {/* Progress bar */}
          <div style={{ marginTop: 6 }}>
            <div style={labelStyle}>
              Progress: {(state.playback.progress * 100).toFixed(0)}%
              {state.playback.loopCount > 0 && ` (loop ${state.playback.loopCount})`}
            </div>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.border,
                overflow: 'hidden',
                marginTop: 4,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${state.playback.progress * 100}%`,
                  backgroundColor: theme.accent,
                  borderRadius: 2,
                  transition: 'width 0.1s linear',
                }}
              />
            </div>
          </div>
          <div style={{ ...rowStyle, marginTop: 6 }}>
            <span style={labelStyle}>Waypoints: {state.playback.totalWaypoints}</span>
            <span style={labelStyle}>
              Duration: {state.playback.totalDuration.toFixed(1)}s
            </span>
          </div>
          {/* Add waypoint from current camera */}
          <button
            onClick={() =>
              actions.addWaypoint({
                position: [...state.camera.position],
                target: [...state.camera.target],
                fovY: state.camera.fovY,
                duration: 3,
                easing: 'ease-in-out',
              })
            }
            style={{ ...buttonStyle(), width: '100%', marginTop: 6 }}
          >
            Add Waypoint Here
          </button>
        </div>
      )}

      {/* Capture History */}
      {state.history.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            History ({state.history.length})
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4,
              marginBottom: 8,
            }}
          >
            {state.history.slice(0, 8).map((entry) => (
              <div
                key={entry.id}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: `1px solid ${theme.border}`,
                  cursor: 'pointer',
                }}
                onClick={() => actions.downloadCapture(entry)}
                title={`${entry.width}x${entry.height} ${entry.format.toUpperCase()} - ${formatBytes(entry.sizeBytes)} - Click to download`}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: theme.panelBg,
                    backgroundImage: `url(${entry.thumbnailDataUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                {/* Remove button */}
                <div
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: theme.error,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    actions.removeCapture(entry.id);
                  }}
                >
                  x
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={actions.clearHistory}
            style={{ ...buttonStyle(), width: '100%' }}
          >
            Clear History
          </button>
        </div>
      )}

      {/* Performance */}
      <div style={{ padding: '8px 14px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px 12px',
            fontSize: theme.fontSize - 1,
          }}
        >
          <div>
            <span style={labelStyle}>FPS </span>
            <span
              style={{
                color: state.performance.fps >= 25 ? theme.success : theme.warning,
              }}
            >
              {state.performance.fps.toFixed(0)}
            </span>
          </div>
          <div>
            <span style={labelStyle}>Frame </span>
            <span style={valueStyle}>{state.performance.frameTimeMs.toFixed(1)}ms</span>
          </div>
          <div>
            <span style={labelStyle}>Captures </span>
            <span style={valueStyle}>{state.performance.captureCount}</span>
          </div>
          <div>
            <span style={labelStyle}>Memory </span>
            <span style={valueStyle}>
              {formatBytes(state.performance.historyMemoryBytes)}
            </span>
          </div>
        </div>
        {state.error && (
          <div
            style={{
              marginTop: 6,
              padding: '4px 8px',
              backgroundColor: `${theme.error}22`,
              borderRadius: 4,
              color: theme.error,
              fontSize: theme.fontSize - 1,
            }}
          >
            {state.error}
          </div>
        )}
      </div>
    </div>
  );
};
