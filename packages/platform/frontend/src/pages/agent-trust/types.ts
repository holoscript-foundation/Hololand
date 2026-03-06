/** Agent Trust Visualization Types */
export type TrustTier = 'T0' | 'T1' | 'T2' | 'T3';
export interface AgentTrustInfo { agentId: string; name: string; tier: TrustTier; reputation: number; capabilities: string[]; lastVerified: number; revoked: boolean; revokedReason?: string; history: Array<{ timestamp: number; reputation: number; tier: TrustTier }>; }
export const TRUST_TIER_CONFIG: Record<TrustTier, { label: string; color: string; bgColor: string; description: string }> = {
  T0: { label: 'Untrusted', color: '#ef4444', bgColor: '#ef444415', description: 'No verification, sandboxed execution' },
  T1: { label: 'Basic', color: '#f59e0b', bgColor: '#f59e0b15', description: 'Identity verified, limited capabilities' },
  T2: { label: 'Trusted', color: '#4ecdc4', bgColor: '#4ecdc415', description: 'Reputation established, standard capabilities' },
  T3: { label: 'Authority', color: '#a855f7', bgColor: '#a855f715', description: 'Fully verified, elevated privileges' },
};
