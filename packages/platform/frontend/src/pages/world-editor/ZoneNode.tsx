import React, { useCallback } from 'react';
import type { ZoneConfig, Position2D } from './types';

interface ZoneNodeProps {
  zone: ZoneConfig;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (id: string, offset: Position2D) => void;
  onStartEdge: (sourceId: string) => void;
}

const ZONE_TYPE_COLORS: Record<ZoneConfig['type'], string> = {
  spawn: '#22c55e', combat: '#ef4444', social: '#3b82f6', trade: '#f59e0b',
  quest: '#a855f7', safe: '#4ecdc4', custom: '#ec4899',
};

/**
 * ZoneNode -- Draggable zone node in the world editor graph.
 */
export function ZoneNode({ zone, isSelected, onSelect, onDragStart, onStartEdge }: ZoneNodeProps) {
  const color = ZONE_TYPE_COLORS[zone.type];

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(zone.id);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    onDragStart(zone.id, { x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [zone.id, onSelect, onDragStart]);

  const handleEdgeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onStartEdge(zone.id);
  }, [zone.id, onStartEdge]);

  return (
    <div
      data-testid={`zone-node-${zone.id}`}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: zone.position.x,
        top: zone.position.y,
        width: zone.size.width,
        height: zone.size.height,
        background: `${color}10`,
        border: `2px solid ${isSelected ? color : `${color}40`}`,
        borderRadius: 8,
        cursor: 'grab',
        padding: 8,
        transition: 'border-color 0.15s',
        userSelect: 'none',
      }}
      role="button"
      aria-label={`Zone: ${zone.name} (${zone.type})`}
      tabIndex={0}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 2 }}>{zone.name}</div>
      <div style={{ fontSize: 9, color: '#667788', textTransform: 'uppercase' }}>{zone.type}</div>
      <div style={{ fontSize: 9, color: '#556677', marginTop: 2 }}>Max: {zone.maxPlayers}</div>

      {/* Edge connector */}
      <div
        onMouseDown={handleEdgeStart}
        style={{
          position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)',
          width: 12, height: 12, borderRadius: '50%', background: color, border: '2px solid #0d1020',
          cursor: 'crosshair',
        }}
        title="Drag to connect"
        role="button"
        aria-label={`Create connection from ${zone.name}`}
        tabIndex={0}
      />
    </div>
  );
}

export default ZoneNode;
