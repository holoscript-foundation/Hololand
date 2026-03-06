import React from 'react';
import type { PIDState } from '../types';

interface PIDStatusDisplayProps {
  state: PIDState;
}

/**
 * PIDStatusDisplay -- Shows PID controller status for economic stabilization.
 * WCAG 2.1 AA compliant.
 */
export function PIDStatusDisplay({ state }: PIDStatusDisplayProps) {
  const errorPct = state.setpoint !== 0 ? ((state.error / state.setpoint) * 100) : 0;
  const isStable = Math.abs(errorPct) < 5;

  return (
    <div
      style={{
        background: '#0d1020',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
      }}
      role="region"
      aria-label="PID controller status"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', margin: 0 }}>PID Controller</h4>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 600,
            background: state.isActive ? '#22c55e15' : '#ef444415',
            color: state.isActive ? '#4ade80' : '#f87171',
            border: `1px solid ${state.isActive ? '#22c55e30' : '#ef444430'}`,
          }}
        >
          {state.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Setpoint vs PV */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: '#889' }}>Setpoint</span>
          <span style={{ color: '#e8e8f8', fontFamily: 'monospace' }}>{state.setpoint.toFixed(4)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
          <span style={{ color: '#889' }}>Process Variable</span>
          <span style={{ color: '#e8e8f8', fontFamily: 'monospace' }}>{state.processVariable.toFixed(4)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: '#889' }}>Error</span>
          <span style={{ color: isStable ? '#4ade80' : '#f87171', fontFamily: 'monospace' }}>
            {state.error > 0 ? '+' : ''}{state.error.toFixed(4)} ({errorPct.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* PID terms */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
        {[
          { label: 'P', value: state.pTerm, color: '#3b82f6' },
          { label: 'I', value: state.iTerm, color: '#a855f7' },
          { label: 'D', value: state.dTerm, color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: 'monospace' }}>
              {value.toFixed(3)}
            </div>
            <div style={{ fontSize: 9, color: '#556677' }}>{label}-term</div>
          </div>
        ))}
      </div>

      {/* Output */}
      <div style={{ padding: 8, background: 'rgba(78,205,196,0.08)', borderRadius: 6, textAlign: 'center', border: '1px solid rgba(78,205,196,0.2)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#4ecdc4', fontFamily: 'monospace' }}>
          {state.output.toFixed(4)}
        </div>
        <div style={{ fontSize: 9, color: '#556677', textTransform: 'uppercase' }}>Controller Output</div>
      </div>
    </div>
  );
}

export default PIDStatusDisplay;
