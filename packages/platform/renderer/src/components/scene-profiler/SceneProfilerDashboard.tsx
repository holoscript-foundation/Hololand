/**
 * SceneProfilerDashboard
 *
 * Real-time VR scene performance profiling dashboard.
 * Displays draw call budget, mesh batching status, LOD distribution,
 * volumetric fire metrics, foveated rendering state, and frame budget analysis.
 *
 * Designed for overlay display during VR development and testing.
 *
 * @module scene-profiler/SceneProfilerDashboard
 */

import React, { useMemo } from 'react';
import type {
  SceneProfilerDashboardProps,
  SceneProfilerPanel,
  SceneProfilerTheme,
  BudgetHealthStatus,
} from './types';
import {
  DEFAULT_SCENE_PROFILER_THEME,
  PANEL_LABELS,
  BATCH_TYPE_LABELS,
  BATCH_TYPE_COLORS,
  BUDGET_HEALTH_THRESHOLDS,
} from './types';
import { useSceneProfiler } from './useSceneProfiler';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface StatusIndicatorProps {
  status: BudgetHealthStatus;
  theme: SceneProfilerTheme;
  label: string;
  value: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, theme, label, value }) => {
  const color = {
    healthy: theme.healthy,
    warning: theme.warning,
    critical: theme.critical,
    exceeded: theme.exceeded,
  }[status];

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ color: theme.text, fontSize: theme.fontSize }}>{label}</span>
      <span style={{
        color,
        fontSize: theme.fontSize,
        fontWeight: 'bold',
        fontFamily: theme.fontFamily,
      }}>
        {value}
      </span>
    </div>
  );
};

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  theme: SceneProfilerTheme;
  label?: string;
  height?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, theme, label, height = 8 }) => {
  const pct = Math.min((value / max) * 100, 100);
  const color =
    pct > BUDGET_HEALTH_THRESHOLDS.exceeded ? theme.exceeded :
    pct > BUDGET_HEALTH_THRESHOLDS.critical ? theme.critical :
    pct > BUDGET_HEALTH_THRESHOLDS.warning ? theme.warning : theme.healthy;

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: theme.fontSize - 1, color: theme.text, marginBottom: 2,
        }}>
          <span>{label}</span>
          <span>{value.toFixed(1)}%</span>
        </div>
      )}
      <div style={{
        width: '100%', height, background: theme.grid,
        borderRadius: height / 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: height / 2,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
};

// =============================================================================
// PANEL COMPONENTS
// =============================================================================

interface PanelProps {
  state: ReturnType<typeof useSceneProfiler>['state'];
  actions: ReturnType<typeof useSceneProfiler>['actions'];
  theme: SceneProfilerTheme;
}

const OverviewPanel: React.FC<PanelProps> = ({ state, theme }) => {
  const budget = state.performanceBudget;

  return (
    <div>
      <StatusIndicator status={state.budgetHealth} theme={theme}
        label="FPS" value={`${state.currentFPS} / ${state.targetFPS}`} />
      <StatusIndicator status={state.budgetHealth} theme={theme}
        label="Frame Time" value={`${state.currentFrameTimeMs}ms / ${state.frameBudgetMs}ms`} />
      <ProgressBar value={state.budgetUtilization} theme={theme} label="Budget Utilization" />

      <div style={{ marginTop: 8, borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
        <StatusIndicator status="healthy" theme={theme}
          label="Draw Calls" value={`${state.batching.active ? state.batching.outputDrawCalls : state.batching.inputMeshes}`} />
        <StatusIndicator status="healthy" theme={theme}
          label="Batching" value={state.batching.active ? `ON (-${state.batching.reductionPercent.toFixed(0)}%)` : 'OFF'} />
        <StatusIndicator status="healthy" theme={theme}
          label="LOD Objects" value={`${state.lod.totalObjects}`} />
        <StatusIndicator status={state.volumetricFire.budgetExceeded ? 'critical' : 'healthy'} theme={theme}
          label="Volumetric Fire" value={state.volumetricFire.active ? `Q${state.volumetricFire.qualityLevel} (${state.volumetricFire.gpuTimeMs.toFixed(1)}ms)` : 'OFF'} />
        {state.foveated && (
          <StatusIndicator status="healthy" theme={theme}
            label="Foveated" value={`${state.foveated.vertexSavingsPercent.toFixed(0)}% savings`} />
        )}
      </div>

      {budget && budget.recommendations.length > 0 && (
        <div style={{ marginTop: 8, borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
          <div style={{ fontSize: theme.fontSize, color: theme.accent, marginBottom: 4, fontWeight: 'bold' }}>
            Top Recommendations
          </div>
          {budget.recommendations.slice(0, 3).map((rec, i) => (
            <div key={i} style={{
              fontSize: theme.fontSize - 1,
              color: theme.text,
              padding: '2px 0',
              opacity: 0.8,
            }}>
              [{rec.priority}] {rec.message.substring(0, 80)}...
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DrawCallPanel: React.FC<PanelProps> = ({ state, theme }) => {
  const budget = state.performanceBudget;
  if (!budget) {
    return <div style={{ color: theme.text, fontSize: theme.fontSize }}>Run analysis to see draw call breakdown.</div>;
  }

  const dc = budget.drawCalls;
  return (
    <div>
      <StatusIndicator status="healthy" theme={theme}
        label="Total Meshes" value={`${dc.totalMeshes}`} />
      <StatusIndicator status="healthy" theme={theme}
        label="Unbatched Draw Calls" value={`${dc.unbatchedDrawCalls}`} />
      <StatusIndicator status="healthy" theme={theme}
        label="Batched Draw Calls" value={`${dc.batchedDrawCalls}`} />
      <ProgressBar value={dc.reductionPercent} theme={theme} label="Draw Call Reduction" />

      <div style={{ marginTop: 8, borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
        <StatusIndicator status="healthy" theme={theme}
          label="Transparent Objects" value={`${dc.transparentCount}`} />
        <StatusIndicator status="healthy" theme={theme}
          label="Animated Objects" value={`${dc.animatedCount}`} />
        <StatusIndicator status="healthy" theme={theme}
          label="Instancable Groups" value={`${dc.instancableGroups}`} />
        <StatusIndicator status="healthy" theme={theme}
          label="Estimated Memory" value={`${dc.estimatedMemoryMB.toFixed(1)} MB`} />
      </div>

      <div style={{ marginTop: 8, borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
        <div style={{ fontSize: theme.fontSize, color: theme.accent, marginBottom: 4, fontWeight: 'bold' }}>
          Batch Categories ({dc.categories.length})
        </div>
        {dc.categories.slice(0, 8).map((cat, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: theme.fontSize - 1, color: theme.text, padding: '1px 0',
          }}>
            <span>{cat.name} ({cat.meshIds.length})</span>
            <span style={{ color: cat.batchable ? theme.healthy : theme.warning }}>
              {cat.batchedDrawCalls} DC {cat.batchable ? '[batch]' : cat.animated ? '[anim]' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const BatchingPanel: React.FC<PanelProps> = ({ state, actions, theme }) => {
  const b = state.batching;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: theme.text, fontSize: theme.fontSize, fontWeight: 'bold' }}>
          Mesh Batching
        </span>
        <button
          onClick={actions.toggleBatching}
          style={{
            background: b.active ? theme.healthy : theme.critical,
            color: '#fff', border: 'none', borderRadius: 4,
            padding: '2px 8px', fontSize: theme.fontSize - 1, cursor: 'pointer',
          }}
        >
          {b.active ? 'ON' : 'OFF'}
        </button>
      </div>

      <StatusIndicator status="healthy" theme={theme}
        label="Input Meshes" value={`${b.inputMeshes}`} />
      <StatusIndicator status="healthy" theme={theme}
        label="Output Draw Calls" value={`${b.outputDrawCalls}`} />
      <ProgressBar value={b.reductionPercent} theme={theme} label="Reduction" />

      <div style={{ marginTop: 8, borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
        <div style={{ fontSize: theme.fontSize, color: theme.accent, marginBottom: 4, fontWeight: 'bold' }}>
          Batch Types
        </div>
        {Object.entries(b.groupsByType).map(([type, count]) => (
          count > 0 && (
            <div key={type} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: theme.fontSize - 1, color: theme.text, padding: '1px 0',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: BATCH_TYPE_COLORS[type as keyof typeof BATCH_TYPE_COLORS] || '#666',
                  display: 'inline-block',
                }} />
                {BATCH_TYPE_LABELS[type as keyof typeof BATCH_TYPE_LABELS] || type}
              </span>
              <span>{count}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

const LODPanel: React.FC<PanelProps> = ({ state, actions, theme }) => {
  const l = state.lod;

  return (
    <div>
      <StatusIndicator status="healthy" theme={theme}
        label="Managed Objects" value={`${l.totalObjects}`} />
      <StatusIndicator status="healthy" theme={theme}
        label="Memory Savings" value={`${l.memorySavingsMB.toFixed(1)} MB`} />
      <StatusIndicator status="healthy" theme={theme}
        label="Avg Update Time" value={`${l.avgUpdateTimeMs.toFixed(2)}ms`} />

      <div style={{ marginTop: 8, borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
        <div style={{ fontSize: theme.fontSize, color: theme.accent, marginBottom: 4, fontWeight: 'bold' }}>
          LOD Distribution
        </div>
        {[0, 1, 2, 3].map(level => {
          const count = l.lodDistribution[level] || 0;
          const pct = l.totalObjects > 0 ? (count / l.totalObjects) * 100 : 0;
          return (
            <div key={level} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: theme.fontSize - 1, color: theme.text, padding: '2px 0',
            }}>
              <span>LOD {level}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 60, height: 6, background: theme.grid, borderRadius: 3 }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: [theme.healthy, theme.accent, theme.warning, theme.critical][level],
                    borderRadius: 3,
                  }} />
                </div>
                <span style={{ minWidth: 30, textAlign: 'right' }}>{count}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
        {[0, 1, 2, 3].map(level => (
          <button
            key={level}
            onClick={() => actions.forceLOD(level)}
            style={{
              flex: 1, background: theme.panelBg, color: theme.text,
              border: `1px solid ${theme.border}`, borderRadius: 4,
              padding: '4px', fontSize: theme.fontSize - 1, cursor: 'pointer',
            }}
          >
            Force LOD {level}
          </button>
        ))}
      </div>
    </div>
  );
};

const VolumetricPanel: React.FC<PanelProps> = ({ state, actions, theme }) => {
  const v = state.volumetricFire;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: theme.text, fontSize: theme.fontSize, fontWeight: 'bold' }}>
          Volumetric Fire
        </span>
        <button
          onClick={actions.toggleVolumetricFire}
          style={{
            background: v.active ? theme.healthy : theme.critical,
            color: '#fff', border: 'none', borderRadius: 4,
            padding: '2px 8px', fontSize: theme.fontSize - 1, cursor: 'pointer',
          }}
        >
          {v.active ? 'ON' : 'OFF'}
        </button>
      </div>

      <StatusIndicator status={v.budgetExceeded ? 'critical' : 'healthy'} theme={theme}
        label="GPU Time" value={`${v.gpuTimeMs.toFixed(1)}ms / 2.0ms`} />
      <ProgressBar value={(v.gpuTimeMs / 2.0) * 100} theme={theme} label="Fire Budget" />

      <StatusIndicator status="healthy" theme={theme}
        label="Quality Level" value={`${v.qualityLevel} / 3`} />
      <StatusIndicator status="healthy" theme={theme}
        label="Raymarch Steps" value={`${v.raymarchSteps}`} />
      <StatusIndicator status="healthy" theme={theme}
        label="Active Layers" value={`${v.activeLayers} / 9`} />
      <StatusIndicator status="healthy" theme={theme}
        label="Replaced Meshes" value={`${v.replacedMeshes}`} />

      <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
        {([0, 1, 2, 3] as const).map(q => (
          <button
            key={q}
            onClick={() => actions.setFireQuality(q)}
            style={{
              flex: 1,
              background: v.qualityLevel === q ? theme.accent : theme.panelBg,
              color: theme.text,
              border: `1px solid ${v.qualityLevel === q ? theme.accent : theme.border}`,
              borderRadius: 4, padding: '4px',
              fontSize: theme.fontSize - 1, cursor: 'pointer',
            }}
          >
            Q{q}
          </button>
        ))}
      </div>
    </div>
  );
};

const FoveatedPanel: React.FC<PanelProps> = ({ state, theme }) => {
  const f = state.foveated;

  if (!f) {
    return (
      <div style={{ color: theme.text, fontSize: theme.fontSize, opacity: 0.6 }}>
        Foveated rendering not active. Enable eye tracking or initialize CreatureFoveatedRenderer.
      </div>
    );
  }

  return (
    <div>
      <StatusIndicator status="healthy" theme={theme}
        label="Eye Tracking" value={f.eyeTrackingActive ? 'Active' : 'Fixed Center'} />
      <StatusIndicator status="healthy" theme={theme}
        label="Gaze Target" value={f.gazeTargetRegion || 'none'} />

      <div style={{ marginTop: 8, borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
        <div style={{ fontSize: theme.fontSize, color: theme.accent, marginBottom: 4, fontWeight: 'bold' }}>
          Zone Distribution
        </div>
        <StatusIndicator status="healthy" theme={theme}
          label="Foveal Regions" value={`${f.fovealRegions}`} />
        <StatusIndicator status="healthy" theme={theme}
          label="Parafoveal Regions" value={`${f.parafovealRegions}`} />
        <StatusIndicator status="healthy" theme={theme}
          label="Peripheral Regions" value={`${f.peripheralRegions}`} />
      </div>

      <div style={{ marginTop: 8, borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
        <StatusIndicator status="healthy" theme={theme}
          label="Average Quality" value={`${(f.averageQuality * 100).toFixed(0)}%`} />
        <ProgressBar value={f.vertexSavingsPercent} theme={theme} label="Vertex Savings" />
        <StatusIndicator status="healthy" theme={theme}
          label="Compute Time" value={`${f.lastComputeTimeMs.toFixed(2)}ms`} />
      </div>
    </div>
  );
};

const FrameBudgetPanel: React.FC<PanelProps> = ({ state, actions, theme }) => {
  const budget = state.performanceBudget;

  return (
    <div>
      {!budget && (
        <button
          onClick={() => actions.runAnalysis()}
          style={{
            width: '100%', background: theme.accent, color: '#fff',
            border: 'none', borderRadius: 4, padding: '8px',
            fontSize: theme.fontSize, cursor: 'pointer', marginBottom: 8,
          }}
        >
          Run Performance Analysis
        </button>
      )}

      {budget && (
        <>
          <StatusIndicator status={budget.withinBudget ? 'healthy' : 'exceeded'} theme={theme}
            label="Within Budget" value={budget.withinBudget ? 'YES' : 'NO'} />
          <StatusIndicator status="healthy" theme={theme}
            label="Estimated Frame Time" value={`${budget.estimatedFrameTimeMs.toFixed(2)}ms`} />
          <ProgressBar value={budget.budgetUtilization} theme={theme} label="Budget Utilization" />

          <div style={{ marginTop: 8, borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
            <div style={{ fontSize: theme.fontSize, color: theme.accent, marginBottom: 4, fontWeight: 'bold' }}>
              Budget Allocation
            </div>
            <StatusIndicator status="healthy" theme={theme}
              label="Scene Rendering" value={`${budget.budget.sceneRenderMs}ms`} />
            <StatusIndicator status="healthy" theme={theme}
              label="Post-Processing" value={`${budget.budget.postProcessingMs}ms`} />
            <StatusIndicator status="healthy" theme={theme}
              label="Volumetric Effects" value={`${budget.budget.volumetricEffectsMs}ms`} />
            <StatusIndicator status="healthy" theme={theme}
              label="Animation/Physics" value={`${budget.budget.animationPhysicsMs}ms`} />
            <StatusIndicator status="healthy" theme={theme}
              label="Headroom" value={`${budget.budget.headroomMs}ms`} />
          </div>

          <div style={{ marginTop: 8, borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
            <div style={{ fontSize: theme.fontSize, color: theme.accent, marginBottom: 4, fontWeight: 'bold' }}>
              Subsystem Analysis
            </div>
            <StatusIndicator status="healthy" theme={theme}
              label="Animation Sequences" value={`${budget.animation.totalSequences}`} />
            <StatusIndicator status="healthy" theme={theme}
              label="Anim CPU Time" value={`${budget.animation.estimatedCpuTimeMs.toFixed(2)}ms`} />
            <StatusIndicator status={budget.volumetric.withinBudget ? 'healthy' : 'warning'} theme={theme}
              label="Volumetric GPU Time" value={`${budget.volumetric.estimatedGpuTimeMs.toFixed(1)}ms`} />
            <StatusIndicator status="healthy" theme={theme}
              label="Lighting Overhead" value={`${budget.lighting.estimatedGpuOverheadMs.toFixed(1)}ms`} />
          </div>

          {budget.recommendations.length > 0 && (
            <div style={{ marginTop: 8, borderTop: `1px solid ${theme.border}`, paddingTop: 8 }}>
              <div style={{ fontSize: theme.fontSize, color: theme.accent, marginBottom: 4, fontWeight: 'bold' }}>
                Recommendations ({budget.recommendations.length})
              </div>
              {budget.recommendations.map((rec, i) => (
                <div key={i} style={{
                  fontSize: theme.fontSize - 1, color: theme.text,
                  padding: '4px 0', borderBottom: `1px solid ${theme.grid}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{
                      color: [theme.critical, theme.warning, theme.accent, theme.text][Math.min(rec.priority - 1, 3)],
                      fontWeight: 'bold',
                    }}>
                      P{rec.priority} [{rec.category}]
                    </span>
                    <span style={{ color: theme.healthy }}>
                      -{rec.estimatedSavingsMs.toFixed(2)}ms
                    </span>
                  </div>
                  <div style={{ opacity: 0.8, lineHeight: 1.3 }}>{rec.message}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

/**
 * VR Scene Performance Profiler Dashboard
 *
 * Comprehensive real-time profiling overlay for VR scene development.
 * Shows draw call budget, mesh batching, LOD status, volumetric fire metrics,
 * foveated rendering state, and frame budget analysis.
 *
 * @example
 * ```tsx
 * <SceneProfilerDashboard
 *   sceneName="Inferno Wyrm"
 *   platform="quest3"
 *   displayMode="compact"
 *   visible={showProfiler}
 * />
 * ```
 */
export const SceneProfilerDashboard: React.FC<SceneProfilerDashboardProps> = ({
  sceneName = 'Inferno Wyrm',
  platform = 'quest3',
  displayMode: initialDisplayMode = 'compact',
  activePanel: initialActivePanel = 'overview',
  performanceBudget: externalBudget,
  batchingPlan,
  foveatedMetrics,
  className,
  visible = true,
}) => {
  const theme = DEFAULT_SCENE_PROFILER_THEME;

  const { state, actions } = useSceneProfiler({
    sceneName,
    platform,
    displayMode: initialDisplayMode,
    activePanel: initialActivePanel,
    autoAnalyze: true,
    batchingPlan,
    foveatedMetrics,
  });

  // Use external budget if provided
  const effectiveState = useMemo(() => ({
    ...state,
    performanceBudget: externalBudget || state.performanceBudget,
  }), [state, externalBudget]);

  if (!visible) return null;

  const panelContent: Record<SceneProfilerPanel, React.ReactNode> = {
    overview: <OverviewPanel state={effectiveState} actions={actions} theme={theme} />,
    'draw-calls': <DrawCallPanel state={effectiveState} actions={actions} theme={theme} />,
    batching: <BatchingPanel state={effectiveState} actions={actions} theme={theme} />,
    lod: <LODPanel state={effectiveState} actions={actions} theme={theme} />,
    volumetric: <VolumetricPanel state={effectiveState} actions={actions} theme={theme} />,
    foveated: <FoveatedPanel state={effectiveState} actions={actions} theme={theme} />,
    'frame-budget': <FrameBudgetPanel state={effectiveState} actions={actions} theme={theme} />,
  };

  const isCompact = state.displayMode === 'compact';
  const width = isCompact ? 320 : state.displayMode === 'expanded' ? 420 : '100%';

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        top: isCompact ? 8 : 0,
        right: isCompact ? 8 : 0,
        width,
        maxHeight: isCompact ? '80vh' : '100vh',
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: isCompact ? 8 : 0,
        fontFamily: theme.fontFamily,
        fontSize: theme.fontSize,
        color: theme.text,
        overflow: 'auto',
        zIndex: 9999,
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', borderBottom: `1px solid ${theme.border}`,
        background: theme.panelBg,
      }}>
        <div>
          <span style={{ fontWeight: 'bold', color: theme.accent }}>{state.sceneName}</span>
          <span style={{ marginLeft: 8, opacity: 0.6 }}>{state.platform.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{
            color: {
              healthy: theme.healthy,
              warning: theme.warning,
              critical: theme.critical,
              exceeded: theme.exceeded,
            }[state.budgetHealth],
            fontWeight: 'bold',
          }}>
            {state.currentFPS} FPS
          </span>
          <button
            onClick={() => actions.setDisplayMode(
              state.displayMode === 'compact' ? 'expanded' : 'compact'
            )}
            style={{
              background: 'none', border: `1px solid ${theme.border}`,
              color: theme.text, borderRadius: 4, padding: '2px 6px',
              cursor: 'pointer', fontSize: theme.fontSize - 2,
            }}
          >
            {state.displayMode === 'compact' ? 'Expand' : 'Compact'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 1,
        padding: '4px 8px',
        borderBottom: `1px solid ${theme.border}`,
      }}>
        {(Object.keys(PANEL_LABELS) as SceneProfilerPanel[]).map(panel => (
          <button
            key={panel}
            onClick={() => actions.setActivePanel(panel)}
            style={{
              background: state.activePanel === panel ? theme.accent : 'transparent',
              color: state.activePanel === panel ? '#fff' : theme.text,
              border: 'none', borderRadius: 4,
              padding: '3px 8px', fontSize: theme.fontSize - 1,
              cursor: 'pointer', opacity: state.activePanel === panel ? 1 : 0.7,
            }}
          >
            {PANEL_LABELS[panel]}
          </button>
        ))}
      </div>

      {/* Panel Content */}
      <div style={{ padding: '8px 12px' }}>
        {panelContent[state.activePanel]}
      </div>
    </div>
  );
};
