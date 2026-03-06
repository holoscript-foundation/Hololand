/**
 * SpatialInference Component
 *
 * React component that wraps the WebGPU compute shader pipeline for
 * on-device spatial AI inference. Provides a dashboard view of the
 * inference pipeline's state, performance metrics, and detected
 * spatial relationships.
 *
 * ARCHITECTURE:
 * The component uses the useSpatialInference hook internally to manage
 * the full pipeline lifecycle:
 *
 * ```
 *   <SpatialInference>
 *       |
 *       |-- useSpatialInference() hook
 *       |       |
 *       |       |-- SpatialInferenceComputePipeline (WebGPU)
 *       |       |-- SpatialReasoningEngine (CPU fallback)
 *       |       |-- InferenceScheduler (1-5Hz loop)
 *       |       |-- AgentStateBuffer<CachedSpatialState> (double-buffered)
 *       |
 *       |-- StatusPanel
 *       |-- MetricsPanel
 *       |-- RelationshipsPanel
 *       |-- GPUPanel
 *       |-- ActivityPanel
 * ```
 *
 * DISPLAY MODES:
 * - dashboard: Full dashboard with all panels (default)
 * - compact: Minimal status bar suitable for embedding
 * - metrics-only: Only performance metrics
 * - overlay: Semi-transparent overlay for VR HUD integration
 *
 * VR SAFETY:
 * This component does NOT render at 90Hz. It polls the inference
 * pipeline at a configurable rate (default 500ms) via the hook.
 * All heavy computation happens off the render thread in the
 * InferenceScheduler's setInterval loop.
 *
 * @module spatial-inference/SpatialInference
 */

import React, { useMemo } from 'react';
import { useSpatialInference, type UseSpatialInferenceConfig } from './useSpatialInference';
import type {
  SpatialInferenceTheme,
  SpatialInferenceDisplayMode,
  SpatialInferencePanel,
  SpatialInferenceState,
  SpatialInferenceActions,
  PipelineEvent,
} from './types';
import {
  DEFAULT_SPATIAL_INFERENCE_THEME,
  getStatusLabel,
  getStatusColor,
  formatMs,
  formatBytes,
} from './types';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface SpatialInferenceProps {
  /** Display mode (default: 'dashboard') */
  mode?: SpatialInferenceDisplayMode;
  /** Which panels to show (default: all) */
  panels?: SpatialInferencePanel[];
  /** Pipeline configuration forwarded to the hook */
  config?: UseSpatialInferenceConfig;
  /** Externally managed state (bypasses internal hook) */
  externalState?: SpatialInferenceState;
  /** Externally managed actions (bypasses internal hook) */
  externalActions?: SpatialInferenceActions;
  /** Theme overrides */
  theme?: Partial<SpatialInferenceTheme>;
  /** Custom CSS class name */
  className?: string;
  /** Custom inline styles */
  style?: React.CSSProperties;
  /** Accessible label for the component */
  ariaLabel?: string;
}

const ALL_PANELS: SpatialInferencePanel[] = [
  'status', 'metrics', 'relationships', 'regions', 'gpu', 'activity',
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const SpatialInference: React.FC<SpatialInferenceProps> = ({
  mode = 'dashboard',
  panels = ALL_PANELS,
  config,
  externalState,
  externalActions,
  theme: themeOverride,
  className,
  style,
  ariaLabel = 'Spatial Inference Pipeline Dashboard',
}) => {
  // Use external state/actions if provided, otherwise use internal hook
  const [internalState, internalActions] = useSpatialInference(config);
  const state = externalState ?? internalState;
  const actions = externalActions ?? internalActions;

  const theme = useMemo(
    () => ({ ...DEFAULT_SPATIAL_INFERENCE_THEME, ...themeOverride }),
    [themeOverride],
  );

  const containerStyles = useMemo((): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontFamily: theme.fontFamily,
      fontSize: `calc(0.85rem * ${theme.fontScale})`,
      color: theme.textPrimary,
      backgroundColor: theme.containerBackground,
      borderRadius: theme.borderRadius,
      border: `1px solid ${theme.borderColor}`,
      overflow: 'hidden',
    };

    switch (mode) {
      case 'overlay':
        return {
          ...base,
          backgroundColor: 'rgba(10, 10, 26, 0.85)',
          backdropFilter: 'blur(8px)',
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '320px',
          maxHeight: '80vh',
          overflowY: 'auto',
          zIndex: 1000,
        };
      case 'compact':
        return {
          ...base,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem 1rem',
        };
      case 'metrics-only':
        return {
          ...base,
          padding: '1rem',
        };
      case 'dashboard':
      default:
        return {
          ...base,
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        };
    }
  }, [mode, theme]);

  // Compact mode: single-line status bar
  if (mode === 'compact') {
    return (
      <div
        className={className}
        style={{ ...containerStyles, ...style }}
        role="status"
        aria-label={ariaLabel}
      >
        <CompactStatus state={state} actions={actions} theme={theme} />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ ...containerStyles, ...style }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header */}
      <Header state={state} actions={actions} theme={theme} />

      {/* Panels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {panels.includes('status') && (
          <StatusPanel state={state} actions={actions} theme={theme} />
        )}
        {panels.includes('metrics') && state.schedulerMetrics && (
          <MetricsPanel state={state} theme={theme} />
        )}
        {(panels.includes('gpu') && state.computeMetrics) && (
          <GPUPanel state={state} theme={theme} />
        )}
        {panels.includes('relationships') && state.spatialState && mode !== 'metrics-only' && (
          <RelationshipsPanel state={state} theme={theme} />
        )}
        {panels.includes('regions') && state.spatialState && mode !== 'metrics-only' && (
          <RegionsPanel state={state} theme={theme} />
        )}
        {panels.includes('activity') && mode !== 'metrics-only' && (
          <ActivityPanel state={state} actions={actions} theme={theme} />
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

// ─── Header ──────────────────────────────────────────────────────────

interface SubProps {
  state: SpatialInferenceState;
  actions: SpatialInferenceActions;
  theme: SpatialInferenceTheme;
}

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
            boxShadow: state.status === 'running'
              ? `0 0 6px ${statusColor}`
              : 'none',
          }}
          aria-hidden="true"
        />
        <span style={{ fontWeight: 600, fontSize: `calc(0.9rem * ${theme.fontScale})` }}>
          Spatial Inference
        </span>
        {state.isGPUAccelerated && (
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
            GPU
          </span>
        )}
        {state.status === 'fallback' && (
          <span
            style={{
              fontSize: `calc(0.65rem * ${theme.fontScale})`,
              color: theme.cpuColor,
              border: `1px solid ${theme.cpuColor}`,
              borderRadius: '3px',
              padding: '0.1rem 0.35rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
            }}
          >
            CPU
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {state.status === 'idle' && (
          <ActionButton
            label="Initialize"
            onClick={() => actions.initialize()}
            theme={theme}
          />
        )}
        {(state.status === 'ready' || state.status === 'fallback') && (
          <ActionButton
            label="Start"
            onClick={() => actions.start()}
            theme={theme}
            color={theme.successColor}
          />
        )}
        {state.status === 'running' && (
          <>
            <ActionButton
              label="Pause"
              onClick={() => actions.togglePause()}
              theme={theme}
              color={theme.warningColor}
            />
            <ActionButton
              label="Stop"
              onClick={() => actions.stop()}
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
              onClick={() => actions.stop()}
              theme={theme}
              color={theme.errorColor}
            />
          </>
        )}
      </div>
    </div>
  );
};

// ─── Compact Status ──────────────────────────────────────────────────

const CompactStatus: React.FC<SubProps> = ({ state, actions, theme }) => {
  const statusColor = getStatusColor(state.status, theme);
  const metrics = state.schedulerMetrics;

  return (
    <>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <span style={{ fontWeight: 600, fontSize: `calc(0.8rem * ${theme.fontScale})` }}>
        Spatial
      </span>
      <span style={{ color: statusColor, fontSize: `calc(0.75rem * ${theme.fontScale})` }}>
        {getStatusLabel(state.status)}
      </span>
      {metrics && (
        <>
          <span style={{ color: theme.textMuted }}>|</span>
          <span style={{ color: theme.textSecondary, fontSize: `calc(0.75rem * ${theme.fontScale})` }}>
            {metrics.currentHz.toFixed(1)}Hz
          </span>
          <span style={{ color: theme.textMuted }}>|</span>
          <span style={{ color: theme.textSecondary, fontSize: `calc(0.75rem * ${theme.fontScale})` }}>
            {formatMs(metrics.averageInferenceDurationMs)}
          </span>
        </>
      )}
      {state.isGPUAccelerated && (
        <span
          style={{
            fontSize: `calc(0.6rem * ${theme.fontScale})`,
            color: theme.gpuColor,
            fontWeight: 600,
          }}
        >
          GPU
        </span>
      )}
      {state.status === 'idle' && (
        <ActionButton label="Init" onClick={() => actions.initialize()} theme={theme} small />
      )}
      {state.status === 'running' && (
        <ActionButton label="||" onClick={() => actions.togglePause()} theme={theme} small />
      )}
    </>
  );
};

// ─── Status Panel ────────────────────────────────────────────────────

const StatusPanel: React.FC<SubProps> = ({ state, theme }) => {
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
          value={state.isGPUAccelerated ? 'WebGPU' : 'CPU'}
          valueColor={state.isGPUAccelerated ? theme.gpuColor : theme.cpuColor}
          theme={theme}
        />
        {state.spatialState && (
          <>
            <MetricItem
              label="Objects"
              value={String(state.spatialState.objectCount)}
              theme={theme}
            />
            <MetricItem
              label="Complexity"
              value={`${(state.spatialState.sceneComplexity * 100).toFixed(0)}%`}
              theme={theme}
            />
          </>
        )}
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

// ─── Metrics Panel ───────────────────────────────────────────────────

interface ReadOnlySubProps {
  state: SpatialInferenceState;
  theme: SpatialInferenceTheme;
}

const MetricsPanel: React.FC<ReadOnlySubProps> = ({ state, theme }) => {
  const m = state.schedulerMetrics;
  if (!m) return null;

  return (
    <PanelContainer title="Performance" theme={theme}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
        <MetricItem
          label="Frequency"
          value={`${m.currentHz.toFixed(1)}Hz`}
          theme={theme}
        />
        <MetricItem
          label="Avg Duration"
          value={formatMs(m.averageInferenceDurationMs)}
          theme={theme}
        />
        <MetricItem
          label="Peak Duration"
          value={formatMs(m.peakInferenceDurationMs)}
          theme={theme}
        />
        <MetricItem
          label="Total Passes"
          value={String(m.totalPasses)}
          theme={theme}
        />
        <MetricItem
          label="Skipped"
          value={String(m.skippedPasses)}
          valueColor={m.skippedPasses > 0 ? theme.warningColor : undefined}
          theme={theme}
        />
        <MetricItem
          label="Buffer"
          value={m.isBufferStale ? 'Stale' : 'Fresh'}
          valueColor={m.isBufferStale ? theme.warningColor : theme.successColor}
          theme={theme}
        />
      </div>
      {/* Inference duration bar */}
      {m.averageInferenceDurationMs > 0 && (
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
            <span>Budget Usage</span>
            <span>{((m.averageInferenceDurationMs / 200) * 100).toFixed(0)}%</span>
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
                width: `${Math.min((m.averageInferenceDurationMs / 200) * 100, 100)}%`,
                borderRadius: '2px',
                backgroundColor:
                  m.averageInferenceDurationMs > 180 ? theme.errorColor
                    : m.averageInferenceDurationMs > 100 ? theme.warningColor
                      : theme.successColor,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}
    </PanelContainer>
  );
};

// ─── GPU Panel ───────────────────────────────────────────────────────

const GPUPanel: React.FC<ReadOnlySubProps> = ({ state, theme }) => {
  const m = state.computeMetrics;
  if (!m) return null;

  return (
    <PanelContainer title="GPU Compute" theme={theme} accentColor={theme.gpuColor}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <MetricItem
          label="Adapter"
          value={m.adapterInfo}
          theme={theme}
        />
        <MetricItem
          label="VRAM Used"
          value={formatBytes(m.gpuMemoryBytes)}
          theme={theme}
        />
        <MetricItem
          label="Avg Compute"
          value={formatMs(m.averageComputeMs)}
          theme={theme}
        />
        <MetricItem
          label="Peak Compute"
          value={formatMs(m.peakComputeMs)}
          theme={theme}
        />
        <MetricItem
          label="Total Passes"
          value={String(m.totalPasses)}
          theme={theme}
        />
        <MetricItem
          label="Avg Relationships"
          value={String(m.averageRelationshipCount)}
          theme={theme}
        />
      </div>
    </PanelContainer>
  );
};

// ─── Relationships Panel ─────────────────────────────────────────────

const RelationshipsPanel: React.FC<ReadOnlySubProps> = ({ state, theme }) => {
  const ss = state.spatialState;
  if (!ss || ss.relationships.length === 0) return null;

  // Show at most 10 relationships
  const displayRelationships = ss.relationships.slice(0, 10);

  return (
    <PanelContainer title={`Relationships (${ss.relationships.length})`} theme={theme}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {displayRelationships.map((rel, idx) => (
          <div
            key={`${rel.sourceId}-${rel.targetId}-${rel.type}-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.3rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              fontSize: `calc(0.75rem * ${theme.fontScale})`,
            }}
          >
            <span style={{ color: theme.accentColor, fontWeight: 500, minWidth: '80px' }}>
              {rel.type}
            </span>
            <span style={{ color: theme.textSecondary }}>
              {rel.sourceId.substring(0, 8)} {'<->'} {rel.targetId.substring(0, 8)}
            </span>
            <span
              style={{
                marginLeft: 'auto',
                color: theme.textMuted,
                fontSize: `calc(0.7rem * ${theme.fontScale})`,
              }}
            >
              {(rel.confidence * 100).toFixed(0)}%
            </span>
          </div>
        ))}
        {ss.relationships.length > 10 && (
          <div
            style={{
              textAlign: 'center',
              color: theme.textMuted,
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
              padding: '0.25rem',
            }}
          >
            + {ss.relationships.length - 10} more
          </div>
        )}
      </div>
    </PanelContainer>
  );
};

// ─── Regions Panel ───────────────────────────────────────────────────

const RegionsPanel: React.FC<ReadOnlySubProps> = ({ state, theme }) => {
  const ss = state.spatialState;
  if (!ss || ss.regions.length === 0) return null;

  return (
    <PanelContainer title={`Regions (${ss.regions.length})`} theme={theme}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {ss.regions.map((region) => (
          <div
            key={region.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.3rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              fontSize: `calc(0.75rem * ${theme.fontScale})`,
            }}
          >
            <span style={{ color: theme.accentColor, fontWeight: 500 }}>
              {region.type}
            </span>
            <span style={{ color: theme.textSecondary }}>
              {region.label}
            </span>
            <span
              style={{
                marginLeft: 'auto',
                color: theme.textMuted,
                fontSize: `calc(0.7rem * ${theme.fontScale})`,
              }}
            >
              {region.objectIds.length} objects
            </span>
          </div>
        ))}
      </div>
    </PanelContainer>
  );
};

// ─── Activity Panel ──────────────────────────────────────────────────

const ActivityPanel: React.FC<SubProps> = ({ state, actions, theme }) => {
  const events = state.events;

  const severityColor = (severity: PipelineEvent['severity']): string => {
    switch (severity) {
      case 'error': return theme.errorColor;
      case 'warning': return theme.warningColor;
      case 'info': return theme.textSecondary;
      default: return theme.textMuted;
    }
  };

  return (
    <PanelContainer
      title="Activity"
      theme={theme}
      action={
        events.length > 0
          ? <ActionButton label="Clear" onClick={actions.clearEvents} theme={theme} small />
          : undefined
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.2rem',
          maxHeight: '200px',
          overflowY: 'auto',
        }}
      >
        {events.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: theme.textMuted,
              padding: '1rem',
              fontSize: `calc(0.75rem * ${theme.fontScale})`,
            }}
          >
            No events
          </div>
        )}
        {events.slice(0, 20).map((event) => (
          <div
            key={event.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.4rem',
              padding: '0.2rem 0.4rem',
              fontSize: `calc(0.7rem * ${theme.fontScale})`,
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: severityColor(event.severity),
                marginTop: '0.35em',
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <span style={{ color: theme.textMuted, flexShrink: 0 }}>
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span style={{ color: theme.textSecondary }}>
              {event.message}
            </span>
          </div>
        ))}
      </div>
    </PanelContainer>
  );
};

// =============================================================================
// SHARED UI PRIMITIVES
// =============================================================================

interface PanelContainerProps {
  title: string;
  theme: SpatialInferenceTheme;
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
  theme: SpatialInferenceTheme;
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
  theme: SpatialInferenceTheme;
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

export default SpatialInference;
