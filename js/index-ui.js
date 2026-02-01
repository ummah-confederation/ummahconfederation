/**
 * Index Page UI Mode Module
 * Handles mode switching, tab navigation, and UI Mode gallery rendering
 */

import { getItems, getInstitutions, getJurisdictions, getDocuments, getInstitutionMetadata, getJurisdictionMetadata, getSquircleIconMetadata } from './config.js';
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
    btn.addEventListener('click', async () => {
      const tab = btn.dataset.tab;
      currentTab = tab;
      showTab(tab);
      updateTabButtons(tab);
      
      // Load gallery data when switching to Account or Space tabs
      if (tab === 'account') {
        const institutions = await getInstitutions();
        const documents = await getDocuments();
        await renderAccountGallery(institutions, documents);
      } else if (tab === 'space') {
        const jurisdictions = await getJurisdictions();
        const documents = await getDocuments();
        await renderSpaceGallery(jurisdictions, documents);
      }
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

    await renderContentGallery(items);
    await renderAccountGallery(institutions, documents);
    await renderSpaceGallery(jurisdictions, documents);
  } catch (error) {
    console.error('Failed to load UI galleries:', error);
  }
}

/**
 * Render Content tab gallery with squircle items
 */
async function renderContentGallery(items) {
  const gallery = document.getElementById('content-gallery');
  if (!gallery) return;

  gallery.innerHTML = '';

  for (const item of items) {
    const link = document.createElement('a');
    link.href = buildFilterUrl('item', item);
    link.className = 'squircle-item';

    // Get icon metadata from config
    const iconMetadata = await getSquircleIconMetadata(item);
    const iconSrc = iconMetadata?.src || null;
    const iconAlt = iconMetadata?.alt || item;
    const iconFallback = iconMetadata?.fallback || `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-blue-400"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>`;

    // Build icon HTML - use img if src exists, otherwise use fallback SVG
    const iconHtml = iconSrc
      ? `<img src="${iconSrc}" alt="${iconAlt}" class="w-8 h-8 object-contain" onerror="this.outerHTML='${iconFallback.replace(/"/g, '&quot;')}'">`
      : iconFallback;

    link.innerHTML = `
      <div class="squircle">
        ${iconHtml}
      </div>
      <span class="squircle-label">${item}</span>
    `;

    gallery.appendChild(link);
  }
}

/**
 * Extract label and display name from institution name with square brackets
 * e.g., "Ummah Cabinet [Institution]" -> { displayName: "Ummah Cabinet", label: "Government" }
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
async function renderAccountGallery(institutions, documents) {
  const gallery = document.getElementById('account-gallery');
  if (!gallery) return;

  gallery.innerHTML = '';

  for (const institution of institutions) {
    // Count documents for this institution
    const docCount = documents.filter(doc => doc.institution === institution).length;

    // Parse institution name to get display name and label
    const { displayName, label } = parseInstitution(institution);

    // Get institution metadata for avatar and cover images
    const metadata = await getInstitutionMetadata(institution);
    const avatarUrl = metadata?.avatar || null;
    const coverUrl = metadata?.cover || null;

    const link = document.createElement('a');
    link.href = buildFilterUrl('institution', institution);
    link.className = 'id-card';

    // Use proper relative paths for fallback images
    const coverImageUrl = coverUrl || './images/default-cover.jpg';
    const avatarImageUrl = avatarUrl || './images/default-avatar.jpg';

    link.innerHTML = `
      <div
        class="id-card-cover"
        style="background-image: url('${coverImageUrl}'); background-size: cover; background-position: center;"
      >
        <div class="id-card-avatar">
          <img src="${avatarImageUrl}" alt="${displayName}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">
        </div>
      </div>
      <div class="id-card-content">
        <div class="id-card-name">${displayName}</div>
        <div class="id-card-label">${label}</div>
        <div class="id-card-count">${docCount} contribution${docCount !== 1 ? 's' : ''}</div>
      </div>
    `;

    gallery.appendChild(link);
  }
}

/**
 * Render Space tab gallery with ID cards
 */
async function renderSpaceGallery(jurisdictions, documents) {
  const gallery = document.getElementById('space-gallery');
  if (!gallery) return;

  gallery.innerHTML = '';

  for (const jurisdiction of jurisdictions) {
    // Extract label from square brackets if present
    const bracketMatch = jurisdiction.match(/\[(.*?)\]/);
    const label = bracketMatch ? bracketMatch[1] : 'Community';
    const displayName = jurisdiction.replace(/\s*\[.*?\]\s*$/, '');

    // Count unique institutions that have posted in this jurisdiction
    const docsInJurisdiction = documents.filter(doc => doc.jurisdiction === jurisdiction);
    const uniqueInstitutions = new Set(docsInJurisdiction.map(doc => doc.institution));
    const contributorCount = uniqueInstitutions.size;

    // Get jurisdiction metadata for avatar and cover images
    const metadata = await getJurisdictionMetadata(jurisdiction);
    const avatarUrl = metadata?.avatar || null;
    const coverUrl = metadata?.cover || null;

    const link = document.createElement('a');
    link.href = buildFilterUrl('jurisdiction', jurisdiction);
    link.className = 'id-card';

    // Use proper relative paths for fallback images
    const coverImageUrl = coverUrl || './images/default-cover.jpg';
    const avatarImageUrl = avatarUrl || './images/default-avatar.jpg';

    link.innerHTML = `
      <div
        class="id-card-cover"
        style="background-image: url('${coverImageUrl}'); background-size: cover; background-position: center;"
      >
        <div class="id-card-avatar">
          <img src="${avatarImageUrl}" alt="${displayName}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">
        </div>
      </div>
      <div class="id-card-content">
        <div class="id-card-name">${displayName}</div>
        <div class="id-card-label">${label}</div>
        <div class="id-card-count">${contributorCount} contributor${contributorCount !== 1 ? 's' : ''}</div>
      </div>
    `;
    gallery.appendChild(link);
  }
}