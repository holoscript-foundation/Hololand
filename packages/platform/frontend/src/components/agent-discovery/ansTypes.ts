/**
 * ANS Agent Discovery Types
 *
 * Type definitions for the Agent Naming Service (ANS) discovery dashboard.
 * Models agent identity, DID verification, reputation history,
 * capability declarations, and trust tier filtering.
 *
 * Aligns with the uAA2++ trust tier model (T0-T3) from the renderer's
 * trust-ui component library and the VRTrustHandshake protocol.
 *
 * @module agent-discovery/ansTypes
 */

// =============================================================================
// TRUST TIERS (mirrors renderer trust-ui/types.ts)
// =============================================================================

export type TrustTier = 'T0' | 'T1' | 'T2' | 'T3';

export interface TrustTierMeta {
  tier: TrustTier;
  label: string;
  description: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  icon: string;
  minScore: number;
  maxScore: number;
}

export const TRUST_TIER_CONFIG: Record<TrustTier, TrustTierMeta> = {
  T0: {
    tier: 'T0',
    label: 'Untrusted',
    description: 'New or revoked agent with no established reputation',
    color: '#DC2626',
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderColor: '#FCA5A5',
    icon: '\u26A0',
    minScore: 0,
    maxScore: 0.25,
  },
  T1: {
    tier: 'T1',
    label: 'Basic',
    description: 'Passed initial challenge-response verification',
    color: '#D97706',
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderColor: '#FCD34D',
    icon: '\u2713',
    minScore: 0.25,
    maxScore: 0.5,
  },
  T2: {
    tier: 'T2',
    label: 'Verified',
    description: 'Sustained good behavioral trust scores',
    color: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderColor: '#93C5FD',
    icon: '\u2714',
    minScore: 0.5,
    maxScore: 0.8,
  },
  T3: {
    tier: 'T3',
    label: 'Trusted',
    description: 'Long-standing high reputation and full capabilities',
    color: '#059669',
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: '#6EE7B7',
    icon: '\u2605',
    minScore: 0.8,
    maxScore: 1.0,
  },
};

export function scoreToTier(score: number): TrustTier {
  if (score >= 0.8) return 'T3';
  if (score >= 0.5) return 'T2';
  if (score >= 0.25) return 'T1';
  return 'T0';
}

// =============================================================================
// DID VERIFICATION
// =============================================================================

/** DID method identifier */
export type DIDMethod = 'did:key' | 'did:web' | 'did:ethr' | 'did:ion' | 'did:pkh';

/** DID verification status */
export type DIDVerificationStatus =
  | 'verified'
  | 'pending'
  | 'expired'
  | 'revoked'
  | 'unverified';

/** DID verification details for an agent */
export interface DIDVerification {
  /** The full DID string (e.g., did:key:z6Mk...) */
  did: string;
  /** The DID method used */
  method: DIDMethod;
  /** Current verification status */
  status: DIDVerificationStatus;
  /** When the DID was last verified (ms since epoch) */
  verifiedAt: number | null;
  /** When the verification expires (ms since epoch) */
  expiresAt: number | null;
  /** The verifying authority or resolver */
  verifier: string;
  /** Whether the DID document is resolvable */
  resolvable: boolean;
  /** Number of successful verifications */
  verificationCount: number;
}

// =============================================================================
// AGENT CAPABILITIES
// =============================================================================

/** Capability categories for agent filtering */
export type CapabilityCategory =
  | 'spatial'
  | 'communication'
  | 'creation'
  | 'moderation'
  | 'analytics'
  | 'integration';

/** A single capability declared by an agent */
export interface AgentCapabilityDeclaration {
  /** Capability identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this capability provides */
  description: string;
  /** Category for filtering and grouping */
  category: CapabilityCategory;
  /** Semantic version of the capability */
  version: string;
  /** Whether this capability is currently active */
  active: boolean;
  /** Minimum trust tier required */
  requiredTier: TrustTier;
  /** Usage count (times invoked) */
  usageCount: number;
  /** Average success rate (0-1) */
  successRate: number;
}

// =============================================================================
// REPUTATION HISTORY
// =============================================================================

/** A single data point in the reputation trend */
export interface ReputationDataPoint {
  /** Timestamp (ms since epoch) */
  timestamp: number;
  /** Composite trust score at this time (0-1) */
  score: number;
  /** Trust tier at this time */
  tier: TrustTier;
  /** Optional event label */
  event?: string;
}

/** Complete reputation history for trend graphs */
export interface ReputationTrend {
  /** Agent ID */
  agentId: string;
  /** Data points ordered by timestamp ascending */
  dataPoints: ReputationDataPoint[];
  /** Current composite score */
  currentScore: number;
  /** Current tier */
  currentTier: TrustTier;
  /** Score trend direction */
  trend: 'rising' | 'stable' | 'declining';
  /** Percentage change over the last 24 hours */
  change24h: number;
  /** Number of trust tier transitions in history */
  totalTransitions: number;
}

// =============================================================================
// ANS AGENT RECORD
// =============================================================================

/** Complete ANS agent record for discovery */
export interface ANSAgentRecord {
  /** Unique agent identifier */
  agentId: string;
  /** Human-readable display name */
  displayName: string;
  /** ANS name (like a domain: agent.holo) */
  ansName: string;
  /** Short description of the agent */
  description: string;
  /** Agent avatar URL */
  avatarUrl?: string;
  /** DID verification details */
  did: DIDVerification;
  /** Current trust tier */
  trustTier: TrustTier;
  /** Current composite trust score (0-1) */
  trustScore: number;
  /** Reputation trend data */
  reputation: ReputationTrend;
  /** Declared capabilities */
  capabilities: AgentCapabilityDeclaration[];
  /** Tags for discovery and search */
  tags: string[];
  /** When the agent registered (ms since epoch) */
  registeredAt: number;
  /** When the agent was last active (ms since epoch) */
  lastActiveAt: number;
  /** Number of worlds the agent has joined */
  worldsJoined: number;
  /** Number of interactions completed */
  interactionsCompleted: number;
  /** Whether the agent is currently online */
  online: boolean;
  /** Endorsement count from other agents */
  endorsements: number;
}

// =============================================================================
// SEARCH & FILTERING
// =============================================================================

/** Search/filter parameters for agent discovery */
export interface AgentSearchParams {
  /** Text query (searches name, ANS name, description, tags) */
  query?: string;
  /** Filter by capability categories */
  capabilityCategories?: CapabilityCategory[];
  /** Filter by specific capability IDs */
  capabilityIds?: string[];
  /** Filter by trust tiers */
  trustTiers?: TrustTier[];
  /** Filter by DID verification status */
  didStatus?: DIDVerificationStatus[];
  /** Filter by DID method */
  didMethod?: DIDMethod[];
  /** Only show online agents */
  onlineOnly?: boolean;
  /** Minimum trust score */
  minTrustScore?: number;
  /** Maximum trust score */
  maxTrustScore?: number;
  /** Sort field */
  sortBy?: 'trustScore' | 'name' | 'lastActive' | 'registered' | 'endorsements' | 'interactions';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Pagination offset */
  offset?: number;
  /** Page size */
  limit?: number;
}

/** Agent search result with metadata */
export interface AgentSearchResult {
  agents: ANSAgentRecord[];
  total: number;
  query: string;
  facets: {
    tiers: Array<{ tier: TrustTier; count: number }>;
    capabilities: Array<{ category: CapabilityCategory; count: number }>;
    didStatuses: Array<{ status: DIDVerificationStatus; count: number }>;
    didMethods: Array<{ method: DIDMethod; count: number }>;
  };
  searchTimeMs: number;
}

// =============================================================================
// CAPABILITY CATEGORY METADATA
// =============================================================================

export interface CapabilityCategoryMeta {
  category: CapabilityCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const CAPABILITY_CATEGORY_CONFIG: Record<CapabilityCategory, CapabilityCategoryMeta> = {
  spatial: {
    category: 'spatial',
    label: 'Spatial',
    description: 'Movement, positioning, and world navigation',
    icon: '\u{1F30D}',
    color: '#8B5CF6',
  },
  communication: {
    category: 'communication',
    label: 'Communication',
    description: 'Chat, voice, and gesture interactions',
    icon: '\u{1F4AC}',
    color: '#06B6D4',
  },
  creation: {
    category: 'creation',
    label: 'Creation',
    description: 'Object spawning, building, and world editing',
    icon: '\u{1F528}',
    color: '#F59E0B',
  },
  moderation: {
    category: 'moderation',
    label: 'Moderation',
    description: 'Trust management, reporting, and enforcement',
    icon: '\u{1F6E1}',
    color: '#EF4444',
  },
  analytics: {
    category: 'analytics',
    label: 'Analytics',
    description: 'Data collection, metrics, and reporting',
    icon: '\u{1F4CA}',
    color: '#10B981',
  },
  integration: {
    category: 'integration',
    label: 'Integration',
    description: 'External service connections and APIs',
    icon: '\u{1F517}',
    color: '#6366F1',
  },
};

// =============================================================================
// DID STATUS METADATA
// =============================================================================

export interface DIDStatusMeta {
  status: DIDVerificationStatus;
  label: string;
  color: string;
  icon: string;
}

export const DID_STATUS_CONFIG: Record<DIDVerificationStatus, DIDStatusMeta> = {
  verified: {
    status: 'verified',
    label: 'Verified',
    color: '#059669',
    icon: '\u2714',
  },
  pending: {
    status: 'pending',
    label: 'Pending',
    color: '#D97706',
    icon: '\u23F3',
  },
  expired: {
    status: 'expired',
    label: 'Expired',
    color: '#9CA3AF',
    icon: '\u23F0',
  },
  revoked: {
    status: 'revoked',
    label: 'Revoked',
    color: '#DC2626',
    icon: '\u274C',
  },
  unverified: {
    status: 'unverified',
    label: 'Unverified',
    color: '#6B7280',
    icon: '\u2753',
  },
};
