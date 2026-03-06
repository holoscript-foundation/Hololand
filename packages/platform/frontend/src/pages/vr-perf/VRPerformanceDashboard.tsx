import React from 'react';
import { BudgetGauge } from './BudgetGauge';
import { FrameWaterfall } from './FrameWaterfall';
import { LightingFidelityPanel } from './LightingFidelityPanel';
import type { VRPerfState } from './types';

interface VRPerformanceDashboardProps { state: VRPerfState; }

/** VRPerformanceDashboard -- Real-time VR performance monitoring. WCAG 2.1 AA. */
export function VRPerformanceDashboard({ state }: VRPerformanceDashboardProps) {
  const fpsColor = state.fps >= state.targetFps * 0.95 ? '#4ade80' : state.fps >= state.targetFps * 0.8 ? '#fbbf24' : '#f87171';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', padding: 24, color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>VR Performance</h1>
      <p style={{ fontSize: 12, color: '#667788', marginBottom: 24 }}>Real-time Gaussian budget, lighting fidelity, and frame timing</p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: fpsColor }}>{state.fps}</div><div style={{ fontSize: 9, color: '#556677' }}>FPS (target: {state.targetFps})</div>
        </div>
        <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#e8e8f8' }}>{state.droppedFrames}</div><div style={{ fontSize: 9, color: '#556677' }}>Dropped</div>
        </div>
        <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#e8e8f8' }}>{(state.reprojectionRate * 100).toFixed(1)}%</div><div style={{ fontSize: 9, color: '#556677' }}>Reprojection</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 250px', gap: 20, maxWidth: 1100 }}>
        <BudgetGauge budget={state.gaussianBudget} />
        <FrameWaterfall entries={state.frameTimeline} />
        <LightingFidelityPanel fidelity={state.lightingFidelity} />
      </div>
    </div>
  );
}

export default VRPerformanceDashboard;
