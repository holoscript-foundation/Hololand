import React from 'react';
import type { WCAGViolation } from './types';

interface WCAGViolationGeneratorProps { violations: WCAGViolation[]; }

const LEVEL_COLORS = { A: '#4ade80', AA: '#f59e0b', AAA: '#a855f7' };

export function WCAGViolationGenerator({ violations }: WCAGViolationGeneratorProps) {
  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="WCAG violations">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>WCAG Violations</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
        {violations.map((v, i) => (
          <div key={i} style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: '#e8e8f8' }}>{v.criterion}</span>
              <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 600, background: `${LEVEL_COLORS[v.level]}15`, color: LEVEL_COLORS[v.level] }}>{v.level}</span>
            </div>
            <div style={{ color: '#889', marginBottom: 2 }}>{v.description}</div>
            <div style={{ color: '#667788', fontFamily: 'monospace', fontSize: 10 }}>{v.element}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default WCAGViolationGenerator;
