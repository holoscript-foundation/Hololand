import React from 'react';
import type { CycleInfo, CyclePhase } from './types';

interface CycleStatusProps {
  cycle: CycleInfo | null;
  totalCycles: number;
  averageImprovement: number;
}

const PHASE_CONFIG: Record<CyclePhase, { label: string; color: string; bgColor: string }> = {
  idle:       { label: 'Idle',       color: '#667788', bgColor: '#66778810' },
  generating: { label: 'Generating', color: '#3b82f6', bgColor: '#3b82f610' },
  evaluating: { label: 'Evaluating', color: '#a855f7', bgColor: '#a855f710' },
  training:   { label: 'Training',   color: '#f59e0b', bgColor: '#f59e0b10' },
  validating: { label: 'Validating', color: '#4ecdc4', bgColor: '#4ecdc410' },
  deploying:  { label: 'Deploying',  color: '#22c55e', bgColor: '#22c55e10' },
  paused:     { label: 'Paused',     color: '#fbbf24', bgColor: '#fbbf2410' },
  error:      { label: 'Error',      color: '#ef4444', bgColor: '#ef444410' },
};

/**
 * CycleStatus -- Displays current self-improve cycle state and metrics.
 */
export function CycleStatus({ cycle, totalCycles, averageImprovement }: CycleStatusProps) {
  const phase = cycle?.phase ?? 'idle';
  const config = PHASE_CONFIG[phase];

  const elapsed = cycle?.startedAt
    ? Math.floor((Date.now() - cycle.startedAt) / 1000)
    : 0;

  return (
    <div
      style={{
        background: '#0d1020',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 20,
        color: '#d0d0e8',
      }}
      role="status"
      aria-label="Self-improve cycle status"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f8', margin: 0 }}>Cycle Status</h3>
        <span
          style={{
            padding: '3px 10px',
            background: config.bgColor,
            border: `1px solid ${config.color}30`,
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            color: config.color,
          }}
        >
          {config.label}
        </span>
      </div>

      {/* Phase progress */}
      {cycle && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
            {(['generating', 'evaluating', 'training', 'validating', 'deploying'] as CyclePhase[]).map((p) => {
              const idx = ['generating', 'evaluating', 'training', 'validating', 'deploying'].indexOf(p);
              const currentIdx = ['generating', 'evaluating', 'training', 'validating', 'deploying'].indexOf(cycle.phase);
              const isComplete = currentIdx > idx;
              const isCurrent = p === cycle.phase;
              return (
                <div
                  key={p}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: isComplete ? '#4ecdc4' : isCurrent ? '#4ecdc480' : 'rgba(255,255,255,0.06)',
                    transition: 'background 0.3s',
                  }}
                  title={PHASE_CONFIG[p].label}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#556677' }}>
            <span>Prompts: {cycle.promptsProcessed}/{cycle.promptsTotal}</span>
            <span>Elapsed: {Math.floor(elapsed / 60)}m {elapsed % 60}s</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e8e8f8' }}>{cycle?.iteration ?? 0}</div>
          <div style={{ fontSize: 9, color: '#556677', textTransform: 'uppercase' }}>Current</div>
        </div>
        <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e8e8f8' }}>{totalCycles}</div>
          <div style={{ fontSize: 9, color: '#556677', textTransform: 'uppercase' }}>Total</div>
        </div>
        <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: averageImprovement > 0 ? '#4ade80' : '#f87171' }}>
            {averageImprovement > 0 ? '+' : ''}{averageImprovement.toFixed(2)}%
          </div>
          <div style={{ fontSize: 9, color: '#556677', textTransform: 'uppercase' }}>Avg Gain</div>
        </div>
      </div>
    </div>
  );
}

export default CycleStatus;
