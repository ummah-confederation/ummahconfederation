/**
 * Index Page UI Module
 * Handles tab navigation and gallery rendering
 * Optimized to reduce network requests through batching and caching
 */

import { getItems, getInstitutions, getJurisdictions, getDocuments, getInstitutionMetadata, getJurisdictionMetadata, getSquircleIconMetadata, preloadAllConfigs } from './config.js';
import { buildFilterUrl } from './utils.js';

// State
let currentTab = 'content';
let preloadedData = null;
let galleriesLoaded = false;

/**
 * Initialize the UI functionality
 */
export function initUIMode() {
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


  allLink.innerHTML = `
  <div class="squircle">
    <span class="squircle-emoji">📂</span>
  </div>
  <span class="squircle-label">All</span>
 `;


  gallery.appendChild(allLink);

  // Batch fetch all icon metadata at once to reduce requests
  const iconMetadataMap = preloadedData?.squircleIcons?.icons || {};
  
  // Build a case-insensitive lookup map
  const iconMetadataLowerMap = {};
  Object.keys(iconMetadataMap).forEach(key => {
    iconMetadataLowerMap[key.toLowerCase()] = iconMetadataMap[key];
  });

  for (const item of items) {
    const link = document.createElement('a');
    link.href = buildFilterUrl('item', item);
    link.className = 'squircle-item';

  
   
  const emoji =
   iconMetadataMap[item]?.emoji ||
   iconMetadataLowerMap[item.toLowerCase()]?.emoji ||
   '📄';

 link.innerHTML = `
  <div class="squircle">
    <span class="squircle-emoji">${emoji}</span>
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

  // Build array of institutions with contribution counts
  const institutionCounts = [];
  for (const institution of institutions) {
    // Count documents for this institution
    const docCount = documents.filter(doc => doc.institution === institution).length;
    institutionCounts.push({ institution, docCount });
  }
  
  // Sort by contribution count in descending order
  institutionCounts.sort((a, b) => b.docCount - a.docCount);

  for (const { institution, docCount } of institutionCounts) {
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
    const avatarImageUrl = avatarUrl || './images/default-avatar.webp';

    link.innerHTML = `
      <div
        class="id-card-cover"
        style="background-image: url('${coverImageUrl}'); background-size: cover; background-position: center;"
      >
        <div class="id-card-avatar">
          <img src="${avatarImageUrl}" alt="${displayName}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" decoding="async" onerror="this.style.display='none'">
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

  // Build array of jurisdictions with contributor counts
  const jurisdictionCounts = [];
  for (const jurisdiction of jurisdictions) {
    // Extract label from square brackets if present
    const bracketMatch = jurisdiction.match(/\[(.*?)\]/);
    const label = bracketMatch ? bracketMatch[1] : 'Community';
    const displayName = jurisdiction.replace(/\s*\[.*?\]\s*$/, '');

    // Count unique institutions that have posted in this jurisdiction
    const docsInJurisdiction = documents.filter(doc => doc.jurisdiction === jurisdiction);
    const uniqueInstitutions = new Set(docsInJurisdiction.map(doc => doc.institution));
    const contributorCount = uniqueInstitutions.size;

    jurisdictionCounts.push({ jurisdiction, displayName, label, contributorCount });
  }
  
  // Sort by contributor count in descending order
  jurisdictionCounts.sort((a, b) => b.contributorCount - a.contributorCount);

  for (const { jurisdiction, displayName, label, contributorCount } of jurisdictionCounts) {
    // Get jurisdiction metadata from preloaded data
    const metadata = jurisdictionMeta[jurisdiction] || null;
    const avatarUrl = metadata?.avatar || null;
    const coverUrl = metadata?.cover || null;

    const link = document.createElement('a');
    link.href = buildFilterUrl('jurisdiction', jurisdiction);
    link.className = 'id-card';

    // Use proper relative paths for fallback images
    const coverImageUrl = coverUrl || './images/default-cover.jpg';
    const avatarImageUrl = avatarUrl || './images/default-avatar.webp';

    link.innerHTML = `
      <div
        class="id-card-cover"
        style="background-image: url('${coverImageUrl}'); background-size: cover; background-position: center;"
      >
        <div class="id-card-avatar">
          <img src="${avatarImageUrl}" alt="${displayName}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" decoding="async" onerror="this.style.display='none'">
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
