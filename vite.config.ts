// vite.config.ts - WORKING VERSION (object syntax)
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // Read VITE_PROXY_TARGET from .env / .env.local / OS env so dev can be pointed
  // at a local backend (http://localhost:3000) without modifying this file.
  // Default: production Railway. See .env.local.example for usage.
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'https://finotaur-server-production.up.railway.app'
  const proxySecure = proxyTarget.startsWith('https://')

  // Sentry source-maps upload: enabled only in prod builds when the auth token
  // is present (Cloudflare Pages env). Local `npm run build` without the token
  // is a no-op — the plugin warns but the build still succeeds.
  const sentryEnabled = mode === 'production' && !!process.env.SENTRY_AUTH_TOKEN

  return {
  plugins: [
    react(),
    sentryEnabled && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        assets: './dist/**',
        // Keep maps out of the public bundle once Sentry has them.
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
      // Auto-detects release from `process.env.CF_PAGES_COMMIT_SHA` on
      // Cloudflare Pages; falls back to local git SHA otherwise.
      release: {
        name: process.env.CF_PAGES_COMMIT_SHA || undefined,
      },
      telemetry: false,
    }),
  ].filter(Boolean),

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
    // back to original source positions.
    // 2026-05-29: switched to 'hidden' — maps are produced for sentryVitePlugin
    // to upload, but no `//# sourceMappingURL=` comment is emitted in the bundle,
    // so browsers don't auto-fetch them. The plugin's `filesToDeleteAfterUpload`
    // then strips .map files from dist/ after upload, so the public bundle ships
    // without source maps. Sentry still resolves stack frames via uploaded maps.
    sourcemap: 'hidden',
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