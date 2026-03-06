import React, { useState } from 'react';
import { TrustBadge } from './TrustBadge';
import { ReputationChart } from './ReputationChart';
import { CapabilityViewer } from './CapabilityViewer';
import type { AgentTrustInfo } from './types';

interface AgentTrustDashboardProps { agents: AgentTrustInfo[]; }

export function AgentTrustDashboard({ agents }: AgentTrustDashboardProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(agents[0]?.agentId ?? null);
  const selected = agents.find((a) => a.agentId === selectedAgent);
  const revokedAgents = agents.filter((a) => a.revoked);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', padding: 24, color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>Agent Trust</h1>
      <p style={{ fontSize: 12, color: '#667788', marginBottom: 24 }}>T0-T3 trust visualization, reputation, and capability management</p>

      {revokedAgents.length > 0 && (
        <div style={{ marginBottom: 16, padding: 12, background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, fontSize: 12, color: '#f87171' }} role="alert">
          {revokedAgents.length} agent(s) have been revoked
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
        {/* Agent list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '80vh', overflowY: 'auto' }}>
          {agents.map((agent) => (
            <button key={agent.agentId} onClick={() => setSelectedAgent(agent.agentId)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
              background: selectedAgent === agent.agentId ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${selectedAgent === agent.agentId ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
              color: '#d0d0e8', width: '100%',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{agent.name}</div>
                <div style={{ fontSize: 10, color: '#556677' }}>{agent.agentId.slice(0, 16)}...</div>
              </div>
              <TrustBadge tier={agent.tier} size="sm" revoked={agent.revoked} />
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8e8f8', margin: 0 }}>{selected.name}</h2>
              <TrustBadge tier={selected.tier} size="lg" revoked={selected.revoked} />
            </div>
            <div style={{ marginBottom: 16 }}><ReputationChart agent={selected} width={500} height={200} /></div>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#889', marginBottom: 8 }}>Capabilities</h3>
            <CapabilityViewer capabilities={selected.capabilities} />
            {selected.revoked && selected.revokedReason && (
              <div style={{ marginTop: 16, padding: 12, background: '#ef444415', borderRadius: 8, fontSize: 12, color: '#f87171' }} role="alert">
                <strong>Revocation Reason:</strong> {selected.revokedReason}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentTrustDashboard;
