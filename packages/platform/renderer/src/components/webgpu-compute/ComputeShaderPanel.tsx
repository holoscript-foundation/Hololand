/**
 * ComputeShaderPanel
 *
 * GPU pipeline status display, dispatch controls, and workgroup size configuration.
 * Shows all registered compute pipelines with their current status, allows manual
 * or automatic dispatch, and provides controls for adjusting workgroup and dispatch
 * dimensions.
 *
 * @module webgpu-compute/ComputeShaderPanel
 */

import React, { useMemo } from 'react';
import type {
  ComputeShaderPanelProps,
  ComputePipelineState,
  PipelineStatus,
  WorkgroupSize,
  DispatchSize,
  WebGPUComputeTheme,
} from './types';
import { DEFAULT_WEBGPU_COMPUTE_THEME } from './types';
import { useComputeShaderPanel } from './useWebGPUCompute';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface PipelineStatusBadgeProps {
  status: PipelineStatus;
  theme: WebGPUComputeTheme;
}

const PipelineStatusBadge: React.FC<PipelineStatusBadgeProps> = ({ status, theme }) => {
  const colorMap: Record<PipelineStatus, string> = {
    idle: theme.textSecondary,
    compiling: theme.warning,
    ready: theme.success,
    dispatching: theme.compute,
    error: theme.error,
  };

  const labelMap: Record<PipelineStatus, string> = {
    idle: 'IDLE',
    compiling: 'COMPILING',
    ready: 'READY',
    dispatching: 'DISPATCHING',
    error: 'ERROR',
  };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        backgroundColor: colorMap[status] + '22',
        color: colorMap[status],
        fontSize: theme.fontSize - 1,
        fontFamily: theme.monoFontFamily,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {labelMap[status]}
    </span>
  );
};

interface NumberInputProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  theme: WebGPUComputeTheme;
  width?: number;
}

const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  min = 1,
  max = 65535,
  step = 1,
  onChange,
  theme,
  width = 60,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <label
      style={{
        fontSize: theme.fontSize - 1,
        color: theme.textSecondary,
        fontFamily: theme.monoFontFamily,
        minWidth: 16,
      }}
    >
      {label}
    </label>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width,
        padding: '2px 4px',
        background: theme.inputBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 3,
        color: theme.text,
        fontSize: theme.fontSize,
        fontFamily: theme.monoFontFamily,
        outline: 'none',
      }}
    />
  </div>
);

interface WorkgroupEditorProps {
  label: string;
  size: WorkgroupSize | DispatchSize;
  onChange: (size: WorkgroupSize | DispatchSize) => void;
  theme: WebGPUComputeTheme;
}

const WorkgroupEditor: React.FC<WorkgroupEditorProps> = ({ label, size, onChange, theme }) => (
  <div style={{ marginBottom: 6 }}>
    <div
      style={{
        fontSize: theme.fontSize - 1,
        color: theme.textSecondary,
        marginBottom: 3,
        fontFamily: theme.monoFontFamily,
      }}
    >
      {label}
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      <NumberInput
        label="X"
        value={size.x}
        onChange={(x) => onChange({ ...size, x })}
        theme={theme}
      />
      <NumberInput
        label="Y"
        value={size.y}
        onChange={(y) => onChange({ ...size, y })}
        theme={theme}
      />
      <NumberInput
        label="Z"
        value={size.z}
        onChange={(z) => onChange({ ...size, z })}
        theme={theme}
      />
    </div>
  </div>
);

interface PipelineCardProps {
  pipeline: ComputePipelineState;
  selected: boolean;
  onSelect: () => void;
  onDispatch: () => void;
  onWorkgroupChange: (size: WorkgroupSize) => void;
  onDispatchSizeChange: (size: DispatchSize) => void;
  onReset: () => void;
  theme: WebGPUComputeTheme;
}

const PipelineCard: React.FC<PipelineCardProps> = ({
  pipeline,
  selected,
  onSelect,
  onDispatch,
  onWorkgroupChange,
  onDispatchSizeChange,
  onReset,
  theme,
}) => {
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-label={`Pipeline ${pipeline.name}`}
      aria-selected={selected}
      style={{
        padding: 10,
        marginBottom: 6,
        background: selected ? theme.panelBg : theme.bg,
        border: `1px solid ${selected ? theme.accent : theme.border}`,
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            color: theme.text,
            fontWeight: 600,
            fontSize: theme.fontSize + 1,
            fontFamily: theme.monoFontFamily,
          }}
        >
          {pipeline.name}
        </span>
        <PipelineStatusBadge status={pipeline.status} theme={theme} />
      </div>

      {/* Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: theme.fontSize - 1 }}>
        <div style={{ color: theme.textSecondary }}>
          Invocations: <span style={{ color: theme.text }}>{pipeline.totalInvocations.toLocaleString()}</span>
        </div>
        <div style={{ color: theme.textSecondary }}>
          Last dispatch:{' '}
          <span style={{ color: theme.text }}>
            {pipeline.lastDispatchTimeMs > 0 ? `${pipeline.lastDispatchTimeMs.toFixed(2)}ms` : '--'}
          </span>
        </div>
        <div style={{ color: theme.textSecondary }}>
          Bind groups: <span style={{ color: theme.text }}>{pipeline.bindGroupCount}</span>
        </div>
        <div style={{ color: theme.textSecondary }}>
          Buffers:{' '}
          <span style={{ color: theme.text }}>
            {pipeline.bufferSizes.length > 0
              ? pipeline.bufferSizes.map(formatBytes).join(', ')
              : 'none'}
          </span>
        </div>
      </div>

      {/* Error message */}
      {pipeline.errorMessage && (
        <div
          style={{
            marginTop: 6,
            padding: '4px 8px',
            background: theme.error + '15',
            border: `1px solid ${theme.error}40`,
            borderRadius: 4,
            color: theme.error,
            fontSize: theme.fontSize - 1,
            fontFamily: theme.monoFontFamily,
          }}
        >
          {pipeline.errorMessage}
        </div>
      )}

      {/* Expanded controls */}
      {selected && (
        <div style={{ marginTop: 8, borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
          <WorkgroupEditor
            label="Workgroup Size (@workgroup_size)"
            size={pipeline.workgroupSize}
            onChange={(s) => onWorkgroupChange(s as WorkgroupSize)}
            theme={theme}
          />
          <WorkgroupEditor
            label="Dispatch Size (dispatchWorkgroups)"
            size={pipeline.dispatchSize}
            onChange={(s) => onDispatchSizeChange(s as DispatchSize)}
            theme={theme}
          />

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDispatch();
              }}
              disabled={pipeline.status === 'compiling' || pipeline.status === 'dispatching'}
              aria-label={`Dispatch pipeline ${pipeline.name}`}
              style={{
                flex: 1,
                padding: '6px 12px',
                background: pipeline.status === 'ready' ? theme.compute : theme.inputBg,
                color: pipeline.status === 'ready' ? '#fff' : theme.textSecondary,
                border: `1px solid ${pipeline.status === 'ready' ? theme.compute : theme.border}`,
                borderRadius: 4,
                cursor: pipeline.status === 'ready' ? 'pointer' : 'not-allowed',
                fontFamily: theme.monoFontFamily,
                fontSize: theme.fontSize,
                fontWeight: 600,
              }}
            >
              Dispatch
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              aria-label={`Reset pipeline ${pipeline.name}`}
              style={{
                padding: '6px 12px',
                background: theme.inputBg,
                color: theme.textSecondary,
                border: `1px solid ${theme.border}`,
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: theme.monoFontFamily,
                fontSize: theme.fontSize,
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * ComputeShaderPanel
 *
 * Displays all registered WebGPU compute pipelines with status indicators,
 * provides dispatch controls, and allows workgroup/dispatch size configuration.
 *
 * @example
 * ```tsx
 * <ComputeShaderPanel
 *   pipelines={myPipelines}
 *   onDispatch={(name) => gpuContext.dispatch(name, [64, 1, 1])}
 *   visible={true}
 * />
 * ```
 */
export const ComputeShaderPanel: React.FC<ComputeShaderPanelProps> = ({
  pipelines: externalPipelines,
  autoDispatch: externalAutoDispatch,
  autoDispatchIntervalMs: externalInterval,
  onDispatch,
  onWorkgroupSizeChange,
  onDispatchSizeChange,
  className,
  visible = true,
}) => {
  const theme = DEFAULT_WEBGPU_COMPUTE_THEME;

  const { state, actions } = useComputeShaderPanel({
    initialPipelines: externalPipelines,
    autoDispatch: externalAutoDispatch,
    autoDispatchIntervalMs: externalInterval,
    onDispatch,
  });

  const displayPipelines = externalPipelines ?? state.pipelines;

  const statusSummary = useMemo(() => {
    const summary: Record<PipelineStatus, number> = {
      idle: 0,
      compiling: 0,
      ready: 0,
      dispatching: 0,
      error: 0,
    };
    displayPipelines.forEach((p) => {
      summary[p.status] = (summary[p.status] || 0) + 1;
    });
    return summary;
  }, [displayPipelines]);

  if (!visible) return null;

  return (
    <div
      className={className}
      role="region"
      aria-label="Compute Shader Pipeline Panel"
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        padding: 12,
        fontFamily: theme.fontFamily,
        color: theme.text,
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          paddingBottom: 8,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: theme.fontSize + 2,
              fontWeight: 700,
              color: theme.compute,
              fontFamily: theme.monoFontFamily,
            }}
          >
            Compute Pipelines
          </h3>
          <div style={{ fontSize: theme.fontSize - 1, color: theme.textSecondary, marginTop: 2 }}>
            {displayPipelines.length} pipeline{displayPipelines.length !== 1 ? 's' : ''} registered
          </div>
        </div>

        {/* Status summary */}
        <div style={{ display: 'flex', gap: 8, fontSize: theme.fontSize - 1 }}>
          {statusSummary.ready > 0 && (
            <span style={{ color: theme.success }}>{statusSummary.ready} ready</span>
          )}
          {statusSummary.dispatching > 0 && (
            <span style={{ color: theme.compute }}>{statusSummary.dispatching} active</span>
          )}
          {statusSummary.error > 0 && (
            <span style={{ color: theme.error }}>{statusSummary.error} error</span>
          )}
        </div>
      </div>

      {/* Auto-dispatch controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
          padding: '6px 8px',
          background: theme.panelBg,
          borderRadius: 6,
          border: `1px solid ${theme.border}`,
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            fontSize: theme.fontSize,
            color: theme.text,
          }}
        >
          <input
            type="checkbox"
            checked={state.autoDispatch}
            onChange={actions.toggleAutoDispatch}
            aria-label="Toggle auto-dispatch"
          />
          Auto-dispatch
        </label>
        <NumberInput
          label="ms"
          value={state.autoDispatchIntervalMs}
          min={1}
          max={10000}
          onChange={actions.setAutoDispatchInterval}
          theme={theme}
          width={70}
        />
        <div style={{ flex: 1 }} />
        <button
          onClick={actions.dispatchAll}
          disabled={statusSummary.ready === 0}
          aria-label="Dispatch all ready pipelines"
          style={{
            padding: '4px 12px',
            background: statusSummary.ready > 0 ? theme.accent : theme.inputBg,
            color: statusSummary.ready > 0 ? '#fff' : theme.textSecondary,
            border: 'none',
            borderRadius: 4,
            cursor: statusSummary.ready > 0 ? 'pointer' : 'not-allowed',
            fontFamily: theme.monoFontFamily,
            fontSize: theme.fontSize,
            fontWeight: 600,
          }}
        >
          Dispatch All
        </button>
      </div>

      {/* Pipeline list */}
      {displayPipelines.length === 0 ? (
        <div
          style={{
            padding: 20,
            textAlign: 'center',
            color: theme.textSecondary,
            fontSize: theme.fontSize,
          }}
        >
          No compute pipelines registered. Create a pipeline using GPUContext.createComputePipeline().
        </div>
      ) : (
        displayPipelines.map((pipeline) => (
          <PipelineCard
            key={pipeline.name}
            pipeline={pipeline}
            selected={state.selectedPipeline === pipeline.name}
            onSelect={() => actions.selectPipeline(pipeline.name)}
            onDispatch={() => {
              actions.dispatchPipeline(pipeline.name);
              onDispatch?.(pipeline.name);
            }}
            onWorkgroupChange={(size) => {
              actions.setWorkgroupSize(pipeline.name, size);
              onWorkgroupSizeChange?.(pipeline.name, size);
            }}
            onDispatchSizeChange={(size) => {
              actions.setDispatchSize(pipeline.name, size);
              onDispatchSizeChange?.(pipeline.name, size);
            }}
            onReset={() => actions.resetPipeline(pipeline.name)}
            theme={theme}
          />
        ))
      )}
    </div>
  );
};
