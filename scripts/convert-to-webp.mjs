/**
 * Image to WebP Conversion Script
 * Converts PNG, JPG, and JPEG images to WebP format
 * Requires: npm install sharp
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Configuration
const IMAGES_DIR = './images';
const QUALITY = 80; // WebP quality (0-100)
const LOSSLESS = false; // Use lossy compression for better size reduction

// Supported input formats
const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg'];

// Files to skip (already WebP or should not be converted)
const SKIP_FILES = [
  'favicon.png', // Keep as PNG for favicon compatibility
];

/**
 * Check if a file should be skipped
 * @param {string} filename - File name
 * @returns {boolean} True if file should be skipped
 */
function shouldSkipFile(filename) {
  return SKIP_FILES.includes(filename);
}

/**
 * Get all image files that need conversion
 * @param {string} dir - Directory to scan
 * @returns {Array<string>} Array of file paths
 */
function getImageFiles(dir) {
  const files = [];

  function scanDirectory(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();

        // Check if file is a supported image format and not already WebP
        if (SUPPORTED_FORMATS.includes(ext) && !shouldSkipFile(entry.name)) {
          files.push(fullPath);
        }
      }
    }
  }

  scanDirectory(dir);
  return files;
}

/**
 * Convert an image to WebP
 * @param {string} inputPath - Input file path
 * @returns {Promise<void>}
 */
async function convertToWebP(inputPath) {
  const parsedPath = path.parse(inputPath);
  const outputPath = path.join(parsedPath.dir, `${parsedPath.name}.webp`);

  // Check if WebP version already exists
  if (fs.existsSync(outputPath)) {
    console.log(`⏭️  Skipping (WebP exists): ${inputPath}`);
    return;
  }

  try {
    // Get original file size
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;

    // Convert to WebP
    await sharp(inputPath)
      .webp({
        quality: QUALITY,
        lossless: LOSSLESS,
        nearLossless: !LOSSLESS,
        smartSubsample: true,
        effort: 4 // Compression effort (0-6, higher = better compression but slower)
      })
      .toFile(outputPath);

    // Get new file size
    const newStats = fs.statSync(outputPath);
    const newSize = newStats.size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);

    console.log(`✅ Converted: ${inputPath} → ${outputPath} (${savings}% smaller)`);
  } catch (error) {
    console.error(`❌ Error converting ${inputPath}:`, error.message);
  }
}

/**
 * Main conversion function
 */
async function main() {
  console.log('🖼️  Starting WebP conversion...\n');

  // Check if images directory exists
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Images directory not found: ${IMAGES_DIR}`);
    process.exit(1);
  }

  // Get all image files
  const imageFiles = getImageFiles(IMAGES_DIR);

  if (imageFiles.length === 0) {
    console.log('✨ No images to convert. All images are already in WebP format or should be skipped.');
    return;
  }

  console.log(`📁 Found ${imageFiles.length} image(s) to convert\n`);

  // Convert all images
  let converted = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of imageFiles) {
    try {
      const parsedPath = path.parse(file);
      const webpPath = path.join(parsedPath.dir, `${parsedPath.name}.webp`);

      if (fs.existsSync(webpPath)) {
        skipped++;
      } else {
        await convertToWebP(file);
        converted++;
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Conversion Summary:');
  console.log('='.repeat(50));
  console.log(`✅ Converted: ${converted}`);
  console.log(`⏭️  Skipped:  ${skipped}`);
  console.log(`❌ Errors:   ${errors}`);
  console.log('='.repeat(50));

  if (errors > 0) {
    process.exit(1);
  }
}

// Run the conversion
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
