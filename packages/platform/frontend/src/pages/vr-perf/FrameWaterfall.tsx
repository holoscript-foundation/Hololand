import React from 'react';
import type { FrameTimeEntry } from './types';

interface FrameWaterfallProps { entries: FrameTimeEntry[]; targetMs?: number; }

export function FrameWaterfall({ entries, targetMs = 11.1 }: FrameWaterfallProps) {
  const maxMs = Math.max(...entries.map((e) => e.totalMs), targetMs * 1.5);
  const recent = entries.slice(-60);

  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="img" aria-label="Frame time waterfall chart">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Frame Waterfall</h4>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 120, position: 'relative' }}>
        {/* Target line */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(targetMs / maxMs) * 100}%`, borderTop: '1px dashed #ef444460', zIndex: 1 }}>
          <span style={{ position: 'absolute', right: 0, top: -12, fontSize: 8, color: '#ef4444' }}>{targetMs}ms</span>
        </div>
        {recent.map((entry, i) => {
          const cpuH = (entry.cpuMs / maxMs) * 100;
          const gpuH = (entry.gpuMs / maxMs) * 100;
          const overBudget = entry.totalMs > targetMs;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }} title={`CPU: ${entry.cpuMs.toFixed(1)}ms, GPU: ${entry.gpuMs.toFixed(1)}ms`}>
              <div style={{ height: `${gpuH}%`, background: overBudget ? '#ef4444' : '#3b82f6', borderRadius: '2px 2px 0 0', minHeight: 1 }} />
              <div style={{ height: `${cpuH}%`, background: overBudget ? '#f87171' : '#4ecdc4', minHeight: 1 }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, fontSize: 9 }}>
        <span style={{ color: '#4ecdc4' }}>\u25A0 CPU</span>
        <span style={{ color: '#3b82f6' }}>\u25A0 GPU</span>
        <span style={{ color: '#ef4444' }}>--- Budget ({targetMs}ms)</span>
      </div>
    </div>
  );
}

export default FrameWaterfall;
