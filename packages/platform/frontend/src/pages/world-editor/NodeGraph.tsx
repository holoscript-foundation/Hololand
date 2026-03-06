import React, { useState, useCallback, useRef } from 'react';
import { ZoneNode } from './ZoneNode';
import { ConstraintEdge } from './ConstraintEdge';
import type { WorldComposition, Position2D, DragState } from './types';

interface NodeGraphProps {
  composition: WorldComposition;
  onUpdateZonePosition: (zoneId: string, pos: Position2D) => void;
  onAddConstraint: (sourceId: string, targetId: string) => void;
  onSelectZone: (id: string | null) => void;
  onSelectConstraint: (id: string | null) => void;
  selectedZoneId: string | null;
  selectedConstraintId: string | null;
}

/**
 * NodeGraph -- Canvas area for the world composition graph editor.
 */
export function NodeGraph({ composition, onUpdateZonePosition, onAddConstraint, onSelectZone, onSelectConstraint, selectedZoneId, selectedConstraintId }: NodeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [pan, setPan] = useState<Position2D>({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;
    if (dragState.type === 'zone') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      onUpdateZonePosition(dragState.zoneId, {
        x: e.clientX - rect.left - dragState.offset.x - pan.x,
        y: e.clientY - rect.top - dragState.offset.y - pan.y,
      });
    }
  }, [dragState, onUpdateZonePosition, pan]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (dragState?.type === 'edge') {
      // Check if dropped on a zone
      const target = (e.target as HTMLElement).closest('[data-testid^="zone-node-"]');
      if (target) {
        const targetId = target.getAttribute('data-testid')?.replace('zone-node-', '');
        if (targetId && targetId !== dragState.sourceId) {
          onAddConstraint(dragState.sourceId, targetId);
        }
      }
    }
    setDragState(null);
  }, [dragState, onAddConstraint]);

  const handleZoneDragStart = useCallback((id: string, offset: Position2D) => {
    setDragState({ type: 'zone', zoneId: id, offset });
  }, []);

  const handleStartEdge = useCallback((sourceId: string) => {
    setDragState({ type: 'edge', sourceId });
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => { onSelectZone(null); onSelectConstraint(null); }}
      style={{
        position: 'relative', width: '100%', height: '100%', minHeight: 500,
        background: '#08090f', borderRadius: 12, overflow: 'hidden',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      role="application"
      aria-label="World composition graph editor"
    >
      {/* SVG layer for edges */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <g transform={`translate(${pan.x}, ${pan.y})`} style={{ pointerEvents: 'all' }}>
          {composition.constraints.map((c) => {
            const source = composition.zones.find((z) => z.id === c.sourceZoneId);
            const target = composition.zones.find((z) => z.id === c.targetZoneId);
            if (!source || !target) return null;
            return (
              <ConstraintEdge key={c.id} constraint={c} sourceZone={source} targetZone={target} isSelected={selectedConstraintId === c.id} onSelect={onSelectConstraint} />
            );
          })}
        </g>
      </svg>

      {/* Zone nodes */}
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${pan.x}px, ${pan.y}px)` }}>
        {composition.zones.map((zone) => (
          <ZoneNode key={zone.id} zone={zone} isSelected={selectedZoneId === zone.id} onSelect={onSelectZone} onDragStart={handleZoneDragStart} onStartEdge={handleStartEdge} />
        ))}
      </div>
    </div>
  );
}

export default NodeGraph;
