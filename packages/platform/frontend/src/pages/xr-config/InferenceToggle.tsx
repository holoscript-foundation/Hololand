import React from 'react';
import type { InferenceMode } from './types';

interface InferenceToggleProps { mode: InferenceMode; onChange: (mode: InferenceMode) => void; }

const MODE_CONFIG: Record<InferenceMode, { label: string; color: string; desc: string }> = {
  local: { label: 'Local', color: '#4ade80', desc: 'On-device inference' },
  cloud: { label: 'Cloud', color: '#3b82f6', desc: 'Cloud offload' },
  hybrid: { label: 'Hybrid', color: '#a855f7', desc: 'Adaptive routing' },
};

export function InferenceToggle({ mode, onChange }: InferenceToggleProps) {
  return (
    <div>
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 8, margin: '0 0 8px 0' }}>Inference Mode</h4>
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 2 }} role="radiogroup" aria-label="Inference mode">
        {(Object.keys(MODE_CONFIG) as InferenceMode[]).map((m) => {
          const c = MODE_CONFIG[m];
          return (
            <button key={m} onClick={() => onChange(m)} role="radio" aria-checked={mode === m} title={c.desc} style={{
              flex: 1, padding: '8px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: mode === m ? `${c.color}20` : 'transparent', color: mode === m ? c.color : '#667788',
            }}>
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export default InferenceToggle;
