import React, { useState } from 'react';
import { ModelSelector } from './ModelSelector';
import { InferenceToggle } from './InferenceToggle';
import { CacheSlider } from './CacheSlider';
import type { XRAgentState, ModelOption, InferenceMode, ThermalPriority } from './types';

interface XRAgentConfigProps { state: XRAgentState; models: ModelOption[]; onUpdate: (changes: Partial<XRAgentState>) => void; }

const THERMAL_CONFIG: Record<ThermalPriority, { label: string; color: string }> = { performance: { label: 'Performance', color: '#ef4444' }, balanced: { label: 'Balanced', color: '#f59e0b' }, efficiency: { label: 'Efficiency', color: '#4ade80' } };

export function XRAgentConfig({ state, models, onUpdate }: XRAgentConfigProps) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', padding: 24, color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>XR Agent Configuration</h1>
      <p style={{ fontSize: 12, color: '#667788', marginBottom: 24 }}>Configure on-device AI for WebXR experiences</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900 }}>
        <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ModelSelector models={models} selectedId={state.selectedModel} onSelect={(id) => onUpdate({ selectedModel: id })} />
          <InferenceToggle mode={state.inferenceMode} onChange={(mode) => onUpdate({ inferenceMode: mode })} />
          <CacheSlider value={state.kvCacheSize} max={state.maxKvCache} onChange={(v) => onUpdate({ kvCacheSize: v })} />

          <div>
            <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 8, margin: '0 0 8px 0' }}>Thermal Priority</h4>
            <div style={{ display: 'flex', gap: 4 }} role="radiogroup" aria-label="Thermal priority">
              {(Object.keys(THERMAL_CONFIG) as ThermalPriority[]).map((tp) => (
                <button key={tp} onClick={() => onUpdate({ thermalPriority: tp })} role="radio" aria-checked={state.thermalPriority === tp} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: state.thermalPriority === tp ? `${THERMAL_CONFIG[tp].color}20` : 'rgba(255,255,255,0.03)',
                  color: state.thermalPriority === tp ? THERMAL_CONFIG[tp].color : '#667788',
                }}>
                  {THERMAL_CONFIG[tp].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live metrics */}
        <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f8', marginBottom: 16 }}>Live Metrics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#4ecdc4' }}>{state.tokensPerSecond.toFixed(1)}</div>
              <div style={{ fontSize: 9, color: '#556677' }}>TOK/S</div>
            </div>
            <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{state.memoryUsageMB.toFixed(0)}</div>
              <div style={{ fontSize: 9, color: '#556677' }}>MB USED</div>
            </div>
            <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: state.temperature > state.maxTemperature * 0.8 ? '#f87171' : '#4ade80' }}>{state.temperature.toFixed(0)}&deg;C</div>
              <div style={{ fontSize: 9, color: '#556677' }}>THERMAL</div>
            </div>
            <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#a855f7' }}>{state.kvCacheSize}</div>
              <div style={{ fontSize: 9, color: '#556677' }}>KV CACHE MB</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default XRAgentConfig;
