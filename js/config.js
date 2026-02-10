/**
 * Configuration Module
 * Loads and provides access to documents-config.json, institution-config.json, and jurisdiction-config.json
 * Optimized with aggressive caching to reduce network requests
 * Includes cache-busting for development
 */

// Cache version - increment this when config files change to bust cache
const CACHE_VERSION = '1.0.0';

let configCache = null;
let institutionConfigCache = null;
let jurisdictionConfigCache = null;
let squircleIconsConfigCache = null;

// Cache timestamps for TTL-based invalidation
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cacheTimestamps = {
  documents: 0,
  institutions: 0,
  jurisdictions: 0,
  squircleIcons: 0
};

/**
 * Check if cache is still valid based on TTL
 * @param {string} cacheType - Type of cache to check
 * @returns {boolean} True if cache is valid
 */
function isCacheValid(cacheType) {
  const now = Date.now();
  return cacheTimestamps[cacheType] && (now - cacheTimestamps[cacheType] < CACHE_TTL);
}

/**
 * Update cache timestamp
 * @param {string} cacheType - Type of cache to update
 */
function updateCacheTimestamp(cacheType) {
  cacheTimestamps[cacheType] = Date.now();
}

/**
 * Fetch with caching and cache-busting
 * @param {string} url - URL to fetch
 * @param {boolean} useCacheBusting - Whether to add cache-busting query param
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithCache(url, useCacheBusting = true) {
  // Add cache-busting query param based on version and timestamp
  const cacheBuster = useCacheBusting 
    ? `?v=${CACHE_VERSION}&t=${Date.now()}` 
    : `?t=${Date.now()}`;
  
  return fetch(url + cacheBuster, {
    cache: 'no-store', // Use no-store to let cache-busting query param control caching
    headers: {
      'Accept': 'application/json'
    }
  });
}

/**
 * Load the documents configuration from JSON file
 * @returns {Promise<Object>} The configuration object
 */
export async function loadDocumentsConfig() {
  if (configCache && isCacheValid('documents')) {
    return configCache;
  }

  try {
    const response = await fetchWithCache('config/documents-config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
    }

    const config = await response.json();
    configCache = config;
    updateCacheTimestamp('documents');
    return config;
  } catch (error) {
    console.error('Error loading documents config:', error);
    throw error;
  }
}

/**
 * Load the institution configuration from JSON file
 * @returns {Promise<Object>} The institution configuration object
 */
export async function loadInstitutionConfig() {
  if (institutionConfigCache && isCacheValid('institutions')) {
    return institutionConfigCache;
  }

  try {
    const response = await fetchWithCache('config/institution-config.json');
    if (!response.ok) {
      throw new Error(`Failed to load institution config: ${response.status} ${response.statusText}`);
    }

    const config = await response.json();
    institutionConfigCache = config;
    updateCacheTimestamp('institutions');
    return config;
  } catch (error) {
    console.error('Error loading institution config:', error);
    // Return empty config on error to prevent breaking the UI
    return { institutions: {} };
  }
}

/**
 * Load the jurisdiction configuration from JSON file
 * @returns {Promise<Object>} The jurisdiction configuration object
 */
export async function loadJurisdictionConfig() {
  if (jurisdictionConfigCache && isCacheValid('jurisdictions')) {
    return jurisdictionConfigCache;
  }

  try {
    const response = await fetchWithCache('config/jurisdiction-config.json');
    if (!response.ok) {
      throw new Error(`Failed to load jurisdiction config: ${response.status} ${response.statusText}`);
    }

    const config = await response.json();
    
    jurisdictionConfigCache = config;
    updateCacheTimestamp('jurisdictions');
    return config;
  } catch (error) {
    console.error('Error loading jurisdiction config:', error);
    // Return empty config on error to prevent breaking the UI
    return { jurisdictions: {} };
  }
}

/**
 * Get institution metadata by full institution name
 * @param {string} institutionName - The full institution name (e.g., "Ummah Cabinet [Non-Profit • Private]")
 * @returns {Promise<Object|null>} The institution metadata or null if not found
 */
export async function getInstitutionMetadata(institutionName) {
  const config = await loadInstitutionConfig();
  return config.institutions?.[institutionName] || null;
}

/**
 * Get jurisdiction metadata by full jurisdiction name
 * @param {string} jurisdictionName - The full jurisdiction name (e.g., "General Public [Community]")
 * @returns {Promise<Object|null>} The jurisdiction metadata or null if not found
 */
export async function getJurisdictionMetadata(jurisdictionName) {
  const config = await loadJurisdictionConfig();
  return config.jurisdictions?.[jurisdictionName] || null;
}

/**
 * Get all visible documents
 * @returns {Promise<Array>} Array of document objects
 */
export async function getDocuments() {
  const config = await loadDocumentsConfig();
  return config.documents.filter(doc => doc.visible !== false);
}

/**
 * Get unique items from all documents
 * @returns {Promise<Array>} Sorted array of unique items
 */
export async function getItems() {
  const documents = await getDocuments();
  const items = new Set(documents.map(doc => doc.item));
  return [...items].sort((a, b) => a.localeCompare(b));
}

/**
 * Get unique institutions from all documents
 * @returns {Promise<Array>} Sorted array of unique institutions
 */
export async function getInstitutions() {
  const documents = await getDocuments();
  const institutions = new Set(documents.map(doc => doc.institution));
  return [...institutions].sort((a, b) => a.localeCompare(b));
}

/**
 * Get unique jurisdictions from all documents
 * @returns {Promise<Array>} Sorted array of unique jurisdictions
 */
export async function getJurisdictions() {
  const documents = await getDocuments();
  const jurisdictions = new Set(documents.map(doc => doc.jurisdiction));
  return [...jurisdictions].sort((a, b) => a.localeCompare(b));
}

/**
 * Load the squircle icons configuration from JSON file
 * @returns {Promise<Object>} The squircle icons configuration object
 */
export async function loadSquircleIconsConfig() {
  if (squircleIconsConfigCache && isCacheValid('squircleIcons')) {
    return squircleIconsConfigCache;
  }

  try {
    const response = await fetchWithCache('config/squircle-icons-config.json');
    if (!response.ok) {
      throw new Error(`Failed to load squircle icons config: ${response.status} ${response.statusText}`);
    }

    const config = await response.json();
    squircleIconsConfigCache = config;
    updateCacheTimestamp('squircleIcons');
    return config;
  } catch (error) {
    console.error('Error loading squircle icons config:', error);
    // Return empty config on error to prevent breaking the UI
    return { icons: {} };
  }
}

/**
 * Get squircle icon metadata by item name
 * @param {string} itemName - The item name (e.g., "Book", "Policy", "Decision")
 * @returns {Promise<Object|null>} The icon metadata or null if not found
 */
export async function getSquircleIconMetadata(itemName) {
  const config = await loadSquircleIconsConfig();
  return config.icons?.[itemName] || null;
}

/**
 * Preload all configurations at once
 * Useful for initial page load to batch requests
 * @returns {Promise<Object>} Object containing all configs
 */
export async function preloadAllConfigs() {
  const [documents, institutions, jurisdictions, squircleIcons] = await Promise.all([
    loadDocumentsConfig(),
    loadInstitutionConfig(),
    loadJurisdictionConfig(),
    loadSquircleIconsConfig()
  ]);

  return {
    documents,
    institutions,
    jurisdictions,
    squircleIcons
  };
}

/**
 * Get the current cache version
 * @returns {string} Current cache version
 */
export function getCacheVersion() {
  return CACHE_VERSION;
}

/**
 * Set a new cache version to bust all caches
 * @param {string} version - New version string
 */
export function setCacheVersion(version) {
  // Clear all caches when version changes
  clearConfigCache();
}

/**
 * Clear the config cache (useful for testing or hot-reload)
 */
export function clearConfigCache() {
  configCache = null;
  institutionConfigCache = null;
  jurisdictionConfigCache = null;
  squircleIconsConfigCache = null;
  cacheTimestamps = {
    documents: 0,
    institutions: 0,
    jurisdictions: 0,
    squircleIcons: 0
  };
}

// Expose cache utilities globally for development (can be called from browser console)
if (typeof window !== 'undefined') {
  window.clearConfigCache = clearConfigCache;
  window.getCacheVersion = getCacheVersion;
  window.setCacheVersion = setCacheVersion;
}
