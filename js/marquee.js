/**
 * Marquee Module
 * Displays prayer times widget and carousel captions in a scrolling marquee
 * 
 * REFACTORED: Now uses PrayerTimesService as single source of truth
 * All location, geocoding, and prayer times logic has been moved to the service
 */

import { prayerTimesService, LOCATION_QUALITY } from './prayer-times-service.js';

class Marquee {
  constructor() {
    this.marqueeElement = null;
    this.feedConfig = null;
    this.feedDocuments = [];
    this.feedType = null;
    this.entityName = null;
    this.entityMetadata = null;
    this.cachedContent = null;
    this.cachedContentHash = null;
    this.unsubscribe = null;
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

      if (widgetEnabled) {
        // Show loading state
        this.showLoadingState();

        // Subscribe to prayer times service updates
        this.unsubscribe = prayerTimesService.subscribe((state, event) => {
          this.handleServiceUpdate(state, event);
        });

        // Initialize the service (if not already initialized)
        await prayerTimesService.init();
      } else {
        // Widget disabled, just show carousel/bio
        this.updateDisplay();
      }

    } catch (error) {
      console.error("Error initializing marquee:", error);
      this.showError();
    }
  }

  /**
   * Handle updates from PrayerTimesService
   * @param {Object} state - Service state
   * @param {string} event - Event type
   */
  handleServiceUpdate(state, event) {
    switch (event) {
      case 'loading':
        // Only show loading if we don't have data yet
        if (!state.prayerTimes) {
          this.showLoadingState();
        }
        break;
      case 'initialized':
      case 'refreshed':
      case 'tick':
      case 'location-updated':
      case 'prayer-times-updated':
      case 'visibility-change':
        this.updateDisplay();
        break;
      case 'error':
        // Only show error if we don't have data to display
        if (!state.prayerTimes) {
          this.showWarningState(state.error?.message || 'Unable to load prayer times');
        }
        break;
      default:
        this.updateDisplay();
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
    
    try {
      await prayerTimesService.forceRefresh();
    } catch (error) {
      console.error('Retry failed:', error);
      this.showWarningState('Location fetch failed. Using fallback location.');
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
      const { getInstitutionFeedConfig, getJurisdictionFeedConfig, getFeedDocuments } = await import('./config.js');

      if (this.feedType === 'institution') {
        this.feedConfig = await getInstitutionFeedConfig(this.entityName);
        // Get Feed-type documents for this institution
        const feedDocs = await getFeedDocuments('institution', this.entityName);
        this.feedDocuments = feedDocs;
      } else if (this.feedType === 'jurisdiction') {
        this.feedConfig = await getJurisdictionFeedConfig(this.entityName);
        // Get Feed-type documents for this jurisdiction
        const feedDocs = await getFeedDocuments('jurisdiction', this.entityName);
        this.feedDocuments = feedDocs;
      }
    } catch (error) {
      console.warn('Error fetching feed config:', error);
      this.feedConfig = null;
      this.feedDocuments = [];
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
   * Update the marquee display
   */
  updateDisplay() {
    if (!this.marqueeElement) return;

    // Check if widget is enabled
    const widgetEnabled = this.feedConfig?.widget?.enabled !== false;

    // Build widget section content with header
    let widgetSection = '';
    if (widgetEnabled) {
      const state = prayerTimesService.getState();
      
      // Check for error state
      if (state.error && !state.prayerTimes) {
        this.showWarningState(state.error.message || 'Unable to load prayer times');
        return;
      }
      
      // Check for loading state
      if (state.isLoading && !state.prayerTimes) {
        this.showLoadingState();
        return;
      }

      // Build prayer times content
      const locationText = state.formattedLocation;
      const timeToNext = state.formattedTimeToNext;
      const nextPrayerName = state.nextPrayer?.name || "Unknown";

      const widgetContent = `<span class="prayer-item"><span class="prayer-label">📍</span> <span class="prayer-value">${locationText}</span></span> <span class="prayer-separator">•</span> <span class="prayer-item"><span class="prayer-label">📅</span> <span class="prayer-value">${state.formattedDate}</span></span> <span class="prayer-separator">•</span> <span class="prayer-item"><span class="prayer-label">🕐</span> <span class="prayer-value">${state.formattedTime}</span></span> <span class="prayer-separator">•</span> <span class="prayer-item"><span class="prayer-label">⏰</span> <span class="prayer-value">${nextPrayerName} (${timeToNext})</span></span>`;
      widgetSection = `<span class="prayer-item"><span class="prayer-label">Prayer Time Widget:</span> <span class="prayer-value">${widgetContent}</span></span>`;
    }

    // Build feed documents section content if available
    let feedContent = '';
    if (this.feedDocuments && this.feedDocuments.length > 0) {
      const feedItems = this.feedDocuments.map(feedDoc => {
        const title = feedDoc.title || 'Untitled';
        let header = '';

        if (this.feedType === 'institution') {
          const jurisdictionName = feedDoc.jurisdiction || '';
          const cleanJurisdictionName = jurisdictionName.replace(/\s*\[.*?\]\s*/g, '').trim();
          header = `Posted in ${cleanJurisdictionName}`;
        } else if (this.feedType === 'jurisdiction') {
          const institutionName = feedDoc.institution || '';
          const cleanInstitutionName = institutionName.replace(/\s*\[.*?\]\s*/g, '').trim();
          header = `Posted by ${cleanInstitutionName}`;
        }

        return `<span class="prayer-item"><span class="prayer-label">${header}:</span> <span class="prayer-value">${title}</span></span>`;
      }).join(' <span class="prayer-separator">•</span> ');

      feedContent = ` <span class="prayer-separator">|</span> ${feedItems}`;
    }

    // Build the complete marquee content
    const endSeparator = feedContent ? '|' : '•';
    let content = `${widgetSection}${feedContent} <span class="prayer-separator">${endSeparator}</span> `;

    // If no widget and no feed content, show bio as fallback
    if (!widgetSection && !feedContent && this.entityMetadata?.bio) {
      const bio = this.entityMetadata.bio;
      content = `<span class="prayer-item"><span class="prayer-value">${bio}</span></span> <span class="prayer-separator">•</span> `;
    }

    // Create a hash of the content (excluding time) to detect actual changes
    const contentHash = this.generateContentHash(widgetSection, feedContent, this.entityMetadata?.bio);

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
        const state = prayerTimesService.getState();
        const timeRegex = /<span class="prayer-value">(\d{1,2}:\d{2}\s[AP]M)<\/span>/;
        const timeMatch = this.cachedContent.match(timeRegex);
        if (timeMatch) {
          this.cachedContent = this.cachedContent.replace(timeMatch[0], `<span class="prayer-value">${state.formattedTime}</span>`);
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
    const simplifiedWidget = widgetSection ? widgetSection.replace(/\d{1,2}:\d{2}\s[AP]M/g, 'TIME') : '';
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
   * Clean up
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
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
