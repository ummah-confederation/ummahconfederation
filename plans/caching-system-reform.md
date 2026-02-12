# Caching System Fundamental Reform Plan

## Executive Summary

The current caching system has **fundamental architectural flaws** that cause inconsistent behavior. This plan proposes a complete restructuring with a single source of truth and proper separation of concerns.

---

## Root Cause Analysis

### Problem 1: Multiple Competing Cache Systems

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT CHAOTIC STATE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐     │
│  │  cache.js    │  │ indexeddb-   │  │ unified-cache.js  │     │
│  │ ResponseCache│  │ cache.js     │  │ UnifiedCacheMgr   │     │
│  │ (memory+LS)  │  │ (IndexedDB)  │  │ (memory+IDB)      │     │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬─────────┘     │
│         │                 │                    │               │
│         └────────────┬────┴────────────────────┘               │
│                      ▼                                          │
│              ┌───────────────┐                                  │
│              │  sw.js        │                                  │
│              │ ServiceWorker │                                  │
│              │ Cache API     │                                  │
│              └───────────────┘                                  │
│                                                                 │
│  ┌──────────────┐                                              │
│  │  config.js   │  ← Yet another cache layer!                  │
│  │ Module-level │                                              │
│  │ memory cache │                                              │
│  └──────────────┘                                              │
│                                                                 │
│  RESULT: Cache conflicts, stale data, race conditions          │
└─────────────────────────────────────────────────────────────────┘
```

### Problem 2: Massive Code Duplication

| Function | marquee.js | feed.js | Duplicated Lines |
|----------|------------|---------|------------------|
| `getLocation()` | ✓ | ✓ | ~70 lines |
| `fetchCityName()` | ✓ | ✓ | ~60 lines |
| `fetchPrayerTimes()` | ✓ | ✓ | ~50 lines |
| `getCachedPrayerTimes()` | ✓ | ✓ | ~20 lines |
| `cachePrayerTimes()` | ✓ | ✓ | ~20 lines |
| `getExpiredLocationCache()` | ✓ | ✓ | ~30 lines |

**Total: ~250 lines of duplicated code** with subtle differences causing inconsistent behavior.

### Problem 3: Cache Key Design Flaws

```javascript
// CURRENT: Timezone-ambiguous date string
const dateStr = `${year}-${month}-${date}`;  // "2026-2-12" - which timezone?

// CURRENT: Location key doesn't distinguish GPS quality
const key = 'location:current';  // Is this GPS? Fallback? Stale?
```

### Problem 4: TTL Calculation Issues

```javascript
// CURRENT: "End of day" is ambiguous across timezones
const endOfDay = new Date(year, month, date + 1);
const ttl = endOfDay.getTime() - now.getTime();
// Problem: Prayer times API returns times in LOCAL timezone
// But cache TTL is calculated in BROWSER timezone
// These can differ!
```

### Problem 5: No Cache Invalidation Strategy

- Location changes → prayer times cache NOT invalidated
- Network status changes → no coordinated refresh
- Date boundary crossing → potential race conditions

---

## Proposed Architecture

### Single Source of Truth: PrayerTimesService

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROPOSED ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              PrayerTimesService                          │   │
│  │         (Single Source of Truth)                         │   │
│  │                                                          │   │
│  │  • Location management with quality levels               │   │
│  │  • Prayer times fetching with proper caching             │   │
│  │  • Geocoding with fallback handling                      │   │
│  │  • Event-based cache invalidation                        │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              UnifiedCacheManager                         │   │
│  │         (Single Cache Implementation)                    │   │
│  │                                                          │   │
│  │  • Memory cache (fast access)                            │   │
│  │  • IndexedDB (persistence)                               │   │
│  │  • Proper TTL with timezone awareness                    │   │
│  │  • Namespace-based invalidation                          │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Service Worker                              │   │
│  │         (Static Assets Only)                             │   │
│  │                                                          │   │
│  │  • HTML/CSS/JS files                                     │   │
│  │  • Images                                                │   │
│  │  • Does NOT cache API responses                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Create PrayerTimesService

Create a new file `js/prayer-times-service.js` that consolidates all prayer time logic:

```javascript
// js/prayer-times-service.js

import { unifiedCache, CACHE_NAMESPACES } from './unified-cache.js';

/**
 * Location quality levels
 */
const LOCATION_QUALITY = {
  GPS_FRESH: 'gps_fresh',      // Fresh GPS coordinates
  GPS_CACHED: 'gps_cached',    // Cached GPS coordinates
  FALLBACK: 'fallback'         // Jakarta fallback
};

/**
 * PrayerTimesService - Single source of truth for prayer times
 * Eliminates code duplication between marquee.js and feed.js
 */
class PrayerTimesService {
  constructor() {
    this.location = null;
    this.prayerTimes = null;
    this.listeners = new Set();
    this.initialized = false;
  }

  // ... full implementation in Phase 1
}

export const prayerTimesService = new PrayerTimesService();
```

### Phase 2: Fix Cache Key Strategy

```javascript
// NEW: Timezone-aware cache keys
generatePrayerCacheKey(location, timezone = null) {
  const now = new Date();
  const localDate = now.toLocaleDateString('en-CA', { 
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone 
  });
  // Result: "2026-02-12" in USER'S timezone
  
  return unifiedCache.generateLocationKey(
    CACHE_NAMESPACES.PRAYER_TIMES,
    location.latitude,
    location.longitude,
    localDate,
    location.quality  // Include quality in key!
  );
}
```

### Phase 3: Fix TTL Calculation

```javascript
// NEW: Timezone-aware TTL
calculatePrayerTTL(timezone = null) {
  const now = new Date();
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Get end of day in the specified timezone
  const endOfDay = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  endOfDay.setHours(23, 59, 59, 999);
  
  // Add buffer for timezone differences
  const ttl = endOfDay.getTime() - now.getTime() + (5 * 60 * 1000);
  
  return Math.max(ttl, 60 * 1000); // Minimum 1 minute
}
```

### Phase 4: Smart Location Caching

```javascript
// NEW: Location with quality tracking
async getLocation(options = {}) {
  const { forceRefresh = false, maxAge = 30 * 60 * 1000 } = options;
  
  // Check cache first
  if (!forceRefresh) {
    const cached = await this.getCachedLocation();
    if (cached && this.isLocationFresh(cached, maxAge)) {
      return { ...cached, quality: LOCATION_QUALITY.GPS_CACHED };
    }
  }
  
  // Request GPS
  try {
    const position = await this.requestGPSPosition();
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: Date.now(),
      quality: LOCATION_QUALITY.GPS_FRESH
    };
    
    // Cache and return
    await this.cacheLocation(location);
    return location;
    
  } catch (error) {
    // Fallback chain
    return this.getLocationFallback(error);
  }
}

async getLocationFallback(error) {
  // 1. Try expired cache
  const expiredCache = await this.getExpiredLocationCache();
  if (expiredCache) {
    return { ...expiredCache, quality: LOCATION_QUALITY.GPS_CACHED };
  }
  
  // 2. Use Jakarta fallback
  return {
    ...DEFAULT_LOCATION,
    quality: LOCATION_QUALITY.FALLBACK,
    fallbackReason: error.code
  };
}
```

### Phase 5: Cache Invalidation Events

```javascript
// NEW: Event-based invalidation
class PrayerTimesService {
  
  invalidateLocationCache() {
    unifiedCache.invalidateNamespace(CACHE_NAMESPACES.LOCATION);
    this.location = null;
    this.emit('location-invalidated');
  }
  
  invalidatePrayerTimesCache() {
    unifiedCache.invalidateNamespace(CACHE_NAMESPACES.PRAYER_TIMES);
    this.prayerTimes = null;
    this.emit('prayer-times-invalidated');
  }
  
  // Auto-invalidate on date change
  setupDateChangeDetection() {
    const checkDateChange = () => {
      const currentDate = new Date().toDateString();
      if (this.lastDate && this.lastDate !== currentDate) {
        this.invalidatePrayerTimesCache();
      }
      this.lastDate = currentDate;
    };
    
    setInterval(checkDateChange, 60 * 1000); // Check every minute
  }
}
```

### Phase 6: Update marquee.js and feed.js

Both files will be simplified to use the service:

```javascript
// marquee.js - SIMPLIFIED
import { prayerTimesService } from './prayer-times-service.js';

class Marquee {
  async init() {
    // Subscribe to updates
    prayerTimesService.subscribe(this.updateDisplay.bind(this));
    
    // Initialize service
    await prayerTimesService.init();
    
    // Update display
    this.updateDisplay();
  }
  
  updateDisplay() {
    const { location, prayerTimes, nextPrayer } = prayerTimesService.getState();
    // ... render logic only
  }
}
```

```javascript
// feed.js - SIMPLIFIED
import { prayerTimesService } from './prayer-times-service.js';

async function initPrayerTimesWidget() {
  await prayerTimesService.init();
  renderWidget();
  
  prayerTimesService.subscribe(renderWidget);
}

function renderWidget() {
  const { location, prayerTimes } = prayerTimesService.getState();
  // ... render logic only
}
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `js/prayer-times-service.js` | **CREATE** | New unified service |
| `js/marquee.js` | **REFACTOR** | Remove ~250 lines, use service |
| `js/feed.js` | **REFACTOR** | Remove ~250 lines, use service |
| `js/cache.js` | **DELETE** | Redundant with unified-cache.js |
| `js/unified-cache.js` | **ENHANCE** | Add timezone support |
| `js/indexeddb-cache.js` | **KEEP** | Used by unified-cache.js |
| `sw.js` | **SIMPLIFY** | Remove API caching logic |

---

## Migration Strategy

### Step 1: Create PrayerTimesService (Non-Breaking)
- Create new file `js/prayer-times-service.js`
- Import in marquee.js and feed.js alongside existing code
- Test thoroughly

### Step 2: Switch to Service (Breaking Change)
- Update marquee.js to use service
- Update feed.js to use service
- Remove duplicated code

### Step 3: Cleanup (Breaking Change)
- Delete `js/cache.js`
- Remove redundant code from `sw.js`
- Update imports across all files

---

## Testing Checklist

- [ ] Prayer times load correctly on first visit
- [ ] Prayer times cached correctly for same day
- [ ] Cache invalidates at midnight (local timezone)
- [ ] Location cached correctly with quality tracking
- [ ] Fallback to Jakarta works when GPS denied
- [ ] Expired cache used as fallback before Jakarta
- [ ] Offline mode shows cached prayer times
- [ ] Network restoration triggers background refresh
- [ ] Both marquee and feed show same data
- [ ] No duplicate API requests from both components

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Phased rollout with feature flags |
| IndexedDB compatibility issues | Fallback to memory-only mode |
| Timezone edge cases | Extensive timezone testing |
| GPS permission changes | Clear user feedback and retry UI |

---

## Next Steps

1. **Approve this plan** - Confirm the architecture approach
2. **Switch to Code mode** - Implement PrayerTimesService
3. **Test thoroughly** - Verify all scenarios work
4. **Deploy incrementally** - Feature flag rollout

