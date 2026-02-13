/**
 * Rollup Configuration
 * Bundles JavaScript modules for production with optimization
 */

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { visualizer } from 'rollup-plugin-visualizer';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Supabase configuration from environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Common plugins
const commonPlugins = [
  replace({
    preventAssignment: true,
    'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey)
  }),
  resolve({
    browser: true,
    preferBuiltins: false
  }),
  commonjs(),
  terser({
    compress: {
      drop_console: !isDevelopment,
      drop_debugger: !isDevelopment,
      pure_funcs: isDevelopment ? [] : ['console.log', 'console.info', 'console.debug']
    },
    mangle: {
      reserved: ['Marquee', 'ResponseCache', 'IndexedDBCache']
    },
    format: {
      comments: false
    }
  })
];

// Entry points for each page
const entryPoints = [
  {
    input: 'js/index-main.js',
    name: 'index-main',
    statsFile: 'dist/stats/index.html'
  },
  {
    input: 'js/library-main.js',
    name: 'library-main',
    statsFile: 'dist/stats/library.html'
  },
  {
    input: 'js/marquee.js',
    name: 'marquee',
    statsFile: 'dist/stats/marquee.html'
  },
  {
    input: 'js/document-viewer.js',
    name: 'document-viewer',
    statsFile: 'dist/stats/document-viewer.html'
  }
];

// Generate configurations for each entry point
export default entryPoints.map(entry => ({
  input: entry.input,
  output: {
    dir: 'dist/js',
    format: 'es',
    entryFileNames: `${entry.name}.js`,
    chunkFileNames: '[name]-[hash].js',
    sourcemap: isDevelopment ? 'inline' : false
  },
  plugins: [
    ...commonPlugins,
    visualizer({
      filename: entry.statsFile,
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap'
    })
  ],
  // External dependencies (not bundled)
  external: [],
  // Preserve module structure for better tree-shaking
  preserveEntrySignatures: 'strict',
  // Enable treeshaking
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false
  }
}));
