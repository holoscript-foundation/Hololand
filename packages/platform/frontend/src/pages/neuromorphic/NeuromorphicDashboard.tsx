import React from 'react';
import { PowerConsumption } from './PowerConsumption';
import { SpikeRateMonitor } from './SpikeRateMonitor';
import { SparsityMetrics } from './SparsityMetrics';
import type { NeuromorphicDevice } from './types';

interface NeuromorphicDashboardProps { devices: NeuromorphicDevice[]; }

export function NeuromorphicDashboard({ devices }: NeuromorphicDashboardProps) {
  const akida = devices.filter((d) => d.chip === 'akida');
  const loihi = devices.filter((d) => d.chip === 'loihi');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', padding: 24, color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>Neuromorphic Hardware</h1>
      <p style={{ fontSize: 12, color: '#667788', marginBottom: 24 }}>Akida/Loihi device monitoring: power, spike rates, sparsity</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, fontSize: 11 }}>
        <span style={{ color: '#4ecdc4' }}>{akida.length} Akida</span>
        <span style={{ color: '#a855f7' }}>{loihi.length} Loihi</span>
        <span style={{ color: '#889' }}>{devices.filter((d) => d.status === 'active').length} active</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, maxWidth: 1100 }}>
        <PowerConsumption devices={devices} />
        <SpikeRateMonitor devices={devices} />
        <SparsityMetrics devices={devices} />
      </div>
    </div>
  );
}
export default NeuromorphicDashboard;
