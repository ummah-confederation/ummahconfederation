# Feed Page with Prayer Times Widget - Implementation Plan

## Overview
Create a feed page (`feed.html`) that displays prayer times in a widget format. The page should support different feed types (Global Feed, Institution Feed, Jurisdiction Feed) based on the source of navigation.

---

## Sorted Requirements

### 1. Page Structure & Layout
- Create `feed.html` using the `paper-sheet` component (same as `pages/books/book2.html`)
- Page should be responsive and work across all screen sizes
- Use existing styling from `src/styles/_components.css` and `src/styles/_layouts.css`

### 2. Dynamic Header
- Header displays based on feed type:
  - **Global Feed**: When accessed from `index.html` or non-profile mode library
  - **Institution Feed**: When accessed from library's institution profile mode
  - **Jurisdiction Feed**: When accessed from library's jurisdiction profile mode
- Header should be styled consistently with other page headers

### 3. Prayer Times Widget Design
The widget should be a rounded corner rectangle (not too large - it's a widget):

```
┌─────────────────────────────────────────────────────┐
│ Date (top left)              Clock (top right)      │
│                                                     │
│              Location (centered)                    │
│                                                     │
│         Next Prayer Time Remaining (centered)       │
│                                                     │
│  Fajr    Dhuhr    Asr    Maghrib    Isha            │
│  05:30   12:15   15:30    18:10     19:30           │
└─────────────────────────────────────────────────────┘
```

**Widget Layout:**
- **Row 1**: Date (left-aligned), Clock (right-aligned)
- **Row 2**: Location (centered)
- **Row 3**: Next prayer time remaining (centered), the label need not be too long though, just follow the marquee's way.
- **Row 4**: 5 prayer times in 5 columns (prayer name above time)

### 4. Navigation Logic
- **From index.html**: Clicking prayer times marquee → `feed.html` (Global Feed)
- **From library.html (non-profile mode)**: Clicking prayer times marquee → `feed.html` (Global Feed)
- **From library.html (profile mode)**: Clicking prayer times marquee → `feed.html` with institution/jurisdiction parameter

### 5. Styling Constraints
- **No redundant styling files** - Add widget styles to existing `src/styles/_components.css`
- Reuse existing CSS variables and design tokens
- Follow the project's dark mode support pattern

---

## Implementation Steps

### Step 1: Create feed.html
**File**: `feed.html`

**Structure**:
```html
<!doctype html>
<html lang="en" class="scroll-smooth">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DAARUSSALAAM — Feed</title>
    <link rel="icon" type="image/x-icon" href="images/favicon.png" />
    <link rel="stylesheet" href="dist/output.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Spectral:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body class="py-10 px-5">
    <div class="paper-sheet max-w-4xl mx-auto bg-white shadow-lg px-6 py-10 sm:px-12 sm:py-16 lg:px-20 lg:py-20 mb-16">
      <!-- Admin Seal - Dark Mode Toggle -->
      <img src="images/admin-seal.webp" alt="Administrative Seal" class="admin-seal" />

      <!-- Dynamic Header -->
      <h2 id="feed-header" class="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-wider uppercase text-center text-black mb-6">
        Global Feed
      </h2>

      <!-- Prayer Times Widget -->
      <div id="prayer-times-widget" class="prayer-times-widget">
        <!-- Widget content will be populated by JavaScript -->
      </div>
    </div>

    <script type="module" src="js/feed.js"></script>
  </body>
</html>
```

### Step 2: Add Prayer Times Widget Styles
**File**: `src/styles/_components.css` (append to existing file)

**Styles to add**:
```css
/* ============================================
   PRAYER TIMES WIDGET
   ============================================ */

.prayer-times-widget {
  background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
  border-radius: var(--radius-card);
  padding: 1.5rem;
  color: #ffffff;
  box-shadow: var(--shadow-card);
  transition: background-color var(--transition-normal), box-shadow var(--transition-normal);
}

.dark .prayer-times-widget {
  background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Widget Header Row */
.prayer-widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.prayer-widget-date {
  font-size: 0.875rem;
  font-weight: 500;
  color: #e2e8f0;
}

.dark .prayer-widget-date {
  color: #94a3b8;
}

.prayer-widget-clock {
  font-size: 1rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #ffffff;
}

/* Widget Location Row */
.prayer-widget-location {
  text-align: center;
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
  color: #e2e8f0;
}

.dark .prayer-widget-location {
  color: #94a3b8;
}

/* Widget Next Prayer Row */
.prayer-widget-next {
  text-align: center;
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #ffffff;
}

.prayer-widget-next-label {
  color: #e2e8f0;
  font-weight: 400;
}

.dark .prayer-widget-next-label {
  color: #94a3b8;
}

/* Widget Prayer Times Grid */
.prayer-widget-times {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.prayer-widget-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.prayer-widget-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: #e2e8f0;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dark .prayer-widget-name {
  color: #94a3b8;
}

.prayer-widget-time {
  font-size: 0.875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #ffffff;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .prayer-times-widget {
    padding: 1rem;
  }

  .prayer-widget-header {
    margin-bottom: 0.75rem;
  }

  .prayer-widget-date {
    font-size: 0.8125rem;
  }

  .prayer-widget-clock {
    font-size: 0.875rem;
  }

  .prayer-widget-location {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .prayer-widget-next {
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .prayer-widget-times {
    gap: 0.5rem;
  }

  .prayer-widget-name {
    font-size: 0.6875rem;
  }

  .prayer-widget-time {
    font-size: 0.8125rem;
  }
}

@media (max-width: 480px) {
  .prayer-widget-times {
    gap: 0.375rem;
  }

  .prayer-widget-name {
    font-size: 0.625rem;
  }

  .prayer-widget-time {
    font-size: 0.75rem;
  }
}
```

### Step 3: Create feed.js Module
**File**: `js/feed.js`

**Functionality**:
- Parse URL parameters to determine feed type
- Update header based on feed type
- Initialize prayer times widget with real-time updates
- Handle dark mode toggle

```javascript
/**
 * Feed Page Module
 * Handles feed page logic and prayer times widget
 */

import { PrayerTimes } from './prayer-times.js';

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
    headerElement.textContent = `${feedType.name} Feed`;
  } else if (feedType.type === 'jurisdiction') {
    headerElement.textContent = `${feedType.name} Feed`;
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
    
    // Fetch prayer times
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
 * Fetch prayer times from Aladhan API
 */
async function fetchPrayerTimes(location) {
  const today = new Date();
  const date = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const url = `https://api.aladhan.com/v1/timings/${date}-${month}-${year}?latitude=${location.latitude}&longitude=${location.longitude}&method=20`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.code === 200 && data.data) {
    return {
      Fajr: data.data.timings.Fajr,
      Dhuhr: data.data.timings.Dhuhr,
      Asr: data.data.timings.Asr,
      Maghrib: data.data.timings.Maghrib,
      Isha: data.data.timings.Isha,
    };
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
```

### Step 4: Add Click Handler to prayer-times.js
**File**: `js/prayer-times.js`

**Modification**: Add click handler to marquee element

```javascript
// In the init() method, after getting the marqueeElement:
this.marqueeElement = document.getElementById("prayer-times-marquee");
if (!this.marqueeElement) {
  console.error("Prayer times marquee element not found");
  return;
}

// Add click handler for navigation to feed page
this.marqueeElement.style.cursor = "pointer";
this.marqueeElement.addEventListener("click", () => {
  this.navigateToFeed();
});

// Add new method to the PrayerTimes class:
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
```

---

## File Summary

### New Files
1. `feed.html` - Feed page with paper-sheet layout
2. `js/feed.js` - Feed page logic module

### Modified Files
1. `src/styles/_components.css` - Add prayer times widget styles
2. `js/prayer-times.js` - Add click handler for navigation

---

## Testing Checklist

- [ ] Click prayer times marquee from index.html → navigates to feed.html with "Global Feed" header
- [ ] Click prayer times marquee from library.html (non-profile) → navigates to feed.html with "Global Feed" header
- [ ] Click prayer times marquee from library.html (institution profile) → navigates to feed.html with "{Institution Name, excluding institution type, its usually in square bracket} Feed" header
- [ ] Click prayer times marquee from library.html (jurisdiction profile) → navigates to feed.html with "{Jurisdiction Name, excluding jurisdiction type, its usually in square bracket} Feed" header
- [ ] Prayer times widget displays correctly with all 5 prayer times
- [ ] Widget updates every second (clock)
- [ ] Widget updates every minute (next prayer countdown. its already working in marquee. So dont invent new logic for this, use the marquee logic.)
- [ ] Dark mode works on feed page
- [ ] Responsive design works on mobile, tablet, and desktop
- [ ] No redundant styling files created

---

## Notes

- The prayer times widget reuses the same API and logic as the marquee but displays in a different format
- All styling is added to existing `_components.css` to maintain the refactored codebase structure
- The widget uses the same gradient background as the marquee for visual consistency
- Dark mode support is included using the existing pattern from other pages
