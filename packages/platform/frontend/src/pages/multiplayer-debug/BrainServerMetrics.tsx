import React from 'react';
import type { BrainServerMetric } from './types';

interface BrainServerMetricsProps { servers: BrainServerMetric[]; }

const STATUS_COLORS = { healthy: '#4ade80', degraded: '#fbbf24', down: '#f87171' };

export function BrainServerMetrics({ servers }: BrainServerMetricsProps) {
  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Brain server metrics">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Brain Servers</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {servers.map((s) => (
          <div key={s.serverId} style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: `1px solid ${STATUS_COLORS[s.status]}20` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[s.status] }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#e8e8f8' }}>{s.serverId}</span>
              </div>
              <span style={{ fontSize: 10, color: STATUS_COLORS[s.status], textTransform: 'capitalize' }}>{s.status}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, fontSize: 10 }}>
              <div><span style={{ color: '#556677' }}>CPU</span><div style={{ color: s.cpu > 80 ? '#f87171' : '#b0b0c8' }}>{s.cpu}%</div></div>
              <div><span style={{ color: '#556677' }}>MEM</span><div style={{ color: s.memory > 80 ? '#f87171' : '#b0b0c8' }}>{s.memory}%</div></div>
              <div><span style={{ color: '#556677' }}>Conn</span><div style={{ color: '#b0b0c8' }}>{s.connections}</div></div>
              <div><span style={{ color: '#556677' }}>Tick</span><div style={{ color: '#b0b0c8' }}>{s.tickRate}Hz</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BrainServerMetrics;
