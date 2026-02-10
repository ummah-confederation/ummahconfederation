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

// Dark Mode Toggle Functionality
const DARK_MODE_KEY = 'darkMode';

function initDarkMode() {
  const adminSeal = document.querySelector('.admin-seal');
  if (!adminSeal) return;

  // Check for saved preference or system preference
  const savedMode = localStorage.getItem(DARK_MODE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Apply dark mode if saved preference is 'true' or if no preference and system prefers dark
  if (savedMode === 'true' || (!savedMode && prefersDark)) {
    document.documentElement.classList.add('dark');
  }

  // Toggle dark mode on click
  adminSeal.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem(DARK_MODE_KEY, isDark);
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize dark mode
  initDarkMode();
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
  initializeLibrary(urlFilters, profileInfo);
});
