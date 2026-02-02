/**
 * Library Page Main Entry Point
 * Initializes the library page
 * Optimized to preload data and reduce network requests
 */

import {
  initializeLibrary,
  setDocumentsFilter,
  getCurrentDocuments,
  setCurrentDocuments,
} from "./library-ui.js";
import {
  initializeProfileUI,
  getFilteredDocuments,
  detectProfileMode,
} from "./profile-ui.js";
import { preloadAllConfigs, getDocuments } from "./config.js";
import {
  parseQueryParams,
  parseHashParams,
  filterDocuments,
  sortDocuments,
} from "./utils.js";

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Preload configs
  await preloadAllConfigs();

  // Load all documents once
  const allDocuments = await getDocuments();

  // Parse URL filters (query first, fallback to hash)
  let urlFilters = parseQueryParams();
  if (!urlFilters.institution && !urlFilters.jurisdiction && !urlFilters.item) {
    urlFilters = parseHashParams();
  }

  // Detect profile mode
  const profileInfo = detectProfileMode();

  let docs = allDocuments;

  // 1️⃣ Apply URL filters FIRST (item / institution / jurisdiction)
  docs = filterDocuments(docs, urlFilters);

  if (profileInfo) {
    // 2️⃣ Initialize profile UI
    await initializeProfileUI(() => {
      const profileDocs = getFilteredDocuments();

      // Merge profile filters WITH URL filters
      const profileIds = new Set(profileDocs.map(doc => doc.id));
      const mergedDocs = docs.filter(doc => profileIds.has(doc.id));

      setDocumentsFilter(mergedDocs);
    });

    // Apply initial profile filter
    const profileDocs = getFilteredDocuments();
    const profileIds = new Set(profileDocs.map(doc => doc.id));
    docs = docs.filter(doc => profileIds.has(doc.id));
  }

  // 3️⃣ Final sort + render
  docs = sortDocuments(docs, 'name');
  setCurrentDocuments(docs);
  initializeLibrary();
});
