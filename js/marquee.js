/**
 * Marquee Module
 * Displays prayer times widget and carousel captions in a scrolling marquee
 * Refactored with unified caching and proper error handling
 */

import { unifiedCache, CACHE_NAMESPACES, CACHE_DEFAULT_TTL, LOCATION_PRECISION } from './unified-cache.js';

// Geolocation configuration
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: false,  // Faster, less accurate is OK for prayer times
  timeout: 10000,             // 10 seconds max
  maximumAge: 0               // Always get fresh position (don't use browser cache)
};

// CORS proxy fallbacks for geocoding
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url='
];

// Default fallback location (Jakarta)
const DEFAULT_LOCATION = {
  latitude: -6.2088,
  longitude: 106.8456,
  city: "Jakarta",
  country: "Indonesia"
};

class Marquee {
  constructor() {
    this.prayerTimes = null;
    this.location = null;
    this.locationError = null;
    this.currentTime = null;
    this.nextPrayer = null;
    this.timeToNextPrayer = null;
    this.marqueeElement = null;
    this.updateInterval = null;
    this.feedConfig = null;
    this.feedType = null;
    this.entityName = null;
    this.entityMetadata = null;
    this.cachedContent = null;
    this.cachedContentHash = null;
    this.isLoading = false;
  }

  /**
   * Generate cache key for today's prayer times
   */
  getPrayerCacheKey() {
    if (!this.location) return null;
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    return unifiedCache.generateLocationKey(
      CACHE_NAMESPACES.PRAYER_TIMES,
      this.location.latitude,
      this.location.longitude,
      dateStr
    );
  }

  /**
   * Get cached prayer times for today
   * @returns {Promise<Object|null>} Cached prayer times or null
   */
  async getCachedPrayerTimes() {
    const cacheKey = this.getPrayerCacheKey();
    if (!cacheKey) return null;

    try {
      const cached = await unifiedCache.get(cacheKey);
      if (cached) {
        // Verify cache is from today
        const cacheDate = new Date(cached.date);
        const today = new Date();
        if (cacheDate.toDateString() === today.toDateString()) {
          return cached.prayerTimes;
        }
      }
    } catch (error) {
      console.warn('Error reading prayer cache:', error);
    }
    return null;
  }

  /**
   * Cache prayer times for today
   * @param {Object} prayerTimes - Prayer times object
   */
  async cachePrayerTimes(prayerTimes) {
    const cacheKey = this.getPrayerCacheKey();
    if (!cacheKey) return;

    try {
      const data = {
        date: new Date().toISOString(),
        prayerTimes: prayerTimes,
        location: {
          latitude: this.location.latitude,
          longitude: this.location.longitude
        }
      };

      // Calculate TTL until end of day
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const ttl = endOfDay.getTime() - now.getTime();

      await unifiedCache.set(cacheKey, data, ttl);
    } catch (error) {
      console.warn('Error writing prayer cache:', error);
    }
  }

  /**
   * Refresh prayer times in background (stale-while-revalidate)
   */
  async refreshPrayerTimesInBackground() {
    try {
      const today = new Date();
      const date = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const url = `https://api.aladhan.com/v1/timings/${date}-${month}-${year}?latitude=${this.location.latitude}&longitude=${this.location.longitude}&method=20`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 200 && data.data) {
        const prayerTimes = {
          Fajr: data.data.timings.Fajr,
          Dhuhr: data.data.timings.Dhuhr,
          Asr: data.data.timings.Asr,
          Maghrib: data.data.timings.Maghrib,
          Isha: data.data.timings.Isha,
        };
        await this.cachePrayerTimes(prayerTimes);
        this.prayerTimes = prayerTimes;
      }
    } catch (error) {
      console.warn('Background prayer times refresh failed:', error);
    }
  }

  /**
   * Show loading state in marquee
   */
  showLoadingState() {
    if (!this.marqueeElement) return;
    this.marqueeElement.innerHTML = `
      <span class="prayer-loading">
        <span class="loading-spinner"></span>
        Fetching your location...
      </span>
    `;
  }

  /**
   * Show error/warning state in marquee
   * @param {string} message - Message to display
   * @param {boolean} showRetry - Whether to show retry button
   */
  showWarningState(message, showRetry = true) {
    if (!this.marqueeElement) return;
    
    const retryBtn = showRetry ? `<button class="retry-location-btn" title="Retry location fetch">🔄</button>` : '';
    
    this.marqueeElement.innerHTML = `
      <span class="prayer-warning">
        ⚠️ ${message} ${retryBtn}
      </span>
    `;

    // Add retry handler
    if (showRetry) {
      const retryBtn = this.marqueeElement.querySelector('.retry-location-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.retryLocationFetch();
        });
      }
    }
  }

  /**
   * Retry location fetch
   */
  async retryLocationFetch() {
    this.showLoadingState();
    this.locationError = null;
    
    try {
      await this.getLocation();
      await this.fetchPrayerTimes();
      this.updateDisplay();
    } catch (error) {
      console.error('Retry failed:', error);
      this.showWarningState('Location fetch failed. Using fallback location.');
    }
  }

  /**
   * Initialize the marquee module
   */
  async init() {
    this.marqueeElement = document.getElementById("prayer-times-marquee");
    if (!this.marqueeElement) {
      console.error("Marquee element not found");
      return;
    }

    // Add click handler for navigation to feed page
    this.marqueeElement.style.cursor = "pointer";
    this.marqueeElement.addEventListener("click", () => {
      this.navigateToFeed();
    });

    try {
      // Get feed type and entity name from URL
      this.getFeedContext();

      // Fetch feed configuration
      await this.fetchFeedConfig();

      // Fetch entity metadata (for bio fallback)
      await this.fetchEntityMetadata();

      // Check if widget is enabled
      const widgetEnabled = this.feedConfig?.widget?.enabled !== false;

      // Only fetch prayer times and location if widget is enabled
      if (widgetEnabled) {
        // Show loading state
        this.showLoadingState();

        // Initialize unified cache
        await unifiedCache.init();

        // Get user's location (will check cache first, then request GPS if needed)
        await this.getLocation();

        // Fetch prayer times
        await this.fetchPrayerTimes();
      }

      // Update display
      this.updateDisplay();

      // Set up interval to update current time and next prayer
      if (widgetEnabled) {
        this.updateInterval = setInterval(() => {
          this.updateDisplay();
        }, 1000); // Update every second
      }

      // Set up network status handlers
      this.setupNetworkHandlers();

    } catch (error) {
      console.error("Error initializing marquee:", error);
      this.showError();
    }
  }

  /**
   * Set up network status handlers
   */
  setupNetworkHandlers() {
    window.addEventListener('online', () => {
      console.log('Network restored, refreshing prayer times');
      this.refreshPrayerTimesInBackground();
    });

    window.addEventListener('offline', () => {
      console.log('Network lost, using cached data');
    });
  }

  /**
   * Get feed context from URL parameters
   */
  getFeedContext() {
    const params = new URLSearchParams(window.location.search);
    const institution = params.get('institution');
    const jurisdiction = params.get('jurisdiction');

    if (institution) {
      this.feedType = 'institution';
      this.entityName = institution;
    } else if (jurisdiction) {
      this.feedType = 'jurisdiction';
      this.entityName = jurisdiction;
    } else {
      this.feedType = 'global';
      this.entityName = null;
    }
  }

  /**
   * Fetch feed configuration based on feed type
   */
  async fetchFeedConfig() {
    if (this.feedType === 'global') {
      this.feedConfig = null;
      return;
    }

    try {
      const { getInstitutionFeedConfig, getJurisdictionFeedConfig, getJurisdictionCarousels } = await import('./config.js');

      if (this.feedType === 'institution') {
        this.feedConfig = await getInstitutionFeedConfig(this.entityName);
      } else if (this.feedType === 'jurisdiction') {
        this.feedConfig = await getJurisdictionFeedConfig(this.entityName);
        // Get carousels from institutions for jurisdiction feeds
        const carousels = await getJurisdictionCarousels(this.entityName);
        this.feedConfig = {
          ...this.feedConfig,
          carousels: carousels
        };
      }
    } catch (error) {
      console.warn('Error fetching feed config:', error);
      this.feedConfig = null;
    }
  }

  /**
   * Fetch entity metadata (for bio fallback)
   */
  async fetchEntityMetadata() {
    if (!this.entityName) {
      this.entityMetadata = null;
      return;
    }

    try {
      const { getInstitutionMetadata, getJurisdictionMetadata } = await import('./config.js');

      if (this.feedType === 'institution') {
        this.entityMetadata = await getInstitutionMetadata(this.entityName);
      } else if (this.feedType === 'jurisdiction') {
        this.entityMetadata = await getJurisdictionMetadata(this.entityName);
      }
    } catch (error) {
      console.warn('Error fetching entity metadata:', error);
      this.entityMetadata = null;
    }
  }

  /**
   * Get user's geolocation with proper error handling
   * Uses cached location if available to avoid repeated GPS requests
   */
  async getLocation() {
    // First, try to get cached location
    const locationCacheKey = unifiedCache.generateKey(CACHE_NAMESPACES.LOCATION, 'current');
    
    try {
      const cachedLocation = await unifiedCache.get(locationCacheKey);
      if (cachedLocation && !cachedLocation.isFallback) {
        console.log('Using cached location:', cachedLocation);
        this.location = cachedLocation;
        return this.location;
      }
    } catch (error) {
      console.warn('Error reading location cache:', error);
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.warn("Geolocation is not supported by this browser");
        this.location = { ...DEFAULT_LOCATION, isFallback: true };
        this.locationError = { code: 0, message: 'Geolocation not supported' };
        resolve(this.location);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          this.location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            isFallback: false
          };

          // Try to get city name using reverse geocoding
          await this.fetchCityName();

          // Cache the location for 5 minutes
          await unifiedCache.set(locationCacheKey, this.location, CACHE_DEFAULT_TTL.LOCATION);

          resolve(this.location);
        },
        (error) => {
          // Handle specific error types
          let errorMessage = 'Unknown location error';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Position unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = error.message || 'Unknown error';
          }

          console.warn(`Geolocation failed (${errorMessage}), using fallback:`, error);
          
          // Store error info
          this.locationError = {
            code: error.code,
            message: errorMessage
          };

          // Set fallback location with flag
          this.location = { ...DEFAULT_LOCATION, isFallback: true };
          
          resolve(this.location);
        },
        GEOLOCATION_OPTIONS
      );
    });
  }

  /**
   * Fetch city name using reverse geocoding with fallback proxies
   */
  async fetchCityName() {
    if (!this.location || this.location.isFallback) return;

    // Check geocoding cache first
    const geocodingCacheKey = unifiedCache.generateLocationKey(
      CACHE_NAMESPACES.GEOCODING,
      this.location.latitude,
      this.location.longitude
    );

    try {
      const cachedGeocoding = await unifiedCache.get(geocodingCacheKey);
      if (cachedGeocoding) {
        this.location.city = cachedGeocoding.city;
        this.location.country = cachedGeocoding.country;
        return;
      }
    } catch (error) {
      console.warn('Error reading geocoding cache:', error);
    }

    // Try each CORS proxy
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${this.location.latitude}&lon=${this.location.longitude}`;

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
        
        this.location.city =
          data.address.city ||
          data.address.town ||
          data.address.village ||
          data.address.county ||
          "Unknown";
        this.location.country = data.address.country || "Unknown";

        // Cache the geocoding result
        await unifiedCache.set(
          geocodingCacheKey,
          { city: this.location.city, country: this.location.country },
          CACHE_DEFAULT_TTL.GEOCODING
        );

        return; // Success, exit
      } catch (error) {
        console.warn(`Geocoding proxy ${proxy} failed:`, error);
        // Continue to next proxy
      }
    }

    // All proxies failed
    console.warn('All geocoding proxies failed');
    this.location.city = "Unknown";
    this.location.country = "Unknown";
  }

  /**
   * Fetch prayer times from Aladhan API with enhanced caching
   */
  async fetchPrayerTimes() {
    // Try to get cached prayer times first
    const cached = await this.getCachedPrayerTimes();
    if (cached) {
      this.prayerTimes = cached;

      // Check if cache is stale (older than 20 hours) and refresh in background
      const cacheKey = this.getPrayerCacheKey();
      if (cacheKey) {
        const cachedData = await unifiedCache.get(cacheKey);
        if (cachedData) {
          const cacheAge = Date.now() - new Date(cachedData.date).getTime();
          const STALE_THRESHOLD = 20 * 60 * 60 * 1000; // 20 hours

          if (cacheAge > STALE_THRESHOLD) {
            this.refreshPrayerTimesInBackground();
          }
        }
      }
      return;
    }

    // If no cache, fetch from API
    if (!this.location) {
      throw new Error("Location not available");
    }

    const today = new Date();
    const date = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const url = `https://api.aladhan.com/v1/timings/${date}-${month}-${year}?latitude=${this.location.latitude}&longitude=${this.location.longitude}&method=20`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 200 && data.data) {
        this.prayerTimes = {
          Fajr: data.data.timings.Fajr,
          Dhuhr: data.data.timings.Dhuhr,
          Asr: data.data.timings.Asr,
          Maghrib: data.data.timings.Maghrib,
          Isha: data.data.timings.Isha,
        };
        await this.cachePrayerTimes(this.prayerTimes);
      } else {
        throw new Error("Failed to fetch prayer times");
      }
    } catch (error) {
      console.error('Prayer times fetch error:', error);
      throw error;
    }
  }

  /**
   * Calculate time to next prayer
   */
  calculateNextPrayer() {
    if (!this.prayerTimes) return null;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const prayers = [
      { name: "Fajr", time: this.prayerTimes.Fajr },
      { name: "Dhuhr", time: this.prayerTimes.Dhuhr },
      { name: "Asr", time: this.prayerTimes.Asr },
      { name: "Maghrib", time: this.prayerTimes.Maghrib },
      { name: "Isha", time: this.prayerTimes.Isha },
    ];

    // Convert prayer times to minutes
    const prayerMinutes = prayers.map((prayer) => {
      const [hours, minutes] = prayer.time.split(":").map(Number);
      return {
        name: prayer.name,
        time: prayer.time,
        minutes: hours * 60 + minutes,
      };
    });

    // Find next prayer
    let nextPrayer = null;
    for (const prayer of prayerMinutes) {
      if (prayer.minutes > currentTime) {
        nextPrayer = prayer;
        break;
      }
    }

    // If no next prayer found today, use Fajr tomorrow
    if (!nextPrayer) {
      nextPrayer = prayerMinutes[0];
      const minutesUntilMidnight = 24 * 60 - currentTime;
      this.timeToNextPrayer = minutesUntilMidnight + nextPrayer.minutes;
    } else {
      this.timeToNextPrayer = nextPrayer.minutes - currentTime;
    }

    this.nextPrayer = nextPrayer;
    return nextPrayer;
  }

  /**
   * Format time to next prayer
   */
  formatTimeToNextPrayer() {
    if (this.timeToNextPrayer === null) return "";

    const hours = Math.floor(this.timeToNextPrayer / 60);
    const minutes = this.timeToNextPrayer % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Format current date
   */
  formatDate() {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  /**
   * Format current time
   */
  formatCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  /**
   * Update the marquee display
   */
  updateDisplay() {
    if (!this.marqueeElement) return;

    // Check if widget is enabled
    const widgetEnabled = this.feedConfig?.widget?.enabled !== false;

    // Build widget section content with header
    let widgetSection = '';
    if (widgetEnabled) {
      this.currentTime = this.formatCurrentTime();
      const currentDate = this.formatDate();
      this.calculateNextPrayer();

      // Show fallback indicator if using fallback location
      const fallbackIndicator = this.location?.isFallback ? ' (Fallback)' : '';
      const locationText = `${this.location.city}, ${this.location.country}${fallbackIndicator}`;
      const timeToNext = this.formatTimeToNextPrayer();
      const nextPrayerName = this.nextPrayer ? this.nextPrayer.name : "Unknown";

      const widgetContent = `<span class="prayer-item"><span class="prayer-label">📍</span> <span class="prayer-value">${locationText}</span></span> <span class="prayer-separator">•</span> <span class="prayer-item"><span class="prayer-label">📅</span> <span class="prayer-value">${currentDate}</span></span> <span class="prayer-separator">•</span> <span class="prayer-item"><span class="prayer-label">🕐</span> <span class="prayer-value">${this.currentTime}</span></span> <span class="prayer-separator">•</span> <span class="prayer-item"><span class="prayer-label">⏰</span> <span class="prayer-value">${nextPrayerName} (${timeToNext})</span></span>`;
      widgetSection = `<span class="prayer-item"><span class="prayer-label">Prayer Time Widget:</span> <span class="prayer-value">${widgetContent}</span></span>`;
    }

    // Build carousel section content if available
    let carouselContent = '';
    if (this.feedConfig) {
      const carousels = [];

      if (this.feedType === 'institution' && this.feedConfig.carousel) {
        carousels.push(this.feedConfig.carousel);
      } else if (this.feedType === 'jurisdiction' && this.feedConfig.carousels) {
        carousels.push(...this.feedConfig.carousels);
      }

      if (carousels.length > 0) {
        const carouselItems = carousels.map(carousel => {
          const captions = carousel.title;
          let header = '';

          if (this.feedType === 'institution') {
            const jurisdictionName = carousel.post_to_jurisdictions?.[0] || '';
            const cleanJurisdictionName = jurisdictionName.replace(/\s*\[.*?\]\s*/g, '').trim();
            header = `Posted in ${cleanJurisdictionName}`;
          } else if (this.feedType === 'jurisdiction') {
            const institutionName = carousel.institution || '';
            const cleanInstitutionName = institutionName.replace(/\s*\[.*?\]\s*/g, '').trim();
            header = `Posted by ${cleanInstitutionName}`;
          }

          return `<span class="prayer-item"><span class="prayer-label">${header}:</span> <span class="prayer-value">${captions}</span></span>`;
        }).join(' <span class="prayer-separator">•</span> ');

        carouselContent = ` <span class="prayer-separator">|</span> ${carouselItems}`;
      }
    }

    // Build the complete marquee content
    const endSeparator = carouselContent ? '|' : '•';
    let content = `${widgetSection}${carouselContent} <span class="prayer-separator">${endSeparator}</span> `;

    // If no widget and no carousel, show bio as fallback
    if (!widgetSection && !carouselContent && this.entityMetadata?.bio) {
      const bio = this.entityMetadata.bio;
      content = `<span class="prayer-item"><span class="prayer-value">${bio}</span></span> <span class="prayer-separator">•</span> `;
    }

    // Create a hash of the content (excluding time) to detect actual changes
    const contentHash = this.generateContentHash(widgetSection, carouselContent, this.entityMetadata?.bio);

    // Only regenerate repeated content if the structure has changed
    if (this.cachedContentHash !== contentHash) {
      // Ensure content is long enough to fill screen without gaps
      const screenWidth = window.innerWidth;
      const temp = document.createElement('div');
      temp.style.visibility = 'hidden';
      temp.style.position = 'absolute';
      temp.style.whiteSpace = 'nowrap';
      temp.innerHTML = content;
      document.body.appendChild(temp);
      const contentWidth = temp.offsetWidth;
      document.body.removeChild(temp);

      // If content is shorter than 2x screen width, repeat it
      if (contentWidth < screenWidth * 2) {
        const repetitions = Math.ceil((screenWidth * 2) / contentWidth) + 1;
        content = Array(repetitions).fill(content.trim()).join(' ');
      }

      this.cachedContent = content;
      this.cachedContentHash = contentHash;
    } else {
      // Use cached content, just update the time if widget is enabled
      if (widgetEnabled && this.cachedContent) {
        // Update time in cached content
        const timeRegex = /<span class="prayer-value">(\d{1,2}:\d{2}:\d{2}\s[AP]M)<\/span>/;
        const timeMatch = this.cachedContent.match(timeRegex);
        if (timeMatch) {
          this.cachedContent = this.cachedContent.replace(timeMatch[0], `<span class="prayer-value">${this.currentTime}</span>`);
        }
      }
      content = this.cachedContent;
    }

    // Duplicate content for seamless looping
    this.marqueeElement.innerHTML = content + content;

    // Set consistent scroll speed across all screen sizes
    this.setScrollSpeed();
  }

  /**
   * Generate a hash of the content structure (excluding time)
   */
  generateContentHash(widgetSection, carouselContent, bio) {
    // Create a simplified version of content for hashing (remove time)
    const simplifiedWidget = widgetSection ? widgetSection.replace(/\d{1,2}:\d{2}:\d{2}\s[AP]M/g, 'TIME') : '';
    return `${simplifiedWidget}|${carouselContent}|${bio || ''}`;
  }

  /**
   * Set scroll speed based on content width for consistent speed across screen sizes
   */
  setScrollSpeed() {
    const pixelsPerSecond = 30;
    
    // Get the actual width of the marquee content
    const contentWidth = this.marqueeElement.scrollWidth / 2;
    
    // Calculate duration: width / speed
    const duration = contentWidth / pixelsPerSecond;
    
    // Apply the animation with calculated duration
    this.marqueeElement.style.animation = `scroll ${duration}s linear infinite`;
  }

  /**
   * Show error message
   */
  showError() {
    if (!this.marqueeElement) return;
    this.marqueeElement.innerHTML = `
      <span class="prayer-error">Unable to load marquee content. Please check your connection.</span>
    `;
  }

  /**
   * Navigate to feed page with appropriate parameters
   */
  navigateToFeed() {
    // Check if we're in profile mode (library.html with institution/jurisdiction filter)
    const params = new URLSearchParams(window.location.search);
    const institution = params.get('institution');
    const jurisdiction = params.get('jurisdiction');

    let feedUrl = 'feed.html';
    
    if (institution) {
      feedUrl = `feed.html?institution=${encodeURIComponent(institution)}`;
    } else if (jurisdiction) {
      feedUrl = `feed.html?jurisdiction=${encodeURIComponent(jurisdiction)}`;
    }

    window.location.href = feedUrl;
  }

  /**
   * Clean up intervals
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const marquee = new Marquee();
    marquee.init();
  });
} else {
  const marquee = new Marquee();
  marquee.init();
}

// Export for potential use in other modules
export { Marquee };
