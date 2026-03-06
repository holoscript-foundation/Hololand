import React from 'react';

interface TokPerSecondProps { value: number; }

export function TokPerSecond({ value }: TokPerSecondProps) {
  const color = value > 20 ? '#4ade80' : value > 10 ? '#fbbf24' : '#f87171';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} role="status" aria-label={`${value.toFixed(1)} tokens per second`}>
      <span style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'monospace' }}>{value.toFixed(1)}</span>
      <span style={{ fontSize: 9, color: '#556677' }}>tok/s</span>
    </div>
  );
}
export default TokPerSecond;
