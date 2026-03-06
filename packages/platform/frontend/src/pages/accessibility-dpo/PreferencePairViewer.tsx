import React from 'react';
import type { PreferencePair } from './types';

interface PreferencePairViewerProps { pair: PreferencePair; }

export function PreferencePairViewer({ pair }: PreferencePairViewerProps) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', fontSize: 11 }}>
        <strong style={{ color: '#e8e8f8' }}>Prompt:</strong> <span style={{ color: '#889' }}>{pair.prompt}</span>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 9, color: '#556677' }}>{pair.category}</span>
          <span style={{ fontSize: 9, color: '#556677' }}>{pair.difficulty}</span>
          <span style={{ fontSize: 9, color: '#556677' }}>{pair.chosen.wcagCriteria.join(', ')}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ padding: 12, borderRight: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: 10, color: '#4ade80', fontWeight: 600, marginBottom: 4 }}>CHOSEN (Accessible)</div>
          <pre style={{ fontSize: 10, color: '#b0b0c8', margin: 0, whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'auto', fontFamily: 'monospace' }}>{pair.chosen.code.slice(0, 200)}</pre>
          <div style={{ fontSize: 10, color: '#667788', marginTop: 4 }}>{pair.chosen.explanation}</div>
        </div>
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 10, color: '#f87171', fontWeight: 600, marginBottom: 4 }}>REJECTED ({pair.rejected.violations.length} violations)</div>
          <pre style={{ fontSize: 10, color: '#b0b0c8', margin: 0, whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'auto', fontFamily: 'monospace' }}>{pair.rejected.code.slice(0, 200)}</pre>
        </div>
      </div>
    </div>
  );
}
export default PreferencePairViewer;
