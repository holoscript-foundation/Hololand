/**
 * WorldFeed — the sovereign consumer feed (WS-2 consume half)
 *
 * The "TikTok cell → feed" surface for non-developers: list shareable worlds and,
 * for any one, resolve an OPENABLE sovereign WebGPU link that a non-dev can tap to
 * view in the browser / VR, plus the share payload (QR + social card) to pass it on.
 *
 * Sovereign contract (verified live 2026-07-01):
 *   create_share_link(code) -> {
 *     playgroundUrl: "https://mcp.holoscript.net/scene/:id",   // openable, HTTP 200
 *     embedUrl:      "https://mcp.holoscript.net/embed/:id",   // openable, HTTP 200
 *     qrCode:        "data:image/png;base64,...",              // real PNG, generated server-side
 *     tweetText, cardMeta { og:*, twitter:* }
 *   }
 * The stored scene renders via the NATIVE WebGPU renderer (no Three.js) at /scene/:id.
 *
 * NOTE (consume-before-recreate): the legacy `SceneSharing` module targets the
 * non-sovereign `hololand.io/preview/[hash]` backend with a client FNV hash and a
 * Three.js standalone page. WorldFeed deliberately does NOT use it — the sovereign
 * pipe is `mcp.holoscript.net/scene/:id` via `create_share_link`. `SceneSharing`
 * is left untouched for its export/download helpers; superseding it is out of scope
 * for this slice.
 *
 * This module is data/service `.ts` (allowed). It authors NO render surface — the
 * perceivable world is the sovereign `/scene/:id` HTML the server @generates.
 */

import { STARTER_TEMPLATES, type SceneTemplate } from '../templates/TemplateGallery';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

/**
 * The subset of the live `create_share_link` response WorldFeed depends on.
 * Typed against the verified server contract (2026-07-01).
 */
export interface ShareLinkResult {
  /** Openable sovereign scene URL: https://mcp.holoscript.net/scene/:id */
  playgroundUrl: string;
  /** Openable sovereign embed URL: https://mcp.holoscript.net/embed/:id */
  embedUrl: string;
  /** Pre-composed share text for social posts */
  tweetText?: string;
  /** Real QR PNG data URL (server-generated) */
  qrCode?: string;
  /** OpenGraph / Twitter card metadata */
  cardMeta?: Record<string, string>;
}

/**
 * Resolves HoloScript code into an openable sovereign share link.
 *
 * In production this wraps the MCP tool `create_share_link` (or a POST to the
 * MCP server). It is injected so the feed logic is testable offline and the live
 * probe can supply the real network-backed resolver.
 */
export type ShareLinkResolver = (input: {
  code: string;
  title: string;
  description: string;
}) => Promise<ShareLinkResult>;

/** A world as it appears in the consumer feed. */
export interface FeedWorld {
  id: string;
  title: string;
  description: string;
  /** Source of the world: the server world store, or a bundled seed template. */
  source: 'store' | 'seed';
  /** HoloScript composition code used to (re)render the world. */
  code: string;
  /** Feed thumbnail (may be a placeholder SVG for seeds). */
  thumbnail?: string;
  tags: string[];
}

/** A feed world that has been resolved to an openable sovereign link. */
export interface OpenableWorld extends FeedWorld {
  /** Openable sovereign scene URL — this is what a non-dev taps to view. */
  sceneUrl: string;
  /** Openable sovereign embed URL. */
  embedUrl: string;
  /** Share payload for passing the world on. */
  share: {
    tweetText?: string;
    qrCode?: string;
    cardMeta?: Record<string, string>;
  };
}

/** Optional source of already-published worlds (server world store). */
export type StoreWorldLister = (opts: {
  limit: number;
  offset: number;
}) => Promise<FeedWorld[]>;

export interface WorldFeedConfig {
  /** Resolves world code -> openable sovereign link. Required. */
  resolveShareLink: ShareLinkResolver;
  /**
   * Optional server world-store lister (wraps `list_worlds`). When it returns
   * worlds they take priority; the bundled seed set backfills so the feed is
   * never empty for a non-dev on day one (the store is empty at launch).
   */
  listStoreWorlds?: StoreWorldLister;
}

// --------------------------------------------------------------------------
// Seed conversion
// --------------------------------------------------------------------------

/** Convert a bundled starter template into a feed world. */
export function seedTemplateToFeedWorld(t: SceneTemplate): FeedWorld {
  return {
    id: `seed:${t.id}`,
    title: t.name,
    description: t.description,
    source: 'seed',
    code: t.code,
    thumbnail: t.thumbnail,
    tags: t.tags,
  };
}

/** The default seed feed — real starter worlds, listable before any user publishes. */
export function seedFeedWorlds(): FeedWorld[] {
  return STARTER_TEMPLATES.map(seedTemplateToFeedWorld);
}

// --------------------------------------------------------------------------
// WorldFeed
// --------------------------------------------------------------------------

/**
 * WorldFeed — lists shareable worlds and resolves any one into an openable
 * sovereign link a non-developer can tap.
 */
export class WorldFeed {
  private readonly resolveShareLink: ShareLinkResolver;
  private readonly listStoreWorlds?: StoreWorldLister;

  constructor(config: WorldFeedConfig) {
    if (typeof config.resolveShareLink !== 'function') {
      // Fail loud at construction — a feed that cannot resolve an openable link
      // is not a feed. (F.076: broken wiring must fail, not silently degrade.)
      throw new Error('WorldFeed requires a resolveShareLink resolver');
    }
    this.resolveShareLink = config.resolveShareLink;
    this.listStoreWorlds = config.listStoreWorlds;
  }

  /**
   * List shareable worlds for the feed. Published store worlds first (if a
   * store lister is configured and returns any), then the bundled seed set as
   * backfill so a non-dev always has worlds to open.
   */
  async list(opts: { limit?: number; offset?: number } = {}): Promise<FeedWorld[]> {
    const limit = opts.limit ?? 24;
    const offset = opts.offset ?? 0;

    let storeWorlds: FeedWorld[] = [];
    if (this.listStoreWorlds) {
      try {
        storeWorlds = await this.listStoreWorlds({ limit, offset });
      } catch {
        // Store unreachable -> fall back to seeds rather than an empty feed.
        storeWorlds = [];
      }
    }

    const seeds = seedFeedWorlds();
    const seenIds = new Set(storeWorlds.map((w) => w.id));
    const combined = [...storeWorlds];
    for (const seed of seeds) {
      if (!seenIds.has(seed.id)) combined.push(seed);
    }

    return combined.slice(offset, offset + limit);
  }

  /**
   * Resolve a single feed world into an OPENABLE sovereign world — the core of
   * the consume loop. Throws if the resolver cannot produce an openable
   * `/scene/:id` URL (F.076: if the link can't be opened, this must fail).
   */
  async open(world: FeedWorld): Promise<OpenableWorld> {
    const link = await this.resolveShareLink({
      code: world.code,
      title: world.title,
      description: world.description,
    });

    const sceneUrl = link.playgroundUrl;
    if (!isOpenableSovereignSceneUrl(sceneUrl)) {
      throw new Error(
        `WorldFeed.open: resolver returned a non-openable scene URL for "${world.title}": ${String(sceneUrl)}`,
      );
    }

    return {
      ...world,
      sceneUrl,
      embedUrl: link.embedUrl,
      share: {
        tweetText: link.tweetText,
        qrCode: link.qrCode,
        cardMeta: link.cardMeta,
      },
    };
  }

  /**
   * Convenience: list worlds and resolve each to an openable link. This is the
   * full consume view a feed UI renders. Resolution failures for individual
   * worlds are surfaced in `errors` rather than aborting the whole feed.
   */
  async listOpenable(
    opts: { limit?: number; offset?: number } = {},
  ): Promise<{ worlds: OpenableWorld[]; errors: Array<{ id: string; error: string }> }> {
    const worlds = await this.list(opts);
    const openable: OpenableWorld[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const w of worlds) {
      try {
        openable.push(await this.open(w));
      } catch (err) {
        errors.push({ id: w.id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return { worlds: openable, errors };
  }
}

// --------------------------------------------------------------------------
// Contract guard
// --------------------------------------------------------------------------

/**
 * True only for an openable sovereign scene URL of the shape
 * `https://<host>/scene/:id`. This is the load-bearing check that separates a
 * real sovereign link from the legacy `hololand.io/preview/[hash]` client path.
 */
export function isOpenableSovereignSceneUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length === 0) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    // Sovereign scene route: /scene/:id (non-empty id, not the legacy /preview path).
    return /^\/scene\/[^/]+$/.test(u.pathname);
  } catch {
    return false;
  }
}
