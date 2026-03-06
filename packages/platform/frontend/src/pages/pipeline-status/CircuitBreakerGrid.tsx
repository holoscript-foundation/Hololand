import React from 'react';
import type { CircuitBreaker } from './types';

interface CircuitBreakerGridProps { breakers: CircuitBreaker[]; }

const STATUS_STYLES = {
  closed: { color: '#4ade80', bg: '#22c55e15', label: 'Closed' },
  open: { color: '#f87171', bg: '#ef444415', label: 'Open' },
  'half-open': { color: '#fbbf24', bg: '#f59e0b15', label: 'Half-Open' },
};

export function CircuitBreakerGrid({ breakers }: CircuitBreakerGridProps) {
  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Circuit breakers">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Circuit Breakers</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {breakers.map((b) => {
          const s = STATUS_STYLES[b.status];
          return (
            <div key={b.name} style={{ padding: 10, background: s.bg, border: `1px solid ${s.color}20`, borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#e8e8f8', marginBottom: 4 }}>{b.name}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: s.color }}>{s.label}</div>
              <div style={{ fontSize: 9, color: '#556677', marginTop: 2 }}>{b.failureCount}/{b.threshold} failures</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default CircuitBreakerGrid;
