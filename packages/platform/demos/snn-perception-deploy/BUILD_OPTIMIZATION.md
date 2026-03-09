# Production Build Optimization Guide

Comprehensive guide for optimizing the SNN Perception Demo for production deployment.

## Overview

This guide covers build-time and runtime optimizations to minimize bundle size, improve loading performance, and maximize WebGPU efficiency.

## Build-Time Optimizations

### 1. Vite Build Configuration

Optimize `vite.config.ts` for production:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [
    react(),
    // Bundle analysis
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    // Brotli compression
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    // Gzip compression
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
  ],
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React
          'vendor-react': ['react', 'react-dom'],
          // Vendor chunk for Three.js
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          // Vendor chunk for charts
          'vendor-charts': ['recharts'],
        },
      },
    },
    // Code splitting threshold
    chunkSizeWarningLimit: 500,
    // Source maps for production debugging (disable for max performance)
    sourcemap: false,
    // CSS code splitting
    cssCodeSplit: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'three'],
    exclude: ['@hololand/platform-renderer'], // Large internal deps
  },
});
```

### 2. Tree Shaking

Ensure all dependencies support tree shaking:

```typescript
// ❌ Bad: Imports entire library
import _ from 'lodash';

// ✅ Good: Import only what you need
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';

// ❌ Bad: Barrel imports
import { Button, Card, Modal } from '@hololand/ui';

// ✅ Good: Direct imports
import Button from '@hololand/ui/Button';
import Card from '@hololand/ui/Card';
```

### 3. Code Splitting

Split code by route and feature:

```typescript
// Lazy load routes
import { lazy, Suspense } from 'react';

const EnergyDashboard = lazy(() => import('./EnergyBenchmarkDashboard'));
const ARAnnotator = lazy(() => import('./ARObjectAnnotator'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<EnergyDashboard />} />
        <Route path="/annotator" element={<ARAnnotator />} />
      </Routes>
    </Suspense>
  );
}
```

### 4. Asset Optimization

#### Images

```bash
# Convert PNG to WebP (90% smaller)
cwebp -q 80 logo.png -o logo.webp

# Generate responsive images
convert logo.png -resize 512x512 logo-512.png
convert logo.png -resize 256x256 logo-256.png
convert logo.png -resize 128x128 logo-128.png
```

Use `<picture>` for responsive images:

```html
<picture>
  <source srcset="/logo-512.webp" type="image/webp" media="(min-width: 512px)">
  <source srcset="/logo-256.webp" type="image/webp" media="(min-width: 256px)">
  <img src="/logo-128.png" alt="Logo">
</picture>
```

#### SNN Model Compression

Current: 58 KB (sparse COO format with 73% sparsity)

Further optimizations:

```python
# Quantize weights to int8 (4x smaller)
import numpy as np

def quantize_weights(weights, scale=127):
    return (weights * scale).astype(np.int8), scale

# Use Huffman encoding for sparse indices
from scipy.sparse import save_npz
save_npz('warehouse-snn-v1.npz', sparse_matrix)  # 30% smaller than JSON
```

### 5. WebGPU Shader Optimization

Optimize WGSL shaders for LIF neuron simulation:

```wgsl
// ❌ Bad: Branch divergence
if (v >= THRESHOLD) {
  spike = 1.0;
  v = REST_POTENTIAL;
}

// ✅ Good: Branchless computation
let spike_mask = f32(v >= THRESHOLD);
spike = spike_mask;
v = select(v, REST_POTENTIAL, spike_mask > 0.5);
```

Precompile shaders at build time:

```typescript
// Build-time shader compilation
import lifShader from './shaders/lif.wgsl?raw';

const shaderModule = device.createShaderModule({
  code: lifShader,
  compilationHints: [{
    entryPoint: 'lif_step',
    layout: pipelineLayout,
  }],
});
```

## Runtime Optimizations

### 1. Lazy Loading

Load SNN model asynchronously:

```typescript
async function loadModelLazy() {
  // Load model only when needed (not on initial page load)
  const model = await import('/models/warehouse-snn-v1.json');
  return model;
}

// Prefetch on hover (speculative loading)
<button onMouseEnter={() => loadModelLazy()}>
  Start Detection
</button>
```

### 2. Web Workers

Offload SNN inference to Web Worker:

```typescript
// Main thread
const worker = new Worker(new URL('./snn-worker.ts', import.meta.url), {
  type: 'module',
});

worker.postMessage({ type: 'init', model: modelData });

worker.onmessage = (e) => {
  const { detections } = e.data;
  updateUI(detections);
};

// Worker thread (snn-worker.ts)
self.onmessage = async (e) => {
  const { type, scene } = e.data;
  if (type === 'inference') {
    const detections = await runSNN(scene);
    self.postMessage({ detections });
  }
};
```

### 3. Request Batching

Batch multiple inference requests:

```typescript
class SNNBatchProcessor {
  private queue: SceneInput[] = [];
  private batchSize = 8;
  private timeout: NodeJS.Timeout | null = null;

  enqueue(scene: SceneInput) {
    this.queue.push(scene);

    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else {
      this.timeout = setTimeout(() => this.flush(), 16); // ~60fps
    }
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);
    const results = await this.processBatch(batch);

    results.forEach((result, i) => {
      this.callbacks[i](result);
    });

    if (this.timeout) clearTimeout(this.timeout);
  }

  private async processBatch(batch: SceneInput[]) {
    // Process all scenes in parallel on WebGPU
    return Promise.all(batch.map(scene => this.runSNN(scene)));
  }
}
```

### 4. Adaptive Inference Frequency

Dynamically adjust inference rate based on scene complexity:

```typescript
class AdaptiveFrequencyController {
  private currentHz = 10;
  private minHz = 2;
  private maxHz = 30;

  adjustFrequency(scene: SceneInput, performance: PerformanceMetrics) {
    const objectCount = scene.objects.length;
    const latency = performance.inferenceLatency;
    const powerBudget = 0.9; // watts

    // Lower frequency if:
    // 1. Few objects (static scene)
    // 2. High latency (overloaded)
    // 3. Exceeding power budget
    if (objectCount < 10 || latency > 10 || performance.power > powerBudget) {
      this.currentHz = Math.max(this.minHz, this.currentHz - 2);
    }
    // Increase frequency if scene is dynamic and performance is good
    else if (objectCount > 20 && latency < 5 && performance.power < powerBudget * 0.8) {
      this.currentHz = Math.min(this.maxHz, this.currentHz + 2);
    }

    return this.currentHz;
  }
}
```

### 5. SharedArrayBuffer Optimization

Use lock-free data structures for worker communication:

```typescript
// Allocate SharedArrayBuffer with optimal alignment
const bufferSize = Math.ceil(totalBytes / 8) * 8; // 8-byte aligned
const sab = new SharedArrayBuffer(bufferSize);

// Use Atomics for lock-free synchronization
const int32View = new Int32Array(sab);

// Writer (Worker thread)
function writeResults(sequence: number, data: Float32Array) {
  // Write data
  const float32View = new Float32Array(sab, headerOffset);
  float32View.set(data);

  // Release fence: ensure data is visible before updating sequence
  Atomics.store(int32View, SEQUENCE_INDEX, sequence);
  Atomics.notify(int32View, SEQUENCE_INDEX, 1);
}

// Reader (Main thread)
function readResults() {
  // Acquire fence: wait for new sequence
  const currentSeq = Atomics.load(int32View, SEQUENCE_INDEX);
  if (currentSeq === lastSeq) return null; // No new data

  const float32View = new Float32Array(sab, headerOffset);
  const data = new Float32Array(float32View); // Copy to local memory
  lastSeq = currentSeq;
  return data;
}
```

## Bundle Size Analysis

### Target Bundle Sizes

| Chunk | Target | Notes |
|-------|--------|-------|
| **Main** | <150 KB | Core app + routing |
| **Vendor (React)** | <120 KB | React + React DOM |
| **Vendor (Three.js)** | <400 KB | Three.js + R3F + Drei |
| **Vendor (Charts)** | <80 KB | Recharts |
| **SNN Model** | <60 KB | Compressed sparse weights |
| **Total (first load)** | <810 KB | Gzipped |

### Analyzing Bundle Size

```bash
# Build with visualizer
pnpm build

# Open bundle analysis
open dist/stats.html
```

Look for:
- Large dependencies (>100 KB)
- Duplicate dependencies
- Unused code
- Unoptimized images

### Reducing Bundle Size

#### 1. Replace Heavy Dependencies

```typescript
// ❌ Heavy: moment.js (70 KB)
import moment from 'moment';

// ✅ Lightweight: date-fns (10 KB)
import { format } from 'date-fns';

// ❌ Heavy: lodash (70 KB)
import _ from 'lodash';

// ✅ Native: Use modern JS
const unique = [...new Set(array)];
const groupBy = Object.groupBy(array, fn);
```

#### 2. Dynamic Imports

```typescript
// Import only when needed
async function showAdvancedMetrics() {
  const { AdvancedMetricsDashboard } = await import('./AdvancedMetrics');
  render(<AdvancedMetricsDashboard />);
}
```

#### 3. Externalize Large Assets

```typescript
// ❌ Bundle model with app
import modelData from './warehouse-snn-v1.json';

// ✅ Load from CDN
const modelData = await fetch('https://cdn.hololand.io/models/warehouse-snn-v1.json');
```

## Performance Budgets

Set performance budgets in `vite.config.ts`:

```typescript
build: {
  rollupOptions: {
    output: {
      // Warn if any chunk exceeds 500 KB
      chunkSizeWarningLimit: 500,
    },
  },
},
```

CI/CD integration:

```yaml
# .github/workflows/build.yml
- name: Check bundle size
  run: |
    pnpm build
    SIZE=$(du -sb dist | cut -f1)
    if [ $SIZE -gt 1000000 ]; then
      echo "Bundle size exceeds 1 MB: $SIZE bytes"
      exit 1
    fi
```

## Caching Strategy

### Service Worker

Cache SNN model and static assets:

```typescript
// sw.js
const CACHE_NAME = 'snn-perception-v1';
const urlsToCache = [
  '/',
  '/assets/index.js',
  '/assets/index.css',
  '/models/warehouse-snn-v1.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) return response;

      // Fetch from network
      return fetch(event.request).then((response) => {
        // Cache new resources
        if (event.request.url.includes('/assets/') || event.request.url.includes('/models/')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
```

### HTTP Caching Headers

Set in nginx:

```nginx
# Static assets: 1 year
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# SNN model: 7 days (allow updates)
location /models/ {
  expires 7d;
  add_header Cache-Control "public, must-revalidate";
}

# HTML: No cache (always fresh)
location = /index.html {
  add_header Cache-Control "no-cache, must-revalidate";
}
```

## Network Optimization

### HTTP/2 Server Push

Push critical resources:

```nginx
location = / {
  http2_push /assets/index.js;
  http2_push /assets/index.css;
  http2_push /models/warehouse-snn-v1.json;
}
```

### Resource Hints

Add to HTML:

```html
<head>
  <!-- Preconnect to CDN -->
  <link rel="preconnect" href="https://cdn.hololand.io">

  <!-- Prefetch model -->
  <link rel="prefetch" href="/models/warehouse-snn-v1.json">

  <!-- Preload critical assets -->
  <link rel="preload" href="/assets/index.js" as="script">
  <link rel="preload" href="/assets/index.css" as="style">
</head>
```

### CDN Configuration

Use CloudFront for global distribution:

```javascript
// CloudFront cache policy
{
  "MinTTL": 0,
  "DefaultTTL": 86400,   // 1 day
  "MaxTTL": 31536000,    // 1 year
  "Compress": true,      // Enable compression
  "CachePolicyName": "SNN-Perception-Cache"
}
```

## WebGPU Optimization

### Shader Compilation Cache

```typescript
const shaderCache = new Map<string, GPUShaderModule>();

function getOrCreateShaderModule(code: string): GPUShaderModule {
  if (shaderCache.has(code)) {
    return shaderCache.get(code)!;
  }

  const module = device.createShaderModule({ code });
  shaderCache.set(code, module);
  return module;
}
```

### Buffer Pooling

Reuse GPU buffers to reduce allocation overhead:

```typescript
class BufferPool {
  private pool: GPUBuffer[] = [];

  acquire(size: number, usage: GPUBufferUsageFlags): GPUBuffer {
    // Try to reuse existing buffer
    const buffer = this.pool.find(b => b.size >= size);
    if (buffer) {
      this.pool.splice(this.pool.indexOf(buffer), 1);
      return buffer;
    }

    // Create new buffer
    return device.createBuffer({ size, usage });
  }

  release(buffer: GPUBuffer) {
    this.pool.push(buffer);
  }
}
```

## Monitoring Build Performance

### Lighthouse CI

```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse
  uses: treosh/lighthouse-ci-action@v9
  with:
    urls: |
      https://snn-perception.hololand.io
    budgetPath: ./lighthouse-budget.json
```

**lighthouse-budget.json**:
```json
{
  "budget": [
    {
      "path": "/*",
      "timings": [
        {
          "metric": "first-contentful-paint",
          "budget": 1500
        },
        {
          "metric": "interactive",
          "budget": 3000
        }
      ],
      "resourceSizes": [
        {
          "resourceType": "script",
          "budget": 400
        },
        {
          "resourceType": "total",
          "budget": 1000
        }
      ]
    }
  ]
}
```

### Bundle Size Tracking

Use bundlesize:

```json
{
  "bundlesize": [
    {
      "path": "./dist/assets/index-*.js",
      "maxSize": "150 KB"
    },
    {
      "path": "./dist/assets/vendor-react-*.js",
      "maxSize": "120 KB"
    },
    {
      "path": "./dist/assets/vendor-three-*.js",
      "maxSize": "400 KB"
    }
  ]
}
```

---

## Checklist

### Build Optimizations

- [ ] Vite configured for production
- [ ] Tree shaking enabled
- [ ] Code splitting by route
- [ ] Dead code elimination (terser)
- [ ] Source maps disabled for production
- [ ] Bundle analysis reviewed

### Asset Optimizations

- [ ] Images converted to WebP
- [ ] Responsive images generated
- [ ] SNN model compressed
- [ ] Fonts subset for used characters
- [ ] SVGs optimized

### Runtime Optimizations

- [ ] Lazy loading implemented
- [ ] Web Workers for heavy computation
- [ ] SharedArrayBuffer for worker communication
- [ ] Adaptive inference frequency
- [ ] Request batching

### Network Optimizations

- [ ] HTTP/2 enabled
- [ ] Compression enabled (gzip/brotli)
- [ ] CDN configured
- [ ] Caching headers set
- [ ] Resource hints added

### WebGPU Optimizations

- [ ] Shaders optimized for parallelism
- [ ] Buffer pooling implemented
- [ ] Shader compilation cached
- [ ] Double buffering for SAB

---

**Build Optimization Guide v1.0.0**
Last Updated: 2026-03-08
