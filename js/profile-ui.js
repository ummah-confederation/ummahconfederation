/**
 * Profile UI Module
 * Handles rendering and interaction for social media-style profile views
 * Used on library.html when institution or jurisdiction filter is active
 */

import {
  getInstitutionMetadata,
  getJurisdictionMetadata,
  getDocuments,
} from "./config.js";
import { parseQueryParams, parseHashParams, escapeHtml } from "./utils.js";

// Profile state
const profileState = {
  profileType: null, // 'institution' or 'jurisdiction'
  profileName: null, // institution or jurisdiction name
  currentFilter: "all", // 'all', 'Book', 'Policy', 'Decision', etc.
  documents: [],
  profileData: null,
  availableTypes: [],
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
      label: match[2].trim(),
    };
  }
  return { name: name.trim(), label: "" };
}

/**
 * Count documents for an institution
 * @param {Array} documents - All documents
 * @param {string} institutionName - Institution name
 * @returns {number} Document count
 */
function countInstitutionDocuments(documents, institutionName) {
  return documents.filter((doc) => doc.institution === institutionName).length;
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
      .filter((doc) => doc.jurisdiction === jurisdictionName)
      .map((doc) => doc.institution),
  );
  return institutions.size;
}

/**
 * Get unique document types from documents
 * @param {Array} documents - Filtered documents
 * @returns {Array} Sorted array of unique types
 */
function getDocumentTypes(documents) {
  const types = new Set(documents.map((doc) => doc.item));
  return ["all", ...[...types].sort((a, b) => a.localeCompare(b))];
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
      type: "institution",
      name: params.institution,
    };
  }

  if (params.jurisdiction) {
    return {
      type: "jurisdiction",
      name: params.jurisdiction,
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
  profileState.documents = allDocuments.filter((doc) => {
    if (profileState.profileType === "institution") {
      return doc.institution === profileState.profileName;
    } else {
      return doc.jurisdiction === profileState.profileName;
    }
  });

  profileState.availableTypes = getDocumentTypes(profileState.documents);

  // Load profile metadata
  if (profileState.profileType === "institution") {
    profileState.profileData = await getInstitutionMetadata(
      profileState.profileName,
    );
  } else {
    profileState.profileData = await getJurisdictionMetadata(
      profileState.profileName,
    );
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
  if (document.getElementById("profile-custom-styles")) return;

  const style = document.createElement("style");
  style.id = "profile-custom-styles";
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
      --profile-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
    }
    
    #profile-container {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: transparent;
      width: 100%;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 100%;
      margin: 0 auto;
    }
    
    .hidden {
      display: none !important;
    }
    
    /* Profile Header Container */
    #profile-header {
      width: 100%;
      background: var(--profile-card-bg);
      border-radius: 16px;
      overflow: visible;
      box-shadow: var(--profile-shadow);
      flex-shrink: 0;
    }
    
    /* Cover Image */
    .profile-cover {
      width: 100%;
      height: 200px;
      overflow: hidden;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      position: relative;
      border-radius: 16px 16px 0 0;
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
      width: 100%;
    }
    
    .profile-header-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 16px;
      min-height: 60px;
      width: 100%;
    }
    
    .profile-details-section {
      width: 100%;
      display: block;
      text-align: left;
    }
    
    .profile-avatar {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      overflow: hidden;
      background: var(--profile-card-bg);
      border: 4px solid var(--profile-card-bg);
      margin-top: -45px;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
      align-items: flex-end;
      padding-bottom: 8px;
    }
    
    .profile-button {
      padding: 8px 18px;
      background: var(--profile-accent);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
      white-space: nowrap;
    }
    
    .profile-button:hover {
      background: #166fe5;
    }
    
    .profile-button:active {
      transform: scale(0.98);
    }
    
    .profile-menu-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #e4e6eb;
      border: none;
      color: var(--profile-text-primary);
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.1s;
      flex-shrink: 0;
    }
    
    .profile-menu-btn:hover {
      background: #d8dadf;
    }
    
    .profile-menu-btn:active {
      transform: scale(0.95);
    }
    
    .profile-name {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
      margin: 0 0 6px 0;
      color: var(--profile-text-primary);
      word-break: break-word;
    }

    .profile-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--profile-text-secondary);
      display: block;
      margin: 0 0 10px 0;
    }

    .profile-count {
      display: block;
      font-size: 13px;
      color: var(--profile-text-secondary);
      margin: 0 0 6px 0;
    }

    .profile-bio {
      font-size: 14px;
      line-height: 1.5;
      color: var(--profile-text-primary);
      margin: 0;
      word-break: break-word;
    }
    
    /* Filter Container */
    #profile-filters {
      width: 100%;
      background: var(--profile-card-bg);
      border-radius: 16px;
      box-shadow: var(--profile-shadow);
      overflow: hidden;
    }
    
    .filter-pills-container {
      padding: 16px;
      display: flex;
      gap: 12px;
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
      width: 100%;
    }
    
    .filter-pills-container::-webkit-scrollbar {
      display: none;
    }
    
    .filter-pill {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 12px 12px;
      background: transparent;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 80px;
      scroll-snap-align: start;
    }
    
    .filter-pill:hover {
      background: #f5f5f5;
      transform: translateY(-2px);
    }
    
    .filter-pill.active {
      
      transform: translateY(-2px)
    }
    
    .filter-pill-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: transform 0.2s ease;
      flex-shrink: 0;
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
    
    /* Large Desktop */
    @media (min-width: 1400px) {
      .profile-cover {
        height: 220px;
      }
      
      .profile-avatar {
        width: 110px;
        height: 110px;
        margin-top: -55px;
      }
      
      .profile-name {
        font-size: 28px;
      }
    }
    
    /* Tablet */
    @media (max-width: 768px) {
      #profile-container {
        padding: 12px;
        gap: 12px;
      }
      
      .profile-cover {
        height: 160px;
      }
      
      .profile-avatar {
        width: 80px;
        height: 80px;
        margin-top: -40px;
        border-width: 3px;
      }
      
      .profile-info {
        padding: 0 20px 20px 20px;
      }
      
      .profile-header-row {
        min-height: 50px;
      }
      
      .profile-name {
        font-size: 20px;
      }
      
      .profile-button {
        padding: 7px 16px;
        font-size: 13px;
      }
      
      .profile-menu-btn {
        width: 34px;
        height: 34px;
        font-size: 16px;
      }
      
      .filter-pill {
        min-width: 70px;
        padding: 10px 10px;
      }
      
      .filter-pill-icon {
        width: 40px;
        height: 40px;
        font-size: 20px;
      }
      
      .filter-pill-label {
        font-size: 12px;
      }
      
      .filter-pills-container {
        padding: 14px;
        gap: 10px;
      }
    }
    
    /* Mobile Large */
    @media (max-width: 576px) {
      #profile-container {
        padding: 12px;
        gap: 12px;
      }
      
      .profile-cover {
        height: 140px;
      }
      
      .profile-avatar {
        width: 70px;
        height: 70px;
        margin-top: -35px;
        border-width: 3px;
      }
      
      .profile-info {
        padding: 0 16px 16px 16px;
      }
      
      .profile-header-row {
        min-height: 45px;
        margin-bottom: 12px;
      }
      
      .profile-name {
        font-size: 18px;
      }
      
      .profile-label,
      .profile-count {
        font-size: 12px;
      }
      
      .profile-bio {
        font-size: 13px;
      }
      
      .profile-button {
        padding: 6px 14px;
        font-size: 12px;
      }
      
      .profile-menu-btn {
        width: 32px;
        height: 32px;
        font-size: 16px;
      }
      
      .filter-pills-container {
        padding: 12px;
        gap: 8px;
      }
      
      .filter-pill {
        min-width: 65px;
        padding: 8px 8px;
      }
      
      .filter-pill-icon {
        width: 38px;
        height: 38px;
        font-size: 19px;
      }
      
      .filter-pill-label {
        font-size: 11px;
      }
    }
    
    /* Mobile Small */
    @media (max-width: 375px) {
      #profile-container {
        padding: 10px;
        gap: 10px;
      }
      
      .profile-cover {
        height: 120px;
      }
      
      .profile-avatar {
        width: 65px;
        height: 65px;
        margin-top: -32px;
        border-width: 3px;
      }
      
      .profile-info {
        padding: 0 14px 14px 14px;
      }
      
      .profile-header-row {
        min-height: 40px;
        margin-bottom: 10px;
      }
      
      .profile-name {
        font-size: 16px;
      }
      
      .profile-label,
      .profile-count {
        font-size: 11px;
      }
      
      .profile-bio {
        font-size: 12px;
        line-height: 1.4;
      }
      
      .profile-button {
        padding: 6px 12px;
        font-size: 11px;
      }
      
      .profile-menu-btn {
        width: 30px;
        height: 30px;
        font-size: 14px;
      }
      
      .filter-pills-container {
        padding: 10px;
        gap: 6px;
      }
      
      .filter-pill {
        min-width: 60px;
        padding: 8px 8px;
      }
      
      .filter-pill-icon {
        width: 36px;
        height: 36px;
        font-size: 18px;
      }
      
      .filter-pill-label {
        font-size: 10px;
      }
    }
  `;

  document.head.appendChild(style);
}

/**
 * Hide the profile container
 */
function hideProfileContainer() {
  const container = document.getElementById("profile-container");
  if (container) {
    container.classList.add("hidden");
  }
}

/**
 * Show the profile container
 */
function showProfileContainer() {
  const container = document.getElementById("profile-container");
  if (container) {
    container.classList.remove("hidden");
  }
}

/**
 * Render the profile header
 */
function renderProfile() {
  showProfileContainer();

  const container = document.getElementById("profile-header");
  if (!container) return;

  const { name, label } = extractLabel(profileState.profileName);
  const metadata = profileState.profileData || {};

  // Get cover and avatar with fallbacks
  const coverUrl = metadata.cover || "./images/default-cover.jpg";
  const avatarUrl = metadata.avatar || "./images/default-avatar.jpg";
  const bio = metadata.bio || "";

  // Calculate count
  let countText = "";
  if (profileState.profileType === "institution") {
    const count = countInstitutionDocuments(
      profileState.documents,
      profileState.profileName,
    );
    countText = `${count} Contributions`;
  } else {
    const count = countJurisdictionContributors(
      profileState.documents,
      profileState.profileName,
    );
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
      <div class="profile-details-section">
        <h1 class="profile-name">${escapeHtml(name)}</h1>
        ${label ? `<span class="profile-label">${escapeHtml(label)}</span>` : ""}
        <span class="profile-count">${escapeHtml(countText)}</span>
        ${bio ? `<p class="profile-bio">${escapeHtml(bio)}</p>` : ""}
      </div>
    </div>
  `;
}

/**
 * Render the filter pills
 */
function renderFilterPills() {
  const container = document.getElementById("profile-filters");
  if (!container) return;

  const types = profileState.availableTypes;

  container.innerHTML = `
    <div class="filter-pills-container">
      ${types
        .map(
          (type) => `
        <button 
          class="filter-pill ${type === profileState.currentFilter ? "active" : ""}" 
          data-type="${escapeHtml(type)}"
        >
          <span class="filter-pill-icon">
            ${getTypeIcon(type)}
          </span>
          <span class="filter-pill-label">${escapeHtml(capitalizeFirst(type))}</span>
        </button>
      `,
        )
        .join("")}
    </div>
  `;

  // Add click handlers
  container.querySelectorAll(".filter-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
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
    all: "📂",
    book: "📚",
    policy: "📋",
    decision: "⚖️",
  };
  return icons[type.toLowerCase()] || "📄";
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
  document.querySelectorAll(".filter-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
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
  if (profileState.currentFilter === "all") {
    return profileState.documents;
  }
  return profileState.documents.filter(
    (doc) =>
      doc.item.toLowerCase() === profileState.currentFilter.toLowerCase(),
  );
}

/**
 * Get the profile state (for debugging)
 * @returns {Object} Current profile state
 */
export function getProfileState() {
  return { ...profileState };
}