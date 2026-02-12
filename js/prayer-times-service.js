/**
 * PrayerTimesService - Single Source of Truth for Prayer Times
 * 
 * This service consolidates all prayer time logic that was previously
 * duplicated between marquee.js and feed.js. It provides:
 * 
 * - Unified location management with quality tracking
 * - Timezone-aware cache keys and TTL calculation
 * - Proper fallback chain (GPS → Cached → Jakarta)
 * - Event-based cache invalidation
 * - Subscriber pattern for UI updates
 */

import { unifiedCache, CACHE_NAMESPACES, CACHE_DEFAULT_TTL } from './unified-cache.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Location quality levels - used in cache keys to distinguish data sources
 */
export const LOCATION_QUALITY = {
  GPS_FRESH: 'gps_fresh',      // Fresh GPS coordinates from current session
  GPS_CACHED: 'gps_cached',    // Cached GPS coordinates from previous session
  FALLBACK: 'fallback'         // Jakarta fallback (no GPS available)
};

/**
 * Geolocation options for navigator.geolocation.getCurrentPosition
 */
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: false,   // Faster, less accurate is OK for prayer times
  timeout: 10000,              // 10 seconds max
  maximumAge: 300000           // Allow browser cache up to 5 minutes
};

/**
 * CORS proxy fallbacks for geocoding (Nominatim doesn't allow CORS)
 */
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url='
];

/**
 * Default fallback location (Jakarta, Indonesia)
 */
const DEFAULT_LOCATION = {
  latitude: -6.2088,
  longitude: 106.8456,
  city: "Jakarta",
  country: "Indonesia"
};

/**
 * Cache TTL constants (in milliseconds)
 */
const CACHE_TTL = {
  LOCATION: 30 * 60 * 1000,           // 30 minutes
  PRAYER_TIMES: 24 * 60 * 60 * 1000,  // 24 hours (until end of day)
  GEOCODING: 7 * 24 * 60 * 60 * 1000  // 7 days
};

/**
 * Prayer names in order
 */
const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// ============================================================================
// PrayerTimesService Class
// ============================================================================

class PrayerTimesService {
  constructor() {
    // State
    this.location = null;
    this.prayerTimes = null;
    this.nextPrayer = null;
    this.timeToNextPrayer = null;
    this.isLoading = false;
    this.error = null;
    this.lastDate = null;
    
    // Subscribers for state changes
    this.listeners = new Set();
    
    // Initialization state
    this.initialized = false;
    this.initPromise = null;
    
    // Update interval
    this.updateInterval = null;
    
    // Bind methods
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the service
   * @param {Object} options - Initialization options
   * @param {boolean} options.forceRefresh - Force refresh location and prayer times
   * @returns {Promise<void>}
   */
  async init(options = {}) {
    if (this.initialized) return;
    
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._doInit(options);
    return this.initPromise;
  }

  async _doInit(options) {
    try {
      this.isLoading = true;
      this.notifyListeners('loading');

      // Initialize unified cache
      await unifiedCache.init();

      // Get location (with cache check)
      this.location = await this.getLocation({ 
        forceRefresh: options.forceRefresh 
      });

      // Fetch prayer times (with cache check)
      this.prayerTimes = await this.fetchPrayerTimes();

      // Calculate next prayer
      this.calculateNextPrayer();

      // Setup event handlers
      this.setupEventHandlers();

      // Setup update interval (every second for clock)
      this.setupUpdateInterval();

      // Setup date change detection
      this.setupDateChangeDetection();

      this.initialized = true;
      this.isLoading = false;
      this.error = null;
      
      this.notifyListeners('initialized');
      
    } catch (error) {
      console.error('PrayerTimesService initialization failed:', error);
      this.error = error;
      this.isLoading = false;
      this.notifyListeners('error', error);
      throw error;
    }
  }

  // ==========================================================================
  // Location Management
  // ==========================================================================

  /**
   * Get user's location with proper caching and fallback
   * @param {Object} options - Options
   * @param {boolean} options.forceRefresh - Force GPS refresh
   * @param {number} options.maxAge - Maximum age of cached location (ms)
   * @returns {Promise<Object>} Location object with quality
   */
  async getLocation(options = {}) {
    const { forceRefresh = false, maxAge = CACHE_TTL.LOCATION } = options;
    const cacheKey = unifiedCache.generateKey(CACHE_NAMESPACES.LOCATION, 'current');

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await unifiedCache.get(cacheKey);
      if (cached && this.isLocationFresh(cached, maxAge)) {
        console.log('[PrayerTimesService] Using cached location:', cached);
        return { ...cached, quality: LOCATION_QUALITY.GPS_CACHED };
      }
    }

    // Request GPS position
    try {
      const position = await this.requestGPSPosition();
      
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
        quality: LOCATION_QUALITY.GPS_FRESH
      };

      // Fetch city name (async, don't wait)
      this.fetchCityName(location).catch(err => {
        console.warn('[PrayerTimesService] Geocoding failed:', err);
      });

      // Cache the location
      await unifiedCache.set(cacheKey, location, CACHE_TTL.LOCATION);
      
      console.log('[PrayerTimesService] Got fresh GPS location:', location);
      return location;

    } catch (error) {
      console.warn('[PrayerTimesService] GPS failed, using fallback:', error.message);
      return this.getLocationFallback(error, cacheKey);
    }
  }

  /**
   * Request GPS position via navigator.geolocation
   * @returns {Promise<GeolocationPosition>}
   */
  requestGPSPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        GEOLOCATION_OPTIONS
      );
    });
  }

  /**
   * Get fallback location when GPS fails
   * @param {Error} error - The GPS error
   * @param {string} cacheKey - Cache key for expired cache lookup
   * @returns {Promise<Object>} Fallback location
   */
  async getLocationFallback(error, cacheKey) {
    // Try expired cache first
    const expiredCache = await this.getExpiredLocationCache(cacheKey);
    if (expiredCache && expiredCache.quality !== LOCATION_QUALITY.FALLBACK) {
      console.log('[PrayerTimesService] Using expired cache as fallback:', expiredCache);
      return { 
        ...expiredCache, 
        quality: LOCATION_QUALITY.GPS_CACHED,
        isExpired: true 
      };
    }

    // Use Jakarta fallback
    return {
      ...DEFAULT_LOCATION,
      quality: LOCATION_QUALITY.FALLBACK,
      fallbackReason: this.getGPSErrorMessage(error),
      timestamp: Date.now()
    };
  }

  /**
   * Get expired location cache (ignoring TTL)
   * @param {string} cacheKey - Cache key
   * @returns {Promise<Object|null>}
   */
  async getExpiredLocationCache(cacheKey) {
    try {
      // Access IndexedDB directly to get expired cache
      if (!unifiedCache.idbCache || !unifiedCache.idbCache.db) {
        return null;
      }

      const db = unifiedCache.idbCache.db;
      
      return new Promise((resolve) => {
        const transaction = db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const request = store.get(cacheKey);

        request.onsuccess = () => {
          const result = request.result;
          if (result && result.value) {
            resolve(result.value);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if cached location is fresh
   * @param {Object} location - Cached location
   * @param {number} maxAge - Maximum age in ms
   * @returns {boolean}
   */
  isLocationFresh(location, maxAge) {
    if (!location || !location.timestamp) return false;
    return Date.now() - location.timestamp < maxAge;
  }

  /**
   * Get human-readable GPS error message
   * @param {GeolocationPositionError} error 
   * @returns {string}
   */
  getGPSErrorMessage(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Permission denied';
      case error.POSITION_UNAVAILABLE:
        return 'Position unavailable';
      case error.TIMEOUT:
        return 'Request timed out';
      default:
        return error.message || 'Unknown error';
    }
  }

  // ==========================================================================
  // Geocoding
  // ==========================================================================

  /**
   * Fetch city name using reverse geocoding
   * @param {Object} location - Location object (modified in place)
   * @returns {Promise<void>}
   */
  async fetchCityName(location) {
    if (!location || location.quality === LOCATION_QUALITY.FALLBACK) {
      return;
    }

    // Check geocoding cache first
    const geocodingKey = unifiedCache.generateLocationKey(
      CACHE_NAMESPACES.GEOCODING,
      location.latitude,
      location.longitude
    );

    try {
      const cached = await unifiedCache.get(geocodingKey);
      if (cached) {
        location.city = cached.city;
        location.country = cached.country;
        return;
      }
    } catch (error) {
      console.warn('[PrayerTimesService] Geocoding cache read error:', error);
    }

    // Try each CORS proxy
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}`;

    for (const proxy of CORS_PROXIES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(
          `${proxy}${encodeURIComponent(nominatimUrl)}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const data = await response.json();
        
        location.city = 
          data.address.city ||
          data.address.town ||
          data.address.village ||
          data.address.county ||
          "Unknown";
        location.country = data.address.country || "Unknown";

        // Cache the result
        await unifiedCache.set(
          geocodingKey,
          { city: location.city, country: location.country },
          CACHE_TTL.GEOCODING
        );

        // Notify listeners of location update
        this.notifyListeners('location-updated');
        return;

      } catch (error) {
        console.warn(`[PrayerTimesService] Geocoding proxy ${proxy} failed:`, error);
      }
    }

    // All proxies failed
    location.city = "Unknown";
    location.country = "Unknown";
  }

  // ==========================================================================
  // Prayer Times
  // ==========================================================================

  /**
   * Generate timezone-aware cache key for prayer times
   * @param {Object} location - Location object
   * @returns {string} Cache key
   */
  generatePrayerCacheKey(location) {
    if (!location) return null;

    // Get local date in user's timezone
    const now = new Date();
    const localDate = now.toLocaleDateString('en-CA', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    return unifiedCache.generateLocationKey(
      CACHE_NAMESPACES.PRAYER_TIMES,
      location.latitude,
      location.longitude,
      localDate,
      location.quality
    );
  }

  /**
   * Calculate TTL until end of day in user's timezone
   * @returns {number} TTL in milliseconds
   */
  calculatePrayerTTL() {
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Get end of day in user's timezone
    const endOfDayStr = now.toLocaleDateString('en-CA', { timeZone: timezone }) + 'T23:59:59';
    const endOfDay = new Date(endOfDayStr);
    
    // Add 5 minute buffer for timezone edge cases
    const ttl = endOfDay.getTime() - now.getTime() + (5 * 60 * 1000);
    
    // Minimum 1 minute TTL
    return Math.max(ttl, 60 * 1000);
  }

  /**
   * Fetch prayer times from API or cache
   * @param {Object} location - Optional location override
   * @returns {Promise<Object>} Prayer times object
   */
  async fetchPrayerTimes(location = this.location) {
    if (!location) {
      throw new Error('Location not available');
    }

    const cacheKey = this.generatePrayerCacheKey(location);
    
    // Check cache first
    try {
      const cached = await unifiedCache.get(cacheKey);
      if (cached) {
        // Verify cache is from today
        const cacheDate = new Date(cached.date);
        const today = new Date();
        
        if (cacheDate.toDateString() === today.toDateString()) {
          console.log('[PrayerTimesService] Using cached prayer times');
          
          // Check if stale and refresh in background
          const cacheAge = Date.now() - new Date(cached.date).getTime();
          const STALE_THRESHOLD = 20 * 60 * 60 * 1000; // 20 hours
          
          if (cacheAge > STALE_THRESHOLD) {
            this.refreshPrayerTimesInBackground(location);
          }
          
          return cached.prayerTimes;
        }
      }
    } catch (error) {
      console.warn('[PrayerTimesService] Prayer times cache read error:', error);
    }

    // Fetch from API
    return this.fetchPrayerTimesFromAPI(location);
  }

  /**
   * Fetch prayer times from Aladhan API
   * @param {Object} location - Location object
   * @returns {Promise<Object>} Prayer times object
   */
  async fetchPrayerTimesFromAPI(location) {
    const today = new Date();
    const date = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const url = `https://api.aladhan.com/v1/timings/${date}-${month}-${year}?latitude=${location.latitude}&longitude=${location.longitude}&method=20`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 200 && data.data) {
        const prayerTimes = {};
        PRAYER_NAMES.forEach(name => {
          prayerTimes[name] = data.data.timings[name];
        });

        // Cache the result
        await this.cachePrayerTimes(location, prayerTimes);
        
        console.log('[PrayerTimesService] Fetched prayer times from API');
        return prayerTimes;
      }

      throw new Error('Invalid API response');
    } catch (error) {
      console.error('[PrayerTimesService] Prayer times fetch error:', error);
      throw error;
    }
  }

  /**
   * Cache prayer times
   * @param {Object} location - Location object
   * @param {Object} prayerTimes - Prayer times object
   */
  async cachePrayerTimes(location, prayerTimes) {
    const cacheKey = this.generatePrayerCacheKey(location);
    if (!cacheKey) return;

    const data = {
      date: new Date().toISOString(),
      prayerTimes: prayerTimes,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        quality: location.quality
      }
    };

    const ttl = this.calculatePrayerTTL();
    await unifiedCache.set(cacheKey, data, ttl);
  }

  /**
   * Refresh prayer times in background
   * @param {Object} location - Location object
   */
  async refreshPrayerTimesInBackground(location = this.location) {
    try {
      const prayerTimes = await this.fetchPrayerTimesFromAPI(location);
      this.prayerTimes = prayerTimes;
      this.notifyListeners('prayer-times-updated');
    } catch (error) {
      console.warn('[PrayerTimesService] Background refresh failed:', error);
    }
  }

  // ==========================================================================
  // Next Prayer Calculation
  // ==========================================================================

  /**
   * Calculate the next prayer and time remaining
   * @returns {Object} Next prayer info
   */
  calculateNextPrayer() {
    if (!this.prayerTimes) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Convert prayer times to minutes
    const prayerMinutes = PRAYER_NAMES.map(name => {
      const [hours, minutes] = this.prayerTimes[name].split(':').map(Number);
      return {
        name,
        time: this.prayerTimes[name],
        minutes: hours * 60 + minutes
      };
    });

    // Find next prayer
    let nextPrayer = null;
    for (const prayer of prayerMinutes) {
      if (prayer.minutes > currentMinutes) {
        nextPrayer = prayer;
        break;
      }
    }

    // If no next prayer found today, use Fajr tomorrow
    if (!nextPrayer) {
      nextPrayer = prayerMinutes[0];
      const minutesUntilMidnight = 24 * 60 - currentMinutes;
      this.timeToNextPrayer = minutesUntilMidnight + nextPrayer.minutes;
    } else {
      this.timeToNextPrayer = nextPrayer.minutes - currentMinutes;
    }

    this.nextPrayer = nextPrayer;
    return nextPrayer;
  }

  /**
   * Format time to next prayer
   * @returns {string} Formatted time string
   */
  formatTimeToNextPrayer() {
    if (this.timeToNextPrayer === null) return "";

    const hours = Math.floor(this.timeToNextPrayer / 60);
    const minutes = this.timeToNextPrayer % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  // ==========================================================================
  // Formatting Utilities
  // ==========================================================================

  /**
   * Format current date
   * @returns {string} Formatted date string
   */
  formatDate() {
    return new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  /**
   * Format current time
   * @param {boolean} includeSeconds - Include seconds in output
   * @returns {string} Formatted time string
   */
  formatCurrentTime(includeSeconds = false) {
    const options = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    
    if (includeSeconds) {
      options.second = "2-digit";
    }
    
    return new Date().toLocaleTimeString("en-US", options);
  }

  /**
   * Format location for display
   * @returns {string} Formatted location string
   */
  formatLocation() {
    if (!this.location) return "Unknown";
    
    const city = this.location.city || "Unknown";
    const country = this.location.country || "Unknown";
    const fallbackIndicator = this.location.quality === LOCATION_QUALITY.FALLBACK ? ' (Fallback)' : '';
    
    return `${city}, ${country}${fallbackIndicator}`;
  }

  // ==========================================================================
  // State Management
  // ==========================================================================

  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState() {
    return {
      location: this.location,
      prayerTimes: this.prayerTimes,
      nextPrayer: this.nextPrayer,
      timeToNextPrayer: this.timeToNextPrayer,
      formattedTimeToNext: this.formatTimeToNextPrayer(),
      isLoading: this.isLoading,
      error: this.error,
      formattedDate: this.formatDate(),
      formattedTime: this.formatCurrentTime(),
      formattedLocation: this.formatLocation()
    };
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   * @param {string} event - Event type
   * @param {*} data - Event data
   */
  notifyListeners(event, data) {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state, event, data);
      } catch (error) {
        console.error('[PrayerTimesService] Listener error:', error);
      }
    });
  }

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  /**
   * Setup event handlers for network and visibility
   */
  setupEventHandlers() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('[PrayerTimesService] Network restored, refreshing...');
    this.refreshPrayerTimesInBackground();
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('[PrayerTimesService] Network lost, using cached data');
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // Recalculate next prayer when page becomes visible
      this.calculateNextPrayer();
      this.notifyListeners('visibility-change');
    }
  }

  // ==========================================================================
  // Update Interval
  // ==========================================================================

  /**
   * Setup update interval for clock and next prayer
   */
  setupUpdateInterval() {
    // Clear existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update every second
    this.updateInterval = setInterval(() => {
      this.calculateNextPrayer();
      this.notifyListeners('tick');
    }, 1000);
  }

  // ==========================================================================
  // Date Change Detection
  // ==========================================================================

  /**
   * Setup date change detection for cache invalidation
   */
  setupDateChangeDetection() {
    this.lastDate = new Date().toDateString();
    
    setInterval(() => {
      const currentDate = new Date().toDateString();
      if (this.lastDate !== currentDate) {
        console.log('[PrayerTimesService] Date changed, invalidating cache');
        this.lastDate = currentDate;
        this.invalidatePrayerTimesCache();
      }
    }, 60 * 1000); // Check every minute
  }

  // ==========================================================================
  // Cache Invalidation
  // ==========================================================================

  /**
   * Invalidate location cache
   */
  async invalidateLocationCache() {
    await unifiedCache.invalidateNamespace(CACHE_NAMESPACES.LOCATION);
    this.location = null;
    this.notifyListeners('location-invalidated');
  }

  /**
   * Invalidate prayer times cache
   */
  async invalidatePrayerTimesCache() {
    await unifiedCache.invalidateNamespace(CACHE_NAMESPACES.PRAYER_TIMES);
    this.prayerTimes = null;
    
    // Re-fetch prayer times
    try {
      this.prayerTimes = await this.fetchPrayerTimes();
      this.calculateNextPrayer();
      this.notifyListeners('prayer-times-updated');
    } catch (error) {
      console.error('[PrayerTimesService] Failed to refresh prayer times:', error);
    }
  }

  /**
   * Invalidate all caches
   */
  async invalidateAllCaches() {
    await this.invalidateLocationCache();
    await this.invalidatePrayerTimesCache();
  }

  // ==========================================================================
  // Force Refresh
  // ==========================================================================

  /**
   * Force refresh location and prayer times
   * @returns {Promise<void>}
   */
  async forceRefresh() {
    this.isLoading = true;
    this.notifyListeners('loading');

    try {
      // Get fresh location
      this.location = await this.getLocation({ forceRefresh: true });
      
      // Get fresh prayer times
      this.prayerTimes = await this.fetchPrayerTimesFromAPI(this.location);
      
      // Recalculate
      this.calculateNextPrayer();
      
      this.error = null;
      this.notifyListeners('refreshed');
    } catch (error) {
      this.error = error;
      this.notifyListeners('error', error);
    } finally {
      this.isLoading = false;
    }
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroy the service and cleanup
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    this.listeners.clear();
    this.initialized = false;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const prayerTimesService = new PrayerTimesService();

// Auto-initialize on first import (non-blocking)
if (typeof window !== 'undefined') {
  prayerTimesService.init().catch(err => {
    console.warn('[PrayerTimesService] Auto-init failed:', err);
  });
}
