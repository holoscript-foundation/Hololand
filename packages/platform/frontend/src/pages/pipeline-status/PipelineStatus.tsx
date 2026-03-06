import React from 'react';
import { QualityChart } from './QualityChart';
import { ImprovementList } from './ImprovementList';
import { CircuitBreakerGrid } from './CircuitBreakerGrid';
import type { PipelineStatusState } from './types';

interface PipelineStatusProps { state: PipelineStatusState; }

export function PipelineStatus({ state }: PipelineStatusProps) {
  const queuedCount = state.queuedTasks.filter((t) => t.status === 'queued').length;
  const runningCount = state.queuedTasks.filter((t) => t.status === 'running').length;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', padding: 24, color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>Pipeline Status</h1>
      <p style={{ fontSize: 12, color: '#667788', marginBottom: 24 }}>Self-building pipeline: quality {state.currentQuality.toFixed(1)} / {state.targetQuality} target</p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: state.currentQuality >= state.targetQuality ? '#4ade80' : '#f59e0b' }}>{state.currentQuality.toFixed(1)}</span>
          <span style={{ fontSize: 9, color: '#556677', marginLeft: 4 }}>Quality</span>
        </div>
        <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>{runningCount}</span>
          <span style={{ fontSize: 9, color: '#556677', marginLeft: 4 }}>Running</span>
        </div>
        <div style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#889' }}>{queuedCount}</span>
          <span style={{ fontSize: 9, color: '#556677', marginLeft: 4 }}>Queued</span>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <QualityChart data={state.qualityHistory} target={state.targetQuality} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ImprovementList improvements={state.improvements} />
        <CircuitBreakerGrid breakers={state.circuitBreakers} />
      </div>

      {/* Queued tasks */}
      {state.queuedTasks.length > 0 && (
        <div style={{ marginTop: 20, background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f8', marginBottom: 12 }}>Queued Tasks</h3>
          <div style={{ display: 'grid', gap: 4 }}>
            {state.queuedTasks.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 4, fontSize: 11 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.status === 'running' ? '#fbbf24' : t.status === 'complete' ? '#4ade80' : t.status === 'failed' ? '#f87171' : '#556677' }} />
                <span style={{ flex: 1, color: '#b0b0c8' }}>{t.description}</span>
                <span style={{ fontSize: 9, color: '#556677' }}>{t.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export default PipelineStatus;
