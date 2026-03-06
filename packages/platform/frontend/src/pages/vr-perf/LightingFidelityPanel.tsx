import React from 'react';
import type { LightingFidelity } from './types';

interface LightingFidelityPanelProps { fidelity: LightingFidelity; }

const LEVEL_COLORS = { low: '#ef4444', medium: '#f59e0b', high: '#4ecdc4', ultra: '#a855f7' };

export function LightingFidelityPanel({ fidelity }: LightingFidelityPanelProps) {
  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Lighting fidelity">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Lighting Fidelity</h4>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: LEVEL_COLORS[fidelity.level], textTransform: 'uppercase' }}>{fidelity.level}</span>
      </div>
      <div style={{ display: 'grid', gap: 8, fontSize: 11 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#889' }}>Active Probes</span><span style={{ color: '#e8e8f8' }}>{fidelity.activeProbes}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#889' }}>Shadow Casters</span><span style={{ color: '#e8e8f8' }}>{fidelity.shadowCasters}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#889' }}>Reflection Quality</span><span style={{ color: '#e8e8f8' }}>{(fidelity.reflectionQuality * 100).toFixed(0)}%</span></div>
      </div>
    </div>
  );
}

export default LightingFidelityPanel;
