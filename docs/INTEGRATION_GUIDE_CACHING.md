# Procedural Asset Caching - Integration Guide

## Quick Start (5 minutes)

### 1. Ensure Backend is Running

```bash
cd platform/backend
npm install
npm run dev
```

Verify Redis connection:
```bash
curl http://localhost:3001/health
# Should return: { "status": "healthy", ... }
```

### 2. Install Frontend Dependencies

```bash
cd packages/platform/world
npm install
```

### 3. Use in Your Code

```typescript
import { proceduralAssetGenerator } from '@hololand/world';

// Generate with automatic caching
const grass = await proceduralAssetGenerator.generate({
  type: 'grass',
  seed: 12345,
  resolution: 'medium',
  params: { density: 0.8 }
});

console.log(grass.fromCache); // true or false
console.log(grass.generationTimeMs); // ~5ms (hit) or ~150ms (miss)
```

That's it! Caching is now enabled automatically.

## Environment Setup

### Backend (.env)

Ensure your backend has Redis configured:

```env
REDIS_URL=redis://localhost:6379
```

For production:
```env
REDIS_URL=redis://your-redis-instance:6379
REDIS_PASSWORD=your-password
```

### Frontend (.env)

Point to your backend:

```env
VITE_HOLOLAND_BACKEND_URL=http://localhost:3001
# Production: https://api.hololand.io
```

## Integration Patterns

### Pattern 1: World Generation with Caching

```typescript
import { ProceduralWorldOrchestrator } from '@hololand/world';
import { proceduralAssetGenerator } from '@hololand/world';

async function generateWorldWithCaching() {
  // Generate world plan
  const orchestrator = new ProceduralWorldOrchestrator({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const result = await orchestrator.generateWorld({
    description: 'A forest with 100 trees, grass, and rocks',
    metadata: { name: 'Forest World', category: 'nature', size: 'large' },
  });

  // Generate assets with caching
  const assetParams = [
    { type: 'tree', seed: 1, resolution: 'high' },
    { type: 'tree', seed: 2, resolution: 'high' },
    { type: 'grass', seed: 3, resolution: 'medium' },
    // ... more assets
  ];

  const assets = await proceduralAssetGenerator.generateBatch(assetParams);

  console.log(`Generated ${assets.length} assets`);
  console.log(`Cache hits: ${assets.filter(a => a.fromCache).length}`);
}
```

### Pattern 2: Pre-Caching Common Assets

```typescript
async function preCacheCommonAssets() {
  const commonAssets = [
    // Common trees
    { type: 'tree', seed: 1000, resolution: 'high' },
    { type: 'tree', seed: 1001, resolution: 'high' },
    { type: 'tree', seed: 1002, resolution: 'medium' },

    // Common grass patches
    { type: 'grass', seed: 2000, resolution: 'medium' },
    { type: 'grass', seed: 2001, resolution: 'medium' },

    // Common rocks
    { type: 'rock', seed: 3000, resolution: 'medium' },
    { type: 'rock', seed: 3001, resolution: 'low' },
  ];

  console.log('Pre-caching common assets...');
  await proceduralAssetGenerator.generateBatch(commonAssets);
  console.log('✅ Pre-caching complete');
}
```

### Pattern 3: Custom Cache Configuration

```typescript
import { ProceduralAssetGenerator } from '@hololand/world';

const generator = new ProceduralAssetGenerator({
  cacheEnabled: true,
  cacheBackendUrl: process.env.BACKEND_URL,
});

// Custom TTL for temporary assets
const tempAsset = await generator.generate(params, {
  cacheTTL: 3600, // 1 hour
});

// Force regeneration for debugging
const freshAsset = await generator.generate(params, {
  forceRegenerate: true,
  verbose: true, // Detailed logging
});
```

### Pattern 4: Cache-Aware Asset Loading

```typescript
async function loadWorldAssets(worldDefinition: any) {
  const startTime = Date.now();
  const assets: any[] = [];

  // Collect all asset params from world definition
  const assetParams = worldDefinition.objects
    .filter((obj: any) => obj.procedural)
    .map((obj: any) => ({
      type: obj.assetType,
      seed: obj.seed,
      resolution: obj.resolution,
    }));

  // Generate all assets with caching
  const results = await proceduralAssetGenerator.generateBatch(assetParams);

  const loadTime = Date.now() - startTime;
  const cacheHits = results.filter(r => r.fromCache).length;

  console.log(`Loaded ${results.length} assets in ${loadTime}ms`);
  console.log(`Cache hit rate: ${(cacheHits / results.length * 100).toFixed(1)}%`);

  return results.map(r => r.data);
}
```

## Monitoring Integration

### Metrics Dashboard Component (React)

```typescript
import { useEffect, useState } from 'react';
import { proceduralAssetGenerator } from '@hololand/world';

function CacheMetricsDashboard() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      const data = await proceduralAssetGenerator.getMetrics();
      setMetrics(data);
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Update every 5s

    return () => clearInterval(interval);
  }, []);

  if (!metrics) return <div>Loading metrics...</div>;

  return (
    <div className="cache-metrics">
      <h3>Procedural Asset Cache</h3>
      <div>Hit Rate: {metrics.hitRate.toFixed(1)}%</div>
      <div>Total Assets: {metrics.totalAssets}</div>
      <div>Storage: {(metrics.storageBytes / 1024 / 1024).toFixed(2)} MB</div>
      <div>Time Saved: {(metrics.avgTimeSavedMs / 1000).toFixed(2)}s avg per hit</div>
    </div>
  );
}
```

### Server-Side Monitoring (Node.js)

```typescript
import { proceduralAssetCache } from './cache/ProceduralAssetCache';

// Export metrics for Prometheus
app.get('/metrics', async (req, res) => {
  const metrics = await proceduralAssetCache.getMetrics();

  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP hololand_cache_hit_rate Cache hit rate percentage
# TYPE hololand_cache_hit_rate gauge
hololand_cache_hit_rate{type="procedural"} ${metrics.hitRate}

# HELP hololand_cache_storage_bytes Total storage used
# TYPE hololand_cache_storage_bytes gauge
hololand_cache_storage_bytes{type="procedural"} ${metrics.storageBytes}

# HELP hololand_cache_total_assets Total cached assets
# TYPE hololand_cache_total_assets gauge
hololand_cache_total_assets{type="procedural"} ${metrics.totalAssets}
  `);
});
```

## Testing Integration

### Unit Tests with Cache Mocking

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProceduralAssetGenerator } from '@hololand/world';

describe('Asset Generation with Cache', () => {
  let generator: ProceduralAssetGenerator;

  beforeEach(() => {
    generator = new ProceduralAssetGenerator({
      cacheEnabled: true,
      cacheBackendUrl: 'http://localhost:3001',
    });
  });

  it('should use cached assets when available', async () => {
    const params = { type: 'grass', seed: 123, resolution: 'medium' };

    // First call - miss
    const result1 = await generator.generate(params);
    expect(result1.fromCache).toBe(false);

    // Second call - hit
    const result2 = await generator.generate(params);
    expect(result2.fromCache).toBe(true);
    expect(result2.generationTimeMs).toBeLessThan(result1.generationTimeMs);
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import fetch from 'node-fetch';

describe('Procedural Cache API', () => {
  const API_URL = 'http://localhost:3001/api/procedural/cache';

  it('should store and retrieve assets', async () => {
    const params = { type: 'tree', seed: 999, resolution: 'high' };
    const data = { vertices: [1, 2, 3] };

    // Store asset
    const storeResponse = await fetch(`${API_URL}/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params, data }),
    });

    expect(storeResponse.ok).toBe(true);

    // Retrieve asset
    const getResponse = await fetch(`${API_URL}/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const result = await getResponse.json();
    expect(result.success).toBe(true);
    expect(result.asset.data).toEqual(data);
  });
});
```

## Performance Tuning

### Batch Size Optimization

```typescript
// Optimal batch size: 10-50 assets
// Too small: Network overhead
// Too large: Memory pressure

const OPTIMAL_BATCH_SIZE = 25;

async function generateAssetsInBatches(allParams: any[]) {
  const results = [];

  for (let i = 0; i < allParams.length; i += OPTIMAL_BATCH_SIZE) {
    const batch = allParams.slice(i, i + OPTIMAL_BATCH_SIZE);
    const batchResults = await proceduralAssetGenerator.generateBatch(batch);
    results.push(...batchResults);
  }

  return results;
}
```

### Cache Warming Strategy

```typescript
// Warm cache during app startup
async function warmCache() {
  const commonSeeds = [1000, 1001, 1002, 1003, 1004];
  const assetTypes = ['grass', 'tree', 'rock'];

  const params = commonSeeds.flatMap(seed =>
    assetTypes.map(type => ({
      type,
      seed,
      resolution: 'medium',
    }))
  );

  console.log('Warming cache with common assets...');
  await proceduralAssetGenerator.generateBatch(params);
  console.log('✅ Cache warmed');
}

// Call during app initialization
warmCache().catch(console.error);
```

## Deployment Checklist

### Pre-Deployment

- [ ] Verify Redis connection in production
- [ ] Test cache API endpoints
- [ ] Run integration tests
- [ ] Review cache metrics in staging
- [ ] Set up monitoring alerts

### Deployment

- [ ] Deploy backend with cache routes
- [ ] Update frontend with caching enabled
- [ ] Warm cache with common assets
- [ ] Monitor hit rates for 24 hours
- [ ] Tune TTL based on usage patterns

### Post-Deployment

- [ ] Monitor cache hit rate (target: 50-80%)
- [ ] Review storage growth (should be < 500 MB)
- [ ] Check cache latency (should be < 10ms)
- [ ] Analyze asset type distribution
- [ ] Plan cache optimization based on metrics

## Troubleshooting

### Cache Not Working

**Symptom**: All requests show `fromCache: false`

**Checks**:
1. Backend running? `curl http://localhost:3001/health`
2. Redis connected? Check backend logs for "Redis connected"
3. Cache enabled? Verify `cacheEnabled: true` in config
4. API reachable? Test: `curl -X POST http://localhost:3001/api/procedural/cache/metrics`

### Low Hit Rate

**Symptom**: Hit rate < 40%

**Solutions**:
1. Use deterministic seeds (not random)
2. Normalize parameters (round floats)
3. Increase TTL for stable assets
4. Pre-cache common assets on startup

### Cache Latency High

**Symptom**: Cache hits taking > 20ms

**Solutions**:
1. Check Redis performance: `redis-cli --latency`
2. Review asset sizes: Large assets slow serialization
3. Monitor network latency to Redis
4. Consider Redis clustering for scale

## Migration from No Cache

### Step 1: Enable Cache Gradually

```typescript
// Start with partial caching
const generator = new ProceduralAssetGenerator({
  cacheEnabled: Math.random() < 0.5, // 50% of requests
});

// Monitor impact, then increase to 100%
```

### Step 2: A/B Test

```typescript
const useCaching = req.headers['x-enable-cache'] === 'true';

const generator = new ProceduralAssetGenerator({
  cacheEnabled: useCaching,
});
```

### Step 3: Full Rollout

```typescript
// Enable for all users after successful A/B test
const generator = new ProceduralAssetGenerator({
  cacheEnabled: true,
});
```

## Support

For issues or questions:
- **Documentation**: `/docs/PROCEDURAL_ASSET_CACHING.md`
- **Example Code**: `/packages/platform/world/examples/procedural-caching-demo.ts`
- **Tests**: `/platform/backend/src/cache/ProceduralAssetCache.test.ts`

---

**Guide Version**: 1.0
**Last Updated**: 2026-02-27
