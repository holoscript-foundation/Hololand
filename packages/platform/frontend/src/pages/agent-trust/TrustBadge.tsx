import React from 'react';
import type { TrustTier } from './types';
import { TRUST_TIER_CONFIG } from './types';

interface TrustBadgeProps { tier: TrustTier; size?: 'sm' | 'md' | 'lg'; revoked?: boolean; }

export function TrustBadge({ tier, size = 'md', revoked = false }: TrustBadgeProps) {
  const config = TRUST_TIER_CONFIG[tier];
  const sizes = { sm: { px: '4px 8px', fs: 9 }, md: { px: '6px 12px', fs: 11 }, lg: { px: '8px 16px', fs: 13 } };
  const s = sizes[size];

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: s.px, borderRadius: 6,
        background: revoked ? '#ef444415' : config.bgColor,
        border: `1px solid ${revoked ? '#ef444430' : config.color}30`,
        color: revoked ? '#f87171' : config.color,
        fontSize: s.fs, fontWeight: 600, textDecoration: revoked ? 'line-through' : 'none',
      }}
      role="status"
      aria-label={`Trust tier ${tier}: ${revoked ? 'Revoked' : config.label}`}
    >
      {tier} {revoked ? 'Revoked' : config.label}
    </span>
  );
}

export default TrustBadge;
