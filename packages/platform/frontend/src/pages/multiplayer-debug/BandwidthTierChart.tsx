import React from 'react';
import type { TierBandwidth } from './types';

interface BandwidthTierChartProps { tiers: TierBandwidth[]; }

export function BandwidthTierChart({ tiers }: BandwidthTierChartProps) {
  const maxBps = Math.max(...tiers.map((t) => t.maxBudget), 1);

  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Bandwidth by tier">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Bandwidth / Tier</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tiers.map((tier) => {
          const pct = (tier.bytesPerSecond / tier.maxBudget) * 100;
          return (
            <div key={tier.tier}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                <span style={{ color: tier.color, fontWeight: 600, textTransform: 'capitalize' }}>{tier.tier}</span>
                <span style={{ color: '#889' }}>{(tier.bytesPerSecond / 1024).toFixed(1)} KB/s ({tier.packetCount} pkt)</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: pct > 90 ? '#ef4444' : tier.color, borderRadius: 3, transition: 'width 0.3s' }} role="progressbar" aria-valuenow={pct} aria-label={`${tier.tier} tier bandwidth`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BandwidthTierChart;
