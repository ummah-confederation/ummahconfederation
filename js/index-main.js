/**
 * Index Page Main Entry Point
 * Initializes the registry on the index page
 */

import { buildRegistries } from './registry.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  buildRegistries();
});
