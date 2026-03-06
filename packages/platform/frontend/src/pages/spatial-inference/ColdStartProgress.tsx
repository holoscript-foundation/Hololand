import React from 'react';
import type { ColdStartStage, InferenceStatus } from './types';

interface ColdStartProgressProps {
  stages: ColdStartStage[];
  status: InferenceStatus;
}

const STATUS_ICONS: Record<ColdStartStage['status'], string> = {
  pending: '\u25CB', active: '\u25D4', complete: '\u25CF', error: '\u2717',
};

/**
 * ColdStartProgress -- Step-by-step cold start UX with stage indicators.
 */
export function ColdStartProgress({ stages, status }: ColdStartProgressProps) {
  if (status === 'ready' || status === 'running') return null;

  const totalProgress = stages.reduce((sum, s) => sum + s.progress, 0) / Math.max(stages.length, 1);

  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, maxWidth: 400 }} role="status" aria-label="WebGPU initialization progress">
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Initializing Spatial AI</h3>

      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${totalProgress}%`, background: '#4ecdc4', borderRadius: 2, transition: 'width 0.5s' }} role="progressbar" aria-valuenow={totalProgress} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stages.map((stage) => (
          <div key={stage.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: stage.status === 'complete' ? '#4ade80' : stage.status === 'active' ? '#4ecdc4' : stage.status === 'error' ? '#f87171' : '#556677', fontSize: 14 }}>
              {STATUS_ICONS[stage.status]}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: stage.status === 'active' ? '#e8e8f8' : '#889' }}>{stage.name}</div>
              {stage.status === 'active' && (
                <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1, marginTop: 3 }}>
                  <div style={{ height: '100%', width: `${stage.progress}%`, background: '#4ecdc4', borderRadius: 1, transition: 'width 0.3s' }} />
                </div>
              )}
            </div>
            {stage.durationMs != null && <span style={{ fontSize: 10, color: '#556677' }}>{stage.durationMs}ms</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ColdStartProgress;
