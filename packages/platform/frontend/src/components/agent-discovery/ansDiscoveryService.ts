/**
 * ANS Agent Discovery Service
 *
 * Client-side service for querying the Agent Naming Service (ANS) registry.
 * Provides search, filtering, and mock data generation for the discovery
 * dashboard during development.
 *
 * In production, these methods would proxy to the ANS backend API.
 * The mock data generator creates realistic agent records with correlated
 * trust scores, capabilities, and DID verification states.
 *
 * @module agent-discovery/ansDiscoveryService
 */

import type {
  ANSAgentRecord,
  AgentSearchParams,
  AgentSearchResult,
  AgentCapabilityDeclaration,
  CapabilityCategory,
  DIDMethod,
  DIDVerification,
  DIDVerificationStatus,
  ReputationDataPoint,
  ReputationTrend,
  TrustTier,
} from './ansTypes';
import { scoreToTier } from './ansTypes';

// =============================================================================
// MOCK DATA GENERATION
// =============================================================================

const AGENT_NAMES = [
  'Atlas Navigator', 'Nova Builder', 'Echo Sentinel', 'Prism Architect',
  'Cipher Guardian', 'Flux Composer', 'Aether Scout', 'Vortex Moderator',
  'Zenith Analyst', 'Pulse Integrator', 'Drift Explorer', 'Beacon Watcher',
  'Nexus Facilitator', 'Quartz Renderer', 'Ember Creator', 'Frost Observer',
  'Tide Coordinator', 'Spark Automator', 'Haze Translator', 'Bolt Responder',
  'Luna Curator', 'Coral Mediator', 'Sage Advisor', 'Storm Enforcer',
];

const ANS_SUFFIXES = ['.holo', '.agent', '.vr', '.world', '.meta'];

const CAPABILITY_TEMPLATES: Record<CapabilityCategory, Array<Omit<AgentCapabilityDeclaration, 'active' | 'usageCount' | 'successRate'>>> = {
  spatial: [
    { id: 'spatial.navigate', name: 'World Navigation', description: 'Navigate between zones and portals', category: 'spatial', version: '2.1.0', requiredTier: 'T0' },
    { id: 'spatial.teleport', name: 'Teleportation', description: 'Teleport to arbitrary coordinates', category: 'spatial', version: '1.4.0', requiredTier: 'T1' },
    { id: 'spatial.zone_create', name: 'Zone Creation', description: 'Create new spatial zones in worlds', category: 'spatial', version: '1.0.0', requiredTier: 'T2' },
    { id: 'spatial.pathfinding', name: 'Pathfinding', description: 'Compute optimal paths through world geometry', category: 'spatial', version: '3.0.1', requiredTier: 'T1' },
  ],
  communication: [
    { id: 'comm.chat', name: 'Text Chat', description: 'Send and receive text messages', category: 'communication', version: '1.0.0', requiredTier: 'T0' },
    { id: 'comm.voice', name: 'Voice Communication', description: 'Spatial voice communication', category: 'communication', version: '2.0.0', requiredTier: 'T1' },
    { id: 'comm.gesture', name: 'Gesture Expression', description: 'Avatar gesture and emotion control', category: 'communication', version: '1.2.0', requiredTier: 'T1' },
    { id: 'comm.broadcast', name: 'World Broadcast', description: 'Broadcast messages to all agents in world', category: 'communication', version: '1.0.0', requiredTier: 'T3' },
  ],
  creation: [
    { id: 'create.spawn', name: 'Object Spawning', description: 'Spawn objects and props in world', category: 'creation', version: '2.0.0', requiredTier: 'T1' },
    { id: 'create.build', name: 'Structure Building', description: 'Build persistent structures', category: 'creation', version: '1.5.0', requiredTier: 'T2' },
    { id: 'create.script', name: 'HoloScript Execution', description: 'Execute HoloScript programs in world', category: 'creation', version: '1.0.0', requiredTier: 'T2' },
    { id: 'create.terrain', name: 'Terrain Editing', description: 'Modify world terrain geometry', category: 'creation', version: '1.0.0', requiredTier: 'T3' },
  ],
  moderation: [
    { id: 'mod.report', name: 'Incident Reporting', description: 'File trust violation reports', category: 'moderation', version: '1.0.0', requiredTier: 'T1' },
    { id: 'mod.mute', name: 'Agent Muting', description: 'Temporarily mute disruptive agents', category: 'moderation', version: '1.0.0', requiredTier: 'T2' },
    { id: 'mod.kick', name: 'Agent Removal', description: 'Remove agents from world sessions', category: 'moderation', version: '1.0.0', requiredTier: 'T3' },
    { id: 'mod.ban', name: 'Agent Banning', description: 'Permanently ban agents from worlds', category: 'moderation', version: '1.0.0', requiredTier: 'T3' },
  ],
  analytics: [
    { id: 'analytics.read', name: 'Metrics Reading', description: 'Read world and agent metrics', category: 'analytics', version: '2.0.0', requiredTier: 'T0' },
    { id: 'analytics.track', name: 'Event Tracking', description: 'Track custom analytics events', category: 'analytics', version: '1.3.0', requiredTier: 'T1' },
    { id: 'analytics.dashboard', name: 'Dashboard Access', description: 'Access analytics dashboards', category: 'analytics', version: '1.0.0', requiredTier: 'T2' },
    { id: 'analytics.export', name: 'Data Export', description: 'Export analytics data for offline analysis', category: 'analytics', version: '1.0.0', requiredTier: 'T2' },
  ],
  integration: [
    { id: 'int.webhook', name: 'Webhook Listener', description: 'Receive external webhook events', category: 'integration', version: '1.1.0', requiredTier: 'T1' },
    { id: 'int.api_call', name: 'External API', description: 'Make authenticated external API calls', category: 'integration', version: '2.0.0', requiredTier: 'T2' },
    { id: 'int.mcp', name: 'MCP Bridge', description: 'Bridge to Model Context Protocol servers', category: 'integration', version: '1.0.0', requiredTier: 'T2' },
    { id: 'int.chain', name: 'Chain Interaction', description: 'Interact with blockchain smart contracts', category: 'integration', version: '1.0.0', requiredTier: 'T3' },
  ],
};

const DID_METHODS: DIDMethod[] = ['did:key', 'did:web', 'did:ethr', 'did:ion', 'did:pkh'];

const TAGS = [
  'social', 'gaming', 'education', 'art', 'music', 'ai-powered',
  'moderation', 'builder', 'explorer', 'commerce', 'analytics',
  'automation', 'utility', 'governance', 'content-creator',
];

// Seeded pseudo-random for reproducible mock data
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (state >>> 0) / 0xFFFFFFFF;
  };
}

function generateReputationTrend(
  agentId: string,
  currentScore: number,
  rand: () => number,
): ReputationTrend {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const pointCount = 30 + Math.floor(rand() * 60);
  const dataPoints: ReputationDataPoint[] = [];

  let score = Math.max(0.05, currentScore - 0.2 + rand() * 0.15);
  const events = ['Joined', 'Refresh', 'Promoted', 'Warning', 'Recovered', 'Endorsed'];

  for (let i = 0; i < pointCount; i++) {
    const timestamp = now - thirtyDaysMs + (thirtyDaysMs / pointCount) * i;
    // Random walk toward the current score
    const drift = (currentScore - score) * 0.08;
    const noise = (rand() - 0.5) * 0.06;
    score = Math.max(0, Math.min(1, score + drift + noise));

    const hasEvent = rand() < 0.12;

    dataPoints.push({
      timestamp,
      score,
      tier: scoreToTier(score),
      event: hasEvent ? events[Math.floor(rand() * events.length)] : undefined,
    });
  }

  // Ensure last point matches current score
  dataPoints.push({
    timestamp: now,
    score: currentScore,
    tier: scoreToTier(currentScore),
  });

  const recentPoints = dataPoints.slice(-10);
  const avgRecent = recentPoints.reduce((s, p) => s + p.score, 0) / recentPoints.length;
  const olderPoints = dataPoints.slice(-20, -10);
  const avgOlder = olderPoints.length > 0
    ? olderPoints.reduce((s, p) => s + p.score, 0) / olderPoints.length
    : avgRecent;

  const change24h = ((avgRecent - avgOlder) / (avgOlder || 1)) * 100;
  const trend: ReputationTrend['trend'] =
    change24h > 2 ? 'rising' : change24h < -2 ? 'declining' : 'stable';

  // Count tier transitions
  let totalTransitions = 0;
  for (let i = 1; i < dataPoints.length; i++) {
    if (dataPoints[i].tier !== dataPoints[i - 1].tier) totalTransitions++;
  }

  return {
    agentId,
    dataPoints,
    currentScore,
    currentTier: scoreToTier(currentScore),
    trend,
    change24h: Math.round(change24h * 100) / 100,
    totalTransitions,
  };
}

function generateDIDVerification(
  rand: () => number,
  trustScore: number,
): DIDVerification {
  const method = DID_METHODS[Math.floor(rand() * DID_METHODS.length)];
  const now = Date.now();

  // Higher trust scores are more likely to have verified DIDs
  let status: DIDVerificationStatus;
  const roll = rand();
  if (trustScore >= 0.8) {
    status = roll < 0.9 ? 'verified' : 'pending';
  } else if (trustScore >= 0.5) {
    status = roll < 0.6 ? 'verified' : roll < 0.85 ? 'pending' : 'expired';
  } else if (trustScore >= 0.25) {
    status = roll < 0.3 ? 'verified' : roll < 0.6 ? 'pending' : roll < 0.8 ? 'unverified' : 'expired';
  } else {
    status = roll < 0.1 ? 'pending' : roll < 0.4 ? 'unverified' : roll < 0.7 ? 'expired' : 'revoked';
  }

  // Generate a plausible DID string
  const keyBytes = Array.from({ length: 16 }, () =>
    Math.floor(rand() * 256).toString(16).padStart(2, '0'),
  ).join('');

  let did: string;
  switch (method) {
    case 'did:key':
      did = `did:key:z6Mk${keyBytes.slice(0, 22)}`;
      break;
    case 'did:web':
      did = `did:web:agents.hololand.xyz:${keyBytes.slice(0, 12)}`;
      break;
    case 'did:ethr':
      did = `did:ethr:0x${keyBytes.slice(0, 20)}`;
      break;
    case 'did:ion':
      did = `did:ion:${keyBytes.slice(0, 24)}`;
      break;
    case 'did:pkh':
      did = `did:pkh:eip155:1:0x${keyBytes.slice(0, 20)}`;
      break;
    default:
      did = `did:key:z6Mk${keyBytes.slice(0, 22)}`;
  }

  const verifiedAt = status === 'verified' ? now - Math.floor(rand() * 7 * 24 * 60 * 60 * 1000) : null;
  const expiresAt = status === 'verified'
    ? now + Math.floor(rand() * 30 * 24 * 60 * 60 * 1000)
    : status === 'expired'
      ? now - Math.floor(rand() * 7 * 24 * 60 * 60 * 1000)
      : null;

  return {
    did,
    method,
    status,
    verifiedAt,
    expiresAt,
    verifier: status === 'verified' ? 'ANS Registry v2' : 'Unresolved',
    resolvable: status === 'verified' || status === 'pending',
    verificationCount: status === 'verified' ? 1 + Math.floor(rand() * 20) : 0,
  };
}

function generateCapabilities(
  rand: () => number,
  trustTier: TrustTier,
): AgentCapabilityDeclaration[] {
  const tierIndex = ['T0', 'T1', 'T2', 'T3'].indexOf(trustTier);
  const capabilities: AgentCapabilityDeclaration[] = [];
  const categories = Object.keys(CAPABILITY_TEMPLATES) as CapabilityCategory[];

  // Select 2-4 categories
  const numCategories = 2 + Math.floor(rand() * 3);
  const selectedCategories = categories
    .sort(() => rand() - 0.5)
    .slice(0, numCategories);

  for (const category of selectedCategories) {
    const templates = CAPABILITY_TEMPLATES[category];
    // Add 1-3 capabilities from each selected category
    const numCaps = 1 + Math.floor(rand() * Math.min(3, templates.length));
    const selectedTemplates = templates
      .sort(() => rand() - 0.5)
      .slice(0, numCaps);

    for (const template of selectedTemplates) {
      const requiredTierIndex = ['T0', 'T1', 'T2', 'T3'].indexOf(template.requiredTier);
      const active = tierIndex >= requiredTierIndex;
      capabilities.push({
        ...template,
        active,
        usageCount: active ? Math.floor(rand() * 5000) : 0,
        successRate: active ? 0.85 + rand() * 0.15 : 0,
      });
    }
  }

  return capabilities;
}

function generateMockAgents(count: number): ANSAgentRecord[] {
  const agents: ANSAgentRecord[] = [];
  const rand = seededRandom(42);
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const name = AGENT_NAMES[i % AGENT_NAMES.length] + (i >= AGENT_NAMES.length ? ` ${Math.floor(i / AGENT_NAMES.length) + 1}` : '');
    const ansSlug = name.toLowerCase().replace(/\s+/g, '-');
    const suffix = ANS_SUFFIXES[Math.floor(rand() * ANS_SUFFIXES.length)];

    // Distribute trust scores with a slight bias toward middle tiers
    const trustScore = Math.round((rand() * 0.3 + rand() * 0.3 + rand() * 0.4) * 100) / 100;
    const trustTier = scoreToTier(trustScore);

    const registeredAt = now - Math.floor(rand() * 365 * 24 * 60 * 60 * 1000);
    const lastActiveAt = now - Math.floor(rand() * 7 * 24 * 60 * 60 * 1000);

    const numTags = 2 + Math.floor(rand() * 4);
    const selectedTags = TAGS.sort(() => rand() - 0.5).slice(0, numTags);

    agents.push({
      agentId: `agent-${i.toString(36).padStart(4, '0')}`,
      displayName: name,
      ansName: `${ansSlug}${suffix}`,
      description: `${name} is a ${trustTier === 'T3' ? 'highly trusted' : trustTier === 'T2' ? 'verified' : trustTier === 'T1' ? 'basic' : 'new'} agent specializing in ${selectedTags.slice(0, 2).join(' and ')}.`,
      avatarUrl: undefined,
      did: generateDIDVerification(rand, trustScore),
      trustTier,
      trustScore,
      reputation: generateReputationTrend(`agent-${i.toString(36).padStart(4, '0')}`, trustScore, rand),
      capabilities: generateCapabilities(rand, trustTier),
      tags: selectedTags,
      registeredAt,
      lastActiveAt,
      worldsJoined: Math.floor(rand() * 50),
      interactionsCompleted: Math.floor(rand() * 10000),
      online: rand() < 0.35,
      endorsements: Math.floor(rand() * 200),
    });
  }

  return agents;
}

// =============================================================================
// SERVICE
// =============================================================================

let cachedAgents: ANSAgentRecord[] | null = null;

function getMockAgents(): ANSAgentRecord[] {
  if (!cachedAgents) {
    cachedAgents = generateMockAgents(48);
  }
  return cachedAgents;
}

/**
 * Search and filter agents from the ANS registry.
 * In development, uses mock data. In production, would call the ANS API.
 */
export async function searchAgents(params: AgentSearchParams): Promise<AgentSearchResult> {
  const startTime = performance.now();
  const allAgents = getMockAgents();
  let filtered = [...allAgents];

  // Text search
  if (params.query) {
    const q = params.query.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.displayName.toLowerCase().includes(q) ||
        a.ansName.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        a.capabilities.some((c) => c.name.toLowerCase().includes(q)),
    );
  }

  // Trust tier filter
  if (params.trustTiers && params.trustTiers.length > 0) {
    const tierSet = new Set(params.trustTiers);
    filtered = filtered.filter((a) => tierSet.has(a.trustTier));
  }

  // Trust score range
  if (params.minTrustScore !== undefined) {
    filtered = filtered.filter((a) => a.trustScore >= params.minTrustScore!);
  }
  if (params.maxTrustScore !== undefined) {
    filtered = filtered.filter((a) => a.trustScore <= params.maxTrustScore!);
  }

  // Capability category filter
  if (params.capabilityCategories && params.capabilityCategories.length > 0) {
    const catSet = new Set(params.capabilityCategories);
    filtered = filtered.filter((a) =>
      a.capabilities.some((c) => catSet.has(c.category)),
    );
  }

  // Specific capability filter
  if (params.capabilityIds && params.capabilityIds.length > 0) {
    const capSet = new Set(params.capabilityIds);
    filtered = filtered.filter((a) =>
      a.capabilities.some((c) => capSet.has(c.id)),
    );
  }

  // DID status filter
  if (params.didStatus && params.didStatus.length > 0) {
    const statusSet = new Set(params.didStatus);
    filtered = filtered.filter((a) => statusSet.has(a.did.status));
  }

  // DID method filter
  if (params.didMethod && params.didMethod.length > 0) {
    const methodSet = new Set(params.didMethod);
    filtered = filtered.filter((a) => methodSet.has(a.did.method));
  }

  // Online only
  if (params.onlineOnly) {
    filtered = filtered.filter((a) => a.online);
  }

  // Sorting
  const sortBy = params.sortBy ?? 'trustScore';
  const sortDir = params.sortDirection ?? 'desc';
  const multiplier = sortDir === 'desc' ? -1 : 1;

  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'trustScore':
        return (a.trustScore - b.trustScore) * multiplier;
      case 'name':
        return a.displayName.localeCompare(b.displayName) * multiplier;
      case 'lastActive':
        return (a.lastActiveAt - b.lastActiveAt) * multiplier;
      case 'registered':
        return (a.registeredAt - b.registeredAt) * multiplier;
      case 'endorsements':
        return (a.endorsements - b.endorsements) * multiplier;
      case 'interactions':
        return (a.interactionsCompleted - b.interactionsCompleted) * multiplier;
      default:
        return 0;
    }
  });

  // Compute facets from filtered results
  const tierCounts = new Map<TrustTier, number>();
  const capCounts = new Map<CapabilityCategory, number>();
  const didStatusCounts = new Map<DIDVerificationStatus, number>();
  const didMethodCounts = new Map<DIDMethod, number>();

  for (const agent of filtered) {
    tierCounts.set(agent.trustTier, (tierCounts.get(agent.trustTier) ?? 0) + 1);
    didStatusCounts.set(agent.did.status, (didStatusCounts.get(agent.did.status) ?? 0) + 1);
    didMethodCounts.set(agent.did.method, (didMethodCounts.get(agent.did.method) ?? 0) + 1);
    const capCategories = new Set(agent.capabilities.map((c) => c.category));
    for (const cat of capCategories) {
      capCounts.set(cat, (capCounts.get(cat) ?? 0) + 1);
    }
  }

  const total = filtered.length;

  // Pagination
  const offset = params.offset ?? 0;
  const limit = params.limit ?? 20;
  filtered = filtered.slice(offset, offset + limit);

  return {
    agents: filtered,
    total,
    query: params.query ?? '',
    facets: {
      tiers: Array.from(tierCounts.entries()).map(([tier, count]) => ({ tier, count })),
      capabilities: Array.from(capCounts.entries()).map(([category, count]) => ({ category, count })),
      didStatuses: Array.from(didStatusCounts.entries()).map(([status, count]) => ({ status, count })),
      didMethods: Array.from(didMethodCounts.entries()).map(([method, count]) => ({ method, count })),
    },
    searchTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
  };
}

/**
 * Get a single agent by ID.
 */
export async function getAgentById(agentId: string): Promise<ANSAgentRecord | null> {
  const allAgents = getMockAgents();
  return allAgents.find((a) => a.agentId === agentId) ?? null;
}

/**
 * Get all unique capability declarations across all agents.
 */
export async function getAllCapabilities(): Promise<AgentCapabilityDeclaration[]> {
  const allAgents = getMockAgents();
  const capMap = new Map<string, AgentCapabilityDeclaration>();

  for (const agent of allAgents) {
    for (const cap of agent.capabilities) {
      if (!capMap.has(cap.id)) {
        capMap.set(cap.id, cap);
      }
    }
  }

  return Array.from(capMap.values()).sort((a, b) => a.category.localeCompare(b.category));
}
