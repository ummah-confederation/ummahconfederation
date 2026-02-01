/**
 * Index Page UI Mode Module
 * Handles mode switching, tab navigation, and UI Mode gallery rendering
 */

import { getItems, getInstitutions, getJurisdictions, getDocuments } from './config.js';
import { buildFilterUrl } from './utils.js';

// State
let isUIMode = false;
let currentTab = 'content';

/**
 * Initialize the UI mode functionality
 */
export function initUIMode() {
  const modeSwitcher = document.getElementById('mode-switcher');
  if (modeSwitcher) {
    modeSwitcher.addEventListener('click', toggleMode);
  }

  // Initialize tab buttons
  initTabs();

  // Load initial data for UI mode
  loadUIGalleries();
}

/**
 * Toggle between Lite Mode and UI Mode
 */
function toggleMode() {
  isUIMode = !isUIMode;
  const modeSwitcher = document.getElementById('mode-switcher');
  const liteMode = document.getElementById('lite-mode');
  const uiMode = document.getElementById('ui-mode');

  if (isUIMode) {
    // Switch to UI Mode
    modeSwitcher.textContent = 'Switch to Lite Mode';
    liteMode.classList.add('hidden');
    uiMode.classList.remove('hidden');

    // Show current tab
    showTab(currentTab);
  } else {
    // Switch to Lite Mode
    modeSwitcher.textContent = 'Switch to UI Mode';
    liteMode.classList.remove('hidden');
    uiMode.classList.add('hidden');
  }
}

/**
 * Initialize tab button listeners
 */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      currentTab = tab;
      showTab(tab);
      updateTabButtons(tab);
    });
  });
}

/**
 * Show the specified tab and hide others
 */
function showTab(tabName) {
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => {
    tab.classList.add('hidden');
  });

  const activeTab = document.getElementById(`${tabName}-tab`);
  if (activeTab) {
    activeTab.classList.remove('hidden');
  }
}

/**
 * Update tab button styles
 */
function updateTabButtons(activeTab) {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    if (btn.dataset.tab === activeTab) {
      btn.classList.add('active', 'bg-white', 'shadow-sm', 'text-gray-900');
      btn.classList.remove('text-gray-600');
    } else {
      btn.classList.remove('active', 'bg-white', 'shadow-sm', 'text-gray-900');
      btn.classList.add('text-gray-600');
    }
  });
}

/**
 * Load all UI galleries with data
 */
async function loadUIGalleries() {
  try {
    const [items, institutions, jurisdictions, documents] = await Promise.all([
      getItems(),
      getInstitutions(),
      getJurisdictions(),
      getDocuments()
    ]);

    renderContentGallery(items);
    renderAccountGallery(institutions, documents);
    renderSpaceGallery(jurisdictions, documents);
  } catch (error) {
    console.error('Failed to load UI galleries:', error);
  }
}

/**
 * Render Content tab gallery with squircle items
 */
function renderContentGallery(items) {
  const gallery = document.getElementById('content-gallery');
  if (!gallery) return;

  gallery.innerHTML = '';

  items.forEach(item => {
    const link = document.createElement('a');
    link.href = buildFilterUrl('item', item);
    link.className = 'squircle-item';

    link.innerHTML = `
      <div class="squircle">
        <!-- EDIT SQUIRCLE ICON: Replace the SVG below with an <img> tag for custom icons -->
        <!-- Example: <img src="images/items/${item.toLowerCase()}.png" alt="${item}"> -->
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-blue-400">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <span class="squircle-label">${item}</span>
    `;

    gallery.appendChild(link);
  });
}

/**
 * Extract label and display name from institution name with square brackets
 * e.g., "Ummah Cabinet [Government]" -> { displayName: "Ummah Cabinet", label: "Government" }
 */
function parseInstitution(institution) {
  const bracketMatch = institution.match(/\[(.*?)\]/);
  const label = bracketMatch ? bracketMatch[1] : institution.replace(/^Ummah\s+/, '');
  const displayName = institution.replace(/\s*\[.*?\]\s*$/, '');
  return { displayName, label };
}

/**
 * Render Account tab gallery with ID cards
 */
function renderAccountGallery(institutions, documents) {
  const gallery = document.getElementById('account-gallery');
  if (!gallery) return;

  gallery.innerHTML = '';

  institutions.forEach(institution => {
    // Count documents for this institution
    const docCount = documents.filter(doc => doc.institution === institution).length;

    // Parse institution name to get display name and label
    const { displayName, label } = parseInstitution(institution);

    const link = document.createElement('a');
    link.href = buildFilterUrl('institution', institution);
    link.className = 'id-card';

    link.innerHTML = `
      <div class="id-card-cover">
        <div class="id-card-avatar">
          <!-- EDIT AVATAR: Replace the SVG below with an <img> tag pointing to your avatar image -->
          <!-- Example: <img src="images/institutions/${displayName.toLowerCase().replace(/\s+/g, '-')}.png" alt="${displayName}"> -->
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-gray-400">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
      </div>
      <div class="id-card-content">
        <div class="id-card-name">${displayName}</div>
        <div class="id-card-label">${label}</div>
        <div class="id-card-count">${docCount} contribution${docCount !== 1 ? 's' : ''}</div>
      </div>
    `;

    gallery.appendChild(link);
  });
}

/**
 * Render Space tab gallery with ID cards
 */
function renderSpaceGallery(jurisdictions, documents) {
  const gallery = document.getElementById('space-gallery');
  if (!gallery) return;

  gallery.innerHTML = '';

  jurisdictions.forEach(jurisdiction => {
    // Extract label from square brackets if present
    const bracketMatch = jurisdiction.match(/\[(.*?)\]/);
    const label = bracketMatch ? bracketMatch[1] : 'Community';
    const displayName = jurisdiction.replace(/\s*\[.*?\]\s*$/, '');

    // Count unique institutions that have posted in this jurisdiction
    const docsInJurisdiction = documents.filter(doc => doc.jurisdiction === jurisdiction);
    const uniqueInstitutions = new Set(docsInJurisdiction.map(doc => doc.institution));
    const contributorCount = uniqueInstitutions.size;

    const link = document.createElement('a');
    link.href = buildFilterUrl('jurisdiction', jurisdiction);
    link.className = 'id-card';

    link.innerHTML = `
      <!-- EDIT COVER: Change the gradient colors or replace with an image -->
      <!-- Example with image: <div class="id-card-cover" style="background-image: url('images/covers/${displayName.toLowerCase().replace(/\s+/g, '-')}.jpg'); background-size: cover;"> -->
      <div class="id-card-cover" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
        <div class="id-card-avatar">
          <!-- EDIT AVATAR: Replace the SVG below with an <img> tag pointing to your avatar image -->
          <!-- Example: <img src="images/jurisdictions/${displayName.toLowerCase().replace(/\s+/g, '-')}.png" alt="${displayName}"> -->
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-gray-400">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </div>
      </div>
      <div class="id-card-content">
        <div class="id-card-name">${displayName}</div>
        <div class="id-card-label">${label}</div>
        <div class="id-card-count">${contributorCount} contributor${contributorCount !== 1 ? 's' : ''}</div>
      </div>
    `;

    gallery.appendChild(link);
  });
}
