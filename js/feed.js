/**
 * Feed Page Module
 * Handles feed page logic and prayer times widget
 * 
 * REFACTORED: Now uses PrayerTimesService as single source of truth
 * All location, geocoding, and prayer times logic has been moved to the service
 */

import { prayerTimesService, LOCATION_QUALITY } from './prayer-times-service.js';

// ============================================================================
// Dark Mode Toggle
// ============================================================================

const DARK_MODE_KEY = 'darkMode';

function initDarkMode() {
  const adminSeal = document.querySelector('.admin-seal');
  if (!adminSeal) return;

  const savedMode = localStorage.getItem(DARK_MODE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedMode === 'true' || (!savedMode && prefersDark)) {
    document.documentElement.classList.add('dark');
  }

  adminSeal.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem(DARK_MODE_KEY, isDark);
  });
}

// ============================================================================
// Feed Type Detection
// ============================================================================

/**
 * Parse URL parameters to determine feed type
 */
function getFeedType() {
  const params = new URLSearchParams(window.location.search);
  const institution = params.get('institution');
  const jurisdiction = params.get('jurisdiction');

  if (institution) {
    return { type: 'institution', name: institution };
  }
  if (jurisdiction) {
    return { type: 'jurisdiction', name: jurisdiction };
  }
  return { type: 'global', name: 'Global Feed' };
}

// ============================================================================
// Feed Header
// ============================================================================

/**
 * Update feed header based on feed type
 */
function updateFeedHeader() {
  const feedType = getFeedType();
  const headerElement = document.getElementById('feed-header');

  if (!headerElement) return;

  if (feedType.type === 'global') {
    headerElement.textContent = 'Global Feed';
  } else if (feedType.type === 'institution') {
    // Remove content inside square brackets
    const cleanName = feedType.name.replace(/\s*\[.*?\]\s*/g, '').trim();
    headerElement.textContent = `${cleanName} Feed`;
  } else if (feedType.type === 'jurisdiction') {
    // Remove content inside square brackets
    const cleanName = feedType.name.replace(/\s*\[.*?\]\s*/g, '').trim();
    headerElement.textContent = `${cleanName} Feed`;
  }
}

// ============================================================================
// Prayer Times Widget
// ============================================================================

let unsubscribeFromService = null;

/**
 * Initialize prayer times widget
 */
async function initPrayerTimesWidget() {
  const widgetElement = document.getElementById('prayer-times-widget');
  if (!widgetElement) return;

  // Show loading state
  widgetElement.innerHTML = `
    <div class="prayer-widget-header">
      <h3 class="prayer-widget-title">Prayer Time Widget</h3>
    </div>
    <div class="prayer-widget-loading">
      <span class="loading-spinner"></span>
      <span>Fetching your location...</span>
    </div>
  `;

  try {
    // Subscribe to service updates BEFORE init so we catch all events
    unsubscribeFromService = prayerTimesService.subscribe((state, event) => {
      handleWidgetUpdate(state, event, widgetElement);
    });

    // Initialize the service (if not already initialized)
    // The service's own 1-second tick interval handles clock updates
    await prayerTimesService.init();

    // Initial render after init completes (location + prayer times are ready)
    renderWidget();

  } catch (error) {
    console.error('Error initializing prayer times widget:', error);
    widgetElement.innerHTML = '<p class="text-center prayer-error">Unable to load prayer times.</p>';
  }
}

/**
 * Handle updates from PrayerTimesService
 * @param {Object} state - Service state
 * @param {string} event - Event type
 * @param {HTMLElement} widgetElement - Widget element
 */
function handleWidgetUpdate(state, event, widgetElement) {
  switch (event) {
    case 'loading':
      // Only show loading if we don't have data yet
      if (!state.prayerTimes) {
        widgetElement.innerHTML = `
          <div class="prayer-widget-header">
            <h3 class="prayer-widget-title">Prayer Time Widget</h3>
          </div>
          <div class="prayer-widget-loading">
            <span class="loading-spinner"></span>
            <span>Fetching your location...</span>
          </div>
        `;
      }
      break;
    case 'error':
      if (!state.prayerTimes) {
        widgetElement.innerHTML = `
          <div class="prayer-widget-header">
            <h3 class="prayer-widget-title">Prayer Time Widget</h3>
          </div>
          <p class="text-center prayer-error">${state.error?.message || 'Unable to load prayer times.'}</p>
        `;
      }
      break;
    case 'tick':
    case 'initialized':
    case 'refreshed':
    case 'location-updated':
    case 'prayer-times-updated':
    case 'visibility-change':
      renderWidget();
      break;
    default:
      renderWidget();
  }
}

/**
 * Render prayer times widget
 */
function renderWidget() {
  const widgetElement = document.getElementById('prayer-times-widget');
  if (!widgetElement) return;

  const state = prayerTimesService.getState();
  
  // Don't render if still loading
  if (state.isLoading && !state.prayerTimes) {
    return;
  }

  // Don't render if error and no data
  if (state.error && !state.prayerTimes) {
    return;
  }

  // Check if location is fallback
  const isFallback = state.location?.quality === LOCATION_QUALITY.FALLBACK;
  const locationClass = isFallback ? 'prayer-widget-location prayer-widget-location-fallback' : 'prayer-widget-location';

  widgetElement.innerHTML = `
    <div class="prayer-widget-header">
      <h3 class="prayer-widget-title">Prayer Time Widget</h3>
    </div>
    <div class="prayer-widget-header">
      <span class="prayer-widget-date">${state.formattedDate}</span>
      <span class="prayer-widget-clock">${state.formattedTime}</span>
    </div>
    <div class="${locationClass}">📍 ${state.formattedLocation}</div>
    <div class="prayer-widget-next">
      <span class="prayer-widget-next-label">Next Prayer:</span> ${state.nextPrayer?.name || 'Unknown'} (${state.formattedTimeToNext || '--'})
    </div>
    <div class="prayer-widget-times">
      <div class="prayer-widget-column">
        <span class="prayer-widget-name">Fajr</span>
        <span class="prayer-widget-time">${state.prayerTimes?.Fajr || '--:--'}</span>
      </div>
      <div class="prayer-widget-column">
        <span class="prayer-widget-name">Dhuhr</span>
        <span class="prayer-widget-time">${state.prayerTimes?.Dhuhr || '--:--'}</span>
      </div>
      <div class="prayer-widget-column">
        <span class="prayer-widget-name">Asr</span>
        <span class="prayer-widget-time">${state.prayerTimes?.Asr || '--:--'}</span>
      </div>
      <div class="prayer-widget-column">
        <span class="prayer-widget-name">Maghrib</span>
        <span class="prayer-widget-time">${state.prayerTimes?.Maghrib || '--:--'}</span>
      </div>
      <div class="prayer-widget-column">
        <span class="prayer-widget-name">Isha</span>
        <span class="prayer-widget-time">${state.prayerTimes?.Isha || '--:--'}</span>
      </div>
    </div>
  `;
}

// ============================================================================
// Feed Content Initialization
// ============================================================================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  updateFeedHeader();
  initFeedContent(false);
});

// Handle bfcache restoration (back button navigation)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // Page was restored from back-forward cache
    // Re-initialize feed content to ensure document data is loaded
    initFeedContent(true);
  }
});

/**
 * Initialize feed content based on feed type
 * @param {boolean} isBfcacheRestore - Whether this is a bfcache restoration
 */
async function initFeedContent(isBfcacheRestore = false) {
  const feedType = getFeedType();
  const widgetElement = document.getElementById('prayer-times-widget');

  if (feedType.type === 'institution') {
    await initInstitutionFeed(feedType.name, widgetElement, isBfcacheRestore);
  } else if (feedType.type === 'jurisdiction') {
    await initJurisdictionFeed(feedType.name, widgetElement, isBfcacheRestore);
  } else {
    // Global feed - show widget only
    await initPrayerTimesWidget();
  }
}

/**
 * Initialize institution feed
 * @param {string} institutionName - The institution name
 * @param {HTMLElement} widgetElement - The widget element
 * @param {boolean} isBfcacheRestore - Whether this is a bfcache restoration
 */
async function initInstitutionFeed(institutionName, widgetElement, isBfcacheRestore = false) {
  try {
    const { getInstitutionFeedConfig, getDocumentById } = await import('./config.js');
    const feedConfig = await getInstitutionFeedConfig(institutionName);

    // Show widget if enabled
    if (feedConfig?.widget?.enabled) {
      await initPrayerTimesWidget();
    } else if (widgetElement) {
      widgetElement.style.display = 'none';
    }

    // Show carousel if exists
    if (feedConfig?.carousel) {
      // Clear existing carousels only on bfcache restoration
      if (isBfcacheRestore) {
        clearCarousels();
      }

      // Fetch document data for each image
      const imagesWithDocs = await Promise.all(
        feedConfig.carousel.images.map(async (img) => {
          const doc = img.document_id ? await getDocumentById(img.document_id) : null;
          return {
            ...img,
            document: doc
          };
        })
      );

      const carouselWithDocs = {
        ...feedConfig.carousel,
        images: imagesWithDocs
      };

      // For institution feed, show the jurisdiction name where it's posted
      const jurisdictionName = feedConfig.carousel.post_to_jurisdictions?.[0] || '';
      renderCarousel(carouselWithDocs, jurisdictionName, 'institution');
    }
  } catch (error) {
    console.error('Error initializing institution feed:', error);
  }
}

/**
 * Initialize jurisdiction feed
 * @param {string} jurisdictionName - The jurisdiction name
 * @param {HTMLElement} widgetElement - The widget element
 * @param {boolean} isBfcacheRestore - Whether this is a bfcache restoration
 */
async function initJurisdictionFeed(jurisdictionName, widgetElement, isBfcacheRestore = false) {
  try {
    const { getJurisdictionFeedConfig, getJurisdictionCarousels } = await import('./config.js');
    const feedConfig = await getJurisdictionFeedConfig(jurisdictionName);

    // Show widget if enabled
    if (feedConfig?.widget?.enabled) {
      await initPrayerTimesWidget();
    } else if (widgetElement) {
      widgetElement.style.display = 'none';
    }

    // Clear existing carousels only on bfcache restoration
    if (isBfcacheRestore) {
      clearCarousels();
    }

    // Show carousels from institutions
    const carousels = await getJurisdictionCarousels(jurisdictionName);
    carousels.forEach(carousel => {
      renderCarousel(carousel, carousel.institution, 'jurisdiction');
    });
  } catch (error) {
    console.error('Error initializing jurisdiction feed:', error);
  }
}

/**
 * Clear existing carousels from the feed container
 */
function clearCarousels() {
  const feedContainer = document.querySelector('.paper-sheet');
  if (!feedContainer) return;
  
  const existingCarousels = feedContainer.querySelectorAll('.feed-carousel');
  existingCarousels.forEach(carousel => carousel.remove());
}

// ============================================================================
// Carousel Rendering
// ============================================================================

/**
 * Render carousel
 */
function renderCarousel(carousel, sourceName, feedType) {
  try {
    const feedContainer = document.querySelector('.paper-sheet');
    if (!feedContainer) {
      console.error('Feed container not found');
      return;
    }

    const sourceLabel = feedType === 'institution'
      ? `Posted in ${sourceName.replace(/\s*\[.*?\]\s*/g, '').trim()}`
      : `Posted by ${sourceName.replace(/\s*\[.*?\]\s*/g, '').trim()}`;

    const carouselId = `carousel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const carouselHTML = `
      <div class="feed-carousel" id="${carouselId}">
        <div class="carousel-header">
          <h3 class="carousel-title">${carousel.title}</h3>
        </div>
        <div class="carousel-container">
          <div class="carousel-track" id="${carouselId}-track">
            ${carousel.images.map((img, i) => {
              const caption = img.document?.title || 'Untitled';
              const docLink = img.document?.filename || '#';
              return `
              <div class="carousel-slide">
                <img src="${img.url}" alt="${caption}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async" fetchpriority="${i === 0 ? 'high' : 'auto'}">
                <div class="carousel-caption">
                  <a href="${docLink}" class="carousel-caption-link">${caption}</a>
                </div>
              </div>
            `}).join('')}
          </div>
          <button class="carousel-nav prev" aria-label="Previous slide">‹</button>
          <button class="carousel-nav next" aria-label="Next slide">›</button>
        </div>
        <div class="carousel-footer">
          <div class="carousel-indicators">
            ${carousel.images.map((_, i) => `
              <button class="carousel-indicator ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>
            `).join('')}
          </div>
          <span class="carousel-source">${sourceLabel}</span>
        </div>
      </div>
    `;

    feedContainer.insertAdjacentHTML('beforeend', carouselHTML);
    initCarouselNavigation(carouselId, carousel.images.length);
  } catch (error) {
    console.error('Error rendering carousel:', error);
  }
}

/**
 * Initialize carousel navigation
 */
function initCarouselNavigation(carouselId, slideCount) {
  const carousel = document.getElementById(carouselId);
  if (!carousel) return;

  const track = document.getElementById(`${carouselId}-track`);
  const prevBtn = carousel.querySelector('.carousel-nav.prev');
  const nextBtn = carousel.querySelector('.carousel-nav.next');
  const indicators = carousel.querySelectorAll('.carousel-indicator');

  let currentIndex = 0;
  let autoPlayInterval;

  function goToSlide(index) {
    if (index < 0) index = slideCount - 1;
    if (index >= slideCount) index = 0;
    currentIndex = index;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    // Update indicators
    indicators.forEach((indicator, i) => {
      indicator.classList.toggle('active', i === currentIndex);
    });
  }

  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  function prevSlide() {
    goToSlide(currentIndex - 1);
  }

  // Event listeners
  prevBtn.addEventListener('click', () => {
    prevSlide();
    resetAutoPlay();
  });

  nextBtn.addEventListener('click', () => {
    nextSlide();
    resetAutoPlay();
  });

  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
      goToSlide(index);
      resetAutoPlay();
    });
  });

  // Auto-play
  function startAutoPlay() {
    autoPlayInterval = setInterval(nextSlide, 5000);
  }

  function stopAutoPlay() {
    clearInterval(autoPlayInterval);
  }

  function resetAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
  }

  // Start auto-play
  startAutoPlay();

  // Pause on hover
  carousel.addEventListener('mouseenter', stopAutoPlay);
  carousel.addEventListener('mouseleave', startAutoPlay);

  // Touch support
  let touchStartX = 0;
  let touchEndX = 0;

  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    stopAutoPlay();
  }, { passive: true });

  carousel.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
    startAutoPlay();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  }
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Cleanup function for when leaving the page
 */
function cleanup() {
  if (unsubscribeFromService) {
    unsubscribeFromService();
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);
