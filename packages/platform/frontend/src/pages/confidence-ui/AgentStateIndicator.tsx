import React from 'react';
import type { AgentState } from './types';

interface AgentStateIndicatorProps { state: AgentState; confidence: number; }

const STATE_CONFIG: Record<AgentState, { label: string; color: string; icon: string; description: string }> = {
  local: { label: 'Local Inference', color: '#4ade80', icon: '\u{1F4F1}', description: 'On-device processing - lowest latency' },
  cloud: { label: 'Cloud Offload', color: '#3b82f6', icon: '\u{2601}\u{FE0F}', description: 'Server-side processing - higher capability' },
  degraded: { label: 'Degraded Mode', color: '#f59e0b', icon: '\u{26A0}\u{FE0F}', description: 'Limited functionality - reduced quality' },
};

export function AgentStateIndicator({ state, confidence }: AgentStateIndicatorProps) {
  const config = STATE_CONFIG[state];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: `${config.color}08`, border: `1px solid ${config.color}30`, borderRadius: 12 }} role="status" aria-label={`Agent state: ${config.label}, confidence ${(confidence * 100).toFixed(0)}%`}>
      <span style={{ fontSize: 24 }}>{config.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: config.color }}>{config.label}</div>
        <div style={{ fontSize: 11, color: '#889' }}>{config.description}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: config.color }}>{(confidence * 100).toFixed(0)}%</div>
        <div style={{ fontSize: 9, color: '#556677' }}>confidence</div>
      </div>
    </div>
  );
}
export default AgentStateIndicator;
