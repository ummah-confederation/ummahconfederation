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
  const avatarUrl = metadata.avatar || "./images/default-avatar.webp";
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

  const buttonText = profileState.profileType === "institution" ? "Contact" : "Contributors";

  container.innerHTML = `
    <div class="profile-cover">
      <img src="${escapeHtml(coverUrl)}" alt="Cover" loading="lazy" decoding="async" />
    </div>
    <div class="profile-info">
      <div class="profile-header-row">
        <div class="profile-avatar">
          <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}" loading="eager" fetchpriority="high" />
        </div>
        <div class="profile-actions">
          <button class="profile-button" id="profile-action-btn">${escapeHtml(buttonText)}</button>
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

  // Add click handler for the action button
  const actionBtn = document.getElementById("profile-action-btn");
  if (actionBtn) {
    actionBtn.addEventListener("click", handleActionButtonClick);
  }
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
    guideline: "💎",
    policy: "📋",
    decision: "ℹ️",
    verdict: "⚖️",
    note: "📎",
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

/**
 * Handle action button click
 * Shows contact card for institutions or contributor list for jurisdictions
 */
function handleActionButtonClick() {
  if (profileState.profileType === "institution") {
    showContactCard();
  } else {
    showContributorList();
  }
}

/**
 * Show contact card modal for institution
 */
async function showContactCard() {
  const metadata = profileState.profileData || {};
  const { name, label } = extractLabel(profileState.profileName);
  const contact = metadata.contact || {};

  const modalOverlay = document.getElementById("profile-modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalContent = document.getElementById("modal-content");

  if (!modalOverlay || !modalTitle || !modalContent) {
    console.error("Modal elements not found");
    return;
  }

  modalTitle.textContent = "Contact Information";

  const avatarUrl = metadata.avatar || "./images/default-avatar.webp";

  modalContent.innerHTML = `
    <div class="contact-card">
      <div class="contact-card-header">
        <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}" class="contact-card-avatar" loading="lazy" decoding="async" />
        <div>
          <div class="contact-card-name">${escapeHtml(name)}</div>
          ${label ? `<div class="contact-card-label">${escapeHtml(label)}</div>` : ""}
        </div>
      </div>
      ${contact.email ? `
        <div class="contact-info-item">
          <span class="contact-info-icon">📧</span>
          <div>
            <div class="contact-info-label">Email</div>
            <div class="contact-info-value">
              <a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>
            </div>
          </div>
        </div>
      ` : ""}
      ${contact.phone ? `
        <div class="contact-info-item">
          <span class="contact-info-icon">📱</span>
          <div>
            <div class="contact-info-label">Phone</div>
            <div class="contact-info-value">
              <a href="tel:${escapeHtml(contact.phone.replace(/\s/g, ''))}">${escapeHtml(contact.phone)}</a>
            </div>
          </div>
        </div>
      ` : ""}
      ${contact.address ? `
        <div class="contact-info-item">
          <span class="contact-info-icon">📍</span>
          <div>
            <div class="contact-info-label">Address</div>
            <div class="contact-info-value">${escapeHtml(contact.address)}</div>
          </div>
        </div>
      ` : ""}
      ${contact.website ? `
        <div class="contact-info-item">
          <span class="contact-info-icon">🌐</span>
          <div>
            <div class="contact-info-label">Website</div>
            <div class="contact-info-value">
              <a href="${escapeHtml(contact.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(contact.website)}</a>
            </div>
          </div>
        </div>
      ` : ""}
      ${!contact.email && !contact.phone && !contact.address && !contact.website ? `
        <div class="contact-info-item">
          <span class="contact-info-icon">ℹ️</span>
          <div class="contact-info-value">No contact information available</div>
        </div>
      ` : ""}
    </div>
  `;

  modalOverlay.classList.add("active");
}

/**
 * Show contributor list modal for jurisdiction
 */
async function showContributorList() {
  const { name, label } = extractLabel(profileState.profileName);

  const modalOverlay = document.getElementById("profile-modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const modalContent = document.getElementById("modal-content");

  if (!modalOverlay || !modalTitle || !modalContent) {
    console.error("Modal elements not found");
    return;
  }

  modalTitle.textContent = "Contributors";

  // Get unique institutions that have documents in this jurisdiction
  const contributors = getJurisdictionContributors(profileState.profileName);

  if (contributors.length === 0) {
    modalContent.innerHTML = `
      <div class="contact-info-item">
        <span class="contact-info-icon">ℹ️</span>
        <div class="contact-info-value">No contributors found</div>
      </div>
    `;
  } else {
    const contributorItems = await Promise.all(
      contributors.map(async (contributor) => {
        const metadata = await getInstitutionMetadata(contributor.name);
        const avatarUrl = metadata?.avatar || "./images/default-avatar.webp";
        const { name: instName, label: instLabel } = extractLabel(contributor.name);

        return `
          <div class="contributor-item">
            <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(instName)}" class="contributor-avatar" loading="lazy" decoding="async" />
            <div class="contributor-info">
              <div class="contributor-name">${escapeHtml(instName)}</div>
              <div class="contributor-count">${contributor.count} contribution${contributor.count !== 1 ? 's' : ''}</div>
            </div>
            <a href="?institution=${encodeURIComponent(contributor.name)}" class="contributor-link">View</a>
          </div>
        `;
      })
    );

    modalContent.innerHTML = `
      <div class="contributor-list">
        ${contributorItems.join("")}
      </div>
    `;
  }

  modalOverlay.classList.add("active");
}

/**
 * Get contributors (institutions) for a jurisdiction
 * @param {string} jurisdictionName - Jurisdiction name
 * @returns {Array} Array of { name, count } objects
 */
function getJurisdictionContributors(jurisdictionName) {
  const contributorMap = new Map();

  profileState.documents.forEach((doc) => {
    if (doc.jurisdiction === jurisdictionName) {
      const institution = doc.institution;
      contributorMap.set(institution, (contributorMap.get(institution) || 0) + 1);
    }
  });

  return Array.from(contributorMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Close the modal
 */
function closeModal() {
  const modalOverlay = document.getElementById("profile-modal-overlay");
  if (modalOverlay) {
    modalOverlay.classList.remove("active");
  }
}

/**
 * Initialize modal event listeners
 */
function initializeModalListeners() {
  const modalOverlay = document.getElementById("profile-modal-overlay");
  const modalClose = document.getElementById("modal-close");

  // Close button
  if (modalClose) {
    modalClose.addEventListener("click", closeModal);
  }

  // Click outside modal to close
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }

  // Escape key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  });
}

// Initialize modal listeners when module loads
initializeModalListeners();