/**
 * Unified Cache Manager
 * Single source of truth for all caching operations
 * Coordinates between memory, localStorage, and IndexedDB
 */

import { IndexedDBCache } from './indexeddb-cache.js';

// Cache namespaces for organization
export const CACHE_NAMESPACES = {
  PRAYER_TIMES: 'prayer',
  GEOCODING: 'geocoding',
  LOCATION: 'location',
  CONFIG: 'config',
  FEED: 'feed'
};

// Default TTL values
export const CACHE_DEFAULT_TTL = {
  PRAYER_TIMES: 24 * 60 * 60 * 1000,  // 24 hours (until end of day)
  GEOCODING: 7 * 24 * 60 * 60 * 1000, // 7 days
  LOCATION: 30 * 60 * 1000,           // 30 minutes (reasonable for prayer times)
  CONFIG: 5 * 60 * 1000,               // 5 minutes
  FEED: 15 * 60 * 1000                 // 15 minutes
};

// Location precision for cache keys (4 decimals = ~11m accuracy)
export const LOCATION_PRECISION = 4;

class UnifiedCacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.idbCache = new IndexedDBCache('ummah-unified-cache', 'cache');
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Initialize the cache manager
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInit();
    return this.initPromise;
  }

  async _doInit() {
    try {
      await this.idbCache.init();
      this.initialized = true;
    } catch (error) {
      console.warn('UnifiedCacheManager: IndexedDB init failed, using memory-only mode:', error);
      this.initialized = true; // Continue with memory-only mode
    }
  }

  /**
   * Generate standardized cache key
   * @param {string} namespace - Cache namespace
   * @param {...string} parts - Key parts
   * @returns {string} Formatted cache key
   */
  generateKey(namespace, ...parts) {
    return `${namespace}:${parts.join(':')}`;
  }

  /**
   * Generate location-based cache key with consistent precision
   * @param {string} namespace - Cache namespace
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @param {...string} extraParts - Additional key parts
   * @returns {string} Formatted cache key
   */
  generateLocationKey(namespace, latitude, longitude, ...extraParts) {
    const latStr = latitude.toFixed(LOCATION_PRECISION);
    const lonStr = longitude.toFixed(LOCATION_PRECISION);
    return this.generateKey(namespace, latStr, lonStr, ...extraParts);
  }

  /**
   * Get from cache - checks memory first, then IndexedDB
   * @param {string} key - Cache key
   * @returns {Promise<*>} Cached value or null
   */
  async get(key) {
    // Memory cache (fastest)
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      const age = Date.now() - cached.timestamp;

      if (age < cached.ttl) {
        return cached.value;
      }
      
      // Expired, remove from memory
      this.memoryCache.delete(key);
    }

    // IndexedDB (persistent)
    try {
      const value = await this.idbCache.get(key);
      if (value !== null) {
        // Restore to memory cache for faster subsequent access
        this.memoryCache.set(key, {
          value,
          timestamp: Date.now(),
          ttl: CACHE_DEFAULT_TTL.PRAYER_TIMES // Default TTL for restored items
        });
        return value;
      }
    } catch (error) {
      console.warn('UnifiedCacheManager: IndexedDB get failed:', error);
    }

    return null;
  }

  /**
   * Set cache - writes to both memory and IndexedDB
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  async set(key, value, ttl = CACHE_DEFAULT_TTL.PRAYER_TIMES) {
    const data = {
      value,
      timestamp: Date.now(),
      ttl
    };

    // Set in memory cache immediately
    this.memoryCache.set(key, data);

    // Set in IndexedDB for persistence
    try {
      await this.idbCache.set(key, value, ttl);
    } catch (error) {
      console.warn('UnifiedCacheManager: IndexedDB set failed:', error);
      // Continue - memory cache is still valid
    }
  }

  /**
   * Delete a specific cache entry
   * @param {string} key - Cache key
   */
  async delete(key) {
    this.memoryCache.delete(key);
    try {
      await this.idbCache.delete(key);
    } catch (error) {
      console.warn('UnifiedCacheManager: IndexedDB delete failed:', error);
    }
  }

  /**
   * Invalidate all caches for a namespace
   * @param {string} namespace - Cache namespace
   */
  async invalidateNamespace(namespace) {
    const prefix = namespace + ':';

    // Clear memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear IndexedDB entries
    try {
      const keys = await this.idbCache.keys();
      for (const key of keys) {
        if (key.startsWith(prefix)) {
          await this.idbCache.delete(key);
        }
      }
    } catch (error) {
      console.warn('UnifiedCacheManager: Namespace invalidation failed:', error);
    }
  }

  /**
   * Clear all caches
   */
  async clear() {
    this.memoryCache.clear();
    try {
      await this.idbCache.clear();
    } catch (error) {
      console.warn('UnifiedCacheManager: Clear failed:', error);
    }
  }

  /**
   * Clear expired entries from all caches
   * @returns {Promise<number>} Number of entries cleared
   */
  async clearExpired() {
    let cleared = 0;
    const now = Date.now();

    // Clear expired memory cache entries
    for (const [key, data] of this.memoryCache.entries()) {
      if (now - data.timestamp >= data.ttl) {
        this.memoryCache.delete(key);
        cleared++;
      }
    }

    // Clear expired IndexedDB entries
    try {
      const idbCleared = await this.idbCache.clearExpired();
      cleared += idbCleared;
    } catch (error) {
      console.warn('UnifiedCacheManager: Expired clear failed:', error);
    }

    return cleared;
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    const memorySize = this.memoryCache.size;
    let idbStats = { totalEntries: 0, validEntries: 0, expiredEntries: 0 };

    try {
      idbStats = await this.idbCache.getStats();
    } catch (error) {
      console.warn('UnifiedCacheManager: Stats failed:', error);
    }

    return {
      memoryEntries: memorySize,
      ...idbStats,
      totalEntries: memorySize + idbStats.totalEntries
    };
  }

  /**
   * Get cached value or fetch if not available
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch fresh data
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<*>} Cached or fetched value
   */
  async getOrFetch(key, fetchFn, ttl) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Get cached value with stale-while-revalidate pattern
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch fresh data
   * @param {number} ttl - Time to live in milliseconds
   * @param {number} staleTTL - Time before considering cache stale (default: 80% of TTL)
   * @returns {Promise<{value: *, isStale: boolean}>} Cached value and staleness flag
   */
  async getOrFetchStale(key, fetchFn, ttl, staleTTL = ttl * 0.8) {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      const age = Date.now() - cached.timestamp;

      if (age < cached.ttl) {
        const isStale = age > staleTTL;
        
        // Refresh in background if stale
        if (isStale) {
          this._refreshInBackground(key, fetchFn, ttl);
        }
        
        return { value: cached.value, isStale };
      }
    }

    // Check IndexedDB
    try {
      const value = await this.idbCache.get(key);
      if (value !== null) {
        // Restore to memory cache
        this.memoryCache.set(key, { value, timestamp: Date.now(), ttl });
        return { value, isStale: true }; // Assume stale if from IDB
      }
    } catch (error) {
      console.warn('UnifiedCacheManager: IDB get failed:', error);
    }

    // No cache, fetch fresh
    const value = await fetchFn();
    await this.set(key, value, ttl);
    return { value, isStale: false };
  }

  /**
   * Refresh cache in background
   * @private
   */
  async _refreshInBackground(key, fetchFn, ttl) {
    try {
      const value = await fetchFn();
      await this.set(key, value, ttl);
    } catch (error) {
      console.warn('UnifiedCacheManager: Background refresh failed:', error);
    }
  }
}

// Singleton instance
export const unifiedCache = new UnifiedCacheManager();

// Auto-initialize on first import
if (typeof window !== 'undefined') {
  unifiedCache.init().catch(console.warn);
}
