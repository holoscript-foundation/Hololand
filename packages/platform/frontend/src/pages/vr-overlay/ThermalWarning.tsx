import React from 'react';

interface ThermalWarningProps { level: 'nominal' | 'warm' | 'hot' | 'critical'; temperatureC: number; }

const THERMAL_COLORS = { nominal: '#4ade80', warm: '#fbbf24', hot: '#f59e0b', critical: '#ef4444' };

export function ThermalWarning({ level, temperatureC }: ThermalWarningProps) {
  const color = THERMAL_COLORS[level];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} role="status" aria-label={`Thermal: ${level} at ${temperatureC}\u00b0C`}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, animation: level === 'critical' ? 'pulse 1s infinite' : 'none' }} />
      <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: 'monospace' }}>{temperatureC}&deg;C</span>
      {(level === 'hot' || level === 'critical') && (
        <span style={{ fontSize: 9, color, fontWeight: 600, textTransform: 'uppercase' }} role="alert">{level}</span>
      )}
    </div>
  );
}
export default ThermalWarning;
