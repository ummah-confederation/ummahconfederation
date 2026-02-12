/**
 * Supabase Configuration
 * 
 * This file contains the Supabase configuration for the frontend.
 * 
 * For Vercel deployment, set these as environment variables:
 * - SUPABASE_URL (or VITE_SUPABASE_URL)
 * - SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)
 * 
 * These values are injected at build time by Rollup using @rollup/plugin-replace.
 */

// These values are replaced at build time by @rollup/plugin-replace
// The replace plugin will substitute these strings with actual values
const INJECTED_URL = process.env.SUPABASE_URL;
const INJECTED_KEY = process.env.SUPABASE_ANON_KEY;

/**
 * Get Supabase URL
 * Priority: injected value > window.SUPABASE_URL
 */
export function getSupabaseUrl() {
  // Check if the value was injected at build time (not empty and not the placeholder)
  if (INJECTED_URL && INJECTED_URL !== 'process.env.SUPABASE_URL' && INJECTED_URL !== '') {
    return INJECTED_URL;
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
  // Check if the value was injected at build time (not empty and not the placeholder)
  if (INJECTED_KEY && INJECTED_KEY !== 'process.env.SUPABASE_ANON_KEY' && INJECTED_KEY !== '') {
    return INJECTED_KEY;
  }
  // Fallback to window variable (for runtime configuration)
  if (typeof window !== 'undefined' && window.SUPABASE_ANON_KEY) {
    return window.SUPABASE_ANON_KEY;
  }
  console.warn('Supabase anon key not configured. Set SUPABASE_ANON_KEY environment variable.');
  return '';
}

// Export constants for direct use
export const SUPABASE_URL = getSupabaseUrl();
export const SUPABASE_ANON_KEY = getSupabaseAnonKey();
