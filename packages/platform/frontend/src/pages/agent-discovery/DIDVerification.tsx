import React from 'react';
import type { DIDVerificationResult } from './types';

interface DIDVerificationProps { result: DIDVerificationResult | null; onVerify: (did: string) => void; }

export function DIDVerification({ result, onVerify }: DIDVerificationProps) {
  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="region" aria-label="DID verification">
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>DID Verification</h4>
      {result ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: result.isValid ? '#4ade80' : '#f87171' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: result.isValid ? '#4ade80' : '#f87171' }}>
              {result.isValid ? 'Verified' : 'Invalid'}
            </span>
          </div>
          <div style={{ display: 'grid', gap: 6, fontSize: 11 }}>
            <div><span style={{ color: '#556677' }}>DID:</span><div style={{ color: '#b0b0c8', fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}>{result.did}</div></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#556677' }}>Method</span><span style={{ color: '#b0b0c8' }}>{result.method}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#556677' }}>Controller</span><span style={{ color: '#b0b0c8', fontSize: 10 }}>{result.controller.slice(0, 20)}...</span></div>
            {result.error && <div style={{ padding: 6, background: '#ef444415', borderRadius: 4, color: '#f87171', fontSize: 10 }}>{result.error}</div>}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: '#556677', textAlign: 'center', padding: 12 }}>Select an agent to verify their DID</p>
      )}
    </div>
  );
}

export default DIDVerification;
