import React from 'react';
import { ColdStartProgress } from './ColdStartProgress';
import { WebGPUInferenceEngine } from './WebGPUInferenceEngine';
import type { SpatialInferenceState } from './types';

interface SpatialInferenceProps { state: SpatialInferenceState; }

/**
 * SpatialInference -- WebGPU-powered on-device spatial AI inference component.
 */
export function SpatialInference({ state }: SpatialInferenceProps) {
  const isReady = state.status === 'ready' || state.status === 'running';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', padding: 24, color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>Spatial Inference</h1>
      <p style={{ fontSize: 12, color: '#667788', marginBottom: 24 }}>On-device spatial AI via WebGPU compute shaders</p>

      {!state.capabilities?.supported && (
        <div style={{ padding: 20, background: '#ef444415', border: '1px solid #ef444430', borderRadius: 12, marginBottom: 20 }} role="alert">
          <p style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>WebGPU is not supported in this browser.</p>
          <p style={{ fontSize: 11, color: '#889', marginTop: 4 }}>Use Chrome 113+ or Edge 113+ for WebGPU compute shader support.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isReady ? '1fr' : '1fr 1fr', gap: 20, maxWidth: 900 }}>
        {!isReady && <ColdStartProgress stages={state.coldStartStages} status={state.status} />}
        <WebGPUInferenceEngine state={state} />
      </div>

      {state.error && (
        <div style={{ marginTop: 16, padding: 12, background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, fontSize: 12, color: '#f87171' }} role="alert">
          {state.error}
        </div>
      )}
    </div>
  );
}

export default SpatialInference;
