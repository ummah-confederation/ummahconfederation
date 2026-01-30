/**
 * Library UI Module
 * Handles rendering and interaction for the library page
 */

import { getDocuments } from './config.js';
import { parseQueryParams, sortDocuments, filterDocuments, escapeHtml, showError } from './utils.js';

// Current sort state
let currentSort = 'name';
let currentDocuments = [];

/**
 * Create a library row element
 * @param {Object} doc - Document object
 * @returns {HTMLElement} Row element
 */
function createLibraryRow(doc) {
  const row = document.createElement('div');
  row.className = 'library-row sm:grid sm:grid-cols-[1fr_120px_140px] gap-4 items-baseline border-b border-gray-200 py-2';
  row.dataset.name = doc.title;
  row.dataset.version = doc.version;
  row.dataset.date = doc.date;
  row.dataset.item = doc.item;
  row.dataset.institution = doc.institution;
  row.dataset.jurisdiction = doc.jurisdiction;

  // Title cell with link
  const titleCell = document.createElement('span');
  titleCell.className = 'overflow-hidden text-ellipsis whitespace-nowrap';
  const link = document.createElement('a');
  link.href = doc.filename;
  link.textContent = doc.title;
  link.className = 'block overflow-hidden text-ellipsis whitespace-nowrap';
  titleCell.appendChild(link);

  // Version cell
  const versionCell = document.createElement('span');
  versionCell.className = 'library-version text-center tabular-nums';
  versionCell.innerHTML = `<span class="sm:hidden text-base">Version </span>${doc.version}`;

  // Date cell
  const dateCell = document.createElement('span');
  dateCell.className = 'library-date text-right whitespace-nowrap';
  dateCell.textContent = doc.dateFormatted;

  row.appendChild(titleCell);
  row.appendChild(versionCell);
  row.appendChild(dateCell);

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

  // Keep the header row, remove data rows
  const header = container.querySelector('.library-header');
  container.innerHTML = '';

  if (header) {
    container.appendChild(header);
  } else {
    // Create header if not present
    const headerRow = document.createElement('div');
    headerRow.className = 'library-row library-header hidden sm:grid sm:grid-cols-[1fr_120px_140px] gap-4 items-baseline text-left font-bold border-b border-black pb-1 mb-3';
    headerRow.innerHTML = `
      <span class="overflow-hidden text-ellipsis whitespace-nowrap">Title</span>
      <span class="text-center tabular-nums">Version</span>
      <span class="text-right whitespace-nowrap">Updated Date</span>
    `;
    container.appendChild(headerRow);
  }

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
 * Initialize the library page
 */
export async function initializeLibrary() {
  try {
    // Load all documents
    const allDocuments = await getDocuments();

    // Get filter parameters
    const filters = parseQueryParams();

    // Filter documents
    currentDocuments = filterDocuments(allDocuments, filters);

    // Sort by default
    currentDocuments = sortDocuments(currentDocuments, currentSort);

    // Render
    renderLibraryTable(currentDocuments);
    updateContext(filters);
    updateSortButtons(currentSort);

    // Setup sort button handlers
    document.querySelectorAll('.sort-controls button').forEach(btn => {
      btn.addEventListener('click', () => {
        const sortType = btn.dataset.sort;
        if (sortType) {
          sortLibrary(sortType);
        }
      });
    });

  } catch (error) {
    console.error('Failed to initialize library:', error);
    showError('Unable to load document library. Please try again later.');
  }
}
