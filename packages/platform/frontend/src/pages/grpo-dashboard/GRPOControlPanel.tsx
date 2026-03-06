import React, { useState, useCallback } from 'react';
import type { GRPOControlConfig, GRPOTrainingState } from './types';

interface GRPOControlPanelProps {
  state: GRPOTrainingState | null;
  onStart?: (config: GRPOControlConfig) => void;
  onStop?: () => void;
  onPause?: () => void;
  onUpdateConfig?: (config: Partial<GRPOControlConfig>) => void;
}

const DEFAULT_CONFIG: GRPOControlConfig = {
  learningRate: 2e-4,
  klCoefficient: 0.05,
  groupSize: 8,
  maxSteps: 10000,
  batchSize: 16,
  temperature: 0.8,
  topP: 0.95,
};

/**
 * GRPOControlPanel -- Training hyperparameter controls and run management.
 *
 * Provides sliders/inputs for LR, KL coefficient, group size, and other
 * GRPO-specific parameters. Start/stop/pause buttons for training control.
 */
export function GRPOControlPanel({ state, onStart, onStop, onPause, onUpdateConfig }: GRPOControlPanelProps) {
  const [config, setConfig] = useState<GRPOControlConfig>(DEFAULT_CONFIG);

  const updateField = useCallback(
    <K extends keyof GRPOControlConfig>(field: K, value: GRPOControlConfig[K]) => {
      setConfig((prev) => ({ ...prev, [field]: value }));
      onUpdateConfig?.({ [field]: value });
    },
    [onUpdateConfig],
  );

  const isRunning = state?.isRunning ?? false;
  const progress = state ? (state.currentStep / state.totalSteps) * 100 : 0;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div
      style={{
        background: '#0d1020',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 20,
        color: '#d0d0e8',
        fontFamily: "'Inter', sans-serif",
      }}
      role="region"
      aria-label="GRPO training controls"
    >
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#e8e8f8' }}>Training Controls</h3>

      {/* Status bar */}
      {state && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span>Step {state.currentStep.toLocaleString()} / {state.totalSteps.toLocaleString()}</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
            <div
              style={{ height: '100%', width: `${progress}%`, background: '#4ecdc4', borderRadius: 2, transition: 'width 0.3s' }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Training progress"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#556677', marginTop: 4 }}>
            <span>Elapsed: {formatTime(state.elapsedTime)}</span>
            <span>ETA: {formatTime(state.estimatedRemaining)}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {!isRunning ? (
          <button
            onClick={() => onStart?.(config)}
            style={{
              flex: 1, padding: '8px 16px', background: '#22c55e20', border: '1px solid #22c55e40',
              borderRadius: 8, color: '#4ade80', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Start Training
          </button>
        ) : (
          <>
            <button
              onClick={onPause}
              style={{
                flex: 1, padding: '8px 16px', background: '#f59e0b20', border: '1px solid #f59e0b40',
                borderRadius: 8, color: '#fbbf24', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Pause
            </button>
            <button
              onClick={onStop}
              style={{
                flex: 1, padding: '8px 16px', background: '#ef444420', border: '1px solid #ef444440',
                borderRadius: 8, color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Stop
            </button>
          </>
        )}
      </div>

      {/* Hyperparameters */}
      <div style={{ display: 'grid', gap: 12 }}>
        {[
          { label: 'Learning Rate', field: 'learningRate' as const, min: 1e-6, max: 1e-2, step: 1e-5, display: (v: number) => v.toExponential(1) },
          { label: 'KL Coefficient', field: 'klCoefficient' as const, min: 0.001, max: 0.5, step: 0.001, display: (v: number) => v.toFixed(3) },
          { label: 'Group Size', field: 'groupSize' as const, min: 2, max: 32, step: 2, display: (v: number) => v.toString() },
          { label: 'Batch Size', field: 'batchSize' as const, min: 1, max: 64, step: 1, display: (v: number) => v.toString() },
          { label: 'Temperature', field: 'temperature' as const, min: 0.1, max: 2.0, step: 0.05, display: (v: number) => v.toFixed(2) },
        ].map(({ label, field, min, max, step, display }) => (
          <div key={field}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <label htmlFor={`grpo-${field}`} style={{ color: '#b0b0c8' }}>{label}</label>
              <span style={{ color: '#4ecdc4', fontFamily: 'monospace' }}>{display(config[field])}</span>
            </div>
            <input
              id={`grpo-${field}`}
              type="range"
              min={min}
              max={max}
              step={step}
              value={config[field]}
              onChange={(e) => updateField(field, parseFloat(e.target.value))}
              disabled={isRunning}
              style={{ width: '100%', accentColor: '#4ecdc4' }}
              aria-label={label}
            />
          </div>
        ))}
      </div>

      {/* Live stats */}
      {state && (
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e8e8f8' }}>{state.loss.toFixed(4)}</div>
            <div style={{ fontSize: 9, color: '#556677', textTransform: 'uppercase' }}>Loss</div>
          </div>
          <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e8e8f8' }}>
              {state.klDivergence.length > 0
                ? state.klDivergence[state.klDivergence.length - 1].kl.toFixed(4)
                : 'N/A'}
            </div>
            <div style={{ fontSize: 9, color: '#556677', textTransform: 'uppercase' }}>KL Divergence</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GRPOControlPanel;
