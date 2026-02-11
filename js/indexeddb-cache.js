/**
 * IndexedDB Cache Utility
 * Provides a persistent caching mechanism using IndexedDB
 * Suitable for larger datasets that don't fit in localStorage
 */

export class IndexedDBCache {
  constructor(dbName = 'ummah-cache', storeName = 'responses', version = 1) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
    this.db = null;
  }

  /**
   * Initialize IndexedDB database
   * @returns {Promise<IDBDatabase>} Database instance
   */
  async init() {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(new Error(`Failed to open database: ${request.error}`));
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('ttl', 'ttl', { unique: false });
        }
      };
    });
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {Promise<*>} Cached value or null if not found/expired
   */
  async get(key) {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;

          if (!result) {
            resolve(null);
            return;
          }

          const age = Date.now() - result.timestamp;

          // Check if cache is still valid
          if (age < result.ttl) {
            resolve(result.value);
          } else {
            // Cache expired, delete it
            this.delete(key).catch(console.warn);
            resolve(null);
          }
        };

        request.onerror = () => reject(new Error(`Failed to get from cache: ${request.error}`));
      });
    } catch (error) {
      console.warn('IndexedDB get error:', error);
      return null;
    }
  }

  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<void>}
   */
  async set(key, value, ttl = 5 * 60 * 1000) {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        const data = {
          key,
          value,
          timestamp: Date.now(),
          ttl
        };

        const request = store.put(data);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to set cache: ${request.error}`));

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error}`));
      });
    } catch (error) {
      console.warn('IndexedDB set error:', error);
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
   * Returns cached data immediately and refreshes in background
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch fresh data
   * @param {number} ttl - Time to live in milliseconds
   * @param {number} staleTTL - Time before considering cache stale (default: 80% of TTL)
   * @returns {Promise<*>} Cached value
   */
  async getOrFetchStale(key, fetchFn, ttl, staleTTL = ttl * 0.8) {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;

          if (!result) {
            // No cache, fetch fresh data
            fetchFn().then(value => {
              this.set(key, value, ttl).catch(console.warn);
              resolve(value);
            }).catch(reject);
            return;
          }

          const age = Date.now() - result.timestamp;

          // Return cached data immediately
          if (age < result.ttl) {
            // Refresh in background if cache is stale
            if (age > staleTTL) {
              this.refreshInBackground(key, fetchFn, ttl);
            }
            resolve(result.value);
          } else {
            // Cache expired, delete and fetch fresh data
            this.delete(key).catch(console.warn);
            fetchFn().then(value => {
              this.set(key, value, ttl).catch(console.warn);
              resolve(value);
            }).catch(reject);
          }
        };

        request.onerror = () => {
          // On error, fetch fresh data
          fetchFn().then(value => {
            this.set(key, value, ttl).catch(console.warn);
            resolve(value);
          }).catch(reject);
        };
      });
    } catch (error) {
      console.warn('IndexedDB getOrFetchStale error:', error);
      // Fallback to fetch
      return fetchFn();
    }
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
      await this.set(key, value, ttl);
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }

  /**
   * Delete cached value
   * @param {string} key - Cache key
   * @returns {Promise<void>}
   */
  async delete(key) {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to delete from cache: ${request.error}`));

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error}`));
      });
    } catch (error) {
      console.warn('IndexedDB delete error:', error);
    }
  }

  /**
   * Clear all cached values
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to clear cache: ${request.error}`));

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error}`));
      });
    } catch (error) {
      console.warn('IndexedDB clear error:', error);
    }
  }

  /**
   * Clear expired cache entries
   * @returns {Promise<number>} Number of entries cleared
   */
  async clearExpired() {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('timestamp');
        const request = index.openCursor();

        let clearedCount = 0;
        const now = Date.now();

        request.onsuccess = (event) => {
          const cursor = event.target.result;

          if (cursor) {
            const data = cursor.value;
            const age = now - data.timestamp;

            if (age >= data.ttl) {
              cursor.delete();
              clearedCount++;
            }

            cursor.continue();
          } else {
            resolve(clearedCount);
          }
        };

        request.onerror = () => reject(new Error(`Failed to clear expired: ${request.error}`));
      });
    } catch (error) {
      console.warn('IndexedDB clearExpired error:', error);
      return 0;
    }
  }

  /**
   * Get all cache keys
   * @returns {Promise<Array<string>>} Array of cache keys
   */
  async keys() {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAllKeys();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to get keys: ${request.error}`));
      });
    } catch (error) {
      console.warn('IndexedDB keys error:', error);
      return [];
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    try {
      const db = await this.init();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const entries = request.result;
          const now = Date.now();
          let validEntries = 0;
          let expiredEntries = 0;
          let totalSize = 0;

          entries.forEach(entry => {
            const size = JSON.stringify(entry).length;
            totalSize += size;

            if (now - entry.timestamp < entry.ttl) {
              validEntries++;
            } else {
              expiredEntries++;
            }
          });

          resolve({
            totalEntries: entries.length,
            validEntries,
            expiredEntries,
            totalBytes: totalSize,
            totalKB: (totalSize / 1024).toFixed(2),
            avgEntrySize: entries.length > 0 ? (totalSize / entries.length).toFixed(2) : 0
          });
        };

        request.onerror = () => reject(new Error(`Failed to get stats: ${request.error}`));
      });
    } catch (error) {
      console.warn('IndexedDB getStats error:', error);
      return {
        totalEntries: 0,
        validEntries: 0,
        expiredEntries: 0,
        totalBytes: 0,
        totalKB: 0,
        avgEntrySize: 0
      };
    }
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Delete entire database
   * @returns {Promise<void>}
   */
  async deleteDatabase() {
    await this.close();
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete database: ${request.error}`));
    });
  }
}

// Create default IndexedDB cache instance
export const defaultIDBCache = new IndexedDBCache();

// Export cache constants
export const IDB_CACHE_TTL = {
  SHORT: 5 * 60 * 1000,           // 5 minutes
  MEDIUM: 15 * 60 * 1000,         // 15 minutes
  LONG: 60 * 60 * 1000,           // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000  // 24 hours
};
