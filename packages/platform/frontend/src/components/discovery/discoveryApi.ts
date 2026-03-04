/**
 * Discovery API Client
 *
 * Typed fetch wrappers for the Discovery system backend:
 *   - SceneRankingService feeds (trending, hot, new, rising, for_you/top_all_time)
 *   - CurationService search, autocomplete, taxonomy, creator profiles
 *   - Editorial collections CRUD (featured, staff picks, seasonal)
 *
 * Follows the same pattern as worlds/worldsApi.ts and marketplace/marketplaceApi.ts.
 *
 * @module discovery/discoveryApi
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// ============================================================================
// Types -- Feed & Ranking (mirrors SceneRankingService DTOs)
// ============================================================================

export type FeedType = 'trending' | 'hot' | 'new' | 'rising' | 'for_you';

export interface RankedWorld {
  worldId: string;
  rank: number;
  engagementScore: number;
  velocity: number;
  totalVisits: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  totalRemixes: number;
  avgRating: number;
  ratingCount: number;
  bookmarks: number;
  publishedAt: number;
  // Enriched fields from world data (joined on backend)
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  creatorId?: string;
  creatorName?: string;
  creatorAvatarUrl?: string;
  category?: string;
  tags?: string[];
  livePlayerCount?: number;
}

export interface FeedResult {
  scenes: RankedWorld[];
  total: number;
  feedType: FeedType;
  timeWindow: string;
  generatedAt: number;
}

// ============================================================================
// Types -- Category Taxonomy (mirrors CurationService DTOs)
// ============================================================================

export type TopCategory = 'games' | 'art' | 'education' | 'social' | 'enterprise';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parent: string | null;
  description: string;
  iconUrl?: string;
  worldCount: number;
  sortOrder: number;
  featured: boolean;
}

export interface CategoryTree {
  category: CategoryNode;
  children: CategoryTree[];
}

// ============================================================================
// Types -- Search (mirrors CurationService DTOs)
// ============================================================================

export interface SearchQuery {
  query?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  creatorId?: string;
  minRating?: number;
  minEngagement?: number;
  sort?: 'relevance' | 'newest' | 'popular' | 'rating';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  worldId: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  tags: string[];
  categoryId: string;
  relevanceScore: number;
  engagementScore: number;
  publishedAt: number;
  // Enriched fields
  thumbnailUrl?: string;
  creatorAvatarUrl?: string;
  avgRating?: number;
  ratingCount?: number;
  totalVisits?: number;
  livePlayerCount?: number;
  totalRemixes?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  facets: {
    categories: Array<{ id: string; name: string; count: number }>;
    tags: Array<{ tag: string; count: number }>;
  };
  limit: number;
  offset: number;
  searchTimeMs: number;
}

// ============================================================================
// Types -- Collections (mirrors CurationService DTOs)
// ============================================================================

export type CollectionType = 'featured' | 'staff_picks' | 'seasonal' | 'themed' | 'spotlight' | 'custom';

export interface CollectionInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: CollectionType;
  coverImageUrl?: string;
  curatorId: string;
  curatorName?: string;
  curatorAvatarUrl?: string;
  worldCount: number;
  tags: string[];
  published: boolean;
  featured: boolean;
  startDate: number | null;
  endDate: number | null;
  viewCount: number;
  createdAt: number;
}

export interface CollectionDetail extends CollectionInfo {
  worlds: Array<{
    worldId: string;
    title: string;
    description: string;
    thumbnailUrl?: string;
    creatorId: string;
    creatorName: string;
    creatorAvatarUrl?: string;
    category: string;
    tags: string[];
    avgRating: number;
    ratingCount: number;
    totalVisits: number;
    livePlayerCount: number;
    totalRemixes: number;
    publishedAt: number;
    curatorNote?: string;
  }>;
}

// ============================================================================
// Types -- Creator Profiles (mirrors CurationService DTOs)
// ============================================================================

export interface CreatorBadge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  awardedAt: number;
}

export interface CreatorProfile {
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  bannerUrl?: string;
  websiteUrl?: string;
  socialLinks: Record<string, string>;
  verified: boolean;
  followerCount: number;
  followingCount: number;
  totalViews: number;
  totalRemixes: number;
  totalEarnings: number;
  avgRating: number;
  badges: CreatorBadge[];
  joinedAt: number;
  lastActiveAt: number;
  featured: boolean;
  worldIds: string[];
}

export interface CreatorWorld {
  worldId: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  categoryId: string;
  tags: string[];
  engagementScore: number;
  totalVisits: number;
  avgRating: number;
  ratingCount: number;
  remixCount: number;
  livePlayerCount: number;
  publishedAt: number;
}

export interface CreatorAsset {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  category: string;
  priceCents: number;
  downloadCount: number;
  rating: number;
  createdAt: number;
}

export interface CreatorActivity {
  id: string;
  type: 'world_published' | 'world_updated' | 'asset_listed' | 'badge_earned' | 'remix_created' | 'collection_curated';
  description: string;
  targetId?: string;
  targetTitle?: string;
  timestamp: number;
}

export interface CreatorPortfolio {
  profile: CreatorProfile;
  worlds: CreatorWorld[];
  assets: CreatorAsset[];
  activities: CreatorActivity[];
  collections: CollectionInfo[];
  stats: {
    totalWorlds: number;
    publishedWorlds: number;
    totalVisits: number;
    totalRemixes: number;
    avgEngagementScore: number;
    topWorldId: string | null;
  };
  remixTree: RemixNode[];
}

export interface RemixNode {
  worldId: string;
  title: string;
  thumbnailUrl?: string;
  children: RemixNode[];
  depth: number;
}

// ============================================================================
// API Helpers
// ============================================================================

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API Error ${res.status}: ${text}`);
  }

  return res.json();
}

function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}=${v.map(encodeURIComponent).join(',')}`;
      return `${k}=${encodeURIComponent(String(v))}`;
    });
  return entries.length > 0 ? `?${entries.join('&')}` : '';
}

// ============================================================================
// Discovery API
// ============================================================================

export const discoveryAPI = {
  // --------------------------------------------------------------------------
  // Feeds (SceneRankingService)
  // --------------------------------------------------------------------------

  /** Get a ranked feed by type. Maps to SceneRankingService.getFeed(). */
  getFeed: (feedType: FeedType, limit: number = 20, offset: number = 0) => {
    const qs = buildQueryString({ type: feedType, limit, offset });
    return fetchJson<FeedResult>(`${API_BASE}/discovery/feed${qs}`);
  },

  /** Get trending feed. Shorthand for getFeed('trending'). */
  getTrending: (limit: number = 20, offset: number = 0) =>
    fetchJson<FeedResult>(`${API_BASE}/discovery/feed?type=trending&limit=${limit}&offset=${offset}`),

  /** Get popular/hot feed. */
  getPopular: (limit: number = 20, offset: number = 0) =>
    fetchJson<FeedResult>(`${API_BASE}/discovery/feed?type=hot&limit=${limit}&offset=${offset}`),

  /** Get new worlds feed. */
  getNew: (limit: number = 20, offset: number = 0) =>
    fetchJson<FeedResult>(`${API_BASE}/discovery/feed?type=new&limit=${limit}&offset=${offset}`),

  /** Get rising worlds feed. */
  getRising: (limit: number = 20, offset: number = 0) =>
    fetchJson<FeedResult>(`${API_BASE}/discovery/feed?type=rising&limit=${limit}&offset=${offset}`),

  /** Get personalized "For You" feed. */
  getForYou: (limit: number = 20, offset: number = 0) =>
    fetchJson<FeedResult>(`${API_BASE}/discovery/feed?type=for_you&limit=${limit}&offset=${offset}`),

  // --------------------------------------------------------------------------
  // Search (CurationService)
  // --------------------------------------------------------------------------

  /** Full-text + semantic search. */
  search: (query: SearchQuery) => {
    const qs = buildQueryString({
      q: query.query,
      category: query.category,
      subcategory: query.subcategory,
      tags: query.tags,
      creatorId: query.creatorId,
      minRating: query.minRating,
      minEngagement: query.minEngagement,
      sort: query.sort ?? 'relevance',
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    });
    return fetchJson<SearchResponse>(`${API_BASE}/discovery/search${qs}`);
  },

  /** Get autocomplete suggestions for partial query. */
  autocomplete: (prefix: string, limit: number = 10) =>
    fetchJson<string[]>(
      `${API_BASE}/discovery/search/autocomplete?q=${encodeURIComponent(prefix)}&limit=${limit}`,
    ),

  /** Get similar worlds to a given world. */
  getSimilarWorlds: (worldId: string, limit: number = 10) =>
    fetchJson<SearchResult[]>(
      `${API_BASE}/discovery/worlds/${worldId}/similar?limit=${limit}`,
    ),

  // --------------------------------------------------------------------------
  // Taxonomy (CurationService)
  // --------------------------------------------------------------------------

  /** Get the full category tree (top categories with subcategories). */
  getCategoryTree: () =>
    fetchJson<CategoryTree[]>(`${API_BASE}/discovery/categories`),

  /** Get top-level categories. */
  getTopCategories: () =>
    fetchJson<CategoryNode[]>(`${API_BASE}/discovery/categories/top`),

  /** Get subcategories for a parent category. */
  getSubcategories: (parentId: string) =>
    fetchJson<CategoryNode[]>(`${API_BASE}/discovery/categories/${parentId}/subcategories`),

  /** Get worlds by category. */
  getWorldsByCategory: (categoryId: string, limit: number = 50, offset: number = 0) => {
    const qs = buildQueryString({ limit, offset });
    return fetchJson<string[]>(`${API_BASE}/discovery/categories/${categoryId}/worlds${qs}`);
  },

  /** Get all tags with usage counts. */
  getAllTags: (limit: number = 100) =>
    fetchJson<Array<{ tag: string; count: number }>>(
      `${API_BASE}/discovery/tags?limit=${limit}`,
    ),

  // --------------------------------------------------------------------------
  // Collections (CurationService)
  // --------------------------------------------------------------------------

  /** Get featured collections for the hero banner. */
  getFeaturedCollections: (limit: number = 10) =>
    fetchJson<CollectionInfo[]>(`${API_BASE}/discovery/collections/featured?limit=${limit}`),

  /** Get staff picks collections. */
  getStaffPicks: (limit: number = 10) =>
    fetchJson<CollectionInfo[]>(`${API_BASE}/discovery/collections/staff-picks?limit=${limit}`),

  /** Get seasonal/event collections. */
  getSeasonalEvents: (activeOnly: boolean = true) =>
    fetchJson<CollectionInfo[]>(
      `${API_BASE}/discovery/collections/seasonal?activeOnly=${activeOnly}`,
    ),

  /** Get collections by type. */
  getCollectionsByType: (type: CollectionType, limit: number = 20) =>
    fetchJson<CollectionInfo[]>(
      `${API_BASE}/discovery/collections?type=${type}&limit=${limit}`,
    ),

  /** List all collections with filtering. */
  listCollections: (opts: {
    published?: boolean;
    type?: CollectionType;
    curatorId?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    const qs = buildQueryString(opts);
    return fetchJson<{ collections: CollectionInfo[]; total: number }>(
      `${API_BASE}/discovery/collections${qs}`,
    );
  },

  /** Get a single collection with full world details. */
  getCollection: (collectionId: string) =>
    fetchJson<CollectionDetail>(`${API_BASE}/discovery/collections/${collectionId}`),

  /** Follow a collection for updates. */
  followCollection: (collectionId: string) =>
    fetchJson<void>(`${API_BASE}/discovery/collections/${collectionId}/follow`, {
      method: 'POST',
    }),

  /** Unfollow a collection. */
  unfollowCollection: (collectionId: string) =>
    fetchJson<void>(`${API_BASE}/discovery/collections/${collectionId}/unfollow`, {
      method: 'POST',
    }),

  // --------------------------------------------------------------------------
  // Creator Profiles (CurationService)
  // --------------------------------------------------------------------------

  /** Get a creator's public profile. */
  getCreatorProfile: (userId: string) =>
    fetchJson<CreatorProfile>(`${API_BASE}/discovery/creators/${userId}`),

  /** Get a creator's full portfolio (profile + worlds + assets + activity). */
  getCreatorPortfolio: (userId: string) =>
    fetchJson<CreatorPortfolio>(`${API_BASE}/discovery/creators/${userId}/portfolio`),

  /** Get a creator's published worlds. */
  getCreatorWorlds: (userId: string, limit: number = 20, offset: number = 0) => {
    const qs = buildQueryString({ limit, offset });
    return fetchJson<CreatorWorld[]>(`${API_BASE}/discovery/creators/${userId}/worlds${qs}`);
  },

  /** Get a creator's marketplace assets. */
  getCreatorAssets: (userId: string, limit: number = 20, offset: number = 0) => {
    const qs = buildQueryString({ limit, offset });
    return fetchJson<CreatorAsset[]>(`${API_BASE}/discovery/creators/${userId}/assets${qs}`);
  },

  /** Get a creator's recent activity. */
  getCreatorActivity: (userId: string, limit: number = 20, offset: number = 0) => {
    const qs = buildQueryString({ limit, offset });
    return fetchJson<CreatorActivity[]>(
      `${API_BASE}/discovery/creators/${userId}/activity${qs}`,
    );
  },

  /** Get a creator's remix contribution tree. */
  getRemixTree: (userId: string) =>
    fetchJson<RemixNode[]>(`${API_BASE}/discovery/creators/${userId}/remix-tree`),

  /** Follow a creator. */
  followCreator: (userId: string) =>
    fetchJson<void>(`${API_BASE}/discovery/creators/${userId}/follow`, {
      method: 'POST',
    }),

  /** Unfollow a creator. */
  unfollowCreator: (userId: string) =>
    fetchJson<void>(`${API_BASE}/discovery/creators/${userId}/unfollow`, {
      method: 'POST',
    }),

  /** Search creators by name/bio. */
  searchCreators: (query: string, limit: number = 10) =>
    fetchJson<CreatorProfile[]>(
      `${API_BASE}/discovery/creators/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    ),

  /** Get featured creators. */
  getFeaturedCreators: (limit: number = 10) =>
    fetchJson<CreatorProfile[]>(`${API_BASE}/discovery/creators/featured?limit=${limit}`),

  /** Get top creators by total views. */
  getTopCreators: (limit: number = 10) =>
    fetchJson<CreatorProfile[]>(`${API_BASE}/discovery/creators/top?limit=${limit}`),
};
