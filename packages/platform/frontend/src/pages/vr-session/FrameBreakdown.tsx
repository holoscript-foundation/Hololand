import React from 'react';
import type { UserSessionData } from './types';

interface FrameBreakdownProps { user: UserSessionData; targetMs: number; }

export function FrameBreakdown({ user, targetMs }: FrameBreakdownProps) {
  const overBudget = user.frameTimeMs > targetMs;
  return (
    <div style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: 11 }}>
      <div style={{ fontWeight: 600, color: '#e8e8f8', marginBottom: 4 }}>{user.name}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <span style={{ color: '#4ecdc4' }}>CPU: {user.cpuMs.toFixed(1)}ms</span>
        <span style={{ color: '#3b82f6' }}>GPU: {user.gpuMs.toFixed(1)}ms</span>
        <span style={{ color: overBudget ? '#f87171' : '#4ade80' }}>Total: {user.frameTimeMs.toFixed(1)}ms</span>
      </div>
    </div>
  );
}
export default FrameBreakdown;
