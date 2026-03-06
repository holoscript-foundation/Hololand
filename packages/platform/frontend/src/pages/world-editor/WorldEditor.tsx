import React, { useState, useCallback } from 'react';
import { NodeGraph } from './NodeGraph';
import type { WorldComposition, Position2D, ZoneConfig, ConstraintConfig } from './types';

interface WorldEditorProps {
  initialComposition?: WorldComposition;
  onSave?: (composition: WorldComposition) => void;
}

const DEFAULT_COMPOSITION: WorldComposition = {
  id: 'new-world', name: 'Untitled World', zones: [], constraints: [],
  metadata: { author: '', version: '1.0.0', createdAt: Date.now(), updatedAt: Date.now() },
};

const ZONE_TYPES: ZoneConfig['type'][] = ['spawn', 'combat', 'social', 'trade', 'quest', 'safe', 'custom'];
const ZONE_COLORS: Record<ZoneConfig['type'], string> = {
  spawn: '#22c55e', combat: '#ef4444', social: '#3b82f6', trade: '#f59e0b', quest: '#a855f7', safe: '#4ecdc4', custom: '#ec4899',
};

/**
 * WorldEditor -- Node-graph visual editor for HoloScript world compositions.
 */
export function WorldEditor({ initialComposition, onSave }: WorldEditorProps) {
  const [composition, setComposition] = useState<WorldComposition>(initialComposition ?? DEFAULT_COMPOSITION);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedConstraintId, setSelectedConstraintId] = useState<string | null>(null);

  const updateZonePosition = useCallback((zoneId: string, pos: Position2D) => {
    setComposition((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => (z.id === zoneId ? { ...z, position: pos } : z)),
      metadata: { ...prev.metadata, updatedAt: Date.now() },
    }));
  }, []);

  const addZone = useCallback((type: ZoneConfig['type']) => {
    const id = `zone-${Date.now()}`;
    const newZone: ZoneConfig = {
      id, name: `${type.charAt(0).toUpperCase() + type.slice(1)} Zone`, type,
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
      size: { width: 140, height: 80 }, color: ZONE_COLORS[type], maxPlayers: 20,
      constraints: [], properties: {},
    };
    setComposition((prev) => ({ ...prev, zones: [...prev.zones, newZone], metadata: { ...prev.metadata, updatedAt: Date.now() } }));
  }, []);

  const addConstraint = useCallback((sourceId: string, targetId: string) => {
    const id = `edge-${Date.now()}`;
    const constraint: ConstraintConfig = { id, sourceZoneId: sourceId, targetZoneId: targetId, type: 'connected', properties: {} };
    setComposition((prev) => ({ ...prev, constraints: [...prev.constraints, constraint], metadata: { ...prev.metadata, updatedAt: Date.now() } }));
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedZoneId) {
      setComposition((prev) => ({
        ...prev,
        zones: prev.zones.filter((z) => z.id !== selectedZoneId),
        constraints: prev.constraints.filter((c) => c.sourceZoneId !== selectedZoneId && c.targetZoneId !== selectedZoneId),
      }));
      setSelectedZoneId(null);
    } else if (selectedConstraintId) {
      setComposition((prev) => ({ ...prev, constraints: prev.constraints.filter((c) => c.id !== selectedConstraintId) }));
      setSelectedConstraintId(null);
    }
  }, [selectedZoneId, selectedConstraintId]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: '#e8e8f8', margin: 0 }}>World Editor</h1>
        <div style={{ flex: 1 }} />
        {ZONE_TYPES.map((type) => (
          <button key={type} onClick={() => addZone(type)} style={{
            padding: '4px 10px', fontSize: 10, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
            background: `${ZONE_COLORS[type]}15`, border: `1px solid ${ZONE_COLORS[type]}30`, color: ZONE_COLORS[type], textTransform: 'capitalize',
          }}>
            + {type}
          </button>
        ))}
        <button onClick={deleteSelected} disabled={!selectedZoneId && !selectedConstraintId} style={{
          padding: '4px 10px', fontSize: 10, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
          background: '#ef444415', border: '1px solid #ef444430', color: '#f87171',
          opacity: selectedZoneId || selectedConstraintId ? 1 : 0.3,
        }}>
          Delete
        </button>
        <button onClick={() => onSave?.(composition)} style={{
          padding: '4px 14px', fontSize: 10, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
          background: '#22c55e20', border: '1px solid #22c55e40', color: '#4ade80',
        }}>
          Save
        </button>
      </div>

      {/* Graph canvas */}
      <div style={{ padding: 20 }}>
        <NodeGraph
          composition={composition}
          onUpdateZonePosition={updateZonePosition}
          onAddConstraint={addConstraint}
          onSelectZone={setSelectedZoneId}
          onSelectConstraint={setSelectedConstraintId}
          selectedZoneId={selectedZoneId}
          selectedConstraintId={selectedConstraintId}
        />
      </div>

      {/* Status bar */}
      <div style={{ padding: '8px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: 10, color: '#556677', display: 'flex', gap: 16 }}>
        <span>{composition.zones.length} zones</span>
        <span>{composition.constraints.length} constraints</span>
        <span>{composition.name}</span>
      </div>
    </div>
  );
}

export default WorldEditor;
