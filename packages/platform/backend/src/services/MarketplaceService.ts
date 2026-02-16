/**
 * @hololand/backend — MarketplaceService
 *
 * Template/world publishing marketplace for Hololand creator economy.
 * Manages asset listings, search, reviews, purchases, versioning,
 * and revenue share. Transport-agnostic — integrates with LobbyServer
 * via message handlers.
 *
 * Architecture:
 *   Creator → PublishAsset → Review/Approval → Listed
 *       ↓                                        ↓
 *   VersionManagement                       SearchIndex
 *       ↓                                        ↓
 *   UpdateAsset ← ← ← ← ← ← ← ← ← ←    User Purchase
 *                                                ↓
 *                                          RevenueShare → Creator
 *
 * Asset Types:
 *   template    — Reusable object/scene template (.holo, .hsplus)
 *   world       — Complete world/scene composition
 *   plugin      — Extension or add-on module
 *   avatar      — Player avatar or skin
 *   effect      — Visual/audio effect pack
 *
 * Usage:
 *   const mkt = new MarketplaceService({ revenueSplitPercent: 70 });
 *   mkt.start();
 *
 *   const asset = mkt.publishAsset({ ... });
 *   mkt.submitReview(asset.id, { ... });
 *   mkt.approveAsset(asset.id);
 *   mkt.purchaseAsset(asset.id, buyerId);
 */

// ============================================================================
// Types
// ============================================================================

export type AssetType = 'template' | 'world' | 'plugin' | 'avatar' | 'effect';
export type AssetStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published' | 'suspended' | 'archived';
export type ReviewVerdict = 'approved' | 'rejected' | 'needs_changes';
export type SortField = 'newest' | 'popular' | 'rating' | 'price_asc' | 'price_desc' | 'downloads';
export type LicenseType = 'free' | 'standard' | 'premium' | 'exclusive';

export interface AssetRecord {
  id: string;
  creatorId: string;
  name: string;
  slug: string;
  description: string;
  type: AssetType;
  status: AssetStatus;
  license: LicenseType;
  price: number;           // 0 = free
  tags: string[];
  thumbnailUrl?: string;
  previewUrls: string[];
  fileUrl?: string;
  fileSizeMB: number;
  currentVersion: string;
  versions: AssetVersion[];
  downloads: number;
  purchases: number;
  revenue: number;
  reviews: ReviewRecord[];
  averageRating: number;
  ratingCount: number;
  featured: boolean;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
  metadata?: Record<string, unknown>;
}

export interface AssetVersion {
  version: string;
  changelog: string;
  fileUrl?: string;
  fileSizeMB: number;
  createdAt: number;
}

export interface ReviewRecord {
  id: string;
  assetId: string;
  userId: string;
  rating: number;         // 1-5
  title: string;
  body: string;
  helpful: number;
  reported: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PurchaseRecord {
  id: string;
  assetId: string;
  buyerId: string;
  price: number;
  creatorShare: number;
  platformShare: number;
  version: string;
  createdAt: number;
}

export interface ModerationRecord {
  id: string;
  assetId: string;
  moderatorId: string;
  verdict: ReviewVerdict;
  reason: string;
  createdAt: number;
}

// ─── DTOs ───────────────────────────────────────────────────────

export interface AssetInfo {
  id: string;
  creatorId: string;
  name: string;
  slug: string;
  description: string;
  type: AssetType;
  status: AssetStatus;
  license: LicenseType;
  price: number;
  tags: string[];
  thumbnailUrl?: string;
  previewUrls: string[];
  currentVersion: string;
  versionCount: number;
  downloads: number;
  purchases: number;
  revenue: number;
  averageRating: number;
  ratingCount: number;
  featured: boolean;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
}

export interface ReviewInfo {
  id: string;
  assetId: string;
  userId: string;
  rating: number;
  title: string;
  body: string;
  helpful: number;
  createdAt: number;
}

export interface PurchaseInfo {
  id: string;
  assetId: string;
  buyerId: string;
  price: number;
  version: string;
  createdAt: number;
}

export interface SearchQuery {
  query?: string;
  type?: AssetType;
  tags?: string[];
  license?: LicenseType;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  creatorId?: string;
  status?: AssetStatus;
  sort?: SortField;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  assets: AssetInfo[];
  total: number;
  limit: number;
  offset: number;
}

export interface MarketplaceServiceConfig {
  /** Creator's share of each sale, as percentage. Default: 70 */
  revenueSplitPercent?: number;
  /** Maximum assets per creator. Default: 500 */
  maxAssetsPerCreator?: number;
  /** Maximum tags per asset. Default: 15 */
  maxTagsPerAsset?: number;
  /** Maximum reviews per user per asset. Default: 1 */
  maxReviewsPerUserPerAsset?: number;
  /** Minimum price for paid assets. Default: 0.99 */
  minPrice?: number;
  /** Maximum price for assets. Default: 9999 */
  maxPrice?: number;
  /** Auto-publish after approval. Default: true */
  autoPublishOnApproval?: boolean;
  /** Maximum file size in MB. Default: 500 */
  maxFileSizeMB?: number;
  /** Maximum versions per asset. Default: 100 */
  maxVersionsPerAsset?: number;
}

export type MarketplaceEventType =
  | 'asset_published'
  | 'asset_updated'
  | 'asset_approved'
  | 'asset_rejected'
  | 'asset_suspended'
  | 'asset_purchased'
  | 'review_submitted'
  | 'review_removed'
  | 'version_released'
  | 'asset_featured';

export interface MarketplaceEvent {
  type: MarketplaceEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface MarketplaceStats {
  totalAssets: number;
  publishedAssets: number;
  pendingReview: number;
  totalCreators: number;
  totalDownloads: number;
  totalPurchases: number;
  totalRevenue: number;
  creatorRevenue: number;
  platformRevenue: number;
  averageRating: number;
  assetsByType: Record<AssetType, number>;
}

// ============================================================================
// Service
// ============================================================================

export class MarketplaceService {
  private readonly config: Required<MarketplaceServiceConfig>;
  private assets: Map<string, AssetRecord> = new Map();
  private purchases: Map<string, PurchaseRecord[]> = new Map(); // buyerId → purchases
  private moderations: Map<string, ModerationRecord[]> = new Map(); // assetId → moderations
  private running = false;
  private listeners: Array<(event: MarketplaceEvent) => void> = [];
  private idCounter = 0;

  constructor(config: MarketplaceServiceConfig = {}) {
    this.config = {
      revenueSplitPercent: config.revenueSplitPercent ?? 70,
      maxAssetsPerCreator: config.maxAssetsPerCreator ?? 500,
      maxTagsPerAsset: config.maxTagsPerAsset ?? 15,
      maxReviewsPerUserPerAsset: config.maxReviewsPerUserPerAsset ?? 1,
      minPrice: config.minPrice ?? 0.99,
      maxPrice: config.maxPrice ?? 9999,
      autoPublishOnApproval: config.autoPublishOnApproval ?? true,
      maxFileSizeMB: config.maxFileSizeMB ?? 500,
      maxVersionsPerAsset: config.maxVersionsPerAsset ?? 100,
    };
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  onEvent(listener: (event: MarketplaceEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(type: MarketplaceEventType, data: Record<string, unknown>): void {
    const event: MarketplaceEvent = { type, timestamp: Date.now(), data };
    for (const l of this.listeners) {
      try { l(event); } catch { /* swallow listener errors */ }
    }
  }

  private nextId(prefix: string): string {
    return `${prefix}_${++this.idCounter}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80);
  }

  // --------------------------------------------------------------------------
  // Asset Publishing
  // --------------------------------------------------------------------------

  publishAsset(opts: {
    creatorId: string;
    name: string;
    description: string;
    type: AssetType;
    license?: LicenseType;
    price?: number;
    tags?: string[];
    thumbnailUrl?: string;
    previewUrls?: string[];
    fileUrl?: string;
    fileSizeMB?: number;
    version?: string;
    changelog?: string;
    metadata?: Record<string, unknown>;
  }): AssetInfo {
    if (!this.running) throw new Error('Service not started');
    if (!opts.creatorId || !opts.creatorId.trim()) throw new Error('creatorId is required');
    if (!opts.name || !opts.name.trim()) throw new Error('Asset name is required');
    if (!opts.description || !opts.description.trim()) throw new Error('Asset description is required');

    // Creator limit
    const creatorCount = Array.from(this.assets.values()).filter(a => a.creatorId === opts.creatorId).length;
    if (creatorCount >= this.config.maxAssetsPerCreator) {
      throw new Error(`Creator has reached max assets (${this.config.maxAssetsPerCreator})`);
    }

    // Tag limit
    const tags = (opts.tags ?? []).slice(0, this.config.maxTagsPerAsset).map(t => t.toLowerCase().trim()).filter(Boolean);

    // Price validation
    const price = opts.price ?? 0;
    if (price < 0) throw new Error('Price cannot be negative');
    if (price > 0 && price < this.config.minPrice) throw new Error(`Minimum paid price is ${this.config.minPrice}`);
    if (price > this.config.maxPrice) throw new Error(`Maximum price is ${this.config.maxPrice}`);

    // File size validation
    const fileSizeMB = opts.fileSizeMB ?? 0;
    if (fileSizeMB > this.config.maxFileSizeMB) throw new Error(`Maximum file size is ${this.config.maxFileSizeMB}MB`);

    const id = this.nextId('asset');
    const now = Date.now();
    const version = opts.version ?? '1.0.0';
    const slug = this.slugify(opts.name);

    const record: AssetRecord = {
      id,
      creatorId: opts.creatorId.trim(),
      name: opts.name.trim(),
      slug,
      description: opts.description.trim(),
      type: opts.type,
      status: 'draft',
      license: opts.license ?? 'free',
      price,
      tags,
      thumbnailUrl: opts.thumbnailUrl,
      previewUrls: opts.previewUrls ?? [],
      fileUrl: opts.fileUrl,
      fileSizeMB,
      currentVersion: version,
      versions: [{
        version,
        changelog: opts.changelog ?? 'Initial release',
        fileUrl: opts.fileUrl,
        fileSizeMB,
        createdAt: now,
      }],
      downloads: 0,
      purchases: 0,
      revenue: 0,
      reviews: [],
      averageRating: 0,
      ratingCount: 0,
      featured: false,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      metadata: opts.metadata,
    };

    this.assets.set(id, record);
    return this.toAssetInfo(record);
  }

  getAsset(assetId: string): AssetInfo | undefined {
    const a = this.assets.get(assetId);
    return a ? this.toAssetInfo(a) : undefined;
  }

  updateAsset(assetId: string, updates: {
    name?: string;
    description?: string;
    tags?: string[];
    price?: number;
    license?: LicenseType;
    thumbnailUrl?: string;
    previewUrls?: string[];
  }): AssetInfo {
    if (!this.running) throw new Error('Service not started');
    const a = this.assets.get(assetId);
    if (!a) throw new Error(`Asset ${assetId} not found`);
    if (a.status === 'suspended') throw new Error('Cannot update a suspended asset');

    if (updates.name !== undefined) a.name = updates.name.trim();
    if (updates.description !== undefined) a.description = updates.description.trim();
    if (updates.tags !== undefined) a.tags = updates.tags.slice(0, this.config.maxTagsPerAsset).map(t => t.toLowerCase().trim()).filter(Boolean);
    if (updates.license !== undefined) a.license = updates.license;
    if (updates.thumbnailUrl !== undefined) a.thumbnailUrl = updates.thumbnailUrl;
    if (updates.previewUrls !== undefined) a.previewUrls = updates.previewUrls;

    if (updates.price !== undefined) {
      if (updates.price < 0) throw new Error('Price cannot be negative');
      if (updates.price > 0 && updates.price < this.config.minPrice) throw new Error(`Minimum paid price is ${this.config.minPrice}`);
      if (updates.price > this.config.maxPrice) throw new Error(`Maximum price is ${this.config.maxPrice}`);
      a.price = updates.price;
    }

    a.updatedAt = Date.now();
    this.emit('asset_updated', { assetId, creatorId: a.creatorId });
    return this.toAssetInfo(a);
  }

  deleteAsset(assetId: string): boolean {
    if (!this.running) throw new Error('Service not started');
    const a = this.assets.get(assetId);
    if (!a) return false;
    if (a.purchases > 0) throw new Error('Cannot delete asset with existing purchases');
    this.assets.delete(assetId);
    return true;
  }

  // --------------------------------------------------------------------------
  // Moderation / Approval
  // --------------------------------------------------------------------------

  submitForReview(assetId: string): AssetInfo {
    if (!this.running) throw new Error('Service not started');
    const a = this.assets.get(assetId);
    if (!a) throw new Error(`Asset ${assetId} not found`);
    if (a.status !== 'draft' && a.status !== 'rejected') {
      throw new Error(`Cannot submit asset in ${a.status} status for review`);
    }

    a.status = 'pending_review';
    a.updatedAt = Date.now();
    return this.toAssetInfo(a);
  }

  approveAsset(assetId: string, moderatorId: string, reason?: string): AssetInfo {
    if (!this.running) throw new Error('Service not started');
    const a = this.assets.get(assetId);
    if (!a) throw new Error(`Asset ${assetId} not found`);
    if (a.status !== 'pending_review') {
      throw new Error(`Cannot approve asset in ${a.status} status`);
    }

    const moderation: ModerationRecord = {
      id: this.nextId('mod'),
      assetId,
      moderatorId,
      verdict: 'approved',
      reason: reason ?? 'Approved',
      createdAt: Date.now(),
    };

    const mods = this.moderations.get(assetId) ?? [];
    mods.push(moderation);
    this.moderations.set(assetId, mods);

    a.status = this.config.autoPublishOnApproval ? 'published' : 'approved';
    if (a.status === 'published' && !a.publishedAt) {
      a.publishedAt = Date.now();
    }
    a.updatedAt = Date.now();

    this.emit('asset_approved', { assetId, moderatorId, creatorId: a.creatorId });
    if (a.status === 'published') {
      this.emit('asset_published', { assetId, name: a.name, type: a.type });
    }
    return this.toAssetInfo(a);
  }

  rejectAsset(assetId: string, moderatorId: string, reason: string): AssetInfo {
    if (!this.running) throw new Error('Service not started');
    const a = this.assets.get(assetId);
    if (!a) throw new Error(`Asset ${assetId} not found`);
    if (a.status !== 'pending_review') {
      throw new Error(`Cannot reject asset in ${a.status} status`);
    }

    const moderation: ModerationRecord = {
      id: this.nextId('mod'),
      assetId,
      moderatorId,
      verdict: 'rejected',
      reason,
      createdAt: Date.now(),
    };

    const mods = this.moderations.get(assetId) ?? [];
    mods.push(moderation);
    this.moderations.set(assetId, mods);

    a.status = 'rejected';
    a.updatedAt = Date.now();
    this.emit('asset_rejected', { assetId, moderatorId, reason });
    return this.toAssetInfo(a);
  }

  suspendAsset(assetId: string, reason: string): AssetInfo {
    if (!this.running) throw new Error('Service not started');
    const a = this.assets.get(assetId);
    if (!a) throw new Error(`Asset ${assetId} not found`);
    if (a.status === 'suspended') throw new Error('Asset already suspended');

    a.status = 'suspended';
    a.updatedAt = Date.now();
    this.emit('asset_suspended', { assetId, reason });
    return this.toAssetInfo(a);
  }

  // --------------------------------------------------------------------------
  // Purchasing
  // --------------------------------------------------------------------------

  purchaseAsset(assetId: string, buyerId: string): PurchaseInfo {
    if (!this.running) throw new Error('Service not started');
    const a = this.assets.get(assetId);
    if (!a) throw new Error(`Asset ${assetId} not found`);
    if (a.status !== 'published') throw new Error('Asset is not available for purchase');
    if (a.creatorId === buyerId) throw new Error('Cannot purchase your own asset');

    // Check for duplicate purchase
    const buyerPurchases = this.purchases.get(buyerId) ?? [];
    if (buyerPurchases.some(p => p.assetId === assetId)) {
      throw new Error('Asset already purchased');
    }

    const creatorShare = Math.round(a.price * (this.config.revenueSplitPercent / 100) * 100) / 100;
    const platformShare = Math.round((a.price - creatorShare) * 100) / 100;

    const purchase: PurchaseRecord = {
      id: this.nextId('purch'),
      assetId,
      buyerId,
      price: a.price,
      creatorShare,
      platformShare,
      version: a.currentVersion,
      createdAt: Date.now(),
    };

    buyerPurchases.push(purchase);
    this.purchases.set(buyerId, buyerPurchases);

    a.purchases++;
    a.downloads++;
    a.revenue += a.price;
    a.updatedAt = Date.now();

    this.emit('asset_purchased', {
      assetId,
      buyerId,
      creatorId: a.creatorId,
      price: a.price,
      creatorShare,
      platformShare,
    });

    return this.toPurchaseInfo(purchase);
  }

  downloadFreeAsset(assetId: string, userId: string): AssetInfo {
    if (!this.running) throw new Error('Service not started');
    const a = this.assets.get(assetId);
    if (!a) throw new Error(`Asset ${assetId} not found`);
    if (a.status !== 'published') throw new Error('Asset is not available');
    if (a.price > 0) throw new Error('This is a paid asset, use purchaseAsset');

    a.downloads++;
    a.updatedAt = Date.now();
    return this.toAssetInfo(a);
  }

  getUserPurchases(userId: string): PurchaseInfo[] {
    return (this.purchases.get(userId) ?? []).map(p => this.toPurchaseInfo(p));
  }

  hasUserPurchased(userId: string, assetId: string): boolean {
    return (this.purchases.get(userId) ?? []).some(p => p.assetId === assetId);
  }

  // --------------------------------------------------------------------------
  // Reviews
  // --------------------------------------------------------------------------

  submitReview(assetId: string, opts: {
    userId: string;
    rating: number;
    title: string;
    body: string;
  }): ReviewInfo {
    if (!this.running) throw new Error('Service not started');
    const a = this.assets.get(assetId);
    if (!a) throw new Error(`Asset ${assetId} not found`);
    if (a.status !== 'published') throw new Error('Can only review published assets');
    if (a.creatorId === opts.userId) throw new Error('Cannot review your own asset');

    if (opts.rating < 1 || opts.rating > 5) throw new Error('Rating must be 1-5');
    if (!opts.title.trim()) throw new Error('Review title is required');
    if (!opts.body.trim()) throw new Error('Review body is required');

    // Check duplicate
    const existing = a.reviews.filter(r => r.userId === opts.userId);
    if (existing.length >= this.config.maxReviewsPerUserPerAsset) {
      throw new Error('You have already reviewed this asset');
    }

    const review: ReviewRecord = {
      id: this.nextId('rev'),
      assetId,
      userId: opts.userId,
      rating: Math.round(opts.rating),
      title: opts.title.trim(),
      body: opts.body.trim(),
      helpful: 0,
      reported: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    a.reviews.push(review);
    this.recalculateRating(a);
    a.updatedAt = Date.now();

    this.emit('review_submitted', { assetId, reviewId: review.id, rating: review.rating });
    return this.toReviewInfo(review);
  }

  getReviews(assetId: string): ReviewInfo[] {
    const a = this.assets.get(assetId);
    if (!a) throw new Error(`Asset ${assetId} not found`);
    return a.reviews.map(r => this.toReviewInfo(r));
  }

  markReviewHelpful(assetId: string, reviewId: string): ReviewInfo {
    if (!this.running) throw new Error('Service not started');
    const a = this.assets.get(assetId);
    if (!a) throw new Error(`Asset ${assetId} not found`);
    const review = a.reviews.find(r => r.id === reviewId);
    if (!review) throw new Error(`Review ${reviewId} not found`);
    review.helpful++;
    return this.toReviewInfo(review);
  }

  removeReview(assetId: string, reviewId: string): boolean {
    if (!this.running) throw new Error('Service not started');
    const a = this.assets.get(assetId);
    if (!a) return false;
    const idx = a.reviews.findIndex(r => r.id === reviewId);
    if (idx === -1) return false;
    a.reviews.splice(idx, 1);
    this.recalculateRating(a);
    this.emit('review_removed', { assetId, reviewId });
    return true;
  }

  private recalculateRating(a: AssetRecord): void {
    if (a.reviews.length === 0) {
      a.averageRating = 0;
      a.ratingCount = 0;
      return;
    }
    const total = a.reviews.reduce((sum, r) => sum + r.rating, 0);
    a.averageRating = Math.round((total / a.reviews.length) * 100) / 100;
    a.ratingCount = a.reviews.length;
  }

  // --------------------------------------------------------------------------
  // Versioning
  // --------------------------------------------------------------------------

  releaseVersion(assetId: string, opts: {
    version: string;
    changelog: string;
    fileUrl?: string;
    fileSizeMB?: number;
  }): AssetInfo {
    if (!this.running) throw new Error('Service not started');
    const a = this.assets.get(assetId);
    if (!a) throw new Error(`Asset ${assetId} not found`);
    if (a.versions.length >= this.config.maxVersionsPerAsset) {
      throw new Error(`Maximum versions reached (${this.config.maxVersionsPerAsset})`);
    }

    // Ensure version doesn't already exist
    if (a.versions.some(v => v.version === opts.version)) {
      throw new Error(`Version ${opts.version} already exists`);
    }

    const version: AssetVersion = {
      version: opts.version,
      changelog: opts.changelog,
      fileUrl: opts.fileUrl ?? a.fileUrl,
      fileSizeMB: opts.fileSizeMB ?? a.fileSizeMB,
      createdAt: Date.now(),
    };

    a.versions.push(version);
    a.currentVersion = opts.version;
    if (opts.fileUrl) a.fileUrl = opts.fileUrl;
    if (opts.fileSizeMB !== undefined) a.fileSizeMB = opts.fileSizeMB;
    a.updatedAt = Date.now();

    this.emit('version_released', { assetId, version: opts.version });
    return this.toAssetInfo(a);
  }

  getVersions(assetId: string): AssetVersion[] {
    const a = this.assets.get(assetId);
    if (!a) throw new Error(`Asset ${assetId} not found`);
    return [...a.versions];
  }

  // --------------------------------------------------------------------------
  // Search
  // --------------------------------------------------------------------------

  search(query: SearchQuery = {}): SearchResult {
    let results = Array.from(this.assets.values());

    // Status filter (default to published for store browsing)
    if (query.status) {
      results = results.filter(a => a.status === query.status);
    } else if (!query.creatorId) {
      results = results.filter(a => a.status === 'published');
    }

    // Creator filter
    if (query.creatorId) {
      results = results.filter(a => a.creatorId === query.creatorId);
    }

    // Type filter
    if (query.type) {
      results = results.filter(a => a.type === query.type);
    }

    // License filter
    if (query.license) {
      results = results.filter(a => a.license === query.license);
    }

    // Tags filter (any match)
    if (query.tags && query.tags.length > 0) {
      const searchTags = query.tags.map(t => t.toLowerCase());
      results = results.filter(a => a.tags.some(t => searchTags.includes(t)));
    }

    // Price range
    if (query.minPrice !== undefined) {
      results = results.filter(a => a.price >= query.minPrice!);
    }
    if (query.maxPrice !== undefined) {
      results = results.filter(a => a.price <= query.maxPrice!);
    }

    // Rating filter
    if (query.minRating !== undefined) {
      results = results.filter(a => a.averageRating >= query.minRating!);
    }

    // Text search
    if (query.query) {
      const q = query.query.toLowerCase();
      results = results.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some(t => t.includes(q))
      );
    }

    // Sort
    switch (query.sort) {
      case 'popular':
        results.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'rating':
        results.sort((a, b) => b.averageRating - a.averageRating);
        break;
      case 'price_asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'downloads':
        results.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'newest':
      default:
        results.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    const total = results.length;
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const paged = results.slice(offset, offset + limit);

    return {
      assets: paged.map(a => this.toAssetInfo(a)),
      total,
      limit,
      offset,
    };
  }

  // --------------------------------------------------------------------------
  // Featured
  // --------------------------------------------------------------------------

  featureAsset(assetId: string): AssetInfo {
    if (!this.running) throw new Error('Service not started');
    const a = this.assets.get(assetId);
    if (!a) throw new Error(`Asset ${assetId} not found`);
    a.featured = true;
    a.updatedAt = Date.now();
    this.emit('asset_featured', { assetId, name: a.name });
    return this.toAssetInfo(a);
  }

  unfeatureAsset(assetId: string): AssetInfo {
    if (!this.running) throw new Error('Service not started');
    const a = this.assets.get(assetId);
    if (!a) throw new Error(`Asset ${assetId} not found`);
    a.featured = false;
    a.updatedAt = Date.now();
    return this.toAssetInfo(a);
  }

  getFeaturedAssets(limit = 10): AssetInfo[] {
    return Array.from(this.assets.values())
      .filter(a => a.featured && a.status === 'published')
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit)
      .map(a => this.toAssetInfo(a));
  }

  // --------------------------------------------------------------------------
  // Creator Analytics
  // --------------------------------------------------------------------------

  getCreatorAssets(creatorId: string): AssetInfo[] {
    return Array.from(this.assets.values())
      .filter(a => a.creatorId === creatorId)
      .map(a => this.toAssetInfo(a));
  }

  getCreatorRevenue(creatorId: string): { total: number; byAsset: Array<{ assetId: string; name: string; revenue: number }> } {
    const assets = Array.from(this.assets.values()).filter(a => a.creatorId === creatorId);
    let total = 0;
    const byAsset: Array<{ assetId: string; name: string; revenue: number }> = [];

    for (const a of assets) {
      const creatorRev = Math.round(a.revenue * (this.config.revenueSplitPercent / 100) * 100) / 100;
      total += creatorRev;
      if (a.revenue > 0) {
        byAsset.push({ assetId: a.id, name: a.name, revenue: creatorRev });
      }
    }

    return { total: Math.round(total * 100) / 100, byAsset };
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  getStats(): MarketplaceStats {
    const assets = Array.from(this.assets.values());
    const creators = new Set(assets.map(a => a.creatorId));
    let totalDownloads = 0;
    let totalPurchases = 0;
    let totalRevenue = 0;
    let totalRating = 0;
    let ratedCount = 0;
    const byType: Record<string, number> = {};

    for (const a of assets) {
      totalDownloads += a.downloads;
      totalPurchases += a.purchases;
      totalRevenue += a.revenue;
      if (a.averageRating > 0) {
        totalRating += a.averageRating;
        ratedCount++;
      }
      byType[a.type] = (byType[a.type] ?? 0) + 1;
    }

    const creatorRevenue = Math.round(totalRevenue * (this.config.revenueSplitPercent / 100) * 100) / 100;
    const platformRevenue = Math.round((totalRevenue - creatorRevenue) * 100) / 100;

    return {
      totalAssets: assets.length,
      publishedAssets: assets.filter(a => a.status === 'published').length,
      pendingReview: assets.filter(a => a.status === 'pending_review').length,
      totalCreators: creators.size,
      totalDownloads,
      totalPurchases,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      creatorRevenue,
      platformRevenue,
      averageRating: ratedCount > 0 ? Math.round((totalRating / ratedCount) * 100) / 100 : 0,
      assetsByType: byType as Record<AssetType, number>,
    };
  }

  // --------------------------------------------------------------------------
  // DTO Converters
  // --------------------------------------------------------------------------

  private toAssetInfo(a: AssetRecord): AssetInfo {
    return {
      id: a.id,
      creatorId: a.creatorId,
      name: a.name,
      slug: a.slug,
      description: a.description,
      type: a.type,
      status: a.status,
      license: a.license,
      price: a.price,
      tags: [...a.tags],
      thumbnailUrl: a.thumbnailUrl,
      previewUrls: [...a.previewUrls],
      currentVersion: a.currentVersion,
      versionCount: a.versions.length,
      downloads: a.downloads,
      purchases: a.purchases,
      revenue: a.revenue,
      averageRating: a.averageRating,
      ratingCount: a.ratingCount,
      featured: a.featured,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      publishedAt: a.publishedAt,
    };
  }

  private toReviewInfo(r: ReviewRecord): ReviewInfo {
    return {
      id: r.id,
      assetId: r.assetId,
      userId: r.userId,
      rating: r.rating,
      title: r.title,
      body: r.body,
      helpful: r.helpful,
      createdAt: r.createdAt,
    };
  }

  private toPurchaseInfo(p: PurchaseRecord): PurchaseInfo {
    return {
      id: p.id,
      assetId: p.assetId,
      buyerId: p.buyerId,
      price: p.price,
      version: p.version,
      createdAt: p.createdAt,
    };
  }
}
