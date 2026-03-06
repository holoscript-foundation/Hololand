import React from 'react';
import type { QualityGate, GateStatus } from './types';

interface GateMatrixProps { gates: QualityGate[]; }

const STATUS_CONFIG: Record<GateStatus, { color: string; bg: string; label: string }> = {
  pass: { color: '#4ade80', bg: '#22c55e15', label: 'Pass' },
  fail: { color: '#f87171', bg: '#ef444415', label: 'Fail' },
  warn: { color: '#fbbf24', bg: '#f59e0b15', label: 'Warn' },
  skip: { color: '#667788', bg: 'rgba(255,255,255,0.03)', label: 'Skip' },
  pending: { color: '#3b82f6', bg: '#3b82f615', label: '...' },
};

export function GateMatrix({ gates }: GateMatrixProps) {
  const categories = [...new Set(gates.map((g) => g.category))];

  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Quality gate matrix">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Gate Matrix</h4>
      {categories.map((cat) => (
        <div key={cat} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#667788', textTransform: 'uppercase', marginBottom: 6 }}>{cat}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {gates.filter((g) => g.category === cat).map((gate) => {
              const s = STATUS_CONFIG[gate.status];
              return (
                <div key={gate.id} title={`${gate.name}: ${gate.score.toFixed(1)}/${gate.threshold} - ${gate.details}`} style={{
                  padding: '6px 10px', background: s.bg, border: `1px solid ${s.color}20`, borderRadius: 6, fontSize: 10,
                }}>
                  <div style={{ fontWeight: 600, color: s.color }}>{gate.name}</div>
                  <div style={{ color: '#667788', fontSize: 9 }}>{gate.score.toFixed(0)}/{gate.threshold}{gate.required ? ' *' : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
export default GateMatrix;
