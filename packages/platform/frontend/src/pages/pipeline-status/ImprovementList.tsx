import React from 'react';
import type { Improvement } from './types';

interface ImprovementListProps { improvements: Improvement[]; }

const STATUS_COLORS = { applied: '#4ade80', pending: '#fbbf24', reverted: '#f87171' };

export function ImprovementList({ improvements }: ImprovementListProps) {
  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Improvements list">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Improvements</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
        {improvements.map((imp) => (
          <div key={imp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 11 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[imp.status], flexShrink: 0 }} />
            <span style={{ flex: 1, color: '#b0b0c8' }}>{imp.description}</span>
            <span style={{ color: imp.impact > 0 ? '#4ade80' : '#f87171', fontFamily: 'monospace', fontSize: 10 }}>{imp.impact > 0 ? '+' : ''}{imp.impact.toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
export default ImprovementList;
