import React from 'react';
import type { AutomatedCheck, CheckStatus } from './types';

interface AutomatedChecksProps { checks: AutomatedCheck[]; }

const STATUS_COLORS: Record<CheckStatus, string> = { pass: '#4ade80', fail: '#f87171', warn: '#fbbf24', pending: '#3b82f6' };

export function AutomatedChecks({ checks }: AutomatedChecksProps) {
  const totalScore = checks.reduce((s, c) => s + c.score, 0);
  const maxScore = checks.reduce((s, c) => s + c.maxScore, 0);

  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Automated checks (80%)">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', margin: 0 }}>Automated (80%)</h4>
        <span style={{ fontSize: 11, color: '#4ecdc4', fontFamily: 'monospace' }}>{totalScore}/{maxScore}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {checks.map((check) => (
          <div key={check.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4, fontSize: 11 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[check.status], flexShrink: 0 }} />
            <span style={{ flex: 1, color: '#b0b0c8' }}>{check.name}</span>
            <span style={{ color: STATUS_COLORS[check.status], fontFamily: 'monospace', fontSize: 10 }}>{check.score}/{check.maxScore}</span>
            <span style={{ color: '#556677', fontSize: 9 }}>{check.runtime_ms}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}
export default AutomatedChecks;
