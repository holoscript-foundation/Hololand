import React from 'react';
import type { ComplianceItem, GateStatus } from './types';

interface ComplianceReportProps { items: ComplianceItem[]; }

const STATUS_ICONS: Record<GateStatus, string> = { pass: '\u2713', fail: '\u2717', warn: '!', skip: '-', pending: '...' };
const STATUS_COLORS: Record<GateStatus, string> = { pass: '#4ade80', fail: '#f87171', warn: '#fbbf24', skip: '#667788', pending: '#3b82f6' };

export function ComplianceReport({ items }: ComplianceReportProps) {
  const passCount = items.filter((i) => i.status === 'pass').length;

  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="Compliance report">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', margin: 0 }}>Compliance</h4>
        <span style={{ fontSize: 11, color: passCount === items.length ? '#4ade80' : '#f59e0b' }}>{passCount}/{items.length} passing</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', fontSize: 11 }}>
            <span style={{ color: STATUS_COLORS[item.status], fontWeight: 700, width: 14 }}>{STATUS_ICONS[item.status]}</span>
            <span style={{ flex: 1, color: '#b0b0c8' }}>{item.criterion}</span>
            <span style={{ fontSize: 9, color: '#556677', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.evidence}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
export default ComplianceReport;
