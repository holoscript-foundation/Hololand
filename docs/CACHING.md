# Caching

HoloLand has two cache surfaces. Pick the one whose source-of-truth file matches what you're storing.

| Surface | What it caches | Where it lives | Backing store |
|---|---|---|---|
| **Procedural asset cache** | Procedurally generated 3D assets (grass, tree, rock, terrain, texture, custom) keyed by deterministic generation params. | Server: [`platform/backend/src/cache/ProceduralAssetCache.ts`](../platform/backend/src/cache/ProceduralAssetCache.ts) + [`routes/procedural-cache.routes.ts`](../platform/backend/src/routes/procedural-cache.routes.ts). Client: [`packages/platform/world/src/procedural/ProceduralAssetGenerator.ts`](../packages/platform/world/src/procedural/ProceduralAssetGenerator.ts). | Redis (server) via [`platform/backend/src/cache/redis.ts`](../platform/backend/src/cache/redis.ts). |
| **Streaming asset cache** | In-process streamed assets (chunks, glTF, textures) with eviction + memory budget. | [`@holoscript/streaming`](../packages/platform/streaming/) — `MemoryCache`, `IndexedDBCache`, `CacheManager`, `MemoryBudgetMonitor` exported from [`src/index.ts`](../packages/platform/streaming/src/index.ts). | In-memory + IndexedDB. |

> **Numbers (TTLs, sizes, hit-rate targets) live in the source files referenced above.** This doc does not pin them — they will drift.

## Status

Alive. The procedural cache is the production caching path for procedurally generated worlds; the streaming cache is the runtime path for asset chunk loading. Listed in the 2026-05-07 [should-exist audit](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) under platform runtime.

---

## Procedural asset cache

### Modules

| Module | Source-of-truth file | Role |
|---|---|---|
| Server cache | [`ProceduralAssetCache.ts`](../platform/backend/src/cache/ProceduralAssetCache.ts) | SHA-256 semantic key, Redis storage, hit-counter, metrics, TTL config. |
| Redis client | [`platform/backend/src/cache/redis.ts`](../platform/backend/src/cache/redis.ts) | Connection lifecycle. |
| HTTP routes | [`procedural-cache.routes.ts`](../platform/backend/src/routes/procedural-cache.routes.ts) | `POST /api/procedural/cache/get`, `POST /set`, `DELETE /clear`, `GET /metrics`. |
| Client generator | [`ProceduralAssetGenerator.ts`](../packages/platform/world/src/procedural/ProceduralAssetGenerator.ts) | Wraps generation, calls cache transparently, returns `{ data, fromCache, generationTimeMs, metadata }`. |
| Tests | [`ProceduralAssetCache.test.ts`](../platform/backend/src/cache/ProceduralAssetCache.test.ts) | Verify against this for current behaviour. |

### Key generation

Cache keys are deterministic SHA-256 hashes of `ProceduralAssetParams`:

```ts
interface ProceduralAssetParams {
  type: 'grass' | 'tree' | 'rock' | 'terrain' | 'texture' | 'custom';
  seed: number;
  noiseFunction?: 'perlin' | 'simplex' | 'voronoi' | 'fbm';
  resolution: 'low' | 'medium' | 'high';
  params?: Record<string, any>;
}
```

Key prefix and per-type generation-time table are constants in [`ProceduralAssetCache.ts`](../platform/backend/src/cache/ProceduralAssetCache.ts) — read those rather than repeating values here.

### Client usage

```ts
import { proceduralAssetGenerator } from '@hololand/world';

const grass = await proceduralAssetGenerator.generate({
  type: 'grass',
  seed: 12345,
  resolution: 'medium',
  params: { density: 0.8, height: 1.0 },
});

console.log(grass.fromCache, grass.generationTimeMs);
```

Batch path (`generateBatch`), force-regenerate, custom-TTL, and verbose-logging options are documented in [`ProceduralAssetGenerator.ts`](../packages/platform/world/src/procedural/ProceduralAssetGenerator.ts) — read the source for the current option surface.

### HTTP API

Defined in [`procedural-cache.routes.ts`](../platform/backend/src/routes/procedural-cache.routes.ts). Required body keys (`type`, `seed`, `resolution`) are validated server-side; any change to the schema lives in that file.

```
POST   /api/procedural/cache/get       — body: ProceduralAssetParams           → 200 asset | 404
POST   /api/procedural/cache/set       — body: { params, data, metadata, ttl } → 200 | 500
DELETE /api/procedural/cache/clear     — query: ?type=<assetType>              → { deletedCount }
GET    /api/procedural/cache/metrics                                            → CacheMetrics
```

### Discipline

- Use deterministic seeds. Random seeds defeat the cache.
- Normalize float params (e.g. round to 2 decimals) before hashing — small numerical noise creates many near-identical keys.
- Don't cache user-specific assets — use a session-scoped store.
- Don't store assets > Redis-comfortable size in Redis; offload large immutable assets to a CDN and cache only the URL.
- On a cache error, the client falls back to direct generation. Don't suppress the error log; investigate.

---

## Streaming asset cache

### Modules

| Module | Source-of-truth file | Role |
|---|---|---|
| In-memory cache with LRU + size budget + TTL | [`packages/platform/streaming/src/cache.ts`](../packages/platform/streaming/src/cache.ts) — `MemoryCache`, `IndexedDBCache`, `CacheManager`, `MemoryBudgetMonitor` | Runtime asset cache; configured per-instance, no hardcoded global. |
| Loader pipeline | [`loader.ts`](../packages/platform/streaming/src/loader.ts) — `LoadQueue`, `AssetLoader`, `ProgressiveLoader`, `BundleLoader` | Consumes the cache. |
| Movement-predictive chunk loader | [`prediction.ts`](../packages/platform/streaming/src/prediction.ts) — `MovementPredictor`, `PredictiveChunkLoader` | Pre-warms the cache for likely-next chunks. |
| Public exports | [`index.ts`](../packages/platform/streaming/src/index.ts) | All of the above; consult before importing internals. |

### Default config

`DEFAULT_CACHE_CONFIG` in [`cache.ts`](../packages/platform/streaming/src/cache.ts) defines `maxSize`, `evictionPolicy`, `persistent`, `name`, `ttl`. Override at construction:

```ts
import { CacheManager } from '@holoscript/streaming';

const cache = new CacheManager({
  maxSize: /* per-deployment */,
  evictionPolicy: 'lru',
  persistent: true,
});
```

Don't hardcode the budget here — derive it from the active quality profile (`mobile` ≠ `cinematic`) or the device tier reported by [`QualityManager`](../packages/platform/renderer/src/QualityManager.ts).

### Integration with quality profiles

Streaming cache size and predictive-load aggressiveness should track the active profile. The wiring contract is [`QUALITY_TIER_PROFILES.md`](./QUALITY_TIER_PROFILES.md) → `QualityProfileManager.getEffectiveQualitySettings()` → consumer (cache config). Keep the streaming cache in step with the renderer; mismatched budgets cause OOMs on Quest standalone.

---

## Claims dropped

- **Hardcoded hit-rate / latency / storage / time-saved tables** — those were in the previous procedural-caching doc. The metrics endpoint returns live values; hardcoding ranges in docs encouraged stale calibration.
- **"Multi-level caching (L1 IndexedDB → L2 Redis → L3 CDN)" as planned** — `IndexedDBCache` already exists in `streaming/src/cache.ts`; the multi-level coordination across procedural + streaming caches is the open seam, not the IndexedDB layer.
- **"Predictive pre-caching" as planned** — `PredictiveChunkLoader` ships in `streaming/src/prediction.ts`; the open seam is wiring it to procedural-asset prefetch, not building it.
- **Generic "before-vs-after caching" 41s → 11.2s example** — synthetic; the real impact is per-deployment and visible on the metrics endpoint.

## See also

- [`PERFORMANCE_TUNING.md`](./PERFORMANCE_TUNING.md) — module-level performance posture.
- [`QUALITY_TIER_PROFILES.md`](./QUALITY_TIER_PROFILES.md) — profile selection (drives cache budget choice).
- [`AUTONOMOUS_VR_OPTIMIZATION_ROADMAP.md`](./AUTONOMOUS_VR_OPTIMIZATION_ROADMAP.md) — what's shipped / what's open.
- [`audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md`](./audits/HOLOLAND_CODEBASE_SHOULD_EXIST_AUDIT_2026-05-07.md) — keep-in-scope audit.
