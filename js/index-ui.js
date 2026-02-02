/**
 * Index Page UI Mode Module
 * Handles mode switching, tab navigation, and UI Mode gallery rendering
 * Optimized to reduce network requests through batching and caching
 */

import { getItems, getInstitutions, getJurisdictions, getDocuments, getInstitutionMetadata, getJurisdictionMetadata, getSquircleIconMetadata, preloadAllConfigs } from './config.js';
import { buildFilterUrl } from './utils.js';

// State
let isUIMode = false;
let currentTab = 'content';
let preloadedData = null;
let galleriesLoaded = false;

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

  // Preload all data on initial load to reduce subsequent requests
  preloadData();
}

/**
 * Preload all configuration data
 */
async function preloadData() {
  try {
    preloadedData = await preloadAllConfigs();
    // Load galleries once data is preloaded
    await loadUIGalleries();
  } catch (error) {
    console.error('Failed to preload data:', error);
  }
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

    // Show current tab and ensure galleries are loaded
    showTab(currentTab);
    updateTabButtons(currentTab);
    
    // Load galleries if not already loaded
    if (!galleriesLoaded) {
      loadUIGalleries();
    }
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
      // Use preloaded data if available
      if (tab === 'account') {
        const institutions = preloadedData ? 
          [...new Set(preloadedData.documents.documents.filter(doc => doc.visible !== false).map(doc => doc.institution))].sort() : 
          await getInstitutions();
        const documents = preloadedData ? 
          preloadedData.documents.documents.filter(doc => doc.visible !== false) : 
          await getDocuments();
        await renderAccountGallery(institutions, documents);
      } else if (tab === 'space') {
        const jurisdictions = preloadedData ? 
          [...new Set(preloadedData.documents.documents.filter(doc => doc.visible !== false).map(doc => doc.jurisdiction))].sort() : 
          await getJurisdictions();
        const documents = preloadedData ? 
          preloadedData.documents.documents.filter(doc => doc.visible !== false) : 
          await getDocuments();
        await renderSpaceGallery(jurisdictions, documents);
      } else if (tab === 'content') {
        const items = preloadedData ? 
          [...new Set(preloadedData.documents.documents.filter(doc => doc.visible !== false).map(doc => doc.item))].sort() : 
          await getItems();
        await renderContentGallery(items);
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
    // Use preloaded data if available
    const items = preloadedData ? 
      [...new Set(preloadedData.documents.documents.filter(doc => doc.visible !== false).map(doc => doc.item))].sort() : 
      await getItems();
    const institutions = preloadedData ? 
      [...new Set(preloadedData.documents.documents.filter(doc => doc.visible !== false).map(doc => doc.institution))].sort() : 
      await getInstitutions();
    const jurisdictions = preloadedData ? 
      [...new Set(preloadedData.documents.documents.filter(doc => doc.visible !== false).map(doc => doc.jurisdiction))].sort() : 
      await getJurisdictions();
    const documents = preloadedData ? 
      preloadedData.documents.documents.filter(doc => doc.visible !== false) : 
      await getDocuments();

    await renderContentGallery(items);
    await renderAccountGallery(institutions, documents);
    await renderSpaceGallery(jurisdictions, documents);
    
    galleriesLoaded = true;
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

  // Add "All" option first
  const allLink = document.createElement('a');
  allLink.href = buildFilterUrl('item', 'All', true);
  allLink.className = 'squircle-item';

  const allIconFallback = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-blue-400"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>`;

  allLink.innerHTML = `
    <div class="squircle">
      ${allIconFallback}
    </div>
    <span class="squircle-label">All</span>
  `;

  gallery.appendChild(allLink);

  // Batch fetch all icon metadata at once to reduce requests
  const iconMetadataMap = preloadedData?.squircleIcons?.icons || {};

  for (const item of items) {
    const link = document.createElement('a');
    link.href = buildFilterUrl('item', item);
    link.className = 'squircle-item';

    // Get icon metadata from preloaded data or cache
    const iconMetadata = iconMetadataMap[item] || null;
    const iconSrc = iconMetadata?.src || null;
    const iconAlt = iconMetadata?.alt || item;
    const iconFallback = iconMetadata?.fallback || `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-blue-400"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>`;

    // Build icon HTML - use img if src exists, otherwise use fallback SVG
    // Ensure proper path resolution for icons (add ./ prefix if missing)
    const resolvedIconSrc = iconSrc ? (iconSrc.startsWith('./') || iconSrc.startsWith('/') ? iconSrc : `./${iconSrc}`) : null;
    const iconHtml = resolvedIconSrc
      ? `<img src="${resolvedIconSrc}" alt="${iconAlt}" class="w-8 h-8 object-contain" onerror="this.outerHTML='${iconFallback.replace(/"/g, '&quot;')}'">`
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
 * e.g., "Ummah Cabinet [Non-Profit • Private]" -> { displayName: "Ummah Cabinet", label: "Government" }
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

  // Get all metadata from preloaded data
  const institutionMeta = preloadedData?.institutions?.institutions || {};

  for (const institution of institutions) {
    // Count documents for this institution
    const docCount = documents.filter(doc => doc.institution === institution).length;

    // Parse institution name to get display name and label
    const { displayName, label } = parseInstitution(institution);

    // Get institution metadata from preloaded data
    const metadata = institutionMeta[institution] || null;
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

  // Get all metadata from preloaded data
  const jurisdictionMeta = preloadedData?.jurisdictions?.jurisdictions || {};

  for (const jurisdiction of jurisdictions) {
    // Extract label from square brackets if present
    const bracketMatch = jurisdiction.match(/\[(.*?)\]/);
    const label = bracketMatch ? bracketMatch[1] : 'Community';
    const displayName = jurisdiction.replace(/\s*\[.*?\]\s*$/, '');

    // Count unique institutions that have posted in this jurisdiction
    const docsInJurisdiction = documents.filter(doc => doc.jurisdiction === jurisdiction);
    const uniqueInstitutions = new Set(docsInJurisdiction.map(doc => doc.institution));
    const contributorCount = uniqueInstitutions.size;

    // Get jurisdiction metadata from preloaded data
    const metadata = jurisdictionMeta[jurisdiction] || null;
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
