/**
 * GaussianSplatViewer Component
 *
 * React component that wraps the WebGPU Gaussian splatting pipeline for
 * real-time 3D Gaussian splat rendering. Provides a canvas with optional
 * dashboard overlay showing performance metrics, camera state, and
 * pipeline status.
 *
 * ARCHITECTURE:
 * The component uses the useGaussianSplatViewer hook internally to manage
 * the full pipeline lifecycle:
 *
 * ```
 *   <GaussianSplatViewer>
 *       |
 *       |-- useGaussianSplatViewer() hook
 *       |       |
 *       |       |-- WebGPUSplatRenderer (WebGPU pipeline)
 *       |       |       |-- Sort key gen compute shader
 *       |       |       |-- Wait-free radix sort (4 digit passes)
 *       |       |       |-- Instanced quad rasterization
 *       |       |
 *       |       |-- OrbitCameraController (input handling)
 *       |       |-- PlyLoader (data loading)
 *       |       |
 *       |       |-- React state polling (500ms interval)
 *       |
 *       |-- Canvas (WebGPU render target)
 *       |-- StatusOverlay (optional)
 *       |-- MetricsPanel (optional)
 *       |-- GPUPanel (optional)
 *       |-- ControlsPanel (optional)
 * ```
 *
 * DISPLAY MODES:
 * - fullscreen: Canvas fills entire container, minimal HUD overlay
 * - embedded: Canvas with surrounding UI controls and panels
 * - overlay: Canvas with semi-transparent stats overlay
 *
 * @module gaussian-splat-viewer/GaussianSplatViewer
 */

import React, { useRef, useMemo } from 'react';
import {
  useGaussianSplatViewer,
  type UseGaussianSplatViewerConfig,
} from './useGaussianSplatViewer';
import type {
  GaussianSplatViewerTheme,
  GaussianSplatDisplayMode,
  GaussianSplatViewerState,
  GaussianSplatViewerActions,
} from './types';
import {
  DEFAULT_GSPLAT_THEME,
  getStatusLabel,
  getStatusColor,
  formatMs,
  formatNumber,
  formatBytes,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/** Available panels in the Gaussian splat viewer */
export type GaussianSplatPanel =
  | 'status'
  | 'metrics'
  | 'gpu'
  | 'camera'
  | 'controls';

export interface GaussianSplatViewerProps {
  /** Display mode (default: 'embedded') */
  mode?: GaussianSplatDisplayMode;
  /** Which panels to show (default: all) */
  panels?: GaussianSplatPanel[];
  /** Hook configuration forwarded to useGaussianSplatViewer */
  config?: UseGaussianSplatViewerConfig;
  /** Externally managed state (bypasses internal hook) */
  externalState?: GaussianSplatViewerState;
  /** Externally managed actions (bypasses internal hook) */
  externalActions?: GaussianSplatViewerActions;
  /** Canvas ref (bypasses internal ref, for external canvas management) */
  externalCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  /** Canvas width in pixels (default: 1920) */
  width?: number;
  /** Canvas height in pixels (default: 1080) */
  height?: number;
  /** Theme overrides */
  theme?: Partial<GaussianSplatViewerTheme>;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles for the outer container */
  style?: React.CSSProperties;
  /** Accessible label for the component */
  ariaLabel?: string;
  /** Callback when PLY loading finishes */
  onLoaded?: (splatCount: number) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
}

const ALL_PANELS: GaussianSplatPanel[] = [
  'status', 'metrics', 'gpu', 'camera', 'controls',
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const GaussianSplatViewer: React.FC<GaussianSplatViewerProps> = ({
  mode = 'embedded',
  panels = ALL_PANELS,
  config,
  externalState,
  externalActions,
  externalCanvasRef,
  width = 1920,
  height = 1080,
  theme: themeOverride,
  className,
  style,
  ariaLabel = 'Gaussian Splat Viewer',
}) => {
  // Internal canvas ref (used if no external ref provided)
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = externalCanvasRef ?? internalCanvasRef;

  // Use external state/actions if provided, otherwise use internal hook
  const [internalState, internalActions] = useGaussianSplatViewer(canvasRef, config);
  const state = externalState ?? internalState;
  const actions = externalActions ?? internalActions;

  const theme = useMemo(
    () => ({ ...DEFAULT_GSPLAT_THEME, ...themeOverride }),
    [themeOverride],
  );

  // ─── Fullscreen Mode ─────────────────────────────────────────────────

  if (mode === 'fullscreen') {
    return (
      <div
        className={className}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          overflow: 'hidden',
          ...style,
        }}
        role="region"
        aria-label={ariaLabel}
      >
        <canvas
          ref={canvasRef as React.RefObject<HTMLCanvasElement>}
          width={width}
          height={height}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'contain',
          }}
        />
        {/* Minimal HUD overlay in top-right */}
        <div
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            pointerEvents: 'auto',
          }}
        >
          <CompactHUD state={state} actions={actions} theme={theme} />
        </div>
        {/* Error overlay */}
        {state.error && (
          <ErrorOverlay error={state.error} theme={theme} />
        )}
        {/* No WebGPU overlay */}
        {state.status === 'no-webgpu' && (
          <NoWebGPUOverlay theme={theme} />
        )}
      </div>
    );
  }

  // ─── Overlay Mode ────────────────────────────────────────────────────

  if (mode === 'overlay') {
    return (
      <div
        className={className}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundColor: '#000',
          overflow: 'hidden',
          ...style,
        }}
        role="region"
        aria-label={ariaLabel}
      >
        <canvas
          ref={canvasRef as React.RefObject<HTMLCanvasElement>}
          width={width}
          height={height}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'contain',
          }}
        />
        {/* Semi-transparent overlay panel */}
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            width: '320px',
            maxHeight: '80vh',
            overflowY: 'auto',
            backgroundColor: 'rgba(10, 10, 26, 0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: '8px',
            border: `1px solid ${theme.borderColor}`,
            fontFamily: theme.fontFamily,
            fontSize: `calc(0.85rem * ${theme.fontScale})`,
            color: theme.textPrimary,
            zIndex: 1000,
            pointerEvents: 'auto',
          }}
        >
          <Header state={state} actions={actions} theme={theme} />
          <PanelStack state={state} actions={actions} theme={theme} panels={panels} />
        </div>
        {state.error && <ErrorOverlay error={state.error} theme={theme} />}
        {state.status === 'no-webgpu' && <NoWebGPUOverlay theme={theme} />}
      </div>
    );
  }

  // ─── Embedded Mode (default) ─────────────────────────────────────────

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        fontFamily: theme.fontFamily,
        fontSize: `calc(0.85rem * ${theme.fontScale})`,
        color: theme.textPrimary,
        backgroundColor: theme.containerBackground,
        borderRadius: '8px',
        border: `1px solid ${theme.borderColor}`,
        overflow: 'hidden',
        ...style,
      }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header */}
      <Header state={state} actions={actions} theme={theme} />

      {/* Canvas */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: `${width} / ${height}`,
          backgroundColor: '#000',
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef as React.RefObject<HTMLCanvasElement>}
          width={width}
          height={height}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
        {state.status === 'loading' && (
          <LoadingOverlay theme={theme} />
        )}
        {state.error && <ErrorOverlay error={state.error} theme={theme} />}
        {state.status === 'no-webgpu' && <NoWebGPUOverlay theme={theme} />}
      </div>

      {/* Panels */}
      <PanelStack state={state} actions={actions} theme={theme} panels={panels} />
    </div>
  );
};

// =============================================================================
// PANEL STACK
// =============================================================================

interface PanelStackProps {
  state: GaussianSplatViewerState;
  actions: GaussianSplatViewerActions;
  theme: GaussianSplatViewerTheme;
  panels: GaussianSplatPanel[];
}

const PanelStack: React.FC<PanelStackProps> = ({ state, actions, theme, panels }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {panels.includes('status') && (
        <StatusPanel state={state} theme={theme} />
      )}
      {panels.includes('metrics') && state.stats && (
        <MetricsPanel state={state} theme={theme} />
      )}
      {panels.includes('gpu') && state.adapterInfo && (
        <GPUPanel state={state} theme={theme} />
      )}
      {panels.includes('camera') && state.isLoaded && (
        <CameraPanel state={state} theme={theme} />
      )}
      {panels.includes('controls') && (
        <ControlsPanel state={state} actions={actions} theme={theme} />
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// ─── Shared Sub-Component Props ────────────────────────────────────────

interface SubProps {
  state: GaussianSplatViewerState;
  actions: GaussianSplatViewerActions;
  theme: GaussianSplatViewerTheme;
}

interface ReadOnlySubProps {
  state: GaussianSplatViewerState;
  theme: GaussianSplatViewerTheme;
}

// ─── Header ────────────────────────────────────────────────────────────

const Header: React.FC<SubProps> = ({ state, actions, theme }) => {
  const statusColor = getStatusColor(state.status, theme);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        background: theme.cardBackground,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Status indicator dot */}
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: statusColor,
            display: 'inline-block',
            boxShadow: state.status === 'rendering'
              ? `0 0 6px ${statusColor}`
              : 'none',
          }}
          aria-hidden="true"
        />
        <span style={{ fontWeight: 600, fontSize: `calc(0.9rem * ${theme.fontScale})` }}>
          Gaussian Splat Viewer
        </span>
        {state.isLoaded && (
          <span
            style={{
              fontSize: `calc(0.65rem * ${theme.fontScale})`,
              color: theme.gpuColor,
              border: `1px solid ${theme.gpuColor}`,
              borderRadius: '3px',
              padding: '0.1rem 0.35rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            WebGPU
          </span>
        )}
        {state.splatCount > 0 && (
          <span
            style={{
              fontSize: `calc(0.65rem * ${theme.fontScale})`,
              color: theme.textMuted,
            }}
          >
            {formatNumber(state.splatCount)} splats
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {state.status === 'ready' && state.isLoaded && (
          <ActionButton
            label="Start"
            onClick={() => actions.startRendering()}
            theme={theme}
            color={theme.successColor}
          />
        )}
        {state.status === 'rendering' && (
          <>
            <ActionButton
              label="Pause"
              onClick={() => actions.togglePause()}
              theme={theme}
              color={theme.warningColor}
            />
            <ActionButton
              label="Stop"
              onClick={() => actions.stopRendering()}
              theme={theme}
              color={theme.errorColor}
            />
          </>
        )}
        {state.status === 'paused' && (
          <>
            <ActionButton
              label="Resume"
              onClick={() => actions.togglePause()}
              theme={theme}
              color={theme.successColor}
            />
            <ActionButton
              label="Stop"
              onClick={() => actions.stopRendering()}
              theme={theme}
              color={theme.errorColor}
            />
          </>
        )}
      </div>
    </div>
  );
};

// ─── Compact HUD (Fullscreen Mode) ────────────────────────────────────

const CompactHUD: React.FC<SubProps> = ({ state, actions, theme }) => {
  const statusColor = getStatusColor(state.status, theme);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0.8rem',
        backgroundColor: 'rgba(10, 10, 26, 0.8)',
        backdropFilter: 'blur(6px)',
        borderRadius: '6px',
        border: `1px solid ${theme.borderColor}`,
        fontFamily: theme.fontFamily,
        fontSize: `calc(0.75rem * ${theme.fontScale})`,
        color: theme.textPrimary,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          display: 'inline-block',
          flexShrink: 0,
          boxShadow: state.status === 'rendering'
            ? `0 0 4px ${statusColor}`
            : 'none',
        }}
        aria-hidden="true"
      />
      <span style={{ color: statusColor, fontWeight: 600 }}>
        {getStatusLabel(state.status)}
      </span>
      {state.stats && (
        <>
          <span style={{ color: theme.textMuted }}>|</span>
          <span style={{ color: theme.textSecondary }}>
            {state.stats.avgFPS.toFixed(0)} fps
          </span>
          <span style={{ color: theme.textMuted }}>|</span>
          <span style={{ color: theme.textSecondary }}>
            {formatMs(state.stats.avgFrameMs)}
          </span>
        </>
      )}
      {state.splatCount > 0 && (
        <>
          <span style={{ color: theme.textMuted }}>|</span>
          <span style={{ color: theme.gpuColor, fontWeight: 600 }}>
            {formatNumber(state.splatCount)}
          </span>
        </>
      )}
      {state.status === 'rendering' && (
        <ActionButton
          label="||"
          onClick={() => actions.togglePause()}
          theme={theme}
          small
        />
      )}
      {state.status === 'paused' && (
        <ActionButton
          label=">"
          onClick={() => actions.togglePause()}
          theme={theme}
          small
          color={theme.successColor}
        />
      )}
    </div>
  );
};

// ─── Status Panel ──────────────────────────────────────────────────────

const StatusPanel: React.FC<ReadOnlySubProps> = ({ state, theme }) => {
  const statusColor = getStatusColor(state.status, theme);

  return (
    <PanelContainer title="Status" theme={theme}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <MetricItem
          label="Pipeline"
          value={getStatusLabel(state.status)}
          valueColor={statusColor}
          theme={theme}
        />
        <MetricItem
          label="Backend"
          value={state.adapterInfo ? 'WebGPU' : 'Pending'}
          valueColor={state.adapterInfo ? theme.gpuColor : theme.textMuted}
          theme={theme}
        />
        <MetricItem
          label="Splats"
          value={state.splatCount > 0 ? formatNumber(state.splatCount) : '--'}
          theme={theme}
        />
        <MetricItem
          label="Data"
          value={state.isLoaded ? 'Loaded' : 'Not Loaded'}
          valueColor={state.isLoaded ? theme.successColor : theme.textMuted}
          theme={theme}
        />
      </div>
      {state.error && (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem',
            borderRadius: '4px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${theme.errorColor}`,
            color: theme.errorColor,
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
          }}
          role="alert"
        >
          {state.error}
        </div>
      )}
    </PanelContainer>
  );
};

// ─── Metrics Panel ─────────────────────────────────────────────────────

const MetricsPanel: React.FC<ReadOnlySubProps> = ({ state, theme }) => {
  const stats = state.stats;
  if (!stats) return null;

  const frameBudgetMs = 16.67; // 60fps target
  const budgetUsage = (stats.avgFrameMs / frameBudgetMs) * 100;

  return (
    <PanelContainer title="Performance" theme={theme}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
        <MetricItem
          label="FPS"
          value={`${stats.avgFPS.toFixed(0)}`}
          valueColor={
            stats.avgFPS >= 55 ? theme.successColor
              : stats.avgFPS >= 30 ? theme.warningColor
                : theme.errorColor
          }
          theme={theme}
        />
        <MetricItem
          label="Frame"
          value={formatMs(stats.avgFrameMs)}
          theme={theme}
        />
        <MetricItem
          label="P95"
          value={formatMs(stats.p95FrameMs)}
          valueColor={stats.p95FrameMs > frameBudgetMs ? theme.warningColor : undefined}
          theme={theme}
        />
        <MetricItem
          label="Sort"
          value={formatMs(stats.avgSortMs)}
          theme={theme}
        />
        <MetricItem
          label="Raster"
          value={formatMs(stats.avgRasterMs)}
          theme={theme}
        />
        <MetricItem
          label="Window"
          value={String(stats.windowSize)}
          theme={theme}
        />
      </div>
      {/* Frame budget bar */}
      <div style={{ marginTop: '0.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            color: theme.textMuted,
            marginBottom: '0.25rem',
          }}
        >
          <span>Frame Budget (16.67ms)</span>
          <span>{budgetUsage.toFixed(0)}%</span>
        </div>
        <div
          style={{
            height: '4px',
            borderRadius: '2px',
            backgroundColor: theme.borderColor,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(budgetUsage, 100)}%`,
              borderRadius: '2px',
              backgroundColor:
                budgetUsage > 100 ? theme.errorColor
                  : budgetUsage > 80 ? theme.warningColor
                    : theme.successColor,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
      {/* Last frame breakdown */}
      {state.lastFrame && (
        <div style={{ marginTop: '0.5rem' }}>
          <div
            style={{
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              color: theme.textMuted,
              marginBottom: '0.25rem',
            }}
          >
            Last Frame Breakdown
          </div>
          <div
            style={{
              display: 'flex',
              height: '6px',
              borderRadius: '3px',
              overflow: 'hidden',
              backgroundColor: theme.borderColor,
            }}
          >
            {/* Sort key gen */}
            <div
              style={{
                width: `${(state.lastFrame.sortKeyGenMs / state.lastFrame.totalMs) * 100}%`,
                backgroundColor: theme.accentColor,
              }}
              title={`Key Gen: ${formatMs(state.lastFrame.sortKeyGenMs)}`}
            />
            {/* Sort */}
            <div
              style={{
                width: `${(state.lastFrame.sortMs / state.lastFrame.totalMs) * 100}%`,
                backgroundColor: theme.gpuColor,
              }}
              title={`Sort: ${formatMs(state.lastFrame.sortMs)}`}
            />
            {/* Raster */}
            <div
              style={{
                width: `${(state.lastFrame.rasterMs / state.lastFrame.totalMs) * 100}%`,
                backgroundColor: theme.successColor,
              }}
              title={`Raster: ${formatMs(state.lastFrame.rasterMs)}`}
            />
          </div>
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginTop: '0.25rem',
              fontSize: `calc(0.65rem * ${theme.fontScale})`,
            }}
          >
            <BreakdownLegend label="KeyGen" color={theme.accentColor} theme={theme} />
            <BreakdownLegend label="Sort" color={theme.gpuColor} theme={theme} />
            <BreakdownLegend label="Raster" color={theme.successColor} theme={theme} />
          </div>
        </div>
      )}
    </PanelContainer>
  );
};

// ─── GPU Panel ─────────────────────────────────────────────────────────

const GPUPanel: React.FC<ReadOnlySubProps> = ({ state, theme }) => {
  const stats = state.stats;
  if (!state.adapterInfo) return null;

  return (
    <PanelContainer title="GPU" theme={theme} accentColor={theme.gpuColor}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <MetricItem
          label="Adapter"
          value={state.adapterInfo}
          theme={theme}
        />
        {stats && (
          <>
            <MetricItem
              label="VRAM Est."
              value={formatBytes(stats.gpuMemoryBytes)}
              theme={theme}
            />
            <MetricItem
              label="Total Splats"
              value={formatNumber(stats.totalSplats)}
              theme={theme}
            />
            <MetricItem
              label="Min/Max Frame"
              value={`${formatMs(stats.minFrameMs)} / ${formatMs(stats.maxFrameMs)}`}
              theme={theme}
            />
          </>
        )}
      </div>
    </PanelContainer>
  );
};

// ─── Camera Panel ──────────────────────────────────────────────────────

const CameraPanel: React.FC<ReadOnlySubProps> = ({ state, theme }) => {
  const cam = state.camera;

  const formatVec = (v: [number, number, number]): string =>
    `[${v[0].toFixed(2)}, ${v[1].toFixed(2)}, ${v[2].toFixed(2)}]`;

  return (
    <PanelContainer title="Camera" theme={theme}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <MetricItem
          label="Position"
          value={formatVec(cam.position)}
          theme={theme}
        />
        <MetricItem
          label="Target"
          value={formatVec(cam.target)}
          theme={theme}
        />
        <MetricItem
          label="FOV"
          value={`${cam.fovY.toFixed(0)} deg`}
          theme={theme}
        />
        <MetricItem
          label="Aspect"
          value={cam.aspect.toFixed(2)}
          theme={theme}
        />
      </div>
    </PanelContainer>
  );
};

// ─── Controls Panel ────────────────────────────────────────────────────

const ControlsPanel: React.FC<SubProps> = ({ state, actions, theme }) => {
  return (
    <PanelContainer
      title="Controls"
      theme={theme}
      action={
        state.isLoaded
          ? (
            <ActionButton
              label="Reset Camera"
              onClick={() => actions.resetCamera()}
              theme={theme}
              small
            />
          )
          : undefined
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {/* PLY URL input */}
        <PLYLoadInput actions={actions} theme={theme} state={state} />

        {/* Action buttons row */}
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          {state.isLoaded && state.status !== 'rendering' && (
            <ActionButton
              label="Render Frame"
              onClick={() => actions.renderSingleFrame()}
              theme={theme}
            />
          )}
          {state.isLoaded && (
            <ActionButton
              label="Dispose"
              onClick={() => actions.dispose()}
              theme={theme}
              color={theme.errorColor}
            />
          )}
        </div>

        {/* Input hints */}
        <div
          style={{
            fontSize: `calc(0.65rem * ${theme.fontScale})`,
            color: theme.textMuted,
            lineHeight: 1.5,
          }}
        >
          <div>Left drag: Orbit | Scroll: Zoom | Middle drag: Pan</div>
        </div>
      </div>
    </PanelContainer>
  );
};

// ─── PLY Load Input ────────────────────────────────────────────────────

interface PLYLoadInputProps {
  actions: GaussianSplatViewerActions;
  state: GaussianSplatViewerState;
  theme: GaussianSplatViewerTheme;
}

const PLYLoadInput: React.FC<PLYLoadInputProps> = ({ actions, state, theme }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleLoad = () => {
    const url = inputRef.current?.value?.trim();
    if (url) {
      actions.loadPLY(url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLoad();
    }
  };

  if (state.status === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.6rem',
          borderRadius: '4px',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          border: `1px solid ${theme.accentColor}`,
          fontSize: `calc(0.75rem * ${theme.fontScale})`,
          color: theme.accentColor,
        }}
      >
        Loading PLY data...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Enter PLY/splat URL..."
        onKeyDown={handleKeyDown}
        style={{
          flex: 1,
          fontSize: `calc(0.75rem * ${theme.fontScale})`,
          fontFamily: theme.fontFamily,
          color: theme.textPrimary,
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: `1px solid ${theme.borderColor}`,
          borderRadius: '4px',
          padding: '0.3rem 0.5rem',
          outline: 'none',
        }}
        aria-label="PLY file URL"
      />
      <ActionButton
        label="Load"
        onClick={handleLoad}
        theme={theme}
        color={theme.accentColor}
      />
    </div>
  );
};

// =============================================================================
// OVERLAY COMPONENTS
// =============================================================================

interface OverlayProps {
  theme: GaussianSplatViewerTheme;
}

const LoadingOverlay: React.FC<OverlayProps> = ({ theme }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        color: theme.accentColor,
        fontFamily: theme.fontFamily,
        fontSize: `calc(1rem * ${theme.fontScale})`,
        fontWeight: 600,
        zIndex: 10,
      }}
      role="status"
      aria-label="Loading"
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '0.5rem' }}>Loading Gaussian Splat Data</div>
        <div
          style={{
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
            color: theme.textMuted,
            fontWeight: 400,
          }}
        >
          Parsing PLY and uploading to GPU...
        </div>
      </div>
    </div>
  );
};

interface ErrorOverlayProps {
  error: string;
  theme: GaussianSplatViewerTheme;
}

const ErrorOverlay: React.FC<ErrorOverlayProps> = ({ error, theme }) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        right: '1rem',
        padding: '0.75rem 1rem',
        borderRadius: '6px',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        border: `1px solid ${theme.errorColor}`,
        color: theme.errorColor,
        fontFamily: theme.fontFamily,
        fontSize: `calc(0.8rem * ${theme.fontScale})`,
        zIndex: 10,
      }}
      role="alert"
    >
      <strong>Error:</strong> {error}
    </div>
  );
};

const NoWebGPUOverlay: React.FC<OverlayProps> = ({ theme }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: theme.errorColor,
        fontFamily: theme.fontFamily,
        fontSize: `calc(1rem * ${theme.fontScale})`,
        zIndex: 10,
      }}
      role="alert"
    >
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ fontWeight: 700, marginBottom: '0.75rem' }}>
          WebGPU Not Available
        </div>
        <div
          style={{
            fontSize: `calc(0.85rem * ${theme.fontScale})`,
            color: theme.textSecondary,
            lineHeight: 1.6,
          }}
        >
          This viewer requires WebGPU support. Please use a browser that supports
          WebGPU (Chrome 113+, Edge 113+, or Firefox Nightly with WebGPU enabled).
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SHARED UI PRIMITIVES
// =============================================================================

interface PanelContainerProps {
  title: string;
  theme: GaussianSplatViewerTheme;
  accentColor?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const PanelContainer: React.FC<PanelContainerProps> = ({
  title,
  theme,
  accentColor,
  action,
  children,
}) => {
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: accentColor ?? theme.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
};

interface MetricItemProps {
  label: string;
  value: string;
  valueColor?: string;
  theme: GaussianSplatViewerTheme;
}

const MetricItem: React.FC<MetricItemProps> = ({ label, value, valueColor, theme }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.15rem',
      }}
    >
      <span
        style={{
          fontSize: `calc(0.65rem * ${theme.fontScale})`,
          color: theme.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: `calc(0.85rem * ${theme.fontScale})`,
          fontWeight: 600,
          color: valueColor ?? theme.textPrimary,
        }}
      >
        {value}
      </span>
    </div>
  );
};

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  theme: GaussianSplatViewerTheme;
  color?: string;
  small?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  theme,
  color,
  small = false,
}) => {
  const resolvedColor = color ?? theme.accentColor;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: small
          ? `calc(0.65rem * ${theme.fontScale})`
          : `calc(0.7rem * ${theme.fontScale})`,
        fontWeight: 500,
        fontFamily: theme.fontFamily,
        color: resolvedColor,
        backgroundColor: 'transparent',
        border: `1px solid ${resolvedColor}`,
        borderRadius: '4px',
        padding: small ? '0.1rem 0.4rem' : '0.2rem 0.6rem',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.target as HTMLButtonElement).style.backgroundColor = `${resolvedColor}20`;
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
      }}
    >
      {label}
    </button>
  );
};

interface BreakdownLegendProps {
  label: string;
  color: string;
  theme: GaussianSplatViewerTheme;
}

const BreakdownLegend: React.FC<BreakdownLegendProps> = ({ label, color, theme }) => {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: `calc(0.65rem * ${theme.fontScale})`,
        color: theme.textMuted,
      }}
    >
      <span
        style={{
          width: '8px',
          height: '4px',
          borderRadius: '1px',
          backgroundColor: color,
          display: 'inline-block',
        }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
};

export default GaussianSplatViewer;
