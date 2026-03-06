import React, { useState, useCallback } from 'react';
import { CapabilitySearch } from './CapabilitySearch';
import { DIDVerification } from './DIDVerification';
import { ReputationTrend } from './ReputationTrend';
import type { AgentRecord, DIDVerificationResult, TrustTier } from './types';

interface AgentDiscoveryProps { agents: AgentRecord[]; onVerifyDID?: (did: string) => Promise<DIDVerificationResult>; }

const TIER_COLORS: Record<TrustTier, string> = { T0: '#ef4444', T1: '#f59e0b', T2: '#4ecdc4', T3: '#a855f7' };

export function AgentDiscovery({ agents, onVerifyDID }: AgentDiscoveryProps) {
  const [selectedDid, setSelectedDid] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TrustTier | 'all'>('all');
  const [verification, setVerification] = useState<DIDVerificationResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = agents.filter((a) => {
    if (tierFilter !== 'all' && a.tier !== tierFilter) return false;
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase()) && !a.did.includes(searchQuery)) return false;
    return true;
  });

  const selected = agents.find((a) => a.did === selectedDid);

  const handleVerify = useCallback(async (did: string) => {
    if (onVerifyDID) { const result = await onVerifyDID(did); setVerification(result); }
  }, [onVerifyDID]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', padding: 24, color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>Agent Discovery</h1>
      <p style={{ fontSize: 12, color: '#667788', marginBottom: 24 }}>ANS-based agent discovery with capability search and DID verification</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search agents..." aria-label="Search agents" style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, color: '#e8e8f8', fontSize: 12, outline: 'none', width: 200 }} />
        {(['all', 'T0', 'T1', 'T2', 'T3'] as const).map((t) => (
          <button key={t} onClick={() => setTierFilter(t)} style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
            background: tierFilter === t ? (t === 'all' ? 'rgba(255,255,255,0.1)' : `${TIER_COLORS[t]}20`) : 'rgba(255,255,255,0.03)',
            border: `1px solid ${tierFilter === t ? (t === 'all' ? 'rgba(255,255,255,0.2)' : `${TIER_COLORS[t]}40`) : 'rgba(255,255,255,0.06)'}`,
            color: tierFilter === t ? (t === 'all' ? '#e8e8f8' : TIER_COLORS[t]) : '#889',
          }}>
            {t === 'all' ? `All (${agents.length})` : t}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Agent list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '70vh', overflowY: 'auto' }}>
          {filtered.map((agent) => (
            <button key={agent.did} onClick={() => { setSelectedDid(agent.did); handleVerify(agent.did); }} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, cursor: 'pointer', textAlign: 'left', width: '100%',
              background: selectedDid === agent.did ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${selectedDid === agent.did ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`, color: '#d0d0e8',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: agent.isVerified ? '#4ade80' : '#667788', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{agent.name}</div>
                <div style={{ fontSize: 10, color: '#556677', fontFamily: 'monospace' }}>{agent.did.slice(0, 30)}...</div>
              </div>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: `${TIER_COLORS[agent.tier]}15`, color: TIER_COLORS[agent.tier] }}>{agent.tier}</span>
              <span style={{ fontSize: 11, color: '#889' }}>{agent.reputation}</span>
            </button>
          ))}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <CapabilitySearch agents={agents} onSelect={setSelectedDid} />
          <DIDVerification result={verification} onVerify={handleVerify} />
          {selected && <ReputationTrend data={selected.history?.map((h, i) => ({ timestamp: i, reputation: h })) as any ?? []} />}
        </div>
      </div>
    </div>
  );
}

export default AgentDiscovery;
