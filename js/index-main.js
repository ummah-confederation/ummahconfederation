/**
 * Index Page Main Entry Point
 * Initializes the registry on the index page
 */

import { buildRegistries } from './registry.js';
import { initUIMode } from './index-ui.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  buildRegistries();
  initUIMode();
});
