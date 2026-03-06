import React from 'react';
import type { NeuromorphicDevice } from './types';

interface SpikeRateMonitorProps { devices: NeuromorphicDevice[]; }

export function SpikeRateMonitor({ devices }: SpikeRateMonitorProps) {
  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Spike rates">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Spike Rates</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {devices.map((d) => {
          const pct = (d.spikeRate / d.maxSpikeRate) * 100;
          return (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 60, fontSize: 10, color: '#889', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
              <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#a855f7', borderRadius: 3 }} role="progressbar" aria-valuenow={d.spikeRate} aria-label={`${d.name} spike rate`} />
              </div>
              <span style={{ width: 60, fontSize: 10, color: '#b0b0c8', textAlign: 'right', fontFamily: 'monospace' }}>{(d.spikeRate / 1000).toFixed(1)}K/s</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default SpikeRateMonitor;
