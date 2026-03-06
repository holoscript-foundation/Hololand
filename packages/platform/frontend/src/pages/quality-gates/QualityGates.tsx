import React from 'react';
import { GateMatrix } from './GateMatrix';
import { ComplianceReport } from './ComplianceReport';
import type { QualityGate, ComplianceItem } from './types';

interface QualityGatesProps { gates: QualityGate[]; compliance: ComplianceItem[]; onRunGates?: () => void; }

export function QualityGates({ gates, compliance, onRunGates }: QualityGatesProps) {
  const passCount = gates.filter((g) => g.status === 'pass').length;
  const failCount = gates.filter((g) => g.status === 'fail').length;
  const overallPass = failCount === 0 && gates.filter((g) => g.required && g.status !== 'pass').length === 0;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', padding: 24, color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>Quality Gates</h1>
          <p style={{ fontSize: 12, color: '#667788' }}>Progressive component quality gates for CI/CD</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: overallPass ? '#22c55e20' : '#ef444420', border: `1px solid ${overallPass ? '#22c55e40' : '#ef444440'}`, color: overallPass ? '#4ade80' : '#f87171' }}>
            {overallPass ? 'PASSING' : 'FAILING'}
          </span>
          <button onClick={onRunGates} style={{ padding: '8px 16px', background: '#3b82f620', border: '1px solid #3b82f640', borderRadius: 8, color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Run Gates
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}><span style={{ fontSize: 16, fontWeight: 700, color: '#4ade80' }}>{passCount}</span><span style={{ fontSize: 9, color: '#556677', marginLeft: 4 }}>Pass</span></div>
        <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}><span style={{ fontSize: 16, fontWeight: 700, color: '#f87171' }}>{failCount}</span><span style={{ fontSize: 9, color: '#556677', marginLeft: 4 }}>Fail</span></div>
        <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}><span style={{ fontSize: 16, fontWeight: 700, color: '#889' }}>{gates.length}</span><span style={{ fontSize: 9, color: '#556677', marginLeft: 4 }}>Total</span></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <GateMatrix gates={gates} />
        <ComplianceReport items={compliance} />
      </div>
    </div>
  );
}
export default QualityGates;
