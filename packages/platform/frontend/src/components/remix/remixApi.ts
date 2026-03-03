/**
 * Remix API Client
 *
 * Provides typed fetch wrappers for the RemixService backend:
 *   - Instant remix (one-click fork) for worlds and assets
 *   - Attribution chain queries
 *   - Remix tree / genealogy
 *   - Viral metrics dashboard data
 *   - Revenue distribution queries
 *
 * Mirrors the backend RemixService types for type safety.
 * Follows the same pattern as marketplace/marketplaceApi.ts.
 *
 * @module remix/remixApi
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// ============================================================================
// Types (mirror backend RemixService DTOs)
// ============================================================================

export interface AttributionNode {
  worldId: string;
  creatorId: string;
  creatorName: string;
  title: string;
  generation: number;
  revenueSharePercent: number;
  createdAt: number;
}

export interface RemixInfo {
  id: string;
  sourceWorldId: string;
  remixWorldId: string;
  remixerId: string;
  originalCreatorId: string;
  title: string;
  description: string;
  generation: number;
  chainLength: number;
  published: boolean;
  createdAt: number;
  publishedAt: number | null;
}

export interface RemixTree {
  worldId: string;
  creatorId: string;
  creatorName: string;
  title: string;
  generation: number;
  remixCount: number;
  totalDescendants: number;
  totalViews: number;
  revenueGenerated: number;
  children: RemixTree[];
}

export interface ViralMetrics {
  totalRemixes: number;
  totalRemixedWorlds: number;
  totalRemixWorlds: number;
  avgRemixesPerWorld: number;
  viralCoefficient: number;
  conversionRate: number;
  maxChainDepth: number;
  avgChainDepth: number;
  totalRemixRevenue: number;
  topRemixedWorlds: Array<{
    worldId: string;
    creatorId: string;
    creatorName: string;
    title: string;
    directRemixes: number;
    totalDescendants: number;
    totalViews: number;
    revenueGenerated: number;
  }>;
  dailyRemixRate: number;
  calculatedAt: number;
}

export interface RevenueDistribution {
  remixWorldId: string;
  totalRevenue: number;
  distributions: Array<{
    creatorId: string;
    creatorName: string;
    worldId: string;
    worldTitle: string;
    generation: number;
    sharePercent: number;
    amount: number;
  }>;
}

export interface RemixDiffSummary {
  filesAdded: number;
  filesModified: number;
  filesRemoved: number;
  modifications: string[];
}

export interface WorldRemixStats {
  isRemix: boolean;
  sourceWorldId: string | null;
  generation: number;
  directRemixCount: number;
  totalDescendants: number;
  visitors: number;
  remixers: number;
  conversionRate: number;
}

export interface RemixTimeSeriesPoint {
  date: string;
  count: number;
}

export interface ForkSceneRequest {
  sourceWorldId: string;
  title: string;
  description?: string;
}

export interface ForkAssetRequest {
  sourceAssetId: string;
  title: string;
  description?: string;
}

export interface ForkResponse {
  remixWorldId: string;
  remixInfo: RemixInfo;
  redirectUrl: string;
}

// ============================================================================
// API Client
// ============================================================================

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

// ============================================================================
// Remix API
// ============================================================================

export const remixAPI = {
  /** One-click fork a published world (scene) */
  forkScene: (req: ForkSceneRequest): Promise<ForkResponse> =>
    apiFetch('/remix/fork-scene', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  /** One-click fork a published asset */
  forkAsset: (req: ForkAssetRequest): Promise<ForkResponse> =>
    apiFetch('/remix/fork-asset', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  /** Get remix info for a world */
  getRemixInfo: (worldId: string): Promise<RemixInfo | null> =>
    apiFetch(`/remix/info/${worldId}`),

  /** Get full attribution chain for a remix world */
  getAttributionChain: (worldId: string): Promise<AttributionNode[]> =>
    apiFetch(`/remix/chain/${worldId}`),

  /** Get remix genealogy tree starting from a root world */
  getRemixTree: (worldId: string): Promise<RemixTree> =>
    apiFetch(`/remix/tree/${worldId}`),

  /** Get remix stats for a specific world */
  getWorldRemixStats: (worldId: string): Promise<WorldRemixStats> =>
    apiFetch(`/remix/stats/${worldId}`),

  /** Get viral metrics dashboard data */
  getViralMetrics: (): Promise<ViralMetrics> =>
    apiFetch('/remix/metrics'),

  /** Get remix count over time */
  getRemixTimeSeries: (days?: number): Promise<RemixTimeSeriesPoint[]> =>
    apiFetch(`/remix/timeseries${days ? `?days=${days}` : ''}`),

  /** Get revenue distribution for a remix world */
  getRevenueDistribution: (worldId: string): Promise<RevenueDistribution> =>
    apiFetch(`/remix/revenue/${worldId}`),

  /** Get diff summary between remix and its source */
  getDiffSummary: (remixWorldId: string): Promise<RemixDiffSummary> =>
    apiFetch(`/remix/diff/${remixWorldId}`),

  /** Get direct remixes of a world */
  getDirectRemixes: (worldId: string): Promise<RemixInfo[]> =>
    apiFetch(`/remix/children/${worldId}`),
};
