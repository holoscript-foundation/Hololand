import React from 'react';
import { FaucetSinkGauge } from './components/FaucetSinkGauge';
import { GiniChart } from './components/GiniChart';
import { VelocityMeter } from './components/VelocityMeter';
import { BondingCurveChart } from './components/BondingCurveChart';
import { PIDStatusDisplay } from './components/PIDStatusDisplay';
import type { EconomyOverview } from './types';

interface EconomyDashboardProps {
  data: EconomyOverview;
}

/**
 * EconomyDashboard -- Comprehensive economic visualization dashboard.
 *
 * Combines faucet/sink gauges, Gini coefficient chart, velocity meter,
 * bonding curve visualization, and PID controller status into a unified
 * economic monitoring view. WCAG 2.1 AA compliant throughout.
 */
export function EconomyDashboard({ data }: EconomyDashboardProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)',
        padding: 24,
        color: '#d0d0e8',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>
          Economy Dashboard
        </h1>
        <p style={{ fontSize: 12, color: '#667788' }}>
          Token economics monitoring: supply, velocity, distribution, and stabilization
        </p>
      </div>

      {/* Top stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Supply', value: data.totalSupply.toLocaleString() },
          { label: 'Circulating', value: data.circulatingSupply.toLocaleString() },
          { label: 'Treasury', value: data.treasuryBalance.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#e8e8f8' }}>{value}</div>
            <div style={{ fontSize: 10, color: '#556677', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Faucet/Sink gauges */}
      <section aria-label="Faucet and sink flows" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8e8f8', marginBottom: 12 }}>Token Flows</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {data.faucetSinks.map((fs) => (
            <FaucetSinkGauge key={fs.label} data={fs} />
          ))}
        </div>
      </section>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <section aria-label="Wealth distribution">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8e8f8', marginBottom: 12 }}>Distribution</h2>
          <GiniChart data={data.giniHistory} />
        </section>
        <section aria-label="Token velocity">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8e8f8', marginBottom: 12 }}>Velocity</h2>
          <VelocityMeter data={data.velocityHistory} />
        </section>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <section aria-label="Bonding curve">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8e8f8', marginBottom: 12 }}>Bonding Curve</h2>
          <BondingCurveChart state={data.bondingCurve} />
        </section>
        <section aria-label="PID controller">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e8e8f8', marginBottom: 12 }}>Stabilization</h2>
          <PIDStatusDisplay state={data.pidController} />
        </section>
      </div>
    </div>
  );
}

export default EconomyDashboard;
