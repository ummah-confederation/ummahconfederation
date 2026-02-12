/**
 * Migration Script: Local Data to Supabase
 * 
 * This script migrates all data from local JSON config files and HTML documents
 * to Supabase (PostgreSQL database + Storage).
 * 
 * Usage:
 * 1. Create a .env file with your Supabase credentials
 * 2. Run: node scripts/migrate-to-supabase.mjs
 * 
 * Prerequisites:
 * - Supabase project created
 * - Schema SQL run in Supabase
 * - Storage bucket 'ummah-images' created
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '..', '.env') });

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const rootDir = resolve(__dirname, '..');

// =====================================================
// CONFIGURATION - Update these with your Supabase credentials
// =====================================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

// Initialize Supabase client with service role key (for write access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Read and parse JSON file
 */
function readJsonFile(filePath) {
  const fullPath = path.join(rootDir, filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Read HTML file and extract paper-sheet content
 */
function extractDocumentContent(htmlPath) {
  const fullPath = path.join(rootDir, htmlPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`  ⚠️ File not found: ${htmlPath}`);
    return null;
  }
  
  const html = fs.readFileSync(fullPath, 'utf-8');
  
  // Extract content inside <div class="paper-sheet">...</div>
  const match = html.match(/<div class="paper-sheet"[^>]*>([\s\S]*?)<\/div>\s*<\/body>/i);
  if (match) {
    return match[1].trim();
  }
  
  // Alternative: try to find just the paper-sheet div
  const altMatch = html.match(/<div class="paper-sheet"[^>]*>([\s\S]*?)<\/div>/i);
  if (altMatch) {
    return altMatch[1].trim();
  }
  
  console.warn(`  ⚠️ Could not extract content from: ${htmlPath}`);
  return null;
}

/**
 * Parse institution/jurisdiction name into name and label
 */
function parseNameWithLabel(fullName) {
  const match = fullName.match(/^(.+?)\s*\[(.*?)\]\s*$/);
  if (match) {
    return {
      name: match[1].trim(),
      label: match[2].trim(),
      full_name: fullName
    };
  }
  return { name: fullName.trim(), label: '', full_name: fullName };
}

/**
 * Upload image to Supabase Storage
 */
async function uploadImage(localPath, storagePath) {
  const fullPath = path.join(rootDir, localPath);
  
  if (!fs.existsSync(fullPath)) {
    console.warn(`  ⚠️ Image not found: ${localPath}`);
    return null;
  }
  
  const fileBuffer = fs.readFileSync(fullPath);
  const fileName = path.basename(localPath);
  
  const { data, error } = await supabase.storage
    .from('ummah-images')
    .upload(storagePath, fileBuffer, {
      contentType: `image/${path.extname(fileName).slice(1)}`,
      upsert: true
    });
  
  if (error) {
    console.error(`  ❌ Error uploading ${localPath}:`, error.message);
    return null;
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('ummah-images')
    .getPublicUrl(storagePath);
  
  return urlData.publicUrl;
}

// =====================================================
// MIGRATION FUNCTIONS
// =====================================================

/**
 * Migrate institutions
 */
async function migrateInstitutions() {
  console.log('\n📋 Migrating institutions...');
  
  const config = readJsonFile('config/institution-config.json');
  const institutions = config.institutions;
  
  const institutionMap = {}; // Map full_name to database id
  
  for (const [fullName, data] of Object.entries(institutions)) {
    const parsed = parseNameWithLabel(fullName);
    
    // Upload avatar image
    let avatarUrl = null;
    if (data.avatar) {
      const avatarPath = data.avatar.replace('./', '');
      const storagePath = `avatars/institutions/${path.basename(avatarPath)}`;
      avatarUrl = await uploadImage(avatarPath, storagePath);
      if (avatarUrl) {
        console.log(`  ✓ Uploaded avatar: ${path.basename(avatarPath)}`);
      }
    }
    
    // Upload cover image
    let coverUrl = null;
    if (data.cover) {
      const coverPath = data.cover.replace('./', '');
      const storagePath = `covers/${path.basename(coverPath)}`;
      coverUrl = await uploadImage(coverPath, storagePath);
      if (coverUrl) {
        console.log(`  ✓ Uploaded cover: ${path.basename(coverPath)}`);
      }
    }
    
    // Insert into database
    const { data: result, error } = await supabase
      .from('institutions')
      .insert({
        name: parsed.name,
        label: parsed.label,
        full_name: parsed.full_name,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
        bio: data.bio || 'Peace be upon you.',
        contact_email: data.contact?.email,
        contact_phone: data.contact?.phone,
        contact_address: data.contact?.address,
        contact_website: data.contact?.website,
        feed_widget_enabled: data.feed_config?.widget?.enabled ?? true,
        feed_widget_type: data.feed_config?.widget?.type || 'prayer_time'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error(`  ❌ Error inserting institution ${fullName}:`, error.message);
      continue;
    }
    
    institutionMap[fullName] = result.id;
    console.log(`  ✓ Inserted: ${parsed.name}`);
  }
  
  return institutionMap;
}

/**
 * Migrate jurisdictions
 */
async function migrateJurisdictions() {
  console.log('\n📋 Migrating jurisdictions...');
  
  const config = readJsonFile('config/jurisdiction-config.json');
  const jurisdictions = config.jurisdictions;
  
  const jurisdictionMap = {}; // Map full_name to database id
  
  for (const [fullName, data] of Object.entries(jurisdictions)) {
    const parsed = parseNameWithLabel(fullName);
    
    // Upload avatar image
    let avatarUrl = null;
    if (data.avatar) {
      const avatarPath = data.avatar.replace('./', '');
      const storagePath = `avatars/jurisdictions/${path.basename(avatarPath)}`;
      avatarUrl = await uploadImage(avatarPath, storagePath);
      if (avatarUrl) {
        console.log(`  ✓ Uploaded avatar: ${path.basename(avatarPath)}`);
      }
    }
    
    // Upload cover image
    let coverUrl = null;
    if (data.cover) {
      const coverPath = data.cover.replace('./', '');
      const storagePath = `covers/${path.basename(coverPath)}`;
      coverUrl = await uploadImage(coverPath, storagePath);
      if (coverUrl) {
        console.log(`  ✓ Uploaded cover: ${path.basename(coverPath)}`);
      }
    }
    
    // Insert into database
    const { data: result, error } = await supabase
      .from('jurisdictions')
      .insert({
        name: parsed.name,
        label: parsed.label,
        full_name: parsed.full_name,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
        bio: data.bio || 'Peace be upon you.',
        feed_widget_enabled: data.feed_config?.widget?.enabled ?? true,
        feed_widget_type: data.feed_config?.widget?.type || 'prayer_time'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error(`  ❌ Error inserting jurisdiction ${fullName}:`, error.message);
      continue;
    }
    
    jurisdictionMap[fullName] = result.id;
    console.log(`  ✓ Inserted: ${parsed.name}`);
  }
  
  return jurisdictionMap;
}

/**
 * Migrate documents
 */
async function migrateDocuments(institutionMap, jurisdictionMap) {
  console.log('\n📋 Migrating documents...');
  
  const config = readJsonFile('config/documents-config.json');
  const documents = config.documents;
  
  const documentMap = {}; // Map doc_id to database id
  
  for (const doc of documents) {
    // Skip Feed items - they will be migrated as carousels
    if (doc.item === 'Feed') continue;
    
    // Extract HTML content
    let content = null;
    if (doc.filename) {
      content = extractDocumentContent(doc.filename);
      if (content) {
        console.log(`  ✓ Extracted content from: ${doc.filename}`);
      }
    }
    
    // Parse date
    let docDate = null;
    if (doc.date) {
      docDate = new Date(doc.date);
    }
    
    // Insert into database
    const { data: result, error } = await supabase
      .from('documents')
      .insert({
        doc_id: doc.id,
        title: doc.title,
        item_type: doc.item,
        institution_id: institutionMap[doc.institution] || null,
        jurisdiction_id: jurisdictionMap[doc.jurisdiction] || null,
        version: doc.version || 1,
        doc_date: docDate,
        visible: doc.visible !== false,
        content: content
      })
      .select('id')
      .single();
    
    if (error) {
      console.error(`  ❌ Error inserting document ${doc.id}:`, error.message);
      continue;
    }
    
    documentMap[doc.id] = result.id;
    console.log(`  ✓ Inserted: ${doc.title}`);
  }
  
  return documentMap;
}

/**
 * Migrate carousel feeds
 */
async function migrateCarousels(institutionMap, jurisdictionMap, documentMap) {
  console.log('\n📋 Migrating carousel feeds...');
  
  const config = readJsonFile('config/documents-config.json');
  const feedDocs = config.documents.filter(doc => doc.item === 'Feed');
  
  for (const feed of feedDocs) {
    // Create carousel
    const { data: carousel, error: carouselError } = await supabase
      .from('carousels')
      .insert({
        title: feed.title,
        institution_id: institutionMap[feed.institution] || null,
        jurisdiction_id: jurisdictionMap[feed.jurisdiction] || null,
        visible: feed.visible !== false,
        display_order: 0
      })
      .select('id')
      .single();
    
    if (carouselError) {
      console.error(`  ❌ Error creating carousel ${feed.id}:`, carouselError.message);
      continue;
    }
    
    console.log(`  ✓ Created carousel: ${feed.title}`);
    
    // Upload carousel image and create slide
    if (feed.carousel?.image) {
      const imagePath = feed.carousel.image.replace('./', '');
      const storagePath = `carousels/${path.basename(imagePath)}`;
      const imageUrl = await uploadImage(imagePath, storagePath);
      
      if (imageUrl) {
        console.log(`  ✓ Uploaded carousel image: ${path.basename(imagePath)}`);
        
        // Find linked document
        const linkedDocId = feed.carousel.linked_document_id;
        const linkedDocDbId = linkedDocId ? documentMap[linkedDocId] : null;
        
        const { error: slideError } = await supabase
          .from('carousel_slides')
          .insert({
            carousel_id: carousel.id,
            image_url: imageUrl,
            linked_document_id: linkedDocDbId,
            display_order: 0
          });
        
        if (slideError) {
          console.error(`  ❌ Error creating slide:`, slideError.message);
        } else {
          console.log(`  ✓ Created slide for carousel`);
        }
      }
    }
  }
}

/**
 * Migrate remaining images (admin-seal, flags, etc.)
 */
async function migrateMiscImages() {
  console.log('\n📋 Migrating miscellaneous images...');
  
  const miscImages = [
    { local: 'images/admin-seal.webp', storage: 'misc/admin-seal.webp' },
    { local: 'images/army-flag.webp', storage: 'misc/army-flag.webp' },
    { local: 'images/diplomatic-flag-back.webp', storage: 'misc/diplomatic-flag-back.webp' },
    { local: 'images/diplomatic-flag-front.webp', storage: 'misc/diplomatic-flag-front.webp' },
    { local: 'images/national-flag.webp', storage: 'misc/national-flag.webp' },
    { local: 'images/protected-sign.webp', storage: 'misc/protected-sign.webp' },
    { local: 'images/favicon.png', storage: 'misc/favicon.png' }
  ];
  
  for (const img of miscImages) {
    const url = await uploadImage(img.local, img.storage);
    if (url) {
      console.log(`  ✓ Uploaded: ${img.local}`);
    }
  }
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main() {
  console.log('🚀 Starting migration to Supabase...\n');
  console.log('⚠️  Make sure you have:');
  console.log('   1. Created a Supabase project');
  console.log('   2. Run the schema.sql in SQL Editor');
  console.log('   3. Created the "ummah-images" storage bucket');
  console.log('   4. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables\n');
  
  try {
    // Run migrations in order
    const institutionMap = await migrateInstitutions();
    const jurisdictionMap = await migrateJurisdictions();
    const documentMap = await migrateDocuments(institutionMap, jurisdictionMap);
    await migrateCarousels(institutionMap, jurisdictionMap, documentMap);
    await migrateMiscImages();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Institutions: ${Object.keys(institutionMap).length}`);
    console.log(`   Jurisdictions: ${Object.keys(jurisdictionMap).length}`);
    console.log(`   Documents: ${Object.keys(documentMap).length}`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
