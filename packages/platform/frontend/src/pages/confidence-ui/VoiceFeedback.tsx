import React from 'react';
import type { AgentState } from './types';

interface VoiceFeedbackProps { state: AgentState; enabled: boolean; onToggle: () => void; }

export function VoiceFeedback({ state, enabled, onToggle }: VoiceFeedbackProps) {
  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Voice feedback settings">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', margin: '0 0 4px 0' }}>Voice Feedback</h4>
          <p style={{ fontSize: 10, color: '#667788', margin: 0 }}>Audible notifications on state transitions</p>
        </div>
        <button onClick={onToggle} role="switch" aria-checked={enabled} style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative',
          background: enabled ? '#4ecdc4' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s',
        }}>
          <span style={{ position: 'absolute', top: 2, left: enabled ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
        </button>
      </div>
      {enabled && (
        <div style={{ marginTop: 8, fontSize: 10, color: '#556677' }}>
          Current mode: {state === 'local' ? 'Confirmation chime on local inference' : state === 'cloud' ? 'Tone on cloud offload' : 'Alert on degraded mode'}
        </div>
      )}
    </div>
  );
}
export default VoiceFeedback;
