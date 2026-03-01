/**
 * RendererStatsOverlay Component
 *
 * A floating Studio IDE panel that displays:
 *   - WebGPU / WebGL2 renderer toggle switch
 *   - Real-time FPS counter with colour-coded health
 *   - GPU utilization meter (bar + percentage)
 *   - Draw call count
 *   - Triangle count
 *   - GPU name / adapter info
 *
 * Auto-detects WebGPU support with WebGL2 fallback.
 * Persists user preference across sessions via localStorage.
 *
 * @module studio/RendererStatsOverlay
 */

import React, { useMemo, type CSSProperties } from 'react';
import type * as THREE from 'three';
import { useRendererToggle, type UseRendererToggleOptions } from './useRendererToggle';
import type { RendererBackend } from './RendererDetector';
import type { RenderStats } from './PerformanceMonitor';

// =============================================================================
// TYPES
// =============================================================================

export interface RendererStatsOverlayProps {
  /** Three.js renderer instance to monitor */
  renderer?: THREE.WebGLRenderer;
  /** Position of the overlay (default: 'top-right') */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Whether the panel starts collapsed (default: false) */
  defaultCollapsed?: boolean;
  /** Stats refresh rate in ms (default: 250) */
  refreshInterval?: number;
  /** Called when the user switches renderer backend */
  onBackendChange?: (backend: RendererBackend) => void;
  /** Additional CSS class for the root element */
  className?: string;
  /** Override root styles */
  style?: CSSProperties;
  /** Whether to show GPU name (default: true) */
  showGPUName?: boolean;
  /** Whether to show the toggle switch (default: true) */
  showToggle?: boolean;
  /** Opacity of the panel (0-1, default: 0.92) */
  opacity?: number;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Format large numbers with K/M suffixes */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

/** Get colour for FPS value */
function fpsColor(fps: number): string {
  if (fps >= 55) return '#4ade80'; // green
  if (fps >= 30) return '#facc15'; // yellow
  return '#ef4444';                // red
}

/** Get colour for GPU utilization % */
function gpuColor(pct: number): string {
  if (pct < 0) return '#666';      // unavailable
  if (pct <= 50) return '#4ade80';  // green
  if (pct <= 80) return '#facc15';  // yellow
  return '#ef4444';                 // red
}

// =============================================================================
// STYLES
// =============================================================================

const POSITIONS: Record<string, CSSProperties> = {
  'top-left': { top: 12, left: 12 },
  'top-right': { top: 12, right: 12 },
  'bottom-left': { bottom: 12, left: 12 },
  'bottom-right': { bottom: 12, right: 12 },
};

function createStyles(
  position: string,
  opacity: number,
  collapsed: boolean,
): Record<string, CSSProperties> {
  return {
    root: {
      position: 'fixed',
      zIndex: 10000,
      ...(POSITIONS[position] || POSITIONS['top-right']),
      minWidth: collapsed ? 48 : 220,
      fontFamily:
        '"JetBrains Mono", "Fira Code", "SF Mono", "Cascadia Code", monospace',
      fontSize: 11,
      lineHeight: 1.5,
      color: '#d4d4d8',
      backgroundColor: `rgba(15, 15, 25, ${opacity})`,
      backdropFilter: 'blur(12px)',
      borderRadius: 10,
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      overflow: 'hidden',
      userSelect: 'none',
      transition: 'min-width 0.2s ease',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      borderBottom: collapsed
        ? 'none'
        : '1px solid rgba(255, 255, 255, 0.06)',
      cursor: 'pointer',
    },
    headerTitle: {
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      color: '#a1a1aa',
    },
    collapseIcon: {
      width: 14,
      height: 14,
      color: '#71717a',
      transition: 'transform 0.2s ease',
      transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
    },
    body: {
      padding: collapsed ? 0 : '8px 12px 12px',
      maxHeight: collapsed ? 0 : 400,
      overflow: 'hidden',
      transition: 'max-height 0.25s ease, padding 0.25s ease',
    },
    // Toggle switch row
    toggleRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    toggleLabel: {
      fontSize: 10,
      fontWeight: 600,
      color: '#a1a1aa',
    },
    toggleTrack: {
      position: 'relative' as const,
      width: 92,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
    },
    toggleThumb: {
      position: 'absolute' as const,
      top: 2,
      width: 44,
      height: 18,
      borderRadius: 9,
      transition: 'left 0.2s ease, background-color 0.2s ease',
    },
    toggleOptionLabel: {
      flex: 1,
      textAlign: 'center' as const,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.04em',
      position: 'relative' as const,
      zIndex: 1,
      lineHeight: '24px',
    },
    // Stats row
    statRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '3px 0',
    },
    statLabel: {
      fontSize: 10,
      color: '#71717a',
    },
    statValue: {
      fontSize: 12,
      fontWeight: 700,
      fontVariantNumeric: 'tabular-nums',
    },
    // GPU utilization bar
    gpuBarOuter: {
      width: '100%',
      height: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      marginTop: 2,
      marginBottom: 6,
      overflow: 'hidden',
    },
    gpuBarInner: {
      height: '100%',
      borderRadius: 2,
      transition: 'width 0.3s ease, background-color 0.3s ease',
    },
    // Divider
    divider: {
      height: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      margin: '6px 0',
    },
    // GPU name
    gpuName: {
      fontSize: 9,
      color: '#52525b',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      marginTop: 4,
    },
    // Detecting state
    detectingBadge: {
      fontSize: 9,
      color: '#71717a',
      fontStyle: 'italic',
    },
    // Unavailable badge for disabled toggle option
    unavailableBadge: {
      fontSize: 8,
      color: '#ef4444',
      marginLeft: 4,
    },
  };
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Stat row: label + value */
const StatRow: React.FC<{
  label: string;
  value: string;
  color?: string;
  ariaLabel?: string;
}> = ({ label, value, color, ariaLabel }) => {
  const styles = createStyles('top-right', 1, false);
  return (
    <div style={styles.statRow} role="group" aria-label={ariaLabel || label}>
      <span style={styles.statLabel}>{label}</span>
      <span style={{ ...styles.statValue, color: color || '#d4d4d8' }}>
        {value}
      </span>
    </div>
  );
};

/** Toggle switch between WebGPU and WebGL2 */
const BackendToggle: React.FC<{
  active: RendererBackend;
  webgpuAvailable: boolean;
  webgl2Available: boolean;
  onToggle: () => void;
  disabled: boolean;
}> = ({ active, webgpuAvailable, webgl2Available, onToggle, disabled }) => {
  const styles = createStyles('top-right', 1, false);

  const isWebGPU = active === 'webgpu';
  const canToggle = webgpuAvailable && webgl2Available && !disabled;

  return (
    <div style={styles.toggleRow}>
      <span style={styles.toggleLabel}>Renderer</span>
      <div
        style={{
          ...styles.toggleTrack,
          opacity: canToggle ? 1 : 0.5,
          cursor: canToggle ? 'pointer' : 'not-allowed',
        }}
        onClick={canToggle ? onToggle : undefined}
        role="switch"
        aria-checked={isWebGPU}
        aria-label="Toggle renderer backend"
        tabIndex={canToggle ? 0 : -1}
        onKeyDown={(e) => {
          if (canToggle && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        {/* Sliding thumb */}
        <div
          style={{
            ...styles.toggleThumb,
            left: isWebGPU ? 2 : 46,
            backgroundColor: isWebGPU ? '#6366f1' : '#3b82f6',
          }}
        />
        {/* Labels */}
        <span
          style={{
            ...styles.toggleOptionLabel,
            color: isWebGPU ? '#fff' : '#71717a',
          }}
        >
          GPU
        </span>
        <span
          style={{
            ...styles.toggleOptionLabel,
            color: !isWebGPU ? '#fff' : '#71717a',
          }}
        >
          GL2
        </span>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const RendererStatsOverlay = React.memo<RendererStatsOverlayProps>(
  function RendererStatsOverlay({
    renderer,
    position = 'top-right',
    defaultCollapsed = false,
    refreshInterval = 250,
    onBackendChange,
    className,
    style,
    showGPUName = true,
    showToggle = true,
    opacity = 0.92,
  }) {
    // -----------------------------------------------------------------------
    // Collapse state
    // -----------------------------------------------------------------------
    const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

    // -----------------------------------------------------------------------
    // Hook: renderer toggle + performance monitor
    // -----------------------------------------------------------------------
    const {
      activeBackend,
      detecting,
      stats,
      webgpuAvailable,
      webgl2Available,
      toggleBackend,
      gpuName,
    } = useRendererToggle({
      renderer,
      statsRefreshInterval: refreshInterval,
      onBackendChange,
      autoStart: true,
    } as UseRendererToggleOptions);

    // -----------------------------------------------------------------------
    // Memoized styles
    // -----------------------------------------------------------------------
    const styles = useMemo(
      () => createStyles(position, opacity, collapsed),
      [position, opacity, collapsed],
    );

    // -----------------------------------------------------------------------
    // Stat formatting
    // -----------------------------------------------------------------------
    const fpsText = stats.fps > 0 ? `${Math.round(stats.fps)}` : '--';
    const drawCallText = formatCount(stats.drawCalls);
    const triangleText = formatCount(stats.triangles);
    const gpuPct =
      stats.gpuUtilization >= 0 ? Math.round(stats.gpuUtilization) : -1;
    const gpuPctText = gpuPct >= 0 ? `${gpuPct}%` : 'N/A';
    const frameTimeText =
      stats.frameTimeMs > 0 ? `${stats.frameTimeMs.toFixed(1)}ms` : '--';

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
      <div
        style={{ ...styles.root, ...style }}
        className={className}
        role="region"
        aria-label="Renderer statistics overlay"
      >
        {/* Header */}
        <div
          style={styles.header}
          onClick={() => setCollapsed((c) => !c)}
          role="button"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand renderer stats' : 'Collapse renderer stats'}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setCollapsed((c) => !c);
            }
          }}
        >
          <span style={styles.headerTitle}>
            {stats.backendLabel || 'Renderer'}
          </span>
          {/* Collapse chevron */}
          <svg
            style={styles.collapseIcon}
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <polyline points="4 5 7 8 10 5" />
          </svg>
        </div>

        {/* Body */}
        <div style={styles.body} aria-hidden={collapsed}>
          {/* Toggle switch */}
          {showToggle && (
            <BackendToggle
              active={activeBackend}
              webgpuAvailable={webgpuAvailable}
              webgl2Available={webgl2Available}
              onToggle={toggleBackend}
              disabled={detecting}
            />
          )}

          {detecting && (
            <div style={styles.detectingBadge}>Detecting GPU capabilities...</div>
          )}

          {/* FPS */}
          <StatRow
            label="FPS"
            value={fpsText}
            color={fpsColor(stats.fps)}
            ariaLabel={`Frames per second: ${fpsText}`}
          />

          {/* Frame time */}
          <StatRow
            label="Frame"
            value={frameTimeText}
            ariaLabel={`Frame time: ${frameTimeText}`}
          />

          {/* GPU utilization */}
          <StatRow
            label="GPU"
            value={gpuPctText}
            color={gpuColor(stats.gpuUtilization)}
            ariaLabel={`GPU utilization: ${gpuPctText}`}
          />
          {gpuPct >= 0 && (
            <div style={styles.gpuBarOuter}>
              <div
                style={{
                  ...styles.gpuBarInner,
                  width: `${Math.min(100, gpuPct)}%`,
                  backgroundColor: gpuColor(gpuPct),
                }}
              />
            </div>
          )}

          <div style={styles.divider} />

          {/* Draw calls */}
          <StatRow
            label="Draw Calls"
            value={drawCallText}
            ariaLabel={`Draw calls: ${drawCallText}`}
          />

          {/* Triangles */}
          <StatRow
            label="Triangles"
            value={triangleText}
            ariaLabel={`Triangle count: ${triangleText}`}
          />

          {/* GPU name */}
          {showGPUName && (
            <>
              <div style={styles.divider} />
              <div style={styles.gpuName} title={gpuName}>
                {gpuName}
              </div>
            </>
          )}
        </div>
      </div>
    );
  },
);

export default RendererStatsOverlay;
