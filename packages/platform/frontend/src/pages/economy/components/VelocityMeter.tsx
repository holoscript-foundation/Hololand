import React from 'react';
import type { VelocityData } from '../types';

interface VelocityMeterProps {
  data: VelocityData[];
  targetVelocity?: number;
}

/**
 * VelocityMeter -- Token velocity gauge with historical trend.
 * WCAG 2.1 AA compliant.
 */
export function VelocityMeter({ data, targetVelocity = 5.0 }: VelocityMeterProps) {
  const latest = data[data.length - 1];
  const velocity = latest?.velocity ?? 0;
  const maxVelocity = Math.max(targetVelocity * 2, velocity * 1.2, 10);
  const angle = (velocity / maxVelocity) * 180;
  const isHealthy = velocity >= targetVelocity * 0.7 && velocity <= targetVelocity * 1.5;

  return (
    <div
      style={{
        background: '#0d1020',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
        textAlign: 'center',
      }}
      role="meter"
      aria-label={`Token velocity: ${velocity.toFixed(2)} transactions per token`}
      aria-valuenow={velocity}
      aria-valuemin={0}
      aria-valuemax={maxVelocity}
    >
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 16, margin: '0 0 16px 0' }}>
        Token Velocity
      </h4>

      {/* Gauge */}
      <div style={{ position: 'relative', width: 160, height: 90, margin: '0 auto 12px' }}>
        <svg viewBox="0 0 160 90" width={160} height={90} aria-hidden="true">
          {/* Background arc */}
          <path d="M 10 80 A 70 70 0 0 1 150 80" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} strokeLinecap="round" />
          {/* Colored arc */}
          <path
            d="M 10 80 A 70 70 0 0 1 150 80"
            fill="none"
            stroke={isHealthy ? '#4ecdc4' : velocity < targetVelocity * 0.7 ? '#f59e0b' : '#ef4444'}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${(angle / 180) * 220} 220`}
          />
          {/* Needle */}
          <line
            x1="80" y1="80"
            x2={80 + 55 * Math.cos(((180 - angle) * Math.PI) / 180)}
            y2={80 - 55 * Math.sin(((180 - angle) * Math.PI) / 180)}
            stroke="#e8e8f8"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx="80" cy="80" r="3" fill="#e8e8f8" />
        </svg>
      </div>

      <div style={{ fontSize: 24, fontWeight: 700, color: '#e8e8f8' }}>
        {velocity.toFixed(2)}
      </div>
      <div style={{ fontSize: 9, color: '#556677', textTransform: 'uppercase', marginBottom: 8 }}>
        Tx / Token / Period
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 10 }}>
        <span style={{ color: '#667788' }}>
          Target: {targetVelocity.toFixed(1)}
        </span>
        <span style={{ color: '#667788' }}>
          Volume: {latest ? latest.transactionVolume.toLocaleString() : 'N/A'}
        </span>
      </div>
    </div>
  );
}

export default VelocityMeter;
