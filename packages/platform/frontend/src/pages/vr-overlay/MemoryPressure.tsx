import React from 'react';

interface MemoryPressureProps { pressure: number; usedMB: number; totalMB: number; }

export function MemoryPressure({ pressure, usedMB, totalMB }: MemoryPressureProps) {
  const pct = pressure * 100;
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#4ade80';
  return (
    <div role="meter" aria-label={`Memory pressure: ${pct.toFixed(0)}%`} aria-valuenow={pct}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
        <span style={{ color: '#889' }}>MEM</span>
        <span style={{ color, fontFamily: 'monospace' }}>{usedMB.toFixed(0)}/{totalMB.toFixed(0)} MB</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}
export default MemoryPressure;
