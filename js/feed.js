/**
 * Feed Page Module
 * Handles feed page logic and prayer times widget
 * Uses UnifiedCacheManager for consistent caching
 */

import { unifiedCache, CACHE_NAMESPACES, CACHE_DEFAULT_TTL, LOCATION_PRECISION } from './unified-cache.js';

// Dark Mode Toggle Functionality
const DARK_MODE_KEY = 'darkMode';

// Geolocation configuration
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 10000,
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
    // Initialize unified cache
    await unifiedCache.init();

    // Get user's location
    const location = await getLocation();

    // Fetch prayer times (with caching)
    const prayerTimes = await fetchPrayerTimes(location);

    // Render widget
    renderWidget(location, prayerTimes);

    // Update every second
    setInterval(() => {
      renderWidget(location, prayerTimes);
    }, 1000);
  } catch (error) {
    console.error('Error initializing prayer times widget:', error);
    widgetElement.innerHTML = '<p class="text-center prayer-error">Unable to load prayer times.</p>';
  }
}

/**
 * Get cache key for prayer times
 */
function getPrayerCacheKey(location) {
  if (!location) return null;
  
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  
  return unifiedCache.generateLocationKey(
    CACHE_NAMESPACES.PRAYER_TIMES,
    location.latitude,
    location.longitude,
    dateStr
  );
}

/**
 * Get cached prayer times for today
 */
async function getCachedPrayerTimes(location) {
  const cacheKey = getPrayerCacheKey(location);
  if (!cacheKey) return null;

  try {
    const cached = await unifiedCache.get(cacheKey);
    if (cached) {
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
 */
async function cachePrayerTimes(location, prayerTimes) {
  const cacheKey = getPrayerCacheKey(location);
  if (!cacheKey) return;

  try {
    const data = {
      date: new Date().toISOString(),
      prayerTimes: prayerTimes,
      location: {
        latitude: location.latitude,
        longitude: location.longitude
      }
    };

    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const ttl = endOfDay.getTime() - now.getTime();

    await unifiedCache.set(cacheKey, data, ttl);
  } catch (error) {
    console.warn('Error writing prayer cache:', error);
  }
}

/**
 * Fetch city name using reverse geocoding with fallback proxies
 */
async function fetchCityName(location) {
  if (!location || location.isFallback) return;

  // Check geocoding cache first
  const geocodingCacheKey = unifiedCache.generateLocationKey(
    CACHE_NAMESPACES.GEOCODING,
    location.latitude,
    location.longitude
  );

  try {
    const cachedGeocoding = await unifiedCache.get(geocodingCacheKey);
    if (cachedGeocoding) {
      location.city = cachedGeocoding.city;
      location.country = cachedGeocoding.country;
      return;
    }
  } catch (error) {
    console.warn('Error reading geocoding cache:', error);
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

      // Cache the geocoding result
      await unifiedCache.set(
        geocodingCacheKey,
        { city: location.city, country: location.country },
        CACHE_DEFAULT_TTL.GEOCODING
      );

      return;
    } catch (error) {
      console.warn(`Geocoding proxy ${proxy} failed:`, error);
    }
  }

  // All proxies failed
  console.warn('All geocoding proxies failed');
  location.city = "Unknown";
  location.country = "Unknown";
}

/**
 * Get user's geolocation with proper error handling
 * Uses cached location if available to avoid repeated GPS requests
 */
async function getLocation() {
  // First, try to get cached location
  const locationCacheKey = unifiedCache.generateKey(CACHE_NAMESPACES.LOCATION, 'current');
  
  try {
    const cachedLocation = await unifiedCache.get(locationCacheKey);
    if (cachedLocation && !cachedLocation.isFallback) {
      console.log('Using cached location:', cachedLocation);
      return cachedLocation;
    }
  } catch (error) {
    console.warn('Error reading location cache:', error);
  }

  // No cached location, request from GPS
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      resolve({ ...DEFAULT_LOCATION, isFallback: true });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          isFallback: false
        };

        // Fetch city name
        await fetchCityName(location);

        // Cache the location for 5 minutes
        await unifiedCache.set(locationCacheKey, location, CACHE_DEFAULT_TTL.LOCATION);

        resolve(location);
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
        resolve({ ...DEFAULT_LOCATION, isFallback: true });
      },
      GEOLOCATION_OPTIONS
    );
  });
}

/**
 * Fetch prayer times from Aladhan API with caching
 */
async function fetchPrayerTimes(location) {
  // Try to get cached prayer times first
  const cached = await getCachedPrayerTimes(location);
  if (cached) {
    return cached;
  }

  // If no cache, fetch from API
  const today = new Date();
  const date = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const url = `https://api.aladhan.com/v1/timings/${date}-${month}-${year}?latitude=${location.latitude}&longitude=${location.longitude}&method=20`;

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
    // Cache the prayer times
    await cachePrayerTimes(location, prayerTimes);
    return prayerTimes;
  }
  throw new Error('Failed to fetch prayer times');
}

/**
 * Calculate next prayer
 */
function calculateNextPrayer(prayerTimes) {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const prayers = [
    { name: 'Fajr', time: prayerTimes.Fajr },
    { name: 'Dhuhr', time: prayerTimes.Dhuhr },
    { name: 'Asr', time: prayerTimes.Asr },
    { name: 'Maghrib', time: prayerTimes.Maghrib },
    { name: 'Isha', time: prayerTimes.Isha },
  ];

  const prayerMinutes = prayers.map((prayer) => {
    const [hours, minutes] = prayer.time.split(':').map(Number);
    return {
      name: prayer.name,
      time: prayer.time,
      minutes: hours * 60 + minutes,
    };
  });

  let nextPrayer = null;
  for (const prayer of prayerMinutes) {
    if (prayer.minutes > currentTime) {
      nextPrayer = prayer;
      break;
    }
  }

  if (!nextPrayer) {
    nextPrayer = prayerMinutes[0];
    const minutesUntilMidnight = 24 * 60 - currentTime;
    return { nextPrayer, timeToNext: minutesUntilMidnight + nextPrayer.minutes };
  }

  return { nextPrayer, timeToNext: nextPrayer.minutes - currentTime };
}

/**
 * Format time to next prayer
 */
function formatTimeToNextPrayer(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Format current date
 */
function formatDate() {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format current time
 */
function formatCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Render prayer times widget
 */
function renderWidget(location, prayerTimes) {
  const widgetElement = document.getElementById('prayer-times-widget');
  if (!widgetElement) return;

  const currentDate = formatDate();
  const currentTime = formatCurrentTime();
  const { nextPrayer, timeToNext } = calculateNextPrayer(prayerTimes);
  const timeToNextText = formatTimeToNextPrayer(timeToNext);

  // Show fallback indicator if using fallback location
  const fallbackIndicator = location.isFallback ? ' (Fallback)' : '';
  const locationClass = location.isFallback ? 'prayer-widget-location prayer-widget-location-fallback' : 'prayer-widget-location';

  widgetElement.innerHTML = `
    <div class="prayer-widget-header">
      <h3 class="prayer-widget-title">Prayer Time Widget</h3>
    </div>
    <div class="prayer-widget-header">
      <span class="prayer-widget-date">${currentDate}</span>
      <span class="prayer-widget-clock">${currentTime}</span>
    </div>
    <div class="${locationClass}">📍 ${location.city}, ${location.country}${fallbackIndicator}</div>
    <div class="prayer-widget-next">
      <span class="prayer-widget-next-label">Next Prayer:</span> ${nextPrayer.name} (${timeToNextText})
    </div>
    <div class="prayer-widget-times">
      <div class="prayer-widget-column">
        <span class="prayer-widget-name">Fajr</span>
        <span class="prayer-widget-time">${prayerTimes.Fajr}</span>
      </div>
      <div class="prayer-widget-column">
        <span class="prayer-widget-name">Dhuhr</span>
        <span class="prayer-widget-time">${prayerTimes.Dhuhr}</span>
      </div>
      <div class="prayer-widget-column">
        <span class="prayer-widget-name">Asr</span>
        <span class="prayer-widget-time">${prayerTimes.Asr}</span>
      </div>
      <div class="prayer-widget-column">
        <span class="prayer-widget-name">Maghrib</span>
        <span class="prayer-widget-time">${prayerTimes.Maghrib}</span>
      </div>
      <div class="prayer-widget-column">
        <span class="prayer-widget-name">Isha</span>
        <span class="prayer-widget-time">${prayerTimes.Isha}</span>
      </div>
    </div>
  `;
}

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
