// vite.config.ts - WORKING VERSION (object syntax)
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

/**
 * deferCssPlugin — B-light optimization (S1.5 perf-bottleneck-resolution).
 *
 * Production-only. Transforms render-blocking <link rel="stylesheet"> tags
 * into non-blocking ones using the media="print" + onload swap pattern.
 * Adds a <noscript> fallback so users without JS still receive styles.
 *
 * Effect: browser fetches CSS but does NOT block first paint on it.
 * Trade-off: brief FOUC (Flash of Unstyled Content) until CSS loads.
 *
 * Lighthouse baseline (2026-05-07): index-*.css render-blocks 1660ms.
 * This plugin eliminates that block, expected ~1450ms LCP improvement.
 */
function deferCssPlugin(): Plugin {
  return {
    name: 'defer-css',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet"([^>]*)>/g,
        (_match, attrs) => {
          return `<link rel="stylesheet"${attrs} media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet"${attrs}></noscript>`;
        }
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  // Read VITE_PROXY_TARGET from .env / .env.local / OS env so dev can be pointed
  // at a local backend (http://localhost:3000) without modifying this file.
  // Default: production Railway. See .env.local.example for usage.
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'https://finotaur-server-production.up.railway.app'
  const proxySecure = proxyTarget.startsWith('https://')

  return {
  plugins: [react(), deferCssPlugin()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
proxy: {
  '/api': {
    target: proxyTarget,
    changeOrigin: true,
    secure: proxySecure,
  }
},
    watch: {
      usePolling: false,
    },
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'dayjs',
      'date-fns',
      'lucide-react',
      'framer-motion',
      'recharts',
      'sonner',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@radix-ui/react-slot',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-switch',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'immer',
      'zustand',
    ],
    force: false,
    esbuildOptions: {
      target: 'esnext',
    },
  },

  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    
    rollupOptions: {
      output: {
        // ✅ OBJECT SYNTAX - Safe, no circular dependency issues
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          
          // Data layer
          'vendor-data': ['@tanstack/react-query', '@supabase/supabase-js'],
          
          // Animation
          'vendor-motion': ['framer-motion'],
          
          // UI Components (Radix)
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-tabs',
            '@radix-ui/react-slot',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
          ],
          
          // Icons
          'vendor-icons': ['lucide-react'],
          
          // Charts - ONLY recharts, NOT d3 (d3 will be bundled automatically)
          'vendor-charts': ['recharts'],
          
          // Utils
          'vendor-utils': [
            'dayjs',
            'date-fns', 
            'clsx', 
            'tailwind-merge', 
            'class-variance-authority',
            'immer',
            'zustand',
          ],
        },
      },
    },
  },

  css: {
    devSourcemap: false,
  },

  logLevel: 'info',
  cacheDir: 'node_modules/.vite',
  }
})