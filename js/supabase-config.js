/**
 * Supabase Configuration
 * 
 * This file contains the Supabase configuration for the frontend.
 * 
 * For Vercel deployment, set these as environment variables:
 * - SUPABASE_URL (or VITE_SUPABASE_URL)
 * - SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)
 * 
 * These values are injected at build time by Rollup.
 */

// These values are replaced at build time by @rollup/plugin-replace
// Default values are empty strings - they will be replaced during build
const SUPABASE_URL = 'process.env.SUPABASE_URL';
const SUPABASE_ANON_KEY = 'process.env.SUPABASE_ANON_KEY';

/**
 * Get Supabase URL
 * Priority: injected value > window.SUPABASE_URL
 */
export function getSupabaseUrl() {
  // Check if the value was injected at build time
  if (SUPABASE_URL && SUPABASE_URL !== 'process.env.SUPABASE_URL') {
    return SUPABASE_URL;
  }
  // Fallback to window variable (for runtime configuration)
  if (typeof window !== 'undefined' && window.SUPABASE_URL) {
    return window.SUPABASE_URL;
  }
  console.warn('Supabase URL not configured. Set SUPABASE_URL environment variable.');
  return '';
}

/**
 * Get Supabase Anonymous Key
 * Priority: injected value > window.SUPABASE_ANON_KEY
 */
export function getSupabaseAnonKey() {
  // Check if the value was injected at build time
  if (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'process.env.SUPABASE_ANON_KEY') {
    return SUPABASE_ANON_KEY;
  }
  // Fallback to window variable (for runtime configuration)
  if (typeof window !== 'undefined' && window.SUPABASE_ANON_KEY) {
    return window.SUPABASE_ANON_KEY;
  }
  console.warn('Supabase anon key not configured. Set SUPABASE_ANON_KEY environment variable.');
  return '';
}

// Export constants for direct use
export { SUPABASE_URL, SUPABASE_ANON_KEY };
