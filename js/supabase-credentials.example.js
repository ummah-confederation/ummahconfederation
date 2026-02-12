/**
 * Supabase Credentials Configuration (TEMPLATE)
 * 
 * 1. Copy this file to: js/supabase-credentials.js
 * 2. Replace the placeholder values with your actual Supabase credentials
 * 
 * You can find these values in your Supabase dashboard:
 * - Go to Settings > API
 * - Copy the "Project URL" for SUPABASE_URL
 * - Copy the "anon public" key for SUPABASE_ANON_KEY
 * 
 * After editing, rebuild your project: npm run build
 */

// Replace these with your actual Supabase credentials
window.SUPABASE_URL = 'https://your-project-id.supabase.co';
window.SUPABASE_ANON_KEY = 'your-anon-key-here';

// Set to false to fall back to local JSON files (for testing)
window.USE_SUPABASE = true;
