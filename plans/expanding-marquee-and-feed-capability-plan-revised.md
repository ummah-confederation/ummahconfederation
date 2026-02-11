# Revised Plan: Expanding Marquee and Feed Capability

## Overview

This plan extends the existing marquee and feed functionality by leveraging the current codebase structure, avoiding redundancy in configuration, styling, and code.

## Key Changes from Original Plan

| Aspect | Original Plan | Revised Approach |
|--------|--------------|------------------|
| Config Files | Create new `institution.config`, `jurisdiction.config`, `carousel.config` | Extend existing `config/institution-config.json` and `config/jurisdiction-config.json` |
| Widget Config | Add `enabled` and `widget_type` to each entity | Use centralized widget config with per-entity overrides |
| Carousel Config | Separate `carousel.config` file | Embed carousel data in institution configs |
| Styling | Create new carousel styles | Extend existing `.prayer-times-widget` styles |
| JavaScript | New modules for carousel | Extend existing `js/feed.js` and `js/config.js` |

---

## 1. Extend Existing Configuration Files

### A. Institution Config Extension

**File:** [`config/institution-config.json`](config/institution-config.json)

Add `feed_config` section to each institution:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-02-01",
  "institutions": {
    "Ummah Cabinet [Non-Profit • Private]": {
      "avatar": "./images/institutions/ummah-cabinet.png",
      "cover": "./images/covers/default-cover.webp",
      "bio": "Peace be upon you.",
      "feed_config": {
        "widget": {
          "enabled": true,
          "type": "prayer_time"
        },
        "carousel": {
          "title": "Cabinet Updates",
          "images": [
            {
              "url": "./images/carousel/cabinet-1.webp",
              "caption": "Weekly Meeting"
            },
            {
              "url": "./images/carousel/cabinet-2.webp",
              "caption": "New Initiative"
            }
          ],
          "post_to_jurisdictions": [
            "Ummah Cabinet Members [Team Space]",
            "General Public [Community]"
          ]
        }
      }
    }
  }
}
```

### B. Jurisdiction Config Extension

**File:** [`config/jurisdiction-config.json`](config/jurisdiction-config.json)

Add `feed_config` section to each jurisdiction:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-02-01",
  "jurisdictions": {
    "General Public [Community]": {
      "avatar": "./images/jurisdictions/general-public.webp",
      "cover": "./images/covers/general-public.webp",
      "bio": "Peace be upon you.",
      "feed_config": {
        "widget": {
          "enabled": true,
          "type": "prayer_time"
        }
      }
    }
  }
}
```

**Note:** Jurisdictions do NOT create their own carousels. They pull from institutions that list them in `post_to_jurisdictions`.

---

## 2. Extend Existing CSS Styles

**File:** [`src/styles/_components.css`](src/styles/_components.css)

The existing `.prayer-times-widget` styles (lines 1615-1774) already provide:
- Responsive design
- Dark mode support
- Consistent sizing
- Grid layout

### Add Carousel Styles (Extension)

Add these styles after the existing widget styles:

```css
/* Feed Carousel Component */
.feed-carousel {
  background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
  border-radius: var(--radius-card);
  padding: 1.25rem;
  margin-top: 1.5rem;
  box-shadow: var(--shadow-card);
}

.dark .feed-carousel {
  background: linear-gradient(135deg, #0f172a 0%, #020617 100%);
}

/* Carousel Header */
.carousel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.carousel-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #e2e8f0;
}

.dark .carousel-title {
  color: #f1f5f9;
}

.carousel-source {
  font-size: 0.875rem;
  color: #94a3b8;
}

.dark .carousel-source {
  color: #64748b;
}

/* Carousel Container */
.carousel-container {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-card);
  aspect-ratio: 16 / 9;
}

.carousel-track {
  display: flex;
  transition: transform 0.5s ease;
}

.carousel-slide {
  min-width: 100%;
  position: relative;
}

.carousel-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Carousel Caption */
.carousel-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  padding: 0.75rem 1rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Carousel Navigation */
.carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.carousel-nav:hover {
  background: rgba(0, 0, 0, 0.7);
}

.carousel-nav.prev {
  left: 0.5rem;
}

.carousel-nav.next {
  right: 0.5rem;
}

/* Carousel Indicators */
.carousel-indicators {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.carousel-indicator {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: background 0.2s ease;
}

.carousel-indicator.active {
  background: white;
}

/* Responsive Adjustments */
@media (max-width: 640px) {
  .feed-carousel {
    padding: 1rem;
  }

  .carousel-title {
    font-size: 1rem;
  }

  .carousel-nav {
    width: 2rem;
    height: 2rem;
  }

  .carousel-caption {
    font-size: 0.8125rem;
    padding: 0.5rem 0.75rem;
  }
}
```

---

## 3. Extend Existing JavaScript Modules

### A. Extend [`js/config.js`](js/config.js)

Add new functions to handle feed configuration:

```javascript
/**
 * Get institution feed configuration
 * @param {string} institutionName - The full institution name
 * @returns {Promise<Object|null>} The feed config or null if not found
 */
export async function getInstitutionFeedConfig(institutionName) {
  const config = await loadInstitutionConfig();
  return config.institutions?.[institutionName]?.feed_config || null;
}

/**
 * Get jurisdiction feed configuration
 * @param {string} jurisdictionName - The full jurisdiction name
 * @returns {Promise<Object|null>} The feed config or null if not found
 */
export async function getJurisdictionFeedConfig(jurisdictionName) {
  const config = await loadJurisdictionConfig();
  return config.jurisdictions?.[jurisdictionName]?.feed_config || null;
}

/**
 * Get all carousels for a jurisdiction
 * @param {string} jurisdictionName - The full jurisdiction name
 * @returns {Promise<Array>} Array of carousel objects
 */
export async function getJurisdictionCarousels(jurisdictionName) {
  const config = await loadInstitutionConfig();
  const carousels = [];

  for (const [instName, instData] of Object.entries(config.institutions || {})) {
    const carousel = instData.feed_config?.carousel;
    if (carousel && carousel.post_to_jurisdictions?.includes(jurisdictionName)) {
      carousels.push({
        institution: instName,
        ...carousel
      });
    }
  }

  return carousels;
}
```

### B. Extend [`js/feed.js`](js/feed.js)

Add carousel rendering functionality:

```javascript
/**
 * Initialize feed content based on feed type
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
 * Initialize institution feed
 */
async function initInstitutionFeed(institutionName, widgetElement) {
  const { getInstitutionFeedConfig } = await import('./config.js');
  const feedConfig = await getInstitutionFeedConfig(institutionName);

  // Show widget if enabled
  if (feedConfig?.widget?.enabled) {
    await initPrayerTimesWidget();
  }

  // Show carousel if exists
  if (feedConfig?.carousel) {
    renderCarousel(feedConfig.carousel, institutionName, 'institution');
  }
}

/**
 * Initialize jurisdiction feed
 */
async function initJurisdictionFeed(jurisdictionName, widgetElement) {
  const { getJurisdictionFeedConfig, getJurisdictionCarousels } = await import('./config.js');
  const feedConfig = await getJurisdictionFeedConfig(jurisdictionName);

  // Show widget if enabled
  if (feedConfig?.widget?.enabled) {
    await initPrayerTimesWidget();
  }

  // Show carousels from institutions
  const carousels = await getJurisdictionCarousels(jurisdictionName);
  carousels.forEach(carousel => {
    renderCarousel(carousel, carousel.institution, 'jurisdiction');
  });
}

/**
 * Render carousel
 */
function renderCarousel(carousel, sourceName, feedType) {
  const feedContainer = document.querySelector('.paper-sheet');
  if (!feedContainer) return;

  const sourceLabel = feedType === 'institution'
    ? `Posted in ${sourceName.replace(/\s*\[.*?\]\s*/g, '').trim()}`
    : `Posted by ${sourceName.replace(/\s*\[.*?\]\s*/g, '').trim()}`;

  const carouselHTML = `
    <div class="feed-carousel">
      <div class="carousel-header">
        <h3 class="carousel-title">${carousel.title}</h3>
        <span class="carousel-source">${sourceLabel}</span>
      </div>
      <div class="carousel-container">
        <div class="carousel-track" id="carousel-track-${Date.now()}">
          ${carousel.images.map(img => `
            <div class="carousel-slide">
              <img src="${img.url}" alt="${img.caption}">
              <div class="carousel-caption">${img.caption}</div>
            </div>
          `).join('')}
        </div>
        <button class="carousel-nav prev" aria-label="Previous slide">‹</button>
        <button class="carousel-nav next" aria-label="Next slide">›</button>
      </div>
      <div class="carousel-indicators">
        ${carousel.images.map((_, i) => `
          <button class="carousel-indicator ${i === 0 ? 'active' : ''}" data-index="${i}"></button>
        `).join('')}
      </div>
    </div>
  `;

  feedContainer.insertAdjacentHTML('beforeend', carouselHTML);
  initCarouselNavigation(carouselHTML);
}

/**
 * Initialize carousel navigation
 */
function initCarouselNavigation(carouselHTML) {
  // Find the carousel element and add navigation logic
  // (Implementation details for auto-play, manual navigation, etc.)
}
```

---

## 4. Update Feed HTML Structure

**File:** [`feed.html`](feed.html)

The current structure is already compatible. No major changes needed:

```html
<h3>Prayer Time Widget</h3>
<div id="prayer-times-widget" class="prayer-times-widget">
  <!-- Widget content will be populated by JavaScript -->
</div>
<!-- Carousels will be dynamically inserted here -->
```

---

## 5. Feed Display Rules

### Institution Feed
1. Show widget (if `feed_config.widget.enabled = true`)
2. Show carousel (if `feed_config.carousel` exists)
3. Carousel header displays: `Posted in (Jurisdiction Name)`

### Jurisdiction Feed
1. Show widget (if `feed_config.widget.enabled = true`)
2. Show carousel(s) from institutions that list this jurisdiction in `post_to_jurisdictions`
3. Carousel header displays: `Posted by (Institution Name)`

### Global Feed
1. Show widget only (default behavior)

---

## 6. Implementation Steps

1. **Extend Configuration Files**
   - Add `feed_config` section to [`config/institution-config.json`](config/institution-config.json)
   - Add `feed_config` section to [`config/jurisdiction-config.json`](config/jurisdiction-config.json)

2. **Add Carousel Styles**
   - Add carousel CSS to [`src/styles/_components.css`](src/styles/_components.css)

3. **Extend JavaScript Modules**
   - Add feed config functions to [`js/config.js`](js/config.js)
   - Add carousel rendering to [`js/feed.js`](js/feed.js)

4. **Test**
   - Test institution feed with widget and carousel
   - Test jurisdiction feed with widget and multiple carousels
   - Test global feed (widget only)
   - Test dark mode compatibility
   - Test responsive design

---

## Summary of Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `config/institution-config.json` | Extension | Add `feed_config` with widget and carousel settings |
| `config/jurisdiction-config.json` | Extension | Add `feed_config` with widget settings |
| `src/styles/_components.css` | Extension | Add carousel styles (reusing existing widget patterns) |
| `js/config.js` | Extension | Add feed config helper functions |
| `js/feed.js` | Extension | Add carousel rendering and feed initialization |
| `feed.html` | No change | Already compatible with new structure |

---

## Benefits of This Approach

1. **No Redundant Config Files**: Extends existing `institution-config.json` and `jurisdiction-config.json`
2. **No Redundant Styling**: Reuses existing widget patterns and CSS variables
3. **No Redundant Code**: Extends existing `js/feed.js` and `js/config.js` modules
4. **Consistent Design**: Carousels match the visual style of existing widgets
5. **Maintainable**: All feed-related configuration is in one place per entity
6. **Scalable**: Easy to add new widget types or carousel features in the future
