/**
 * Tests for WorldFeed — the sovereign consumer feed (WS-2 consume half).
 *
 * These run offline with an injected resolver. The load-bearing guarantee under
 * test (F.076): the feed can LIST shareable worlds and RESOLVE each to an
 * openable sovereign `/scene/:id` link — and it FAILS when the link isn't openable.
 */

import { describe, it, expect } from 'vitest';
import {
  WorldFeed,
  seedFeedWorlds,
  isOpenableSovereignSceneUrl,
  type FeedWorld,
  type ShareLinkResolver,
} from '../WorldFeed';

// A resolver that mimics the live create_share_link contract (verified 2026-07-01).
const fakeSovereignResolver: ShareLinkResolver = async ({ title, description }) => {
  const id = Math.abs(hash(title)).toString(16).slice(0, 8);
  return {
    playgroundUrl: `https://mcp.holoscript.net/scene/${id}`,
    embedUrl: `https://mcp.holoscript.net/embed/${id}`,
    tweetText: `🎮 ${title}\n\n${description}\n\nhttps://mcp.holoscript.net/scene/${id}`,
    qrCode: 'data:image/png;base64,iVBORw0KGgo=',
    cardMeta: { 'og:title': title, 'og:url': `https://mcp.holoscript.net/embed/${id}` },
  };
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h;
}

describe('isOpenableSovereignSceneUrl', () => {
  it('accepts a sovereign /scene/:id url', () => {
    expect(isOpenableSovereignSceneUrl('https://mcp.holoscript.net/scene/2563ae25')).toBe(true);
  });

  it('rejects the legacy non-sovereign preview path', () => {
    expect(isOpenableSovereignSceneUrl('https://hololand.io/preview/abc123')).toBe(false);
  });

  it('rejects an empty scene id', () => {
    expect(isOpenableSovereignSceneUrl('https://mcp.holoscript.net/scene/')).toBe(false);
  });

  it('rejects non-urls and non-strings', () => {
    expect(isOpenableSovereignSceneUrl('not a url')).toBe(false);
    expect(isOpenableSovereignSceneUrl('')).toBe(false);
    expect(isOpenableSovereignSceneUrl(undefined)).toBe(false);
    expect(isOpenableSovereignSceneUrl(42)).toBe(false);
  });
});

describe('seedFeedWorlds', () => {
  it('yields the bundled starter worlds so the feed is never empty', () => {
    const seeds = seedFeedWorlds();
    expect(seeds.length).toBeGreaterThan(0);
    for (const w of seeds) {
      expect(w.source).toBe('seed');
      expect(w.id.startsWith('seed:')).toBe(true);
      expect(typeof w.code).toBe('string');
      expect(w.code.length).toBeGreaterThan(0);
    }
  });
});

describe('WorldFeed', () => {
  it('throws at construction without a resolver', () => {
    // @ts-expect-error — intentionally omitting the required resolver
    expect(() => new WorldFeed({})).toThrow(/resolveShareLink/);
  });

  it('lists seed worlds when the store is empty (verified live: total=0)', async () => {
    const feed = new WorldFeed({ resolveShareLink: fakeSovereignResolver });
    const worlds = await feed.list({ limit: 5 });
    expect(worlds.length).toBeGreaterThan(0);
    expect(worlds.length).toBeLessThanOrEqual(5);
  });

  it('prefers store worlds and backfills with seeds', async () => {
    const storeWorld: FeedWorld = {
      id: 'store:my-world',
      title: 'Published World',
      description: 'from the server world store',
      source: 'store',
      code: 'composition "Published" { object "A" { geometry: "cube" } }',
      tags: ['published'],
    };
    const feed = new WorldFeed({
      resolveShareLink: fakeSovereignResolver,
      listStoreWorlds: async () => [storeWorld],
    });
    const worlds = await feed.list({ limit: 10 });
    expect(worlds[0]?.source).toBe('store');
    expect(worlds.some((w) => w.source === 'seed')).toBe(true);
  });

  it('falls back to seeds when the store lister throws', async () => {
    const feed = new WorldFeed({
      resolveShareLink: fakeSovereignResolver,
      listStoreWorlds: async () => {
        throw new Error('store unreachable');
      },
    });
    const worlds = await feed.list({ limit: 3 });
    expect(worlds.length).toBeGreaterThan(0);
    expect(worlds.every((w) => w.source === 'seed')).toBe(true);
  });

  it('opens a world into an openable sovereign scene link', async () => {
    const feed = new WorldFeed({ resolveShareLink: fakeSovereignResolver });
    const [first] = await feed.list({ limit: 1 });
    const openable = await feed.open(first);
    expect(isOpenableSovereignSceneUrl(openable.sceneUrl)).toBe(true);
    expect(openable.embedUrl).toContain('/embed/');
    expect(openable.share.qrCode).toBeTruthy();
    expect(openable.share.tweetText).toContain(first.title);
  });

  it('FAILS to open when the resolver returns a non-openable (legacy) link', async () => {
    const legacyResolver: ShareLinkResolver = async () => ({
      playgroundUrl: 'https://hololand.io/preview/deadbeef',
      embedUrl: 'https://hololand.io/preview/deadbeef?embed=true',
    });
    const feed = new WorldFeed({ resolveShareLink: legacyResolver });
    const [first] = await feed.list({ limit: 1 });
    await expect(feed.open(first)).rejects.toThrow(/non-openable/);
  });

  it('listOpenable resolves every listed world to an openable link', async () => {
    const feed = new WorldFeed({ resolveShareLink: fakeSovereignResolver });
    const { worlds, errors } = await feed.listOpenable({ limit: 4 });
    expect(errors).toHaveLength(0);
    expect(worlds.length).toBeGreaterThan(0);
    for (const w of worlds) {
      expect(isOpenableSovereignSceneUrl(w.sceneUrl)).toBe(true);
    }
  });
});
