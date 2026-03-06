import React from 'react';
import type { PriorityCell } from './types';

interface PriorityHeatmapProps { cells: PriorityCell[]; }

function getHeatColor(value: number, max: number): string {
  const t = Math.min(value / max, 1);
  if (t < 0.25) return '#22c55e';
  if (t < 0.5) return '#f59e0b';
  if (t < 0.75) return '#ef4444';
  return '#dc2626';
}

export function PriorityHeatmap({ cells }: PriorityHeatmapProps) {
  const maxAccumulated = Math.max(...cells.map((c) => c.accumulated), 1);
  const zones = [...new Set(cells.map((c) => c.zoneId))];

  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Priority accumulator heatmap">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Priority Accumulator</h4>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(zones.length, 8)}, 1fr)`, gap: 2, maxHeight: 200, overflowY: 'auto' }}>
        {cells.slice(0, 64).map((cell) => (
          <div
            key={`${cell.zoneId}-${cell.entityId}`}
            style={{ width: '100%', aspectRatio: '1', background: getHeatColor(cell.accumulated, maxAccumulated), borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 600 }}
            title={`Zone ${cell.zoneId}, Entity ${cell.entityId}: priority=${cell.priority.toFixed(2)}, accumulated=${cell.accumulated.toFixed(2)}`}
          >
            {cell.priority.toFixed(1)}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 9, color: '#556677' }}>
        <span>Low priority</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {['#22c55e', '#f59e0b', '#ef4444', '#dc2626'].map((c) => (<span key={c} style={{ width: 12, height: 8, background: c, borderRadius: 1 }} />))}
        </div>
        <span>High priority</span>
      </div>
    </div>
  );
}

export default PriorityHeatmap;
