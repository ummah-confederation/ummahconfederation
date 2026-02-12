/**
 * Supabase Client Module
 * 
 * Provides a configured Supabase client and helper functions
 * for fetching data from the database.
 * 
 * Usage:
 *   import { supabase, getInstitutions, getDocuments } from './supabase-client.js';
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================
// INSTITUTION HELPERS
// =====================================================

/**
 * Get all institutions
 * @returns {Promise<Array>} Array of institution objects
 */
export async function getInstitutions() {
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching institutions:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get institution by full name
 * @param {string} fullName - Full institution name (e.g., "Ummah Cabinet [Non-Profit • Private]")
 * @returns {Promise<Object|null>} Institution object or null
 */
export async function getInstitutionByFullName(fullName) {
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .eq('full_name', fullName)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching institution:', error);
    throw error;
  }
  
  return data;
}

/**
 * Get institution by ID
 * @param {number} id - Institution ID
 * @returns {Promise<Object|null>} Institution object or null
 */
export async function getInstitutionById(id) {
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching institution:', error);
    throw error;
  }
  
  return data;
}

// =====================================================
// JURISDICTION HELPERS
// =====================================================

/**
 * Get all jurisdictions
 * @returns {Promise<Array>} Array of jurisdiction objects
 */
export async function getJurisdictions() {
  const { data, error } = await supabase
    .from('jurisdictions')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching jurisdictions:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get jurisdiction by full name
 * @param {string} fullName - Full jurisdiction name (e.g., "Borneo [Region]")
 * @returns {Promise<Object|null>} Jurisdiction object or null
 */
export async function getJurisdictionByFullName(fullName) {
  const { data, error } = await supabase
    .from('jurisdictions')
    .select('*')
    .eq('full_name', fullName)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching jurisdiction:', error);
    throw error;
  }
  
  return data;
}

/**
 * Get jurisdiction by ID
 * @param {number} id - Jurisdiction ID
 * @returns {Promise<Object|null>} Jurisdiction object or null
 */
export async function getJurisdictionById(id) {
  const { data, error } = await supabase
    .from('jurisdictions')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching jurisdiction:', error);
    throw error;
  }
  
  return data;
}

// =====================================================
// DOCUMENT HELPERS
// =====================================================

/**
 * Get all visible documents
 * @returns {Promise<Array>} Array of document objects
 */
export async function getDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      institution:institutions(id, name, full_name, label),
      jurisdiction:jurisdictions(id, name, full_name, label)
    `)
    .eq('visible', true)
    .order('doc_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get document by doc_id
 * @param {string} docId - Document ID (e.g., "book0", "policy1")
 * @returns {Promise<Object|null>} Document object or null
 */
export async function getDocumentByDocId(docId) {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      institution:institutions(id, name, full_name, label),
      jurisdiction:jurisdictions(id, name, full_name, label)
    `)
    .eq('doc_id', docId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching document:', error);
    throw error;
  }
  
  return data;
}

/**
 * Get documents by institution
 * @param {string} institutionName - Full institution name
 * @returns {Promise<Array>} Array of document objects
 */
export async function getDocumentsByInstitution(institutionName) {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      institution:institutions(id, name, full_name, label),
      jurisdiction:jurisdictions(id, name, full_name, label)
    `)
    .eq('visible', true)
    .eq('institutions.full_name', institutionName)
    .order('doc_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching documents by institution:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get documents by jurisdiction
 * @param {string} jurisdictionName - Full jurisdiction name
 * @returns {Promise<Array>} Array of document objects
 */
export async function getDocumentsByJurisdiction(jurisdictionName) {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      institution:institutions(id, name, full_name, label),
      jurisdiction:jurisdictions(id, name, full_name, label)
    `)
    .eq('visible', true)
    .eq('jurisdictions.full_name', jurisdictionName)
    .order('doc_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching documents by jurisdiction:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get documents by item type
 * @param {string} itemType - Item type (e.g., "Book", "Policy")
 * @returns {Promise<Array>} Array of document objects
 */
export async function getDocumentsByType(itemType) {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      institution:institutions(id, name, full_name, label),
      jurisdiction:jurisdictions(id, name, full_name, label)
    `)
    .eq('visible', true)
    .eq('item_type', itemType)
    .order('doc_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching documents by type:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get unique document item types
 * @returns {Promise<Array>} Array of unique item type strings
 */
export async function getDocumentTypes() {
  const { data, error } = await supabase
    .from('documents')
    .select('item_type')
    .eq('visible', true);
  
  if (error) {
    console.error('Error fetching document types:', error);
    throw error;
  }
  
  const types = [...new Set(data.map(d => d.item_type))];
  return types.sort();
}

// =====================================================
// CAROUSEL HELPERS
// =====================================================

/**
 * Get all carousels with their slides
 * @returns {Promise<Array>} Array of carousel objects with slides
 */
export async function getCarousels() {
  const { data, error } = await supabase
    .from('carousels')
    .select(`
      *,
      institution:institutions(id, name, full_name, label),
      jurisdiction:jurisdictions(id, name, full_name, label),
      slides:carousel_slides(
        id,
        image_url,
        display_order,
        linked_document:documents(id, doc_id, title)
      )
    `)
    .eq('visible', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching carousels:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get carousels for an institution
 * @param {string} institutionName - Full institution name
 * @returns {Promise<Array>} Array of carousel objects with slides
 */
export async function getCarouselsByInstitution(institutionName) {
  // First get the institution ID
  const institution = await getInstitutionByFullName(institutionName);
  if (!institution) return [];
  
  const { data, error } = await supabase
    .from('carousels')
    .select(`
      *,
      institution:institutions(id, name, full_name, label),
      jurisdiction:jurisdictions(id, name, full_name, label),
      slides:carousel_slides(
        id,
        image_url,
        display_order,
        linked_document:documents(id, doc_id, title)
      )
    `)
    .eq('visible', true)
    .eq('institution_id', institution.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching carousels by institution:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get carousels for a jurisdiction
 * @param {string} jurisdictionName - Full jurisdiction name
 * @returns {Promise<Array>} Array of carousel objects with slides
 */
export async function getCarouselsByJurisdiction(jurisdictionName) {
  const jurisdiction = await getJurisdictionByFullName(jurisdictionName);
  if (!jurisdiction) return [];
  
  const { data, error } = await supabase
    .from('carousels')
    .select(`
      *,
      institution:institutions(id, name, full_name, label),
      jurisdiction:jurisdictions(id, name, full_name, label),
      slides:carousel_slides(
        id,
        image_url,
        display_order,
        linked_document:documents(id, doc_id, title)
      )
    `)
    .eq('visible', true)
    .eq('jurisdiction_id', jurisdiction.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching carousels by jurisdiction:', error);
    throw error;
  }
  
  return data || [];
}

// =====================================================
// SQUIRCLE ICON HELPERS
// =====================================================

/**
 * Get all squircle icons
 * @returns {Promise<Array>} Array of icon objects
 */
export async function getSquircleIcons() {
  const { data, error } = await supabase
    .from('squircle_icons')
    .select('*');
  
  if (error) {
    console.error('Error fetching squircle icons:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get squircle icon by item name
 * @param {string} itemName - Item name (e.g., "Book", "Policy")
 * @returns {Promise<Object|null>} Icon object or null
 */
export async function getSquircleIconByItemName(itemName) {
  const { data, error } = await supabase
    .from('squircle_icons')
    .select('*')
    .eq('item_name', itemName)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching squircle icon:', error);
    throw error;
  }
  
  return data;
}

// =====================================================
// CONFIG COMPATIBILITY HELPERS
// =====================================================
// These functions transform Supabase data to match the old JSON config structure
// for backward compatibility with existing code

/**
 * Get institution config in legacy format
 * @returns {Promise<Object>} Config object matching institution-config.json structure
 */
export async function getInstitutionConfigLegacy() {
  const institutions = await getInstitutions();
  
  return {
    version: '2.0.0',
    lastUpdated: new Date().toISOString(),
    institutions: institutions.reduce((acc, inst) => {
      acc[inst.full_name] = {
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
      return acc;
    }, {})
  };
}

/**
 * Get jurisdiction config in legacy format
 * @returns {Promise<Object>} Config object matching jurisdiction-config.json structure
 */
export async function getJurisdictionConfigLegacy() {
  const jurisdictions = await getJurisdictions();
  
  return {
    version: '2.0.0',
    lastUpdated: new Date().toISOString(),
    jurisdictions: jurisdictions.reduce((acc, jur) => {
      acc[jur.full_name] = {
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
      return acc;
    }, {})
  };
}

/**
 * Get documents config in legacy format
 * @returns {Promise<Object>} Config object matching documents-config.json structure
 */
export async function getDocumentsConfigLegacy() {
  const documents = await getDocuments();
  const carousels = await getCarousels();
  
  // Transform documents
  const docList = documents.map(doc => ({
    id: doc.doc_id,
    filename: null, // Content is now in database
    title: doc.title,
    item: doc.item_type,
    institution: doc.institution?.full_name || '',
    jurisdiction: doc.jurisdiction?.full_name || '',
    version: doc.version,
    date: doc.doc_date,
    dateFormatted: formatDate(doc.doc_date),
    visible: doc.visible
  }));
  
  // Transform carousels as Feed items
  const feedList = carousels.map(carousel => ({
    id: `carousel-${carousel.id}`,
    filename: null,
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
    }
  }));
  
  return {
    version: '2.0.0',
    lastUpdated: new Date().toISOString(),
    documents: [...docList, ...feedList]
  };
}

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
