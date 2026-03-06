import React from 'react';
import type { ModelOption } from './types';

interface ModelSelectorProps { models: ModelOption[]; selectedId: string; onSelect: (id: string) => void; }

export function ModelSelector({ models, selectedId, onSelect }: ModelSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Model selection">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 8, margin: '0 0 8px 0' }}>Model</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {models.map((m) => (
          <button key={m.id} onClick={() => onSelect(m.id)} role="radio" aria-checked={selectedId === m.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, cursor: 'pointer', textAlign: 'left', width: '100%',
            background: selectedId === m.id ? '#3b82f620' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${selectedId === m.id ? '#3b82f640' : 'rgba(255,255,255,0.06)'}`,
            color: '#d0d0e8',
          }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${selectedId === m.id ? '#60a5fa' : '#556677'}`, background: selectedId === m.id ? '#60a5fa' : 'transparent' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{m.name}</div>
              <div style={{ fontSize: 10, color: '#556677' }}>{m.parameterCount} params &middot; {m.sizeMB}MB</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
export default ModelSelector;
