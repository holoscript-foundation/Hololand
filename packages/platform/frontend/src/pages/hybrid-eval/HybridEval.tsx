import React from 'react';
import { AutomatedChecks } from './AutomatedChecks';
import { HumanReviewChecklist } from './HumanReviewChecklist';
import type { HybridEvalState } from './types';

interface HybridEvalProps { state: HybridEvalState; onRunAutomated?: () => void; onSubmitReview?: (id: string, score: number, notes: string) => void; }

export function HybridEval({ state, onRunAutomated, onSubmitReview }: HybridEvalProps) {
  const scoreColor = state.combinedScore >= 80 ? '#4ade80' : state.combinedScore >= 60 ? '#fbbf24' : '#f87171';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #08090f 0%, #0d1020 100%)', padding: 24, color: '#d0d0e8', fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e8e8f8', marginBottom: 4 }}>Hybrid Evaluation</h1>
      <p style={{ fontSize: 12, color: '#667788', marginBottom: 24 }}>80/20 automated + human evaluation for frontend components</p>

      {/* Score summary */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 24, alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: scoreColor }}>{state.combinedScore.toFixed(0)}</div>
          <div style={{ fontSize: 10, color: '#556677' }}>Combined Score</div>
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 12 }}>
          <div style={{ flex: 4, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>{state.automatedScore.toFixed(1)}</div>
            <div style={{ fontSize: 9, color: '#556677' }}>Automated ({(state.automatedWeight * 100).toFixed(0)}%)</div>
          </div>
          <div style={{ flex: 1, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#a855f7' }}>{state.humanScore.toFixed(1)}</div>
            <div style={{ fontSize: 9, color: '#556677' }}>Human ({(state.humanWeight * 100).toFixed(0)}%)</div>
          </div>
        </div>
        <button onClick={onRunAutomated} style={{ padding: '10px 20px', background: '#3b82f620', border: '1px solid #3b82f640', borderRadius: 8, color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Run Automated
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
        <AutomatedChecks checks={state.automatedChecks} />
        <HumanReviewChecklist reviews={state.humanReviews} onReview={onSubmitReview} />
      </div>
    </div>
  );
}
export default HybridEval;
