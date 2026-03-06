import React, { useState } from 'react';
import { WCAGViolationGenerator } from './WCAGViolationGenerator';
import { PreferencePairViewer } from './PreferencePairViewer';
import type { DPOGeneratorState } from './types';

interface AccessibilityDPOProps { state: DPOGeneratorState; onGenerate?: () => void; onExport?: () => void; }

export function AccessibilityDPO({ state, onGenerate, onExport }: AccessibilityDPOProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedPair = state.generatedPairs[selectedIdx];
  const allViolations = state.generatedPairs.flatMap((p) => p.rejected.violations);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', padding: 24, color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>Accessibility DPO Generator</h1>
      <p style={{ fontSize: 12, color: '#667788', marginBottom: 24 }}>Convert {state.harvestExamples} harvest examples to {state.targetCount}+ WCAG DPO preference pairs</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <button onClick={onGenerate} disabled={state.isGenerating} style={{ padding: '10px 20px', background: '#3b82f620', border: '1px solid #3b82f640', borderRadius: 8, color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: state.isGenerating ? 0.5 : 1 }}>
          {state.isGenerating ? 'Generating...' : 'Generate Pairs'}
        </button>
        <button onClick={onExport} disabled={state.generatedPairs.length === 0} style={{ padding: '10px 20px', background: '#22c55e20', border: '1px solid #22c55e40', borderRadius: 8, color: '#4ade80', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Export ({state.generatedPairs.length} pairs)
        </button>
        {state.isGenerating && (
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${state.progress}%`, background: '#3b82f6', borderRadius: 2 }} role="progressbar" aria-valuenow={state.progress} />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
        <WCAGViolationGenerator violations={allViolations.slice(0, 20)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Navigation */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setSelectedIdx(Math.max(0, selectedIdx - 1))} disabled={selectedIdx === 0} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#889', fontSize: 11, cursor: 'pointer' }}>Prev</button>
            <span style={{ fontSize: 11, color: '#889' }}>{selectedIdx + 1} / {state.generatedPairs.length}</span>
            <button onClick={() => setSelectedIdx(Math.min(state.generatedPairs.length - 1, selectedIdx + 1))} disabled={selectedIdx >= state.generatedPairs.length - 1} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#889', fontSize: 11, cursor: 'pointer' }}>Next</button>
          </div>
          {selectedPair && <PreferencePairViewer pair={selectedPair} />}
        </div>
      </div>
    </div>
  );
}
export default AccessibilityDPO;
