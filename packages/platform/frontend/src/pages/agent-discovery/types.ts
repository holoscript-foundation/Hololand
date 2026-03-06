/** Agent Discovery Dashboard Types */
export type TrustTier = 'T0' | 'T1' | 'T2' | 'T3';
export interface AgentRecord { did: string; name: string; description: string; capabilities: string[]; tier: TrustTier; reputation: number; isVerified: boolean; registeredAt: number; lastActive: number; endpoint?: string; }
export interface DIDVerificationResult { did: string; isValid: boolean; method: string; publicKey: string; controller: string; verifiedAt: number; error?: string; }
export interface ReputationTrendPoint { timestamp: number; reputation: number; }
