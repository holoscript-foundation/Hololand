import React from 'react';
import type { SpatialZone } from './types';

interface SpatialZoneMapProps { zones: SpatialZone[]; }

export function SpatialZoneMap({ zones }: SpatialZoneMapProps) {
  const maxR = Math.max(...zones.map((z) => z.position.x + z.radius), ...zones.map((z) => z.position.y + z.radius), 500);
  const scale = 300 / maxR;

  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Spatial zone map">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Spatial Zones</h4>
      <svg width={300} height={300} viewBox="0 0 300 300" style={{ borderRadius: 8, background: '#08090f' }}>
        {zones.map((zone) => (
          <g key={zone.id}>
            <circle cx={zone.position.x * scale} cy={zone.position.y * scale} r={zone.radius * scale} fill={zone.isActive ? 'rgba(78,205,196,0.1)' : 'rgba(255,255,255,0.03)'} stroke={zone.isActive ? '#4ecdc4' : '#333'} strokeWidth={1} />
            <text x={zone.position.x * scale} y={zone.position.y * scale - 4} textAnchor="middle" fill={zone.isActive ? '#e8e8f8' : '#556677'} fontSize={8} fontWeight={600}>{zone.name}</text>
            <text x={zone.position.x * scale} y={zone.position.y * scale + 8} textAnchor="middle" fill="#556677" fontSize={7}>{zone.playerCount}P / {zone.entityCount}E</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default SpatialZoneMap;
