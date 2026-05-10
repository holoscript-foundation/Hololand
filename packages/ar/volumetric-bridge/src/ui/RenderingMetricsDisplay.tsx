/**
 * RenderingMetricsDisplay — Real-time Gaussian Rendering Metrics
 *
 * Displays live rendering metrics for Gaussian splatting scenes:
 * - Gaussian count (visible / budget)
 * - GPU memory usage with threshold bar
 * - FPS with optional sparkline graph
 * - LOD level indicator
 * - Budget capping warnings
 * - Memory state (normal / warning / reduction / emergency)
 *
 * @module volumetric-bridge/ui
 */

import { useMemo } from 'react';
import type { RenderingMetricsDisplayProps, RenderingMetrics } from './types';
import type { MemoryState } from '../GaussianBudgetManager';

// =============================================================================
// STYLES
// =============================================================================

const MEMORY_STATE_COLORS: Record<MemoryState['thresholdState'], string> = {
  normal: '#4a9eff',
  warning: '#ffaa00',
  reduction: '#ff6b6b',
  emergency: '#ff2222',
};

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '12px',
    color: '#e0e0e0',
    userSelect: 'none' as const,
  },
  panel: {
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '6px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  inline: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  minimal: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    fontSize: '10px',
  },
  sectionTitle: {
    fontSize: '10px',
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: '#666',
    marginBottom: '2px',
  },
  metricGroup: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  metric: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1px',
  },
  metricInline: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  metricValue: (color?: string) => ({
    fontSize: '16px',
    fontWeight: 700 as const,
    fontVariantNumeric: 'tabular-nums' as const,
    color: color ?? '#e0e0e0',
    lineHeight: 1.2,
  }),
  metricValueSmall: (color?: string) => ({
    fontSize: '13px',
    fontWeight: 600 as const,
    fontVariantNumeric: 'tabular-nums' as const,
    color: color ?? '#ccc',
  }),
  metricLabel: {
    fontSize: '9px',
    color: '#666',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  metricUnit: {
    fontSize: '10px',
    color: '#666',
    fontWeight: 400 as const,
  },
  memoryBar: {
    height: '4px',
    background: '#222',
    borderRadius: '2px',
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  memoryFill: (pct: number, state: MemoryState['thresholdState']) => ({
    height: '100%',
    width: `${Math.min(pct, 100)}%`,
    background: MEMORY_STATE_COLORS[state],
    borderRadius: '2px',
    transition: 'width 0.3s ease-out, background 0.3s',
  }),
  memoryThresholds: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  memoryThresholdLine: (pct: number) => ({
    position: 'absolute' as const,
    left: `${pct}%`,
    top: 0,
    bottom: 0,
    width: '1px',
    background: '#555',
  }),
  fpsGraph: {
    display: 'flex',
    alignItems: 'flex-end',
    height: '24px',
    gap: '1px',
  },
  fpsBar: (height: number, color: string) => ({
    width: '2px',
    height: `${height}%`,
    background: color,
    borderRadius: '1px 1px 0 0',
    minHeight: '1px',
  }),
  statusBadge: (state: MemoryState['thresholdState']) => ({
    fontSize: '9px',
    padding: '1px 5px',
    borderRadius: '3px',
    fontWeight: 700 as const,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    background:
      state === 'normal'
        ? '#1a3a1a'
        : state === 'warning'
          ? '#3a3a1a'
          : state === 'reduction'
            ? '#3a2a1a'
            : '#3a1a1a',
    color: MEMORY_STATE_COLORS[state],
  }),
  budgetCappedBadge: {
    fontSize: '9px',
    padding: '1px 5px',
    borderRadius: '3px',
    background: '#3a1a1a',
    color: '#ff6b6b',
    fontWeight: 700 as const,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  },
};

// =============================================================================
// HELPERS
// =============================================================================

function formatCount(n: number): string {
  if (n === 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatMemoryMB(mb: number): string {
  if (mb === 0) return '0';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}`;
  return mb.toFixed(0);
}

function getMemoryUnit(mb: number): string {
  return mb >= 1024 ? 'GB' : 'MB';
}

function getFPSColor(fps: number, target: number): string {
  if (fps >= target) return '#4aef4a';
  if (fps >= target * 0.8) return '#ffaa00';
  return '#ff4444';
}

// =============================================================================
// MINI FPS GRAPH
// =============================================================================

interface FPSGraphProps {
  history: number[];
  targetFPS?: number;
  width?: number;
}

const FPSGraph = ({ history, targetFPS = 60, width = 60 }: FPSGraphProps) => {
  const maxFPS = Math.max(targetFPS * 1.2, ...history);
  const visibleBars = Math.min(history.length, width);
  const recentHistory = history.slice(-visibleBars);

  return (
    <div style={styles.fpsGraph} role="img" aria-label="FPS history graph">
      {recentHistory.map((fps, i) => {
        const heightPct = maxFPS > 0 ? (fps / maxFPS) * 100 : 0;
        const color = getFPSColor(fps, targetFPS);
        return <div key={i} style={styles.fpsBar(heightPct, color)} />;
      })}
    </div>
  );
};

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Rendering Metrics Display component.
 *
 * Shows live Gaussian splatting rendering metrics in three layout modes:
 * - `panel`: Full card layout with all metrics, memory bar, and FPS graph
 * - `inline`: Compact horizontal row for toolbars
 * - `minimal`: Ultra-compact single-line for overlays
 *
 * Usage:
 * ```tsx
 * <RenderingMetricsDisplay
 *   metrics={{
 *     gaussianCount: 125000,
 *     memoryMB: 7.5,
 *     fps: 72,
 *     budgetCapped: false,
 *     activeLODLevel: 4,
 *     totalLODLevels: 6,
 *     levelsDropped: 0,
 *     memoryState: 'normal',
 *   }}
 *   layout="panel"
 *   showMemoryBar
 *   showFPSGraph
 * />
 * ```
 */
export const RenderingMetricsDisplay = ({
  metrics,
  layout = 'panel',
  showMemoryBar = true,
  showFPSGraph = false,
  className,
}: RenderingMetricsDisplayProps) => {
  const fpsColor = getFPSColor(metrics.fps, 60);

  // Memory bar percentage (assume 1.5GB ceiling for mobile VR)
  const memoryPct = useMemo(() => {
    const ceilingMB = 1500; // Default mobile VR ceiling
    return (metrics.memoryMB / ceilingMB) * 100;
  }, [metrics.memoryMB]);

  // -------------------------------------------------------------------------
  // Minimal layout
  // -------------------------------------------------------------------------

  if (layout === 'minimal') {
    return (
      <div className={className} style={{ ...styles.container, ...styles.minimal }}>
        <span style={styles.metricValueSmall(fpsColor)}>{metrics.fps}</span>
        <span style={{ color: '#666', fontSize: '9px' }}>FPS</span>
        <span style={{ color: '#444' }}>|</span>
        <span style={styles.metricValueSmall()}>{formatCount(metrics.gaussianCount)}</span>
        <span style={{ color: '#666', fontSize: '9px' }}>splats</span>
        {metrics.budgetCapped && <span style={styles.budgetCappedBadge}>CAPPED</span>}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Inline layout
  // -------------------------------------------------------------------------

  if (layout === 'inline') {
    return (
      <div className={className} style={{ ...styles.container, ...styles.inline }}>
        <div style={styles.metricInline}>
          <span style={styles.metricValueSmall(fpsColor)}>{metrics.fps}</span>
          <span style={styles.metricUnit}>FPS</span>
        </div>
        <div style={styles.metricInline}>
          <span style={styles.metricValueSmall()}>{formatCount(metrics.gaussianCount)}</span>
          <span style={styles.metricUnit}>splats</span>
        </div>
        <div style={styles.metricInline}>
          <span style={styles.metricValueSmall()}>{formatMemoryMB(metrics.memoryMB)}</span>
          <span style={styles.metricUnit}>{getMemoryUnit(metrics.memoryMB)}</span>
        </div>
        <div style={styles.metricInline}>
          <span style={styles.metricValueSmall()}>
            LOD {metrics.activeLODLevel}/{metrics.totalLODLevels}
          </span>
        </div>
        {metrics.budgetCapped && <span style={styles.budgetCappedBadge}>BUDGET CAPPED</span>}
        <span style={styles.statusBadge(metrics.memoryState)}>{metrics.memoryState}</span>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Panel layout (default)
  // -------------------------------------------------------------------------

  return (
    <div
      className={className}
      style={{ ...styles.container, ...styles.panel }}
      role="group"
      aria-label="Rendering metrics"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={styles.sectionTitle}>Rendering Metrics</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {metrics.budgetCapped && <span style={styles.budgetCappedBadge}>BUDGET CAPPED</span>}
          <span style={styles.statusBadge(metrics.memoryState)}>{metrics.memoryState}</span>
        </div>
      </div>

      {/* Primary metrics */}
      <div style={styles.metricGroup}>
        {/* Gaussian Count */}
        <div style={styles.metric}>
          <span style={styles.metricValue(metrics.budgetCapped ? '#ff6b6b' : undefined)}>
            {formatCount(metrics.gaussianCount)}
          </span>
          <span style={styles.metricLabel}>Gaussians</span>
        </div>

        {/* GPU Memory */}
        <div style={styles.metric}>
          <div style={styles.metricInline}>
            <span style={styles.metricValue(MEMORY_STATE_COLORS[metrics.memoryState])}>
              {formatMemoryMB(metrics.memoryMB)}
            </span>
            <span style={styles.metricUnit}>{getMemoryUnit(metrics.memoryMB)}</span>
          </div>
          <span style={styles.metricLabel}>VRAM</span>
        </div>

        {/* FPS */}
        <div style={styles.metric}>
          <span style={styles.metricValue(fpsColor)}>{metrics.fps}</span>
          <span style={styles.metricLabel}>FPS</span>
        </div>

        {/* LOD Level */}
        <div style={styles.metric}>
          <div style={styles.metricInline}>
            <span style={styles.metricValue()}>{metrics.activeLODLevel}</span>
            <span style={styles.metricUnit}>/ {metrics.totalLODLevels}</span>
          </div>
          <span style={styles.metricLabel}>
            LOD{metrics.levelsDropped > 0 ? ` (-${metrics.levelsDropped})` : ''}
          </span>
        </div>
      </div>

      {/* Memory usage bar */}
      {showMemoryBar && (
        <div>
          <div style={styles.memoryBar}>
            <div style={styles.memoryFill(memoryPct, metrics.memoryState)} />
            <div style={styles.memoryThresholds}>
              <div style={styles.memoryThresholdLine(70)} title="Warning threshold (70%)" />
              <div style={styles.memoryThresholdLine(85)} title="Reduction threshold (85%)" />
              <div style={styles.memoryThresholdLine(95)} title="Emergency threshold (95%)" />
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '9px',
              color: '#555',
              marginTop: '2px',
            }}
          >
            <span>0 MB</span>
            <span>1.5 GB</span>
          </div>
        </div>
      )}

      {/* FPS graph placeholder (requires fpsHistory from usePerformanceMetrics) */}
      {showFPSGraph && (
        <div>
          <span style={styles.sectionTitle}>FPS History</span>
          <FPSGraph history={[]} targetFPS={72} />
        </div>
      )}
    </div>
  );
};

RenderingMetricsDisplay.displayName = 'RenderingMetricsDisplay';

// =============================================================================
// FPS GRAPH WITH HISTORY (standalone export for use with usePerformanceMetrics)
// =============================================================================

export interface FPSHistoryGraphProps {
  /** FPS history array from usePerformanceMetrics */
  history: number[];
  /** Target FPS for coloring (default: 60) */
  targetFPS?: number;
  /** Number of bars to show (default: 60) */
  barCount?: number;
  /** CSS class name */
  className?: string;
}

/**
 * Standalone FPS history sparkline graph.
 *
 * Usage with usePerformanceMetrics:
 * ```tsx
 * const { fpsHistory } = usePerformanceMetrics({ monitor });
 * return <FPSHistoryGraph history={fpsHistory} targetFPS={72} />;
 * ```
 */
export const FPSHistoryGraph = ({
  history,
  targetFPS = 60,
  barCount = 60,
  className,
}: FPSHistoryGraphProps) => {
  return (
    <div className={className}>
      <FPSGraph history={history} targetFPS={targetFPS} width={barCount} />
    </div>
  );
};

FPSHistoryGraph.displayName = 'FPSHistoryGraph';
