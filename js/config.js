/**
 * Configuration Module
 * 
 * Uses Supabase as the data source.
 * Provides backward-compatible API for the rest of the codebase.
 */

import {
  getInstitutions,
  getJurisdictions,
  getDocuments,
  getDocumentByDocId,
  getInstitutionByFullName,
  getJurisdictionByFullName,
  getCarousels,
  getCarouselsByInstitution,
  getCarouselsByJurisdiction,
  getSquircleIcons,
  getInstitutionConfigLegacy,
  getJurisdictionConfigLegacy,
  getDocumentsConfigLegacy
} from './supabase-client.js';

// =====================================================
// DOCUMENT CONFIGURATION
// =====================================================

/**
 * Load the documents configuration
 * @returns {Promise<Object>} The configuration object
 */
export async function loadDocumentsConfig() {
  return getDocumentsConfigLegacy();
}

/**
 * Get all visible documents (including Feed items from carousels)
 * @returns {Promise<Array>} Array of document objects
 */
export async function getDocumentsList() {
  // Fetch both documents and carousels in parallel
  const [docs, carousels] = await Promise.all([
    getDocuments(),
    getCarousels()
  ]);
  
  // Transform documents to legacy format
  const documents = docs.map(doc => ({
    id: doc.doc_id,
    title: doc.title,
    item: doc.item_type,
    institution: doc.institution?.full_name || '',
    jurisdiction: doc.jurisdiction?.full_name || '',
    version: doc.version,
    date: doc.doc_date,
    dateFormatted: formatDate(doc.doc_date),
    visible: doc.visible,
    // Use document-viewer.html for Supabase documents
    filename: `document-viewer.html?doc=${doc.doc_id}`
  }));
  
  // Transform carousels to Feed items (legacy format)
  const feedItems = carousels.map(carousel => ({
    id: `carousel-${carousel.id}`,
    title: carousel.title,
    item: 'Feed',
    institution: carousel.institution?.full_name || '',
    jurisdiction: carousel.jurisdiction?.full_name || '',
    version: 1,
    date: carousel.created_at,
    dateFormatted: formatDate(carousel.created_at),
    visible: carousel.visible,
    carousel: {
      images: carousel.slides?.map(s => s.image_url) || [],
      image: carousel.slides?.[0]?.image_url || ''
    }
  }));
  
  return [...documents, ...feedItems];
}

/**
 * Get document by ID
 * @param {string} documentId - The document ID
 * @returns {Promise<Object|null>} The document object or null
 */
export async function getDocumentById(documentId) {
  const doc = await getDocumentByDocId(documentId);
  if (!doc) return null;
  
  // Generate filename based on item type and doc_id
  const itemFolder = doc.item_type?.toLowerCase() + 's'; // books, policies, etc.
  const filename = `pages/${itemFolder}/${doc.doc_id}.html`;
  
  return {
    id: doc.doc_id,
    title: doc.title,
    item: doc.item_type,
    institution: doc.institution?.full_name || '',
    jurisdiction: doc.jurisdiction?.full_name || '',
    version: doc.version,
    date: doc.doc_date,
    dateFormatted: formatDate(doc.doc_date),
    visible: doc.visible,
    content: doc.content,
    filename: filename
  };
}

// =====================================================
// INSTITUTION CONFIGURATION
// =====================================================

/**
 * Load the institution configuration
 * @returns {Promise<Object>} The institution configuration object
 */
export async function loadInstitutionConfig() {
  return getInstitutionConfigLegacy();
}

/**
 * Get institution metadata by full institution name
 * @param {string} institutionName - The full institution name
 * @returns {Promise<Object|null>} The institution metadata or null
 */
export async function getInstitutionMetadata(institutionName) {
  const inst = await getInstitutionByFullName(institutionName);
  if (!inst) return null;
  
  return {
    avatar: inst.avatar_url,
    cover: inst.cover_url,
    bio: inst.bio,
    contact: {
      email: inst.contact_email,
      phone: inst.contact_phone,
      address: inst.contact_address,
      website: inst.contact_website
    },
    feed_config: {
      widget: {
        enabled: inst.feed_widget_enabled,
        type: inst.feed_widget_type
      }
    }
  };
}

/**
 * Get unique institutions from all documents
 * @returns {Promise<Array>} Sorted array of unique institutions
 */
export async function getInstitutionsList() {
  const documents = await getDocumentsList();
  const institutions = new Set(documents.map(doc => doc.institution));
  return [...institutions].sort((a, b) => a.localeCompare(b));
}

/**
 * Get institution feed configuration
 * @param {string} institutionName - The full institution name
 * @returns {Promise<Object|null>} The feed config or null
 */
export async function getInstitutionFeedConfig(institutionName) {
  const metadata = await getInstitutionMetadata(institutionName);
  return metadata?.feed_config || null;
}

// =====================================================
// JURISDICTION CONFIGURATION
// =====================================================

/**
 * Load the jurisdiction configuration
 * @returns {Promise<Object>} The jurisdiction configuration object
 */
export async function loadJurisdictionConfig() {
  return getJurisdictionConfigLegacy();
}

/**
 * Get jurisdiction metadata by full jurisdiction name
 * @param {string} jurisdictionName - The full jurisdiction name
 * @returns {Promise<Object|null>} The jurisdiction metadata or null
 */
export async function getJurisdictionMetadata(jurisdictionName) {
  const jur = await getJurisdictionByFullName(jurisdictionName);
  if (!jur) return null;
  
  return {
    avatar: jur.avatar_url,
    cover: jur.cover_url,
    bio: jur.bio,
    feed_config: {
      widget: {
        enabled: jur.feed_widget_enabled,
        type: jur.feed_widget_type
      }
    }
  };
}

/**
 * Get unique jurisdictions from all documents
 * @returns {Promise<Array>} Sorted array of unique jurisdictions
 */
export async function getJurisdictionsList() {
  const documents = await getDocumentsList();
  const jurisdictions = new Set(documents.map(doc => doc.jurisdiction));
  return [...jurisdictions].sort((a, b) => a.localeCompare(b));
}

/**
 * Get jurisdiction feed configuration
 * @param {string} jurisdictionName - The full jurisdiction name
 * @returns {Promise<Object|null>} The feed config or null
 */
export async function getJurisdictionFeedConfig(jurisdictionName) {
  const metadata = await getJurisdictionMetadata(jurisdictionName);
  return metadata?.feed_config || null;
}

// =====================================================
// ITEM TYPES
// =====================================================

/**
 * Get unique items from all documents
 * @returns {Promise<Array>} Sorted array of unique items
 */
export async function getItems() {
  const documents = await getDocumentsList();
  const items = new Set(documents.map(doc => doc.item));
  return [...items].sort((a, b) => a.localeCompare(b));
}

// =====================================================
// SQUIRCLE ICONS
// =====================================================

/**
 * Load the squircle icons configuration
 * @returns {Promise<Object>} The squircle icons configuration object
 */
export async function loadSquircleIconsConfig() {
  const icons = await getSquircleIcons();
  return {
    version: '2.0.0',
    icons: icons.reduce((acc, icon) => {
      acc[icon.item_name] = {
        emoji: icon.emoji,
        icon_url: icon.icon_url,
        icon_svg: icon.icon_svg
      };
      return acc;
    }, {})
  };
}

/**
 * Get squircle icon metadata by item name
 * @param {string} itemName - The item name
 * @returns {Promise<Object|null>} The icon metadata or null
 */
export async function getSquircleIconMetadata(itemName) {
  const config = await loadSquircleIconsConfig();
  return config.icons?.[itemName] || null;
}

// =====================================================
// FEED DOCUMENTS
// =====================================================

/**
 * Get Feed-type documents for a given profile
 * @param {string} profileType - 'institution' or 'jurisdiction'
 * @param {string} profileName - The full institution or jurisdiction name
 * @returns {Promise<Array>} Array of Feed document objects
 */
export async function getFeedDocuments(profileType, profileName) {
  let carousels;
  if (profileType === 'institution') {
    carousels = await getCarouselsByInstitution(profileName);
  } else {
    carousels = await getCarouselsByJurisdiction(profileName);
  }
  
  // Transform to legacy format and resolve linked documents
  const resolved = await Promise.all(
    carousels.map(async (carousel) => {
      // Resolve linked document for the first slide
      const firstSlide = carousel.slides?.[0];
      let linkedDocument = null;
      if (firstSlide?.linked_document?.doc_id) {
        linkedDocument = await getDocumentById(firstSlide.linked_document.doc_id);
      }
      
      return {
        id: `carousel-${carousel.id}`,
        title: carousel.title,
        item: 'Feed',
        institution: carousel.institution?.full_name || '',
        jurisdiction: carousel.jurisdiction?.full_name || '',
        version: 1,
        date: carousel.created_at,
        dateFormatted: formatDate(carousel.created_at),
        visible: carousel.visible,
        carousel: {
          images: carousel.slides?.map(s => s.image_url) || [],
          image: carousel.slides?.[0]?.image_url || '', // First image for compatibility
          linked_document_id: firstSlide?.linked_document?.doc_id || null
        },
        slides: carousel.slides,
        linkedDocument: linkedDocument ? {
          id: linkedDocument.id,
          title: linkedDocument.title,
          filename: linkedDocument.filename || `pages/${linkedDocument.item_type?.toLowerCase()}s/${linkedDocument.id}.html`
        } : null
      };
    })
  );
  
  return resolved;
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
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} | ${hours}:${minutes}`;
}

/**
 * Preload all configurations at once
 * @returns {Promise<Object>} Object containing all configs
 */
export async function preloadAllConfigs() {
  const [documents, institutions, jurisdictions, squircleIcons] = await Promise.all([
    loadDocumentsConfig(),
    loadInstitutionConfig(),
    loadJurisdictionConfig(),
    loadSquircleIconsConfig()
  ]);

  return {
    documents,
    institutions,
    jurisdictions,
    squircleIcons
  };
}

// =====================================================
// BACKWARD COMPATIBILITY RE-EXPORTS
// =====================================================
// Re-export functions from supabase-client.js for backward compatibility

export { getInstitutions, getJurisdictions, getDocuments };
