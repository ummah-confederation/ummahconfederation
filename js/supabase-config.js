/**
 * Supabase Configuration
 * 
 * This file contains the Supabase configuration for the frontend.
 * The actual values should be set in a config.js file that is loaded
 * before this module, or set as window variables.
 * 
 * For Vercel deployment, set these as environment variables:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 */

// These values will be replaced during build/deployment
// DO NOT commit actual credentials to Git

// Default values (placeholder - replace with actual values)
const DEFAULT_SUPABASE_URL = 'https://your-project.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'your-anon-key';

/**
 * Get Supabase URL
 * Priority: window.SUPABASE_URL > import.meta.env > default
 */
export function getSupabaseUrl() {
  if (typeof window !== 'undefined' && window.SUPABASE_URL) {
    return window.SUPABASE_URL;
  }
  // For Vite/Vercel environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
    return import.meta.env.VITE_SUPABASE_URL;
  }
  return DEFAULT_SUPABASE_URL;
}

/**
 * Get Supabase Anonymous Key
 * Priority: window.SUPABASE_ANON_KEY > import.meta.env > default
 */
export function getSupabaseAnonKey() {
  if (typeof window !== 'undefined' && window.SUPABASE_ANON_KEY) {
    return window.SUPABASE_ANON_KEY;
  }
  // For Vite/Vercel environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) {
    return import.meta.env.VITE_SUPABASE_ANON_KEY;
  }
  return DEFAULT_SUPABASE_ANON_KEY;
}

// Export constants for direct use
export const SUPABASE_URL = getSupabaseUrl();
export const SUPABASE_ANON_KEY = getSupabaseAnonKey();
