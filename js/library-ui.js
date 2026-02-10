/**
 * Library UI Module
 * Handles rendering and interaction for the library page
 */

import { getDocuments } from './config.js';
import { parseQueryParams, parseHashParams, sortDocuments, filterDocuments, escapeHtml, showError } from './utils.js';
import { getFilteredDocuments, detectProfileMode } from './profile-ui.js';

// Current sort state
let currentSort = 'name';
let currentDocuments = [];
let isProfileMode = false;

/**
 * Create a library row element
 * @param {Object} doc - Document object
 * @returns {HTMLElement} Row element
 */
function createLibraryRow(doc) {
  const profileInfo = detectProfileMode();
  const isInstitutionProfile = profileInfo?.type === 'institution';
  const isJurisdictionProfile = profileInfo?.type === 'jurisdiction';
  const isProfileMode = isInstitutionProfile || isJurisdictionProfile;

  const row = document.createElement('div');
  // Use 2-column layout for profile mode with smaller gap, 3-column for non-profile
  const gridClass = isProfileMode ? 'sm:grid sm:grid-cols-[1fr_auto]' : 'sm:grid sm:grid-cols-[1fr_120px_140px]';
  row.className = `library-row ${gridClass} gap-3 items-baseline border-b border-gray-200 py-2`;
  row.dataset.name = doc.title;
  row.dataset.version = doc.version;
  row.dataset.date = doc.date;
  row.dataset.item = doc.item;
  row.dataset.institution = doc.institution;
  row.dataset.jurisdiction = doc.jurisdiction;

  // Title cell with link
  const titleCell = document.createElement('span');
  titleCell.className = 'overflow-hidden text-ellipsis whitespace-nowrap min-w-0';
  const link = document.createElement('a');
  link.href = doc.filename;
  link.textContent = doc.title;
  link.className = 'block overflow-hidden text-ellipsis whitespace-nowrap';
  titleCell.appendChild(link);

  // Metadata cell - conditionally rendered based on profile mode
  const metadataCell = document.createElement('span');

  if (isInstitutionProfile) {
    // Institution Profile: Show "Posted in {Jurisdiction Name}"
    metadataCell.className = 'library-metadata text-right whitespace-nowrap overflow-hidden text-ellipsis shrink-0';
    metadataCell.innerHTML = `<span class="sm:hidden text-base">Posted in </span>${escapeHtml(doc.jurisdiction || '')}`;
  } else if (isJurisdictionProfile) {
    // Jurisdiction Profile: Show "Posted by {Institution Name}"
    metadataCell.className = 'library-metadata text-right whitespace-nowrap overflow-hidden text-ellipsis shrink-0';
    metadataCell.innerHTML = `<span class="sm:hidden text-base">Posted by </span>${escapeHtml(doc.institution || '')}`;
  } else {
    // Non-profile mode: Show version and date (default behavior)
    const versionCell = document.createElement('span');
    versionCell.className = 'library-version text-center tabular-nums';
    versionCell.innerHTML = `<span class="sm:hidden text-base">Version </span>${doc.version}`;

    const dateCell = document.createElement('span');
    dateCell.className = 'library-date text-right whitespace-nowrap';
    dateCell.textContent = doc.dateFormatted;

    row.appendChild(titleCell);
    row.appendChild(versionCell);
    row.appendChild(dateCell);

    return row;
  }

  row.appendChild(titleCell);
  row.appendChild(metadataCell);

  return row;
}

/**
 * Render the library table
 * @param {Array} documents - Array of document objects
 */
function renderLibraryTable(documents) {
  const container = document.getElementById('library');
  if (!container) {
    console.warn('Library container not found');
    return;
  }

  // Detect profile mode for header
  const profileInfo = detectProfileMode();
  const isInstitutionProfile = profileInfo?.type === 'institution';
  const isJurisdictionProfile = profileInfo?.type === 'jurisdiction';
  const isProfileMode = isInstitutionProfile || isJurisdictionProfile;

  // Keep the header row, remove data rows
  const header = container.querySelector('.library-header');
  container.innerHTML = '';

  // Build header based on profile mode
  let headerHTML = '';

  if (isProfileMode) {
    // Profile mode: Show "Title | Posted in/by" with proper grid layout
    if (isInstitutionProfile) {
  headerHTML = `
  <div class="library-row library-header sm:grid grid-cols-[1fr_auto] gap-3 items-baseline text-left font-bold border-b border-black pb-1 mb-3">
    <span class="overflow-hidden text-ellipsis whitespace-nowrap">Title</span>
    <span class="text-right whitespace-nowrap">Posted in</span>
  </div>
`;
    } else {
   headerHTML = `
  <div class="library-row library-header sm:grid grid-cols-[1fr_auto] gap-3 items-baseline text-left font-bold border-b border-black pb-1 mb-3">
    <span class="overflow-hidden text-ellipsis whitespace-nowrap">Title</span>
    <span class="text-right whitespace-nowrap">Posted by</span>
  </div>
`;
    }
  } else {
    // Non-profile mode header: Title | Version | Updated Date (inline)
 headerHTML = `
  <div class="library-row library-header sm:grid grid-cols-[1fr_120px_140px] gap-4 items-baseline text-left font-bold border-b border-black pb-1 mb-3">
    <span class="overflow-hidden text-ellipsis whitespace-nowrap">Title</span>
    <span class="text-center tabular-nums">Version</span>
    <span class="text-right whitespace-nowrap">Updated Date</span>
  </div>
`;
  }

  container.innerHTML = headerHTML;

  // Add document rows
  documents.forEach(doc => {
    const row = createLibraryRow(doc);
    container.appendChild(row);
  });
}

/**
 * Update the context display based on active filters
 * @param {Object} filters - Active filters
 */
function updateContext(filters) {
  const contextElement = document.getElementById('library-context');
  if (!contextElement) return;

  const context = [];

  if (filters.item) context.push(filters.item);
  if (filters.institution) context.push(filters.institution);
  if (filters.jurisdiction) context.push(filters.jurisdiction);

  if (context.length === 0) {
    context.push('All');
  }

  contextElement.textContent = context.join(' · ');
}

/**
 * Update active state of sort buttons
 * @param {string} sortType - Current sort type
 */
function updateSortButtons(sortType) {
  document.querySelectorAll('.sort-controls button').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.sort === sortType) {
      btn.classList.add('active');
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
    document.body.classList.add('has-profile');
  } else {
    document.body.classList.remove('has-profile');
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
    isProfileMode = !!profileInfo || !!detectProfileMode();
    
    // Update body class for UI mode styling
    updateBodyProfileClass(isProfileMode);

    // Hide sort controls in profile mode
    const sortControls = document.querySelector('.sort-controls-wrapper');
    if (sortControls) {
      if (isProfileMode) {
        sortControls.classList.add('hidden');
      } else {
        sortControls.classList.remove('hidden');
      }
    }

    // Use provided URL filters for context display
    // Only load and filter documents if not already set (e.g., by profile mode in main.js)
    if (currentDocuments.length === 0) {
      // Load all documents
      const allDocuments = await getDocuments();

      // Filter documents
      currentDocuments = filterDocuments(allDocuments, urlFilters);

      // Sort by default
      currentDocuments = sortDocuments(currentDocuments, currentSort);
    }

    // Render
    renderLibraryTable(currentDocuments);
    updateContext(urlFilters);
    updateSortButtons(currentSort);

    // Setup sort button handlers (only in non-profile mode)
    if (!isProfileMode) {
      document.querySelectorAll('.sort-controls button').forEach(btn => {
        btn.addEventListener('click', () => {
          const sortType = btn.dataset.sort;
          if (sortType) {
            sortLibrary(sortType);
          }
        });
      });
    }

  } catch (error) {
    console.error('Failed to initialize library:', error);
    showError('Unable to load document library. Please try again later.');
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