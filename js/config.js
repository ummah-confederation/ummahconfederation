/**
 * Configuration Module
 * Loads and provides access to documents-config.json
 */

let configCache = null;

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
}
