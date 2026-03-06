import React from 'react';
import type { SpatialInferenceState } from './types';

interface WebGPUInferenceEngineProps {
  state: SpatialInferenceState;
}

/**
 * WebGPUInferenceEngine -- Displays WebGPU compute pipeline metrics and controls.
 */
export function WebGPUInferenceEngine({ state }: WebGPUInferenceEngineProps) {
  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }} role="region" aria-label="WebGPU inference engine metrics">
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Inference Engine</h3>

      {/* GPU Info */}
      {state.capabilities && (
        <div style={{ marginBottom: 16, padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 11 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#889' }}>Adapter</span><span style={{ color: '#e8e8f8' }}>{state.capabilities.adapterName}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ color: '#889' }}>Max Buffer</span><span style={{ color: '#e8e8f8' }}>{(state.capabilities.maxBufferSize / 1024 / 1024).toFixed(0)} MB</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#889' }}>Shader F16</span><span style={{ color: state.capabilities.shaderF16 ? '#4ade80' : '#f87171' }}>{state.capabilities.shaderF16 ? 'Yes' : 'No'}</span></div>
        </div>
      )}

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Tok/s', value: state.metrics.tokensPerSecond.toFixed(1), color: '#4ecdc4' },
          { label: 'Latency', value: `${state.metrics.latencyMs.toFixed(0)}ms`, color: state.metrics.latencyMs < 50 ? '#4ade80' : '#f59e0b' },
          { label: 'Memory', value: `${state.metrics.memoryUsageMB.toFixed(0)} MB`, color: '#3b82f6' },
          { label: 'GPU %', value: `${state.metrics.gpuUtilization.toFixed(0)}%`, color: state.metrics.gpuUtilization > 90 ? '#f87171' : '#4ecdc4' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</div>
            <div style={{ fontSize: 9, color: '#556677', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Model info */}
      <div style={{ marginTop: 12, fontSize: 11, color: '#667788', display: 'flex', justifyContent: 'space-between' }}>
        <span>{state.modelName}</span>
        <span>{state.modelSizeMB.toFixed(0)} MB</span>
      </div>
    </div>
  );
}

export default WebGPUInferenceEngine;
