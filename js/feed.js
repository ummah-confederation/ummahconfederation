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
  initFeedContent();
});

// Handle bfcache restoration (back button navigation)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    initFeedContent();
  }
});

/**
 * Initialize feed content based on feed type (widget only, carousel moved to profile mode)
 */
async function initFeedContent() {
  const feedType = getFeedType();
  const widgetElement = document.getElementById('prayer-times-widget');

  if (feedType.type === 'institution') {
    await initInstitutionFeed(feedType.name, widgetElement);
  } else if (feedType.type === 'jurisdiction') {
    await initJurisdictionFeed(feedType.name, widgetElement);
  } else {
    // Global feed - show widget only
    await initPrayerTimesWidget();
  }
}

/**
 * Initialize institution feed (widget only, carousel moved to profile mode)
 * @param {string} institutionName - The institution name
 * @param {HTMLElement} widgetElement - The widget element
 */
async function initInstitutionFeed(institutionName, widgetElement) {
  try {
    const { getInstitutionFeedConfig } = await import('./config.js');
    const feedConfig = await getInstitutionFeedConfig(institutionName);

    // Show widget if enabled
    if (feedConfig?.widget?.enabled) {
      await initPrayerTimesWidget();
    } else if (widgetElement) {
      widgetElement.style.display = 'none';
    }
  } catch (error) {
    console.error('Error initializing institution feed:', error);
  }
}

/**
 * Initialize jurisdiction feed (widget only, carousel moved to profile mode)
 * @param {string} jurisdictionName - The jurisdiction name
 * @param {HTMLElement} widgetElement - The widget element
 */
async function initJurisdictionFeed(jurisdictionName, widgetElement) {
  try {
    const { getJurisdictionFeedConfig } = await import('./config.js');
    const feedConfig = await getJurisdictionFeedConfig(jurisdictionName);

    // Show widget if enabled
    if (feedConfig?.widget?.enabled) {
      await initPrayerTimesWidget();
    } else if (widgetElement) {
      widgetElement.style.display = 'none';
    }
  } catch (error) {
    console.error('Error initializing jurisdiction feed:', error);
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
