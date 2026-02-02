/**
 * Library Page Main Entry Point
 * Initializes the library page
 * Optimized to preload data and reduce network requests
 */

import { initializeLibrary } from './library-ui.js';
import { preloadAllConfigs } from './config.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Preload all configuration data before initializing UI
  // This ensures all data is cached for subsequent operations
  await preloadAllConfigs();
  
  // Now initialize the library with cached data
  initializeLibrary();
});
