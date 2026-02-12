/**
 * Configuration Module
 * 
 * Now uses Supabase as the data source instead of local JSON files.
 * Provides backward-compatible API for the rest of the codebase.
 * 
 * Set window.USE_SUPABASE = true to use Supabase (default)
 * Set window.USE_SUPABASE = false to fall back to local JSON files
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
  getSquircleIconByItemName,
  getInstitutionConfigLegacy,
  getJurisdictionConfigLegacy,
  getDocumentsConfigLegacy
} from './supabase-client.js';

// Feature flag - can be overridden via window.USE_SUPABASE
const USE_SUPABASE = typeof window !== 'undefined' && window.USE_SUPABASE === false ? false : true;

// Cache for local file fallback
let localConfigCache = null;
let localInstitutionConfigCache = null;
let localJurisdictionConfigCache = null;
let localSquircleIconsConfigCache = null;

// =====================================================
// DOCUMENT CONFIGURATION
// =====================================================

/**
 * Load the documents configuration
 * @returns {Promise<Object>} The configuration object
 */
export async function loadDocumentsConfig() {
  if (USE_SUPABASE) {
    return getDocumentsConfigLegacy();
  }
  
  // Fallback to local JSON
  if (localConfigCache) {
    return localConfigCache;
  }
  
  try {
    const response = await fetch('config/documents-config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    localConfigCache = await response.json();
    return localConfigCache;
  } catch (error) {
    console.error('Error loading documents config:', error);
    throw error;
  }
}

/**
 * Get all visible documents
 * @returns {Promise<Array>} Array of document objects
 */
export async function getDocumentsList() {
  if (USE_SUPABASE) {
    const docs = await getDocuments();
    // Transform to legacy format
    return docs.map(doc => ({
      id: doc.doc_id,
      title: doc.title,
      item: doc.item_type,
      institution: doc.institution?.full_name || '',
      jurisdiction: doc.jurisdiction?.full_name || '',
      version: doc.version,
      date: doc.doc_date,
      dateFormatted: formatDate(doc.doc_date),
      visible: doc.visible
    }));
  }
  
  const config = await loadDocumentsConfig();
  return config.documents.filter(doc => doc.visible !== false);
}

/**
 * Get document by ID
 * @param {string} documentId - The document ID
 * @returns {Promise<Object|null>} The document object or null
 */
export async function getDocumentById(documentId) {
  if (USE_SUPABASE) {
    const doc = await getDocumentByDocId(documentId);
    if (!doc) return null;
    
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
      content: doc.content
    };
  }
  
  const config = await loadDocumentsConfig();
  return config.documents.find(doc => doc.id === documentId) || null;
}

// =====================================================
// INSTITUTION CONFIGURATION
// =====================================================

/**
 * Load the institution configuration
 * @returns {Promise<Object>} The institution configuration object
 */
export async function loadInstitutionConfig() {
  if (USE_SUPABASE) {
    return getInstitutionConfigLegacy();
  }
  
  // Fallback to local JSON
  if (localInstitutionConfigCache) {
    return localInstitutionConfigCache;
  }
  
  try {
    const response = await fetch('config/institution-config.json');
    if (!response.ok) {
      throw new Error(`Failed to load institution config: ${response.status}`);
    }
    localInstitutionConfigCache = await response.json();
    return localInstitutionConfigCache;
  } catch (error) {
    console.error('Error loading institution config:', error);
    return { institutions: {} };
  }
}

/**
 * Get institution metadata by full institution name
 * @param {string} institutionName - The full institution name
 * @returns {Promise<Object|null>} The institution metadata or null
 */
export async function getInstitutionMetadata(institutionName) {
  if (USE_SUPABASE) {
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
  
  const config = await loadInstitutionConfig();
  return config.institutions?.[institutionName] || null;
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
  if (USE_SUPABASE) {
    return getJurisdictionConfigLegacy();
  }
  
  // Fallback to local JSON
  if (localJurisdictionConfigCache) {
    return localJurisdictionConfigCache;
  }
  
  try {
    const response = await fetch('config/jurisdiction-config.json');
    if (!response.ok) {
      throw new Error(`Failed to load jurisdiction config: ${response.status}`);
    }
    localJurisdictionConfigCache = await response.json();
    return localJurisdictionConfigCache;
  } catch (error) {
    console.error('Error loading jurisdiction config:', error);
    return { jurisdictions: {} };
  }
}

/**
 * Get jurisdiction metadata by full jurisdiction name
 * @param {string} jurisdictionName - The full jurisdiction name
 * @returns {Promise<Object|null>} The jurisdiction metadata or null
 */
export async function getJurisdictionMetadata(jurisdictionName) {
  if (USE_SUPABASE) {
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
  
  const config = await loadJurisdictionConfig();
  return config.jurisdictions?.[jurisdictionName] || null;
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
  if (USE_SUPABASE) {
    const icons = await getSquircleIcons();
    return {
      version: '2.0.0',
      icons: icons.reduce((acc, icon) => {
        acc[icon.item_name] = {
          icon_url: icon.icon_url,
          icon_svg: icon.icon_svg
        };
        return acc;
      }, {})
    };
  }
  
  // Fallback to local JSON
  if (localSquircleIconsConfigCache) {
    return localSquircleIconsConfigCache;
  }
  
  try {
    const response = await fetch('config/squircle-icons-config.json');
    if (!response.ok) {
      throw new Error(`Failed to load squircle icons config: ${response.status}`);
    }
    localSquircleIconsConfigCache = await response.json();
    return localSquircleIconsConfigCache;
  } catch (error) {
    console.error('Error loading squircle icons config:', error);
    return { icons: {} };
  }
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
  if (USE_SUPABASE) {
    let carousels;
    if (profileType === 'institution') {
      carousels = await getCarouselsByInstitution(profileName);
    } else {
      carousels = await getCarouselsByJurisdiction(profileName);
    }
    
    // Transform to legacy format
    return carousels.map(carousel => ({
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
        linked_document_id: carousel.slides?.[0]?.linked_document?.doc_id || null
      },
      slides: carousel.slides
    }));
  }
  
  // Fallback to local
  const allDocs = await getDocumentsList();
  const feedDocs = allDocs.filter(doc => {
    if (doc.item !== 'Feed') return false;
    if (profileType === 'institution') return doc.institution === profileName;
    if (profileType === 'jurisdiction') return doc.jurisdiction === profileName;
    return false;
  });
  
  // Resolve linked documents
  const resolved = await Promise.all(
    feedDocs.map(async (feedDoc) => {
      const linkedDoc = feedDoc.carousel?.linked_document_id
        ? await getDocumentById(feedDoc.carousel.linked_document_id)
        : null;
      return {
        ...feedDoc,
        linkedDocument: linkedDoc
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

/**
 * Clear all caches
 */
export function clearConfigCache() {
  localConfigCache = null;
  localInstitutionConfigCache = null;
  localJurisdictionConfigCache = null;
  localSquircleIconsConfigCache = null;
}

// =====================================================
// BACKWARD COMPATIBILITY RE-EXPORTS
// =====================================================
// Re-export functions from supabase-client.js for backward compatibility
// These are imported at the top of this file and re-exported here

export { getInstitutions, getJurisdictions, getDocuments };

// Expose utilities globally for development
if (typeof window !== 'undefined') {
  window.clearConfigCache = clearConfigCache;
  window.USE_SUPABASE = USE_SUPABASE;
}
