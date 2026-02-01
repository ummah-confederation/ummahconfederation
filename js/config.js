/**
 * Configuration Module
 * Loads and provides access to documents-config.json, institution-config.json, and jurisdiction-config.json
 */

let configCache = null;
let institutionConfigCache = null;
let jurisdictionConfigCache = null;

/**
 * Load the documents configuration from JSON file
 * @returns {Promise<Object>} The configuration object
 */
export async function loadDocumentsConfig() {
  if (configCache) {
    return configCache;
  }

  try {
    const response = await fetch('documents-config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
    }

    const config = await response.json();
    configCache = config;
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
  if (institutionConfigCache) {
    return institutionConfigCache;
  }

  try {
    const response = await fetch('institution-config.json');
    if (!response.ok) {
      throw new Error(`Failed to load institution config: ${response.status} ${response.statusText}`);
    }

    const config = await response.json();
    institutionConfigCache = config;
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
  if (jurisdictionConfigCache) {
    return jurisdictionConfigCache;
  }

  try {
    const response = await fetch('jurisdiction-config.json');
    if (!response.ok) {
      throw new Error(`Failed to load jurisdiction config: ${response.status} ${response.statusText}`);
    }

    const config = await response.json();
    jurisdictionConfigCache = config;
    return config;
  } catch (error) {
    console.error('Error loading jurisdiction config:', error);
    // Return empty config on error to prevent breaking the UI
    return { jurisdictions: {} };
  }
}

/**
 * Get institution metadata by full institution name
 * @param {string} institutionName - The full institution name (e.g., "Ummah Cabinet [Government]")
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
 * Clear the config cache (useful for testing or hot-reload)
 */
export function clearConfigCache() {
  configCache = null;
  institutionConfigCache = null;
  jurisdictionConfigCache = null;
}
