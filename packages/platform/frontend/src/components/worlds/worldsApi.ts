/**
 * Worlds API Client
 *
 * Provides typed fetch wrappers for the WorldPublishingService backend:
 *   - World publishing pipeline (create, submit, approve, reject, publish, unpublish)
 *   - World directory browsing (list, filter, sort, paginate)
 *   - World search with autocomplete
 *   - World detail, versions, reviews
 *   - Featured worlds
 *
 * Follows the same pattern as marketplace/marketplaceApi.ts.
 *
 * @module worlds/worldsApi
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// ============================================================================
// Shared Types (mirror backend DTOs)
// ============================================================================

export type WorldStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'unpublished';
export type WorldVisibility = 'public' | 'unlisted' | 'private';
export type AgeRating = 'everyone' | 'teen' | 'mature';
export type TopCategory = 'games' | 'art' | 'education' | 'social' | 'enterprise';
export type WorldSortOption = 'popular' | 'trending' | 'newest' | 'top_rated' | 'most_players';

export interface WorldMetadata {
  title: string;
  description: string;
  tags: string[];
  category: TopCategory;
  subcategory?: string;
  maxCapacity: number;
  ageRating: AgeRating;
  visibility: WorldVisibility;
  thumbnailUrl?: string;
  screenshotUrls?: string[];
  previewVideoUrl?: string;
}

export interface WorldVersion {
  version: number;
  sceneId: string;
  metadata: WorldMetadata;
  publishedAt: number;
  publishedBy: string;
  changelog?: string;
  isLive: boolean;
}

export interface WorldReview {
  id: string;
  worldId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  rating: number;
  title: string;
  body: string;
  helpful: number;
  reported: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorldSummary {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl?: string;
  category: TopCategory;
  subcategory?: string;
  tags: string[];
  status: WorldStatus;
  visibility: WorldVisibility;
  ageRating: AgeRating;
  maxCapacity: number;
  avgRating: number;
  ratingCount: number;
  livePlayerCount: number;
  totalVisits: number;
  publishedAt?: number;
  currentVersion: number;
}

export interface WorldDetail extends WorldSummary {
  description: string;
  screenshotUrls: string[];
  previewVideoUrl?: string;
  versions: WorldVersion[];
  reviews: WorldReview[];
  totalBookmarks: number;
  engagementScore: number;
  createdAt: number;
  updatedAt: number;
}

export interface WorldFilters {
  category?: TopCategory;
  subcategory?: string;
  tags?: string[];
  ageRating?: AgeRating;
  minRating?: number;
  minPlayers?: number;
  maxPlayers?: number;
  visibility?: WorldVisibility;
  creatorId?: string;
  featured?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

export interface CreatorProfile {
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  bannerUrl?: string;
  verified: boolean;
  followerCount: number;
  totalViews: number;
  worldIds: string[];
  avgRating: number;
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
// World Publishing API
// ============================================================================

export const worldsAPI = {
  // -- Publishing Pipeline --

  createDraft: (sceneId: string, metadata: WorldMetadata) =>
    fetchJson<WorldSummary>(`${API_BASE}/worlds`, {
      method: 'POST',
      body: JSON.stringify({ sceneId, metadata }),
    }),

  submitForReview: (worldId: string) =>
    fetchJson<WorldSummary>(`${API_BASE}/worlds/${worldId}/submit`, {
      method: 'POST',
    }),

  approveWorld: (worldId: string) =>
    fetchJson<WorldSummary>(`${API_BASE}/worlds/${worldId}/approve`, {
      method: 'POST',
    }),

  rejectWorld: (worldId: string, reason: string) =>
    fetchJson<WorldSummary>(`${API_BASE}/worlds/${worldId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  publishWorld: (worldId: string) =>
    fetchJson<WorldSummary>(`${API_BASE}/worlds/${worldId}/publish`, {
      method: 'POST',
    }),

  unpublishWorld: (worldId: string) =>
    fetchJson<WorldSummary>(`${API_BASE}/worlds/${worldId}/unpublish`, {
      method: 'POST',
    }),

  // -- Metadata --

  updateMetadata: (worldId: string, updates: Partial<WorldMetadata>) =>
    fetchJson<WorldSummary>(`${API_BASE}/worlds/${worldId}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  setThumbnail: (worldId: string, thumbnailUrl: string) =>
    fetchJson<WorldSummary>(`${API_BASE}/worlds/${worldId}/thumbnail`, {
      method: 'PUT',
      body: JSON.stringify({ thumbnailUrl }),
    }),

  // -- Queries --

  getWorld: (worldId: string) =>
    fetchJson<WorldDetail>(`${API_BASE}/worlds/${worldId}`),

  listPublishedWorlds: (
    filters?: WorldFilters,
    sort?: WorldSortOption,
    page?: number,
    pageSize?: number,
  ) => {
    const qs = buildQueryString({
      category: filters?.category,
      subcategory: filters?.subcategory,
      tags: filters?.tags,
      ageRating: filters?.ageRating,
      minRating: filters?.minRating,
      minPlayers: filters?.minPlayers,
      maxPlayers: filters?.maxPlayers,
      featured: filters?.featured,
      sort: sort ?? 'popular',
      page: page ?? 1,
      pageSize: pageSize ?? 24,
    });
    return fetchJson<PaginatedResult<WorldSummary>>(`${API_BASE}/worlds${qs}`);
  },

  getFeaturedWorlds: (limit: number = 3) =>
    fetchJson<WorldSummary[]>(`${API_BASE}/worlds/featured?limit=${limit}`),

  getWorldsByCreator: (creatorId: string) =>
    fetchJson<WorldSummary[]>(`${API_BASE}/worlds/creator/${creatorId}`),

  getSimilarWorlds: (worldId: string, limit: number = 6) =>
    fetchJson<WorldSummary[]>(`${API_BASE}/worlds/${worldId}/similar?limit=${limit}`),

  // -- Versions --

  getWorldVersions: (worldId: string) =>
    fetchJson<WorldVersion[]>(`${API_BASE}/worlds/${worldId}/versions`),

  // -- Reviews --

  addReview: (worldId: string, rating: number, title: string, body: string) =>
    fetchJson<WorldReview>(`${API_BASE}/worlds/${worldId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, title, body }),
    }),

  markReviewHelpful: (worldId: string, reviewId: string) =>
    fetchJson<void>(`${API_BASE}/worlds/${worldId}/reviews/${reviewId}/helpful`, {
      method: 'POST',
    }),

  // -- Search --

  searchWorlds: (query: string, filters?: WorldFilters, limit?: number, offset?: number) => {
    const qs = buildQueryString({
      q: query,
      category: filters?.category,
      tags: filters?.tags,
      limit: limit ?? 20,
      offset: offset ?? 0,
    });
    return fetchJson<SearchResponse>(`${API_BASE}/worlds/search${qs}`);
  },

  getSearchSuggestions: (prefix: string, limit: number = 10) =>
    fetchJson<string[]>(`${API_BASE}/worlds/search/suggest?q=${encodeURIComponent(prefix)}&limit=${limit}`),

  // -- Creator --

  getCreatorProfile: (creatorId: string) =>
    fetchJson<CreatorProfile>(`${API_BASE}/creators/${creatorId}`),

  followCreator: (creatorId: string) =>
    fetchJson<void>(`${API_BASE}/creators/${creatorId}/follow`, { method: 'POST' }),

  unfollowCreator: (creatorId: string) =>
    fetchJson<void>(`${API_BASE}/creators/${creatorId}/unfollow`, { method: 'POST' }),

  // -- Player Count (for live badges) --

  getPlayerCount: (worldId: string) =>
    fetchJson<{ count: number }>(`${API_BASE}/worlds/${worldId}/players`),
};
