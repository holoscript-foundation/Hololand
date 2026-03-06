import React from 'react';
import type { UserSessionData } from './types';

interface UserBudgetBarProps { user: UserSessionData; }

export function UserBudgetBar({ user }: UserBudgetBarProps) {
  const pct = (user.gaussianUsed / user.gaussianBudget) * 100;
  const color = pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#4ade80';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
      <span style={{ width: 80, fontSize: 11, fontWeight: 600, color: '#e8e8f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
      <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} role="progressbar" aria-valuenow={pct} aria-label={`${user.name} Gaussian budget: ${pct.toFixed(0)}%`} />
      </div>
      <span style={{ width: 50, fontSize: 10, color, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
    </div>
  );
}
export default UserBudgetBar;
