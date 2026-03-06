import React, { useState } from 'react';
import type { AgentRecord } from './types';

interface CapabilitySearchProps { agents: AgentRecord[]; onSelect: (did: string) => void; }

export function CapabilitySearch({ agents, onSelect }: CapabilitySearchProps) {
  const [query, setQuery] = useState('');
  const allCaps = [...new Set(agents.flatMap((a) => a.capabilities))].sort();
  const filtered = query ? allCaps.filter((c) => c.toLowerCase().includes(query.toLowerCase())) : allCaps;
  const [selectedCap, setSelectedCap] = useState<string | null>(null);
  const matchingAgents = selectedCap ? agents.filter((a) => a.capabilities.includes(selectedCap)) : [];

  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="search" aria-label="Search agent capabilities">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 8, margin: '0 0 8px 0' }}>Capability Search</h4>
      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search capabilities..." aria-label="Capability search" style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#e8e8f8', fontSize: 12, outline: 'none', marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxHeight: 120, overflowY: 'auto', marginBottom: 8 }}>
        {filtered.slice(0, 30).map((cap) => (
          <button key={cap} onClick={() => setSelectedCap(cap === selectedCap ? null : cap)} style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
            background: selectedCap === cap ? '#3b82f620' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${selectedCap === cap ? '#3b82f640' : 'rgba(255,255,255,0.06)'}`,
            color: selectedCap === cap ? '#60a5fa' : '#889',
          }}>
            {cap}
          </button>
        ))}
      </div>
      {selectedCap && matchingAgents.length > 0 && (
        <div style={{ fontSize: 10, color: '#889' }}>
          {matchingAgents.length} agent(s) with &quot;{selectedCap}&quot;:
          {matchingAgents.slice(0, 5).map((a) => (
            <button key={a.did} onClick={() => onSelect(a.did)} style={{ display: 'block', padding: '4px 8px', marginTop: 4, width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, color: '#b0b0c8', fontSize: 11, cursor: 'pointer' }}>
              {a.name} ({a.tier})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CapabilitySearch;
