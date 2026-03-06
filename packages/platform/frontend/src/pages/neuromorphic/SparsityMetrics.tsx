import React from 'react';
import type { NeuromorphicDevice } from './types';

interface SparsityMetricsProps { devices: NeuromorphicDevice[]; }

export function SparsityMetrics({ devices }: SparsityMetricsProps) {
  const avgSparsity = devices.length > 0 ? devices.reduce((s, d) => s + d.sparsity, 0) / devices.length : 0;
  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Sparsity metrics">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Sparsity</h4>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: avgSparsity > 0.9 ? '#4ade80' : '#f59e0b' }}>{(avgSparsity * 100).toFixed(1)}%</span>
        <div style={{ fontSize: 9, color: '#556677' }}>Average Sparsity</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6 }}>
        {devices.map((d) => (
          <div key={d.id} style={{ padding: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: d.sparsity > 0.9 ? '#4ade80' : '#f59e0b' }}>{(d.sparsity * 100).toFixed(0)}%</div>
            <div style={{ fontSize: 8, color: '#556677', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default SparsityMetrics;
