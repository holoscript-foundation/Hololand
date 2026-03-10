/**
 * CinematicCameraPanel
 *
 * Full React UI for the cinematic camera system. Provides:
 * - Keyframe timeline with draggable diamonds and playhead scrubbing
 * - Keyframe property editor (position, target, FOV, roll, DoF)
 * - Camera preset browser (orbit, flythrough, dolly, crane, etc.)
 * - Remotion video export controls with progress bar
 * - Playback transport (play/pause/stop/loop/speed)
 * - Sequence management (save/load/import/export JSON)
 * - Undo/Redo support
 *
 * LAYOUT:
 * ```
 * +--------------------------------------------------+
 * |  CINEMATIC CAMERA                     [collapse]  |
 * +--------------------------------------------------+
 * |  [Play] [Pause] [Stop]  Speed: 1.0x  [Loop]      |
 * +--------------------------------------------------+
 * |  Timeline                                         |
 * |  |--[KF1]----[KF2]--------[KF3]--|  10.0s        |
 * |  |====playhead====|                               |
 * +--------------------------------------------------+
 * |  [Keyframes] [Presets] [Export] [Properties]       |
 * +--------------------------------------------------+
 * |  < Active Section Content >                       |
 * +--------------------------------------------------+
 * ```
 *
 * @module cinematic-camera/CinematicCameraPanel
 */

import React, { useState, useMemo } from 'react';
import { useCinematicCamera } from './useCinematicCamera';
import { getDefaultPresetConfig, PRESET_CATEGORIES } from './CameraPresetLibrary';

import type {
  CinematicCameraPanelProps,
  CinematicCameraTheme,
  InterpolationCurve,
  CinematicEasingType,
  TimelinePanelSection,
  VideoExportFormat,
  VideoResolutionPreset,
  VideoFPSPreset,
} from './types';

import {
  DEFAULT_CINEMATIC_THEME,
  INTERPOLATION_LABELS,
  EASING_LABELS,
  CAMERA_PRESET_LABELS,
  CAMERA_PRESET_DESCRIPTIONS,
  VIDEO_FORMAT_LABELS,
  VIDEO_RESOLUTION_PRESETS,
} from './types';

// =============================================================================
// HELPERS
// =============================================================================

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return min > 0 ? `${min}:${sec.toFixed(1).padStart(4, '0')}` : `${sec.toFixed(1)}s`;
}

function formatVec3(v: [number, number, number]): string {
  return `${v[0].toFixed(2)}, ${v[1].toFixed(2)}, ${v[2].toFixed(2)}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CinematicCameraPanel: React.FC<CinematicCameraPanelProps> = ({
  getCanvas: _getCanvas,
  initialSequence,
  exportConfig,
  collapsed: initialCollapsed = false,
  className,
  style,
  theme: themeOverride,
  onCameraUpdate,
  onExportComplete: _onExportComplete,
  onSequenceSave,
  remotionAvailable = false,
  remotionRenderFn,
}) => {
  const theme: CinematicCameraTheme = useMemo(
    () => ({ ...DEFAULT_CINEMATIC_THEME, ...themeOverride }),
    [themeOverride],
  );

  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [activeSection, setActiveSection] = useState<TimelinePanelSection>('keyframes');

  const { state, actions } = useCinematicCamera({
    initialSequence,
    exportConfig,
    previewFPS: 30,
    maxUndoHistory: 50,
  });

  // Notify parent of camera changes
  React.useEffect(() => {
    if (onCameraUpdate) {
      onCameraUpdate(state.camera);
    }
  }, [state.camera, onCameraUpdate]);

  // ===========================================================================
  // STYLES
  // ===========================================================================

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

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  };

  const labelStyle: React.CSSProperties = {
    color: theme.textSecondary,
    fontSize: theme.fontSize - 1,
    marginBottom: 2,
  };

  const valueStyle: React.CSSProperties = {
    color: theme.text,
    fontFamily: theme.fontFamily,
    fontSize: theme.fontSize - 1,
  };

  const btnStyle = (active: boolean = false, accent?: string): React.CSSProperties => ({
    padding: '4px 10px',
    border: `1px solid ${active ? (accent ?? theme.accent) : theme.border}`,
    borderRadius: 4,
    backgroundColor: active ? (accent ?? theme.accent) : theme.buttonBg,
    color: active ? '#ffffff' : theme.text,
    cursor: 'pointer',
    fontSize: theme.fontSize,
    fontFamily: theme.fontFamily,
    transition: 'all 0.15s ease',
    lineHeight: '1.4',
  });

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px',
    border: 'none',
    borderBottom: active ? `2px solid ${theme.accent}` : '2px solid transparent',
    backgroundColor: 'transparent',
    color: active ? theme.text : theme.textSecondary,
    cursor: 'pointer',
    fontSize: theme.fontSize,
    fontFamily: theme.fontFamily,
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s ease',
  });

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    accentColor: theme.accent,
    margin: '4px 0',
  };

  const selectStyle: React.CSSProperties = {
    backgroundColor: theme.buttonBg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: theme.fontSize,
    fontFamily: theme.fontFamily,
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: theme.buttonBg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: theme.fontSize,
    fontFamily: theme.fontFamily,
    width: 60,
  };

  // ===========================================================================
  // COLLAPSED VIEW
  // ===========================================================================

  if (isCollapsed) {
    return (
      <div style={containerStyle} className={className}>
        <div style={headerStyle} onClick={() => setIsCollapsed(false)}>
          <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>CINEMATIC CAMERA</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: theme.textSecondary, fontSize: theme.fontSize - 1 }}>
              {state.sequence.keyframes.length} keyframes
            </span>
            <span style={{ color: theme.textSecondary }}>+</span>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SELECTED KEYFRAME
  // ===========================================================================

  const selectedKf = state.selection.selectedKeyframes.length === 1
    ? state.sequence.keyframes.find((kf) => kf.id === state.selection.selectedKeyframes[0])
    : null;

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div style={containerStyle} className={className}>
      {/* Header */}
      <div style={headerStyle} onClick={() => setIsCollapsed(true)}>
        <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>CINEMATIC CAMERA</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {state.canUndo && (
            <button
              onClick={(e) => { e.stopPropagation(); actions.undo(); }}
              style={{ ...btnStyle(), padding: '2px 6px', fontSize: theme.fontSize - 1 }}
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
          )}
          {state.canRedo && (
            <button
              onClick={(e) => { e.stopPropagation(); actions.redo(); }}
              style={{ ...btnStyle(), padding: '2px 6px', fontSize: theme.fontSize - 1 }}
              title="Redo (Ctrl+Shift+Z)"
            >
              Redo
            </button>
          )}
          <span style={{ color: theme.textSecondary }}>-</span>
        </div>
      </div>

      {/* Transport Controls */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
          <button
            onClick={state.playback.isPlaying ? actions.pause : actions.play}
            style={btnStyle(state.playback.isPlaying)}
            disabled={state.sequence.keyframes.length < 2}
          >
            {state.playback.isPlaying ? 'Pause' : 'Play'}
          </button>
          <button onClick={actions.stop} style={btnStyle()}>
            Stop
          </button>
          <button
            onClick={actions.toggleLoop}
            style={btnStyle(state.sequence.loop)}
            title={state.sequence.loop ? 'Loop: ON' : 'Loop: OFF'}
          >
            Loop
          </button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={labelStyle}>Speed</span>
            <select
              value={state.sequence.playbackSpeed}
              onChange={(e) => actions.setPlaybackSpeed(Number(e.target.value))}
              style={selectStyle}
            >
              {[0.25, 0.5, 1.0, 1.5, 2.0, 3.0].map((s) => (
                <option key={s} value={s}>{s}x</option>
              ))}
            </select>
          </div>
        </div>

        {/* Time display */}
        <div style={{ ...rowStyle, marginBottom: 0 }}>
          <span style={valueStyle}>
            {formatTime(state.playback.currentTime)} / {formatTime(state.sequence.duration)}
          </span>
          <span style={{ ...labelStyle }}>
            {state.sequence.keyframes.length} keyframes
          </span>
        </div>
      </div>

      {/* Timeline Track */}
      <div style={{
        ...sectionStyle,
        padding: '8px 14px',
        position: 'relative',
      }}>
        {/* Timeline background track */}
        <div
          style={{
            position: 'relative',
            height: theme.timelineHeight,
            backgroundColor: theme.timelineTrack,
            borderRadius: 4,
            cursor: 'pointer',
            overflow: 'visible',
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const t = (x / rect.width) * state.sequence.duration;
            actions.scrubTo(Math.max(0, t));
          }}
        >
          {/* Keyframe diamonds */}
          {state.sequence.keyframes.map((kf) => {
            const xPercent = state.sequence.duration > 0
              ? (kf.time / state.sequence.duration) * 100
              : 0;
            const isSelected = state.selection.selectedKeyframes.includes(kf.id);

            return (
              <div
                key={kf.id}
                onClick={(e) => {
                  e.stopPropagation();
                  actions.selectKeyframe(kf.id, e.ctrlKey || e.metaKey);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  actions.scrubTo(kf.time);
                }}
                style={{
                  position: 'absolute',
                  left: `${xPercent}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%) rotate(45deg)',
                  width: 12,
                  height: 12,
                  backgroundColor: isSelected ? theme.keyframeSelected : theme.keyframeColor,
                  border: `2px solid ${isSelected ? '#ffffff' : theme.keyframeColor}`,
                  borderRadius: 2,
                  cursor: 'pointer',
                  zIndex: isSelected ? 3 : 2,
                  transition: 'all 0.1s ease',
                  boxShadow: isSelected ? `0 0 6px ${theme.keyframeSelected}` : 'none',
                }}
                title={`${kf.label || 'Keyframe'} at ${formatTime(kf.time)}`}
              />
            );
          })}

          {/* Playhead */}
          {state.sequence.duration > 0 && (
            <div
              style={{
                position: 'absolute',
                left: `${state.playback.progress * 100}%`,
                top: 0,
                bottom: 0,
                width: 2,
                backgroundColor: theme.timelinePlayhead,
                zIndex: 4,
                pointerEvents: 'none',
              }}
            >
              {/* Playhead cap */}
              <div
                style={{
                  position: 'absolute',
                  top: -4,
                  left: -4,
                  width: 10,
                  height: 10,
                  backgroundColor: theme.timelinePlayhead,
                  borderRadius: '50%',
                }}
              />
            </div>
          )}

          {/* Time markers */}
          {state.sequence.duration > 0 && Array.from(
            { length: Math.min(11, Math.ceil(state.sequence.duration) + 1) },
            (_, i) => {
              const time = (i / Math.min(10, Math.ceil(state.sequence.duration))) * state.sequence.duration;
              const xPct = (time / state.sequence.duration) * 100;
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${xPct}%`,
                    bottom: 2,
                    transform: 'translateX(-50%)',
                    fontSize: 9,
                    color: theme.textSecondary,
                    pointerEvents: 'none',
                  }}
                >
                  {time.toFixed(0)}s
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${theme.border}`,
        backgroundColor: theme.panelBg,
      }}>
        {(
          [
            ['keyframes', 'Keyframes'],
            ['presets', 'Presets'],
            ['export', 'Export'],
            ['properties', 'Properties'],
          ] as [TimelinePanelSection, string][]
        ).map(([section, label]) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            style={tabStyle(activeSection === section)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active Section Content */}
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {/* ============ KEYFRAMES SECTION ============ */}
        {activeSection === 'keyframes' && (
          <div style={sectionStyle}>
            {/* Add keyframe buttons */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button
                onClick={() => actions.captureKeyframe()}
                style={{ ...btnStyle(false, theme.accent), flex: 1 }}
              >
                Capture Here
              </button>
              <button
                onClick={() => actions.addKeyframe({
                  time: state.sequence.duration + 3,
                })}
                style={{ ...btnStyle(), flex: 1 }}
              >
                Add at End (+3s)
              </button>
            </div>

            {/* Keyframe list */}
            {state.sequence.keyframes.length === 0 && (
              <div style={{ color: theme.textSecondary, textAlign: 'center', padding: '16px 0' }}>
                No keyframes. Click "Capture Here" to add one.
              </div>
            )}

            {state.sequence.keyframes.map((kf, idx) => {
              const isSelected = state.selection.selectedKeyframes.includes(kf.id);
              return (
                <div
                  key={kf.id}
                  onClick={() => actions.selectKeyframe(kf.id)}
                  style={{
                    padding: '6px 10px',
                    marginBottom: 4,
                    borderRadius: 4,
                    backgroundColor: isSelected ? `${theme.accent}22` : theme.panelBg,
                    border: `1px solid ${isSelected ? theme.accent : theme.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: theme.keyframeColor }}>
                        KF{idx + 1}
                      </span>
                      <span style={{ ...labelStyle, marginLeft: 8 }}>
                        {formatTime(kf.time)}
                      </span>
                      {kf.label && (
                        <span style={{ ...labelStyle, marginLeft: 6, fontStyle: 'italic' }}>
                          {kf.label}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); actions.scrubTo(kf.time); }}
                        style={{ ...btnStyle(), padding: '2px 6px', fontSize: 10 }}
                        title="Go to keyframe"
                      >
                        Go
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); actions.duplicateKeyframe(kf.id); }}
                        style={{ ...btnStyle(), padding: '2px 6px', fontSize: 10 }}
                        title="Duplicate"
                      >
                        Dup
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); actions.removeKeyframe(kf.id); }}
                        style={{ ...btnStyle(false, theme.error), padding: '2px 6px', fontSize: 10 }}
                        title="Delete"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: theme.fontSize - 2, color: theme.textSecondary, marginTop: 2 }}>
                    Pos: {formatVec3(kf.position)} | {INTERPOLATION_LABELS[kf.interpolation]}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ============ PRESETS SECTION ============ */}
        {activeSection === 'presets' && (
          <div style={sectionStyle}>
            {Object.entries(PRESET_CATEGORIES).map(([category, presetTypes]) => (
              <div key={category} style={{ marginBottom: 12 }}>
                <div style={{ ...labelStyle, fontWeight: 600, marginBottom: 6, fontSize: theme.fontSize }}>
                  {category}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {presetTypes.map((presetType) => (
                    <button
                      key={presetType}
                      onClick={() => {
                        const config = getDefaultPresetConfig(presetType);
                        actions.applyPreset(config);
                      }}
                      style={{
                        ...btnStyle(),
                        padding: '6px 8px',
                        textAlign: 'left',
                        fontSize: theme.fontSize - 1,
                      }}
                      title={CAMERA_PRESET_DESCRIPTIONS[presetType]}
                    >
                      {CAMERA_PRESET_LABELS[presetType]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============ EXPORT SECTION ============ */}
        {activeSection === 'export' && (
          <div style={sectionStyle}>
            {/* Format */}
            <div style={rowStyle}>
              <span style={labelStyle}>Format</span>
              <select
                value={state.exportConfig.format}
                onChange={(e) => actions.setExportConfig({
                  format: e.target.value as VideoExportFormat,
                })}
                style={selectStyle}
              >
                {Object.entries(VIDEO_FORMAT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Resolution */}
            <div style={rowStyle}>
              <span style={labelStyle}>Resolution</span>
              <select
                value={state.exportConfig.resolution}
                onChange={(e) => actions.setExportConfig({
                  resolution: e.target.value as VideoResolutionPreset,
                })}
                style={selectStyle}
              >
                {Object.entries(VIDEO_RESOLUTION_PRESETS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* FPS */}
            <div style={rowStyle}>
              <span style={labelStyle}>Frame Rate</span>
              <select
                value={state.exportConfig.fps}
                onChange={(e) => actions.setExportConfig({
                  fps: Number(e.target.value) as VideoFPSPreset,
                })}
                style={selectStyle}
              >
                {[24, 25, 30, 48, 60].map((fps) => (
                  <option key={fps} value={fps}>{fps} fps</option>
                ))}
              </select>
            </div>

            {/* Quality (CRF) */}
            <div style={rowStyle}>
              <span style={labelStyle}>Quality (CRF)</span>
              <span style={valueStyle}>{state.exportConfig.crf}</span>
            </div>
            <input
              type="range"
              min="0"
              max="51"
              step="1"
              value={state.exportConfig.crf}
              onChange={(e) => actions.setExportConfig({
                crf: Number(e.target.value),
              })}
              style={sliderStyle}
            />
            <div style={{ ...labelStyle, fontSize: 10, marginBottom: 10 }}>
              Lower CRF = higher quality, larger file (18 = high, 28 = medium)
            </div>

            {/* Estimated info */}
            <div style={{
              padding: '8px 10px',
              backgroundColor: theme.panelBg,
              borderRadius: 4,
              marginBottom: 10,
            }}>
              <div style={{ ...rowStyle, marginBottom: 2 }}>
                <span style={labelStyle}>Duration</span>
                <span style={valueStyle}>{formatTime(state.sequence.duration)}</span>
              </div>
              <div style={{ ...rowStyle, marginBottom: 2 }}>
                <span style={labelStyle}>Total Frames</span>
                <span style={valueStyle}>
                  {Math.ceil(state.sequence.duration * state.exportConfig.fps)}
                </span>
              </div>
              <div style={{ ...rowStyle, marginBottom: 0 }}>
                <span style={labelStyle}>Remotion</span>
                <span style={{
                  color: remotionAvailable ? theme.success : theme.warning,
                  fontSize: theme.fontSize - 1,
                }}>
                  {remotionAvailable ? 'Available' : 'Not Configured'}
                </span>
              </div>
            </div>

            {/* Export Progress */}
            {state.exportProgress.status !== 'idle' && (
              <div style={{
                padding: '8px 10px',
                backgroundColor: theme.panelBg,
                borderRadius: 4,
                marginBottom: 10,
              }}>
                <div style={{ ...rowStyle, marginBottom: 4 }}>
                  <span style={{
                    fontWeight: 600,
                    color: state.exportProgress.status === 'error'
                      ? theme.error
                      : state.exportProgress.status === 'complete'
                        ? theme.success
                        : theme.accent,
                  }}>
                    {state.exportProgress.status.toUpperCase()}
                  </span>
                  <span style={valueStyle}>
                    {state.exportProgress.percentage}%
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{
                  height: 4,
                  backgroundColor: theme.border,
                  borderRadius: 2,
                  overflow: 'hidden',
                  marginBottom: 4,
                }}>
                  <div style={{
                    height: '100%',
                    width: `${state.exportProgress.percentage}%`,
                    backgroundColor: state.exportProgress.status === 'error'
                      ? theme.error
                      : theme.exportAccent,
                    borderRadius: 2,
                    transition: 'width 0.2s linear',
                  }} />
                </div>
                <div style={{ fontSize: 10, color: theme.textSecondary }}>
                  Frame {state.exportProgress.currentFrame} / {state.exportProgress.totalFrames}
                  {state.exportProgress.estimatedTimeRemaining > 0 && (
                    <span> | ETA: {formatTime(state.exportProgress.estimatedTimeRemaining)}</span>
                  )}
                </div>
                {state.exportProgress.errorMessage && (
                  <div style={{ color: theme.error, fontSize: 10, marginTop: 4 }}>
                    {state.exportProgress.errorMessage}
                  </div>
                )}
                {state.exportProgress.outputUrl && (
                  <div style={{ marginTop: 6 }}>
                    <a
                      href={state.exportProgress.outputUrl}
                      download
                      style={{ color: theme.accent, fontSize: theme.fontSize - 1 }}
                    >
                      Download ({formatBytes(state.exportProgress.outputSizeBytes)})
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Export / Cancel buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
              {state.exportProgress.status === 'rendering' || state.exportProgress.status === 'encoding' ? (
                <button
                  onClick={actions.cancelExport}
                  style={{
                    ...btnStyle(false, theme.error),
                    flex: 1,
                    padding: '8px 0',
                    fontWeight: 700,
                  }}
                >
                  CANCEL EXPORT
                </button>
              ) : (
                <button
                  onClick={() => actions.startExport(remotionRenderFn)}
                  disabled={state.sequence.keyframes.length < 2}
                  style={{
                    ...btnStyle(false, theme.exportAccent),
                    flex: 1,
                    padding: '8px 0',
                    fontWeight: 700,
                    opacity: state.sequence.keyframes.length < 2 ? 0.4 : 1,
                  }}
                >
                  EXPORT VIDEO
                </button>
              )}
            </div>

            {/* Sequence JSON export/import */}
            <div style={{ marginTop: 12 }}>
              <div style={{ ...labelStyle, fontWeight: 600, marginBottom: 6 }}>Sequence Data</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => {
                    const json = actions.exportSequenceJson();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${state.sequence.name.replace(/\s+/g, '-').toLowerCase()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{ ...btnStyle(), flex: 1, fontSize: theme.fontSize - 1 }}
                >
                  Export JSON
                </button>
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          actions.importSequence(reader.result as string);
                        };
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}
                  style={{ ...btnStyle(), flex: 1, fontSize: theme.fontSize - 1 }}
                >
                  Import JSON
                </button>
              </div>
              {onSequenceSave && (
                <button
                  onClick={() => onSequenceSave(state.sequence)}
                  style={{ ...btnStyle(), width: '100%', marginTop: 6, fontSize: theme.fontSize - 1 }}
                >
                  Save Sequence
                </button>
              )}
            </div>
          </div>
        )}

        {/* ============ PROPERTIES SECTION ============ */}
        {activeSection === 'properties' && (
          <div style={sectionStyle}>
            {/* Sequence name */}
            <div style={rowStyle}>
              <span style={labelStyle}>Name</span>
              <input
                type="text"
                value={state.sequence.name}
                onChange={(e) => actions.setSequenceName(e.target.value)}
                style={{ ...inputStyle, width: 180 }}
              />
            </div>

            {/* Current camera state */}
            <div style={{ ...labelStyle, fontWeight: 600, marginTop: 8, marginBottom: 6 }}>
              Current Camera
            </div>
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
              <span style={valueStyle}>{state.camera.fovY.toFixed(1)}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Roll</span>
              <span style={valueStyle}>{state.camera.roll.toFixed(1)}</span>
            </div>
            {state.camera.dofFocusDistance > 0 && (
              <>
                <div style={rowStyle}>
                  <span style={labelStyle}>DoF Focus</span>
                  <span style={valueStyle}>{state.camera.dofFocusDistance.toFixed(2)}</span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>DoF Aperture</span>
                  <span style={valueStyle}>f/{state.camera.dofAperture.toFixed(1)}</span>
                </div>
              </>
            )}

            {/* Selected keyframe properties */}
            {selectedKf && (
              <>
                <div style={{
                  ...labelStyle,
                  fontWeight: 600,
                  marginTop: 12,
                  marginBottom: 6,
                  color: theme.keyframeSelected,
                }}>
                  Selected Keyframe
                </div>

                {/* Time */}
                <div style={rowStyle}>
                  <span style={labelStyle}>Time (s)</span>
                  <input
                    type="number"
                    value={selectedKf.time}
                    onChange={(e) => actions.updateKeyframe(selectedKf.id, {
                      time: Math.max(0, Number(e.target.value)),
                    })}
                    style={inputStyle}
                    step="0.1"
                    min="0"
                  />
                </div>

                {/* Label */}
                <div style={rowStyle}>
                  <span style={labelStyle}>Label</span>
                  <input
                    type="text"
                    value={selectedKf.label ?? ''}
                    onChange={(e) => actions.updateKeyframe(selectedKf.id, {
                      label: e.target.value || undefined,
                    })}
                    style={{ ...inputStyle, width: 140 }}
                    placeholder="Optional label"
                  />
                </div>

                {/* Interpolation */}
                <div style={rowStyle}>
                  <span style={labelStyle}>Curve</span>
                  <select
                    value={selectedKf.interpolation}
                    onChange={(e) => actions.updateKeyframe(selectedKf.id, {
                      interpolation: e.target.value as InterpolationCurve,
                    })}
                    style={selectStyle}
                  >
                    {Object.entries(INTERPOLATION_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Easing */}
                <div style={rowStyle}>
                  <span style={labelStyle}>Easing</span>
                  <select
                    value={selectedKf.easing}
                    onChange={(e) => actions.updateKeyframe(selectedKf.id, {
                      easing: e.target.value as CinematicEasingType,
                    })}
                    style={selectStyle}
                  >
                    {Object.entries(EASING_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* FOV */}
                <div style={rowStyle}>
                  <span style={labelStyle}>FOV</span>
                  <span style={valueStyle}>{selectedKf.fovY.toFixed(0)}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="1"
                  value={selectedKf.fovY}
                  onChange={(e) => actions.updateKeyframe(selectedKf.id, {
                    fovY: Number(e.target.value),
                  })}
                  style={sliderStyle}
                />

                {/* Roll */}
                <div style={rowStyle}>
                  <span style={labelStyle}>Roll</span>
                  <span style={valueStyle}>{selectedKf.roll.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="0.5"
                  value={selectedKf.roll}
                  onChange={(e) => actions.updateKeyframe(selectedKf.id, {
                    roll: Number(e.target.value),
                  })}
                  style={sliderStyle}
                />

                {/* Tension (Catmull-Rom only) */}
                {selectedKf.interpolation === 'catmull-rom' && (
                  <>
                    <div style={rowStyle}>
                      <span style={labelStyle}>Tension</span>
                      <span style={valueStyle}>{selectedKf.tension.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedKf.tension}
                      onChange={(e) => actions.updateKeyframe(selectedKf.id, {
                        tension: Number(e.target.value),
                      })}
                      style={sliderStyle}
                    />
                  </>
                )}

                {/* Position xyz inputs */}
                <div style={{ ...labelStyle, marginTop: 8, fontWeight: 500 }}>Position</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {(['x', 'y', 'z'] as const).map((axis, i) => (
                    <div key={axis} style={{ flex: 1 }}>
                      <label style={{ fontSize: 9, color: theme.textSecondary }}>{axis.toUpperCase()}</label>
                      <input
                        type="number"
                        value={selectedKf.position[i]}
                        onChange={(e) => {
                          const pos: [number, number, number] = [...selectedKf.position];
                          pos[i] = Number(e.target.value);
                          actions.updateKeyframe(selectedKf.id, { position: pos });
                        }}
                        style={{ ...inputStyle, width: '100%' }}
                        step="0.1"
                      />
                    </div>
                  ))}
                </div>

                {/* Target xyz inputs */}
                <div style={{ ...labelStyle, fontWeight: 500 }}>Target</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {(['x', 'y', 'z'] as const).map((axis, i) => (
                    <div key={axis} style={{ flex: 1 }}>
                      <label style={{ fontSize: 9, color: theme.textSecondary }}>{axis.toUpperCase()}</label>
                      <input
                        type="number"
                        value={selectedKf.target[i]}
                        onChange={(e) => {
                          const tgt: [number, number, number] = [...selectedKf.target];
                          tgt[i] = Number(e.target.value);
                          actions.updateKeyframe(selectedKf.id, { target: tgt });
                        }}
                        style={{ ...inputStyle, width: '100%' }}
                        step="0.1"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {!selectedKf && state.sequence.keyframes.length > 0 && (
              <div style={{ color: theme.textSecondary, textAlign: 'center', padding: '12px 0' }}>
                Select a keyframe to edit its properties.
              </div>
            )}

            {/* Clear sequence */}
            <div style={{ marginTop: 12 }}>
              <button
                onClick={actions.clearSequence}
                style={{
                  ...btnStyle(false, theme.error),
                  width: '100%',
                  fontSize: theme.fontSize - 1,
                }}
              >
                Clear All Keyframes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {state.error && (
        <div style={{
          padding: '6px 14px',
          backgroundColor: `${theme.error}22`,
          color: theme.error,
          fontSize: theme.fontSize - 1,
          borderTop: `1px solid ${theme.border}`,
        }}>
          {state.error}
        </div>
      )}

      {/* Footer status bar */}
      <div style={{
        padding: '6px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: theme.fontSize - 2,
        color: theme.textSecondary,
        borderTop: `1px solid ${theme.border}`,
      }}>
        <span>
          {state.playback.isPlaying ? 'Playing' : state.playback.isPaused ? 'Paused' : 'Ready'}
          {state.sequence.loop && ' | Loop'}
        </span>
        <span>
          FOV: {state.camera.fovY.toFixed(0)} | Roll: {state.camera.roll.toFixed(1)}
        </span>
      </div>
    </div>
  );
};
