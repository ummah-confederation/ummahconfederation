/**
 * Profile UI Module
 * Handles rendering and interaction for social media-style profile views
 * Used on library.html when institution or jurisdiction filter is active
 */

import { getInstitutionMetadata, getJurisdictionMetadata, getDocuments } from './config.js';
import { parseQueryParams, parseHashParams, escapeHtml } from './utils.js';

// Profile state
const profileState = {
  profileType: null, // 'institution' or 'jurisdiction'
  profileName: null, // institution or jurisdiction name
  currentFilter: 'all', // 'all', 'Book', 'Policy', 'Decision', etc.
  documents: [],
  profileData: null,
  availableTypes: []
};

// Callback for filter changes
let onFilterChangeCallback = null;

/**
 * Extract label from bracketed suffix in name
 * @param {string} name - Full name with bracketed label
 * @returns {Object} { name: string, label: string }
 */
function extractLabel(name) {
  const match = name.match(/^(.+?)\s*\[(.*?)\]\s*$/);
  if (match) {
    return {
      name: match[1].trim(),
      label: match[2].trim()
    };
  }
  return { name: name.trim(), label: '' };
}

/**
 * Count documents for an institution
 * @param {Array} documents - All documents
 * @param {string} institutionName - Institution name
 * @returns {number} Document count
 */
function countInstitutionDocuments(documents, institutionName) {
  return documents.filter(doc => doc.institution === institutionName).length;
}

/**
 * Count unique contributors (institutions) for a jurisdiction
 * @param {Array} documents - All documents
 * @param {string} jurisdictionName - Jurisdiction name
 * @returns {number} Unique institution count
 */
function countJurisdictionContributors(documents, jurisdictionName) {
  const institutions = new Set(
    documents
      .filter(doc => doc.jurisdiction === jurisdictionName)
      .map(doc => doc.institution)
  );
  return institutions.size;
}

/**
 * Get unique document types from documents
 * @param {Array} documents - Filtered documents
 * @returns {Array} Sorted array of unique types
 */
function getDocumentTypes(documents) {
  const types = new Set(documents.map(doc => doc.item));
  return ['all', ...[...types].sort((a, b) => a.localeCompare(b))];
}

/**
 * Check if profile view should be shown based on URL params
 * @returns {Object|null} Profile info or null if no profile
 */
export function detectProfileMode() {
  // Try query params first
  let params = parseQueryParams();
  
  // If no params in query, try hash params
  if (!params.institution && !params.jurisdiction) {
    params = parseHashParams();
  }
  
  if (params.institution) {
    return {
      type: 'institution',
      name: params.institution
    };
  }
  
  if (params.jurisdiction) {
    return {
      type: 'jurisdiction',
      name: params.jurisdiction
    };
  }
  
  return null;
}

/**
 * Initialize the profile UI
 * @param {Function} onFilterChange - Callback when filter changes
 */
export async function initializeProfileUI(onFilterChange) {
  onFilterChangeCallback = onFilterChange;
  
  const profileInfo = detectProfileMode();
  if (!profileInfo) {
    // No profile mode, hide profile container
    hideProfileContainer();
    return;
  }
  
  profileState.profileType = profileInfo.type;
  profileState.profileName = profileInfo.name;
  
  // Load all documents to calculate counts and get types
  const allDocuments = await getDocuments();
  profileState.documents = allDocuments.filter(doc => {
    if (profileState.profileType === 'institution') {
      return doc.institution === profileState.profileName;
    } else {
      return doc.jurisdiction === profileState.profileName;
    }
  });
  
  profileState.availableTypes = getDocumentTypes(profileState.documents);
  
  // Load profile metadata
  if (profileState.profileType === 'institution') {
    profileState.profileData = await getInstitutionMetadata(profileState.profileName);
  } else {
    profileState.profileData = await getJurisdictionMetadata(profileState.profileName);
  }
  
  // Render profile
  renderProfile();
  renderSquircleSelectors();
}

/**
 * Hide the profile container
 */
function hideProfileContainer() {
  const container = document.getElementById('profile-container');
  if (container) {
    container.classList.add('hidden');
  }
}

/**
 * Show the profile container
 */
function showProfileContainer() {
  const container = document.getElementById('profile-container');
  if (container) {
    container.classList.remove('hidden');
  }
}

/**
 * Render the profile header
 */
function renderProfile() {
  showProfileContainer();
  
  const container = document.getElementById('profile-header');
  if (!container) return;
  
  const { name, label } = extractLabel(profileState.profileName);
  const metadata = profileState.profileData || {};
  
  // Get cover and avatar with fallbacks
  const coverUrl = metadata.cover || './images/default-cover.jpg';
  const avatarUrl = metadata.avatar || './images/default-avatar.jpg';
  const bio = metadata.bio || '';
  
  // Calculate count
  let countText = '';
  if (profileState.profileType === 'institution') {
    const count = countInstitutionDocuments(profileState.documents, profileState.profileName);
    countText = `${count} contribution${count !== 1 ? 's' : ''}`;
  } else {
    const count = countJurisdictionContributors(profileState.documents, profileState.profileName);
    countText = `${count} contributor${count !== 1 ? 's' : ''}`;
  }
  
  container.innerHTML = `
    <div class="profile-cover">
      <img src="${escapeHtml(coverUrl)}" alt="Cover" />
    </div>
    <div class="profile-info">
      <div class="profile-avatar">
        <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}" />
      </div>
      <div class="profile-details">
        <h1 class="profile-name">${escapeHtml(name)}</h1>
        ${label ? `<span class="profile-label">${escapeHtml(label)}</span>` : ''}
        <span class="profile-count">${escapeHtml(countText)}</span>
        ${bio ? `<p class="profile-bio">${escapeHtml(bio)}</p>` : ''}
      </div>
    </div>
  `;
}

/**
 * Render the squircle selector row
 */
function renderSquircleSelectors() {
  const container = document.getElementById('profile-filters');
  if (!container) return;
  
  const types = profileState.availableTypes;
  
  container.innerHTML = `
    <div class="squircle-selector-row">
      ${types.map(type => `
        <button 
          class="squircle-filter-btn ${type === profileState.currentFilter ? 'active' : ''}" 
          data-type="${escapeHtml(type)}"
        >
          <span class="squircle-filter-icon">${getTypeIcon(type)}</span>
          <span class="squircle-filter-label">${escapeHtml(capitalizeFirst(type))}</span>
        </button>
      `).join('')}
    </div>
  `;
  
  // Add click handlers
  container.querySelectorAll('.squircle-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      setFilter(type);
    });
  });
}

/**
 * Get icon for document type
 * @param {string} type - Document type
 * @returns {string} Icon HTML
 */
function getTypeIcon(type) {
  const icons = {
    all: '📚',
    book: '📖',
    policy: '📋',
    decision: '⚖️'
  };
  return icons[type.toLowerCase()] || '📄';
}

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Set the current filter
 * @param {string} type - Filter type
 */
function setFilter(type) {
  profileState.currentFilter = type;
  
  // Update UI
  document.querySelectorAll('.squircle-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  
  // Notify callback
  if (onFilterChangeCallback) {
    onFilterChangeCallback(type);
  }
}

/**
 * Get the current filter
 * @returns {string} Current filter type
 */
export function getCurrentFilter() {
  return profileState.currentFilter;
}

/**
 * Get filtered documents based on current filter
 * @returns {Array} Filtered documents
 */
export function getFilteredDocuments() {
  if (profileState.currentFilter === 'all') {
    return profileState.documents;
  }
  return profileState.documents.filter(doc => 
    doc.item.toLowerCase() === profileState.currentFilter.toLowerCase()
  );
}

/**
 * Get the profile state (for debugging)
 * @returns {Object} Current profile state
 */
export function getProfileState() {
  return { ...profileState };
}
