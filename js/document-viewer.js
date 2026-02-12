/**
 * Document Viewer Module
 * 
 * Fetches and renders document content from Supabase.
 * Used by document-viewer.html to display documents dynamically.
 */

import { getDocumentByDocId } from './supabase-client.js';

// =====================================================
// INITIALIZATION
// =====================================================

/**
 * Initialize the document viewer
 */
async function initDocumentViewer() {
  // Get document ID from URL
  const docId = getDocumentIdFromUrl();
  
  if (!docId) {
    showError('No document ID provided. Use URL format: document-viewer.html?doc=book0');
    return;
  }
  
  try {
    // Fetch document from Supabase
    const document = await getDocumentByDocId(docId);
    
    if (!document) {
      showError(`Document "${docId}" not found.`);
      return;
    }
    
    // Update page title
    document.title = `DAARUSSALAAM — ${document.title}`;
    
    // Render document content
    renderDocument(document);
    
  } catch (error) {
    console.error('Error loading document:', error);
    showError(`Failed to load document: ${error.message}`);
  }
}

/**
 * Get document ID from URL
 * Supports both query param and hash formats:
 * - ?doc=book0
 * - #book0
 * @returns {string|null} Document ID or null
 */
function getDocumentIdFromUrl() {
  // Try query parameter first
  const urlParams = new URLSearchParams(window.location.search);
  const docParam = urlParams.get('doc');
  if (docParam) {
    return docParam;
  }
  
  // Try hash
  const hash = window.location.hash.slice(1);
  if (hash) {
    return hash;
  }
  
  return null;
}

// =====================================================
// RENDERING
// =====================================================

/**
 * Render document content
 * @param {Object} doc - Document object from Supabase
 */
function renderDocument(doc) {
  const loadingState = window.document.getElementById('loading-state');
  const errorState = window.document.getElementById('error-state');
  const documentBody = window.document.getElementById('document-body');
  
  // Hide loading and error states
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  
  // Show document body
  documentBody.classList.remove('hidden');
  
  // Build document HTML
  const html = buildDocumentHtml(doc);
  documentBody.innerHTML = html;
  
  // Initialize dark mode toggle on admin seal
  initAdminSealToggle();
  
  // Update page title
  window.document.title = `DAARUSSALAAM — ${doc.title}`;
}

/**
 * Build document HTML from document data
 * @param {Object} doc - Document object
 * @returns {string} HTML string
 */
function buildDocumentHtml(doc) {
  // Format date
  const dateStr = doc.doc_date ? formatDate(doc.doc_date) : '';
  
  // Get institution and jurisdiction names
  const institutionName = doc.institution?.full_name || doc.institution_name || 'Unknown Institution';
  const jurisdictionName = doc.jurisdiction?.full_name || doc.jurisdiction_name || 'Unknown Jurisdiction';
  
  // Build header
  const header = `
    <!-- Administrative Seal - Dark Mode Toggle -->
    <img
      src="${getAdminSealUrl()}"
      alt="Administrative Seal"
      class="admin-seal"
    />
    <div class="arabic right">
      <p>بسم الله الرحمن الرحيم</p>
      <p>
        <em>In the name of Allah. The Most Compassionate. The Most Merciful.</em>
      </p>
    </div>

    <hr />
    <p>Institution : ${escapeHtml(institutionName)}</p>
    <p>Jurisdiction : ${escapeHtml(jurisdictionName)}</p>
    <p>Version : ${doc.version || 1}</p>
    ${dateStr ? `<p>Date : ${escapeHtml(dateStr)}</p>` : ''}
    <hr />
  `;
  
  // Document content (already HTML)
  const content = doc.content || '<p>No content available.</p>';
  
  // Build footer
  const footer = `
    <hr />
    <div class="arabic right">
      <p>اهدنا الصراط المستقيم</p>
      <p><em>Guide us to the straight path.</em></p>
    </div>

    <hr />

    <strong><p class="end-book">END OF ${doc.item_type?.toUpperCase() || 'DOCUMENT'}</p></strong>
  `;
  
  return header + content + footer;
}

/**
 * Get admin seal image URL
 * @returns {string} Image URL
 */
function getAdminSealUrl() {
  // This should be updated to use Supabase Storage URL after migration
  return './images/admin-seal.webp';
}

// =====================================================
// ERROR HANDLING
// =====================================================

/**
 * Show error state
 * @param {string} message - Error message
 */
function showError(message) {
  const loadingState = window.document.getElementById('loading-state');
  const errorState = window.document.getElementById('error-state');
  const errorDetails = window.document.getElementById('error-details');
  
  loadingState.classList.add('hidden');
  errorState.classList.remove('hidden');
  errorDetails.textContent = message;
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * Format date for display
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} | ${hours}:${minutes}`;
}

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Initialize dark mode toggle on admin seal click
 */
function initAdminSealToggle() {
  const adminSeal = window.document.querySelector('.admin-seal');
  if (!adminSeal) return;
  
  const DARK_MODE_KEY = 'darkMode';
  
  adminSeal.addEventListener('click', () => {
    window.document.documentElement.classList.toggle('dark');
    const isDark = window.document.documentElement.classList.contains('dark');
    localStorage.setItem(DARK_MODE_KEY, isDark);
  });
}

// =====================================================
// MAIN
// =====================================================

// Initialize when DOM is ready
window.document.addEventListener('DOMContentLoaded', initDocumentViewer);
