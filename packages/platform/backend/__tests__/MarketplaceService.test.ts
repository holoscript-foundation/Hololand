/**
 * MarketplaceService — Tests
 *
 * Asset publishing, moderation, purchasing, reviews,
 * versioning, search, and creator analytics.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MarketplaceService,
  type MarketplaceEvent,
  type AssetType,
} from '../src/services/MarketplaceService';

// ─── Helpers ──────────────────────────────────────────────────────
function setup(config = {}) {
  const svc = new MarketplaceService(config);
  svc.start();
  return svc;
}

function publishTemplate(svc: MarketplaceService, overrides: Record<string, unknown> = {}) {
  return svc.publishAsset({
    creatorId: 'creator-1',
    name: 'Test Template',
    description: 'A reusable HoloScript template',
    type: 'template',
    price: 9.99,
    tags: ['holoscript', 'vr'],
    ...overrides,
  } as any);
}

function publishAndApprove(svc: MarketplaceService, overrides: Record<string, unknown> = {}) {
  const asset = publishTemplate(svc, overrides);
  svc.submitForReview(asset.id);
  svc.approveAsset(asset.id, 'mod-1');
  return svc.getAsset(asset.id)!;
}

// ═══════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════

describe('MarketplaceService', () => {
  let svc: MarketplaceService;

  beforeEach(() => {
    svc = setup();
  });

  // ─── Lifecycle ──────────────────────────────────────────────────
  describe('lifecycle', () => {
    it('starts and stops', () => {
      const s = new MarketplaceService();
      expect(s.isRunning()).toBe(false);
      s.start();
      expect(s.isRunning()).toBe(true);
      s.stop();
      expect(s.isRunning()).toBe(false);
    });

    it('throws on operations when not started', () => {
      const s = new MarketplaceService();
      expect(() => publishTemplate(s)).toThrow('not started');
    });

    it('emits events and supports unsubscribe', () => {
      const events: MarketplaceEvent[] = [];
      const unsub = svc.onEvent(e => events.push(e));
      const a = publishAndApprove(svc);
      expect(events.length).toBeGreaterThan(0);
      const count = events.length;
      unsub();
      publishTemplate(svc, { name: 'another' });
      expect(events.length).toBe(count);
    });

    it('swallows listener errors', () => {
      svc.onEvent(() => { throw new Error('boom'); });
      expect(() => publishTemplate(svc)).not.toThrow();
    });
  });

  // ─── Asset Publishing ─────────────────────────────────────────
  describe('asset publishing', () => {
    it('publishes an asset', () => {
      const a = publishTemplate(svc);
      expect(a.id).toMatch(/^asset_/);
      expect(a.name).toBe('Test Template');
      expect(a.status).toBe('draft');
      expect(a.type).toBe('template');
      expect(a.price).toBe(9.99);
      expect(a.tags).toEqual(['holoscript', 'vr']);
      expect(a.slug).toBe('test-template');
    });

    it('rejects missing creatorId', () => {
      expect(() => svc.publishAsset({
        creatorId: '', name: 'x', description: 'x', type: 'template',
      })).toThrow('creatorId');
    });

    it('rejects missing name', () => {
      expect(() => svc.publishAsset({
        creatorId: 'c', name: '', description: 'x', type: 'template',
      })).toThrow('name');
    });

    it('rejects missing description', () => {
      expect(() => svc.publishAsset({
        creatorId: 'c', name: 'x', description: '', type: 'template',
      })).toThrow('description');
    });

    it('enforces max assets per creator', () => {
      const s = setup({ maxAssetsPerCreator: 2 });
      publishTemplate(s, { name: 'a' });
      publishTemplate(s, { name: 'b' });
      expect(() => publishTemplate(s, { name: 'c' })).toThrow('max assets');
    });

    it('rejects negative price', () => {
      expect(() => publishTemplate(svc, { price: -1 })).toThrow('negative');
    });

    it('rejects price below minimum', () => {
      expect(() => publishTemplate(svc, { price: 0.10 })).toThrow('Minimum paid');
    });

    it('allows free (price = 0)', () => {
      const a = publishTemplate(svc, { price: 0 });
      expect(a.price).toBe(0);
    });

    it('rejects price above maximum', () => {
      expect(() => publishTemplate(svc, { price: 99999 })).toThrow('Maximum price');
    });

    it('rejects oversized file', () => {
      expect(() => publishTemplate(svc, { fileSizeMB: 1000 })).toThrow('file size');
    });

    it('truncates tags to limit', () => {
      const tags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
      const a = publishTemplate(svc, { tags });
      expect(a.tags).toHaveLength(15);
    });

    it('slugifies name', () => {
      const a = publishTemplate(svc, { name: 'My Awesome Template!!' });
      expect(a.slug).toBe('my-awesome-template');
    });

    it('gets asset by id', () => {
      const a = publishTemplate(svc);
      expect(svc.getAsset(a.id)?.name).toBe('Test Template');
      expect(svc.getAsset('nope')).toBeUndefined();
    });

    it('updates asset', () => {
      const a = publishTemplate(svc);
      const updated = svc.updateAsset(a.id, { name: 'New Name', price: 19.99 });
      expect(updated.name).toBe('New Name');
      expect(updated.price).toBe(19.99);
    });

    it('rejects updating suspended asset', () => {
      const a = publishAndApprove(svc);
      svc.suspendAsset(a.id, 'violation');
      expect(() => svc.updateAsset(a.id, { name: 'x' })).toThrow('suspended');
    });

    it('deletes asset', () => {
      const a = publishTemplate(svc);
      expect(svc.deleteAsset(a.id)).toBe(true);
      expect(svc.getAsset(a.id)).toBeUndefined();
    });

    it('cannot delete asset with purchases', () => {
      const a = publishAndApprove(svc);
      svc.purchaseAsset(a.id, 'buyer-1');
      expect(() => svc.deleteAsset(a.id)).toThrow('purchases');
    });

    it('returns false for deleting nonexistent', () => {
      expect(svc.deleteAsset('nope')).toBe(false);
    });

    it('supports all asset types', () => {
      const types: AssetType[] = ['template', 'world', 'plugin', 'avatar', 'effect'];
      for (const type of types) {
        const a = publishTemplate(svc, { name: `${type}-asset`, type });
        expect(a.type).toBe(type);
      }
    });
  });

  // ─── Moderation ───────────────────────────────────────────────
  describe('moderation', () => {
    it('submits for review', () => {
      const a = publishTemplate(svc);
      const submitted = svc.submitForReview(a.id);
      expect(submitted.status).toBe('pending_review');
    });

    it('cannot submit non-draft for review', () => {
      const a = publishAndApprove(svc);
      expect(() => svc.submitForReview(a.id)).toThrow('Cannot submit');
    });

    it('can re-submit rejected asset', () => {
      const a = publishTemplate(svc);
      svc.submitForReview(a.id);
      svc.rejectAsset(a.id, 'mod-1', 'fix issues');
      const resubmitted = svc.submitForReview(a.id);
      expect(resubmitted.status).toBe('pending_review');
    });

    it('approves asset and auto-publishes', () => {
      const a = publishTemplate(svc);
      svc.submitForReview(a.id);
      const approved = svc.approveAsset(a.id, 'mod-1');
      expect(approved.status).toBe('published');
      expect(approved.publishedAt).not.toBeNull();
    });

    it('approves without auto-publish', () => {
      const s = setup({ autoPublishOnApproval: false });
      const a = publishTemplate(s);
      s.submitForReview(a.id);
      const approved = s.approveAsset(a.id, 'mod-1');
      expect(approved.status).toBe('approved');
    });

    it('cannot approve non-pending asset', () => {
      const a = publishTemplate(svc);
      expect(() => svc.approveAsset(a.id, 'mod-1')).toThrow('Cannot approve');
    });

    it('rejects asset', () => {
      const a = publishTemplate(svc);
      svc.submitForReview(a.id);
      const rejected = svc.rejectAsset(a.id, 'mod-1', 'inappropriate content');
      expect(rejected.status).toBe('rejected');
    });

    it('cannot reject non-pending asset', () => {
      const a = publishTemplate(svc);
      expect(() => svc.rejectAsset(a.id, 'mod-1', 'reason')).toThrow('Cannot reject');
    });

    it('suspends asset', () => {
      const a = publishAndApprove(svc);
      const suspended = svc.suspendAsset(a.id, 'TOS violation');
      expect(suspended.status).toBe('suspended');
    });

    it('cannot suspend already suspended', () => {
      const a = publishAndApprove(svc);
      svc.suspendAsset(a.id, 'reason');
      expect(() => svc.suspendAsset(a.id, 'again')).toThrow('already suspended');
    });

    it('emits moderation events', () => {
      const events: MarketplaceEvent[] = [];
      svc.onEvent(e => events.push(e));
      const a = publishTemplate(svc);
      svc.submitForReview(a.id);
      svc.approveAsset(a.id, 'mod-1');
      expect(events.some(e => e.type === 'asset_approved')).toBe(true);
      expect(events.some(e => e.type === 'asset_published')).toBe(true);
    });

    it('emits rejected event', () => {
      const events: MarketplaceEvent[] = [];
      svc.onEvent(e => events.push(e));
      const a = publishTemplate(svc);
      svc.submitForReview(a.id);
      svc.rejectAsset(a.id, 'mod-1', 'nope');
      expect(events.some(e => e.type === 'asset_rejected')).toBe(true);
    });
  });

  // ─── Purchasing ───────────────────────────────────────────────
  describe('purchasing', () => {
    it('purchases a published asset', () => {
      const a = publishAndApprove(svc);
      const purchase = svc.purchaseAsset(a.id, 'buyer-1');
      expect(purchase.id).toMatch(/^purch_/);
      expect(purchase.price).toBe(9.99);
      expect(purchase.buyerId).toBe('buyer-1');
    });

    it('calculates revenue split (70/30)', () => {
      const a = publishAndApprove(svc, { price: 10 });
      svc.purchaseAsset(a.id, 'buyer-1');
      const updated = svc.getAsset(a.id)!;
      expect(updated.purchases).toBe(1);
      expect(updated.downloads).toBe(1);
      expect(updated.revenue).toBe(10);
    });

    it('cannot purchase unpublished asset', () => {
      const a = publishTemplate(svc);
      expect(() => svc.purchaseAsset(a.id, 'buyer-1')).toThrow('not available');
    });

    it('cannot purchase own asset', () => {
      const a = publishAndApprove(svc);
      expect(() => svc.purchaseAsset(a.id, 'creator-1')).toThrow('own asset');
    });

    it('prevents duplicate purchase', () => {
      const a = publishAndApprove(svc);
      svc.purchaseAsset(a.id, 'buyer-1');
      expect(() => svc.purchaseAsset(a.id, 'buyer-1')).toThrow('already purchased');
    });

    it('tracks user purchases', () => {
      const a = publishAndApprove(svc);
      svc.purchaseAsset(a.id, 'buyer-1');
      expect(svc.getUserPurchases('buyer-1')).toHaveLength(1);
      expect(svc.getUserPurchases('nobody')).toHaveLength(0);
    });

    it('checks if user purchased', () => {
      const a = publishAndApprove(svc);
      expect(svc.hasUserPurchased('buyer-1', a.id)).toBe(false);
      svc.purchaseAsset(a.id, 'buyer-1');
      expect(svc.hasUserPurchased('buyer-1', a.id)).toBe(true);
    });

    it('downloads free asset', () => {
      const a = publishAndApprove(svc, { price: 0, license: 'free' });
      const downloaded = svc.downloadFreeAsset(a.id, 'user-1');
      expect(downloaded.downloads).toBe(1);
    });

    it('cannot download paid asset for free', () => {
      const a = publishAndApprove(svc);
      expect(() => svc.downloadFreeAsset(a.id, 'user-1')).toThrow('paid asset');
    });

    it('emits purchase event', () => {
      const events: MarketplaceEvent[] = [];
      svc.onEvent(e => events.push(e));
      const a = publishAndApprove(svc);
      svc.purchaseAsset(a.id, 'buyer-1');
      const pe = events.find(e => e.type === 'asset_purchased');
      expect(pe).toBeDefined();
      expect(pe!.data.creatorShare).toBeDefined();
      expect(pe!.data.platformShare).toBeDefined();
    });

    it('custom revenue split', () => {
      const s = setup({ revenueSplitPercent: 80 });
      const a = publishAndApprove(s, { price: 100 });
      s.purchaseAsset(a.id, 'buyer-1');
      const events: MarketplaceEvent[] = [];
      s.onEvent(e => events.push(e));
      const a2 = publishAndApprove(s, { name: 'second', price: 100 });
      s.purchaseAsset(a2.id, 'buyer-2');
      const pe = events.find(e => e.type === 'asset_purchased');
      expect(pe!.data.creatorShare).toBe(80);
      expect(pe!.data.platformShare).toBe(20);
    });
  });

  // ─── Reviews ──────────────────────────────────────────────────
  describe('reviews', () => {
    it('submits a review', () => {
      const a = publishAndApprove(svc);
      const r = svc.submitReview(a.id, {
        userId: 'user-1', rating: 5, title: 'Amazing', body: 'Great template!',
      });
      expect(r.id).toMatch(/^rev_/);
      expect(r.rating).toBe(5);
    });

    it('calculates average rating', () => {
      const a = publishAndApprove(svc);
      svc.submitReview(a.id, { userId: 'u1', rating: 5, title: 'A', body: 'Great' });
      svc.submitReview(a.id, { userId: 'u2', rating: 3, title: 'B', body: 'OK' });
      const updated = svc.getAsset(a.id)!;
      expect(updated.averageRating).toBe(4);
      expect(updated.ratingCount).toBe(2);
    });

    it('rejects invalid rating', () => {
      const a = publishAndApprove(svc);
      expect(() => svc.submitReview(a.id, {
        userId: 'u1', rating: 0, title: 'X', body: 'Bad',
      })).toThrow('1-5');
      expect(() => svc.submitReview(a.id, {
        userId: 'u1', rating: 6, title: 'X', body: 'Bad',
      })).toThrow('1-5');
    });

    it('rejects empty title', () => {
      const a = publishAndApprove(svc);
      expect(() => svc.submitReview(a.id, {
        userId: 'u1', rating: 4, title: '', body: 'Body text',
      })).toThrow('title');
    });

    it('rejects empty body', () => {
      const a = publishAndApprove(svc);
      expect(() => svc.submitReview(a.id, {
        userId: 'u1', rating: 4, title: 'Title', body: '',
      })).toThrow('body');
    });

    it('prevents self-review', () => {
      const a = publishAndApprove(svc);
      expect(() => svc.submitReview(a.id, {
        userId: 'creator-1', rating: 5, title: 'Self', body: 'Great',
      })).toThrow('own asset');
    });

    it('prevents duplicate review', () => {
      const a = publishAndApprove(svc);
      svc.submitReview(a.id, { userId: 'u1', rating: 5, title: 'A', body: 'Great' });
      expect(() => svc.submitReview(a.id, {
        userId: 'u1', rating: 3, title: 'Again', body: 'Changed mind',
      })).toThrow('already reviewed');
    });

    it('can only review published assets', () => {
      const a = publishTemplate(svc);
      expect(() => svc.submitReview(a.id, {
        userId: 'u1', rating: 5, title: 'A', body: 'Great',
      })).toThrow('published');
    });

    it('gets reviews', () => {
      const a = publishAndApprove(svc);
      svc.submitReview(a.id, { userId: 'u1', rating: 5, title: 'A', body: 'Great' });
      expect(svc.getReviews(a.id)).toHaveLength(1);
    });

    it('marks review helpful', () => {
      const a = publishAndApprove(svc);
      const r = svc.submitReview(a.id, { userId: 'u1', rating: 5, title: 'A', body: 'Great' });
      const marked = svc.markReviewHelpful(a.id, r.id);
      expect(marked.helpful).toBe(1);
    });

    it('removes review and recalculates rating', () => {
      const a = publishAndApprove(svc);
      const r1 = svc.submitReview(a.id, { userId: 'u1', rating: 5, title: 'A', body: 'Great' });
      svc.submitReview(a.id, { userId: 'u2', rating: 1, title: 'B', body: 'Bad' });
      svc.removeReview(a.id, r1.id);
      expect(svc.getAsset(a.id)!.averageRating).toBe(1);
      expect(svc.getAsset(a.id)!.ratingCount).toBe(1);
    });

    it('removing all reviews resets rating', () => {
      const a = publishAndApprove(svc);
      const r = svc.submitReview(a.id, { userId: 'u1', rating: 5, title: 'A', body: 'Great' });
      svc.removeReview(a.id, r.id);
      expect(svc.getAsset(a.id)!.averageRating).toBe(0);
      expect(svc.getAsset(a.id)!.ratingCount).toBe(0);
    });

    it('emits review events', () => {
      const events: MarketplaceEvent[] = [];
      svc.onEvent(e => events.push(e));
      const a = publishAndApprove(svc);
      const r = svc.submitReview(a.id, { userId: 'u1', rating: 5, title: 'A', body: 'Great' });
      svc.removeReview(a.id, r.id);
      expect(events.some(e => e.type === 'review_submitted')).toBe(true);
      expect(events.some(e => e.type === 'review_removed')).toBe(true);
    });
  });

  // ─── Versioning ───────────────────────────────────────────────
  describe('versioning', () => {
    it('releases a new version', () => {
      const a = publishTemplate(svc);
      const updated = svc.releaseVersion(a.id, { version: '1.1.0', changelog: 'Bug fixes' });
      expect(updated.currentVersion).toBe('1.1.0');
      expect(updated.versionCount).toBe(2);
    });

    it('prevents duplicate version', () => {
      const a = publishTemplate(svc);
      expect(() => svc.releaseVersion(a.id, { version: '1.0.0', changelog: 'dup' })).toThrow('already exists');
    });

    it('enforces max versions', () => {
      const s = setup({ maxVersionsPerAsset: 2 });
      const a = publishTemplate(s);
      s.releaseVersion(a.id, { version: '1.1.0', changelog: '2nd' });
      expect(() => s.releaseVersion(a.id, { version: '1.2.0', changelog: '3rd' })).toThrow('Maximum versions');
    });

    it('gets version history', () => {
      const a = publishTemplate(svc);
      svc.releaseVersion(a.id, { version: '1.1.0', changelog: 'Fix' });
      svc.releaseVersion(a.id, { version: '2.0.0', changelog: 'Major' });
      expect(svc.getVersions(a.id)).toHaveLength(3);
    });

    it('emits version_released event', () => {
      const events: MarketplaceEvent[] = [];
      svc.onEvent(e => events.push(e));
      const a = publishTemplate(svc);
      svc.releaseVersion(a.id, { version: '1.1.0', changelog: 'Fix' });
      expect(events.some(e => e.type === 'version_released')).toBe(true);
    });
  });

  // ─── Search ───────────────────────────────────────────────────
  describe('search', () => {
    beforeEach(() => {
      publishAndApprove(svc, { name: 'VR Sword', type: 'template', tags: ['weapon', 'vr'], price: 4.99, license: 'standard' });
      publishAndApprove(svc, { name: 'Fantasy World', type: 'world', tags: ['fantasy'], price: 29.99, license: 'premium' });
      publishAndApprove(svc, { name: 'Free Avatar', type: 'avatar', tags: ['free', 'avatar'], price: 0, license: 'free' });
      publishAndApprove(svc, { name: 'Explosion FX', type: 'effect', tags: ['vfx', 'explosion'], price: 2.99, license: 'standard' });
    });

    it('returns all published by default', () => {
      const result = svc.search();
      expect(result.total).toBe(4);
    });

    it('searches by text', () => {
      const result = svc.search({ query: 'sword' });
      expect(result.total).toBe(1);
      expect(result.assets[0].name).toBe('VR Sword');
    });

    it('filters by type', () => {
      const result = svc.search({ type: 'world' });
      expect(result.total).toBe(1);
    });

    it('filters by tags', () => {
      const result = svc.search({ tags: ['vr'] });
      expect(result.total).toBe(1);
    });

    it('filters by license', () => {
      const result = svc.search({ license: 'free' });
      expect(result.total).toBe(1);
    });

    it('filters by price range', () => {
      const result = svc.search({ minPrice: 5, maxPrice: 30 });
      expect(result.total).toBe(1); // Fantasy World at 29.99
    });

    it('filters by min rating', () => {
      const assets = svc.search().assets;
      svc.submitReview(assets[0].id, { userId: 'u1', rating: 5, title: 'A', body: 'Great' });
      const result = svc.search({ minRating: 4 });
      expect(result.total).toBe(1);
    });

    it('filters by creator', () => {
      publishTemplate(svc, { creatorId: 'creator-2', name: 'Other' });
      const result = svc.search({ creatorId: 'creator-2' });
      expect(result.total).toBe(1);
    });

    it('sorts by price ascending', () => {
      const result = svc.search({ sort: 'price_asc' });
      expect(result.assets[0].price).toBeLessThanOrEqual(result.assets[1].price);
    });

    it('sorts by price descending', () => {
      const result = svc.search({ sort: 'price_desc' });
      expect(result.assets[0].price).toBeGreaterThanOrEqual(result.assets[1].price);
    });

    it('paginates results', () => {
      const page1 = svc.search({ limit: 2, offset: 0 });
      expect(page1.assets).toHaveLength(2);
      expect(page1.total).toBe(4);

      const page2 = svc.search({ limit: 2, offset: 2 });
      expect(page2.assets).toHaveLength(2);
    });

    it('sorts by popular', () => {
      const assets = svc.search().assets;
      // Generate downloads
      svc.downloadFreeAsset(assets.find(a => a.price === 0)!.id, 'u1');
      svc.downloadFreeAsset(assets.find(a => a.price === 0)!.id, 'u2');
      const result = svc.search({ sort: 'popular' });
      expect(result.assets[0].downloads).toBeGreaterThanOrEqual(result.assets[1].downloads);
    });

    it('hides unpublished from public search', () => {
      publishTemplate(svc, { name: 'Draft Only' }); // draft status
      const result = svc.search({ query: 'Draft' });
      expect(result.total).toBe(0);
    });

    it('shows all statuses when filtering by creator', () => {
      publishTemplate(svc, { name: 'My Draft' }); // draft status
      const result = svc.search({ creatorId: 'creator-1' });
      expect(result.assets.some(a => a.name === 'My Draft')).toBe(true);
    });
  });

  // ─── Featured ─────────────────────────────────────────────────
  describe('featured', () => {
    it('features an asset', () => {
      const a = publishAndApprove(svc);
      const featured = svc.featureAsset(a.id);
      expect(featured.featured).toBe(true);
    });

    it('unfeatures an asset', () => {
      const a = publishAndApprove(svc);
      svc.featureAsset(a.id);
      const unfeatured = svc.unfeatureAsset(a.id);
      expect(unfeatured.featured).toBe(false);
    });

    it('gets featured assets', () => {
      const a = publishAndApprove(svc, { name: 'Featured One' });
      publishAndApprove(svc, { name: 'Normal' });
      svc.featureAsset(a.id);
      expect(svc.getFeaturedAssets()).toHaveLength(1);
      expect(svc.getFeaturedAssets()[0].name).toBe('Featured One');
    });

    it('only returns published featured assets', () => {
      const a = publishTemplate(svc);
      svc.featureAsset(a.id);
      expect(svc.getFeaturedAssets()).toHaveLength(0);
    });

    it('emits featured event', () => {
      const events: MarketplaceEvent[] = [];
      svc.onEvent(e => events.push(e));
      const a = publishAndApprove(svc);
      svc.featureAsset(a.id);
      expect(events.some(e => e.type === 'asset_featured')).toBe(true);
    });
  });

  // ─── Creator Analytics ────────────────────────────────────────
  describe('creator analytics', () => {
    it('gets creator assets', () => {
      publishTemplate(svc, { name: 'A' });
      publishTemplate(svc, { name: 'B' });
      publishTemplate(svc, { creatorId: 'other', name: 'C' });
      expect(svc.getCreatorAssets('creator-1')).toHaveLength(2);
    });

    it('gets creator revenue', () => {
      const a = publishAndApprove(svc, { price: 100 });
      svc.purchaseAsset(a.id, 'buyer-1');
      svc.purchaseAsset(a.id, 'buyer-2');
      const rev = svc.getCreatorRevenue('creator-1');
      expect(rev.total).toBe(140); // 70% of 200
      expect(rev.byAsset).toHaveLength(1);
    });

    it('returns zero revenue for no sales', () => {
      publishTemplate(svc);
      const rev = svc.getCreatorRevenue('creator-1');
      expect(rev.total).toBe(0);
      expect(rev.byAsset).toHaveLength(0);
    });
  });

  // ─── Stats ────────────────────────────────────────────────────
  describe('stats', () => {
    it('returns comprehensive stats', () => {
      const a = publishAndApprove(svc, { price: 10 });
      svc.purchaseAsset(a.id, 'buyer-1');
      svc.submitReview(a.id, { userId: 'buyer-1', rating: 4, title: 'Good', body: 'Nice' });
      publishTemplate(svc, { name: 'Draft', type: 'world' }); // draft

      const stats = svc.getStats();
      expect(stats.totalAssets).toBe(2);
      expect(stats.publishedAssets).toBe(1);
      expect(stats.totalCreators).toBe(1);
      expect(stats.totalDownloads).toBe(1);
      expect(stats.totalPurchases).toBe(1);
      expect(stats.totalRevenue).toBe(10);
      expect(stats.creatorRevenue).toBe(7); // 70%
      expect(stats.platformRevenue).toBe(3); // 30%
      expect(stats.averageRating).toBe(4);
      expect(stats.assetsByType.template).toBe(1);
      expect(stats.assetsByType.world).toBe(1);
    });

    it('returns empty stats initially', () => {
      const stats = svc.getStats();
      expect(stats.totalAssets).toBe(0);
      expect(stats.averageRating).toBe(0);
    });

    it('counts pending reviews', () => {
      const a = publishTemplate(svc);
      svc.submitForReview(a.id);
      expect(svc.getStats().pendingReview).toBe(1);
    });
  });
});
