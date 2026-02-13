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
  getCurrentFilter,
  renderFeedCarousel,
} from "./profile-ui.js";
import { preloadAllConfigs, getDocumentsList } from "./config.js";
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

  // Load all documents once (using getDocumentsList for properly transformed data)
  const allDocuments = await getDocumentsList();

  // Parse URL filters (query first, fallback to hash)
  let urlFilters = parseQueryParams();
  if (!urlFilters.institution && !urlFilters.jurisdiction && !urlFilters.item) {
    urlFilters = parseHashParams();
  }

  // Detect profile mode
  const profileInfo = detectProfileMode();

  // 1️⃣ Apply URL filters FIRST (item / institution / jurisdiction)
  const urlFilteredDocs = filterDocuments(allDocuments, urlFilters);
  let docs = urlFilteredDocs;

  // In non-profile mode, exclude Feed items - Feed should only be accessible from profile pages
  if (!profileInfo) {
    docs = docs.filter(doc => doc.item !== "Feed");
  }

  if (profileInfo) {
    // 2️⃣ Initialize profile UI
    await initializeProfileUI(async () => {
      const currentFilter = getCurrentFilter();

      // If Feed filter is active, render carousel instead of document list
      if (currentFilter.toLowerCase() === 'feed') {
        const libraryContainer = document.getElementById('library');
        if (libraryContainer) {
          await renderFeedCarousel(libraryContainer);
        }
        return;
      }

      const profileDocs = getFilteredDocuments();

      // Merge profile filters WITH URL filters (use urlFilteredDocs, not mutated docs)
      const profileIds = new Set(profileDocs.map(doc => doc.id));
      const mergedDocs = urlFilteredDocs.filter(doc => profileIds.has(doc.id));

      setDocumentsFilter(mergedDocs);
    });

    // Apply initial profile filter
    const initialFilter = getCurrentFilter();
    const profileDocs = getFilteredDocuments();
    const profileIds = new Set(profileDocs.map(doc => doc.id));
    docs = urlFilteredDocs.filter(doc => profileIds.has(doc.id));
  }

  // 3️⃣ Final sort + render
  docs = sortDocuments(docs, 'name');
  setCurrentDocuments(docs);
  await initializeLibrary(urlFilters, profileInfo);

  // 4️⃣ If Feed is the default filter in profile mode, render carousel over the table
  if (profileInfo) {
    const initialFilter = getCurrentFilter();
    if (initialFilter.toLowerCase() === 'feed') {
      const libraryContainer = document.getElementById('library');
      if (libraryContainer) {
        await renderFeedCarousel(libraryContainer);
      }
    }
  }
});
