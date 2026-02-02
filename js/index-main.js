/**
 * Index Page Main Entry Point
 * Initializes the registry on the index page
 * Optimized to preload data and reduce network requests
 */

import { buildRegistries, preloadRegistryData } from './registry.js';
import { initUIMode } from './index-ui.js';
import { preloadAllConfigs } from './config.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Preload all configuration data in parallel before building UI
  // This batches all JSON fetches into a single request wave
  await Promise.all([
    preloadRegistryData(),
    preloadAllConfigs()
  ]);
  
  // Now build the UI with cached data
  buildRegistries();
  initUIMode();
});
