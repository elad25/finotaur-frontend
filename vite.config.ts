// vite.config.ts - WORKING VERSION (object syntax)
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // Read VITE_PROXY_TARGET from .env / .env.local / OS env so dev can be pointed
  // at a local backend (http://localhost:3000) without modifying this file.
  // Default: production Railway. See .env.local.example for usage.
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'https://finotaur-server-production.up.railway.app'
  const proxySecure = proxyTarget.startsWith('https://')

  return {
  plugins: [react()],

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
    // 2026-05-19: source maps enabled so Sentry can resolve minified frames
    // back to original source positions. The first reproducing TDZ error
    // ("Cannot access 'V' before initialization" on /app/journal/overview)
    // landed in Sentry with only a minified variable name, which made it
    // un-actionable. With sourcemaps, every future production exception in
    // Sentry resolves to a real file + line + column. Trade-off accepted:
    // build is slightly slower and dist/ ships .map files alongside .js
    // (public). No secrets in frontend bundle — secret handling is in
    // edge functions + finotaur-server, both of which have no client
    // exposure of source. If sourcemap surface becomes a concern later,
    // switch to 'hidden' + upload via sentry-cli in the CF Pages build step.
    sourcemap: true,
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