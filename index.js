/**
 * Legacy Index Script - DEPRECATED
 *
 * This file is kept for backward compatibility.
 * The new modular system uses js/index-main.js instead.
 *
 * This file now delegates to the new module system.
 */

// Import and re-export the new modular functionality
import { buildRegistries } from './js/registry.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  buildRegistries();
});
