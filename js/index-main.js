/**
 * Index Page Main Entry Point
 * Initializes the UI on the index page
 */

import { initUIMode } from './index-ui.js';

// Dark Mode Toggle Functionality
const DARK_MODE_KEY = 'darkMode';

function initDarkMode() {
  const adminSeal = document.querySelector('.admin-seal');
  if (!adminSeal) return;

  // Check for saved preference or system preference
  const savedMode = localStorage.getItem(DARK_MODE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Apply dark mode if saved preference is 'true' or if no preference and system prefers dark
  if (savedMode === 'true' || (!savedMode && prefersDark)) {
    document.documentElement.classList.add('dark');
  }

  // Toggle dark mode on click
  adminSeal.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem(DARK_MODE_KEY, isDark);
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initUIMode();
});
