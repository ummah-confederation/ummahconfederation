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
  renderFilterPills();
  injectStyles();
}

/**
 * Inject custom styles for the profile UI
 */
function injectStyles() {
  // Check if styles already injected
  if (document.getElementById('profile-custom-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'profile-custom-styles';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      box-sizing: border-box;
    }
    
    :root {
      --profile-bg: #f0f2f5;
      --profile-card-bg: #ffffff;
      --profile-text-primary: #050505;
      --profile-text-secondary: #65676b;
      --profile-accent: #1877f2;
      --profile-border: #e4e6eb;
      --profile-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    #profile-container {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--profile-bg);
      width: 100%;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .hidden {
      display: none !important;
    }
    
    /* Profile Header Container */
    #profile-header {
      width: 100%;
      max-width: 600px;
      background: var(--profile-card-bg);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--profile-shadow);
    }
    
    /* Cover Image */
    .profile-cover {
      width: 100%;
      height: 240px;
      overflow: hidden;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      position: relative;
    }
    
    .profile-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    
    /* Profile Info */
    .profile-info {
      padding: 0 24px 24px 24px;
      position: relative;
    }
    
    .profile-header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 16px;
      min-height: 60px;
    }
    
    .profile-avatar {
      width: 168px;
      height: 168px;
      border-radius: 50%;
      overflow: hidden;
      background: var(--profile-card-bg);
      border: 5px solid var(--profile-card-bg);
      margin-top: -84px;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    
    .profile-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    
    .profile-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      padding-top: 16px;
    }
    
    .profile-button {
      padding: 9px 20px;
      background: var(--profile-accent);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    }
    
    .profile-button:hover {
      background: #166fe5;
    }
    
    .profile-menu-btn {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      background: #e4e6eb;
      border: none;
      color: var(--profile-text-primary);
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      flex-shrink: 0;
    }
    
    .profile-menu-btn:hover {
      background: #d8dadf;
    }
    
    .profile-name {
      font-size: 32px;
      font-weight: 700;
      line-height: 1.2;
      margin: 0 0 4px 0;
      color: var(--profile-text-primary);
    }
    
    .profile-label {
      font-size: 15px;
      font-weight: 400;
      color: var(--profile-text-secondary);
      display: block;
      margin-bottom: 4px;
    }
    
    .profile-count {
      display: block;
      font-size: 15px;
      color: var(--profile-text-secondary);
      margin-bottom: 8px;
    }
    
    .profile-bio {
      font-size: 15px;
      line-height: 1.4;
      color: var(--profile-text-primary);
      margin: 8px 0 0 0;
    }
    
    /* Filter Container */
    #profile-filters {
      width: 100%;
      max-width: 600px;
    }
    
    .filter-pills-container {
      background: var(--profile-card-bg);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      gap: 12px;
      overflow-x: auto;
      box-shadow: var(--profile-shadow);
      -webkit-overflow-scrolling: touch;
    }
    
    .filter-pills-container::-webkit-scrollbar {
      height: 0;
    }
    
    .filter-pill {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: transparent;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
      min-width: 90px;
    }
    
    .filter-pill:hover {
      background: #f0f2f5;
    }
    
    .filter-pill.active {
      background: #e7f3ff;
    }
    
    .filter-pill-icon {
      width: 60px;
      height: 60px;
      border-radius: 14px;
      background: #e4e6eb;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      transition: all 0.2s;
    }
    
    .filter-pill.active .filter-pill-icon {
      background: var(--profile-accent);
      color: white;
      transform: scale(1.05);
    }
    
    .filter-pill-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--profile-text-secondary);
      text-align: center;
      white-space: nowrap;
    }
    
    .filter-pill.active .filter-pill-label {
      color: var(--profile-accent);
      font-weight: 600;
    }
    
    /* Tablet Responsive */
    @media (max-width: 768px) {
      #profile-container {
        padding: 16px;
        gap: 12px;
      }
      
      #profile-header {
        max-width: 100%;
      }
      
      #profile-filters {
        max-width: 100%;
      }
      
      .profile-cover {
        height: 180px;
      }
      
      .profile-avatar {
        width: 140px;
        height: 140px;
        margin-top: -70px;
      }
      
      .profile-name {
        font-size: 28px;
      }
      
      .filter-pill {
        min-width: 80px;
        padding: 10px 16px;
      }
      
      .filter-pill-icon {
        width: 56px;
        height: 56px;
        font-size: 26px;
      }
    }
    
    /* Mobile Responsive */
    @media (max-width: 480px) {
      #profile-container {
        padding: 12px;
        gap: 8px;
      }
      
      .profile-cover {
        height: 140px;
      }
      
      .profile-avatar {
        width: 110px;
        height: 110px;
        margin-top: -55px;
      }
      
      .profile-info {
        padding: 0 16px 16px 16px;
      }
      
      .profile-name {
        font-size: 22px;
      }
      
      .profile-button {
        padding: 7px 16px;
        font-size: 14px;
      }
      
      .profile-menu-btn {
        width: 32px;
        height: 32px;
        font-size: 18px;
      }
      
      .filter-pills-container {
        padding: 12px;
        gap: 8px;
      }
      
      .filter-pill {
        min-width: 70px;
        padding: 8px 12px;
      }
      
      .filter-pill-icon {
        width: 50px;
        height: 50px;
        font-size: 24px;
      }
      
      .filter-pill-label {
        font-size: 12px;
      }
    }
  `;
  
  document.head.appendChild(style);
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
    countText = `${count} Contributions`;
  } else {
    const count = countJurisdictionContributors(profileState.documents, profileState.profileName);
    countText = `${count} Contributors`;
  }
  
  container.innerHTML = `
    <div class="profile-cover">
      <img src="${escapeHtml(coverUrl)}" alt="Cover" />
    </div>
    <div class="profile-info">
      <div class="profile-header-row">
        <div class="profile-avatar">
          <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}" />
        </div>
        <div class="profile-actions">
          <button class="profile-button">Button</button>
          <button class="profile-menu-btn">⋮</button>
        </div>
      </div>
      <h1 class="profile-name">${escapeHtml(name)}</h1>
      ${label ? `<span class="profile-label">${escapeHtml(label)}</span>` : ''}
      <span class="profile-count">${escapeHtml(countText)}</span>
      ${bio ? `<p class="profile-bio">${escapeHtml(bio)}</p>` : ''}
    </div>
  `;
}

/**
 * Render the filter pills
 */
function renderFilterPills() {
  const container = document.getElementById('profile-filters');
  if (!container) return;
  
  const types = profileState.availableTypes;
  
  container.innerHTML = `
    <div class="filter-pills-container">
      ${types.map(type => `
        <button 
          class="filter-pill ${type === profileState.currentFilter ? 'active' : ''}" 
          data-type="${escapeHtml(type)}"
        >
          <span class="filter-pill-icon">${getTypeIcon(type)}</span>
          <span class="filter-pill-label">${escapeHtml(capitalizeFirst(type))}</span>
        </button>
      `).join('')}
    </div>
  `;
  
  // Add click handlers
  container.querySelectorAll('.filter-pill').forEach(btn => {
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
    all: '◈',
    book: '📚',
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
  document.querySelectorAll('.filter-pill').forEach(btn => {
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