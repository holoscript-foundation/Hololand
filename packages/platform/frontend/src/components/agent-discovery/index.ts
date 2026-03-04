/**
 * ANS Agent Discovery Component Library
 *
 * React components for discovering and verifying agents in the
 * Agent Naming Service (ANS) registry. Integrates with the uAA2++
 * trust tier model (T0-T3) and provides search, filtering, and
 * visualization capabilities.
 *
 * Components:
 * - AgentDiscoveryDashboard: Main dashboard page with search, filters, and grid
 * - AgentCard:               Individual agent summary card
 * - CapabilitySearch:        Capability category and individual search/filter
 * - DIDVerificationBadge:    DID verification status indicator
 * - ReputationTrendGraph:    SVG sparkline/chart for trust score trends
 * - TrustTierFilter:         Trust tier toggle filter with counts
 *
 * @module agent-discovery
 */

// Types
export type {
  TrustTier,
  TrustTierMeta,
  DIDMethod,
  DIDVerificationStatus,
  DIDVerification,
  CapabilityCategory,
  AgentCapabilityDeclaration,
  ReputationDataPoint,
  ReputationTrend,
  ANSAgentRecord,
  AgentSearchParams,
  AgentSearchResult,
  CapabilityCategoryMeta,
  DIDStatusMeta,
} from './ansTypes';

export {
  TRUST_TIER_CONFIG,
  CAPABILITY_CATEGORY_CONFIG,
  DID_STATUS_CONFIG,
  scoreToTier,
} from './ansTypes';

// Service
export { searchAgents, getAgentById, getAllCapabilities } from './ansDiscoveryService';

// Components
export { AgentDiscoveryDashboard } from './AgentDiscoveryDashboard';
export type { AgentDiscoveryDashboardProps } from './AgentDiscoveryDashboard';

export { AgentCard } from './AgentCard';
export type { AgentCardProps } from './AgentCard';

export { CapabilitySearch } from './CapabilitySearch';
export type { CapabilitySearchProps } from './CapabilitySearch';

export { DIDVerificationBadge } from './DIDVerificationBadge';
export type { DIDVerificationBadgeProps } from './DIDVerificationBadge';

export { ReputationTrendGraph } from './ReputationTrendGraph';
export type { ReputationTrendGraphProps } from './ReputationTrendGraph';

export { TrustTierFilter } from './TrustTierFilter';
export type { TrustTierFilterProps } from './TrustTierFilter';
