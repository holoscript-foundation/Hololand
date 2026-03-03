/**
 * HoloLand Service Worker
 *
 * Provides offline caching with two strategies:
 *   - Cache-first for static assets (JS, CSS, images, fonts)
 *   - Network-first for API calls with 3 s timeout fallback to cache
 *
 * Lifecycle:
 *   - install  : precaches critical app-shell files
 *   - activate : cleans up old versioned caches
 *   - fetch    : routes requests through the appropriate strategy
 *
 * @module pwa/service-worker
 */

// ---------------------------------------------------------------------------
// TypeScript service worker global scope
// ---------------------------------------------------------------------------

declare const self: ServiceWorkerGlobalScope;

// ---------------------------------------------------------------------------
// Cache configuration
// ---------------------------------------------------------------------------

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `hololand-static-${CACHE_VERSION}`;
const API_CACHE = `hololand-api-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

/** Critical app-shell resources to precache on install. */
const PRECACHE_URLS: string[] = [
  '/',
  '/index.html',
  OFFLINE_PAGE,
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

/** File extensions that use cache-first strategy. */
const STATIC_EXTENSIONS = /\.(js|css|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot|ico)$/i;

/** URL patterns that are API calls (network-first). */
const API_PATTERN = /\/api\//;

/** Timeout (ms) for network requests before falling back to cache. */
const NETWORK_TIMEOUT_MS = 3_000;

// ---------------------------------------------------------------------------
// Install — precache critical resources
// ---------------------------------------------------------------------------

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ---------------------------------------------------------------------------
// Activate — clean up old caches
// ---------------------------------------------------------------------------

self.addEventListener('activate', (event: ExtendableEvent) => {
  const allowedCaches = new Set([STATIC_CACHE, API_CACHE]);

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !allowedCaches.has(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ---------------------------------------------------------------------------
// Fetch strategies
// ---------------------------------------------------------------------------

/**
 * Cache-first: look in cache, fall back to network (and cache the response).
 */
async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);

    // Only cache successful responses.
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    // If both cache and network fail, return offline page for navigation
    // requests, or a generic 503 for sub-resources.
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_PAGE);
      if (offlinePage) return offlinePage;
    }

    return new Response('Service Unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Network-first with timeout: attempt network, fall back to cache after
 * NETWORK_TIMEOUT_MS milliseconds.
 */
async function networkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(API_CACHE);

  try {
    const networkResponse = await promiseWithTimeout(
      fetch(request),
      NETWORK_TIMEOUT_MS,
    );

    // Cache successful API responses for offline use.
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    // Network failed or timed out — serve from cache.
    const cached = await cache.match(request);
    if (cached) return cached;

    return new Response(
      JSON.stringify({ error: 'offline', message: 'No cached data available' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

/**
 * Promise wrapper that rejects after `ms` milliseconds.
 */
function promiseWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Network timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Fetch event router
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  // Chrome DevTools requests should pass through.
  if (url.pathname.startsWith('/browser-sync/')) return;

  if (API_PATTERN.test(url.pathname)) {
    // API calls: network-first with timeout.
    event.respondWith(networkFirst(request));
  } else if (STATIC_EXTENSIONS.test(url.pathname) || request.mode === 'navigate') {
    // Static assets and navigation: cache-first.
    event.respondWith(cacheFirst(request));
  }
  // All other requests fall through to the browser's default behaviour.
});

// ---------------------------------------------------------------------------
// Message handler — allow clients to trigger cache updates
// ---------------------------------------------------------------------------

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

export {};
