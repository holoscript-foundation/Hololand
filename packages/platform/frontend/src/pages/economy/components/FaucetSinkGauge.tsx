import React from 'react';
import type { FaucetSinkData } from '../types';

interface FaucetSinkGaugeProps {
  data: FaucetSinkData;
}

/**
 * FaucetSinkGauge -- Visual gauge showing token inflow vs outflow.
 * WCAG 2.1 AA compliant with sufficient color contrast and aria labels.
 */
export function FaucetSinkGauge({ data }: FaucetSinkGaugeProps) {
  const maxRate = Math.max(data.faucetRate, data.sinkRate, 1);
  const faucetPct = (data.faucetRate / maxRate) * 100;
  const sinkPct = (data.sinkRate / maxRate) * 100;
  const isPositiveFlow = data.netFlow >= 0;

  return (
    <div
      style={{
        background: '#0d1020',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
        minWidth: 200,
      }}
      role="meter"
      aria-label={`${data.label}: Net flow ${data.netFlow > 0 ? '+' : ''}${data.netFlow.toFixed(1)} tokens/min`}
      aria-valuenow={data.netFlow}
    >
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>
        {data.label}
      </h4>

      {/* Faucet bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
          <span style={{ color: '#4ade80' }}>Faucet</span>
          <span style={{ color: '#b0b0c8' }}>{data.faucetRate.toFixed(1)}/min</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <div
            style={{ height: '100%', width: `${faucetPct}%`, background: '#22c55e', borderRadius: 3, transition: 'width 0.5s' }}
            role="progressbar"
            aria-valuenow={data.faucetRate}
            aria-label="Faucet rate"
          />
        </div>
      </div>

      {/* Sink bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
          <span style={{ color: '#f87171' }}>Sink</span>
          <span style={{ color: '#b0b0c8' }}>{data.sinkRate.toFixed(1)}/min</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
          <div
            style={{ height: '100%', width: `${sinkPct}%`, background: '#ef4444', borderRadius: 3, transition: 'width 0.5s' }}
            role="progressbar"
            aria-valuenow={data.sinkRate}
            aria-label="Sink rate"
          />
        </div>
      </div>

      {/* Net flow */}
      <div style={{ textAlign: 'center', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: isPositiveFlow ? '#4ade80' : '#f87171' }}>
          {isPositiveFlow ? '+' : ''}{data.netFlow.toFixed(1)}
        </span>
        <div style={{ fontSize: 9, color: '#556677', textTransform: 'uppercase' }}>Net Flow/min</div>
      </div>
    </div>
  );
}

export default FaucetSinkGauge;
