import React from 'react';
import type { NeuromorphicDevice } from './types';

interface PowerConsumptionProps { devices: NeuromorphicDevice[]; }

export function PowerConsumption({ devices }: PowerConsumptionProps) {
  const totalPower = devices.reduce((s, d) => s + d.powerMilliwatts, 0);
  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Power consumption">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Power Consumption</h4>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: '#4ade80' }}>{totalPower.toFixed(0)}</span>
        <span style={{ fontSize: 12, color: '#556677' }}> mW</span>
      </div>
      {devices.map((d) => {
        const pct = (d.powerMilliwatts / d.maxPowerMilliwatts) * 100;
        return (
          <div key={d.id} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
              <span style={{ color: '#889' }}>{d.name}</span>
              <span style={{ color: '#b0b0c8' }}>{d.powerMilliwatts.toFixed(0)} mW</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#f59e0b' : '#4ade80', borderRadius: 2 }} role="progressbar" aria-valuenow={pct} aria-label={`${d.name} power`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default PowerConsumption;
