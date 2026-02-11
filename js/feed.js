/**
 * Feed Page Module
 * Handles feed page logic and prayer times widget
 */

// Dark Mode Toggle Functionality
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

  try {
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
    widgetElement.innerHTML = '<p class="text-center">Unable to load prayer times.</p>';
  }
}

/**
 * Get cache key for today's date and location
 */
function getCacheKey(location) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const locationStr = `${location?.latitude?.toFixed(2)}_${location?.longitude?.toFixed(2)}`;
  return `prayerTimesCache_${dateStr}_${locationStr}`;
}

/**
 * Get cached prayer times for today
 */
function getCachedPrayerTimes(location) {
  try {
    const cacheKey = getCacheKey(location);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const data = JSON.parse(cached);
      // Check if cache is from today
      const cacheDate = new Date(data.date);
      const today = new Date();
      if (cacheDate.toDateString() === today.toDateString()) {
        console.log('Using cached prayer times for widget');
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
function cachePrayerTimes(location, prayerTimes) {
  try {
    const cacheKey = getCacheKey(location);
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
 * Get user's geolocation
 */
async function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}`
          );
          const data = await response.json();
          location.city = data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown';
          location.country = data.address.country || 'Unknown';
        } catch (error) {
          location.city = 'Unknown';
          location.country = 'Unknown';
        }

        resolve(location);
      },
      () => {
        resolve({
          latitude: -6.2088,
          longitude: 106.8456,
          city: 'Jakarta',
          country: 'Indonesia',
        });
      }
    );
  });
}

/**
 * Fetch prayer times from Aladhan API with caching
 */
async function fetchPrayerTimes(location) {
  // Try to get cached prayer times first
  const cached = getCachedPrayerTimes(location);
  if (cached) {
    return cached;
  }

  // If no cache, fetch from API
  console.log('Fetching prayer times from API for widget');
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
    cachePrayerTimes(location, prayerTimes);
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

  widgetElement.innerHTML = `
    <div class="prayer-widget-header">
      <span class="prayer-widget-date">${currentDate}</span>
      <span class="prayer-widget-clock">${currentTime}</span>
    </div>
    <div class="prayer-widget-location">📍 ${location.city}, ${location.country}</div>
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
  initPrayerTimesWidget();
});
