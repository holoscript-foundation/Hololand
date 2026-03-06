import React from 'react';
import { UserBudgetBar } from './UserBudgetBar';
import { FoveationHeatmap } from './FoveationHeatmap';
import { FrameBreakdown } from './FrameBreakdown';
import type { VRSessionState } from './types';

interface VRSessionMonitorProps { state: VRSessionState; }

export function VRSessionMonitor({ state }: VRSessionMonitorProps) {
  const targetMs = 1000 / state.targetFps;
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', padding: 24, color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>VR Session Monitor</h1>
      <p style={{ fontSize: 12, color: '#667788', marginBottom: 24 }}>{state.users.length} users in session {state.sessionId}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 1100 }}>
        <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f8', marginBottom: 12 }}>Gaussian Budgets</h3>
          {state.users.map((u) => <UserBudgetBar key={u.userId} user={u} />)}
        </div>
        <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f8', marginBottom: 12 }}>Foveation Heatmaps</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
            {state.users.map((u) => (
              <div key={u.userId}>
                <div style={{ fontSize: 10, color: '#889', marginBottom: 4 }}>{u.name}</div>
                <FoveationHeatmap data={u.foveationData} width={150} height={100} userId={u.userId} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f8', marginBottom: 12 }}>Frame Breakdowns</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 }}>
          {state.users.map((u) => <FrameBreakdown key={u.userId} user={u} targetMs={targetMs} />)}
        </div>
      </div>
    </div>
  );
}
export default VRSessionMonitor;
