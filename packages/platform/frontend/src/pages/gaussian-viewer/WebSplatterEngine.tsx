import React from 'react';
import type { RenderStats, ViewerConfig } from './types';

interface WebSplatterEngineProps { stats: RenderStats; config: ViewerConfig; onConfigChange: (config: Partial<ViewerConfig>) => void; }

export function WebSplatterEngine({ stats, config, onConfigChange }: WebSplatterEngineProps) {
  const fpsColor = stats.fps >= 55 ? '#4ade80' : stats.fps >= 30 ? '#fbbf24' : '#f87171';

  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, width: 260 }} role="region" aria-label="WebSplatter engine controls">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Engine Stats</h4>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
        <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6, textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 700, color: fpsColor }}>{stats.fps}</div><div style={{ fontSize: 8, color: '#556677' }}>FPS</div></div>
        <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6, textAlign: 'center' }}><div style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f8' }}>{(stats.visibleSplats / 1000).toFixed(0)}K</div><div style={{ fontSize: 8, color: '#556677' }}>Visible</div></div>
        <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6, textAlign: 'center' }}><div style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f8' }}>{stats.sortTimeMs.toFixed(1)}ms</div><div style={{ fontSize: 8, color: '#556677' }}>Sort</div></div>
        <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6, textAlign: 'center' }}><div style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f8' }}>{stats.memoryUsageMB.toFixed(0)}MB</div><div style={{ fontSize: 8, color: '#556677' }}>Memory</div></div>
      </div>

      <h4 style={{ fontSize: 11, fontWeight: 600, color: '#889', marginBottom: 8, margin: '0 0 8px 0' }}>Controls</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label htmlFor="opacity-cull" style={{ fontSize: 10, color: '#889' }}>Opacity Culling ({config.opacityCullingThreshold.toFixed(2)})</label>
          <input id="opacity-cull" type="range" min={0} max={0.5} step={0.01} value={config.opacityCullingThreshold} onChange={(e) => onConfigChange({ opacityCullingThreshold: parseFloat(e.target.value) })} style={{ width: '100%', accentColor: '#4ecdc4' }} />
        </div>
        <div>
          <label htmlFor="max-splats" style={{ fontSize: 10, color: '#889' }}>Max Splats ({(config.maxSplats / 1000000).toFixed(1)}M)</label>
          <input id="max-splats" type="range" min={100000} max={10000000} step={100000} value={config.maxSplats} onChange={(e) => onConfigChange({ maxSplats: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#4ecdc4' }} />
        </div>
        <button onClick={() => onConfigChange({ dynamicQuadsEnabled: !config.dynamicQuadsEnabled })} role="switch" aria-checked={config.dynamicQuadsEnabled} style={{
          padding: '6px 12px', fontSize: 10, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
          background: config.dynamicQuadsEnabled ? '#4ecdc420' : 'rgba(255,255,255,0.03)', border: `1px solid ${config.dynamicQuadsEnabled ? '#4ecdc440' : 'rgba(255,255,255,0.08)'}`, color: config.dynamicQuadsEnabled ? '#4ecdc4' : '#889',
        }}>
          Dynamic Quads: {config.dynamicQuadsEnabled ? 'ON' : 'OFF'}
        </button>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['wait-free', 'standard'] as const).map((s) => (
            <button key={s} onClick={() => onConfigChange({ sortStrategy: s })} style={{
              flex: 1, padding: '4px 8px', fontSize: 9, fontWeight: 600, borderRadius: 4, cursor: 'pointer', textTransform: 'capitalize',
              background: config.sortStrategy === s ? '#3b82f620' : 'rgba(255,255,255,0.03)', border: `1px solid ${config.sortStrategy === s ? '#3b82f640' : 'rgba(255,255,255,0.06)'}`, color: config.sortStrategy === s ? '#60a5fa' : '#889',
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WebSplatterEngine;
