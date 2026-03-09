/**
 * DragonPreviewPanel
 *
 * Top-level integration component that combines:
 *   - DragonPreview (3D R3F viewport with dragon.glb)
 *   - DragonInspector (LOD slider, fire controls, perf counters)
 *   - SceneProfilerDashboard (optional detailed VR profiling)
 *
 * Manages shared state between the preview viewport and inspector panel.
 * Provides horizontal or vertical layout options for studio integration.
 *
 * @module dragon-preview/DragonPreviewPanel
 */

import React, { useState, useMemo, useEffect } from 'react';
import type {
  DragonPreviewPanelProps,
  DragonLODLevel,
  FireEffectControls,
} from './types';
import {
  DEFAULT_FIRE_CONTROLS,
  DEFAULT_DRAGON_PREVIEW_THEME,
} from './types';
import { DragonPreview } from './DragonPreview';
import { DragonInspector } from './DragonInspector';
import { useDragonPerformance } from './useDragonPerformance';
import { SceneProfilerDashboard } from '../scene-profiler/SceneProfilerDashboard';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * DragonPreviewPanel - Complete studio dragon preview with inspector.
 *
 * Integrates the 3D preview viewport, inspector controls, and optional
 * scene profiler dashboard into a single studio panel. Manages all
 * shared state internally.
 *
 * @example Basic usage
 * ```tsx
 * <DragonPreviewPanel
 *   modelPath="/models/dragon.glb"
 *   showProfiler
 * />
 * ```
 *
 * @example With initial settings
 * ```tsx
 * <DragonPreviewPanel
 *   modelPath="/models/dragon.glb"
 *   initialLOD={2}
 *   initialFireControls={{ enabled: true, quality: 3 }}
 *   layout="vertical"
 *   showProfiler
 * />
 * ```
 */
export const DragonPreviewPanel: React.FC<DragonPreviewPanelProps> = ({
  modelPath = '/models/dragon.glb',
  initialLOD = 0,
  initialFireControls,
  showProfiler = false,
  inspectorCollapsed: initialCollapsed = false,
  layout = 'horizontal',
  className,
  style,
}) => {
  const theme = DEFAULT_DRAGON_PREVIEW_THEME;

  // State
  const [lodLevel, setLODLevel] = useState<DragonLODLevel>(initialLOD);
  const [fireControls, setFireControls] = useState<FireEffectControls>({
    ...DEFAULT_FIRE_CONTROLS,
    ...initialFireControls,
  });
  const [inspectorCollapsed, setInspectorCollapsed] = useState(initialCollapsed);
  const [profilerVisible, setProfilerVisible] = useState(showProfiler);

  // Performance tracking
  const { metrics, updateForLOD } = useDragonPerformance();

  // Update estimated metrics when LOD or fire settings change
  useEffect(() => {
    updateForLOD(lodLevel, fireControls.quality, fireControls.enabled);
  }, [lodLevel, fireControls.quality, fireControls.enabled, updateForLOD]);

  // Layout styles
  const isHorizontal = layout === 'horizontal';

  const containerStyle: React.CSSProperties = useMemo(
    () => ({
      display: 'flex',
      flexDirection: isHorizontal ? 'row' : 'column',
      width: '100%',
      height: '100%',
      minHeight: 500,
      background: theme.bg,
      borderRadius: 8,
      overflow: 'hidden',
      border: `1px solid ${theme.border}`,
      ...style,
    }),
    [isHorizontal, theme, style],
  );

  const viewportStyle: React.CSSProperties = useMemo(
    () => ({
      flex: 1,
      position: 'relative' as const,
      minWidth: 0,
      minHeight: isHorizontal ? '100%' : 400,
    }),
    [isHorizontal],
  );

  return (
    <div className={className} style={containerStyle}>
      {/* Viewport (3D Preview) */}
      <div style={viewportStyle}>
        <DragonPreview
          modelPath={modelPath}
          lodLevel={lodLevel}
          fireControls={fireControls}
          environment="apartment"
          autoRotate={false}
          showGround
          showGrid
        />

        {/* Viewport overlay controls */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'flex',
            gap: 4,
            zIndex: 10,
          }}
        >
          {/* Toggle inspector */}
          <button
            onClick={() => setInspectorCollapsed((v) => !v)}
            style={{
              background: theme.panelBg,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: theme.fontSize - 1,
              fontFamily: theme.fontFamily,
              cursor: 'pointer',
              opacity: 0.85,
            }}
            title={inspectorCollapsed ? 'Show Inspector' : 'Hide Inspector'}
          >
            {inspectorCollapsed ? 'Show Inspector' : 'Hide Inspector'}
          </button>

          {/* Toggle profiler */}
          {showProfiler && (
            <button
              onClick={() => setProfilerVisible((v) => !v)}
              style={{
                background: theme.panelBg,
                color: theme.text,
                border: `1px solid ${theme.border}`,
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: theme.fontSize - 1,
                fontFamily: theme.fontFamily,
                cursor: 'pointer',
                opacity: 0.85,
              }}
              title={profilerVisible ? 'Hide Profiler' : 'Show Profiler'}
            >
              {profilerVisible ? 'Hide Profiler' : 'Show Profiler'}
            </button>
          )}
        </div>

        {/* LOD badge overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            background: `${theme.panelBg}e0`,
            padding: '4px 10px',
            borderRadius: 4,
            border: `1px solid ${theme.border}`,
            zIndex: 10,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: theme.lodColors[lodLevel],
            }}
          />
          <span
            style={{
              fontSize: theme.fontSize - 1,
              color: theme.text,
              fontFamily: theme.fontFamily,
            }}
          >
            LOD {lodLevel}
          </span>
          <span style={{ color: theme.border }}>|</span>
          <span
            style={{
              fontSize: theme.fontSize - 1,
              color: theme.text,
              fontFamily: theme.fontFamily,
              opacity: 0.7,
            }}
          >
            {formatCount(metrics.triangleCount)} tris
          </span>
          <span style={{ color: theme.border }}>|</span>
          <span
            style={{
              fontSize: theme.fontSize - 1,
              color: metrics.fps < 30 ? theme.critical : metrics.fps < 55 ? theme.warning : theme.healthy,
              fontFamily: theme.fontFamily,
              fontWeight: 'bold',
            }}
          >
            {metrics.fps} FPS
          </span>
        </div>
      </div>

      {/* Inspector Panel */}
      {!inspectorCollapsed && (
        <div
          style={{
            width: isHorizontal ? theme.inspectorWidth : '100%',
            flexShrink: 0,
            borderLeft: isHorizontal ? `1px solid ${theme.border}` : 'none',
            borderTop: !isHorizontal ? `1px solid ${theme.border}` : 'none',
            overflowY: 'auto',
          }}
        >
          <DragonInspector
            lodLevel={lodLevel}
            onLODChange={setLODLevel}
            fireControls={fireControls}
            onFireControlsChange={setFireControls}
            performance={metrics}
            showProfiler={profilerVisible}
          />
        </div>
      )}

      {/* Scene Profiler Dashboard (overlay) */}
      {profilerVisible && showProfiler && (
        <SceneProfilerDashboard
          sceneName="Inferno Wyrm"
          platform="desktop"
          displayMode="compact"
          visible={profilerVisible}
        />
      )}
    </div>
  );
};

// =============================================================================
// HELPERS (private to this module)
// =============================================================================

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}
