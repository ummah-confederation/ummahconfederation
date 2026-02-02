/**
 * Utility Functions
 * Shared helper functions for the document management system
 */

/**
 * Parse URL query parameters
 * @returns {Object} Object containing filter parameters
 */
export function parseQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    item: params.get('item'),
    institution: params.get('institution'),
    jurisdiction: params.get('jurisdiction')
  };
}

/**
 * Parse hash-based URL parameters (for client-side routing compatibility)
 * @returns {Object} Object containing filter parameters
 */
export function parseHashParams() {
  const hash = window.location.hash.slice(1); // Remove #
  if (!hash) return { item: null, institution: null, jurisdiction: null };
  
  const params = new URLSearchParams(hash);
  return {
    item: params.get('item'),
    institution: params.get('institution'),
    jurisdiction: params.get('jurisdiction')
  };
}

/**
 * Build a filter URL for the library page
 * @param {string} type - Filter type (item, institution, jurisdiction)
 * @param {string} value - Filter value
 * @param {boolean} isAll - Whether this is the "All" option (no filter)
 * @returns {string} URL with query parameters
 */
export function buildFilterUrl(type, value, isAll = false) {
  if (isAll) {
    return 'library.html';
  }
  return `library.html?${type}=${encodeURIComponent(value)}`;
}

/**
 * Format a date string for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${year} | ${hours}:${minutes}`;
}

/**
 * Sort documents by field
 * @param {Array} documents - Array of document objects
 * @param {string} sortBy - Field to sort by (name, version, date)
 * @returns {Array} Sorted array
 */
export function sortDocuments(documents, sortBy) {
  const sorted = [...documents];

  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));

    case 'version':
      return sorted.sort((a, b) => {
        const versionDiff = b.version - a.version;
        if (versionDiff !== 0) return versionDiff;
        return new Date(b.date) - new Date(a.date);
      });

    case 'date':
      return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));

    default:
      return sorted;
  }
}

/**
 * Filter documents based on query parameters
 * @param {Array} documents - Array of document objects
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered array
 */
export function filterDocuments(documents, filters) {
  return documents.filter(doc => {
    if (filters.item && doc.item.toLowerCase() !== filters.item.toLowerCase()) {
      return false;
    }
    if (filters.institution && doc.institution.toLowerCase() !== filters.institution.toLowerCase()) {
      return false;
    }
    if (filters.jurisdiction && doc.jurisdiction.toLowerCase() !== filters.jurisdiction.toLowerCase()) {
      return false;
    }
    return true;
  });
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show error message to user
 * @param {string} message - Error message to display
 */
export function showError(message) {
  console.error(message);

  // Create error element
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.style.cssText = `
    background: #fee;
    border: 1px solid #fcc;
    color: #c00;
    padding: 1rem;
    margin: 1rem;
    border-radius: 4px;
    text-align: center;
  `;
  errorDiv.textContent = message;

  // Insert at top of body
  document.body.insertBefore(errorDiv, document.body.firstChild);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}
