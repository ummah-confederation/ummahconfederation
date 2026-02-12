/**
 * Rollup Configuration
 * Bundles JavaScript modules for production with optimization
 */

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { visualizer } from 'rollup-plugin-visualizer';

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Common plugins
const commonPlugins = [
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
    input: 'js/feed.js',
    name: 'feed',
    statsFile: 'dist/stats/feed.html'
  },
  {
    input: 'js/marquee.js',
    name: 'marquee',
    statsFile: 'dist/stats/marquee.html'
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
