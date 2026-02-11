/**
 * Service Worker
 * Provides offline support and caching for the Ummah Confederation website
 * Uses cache-first strategy for static assets and network-first for API calls
 */

const CACHE_NAME = 'ummah-confederation-v1.0.1';
const RUNTIME_CACHE = 'ummah-runtime-v1.0.1';

// Assets to cache on install (static assets)
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/feed.html',
  '/library.html',
  '/offline.html',
  '/dist/output.css',
  '/images/admin-seal.webp',
  '/images/favicon.png'
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first, fall back to network
  CACHE_FIRST: 'cache-first',
  // Network first, fall back to cache
  NETWORK_FIRST: 'network-first',
  // Stale while revalidate (serve from cache, update in background)
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  // Network only (no caching)
  NETWORK_ONLY: 'network-only',
  // Cache only (offline)
  CACHE_ONLY: 'cache-only'
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim(); // Take control immediately
      })
  );
});

/**
 * Fetch event - handle requests with appropriate caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except for allowed APIs)
  if (url.origin !== self.location.origin) {
    // Handle API requests with network-first strategy
    if (url.hostname === 'api.aladhan.com' || url.hostname === 'nominatim.openstreetmap.org') {
      event.respondWith(networkFirst(request, 5 * 60 * 1000)); // 5 minutes cache
    }
    return;
  }

  // Determine cache strategy based on resource type
  const strategy = getCacheStrategy(url);

  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      event.respondWith(cacheFirst(request));
      break;
    case CACHE_STRATEGIES.NETWORK_FIRST:
      event.respondWith(networkFirst(request));
      break;
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      event.respondWith(staleWhileRevalidate(request));
      break;
    case CACHE_STRATEGIES.NETWORK_ONLY:
      event.respondWith(networkOnly(request));
      break;
    default:
      event.respondWith(cacheFirst(request));
  }
});

/**
 * Determine cache strategy based on resource type
 * @param {URL} url - Request URL
 * @returns {string} Cache strategy
 */
function getCacheStrategy(url) {
  const pathname = url.pathname;

  // HTML pages - stale while revalidate
  if (pathname.endsWith('.html') || pathname === '/') {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }

  // CSS - stale while revalidate (to get latest styles during development)
  if (pathname.endsWith('.css')) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }

  // JS - network first (for development to get latest changes)
  if (pathname.endsWith('.js')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }

  // Images - cache first
  if (pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|ico)$/i)) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }

  // JSON config files - network first with short cache
  if (pathname.endsWith('.json')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }

  // Default to cache first
  return CACHE_STRATEGIES.CACHE_FIRST;
}

/**
 * Cache first strategy
 * @param {Request} request - Fetch request
 * @returns {Promise<Response>} Response
 */
async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    // Try cache first
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Cache miss, fetch from network
    const networkResponse = await fetch(request);

    // Cache the response
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first error:', error);
    throw error;
  }
}

/**
 * Network first strategy
 * @param {Request} request - Fetch request
 * @param {number} cacheTTL - Cache time to live in milliseconds
 * @returns {Promise<Response>} Response
 */
async function networkFirst(request, cacheTTL = 5 * 60 * 1000) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache the response
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {

    // Network failed, try cache
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // No cache available, throw error
    throw error;
  }
}

/**
 * Stale while revalidate strategy
 * @param {Request} request - Fetch request
 * @returns {Promise<Response>} Response
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  // Try cache first
  const cachedResponse = await cache.match(request);

  // Fetch in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.error('[SW] Background fetch failed:', error);
    return cachedResponse; // Return cached response if fetch fails
  });

  // Return cached response immediately, or fetch if no cache
  return cachedResponse || fetchPromise;
}

/**
 * Network only strategy
 * @param {Request} request - Fetch request
 * @returns {Promise<Response>} Response
 */
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.error('[SW] Network only error:', error);
    throw error;
  }
}

/**
 * Message event - handle messages from clients
 */
self.addEventListener('message', (event) => {
  const { data } = event;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
    });
  }

  if (data.type === 'GET_CACHE_STATS') {
    getCacheStats().then((stats) => {
      event.ports[0].postMessage({ type: 'CACHE_STATS', data: stats });
    });
  }
});

/**
 * Get cache statistics
 * @returns {Promise<Object>} Cache statistics
 */
async function getCacheStats() {
  const stats = {
    caches: {},
    totalSize: 0
  };

  const cacheNames = await caches.keys();

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    let cacheSize = 0;
    const entries = [];

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        cacheSize += blob.size;
        entries.push({
          url: request.url,
          size: blob.size
        });
      }
    }

    stats.caches[cacheName] = {
      entries: keys.length,
      size: cacheSize,
      urls: entries.map(e => e.url)
    };

    stats.totalSize += cacheSize;
  }

  return stats;
}

/**
 * Push event - handle push notifications (if needed in future)
 */
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();

    // Show notification
    const options = {
      body: data.body || '',
      icon: '/images/admin-seal.webp',
      badge: '/images/favicon.png',
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Ummah Confederation', options)
    );
  }
});

/**
 * Sync event - handle background sync (if needed in future)
 */
self.addEventListener('sync', (event) => {

  if (event.tag === 'sync-prayer-times') {
    event.waitUntil(syncPrayerTimes());
  }
});

/**
 * Sync prayer times in background
 * @returns {Promise<void>}
 */
async function syncPrayerTimes() {
  try {
    // This would sync prayer times in the background
    // Implementation depends on your specific requirements
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

