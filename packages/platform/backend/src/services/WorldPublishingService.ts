/**
 * @hololand/backend -- WorldPublishingService
 *
 * Complete world publishing pipeline with state machine lifecycle management,
 * versioning system, metadata management, and moderation workflow.
 *
 * Publish Flow State Machine:
 *   draft --> pending_review --> published
 *                |                  |
 *             rejected          unpublished
 *
 * Versioning:
 *   Each publish creates a new version. Previous versions remain accessible.
 *   Only one version can be "live" at a time per world.
 *
 * Integration Points:
 *   - SceneRankingService: Registers/unregisters worlds for engagement scoring
 *   - CurationService: Indexes published worlds for search, categorization, creator profiles
 *
 * Usage:
 *   const publisher = WorldPublishingService.getInstance();
 *   const draft = publisher.createDraft(sceneId, { title: 'My World', ... });
 *   publisher.submitForReview(draft.id);
 *   publisher.approveWorld(draft.id, moderatorId);
 *   publisher.publishWorld(draft.id);
 *   const feed = publisher.listPublishedWorlds({ category: 'games' }, 'popular');
 */

import { SceneRankingService, getSceneRankingService } from './SceneRankingService';
import {
  CurationService,
  getCurationService,
  type TopCategory,
  type SearchQuery,
  type SearchResponse,
} from './CurationService';

// ============================================================================
// Types -- World Status & Lifecycle
// ============================================================================

export type WorldStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'unpublished';

export type WorldVisibility = 'public' | 'unlisted' | 'private';

export type AgeRating = 'everyone' | 'teen' | 'mature';

export type WorldSortOption =
  | 'popular'
  | 'trending'
  | 'newest'
  | 'top_rated'
  | 'most_players';

// ============================================================================
// Types -- World Metadata
// ============================================================================

export interface WorldMetadata {
  title: string;
  description: string;
  tags: string[];
  category: TopCategory;
  subcategory?: string;
  maxCapacity: number;        // 1-100
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
  rating: number;           // 1-5
  title: string;
  body: string;
  helpful: number;
  reported: boolean;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Types -- World Record (full internal representation)
// ============================================================================

export interface WorldRecord {
  id: string;
  sceneId: string;
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl?: string;
  status: WorldStatus;
  metadata: WorldMetadata;
  versions: WorldVersion[];
  currentVersion: number;
  reviews: WorldReview[];
  avgRating: number;
  ratingCount: number;
  livePlayerCount: number;
  totalVisits: number;
  totalBookmarks: number;
  moderatorId?: string;
  rejectionReason?: string;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
  unpublishedAt?: number;
  featuredUntil?: number;
}

// ============================================================================
// Types -- Public DTOs
// ============================================================================

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

// ============================================================================
// Types -- Filters & Pagination
// ============================================================================

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

// ============================================================================
// Types -- Service Events
// ============================================================================

export type WorldPublishingEventType =
  | 'draft_created'
  | 'submitted_for_review'
  | 'world_approved'
  | 'world_rejected'
  | 'world_published'
  | 'world_unpublished'
  | 'version_created'
  | 'review_added'
  | 'review_removed'
  | 'player_count_updated'
  | 'metadata_updated';

export interface WorldPublishingEvent {
  type: WorldPublishingEventType;
  worldId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface WorldPublishingConfig {
  /** Max worlds per creator. Default: 100. */
  maxWorldsPerCreator?: number;
  /** Max reviews per world. Default: 10000. */
  maxReviewsPerWorld?: number;
  /** Max versions to retain per world. Default: 50. */
  maxVersionsPerWorld?: number;
  /** Auto-publish after approval (skip manual publish step). Default: false. */
  autoPublishOnApproval?: boolean;
  /** Max tags per world. Default: 20. */
  maxTagsPerWorld?: number;
  /** Max screenshots per world. Default: 10. */
  maxScreenshotsPerWorld?: number;
}

// ============================================================================
// Validation Helpers
// ============================================================================

const VALID_CATEGORIES: TopCategory[] = ['games', 'art', 'education', 'social', 'enterprise'];
const VALID_AGE_RATINGS: AgeRating[] = ['everyone', 'teen', 'mature'];
const VALID_VISIBILITIES: WorldVisibility[] = ['public', 'unlisted', 'private'];

function validateMetadata(metadata: WorldMetadata, config: Required<WorldPublishingConfig>): string[] {
  const errors: string[] = [];

  if (!metadata.title || metadata.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  }
  if (metadata.title && metadata.title.trim().length > 100) {
    errors.push('Title must be 100 characters or fewer');
  }
  if (!metadata.description || metadata.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  }
  if (metadata.description && metadata.description.trim().length > 5000) {
    errors.push('Description must be 5000 characters or fewer');
  }
  if (!VALID_CATEGORIES.includes(metadata.category)) {
    errors.push(`Invalid category: ${metadata.category}`);
  }
  if (!VALID_AGE_RATINGS.includes(metadata.ageRating)) {
    errors.push(`Invalid age rating: ${metadata.ageRating}`);
  }
  if (!VALID_VISIBILITIES.includes(metadata.visibility)) {
    errors.push(`Invalid visibility: ${metadata.visibility}`);
  }
  if (metadata.maxCapacity < 1 || metadata.maxCapacity > 100) {
    errors.push('Max capacity must be between 1 and 100');
  }
  if (metadata.tags && metadata.tags.length > config.maxTagsPerWorld) {
    errors.push(`Maximum ${config.maxTagsPerWorld} tags allowed`);
  }
  if (metadata.screenshotUrls && metadata.screenshotUrls.length > config.maxScreenshotsPerWorld) {
    errors.push(`Maximum ${config.maxScreenshotsPerWorld} screenshots allowed`);
  }

  return errors;
}

// ============================================================================
// State Machine Transition Validation
// ============================================================================

const VALID_TRANSITIONS: Record<WorldStatus, WorldStatus[]> = {
  draft: ['pending_review'],
  pending_review: ['published', 'rejected'],
  published: ['unpublished'],
  rejected: ['draft'],           // Creator can revise and resubmit
  unpublished: ['pending_review', 'draft'],
};

function canTransition(from: WorldStatus, to: WorldStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================================================
// Service
// ============================================================================

export class WorldPublishingService {
  private static instance: WorldPublishingService | null = null;

  private readonly config: Required<WorldPublishingConfig>;

  // Core data
  private worlds: Map<string, WorldRecord> = new Map();
  private creatorWorldCounts: Map<string, number> = new Map();

  // External service references (lazy-loaded singletons)
  private rankingService: SceneRankingService | null = null;
  private curationService: CurationService | null = null;

  // Events
  private listeners: Array<(event: WorldPublishingEvent) => void> = [];
  private idCounter = 0;
  private running = false;

  constructor(config: WorldPublishingConfig = {}) {
    this.config = {
      maxWorldsPerCreator: config.maxWorldsPerCreator ?? 100,
      maxReviewsPerWorld: config.maxReviewsPerWorld ?? 10000,
      maxVersionsPerWorld: config.maxVersionsPerWorld ?? 50,
      autoPublishOnApproval: config.autoPublishOnApproval ?? false,
      maxTagsPerWorld: config.maxTagsPerWorld ?? 20,
      maxScreenshotsPerWorld: config.maxScreenshotsPerWorld ?? 10,
    };
  }

  static getInstance(): WorldPublishingService {
    if (!WorldPublishingService.instance) {
      WorldPublishingService.instance = new WorldPublishingService();
    }
    return WorldPublishingService.instance;
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  start(): void {
    if (this.running) return;
    this.running = true;
    // Lazy-load dependent services
    this.rankingService = getSceneRankingService();
    this.curationService = getCurationService();
  }

  stop(): void {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  onEvent(listener: (event: WorldPublishingEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(type: WorldPublishingEventType, worldId: string, data: Record<string, unknown> = {}): void {
    const event: WorldPublishingEvent = { type, worldId, timestamp: Date.now(), data };
    for (const l of this.listeners) {
      try { l(event); } catch { /* swallow listener errors */ }
    }
  }

  private nextId(prefix: string): string {
    return `${prefix}_${++this.idCounter}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // --------------------------------------------------------------------------
  // DRAFT CREATION
  // --------------------------------------------------------------------------

  /**
   * Create a new world draft from a scene.
   * The world starts in 'draft' status and must be submitted for review before publishing.
   */
  createDraft(
    sceneId: string,
    creatorId: string,
    creatorName: string,
    metadata: WorldMetadata,
    creatorAvatarUrl?: string,
  ): WorldRecord {
    // Validate creator limits
    const creatorCount = this.creatorWorldCounts.get(creatorId) ?? 0;
    if (creatorCount >= this.config.maxWorldsPerCreator) {
      throw new Error(`Creator has reached maximum world limit (${this.config.maxWorldsPerCreator})`);
    }

    // Validate metadata
    const errors = validateMetadata(metadata, this.config);
    if (errors.length > 0) {
      throw new Error(`Invalid metadata: ${errors.join('; ')}`);
    }

    const id = this.nextId('world');
    const now = Date.now();

    // Normalize metadata
    const normalizedMetadata: WorldMetadata = {
      ...metadata,
      title: metadata.title.trim(),
      description: metadata.description.trim(),
      tags: metadata.tags
        .slice(0, this.config.maxTagsPerWorld)
        .map(t => t.toLowerCase().trim())
        .filter(Boolean),
      screenshotUrls: (metadata.screenshotUrls ?? []).slice(0, this.config.maxScreenshotsPerWorld),
    };

    const world: WorldRecord = {
      id,
      sceneId,
      creatorId,
      creatorName,
      creatorAvatarUrl,
      status: 'draft',
      metadata: normalizedMetadata,
      versions: [],
      currentVersion: 0,
      reviews: [],
      avgRating: 0,
      ratingCount: 0,
      livePlayerCount: 0,
      totalVisits: 0,
      totalBookmarks: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.worlds.set(id, world);
    this.creatorWorldCounts.set(creatorId, creatorCount + 1);

    this.emit('draft_created', id, {
      sceneId,
      creatorId,
      title: normalizedMetadata.title,
    });

    return this.cloneWorld(world);
  }

  // --------------------------------------------------------------------------
  // STATUS TRANSITIONS (State Machine)
  // --------------------------------------------------------------------------

  /**
   * Submit a draft world for review.
   * Transitions: draft -> pending_review
   */
  submitForReview(worldId: string): WorldRecord {
    const world = this.getWorldOrThrow(worldId);

    if (!canTransition(world.status, 'pending_review')) {
      throw new Error(
        `Cannot submit for review: world is in '${world.status}' status. ` +
        `Valid source states: draft, unpublished`
      );
    }

    // Validate completeness for review
    const errors = validateMetadata(world.metadata, this.config);
    if (errors.length > 0) {
      throw new Error(`Cannot submit: ${errors.join('; ')}`);
    }

    world.status = 'pending_review';
    world.updatedAt = Date.now();

    this.emit('submitted_for_review', worldId, {
      title: world.metadata.title,
      creatorId: world.creatorId,
    });

    return this.cloneWorld(world);
  }

  /**
   * Approve a world after moderation review.
   * Transitions: pending_review -> published (if autoPublish) or stays pending_review
   * Then publishWorld() must be called separately unless autoPublishOnApproval is true.
   */
  approveWorld(worldId: string, moderatorId: string): WorldRecord {
    const world = this.getWorldOrThrow(worldId);

    if (world.status !== 'pending_review') {
      throw new Error(`Cannot approve: world is in '${world.status}' status, expected 'pending_review'`);
    }

    world.moderatorId = moderatorId;
    world.rejectionReason = undefined;
    world.updatedAt = Date.now();

    this.emit('world_approved', worldId, {
      moderatorId,
      title: world.metadata.title,
    });

    // Auto-publish if configured
    if (this.config.autoPublishOnApproval) {
      return this.publishWorld(worldId);
    }

    // Otherwise, remain in pending_review (publisher calls publishWorld separately)
    return this.cloneWorld(world);
  }

  /**
   * Reject a world during moderation review.
   * Transitions: pending_review -> rejected
   * Creator can revise (rejected -> draft) and resubmit.
   */
  rejectWorld(worldId: string, moderatorId: string, reason: string): WorldRecord {
    const world = this.getWorldOrThrow(worldId);

    if (world.status !== 'pending_review') {
      throw new Error(`Cannot reject: world is in '${world.status}' status, expected 'pending_review'`);
    }

    if (!reason || reason.trim().length < 5) {
      throw new Error('Rejection reason must be at least 5 characters');
    }

    world.status = 'rejected';
    world.moderatorId = moderatorId;
    world.rejectionReason = reason.trim();
    world.updatedAt = Date.now();

    this.emit('world_rejected', worldId, {
      moderatorId,
      reason: world.rejectionReason,
      title: world.metadata.title,
    });

    return this.cloneWorld(world);
  }

  /**
   * Publish an approved world, making it visible to users.
   * Creates a new version snapshot. Registers with ranking and curation services.
   * Transitions: pending_review -> published
   */
  publishWorld(worldId: string): WorldRecord {
    const world = this.getWorldOrThrow(worldId);

    if (!canTransition(world.status, 'published')) {
      throw new Error(
        `Cannot publish: world is in '${world.status}' status. Must be 'pending_review'.`
      );
    }

    const now = Date.now();

    // Create new version
    const versionNumber = world.versions.length + 1;
    const newVersion: WorldVersion = {
      version: versionNumber,
      sceneId: world.sceneId,
      metadata: { ...world.metadata, tags: [...world.metadata.tags] },
      publishedAt: now,
      publishedBy: world.creatorId,
      isLive: true,
    };

    // Mark previous versions as not live
    for (const v of world.versions) {
      v.isLive = false;
    }

    world.versions.push(newVersion);
    world.currentVersion = versionNumber;
    world.status = 'published';
    world.publishedAt = now;
    world.unpublishedAt = undefined;
    world.updatedAt = now;

    // Trim old versions if over limit
    if (world.versions.length > this.config.maxVersionsPerWorld) {
      const excess = world.versions.length - this.config.maxVersionsPerWorld;
      world.versions.splice(0, excess);
    }

    // Wire into SceneRankingService
    if (this.rankingService) {
      this.rankingService.registerWorld(worldId, now);
    }

    // Wire into CurationService (search index + creator portfolio)
    if (this.curationService) {
      this.curationService.indexWorld({
        worldId,
        title: world.metadata.title,
        description: world.metadata.description,
        creatorId: world.creatorId,
        creatorName: world.creatorName,
        tags: world.metadata.tags,
        categoryId: world.metadata.category,
        subcategoryId: world.metadata.subcategory,
        publishedAt: now,
        engagementScore: 0,
      });

      // Add to creator portfolio if profile exists
      try {
        this.curationService.addWorldToProfile(world.creatorId, worldId);
      } catch {
        // Profile may not exist yet -- non-fatal
      }
    }

    this.emit('world_published', worldId, {
      version: versionNumber,
      title: world.metadata.title,
      creatorId: world.creatorId,
    });

    this.emit('version_created', worldId, {
      version: versionNumber,
      sceneId: world.sceneId,
    });

    return this.cloneWorld(world);
  }

  /**
   * Unpublish a published world, removing it from public listings.
   * Transitions: published -> unpublished
   */
  unpublishWorld(worldId: string): WorldRecord {
    const world = this.getWorldOrThrow(worldId);

    if (!canTransition(world.status, 'unpublished')) {
      throw new Error(
        `Cannot unpublish: world is in '${world.status}' status. Must be 'published'.`
      );
    }

    world.status = 'unpublished';
    world.unpublishedAt = Date.now();
    world.updatedAt = Date.now();

    // Unregister from ranking
    if (this.rankingService) {
      this.rankingService.unregisterWorld(worldId);
    }

    // Remove from search index
    if (this.curationService) {
      this.curationService.removeWorldFromIndex(worldId);
      try {
        this.curationService.removeWorldFromProfile(world.creatorId, worldId);
      } catch {
        // Non-fatal
      }
    }

    this.emit('world_unpublished', worldId, {
      title: world.metadata.title,
      creatorId: world.creatorId,
    });

    return this.cloneWorld(world);
  }

  /**
   * Revert a rejected world back to draft for revision.
   * Transitions: rejected -> draft
   */
  revertToDraft(worldId: string): WorldRecord {
    const world = this.getWorldOrThrow(worldId);

    if (!canTransition(world.status, 'draft')) {
      throw new Error(
        `Cannot revert to draft: world is in '${world.status}' status. Must be 'rejected' or 'unpublished'.`
      );
    }

    world.status = 'draft';
    world.rejectionReason = undefined;
    world.updatedAt = Date.now();

    return this.cloneWorld(world);
  }

  // --------------------------------------------------------------------------
  // METADATA MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Update world metadata (only allowed in draft or rejected status).
   */
  updateMetadata(worldId: string, updates: Partial<WorldMetadata>): WorldRecord {
    const world = this.getWorldOrThrow(worldId);

    if (world.status !== 'draft' && world.status !== 'rejected') {
      throw new Error(
        `Cannot update metadata: world is in '${world.status}' status. Must be 'draft' or 'rejected'.`
      );
    }

    // Apply updates
    if (updates.title !== undefined) world.metadata.title = updates.title.trim();
    if (updates.description !== undefined) world.metadata.description = updates.description.trim();
    if (updates.tags !== undefined) {
      world.metadata.tags = updates.tags
        .slice(0, this.config.maxTagsPerWorld)
        .map(t => t.toLowerCase().trim())
        .filter(Boolean);
    }
    if (updates.category !== undefined) world.metadata.category = updates.category;
    if (updates.subcategory !== undefined) world.metadata.subcategory = updates.subcategory;
    if (updates.maxCapacity !== undefined) world.metadata.maxCapacity = updates.maxCapacity;
    if (updates.ageRating !== undefined) world.metadata.ageRating = updates.ageRating;
    if (updates.visibility !== undefined) world.metadata.visibility = updates.visibility;
    if (updates.thumbnailUrl !== undefined) world.metadata.thumbnailUrl = updates.thumbnailUrl;
    if (updates.screenshotUrls !== undefined) {
      world.metadata.screenshotUrls = updates.screenshotUrls.slice(0, this.config.maxScreenshotsPerWorld);
    }
    if (updates.previewVideoUrl !== undefined) world.metadata.previewVideoUrl = updates.previewVideoUrl;

    // Validate after update
    const errors = validateMetadata(world.metadata, this.config);
    if (errors.length > 0) {
      throw new Error(`Invalid metadata: ${errors.join('; ')}`);
    }

    world.updatedAt = Date.now();

    this.emit('metadata_updated', worldId, {
      title: world.metadata.title,
      updatedFields: Object.keys(updates),
    });

    return this.cloneWorld(world);
  }

  /**
   * Update the scene ID associated with a world (re-linking to a different scene snapshot).
   * Only allowed in draft or rejected status.
   */
  updateSceneId(worldId: string, newSceneId: string): WorldRecord {
    const world = this.getWorldOrThrow(worldId);

    if (world.status !== 'draft' && world.status !== 'rejected') {
      throw new Error(`Cannot update scene: world is in '${world.status}' status`);
    }

    world.sceneId = newSceneId;
    world.updatedAt = Date.now();

    return this.cloneWorld(world);
  }

  // --------------------------------------------------------------------------
  // THUMBNAIL GENERATION
  // --------------------------------------------------------------------------

  /**
   * Set a thumbnail for the world.
   * Accepts an uploaded URL directly, or could be extended to generate from a scene screenshot.
   */
  setThumbnail(worldId: string, thumbnailUrl: string): WorldRecord {
    const world = this.getWorldOrThrow(worldId);

    if (!thumbnailUrl || !thumbnailUrl.trim()) {
      throw new Error('Thumbnail URL is required');
    }

    world.metadata.thumbnailUrl = thumbnailUrl.trim();
    world.updatedAt = Date.now();

    return this.cloneWorld(world);
  }

  /**
   * Generate a thumbnail from a scene screenshot (stub).
   * In production, this would call a rendering service to capture the scene.
   * For now, it returns a placeholder URL that the frontend can use.
   */
  generateThumbnailFromScene(worldId: string, _sceneId?: string): string {
    const world = this.getWorldOrThrow(worldId);
    const sceneId = _sceneId ?? world.sceneId;

    // Stub: In production, this would trigger a headless renderer
    // to capture a screenshot of the scene and upload it to CDN.
    const placeholderUrl = `https://cdn.hololand.io/thumbnails/${worldId}/scene-${sceneId}-${Date.now()}.jpg`;

    world.metadata.thumbnailUrl = placeholderUrl;
    world.updatedAt = Date.now();

    return placeholderUrl;
  }

  // --------------------------------------------------------------------------
  // VERSIONING
  // --------------------------------------------------------------------------

  /**
   * Get all versions for a world.
   */
  getWorldVersions(worldId: string): WorldVersion[] {
    const world = this.getWorldOrThrow(worldId);
    return world.versions.map(v => ({ ...v, metadata: { ...v.metadata, tags: [...v.metadata.tags] } }));
  }

  /**
   * Get a specific version of a world.
   */
  getWorldVersion(worldId: string, version: number): WorldVersion | undefined {
    const world = this.getWorldOrThrow(worldId);
    const v = world.versions.find(ver => ver.version === version);
    return v ? { ...v, metadata: { ...v.metadata, tags: [...v.metadata.tags] } } : undefined;
  }

  /**
   * Roll back to a previous version (creates a new version based on the old snapshot).
   * Only allowed when the world is published.
   */
  rollbackToVersion(worldId: string, targetVersion: number): WorldRecord {
    const world = this.getWorldOrThrow(worldId);

    if (world.status !== 'published') {
      throw new Error('Can only rollback published worlds');
    }

    const target = world.versions.find(v => v.version === targetVersion);
    if (!target) {
      throw new Error(`Version ${targetVersion} not found`);
    }

    // Apply the old version's metadata as current
    world.metadata = { ...target.metadata, tags: [...target.metadata.tags] };
    world.sceneId = target.sceneId;

    // Create a new version from the rollback
    const newVersionNumber = world.versions.length + 1;
    const newVersion: WorldVersion = {
      version: newVersionNumber,
      sceneId: target.sceneId,
      metadata: { ...target.metadata, tags: [...target.metadata.tags] },
      publishedAt: Date.now(),
      publishedBy: world.creatorId,
      changelog: `Rolled back to version ${targetVersion}`,
      isLive: true,
    };

    for (const v of world.versions) {
      v.isLive = false;
    }

    world.versions.push(newVersion);
    world.currentVersion = newVersionNumber;
    world.updatedAt = Date.now();

    // Re-index in curation service
    if (this.curationService) {
      this.curationService.indexWorld({
        worldId,
        title: world.metadata.title,
        description: world.metadata.description,
        creatorId: world.creatorId,
        creatorName: world.creatorName,
        tags: world.metadata.tags,
        categoryId: world.metadata.category,
        subcategoryId: world.metadata.subcategory,
        publishedAt: world.publishedAt ?? Date.now(),
        engagementScore: 0,
      });
    }

    this.emit('version_created', worldId, {
      version: newVersionNumber,
      rollbackFrom: targetVersion,
    });

    return this.cloneWorld(world);
  }

  // --------------------------------------------------------------------------
  // REVIEWS
  // --------------------------------------------------------------------------

  /**
   * Add a review to a published world.
   */
  addReview(
    worldId: string,
    userId: string,
    userName: string,
    rating: number,
    title: string,
    body: string,
    userAvatarUrl?: string,
  ): WorldReview {
    const world = this.getWorldOrThrow(worldId);

    if (world.status !== 'published') {
      throw new Error('Can only review published worlds');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    if (!title || title.trim().length < 3) {
      throw new Error('Review title must be at least 3 characters');
    }

    // Check if user already reviewed
    if (world.reviews.some(r => r.userId === userId)) {
      throw new Error('User has already reviewed this world');
    }

    if (world.reviews.length >= this.config.maxReviewsPerWorld) {
      throw new Error('Maximum reviews reached for this world');
    }

    const review: WorldReview = {
      id: this.nextId('review'),
      worldId,
      userId,
      userName,
      userAvatarUrl,
      rating: Math.round(rating * 10) / 10,
      title: title.trim(),
      body: body.trim(),
      helpful: 0,
      reported: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    world.reviews.push(review);
    this.recalculateRating(world);
    world.updatedAt = Date.now();

    // Record in ranking service
    if (this.rankingService) {
      this.rankingService.recordRating(worldId, userId, rating);
    }

    this.emit('review_added', worldId, {
      reviewId: review.id,
      userId,
      rating,
    });

    return { ...review };
  }

  /**
   * Remove a review from a world.
   */
  removeReview(worldId: string, reviewId: string): void {
    const world = this.getWorldOrThrow(worldId);

    const idx = world.reviews.findIndex(r => r.id === reviewId);
    if (idx === -1) {
      throw new Error(`Review ${reviewId} not found`);
    }

    world.reviews.splice(idx, 1);
    this.recalculateRating(world);
    world.updatedAt = Date.now();

    this.emit('review_removed', worldId, { reviewId });
  }

  /**
   * Mark a review as helpful (increment counter).
   */
  markReviewHelpful(worldId: string, reviewId: string): void {
    const world = this.getWorldOrThrow(worldId);
    const review = world.reviews.find(r => r.id === reviewId);
    if (!review) throw new Error(`Review ${reviewId} not found`);
    review.helpful++;
  }

  private recalculateRating(world: WorldRecord): void {
    if (world.reviews.length === 0) {
      world.avgRating = 0;
      world.ratingCount = 0;
      return;
    }
    const sum = world.reviews.reduce((acc, r) => acc + r.rating, 0);
    world.avgRating = Math.round((sum / world.reviews.length) * 100) / 100;
    world.ratingCount = world.reviews.length;
  }

  // --------------------------------------------------------------------------
  // LIVE PLAYER COUNT
  // --------------------------------------------------------------------------

  /**
   * Update the live player count for a world (called by presence/matchmaking service).
   */
  updatePlayerCount(worldId: string, count: number): void {
    const world = this.worlds.get(worldId);
    if (!world) return;

    world.livePlayerCount = Math.max(0, count);

    this.emit('player_count_updated', worldId, {
      playerCount: world.livePlayerCount,
    });
  }

  /**
   * Record a visit (for total visit tracking).
   */
  recordVisit(worldId: string, userId: string, sessionDurationSec: number): void {
    const world = this.worlds.get(worldId);
    if (!world) return;

    world.totalVisits++;

    // Forward to ranking service
    if (this.rankingService) {
      this.rankingService.recordVisit(worldId, userId, sessionDurationSec);
    }
  }

  /**
   * Record a bookmark.
   */
  recordBookmark(worldId: string, userId: string): void {
    const world = this.worlds.get(worldId);
    if (!world) return;

    world.totalBookmarks++;

    if (this.rankingService) {
      this.rankingService.recordBookmark(worldId, userId);
    }
  }

  // --------------------------------------------------------------------------
  // QUERIES -- Single World
  // --------------------------------------------------------------------------

  /**
   * Get a world by its ID. Returns full detail DTO.
   */
  getWorldById(worldId: string): WorldDetail | undefined {
    const world = this.worlds.get(worldId);
    if (!world) return undefined;

    let engagementScore = 0;
    if (this.rankingService) {
      const score = this.rankingService.getSceneScore(worldId);
      engagementScore = score?.engagementScore ?? 0;
    }

    return this.toWorldDetail(world, engagementScore);
  }

  /**
   * Get world by ID (throws if not found).
   */
  getWorldByIdOrThrow(worldId: string): WorldDetail {
    const world = this.getWorldById(worldId);
    if (!world) throw new Error(`World ${worldId} not found`);
    return world;
  }

  /**
   * Get all worlds by a specific creator.
   */
  getWorldsByCreator(creatorId: string): WorldSummary[] {
    return Array.from(this.worlds.values())
      .filter(w => w.creatorId === creatorId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(w => this.toWorldSummary(w));
  }

  // --------------------------------------------------------------------------
  // QUERIES -- Listing & Filtering
  // --------------------------------------------------------------------------

  /**
   * List published worlds with filtering, sorting, and pagination.
   * This is the primary query for the public world directory.
   */
  listPublishedWorlds(
    filters: WorldFilters = {},
    sort: WorldSortOption = 'popular',
    page: number = 1,
    pageSize: number = 24,
  ): PaginatedResult<WorldSummary> {
    let results = Array.from(this.worlds.values())
      .filter(w => w.status === 'published');

    // Apply visibility filter (default: show public only)
    const visibilityFilter = filters.visibility ?? 'public';
    results = results.filter(w => w.metadata.visibility === visibilityFilter);

    // Apply filters
    if (filters.category) {
      results = results.filter(w => w.metadata.category === filters.category);
    }
    if (filters.subcategory) {
      results = results.filter(w => w.metadata.subcategory === filters.subcategory);
    }
    if (filters.tags && filters.tags.length > 0) {
      const filterTags = filters.tags.map(t => t.toLowerCase());
      results = results.filter(w =>
        filterTags.some(ft => w.metadata.tags.includes(ft))
      );
    }
    if (filters.ageRating) {
      results = results.filter(w => w.metadata.ageRating === filters.ageRating);
    }
    if (filters.minRating !== undefined) {
      results = results.filter(w => w.avgRating >= filters.minRating!);
    }
    if (filters.minPlayers !== undefined) {
      results = results.filter(w => w.livePlayerCount >= filters.minPlayers!);
    }
    if (filters.maxPlayers !== undefined) {
      results = results.filter(w => w.livePlayerCount <= filters.maxPlayers!);
    }
    if (filters.creatorId) {
      results = results.filter(w => w.creatorId === filters.creatorId);
    }
    if (filters.featured) {
      const now = Date.now();
      results = results.filter(w => w.featuredUntil && w.featuredUntil > now);
    }

    // Sort
    results = this.sortWorlds(results, sort);

    // Paginate
    const total = results.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const clampedPage = Math.max(1, Math.min(page, totalPages));
    const offset = (clampedPage - 1) * pageSize;
    const paged = results.slice(offset, offset + pageSize);

    return {
      items: paged.map(w => this.toWorldSummary(w)),
      total,
      page: clampedPage,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get featured worlds (worlds with featuredUntil > now).
   */
  getFeaturedWorlds(limit: number = 3): WorldSummary[] {
    const now = Date.now();
    return Array.from(this.worlds.values())
      .filter(w => w.status === 'published' && w.featuredUntil && w.featuredUntil > now)
      .sort((a, b) => (b.featuredUntil ?? 0) - (a.featuredUntil ?? 0))
      .slice(0, limit)
      .map(w => this.toWorldSummary(w));
  }

  /**
   * Set a world as featured until a given timestamp.
   */
  featureWorld(worldId: string, untilTimestamp: number): WorldRecord {
    const world = this.getWorldOrThrow(worldId);

    if (world.status !== 'published') {
      throw new Error('Can only feature published worlds');
    }

    world.featuredUntil = untilTimestamp;
    world.updatedAt = Date.now();

    return this.cloneWorld(world);
  }

  /**
   * Remove featured status from a world.
   */
  unfeatureWorld(worldId: string): WorldRecord {
    const world = this.getWorldOrThrow(worldId);
    world.featuredUntil = undefined;
    world.updatedAt = Date.now();
    return this.cloneWorld(world);
  }

  // --------------------------------------------------------------------------
  // SEARCH (delegates to CurationService)
  // --------------------------------------------------------------------------

  /**
   * Search worlds using the CurationService semantic search engine.
   * Wraps CurationService.search() with world-specific filtering.
   */
  searchWorlds(query: string, filters: WorldFilters = {}, limit: number = 20, offset: number = 0): SearchResponse {
    if (!this.curationService) {
      return {
        results: [],
        total: 0,
        query,
        facets: { categories: [], tags: [] },
        limit,
        offset,
        searchTimeMs: 0,
      };
    }

    const searchQuery: SearchQuery = {
      query,
      category: filters.category,
      subcategory: filters.subcategory,
      tags: filters.tags,
      creatorId: filters.creatorId,
      minEngagement: filters.minRating ? filters.minRating / 5 : undefined,
      sort: 'relevance',
      limit,
      offset,
    };

    return this.curationService.search(searchQuery);
  }

  /**
   * Get autocomplete suggestions for world search.
   */
  getSearchSuggestions(prefix: string, limit: number = 10): string[] {
    if (!this.curationService) return [];
    return this.curationService.autocomplete(prefix, limit);
  }

  /**
   * Get worlds similar to a given world (by content similarity).
   */
  getSimilarWorlds(worldId: string, limit: number = 6): WorldSummary[] {
    if (!this.curationService) return [];

    const similar = this.curationService.getSimilarWorlds(worldId, limit);
    return similar
      .map(s => {
        const world = this.worlds.get(s.worldId);
        return world ? this.toWorldSummary(world) : null;
      })
      .filter((w): w is WorldSummary => w !== null);
  }

  // --------------------------------------------------------------------------
  // MODERATION QUEUE
  // --------------------------------------------------------------------------

  /**
   * Get worlds pending moderation review.
   */
  getModerationQueue(page: number = 1, pageSize: number = 20): PaginatedResult<WorldSummary> {
    const pending = Array.from(this.worlds.values())
      .filter(w => w.status === 'pending_review')
      .sort((a, b) => a.updatedAt - b.updatedAt); // oldest first (FIFO)

    const total = pending.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const clampedPage = Math.max(1, Math.min(page, totalPages));
    const offset = (clampedPage - 1) * pageSize;
    const paged = pending.slice(offset, offset + pageSize);

    return {
      items: paged.map(w => this.toWorldSummary(w)),
      total,
      page: clampedPage,
      pageSize,
      totalPages,
    };
  }

  // --------------------------------------------------------------------------
  // DELETE
  // --------------------------------------------------------------------------

  /**
   * Permanently delete a world. Removes from all services.
   */
  deleteWorld(worldId: string): boolean {
    const world = this.worlds.get(worldId);
    if (!world) return false;

    // Unregister from ranking
    if (this.rankingService) {
      this.rankingService.unregisterWorld(worldId);
    }

    // Remove from search index
    if (this.curationService) {
      this.curationService.removeWorldFromIndex(worldId);
      try {
        this.curationService.removeWorldFromProfile(world.creatorId, worldId);
      } catch {
        // Non-fatal
      }
    }

    // Update creator count
    const count = this.creatorWorldCounts.get(world.creatorId) ?? 0;
    this.creatorWorldCounts.set(world.creatorId, Math.max(0, count - 1));

    this.worlds.delete(worldId);
    return true;
  }

  // --------------------------------------------------------------------------
  // STATS
  // --------------------------------------------------------------------------

  getStats(): {
    totalWorlds: number;
    byStatus: Record<WorldStatus, number>;
    byCategory: Record<string, number>;
    totalCreators: number;
    totalReviews: number;
    avgRating: number;
    totalPublishedVersions: number;
  } {
    const byStatus: Record<WorldStatus, number> = {
      draft: 0,
      pending_review: 0,
      published: 0,
      rejected: 0,
      unpublished: 0,
    };
    const byCategory: Record<string, number> = {};
    let totalReviews = 0;
    let totalRatingSum = 0;
    let ratedWorlds = 0;
    let totalVersions = 0;

    for (const world of this.worlds.values()) {
      byStatus[world.status]++;
      byCategory[world.metadata.category] = (byCategory[world.metadata.category] ?? 0) + 1;
      totalReviews += world.reviews.length;
      if (world.avgRating > 0) {
        totalRatingSum += world.avgRating;
        ratedWorlds++;
      }
      totalVersions += world.versions.length;
    }

    return {
      totalWorlds: this.worlds.size,
      byStatus,
      byCategory,
      totalCreators: this.creatorWorldCounts.size,
      totalReviews,
      avgRating: ratedWorlds > 0 ? Math.round((totalRatingSum / ratedWorlds) * 100) / 100 : 0,
      totalPublishedVersions: totalVersions,
    };
  }

  // --------------------------------------------------------------------------
  // Sorting
  // --------------------------------------------------------------------------

  private sortWorlds(worlds: WorldRecord[], sort: WorldSortOption): WorldRecord[] {
    switch (sort) {
      case 'popular': {
        // Use engagement score from ranking service if available
        if (this.rankingService) {
          return worlds.sort((a, b) => {
            const scoreA = this.rankingService!.getSceneScore(a.id)?.engagementScore ?? 0;
            const scoreB = this.rankingService!.getSceneScore(b.id)?.engagementScore ?? 0;
            return scoreB - scoreA;
          });
        }
        return worlds.sort((a, b) => b.totalVisits - a.totalVisits);
      }

      case 'trending': {
        if (this.rankingService) {
          return worlds.sort((a, b) => {
            const scoreA = this.rankingService!.getSceneScore(a.id)?.velocity ?? 0;
            const scoreB = this.rankingService!.getSceneScore(b.id)?.velocity ?? 0;
            return scoreB - scoreA;
          });
        }
        return worlds.sort((a, b) => b.totalVisits - a.totalVisits);
      }

      case 'newest':
        return worlds.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));

      case 'top_rated':
        return worlds.sort((a, b) => {
          // Sort by rating first, then by count for tiebreaking
          if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
          return b.ratingCount - a.ratingCount;
        });

      case 'most_players':
        return worlds.sort((a, b) => b.livePlayerCount - a.livePlayerCount);

      default:
        return worlds;
    }
  }

  // --------------------------------------------------------------------------
  // DTO Converters
  // --------------------------------------------------------------------------

  private toWorldSummary(w: WorldRecord): WorldSummary {
    return {
      id: w.id,
      title: w.metadata.title,
      description: w.metadata.description.substring(0, 200),
      thumbnailUrl: w.metadata.thumbnailUrl,
      creatorId: w.creatorId,
      creatorName: w.creatorName,
      creatorAvatarUrl: w.creatorAvatarUrl,
      category: w.metadata.category,
      subcategory: w.metadata.subcategory,
      tags: [...w.metadata.tags],
      status: w.status,
      visibility: w.metadata.visibility,
      ageRating: w.metadata.ageRating,
      maxCapacity: w.metadata.maxCapacity,
      avgRating: w.avgRating,
      ratingCount: w.ratingCount,
      livePlayerCount: w.livePlayerCount,
      totalVisits: w.totalVisits,
      publishedAt: w.publishedAt,
      currentVersion: w.currentVersion,
    };
  }

  private toWorldDetail(w: WorldRecord, engagementScore: number): WorldDetail {
    return {
      ...this.toWorldSummary(w),
      description: w.metadata.description,
      screenshotUrls: [...(w.metadata.screenshotUrls ?? [])],
      previewVideoUrl: w.metadata.previewVideoUrl,
      versions: w.versions.map(v => ({
        ...v,
        metadata: { ...v.metadata, tags: [...v.metadata.tags] },
      })),
      reviews: w.reviews.map(r => ({ ...r })),
      totalBookmarks: w.totalBookmarks,
      engagementScore: Math.round(engagementScore * 10000) / 10000,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    };
  }

  // --------------------------------------------------------------------------
  // Internal Helpers
  // --------------------------------------------------------------------------

  private getWorldOrThrow(worldId: string): WorldRecord {
    const world = this.worlds.get(worldId);
    if (!world) throw new Error(`World ${worldId} not found`);
    return world;
  }

  private cloneWorld(world: WorldRecord): WorldRecord {
    return {
      ...world,
      metadata: {
        ...world.metadata,
        tags: [...world.metadata.tags],
        screenshotUrls: [...(world.metadata.screenshotUrls ?? [])],
      },
      versions: world.versions.map(v => ({
        ...v,
        metadata: { ...v.metadata, tags: [...v.metadata.tags] },
      })),
      reviews: world.reviews.map(r => ({ ...r })),
    };
  }
}

// ============================================================================
// Singleton accessor
// ============================================================================

export function getWorldPublishingService(): WorldPublishingService {
  return WorldPublishingService.getInstance();
}
