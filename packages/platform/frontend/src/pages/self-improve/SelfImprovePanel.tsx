import React, { useState, useCallback } from 'react';
import { CycleStatus } from './CycleStatus';
import { PromptQueue } from './PromptQueue';
import type { PipelineState, PipelineConfig } from './types';

interface SelfImprovePanelProps {
  state?: PipelineState;
  onStart?: (config: PipelineConfig) => void;
  onStop?: () => void;
  onToggleGRPO?: (enabled: boolean) => void;
  onRemovePrompt?: (id: string) => void;
  onPrioritizePrompt?: (id: string) => void;
}

const DEFAULT_CONFIG: PipelineConfig = {
  autoStart: false,
  grpoEnabled: true,
  maxIterations: 100,
  qualityThreshold: 85,
  cooldownMinutes: 5,
  promptBatchSize: 16,
};

/**
 * SelfImprovePanel -- Control panel for the self-improvement pipeline.
 *
 * Shows cycle status, start/stop controls, GRPO toggle, and prompt queue.
 */
export function SelfImprovePanel({
  state,
  onStart,
  onStop,
  onToggleGRPO,
  onRemovePrompt,
  onPrioritizePrompt,
}: SelfImprovePanelProps) {
  const [config, setConfig] = useState<PipelineConfig>(state?.config ?? DEFAULT_CONFIG);
  const isRunning = state?.isRunning ?? false;

  const handleToggleGRPO = useCallback(() => {
    const newVal = !config.grpoEnabled;
    setConfig((prev) => ({ ...prev, grpoEnabled: newVal }));
    onToggleGRPO?.(newVal);
  }, [config.grpoEnabled, onToggleGRPO]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)',
        padding: 24,
        color: '#d0d0e8',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>
          Self-Improve Pipeline
        </h1>
        <p style={{ fontSize: 12, color: '#667788' }}>
          Autonomous improvement cycles with optional GRPO training
        </p>
      </div>

      {/* Top controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        {!isRunning ? (
          <button
            onClick={() => onStart?.(config)}
            style={{
              padding: '10px 24px', background: '#22c55e20', border: '1px solid #22c55e40',
              borderRadius: 8, color: '#4ade80', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Start Pipeline
          </button>
        ) : (
          <button
            onClick={onStop}
            style={{
              padding: '10px 24px', background: '#ef444420', border: '1px solid #ef444440',
              borderRadius: 8, color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Stop Pipeline
          </button>
        )}

        {/* GRPO Toggle */}
        <button
          onClick={handleToggleGRPO}
          style={{
            padding: '10px 20px',
            background: config.grpoEnabled ? '#3b82f620' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${config.grpoEnabled ? '#3b82f640' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 8,
            color: config.grpoEnabled ? '#60a5fa' : '#667788',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          role="switch"
          aria-checked={config.grpoEnabled}
          aria-label="Toggle GRPO training"
        >
          GRPO {config.grpoEnabled ? 'ON' : 'OFF'}
        </button>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: '#556677' }}>
          Quality Threshold: {config.qualityThreshold}%
        </span>
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 1100 }}>
        <CycleStatus
          cycle={state?.currentCycle ?? null}
          totalCycles={state?.totalCycles ?? 0}
          averageImprovement={state?.averageImprovement ?? 0}
        />
        <PromptQueue
          items={state?.promptQueue ?? []}
          onRemove={onRemovePrompt}
          onPrioritize={onPrioritizePrompt}
        />
      </div>

      {/* History */}
      {state && state.history.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f8', marginBottom: 12 }}>Cycle History</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {state.history.slice(0, 20).map((cycle) => (
              <div
                key={cycle.id}
                style={{
                  padding: 12,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  fontSize: 11,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>Cycle #{cycle.iteration}</span>
                  <span style={{ color: cycle.improvement && cycle.improvement > 0 ? '#4ade80' : '#f87171' }}>
                    {cycle.improvement != null ? `${cycle.improvement > 0 ? '+' : ''}${cycle.improvement.toFixed(2)}%` : 'N/A'}
                  </span>
                </div>
                <div style={{ color: '#556677', fontSize: 10 }}>
                  {cycle.qualityBefore.toFixed(1)} &rarr; {cycle.qualityAfter?.toFixed(1) ?? '?'}
                  {cycle.grpoEnabled && ' (GRPO)'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SelfImprovePanel;
