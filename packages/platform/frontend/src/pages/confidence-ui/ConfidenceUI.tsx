import React, { useState } from 'react';
import { AgentStateIndicator } from './AgentStateIndicator';
import { VoiceFeedback } from './VoiceFeedback';
import type { ConfidenceMetrics } from './types';

interface ConfidenceUIProps { metrics: ConfidenceMetrics; }

export function ConfidenceUI({ metrics }: ConfidenceUIProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(metrics.voiceFeedbackEnabled);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', padding: 24, color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>Confidence-Aware UI</h1>
      <p style={{ fontSize: 12, color: '#667788', marginBottom: 24 }}>Adaptive WebXR agent state management</p>

      <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AgentStateIndicator state={metrics.agentState} confidence={metrics.confidence} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#4ecdc4', fontFamily: 'monospace' }}>{metrics.latencyMs}ms</div>
            <div style={{ fontSize: 9, color: '#556677' }}>Latency</div>
          </div>
          <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6', fontFamily: 'monospace' }}>{metrics.tokensPerSecond.toFixed(1)}</div>
            <div style={{ fontSize: 9, color: '#556677' }}>Tok/s</div>
          </div>
          <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#a855f7', fontFamily: 'monospace' }}>{((Date.now() - metrics.lastTransition) / 1000).toFixed(0)}s</div>
            <div style={{ fontSize: 9, color: '#556677' }}>Since Transition</div>
          </div>
        </div>

        {metrics.fallbackReason && (
          <div style={{ padding: 12, background: '#f59e0b15', border: '1px solid #f59e0b30', borderRadius: 8, fontSize: 12, color: '#fbbf24' }} role="alert">
            <strong>Fallback:</strong> {metrics.fallbackReason}
          </div>
        )}

        <VoiceFeedback state={metrics.agentState} enabled={voiceEnabled} onToggle={() => setVoiceEnabled(!voiceEnabled)} />
      </div>
    </div>
  );
}
export default ConfidenceUI;
