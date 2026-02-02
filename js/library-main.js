/**
 * Library Page Main Entry Point
 * Initializes the library page
 * Optimized to preload data and reduce network requests
 */

import { initializeLibrary, setDocumentsFilter, getCurrentDocuments, setCurrentDocuments } from './library-ui.js';
import { initializeProfileUI, getFilteredDocuments, detectProfileMode } from './profile-ui.js';
import { preloadAllConfigs, getDocuments } from './config.js';
import { parseQueryParams, parseHashParams, filterDocuments, sortDocuments } from './utils.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Preload all configuration data before initializing UI
  // This ensures all data is cached for subsequent operations
  await preloadAllConfigs();
  
  // Check if we're in profile mode (institution or jurisdiction filter)
  const profileInfo = detectProfileMode();
  
  if (profileInfo) {
    // Initialize profile UI first (this loads profile data)
    await initializeProfileUI(async (filterType) => {
      // When filter changes, update the library display
      const filteredDocs = getFilteredDocuments();
      setDocumentsFilter(filteredDocs);
    });
    
    // Now initialize the library with profile-filtered documents
    const allDocuments = await getDocuments();
    
    // Get URL filter parameters
    let urlFilters = parseQueryParams();
    if (!urlFilters.institution && !urlFilters.jurisdiction) {
      urlFilters = parseHashParams();
    }
    
    // First apply URL filters (institution/jurisdiction)
    let docs = filterDocuments(allDocuments, urlFilters);
    
    // Then apply profile's document type filter
    const profileFilteredDocs = getFilteredDocuments();
    const profileDocIds = new Set(profileFilteredDocs.map(doc => doc.id));
    docs = docs.filter(doc => profileDocIds.has(doc.id));
    
    // Sort and set documents
    docs = sortDocuments(docs, 'name');
    setCurrentDocuments(docs);
    
    // Initialize library UI (renders from pre-set documents)
    initializeLibrary();
  } else {
    // Normal mode - just initialize the library
    initializeLibrary();
  }
});
