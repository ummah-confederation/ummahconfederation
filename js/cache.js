/**
 * Response Cache Utility
 * Provides a simple in-memory and localStorage-based caching mechanism
 * for API responses with TTL (Time To Live) support
 */

export class ResponseCache {
  constructor(defaultTTL = 5 * 60 * 1000) {
    this.defaultTTL = defaultTTL;
    this.memoryCache = new Map();
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if not found/expired
   */
  get(key) {
    // Check memory cache first (fastest)
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      const age = Date.now() - cached.timestamp;

      if (age < cached.ttl) {
        return cached.value;
      }

      // Cache expired, remove from memory
      this.memoryCache.delete(key);
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (!stored) return null;

      const data = JSON.parse(stored);
      const age = Date.now() - data.timestamp;

      if (age < data.ttl) {
        // Restore to memory cache for faster access
        this.memoryCache.set(key, data);
        return data.value;
      }

      // Cache expired, remove from localStorage
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Cache get error:', error);
    }

    return null;
  }

  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    const data = {
      timestamp: Date.now(),
      ttl,
      value
    };

    // Store in memory cache
    this.memoryCache.set(key, data);

    // Store in localStorage for persistence
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Cache set error:', error);
      // If localStorage is full, clear old entries
      this.clearExpired();
    }
  }

  /**
   * Get cached value or fetch if not available
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch fresh data
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<*>} Cached or fetched value
   */
  async getOrFetch(key, fetchFn, ttl) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get cached value with stale-while-revalidate pattern
   * Returns cached data immediately and refreshes in background
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch fresh data
   * @param {number} ttl - Time to live in milliseconds
   * @param {number} staleTTL - Time before considering cache stale (default: 80% of TTL)
   * @returns {Promise<*>} Cached value
   */
  async getOrFetchStale(key, fetchFn, ttl, staleTTL = ttl * 0.8) {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      const age = Date.now() - cached.timestamp;

      // Return cached data immediately
      if (age < cached.ttl) {
        // Refresh in background if cache is stale
        if (age > staleTTL) {
          this.refreshInBackground(key, fetchFn, ttl);
        }
        return cached.value;
      }

      // Cache expired, remove
      this.memoryCache.delete(key);
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const data = JSON.parse(stored);
        const age = Date.now() - data.timestamp;

        if (age < data.ttl) {
          // Restore to memory cache
          this.memoryCache.set(key, data);

          // Refresh in background if cache is stale
          if (age > staleTTL) {
            this.refreshInBackground(key, fetchFn, ttl);
          }

          return data.value;
        }

        // Cache expired, remove
        localStorage.removeItem(`cache_${key}`);
      }
    } catch (error) {
      console.warn('Cache get error:', error);
    }

    // No cache available, fetch fresh data
    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Refresh cache in background without blocking
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch fresh data
   * @param {number} ttl - Time to live in milliseconds
   */
  async refreshInBackground(key, fetchFn, ttl) {
    try {
      const value = await fetchFn();
      this.set(key, value, ttl);
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }

  /**
   * Delete cached value
   * @param {string} key - Cache key
   */
  delete(key) {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Cache delete error:', error);
    }
  }

  /**
   * Clear all cached values
   */
  clear() {
    this.memoryCache.clear();
    try {
      // Clear all cache entries from localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpired() {
    const now = Date.now();

    // Clear expired memory cache entries
    for (const [key, data] of this.memoryCache.entries()) {
      if (now - data.timestamp >= data.ttl) {
        this.memoryCache.delete(key);
      }
    }

    // Clear expired localStorage entries
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (now - data.timestamp >= data.ttl) {
              localStorage.removeItem(key);
            }
          } catch (error) {
            // Invalid data, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.warn('Clear expired error:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const memorySize = this.memoryCache.size;
    let localStorageSize = 0;
    let totalSize = 0;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorageSize++;
          totalSize += localStorage.getItem(key).length;
        }
      });
    } catch (error) {
      console.warn('Get stats error:', error);
    }

    return {
      memoryEntries: memorySize,
      localStorageEntries: localStorageSize,
      totalEntries: memorySize + localStorageSize,
      totalBytes: totalSize,
      totalKB: (totalSize / 1024).toFixed(2)
    };
  }
}

// Create default cache instance
export const defaultCache = new ResponseCache();

// Export cache constants
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,           // 5 minutes
  MEDIUM: 15 * 60 * 1000,         // 15 minutes
  LONG: 60 * 60 * 1000,           // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000  // 24 hours
};
