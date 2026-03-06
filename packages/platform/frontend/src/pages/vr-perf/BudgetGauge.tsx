import React from 'react';
import type { GaussianBudget } from './types';

interface BudgetGaugeProps { budget: GaussianBudget; }

export function BudgetGauge({ budget }: BudgetGaugeProps) {
  const pct = (budget.used / budget.totalBudget) * 100;
  const color = pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#4ade80';

  return (
    <div style={{ background: '#0d1020', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }} role="meter" aria-label={`Gaussian budget: ${pct.toFixed(0)}% used`} aria-valuenow={pct}>
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#e8e8f8', marginBottom: 12, margin: '0 0 12px 0' }}>Gaussian Budget</h4>
      <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 12px' }}>
        <svg viewBox="0 0 120 120" width={120} height={120}>
          <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
          <circle cx={60} cy={60} r={50} fill="none" stroke={color} strokeWidth={10} strokeDasharray={`${(pct / 100) * 314} 314`} strokeLinecap="round" transform="rotate(-90 60 60)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 24, fontWeight: 700, color }}>{pct.toFixed(0)}%</span>
          <span style={{ fontSize: 9, color: '#556677' }}>of budget</span>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#889' }}>
        {(budget.used / 1000000).toFixed(1)}M / {(budget.totalBudget / 1000000).toFixed(1)}M splats
      </div>
    </div>
  );
}

export default BudgetGauge;
