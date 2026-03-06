import React from 'react';
import { BandwidthTierChart } from './BandwidthTierChart';
import { PriorityHeatmap } from './PriorityHeatmap';
import { SpatialZoneMap } from './SpatialZoneMap';
import { BrainServerMetrics } from './BrainServerMetrics';
import type { MultiplayerDebugState } from './types';

interface MultiplayerDebugProps { state: MultiplayerDebugState; }

export function MultiplayerDebug({ state }: MultiplayerDebugProps) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', padding: 24, color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>Multiplayer Debug</h1>
          <p style={{ fontSize: 12, color: '#667788' }}>Real-time network diagnostics and spatial zone monitoring</p>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
          <span style={{ color: '#4ecdc4' }}>{state.totalPlayers} players</span>
          <span style={{ color: '#889' }}>{state.totalEntities} entities</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 1100 }}>
        <BandwidthTierChart tiers={state.bandwidth} />
        <PriorityHeatmap cells={state.priorityMap} />
        <SpatialZoneMap zones={state.zones} />
        <BrainServerMetrics servers={state.brainServers} />
      </div>
    </div>
  );
}

export default MultiplayerDebug;
