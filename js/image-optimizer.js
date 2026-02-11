/**
 * Image Optimizer Utility
 * Provides helper functions for creating optimized image elements
 * with WebP support and fallback for older browsers
 */

/**
 * Check if WebP is supported in the current browser
 * @returns {boolean} True if WebP is supported
 */
export function isWebPSupported() {
  // Check if we've already tested
  if (typeof window !== 'undefined' && window._webpSupported !== undefined) {
    return window._webpSupported;
  }

  // Test WebP support
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) {
    return false;
  }

  const result = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;

  // Cache the result
  if (typeof window !== 'undefined') {
    window._webpSupported = result;
  }

  return result;
}

/**
 * Get WebP version of an image path
 * @param {string} path - Original image path
 * @returns {string} WebP image path
 */
export function getWebPPath(path) {
  const ext = path.match(/\.(png|jpg|jpeg)$/i);
  if (!ext) {
    return path; // Already WebP or unknown format
  }
  return path.replace(/\.(png|jpg|jpeg)$/i, '.webp');
}

/**
 * Get fallback image path (original format)
 * @param {string} path - Image path
 * @returns {string} Fallback image path
 */
export function getFallbackPath(path) {
  // If it's already a non-WebP format, return as-is
  if (!path.endsWith('.webp')) {
    return path;
  }

  // Try to find the original format
  // This is a simple heuristic - in production, you might want to
  // maintain a mapping of original formats
  const base = path.replace(/\.webp$/i, '');

  // Check for common original formats
  const possibleFormats = ['.png', '.jpg', '.jpeg'];
  for (const ext of possibleFormats) {
    if (typeof document !== 'undefined') {
      // In browser, we can't check file existence
      // Return the most likely format
      return base + ext;
    }
  }

  return base + '.png'; // Default fallback
}

/**
 * Convert image attributes object to HTML string
 * @param {Object} attributes - Image attributes
 * @returns {string} HTML attribute string
 */
function attributesToString(attributes) {
  return Object.entries(attributes)
    .map(([key, value]) => {
      if (value === true) {
        return key;
      }
      if (value === false || value === null || value === undefined) {
        return '';
      }
      return `${key}="${value}"`;
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * Create a picture element with WebP source and fallback
 * @param {string} src - Image source path
 * @param {string} alt - Alt text
 * @param {Object} options - Additional image attributes
 * @returns {string} HTML string for picture element
 */
export function createPictureElement(src, alt, options = {}) {
  const webpSrc = getWebPPath(src);
  const fallbackSrc = getFallbackPath(src);

  // Extract attributes that should go on the img tag
  const imgAttributes = {
    src: fallbackSrc,
    alt: alt || '',
    ...options
  };

  // Remove attributes that should only be on source or picture
  delete imgAttributes.srcset;
  delete imgAttributes.sizes;

  const imgAttrString = attributesToString(imgAttributes);

  return `
    <picture>
      <source srcset="${webpSrc}" type="image/webp" />
      <img ${imgAttrString} />
    </picture>
  `.trim();
}

/**
 * Create a responsive picture element with multiple sources
 * @param {string} src - Base image source path
 * @param {string} alt - Alt text
 * @param {Object} options - Additional image attributes
 * @param {Array<Object>} sizes - Array of size descriptors
 * @returns {string} HTML string for responsive picture element
 */
export function createResponsivePictureElement(src, alt, options = {}, sizes = []) {
  const webpSrc = getWebPPath(src);
  const fallbackSrc = getFallbackPath(src);

  // Default sizes if not provided
  const defaultSizes = [
    { width: 400, descriptor: '400w' },
    { width: 800, descriptor: '800w' },
    { width: 1200, descriptor: '1200w' }
  ];

  const sizesToUse = sizes.length > 0 ? sizes : defaultSizes;

  // Generate srcset for WebP
  const webpSrcset = sizesToUse.map(size => {
    const sizedSrc = src.replace(/(\.[^.]+)$/, `-${size.width}$1`);
    const webpSizedSrc = getWebPPath(sizedSrc);
    return `${webpSizedSrc} ${size.descriptor}`;
  }).join(', ');

  // Generate srcset for fallback
  const fallbackSrcset = sizesToUse.map(size => {
    const sizedSrc = src.replace(/(\.[^.]+)$/, `-${size.width}$1`);
    return `${sizedSrc} ${size.descriptor}`;
  }).join(', ');

  // Generate sizes attribute
  const sizesAttr = options.sizes || '(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px';

  // Extract attributes that should go on the img tag
  const imgAttributes = {
    src: fallbackSrc,
    alt: alt || '',
    srcset: fallbackSrcset,
    sizes: sizesAttr,
    ...options
  };

  // Remove sizes from options as it's already handled
  delete imgAttributes.sizes;

  const imgAttrString = attributesToString(imgAttributes);

  return `
    <picture>
      <source srcset="${webpSrcset}" type="image/webp" sizes="${sizesAttr}" />
      <img ${imgAttrString} />
    </picture>
  `.trim();
}

/**
 * Create an img element with automatic WebP detection
 * Falls back to original format if WebP is not supported
 * @param {string} src - Image source path
 * @param {string} alt - Alt text
 * @param {Object} options - Additional image attributes
 * @returns {string} HTML string for img element
 */
export function createAutoImageElement(src, alt, options = {}) {
  const webpSrc = getWebPPath(src);
  const fallbackSrc = getFallbackPath(src);

  // Use WebP if supported, otherwise use fallback
  const finalSrc = isWebPSupported() ? webpSrc : fallbackSrc;

  const imgAttributes = {
    src: finalSrc,
    alt: alt || '',
    ...options
  };

  const imgAttrString = attributesToString(imgAttributes);

  return `<img ${imgAttrString} />`;
}

/**
 * Create a lazy-loaded image element with WebP support
 * @param {string} src - Image source path
 * @param {string} alt - Alt text
 * @param {Object} options - Additional image attributes
 * @returns {string} HTML string for lazy-loaded img element
 */
export function createLazyImageElement(src, alt, options = {}) {
  const webpSrc = getWebPPath(src);
  const fallbackSrc = getFallbackPath(src);

  const imgAttributes = {
    src: fallbackSrc,
    'data-src': webpSrc,
    alt: alt || '',
    loading: 'lazy',
    decoding: 'async',
    ...options
  };

  const imgAttrString = attributesToString(imgAttributes);

  return `
    <picture>
      <source data-srcset="${webpSrc}" type="image/webp" />
      <img ${imgAttrString} />
    </picture>
  `.trim();
}

/**
 * Initialize lazy loading for images with data-src attributes
 * Uses Intersection Observer API for performance
 */
export function initLazyLoading() {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    // Fallback: load all images immediately
    document.querySelectorAll('img[data-src]').forEach(img => {
      img.src = img.dataset.src;
    });
    return;
  }

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;

        // Load the image
        if (img.dataset.src) {
          img.src = img.dataset.src;
          delete img.dataset.src;
        }

        // Stop observing this image
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px', // Start loading 50px before image enters viewport
    threshold: 0.01
  });

  // Observe all images with data-src
  document.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });
}

/**
 * Preload critical images
 * @param {Array<string>} imageUrls - Array of image URLs to preload
 */
export function preloadImages(imageUrls) {
  if (typeof document === 'undefined') {
    return;
  }

  imageUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;

    // Add type hint for WebP
    if (url.endsWith('.webp')) {
      link.type = 'image/webp';
    }

    document.head.appendChild(link);
  });
}

// Export all functions
export default {
  isWebPSupported,
  getWebPPath,
  getFallbackPath,
  createPictureElement,
  createResponsivePictureElement,
  createAutoImageElement,
  createLazyImageElement,
  initLazyLoading,
  preloadImages
};
