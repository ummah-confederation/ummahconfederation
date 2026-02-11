/**
 * Marquee Module
 * Displays prayer times widget and carousel captions in a scrolling marquee
 * Enhanced with optimized caching using ResponseCache utility
 */

import { ResponseCache, CACHE_TTL } from './cache.js';

class Marquee {
  constructor() {
    this.prayerTimes = null;
    this.location = null;
    this.currentTime = null;
    this.nextPrayer = null;
    this.timeToNextPrayer = null;
    this.marqueeElement = null;
    this.updateInterval = null;
    this.cacheKey = 'prayerTimesCache';
    this.feedConfig = null;
    this.feedType = null;
    this.entityName = null;
    this.entityMetadata = null;
    this.cachedContent = null; // Cache for repeated content
    this.cachedContentHash = null; // Hash to detect content changes

    // Initialize cache utilities
    this.prayerCache = new ResponseCache();
    this.geocodingCache = new ResponseCache(CACHE_TTL.VERY_LONG); // 24 hours for geocoding
  }

  /**
   * Get cache key for today's date and location
   */
  getCacheKey() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const locationStr = `${this.location?.latitude?.toFixed(2)}_${this.location?.longitude?.toFixed(2)}`;
    return `${this.cacheKey}_${dateStr}_${locationStr}`;
  }

  /**
   * Get cached prayer times for today
   * @returns {Object|null} Cached prayer times or null
   */
  getCachedPrayerTimes() {
    try {
      const cacheKey = this.getCacheKey();
      const cached = this.prayerCache.get(cacheKey);
      if (cached) {
        // Check if cache is from today
        const cacheDate = new Date(cached.date);
        const today = new Date();
        if (cacheDate.toDateString() === today.toDateString()) {
          return cached.prayerTimes;
        }
      }
    } catch (error) {
      console.warn('Error reading cache:', error);
    }
    return null;
  }

  /**
   * Cache prayer times for today
   * @param {Object} prayerTimes - Prayer times object
   */
  cachePrayerTimes(prayerTimes) {
    try {
      const cacheKey = this.getCacheKey();
      const data = {
        date: new Date().toISOString(),
        prayerTimes: prayerTimes
      };
      // Cache for 24 hours (until end of day)
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const ttl = endOfDay.getTime() - now.getTime();
      this.prayerCache.set(cacheKey, data, ttl);
    } catch (error) {
      console.warn('Error writing cache:', error);
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
        this.cachePrayerTimes(prayerTimes);
        this.prayerTimes = prayerTimes;
      }
    } catch (error) {
      console.warn('Background prayer times refresh failed:', error);
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
      const widgetEnabled = this.feedConfig?.widget?.enabled !== false; // Default to true if not specified

      // Only fetch prayer times and location if widget is enabled
      if (widgetEnabled) {
        // Get user's location
        await this.getLocation();

        // Fetch prayer times
        await this.fetchPrayerTimes();
      }

      // Update display
      this.updateDisplay();

      // Set up interval to update current time and next prayer (only if widget is enabled)
      if (widgetEnabled) {
        this.updateInterval = setInterval(() => {
          this.updateDisplay();
        }, 1000); // Update every second
      }
    } catch (error) {
      console.error("Error initializing marquee:", error);
      this.showError();
    }
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
   * Get user's geolocation with enhanced caching
   */
  async getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          this.location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          // Check geocoding cache first
          const geocodingCacheKey = `geocoding_${this.location.latitude.toFixed(4)}_${this.location.longitude.toFixed(4)}`;
          const cachedGeocoding = this.geocodingCache.get(geocodingCacheKey);

          if (cachedGeocoding) {
            console.log('Using cached geocoding data');
            this.location.city = cachedGeocoding.city;
            this.location.country = cachedGeocoding.country;
            resolve(this.location);
            return;
          }

          // Get city name using reverse geocoding
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${this.location.latitude}&lon=${this.location.longitude}`,
            );
            const data = await response.json();
            this.location.city =
              data.address.city ||
              data.address.town ||
              data.address.village ||
              data.address.county ||
              "Unknown";
            this.location.country = data.address.country || "Unknown";

            // Cache the geocoding result (7 days)
            this.geocodingCache.set(geocodingCacheKey, {
              city: this.location.city,
              country: this.location.country
            }, 7 * 24 * 60 * 60 * 1000);
          } catch (error) {
            console.warn("Could not get city name:", error);
            this.location.city = "Unknown";
            this.location.country = "Unknown";
          }

          resolve(this.location);
        },
        (error) => {
          // Default to Jakarta if geolocation fails
          console.warn(
            "Geolocation failed, using default location (Jakarta):",
            error,
          );
          this.location = {
            latitude: -6.2088,
            longitude: 106.8456,
            city: "Jakarta",
            country: "Indonesia",
          };
          resolve(this.location);
        },
      );
    });
  }

  /**
   * Fetch prayer times from Aladhan API with enhanced caching
   * Uses stale-while-revalidate pattern for better performance
   */
  async fetchPrayerTimes() {
    const cacheKey = this.getCacheKey();

    // Try to get cached prayer times first
    const cached = this.getCachedPrayerTimes();
    if (cached) {
      console.log('Using cached prayer times');
      this.prayerTimes = cached;

      // Check if cache is stale (older than 20 hours) and refresh in background
      const cachedData = this.prayerCache.get(cacheKey);
      if (cachedData) {
        const cacheAge = Date.now() - new Date(cachedData.date).getTime();
        const STALE_THRESHOLD = 20 * 60 * 60 * 1000; // 20 hours

        if (cacheAge > STALE_THRESHOLD) {
          console.log('Cache is stale, refreshing in background');
          this.refreshPrayerTimesInBackground();
        }
      }
      return;
    }

    // If no cache, fetch from API
    console.log('Fetching prayer times from API');
    const today = new Date();
    const date = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const url = `https://api.aladhan.com/v1/timings/${date}-${month}-${year}?latitude=${this.location.latitude}&longitude=${this.location.longitude}&method=20`; // Method 20: Kemenag (Indonesia)

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
      // Cache the prayer times
      this.cachePrayerTimes(this.prayerTimes);
    } else {
      throw new Error("Failed to fetch prayer times");
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
      second: "2-digit",
      hour12: true,
    });
  }

  /**
   * Update the marquee display
   */
  updateDisplay() {
    if (!this.marqueeElement) return;

    // Check if widget is enabled
    const widgetEnabled = this.feedConfig?.widget?.enabled !== false; // Default to true if not specified

    // Build widget section content with header (only location, date, current time, and next prayer)
    let widgetSection = '';
    if (widgetEnabled) {
      this.currentTime = this.formatCurrentTime();
      const currentDate = this.formatDate();
      this.calculateNextPrayer();

      const locationText = `${this.location.city}, ${this.location.country}`;
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
            // For institution feed, show "Posted in (Jurisdiction)"
            const jurisdictionName = carousel.post_to_jurisdictions?.[0] || '';
            const cleanJurisdictionName = jurisdictionName.replace(/\s*\[.*?\]\s*/g, '').trim();
            header = `Posted in ${cleanJurisdictionName}`;
          } else if (this.feedType === 'jurisdiction') {
            // For jurisdiction feed, show "Posted by (Institution)"
            const institutionName = carousel.institution || '';
            const cleanInstitutionName = institutionName.replace(/\s*\[.*?\]\s*/g, '').trim();
            header = `Posted by ${cleanInstitutionName}`;
          }

          return `<span class="prayer-item"><span class="prayer-label">${header}:</span> <span class="prayer-value">${captions}</span></span>`;
        }).join(' <span class="prayer-separator">•</span> ');

        carouselContent = ` <span class="prayer-separator">|</span> ${carouselItems}`;
      }
    }

    // Build the complete marquee content with section headers
    // Use | separator at the end if there's carousel content, otherwise use •
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
    const pixelsPerSecond = 30; // ADJUST THIS VALUE: lower = slower (e.g., 30), higher = faster (e.g., 100)
    
    // Get the actual width of the marquee content
    const contentWidth = this.marqueeElement.scrollWidth / 2; // Divide by 2 because content is duplicated
    
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
