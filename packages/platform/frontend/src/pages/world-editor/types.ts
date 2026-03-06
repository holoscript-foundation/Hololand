/** World Editor Node Graph Types */

export interface Position2D { x: number; y: number; }

export interface ZoneConfig {
  id: string;
  name: string;
  type: 'spawn' | 'combat' | 'social' | 'trade' | 'quest' | 'safe' | 'custom';
  position: Position2D;
  size: { width: number; height: number };
  color: string;
  maxPlayers: number;
  constraints: string[];
  properties: Record<string, unknown>;
}

export interface ConstraintConfig {
  id: string;
  sourceZoneId: string;
  targetZoneId: string;
  type: 'adjacent' | 'connected' | 'blocked' | 'one-way' | 'level-gate';
  label?: string;
  properties: Record<string, unknown>;
}

export interface WorldComposition {
  id: string;
  name: string;
  zones: ZoneConfig[];
  constraints: ConstraintConfig[];
  metadata: {
    author: string;
    version: string;
    createdAt: number;
    updatedAt: number;
  };
}

export type DragState = { type: 'zone'; zoneId: string; offset: Position2D } | { type: 'edge'; sourceId: string } | null;
