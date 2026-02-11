/**
 * Marquee Module
 * Displays prayer times widget and carousel captions in a scrolling marquee
 */

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
   */
  getCachedPrayerTimes() {
    try {
      const cacheKey = this.getCacheKey();
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is from today
        const cacheDate = new Date(data.date);
        const today = new Date();
        if (cacheDate.toDateString() === today.toDateString()) {
          return data.prayerTimes;
        }
      }
    } catch (error) {
      console.warn('Error reading cache:', error);
    }
    return null;
  }

  /**
   * Cache prayer times for today
   */
  cachePrayerTimes(prayerTimes) {
    try {
      const cacheKey = this.getCacheKey();
      const data = {
        date: new Date().toISOString(),
        prayerTimes: prayerTimes
      };
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Error writing cache:', error);
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

      // Get user's location
      await this.getLocation();

      // Fetch prayer times
      await this.fetchPrayerTimes();

      // Update display
      this.updateDisplay();

      // Set up interval to update current time and next prayer
      this.updateInterval = setInterval(() => {
        this.updateDisplay();
      }, 1000); // Update every second
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
   * Get user's geolocation
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
   * Fetch prayer times from Aladhan API with caching
   */
  async fetchPrayerTimes() {
    // Try to get cached prayer times first
    const cached = this.getCachedPrayerTimes();
    if (cached) {
      console.log('Using cached prayer times');
      this.prayerTimes = cached;
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

    this.currentTime = this.formatCurrentTime();
    const currentDate = this.formatDate();
    this.calculateNextPrayer();

    const locationText = `${this.location.city}, ${this.location.country}`;
    const timeToNext = this.formatTimeToNextPrayer();
    const nextPrayerName = this.nextPrayer ? this.nextPrayer.name : "Unknown";

    // Check if widget is enabled
    const widgetEnabled = this.feedConfig?.widget?.enabled !== false; // Default to true if not specified

    // Build widget section content with header (only location, date, current time, and next prayer)
    let widgetSection = '';
    if (widgetEnabled) {
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

      console.log('[Marquee Debug] feedType:', this.feedType);
      console.log('[Marquee Debug] entityName:', this.entityName);
      console.log('[Marquee Debug] widgetEnabled:', widgetEnabled);
      console.log('[Marquee Debug] carousels found:', carousels.length);

      if (carousels.length > 0) {
        const carouselItems = carousels.map(carousel => {
          const captions = carousel.images.map(img => img.caption).join(' • ');
          let header = '';
          
          if (this.feedType === 'institution') {
            // For institution feed, show "Posted in (Jurisdiction)"
            const jurisdictionName = carousel.post_to_jurisdictions?.[0] || '';
            const cleanJurisdictionName = jurisdictionName.replace(/\s*\[.*?\]\s*/g, '').trim();
            header = `Posted in ${cleanJurisdictionName}`;
            console.log('[Marquee Debug] Institution feed - jurisdictionName:', jurisdictionName, '-> clean:', cleanJurisdictionName);
          } else if (this.feedType === 'jurisdiction') {
            // For jurisdiction feed, show "Posted by (Institution)"
            const institutionName = carousel.institution || '';
            const cleanInstitutionName = institutionName.replace(/\s*\[.*?\]\s*/g, '').trim();
            header = `Posted by ${cleanInstitutionName}`;
            console.log('[Marquee Debug] Jurisdiction feed - institutionName:', institutionName, '-> clean:', cleanInstitutionName);
          }
          
          console.log('[Marquee Debug] Carousel header:', header);
          console.log('[Marquee Debug] Carousel captions:', captions);
          
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

    // Duplicate content for seamless looping
    this.marqueeElement.innerHTML = content + content;

    // Set consistent scroll speed across all screen sizes
    this.setScrollSpeed();
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
