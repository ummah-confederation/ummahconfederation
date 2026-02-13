/**
 * Library UI Module
 * Handles rendering and interaction for the library page
 */

import { getDocumentsList } from "./config.js";
import {
  parseQueryParams,
  parseHashParams,
  sortDocuments,
  filterDocuments,
  escapeHtml,
  showError,
} from "./utils.js";
import { getFilteredDocuments, detectProfileMode } from "./profile-ui.js";

// Current sort state
let currentSort = "name";
let currentDocuments = [];
let isProfileMode = false;

/**
 * Create a library row element (card-style layout)
 * @param {Object} doc - Document object
 * @returns {HTMLElement} Row element
 */
function createLibraryRow(doc) {
  const profileInfo = detectProfileMode();
  const isInstitutionProfile = profileInfo?.type === "institution";
  const isJurisdictionProfile = profileInfo?.type === "jurisdiction";
  const isProfileMode = isInstitutionProfile || isJurisdictionProfile;

  const row = document.createElement("div");
  row.className = "library-card border-b border-gray-200 py-2";

  row.dataset.name = doc.title;
  row.dataset.version = doc.version;
  row.dataset.date = doc.date;
  row.dataset.item = doc.item;
  row.dataset.institution = doc.institution;
  row.dataset.jurisdiction = doc.jurisdiction;

  // Title row with link
  const titleRow = document.createElement("div");
  titleRow.className = "library-card-title";
  const link = document.createElement("a");
  link.href = doc.filename;
  link.textContent = doc.title;
  link.className = "library-card-link";
  titleRow.appendChild(link);

  // Metadata row
  const metadataRow = document.createElement("div");
  metadataRow.className = "library-card-metadata";

  if (isInstitutionProfile) {
    // Institution Profile: Show "Posted in {Jurisdiction Name}" - clickable
    const jurisdictionName = (doc.jurisdiction || "").replace(/\s*\[.*?\]\s*/g, "");
    const jurisdictionLink = doc.jurisdiction ? `?jurisdiction=${encodeURIComponent(doc.jurisdiction)}` : "#";
    metadataRow.innerHTML = `<span class="library-card-label">Posted in</span> <a href="${escapeHtml(jurisdictionLink)}" class="library-profile-link">${escapeHtml(jurisdictionName) || "-"}</a>`;
  } else if (isJurisdictionProfile) {
    // Jurisdiction Profile: Show "Posted by {Institution Name}" - clickable
    const institutionName = (doc.institution || "").replace(/\s*\[.*?\]\s*/g, "");
    const institutionLink = doc.institution ? `?institution=${encodeURIComponent(doc.institution)}` : "#";
    metadataRow.innerHTML = `<span class="library-card-label">Posted by</span> <a href="${escapeHtml(institutionLink)}" class="library-profile-link">${escapeHtml(institutionName) || "-"}</a>`;
  } else {
    // Non-profile mode: Show both Posted In and Posted By on separate rows
    const jurisdictionName = (doc.jurisdiction || "").replace(/\s*\[.*?\]\s*/g, "");
    const jurisdictionLink = doc.jurisdiction ? `?jurisdiction=${encodeURIComponent(doc.jurisdiction)}` : "#";
    const institutionName = (doc.institution || "").replace(/\s*\[.*?\]\s*/g, "");
    const institutionLink = doc.institution ? `?institution=${encodeURIComponent(doc.institution)}` : "#";
    
    metadataRow.innerHTML = `
      <span class="library-card-meta-item">
        <span class="library-card-label">Posted in</span> 
        <a href="${escapeHtml(jurisdictionLink)}" class="library-profile-link">${escapeHtml(jurisdictionName) || "-"}</a>
      </span>
    `;
    
    // Create separate row for Posted By
    const postedByRow = document.createElement("div");
    postedByRow.className = "library-card-metadata";
    postedByRow.innerHTML = `
      <span class="library-card-meta-item">
        <span class="library-card-label">Posted by</span> 
        <a href="${escapeHtml(institutionLink)}" class="library-profile-link">${escapeHtml(institutionName) || "-"}</a>
      </span>
    `;
    
    row.appendChild(titleRow);
    row.appendChild(metadataRow);
    row.appendChild(postedByRow);

    return row;
  }

  row.appendChild(titleRow);
  row.appendChild(metadataRow);

  return row;
}

/**
 * Render the library table
 * @param {Array} documents - Array of document objects
 */
function renderLibraryTable(documents) {
  const container = document.getElementById("library");
  if (!container) {
    console.warn("Library container not found");
    return;
  }

  // Clear container
  container.innerHTML = "";

  // Add document rows (card-style, no header needed)
  documents.forEach((doc) => {
    const row = createLibraryRow(doc);
    container.appendChild(row);
  });
}
/**
 * Update the context display based on active filters
 * @param {Object} filters - Active filters
 */
function updateContext(filters) {
  const contextElement = document.getElementById("library-context");
  if (!contextElement) return;

  const context = [];

  if (filters.item) context.push(filters.item);
  if (filters.institution) context.push(filters.institution);
  if (filters.jurisdiction) context.push(filters.jurisdiction);

  if (context.length === 0) {
    context.push("All");
  }

  contextElement.textContent = context.join(" · ");
}

/**
 * Update active state of sort buttons
 * @param {string} sortType - Current sort type
 */
function updateSortButtons(sortType) {
  document.querySelectorAll(".sort-controls button").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.sort === sortType) {
      btn.classList.add("active");
    }
  });
}

/**
 * Sort the library by the specified type
 * @param {string} type - Sort type (name, version, date)
 */
export function sortLibrary(type) {
  currentSort = type;
  currentDocuments = sortDocuments(currentDocuments, type);
  renderLibraryTable(currentDocuments);
  updateSortButtons(type);
}

/**
 * Update body class based on profile mode
 * @param {boolean} hasProfile - Whether profile mode is active
 */
function updateBodyProfileClass(hasProfile) {
  if (hasProfile) {
    document.body.classList.add("has-profile");
  } else {
    document.body.classList.remove("has-profile");
  }
}

/**
 * Initialize the library page
 * @param {Object} urlFilters - URL-derived filters to use for context display
 * @param {Object} profileInfo - Profile mode info
 */
export async function initializeLibrary(urlFilters = {}, profileInfo = null) {
  try {
    // Check if we're in profile mode
    const detectedProfile = detectProfileMode();
    isProfileMode = !!profileInfo || !!detectedProfile;

    // Update body class for UI mode styling
    updateBodyProfileClass(isProfileMode);

    // Update sort controls based on mode
    const sortControls = document.querySelector(".sort-controls-wrapper");
    if (sortControls) {
      if (isProfileMode) {
        // Show sort controls in profile mode with appropriate buttons
        const isInstitutionProfile = detectedProfile?.type === "institution";
        sortControls.classList.remove("hidden");
        
        // Update sort buttons for profile mode
        const sortContainer = sortControls.querySelector(".sort-controls");
        if (sortContainer) {
          if (isInstitutionProfile) {
            sortContainer.innerHTML = `
              <button data-sort="name" class="sort-btn active">Title</button>
              <button data-sort="postedIn" class="sort-btn">Posted In</button>
            `;
          } else {
            sortContainer.innerHTML = `
              <button data-sort="name" class="sort-btn active">Title</button>
              <button data-sort="postedBy" class="sort-btn">Posted By</button>
            `;
          }
        }
      } else {
        sortControls.classList.remove("hidden");
      }
    }

    // Hide context display in profile mode
    const contextElement = document.getElementById("library-context");
    if (contextElement) {
      if (isProfileMode) {
        contextElement.classList.add("hidden");
      } else {
        contextElement.classList.remove("hidden");
      }
    }

    // Use provided URL filters for context display
    // Only load and filter documents if not already set (e.g., by profile mode in main.js)
    if (currentDocuments.length === 0) {
      // Load all documents (using getDocumentsList for properly transformed data)
      const allDocuments = await getDocumentsList();

      // Filter documents
      currentDocuments = filterDocuments(allDocuments, urlFilters);

      // In non-profile mode, exclude Feed items - Feed should only be accessible from profile pages
      if (!isProfileMode) {
        currentDocuments = currentDocuments.filter(doc => doc.item !== "Feed");
      }

      // Sort by default
      currentDocuments = sortDocuments(currentDocuments, currentSort);
    }

    // Render
    renderLibraryTable(currentDocuments);
    updateContext(urlFilters);
    updateSortButtons(currentSort);

    // Setup sort button handlers
    document.querySelectorAll(".sort-controls button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sortType = btn.dataset.sort;
        if (sortType) {
          sortLibrary(sortType);
        }
      });
    });
  } catch (error) {
    console.error("Failed to initialize library:", error);
    showError("Unable to load document library. Please try again later.");
  }
}

/**
 * Set documents from external filter (e.g., profile UI)
 * @param {Array} documents - Filtered documents to display
 */
export function setDocumentsFilter(documents) {
  currentDocuments = sortDocuments(documents, currentSort);
  renderLibraryTable(currentDocuments);
  updateSortButtons(currentSort);
}

/**
 * Get current documents (for profile UI integration)
 * @returns {Array} Current documents array
 */
export function getCurrentDocuments() {
  return currentDocuments;
}

/**
 * Set current documents directly
 * @param {Array} documents - Documents to set
 */
export function setCurrentDocuments(documents) {
  currentDocuments = documents;
}
