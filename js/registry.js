/**
 * Registry Builder Module
 * Builds the registry lists on the index page
 * Optimized to use preloaded data when available
 */

import { getItems, getInstitutions, getJurisdictions, preloadAllConfigs } from './config.js';
import { buildFilterUrl, showError } from './utils.js';

// Cache for preloaded data
let preloadedData = null;

/**
 * Preload registry data
 * Call this early to batch all config requests
 */
export async function preloadRegistryData() {
  if (!preloadedData) {
    preloadedData = await preloadAllConfigs();
  }
  return preloadedData;
}

/**
 * Render a registry list
 * @param {string} containerId - ID of the container element
 * @param {Array} values - Array of values to render
 * @param {Object} options - Rendering options
 */
function renderList(containerId, values, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container not found: ${containerId}`);
    return;
  }

  container.innerHTML = '';

  // Add "All" option if requested
  if (options.includeAll) {
    const row = document.createElement('div');
    row.className = 'registry-row';

    const link = document.createElement('a');
    link.href = 'library.html';
    link.textContent = 'All';

    row.appendChild(link);
    container.appendChild(row);
  }

  // Add each value as a link
  values.forEach(value => {
    const row = document.createElement('div');
    row.className = 'registry-row';

    const link = document.createElement('a');
    link.textContent = value;

    // Determine filter type based on container ID
    let filterType;
    if (containerId === 'item-list') {
      filterType = 'item';
    } else if (containerId === 'institution-list') {
      filterType = 'institution';
    } else if (containerId === 'jurisdiction-list') {
      filterType = 'jurisdiction';
    }

    if (filterType) {
      link.href = buildFilterUrl(filterType, value);
    }

    row.appendChild(link);
    container.appendChild(row);
  });
}

/**
 * Initialize and build all registries on the index page
 */
export async function buildRegistries() {
  try {
    // Use preloaded data if available
    let items, institutions, jurisdictions;
    
    if (preloadedData) {
      // Extract data from preloaded config
      const documents = preloadedData.documents.documents.filter(doc => doc.visible !== false);
      items = [...new Set(documents.map(doc => doc.item))].sort((a, b) => a.localeCompare(b));
      institutions = [...new Set(documents.map(doc => doc.institution))].sort((a, b) => a.localeCompare(b));
      jurisdictions = [...new Set(documents.map(doc => doc.jurisdiction))].sort((a, b) => a.localeCompare(b));
    } else {
      // Fall back to individual requests
      [items, institutions, jurisdictions] = await Promise.all([
        getItems(),
        getInstitutions(),
        getJurisdictions()
      ]);
    }

    renderList('item-list', items, { includeAll: true });
    renderList('institution-list', institutions);
    renderList('jurisdiction-list', jurisdictions);

  } catch (error) {
    console.error('Failed to build registries:', error);
    showError('Unable to load document registry. Please try again later.');
  }
}
