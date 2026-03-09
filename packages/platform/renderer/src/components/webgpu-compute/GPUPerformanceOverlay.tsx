/**
 * GPUPerformanceOverlay
 *
 * Real-time GPU compute performance monitoring overlay.
 * Displays compute dispatch time, memory bandwidth utilization,
 * compute occupancy, buffer sizes, and GPU adapter information.
 *
 * Designed as a floating overlay for development and debugging.
 *
 * @module webgpu-compute/GPUPerformanceOverlay
 */

import React, { useMemo } from 'react';
import type {
  GPUPerformanceOverlayProps,
  GPUPerformanceSample,
  GPUPerfPanel,
  GPUBufferInfo,
  WebGPUComputeTheme,
} from './types';
import { DEFAULT_WEBGPU_COMPUTE_THEME } from './types';
import { useGPUPerformance } from './useWebGPUCompute';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface MiniChartProps {
  data: number[];
  width: number;
  height: number;
  color: string;
  maxValue?: number;
  theme: WebGPUComputeTheme;
  label?: string;
}

const MiniChart: React.FC<MiniChartProps> = ({
  data, width, height, color, maxValue, theme, label,
}) => {
  const max = maxValue ?? Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(' ');

  // Fill area under the line
  const fillPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div style={{ marginBottom: 6 }}>
      {label && (
        <div style={{
          fontSize: theme.fontSize - 2, color: theme.textSecondary, marginBottom: 2,
        }}>
          {label}
        </div>
      )}
      <svg width={width} height={height} style={{ display: 'block' }}>
        <rect width={width} height={height} fill={theme.grid} rx={2} />
        {data.length > 1 && (
          <>
            <polygon points={fillPoints} fill={color + '20'} />
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </>
        )}
        {/* Max line */}
        <line x1={0} y1={0} x2={width} y2={0} stroke={theme.border} strokeDasharray="2,2" />
      </svg>
    </div>
  );
};

interface MetricBarProps {
  label: string;
  value: number;
  maxValue: number;
  unit: string;
  color: string;
  theme: WebGPUComputeTheme;
}

const MetricBar: React.FC<MetricBarProps> = ({
  label, value, maxValue, unit, color, theme,
}) => {
  const pct = Math.min((value / maxValue) * 100, 100);

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: theme.fontSize - 1, marginBottom: 2,
      }}>
        <span style={{ color: theme.textSecondary }}>{label}</span>
        <span style={{ color, fontFamily: theme.monoFontFamily, fontWeight: 600 }}>
          {typeof value === 'number' && value < 100
            ? value.toFixed(2)
            : value.toFixed(0)
          }{unit}
        </span>
      </div>
      <div style={{
        height: 6, background: theme.grid, borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: 3,
          transition: 'width 0.2s ease',
        }} />
      </div>
    </div>
  );
};

interface TabBarProps {
  tabs: { key: GPUPerfPanel; label: string }[];
  active: GPUPerfPanel;
  onSelect: (tab: GPUPerfPanel) => void;
  theme: WebGPUComputeTheme;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, active, onSelect, theme }) => (
  <div style={{
    display: 'flex', gap: 2, marginBottom: 8,
    borderBottom: `1px solid ${theme.border}`, paddingBottom: 4,
  }}>
    {tabs.map((tab) => (
      <button
        key={tab.key}
        onClick={() => onSelect(tab.key)}
        aria-label={`Show ${tab.label} panel`}
        aria-pressed={active === tab.key}
        style={{
          padding: '3px 8px',
          background: active === tab.key ? theme.accent + '25' : 'transparent',
          color: active === tab.key ? theme.accent : theme.textSecondary,
          border: 'none', borderRadius: 3,
          cursor: 'pointer', fontSize: theme.fontSize - 1,
          fontFamily: theme.monoFontFamily, fontWeight: active === tab.key ? 600 : 400,
        }}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

interface BufferTableProps {
  buffers: GPUBufferInfo[];
  theme: WebGPUComputeTheme;
}

const BufferTable: React.FC<BufferTableProps> = ({ buffers, theme }) => {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (buffers.length === 0) {
    return (
      <div style={{ color: theme.textSecondary, fontSize: theme.fontSize - 1, padding: 8, textAlign: 'center' }}>
        No GPU buffers tracked
      </div>
    );
  }

  return (
    <div style={{ fontSize: theme.fontSize - 1 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px',
        gap: 4, padding: '4px 0',
        borderBottom: `1px solid ${theme.border}`,
        color: theme.textSecondary, fontWeight: 600,
      }}>
        <span>Label</span>
        <span>Size</span>
        <span>Usage</span>
        <span>Map</span>
      </div>
      {buffers.map((buf, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px',
          gap: 4, padding: '3px 0',
          borderBottom: `1px solid ${theme.border}20`,
        }}>
          <span style={{ color: theme.text, fontFamily: theme.monoFontFamily }}>{buf.label}</span>
          <span style={{ color: theme.text, fontFamily: theme.monoFontFamily }}>{formatBytes(buf.sizeBytes)}</span>
          <span style={{ color: theme.textSecondary }}>{buf.usage}</span>
          <span style={{ color: buf.mapped ? theme.warning : theme.textSecondary }}>
            {buf.mapped ? 'Yes' : 'No'}
          </span>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// POSITION STYLES
// =============================================================================

const POSITION_STYLES: Record<NonNullable<GPUPerformanceOverlayProps['position']>, React.CSSProperties> = {
  'top-left': { top: 10, left: 10 },
  'top-right': { top: 10, right: 10 },
  'bottom-left': { bottom: 10, left: 10 },
  'bottom-right': { bottom: 10, right: 10 },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * GPUPerformanceOverlay
 *
 * Floating performance monitoring overlay that displays real-time
 * WebGPU compute metrics including dispatch time, memory bandwidth,
 * occupancy, buffer allocations, and adapter capabilities.
 *
 * @example
 * ```tsx
 * <GPUPerformanceOverlay
 *   sampleIntervalMs={100}
 *   position="top-right"
 *   visible={showOverlay}
 * />
 * ```
 */
export const GPUPerformanceOverlay: React.FC<GPUPerformanceOverlayProps> = ({
  performanceState: externalState,
  sampleIntervalMs = 100,
  maxHistory = 300,
  className,
  visible: visibleProp = true,
  position = 'top-right',
}) => {
  const theme = DEFAULT_WEBGPU_COMPUTE_THEME;

  const { state, actions } = useGPUPerformance({
    sampleIntervalMs,
    maxHistory,
    visible: visibleProp,
  });

  const displayState = {
    ...state,
    ...externalState,
  };

  const chartWidth = 240;
  const chartHeight = 48;

  // Extract recent data for charts
  const recentSamples = displayState.samples.slice(-60);
  const dispatchTimes = recentSamples.map((s) => s.dispatchTimeMs);
  const bandwidthData = recentSamples.map((s) => s.memoryBandwidth * 100);
  const occupancyData = recentSamples.map((s) => s.occupancy * 100);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (!visibleProp || !displayState.visible) return null;

  const tabs: { key: GPUPerfPanel; label: string }[] = [
    { key: 'dispatch', label: 'Dispatch' },
    { key: 'memory', label: 'Memory' },
    { key: 'occupancy', label: 'Occupancy' },
    { key: 'buffers', label: 'Buffers' },
    { key: 'adapter', label: 'Adapter' },
  ];

  return (
    <div
      className={className}
      role="region"
      aria-label="GPU Performance Overlay"
      style={{
        position: 'fixed',
        ...POSITION_STYLES[position],
        width: 280,
        background: theme.bg + 'ee',
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        padding: 10,
        fontFamily: theme.fontFamily,
        color: theme.text,
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${theme.border}`,
      }}>
        <h4 style={{
          margin: 0, fontSize: theme.fontSize, fontWeight: 700,
          color: theme.compute, fontFamily: theme.monoFontFamily,
        }}>
          GPU Performance
        </h4>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={actions.clearHistory}
            aria-label="Clear performance history"
            style={{
              padding: '2px 6px', background: 'none', color: theme.textSecondary,
              border: `1px solid ${theme.border}`, borderRadius: 3,
              cursor: 'pointer', fontSize: theme.fontSize - 2,
            }}
          >
            Clear
          </button>
          <button
            onClick={actions.toggleVisibility}
            aria-label="Close overlay"
            style={{
              padding: '2px 6px', background: 'none', color: theme.textSecondary,
              border: `1px solid ${theme.border}`, borderRadius: 3,
              cursor: 'pointer', fontSize: theme.fontSize - 2,
            }}
          >
            Hide
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 4, marginBottom: 8, fontSize: theme.fontSize - 1,
      }}>
        <div style={{ color: theme.textSecondary }}>
          Avg Dispatch: <span style={{ color: theme.text, fontWeight: 600 }}>
            {displayState.avgDispatchTimeMs.toFixed(2)}ms
          </span>
        </div>
        <div style={{ color: theme.textSecondary }}>
          Peak: <span style={{ color: theme.warning, fontWeight: 600 }}>
            {displayState.peakDispatchTimeMs.toFixed(2)}ms
          </span>
        </div>
        <div style={{ color: theme.textSecondary }}>
          Bandwidth: <span style={{ color: theme.text, fontWeight: 600 }}>
            {(displayState.avgMemoryBandwidth * 100).toFixed(1)}%
          </span>
        </div>
        <div style={{ color: theme.textSecondary }}>
          Occupancy: <span style={{ color: theme.text, fontWeight: 600 }}>
            {(displayState.avgOccupancy * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Tab navigation */}
      <TabBar tabs={tabs} active={displayState.activePanel} onSelect={actions.setActivePanel} theme={theme} />

      {/* Panel content */}
      {displayState.activePanel === 'dispatch' && (
        <div>
          <MiniChart
            data={dispatchTimes}
            width={chartWidth}
            height={chartHeight}
            color={theme.compute}
            label="Dispatch Time (ms)"
            theme={theme}
          />
          <MetricBar
            label="Avg Dispatch"
            value={displayState.avgDispatchTimeMs}
            maxValue={16.6}
            unit="ms"
            color={displayState.avgDispatchTimeMs < 5 ? theme.success : displayState.avgDispatchTimeMs < 11 ? theme.warning : theme.error}
            theme={theme}
          />
          <MetricBar
            label="Peak Dispatch"
            value={displayState.peakDispatchTimeMs}
            maxValue={16.6}
            unit="ms"
            color={theme.warning}
            theme={theme}
          />
          <div style={{ fontSize: theme.fontSize - 1, color: theme.textSecondary, marginTop: 4 }}>
            Pipelines: <span style={{ color: theme.text }}>{displayState.current.activePipelines}</span>
            {' | '}
            Dispatches/frame: <span style={{ color: theme.text }}>{displayState.current.dispatchesPerFrame}</span>
          </div>
        </div>
      )}

      {displayState.activePanel === 'memory' && (
        <div>
          <MiniChart
            data={bandwidthData}
            width={chartWidth}
            height={chartHeight}
            color={theme.info}
            maxValue={100}
            label="Memory Bandwidth (%)"
            theme={theme}
          />
          <MetricBar
            label="Bandwidth Utilization"
            value={displayState.avgMemoryBandwidth * 100}
            maxValue={100}
            unit="%"
            color={theme.info}
            theme={theme}
          />
          <MetricBar
            label="Total Buffer Memory"
            value={displayState.totalBufferMemory / (1024 * 1024)}
            maxValue={2048}
            unit=" MB"
            color={theme.accent}
            theme={theme}
          />
        </div>
      )}

      {displayState.activePanel === 'occupancy' && (
        <div>
          <MiniChart
            data={occupancyData}
            width={chartWidth}
            height={chartHeight}
            color={theme.success}
            maxValue={100}
            label="Compute Occupancy (%)"
            theme={theme}
          />
          <MetricBar
            label="Avg Occupancy"
            value={displayState.avgOccupancy * 100}
            maxValue={100}
            unit="%"
            color={displayState.avgOccupancy > 0.5 ? theme.success : theme.warning}
            theme={theme}
          />
        </div>
      )}

      {displayState.activePanel === 'buffers' && (
        <BufferTable buffers={displayState.buffers} theme={theme} />
      )}

      {displayState.activePanel === 'adapter' && (
        <div style={{ fontSize: theme.fontSize - 1 }}>
          {displayState.adapterInfo ? (
            <>
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: theme.textSecondary }}>Vendor: </span>
                <span style={{ color: theme.text, fontFamily: theme.monoFontFamily }}>
                  {displayState.adapterInfo.vendor}
                </span>
              </div>
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: theme.textSecondary }}>Architecture: </span>
                <span style={{ color: theme.text, fontFamily: theme.monoFontFamily }}>
                  {displayState.adapterInfo.architecture}
                </span>
              </div>
              <div style={{ marginBottom: 4 }}>
                <span style={{ color: theme.textSecondary }}>Description: </span>
                <span style={{ color: theme.text }}>{displayState.adapterInfo.description}</span>
              </div>
              <div style={{
                marginTop: 8, paddingTop: 6, borderTop: `1px solid ${theme.border}`,
              }}>
                <div style={{ fontWeight: 600, color: theme.text, marginBottom: 4 }}>Compute Limits</div>
                <div style={{ color: theme.textSecondary }}>
                  Max Workgroup Size: <span style={{ color: theme.text }}>
                    [{displayState.adapterInfo.maxComputeWorkgroupSizeX}, {displayState.adapterInfo.maxComputeWorkgroupSizeY}, {displayState.adapterInfo.maxComputeWorkgroupSizeZ}]
                  </span>
                </div>
                <div style={{ color: theme.textSecondary }}>
                  Max Invocations/WG: <span style={{ color: theme.text }}>
                    {displayState.adapterInfo.maxComputeInvocationsPerWorkgroup}
                  </span>
                </div>
                <div style={{ color: theme.textSecondary }}>
                  Max WGs/Dim: <span style={{ color: theme.text }}>
                    {displayState.adapterInfo.maxComputeWorkgroupsPerDimension.toLocaleString()}
                  </span>
                </div>
                <div style={{ color: theme.textSecondary }}>
                  Max Storage Buffer: <span style={{ color: theme.text }}>
                    {formatBytes(displayState.adapterInfo.maxStorageBufferBindingSize)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: theme.textSecondary, textAlign: 'center', padding: 12 }}>
              GPU adapter info unavailable.
              <br />
              WebGPU may not be initialized.
            </div>
          )}
        </div>
      )}

      {/* Sample count */}
      <div style={{
        marginTop: 6, paddingTop: 4, borderTop: `1px solid ${theme.border}`,
        fontSize: theme.fontSize - 2, color: theme.textSecondary, textAlign: 'right',
      }}>
        {displayState.samples.length} samples | {sampleIntervalMs}ms interval
      </div>
    </div>
  );
};
